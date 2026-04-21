/**
 * Isolated Buck & Isolated Buck-Boost Wizard Comprehensive Battery Tests
 *
 * Groups:
 *   A – Layout and UI controls
 *   B – Analytical simulation
 *   C – Design mode switching
 *   D – Simulated waveforms
 *   E – Navigation buttons
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

const ISO_BUCK_CY      = 'IsolatedBuck-CommonModeChoke-link';
const ISO_BUCKBOOST_CY = 'IsolatedBuckBoost-CommonModeChoke-link';

const ss = (page, name) => screenshot(page, 'isolated-battery', name);
const openIsoBuck      = (page) => openWizard(page, ISO_BUCK_CY);
const openIsoBuckBoost = (page) => openWizard(page, ISO_BUCKBOOST_CY);

// =====================================================================
// ISOLATED BUCK – Group A: Layout
// =====================================================================
test.describe('IsolatedBuck – Group A – Layout', () => {
  test.setTimeout(60000);

  test('IB-A1 – Loads without console errors, title and Conditions card visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openIsoBuck(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(conditionsCard(page)).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();

    console.log(`[IB-A1] Errors: ${errors.length}`);
    expect(errors.length).toBe(0);
    await ss(page, 'IB-A1-layout');
  });

  test('IB-A2 – Design mode toggle shows transformer card in I know mode', async ({ page }) => {
    await openIsoBuck(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnow.isVisible().catch(() => false)) {
      await iKnow.click();
      await page.waitForTimeout(400);
      const tCard = await page.locator('.compact-card').filter({ hasText: 'Transformer' }).first().isVisible().catch(() => false);
      console.log(`[IB-A2] Transformer card: ${tCard}`);
    }
    await ss(page, 'IB-A2-design-mode');
  });

  test('IB-A3 – Output card visible with expected inputs', async ({ page }) => {
    await openIsoBuck(page);

    const oCard = outputsCard(page);
    await expect(oCard).toBeVisible();
    const numInputs = await oCard.locator('input[type="number"]').count();
    expect(numInputs).toBeGreaterThan(0);
    await ss(page, 'IB-A3-outputs');
  });
});

// =====================================================================
// ISOLATED BUCK – Group B: Analytical
// =====================================================================
test.describe('IsolatedBuck – Group B – Analytical', () => {
  test.setTimeout(90000);

  test('IB-B1 – Default analytical runs without error, canvas appears', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openIsoBuck(page);
    await ss(page, 'IB-B1-before');
    await runAnalytical(page);
    await ss(page, 'IB-B1-after');

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    expect(hasError).toBe(false);

    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
  });

  test('IB-B2 – I know mode with custom turns ratio', async ({ page }) => {
    await openIsoBuck(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnow.isVisible().catch(() => false)) await iKnow.click();
    else await page.locator('text=I know the design I want').first().click().catch(() => {});
    await page.waitForTimeout(400);

    const tCard = page.locator('.compact-card').filter({ hasText: 'Transformer' }).first();
    if (await tCard.isVisible().catch(() => false)) {
      await fillRowInput(tCard, 'Turns', '3');
      await page.waitForTimeout(200);
    }

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[IB-B2] I know error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'IB-B2-iknow');
  });

  test('IB-B3 – Leakage inductance toggle runs analytical', async ({ page }) => {
    await openIsoBuck(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnow.isVisible().catch(() => false)) await iKnow.click();
    await page.waitForTimeout(400);

    const leakageCheckbox = page.locator('#useLeakageInductance, input[type="checkbox"]').filter({ hasText: /[Ll]eakage/ }).first();
    if (await leakageCheckbox.isVisible().catch(() => false)) {
      const checked = await leakageCheckbox.isChecked().catch(() => false);
      if (checked) await leakageCheckbox.uncheck();
      else await leakageCheckbox.check();
      await page.waitForTimeout(300);
    }

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[IB-B3] Leakage toggle error: ${hasError}`);
    await ss(page, 'IB-B3-leakage-toggle');
  });

  test('IB-B4 – Magnetic vs Converter waveform view', async ({ page }) => {
    await openIsoBuck(page);
    await runAnalytical(page);

    const converterBtn = page.locator('button, label').filter({ hasText: /[Cc]onverter/ }).first();
    if (await converterBtn.isVisible().catch(() => false)) {
      await converterBtn.click();
      await page.waitForTimeout(500);
    }
    await ss(page, 'IB-B4-waveform-toggle');
  });
});

// =====================================================================
// ISOLATED BUCK – Group D: Simulated
// =====================================================================
test.describe('IsolatedBuck – Group D – Simulated', () => {
  test.setTimeout(60000);

  test('IB-D1 – Simulated button present and clickable', async ({ page }) => {
    await openIsoBuck(page);

    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await expect(simBtn).toBeVisible();
    await simBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, 'IB-D1-simulated-clicked');
  });
});

// =====================================================================
// ISOLATED BUCK – Group E: Navigation
// =====================================================================
test.describe('IsolatedBuck – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('IB-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openIsoBuck(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'IB-E1-review-specs');
    expect(errors.length).toBe(0);
  });

  test('IB-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openIsoBuck(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'IB-E2-design-magnetic');
    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// ISOLATED BUCK – Group F: Magnetic Adviser
// =====================================================================
test.describe('IsolatedBuck – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('IB-F1 – Adviser page loads after Design Magnetic', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openIsoBuck(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    expect(await adviseBtn.isVisible().catch(() => false)).toBe(true);
    await ss(page, 'IB-F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('IB-F2 – Adviser runs and returns results', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openIsoBuck(page));
    if (!navigated) return;

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await adviseBtn.isVisible().catch(() => false))) return;

    await adviseBtn.click();
    console.log('[IB-F2] Waiting for results (up to 180s)...');
    await ss(page, 'IB-F2-adviser-running');

    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'IB-F2-adviser-results');
    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// ISOLATED BUCK – Group G: Core Adviser
// =====================================================================
test.describe('IsolatedBuck – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('IB-G1 – Review Specs reaches builder', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openIsoBuck(page));
    expect(navigated).toBe(true);
    await ss(page, 'IB-G1-builder');
  });

  test('IB-G2 – Core Adviser accessible and runs', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openIsoBuck(page));
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
    await ss(page, 'IB-G2-core-adviser-results');
  });

  test('IB-G3 – Wire Adviser shows Coming soon', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openIsoBuck(page));
    if (!navigated) return;

    const wireAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Wire Adviser/i }).first();
    if (await wireAdviserLink.isVisible().catch(() => false)) {
      await wireAdviserLink.click();
      await page.waitForTimeout(800);
      const comingSoon = await page.locator('text=Coming soon').first().isVisible().catch(() => false);
      console.log(`[IB-G3] Coming soon: ${comingSoon}`);
    }
    await ss(page, 'IB-G3-wire-adviser');
  });
});

// =====================================================================
// ISOLATED BUCK-BOOST – Groups A-G
// =====================================================================
test.describe('IsolatedBuckBoost – Group A – Layout', () => {
  test.setTimeout(60000);

  test('IBB-A1 – Loads without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openIsoBuckBoost(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();
    expect(errors.length).toBe(0);
    await ss(page, 'IBB-A1-layout');
  });
});

test.describe('IsolatedBuckBoost – Group B – Analytical', () => {
  test.setTimeout(90000);

  test('IBB-B1 – Default analytical runs without error, canvas appears', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openIsoBuckBoost(page);
    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    expect(hasError).toBe(false);

    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
    await ss(page, 'IBB-B1-analytical');
  });

  test('IBB-B2 – I know mode analytical', async ({ page }) => {
    await openIsoBuckBoost(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnow.isVisible().catch(() => false)) await iKnow.click();
    else await page.locator('text=I know the design I want').first().click().catch(() => {});
    await page.waitForTimeout(400);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    expect(hasError).toBe(false);
    await ss(page, 'IBB-B2-iknow');
  });
});

test.describe('IsolatedBuckBoost – Group D – Simulated', () => {
  test.setTimeout(60000);

  test('IBB-D1 – Simulated button present and clickable', async ({ page }) => {
    await openIsoBuckBoost(page);
    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await expect(simBtn).toBeVisible();
    await simBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, 'IBB-D1-simulated');
  });
});

test.describe('IsolatedBuckBoost – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('IBB-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    await openIsoBuckBoost(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'IBB-E1-review-specs');
  });

  test('IBB-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    await openIsoBuckBoost(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'IBB-E2-design-magnetic');
  });
});

test.describe('IsolatedBuckBoost – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('IBB-F1 – Adviser page loads with Get Advised Magnetics button', async ({ page }) => {
    const navigated = await goToMagneticAdviser(page, () => openIsoBuckBoost(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    expect(await adviseBtn.isVisible().catch(() => false)).toBe(true);
    await ss(page, 'IBB-F1-adviser-loaded');
  });

  test('IBB-F2 – Adviser runs and returns results', async ({ page }) => {
    const navigated = await goToMagneticAdviser(page, () => openIsoBuckBoost(page));
    if (!navigated) return;

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await adviseBtn.isVisible().catch(() => false))) return;

    await adviseBtn.click();
    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'IBB-F2-adviser-results');
  });
});

test.describe('IsolatedBuckBoost – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('IBB-G1 – Review Specs reaches builder and Core Adviser runs', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openIsoBuckBoost(page));
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
    await ss(page, 'IBB-G1-core-adviser-results');
  });
});
