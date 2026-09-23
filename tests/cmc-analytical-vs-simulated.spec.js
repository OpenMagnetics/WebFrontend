/**
 * CMC wizard — UI wiring smoke test.
 *
 * Physics correctness (peak agreement, shape, scaling) is verified in MKF
 * (Test_Cmc_AnalyticalVsSimulated_CurrentConsistency and
 * Test_Cmc_AnalyticalVsSimulated_WaveformShapeEquality) against the native
 * ngspice build. This spec only checks what the frontend owns:
 *   · the wizard loads and wires the store correctly,
 *   · both WASM entry points return JSON with the expected shape,
 *   · the operating-point label is "Simulated",
 *   · the simulated operating point is one canonical period at the excitation
 *     frequency whatever numberOfPeriods says (the knob is display tiling),
 *   · nothing throws in the browser.
 */

import { test, expect } from './_coverage.js';
import { openWizard, pause } from './utils.js';

const CMC_CY = 'Cmc-link';

const makeAux = (numPeriods = 2, numSteady = 10) => ({
  operatingVoltage:   { nominal: 230 },
  operatingCurrent:   5.0,
  lineFrequency:      50.0,
  lineImpedance:      50.0,
  ambientTemperature: 25.0,
  numberOfWindings:   2,
  parasiticCap_pF:    10.0,
  dvdt_V_ns:          50.0,
  safetyMargin_dB:    6.0,
  regulatoryStandard: 'EN 55032 Class B',
  numberOfPeriods:           numPeriods,
  numberOfSteadyStatePeriods: numSteady,
});

// Reach the app's Pinia taskQueue store and call both entry points. Pinia
// registers stores on app.config.globalProperties.$pinia._s by name.
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

    const analytical = await store.calculateCmcInputs(auxIn);
    const inductance =
      analytical?.designRequirements?.magnetizingInductance?.nominal ??
      analytical?.designRequirements?.magnetizingInductance?.minimum ??
      1e-3;

    const simulated = await store.simulateCmcIdealWaveforms(
      auxIn,
      inductance,
      auxIn.parasiticCap_pF,
      auxIn.dvdt_V_ns,
    );
    return { analytical, simulated };
  }, aux);
}

function firstOp(sim) {
  const ops =
    sim?.operatingPoints ??
    sim?.inputs?.operatingPoints ??
    sim?.converterWaveforms ??
    [];
  return ops?.[0];
}

test.describe('CMC wizard — UI wiring', () => {
  test.setTimeout(120000);

  test('CMC-UI-1: wizard loads and both paths return without throwing', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await openWizard(page, CMC_CY);
    const { analytical, simulated } = await runBothPaths(page, makeAux());

    expect(analytical).toBeTruthy();
    expect(simulated).toBeTruthy();
    expect(errors).toEqual([]);
  });

  test('CMC-UI-2: analytical response has the shape CmcWizard consumes', async ({ page }) => {
    await openWizard(page, CMC_CY);
    const { analytical } = await runBothPaths(page, makeAux());

    const ops = analytical?.operatingPoints ?? analytical?.inputs?.operatingPoints ?? [];
    expect(ops.length).toBeGreaterThan(0);
    expect(ops[0]?.excitationsPerWinding?.length).toBeGreaterThanOrEqual(2);
    expect(analytical?.designRequirements?.magnetizingInductance).toBeTruthy();
  });

  test('CMC-UI-3: simulated response has operatingPoints with waveform data', async ({ page }) => {
    await openWizard(page, CMC_CY);
    const { simulated } = await runBothPaths(page, makeAux());

    const op = firstOp(simulated);
    expect(op).toBeTruthy();
    expect(op.excitationsPerWinding?.length).toBeGreaterThanOrEqual(2);

    const exc = op.excitationsPerWinding[0];
    expect(exc?.current?.waveform?.data?.length).toBeGreaterThan(10);
    expect(exc?.voltage?.waveform?.data?.length).toBeGreaterThan(10);
    expect(exc?.current?.waveform?.time?.length).toBeGreaterThan(10);
  });

  test('CMC-UI-4: simulated operating point is labelled "Simulated"', async ({ page }) => {
    await openWizard(page, CMC_CY);
    const { simulated } = await runBothPaths(page, makeAux());
    const op = firstOp(simulated);
    expect(op?.name).toBe('Simulated');
  });

  // The Periods knob is display-only: ConverterWizardBase.tileWaveformsForDisplay
  // tiles the PLOTTED arrays, while the operating point the engine returns must
  // stay canonical — exactly one steady-state period at the excitation
  // frequency, since harmonics and advisers read a timed waveform's span as
  // 1/f. Kirchhoff used to hand back numberOfPeriods cycles as one waveform, so
  // a 150 kHz CM sine came back with its fundamental at 300 kHz and THD in the
  // hundreds (ABT #1356); this test pinned that as "the span grows with
  // numberOfPeriods" until 2026-09-23.
  test('CMC-UI-5: the simulated operating point is one canonical period whatever numberOfPeriods is', async ({ page }) => {
    await openWizard(page, CMC_CY);
    const { simulated: sim2 } = await runBothPaths(page, makeAux(2, 5));
    const { simulated: sim4 } = await runBothPaths(page, makeAux(4, 5));

    const spans = [];
    for (const [periods, sim] of [[2, sim2], [4, sim4]]) {
      const exc = firstOp(sim)?.excitationsPerWinding?.[0];
      const f = exc?.frequency;
      const t = exc?.current?.waveform?.time ?? [];
      expect(f, `numberOfPeriods=${periods}: excitation frequency`).toBeGreaterThan(0);
      expect(t.length, `numberOfPeriods=${periods}: current samples`).toBeGreaterThan(5);
      const span = t[t.length - 1] - t[0];
      spans.push(span);
      console.log(`[CMC-UI-5] numberOfPeriods=${periods}: f=${f} span=${span.toExponential(3)}s (1/f=${(1 / f).toExponential(3)}s)`
        + ` label=${exc.current.processed?.label} acEff=${exc.current.processed?.acEffectiveFrequency}`);
      // One period, within 2 % (the engine interpolates the window's first point at tEnd - 1/f).
      expect(Math.abs(span * f - 1), `numberOfPeriods=${periods}: span must be 1/f`).toBeLessThan(0.02);
      // ... and processed as the sine it is, with the fundamental at f — not at numberOfPeriods·f.
      expect(exc.current.processed?.label, `numberOfPeriods=${periods}: current label`).toBe('sinusoidal');
      expect(Math.abs(exc.current.processed.acEffectiveFrequency / f - 1), `numberOfPeriods=${periods}: AC effective frequency`).toBeLessThan(0.05);
      expect(exc.voltage?.processed?.label, `numberOfPeriods=${periods}: voltage label`).toBe('sinusoidal');
    }
    // The knob never leaks into the stored data.
    expect(Math.abs(spans[1] / spans[0] - 1)).toBeLessThan(0.01);
  });

  test('CMC-UI-6: wizard renders canvases after an analytical run', async ({ page }) => {
    // Smoke: the user clicking Analytical should produce at least one chart.
    await openWizard(page, CMC_CY);
    await page.locator('.sim-btn.analytical').click();
    // Give the post-processing and chart mount some time.
    await pause(page, 2000, 'mechanical: settle');
    const canvasCount = await page.locator('canvas').count();
    console.log(`[CMC-UI-6] canvas count after Analytical = ${canvasCount}`);
    expect(canvasCount).toBeGreaterThan(0);
  });
});
