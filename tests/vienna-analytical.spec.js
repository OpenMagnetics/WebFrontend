/**
 * Vienna wizard — analytical waveform testbench.
 *
 * Vienna has no SPICE in MKF yet (Phase-1 SPICE is single-phase emulation
 * and not wired to the wizard — `getSimulateFn` falls back to the
 * analytical path). So this spec exercises only `calculate_vienna_inputs`,
 * but checks:
 *
 *   · The JSON has a `designRequirements` block.
 *   · The Phase-A operating point carries `excitationsPerWinding` (the
 *     wizard renders three identical phase magnetics from this one OP,
 *     so the array must be ≥ 1 winding with non-empty waveform data).
 *   · The boost inductor sees a triangular ripple current (peak > 0).
 *   · The phase voltage rms is in the expected ballpark for the input
 *     (400 Vac line-to-line → 230 Vac line-to-neutral nominally).
 *
 * This catches a class of bugs the catalog battery cannot: an analytical
 * path that returns the shape but with all-zero waveforms (e.g. solver
 * silently early-returns when an unsupported variant is requested).
 */

import { test, expect } from './_coverage.js';
import { openWizard, pause } from './utils.js';

const VIENNA_CY = 'Vienna-link';

const makeAux = () => ({
  lineToLineVoltage: { nominal: 400, tolerance: 0.1 },
  lineFrequency: 50,
  outputDcVoltage: 800,
  switchingFrequency: 20000,
  // Interleave count (MKF Phase-1+2 supports only 1). The wizard UI
  // shows 3 grid phases for context; this field is the per-leg
  // interleave channel count.
  phaseCount: 1,
  powerFactor: 0.99,
  currentRippleRatio: 0.25,
  efficiency: 0.97,
  viennaVariant: 'viennaI',
  switchType: 'tType',
  samplingStrategy: 'peakOfLineOnly',
  synchronousRectifier: false,
  operatingPoints: [{
    outputVoltages: [800],
    outputCurrents: [10000 / 800], // 10 kW
    switchingFrequency: 20000,
    ambientTemperature: 40,
  }],
});

async function runAnalytical(page, aux) {
  await page.waitForFunction(() => {
    const pinia = document.querySelector('#app')?.__vue_app__
      ?.config?.globalProperties?.$pinia;
    return !!(pinia?._s && pinia._s.get('taskQueue'));
  }, { timeout: 30000 });
  return await page.evaluate(async (auxIn) => {
    const pinia = document.querySelector('#app').__vue_app__
      .config.globalProperties.$pinia;
    const store = pinia._s.get('taskQueue');
    return await store.calculateViennaInputs(auxIn);
  }, aux);
}

async function runSimulated(page, aux) {
  await page.waitForFunction(() => {
    const pinia = document.querySelector('#app')?.__vue_app__
      ?.config?.globalProperties?.$pinia;
    return !!(pinia?._s && pinia._s.get('taskQueue'));
  }, { timeout: 30000 });
  return await page.evaluate(async (auxIn) => {
    const pinia = document.querySelector('#app').__vue_app__
      .config.globalProperties.$pinia;
    const store = pinia._s.get('taskQueue');
    return await store.simulateViennaIdealWaveforms(auxIn);
  }, aux);
}

function firstOp(blob) {
  return blob?.operatingPoints?.[0] ?? blob?.inputs?.operatingPoints?.[0] ?? null;
}

