/**
 * LLC / PSFB Wizard Comprehensive Battery Tests
 *
 * LLC:  Inductor-Inductor-Capacitor resonant converter
 * PSFB: Phase-Shift Full Bridge
 *
 * Groups:
 *   A – Layout and UI controls
 *   B – Analytical simulation (Help me / I know)
 *   D – Simulated waveforms
 *   E – Navigation buttons
 *   F – Magnetic Adviser end-to-end
 *   G – Core Adviser (by steps)
 */

import { test, expect } from './_coverage.js';
import { BASE_URL, isBenign, screenshot, openWizard, runAnalytical, conditionsCard, outputsCard, goToMagneticAdviser, goToMagneticBuilder, runCoreAdviser, pause } from './utils.js';

const LLC_CY  = 'Llc-link';
const PSFB_CY = 'Psfb-link';

const ss = (page, name) => screenshot(page, 'llc-psfb-battery', name);
const openLlc  = (page) => openWizard(page, LLC_CY);
const openPsfb = (page) => openWizard(page, PSFB_CY);

// Both LLC and PSFB use the same custom `<label class="design-mode-option">
// <input radio><span class="design-mode-label">` markup as CLLC.
async function setDesignMode(page, modeText) {
  const label = page.locator('.design-mode-label').filter({ hasText: modeText }).first();
  await expect(label).toBeVisible();
  await label.click();
  await pause(page, 400, 'mechanical: settle');
}

// Find the number input inside the Dimension row whose visible title matches
// `titleText` and set it. Throws if the row/input cannot be located.
async function setDimensionByTitle(page, titleText, value) {
  const input = page.locator('.container-flex')
    .filter({ hasText: new RegExp(`^\\s*${titleText}`) })
    .locator('input[type="number"]')
    .first();
  await expect(input).toBeVisible();
  await input.click({ clickCount: 3 });
  await input.fill(String(value));
  await input.press('Tab');
}

// =====================================================================
// LLC – Group A: Layout
// =====================================================================
test.describe('LLC – Group A – Layout', () => {
  test.setTimeout(60000);

  test('LLC-A1 – Loads without console errors, title and Conditions card visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openLlc(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(conditionsCard(page)).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();

    expect(errors.length).toBe(0);
    await ss(page, 'LLC-A1-layout');
  });

  test('LLC-A2 – Tank parameters visible (Q Factor, Ln Ratio)', async ({ page }) => {
    await openLlc(page);
    // Q Factor and Ln Ratio are LLC's distinguishing tank inputs.
    await expect(page.getByText(/^Q Factor/).first()).toBeVisible();
    await expect(page.getByText(/^Ln Ratio/).first()).toBeVisible();
    await ss(page, 'LLC-A2-tank-params');
  });

  test('LLC-A3 – Design mode toggle reveals Mag. Inductance input', async ({ page }) => {
    await openLlc(page);
    await setDesignMode(page, 'I know');
    await expect(page.getByText(/Mag\.?\s*Inductance/i).first()).toBeVisible();
    await ss(page, 'LLC-A3-design-mode');
  });

  test('LLC-A4 – Outputs card visible', async ({ page }) => {
    await openLlc(page);
    await expect(outputsCard(page)).toBeVisible();
    await ss(page, 'LLC-A4-outputs');
  });
});

// =====================================================================
// LLC – Group B: Analytical
// =====================================================================
test.describe('LLC – Group B – Analytical', () => {
  test.setTimeout(120000);

  test('LLC-B1 – Default Help me analytical runs without error, canvas appears', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openLlc(page);
    await runAnalytical(page);

    await expect(page.locator('.error-text').first()).toBeHidden();
    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
    await ss(page, 'LLC-B1-analytical');
  });

  test('LLC-B2 – I know mode analytical runs without error', async ({ page }) => {
    await openLlc(page);
    await setDesignMode(page, 'I know');
    await runAnalytical(page);
    await expect(page.locator('.error-text').first()).toBeHidden();
    expect(await page.locator('canvas').count()).toBeGreaterThan(0);
    await ss(page, 'LLC-B2-iknow');
  });

  test('LLC-B3 – Q Factor = 0.6 analytical runs without error', async ({ page }) => {
    await openLlc(page);
    await setDimensionByTitle(page, 'Q Factor', '0.6');
    await runAnalytical(page);
    await expect(page.locator('.error-text').first()).toBeHidden();
    expect(await page.locator('canvas').count()).toBeGreaterThan(0);
    await ss(page, 'LLC-B3-quality-factor');
  });

  test('LLC-B4 – Diagnostics card appears after analytical', async ({ page }) => {
    await openLlc(page);
    await runAnalytical(page);
    const diagCard = page.locator('.compact-card').filter({ hasText: /Diagnostics/ }).first();
    await expect(diagCard).toBeVisible();
    await ss(page, 'LLC-B4-diagnostics');
  });
});

// =====================================================================
// LLC – Group D: Simulated
// =====================================================================
test.describe('LLC – Group D – Simulated', () => {
  test.setTimeout(60000);

  test('LLC-D1 – Simulated button present and enabled', async ({ page }) => {
    await openLlc(page);
    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await expect(simBtn).toBeVisible();
    await expect(simBtn).toBeEnabled();
    await simBtn.click();
    await pause(page, 2000, 'mechanical: settle');
    await ss(page, 'LLC-D1-simulated-clicked');
  });
});

