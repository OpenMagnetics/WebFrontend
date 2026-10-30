<script>
// Shared renderer for the Kirchhoff diagnostics envelope — the ONE shape every converter
// topology emits (Kirchhoff/src/ConverterExtract.cpp::diagnostics):
//   { dutyCycle?, isCcm?, switchingFrequency?, primaryPeakCurrent?, primaryRmsCurrent?,
//     computed: { magnetizingInductance?, turnsRatio?, resonantCapacitance?, extraInductors?[] },
//     magnetics: [{ name, isMain, windings, magnetizingInductance?, turnsRatios?[] }],
//     capacitors: [{ name, capacitance?, ratedVoltage?, role? }],
//     operatingPoints: [{ operatingPointName?, isCcm?,
//                         windings: [{ frequency?, current_peak?, current_rms?, current_offset?,
//                                      current_peakToPeak?, current_dutyCycle?, voltage_peak?,
//                                      voltage_rms?, voltage_peakToPeak? }] }] }
// KH is the master: wizards render this shape as-is instead of the retired per-topology
// MKF diagnostics blocks. Every section and row is conditional, so the card degrades
// gracefully for topologies that omit a field.
//
// Layout (three sections, each only when it has content):
//   Operating point — value tiles (big value, small label under it)
//   Components      — label ··· value rows (inductances, turns ratio, capacitors + role)
//   Windings        — striped table, windings as columns, one quantity per row + units column
// When the converter was evaluated at several input voltages (diagnostics.inputVoltagePoints,
// one per Nom./Min./Max. the user entered), Operating point and Windings repeat per point, named
// after it; Components is shown once, listing each point's value for a part that differs.
//
// data-cy contract (tests depend on it): every scalar keeps `<label>-<key>` on its tile/row and
// `<label>-<key>-value` on the value, with the same keys as the old flat list. Per-point sections
// keep their data-cy and carry data-point="<index>" (index in Nom., Min., Max. order).
import { tooltipsConverterWizards } from 'WebSharedComponents/assets/js/texts'

// Winding-table rows, in display order: [key, label, envelope field, unit, tooltip key].
const WINDING_QUANTITIES = [
    ['currentRms', 'RMS current', 'current_rms', 'A', 'khDiagWindingCurrentRms'],
    ['currentPeak', 'Peak current', 'current_peak', 'A', 'khDiagWindingCurrentPeak'],
    ['currentAverage', 'Average current', 'current_offset', 'A', 'khDiagWindingCurrentAverage'],
    ['currentRipple', 'Current ripple (pk-pk)', 'current_peakToPeak', 'A', 'khDiagWindingCurrentRipple'],
    ['voltagePeak', 'Peak voltage', 'voltage_peak', 'V', 'khDiagWindingVoltagePeak'],
    ['voltageRms', 'RMS voltage', 'voltage_rms', 'V', 'khDiagWindingVoltageRms'],
];

