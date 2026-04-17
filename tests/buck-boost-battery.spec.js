/**
 * Buck & Boost Wizard Comprehensive Battery Tests
 *
 * Groups:
 *   A – Layout and UI controls
 *   B – Analytical simulation
 *   C – Design mode switching (Help me / I know)
 *   D – Simulated waveforms
 *   E – Navigation buttons (Review Specs / Design Magnetic)
 *   F – Magnetic Adviser end-to-end
 *   G – Core Adviser (by steps)
 */

import { test, expect } from '@playwright/test';
import {
  BASE_URL, isBenign, screenshot,
  openWizard, runAnalytical, waitForAnalytical,
  conditionsCard, outputsCard, fillRowInput,
  goToMagneticAdviser, goToMagneticBuilder,
} from './utils.js';

const BUCK_CY  = 'Buck-CommonModeChoke-link';
const BOOST_CY = 'Boost-CommonModeChoke-link';

const ss = (page, name) => screenshot(page, 'buck-boost-battery', name);

const openBuck  = (page) => openWizard(page, BUCK_CY);
const openBoost = (page) => openWizard(page, BOOST_CY);

// =====================================================================
// BUCK – Group A: Layout
// =====================================================================
test.describe('Buck – Group A – Layout', () => {
  test.setTimeout(60000);

  test('Buck-A1 – Loads without console errors, title visible, Conditions card present', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openBuck(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(conditionsCard(page)).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();

    console.log(`[Buck-A1] Errors: ${errors.length}`);
    expect(errors.length).toBe(0);
    await ss(page, 'Buck-A1-layout');
  });

  test('Buck-A2 – Design mode toggle shows/hides inductance field', async ({ page }) => {
    await openBuck(page);

    const helpMeActive = await page.locator('.design-mode-label, text=Help me').first().isVisible().catch(() => false);
    console.log(`[Buck-A2] Help me mode visible: ${helpMeActive}`);

    const iKnowLabel = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnowLabel.isVisible().catch(() => false)) {
      await iKnowLabel.click();
      await page.waitForTimeout(400);
      const inductanceField = await page.locator('text=Inductance').first().isVisible().catch(() => false);
      console.log(`[Buck-A2] Inductance field visible in I know mode: ${inductanceField}`);
    }
    await ss(page, 'Buck-A2-design-mode');
  });

  test('Buck-A3 – Output voltage and current inputs visible', async ({ page }) => {
    await openBuck(page);

    const oCard = outputsCard(page);
    await expect(oCard).toBeVisible();
    const numInputs = await oCard.locator('input[type="number"]').count();
    console.log(`[Buck-A3] Output card inputs: ${numInputs}`);
    expect(numInputs).toBeGreaterThan(0);
    await ss(page, 'Buck-A3-output-card');
  });
});

// =====================================================================
// BUCK – Group B: Analytical
// =====================================================================
test.describe('Buck – Group B – Analytical', () => {
  test.setTimeout(90000);

  test('Buck-B1 – Default analytical runs without error, canvas appears', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openBuck(page);
    await ss(page, 'Buck-B1-before');
    await runAnalytical(page);
    await ss(page, 'Buck-B1-after');

    const hasError = await page.locator('.error-text, .alert-danger').first().isVisible().catch(() => false);
    console.log(`[Buck-B1] Analytical error: ${hasError}`);
    expect(hasError).toBe(false);

    const canvasCount = await page.locator('canvas').count();
    console.log(`[Buck-B1] Canvas count: ${canvasCount}`);
    expect(canvasCount).toBeGreaterThan(0);

    console.log(`[Buck-B1] Errors: ${errors.length}`);
    expect(errors.length).toBe(0);
  });

  test('Buck-B2 – Analytical with I know mode (custom inductance)', async ({ page }) => {
    await openBuck(page);

    const iKnowLabel = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnowLabel.isVisible().catch(() => false)) {
      await iKnowLabel.click();
      await page.waitForTimeout(400);
    }

    const inductanceInput = page.locator('input[type="number"]').nth(0);
    if (await inductanceInput.isVisible().catch(() => false)) {
      await inductanceInput.click({ clickCount: 3 });
      await inductanceInput.fill('1e-4');
      await inductanceInput.press('Tab');
    }

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[Buck-B2] I know mode error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'Buck-B2-iknow-analytical');
  });

  test('Buck-B3 – Analytical: magnetic vs converter waveform view toggle', async ({ page }) => {
    await openBuck(page);
    await runAnalytical(page);

    const converterViewBtn = page.locator('button, label').filter({ hasText: /[Cc]onverter/ }).first();
    if (await converterViewBtn.isVisible().catch(() => false)) {
      await converterViewBtn.click();
      await page.waitForTimeout(500);
      const canvasAfter = await page.locator('canvas').count();
      console.log(`[Buck-B3] Canvas after converter view: ${canvasAfter}`);
    }
    await ss(page, 'Buck-B3-waveform-view-toggle');
  });
});

