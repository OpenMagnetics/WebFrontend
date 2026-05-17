/**
 * Flyback Wizard Comprehensive Battery Tests
 *
 * Groups:
 *   A – Layout and UI controls
 *   B – Analytical simulation (Help me / I know, MOSFET input type)
 *   C – Multi-output support
 *   D – Simulated waveforms
 *   E – Navigation buttons
 *   F – Magnetic Adviser end-to-end
 *   G – Core Adviser (by steps)
 */

import { test, expect } from './_coverage.js';
import { BASE_URL, isBenign, screenshot, openWizard, runAnalytical, conditionsCard, outputsCard, goToMagneticAdviser, goToMagneticBuilder, runCoreAdviser, pause } from './utils.js';

const FLYBACK_CY = 'Flyback-CommonModeChoke-link';
const ss = (page, name) => screenshot(page, 'flyback-battery', name);
const openFlyback = (page) => openWizard(page, FLYBACK_CY);

// =====================================================================
// GROUP A – Layout
// =====================================================================
test.describe('Flyback – Group A – Layout', () => {
  test.setTimeout(60000);

  test('Flyback-A1 – Loads without console errors, title and Conditions card visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openFlyback(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(conditionsCard(page)).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();

    console.log(`[Flyback-A1] Errors: ${errors.length}`);
    expect(errors.length).toBe(0);
    await ss(page, 'A1-layout');
  });

  test('Flyback-A2 – MOSFET input type radio buttons visible', async ({ page }) => {
    await openFlyback(page);

    // In default "Help me" mode the wizard renders an ElementFromListRadio
    // for mosfetInputType with two options.
    const dutyRadio = page.locator('[data-cy="FlybackWizard-MosfetInputType-Its maximum duty cycle-radio-input"]');
    const vdsRadio = page.locator('[data-cy="FlybackWizard-MosfetInputType-Its maximum drain-source voltage-radio-input"]');
    await expect(dutyRadio).toBeAttached();
    await expect(vdsRadio).toBeAttached();
    await ss(page, 'A2-mosfet-selector');
  });

  test('Flyback-A3 – Outputs card has voltage and current inputs', async ({ page }) => {
    await openFlyback(page);

    const oCard = outputsCard(page);
    await expect(oCard).toBeVisible();
    const numInputs = await oCard.locator('input[type="number"]').count();
    console.log(`[Flyback-A3] Output inputs: ${numInputs}`);
    expect(numInputs).toBeGreaterThan(0);
    await ss(page, 'A3-outputs-card');
  });

  test('Flyback-A4 – Design mode toggle (Help me / I know)', async ({ page }) => {
    await openFlyback(page);

    const iKnow = page.locator('[data-cy="FlybackWizard-DesignLevel-I know the design I want-radio-input"]');
    await expect(iKnow).toBeAttached();
    await iKnow.check({ force: true });
    await pause(page, 400, 'mechanical: settle');

    // In "I know" mode the wizard exposes the Duty Cycle input.
    const dutyCycleLabel = page.locator('label, span, div').filter({ hasText: /Duty Cycle/ }).first();
    await expect(dutyCycleLabel).toBeVisible();
    await ss(page, 'A4-design-mode');
  });
});

// =====================================================================
// GROUP B – Analytical
// =====================================================================
test.describe('Flyback – Group B – Analytical', () => {
  test.setTimeout(90000);

  test('Flyback-B1 – Default "Help me" analytical runs without error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openFlyback(page);
    await ss(page, 'B1-before');
    await runAnalytical(page);
    await ss(page, 'B1-after');

    await expect(page.locator('.error-text').first()).toBeHidden();
    expect(await page.locator('canvas').count()).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
  });

  test('Flyback-B2 – MOSFET input: max duty cycle mode', async ({ page }) => {
    await openFlyback(page);

    const dutyRadio = page.locator('[data-cy="FlybackWizard-MosfetInputType-Its maximum duty cycle-radio-input"]');
    await expect(dutyRadio).toBeAttached();
    await dutyRadio.check({ force: true });
    await pause(page, 300, 'mechanical: settle');
    await runAnalytical(page);

    await expect(page.locator('.error-text').first()).toBeHidden();
    await ss(page, 'B2-mosfet-duty');
  });

  test('Flyback-B3 – MOSFET input: max Vds mode', async ({ page }) => {
    await openFlyback(page);

    const vdsRadio = page.locator('[data-cy="FlybackWizard-MosfetInputType-Its maximum drain-source voltage-radio-input"]');
    await expect(vdsRadio).toBeAttached();
    await vdsRadio.check({ force: true });
    await pause(page, 300, 'mechanical: settle');
    await runAnalytical(page);

    await expect(page.locator('.error-text').first()).toBeHidden();
    await ss(page, 'B3-mosfet-vds');
  });

  test('Flyback-B4 – "I know" mode with default duty cycle', async ({ page }) => {
    await openFlyback(page);

    const iKnow = page.locator('[data-cy="FlybackWizard-DesignLevel-I know the design I want-radio-input"]');
    await expect(iKnow).toBeAttached();
    await iKnow.check({ force: true });
    await pause(page, 400, 'mechanical: settle');

    await runAnalytical(page);
    await expect(page.locator('.error-text').first()).toBeHidden();
    await ss(page, 'B4-iknow-analytical');
  });

  test('Flyback-B5 – Analytical produces at least one waveform canvas', async ({ page }) => {
    await openFlyback(page);
    await runAnalytical(page);

    // Don't depend on a non-existent "converter view" toggle; assert results.
    expect(await page.locator('canvas').count()).toBeGreaterThan(0);
    await ss(page, 'B5-waveform-canvas');
  });
});