export default {
    name: 'KhDiagnosticsPanel',
    props: {
        diagnostics: {
            type: Object,
            required: true,
        },
        dataTestLabel: {
            type: String,
            default: 'KhDiagnostics',
        },
    },
    computed: {
        d() { return this.diagnostics; },
        // One entry per input voltage the converter was evaluated at (kirchhoffRuntime attaches
        // inputVoltagePoints, ABT #2160); an envelope without them is a single point.
        points() {
            const pts = this.d.inputVoltagePoints;
            if (Array.isArray(pts) && pts.length) {
                return pts.map((p) => {
                    if (p.diagnostics == null) throw new Error(`KhDiagnosticsPanel: no diagnostics for ${p.name}`);
                    return { name: p.name, d: p.diagnostics };
                });
            }
            return [{ name: null, d: this.d }];
        },
        multiPoint() { return this.points.length > 1; },
        pointViews() {
            return this.points.map((p) => ({
                name: p.name,
                tiles: this.tilesFor(p.d),
                windingNames: this.windingNamesFor(p.d),
                windingRows: this.windingRowsFor(p.d),
                delivered: this.deliveredOutputsFor(p.d),
            }));
        },
        componentRows() {
            // The converter is one design at every input voltage (the main magnetic is pinned), but
            // Kirchhoff re-sizes some other parts per operating point. A row whose value differs
            // between points lists every point's value instead of showing one as if it held for all.
            const perPoint = this.points.map((p) => this.componentRowsFor(p.d));
            return perPoint[0].map((row) => {
                if (!this.multiPoint) return row;
                const values = perPoint.map((rows, i) => ({
                    name: this.points[i].name,
                    value: rows.find((r) => r.key === row.key)?.value ?? '—',
                }));
                const varies = values.some((v) => v.value !== row.value);
                return varies ? { ...row, perPoint: values } : row;
            });
        },
    },
    methods: {
        tilesFor(d) {
            // {key, label, num, unit, tip} — key gives each tile the stable data-cy the old rows had.
            const t = [];
            if (d.switchingFrequency != null) t.push({ key: 'switchingFrequency', label: 'Switching frequency', ...this.qHz(d.switchingFrequency), tip: 'khDiagSwitchingFrequency' });
            if (d.primaryRmsCurrent != null) t.push({ key: 'primaryRmsCurrent', label: 'Primary RMS current', ...this.qA(d.primaryRmsCurrent), tip: 'khDiagPrimaryRmsCurrent' });
            if (d.isCcm != null) t.push({ key: 'conductionMode', label: 'Conduction mode', num: d.isCcm ? 'CCM' : 'DCM', unit: '', tip: 'khDiagConductionMode' });
            if (d.dutyCycle != null) t.push({ key: 'dutyCycle', label: 'Duty cycle', num: Number(d.dutyCycle).toFixed(3), unit: '', tip: 'khDiagDutyCycle' });
            if (d.primaryPeakCurrent != null) t.push({ key: 'primaryPeakCurrent', label: 'Primary peak current', ...this.qA(d.primaryPeakCurrent), tip: 'khDiagPrimaryPeakCurrent' });
            return t;
        },
        componentRowsFor(d) {
            // {key, label, value, detail?, role?, tip}
            const computedVals = d.computed || {};
            const mainMagnetic = (d.magnetics || []).find(m => m.isMain) || null;
            const rows = [];
            // Main-magnetic inductance. For an inductor-only topology (buck/boost/PFC/…) this IS the
            // sized power inductance; for transformers it is the magnetizing inductance.
            const extra = computedVals.extraInductors || [];
            const mainL = computedVals.magnetizingInductance ?? extra[0]?.inductance;
            if (mainL != null) {
                const isTransformer = mainMagnetic != null && mainMagnetic.windings > 1;
                rows.push({
                    key: 'inductance',
                    label: isTransformer ? 'Magnetizing inductance' : 'Inductance',
                    value: this.fmtH(mainL),
                    tip: isTransformer ? 'khDiagMagnetizingInductance' : 'khDiagInductance',
                });
            }
            // computed.turnsRatio is the main magnetic's designRequirements.turnsRatios[0]: primary turns over
            // the turns of the SECOND winding (MKF Coil::get_turns_ratios = N1/N2). That second winding is the
            // secondary for most topologies, but the other primary half for push-pull/Weinberg and the reset
            // (demagnetising) winding for the single-switch forward, so name the windings the way the table below does.
            if (computedVals.turnsRatio != null) rows.push({ key: 'turnsRatio', label: 'Turns ratio (Primary / Winding 2)', value: Number(computedVals.turnsRatio).toFixed(3), tip: 'khDiagTurnsRatio' });
            if (computedVals.resonantCapacitance != null) rows.push({ key: 'resonantCapacitance', label: 'Resonant capacitance', value: this.fmtF(computedVals.resonantCapacitance), tip: 'khDiagResonantCapacitance' });
            extra.forEach((ind, i) => {
                if (i === 0 && computedVals.magnetizingInductance == null) return; // already shown as "Inductance"
                rows.push({ key: `extraInductor${i}`, label: `Inductor ${ind.name}`, value: this.fmtH(ind.inductance), tip: 'khDiagExtraInductor' });
            });
            (d.capacitors || []).forEach((c, i) => {
                if (c.capacitance == null) return;
                rows.push({
                    key: `capacitor${i}`,
                    label: `Capacitor ${c.name}`,
                    value: this.fmtF(c.capacitance),
                    detail: c.ratedVoltage != null ? `${this.fmtV(c.ratedVoltage)} rated` : null,
                    role: c.role ? this.roleText(c.role) : null,
                    tip: 'khDiagCapacitor',
                });
            });
            return rows;
        },
        // With a typed duty cycle Kirchhoff holds the switch command and the load, so the output
        // voltage is a result: show what the converter delivers next to what was asked for.
        deliveredOutputsFor(d) {
            if (d.forcedDutyCycle == null) return [];
            if (!Array.isArray(d.outputs) || !d.outputs.length) {
                throw new Error('KhDiagnosticsPanel: the engine pinned the duty cycle but reported no delivered output voltages');
            }
            const duty = Number(d.forcedDutyCycle).toFixed(2);
            return d.outputs.map((o, i) => {
                if (o.voltage == null || o.requestedVoltage == null) {
                    throw new Error(`KhDiagnosticsPanel: delivered output ${i + 1} has no voltage or requested voltage`);
                }
                const which = d.outputs.length > 1 ? `Output ${i + 1}` : 'Output';
                return `${which} with duty ${duty}: ${this.fmtV(o.voltage)} (asked ${this.fmtV(o.requestedVoltage)})`;
            });
        },
        mainOpOf(d) { return (d.operatingPoints || [])[0] || null; },
        windingNamesFor(d) {
            const op = this.mainOpOf(d);
            if (!op || !Array.isArray(op.windings)) return [];
            return op.windings.map((_, i) => (i === 0 ? 'Primary' : `Winding ${i + 1}`));
        },
        windingRowsFor(d) {
            const op = this.mainOpOf(d);
            if (!op || !Array.isArray(op.windings) || !op.windings.length) return [];
            const ws = op.windings;
            return WINDING_QUANTITIES
                .filter(([, , field]) => ws.some(w => w[field] != null))
                .map(([key, label, field, unit, tip]) => ({
                    key, label, unit, tip,
                    values: ws.map(w => (w[field] == null ? '—' : this.fmtNum(w[field], unit))),
                }));
        },
        tip(key) {
            const text = tooltipsConverterWizards[key];
            if (text == null) throw new Error(`KhDiagnosticsPanel: tooltipsConverterWizards has no '${key}' entry`);
            return text;
        },
        roleText(role) {
            // KH roles are camelCase identifiers (outputFilter, snubber, resonant, …): show them as words.
            return role.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
        },
        fmtNum(v, unit) { return unit === 'V' ? Number(v).toFixed(1) : Number(v).toFixed(3); },
        qHz(v) { if (v >= 1e6) return { num: (v / 1e6).toFixed(2), unit: 'MHz' }; if (v >= 1e3) return { num: (v / 1e3).toFixed(1), unit: 'kHz' }; return { num: v.toFixed(0), unit: 'Hz' }; },
        qA(v) { return { num: Number(v).toFixed(3), unit: 'A' }; },
        fmtH(v) { if (v >= 1) return v.toFixed(3) + ' H'; if (v >= 1e-3) return (v * 1e3).toFixed(3) + ' mH'; if (v >= 1e-6) return (v * 1e6).toFixed(2) + ' µH'; return (v * 1e9).toFixed(1) + ' nH'; },
        fmtF(v) { if (v >= 1e-3) return (v * 1e3).toFixed(2) + ' mF'; if (v >= 1e-6) return (v * 1e6).toFixed(2) + ' µF'; if (v >= 1e-9) return (v * 1e9).toFixed(2) + ' nF'; return (v * 1e12).toFixed(1) + ' pF'; },
        fmtV(v) { return Number(v).toFixed(1) + ' V'; },
    },
};
</script>

