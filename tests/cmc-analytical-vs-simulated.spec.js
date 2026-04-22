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
 *   · the numberOfPeriods / numberOfSteadyStatePeriods params from the UI
 *     flow through to the backend (time span grows with numberOfPeriods),
 *   · nothing throws in the browser.
 */

import { test, expect } from './_coverage.js';
import { openWizard } from './utils.js';

const CMC_CY = 'Wizard-CommonModeChoke-link';

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

  test('CMC-UI-5: numberOfPeriods from the UI flows through to the backend', async ({ page }) => {
    await openWizard(page, CMC_CY);
    const { simulated: sim2 } = await runBothPaths(page, makeAux(2, 5));
    const { simulated: sim4 } = await runBothPaths(page, makeAux(4, 5));

    const t2 = firstOp(sim2)?.excitationsPerWinding?.[0]?.current?.waveform?.time ?? [];
    const t4 = firstOp(sim4)?.excitationsPerWinding?.[0]?.current?.waveform?.time ?? [];
    expect(t2.length).toBeGreaterThan(5);
    expect(t4.length).toBeGreaterThan(5);

    const span2 = t2[t2.length - 1] - t2[0];
    const span4 = t4[t4.length - 1] - t4[0];
    console.log(`[CMC-UI-5] span2=${span2.toExponential(3)}s  span4=${span4.toExponential(3)}s`);
    expect(span4).toBeGreaterThan(span2 * 1.5);
  });

  test('CMC-UI-6: wizard renders canvases after an analytical run', async ({ page }) => {
    // Smoke: the user clicking Analytical should produce at least one chart.
    await openWizard(page, CMC_CY);
    await page.locator('.sim-btn.analytical').click();
    // Give the post-processing and chart mount some time.
    await page.waitForTimeout(2000);
    const canvasCount = await page.locator('canvas').count();
    console.log(`[CMC-UI-6] canvas count after Analytical = ${canvasCount}`);
    expect(canvasCount).toBeGreaterThan(0);
  });
});
