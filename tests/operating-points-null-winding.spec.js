/**
 * User report #181: "Waveforms for winding Primary in operating point Op. Point No. 2
 * message appearing but I am unable to select or remove the operating point".
 * Adding a winding in Design Requirements padded every OTHER operating point with a
 * null excitation. Selecting such an operating point kept the selected winding and
 * rendered its null (render crash), and the saved file would not load again.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

const FIXTURE = new URL('./fixtures/04_forward_xfmr_e3216_n87.json', import.meta.url).pathname;

function twoOperatingPointsWithNullWinding(testInfo) {
  const mas = JSON.parse(fs.readFileSync(FIXTURE, 'utf-8'));
  const second = JSON.parse(JSON.stringify(mas.inputs.operatingPoints[0]));
  second.name = 'Op. Point No. 2';
  second.excitationsPerWinding[1] = null;
  mas.inputs.operatingPoints.push(second);
  const file = testInfo.outputPath('two-ops-null-winding.json');
  fs.writeFileSync(file, JSON.stringify(mas));
  return file;
}

async function openOperatingPoints(page) {
  await page.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    const state = pinia._s.get('state');
    state.operatingPoints.modePerPoint = pinia._s.get('mas').mas.inputs.operatingPoints.map(() => 'Manual');
    state.setCurrentToolSubsection('operatingPoints');
  });
  await expect(page.locator('[data-cy$="-select-operating-point-1-button"]').first()).toBeVisible({ timeout: 20000 });
}

test.describe('Operating points with a winding the user has not defined (user report #181)', () => {
  test.describe.configure({ timeout: 120000 });

  test('OPNULL-1: a saved file with a null winding excitation loads', async ({ page }, testInfo) => {
    const file = twoOperatingPointsWithNullWinding(testInfo);
    const dialogs = [];
    page.on('dialog', async (dialog) => { dialogs.push(dialog.message()); await dialog.dismiss(); });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(file);
    await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
    expect(dialogs).toEqual([]);
    const second = await page.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
      ._s.get('mas').mas.inputs.operatingPoints[1].excitationsPerWinding[1]);
    expect(second, 'the undefined winding is seeded, not null').not.toBeNull();
  });

  test('OPNULL-2: selecting another operating point with the second winding open does not crash', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
    await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
    // The state the old Design Requirements code left behind: a second operating point
    // whose newly added winding is null.
    await page.evaluate(() => {
      const mas = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas;
      const second = JSON.parse(JSON.stringify(mas.inputs.operatingPoints[0]));
      second.name = 'Op. Point No. 2';
      second.excitationsPerWinding[1] = null;
      mas.inputs.operatingPoints.push(second);
    });
    await openOperatingPoints(page);

    await page.locator('[data-cy$="-operating-point-0-winding-1-select-button"]').first().click();
    await page.locator('[data-cy$="-select-operating-point-1-button"]').first().click();
    await expect(page.locator('[data-cy$="-operating-point-1-winding-0-select-button"]').first()).toBeVisible({ timeout: 10000 });
    expect(pageErrors).toEqual([]);
    const seeded = await page.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
      ._s.get('mas').mas.inputs.operatingPoints[1].excitationsPerWinding[1]);
    expect(seeded, 'opening the winding in the selected operating point seeds it').not.toBeNull();
  });
});
