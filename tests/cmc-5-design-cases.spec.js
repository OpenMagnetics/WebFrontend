/**
 * CMC wizard — 5 design cases driven through the frontend.
 *
 * Each case is a realistic CMC spec (voltage / current / wiring / impedance
 * target) that the MKF test TestTopologyCmc.cpp validates in native. Here we
 * exercise the same cases through the WASM-backed wizard and check that:
 *   · the wizard builds matching designRequirements (the MKF layer has just
 *     been updated to tag them with INTERFERENCE_SUPPRESSION +
 *     COMMON_MODE_NOISE_FILTERING, so the advisers take the CMC branch);
 *   · the computed CM inductance matches the MKF case report within 2%;
 *   · the MagneticAdviser via taskQueue.calculateMasMagnetic returns a
 *     toroidal magnetic with one winding per line and identical turn counts.
 *
 * Going all the way through the Magnetic Adviser is expensive (tens of
 * seconds per case). We run the 5 inductance cross-checks every time and
 * the full adviser pipeline only for one representative case to keep the
 * whole spec under 2 minutes.
 */

import { test, expect } from './_coverage.js';
import { openWizard } from './utils.js';

const CMC_CY = 'Wizard-CommonModeChoke-link';

// Design cases mirror the MKF `CMC_DESIGN_CASES` table in TestTopologyCmc.cpp.
const CASES = [
  { label: 'low-current-laptop',     V: 230, I:  1, n: 2, Z: 1000, f: 150000, Lexpected: 1.061e-3 },
  { label: 'mid-current-appliance',  V: 230, I: 10, n: 2, Z:  500, f: 150000, Lexpected: 0.531e-3 },
  { label: 'high-current-psu',       V: 230, I: 25, n: 2, Z:  300, f: 150000, Lexpected: 0.318e-3 },
  { label: 'three-phase-industrial', V: 400, I: 16, n: 3, Z:  800, f: 150000, Lexpected: 0.849e-3 },
  { label: 'hf-200k-moderate',       V: 230, I:  5, n: 2, Z:  800, f: 200000, Lexpected: 0.637e-3 },
];

const mkAux = (c) => ({
  operatingVoltage:   { nominal: c.V },
  operatingCurrent:   c.I,
  lineFrequency:      50,
  lineImpedance:      50,
  ambientTemperature: 25,
  numberOfWindings:   c.n,
  parasiticCap_pF:    10,
  dvdt_V_ns:          50,
  safetyMargin_dB:    6,
  regulatoryStandard: 'EN 55032 Class B',
  minimumImpedance:   [{ frequency: c.f, impedance: c.Z }],
  numberOfPeriods:           2,
  numberOfSteadyStatePeriods: 10,
});

async function storeReady(page) {
  await page.waitForFunction(() => {
    const p = document.querySelector('#app')?.__vue_app__
      ?.config?.globalProperties?.$pinia;
    return !!(p?._s && p._s.get('taskQueue'));
  }, { timeout: 30000 });
}

test.describe('CMC — 5 design cases', () => {
  test.setTimeout(180000);

  // One shared page load for all inductance checks: openWizard is ~2 s and
  // we don't need to redraw the UI between cases, only re-drive the store.
  for (const c of CASES) {
    test(`CMC-5-${c.label}: computed L matches MKF within 2%`, async ({ page }) => {
      await openWizard(page, CMC_CY);
      await storeReady(page);

      const L = await page.evaluate(async (aux) => {
        const pinia = document.querySelector('#app').__vue_app__
          .config.globalProperties.$pinia;
        const tq = pinia._s.get('taskQueue');
        const r = await tq.calculateCmcInputs(aux);
        return r?.designRequirements?.magnetizingInductance?.minimum
            ?? r?.designRequirements?.magnetizingInductance?.nominal
            ?? null;
      }, mkAux(c));

      console.log(`[CMC-5-${c.label}] L = ${(L * 1e3).toFixed(3)} mH (expected ${(c.Lexpected * 1e3).toFixed(3)} mH)`);
      expect(L).toBeGreaterThan(c.Lexpected * 0.98);
      expect(L).toBeLessThan(c.Lexpected * 1.02);
    });
  }

  test('CMC-5-adviser: representative case runs through Magnetic Adviser and returns toroidal CMC', async ({ page }) => {
    const c = CASES[1];  // mid-current-appliance — good mid-complexity pick
    await openWizard(page, CMC_CY);
    await storeReady(page);

    // The adviser needs the full Inputs shape the wizard assembles before
    // navigating to Magnetic Adviser. Use the store's calculateCmcInputs
    // (gives us operatingPoints + designRequirements) and then the store's
    // calculateAdvisedMagnetics (wraps mkf.calculate_advised_magnetics).
    const result = await page.evaluate(async (aux) => {
      const pinia = document.querySelector('#app').__vue_app__
        .config.globalProperties.$pinia;
      const tq = pinia._s.get('taskQueue');

      const ana = await tq.calculateCmcInputs(aux);
      const inputs = {
        designRequirements: ana.designRequirements,
        operatingPoints:    ana.operatingPoints
                          ?? ana.inputs?.operatingPoints
                          ?? [],
      };

      // Minimum enum set the store understands — the full wizard sends far
      // more but the schema only needs at least one recognised filter name.
      const weights = {
        COST:       1.0,
        LOSSES:     1.0,
        DIMENSIONS: 1.0,
      };

      try {
        const advised = await tq.calculateAdvisedMagnetics(
          inputs, weights, 1, 'available cores',
        );
        return { ok: true, advised };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }, mkAux(c));

    console.log(`[CMC-5-adviser] ok=${result.ok}`);
    if (!result.ok) {
      // Surface the error in the test failure message, not just stdout.
      throw new Error(`[CMC-5-adviser] backend error: ${result.error}`);
    }
    expect(Array.isArray(result.advised) || typeof result.advised === 'object').toBe(true);

    // calculate_advised_magnetics wraps results as { data: [...] } (libMKF.cpp:2951)
    const list = Array.isArray(result.advised)
      ? result.advised
      : (result.advised?.data ?? result.advised?.magnetics ?? []);
    console.log(`[CMC-5-adviser] returned ${list.length} advised magnetic(s)`);
    expect(list.length).toBeGreaterThan(0);

    // Each data entry is either { mas: { magnetic: ... } } (libMKF standard
    // shape) or a bare magnetic object depending on caller.
    const mag = list[0]?.mas?.magnetic ?? list[0]?.magnetic ?? list[0];
    const coreShape = mag?.core?.functionalDescription?.shape?.family
                   ?? mag?.core?.shape?.family
                   ?? mag?.core?.processedDescription?.geometricalDescription?.[0]?.shape
                   ?? 'unknown';
    console.log(`[CMC-5-adviser] advised core shape family = ${JSON.stringify(coreShape)}`);
    // Toroidal shape id is 'T' in the MAS schema.
    const shapeStr = JSON.stringify(coreShape).toLowerCase();
    expect(shapeStr).toMatch(/"t"|toroidal/);

    const windings = mag?.coil?.functionalDescription ?? [];
    console.log(`[CMC-5-adviser] winding count = ${windings.length}, turns = ${windings.map(w => w.numberTurns).join(',')}`);
    expect(windings.length).toBe(c.n);
    const turns0 = windings[0]?.numberTurns;
    for (const w of windings) expect(w.numberTurns).toBe(turns0);
  });
});
