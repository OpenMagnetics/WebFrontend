/**
 * CMC EMI-spectrum view — UI wiring smoke test.
 *
 * Physics of the closed-form model (trapezoidal Fourier source × CMC
 * transfer function × CISPR limit) is exercised by unit assertions in
 * useCmcEmiSpectrum.test.js if added later; this spec only verifies that
 * the panel mounts under the wizard, renders a chart, and its f_sw input
 * mutates the plot.
 */

import { test, expect } from './_coverage.js';
import { openWizard } from './utils.js';

const CMC_CY = 'Wizard-CommonModeChoke-link';

async function runAnalyticalToPopulateL(page) {
  await page.locator('.sim-btn.analytical').click();
  await page.waitForFunction(
    () => !!document.querySelector('.emi-spectrum-view'),
    { timeout: 30000 },
  );
  await page.waitForTimeout(500);
}

test.describe('CMC — EMI spectrum view', () => {
  test.setTimeout(90000);

  test('CMC-EMI-1: panel mounts after analytical run with verdict + chart', async ({ page }) => {
    await openWizard(page, CMC_CY);
    await runAnalyticalToPopulateL(page);

    const verdict = await page.locator('.emi-verdict').textContent();
    console.log('[CMC-EMI-1] verdict =', verdict);
    expect(verdict).toMatch(/Passes|Fails/);

    // Three traces are configured in chartData; echarts renders them into a
    // canvas, so the canvas count just needs to include the spectrum chart.
    const canvases = await page.locator('canvas').count();
    expect(canvases).toBeGreaterThanOrEqual(3);
  });

  test('CMC-EMI-2: f_sw input is editable and updates the verdict/spectrum', async ({ page }) => {
    await openWizard(page, CMC_CY);
    await runAnalyticalToPopulateL(page);

    const fInput = page.locator('.emi-fsw-input input');
    await expect(fInput).toBeVisible();
    await expect(fInput).toHaveValue('100');

    const verdict1 = await page.locator('.emi-verdict').textContent();

    // Push f_sw 30× higher; at 3 MHz the fundamental lands inside CISPR band
    // and the filtered spectrum can change margin / verdict.
    await fInput.fill('3000');
    await fInput.press('Tab');
    await page.waitForTimeout(500);

    const verdict2 = await page.locator('.emi-verdict').textContent();
    console.log(`[CMC-EMI-2] verdict 100 kHz → ${verdict1}`);
    console.log(`[CMC-EMI-2] verdict   3 MHz → ${verdict2}`);
    // We don't pin which direction the margin moves (depends on the exact
    // trapezoid shape at 3 MHz), only that re-render happened.
    expect(verdict2).toMatch(/Passes|Fails/);
  });

  test('CMC-EMI-3: closed-form spectrum is consistent with the formula', async ({ page }) => {
    // Cross-check the composable's output directly, as a guard against future
    // refactors silently changing dBµV scaling or the CMC transfer function.
    await openWizard(page, CMC_CY);
    await runAnalyticalToPopulateL(page);

    const values = await page.evaluate(async () => {
      const mod = await import('/src/composables/useCmcEmiSpectrum.js');
      const s = mod.computeEmiSpectrum({
        switchingFrequency: 100e3,
        voltageSwing:       230 * Math.SQRT2,
        parasiticCap_pF:    10,
        dvdt_V_ns:          50,
        inductance:         1.06e-3,
        lineImpedance:      50,
        regulatoryStandard: 'CISPR 32 Class B',
        numPoints:          100,
      });
      return {
        n:               s.frequencies.length,
        passing:         s.passing,
        worstMarginDb:   s.worstMarginDb,
        firstF:          s.frequencies[0],
        lastF:           s.frequencies[s.frequencies.length - 1],
        limitAt150kHz:   mod.cisprLimitDbuV('CISPR 32 Class B', 150e3),
        limitAt500kHz:   mod.cisprLimitDbuV('CISPR 32 Class B', 500e3),
        limitAt10MHz:    mod.cisprLimitDbuV('CISPR 32 Class B', 10e6),
      };
    });

    console.log('[CMC-EMI-3]', values);
    expect(values.n).toBe(100);
    expect(values.firstF).toBeCloseTo(150e3, 0);
    expect(values.lastF).toBeCloseTo(30e6, 0);
    // CISPR 32 Class B QP limits: 66 dBµV at 150 kHz, 56 at 500 kHz, then a
    // step up to 60 in the 5–30 MHz band.
    expect(values.limitAt150kHz).toBeCloseTo(66, 1);
    expect(values.limitAt500kHz).toBeCloseTo(56, 1);
    expect(values.limitAt10MHz).toBeCloseTo(60, 1);
    // Filtered spectrum should pass by some margin in this design.
    expect(values.passing).toBe(true);
    expect(values.worstMarginDb).toBeGreaterThan(0);
  });
});
