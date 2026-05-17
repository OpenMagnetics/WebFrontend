/**
 * Magnetic Builder battery — Settings / context menu / control panel
 * (Groups R–T).
 *
 *   R – Settings modal (simulation, 3D viz, stock filter, core-loss models)
 *   S – Context Menu (Magnetic Adviser)
 *   T – Control Panel (Undo/Redo, Export modals)
 */

import { test, expect } from './_coverage.js';
import { pause } from './utils/wait.js';
import { ss, goToBuilderStep, goToBuilderWithCoil } from './utils/builder-helpers.js';

// =====================================================================
// GROUP R – Settings Modal
// =====================================================================
test.describe('MB – Group R – Settings Modal', () => {
  test.describe.configure({ timeout: 180000 });

  async function openSettings(page) {
    await goToBuilderStep(page);
    const settingsBtn = page.locator('[data-cy$="settings-modal-button"]').first();
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();
    await pause(page, 600, 'mechanical: settle');
  }

  test('MB-R1 – Settings button opens modal', async ({ page }) => {
    await openSettings(page);
    const modal = page.locator('#MagneticBuilderSettingsModal, .modal.show').first();
    await expect(modal).toBeVisible();
    await ss(page, 'R1-settings-modal');
  });

  test('MB-R2 – Settings: Stock filter toggle present', async ({ page }) => {
    await openSettings(page);
    const stockToggle = page.locator('[data-cy$="Settings-Modal-with-without-stock-button"]').first();
    await expect(stockToggle).toBeVisible();
    await ss(page, 'R2-stock-filter');
  });

  test('MB-R3 – Settings: Stock filter toggle is clickable on/off', async ({ page }) => {
    await openSettings(page);
    const stockToggle = page.locator('[data-cy$="Settings-Modal-with-without-stock-button"]').first();
    await expect(stockToggle).toBeVisible();
    const before = await stockToggle.evaluate(el => el.checked);
    await stockToggle.click();
    await pause(page, 300, 'mechanical: settle');
    const after = await stockToggle.evaluate(el => el.checked);
    expect(after, 'stock-filter checked state must flip on click').not.toBe(before);
    await stockToggle.click(); // back to original
    await ss(page, 'R3-stock-toggle');
  });

  test('MB-R4 – Settings: Simulation enable toggle present', async ({ page }) => {
    await openSettings(page);
    await expect(page.locator('[data-cy$="Settings-Modal-enable-simulation-button"]').first()).toBeVisible();
    await ss(page, 'R4-simulation-toggle');
  });

  test('MB-R5 – Settings: 3D visualisation toggle present', async ({ page }) => {
    await openSettings(page);
    await expect(page.locator('[data-cy$="-Settings-Modal-enable-visualization-button"]').first()).toBeVisible();
    await ss(page, 'R5-3d-viz-toggle');
  });

  test('MB-R6 – Settings: Update and Reset-defaults buttons present and clickable', async ({ page }) => {
    await openSettings(page);
    const updateBtn = page.locator('[data-cy$="Settings-Modal-update-settings-button"]').first();
    const resetBtn  = page.locator('[data-cy$="Settings-Modal-reset-defaults-button"]').first();
    await expect(updateBtn).toBeVisible();
    await expect(resetBtn).toBeVisible();
    await expect(updateBtn).toBeEnabled();
    await updateBtn.click();
    await pause(page, 500, 'mechanical: settle');
    await ss(page, 'R6-settings-update');
  });

  test('MB-R7 – Settings: Core losses model section present', async ({ page }) => {
    await openSettings(page);
    await expect(page.getByText(/core losses/i).first()).toBeVisible();
    await ss(page, 'R7-core-losses-model');
  });
});

// =====================================================================
// GROUP S – Context Menu buttons
// =====================================================================
test.describe('MB – Group S – Context Menu', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-S1 – Magnetic Adviser button visible in context menu', async ({ page }) => {
    await goToBuilderStep(page);
    await expect(page.locator('[data-cy$="-magnetics-adviser-button"]').first()).toBeVisible();
    await ss(page, 'S1-magnetic-adviser-btn');
  });

  test('MB-S2 – Click Magnetic Adviser switches to adviser view', async ({ page }) => {
    await goToBuilderStep(page);
    const maBtn = page.locator('[data-cy$="-magnetics-adviser-button"]').first();
    await expect(maBtn).toBeVisible();
    await maBtn.click();
    await pause(page, 1500, 'mechanical: settle');
    await expect(
      page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first()
    ).toBeVisible({ timeout: 10000 });
    await ss(page, 'S2-adviser-view');
  });
});

// =====================================================================
// GROUP T – Control Panel (Undo/Redo, Exports)
// =====================================================================
test.describe('MB – Group T – Control Panel', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-T1 – Undo and Redo buttons visible in control panel', async ({ page }) => {
    await goToBuilderStep(page);
    await expect(page.locator('button[title="Undo"]').first()).toBeVisible();
    await expect(page.locator('button[title="Redo"]').first()).toBeVisible();
    await ss(page, 'T1-undo-redo');
  });

  test('MB-T2 – MAS Exports modal button reachable after full coil build', async ({ page }) => {
    // The All-Exports dropdown only renders in ControlPanel.vue when
    // `showExportButtons && isMagneticComplete` — i.e. coil.turnsDescription
    // is non-null. We must therefore wind a coil first.
    await goToBuilderWithCoil(page);

    const dropdownTrigger = page.locator('button[title="All Exports"]').first();
    await expect(dropdownTrigger, '"All Exports" dropdown trigger must be visible after completion').toBeVisible({ timeout: 10000 });
    await dropdownTrigger.click();
    await pause(page, 300, 'mechanical: settle');

    const masBtn = page.locator('[data-cy="MAS-exports-modal-button"]').first();
    await expect(masBtn, 'MAS Exports menu item must be visible inside the open dropdown').toBeVisible();
    await ss(page, 'T2-mas-exports');
  });

  test('MB-T3 – Core, Coil, Circuit Simulator export buttons reachable after full coil build', async ({ page }) => {
    await goToBuilderWithCoil(page);

    const dropdownTrigger = page.locator('button[title="All Exports"]').first();
    await expect(dropdownTrigger).toBeVisible({ timeout: 10000 });
    await dropdownTrigger.click();
    await pause(page, 300, 'mechanical: settle');

    await expect(page.locator('[data-cy="Core-exports-modal-button"]').first()).toBeVisible();
    await expect(page.locator('[data-cy="Coil-exports-modal-button"]').first()).toBeVisible();
    await expect(page.locator('[data-cy="Circuit-Simulators-exports-modal-button"]').first()).toBeVisible();
    await ss(page, 'T3-export-buttons');
  });
});
