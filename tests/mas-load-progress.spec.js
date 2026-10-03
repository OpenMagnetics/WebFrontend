/**
 * Loading a MAS waits for the engine (its catalogues are needed to check and
 * complete the design). On a first visit to production that took over a minute,
 * and nothing on screen changed until the builder opened: picking the file
 * looked like it had done nothing. The header now says it is loading the file
 * for the whole wait, and the notice goes away when the design opens.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOROID_MAS = path.join(HERE, 'fixtures', 'toroidal_cmc_t2515.json');

test('MASLOAD-2: the header says a MAS file is loading until the design opens', async ({ page }) => {
  test.setTimeout(180000);
  // Hold the engine download back so the wait a slow connection sees is observable.
  let releaseEngine;
  const engineHeld = new Promise((resolve) => { releaseEngine = resolve; });
  await page.route('**/libMKF.wasm.wasm*', async (route) => {
    await engineHeld;
    await route.continue();
  });

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__ != null);
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(TOROID_MAS);

  const notice = page.locator('[data-cy="Header-Load-MAS-progress"]');
  await expect(notice).toBeVisible({ timeout: 10000 });
  await expect(notice).toContainText('toroidal_cmc_t2515.json');

  releaseEngine();
  await page.waitForFunction(() => location.pathname !== '/', null, { timeout: 150000 });
  await expect(notice).toHaveCount(0, { timeout: 30000 });
});
