/**
 * A design whose only operating point drives its core past the end of the material's magnetisation
 * curve. MKF's simulate leaves that point's magnetizing inductance, flux density and core losses unset
 * (no value stands in for them) and analyze_results reports CORE_SATURATES with the reason.
 *
 * The web lost that reason: Coil Info read the unset inductance and core losses and threw, so the
 * simulated outputs were never stored, and the summary called the design incomplete ("missing
 * magnetizing inductance") and told the user to run the simulation. Now Coil Info shows the winding
 * losses with no total, and the summary shows the engine's CORE_SATURATES message where the
 * inductance, flux density, core losses and total would be.
 *
 * Fixture: MKF's slow_simulation flyback (EFD 20/10/7) with its core in L5D and its 'Max. input volt.'
 * point at 160 C ambient, MKF's own CORE_SATURATES case (TestMagneticSimulator, past the curve at ambient).
 * It drives the real engine committed with the web.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/index.js';

const FIXTURE = new URL('./fixtures/efd20_l5d_flyback_160c_past_magnetisation_curve.json', import.meta.url).pathname;

async function loadDesign(page, consoleErrors) {
  page.on('console', (message) => { if (message.type() == 'error') consoleErrors.push(message.text()); });
  const alerts = [];
  page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__ != null);
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
  await Promise.race([
    page.waitForURL('**/magnetic_tool**', { timeout: 120000 }),
    page.waitForEvent('dialog', { timeout: 120000 }),
  ]);
  expect(alerts, 'the load is not refused').toEqual([]);
}

const SATURATES_TEXT = /^At operating point 0 \('Max\. input volt\. hot'\): the core saturates\. It would need a flux density of .* beyond the end of the magnetisation curve of L5D/;

test('CORE-SATURATES: Coil Info shows the winding losses with no total, and the summary states the saturation instead of calling the design incomplete', async ({ page }) => {
  test.setTimeout(240000);
  const consoleErrors = [];
  await loadDesign(page, consoleErrors);
  // Core Info states the engine's refusal (its own core-loss calculation throws CALCULATION_CORE_SATURATES).
  await expect(page.locator('.coreinfo-panel'), 'Core Info states the saturation').toContainText('beyond the end of the magnetisation curve of L5D', { timeout: 120000 });
  // Coil Info shows the winding losses of the simulated point, and no total.
  await expect(page.locator('[data-cy$="-WindingLosses-container"]').first(), 'Coil Info shows the winding losses').toBeVisible({ timeout: 120000 });
  await expect(page.locator('[data-cy$="-TotalLosses-container"]'), 'no total without core losses').toHaveCount(0);
  await expect(page.locator('[data-cy$="-CoilInfo-SimulationError"]')).toHaveCount(0);
  expect(consoleErrors.filter((text) => /TypeError/.test(text)), 'no script error reading the unset outputs').toEqual([]);

  await page.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    pinia._s.get('state').getCurrentToolState().subsection = 'magneticSummary';
  });
  await expect(page.locator('.datasheet-container'), 'the summary renders').toBeVisible({ timeout: 30000 });
  await expect(page.locator('[data-cy$="-MagneticSummary-incomplete"]'), 'the design is not called incomplete').toHaveCount(0);
  for (const key of ['Inductance', 'CoreLoss', 'PeakB']) {
    const tile = page.locator(`[data-cy$="-KeyParameter-${key}-saturates"]`);
    await expect(tile, `the ${key} tile states the saturation`).toHaveText('Core saturates', { timeout: 60000 });
    await expect(tile).toHaveAttribute('title', SATURATES_TEXT);
  }
  await expect(page.locator('[data-cy$="-ElectricalSpecs-Inductance-saturates"]')).toHaveText(SATURATES_TEXT);
  await expect(page.locator('[data-cy$="-ElectricalSpecs-PeakB-saturates"]')).toHaveText(SATURATES_TEXT);
  await expect(page.locator('[data-cy$="-Performance-CoreLosses-saturates"]')).toHaveText(SATURATES_TEXT);
  await expect(page.locator('[data-cy$="-Performance-TotalLosses-saturates"]')).toHaveText(
    'No total losses: the core saturates at this operating point, so the engine computed no core losses for it.');
  // The winding losses the engine did compute are shown.
  await expect(page.locator('.key-param', { hasText: 'Winding Loss' }).locator('.param-value-row')).toHaveText(/^\s*\d+(\.\d+)?\s*m?W\s*$/);
});