// =====================================================================
// LLC – Group E: Navigation
// =====================================================================
test.describe('LLC – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('LLC-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openLlc(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });
    expect(page.url()).toContain('magnetic_tool');
    await ss(page, 'LLC-E1-review-specs');
    expect(errors.length).toBe(0);
  });

  test('LLC-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openLlc(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await expect(designBtn).toBeVisible();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });
    expect(page.url()).toContain('magnetic_tool');
    await ss(page, 'LLC-E2-design-magnetic');
    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// LLC – Group F: Magnetic Adviser
// =====================================================================
test.describe('LLC – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('LLC-F1 – Adviser page loads with Get Advised Magnetics button', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openLlc(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    await expect(adviseBtn).toBeVisible();
    await ss(page, 'LLC-F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('LLC-F2 – Adviser runs and returns results', async ({ page }) => {
    const navigated = await goToMagneticAdviser(page, () => openLlc(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    await expect(adviseBtn).toBeVisible();
    await adviseBtn.click();
    await ss(page, 'LLC-F2-adviser-running');

    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    );
    await pause(page, 2000, 'mechanical: settle');
    await ss(page, 'LLC-F2-adviser-results');
  });
});

// =====================================================================
// LLC – Group G: Core Adviser
// =====================================================================
test.describe('LLC – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('LLC-G1 – Review Specs reaches Magnetic Builder', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openLlc(page));
    expect(navigated).toBe(true);
    await ss(page, 'LLC-G1-builder');
  });

  test('LLC-G2 – Core Adviser runs from Magnetic Builder', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openLlc(page));
    expect(navigated).toBe(true);

    await runCoreAdviser(page);
    await ss(page, 'LLC-G2-core-adviser-results');
  });
});

// =====================================================================
// PSFB – Group A: Layout
// =====================================================================
test.describe('PSFB – Group A – Layout', () => {
  test.setTimeout(60000);

  test('PSFB-A1 – Loads without console errors, title and analytical button visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openPsfb(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();
    expect(errors.length).toBe(0);
    await ss(page, 'PSFB-A1-layout');
  });

  test('PSFB-A2 – Phase-shift parameters visible (Ph. Shift, Max Phase)', async ({ page }) => {
    await openPsfb(page);
    await expect(page.getByText(/^Ph(?:ase)?\.?\s*Shift/).first()).toBeVisible();
    await expect(page.getByText(/^Max Phase/).first()).toBeVisible();
    await ss(page, 'PSFB-A2-phase-params');
  });

  test('PSFB-A3 – Design mode toggle reveals Transformer card and Mag. Ind. input', async ({ page }) => {
    await openPsfb(page);
    await setDesignMode(page, 'I know');
    // PSFB switches the design-or-switch-parameters compact-header to "Transformer" in I-know mode.
    await expect(page.locator('.compact-header').filter({ hasText: 'Transformer' }).first()).toBeVisible();
    await expect(page.getByText(/Mag\.?\s*Ind/).first()).toBeVisible();
    await ss(page, 'PSFB-A3-design-mode');
  });
});

// =====================================================================
// PSFB – Group B: Analytical
// =====================================================================
test.describe('PSFB – Group B – Analytical', () => {
  test.setTimeout(120000);

  test('PSFB-B1 – Default analytical runs without error, canvas appears', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openPsfb(page);
    await runAnalytical(page);

    await expect(page.locator('.error-text').first()).toBeHidden();
    expect(await page.locator('canvas').count()).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
    await ss(page, 'PSFB-B1-analytical');
  });

  test('PSFB-B2 – I know mode analytical runs without error', async ({ page }) => {
    await openPsfb(page);
    await setDesignMode(page, 'I know');
    await runAnalytical(page);
    await expect(page.locator('.error-text').first()).toBeHidden();
    expect(await page.locator('canvas').count()).toBeGreaterThan(0);
    await ss(page, 'PSFB-B2-iknow');
  });
});

// =====================================================================
// PSFB – Group D: Simulated
// =====================================================================
test.describe('PSFB – Group D – Simulated', () => {
  test.setTimeout(60000);

  test('PSFB-D1 – Simulated button present and enabled', async ({ page }) => {
    await openPsfb(page);
    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await expect(simBtn).toBeVisible();
    await expect(simBtn).toBeEnabled();
    await simBtn.click();
    await pause(page, 2000, 'mechanical: settle');
    await ss(page, 'PSFB-D1-simulated');
  });
});

// =====================================================================
// PSFB – Group E: Navigation
// =====================================================================
test.describe('PSFB – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('PSFB-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    await openPsfb(page);
    await runAnalytical(page);
    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });
    expect(page.url()).toContain('magnetic_tool');
    await ss(page, 'PSFB-E1-review-specs');
  });

  test('PSFB-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    await openPsfb(page);
    await runAnalytical(page);
    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await expect(designBtn).toBeVisible();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });
    expect(page.url()).toContain('magnetic_tool');
    await ss(page, 'PSFB-E2-design-magnetic');
  });
});

// =====================================================================
// PSFB – Group F: Magnetic Adviser
// =====================================================================
test.describe('PSFB – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('PSFB-F1 – Adviser loads and Get Advised Magnetics visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openPsfb(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    await expect(adviseBtn).toBeVisible();
    await ss(page, 'PSFB-F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('PSFB-F2 – Adviser runs and returns results', async ({ page }) => {
    const navigated = await goToMagneticAdviser(page, () => openPsfb(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    await expect(adviseBtn).toBeVisible();
    await adviseBtn.click();
    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    );
    await pause(page, 2000, 'mechanical: settle');
    await ss(page, 'PSFB-F2-adviser-results');
  });
});

// =====================================================================
// PSFB – Group G: Core Adviser
// =====================================================================
test.describe('PSFB – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('PSFB-G1 – Review Specs reaches Magnetic Builder and Core Adviser runs', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openPsfb(page));
    expect(navigated).toBe(true);

    await runCoreAdviser(page);
    await ss(page, 'PSFB-G1-core-adviser-results');
  });
});