<template>
    <div class="kh-diag" :data-cy="dataTestLabel + '-panel'" :style="$styleStore.wizard.inputTextColor">

        <!-- One Operating point section per input voltage (Nom., Min., Max. — the ones entered). -->
        <template v-for="(pv, pi) in pointViews" :key="'op-' + pi">
            <section v-if="pv.tiles.length" class="kh-section" :data-cy="dataTestLabel + '-operatingPoint'" :data-point="pi">
                <h6 class="kh-heading">
                    Operating point<span v-if="multiPoint" class="kh-point-name" :data-cy="dataTestLabel + '-operatingPoint-name'">{{ pv.name }}</span>
                </h6>
                <div class="kh-tiles">
                    <div
                        v-for="t in pv.tiles"
                        :key="t.key"
                        v-tooltip="tip(t.tip)"
                        class="kh-tile"
                        :data-cy="dataTestLabel + '-' + t.key"
                    >
                        <div class="kh-tile-value" :data-cy="dataTestLabel + '-' + t.key + '-value'">{{ t.num }}<span v-if="t.unit" class="kh-unit">{{ ' ' + t.unit }}</span></div>
                        <div class="kh-tile-label">{{ t.label }}</div>
                    </div>
                </div>
                <div
                    v-for="(line, li) in pv.delivered"
                    :key="'delivered-' + li"
                    class="kh-delivered"
                    :data-cy="dataTestLabel + '-deliveredOutput'"
                    :data-point="pi"
                >{{ line }}</div>
            </section>
        </template>

        <section v-if="componentRows.length" class="kh-section" :data-cy="dataTestLabel + '-components'">
            <h6 class="kh-heading">Components</h6>
            <div
                v-for="r in componentRows"
                :key="r.key"
                v-tooltip="tip(r.tip)"
                class="kh-row-group"
            >
                <div class="kh-row" :data-cy="dataTestLabel + '-' + r.key">
                    <span class="kh-row-label">
                        {{ r.label }}
                        <span v-if="r.role" class="kh-role" :data-cy="dataTestLabel + '-' + r.key + '-role'">{{ r.role }}</span>
                    </span>
                    <span class="kh-leader" aria-hidden="true"></span>
                    <span class="kh-row-value">
                        <span :data-cy="dataTestLabel + '-' + r.key + '-value'">{{ r.value }}</span>
                        <span v-if="r.detail" class="kh-detail" :data-cy="dataTestLabel + '-' + r.key + '-rating'">{{ r.detail }}</span>
                    </span>
                </div>
                <!-- Kirchhoff sized this part differently at each input voltage: show every value. -->
                <div v-if="r.perPoint" class="kh-per-point" :data-cy="dataTestLabel + '-' + r.key + '-perPoint'">
                    <span v-for="v in r.perPoint" :key="v.name" class="kh-per-point-item">{{ v.name }}: {{ v.value }}</span>
                </div>
            </div>
        </section>

        <template v-for="(pv, pi) in pointViews" :key="'win-' + pi">
            <section v-if="pv.windingRows.length" class="kh-section" :data-cy="dataTestLabel + '-windings'" :data-point="pi">
                <h6 class="kh-heading">
                    Windings<span v-if="multiPoint" class="kh-point-name">{{ pv.name }}</span>
                </h6>
                <div class="kh-table-wrap">
                    <table class="kh-windings">
                        <thead>
                            <tr>
                                <th scope="col" class="kh-q"><span class="visually-hidden">Quantity</span></th>
                                <th scope="col" class="kh-u">Unit</th>
                                <th v-for="name in pv.windingNames" :key="name" scope="col" class="kh-num">{{ name }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in pv.windingRows" :key="row.key" :data-cy="dataTestLabel + '-winding-' + row.key">
                                <th scope="row" class="kh-q" v-tooltip="tip(row.tip)">{{ row.label }}</th>
                                <td class="kh-u">{{ row.unit }}</td>
                                <td v-for="(v, i) in row.values" :key="i" class="kh-num">{{ v }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </template>
    </div>
</template>

<style scoped>
/* Colours come only from the --p-* / --om-* tokens so the card follows whatever palette the
   host mounts (dark on openmagnetics.com, light in embedding hosts). */
.kh-diag {
    font-size: 0.875rem;
    line-height: 1.35;
    font-variant-numeric: tabular-nums;
}
.kh-section + .kh-section { margin-top: 12px; }

.kh-heading {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 6px;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--om-primary);
}
.kh-heading::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgb(from var(--om-primary) r g b / 0.25);
}

