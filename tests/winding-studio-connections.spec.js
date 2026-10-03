/**
 * The Studio's connection layer (magenta terminal leads, blue layer links) is
 * the real-winding lead model. With real winding geometry off the turns are
 * laid out ideally and never make room for a lead, so the markers only paint
 * over turns that are really there: they are drawn with real winding on only.
 */

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

const FIXTURE = fileURLToPath(new URL('../MagneticBuilder/src/public/test_wound_coil.json', import.meta.url));

async function openStudioWith(page, realWinding) {
  await page.goto(`${BASE_URL}/winding_studio_dev`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(() => typeof window.__setStudioMas === 'function', null, { timeout: 30000 });
  await page.evaluate((value) => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    pinia._s.get('settings').magneticBuilderSettings.useRealWindingGeometry = value;
  }, realWinding);
  await page.evaluate((mas) => window.__setStudioMas(mas), JSON.parse(fs.readFileSync(FIXTURE, 'utf-8')));
  const studio = page.locator('.winding-studio').first();
  await expect(studio).toBeVisible({ timeout: 10000 });
  await expect(studio.locator('.winding-studio-turn').first()).toBeVisible({ timeout: 10000 });
  await expect(studio.getByText('computing connections…')).toHaveCount(0, { timeout: 30000 });
  return studio;
}

test.describe('Winding Studio connections', () => {
  test.describe.configure({ timeout: 90000 });

  test('WSCONN-1: real winding off draws no terminal or link markers', async ({ page }) => {
    const studio = await openStudioWith(page, false);
    await expect(studio.locator('.winding-studio-connections')).toHaveCount(0);
  });

  test('WSCONN-2: real winding on draws the terminal markers', async ({ page }) => {
    const studio = await openStudioWith(page, true);
    const markers = studio.locator('.winding-studio-connections rect');
    await expect(markers.first()).toBeAttached({ timeout: 30000 });
    expect(await markers.count()).toBeGreaterThan(0);
  });
});