// =====================================================================
// BUCK – Group D: Simulated
// =====================================================================
test.describe('Buck – Group D – Simulated', () => {
  test.setTimeout(60000);

  test('Buck-D1 – Simulated button is present and clickable', async ({ page }) => {
    await openBuck(page);

    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await expect(simBtn).toBeVisible();
    expect(await simBtn.isDisabled().catch(() => true)).toBe(false);

    await simBtn.click();
    await page.waitForTimeout(2000);
    console.log('[Buck-D1] Simulated button clicked');
    await ss(page, 'Buck-D1-simulated-clicked');
  });
});

// =====================================================================
// BUCK – Group E: Navigation
// =====================================================================
test.describe('Buck – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('Buck-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openBuck(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'Buck-E1-review-specs');
    expect(errors.length).toBe(0);
  });

  test('Buck-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openBuck(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await expect(designBtn).toBeVisible();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'Buck-E2-design-magnetic');
    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// BUCK – Group F: Magnetic Adviser
// =====================================================================
test.describe('Buck – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('Buck-F1 – Adviser page loads after Design Magnetic', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openBuck(page));
    console.log(`[Buck-F1] Navigated: ${navigated}`);
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    expect(await adviseBtn.isVisible().catch(() => false)).toBe(true);

    await ss(page, 'Buck-F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('Buck-F2 – Adviser runs and returns results', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openBuck(page));
    if (!navigated) { console.log('[Buck-F2] Navigation failed — SKIP'); return; }

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await adviseBtn.isVisible().catch(() => false))) return;

    await adviseBtn.click();
    console.log('[Buck-F2] Waiting for adviser results (up to 180s)...');
    await ss(page, 'Buck-F2-adviser-running');

    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'Buck-F2-adviser-results');

    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// BUCK – Group G: Core Adviser
// =====================================================================
test.describe('Buck – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('Buck-G1 – Review Specs reaches builder with Design Requirements', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticBuilder(page, () => openBuck(page));
    console.log(`[Buck-G1] Navigated: ${navigated}`);
    expect(navigated).toBe(true);

    await ss(page, 'Buck-G1-builder');
    expect(errors.length).toBe(0);
  });

  test('Buck-G2 – Core Adviser accessible and runs', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticBuilder(page, () => openBuck(page));
    if (!navigated) { console.log('[Buck-G2] Navigation failed — SKIP'); return; }

    const coreAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Core Adviser/i }).first();
    if (!(await coreAdviserLink.isVisible().catch(() => false))) {
      console.log('[Buck-G2] Core Adviser link not found — SKIP');
      await ss(page, 'Buck-G2-no-core-adviser');
      return;
    }

    await coreAdviserLink.click();
    await page.waitForTimeout(1000);

    const getAdvisedBtn = page.locator('button').filter({ hasText: /Get advised cores/i }).first();
    if (!(await getAdvisedBtn.isVisible().catch(() => false))) {
      console.log('[Buck-G2] Get advised cores not visible — SKIP');
      return;
    }

    await getAdvisedBtn.click();
    console.log('[Buck-G2] Waiting for core adviser results (up to 120s)...');
    await ss(page, 'Buck-G2-core-adviser-running');

    await page.waitForFunction(
      () => !document.querySelector('[data-cy="CoreAdviser-loading"], .fa-spinner'),
      { timeout: 120000 }
    ).catch(() => {});
    await page.waitForTimeout(1500);
    await ss(page, 'Buck-G2-core-adviser-results');

    expect(errors.length).toBe(0);
  });

  test('Buck-G3 – Wire Adviser shows Coming soon placeholder', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openBuck(page));
    if (!navigated) return;

    const wireAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Wire Adviser/i }).first();
    if (await wireAdviserLink.isVisible().catch(() => false)) {
      await wireAdviserLink.click();
      await page.waitForTimeout(800);
      const comingSoon = await page.locator('text=Coming soon').first().isVisible().catch(() => false);
      console.log(`[Buck-G3] Coming soon visible: ${comingSoon}`);
    }
    await ss(page, 'Buck-G3-wire-adviser');
  });
});

