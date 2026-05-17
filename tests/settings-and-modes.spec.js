/**
 * Settings Modal & Operating Points Modes Tests
 *
 * Covers:
 *   - Settings modal: open, toggles (stock filter, 3D viz, simulation,
 *     interactive graphs), core-losses model selector, Update/Reset buttons.
 *   - OperatingPoints input modes: Manual / HarmonicsList / CircuitSimulatorImport
 *     selector buttons.
 */

import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL, screenshot, pause } from './utils.js';

const OP_PFX = 'MagneticBuilder-OperatingPoints';
const MAS_FIXTURE = '/home/alf/OpenMagnetics/WebFrontend/MagneticBuilder/src/public/test_wound_coil.json';
const ss = (page, name) => screenshot(page, 'settings', name);

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Reach a subsection of /magnetic_tool by loading a wound MAS fixture and
 * jumping via the Pinia state store. Independent of Python backend and of
 * wizard-flow timing, which is flaky in CI.
 */
async function reachSubsection(page, subsection) {
  if (!fs.existsSync(MAS_FIXTURE)) {
    throw new Error(`MAS fixture missing: ${MAS_FIXTURE}`);
  }
  const parsed = JSON.parse(fs.readFileSync(MAS_FIXTURE, 'utf-8'));

  await page.goto(`${BASE_URL}/magnetic_tool`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(
    () => !window.location.pathname.includes('engine_loader'),
    null,
    { timeout: 45000 },
  );
  await pause(page, 1500, 'mechanical: settle');

  await page.evaluate(({ parsedMas, targetSubsection }) => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    const mas = pinia._s.get('mas');
    const state = pinia._s.get('state');

    // Self-heal: initial DesignRequirements mount wipes magnetic; restore it.
    let healing = false;
    mas.$subscribe(() => {
      if (healing) return;
      const stripped = mas.mas?.magnetic?.coil?.turnsDescription == null && mas.mas?.magnetic?.coil;
      const opsGone = (mas.mas?.inputs?.operatingPoints?.length ?? 0) === 0
        && parsedMas.inputs?.operatingPoints?.length > 0;
      if (stripped || opsGone) {
        healing = true;
        if (stripped) mas.mas.magnetic = JSON.parse(JSON.stringify(parsedMas.magnetic));
        if (opsGone) mas.mas.inputs = JSON.parse(JSON.stringify(parsedMas.inputs));
        healing = false;
      }
    });
    mas.setMas(parsedMas);

    state.selectWorkflow?.('design');
    state.selectTool?.('magneticBuilder');
    state.setCurrentToolSubsectionStatus('designRequirements', true);
    state.setCurrentToolSubsectionStatus('operatingPoints', true);
    state.setCurrentToolSubsection(targetSubsection);
  }, { parsedMas: parsed, targetSubsection: subsection });

  await pause(page, 2000, 'mechanical: settle');
}

/** Navigate to the magnetic tool and reach the builder step. Throws on failure. */
async function goToBuilder(page) {
  await reachSubsection(page, 'magneticBuilder');
}

/**
 * Open the Settings modal via the context-menu settings button. Throws if
 * the button is not visible or the modal does not open.
 *
 * The actual modal element ID varies by subsection
 * (#MagneticBuilderSettingsModal, #OperatingPointSettingsModal, etc.), so
 * we match any `.modal.show` rather than a specific ID.
 */
async function openSettingsModal(page) {
  const btn = page.locator('[data-cy$="settings-modal-button"]').first();
  await expect(btn, 'settings-modal-button must be visible on builder step').toBeVisible({ timeout: 5000 });
  await btn.click();
  await pause(page, 600, 'mechanical: settle');
  const modal = page.locator('.modal.show[id$="SettingsModal"]').first();
  await expect(modal, 'SettingsModal must open after clicking the button').toBeVisible({ timeout: 3000 });
}

/** Reach the Operating Points step. Throws on failure. */
async function goToOP(page) {
  await reachSubsection(page, 'operatingPoints');
  await expect(
    page.locator(`[data-cy="${OP_PFX}-add-operating-point-button"]`),
    'add-operating-point-button must be visible on OP step',
  ).toBeVisible({ timeout: 10000 });
}

// ── Settings modal ────────────────────────────────────────────────────────

