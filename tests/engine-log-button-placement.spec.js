/**
 * The Engine log button sits in the tool menu, below Magnetic Adviser, while the magnetic tool shows
 * its tool menu; on pages without it (the wizards), the footer keeps it. One button at a time
 * (Alf, 2026-11-05: "put the engine log here, below the button for the magnetic adviser").
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/index.js';

const FIXTURE = new URL('./fixtures/etd49_wound_10uH_5T.json', import.meta.url).pathname;

const toggles = (page) => page.locator('[data-cy="EngineLogPanel-toggle"]');
const footerToggle = (page) => page.locator('.om-footer [data-cy="EngineLogPanel-toggle"]');
const toolMenuToggle = (page) => page.locator('.toolmenu-panel [data-cy="EngineLogPanel-toggle"]');

test('ENGINE-LOG-PLACEMENT: below Magnetic Adviser in the tool menu, in the footer elsewhere', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__ != null);
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
  await page.waitForURL('**/magnetic_tool**', { timeout: 120000 });

  // Material-data extrapolation is on by default, so the log is reachable.
  const adviser = page.locator('[data-cy$="-magnetics-adviser-button"]');
  await expect(adviser).toBeVisible({ timeout: 60000 });
  await expect(toolMenuToggle(page)).toBeVisible();
  await expect(toggles(page), 'one Engine log button on the page').toHaveCount(1);
  await expect(footerToggle(page)).toHaveCount(0);

  // Directly below Magnetic Adviser.
  const adviserBox = await adviser.boundingBox();
  const toggleBox = await toolMenuToggle(page).boundingBox();
  expect(toggleBox.y).toBeGreaterThan(adviserBox.y + adviserBox.height - 1);
  expect(toggleBox.y - (adviserBox.y + adviserBox.height)).toBeLessThan(20);

  await toolMenuToggle(page).click();
  await expect(page.locator('[data-cy="EngineLogPanel"]')).toBeVisible();
  await toolMenuToggle(page).click();
  await expect(page.locator('[data-cy="EngineLogPanel"]')).toHaveCount(0);

  // A page without the tool menu: the footer has it.
  await page.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$router.push('/wizards'));
  await page.waitForURL('**/wizards**');
  await expect(footerToggle(page)).toBeVisible({ timeout: 30000 });
  await expect(toggles(page)).toHaveCount(1);
});
