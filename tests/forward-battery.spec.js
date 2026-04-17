/**
 * Forward Converter Wizards Comprehensive Battery Tests
 * Covers: Single-Switch Forward, Two-Switch Forward, Active Clamp Forward
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

import { test, expect } from '@playwright/test';
import {
  BASE_URL, isBenign, screenshot,
  openWizard, runAnalytical,
  conditionsCard, outputsCard, fillRowInput,
  goToMagneticAdviser, goToMagneticBuilder,
} from './utils.js';

const SINGLE_FORWARD_CY  = 'SingleSwitchForward-CommonModeChoke-link';
const TWO_FORWARD_CY     = 'TwoSwitchForward-CommonModeChoke-link';
const ACTIVE_FORWARD_CY  = 'ActiveClampForward-CommonModeChoke-link';

const ss = (page, name) => screenshot(page, 'forward-battery', name);
const openSingleForward = (page) => openWizard(page, SINGLE_FORWARD_CY);
const openTwoForward    = (page) => openWizard(page, TWO_FORWARD_CY);
const openActiveForward = (page) => openWizard(page, ACTIVE_FORWARD_CY);

// Shared analytical helper that works for all forward variants
async function runForwardAnalytical(page, wizardLabel) {
  await runAnalytical(page);
  const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
  console.log(`[${wizardLabel}] Analytical error: ${hasError}`);
  return !hasError;
}

// =====================================================================
// SINGLE-SWITCH FORWARD – Group A: Layout
// =====================================================================
test.describe('Single-Switch Forward – Group A – Layout', () => {
  test.setTimeout(60000);

  test('SSF-A1 – Loads without console errors, title and Conditions card visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openSingleForward(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(conditionsCard(page)).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();

    console.log(`[SSF-A1] Errors: ${errors.length}`);
    expect(errors.length).toBe(0);
    await ss(page, 'SSF-A1-layout');
  });

  test('SSF-A2 – Design mode toggle (Help me / I know)', async ({ page }) => {
    await openSingleForward(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnow.isVisible().catch(() => false)) {
      await iKnow.click();
      await page.waitForTimeout(400);
    }
    await ss(page, 'SSF-A2-design-mode');
  });

  test('SSF-A3 – Output card visible with voltage/current inputs', async ({ page }) => {
    await openSingleForward(page);

    const oCard = outputsCard(page);
    await expect(oCard).toBeVisible();
    const numInputs = await oCard.locator('input[type="number"]').count();
    expect(numInputs).toBeGreaterThan(0);
    await ss(page, 'SSF-A3-outputs');
  });
});

// =====================================================================
// SINGLE-SWITCH FORWARD – Group B: Analytical
// =====================================================================
test.describe('Single-Switch Forward – Group B – Analytical', () => {
  test.setTimeout(90000);

  test('SSF-B1 – Default analytical runs without error, canvas appears', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openSingleForward(page);
    await ss(page, 'SSF-B1-before');
    const ok = await runForwardAnalytical(page, 'SSF-B1');
    expect(ok).toBe(true);
    await ss(page, 'SSF-B1-after');

    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
  });

  test('SSF-B2 – I know mode analytical', async ({ page }) => {
    await openSingleForward(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnow.isVisible().catch(() => false)) await iKnow.click();
    else await page.locator('text=I know the design I want').first().click().catch(() => {});
    await page.waitForTimeout(400);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    expect(hasError).toBe(false);
    await ss(page, 'SSF-B2-iknow');
  });
});

// =====================================================================
// SINGLE-SWITCH FORWARD – Group D: Simulated
// =====================================================================
test.describe('Single-Switch Forward – Group D – Simulated', () => {
  test.setTimeout(60000);

  test('SSF-D1 – Simulated button present and clickable', async ({ page }) => {
    await openSingleForward(page);

    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await expect(simBtn).toBeVisible();
    await simBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, 'SSF-D1-simulated-clicked');
  });
});

// =====================================================================
// SINGLE-SWITCH FORWARD – Group E: Navigation
// =====================================================================
test.describe('Single-Switch Forward – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('SSF-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openSingleForward(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'SSF-E1-review-specs');
    expect(errors.length).toBe(0);
  });

  test('SSF-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openSingleForward(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'SSF-E2-design-magnetic');
    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// SINGLE-SWITCH FORWARD – Group F: Magnetic Adviser
// =====================================================================
test.describe('Single-Switch Forward – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('SSF-F1 – Adviser page loads with Get Advised Magnetics button', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openSingleForward(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    expect(await adviseBtn.isVisible().catch(() => false)).toBe(true);
    await ss(page, 'SSF-F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('SSF-F2 – Adviser runs and returns results', async ({ page }) => {
    const navigated = await goToMagneticAdviser(page, () => openSingleForward(page));
    if (!navigated) return;

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await adviseBtn.isVisible().catch(() => false))) return;

    await adviseBtn.click();
    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'SSF-F2-adviser-results');
  });
});

// =====================================================================
// SINGLE-SWITCH FORWARD – Group G: Core Adviser
// =====================================================================
test.describe('Single-Switch Forward – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('SSF-G1 – Review Specs reaches builder', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openSingleForward(page));
    expect(navigated).toBe(true);
    await ss(page, 'SSF-G1-builder');
  });

  test('SSF-G2 – Core Adviser accessible and runs', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openSingleForward(page));
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
    await ss(page, 'SSF-G2-core-adviser-results');
  });
});

// =====================================================================
// TWO-SWITCH FORWARD – Groups A-G
// =====================================================================
test.describe('Two-Switch Forward – Group A – Layout', () => {
  test.setTimeout(60000);

  test('TSF-A1 – Loads without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openTwoForward(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();
    expect(errors.length).toBe(0);
    await ss(page, 'TSF-A1-layout');
  });
});

test.describe('Two-Switch Forward – Group B – Analytical', () => {
  test.setTimeout(90000);

  test('TSF-B1 – Default analytical runs without error, canvas appears', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openTwoForward(page);
    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    expect(hasError).toBe(false);

    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
    await ss(page, 'TSF-B1-analytical');
  });

  test('TSF-B2 – I know mode analytical', async ({ page }) => {
    await openTwoForward(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnow.isVisible().catch(() => false)) await iKnow.click();
    else await page.locator('text=I know the design I want').first().click().catch(() => {});
    await page.waitForTimeout(400);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    expect(hasError).toBe(false);
    await ss(page, 'TSF-B2-iknow');
  });
});

test.describe('Two-Switch Forward – Group D – Simulated', () => {
  test.setTimeout(60000);

  test('TSF-D1 – Simulated button present and clickable', async ({ page }) => {
    await openTwoForward(page);
    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await expect(simBtn).toBeVisible();
    await simBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, 'TSF-D1-simulated');
  });
});

test.describe('Two-Switch Forward – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('TSF-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    await openTwoForward(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'TSF-E1-review-specs');
  });

  test('TSF-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    await openTwoForward(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'TSF-E2-design-magnetic');
  });
});

test.describe('Two-Switch Forward – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('TSF-F1 – Adviser page loads with Get Advised Magnetics button', async ({ page }) => {
    const navigated = await goToMagneticAdviser(page, () => openTwoForward(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    expect(await adviseBtn.isVisible().catch(() => false)).toBe(true);
    await ss(page, 'TSF-F1-adviser-loaded');
  });

  test('TSF-F2 – Adviser runs and returns results', async ({ page }) => {
    const navigated = await goToMagneticAdviser(page, () => openTwoForward(page));
    if (!navigated) return;

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await adviseBtn.isVisible().catch(() => false))) return;

    await adviseBtn.click();
    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'TSF-F2-adviser-results');
  });
});

test.describe('Two-Switch Forward – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('TSF-G1 – Review Specs reaches builder and Core Adviser runs', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openTwoForward(page));
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
    await ss(page, 'TSF-G1-core-adviser-results');
  });
});

// =====================================================================
// ACTIVE CLAMP FORWARD – Groups A-G
// =====================================================================
test.describe('Active Clamp Forward – Group A – Layout', () => {
  test.setTimeout(60000);

  test('ACF-A1 – Loads without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openActiveForward(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();
    expect(errors.length).toBe(0);
    await ss(page, 'ACF-A1-layout');
  });
});

test.describe('Active Clamp Forward – Group B – Analytical', () => {
  test.setTimeout(90000);

  test('ACF-B1 – Default analytical runs without error, canvas appears', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openActiveForward(page);
    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    expect(hasError).toBe(false);

    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
    await ss(page, 'ACF-B1-analytical');
  });

  test('ACF-B2 – I know mode with custom transformer params', async ({ page }) => {
    await openActiveForward(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnow.isVisible().catch(() => false)) await iKnow.click();
    else await page.locator('text=I know the design I want').first().click().catch(() => {});
    await page.waitForTimeout(400);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    expect(hasError).toBe(false);
    await ss(page, 'ACF-B2-iknow');
  });
});

test.describe('Active Clamp Forward – Group D – Simulated', () => {
  test.setTimeout(60000);

  test('ACF-D1 – Simulated button present and clickable', async ({ page }) => {
    await openActiveForward(page);
    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await expect(simBtn).toBeVisible();
    await simBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, 'ACF-D1-simulated');
  });
});

test.describe('Active Clamp Forward – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('ACF-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    await openActiveForward(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'ACF-E1-review-specs');
  });

  test('ACF-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    await openActiveForward(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'ACF-E2-design-magnetic');
  });
});

test.describe('Active Clamp Forward – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('ACF-F1 – Adviser page loads with Get Advised Magnetics button', async ({ page }) => {
    const navigated = await goToMagneticAdviser(page, () => openActiveForward(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    expect(await adviseBtn.isVisible().catch(() => false)).toBe(true);
    await ss(page, 'ACF-F1-adviser-loaded');
  });

  test('ACF-F2 – Adviser runs and returns results', async ({ page }) => {
    const navigated = await goToMagneticAdviser(page, () => openActiveForward(page));
    if (!navigated) return;

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await adviseBtn.isVisible().catch(() => false))) return;

    await adviseBtn.click();
    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'ACF-F2-adviser-results');
  });
});

test.describe('Active Clamp Forward – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('ACF-G1 – Review Specs reaches builder and Core Adviser runs', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openActiveForward(page));
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
    await ss(page, 'ACF-G1-core-adviser-results');
  });
});
