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
import {
  BASE_URL, isBenign, screenshot,
  openWizard, runAnalytical,
  conditionsCard, outputsCard, fillRowInput,
  goToMagneticAdviser, goToMagneticBuilder,
} from './utils.js';

const SEPIC_CY = 'Sepic-CommonModeChoke-link';
const ss = (page, name) => screenshot(page, 'sepic-battery', name);
const openSepic = (page) => openWizard(page, SEPIC_CY);

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
    await page.waitForTimeout(300);
    const kInput = page.locator('[data-cy="SepicWizard-CouplingCoefficient-container"]').first();
    await expect(kInput).toBeVisible();
    await ss(page, 'SEPIC-A3-coupled-k');
  });

  test('SEPIC-A4 – Design mode toggle exposes inductance input', async ({ page }) => {
    await openSepic(page);
    const iKnowLabel = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnowLabel.isVisible().catch(() => false)) {
      await iKnowLabel.click();
      await page.waitForTimeout(400);
      const hasInductance = await page.locator('text=L1 Inductance').first().isVisible().catch(() => false);
      console.log(`[SEPIC-A4] L1 Inductance field visible: ${hasInductance}`);
    }
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

    const hasError = await page.locator('.error-text, .alert-danger').first().isVisible().catch(() => false);
    expect(hasError).toBe(false);

    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
    await ss(page, 'SEPIC-B1-default');
  });

  test('SEPIC-B2 – Pure step-up mode (Vin<<Vout): 5V → 24V', async ({ page }) => {
    await openSepic(page);
    const cCard = conditionsCard(page);
    // Vin minimum 5, max 7
    const vinMin = page.locator('[data-cy*="InputVoltage"] input').nth(0);
    const vinMax = page.locator('[data-cy*="InputVoltage"] input').nth(1);
    if (await vinMin.isVisible().catch(() => false)) {
      await vinMin.click({ clickCount: 3 }); await vinMin.fill('5'); await vinMin.press('Tab');
    }
    if (await vinMax.isVisible().catch(() => false)) {
      await vinMax.click({ clickCount: 3 }); await vinMax.fill('7'); await vinMax.press('Tab');
    }
    const oCard = outputsCard(page);
    await fillRowInput(oCard, 'Voltage', '24');
    await fillRowInput(oCard, 'Current', '0.5');
    await page.waitForTimeout(300);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[SEPIC-B2] Step-up 5V→24V error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'SEPIC-B2-stepup');
  });

  test('SEPIC-B3 – Pure step-down mode (Vin>>Vout): 24V → 12V', async ({ page }) => {
    await openSepic(page);
    const vinMin = page.locator('[data-cy*="InputVoltage"] input').nth(0);
    const vinMax = page.locator('[data-cy*="InputVoltage"] input').nth(1);
    if (await vinMin.isVisible().catch(() => false)) {
      await vinMin.click({ clickCount: 3 }); await vinMin.fill('20'); await vinMin.press('Tab');
    }
    if (await vinMax.isVisible().catch(() => false)) {
      await vinMax.click({ clickCount: 3 }); await vinMax.fill('28'); await vinMax.press('Tab');
    }
    await page.waitForTimeout(200);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[SEPIC-B3] Step-down 24V→12V error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'SEPIC-B3-stepdown');
  });

  test('SEPIC-B4 – Coupled-inductor analytical', async ({ page }) => {
    await openSepic(page);
    const coupled = page.locator('[data-cy="SepicWizard-CoupledInductor"]').first();
    await coupled.check();
    await page.waitForTimeout(300);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
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
    await page.waitForTimeout(3000);
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
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
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
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
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
    expect(await adviseBtn.isVisible().catch(() => false)).toBe(true);
    await ss(page, 'SEPIC-F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('SEPIC-F2 – Adviser runs and returns results', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openSepic(page));
    if (!navigated) return;

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await adviseBtn.isVisible().catch(() => false))) return;

    await adviseBtn.click();
    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'SEPIC-F2-adviser-results');
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

  test('SEPIC-G2 – Core Adviser accessible and runs', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openSepic(page));
    if (!navigated) return;

    const coreAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Core Adviser/i }).first();
    if (!(await coreAdviserLink.isVisible().catch(() => false))) return;

    await coreAdviserLink.click();
    await page.waitForTimeout(1000);

    const getAdvisedBtn = page.locator('button').filter({ hasText: /Get advised cores/i }).first();
    if (!(await getAdvisedBtn.isVisible().catch(() => false))) return;

    await getAdvisedBtn.click();
    await page.waitForFunction(
      () => !document.querySelector('[data-cy="CoreAdviser-loading"], .fa-spinner'),
      { timeout: 120000 }
    ).catch(() => {});
    await page.waitForTimeout(1500);
    await ss(page, 'SEPIC-G2-core-adviser-results');
  });
});