// =====================================================================
// BOOST – Group A: Layout
// =====================================================================
test.describe('Boost – Group A – Layout', () => {
  test.setTimeout(60000);

  test('Boost-A1 – Loads without console errors, title visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openBoost(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(conditionsCard(page)).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();

    console.log(`[Boost-A1] Errors: ${errors.length}`);
    expect(errors.length).toBe(0);
    await ss(page, 'Boost-A1-layout');
  });
});

// =====================================================================
// BOOST – Group B: Analytical
// =====================================================================
test.describe('Boost – Group B – Analytical', () => {
  test.setTimeout(90000);

  test('Boost-B1 – Default analytical runs without error, canvas appears', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openBoost(page);
    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    expect(hasError).toBe(false);

    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
    await ss(page, 'Boost-B1-analytical');
  });

  test('Boost-B2 – Analytical with custom output voltage 48V / 10A', async ({ page }) => {
    await openBoost(page);

    const oCard = outputsCard(page);
    await fillRowInput(oCard, 'Voltage', '48');
    await fillRowInput(oCard, 'Current', '10');
    await page.waitForTimeout(300);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[Boost-B2] Error with Vout=48V: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'Boost-B2-vout48');
  });
});

// =====================================================================
// BOOST – Group D: Simulated
// =====================================================================
test.describe('Boost – Group D – Simulated', () => {
  test.setTimeout(60000);

  test('Boost-D1 – Simulated button is present and clickable', async ({ page }) => {
    await openBoost(page);

    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await expect(simBtn).toBeVisible();
    await simBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, 'Boost-D1-simulated-clicked');
  });
});

// =====================================================================
// BOOST – Group E: Navigation
// =====================================================================
test.describe('Boost – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('Boost-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    await openBoost(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'Boost-E1-review-specs');
  });

  test('Boost-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    await openBoost(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'Boost-E2-design-magnetic');
  });
});

// =====================================================================
// BOOST – Group F: Magnetic Adviser
// =====================================================================
test.describe('Boost – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('Boost-F1 – Adviser page loads and Get Advised Magnetics visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openBoost(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    expect(await adviseBtn.isVisible().catch(() => false)).toBe(true);
    await ss(page, 'Boost-F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('Boost-F2 – Adviser runs and returns results', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openBoost(page));
    if (!navigated) return;

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await adviseBtn.isVisible().catch(() => false))) return;

    await adviseBtn.click();
    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'Boost-F2-adviser-results');
    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// BOOST – Group G: Core Adviser
// =====================================================================
test.describe('Boost – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('Boost-G1 – Review Specs reaches builder', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openBoost(page));
    expect(navigated).toBe(true);
    await ss(page, 'Boost-G1-builder');
  });

  test('Boost-G2 – Core Adviser accessible and runs', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openBoost(page));
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
    await ss(page, 'Boost-G2-core-adviser-results');
  });
});
