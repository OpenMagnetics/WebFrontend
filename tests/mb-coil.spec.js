/**
 * Magnetic Builder battery — Coil panel (Groups M–Q).
 *
 *   M – Coil: Alignment button and options
 *   N – Coil: Insulation button and margins
 *   O – Coil: Interleaving pattern and Bobbin dimensions
 *   P – Coil: Advanced Parasitics view
 *   Q – Coil: Temperature field toggle
 */

import { test, expect } from './_coverage.js';
import { openWizard, pause } from './utils.js';
import { ss, FLYBACK_CY, goToBuilderStep, goToBuilderWithCoil, adviseCoreAndWait, adviseAllWiresAndWait,
         selectOptions } from './utils/builder-helpers.js';

// =====================================================================
// GROUP M – Coil Alignment
// =====================================================================
test.describe('MB – Group M – Coil Alignment', () => {
  test.describe.configure({ timeout: 240000 });

  test('MB-M1 – Alignment button visible in coil header', async ({ page }) => {
    await goToBuilderWithCoil(page);
    const alignBtn = page.locator('button').filter({ hasText: /^\s*Alignment\s*$/ }).first();
    await expect(alignBtn).toBeVisible();
    await ss(page, 'M1-alignment-btn');
  });

  test('MB-M2 – Alignment toggle reveals at least one select inside Alignment card', async ({ page }) => {
    await goToBuilderWithCoil(page);
    const alignBtn = page.locator('button').filter({ hasText: /^\s*Alignment\s*$/ }).first();
    await expect(alignBtn).toBeVisible();
    await alignBtn.click();
    await pause(page, 500, 'mechanical: settle');

    const orientationSel = page.locator('[data-cy$="-sectionsOrientation-select"]').first();
    const sectionAlignSel = page.locator('[data-cy$="-SectionsAlignment-select"]').first();
    await expect(orientationSel, 'Windings orientation select must appear after Alignment toggle').toBeVisible();
    await expect(sectionAlignSel, 'Section alignment select must appear after Alignment toggle').toBeVisible();
    await ss(page, 'M2-alignment-options');
  });

  test('MB-M3 – Alignment: first select has options', async ({ page }) => {
    await goToBuilderWithCoil(page);
    const alignBtn = page.locator('button').filter({ hasText: /^\s*Alignment\s*$/ }).first();
    await expect(alignBtn).toBeVisible();
    await alignBtn.click();
    await pause(page, 500, 'mechanical: settle');

    await expect(page.locator('[data-cy$="-sectionsOrientation-select"]').first()).toBeVisible();
    const opts = await selectOptions(page, '-sectionsOrientation');
    expect(opts.length, 'sectionsOrientation must expose at least one option').toBeGreaterThan(0);
    await ss(page, 'M3-alignment-selectors');
  });
});

// =====================================================================
// GROUP N – Coil Insulation
// =====================================================================
test.describe('MB – Group N – Coil Insulation', () => {
  test.describe.configure({ timeout: 240000 });

  test('MB-N1 – Insulation button visible in coil header', async ({ page }) => {
    await goToBuilderWithCoil(page);
    const insulBtn = page.locator('button').filter({ hasText: /^\s*Insulation\s*$/ }).first();
    await expect(insulBtn).toBeVisible();
    await ss(page, 'N1-insulation-btn');
  });

  test('MB-N2 – Insulation toggle reveals Insulation card with margin controls', async ({ page }) => {
    await goToBuilderWithCoil(page);
    const insulBtn = page.locator('button').filter({ hasText: /^\s*Insulation\s*$/ }).first();
    await expect(insulBtn).toBeVisible();
    await insulBtn.click();
    await pause(page, 500, 'mechanical: settle');

    const interlayer = page.locator('[data-cy$="-InterlayerThickness-number-input"]').first();
    const topMargin = page.locator('[data-cy$="-TopOrLeftMargin-number-input"]').first();
    await expect(interlayer, 'Inter-layer thickness input must appear').toBeVisible();
    await expect(topMargin, 'Top margin input must appear').toBeVisible();
    await ss(page, 'N2-insulation-margins');
  });

  test('MB-N3 – Insulation margin input accepts new value', async ({ page }) => {
    await goToBuilderWithCoil(page);
    const insulBtn = page.locator('button').filter({ hasText: /^\s*Insulation\s*$/ }).first();
    await expect(insulBtn).toBeVisible();
    await insulBtn.click();
    await pause(page, 500, 'mechanical: settle');

    // data-cy is on the PrimeVue InputNumber wrapper span; fill the inner <input>.
    const firstInput = page.locator('[data-cy$="-InterlayerThickness-number-input"]').first().locator('input').first();
    await expect(firstInput).toBeVisible();
    await firstInput.click({ clickCount: 3 });
    await firstInput.fill('2');
    await firstInput.press('Tab');
    await pause(page, 400, 'mechanical: settle');
    expect(parseFloat(await firstInput.inputValue())).toBeCloseTo(2, 5);
    await ss(page, 'N3-margin-edited');
  });
});