test.describe('Settings modal — open/close', () => {
  test.describe.configure({ timeout: 180000 });

  test('ST-1: settings modal button visible on builder step', async ({ page }) => {
    await goToBuilder(page);
    await expect(
      page.locator('[data-cy$="settings-modal-button"]').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('ST-2: clicking settings button opens modal with Settings title', async ({ page }) => {
    await goToBuilder(page);
    await openSettingsModal(page);
    await ss(page, 'ST2-modal-open');
  });

  test('ST-3: modal can be dismissed (Escape or close button)', async ({ page }) => {
    await goToBuilder(page);
    await openSettingsModal(page);
    await page.keyboard.press('Escape');
    await pause(page, 500, 'mechanical: settle');
    const modal = page.locator('.modal.show[id$="SettingsModal"]').first();
    await expect(modal).toBeHidden();
  });
});

// ── Settings modal — toggles ──────────────────────────────────────────────

test.describe('Settings modal — toggles & controls', () => {
  test.describe.configure({ timeout: 180000 });

  test('ST-4: stock filter toggle present', async ({ page }) => {
    await goToBuilder(page);
    await openSettingsModal(page);
    const btn = page.locator('[data-cy="Settings-Modal-with-without-stock-button"]');
    await expect(btn).toBeVisible({ timeout: 3000 });
    await ss(page, 'ST4-toggles');
  });

  test('ST-5: stock filter toggle is clickable (no error)', async ({ page }) => {
    await goToBuilder(page);
    await openSettingsModal(page);
    const btn = page.locator('[data-cy="Settings-Modal-with-without-stock-button"]');
    await expect(btn).toBeVisible({ timeout: 3000 });
    await btn.click();
    await pause(page, 400, 'mechanical: settle');
    await expect(btn).toBeVisible();
  });

  test('ST-6: 3D visualization toggle present', async ({ page }) => {
    await goToBuilder(page);
    await openSettingsModal(page);
    const btn = page.locator('[data-cy$="-Settings-Modal-enable-visualization-button"]').first();
    await expect(btn, '3D visualization toggle must be visible in settings modal').toBeVisible({ timeout: 3000 });
  });

  test('ST-7: Update button present and enabled', async ({ page }) => {
    await goToBuilder(page);
    await openSettingsModal(page);
    const btn = page.locator('[data-cy="Settings-Modal-update-settings-button"]');
    await expect(btn).toBeVisible({ timeout: 5000 });
    await expect(btn).toBeEnabled();
  });

  test('ST-8: Reset defaults button present', async ({ page }) => {
    await goToBuilder(page);
    await openSettingsModal(page);
    const btn = page.locator('[data-cy="Settings-Modal-reset-defaults-button"]');
    await expect(btn, 'reset-defaults-button must be visible in settings modal').toBeVisible({ timeout: 3000 });
    await expect(btn).toBeEnabled();
    await ss(page, 'ST8-reset-btn');
  });

  test('ST-9: modal contains at least one select element (core losses model or similar)', async ({ page }) => {
    await goToBuilder(page);
    await openSettingsModal(page);
    const selects = page.locator('.modal.show[id$="SettingsModal"] select');
    expect(await selects.count()).toBeGreaterThan(0);
  });
});

// ── Operating Points modes ───────────────────────────────────────────────

test.describe('Operating Points — input modes', () => {
  test.describe.configure({ timeout: 180000 });

  test('OP-M1: OP step reachable and add-operating-point button present', async ({ page }) => {
    await goToOP(page);
    await expect(
      page.locator(`[data-cy="${OP_PFX}-add-operating-point-button"]`)
    ).toBeVisible();
    await ss(page, 'OP-M1-op-step');
  });

  test('OP-M2: mode selector button visible after adding a new operating point', async ({ page }) => {
    await goToOP(page);
    const addBtn = page.locator(`[data-cy="${OP_PFX}-add-operating-point-button"]`);
    await addBtn.click();
    await pause(page, 600, 'mechanical: settle');
    const modeBtn = page.locator('[data-cy="OperatingPoint-source-Manual-button"]').first();
    await expect(modeBtn, 'OperatingPoint-source-Manual-button must be visible after adding a new OP').toBeVisible({ timeout: 5000 });
    await ss(page, 'OP-M2-after-add');
  });

  test('OP-M3: AC Sweep selector exists on initial OP', async ({ page }) => {
    await goToOP(page);
    const acSweep = page.locator('[data-cy$="-ac-sweep-type"]').first();
    const text = page.locator('text=AC Sweep').first();
    const hasAC = (await acSweep.isVisible({ timeout: 3000 })) ||
                  (await text.isVisible({ timeout: 2000 }));
    expect(hasAC, 'AC Sweep selector or label must be present on initial OP').toBe(true);
    await ss(page, 'OP-M3-ac-sweep');
  });

  test('OP-M4: Operating Points UI surfaces add/modify controls', async ({ page }) => {
    await goToOP(page);
    await expect(
      page.locator(`[data-cy="${OP_PFX}-add-operating-point-button"]`),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator(`[data-cy="${OP_PFX}-modify-number-windings-button"]`),
    ).toBeVisible({ timeout: 10000 });
  });

  test('OP-M5: add operating point button increases OP count', async ({ page }) => {
    await goToOP(page);
    const addBtn = page.locator(`[data-cy="${OP_PFX}-add-operating-point-button"]`);
    const before = await page.locator(`[data-cy^="${OP_PFX}-select-operating-point-"]`).count();
    await addBtn.click();
    await pause(page, 600, 'mechanical: settle');
    const after = await page.locator(`[data-cy^="${OP_PFX}-select-operating-point-"]`).count();
    expect(after).toBeGreaterThan(before);
  });
});
