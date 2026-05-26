/**
 * SRC wizard — deep analytical-vs-simulated testbench.
 *
 * The catalog battery (`tests/wizards/src.spec.js`) only confirms UI
 * wiring (canvas appears after Analytical click, no `.error-text`). This
 * spec goes one level deeper, using the CMC testbench pattern
 * (`cmc-analytical-vs-simulated.spec.js`):
 *
 *   · Drive `calculate_src_inputs` AND `simulate_src_ideal_waveforms`
 *     directly through the Pinia `taskQueue` store (no UI hops, so we
 *     can assert on the raw JSON the wizard would have consumed).
 *   · Confirm analytical returns `designRequirements` + at least one
 *     operating point with non-empty `excitationsPerWinding`.
 *   · Confirm simulated returns waveforms with > 10 samples on both
 *     primary and secondary current/voltage probes (proves the SPICE
 *     ran and the probes are wired, not just empty stubs).
 *   · Confirm `numberOfPeriods` flows through and stretches the time
 *     span proportionally (sanity check that the UI param actually
 *     reaches the netlist).
 *   · Confirm secondary current scales by ~1/turnsRatio versus primary
 *     (a basic converter input/output correctness check — distinguishes
 *     a real SPICE simulation from a zero/garbage stub).
 *
 * Physics correctness (cycle-mean power balance, tank energy, etc.) is
 * the responsibility of MKF unit tests; this is the wiring contract.
 */

import { test, expect } from './_coverage.js';
import { openWizard, pause } from './utils.js';

const SRC_CY = 'Src-link';

// Mirrors SrcWizard.vue defaults so the testbench tracks what users see.
// 400 Vdc in → 48 V / 500 W out, 8.33:1 isolated full-bridge with FB
// rectifier, 100 kHz resonant (op range 80-150 kHz), Q=1.0.
const makeAux = (numPeriods = 2, numSteady = 50) => ({
  inputVoltage: { nominal: 400, tolerance: 0.1 },
  bridgeType: 'fullBridge',
  minSwitchingFrequency: 80000,
  maxSwitchingFrequency: 150000,
  resonantFrequency: 100000,
  qualityFactor: 1.0,
  rectifierType: 'fullBridgeDiode',
  useSynchronousRectifier: false,
  isolated: true,
  efficiency: 0.96,
  operatingPoints: [{
    outputVoltages: [48],
    outputCurrents: [500 / 48],
    switchingFrequency: 100000,
    ambientTemperature: 25,
  }],
  // simulate_src_ideal_waveforms extras (SrcWizard.buildParams 'simulation'):
  turnsRatio: 8.33,
  magnetizingInductance: 1e-3,
  numberOfPeriods: numPeriods,
  numberOfSteadyStatePeriods: numSteady,
});

async function runBothPaths(page, aux) {
  await page.waitForFunction(() => {
    const pinia = document.querySelector('#app')?.__vue_app__
      ?.config?.globalProperties?.$pinia;
    return !!(pinia?._s && pinia._s.get('taskQueue'));
  }, { timeout: 30000 });

  return await page.evaluate(async (auxIn) => {
    const pinia = document.querySelector('#app').__vue_app__
      .config.globalProperties.$pinia;
    const store = pinia._s.get('taskQueue');
    const analytical = await store.calculateSrcInputs(auxIn);
    const simulated = await store.simulateSrcIdealWaveforms(auxIn);
    return { analytical, simulated };
  }, aux);
}

function firstOp(blob) {
  return (
    blob?.operatingPoints?.[0] ??
    blob?.inputs?.operatingPoints?.[0] ??
    blob?.converterWaveforms?.[0] ??
    null
  );
}