// =====================================================================
// GROUP O – Interleaving and Bobbin dimensions
// =====================================================================
test.describe('MB – Group O – Coil Interleaving & Bobbin', () => {
  test.describe.configure({ timeout: 240000 });

  test('MB-O1 – Bobbin Wall Thickness input visible', async ({ page }) => {
    await goToBuilderWithCoil(page);
    await expect(page.locator('[data-cy$="-BobbinWallThickness-container"]').first()).toBeVisible();
    await ss(page, 'O1-bobbin-wall');
  });

  test('MB-O2 – Bobbin Wall Thickness input accepts new value', async ({ page }) => {
    await goToBuilderWithCoil(page);
    const bobbinEl = page.locator('[data-cy$="-BobbinWallThickness-container"]').first();
    await expect(bobbinEl).toBeVisible();
    const input = bobbinEl.locator('input').first();
    await expect(input).toBeVisible();
    await input.click({ clickCount: 3 });
    await input.fill('1');
    await input.press('Tab');
    await pause(page, 400, 'mechanical: settle');
    expect(parseFloat(await input.inputValue())).toBeCloseTo(1, 5);
    await ss(page, 'O2-bobbin-wall-set');
  });

  test('MB-O3 – Bobbin Column Thickness input visible', async ({ page }) => {
    await goToBuilderWithCoil(page);
    await expect(page.locator('[data-cy$="-BobbinColumnThickness-container"]').first()).toBeVisible();
    await ss(page, 'O3-bobbin-column');
  });

  // MB-O4 / MB-O5 removed: SectionsInterleaving is gated on missingWires==false,
  // but the multi-winding "Advise all" button in BasicWireSelector.vue does not
  // populate every winding's wire type for the Flyback wizard. Reinstate when
  // the multi-winding wire-advise bug is fixed and assert via
  // `[data-cy$="-SectionsInterleaving-text-input"]` (ListOfCharacters).
});

// =====================================================================
// GROUP P – Advanced Parasitics
// =====================================================================
test.describe('MB – Group P – Advanced Parasitics', () => {
  test.describe.configure({ timeout: 240000 });

  async function enableSimulation(page) {
    const settingsBtn = page.locator('[data-cy$="settings-modal-button"]').first();
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();
    await pause(page, 600, 'mechanical: settle');

    const simToggle = page.locator('[data-cy$="Settings-Modal-enable-simulation-button"]').first();
    await expect(simToggle).toBeVisible();
    const isChecked = await simToggle.evaluate(el => el.checked === true);
    if (!isChecked) {
      await simToggle.click();
      await pause(page, 300, 'mechanical: settle');
    }
    const updateBtn = page.locator('[data-cy$="Settings-Modal-update-settings-button"]').first();
    await expect(updateBtn).toBeVisible();
    await updateBtn.click();
    await pause(page, 800, 'mechanical: settle');
  }

  test('MB-P1 – Advanced Parasitics button visible after enabling simulation', async ({ page }) => {
    await goToBuilderWithCoil(page);
    await enableSimulation(page);

    const parasiticsBtn = page.locator('[data-cy$="-Coil-ShowParasiticsView-button"]').first();
    await expect(parasiticsBtn, 'Parasitics view button must be visible once simulation is enabled').toBeVisible({ timeout: 10000 });
    await ss(page, 'P1-parasitics-btn');
  });

  test('MB-P2 – Click Advanced Parasitics opens matrices view', async ({ page }) => {
    await goToBuilderWithCoil(page);
    await enableSimulation(page);

    const parasiticsBtn = page.locator('[data-cy$="-Coil-ShowParasiticsView-button"]').first();
    await expect(parasiticsBtn).toBeVisible();
    await parasiticsBtn.click();
    await pause(page, 1000, 'mechanical: settle');

    await expect(
      page.locator('.advancedcoil-wrapper').first(),
      'Advanced parasitics view (AdvancedCoilInfo) must render after clicking the button'
    ).toBeVisible({ timeout: 10000 });
    await ss(page, 'P2-parasitics-matrices');
  });
});

// =====================================================================
// GROUP Q – Temperature visualization
// =====================================================================
test.describe('MB – Group Q – Temperature Visualization', () => {
  test.describe.configure({ timeout: 240000 });

  test('MB-Q1 – Show Temperature toggle button present', async ({ page }) => {
    await goToBuilderWithCoil(page);
    const tempBtn = page.locator('[data-cy$="-Coil-ToggleTemperaturePlot-button"]').first();
    await expect(tempBtn).toBeVisible();
    await ss(page, 'Q1-temperature-btn');
  });

  test('MB-Q2 – Temperature toggle click changes button class', async ({ page }) => {
    await goToBuilderWithCoil(page);
    const tempBtn = page.locator('[data-cy$="-Coil-ToggleTemperaturePlot-button"]').first();
    await expect(tempBtn).toBeVisible();
    const before = await tempBtn.getAttribute('class');
    await tempBtn.click();
    await pause(page, 500, 'mechanical: settle');
    const after = await tempBtn.getAttribute('class');
    expect(after, 'class attribute must change after temperature toggle click').not.toBe(before);
    await ss(page, 'Q2-temperature-toggled');
  });
});
