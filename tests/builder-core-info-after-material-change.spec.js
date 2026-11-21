/**
 * ABT #2280: on the same design Core Info showed Pcore 1.82 W after a material change with auto-simulation
 * on, and 5.72 W after Resimulate.
 *
 * Cause: Core Info prices its losses as soon as the new core is processed, and the material change then
 * regenerates the bobbin and winds the coil again. calculateCoreLosses read the live store objects across
 * three awaited engine calls, so its core-loss call priced a coil whose turns had just been cleared: MKF
 * solved the core on a core-only thermal network with no winding heat, colder than the wound design. That
 * result stayed on screen as up to date; nothing priced the core again once the coil was wound.
 *
 * Now each simulation prices one copy of the design, and Core Info prices the core again whenever the coil
 * is wound. Its figures after a material change are therefore those Resimulate gives for the same design.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/index.js';
import { installActivityProbe, activityMark, waitForIdle } from './utils/activity.js';

const FIXTURE = new URL('./fixtures/etd49_wound_10uH_5T.json', import.meta.url).pathname;

const coreLossesShown = (page) => page.locator('.coreinfo-panel [data-cy$="-CoreLosses-container"]').first().innerText();

async function pick(page, suffix, label) {
  const mark = await activityMark(page);
  await page.locator(`[data-cy$="${suffix}-select"]`).first().click();
  await page.getByRole('option', { name: label, exact: true }).first().click();
  await waitForIdle(page, { since: mark, quietMs: 4000, timeout: 200000, label: suffix });
}

test('INFO-2280: after a material change Core Info shows what Resimulate gives for the same design', async ({ page }) => {
  test.setTimeout(400000);
  const alerts = [];
  page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
  await installActivityProbe(page);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__ != null);
  const loadMark = await activityMark(page);
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
  await page.waitForURL('**/magnetic_tool**', { timeout: 120000 });
  expect(alerts, 'the load is not refused').toEqual([]);
  await waitForIdle(page, { since: loadMark, quietMs: 4000, timeout: 200000, label: 'the loaded design' });
  const autoSimulation = await page.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s
    .get('settings').magneticBuilderSettings.enableAutoSimulation);
  expect(autoSimulation, 'the builder simulates on every change').toBe(true);

  await pick(page, '-MaterialManufacturers', 'Ferroxcube');
  await pick(page, '-MaterialNames', '3C90');
  await expect(page.locator('[data-cy$="-CoreInfo-SimulationError"]')).toHaveCount(0);
  const afterChange = await coreLossesShown(page);

  const resimulateMark = await activityMark(page);
  await page.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('state').resimulate());
  await waitForIdle(page, { since: resimulateMark, quietMs: 4000, timeout: 200000, label: 'resimulate' });
  const afterResimulate = await coreLossesShown(page);

  expect(afterChange, 'the core losses shown after the change are those of the wound design').toBe(afterResimulate);
});