// =====================================================================
// GROUP C – Multi-output
// =====================================================================
test.describe('Flyback – Group C – Multi-output', () => {
  test.setTimeout(90000);

  test('Flyback-C1 – Set Number of Outputs = 2 and run analytical', async ({ page }) => {
    await openFlyback(page);

    const numOutputsSelect = page.locator('[data-cy="FlybackWizard-NumberOutputs-select"]');
    await expect(numOutputsSelect).toBeVisible();
    const beforeCount = await outputsCard(page).locator('input[type="number"]').count();
    await numOutputsSelect.selectOption({ label: '2' });
    await pause(page, 500, 'mechanical: settle');
    const afterCount = await outputsCard(page).locator('input[type="number"]').count();
    expect(afterCount).toBeGreaterThan(beforeCount);

    await runAnalytical(page);
    await expect(page.locator('.error-text').first()).toBeHidden();
    await ss(page, 'C1-multi-output');
  });
});

// =====================================================================
// GROUP D – Simulated
// =====================================================================
test.describe('Flyback – Group D – Simulated', () => {
  test.setTimeout(60000);

  test('Flyback-D1 – Simulated button present and clickable', async ({ page }) => {
    await openFlyback(page);

    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await expect(simBtn).toBeVisible();
    await expect(simBtn).toBeEnabled();

    await simBtn.click();
    await pause(page, 2000, 'mechanical: settle');
    await ss(page, 'D1-simulated-clicked');
  });
});

// =====================================================================
// GROUP E – Navigation
// =====================================================================
test.describe('Flyback – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('Flyback-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openFlyback(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });

    expect(page.url()).toContain('magnetic_tool');
    await ss(page, 'E1-review-specs');
    expect(errors.length).toBe(0);
  });

  test('Flyback-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openFlyback(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await expect(designBtn).toBeVisible();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });

    expect(page.url()).toContain('magnetic_tool');
    await ss(page, 'E2-design-magnetic');
    expect(errors.length).toBe(0);
  });

});

// =====================================================================
// GROUP F – Magnetic Adviser
// =====================================================================
test.describe('Flyback – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('Flyback-F1 – Adviser page loads after Design Magnetic', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openFlyback(page));
    console.log(`[Flyback-F1] Navigated: ${navigated}`);
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    await expect(adviseBtn).toBeVisible();
    await ss(page, 'F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('Flyback-F2 – Adviser runs and returns results', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openFlyback(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    await expect(adviseBtn).toBeVisible();

    await adviseBtn.click();
    await ss(page, 'F2-adviser-running');

    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    );
    await pause(page, 2000, 'mechanical: settle');
    await ss(page, 'F2-adviser-results');
    expect(page.url()).toContain('magnetic_tool');
    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// GROUP G – Core Adviser
// =====================================================================
test.describe('Flyback – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('Flyback-G1 – Review Specs reaches builder with Design Requirements', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticBuilder(page, () => openFlyback(page));
    expect(navigated).toBe(true);
    await ss(page, 'G1-builder');
    expect(errors.length).toBe(0);
  });

  test('Flyback-G2 – Core Adviser accessible and runs', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticBuilder(page, () => openFlyback(page));
    expect(navigated).toBe(true);

    await runCoreAdviser(page);
    await ss(page, 'G2-core-adviser-results');
    expect(errors.length).toBe(0);
  });

  test('Flyback-G4 – Builder shows correct winding count (primary + secondary)', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openFlyback(page));
    expect(navigated).toBe(true);

    const pageText = await page.locator('body').innerText();
    expect(pageText).toMatch(/Primary/);
    expect(pageText).toMatch(/Secondary/);
    await ss(page, 'G4-builder-windings');
  });
});