/* Operating point: tiles */
.kh-tiles {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}
.kh-tile {
    padding: 7px 8px 6px;
    border-radius: 6px;
    background: rgba(var(--p-light-rgb), 0.9);
    border-top: 2px solid rgb(from var(--om-primary) r g b / 0.55);
    flex: 1 1 84px;
    min-width: 0;
    cursor: help;
}
.kh-tile-value {
    font-size: 1.1rem;
    font-weight: 600;
    white-space: nowrap;
    color: var(--p-white);
}
.kh-unit {
    /* the value's textContent stays "100.0 kHz": the space lives in the interpolation, because
       Vue's whitespace condensing drops a leading literal space inside the span */
    font-size: 0.75rem;
    font-weight: 500;
    opacity: 0.75;
}
.kh-tile-label {
    margin-top: 1px;
    font-size: 0.7rem;
    opacity: 0.72;
    line-height: 1.2;
}

/* Components: label ··· value */
.kh-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 2px 0;
    cursor: help;
}
.kh-row-label { opacity: 0.85; min-width: 0; }
.kh-leader {
    flex: 1 1 12px;
    min-width: 12px;
    border-bottom: 1px dotted rgba(var(--p-white-rgb), 0.3);
    transform: translateY(-3px);
}
.kh-row-value { text-align: right; white-space: nowrap; }
.kh-detail {
    margin-left: 6px;
    font-size: 0.72rem;
    opacity: 0.65;
}
.kh-role {
    display: inline-block;
    margin-left: 4px;
    padding: 0 6px;
    border-radius: 999px;
    font-size: 0.68rem;
    line-height: 1.5;
    color: var(--om-primary);
    background: rgb(from var(--om-primary) r g b / 0.12);
    white-space: nowrap;
}