test.describe('Vienna wizard — analytical waveform testbench', () => {
  // webKirchhoff runs a REAL 3-phase Vienna ngspice deck (the old single-phase
  // emulation is retired) — one simulated run measures ~76 s in-wasm, plus the
  // cold engine_loader on first open. 300 s covers run + warm-up honestly.
  test.setTimeout(300000);

  test('Vienna-UI-1: analytical returns without throwing', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await openWizard(page, VIENNA_CY);
    const result = await runAnalytical(page, makeAux());
    expect(result).toBeTruthy();
    expect(errors).toEqual([]);
  });

  test('Vienna-UI-2: response has designRequirements + ≥1 OP with windings', async ({ page }) => {
    await openWizard(page, VIENNA_CY);
    const result = await runAnalytical(page, makeAux());
    expect(result?.designRequirements?.magnetizingInductance).toBeTruthy();
    const op = firstOp(result);
    expect(op).toBeTruthy();
    expect(op.excitationsPerWinding?.length).toBeGreaterThanOrEqual(1);
  });

  test('Vienna-UI-3: boost inductor current has non-zero ripple', async ({ page }) => {
    // Vienna boost inductor at peak-of-line: triangular ripple riding on
    // the line-current peak. Both AC ripple peak and a non-zero DC offset
    // (line current peak) should be present. Catches an analytical path
    // that returns shape-only stubs.
    await openWizard(page, VIENNA_CY);
    const result = await runAnalytical(page, makeAux());
    const op = firstOp(result);
    const iWave = op.excitationsPerWinding[0]?.current?.waveform?.data ?? [];
    expect(iWave.length).toBeGreaterThan(10);
    const peak = Math.max(...iWave);
    const trough = Math.min(...iWave);
    const ripple = peak - trough;
    console.log(`[Vienna-UI-3] I_L peak=${peak.toFixed(2)} A  trough=${trough.toFixed(2)} A  ripple=${ripple.toFixed(2)} A`);
    expect(peak).toBeGreaterThan(0);
    expect(ripple).toBeGreaterThan(0);
  });

  test('Vienna-UI-4: changing output power scales the inductor current', async ({ page }) => {
    // Sanity that user inputs flow to the solver: at constant Vdc=800V,
    // doubling power should ~double the peak inductor current.
    await openWizard(page, VIENNA_CY);
    const aux10kW = makeAux();
    const aux20kW = makeAux();
    aux20kW.operatingPoints[0].outputCurrents = [20000 / 800];

    const r10 = await runAnalytical(page, aux10kW);
    const r20 = await runAnalytical(page, aux20kW);

    const pk = (op) => {
      const w = op.excitationsPerWinding[0]?.current?.waveform?.data ?? [];
      return Math.max(...w);
    };
    const i10 = pk(firstOp(r10));
    const i20 = pk(firstOp(r20));
    console.log(`[Vienna-UI-4] I_L@10kW=${i10.toFixed(2)} A  I_L@20kW=${i20.toFixed(2)} A  ratio=${(i20/i10).toFixed(2)}`);
    expect(i10).toBeGreaterThan(0);
    expect(i20).toBeGreaterThan(0);
    expect(i20 / i10).toBeGreaterThan(1.5);
    expect(i20 / i10).toBeLessThan(2.5);
  });

  test('Vienna-UI-5: wizard renders canvases after Analytical click', async ({ page }) => {
    await openWizard(page, VIENNA_CY);
    await page.locator('.sim-btn.analytical').click();
    await pause(page, 2000, 'mechanical: settle');
    const canvasCount = await page.locator('canvas').count();
    console.log(`[Vienna-UI-5] canvas count after Analytical = ${canvasCount}`);
    expect(canvasCount).toBeGreaterThan(0);
  });

  // ────────────────────────────────────────────────────────────────────────
  // SPICE path (Phase-1 single-phase emulation — see Vienna.h FIXME-vienna-1
  // and WebLibMKF::simulate_vienna_ideal_waveforms for details).
  // ────────────────────────────────────────────────────────────────────────

  test('Vienna-UI-6: simulated returns waveforms + diagnostics', async ({ page }) => {
    await openWizard(page, VIENNA_CY);
    const result = await runSimulated(page, makeAux());
    expect(result).toBeTruthy();
    // webKirchhoff contract (KH is the master): MAS Inputs at the ROOT
    // (designRequirements / operatingPoints), the universal KH diagnostics
    // envelope under viennaDiagnostics, and — for PFC/Vienna specifically —
    // converter-node overlays deliberately skipped (their line-frequency
    // window makes the extra ngspice run prohibitively slow), with the
    // reason surfaced in converterWaveformsError. The old single-phase
    // emulation (spiceMode badge) is retired: this is a real 3-phase deck.
    expect(result?.designRequirements?.magnetizingInductance).toBeTruthy();
    expect(Array.isArray(result?.operatingPoints)).toBe(true);
    expect(result.operatingPoints.length).toBeGreaterThan(0);
    expect(Array.isArray(result?.converterWaveforms)).toBe(true);
    expect(result.converterWaveforms.length).toBe(0);
    expect(result?.converterWaveformsError).toMatch(/overlays are disabled for PFC\/Vienna/);
    expect(result?.viennaDiagnostics).toBeTruthy();

    const op = firstOp(result);
    expect(op?.excitationsPerWinding?.length).toBeGreaterThanOrEqual(1);
    const exc = op.excitationsPerWinding[0];
    expect(exc?.current?.waveform?.data?.length).toBeGreaterThan(10);
    expect(exc?.voltage?.waveform?.data?.length).toBeGreaterThan(10);
    const pk = Math.max(...exc.current.waveform.data.map(Math.abs));
    console.log(`[Vienna-UI-6] SPICE I_L peak=${pk.toFixed(2)} A`);
    expect(pk).toBeGreaterThan(0.1);
  });

  test('Vienna-UI-7: SPICE inductor current peak ≈ analytical (within 25 %)', async ({ page }) => {
    // The Phase-1 SPICE single-phase emulation should converge to the
    // same per-phase peak inductor current as the analytical solver
    // (which computes I_L,peak from line-current peak + ripple). Looser
    // tolerance than SRC because the analytical model uses an idealised
    // duty d=1-M while SPICE switches finite-time. ±25 % catches a hard
    // probe / scaling bug; tighter physics correctness is MKF's domain.
    await openWizard(page, VIENNA_CY);
    const aux = makeAux();
    const analytical = await runAnalytical(page, aux);
    const simulated = await runSimulated(page, aux);

    const aOp = firstOp(analytical);
    const sOp = firstOp(simulated);
    const aPk = Math.max(...(aOp.excitationsPerWinding[0]?.current?.waveform?.data ?? []));
    const sPk = Math.max(...(sOp.excitationsPerWinding[0]?.current?.waveform?.data?.map(Math.abs) ?? []));
    console.log(`[Vienna-UI-7] analytical I_L peak=${aPk.toFixed(2)} A  SPICE I_L peak=${sPk.toFixed(2)} A  ratio=${(sPk/aPk).toFixed(2)}`);

    expect(aPk).toBeGreaterThan(0);
    expect(sPk).toBeGreaterThan(0);
    const ratio = sPk / aPk;
    expect(ratio).toBeGreaterThan(0.75);
    expect(ratio).toBeLessThan(1.25);
  });
});