test.describe('SRC wizard — analytical vs simulated', () => {
  test.setTimeout(180000);

  test('SRC-UI-1: both paths return without throwing', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await openWizard(page, SRC_CY);
    const { analytical, simulated } = await runBothPaths(page, makeAux());

    expect(analytical).toBeTruthy();
    expect(simulated).toBeTruthy();
    expect(errors).toEqual([]);
  });

  test('SRC-UI-2: analytical response has the shape SrcWizard consumes', async ({ page }) => {
    await openWizard(page, SRC_CY);
    const { analytical } = await runBothPaths(page, makeAux());

    expect(analytical?.designRequirements?.magnetizingInductance).toBeTruthy();
    expect(analytical?.designRequirements?.turnsRatios?.length).toBeGreaterThanOrEqual(1);

    const op = firstOp(analytical);
    expect(op).toBeTruthy();
    // Isolated full-bridge SRC: primary + ≥1 secondary winding.
    expect(op.excitationsPerWinding?.length).toBeGreaterThanOrEqual(2);
  });

  test('SRC-UI-3: simulated response has waveform data on every winding', async ({ page }) => {
    await openWizard(page, SRC_CY);
    const { simulated } = await runBothPaths(page, makeAux());

    const op = firstOp(simulated);
    expect(op).toBeTruthy();
    expect(op.excitationsPerWinding?.length).toBeGreaterThanOrEqual(2);

    for (const [i, exc] of op.excitationsPerWinding.entries()) {
      expect(exc?.current?.waveform?.data?.length,
        `winding ${i} current samples`).toBeGreaterThan(10);
      expect(exc?.voltage?.waveform?.data?.length,
        `winding ${i} voltage samples`).toBeGreaterThan(10);
      expect(exc?.current?.waveform?.time?.length,
        `winding ${i} time vector`).toBeGreaterThan(10);
    }
  });

  test('SRC-UI-4: simulated operating point has a non-empty name', async ({ page }) => {
    // Unlike CMC (which labels its sim op "Simulated"), SRC names ops by
    // their input voltage rail ("Nominal input (400V)" etc.). The contract
    // is only that *some* non-empty label is set so the wizard chart can
    // render it.
    await openWizard(page, SRC_CY);
    const { simulated } = await runBothPaths(page, makeAux());
    const op = firstOp(simulated);
    expect(typeof op?.name).toBe('string');
    expect(op?.name?.length).toBeGreaterThan(0);
  });

  test('SRC-UI-5: numberOfPeriods stretches the simulated time span', async ({ page }) => {
    await openWizard(page, SRC_CY);
    const { simulated: sim2 } = await runBothPaths(page, makeAux(2, 30));
    const { simulated: sim4 } = await runBothPaths(page, makeAux(4, 30));

    const t2 = firstOp(sim2)?.excitationsPerWinding?.[0]?.current?.waveform?.time ?? [];
    const t4 = firstOp(sim4)?.excitationsPerWinding?.[0]?.current?.waveform?.time ?? [];
    expect(t2.length).toBeGreaterThan(5);
    expect(t4.length).toBeGreaterThan(5);

    const span2 = t2[t2.length - 1] - t2[0];
    const span4 = t4[t4.length - 1] - t4[0];
    console.log(`[SRC-UI-5] span2=${span2.toExponential(3)}s  span4=${span4.toExponential(3)}s`);
    expect(span4).toBeGreaterThan(span2 * 1.5);
  });

  test('SRC-UI-6: secondary current ≈ primary current / turnsRatio', async ({ page }) => {
    // Probe correctness: in an isolated SRC with turnsRatio n = Np/Ns,
    // the secondary AC current must be ~n× the primary AC current (in
    // peak/RMS sense). A SPICE bug that leaves the secondary at zero,
    // or wires the wrong probe, would fail this hard.
    await openWizard(page, SRC_CY);
    const { simulated } = await runBothPaths(page, makeAux());
    const op = firstOp(simulated);
    const N = 8.33;
    const pk = (arr) => Math.max(...arr.map(Math.abs));

    const iPri = op.excitationsPerWinding[0]?.current?.waveform?.data ?? [];
    const iSec = op.excitationsPerWinding[1]?.current?.waveform?.data ?? [];
    expect(iPri.length).toBeGreaterThan(10);
    expect(iSec.length).toBeGreaterThan(10);

    const pkPri = pk(iPri);
    const pkSec = pk(iSec);
    console.log(`[SRC-UI-6] |I_pri|peak=${pkPri.toFixed(3)} A  |I_sec|peak=${pkSec.toFixed(3)} A  ratio=${(pkSec/pkPri).toFixed(2)} (expect ≈${N.toFixed(2)})`);

    // Sanity: neither winding is zero.
    expect(pkPri).toBeGreaterThan(0.01);
    expect(pkSec).toBeGreaterThan(0.01);
    // Ratio within ±50 % of n (loose tolerance — magnetising current,
    // diode conduction overlap, and resonant-tank reactive component
    // all skew it; a hard ×0 / ×∞ bug will still be caught).
    const ratio = pkSec / pkPri;
    expect(ratio).toBeGreaterThan(N * 0.5);
    expect(ratio).toBeLessThan(N * 1.5);
  });

  test('SRC-UI-7: wizard renders canvases after Analytical click (UI smoke)', async ({ page }) => {
    await openWizard(page, SRC_CY);
    await page.locator('.sim-btn.analytical').click();
    await pause(page, 2000, 'mechanical: settle');
    const canvasCount = await page.locator('canvas').count();
    console.log(`[SRC-UI-7] canvas count after Analytical = ${canvasCount}`);
    expect(canvasCount).toBeGreaterThan(0);
  });
});
