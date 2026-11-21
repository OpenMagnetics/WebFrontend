/**
 * A design whose core saturates: MKF's slow_simulation flyback (EFD 20/10/7, material 95), its
 * 'Max. input volt.' point at 25 C ambient (B peak 0.464 T against a B_sat of 0.32 T). Its loss loop
 * settles inside the material's data, so analyze_results reports CORE_SATURATES and no hold.
 *
 * Decision (Alf, 2026-11-20, "I want core losses shown even if they saturate!! don't hide it, just
 * mark it in danger color", with the inductance "after saturation"): past the curve's end the core is
 * fully saturated and MKF continues its B(H) on the vacuum's slope, so it computes the saturated
 * core's inductance, flux density and core losses, and analyze_results reports CORE_SATURATES. The web
 * shows every one of them, and the total, in the danger colour with the finding on hover: in Core
 * Info, Coil Info and the summary.
 *
 * Fixture (approved by Alf, 2026-11-21): the test first used the same flyback in L5D at 160 C, past the curve at
 * ambient. Computed past its curve, that core heats to about 325 C, above L5D's 200 C Curie point, so it is held
 * there (mb-core-held-at-curie covers that path) and is no longer plain saturation. Only the material, the ambient
 * and the point's name changed.
 *
 * It drives the real engine committed with the web.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/index.js';

const FIXTURE = new URL('./fixtures/efd20_95_flyback_saturates.json', import.meta.url).pathname;

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

// The theme's danger colour as the browser computes it.
const dangerColor = (page) => page.evaluate(() => {
  const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
  const probe = document.createElement('span');
  probe.style.color = pinia._s.get('style').magneticBuilder.inputLabelDangerBgColor.color;
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
});
const colorOf = (locator) => locator.evaluate((element) => getComputedStyle(element).color);
const NUMBER = /^\s*\d+(\.\d+)?\s*$/;
const SATURATES_TEXT = /^At operating point 0 \('Max\. input volt\.'\): The core saturates/;

test('CORE-SATURATES: a saturating core shows its inductance, flux density, core and total losses in the danger colour', async ({ page }) => {
  test.setTimeout(240000);
  const consoleErrors = [];
  await loadDesign(page, consoleErrors);
  const danger = async () => dangerColor(page);

  // Core Info: the inductance and the core losses, in the danger colour.
  const coreLosses = page.locator('.coreinfo-panel [data-cy$="-CoreLosses-number-label"]').first();
  await expect(coreLosses, 'Core Info shows the core losses').toHaveText(NUMBER, { timeout: 120000 });
  const inductance = page.locator('.coreinfo-panel [data-cy$="-MagnetizingInductance-number-label"]').first();
  await expect(inductance, 'Core Info shows the saturated inductance').toHaveText(NUMBER);
  await expect.poll(() => colorOf(coreLosses), { timeout: 60000, message: 'core losses in the danger colour' }).toBe(await danger());
  expect(await colorOf(inductance), 'inductance in the danger colour').toBe(await danger());
  await expect(page.locator('[data-cy$="-CoreInfo-SimulationError"]'), 'Core Info shows no error').toHaveCount(0);

  // Coil Info: the total, in the danger colour.
  const total = page.locator('[data-cy$="-TotalLosses-number-label"]').first();
  await expect(total, 'Coil Info shows the total').toHaveText(NUMBER, { timeout: 120000 });
  expect(await colorOf(total), 'total in the danger colour').toBe(await danger());
  expect(consoleErrors.filter((text) => /TypeError/.test(text)), 'no script error').toEqual([]);

  // The summary: every core value shown, marked, with MKF's finding on hover.
  await page.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    pinia._s.get('state').getCurrentToolState().subsection = 'magneticSummary';
  });
  await expect(page.locator('.datasheet-container'), 'the summary renders').toBeVisible({ timeout: 30000 });
  await expect(page.locator('[data-cy$="-MagneticSummary-incomplete"]')).toHaveCount(0);
  for (const key of ['Inductance', 'CoreLoss', 'PeakB']) {
    const tile = page.locator(`[data-cy$="-KeyParameter-${key}-saturates"]`);
    await expect(tile, `the ${key} tile shows its value`).toHaveText(NUMBER, { timeout: 60000 });
    await expect(tile).toHaveClass(/text-danger/);
    await expect(tile).toHaveAttribute('title', SATURATES_TEXT);
  }
  for (const key of ['Inductance', 'PeakB']) {
    const cell = page.locator(`[data-cy$="-ElectricalSpecs-${key}-saturates"]`);
    await expect(cell).toHaveText(NUMBER);
    await expect(cell).toHaveAttribute('title', SATURATES_TEXT);
  }
  for (const key of ['CoreLosses', 'TotalLosses']) {
    const cell = page.locator(`[data-cy$="-Performance-${key}-saturates"]`);
    await expect(cell).toHaveText(/^\d+(\.\d+)? m?W$/);
    await expect(cell).toHaveClass(/text-danger/);
    await expect(cell).toHaveAttribute('title', SATURATES_TEXT);
  }
});
