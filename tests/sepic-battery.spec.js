/**
 * SEPIC Wizard Comprehensive Battery Tests
 *
 * Groups:
 *   A – Layout and UI controls
 *   B – Analytical simulation (default + step-up + step-down + coupled-inductor)
 *   D – Simulated waveforms
 *   E – Navigation buttons (Review Specs / Design Magnetic)
 *   F – Magnetic Adviser end-to-end
 *   G – Core Adviser (by steps)
 */

import { test, expect } from './_coverage.js';
import { BASE_URL, isBenign, screenshot, openWizard, runAnalytical, conditionsCard, goToMagneticAdviser, goToMagneticBuilder, runCoreAdviser, softVisible, pause } from './utils.js';

const SEPIC_CY = 'Sepic-link';
const ss = (page, name) => screenshot(page, 'sepic-battery', name);
const openSepic = (page) => openWizard(page, SEPIC_CY);

// ---------- helpers --------------------------------------------------------
async function setNumberInput(page, dataCy, value) {
  const input = page.locator(`[data-cy="${dataCy}"]`);
  await expect(input).toBeVisible();
  await input.click({ clickCount: 3 });
  await input.fill(String(value));
  await input.press('Tab');
}

async function setIKnowMode(page) {
  const iKnow = page.locator('[data-cy="SepicWizard-DesignLevel-I know the design I want-radio-input"]');
  await expect(iKnow).toBeAttached();
  await iKnow.evaluate(el => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await pause(page, 400, 'mechanical: settle');
}

// =====================================================================
// SEPIC – Group A: Layout
// =====================================================================
test.describe('SEPIC – Group A – Layout', () => {
  test.setTimeout(60000);

  test('SEPIC-A1 – Loads without console errors, title visible, Conditions card present', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openSepic(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(conditionsCard(page)).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();

    console.log(`[SEPIC-A1] Errors: ${errors.length}`);
    expect(errors.length).toBe(0);
    await ss(page, 'SEPIC-A1-layout');
  });

  test('SEPIC-A2 – Coupled Inductor and Synchronous Rectifier toggles exist', async ({ page }) => {
    await openSepic(page);
    const coupled = page.locator('[data-cy="SepicWizard-CoupledInductor"]').first();
    const sync    = page.locator('[data-cy="SepicWizard-SynchronousRectifier"]').first();
    await expect(coupled).toBeVisible();
    await expect(sync).toBeVisible();
    await ss(page, 'SEPIC-A2-toggles');
  });

  test('SEPIC-A3 – Enabling Coupled Inductor reveals coupling-coefficient input', async ({ page }) => {
    await openSepic(page);
    const coupled = page.locator('[data-cy="SepicWizard-CoupledInductor"]').first();
    await coupled.check();
    await pause(page, 300, 'mechanical: settle');
    const kInput = page.locator('[data-cy="SepicWizard-CouplingCoefficient-container"]').first();
    await expect(kInput).toBeVisible();
    await ss(page, 'SEPIC-A3-coupled-k');
  });

  test('SEPIC-A4 – Design mode toggle exposes inductance input', async ({ page }) => {
    await openSepic(page);
    await setIKnowMode(page);

    // In "I know" mode the wizard exposes the L1 Inductance row.
    const inductanceLabel = page.getByText(/L1 Inductance/).first();
    await expect(inductanceLabel).toBeVisible();
    await ss(page, 'SEPIC-A4-design-mode');
  });
});

// =====================================================================
// SEPIC – Group B: Analytical
// =====================================================================
test.describe('SEPIC – Group B – Analytical', () => {
  test.setTimeout(90000);

  test('SEPIC-B1 – Default analytical runs without error, canvas appears', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openSepic(page);
    await runAnalytical(page);

    const hasError = await softVisible(page.locator('.error-text, .alert-danger').first());
    expect(hasError).toBe(false);

    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
    await ss(page, 'SEPIC-B1-default');
  });

  test('SEPIC-B2 – Pure step-up mode (Vin<<Vout): 5V → 24V', async ({ page }) => {
    await openSepic(page);

    await setNumberInput(page, 'SepicWizard-InputVoltage-minimum-number-input', '5');
    await setNumberInput(page, 'SepicWizard-InputVoltage-maximum-number-input', '7');
    await setNumberInput(page, 'SepicWizard-OutputVoltage-number-input', '24');
    await setNumberInput(page, 'SepicWizard-OutputCurrent-number-input', '0.5');
    await pause(page, 300, 'mechanical: settle');

    await runAnalytical(page);
    const hasError = await softVisible(page.locator('.error-text').first());
    console.log(`[SEPIC-B2] Step-up 5V→24V error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'SEPIC-B2-stepup');
  });

  test('SEPIC-B3 – Pure step-down mode (Vin>>Vout): 24V → 12V', async ({ page }) => {
    await openSepic(page);

    await setNumberInput(page, 'SepicWizard-InputVoltage-minimum-number-input', '20');
    await setNumberInput(page, 'SepicWizard-InputVoltage-maximum-number-input', '28');
    await setNumberInput(page, 'SepicWizard-OutputVoltage-number-input', '12');
    await setNumberInput(page, 'SepicWizard-OutputCurrent-number-input', '0.5');
    await pause(page, 300, 'mechanical: settle');

    await runAnalytical(page);
    const hasError = await softVisible(page.locator('.error-text').first());
    console.log(`[SEPIC-B3] Step-down 24V→12V error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'SEPIC-B3-stepdown');
  });

  test('SEPIC-B4 – Coupled-inductor analytical', async ({ page }) => {
    await openSepic(page);
    const coupled = page.locator('[data-cy="SepicWizard-CoupledInductor"]').first();
    await coupled.check();
    await pause(page, 300, 'mechanical: settle');

    await runAnalytical(page);
    const hasError = await softVisible(page.locator('.error-text').first());
    console.log(`[SEPIC-B4] Coupled-inductor analytical error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'SEPIC-B4-coupled');
  });
});

// =====================================================================
// SEPIC – Group D: Simulated
// =====================================================================
test.describe('SEPIC – Group D – Simulated', () => {
  test.setTimeout(120000);

  test('SEPIC-D1 – Simulated button is present and clickable', async ({ page }) => {
    await openSepic(page);
    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await expect(simBtn).toBeVisible();
    await simBtn.click();
    await pause(page, 3000, 'mechanical: settle');
    await ss(page, 'SEPIC-D1-simulated-clicked');
  });
});

// =====================================================================
// SEPIC – Group E: Navigation
// =====================================================================
test.describe('SEPIC – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('SEPIC-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openSepic(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });
    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'SEPIC-E1-review-specs');
    expect(errors.length).toBe(0);
  });

  test('SEPIC-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openSepic(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await expect(designBtn).toBeVisible();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });
    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'SEPIC-E2-design-magnetic');
    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// SEPIC – Group F: Magnetic Adviser
// =====================================================================
test.describe('SEPIC – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('SEPIC-F1 – Adviser page loads after Design Magnetic', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openSepic(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    await expect(adviseBtn).toBeVisible();
    await ss(page, 'SEPIC-F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('SEPIC-F2 – Adviser runs and returns results', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openSepic(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    await expect(adviseBtn).toBeVisible();

    await adviseBtn.click();
    // Spinner clears once the adviser backend returns OR errors out. We
    // assert the page stays on /magnetic_tool (no crash, no redirect).
    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    );
    await pause(page, 2000, 'mechanical: settle');
    await ss(page, 'SEPIC-F2-adviser-results');
    expect(page.url()).toContain('magnetic_tool');
    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// SEPIC – Group G: Core Adviser
// =====================================================================
test.describe('SEPIC – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('SEPIC-G1 – Review Specs reaches builder', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openSepic(page));
    expect(navigated).toBe(true);
    await ss(page, 'SEPIC-G1-builder');
  });

  // Core Adviser entry point is the "Advise" button in the Core column of the
  // Magnetic Builder three-column layout (data-cy ends with `-Core-Advise-button`).
  test('SEPIC-G2 – Core Adviser accessible and runs', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticBuilder(page, () => openSepic(page));
    expect(navigated).toBe(true);

    await runCoreAdviser(page);
    await ss(page, 'SEPIC-G2-core-adviser-results');
    expect(errors.length).toBe(0);
  });
});
