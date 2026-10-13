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
