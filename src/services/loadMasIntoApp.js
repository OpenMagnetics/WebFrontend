import { checkAndFixMas, deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import { defaultOperatingPointExcitation, defaultOperatingConditions, powerMas } from 'WebSharedComponents/assets/js/defaults.js'
import { WaveformLabel } from 'WebSharedComponents/assets/ts/MAS.ts'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import masSchemaBundle from 'WebSharedComponents/assets/js/masSchemas.json'
import { findOutdatedCoreMaterial } from './coreMaterialFreshness.js'
import { useCoreMaterialNoticeStore } from '../stores/coreMaterialNotice.js'
import { useLoadCorrectionsStore } from '../stores/loadCorrections.js'
import { engineUserSettingsSettled } from '../stores/engineDiagnostics.js'

// Map every WaveformLabel enum value by its lowercase, space-free form so legacy
// documents with pre-1.0 labels ("Triangular", "Flyback Primary", "Rectangular
// With Deadtime") resolve to the current schema spelling.
const waveformLabelKey = (label) => label.toLowerCase().replace(/\s+/g, '');
const waveformLabelByKey = Object.fromEntries(
    Object.values(WaveformLabel).map((value) => [waveformLabelKey(value), value]));

// Same null-stripping the MAS sentry applies before Convert validation:
// quicktype optionals reject explicit null, and files exported by the app
// carry plenty of them. Works on a deep copy — callers pass a throwaway.
function stripNulls(value) {
    if (Array.isArray(value)) {
        value.forEach(stripNulls);
        return value;
    }
    if (value && typeof value === 'object') {
        for (const key of Object.keys(value)) {
            if (value[key] === null || value[key] === 'null' || value[key] === undefined) {
                delete value[key];
            } else {
                stripNulls(value[key]);
            }
        }
    }
    return value;
}

// The MAS JSON Schema violations of a document, as ajv reports them (instancePath, keyword,
// params). The same schemas the MAS sentry applies (masValidator.js), compiled here as well
// because the import migrations below act on WHERE and WHAT each violation is, and the sentry
// only exposes them as text. Compiled on the first imported document that needs it.
let masImportValidator = null;
function masImportErrors(mas) {
    if (masImportValidator == null) {
        const ajv = new Ajv2020({ strict: false, allErrors: true });
        addFormats(ajv);
        for (const schema of masSchemaBundle.schemas) ajv.addSchema(schema);
        masImportValidator = ajv.getSchema('https://psma.com/mas/MAS.json');
        if (!masImportValidator) {
            throw new Error('loadMasIntoApp: the MAS schema is not in masSchemas.json; regenerate the bundle');
        }
    }
    const probe = stripNulls(JSON.parse(JSON.stringify(mas)));
    return masImportValidator(probe) ? [] : (masImportValidator.errors || []);
}

function describeSchemaError(error) {
    const extra = error.params && Object.keys(error.params).length ? ` ${JSON.stringify(error.params)}` : '';
    return `${error.instancePath || '/'} ${error.message}${extra}`;
}

function valueAtPointer(root, pointer) {
    let value = root;
    for (const token of pointer.split('/').slice(1)) {
        if (value == null) return undefined;
        value = value[token.replace(/~1/g, '/').replace(/~0/g, '~')];
    }
    return value;
}

// Files written by older versions of the app, of the engine and of other tools carry keys the
// MAS schema has since dropped or never had: `masVersion` at the root, `recommendations` in a
// manufacturerInfo, `leakageInductanceMatrix` in a leakage output, `windingOrientation` on the
// coil. The engine never reads them, but the MAS sentry validates the whole document on every
// call, so one such key refused the load and every later simulation. Remove them on import.
//
// Only keys the schema rejects outright are removed. Inside a oneOf / anyOf / if the same error
// is also reported for each branch the value did NOT match (a rectangular wire's
// conductingWidth is "unknown" to the round-wire branch), so a key is left alone whenever its
// object or any ancestor also fails such a combinator: there the problem is which branch the
// object is, not the key.
function removeKeysTheSchemaDoesNotKnow(mas) {
    for (let pass = 0; pass < 5; pass++) {
        const errors = masImportErrors(mas);
        const combinatorPaths = errors
            .filter((error) => ['oneOf', 'anyOf', 'if'].includes(error.keyword))
            .map((error) => error.instancePath);
        const removed = [];
        for (const error of errors) {
            const key = error.params?.additionalProperty ?? error.params?.unevaluatedProperty;
            if (key == null || !['additionalProperties', 'unevaluatedProperties'].includes(error.keyword)) continue;
            const insideCombinator = combinatorPaths.some((path) =>
                error.instancePath === path || error.instancePath.startsWith(`${path}/`));
            if (insideCombinator) continue;
            const holder = valueAtPointer(mas, error.instancePath);
            if (holder != null && typeof holder === 'object' && key in holder) {
                delete holder[key];
                removed.push(`${error.instancePath || '/'}: ${key}`);
            }
        }
        if (removed.length === 0) return mas;
        console.warn(`Imported MAS carried keys the MAS schema does not define; removed them: ${[...new Set(removed)].join(', ')}`);
    }
    return mas;
}

// Quarantine schema-invalid outputs at the import boundary. A file exported
// mid-failure (e.g. windingLosses missing its required total after a partial
// wind) otherwise poisons every later simulate/masAutocomplete call: the MAS
// sentry validates the WHOLE document, so the stale outputs block the very
// simulation that would replace them. Outputs are always recomputed live, so
// dropping invalid ones loses nothing.
//
// Judged by the real MAS JSON Schema, the same one the sentry applies — not
// quicktype's Convert.toMas, which checks types only. Files exported by older
// engines carry outputs that type-check but break the schema's bounds
// (gappingReluctance 0 on a gapless core, a negative loss); the type check let
// them through and the sentry then refused the load.
//
// They are dropped whenever a violation lies inside `outputs`, whatever else is
// wrong with the document: this used to require the document to be valid
// without them, so a file with stale outputs AND another problem kept both and
// was refused for the outputs. Violations outside `outputs` are left to be
// reported as they are.
function quarantineInvalidOutputs(mas) {
    if (!Array.isArray(mas.outputs) || mas.outputs.length === 0) {
        return mas;
    }
    const outputErrors = masImportErrors(mas).filter((error) =>
        error.instancePath === '/outputs' || error.instancePath.startsWith('/outputs/'));
    if (outputErrors.length === 0) {
        return mas;
    }
    console.warn(`Imported MAS has schema-invalid outputs — dropping them (simulation recomputes all outputs). Validation errors: ${outputErrors.slice(0, 8).map(describeSchemaError).join('; ')}`);
    mas.outputs = [];
    return mas;
}

// The app's default excitation carried a primary voltage of -20.5 / +70.5 V switching at half
// the period: 25 V of net volt-seconds against its own processed data (offset 0, 100 V peak to
// peak, duty 0.5). A secondary reflected from it by the ABT #1670 bug got 0 / -100 V. Both are
// unbalanced, and since ABT #1585 the engine refuses to integrate them, so every saved design
// still carrying them stopped loading. Only these exact waveforms are replaced: the primary by the
// corrected default, the #1670 secondary by the primary over the turns ratio (Faraday, point by
// point, as MKF's reflect does). Anything else is left as it is, so a real imbalance stays loud.
// Each legacy waveform is a fixed shape on a period T of any length (the app rescaled the time
// axis when the frequency changed): the samples and the switching instants as fractions of T.
const LEGACY_DEFAULT_PRIMARY_VOLTAGE = { data: [-20.5, 70.5, 70.5, -20.5, -20.5], timeFractions: [0, 0, 0.5, 0.5, 1] };
const LEGACY_ABT1670_SECONDARY_VOLTAGE = { data: [0, 0, -100, -100, 0], timeFractions: [0, 0.5, 0.5, 1, 1] };
// The secondary voltage of the old two-switch-forward example (example.mas.json and every design
// started from it): +7.2913 V for 0.45 T against -6.1353 V for 0.405 T, 0.259 of its mean absolute
// voltage left over per period against the engine's limit of 0.25. MKF corrected its own copy of
// the example by letting the reset interval run until the volt-seconds cancel (ABT #1837); the same
// correction is applied here, to this exact waveform only.
const LEGACY_FORWARD_EXAMPLE_SECONDARY_VOLTAGE = {
    data: [0, 7.291333333333334, 7.291333333333334, -6.135333333333334, -6.135333333333334, 0, 0],
    timeFractions: [0, 0, 0.45, 0.45, 0.855, 0.855, 1],
    balancedResetEndFraction: 0.9847876,
};

function sameSamples(actual, expected, tolerance) {
    return Array.isArray(actual) && actual.length === expected.length
        && actual.every((value, index) => Math.abs(value - expected[index]) <= tolerance);
}

function isLegacyVoltage(voltage, legacy, scale = 1) {
    const waveform = voltage?.waveform;
    const period = Array.isArray(waveform?.time) ? waveform.time[waveform.time.length - 1] : null;
    return period > 0 && sameSamples(waveform.data, legacy.data.map((value) => value * scale), 1e-9 * Math.abs(scale))
        && sameSamples(waveform.time, legacy.timeFractions.map((fraction) => fraction * period), period * 1e-9);
}

// The same two legacy waveforms after the engine had sampled them (it stores a processed signal
// as equidistant samples): every sample sits on one of the two levels, and both levels occur.
function isSampledTwoLevelVoltage(voltage, levels) {
    const data = voltage?.waveform?.data;
    if (!Array.isArray(data) || data.length < 8) return false;
    const tolerance = 1e-9 * Math.max(Math.abs(levels[0]), Math.abs(levels[1]));
    const onLevel = (value, level) => Math.abs(value - level) <= tolerance;
    return data.every((value) => onLevel(value, levels[0]) || onLevel(value, levels[1]))
        && data.some((value) => onLevel(value, levels[0])) && data.some((value) => onLevel(value, levels[1]));
}

// Same rule as MKF's resolve_dimensional_values (preferred nominal): nominal, else the midpoint
// of minimum and maximum, else whichever bound exists; throws when none is present.
function resolveDimension(value, description) {
    if (typeof value === 'number') return value;
    if (value?.nominal != null) return value.nominal;
    if (value?.minimum != null && value?.maximum != null) return (value.minimum + value.maximum) / 2;
    if (value?.maximum != null) return value.maximum;
    if (value?.minimum != null) return value.minimum;
    throw new Error(`${description} has no nominal, minimum or maximum`);
}

function migrateLegacyDefaultVoltages(mas) {
    const turnsRatios = mas?.inputs?.designRequirements?.turnsRatios || [];
    for (const operatingPoint of (mas?.inputs?.operatingPoints || [])) {
        const excitations = operatingPoint?.excitationsPerWinding;
        if (!Array.isArray(excitations)) continue;
        for (let windingIndex = 0; windingIndex < excitations.length; windingIndex++) {
            const excitation = excitations[windingIndex];
            if (isLegacyVoltage(excitation?.voltage, LEGACY_FORWARD_EXAMPLE_SECONDARY_VOLTAGE)) {
                const time = [...excitation.voltage.waveform.time];
                const period = time[time.length - 1];
                time[4] = LEGACY_FORWARD_EXAMPLE_SECONDARY_VOLTAGE.balancedResetEndFraction * period;
                time[5] = time[4];
                // The stored processed data and harmonics describe the old waveform; MKF recomputes both.
                excitation.voltage = { waveform: { data: [...excitation.voltage.waveform.data], time } };
                console.warn(`Imported MAS: '${operatingPoint.name ?? 'operating point'}', winding ${windingIndex} carried the secondary voltage of the old two-switch-forward example (not volt-second balanced); its reset interval now ends where the volt-seconds cancel`);
                continue;
            }
            const corrected = deepCopy(defaultOperatingPointExcitation.voltage);
            if (isLegacyVoltage(excitation?.voltage, LEGACY_DEFAULT_PRIMARY_VOLTAGE)) {
                corrected.waveform.time = [...excitation.voltage.waveform.time];
            }
            else if (isSampledTwoLevelVoltage(excitation?.voltage, [-20.5, 70.5]) && excitation.frequency > 0) {
                const period = 1 / excitation.frequency;
                corrected.waveform.time = LEGACY_DEFAULT_PRIMARY_VOLTAGE.timeFractions.map((fraction) => fraction * period);
            }
            else {
                continue;
            }
            excitation.voltage = corrected;
            console.warn(`Imported MAS: '${operatingPoint.name ?? 'operating point'}', winding ${windingIndex} carried the old default voltage (-20.5 / +70.5 V, not volt-second balanced); replaced by the corrected default (+-50 V)`);
        }
        const primaryVoltage = excitations[0]?.voltage;
        for (let windingIndex = 1; windingIndex < excitations.length; windingIndex++) {
            const excitation = excitations[windingIndex];
            if (excitation?.voltage?.waveform == null || primaryVoltage?.waveform == null) continue;
            // The #1670 reflect wrote 0 / -100 V; versions around it divided that by the turns
            // ratio (0 / -20 V for a ratio of 5). Both are the same bug on the same default.
            const isUnscaled = isLegacyVoltage(excitation.voltage, LEGACY_ABT1670_SECONDARY_VOLTAGE)
                || isSampledTwoLevelVoltage(excitation.voltage, [0, -100]);
            let isScaled = false;
            if (!isUnscaled && turnsRatios[windingIndex - 1] != null) {
                const scale = 1 / resolveDimension(turnsRatios[windingIndex - 1], `Turns ratio ${windingIndex}`);
                isScaled = isLegacyVoltage(excitation.voltage, LEGACY_ABT1670_SECONDARY_VOLTAGE, scale)
                    || isSampledTwoLevelVoltage(excitation.voltage, [0, -100 * scale]);
            }
            if (!isUnscaled && !isScaled) continue;
            const turnsRatio = resolveDimension(turnsRatios[windingIndex - 1], `Turns ratio ${windingIndex}`);
            excitation.voltage = {
                waveform: {
                    data: primaryVoltage.waveform.data.map((value) => value / turnsRatio),
                    time: [...primaryVoltage.waveform.time],
                },
            };
            console.warn(`Imported MAS: '${operatingPoint.name ?? 'operating point'}', winding ${windingIndex} carried the 0 / -100 V voltage the ABT #1670 reflect bug wrote; replaced by the primary voltage over the turns ratio (${turnsRatio})`);
        }
    }
    return mas;
}

// The app's seed excitation (Defaults.defaultOperatingPointExcitation: a +-5 A triangle and a
// +-50 V rectangle) is one period of a fixed shape, and the app rescales its time axis when the
// frequency of the excitation is edited. Saved designs nevertheless carry seeds whose frequency
// says 1 MHz while their time axis spans 100 ns
// (tests/fixtures/pq2715_95_1mhz_outside_steinmetz_span.json, second winding). Engines up to MKF 426ec505 took the frequency and ignored the length of the axis;
// since ABT #1467 MKF refuses a waveform that does not span 1 / frequency, because for a real
// waveform it cannot tell which of the two is wrong. For the seed there is nothing to tell: it
// is the app's own shape, defined per period, so it is put back on the period of its excitation.
// Only signals that are sample for sample the seed are touched; any other waveform that does not
// span its period is left for MKF to refuse by name.
function placeSeedExcitationsOnTheirPeriod(mas) {
    for (const operatingPoint of (mas?.inputs?.operatingPoints || [])) {
        for (const [windingIndex, excitation] of (operatingPoint?.excitationsPerWinding || []).entries()) {
            if (!(excitation?.frequency > 0)) continue;
            const period = 1 / excitation.frequency;
            for (const signalName of ['current', 'voltage']) {
                const seed = defaultOperatingPointExcitation[signalName];
                const seedTime = seed.waveform.time;
                const seedShape = {
                    data: seed.waveform.data,
                    timeFractions: seedTime.map((time) => (time - seedTime[0]) / (seedTime[seedTime.length - 1] - seedTime[0])),
                };
                const signal = excitation[signalName];
                const time = signal?.waveform?.time;
                if (!Array.isArray(time) || time[0] !== 0 || !isLegacyVoltage(signal, seedShape)) continue;
                const span = time[time.length - 1];
                if (Math.abs(span - period) <= 1e-6 * period) continue;
                const onPeriod = deepCopy(seed);
                onPeriod.waveform.time = seedShape.timeFractions.map((fraction) => fraction * period);
                excitation[signalName] = onPeriod;
                console.warn(`Imported MAS: '${operatingPoint.name ?? 'operating point'}', winding ${windingIndex} carried the app's default ${signalName} on a time axis of ${span} s while its frequency is ${excitation.frequency} Hz; put back on its period (${period} s)`);
            }
        }
    }
    return mas;
}

const SIGNAL_DESCRIPTIONS = { current: 'current', voltage: 'voltage', magnetizingCurrent: 'magnetizing current' };

// Whether MKF takes a time axis as one period of its frequency: the same rule as
// WaveformProcessor::check_time_axis_spans_one_period (ABT #1467), a span within 1e-3 of the
// period, closed, or on a uniform axis open by one step.
function mkfTakesTimeAxis(time, period) {
    const span = time[time.length - 1] - time[0];
    const lastStep = time[time.length - 1] - time[time.length - 2];
    const uniform = lastStep > 0 && time.slice(1).every((value, index) => Math.abs((value - time[index]) - lastStep) <= 1e-6 * lastStep);
    return Math.abs(span - period) <= 1e-3 * period || (uniform && Math.abs(span + lastStep - period) <= 1e-3 * period);
}

// Two kinds of stored waveform whose time axis does not span 1 / frequency, which MKF refuses
// since ABT #1467, are put on their period on load (Alf, 2026-10-16). Each correction is
// reported per operating point and winding, and the Op. Points page shows it next to the signal.
// - A time axis 1000 (or 1 / 1000) times the period: a unit slip (ms for us). The frequency
//   holds: a 14-turn 3C95 transformer at 1.5 kV stored at 60 kHz on a 1 / 60 s axis gives a
//   36 kA magnetizing current at 60 Hz, 33 A at 60 kHz. Time scales exactly, so the harmonics
//   keep their amplitudes and the processed data its levels; only their frequencies and times
//   scale with it. A stored magnetizing current was derived from the voltage on the wrong
//   period, so its values are wrong as well: it is removed, and MKF derives it again.
// - A record that stops before the end of its period by no more than its own longest sample
//   interval (a simulated flyback ending 39 ns short of 10 us): the closing sample is missing.
//   The waveform is periodic, so its first value is repeated at the end of the period. Not done
//   to a stored magnetizing current: MKF derives that one itself, often on an axis of its own
//   (ABT #1474, #1793), and never takes the stored one as an input.
// An axis MKF takes is never touched (mkfTakesTimeAxis). Any other waveform that does not span
// its period is left for MKF to refuse by name.
function placeWaveformsOnTheirPeriod(mas, corrections) {
    for (const [operatingPointIndex, operatingPoint] of (mas?.inputs?.operatingPoints || []).entries()) {
        for (const [windingIndex, excitation] of (operatingPoint?.excitationsPerWinding || []).entries()) {
            if (!(excitation?.frequency > 0)) continue;
            const period = 1 / excitation.frequency;
            const correct = (signalName, message) => {
                corrections.push({ operatingPointIndex, operatingPointName: operatingPoint.name ?? null, windingIndex, signal: signalName, message });
                console.warn(`Imported MAS: '${operatingPoint.name ?? 'operating point'}', winding ${windingIndex}: ${message}`);
            };
            for (const signalName of ['current', 'voltage', 'magnetizingCurrent']) {
                const signal = excitation[signalName];
                const time = signal?.waveform?.time;
                const data = signal?.waveform?.data;
                if (!Array.isArray(time) || !Array.isArray(data) || time.length < 2 || time.length !== data.length || time[0] !== 0) continue;
                if (mkfTakesTimeAxis(time, period)) continue;
                const span = time[time.length - 1];
                const description = SIGNAL_DESCRIPTIONS[signalName];

                const unitSlip = [1e3, 1e-3].find((factor) => Math.abs(span - factor * period) <= 1e-6 * factor * period);
                if (unitSlip != null) {
                    if (signalName === 'magnetizingCurrent') {
                        delete excitation.magnetizingCurrent;
                        correct(signalName, `the magnetizing current was stored over ${span} s, ${unitSlip} times the period of ${excitation.frequency} Hz, so its values were derived on the wrong period; it was removed and MKF derives it again`);
                        continue;
                    }
                    const scale = period / span;
                    signal.waveform.time = time.map((value) => value * scale);
                    if (Array.isArray(signal.harmonics?.frequencies)) {
                        signal.harmonics.frequencies = signal.harmonics.frequencies.map((value) => value / scale);
                    }
                    const processed = signal.processed;
                    if (processed != null) {
                        for (const key of ['effectiveFrequency', 'acEffectiveFrequency']) {
                            if (typeof processed[key] === 'number') processed[key] /= scale;
                        }
                        if (typeof processed.deadTime === 'number') processed.deadTime *= scale;
                    }
                    correct(signalName, `the ${description} waveform was stored over ${span} s, ${unitSlip} times the period of ${excitation.frequency} Hz; its time axis was scaled to one period (${period} s)`);
                    continue;
                }

                const steps = time.slice(1).map((value, index) => value - time[index]);
                const longestStep = Math.max(...steps);
                const gap = period - span;
                if (signalName !== 'magnetizingCurrent' && gap > 0 && gap <= longestStep) {
                    signal.waveform.time = [...time, period];
                    signal.waveform.data = [...data, data[0]];
                    correct(signalName, `the ${description} waveform stopped ${gap} s before the end of its period (${period} s); its first value was repeated at the end of the period`);
                }
            }
        }
    }
    return mas;
}

// Topology names from before the MAS enum sweep (RFC 0007) that the case- and punctuation-
// insensitive matcher in checkAndFixMas cannot map, because the word itself changed. Keyed by
// the lowercase alphanumeric form.
const LEGACY_TOPOLOGY_NAMES = {
    flyback: 'flybackConverter',
    llcconverter: 'llcResonantConverter',
    sepic: 'sepicConverter',
};
// Topologies MAS no longer defines and that have no successor. `topology` is optional, and a
// name the schema rejects refuses the whole document, so the tag is dropped (with a warning).
const REMOVED_TOPOLOGY_NAMES = ['invertingbuckboostconverter', 'halfbridgeconverter'];

// The dimension keys each wire type defines in MAS (magnetic/wire/<type>.json). The wire
// editor used to keep the keys of the previous type when the type was changed (a rectangular
// wire still holding conductingDiameter, a foil holding outerDiameter), and a wire with keys
// of another type matches no branch of the wire schema. Read from the schema bundle so the
// table cannot drift from the schemas.
const WIRE_KEYS_PER_TYPE = Object.fromEntries(['round', 'rectangular', 'foil', 'litz', 'planar'].map((type) => {
    const schema = masSchemaBundle.schemas.find((candidate) => candidate.$id === `https://psma.com/mas/magnetic/wire/${type}.json`);
    if (schema?.properties == null) {
        throw new Error(`loadMasIntoApp: the ${type} wire schema is not in masSchemas.json; regenerate the bundle`);
    }
    return [type, Object.keys(schema.properties)];
}));
const BASIC_WIRE_KEYS = (() => {
    const schema = masSchemaBundle.schemas.find((candidate) => candidate.$id === 'https://psma.com/mas/magnetic/wire/basicWire.json');
    if (schema?.properties == null) {
        throw new Error('loadMasIntoApp: the basic wire schema is not in masSchemas.json; regenerate the bundle');
    }
    return Object.keys(schema.properties);
})();

function removeKeysOfOtherWireTypes(wire, description) {
    if (wire == null || typeof wire !== 'object' || !(wire.type in WIRE_KEYS_PER_TYPE)) return;
    const ownKeys = [...WIRE_KEYS_PER_TYPE[wire.type], ...BASIC_WIRE_KEYS];
    const foreignKeys = [...new Set(Object.values(WIRE_KEYS_PER_TYPE).flat())]
        .filter((key) => !ownKeys.includes(key) && wire[key] != null);
    for (const key of foreignKeys) {
        delete wire[key];
    }
    if (foreignKeys.length > 0) {
        console.warn(`Imported MAS: ${description} is a ${wire.type} wire carrying keys of other wire types (${foreignKeys.join(', ')}); removed them`);
    }
    if (wire.type === 'litz') {
        removeKeysOfOtherWireTypes(wire.strand, `${description} strand`);
    }
}

// Sessions saved by older frontend versions carry enum spellings the current
// MAS schema rejects ('P2' instead of 'PD2', 'OVC-III' instead of 'III',
// 'Wound' instead of 'wound'). The MAS sentry then fails every
// autocomplete/simulate call with a console-only error and the whole builder
// silently stops working (web bug reports #144/#145). Normalize the known
// legacy spellings before anything validates the document.
// `corrections` collects what was changed in a stored waveform (see placeWaveformsOnTheirPeriod),
// for the caller to show.
export function migrateLegacyMas(mas, corrections = []) {
    // The app's own "Download MAS file" export strips `outputs` (stale results),
    // but the engine's Mas parser requires the key — re-importing an exported
    // design failed mas_autocomplete with "key 'outputs' not found", leaving the
    // core unprocessed and the builder in a worker-returned-minus-one loop.
    if (!Array.isArray(mas.outputs)) {
        mas.outputs = [];
    }
    const requirements = mas?.inputs?.designRequirements;
    const insulation = requirements?.insulation;
    if (insulation != null) {
        const pollutionDegrees = { 'P1': 'PD1', 'P2': 'PD2', 'P3': 'PD3', 'P4': 'PD4' };
        if (insulation.pollutionDegree in pollutionDegrees) {
            insulation.pollutionDegree = pollutionDegrees[insulation.pollutionDegree];
        }
        const overvoltageCategories = { 'OVC-I': 'I', 'OVC-II': 'II', 'OVC-III': 'III', 'OVC-IV': 'IV' };
        if (insulation.overvoltageCategory in overvoltageCategories) {
            insulation.overvoltageCategory = overvoltageCategories[insulation.overvoltageCategory];
        }
    }
    // An empty list of standards says the same as no list, and the schema requires at least
    // one entry when the key is present.
    if (Array.isArray(insulation?.standards) && insulation.standards.length === 0) {
        delete insulation.standards;
    }
    if (typeof requirements?.topology === 'string') {
        const legacyName = requirements.topology.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (legacyName in LEGACY_TOPOLOGY_NAMES) {
            requirements.topology = LEGACY_TOPOLOGY_NAMES[legacyName];
        }
        else if (REMOVED_TOPOLOGY_NAMES.includes(legacyName)) {
            console.warn(`Imported MAS: topology '${requirements.topology}' is no longer defined by MAS and has no successor; the design is loaded without a topology`);
            delete requirements.topology;
        }
    }
    // A design with a single winding has no turns ratios; files from before the key became
    // required leave it out. With more windings the ratios cannot be known from here.
    if (requirements != null && requirements.turnsRatios == null) {
        const numberWindings = mas?.magnetic?.coil?.functionalDescription?.length;
        if (numberWindings === 1) {
            requirements.turnsRatios = [];
        }
    }
    for (const [windingIndex, winding] of (mas?.magnetic?.coil?.functionalDescription || []).entries()) {
        removeKeysOfOtherWireTypes(winding?.wire, `winding ${windingIndex} wire`);
    }
    // Distributor prices used to be a bare number; MAS now needs {value, currency}, and the
    // currency of an old price is not in the file. The price is dropped, the distributor kept.
    for (const part of [mas?.magnetic, mas?.magnetic?.core, mas?.magnetic?.coil?.bobbin]) {
        for (const distributor of (Array.isArray(part?.distributorsInfo) ? part.distributorsInfo : [])) {
            if (typeof distributor?.cost === 'number') {
                console.warn(`Imported MAS: ${distributor.name ?? 'a distributor'} quotes a cost without currency (${distributor.cost}); removed the cost`);
                delete distributor.cost;
            }
        }
    }
    if (typeof requirements?.wiringTechnology === 'string') {
        const lowercased = requirements.wiringTechnology.toLowerCase();
        if (['wound', 'printed', 'stamped', 'deposition'].includes(lowercased)) {
            requirements.wiringTechnology = lowercased;
        }
    }
    // Engines before MKF cfa6d126 (2026-09-17) wrote spacers as {material: 'plastic',
    // rotation} without insulationMaterial, which the MAS schema rejects, so designs
    // with spacers saved then were refused on load (user reports #184/#185). The
    // geometrical description is derived from the functional one; drop it so the
    // engine rebuilds it in the current form.
    const geometricalDescription = mas?.magnetic?.core?.geometricalDescription;
    if (Array.isArray(geometricalDescription)
        && geometricalDescription.some((element) => element?.type === 'spacer' && element.insulationMaterial == null)) {
        delete mas.magnetic.core.geometricalDescription;
    }
    // Files saved before user report #181 was fixed carry null excitations: adding a
    // winding in Design Requirements padded every operating point with null. Seed them
    // the way the app now does; the Op. Points page reports each one as 'not defined
    // yet' until the user opens it, so no design is made from the seed.
    for (const operatingPoint of (mas?.inputs?.operatingPoints || [])) {
        const excitations = operatingPoint?.excitationsPerWinding;
        if (!Array.isArray(excitations)) continue;
        // An operating point shorter than the number of windings is the same gap:
        // checkAndFixMas pads it with null.
        const numberWindings = Array.isArray(requirements?.turnsRatios) ? requirements.turnsRatios.length + 1 : excitations.length;
        while (excitations.length < numberWindings) {
            excitations.push(null);
        }
        for (let windingIndex = 0; windingIndex < excitations.length; windingIndex++) {
            if (excitations[windingIndex] == null) {
                excitations[windingIndex] = deepCopy(defaultOperatingPointExcitation);
            }
        }
    }
    migrateLegacyDefaultVoltages(mas);
    placeSeedExcitationsOnTheirPeriod(mas);
    placeWaveformsOnTheirPeriod(mas, corrections);
    // Legacy exports capitalized waveform labels ("Triangular"). The engine's
    // from_json rejects them ("Input JSON does not conform to schema!") and the
    // worker call returns -1, which the builder then retries in a loop — the
    // loaded design floods the console and never renders losses. Normalize
    // against the current enum, ignoring case and spaces. The waveform's
    // ancillaryLabel too: MKF's bindings that parse a bare waveform read an
    // unknown label as bipolarRectangular, and since MKF 900418bf (ABT #1878) a
    // 3-point triangle labelled so is refused (ABT #1881).
    for (const operatingPoint of (mas?.inputs?.operatingPoints || [])) {
        for (const excitation of (operatingPoint?.excitationsPerWinding || [])) {
            if (excitation == null) continue;
            for (const signal of [excitation.current, excitation.voltage, excitation.magnetizingCurrent]) {
                for (const [holder, key] of [[signal?.processed, 'label'], [signal?.waveform, 'ancillaryLabel']]) {
                    const label = holder?.[key];
                    if (typeof label !== 'string') continue;
                    const canonical = waveformLabelByKey[waveformLabelKey(label)];
                    if (canonical && canonical !== label) {
                        holder[key] = canonical;
                    }
                }
            }
        }
    }
    // Old Outputs kept magnetizingInductance/leakageInductance at the top level;
    // the current schema nests both under outputs[].inductance. The converter
    // rejects the whole document otherwise (additionalProperties: false).
    // magnetizingInductance is required inside InductanceOutput, so a leakage
    // without it cannot be relocated — drop it (stale result; simulate recomputes).
    for (const output of (Array.isArray(mas?.outputs) ? mas.outputs : [])) {
        if (output == null) continue;
        const legacyMagnetizing = output.magnetizingInductance;
        const legacyLeakage = output.leakageInductance;
        if (legacyMagnetizing == null && legacyLeakage == null) continue;
        delete output.magnetizingInductance;
        delete output.leakageInductance;
        if (output.inductance == null && legacyMagnetizing != null) {
            output.inductance = { magnetizingInductance: legacyMagnetizing };
            if (legacyLeakage != null) {
                output.inductance.leakageInductance = legacyLeakage;
            }
        }
    }
    return mas;
}

// Load a MAS document into the app exactly like the Header's "Load MAS" file
// import: fix + autocomplete it, reset the mas store, prime the state store,
// and navigate to the magnetic tool. Extracted from Header.readMASFile so the
// Header (file import) and My Designs (cloud open) share one code path.
/**
 * A MAS file is either a full MAS document ({inputs, magnetic, outputs}) or a
 * MAS Magnetic document (the magnetic alone: {core, coil, ...}), which is what
 * "Download MAS file only with magnetic" produces (ABT #1388). Return the MAS
 * shape the app loads: a Magnetic document is wrapped, anything else is
 * returned as it is for describeNonMasDocument to judge.
 */
export function asMasDocument(doc) {
    const isMagneticDocument = doc != null && typeof doc === 'object' && !Array.isArray(doc)
        && doc.magnetic == null && doc.core != null && doc.coil != null;
    return isMagneticDocument ? { magnetic: doc } : doc;
}

// The keys magnetic.json declares. Only the MAGNETIC key set is checked: files in
// the wild carry extra TOP-LEVEL keys the current schema no longer defines
// (tests/fixtures/etd49_wound_10uH_5T.json has 'masVersion'), and those load fine.
const MAS_MAGNETIC_KEYS = ['name', 'core', 'coil', 'manufacturerInfo', 'distributorsInfo',
    'rotation', 'coreElectricalReference', 'shunts'];

// "Is this a MAS document at all?" — a shape sniff, not schema validation (legacy
// documents are migrated, not rejected). Returns null when the document is
// plausibly MAS, otherwise a message naming what is actually wrong with it.
//
// A bare `newMas.magnetic != null` gate was not enough: a customer's in-house
// sizing export (MAS_2_Custom_16_Sep_2026.json) carried a `magnetic` key holding
// scalars — Lmag_calc_uH, AL_nH_per_turn2, C_CM_pF — so it sailed past the gate
// and died deep inside checkAndFixMas with "Cannot read properties of undefined
// (reading 'functionalDescription')", logged to a console the user never opens.
//
// A MAS Magnetic document has no inputs by definition, so only a full MAS file
// must carry them.
export function describeNonMasDocument(doc) {
    if (doc == null || typeof doc !== 'object' || Array.isArray(doc)) {
        return 'the file does not contain a JSON object.';
    }
    const mas = asMasDocument(doc);
    const magneticOnly = mas !== doc;
    const magnetic = mas.magnetic;
    if (magnetic == null || typeof magnetic !== 'object' || Array.isArray(magnetic)) {
        return 'it has no "magnetic" section, and it is not a MAS Magnetic (a "core" and a "coil").';
    }
    const magneticKeys = Object.keys(magnetic);
    if (!magneticKeys.some((key) => MAS_MAGNETIC_KEYS.includes(key))) {
        return `its "magnetic" section holds ${magneticKeys.join(', ')} instead of a core and a coil.`;
    }
    if (!magneticOnly) {
        const inputs = mas.inputs;
        if (inputs == null || inputs.designRequirements == null || inputs.operatingPoints == null) {
            return 'it has no "inputs" with design requirements and operating points.';
        }
    }
    return null;
}

// An operating point entered as a list of harmonics starts as the app's harmonics default:
// signals holding `harmonics` alone. The Op. Points page has the engine rebuild each waveform
// when it is opened, so a design saved before that page was visited (or with a winding added
// afterwards) carries harmonics-only signals. The MAS schema requires a waveform or processed
// data on every signal, so the sentry refused the whole file ("/voltage must have required
// property 'waveform'", user file 750372438rA.json). Rebuild them here the way the Op. Points
// page does: MKF reconstructs the waveform and its processed data from the harmonics.
async function completeHarmonicsOnlySignals(mas, taskQueueStore) {
    for (const operatingPoint of (mas?.inputs?.operatingPoints || [])) {
        for (const excitation of (operatingPoint?.excitationsPerWinding || [])) {
            if (excitation == null) continue;
            for (const signalName of ['current', 'voltage', 'magnetizingCurrent']) {
                const signal = excitation[signalName];
                if (signal == null || signal.waveform != null || signal.processed != null || signal.harmonics == null) continue;
                const description = `'${operatingPoint.name ?? 'operating point'}', '${excitation.name ?? 'excitation'}' ${signalName}`;
                const { amplitudes, frequencies } = signal.harmonics;
                if (!Array.isArray(amplitudes) || !Array.isArray(frequencies) || frequencies.length < 2 || amplitudes.length !== frequencies.length) {
                    throw new Error(`${description} holds only harmonics, and they are not a DC term plus at least a fundamental with one amplitude per frequency`);
                }
                let standardized;
                try {
                    standardized = await taskQueueStore.standardizeSignalDescriptor({ harmonics: deepCopy(signal.harmonics) }, frequencies[1]);
                } catch (standardizeError) {
                    throw new Error(`MKF could not rebuild the waveform of ${description} from its harmonics: ${standardizeError.message}`);
                }
                if (standardized?.waveform == null || standardized?.processed == null) {
                    throw new Error(`MKF returned no waveform or processed data for ${description} from its harmonics`);
                }
                excitation[signalName] = standardized;
            }
        }
    }
    return mas;
}

// A signal given by its processed data alone (label, peak to peak, offset, duty cycle) is a valid
// MAS signal, and MKF builds its waveform and harmonics when it completes the design. When MKF
// refuses the design that never happens, and the builder cannot ask MKF for anything on a current
// without a waveform ("processed values carry no timing") or without harmonics ("Current is
// missing harmonics": the Wire Info panel then showed -1 for every AC figure), so it could not
// even say why. MKF is asked for each of those signals on its own, the way the Op. Points page
// does when it shows one: the waveform from the processed data, the harmonics from the waveform.
// A signal MKF cannot build has nothing the builder could work on: the load is refused with the
// name of the signal and MKF's reason.
async function completeProcessedOnlySignals(mas, taskQueueStore) {
    for (const operatingPoint of (mas?.inputs?.operatingPoints || [])) {
        for (const excitation of (operatingPoint?.excitationsPerWinding || [])) {
            if (excitation == null) continue;
            for (const signalName of ['current', 'voltage']) {
                const signal = excitation[signalName];
                if (signal == null || signal.waveform != null || signal.processed == null) continue;
                const description = `'${operatingPoint.name ?? 'operating point'}', '${excitation.name ?? 'excitation'}' ${signalName}`;
                let standardized;
                try {
                    standardized = await taskQueueStore.standardizeSignalDescriptor(deepCopy(signal), excitation.frequency);
                } catch (standardizeError) {
                    throw new Error(`MKF could not build the waveform of ${description} from its processed data: ${standardizeError.message}`);
                }
                if (standardized?.waveform == null || standardized?.processed == null) {
                    throw new Error(`MKF returned no waveform or processed data for ${description} from its processed data`);
                }
                try {
                    standardized.harmonics = await taskQueueStore.calculateHarmonics(standardized.waveform, excitation.frequency);
                } catch (harmonicsError) {
                    throw new Error(`MKF could not calculate the harmonics of ${description}: ${harmonicsError.message}`);
                }
                excitation[signalName] = standardized;
            }
        }
    }
    return mas;
}

// A MAS Magnetic document ("Download MAS file only with magnetic") has no inputs, and the app
// works on a full MAS. It opens with the inputs a new design starts from (Defaults.powerMas),
// completed with what the magnetic itself states: the turns ratios of its windings, their
// isolation sides, and one operating point with an excitation per winding. That operating
// point is left without a mode, which the Op. Points page shows as "Choose a mode for this
// operating point first": the excitations are the app's seed, not the designer's.
function inputsForMagneticDocument(magnetic) {
    const windings = magnetic?.coil?.functionalDescription;
    if (!Array.isArray(windings) || windings.length === 0) {
        throw new Error('this magnetic has no windings (coil.functionalDescription is empty).');
    }
    windings.forEach((winding, windingIndex) => {
        if (!(winding?.numberTurns > 0)) {
            throw new Error(`winding ${windingIndex + 1} (${winding?.name ?? 'unnamed'}) of this magnetic has no number of turns, so its turns ratio cannot be derived.`);
        }
    });
    const designRequirements = deepCopy(powerMas.inputs.designRequirements);
    designRequirements.turnsRatios = windings.slice(1).map((winding) => ({ nominal: windings[0].numberTurns / winding.numberTurns }));
    if (windings.every((winding) => typeof winding.isolationSide === 'string')) {
        designRequirements.isolationSides = windings.map((winding) => winding.isolationSide);
    }
    return { designRequirements, operatingPoints: [seedOperatingPoint(windings.length)] };
}

function seedOperatingPoint(numberWindings) {
    return {
        name: 'Op. Point No. 1',
        conditions: deepCopy(defaultOperatingConditions),
        excitationsPerWinding: Array.from({ length: numberWindings }, () => deepCopy(defaultOperatingPointExcitation)),
    };
}

// Everything an imported document needs before the engine sees it that does not itself need
// the engine: the legacy migrations, then the two schema-driven clean-ups.
export function prepareMasForImport(mas, corrections = []) {
    migrateLegacyMas(mas, corrections);
    removeKeysTheSchemaDoesNotKnow(mas);
    quarantineInvalidOutputs(mas);
    return mas;
}

export async function loadMasIntoApp(doc, { masStore, stateStore, userStore, taskQueueStore, router, route }) {
    const notMas = describeNonMasDocument(doc);
    if (notMas != null) {
        throw new Error(`This file is not a MAS design: ${notMas}`);
    }
    const newMas = asMasDocument(doc);
    const isMagneticDocument = newMas.inputs == null;
    if (isMagneticDocument) {
        newMas.inputs = inputsForMagneticDocument(newMas.magnetic);
    }
    // A design saved before any operating point was defined gets the same seed, for the same
    // reason: MAS requires at least one, and it stays without a mode until the user gives it one.
    const hasSeededOperatingPoint = isMagneticDocument
        || (Array.isArray(newMas.inputs.operatingPoints) && newMas.inputs.operatingPoints.length === 0);
    if (!isMagneticDocument && hasSeededOperatingPoint) {
        const turnsRatios = newMas.inputs.designRequirements?.turnsRatios;
        const numberWindings = Array.isArray(turnsRatios) ? turnsRatios.length + 1 : newMas.magnetic?.coil?.functionalDescription?.length;
        if (!(numberWindings > 0)) {
            throw new Error('this design has no operating points, and neither turns ratios nor windings to seed one from.');
        }
        newMas.inputs.operatingPoints = [seedOperatingPoint(numberWindings)];
    }

    const corrections = [];
    prepareMasForImport(newMas, corrections);
    // Every engine call below must see the user's engine settings (material-data extrapolation).
    await engineUserSettingsSettled();
    await completeHarmonicsOnlySignals(newMas, taskQueueStore);

    const response = await checkAndFixMas(newMas, taskQueueStore);

    // Save coil processed data that masAutocomplete may strip
    const savedCoilData = {
        layersDescription: response.magnetic?.coil?.layersDescription,
        turnsDescription: response.magnetic?.coil?.turnsDescription,
        sectionsDescription: response.magnetic?.coil?.sectionsDescription,
    };

    // Always autocomplete the MAS to resolve wire/strand string names to
    // full objects and populate core processedDescription, bobbin, etc.
    //
    // A design MKF cannot complete (a core saturated by its DC bias, a voltage
    // whose volt-seconds do not balance, a wire in no catalogue) is opened as the
    // file holds it. Refusing it (ABT #1234) left the user unable to open their
    // own design to correct the very input MKF objects to (Alf, 2026-10-13:
    // "make sure no old MAS fails in loading"). MKF's reason is not lost: the
    // builder asks MKF again for everything it shows, and reports each refusal
    // in its "Calculation issue" banner.
    //
    // A file that already carries a completed magnetic (a processed core and
    // resolved wires), which is what the app saves, opens as it is. A file that
    // names its core or a wire and leaves the rest to MKF needs its magnetic
    // completed first (see the catch below): the builder cannot draw a wire it
    // only knows by name.
    // A design saved before a core was chosen (inputs only) has nothing for MKF to complete:
    // asking anyway fails with "Core shape not found", which refused the very files ABT #344
    // lands on the inputs page.
    const importedShape = response.magnetic?.core?.functionalDescription?.shape;
    const hasCoreToComplete = importedShape != null && !(typeof importedShape === 'string' && importedShape.trim() === '');
    let autocompletedMas = response;
    if (hasCoreToComplete) {
        // What MKF is asked to complete must be a valid MAS: the sentry refuses anything else on
        // this and on every later call, so a document the migrations above could not bring to
        // the schema would open into a builder where nothing computes. Say what is wrong instead.
        const schemaErrors = masImportErrors(response);
        if (schemaErrors.length > 0) {
            const shown = [...new Set(schemaErrors.map(describeSchemaError))];
            throw new Error(`this file does not follow the MAS schema: ${shown.slice(0, 8).join('; ')}${shown.length > 8 ? ` (+${shown.length - 8} more)` : ''}`);
        }
        try {
            autocompletedMas = await taskQueueStore.masAutocomplete(response, false, {});
        } catch (autocompleteError) {
            const core = response.magnetic.core;
            const holdsCompletedMagnetic = core.processedDescription != null
                && typeof core.functionalDescription.shape === 'object'
                && response.magnetic.coil.functionalDescription.every((winding) => winding?.wire != null && typeof winding.wire === 'object');
            if (holdsCompletedMagnetic) {
                console.warn(`Imported MAS: MKF could not complete this design, so it is opened as the file holds it: ${autocompleteError.message}`);
            }
            else {
                // The file names its core or its wires and leaves the rest to MKF. What MKF
                // refuses is most often the operating point, not the magnetic (since ABT #1467 /
                // #1740: a voltage whose volt-seconds saturate the core, a waveform that does not
                // span its period), and MKF can complete the magnetic without it. Then the design
                // opens like the one above: its magnetic completed, its inputs as the file holds
                // them, MKF's reason in the builder. When MKF cannot complete the magnetic either
                // (a wire in no catalogue), or cannot build a signal the file gives by its processed
                // data alone, there is nothing to show, and the load is refused.
                let completedMagnetic;
                try {
                    completedMagnetic = await taskQueueStore.magneticAutocomplete(response.magnetic);
                } catch (magneticError) {
                    const alsoTheMagnetic = magneticError.message === autocompleteError.message
                        ? ''
                        : `; nor its magnetic alone: ${magneticError.message}`;
                    throw new Error(`MKF could not complete this design: ${autocompleteError.message}${alsoTheMagnetic}`);
                }
                try {
                    await completeProcessedOnlySignals(response, taskQueueStore);
                } catch (signalError) {
                    throw new Error(`MKF could not complete this design: ${autocompleteError.message}; and with its magnetic completed alone, ${signalError.message}`);
                }
                autocompletedMas = { ...response, magnetic: completedMagnetic };
                console.warn(`Imported MAS: MKF could not complete this design, so it is opened with its magnetic completed and its inputs as the file holds them: ${autocompleteError.message}`);
            }
        }
    }

    // Restore coil processed data if masAutocomplete stripped it
    if (autocompletedMas.magnetic?.coil) {
        if (!autocompletedMas.magnetic.coil.layersDescription && savedCoilData.layersDescription) {
            autocompletedMas.magnetic.coil.layersDescription = savedCoilData.layersDescription;
        }
        if (!autocompletedMas.magnetic.coil.turnsDescription && savedCoilData.turnsDescription) {
            autocompletedMas.magnetic.coil.turnsDescription = savedCoilData.turnsDescription;
        }
        if (!autocompletedMas.magnetic.coil.sectionsDescription && savedCoilData.sectionsDescription) {
            autocompletedMas.magnetic.coil.sectionsDescription = savedCoilData.sectionsDescription;
        }
    }

    // Before the design replaces the current one: a notice left by the previous load must not
    // describe this design.
    const coreMaterialNotice = useCoreMaterialNoticeStore();
    coreMaterialNotice.clear();
    const loadCorrections = useLoadCorrectionsStore();
    loadCorrections.clear();
    const outdatedCoreMaterial = await findOutdatedCoreMaterial(autocompletedMas, { taskQueueStore, userStore });
    if (outdatedCoreMaterial != null) {
        console.warn(`Imported MAS: the design's copy of core material '${outdatedCoreMaterial.name}' gives other core losses than the library's; the file's copy is kept`);
    }

    masStore.resetMas();
    masStore.mas = autocompletedMas;
    coreMaterialNotice.set(outdatedCoreMaterial);
    loadCorrections.set(corrections);
    masStore.importedMas();

    // Reset coil view to Basic mode when loading a new MAS document
    stateStore.closeCoilAdvancedInfo();

    stateStore.selectWorkflow("design");
    stateStore.selectApplication(stateStore.SupportedApplications.Power);
    stateStore.selectTool("magneticBuilder");
    // A design saved before anything was built (inputs only, no core shape)
    // has nothing to show in the builder pane — land on the inputs instead
    // of an empty Design section (ABT #344).
    const loadedShape = autocompletedMas.magnetic?.core?.functionalDescription?.shape;
    const hasDesignedCore = loadedShape != null && !(typeof loadedShape === 'string' && loadedShape.trim() === '');
    stateStore.setCurrentToolSubsection(hasDesignedCore ? "magneticBuilder" : "designRequirements");
    stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
    stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
    stateStore.operatingPoints.modePerPoint = [];
    if (hasSeededOperatingPoint) {
        // The seeded operating point has no mode until the user gives it one.
        stateStore.setCurrentToolSubsectionStatus("operatingPoints", false);
        stateStore.operatingPoints.modePerPoint = masStore.mas.inputs.operatingPoints.map(() => null);
    }
    for (let i = 0; !hasSeededOperatingPoint && i < masStore.mas.inputs.operatingPoints.length; i++) {
        const excitation = masStore.mas.inputs.operatingPoints[i].excitationsPerWinding[0];
        // Determine mode based on what data is present:
        // - HarmonicsList: has harmonics with multiple entries (DC + at least one harmonic)
        //   This means the user entered harmonics manually
        // - Manual: only has waveform/processed without meaningful harmonics
        const hasMultipleHarmonics = excitation.current?.harmonics?.amplitudes?.length > 1;

        if (hasMultipleHarmonics) {
            stateStore.operatingPoints.modePerPoint.push(stateStore.OperatingPointsMode.HarmonicsList);
        }
        else {
            stateStore.operatingPoints.modePerPoint.push(stateStore.OperatingPointsMode.Manual);
        }
    }
    stateStore.loadingDesign = true;
    // Mark a design as loaded BEFORE navigating: MagneticTool's mount wipes
    // the mas store (resetMas) whenever anyDesignLoaded is false — on a fresh
    // browser or right after a STORE_VERSION_DATE wipe, that reset silently
    // destroyed the document we just loaded (report: '2KW IH 19.3.json' →
    // empty builder + 'Design incomplete' summary).
    stateStore.designLoaded();

    if (route.path != `${import.meta.env.BASE_URL}magnetic_tool`) {
        userStore.loadingPath = `${import.meta.env.BASE_URL}magnetic_tool`;

        // Wait for pinia-plugin-persistedstate to write to localStorage
        await new Promise(resolve => {
            const unsubscribe = masStore.$subscribe(() => {
                unsubscribe();
                resolve();
            }, { flush: 'sync' });
            // Trigger a sync by touching the store
            masStore.$patch({});
        });

        await router.push(`${import.meta.env.BASE_URL}engine_loader`);
    }
    else {
        masStore.mas.magnetic.core = autocompletedMas.magnetic.core;
        masStore.mas.magnetic.coil = autocompletedMas.magnetic.coil;
        masStore.mas.magnetic.coil.functionalDescription = autocompletedMas.magnetic.coil.functionalDescription;
    }
}
