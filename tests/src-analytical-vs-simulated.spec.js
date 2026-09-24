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
 *   · Confirm the simulated operating point is one canonical period at the
 *     switching frequency whatever `numberOfPeriods` says (the knob is
 *     display tiling, done in the chart layer).
 *   · Confirm secondary current scales by ~1/turnsRatio versus primary
 *     (a basic converter input/output correctness check — distinguishes
 *     a real SPICE simulation from a zero/garbage stub).
 *
 * Physics correctness (cycle-mean power balance, tank energy, etc.) is
 * the responsibility of MKF unit tests; this is the wiring contract.
 */

import { test, expect } from './_coverage.js';
import { openWizard, pause } from './utils.js';
import { runSimulated } from './utils/index.js';

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

  // webKirchhoff returns its operating points unnamed (for every topology); the
  // old webMKF SRC path named them after the input rail. The wizard base names
  // any unnamed point ("Operating Point N", ConverterWizardBase.
  // assignResultsToMasStore) before it reaches the design, because the Magnetic
  // Tool renders "<name> — <winding>" and an unnamed point showed as
  // "null — Primary". So the contract is on what the wizard STORES after a
  // Simulated run, not on the raw engine JSON.
  test('SRC-UI-4: the simulated operating point the wizard stores has a non-empty name', async ({ page }) => {
    await openWizard(page, SRC_CY);
    await runSimulated(page, { timeoutMs: 120_000 });
    const op = await page.evaluate(() => {
      const mas = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas;
      const p = mas.inputs.operatingPoints?.[0];
      return p ? { name: p.name, samples: p.excitationsPerWinding?.[0]?.current?.waveform?.data?.length ?? 0 } : null;
    });
    expect(op, 'a simulated operating point is stored').toBeTruthy();
    expect(op.samples, 'the stored point carries the simulated waveform').toBeGreaterThan(10);
    expect(typeof op.name).toBe('string');
    expect(op.name.length).toBeGreaterThan(0);
    expect(op.name).not.toMatch(/null|undefined/);
  });

  // The Periods knob is display-only: ConverterWizardBase.tileWaveformsForDisplay
  // tiles the PLOTTED arrays, while the operating point the engine returns stays
  // canonical — one steady-state period at the switching frequency, because
  // harmonics and advisers read a timed waveform's span as 1/f (see CMC-UI-5 and
  // ABT #1356, where N periods handed over as one put the fundamental at N·f).
  // This test pinned "the span grows with numberOfPeriods" until 2026-09-24.
  test('SRC-UI-5: the simulated operating point is one canonical period whatever numberOfPeriods is', async ({ page }) => {
    await openWizard(page, SRC_CY);
    const { simulated: sim2 } = await runBothPaths(page, makeAux(2, 30));
    const { simulated: sim4 } = await runBothPaths(page, makeAux(4, 30));

    const spans = [];
    for (const [periods, sim] of [[2, sim2], [4, sim4]]) {
      const exc = firstOp(sim)?.excitationsPerWinding?.[0];
      const f = exc?.frequency;
      const t = exc?.current?.waveform?.time ?? [];
      expect(f, `numberOfPeriods=${periods}: excitation frequency`).toBeGreaterThan(0);
      expect(t.length, `numberOfPeriods=${periods}: current samples`).toBeGreaterThan(5);
      const span = t[t.length - 1] - t[0];
      spans.push(span);
      // The dominant AC harmonic of the tank current must sit at f, not at N·f.
      const h = exc.current.harmonics;
      expect(h?.frequencies?.length, `numberOfPeriods=${periods}: current harmonics`).toBeGreaterThan(2);
      let k = 1;
      for (let i = 1; i < h.amplitudes.length; i++) if (h.amplitudes[i] > h.amplitudes[k]) k = i;
      console.log(`[SRC-UI-5] numberOfPeriods=${periods}: f=${f} span=${span.toExponential(3)}s (1/f=${(1 / f).toExponential(3)}s) dominant harmonic ${h.frequencies[k]} Hz`);
      // One period, within 2 % (sampled at 128 points, the last sample sits one step before 1/f).
      expect(Math.abs(span * f - 1), `numberOfPeriods=${periods}: span must be 1/f`).toBeLessThan(0.02);
      expect(Math.abs(h.frequencies[k] / f - 1), `numberOfPeriods=${periods}: fundamental at f`).toBeLessThan(0.01);
    }
    // The knob never leaks into the returned data.
    expect(Math.abs(spans[1] / spans[0] - 1)).toBeLessThan(0.01);
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
