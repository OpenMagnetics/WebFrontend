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
  conditionsCard, outputsCard, fillRowInput, fillOutput,
  goToMagneticAdviser, goToMagneticBuilder, runCoreAdviser,
} from './utils.js';

const ISO_BUCK_CY      = 'IsolatedBuck-CommonModeChoke-link';
const ISO_BUCKBOOST_CY = 'IsolatedBuckBoost-CommonModeChoke-link';

const ss = (page, name) => screenshot(page, 'isolated-battery', name);
const openIsoBuck      = (page) => openWizard(page, ISO_BUCK_CY);
const openIsoBuckBoost = (page) => openWizard(page, ISO_BUCKBOOST_CY);

// Both wizards mount IsolatedBuckBoostWizard.vue which uses
// ElementFromListRadio for designLevel. Click the "I know the design I want"
// radio by data-cy. Throws if absent.
async function setIKnowMode(page, label) {
  const radio = page.locator(`[data-cy="${label}-DesignLevel-I know the design I want-radio-input"]`);
  await expect(radio).toBeAttached();
  await radio.evaluate(el => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(400);
}

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

    expect(errors.length).toBe(0);
    await ss(page, 'IB-A1-layout');
  });

  test('IB-A2 – Design mode toggle switches Switch card header to Design Params', async ({ page }) => {
    await openIsoBuck(page);

    // In default mode the compact-header reads "Switch".
    await expect(page.locator('.compact-header').filter({ hasText: /^Switch$/i }).first()).toBeVisible();

    await setIKnowMode(page, 'IsolatedBuckWizard');
    // In "I know" mode the same compact-header switches to "Design Params".
    await expect(page.locator('.compact-header').filter({ hasText: /Design Params/i }).first()).toBeVisible();
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

    await expect(page.locator('.error-text').first()).toBeHidden();
    expect(await page.locator('canvas').count()).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
  });

  // TODO(wizard-bug): in "I know" mode the outputs v-for in
  // IsolatedBuckBoostWizard.vue:1018-1052 continues to render
  // PairOfDimensions (voltage,current) instead of TripleOfDimensions
  // (voltage,current,turnsRatio). The "Design Params" header switches
  // reactively but the turnsRatio input never appears. Re-enable once the
  // wizard exposes the turnsRatio input row.
  test.skip('IB-B2 – I know mode with custom turns ratio', async ({ page }) => {
    await openIsoBuck(page);
    await setIKnowMode(page, 'IsolatedBuckWizard');

    const oCard = outputsCard(page);
    await expect(oCard).toBeVisible();
    await fillOutput(oCard, 0, 'turnsRatio', '3');
    await page.waitForTimeout(200);

    await runAnalytical(page);
    await expect(page.locator('.error-text').first()).toBeHidden();
    await ss(page, 'IB-B2-iknow');
  });

  // TODO(wizard-ui-gap): IsolatedBuckBoostWizard has no useLeakageInductance
  // checkbox (the toggle exists on DAB/PSFB/PSHB/AHB but not here). Skipping
  // until the toggle is added or the test is reassigned.
  test.skip('IB-B3 – Leakage inductance toggle runs analytical', async ({ page }) => {
    await openIsoBuck(page);
    await setIKnowMode(page, 'IsolatedBuckWizard');

    const leakage = page.locator('#useLeakageInductance');
    await expect(leakage).toBeVisible();
    await leakage.click();
    await page.waitForTimeout(300);

    await runAnalytical(page);
    await expect(page.locator('.error-text').first()).toBeHidden();
    await ss(page, 'IB-B3-leakage-toggle');
  });

  test('IB-B4 – Analytical produces at least one waveform canvas', async ({ page }) => {
    await openIsoBuck(page);
    await runAnalytical(page);

    expect(await page.locator('canvas').count()).toBeGreaterThan(0);
    await ss(page, 'IB-B4-waveform-canvas');
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
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });

    expect(page.url()).toContain('magnetic_tool');
    await ss(page, 'IB-E1-review-specs');
    expect(errors.length).toBe(0);
  });

  test('IB-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openIsoBuck(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await expect(designBtn).toBeVisible();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });

    expect(page.url()).toContain('magnetic_tool');
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
    await expect(adviseBtn).toBeVisible();
    await ss(page, 'IB-F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('IB-F2 – Adviser runs and returns results', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openIsoBuck(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    await expect(adviseBtn).toBeVisible();

    await adviseBtn.click();
    await ss(page, 'IB-F2-adviser-running');

    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    );
    await page.waitForTimeout(2000);
    await ss(page, 'IB-F2-adviser-results');
    expect(page.url()).toContain('magnetic_tool');
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
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticBuilder(page, () => openIsoBuck(page));
    expect(navigated).toBe(true);

    await runCoreAdviser(page);
    await ss(page, 'IB-G2-core-adviser-results');
    expect(errors.length).toBe(0);
  });

  // TODO(wizard-ui-gap): No Wire Adviser entry point currently exposed.
  test.skip('IB-G3 – Wire Adviser shows Coming soon', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openIsoBuck(page));
    expect(navigated).toBe(true);

    const wireAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Wire Adviser/i }).first();
    await expect(wireAdviserLink).toBeVisible();
    await wireAdviserLink.click();
    await page.waitForTimeout(800);
    await expect(page.getByText(/Coming soon/i).first()).toBeVisible();
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

    await expect(page.locator('.error-text').first()).toBeHidden();
    expect(await page.locator('canvas').count()).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
    await ss(page, 'IBB-B1-analytical');
  });

  test('IBB-B2 – I know mode analytical runs with default turnsRatio', async ({ page }) => {
    await openIsoBuckBoost(page);

    await setIKnowMode(page, 'IsolatedBuckBoostWizard');

    await runAnalytical(page);
    await expect(page.locator('.error-text').first()).toBeHidden();
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
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });
    expect(page.url()).toContain('magnetic_tool');
    await ss(page, 'IBB-E1-review-specs');
  });

  test('IBB-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    await openIsoBuckBoost(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await expect(designBtn).toBeVisible();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });
    expect(page.url()).toContain('magnetic_tool');
    await ss(page, 'IBB-E2-design-magnetic');
  });
});

test.describe('IsolatedBuckBoost – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('IBB-F1 – Adviser page loads with Get Advised Magnetics button', async ({ page }) => {
    const navigated = await goToMagneticAdviser(page, () => openIsoBuckBoost(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    await expect(adviseBtn).toBeVisible();
    await ss(page, 'IBB-F1-adviser-loaded');
  });

  test('IBB-F2 – Adviser runs and returns results', async ({ page }) => {
    const navigated = await goToMagneticAdviser(page, () => openIsoBuckBoost(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    await expect(adviseBtn).toBeVisible();

    await adviseBtn.click();
    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    );
    await page.waitForTimeout(2000);
    await ss(page, 'IBB-F2-adviser-results');
    expect(page.url()).toContain('magnetic_tool');
  });
});

test.describe('IsolatedBuckBoost – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('IBB-G1 – Review Specs reaches builder and Core Adviser runs', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticBuilder(page, () => openIsoBuckBoost(page));
    expect(navigated).toBe(true);

    await runCoreAdviser(page);
    await ss(page, 'IBB-G1-core-adviser-results');
    expect(errors.length).toBe(0);
  });
});
