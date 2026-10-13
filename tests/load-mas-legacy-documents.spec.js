/**
 * "Make sure no old MAS fails in loading" (Alf, 2026-10-13). A sweep of 266 real MAS files through
 * the Load MAS import refused 94 of them. Almost all were refused by the MAS sentry, which
 * validates the whole document against the MAS schema on every engine call: a key the schema has
 * since dropped, a stale output, a leftover of a previous wire type or a legacy enum spelling
 * anywhere in the file refused the load. The loader now migrates each of those on import. Every
 * case here is one of the refusals of that sweep, rebuilt on a fixture.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

const fixture = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url).pathname, 'utf8'));

async function load(page, document, name) {
  const alerts = [];
  page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(document)),
  });
  await Promise.race([
    page.waitForURL('**/magnetic_tool**', { timeout: 120000 }),
    page.waitForEvent('dialog', { timeout: 120000 }),
  ]);
  expect(alerts, 'the load is not refused').toEqual([]);
  return page.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    const state = pinia._s.get('state');
    return JSON.parse(JSON.stringify({
      mas: pinia._s.get('mas').mas,
      modePerPoint: state.operatingPoints.modePerPoint,
    }));
  });
}

test.describe('legacy MAS documents load', () => {
  test.describe.configure({ timeout: 180000 });

  test('LOADMAS-LEGACY-1: keys the schema no longer defines are removed, not refused', async ({ page }) => {
    const mas = fixture('etd49_wound_10uH_5T.json');
    mas.masVersion = '0.1.0';
    mas.magnetic.coil.windingOrientation = 'overlapping';
    mas.magnetic.manufacturerInfo = { name: 'OpenMagnetics', reference: 'Legacy', recommendations: { mounting: 'THT' } };
    const { mas: loaded } = await load(page, mas, 'legacy_unknown_keys.json');
    expect(loaded.masVersion).toBeUndefined();
    expect(loaded.magnetic.coil.windingOrientation).toBeUndefined();
    expect(loaded.magnetic.manufacturerInfo.recommendations ?? null).toBeNull();
    expect(loaded.magnetic.manufacturerInfo.reference, 'the keys the schema defines are kept').toBe('Legacy');
    expect(loaded.magnetic.coil.functionalDescription[0].wire.conductingDiameter, 'a valid wire is left as it is').toBeTruthy();
  });

  test('LOADMAS-LEGACY-2: stale outputs are dropped even when the document has another legacy problem', async ({ page }) => {
    const mas = fixture('etd49_wound_10uH_5T.json');
    // An older engine's inductance output on a gapless core, with a matrix key since removed.
    mas.outputs = [{
      inductance: {
        magnetizingInductance: {
          methodUsed: 'Zhang', origin: 'simulation', magnetizingInductance: { nominal: 1e-5 },
          coreReluctance: 1e5, gappingReluctance: 0,
        },
      },
    }];
    mas.inputs.designRequirements.insulation = {
      altitude: { maximum: 2000 }, cti: 'Group I', insulationType: 'Basic', mainSupplyVoltage: { nominal: 400 },
      overvoltageCategory: 'OVC-II', pollutionDegree: 'P1', standards: [],
    };
    const { mas: loaded } = await load(page, mas, 'legacy_outputs_and_standards.json');
    for (const output of loaded.outputs) {
      expect(output?.inductance?.magnetizingInductance?.gappingReluctance ?? 1, 'the stale output is not kept').not.toBe(0);
    }
    const insulation = loaded.inputs.designRequirements.insulation;
    expect(insulation.standards ?? null, 'an empty list of standards is no list').toBeNull();
    expect(insulation.pollutionDegree).toBe('PD1');
    expect(insulation.overvoltageCategory).toBe('II');
  });

  test('LOADMAS-LEGACY-3: topology names from before the MAS enum sweep are converted', async ({ page }) => {
    const mas = fixture('etd49_wound_10uH_5T.json');
    mas.inputs.designRequirements.topology = 'Flyback';
    const { mas: loaded } = await load(page, mas, 'legacy_topology_flyback.json');
    expect(loaded.inputs.designRequirements.topology).toBe('flybackConverter');
  });

  test('LOADMAS-LEGACY-4: a topology MAS no longer defines is dropped, and the design loads', async ({ page }) => {
    const mas = fixture('etd49_wound_10uH_5T.json');
    mas.inputs.designRequirements.topology = 'Inverting Buck-Boost Converter';
    const { mas: loaded } = await load(page, mas, 'legacy_topology_removed.json');
    expect(loaded.inputs.designRequirements.topology ?? null).toBeNull();
  });

  test('LOADMAS-LEGACY-5: a wire keeping the keys of its previous type loads as its own type', async ({ page }) => {
    const mas = fixture('etd49_wound_10uH_5T.json');
    const round = mas.magnetic.coil.functionalDescription[0].wire;
    // As the wire editor used to leave it after round -> rectangular: both sets of dimensions.
    mas.magnetic.coil.functionalDescription[0].wire = {
      ...round,
      type: 'rectangular',
      conductingWidth: { nominal: 0.004 }, conductingHeight: { nominal: 0.001 },
      outerWidth: { nominal: 0.004085 }, outerHeight: { nominal: 0.001085 },
    };
    delete mas.magnetic.coil.functionalDescription[0].wire.standardName;
    delete mas.magnetic.coil.layersDescription;
    delete mas.magnetic.coil.sectionsDescription;
    delete mas.magnetic.coil.turnsDescription;
    const { mas: loaded } = await load(page, mas, 'legacy_wire_leftovers.json');
    const wire = loaded.magnetic.coil.functionalDescription[0].wire;
    expect(wire.type).toBe('rectangular');
    expect(wire.conductingWidth.nominal).toBeCloseTo(0.004, 9);
    expect(wire.conductingDiameter ?? null, 'the round-wire diameter is gone').toBeNull();
    expect(wire.outerDiameter ?? null).toBeNull();
  });

  test('LOADMAS-LEGACY-6: the old default voltages load in every form they were saved in', async ({ page }) => {
    const mas = fixture('default_two_winding_pq2715.json');
    mas.inputs.designRequirements.turnsRatios = [{ nominal: 5 }];
    const period = 1e-5;
    const [primary, secondary] = mas.inputs.operatingPoints[0].excitationsPerWinding;
    // Primary: the -20.5 / +70.5 V default after the engine had sampled it (128 points).
    const samples = Array.from({ length: 128 }, (_, index) => index);
    primary.frequency = 1 / period;
    primary.voltage = { waveform: {
      data: samples.map((index) => (index >= 1 && index < 64 ? 70.5 : -20.5)),
      time: samples.map((index) => index * period / 128),
    } };
    // Secondary: the 0 / -100 V reflect divided by the turns ratio.
    secondary.frequency = 1 / period;
    secondary.voltage = { waveform: { data: [0, 0, -20, -20, 0], time: [0, period / 2, period / 2, period, period] } };
    const { mas: loaded } = await load(page, mas, 'legacy_default_voltages.json');
    const loadedExcitations = loaded.inputs.operatingPoints[0].excitationsPerWinding;
    const mean = (waveform) => {
      let area = 0;
      for (let index = 1; index < waveform.data.length; index++) {
        area += (waveform.data[index] + waveform.data[index - 1]) / 2 * (waveform.time[index] - waveform.time[index - 1]);
      }
      return area / (waveform.time[waveform.time.length - 1] - waveform.time[0]);
    };
    expect(Math.max(...loadedExcitations[0].voltage.waveform.data)).toBeCloseTo(50, 6);
    expect(Math.min(...loadedExcitations[0].voltage.waveform.data)).toBeCloseTo(-50, 6);
    expect(Math.abs(mean(loadedExcitations[0].voltage.waveform)), 'primary volt-seconds balance').toBeLessThan(1);
    expect(Math.max(...loadedExcitations[1].voltage.waveform.data)).toBeCloseTo(10, 6);
    expect(Math.min(...loadedExcitations[1].voltage.waveform.data)).toBeCloseTo(-10, 6);
    expect(Math.abs(mean(loadedExcitations[1].voltage.waveform)), 'secondary volt-seconds balance').toBeLessThan(0.2);
  });

  test('LOADMAS-LEGACY-7: a MAS Magnetic document opens with new-design inputs taken from its windings', async ({ page }) => {
    const magnetic = fixture('default_two_winding_pq2715.json').magnetic;
    magnetic.coil.functionalDescription[0].numberTurns = 20;
    magnetic.coil.functionalDescription[1].numberTurns = 5;
    delete magnetic.coil.layersDescription;
    delete magnetic.coil.sectionsDescription;
    delete magnetic.coil.turnsDescription;
    expect(magnetic.core && magnetic.coil && !('magnetic' in magnetic)).toBeTruthy();
    const { mas: loaded, modePerPoint } = await load(page, magnetic, 'magnetic_only.json');
    expect(loaded.magnetic.coil.functionalDescription.map((winding) => winding.numberTurns)).toEqual([20, 5]);
    expect(loaded.inputs.designRequirements.turnsRatios.map((ratio) => ratio.nominal)).toEqual([4]);
    expect(loaded.inputs.operatingPoints.length).toBe(1);
    expect(loaded.inputs.operatingPoints[0].excitationsPerWinding.length).toBe(2);
    expect(modePerPoint, 'the seeded operating point has no mode until the user gives it one').toEqual([null]);
  });

  test('LOADMAS-LEGACY-9: a design saved before any operating point was defined loads with one to define', async ({ page }) => {
    const mas = fixture('etd49_wound_10uH_5T.json');
    mas.inputs.operatingPoints = [];
    const { mas: loaded, modePerPoint } = await load(page, mas, 'no_operating_points.json');
    expect(loaded.inputs.operatingPoints.length).toBe(1);
    expect(loaded.inputs.operatingPoints[0].excitationsPerWinding.length).toBe(1);
    expect(modePerPoint).toEqual([null]);
  });

  test('LOADMAS-LEGACY-10: a completed design MKF refuses opens as stored, and the builder says why', async ({ page }) => {
    const mas = fixture('multicolumn_e42_transformer.json');
    // A real (not legacy-default) primary voltage whose volt-seconds do not balance: 0 / +60 V.
    const excitation = mas.inputs.operatingPoints[0].excitationsPerWinding[0];
    const period = 1 / excitation.frequency;
    excitation.voltage = { waveform: { data: [0, 60, 60, 0, 0], time: [0, 0, period / 2, period / 2, period] } };
    const turns = mas.magnetic.coil.functionalDescription.map((winding) => winding.numberTurns);
    const warnings = [];
    page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()); });
    const { mas: loaded } = await load(page, mas, 'unbalanced_transformer.json');
    const refusals = warnings.filter((text) => text.includes('MKF could not complete this design'));
    expect(refusals.length, 'MKF refused the design').toBeGreaterThan(0);
    expect(refusals[0]).toContain('not volt-second balanced');
    expect(loaded.magnetic.coil.functionalDescription.map((winding) => winding.numberTurns)).toEqual(turns);
    await expect(page.locator('[data-cy$="-CalculationIssue"]').first()).toBeVisible({ timeout: 60000 });
  });

  test('LOADMAS-LEGACY-11: a core material stored with a single application loads (user file 750372438rA.json)', async ({ page }) => {
    // MAS c2432e7 made CoreMaterial.application a list; files saved before it embed their
    // material with `application: "Power"`. Unconverted, MKF's parser refuses the whole core
    // ("type must be array, but is string").
    const mas = fixture('multicolumn_e42_transformer.json');
    const material = mas.magnetic.core.functionalDescription.material;
    expect(Array.isArray(material.application), 'the fixture embeds its core material').toBe(true);
    material.application = 'Power';
    const { mas: loaded } = await load(page, mas, 'legacy_material_application.json');
    expect(loaded.magnetic.core.functionalDescription.material.application).toEqual(['power']);
  });

  test('LOADMAS-LEGACY-12: a completed design with the harmonics default (100 V at 50 Hz) opens whatever MKF says of it', async ({ page }) => {
    // User file 750372438rA.json: a second operating point left on the app's harmonics default.
    // 100 V at 50 Hz is 0.45 V*s per half cycle, which saturates any core this app designs, and
    // since ABT #1740 MKF says so instead of computing with it. The design must still open, as
    // the file holds it, and the builder must give MKF's reason. An engine that does not refuse
    // these volt-seconds opens it without one. Which of the two this engine is, MKF is asked.
    const mas = fixture('multicolumn_e42_transformer.json');
    mas.inputs.operatingPoints.push({
      name: 'Op. Point No. 2',
      conditions: { ambientTemperature: 100 },
      excitationsPerWinding: mas.inputs.operatingPoints[0].excitationsPerWinding.map(() => ({
        name: 'Primary winding excitation',
        frequency: 50,
        current: { harmonics: { amplitudes: [0, 10], frequencies: [0, 50] } },
        voltage: { harmonics: { amplitudes: [0, 100], frequencies: [0, 50] } },
      })),
    });
    const turns = mas.magnetic.coil.functionalDescription.map((winding) => winding.numberTurns);
    const warnings = [];
    page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()); });
    const { mas: loaded } = await load(page, mas, 'harmonics_default_operating_point.json');
    expect(loaded.inputs.operatingPoints.length).toBe(2);
    expect(loaded.magnetic.coil.functionalDescription.map((winding) => winding.numberTurns)).toEqual(turns);
    expect(loaded.magnetic.core.processedDescription, 'the magnetic is the completed one').toBeTruthy();

    const verdict = await page.evaluate(async (document) => {
      const taskQueue = window.document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('taskQueue');
      try {
        await taskQueue.masAutocomplete(document, false, {});
        return null;
      } catch (error) {
        return error.message;
      }
    }, loaded);
    const refusals = warnings.filter((text) => text.includes('MKF could not complete this design'));
    if (verdict == null) {
      expect(refusals, 'MKF completes this design, so nothing is reported').toEqual([]);
    }
    else {
      expect(verdict, 'the only thing MKF objects to is the saturating operating point').toContain('CALCULATION_CORE_SATURATES');
      expect(verdict).toContain('Op. Point No. 2');
      expect(refusals.length, 'the loader reports that MKF refused the design').toBeGreaterThan(0);
      expect(refusals[0]).toContain('CALCULATION_CORE_SATURATES');
      const issue = page.locator('[data-cy$="-CalculationIssue"]').first();
      await expect(issue).toBeVisible({ timeout: 60000 });
      await expect(issue).toContainText('The core saturates');
      await expect(issue).toContainText('Op. Point No. 2');
    }
  });

  test('LOADMAS-LEGACY-13: the default excitation on a stale time axis is put back on its period', async ({ page }) => {
    // tests/fixtures/pq2715_95_1mhz_outside_steinmetz_span.json: the second winding says 1 MHz
    // and still carries the default shapes on a 100 ns axis. MKF refuses that since ABT #1467.
    const mas = fixture('default_two_winding_pq2715.json');
    const [primary, secondary] = mas.inputs.operatingPoints[0].excitationsPerWinding;
    const stalePeriod = 1e-7;
    for (const excitation of [primary, secondary]) {
      excitation.frequency = 1e6;
    }
    primary.current = { waveform: { data: [-5, 5, -5], time: [0, 5e-7, 1e-6] }, processed: { label: 'triangular', peakToPeak: 10, offset: 0, dutyCycle: 0.5 } };
    primary.voltage = { waveform: { data: [-50, 50, 50, -50, -50], time: [0, 0, 5e-7, 5e-7, 1e-6] }, processed: { label: 'rectangular', peakToPeak: 100, offset: 0, dutyCycle: 0.5 } };
    secondary.current = { waveform: { data: [-5, 5, -5], time: [0, stalePeriod / 2, stalePeriod] }, processed: { label: 'triangular', peakToPeak: 10, offset: 0, dutyCycle: 0.5 } };
    // The old default voltage as well, so the two migrations are seen working together.
    secondary.voltage = { waveform: { data: [-20.5, 70.5, 70.5, -20.5, -20.5], time: [0, 0, stalePeriod / 2, stalePeriod / 2, stalePeriod] }, processed: { label: 'rectangular', peakToPeak: 100, offset: 0, dutyCycle: 0.5 } };
    const warnings = [];
    page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()); });
    const { mas: loaded } = await load(page, mas, 'default_on_stale_axis.json');
    expect(warnings.filter((text) => text.includes('MKF could not complete this design')), 'MKF completes the design').toEqual([]);
    for (const excitation of loaded.inputs.operatingPoints[0].excitationsPerWinding) {
      expect(excitation.frequency).toBe(1e6);
      for (const [signalName, peak] of [['current', 5], ['voltage', 50]]) {
        const { data, time } = excitation[signalName].waveform;
        const span = time[time.length - 1] - time[0];
        // One period of 1 MHz, closed or (once MKF has sampled it) open by one step.
        const step = time[time.length - 1] - time[time.length - 2];
        expect(Math.min(Math.abs(span - 1e-6), Math.abs(span + step - 1e-6)), `${excitation.name} ${signalName} spans 1 us, not ${span} s`).toBeLessThan(1e-9);
        expect(Math.max(...data)).toBeCloseTo(peak, 6);
        expect(Math.min(...data)).toBeCloseTo(-peak, 6);
      }
    }
  });

  test('LOADMAS-LEGACY-16: the secondary voltage of the old two-switch-forward example is balanced on load', async ({ page }) => {
    // example.mas.json and the designs started from it: +7.2913 V for 0.45 T against -6.1353 V
    // for 0.405 T. MKF refuses it as not volt-second balanced since ABT #1467 (0.259 of the mean
    // absolute voltage against a limit of 0.25) and corrected its own copy (ABT #1837).
    const mas = fixture('default_two_winding_pq2715.json');
    const period = 5e-6;
    const [primary, secondary] = mas.inputs.operatingPoints[0].excitationsPerWinding;
    for (const excitation of [primary, secondary]) {
      excitation.frequency = 1 / period;
    }
    primary.current = { waveform: { data: [-5, 5, -5], time: [0, period / 2, period] }, processed: { label: 'triangular', peakToPeak: 10, offset: 0, dutyCycle: 0.5 } };
    primary.voltage = { waveform: { data: [-50, 50, 50, -50, -50], time: [0, 0, period / 2, period / 2, period] }, processed: { label: 'rectangular', peakToPeak: 100, offset: 0, dutyCycle: 0.5 } };
    secondary.current = { waveform: { data: [-5, 5, -5], time: [0, period / 2, period] }, processed: { label: 'triangular', peakToPeak: 10, offset: 0, dutyCycle: 0.5 } };
    secondary.voltage = {
      waveform: {
        data: [0, 7.291333333333334, 7.291333333333334, -6.135333333333334, -6.135333333333334, 0, 0],
        time: [0, 0, 2.25e-06, 2.25e-06, 4.275e-06, 4.275e-06, 5e-06],
      },
      processed: { label: 'rectangularWithDeadtime', peakToPeak: 13.426666666666668, offset: 0, dutyCycle: 0.45 },
    };
    const warnings = [];
    page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()); });
    const { mas: loaded } = await load(page, mas, 'old_forward_example_secondary.json');
    expect(warnings.filter((text) => text.includes('MKF could not complete this design')), 'MKF completes the design').toEqual([]);
    const { data, time } = loaded.inputs.operatingPoints[0].excitationsPerWinding[1].voltage.waveform;
    let voltSeconds = 0;
    let absoluteVoltSeconds = 0;
    for (let index = 1; index < data.length; index++) {
      const step = time[index] - time[index - 1];
      voltSeconds += (data[index] + data[index - 1]) / 2 * step;
      absoluteVoltSeconds += (Math.abs(data[index]) + Math.abs(data[index - 1])) / 2 * step;
    }
    expect(Math.max(...data)).toBeCloseTo(7.291333333333334, 6);
    expect(Math.min(...data)).toBeCloseTo(-6.135333333333334, 6);
    expect(Math.abs(voltSeconds) / absoluteVoltSeconds, 'net volt-seconds over the period, against the absolute ones').toBeLessThan(0.03);
  });

  test('LOADMAS-LEGACY-14: a design that names its core and wires opens with its magnetic completed when MKF refuses its operating point', async ({ page }) => {
    const mas = fixture('forward_xfmr_unknown_wire.json');
    for (const winding of mas.magnetic.coil.functionalDescription) {
      expect(typeof winding.wire, 'the fixture names its wires').toBe('string');
      winding.wire = 'Round 0.80 - Grade 1';
    }
    expect(typeof mas.magnetic.core.functionalDescription.shape, 'the fixture names its core shape').toBe('string');
    // A primary voltage whose volt-seconds do not balance (0 / +60 V): MKF refuses the design.
    const excitations = mas.inputs.operatingPoints[0].excitationsPerWinding;
    const period = 1 / excitations[0].frequency;
    excitations[0].voltage = { waveform: { data: [0, 60, 60, 0, 0], time: [0, 0, period / 2, period / 2, period] } };
    expect(excitations[1].current.waveform, 'the other signals are given by their processed data alone').toBeUndefined();
    const warnings = [];
    page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()); });
    const { mas: loaded } = await load(page, mas, 'named_parts_unbalanced.json');
    const refusals = warnings.filter((text) => text.includes('MKF could not complete this design'));
    expect(refusals.length, 'MKF refused the design').toBeGreaterThan(0);
    expect(refusals[0]).toContain('not volt-second balanced');
    expect(refusals[0]).toContain('opened with its magnetic completed');
    // The magnetic is MKF's completion of what the file names.
    const core = loaded.magnetic.core;
    expect(core.functionalDescription.shape.name).toBe(mas.magnetic.core.functionalDescription.shape);
    expect(core.functionalDescription.material.name).toBe(mas.magnetic.core.functionalDescription.material);
    expect(core.processedDescription.effectiveParameters.effectiveArea).toBeGreaterThan(0);
    for (const winding of loaded.magnetic.coil.functionalDescription) {
      expect(winding.wire.conductingDiameter.nominal, `${winding.name} wire is resolved`).toBeCloseTo(0.0008, 9);
    }
    expect(loaded.magnetic.coil.functionalDescription.map((winding) => winding.numberTurns))
      .toEqual(mas.magnetic.coil.functionalDescription.map((winding) => winding.numberTurns));
    // The inputs are the file's: the unbalanced voltage is still there for the user to correct,
    // and the signals given by processed data alone have the waveform MKF builds from it.
    const loadedExcitations = loaded.inputs.operatingPoints[0].excitationsPerWinding;
    expect(loadedExcitations[0].voltage.waveform.data).toEqual([0, 60, 60, 0, 0]);
    const builtCurrent = loadedExcitations[1].current;
    expect(builtCurrent.waveform.data.length).toBeGreaterThan(2);
    expect(Math.max(...builtCurrent.waveform.data) - Math.min(...builtCurrent.waveform.data))
      .toBeCloseTo(excitations[1].current.processed.peakToPeak, 1);
    // ... and its harmonics: without them the Wire Info panel showed -1 for every AC figure
    // ("[MISSING_DATA] Current is missing harmonics").
    for (const [index, excitation] of loadedExcitations.entries()) {
      expect(excitation.current.harmonics?.amplitudes?.length, `winding ${index} current has harmonics`).toBeGreaterThan(1);
      expect(excitation.current.harmonics.frequencies[1], `winding ${index} fundamental`).toBeCloseTo(excitations[index].frequency, 3);
    }
    const issue = page.locator('[data-cy$="-CalculationIssue"]').first();
    await expect(issue).toBeVisible({ timeout: 60000 });
    await expect(issue).toContainText('not volt-second balanced');
  });

  test('LOADMAS-LEGACY-15: a signal MKF cannot build from its processed data refuses the load by name', async ({ page }) => {
    const mas = fixture('forward_xfmr_unknown_wire.json');
    for (const winding of mas.magnetic.coil.functionalDescription) winding.wire = 'Round 0.80 - Grade 1';
    const excitations = mas.inputs.operatingPoints[0].excitationsPerWinding;
    const period = 1 / excitations[0].frequency;
    // MKF refuses the design (volt-seconds do not balance) ...
    excitations[0].voltage = { waveform: { data: [0, 60, 60, 0, 0], time: [0, 0, period / 2, period / 2, period] } };
    // ... and a 'custom' label has no shape MKF could build a waveform from.
    excitations[2].name = 'Auxiliary';
    excitations[2].current = { processed: { label: 'custom', peakToPeak: 2, offset: 10, dutyCycle: 0.35 } };
    const alerts = [];
    page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles({
      name: 'named_parts_unbuildable_signal.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(mas)),
    });
    await expect.poll(() => alerts.length, { timeout: 120000 }).toBe(1);
    expect(alerts[0]).toContain('Could not load this file: MKF could not complete this design');
    expect(alerts[0], 'the signal is named').toContain("'Auxiliary' current");
    expect(alerts[0], "MKF's reason is given").toContain('Waveform must have at least 2 data points');
    expect(new URL(page.url()).pathname, 'nothing is opened').not.toContain('magnetic_tool');
  });

  test('LOADMAS-LEGACY-8: a design saved before a core was chosen opens on its inputs (ABT #344)', async ({ page }) => {
    const mas = fixture('etd49_wound_10uH_5T.json');
    mas.magnetic = {
      coil: { bobbin: 'Dummy', functionalDescription: [{ name: 'Primary', numberTurns: 0, numberParallels: 0, isolationSide: 'primary', wire: '' }] },
      core: { name: 'DummyCore', functionalDescription: { type: 'two-piece set', material: '', shape: '', gapping: [], numberStacks: 1 } },
    };
    const warnings = [];
    page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()); });
    const { mas: loaded } = await load(page, mas, 'inputs_only.json');
    expect(warnings.filter((text) => text.includes('MKF could not complete')), 'MKF is not asked to complete a design without a core').toEqual([]);
    expect(loaded.magnetic.core.functionalDescription.shape).toBe('');
    expect(loaded.inputs.designRequirements.magnetizingInductance).toEqual(mas.inputs.designRequirements.magnetizingInductance);
  });
});
