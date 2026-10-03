/**
 * User report #185: the builder kept a loaded file's outputs (147 W core loss computed
 * for a 29-turn coil) after the re-simulation of the 22-turn coil on screen failed.
 * Outputs that the current design could not reproduce are dropped; the panel shows the
 * simulation error instead.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

const FIXTURE = new URL('./fixtures/etd49_wound_10uH_5T.json', import.meta.url).pathname;

const outputsCount = (page) => page.evaluate(() =>
  document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas.outputs.length);

test('COILOUT-1: a failed simulation drops the outputs of the earlier design state', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
  await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
  await expect.poll(() => outputsCount(page), { message: 'the builder simulates the loaded design', timeout: 90000 }).toBeGreaterThan(0);

  // The next simulation fails, as it does for the reported design.
  await page.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    pinia._s.get('magneticBuilderTaskQueue').simulate = () => Promise.reject(new Error('Exception: forced simulation failure'));
    const mas = pinia._s.get('mas').mas;
    mas.inputs.operatingPoints[0].conditions.ambientTemperature += 5;
    pinia._s.get('state').resimulate();
  });

  await expect(page.locator('[data-cy$="-SimulationError"]').filter({ hasText: 'forced simulation failure' }).first()).toBeVisible({ timeout: 30000 });
  expect(await outputsCount(page), 'outputs of the earlier state are not kept').toBe(0);
});