/* Windings: striped table */
.kh-table-wrap { overflow-x: auto; }
.kh-windings {
    width: 100%;
    border-collapse: collapse;
}
.kh-windings th, .kh-windings td { padding: 3px 6px; }
.kh-windings thead th {
    font-size: 0.75rem;
    font-weight: 600;
    opacity: 0.8;
    border-bottom: 1px solid rgb(from var(--om-primary) r g b / 0.3);
}
.kh-windings tbody tr:nth-child(odd) { background: rgba(var(--p-white-rgb), 0.05); }
.kh-windings tbody th {
    font-weight: 400;
    text-align: left;
    white-space: nowrap;
    opacity: 0.85;
    cursor: help;
}
.kh-q { text-align: left; }
.kh-u {
    text-align: left;
    font-size: 0.75rem;
    opacity: 0.6;
    width: 1%;
}
.kh-num { text-align: right; white-space: nowrap; }

/* Several input voltages: the point's name after the section heading, and per-point part values. */
.kh-delivered {
    margin-top: 6px;
    font-size: 0.85rem;
}
.kh-point-name {
    margin-left: 6px;
    font-weight: 500;
    opacity: 0.85;
}
.kh-per-point {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 2px 10px;
    padding: 0 0 2px;
    font-size: 0.72rem;
    opacity: 0.75;
}
</style>
