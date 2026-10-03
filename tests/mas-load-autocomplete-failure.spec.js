/**
 * ABT #1234: a MAS that MKF cannot complete is not loaded half-processed.
 * The loader used to swallow the masAutocomplete failure with a console.warn
 * and load the raw document, so the user edited and simulated a design MKF
 * had never validated. Now the load fails and the user is told why.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UNKNOWN_WIRE_MAS = path.join(HERE, 'fixtures', 'forward_xfmr_unknown_wire.json');

test('MASLOAD-1: a design MKF cannot complete is refused with the reason', async ({ page }) => {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  const dialog = page.waitForEvent('dialog', { timeout: 60000 });
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(UNKNOWN_WIRE_MAS);
  const shown = await dialog;
  const message = shown.message();
  await shown.dismiss();
  expect(message).toContain('Could not load this file');
  expect(message).toContain('MKF could not complete this design');
  expect(message).toContain('Wire that is in no catalogue');
});

test('MASLOAD-3: a design saved with the pre-2026-09-17 spacer format loads (user reports #184/#185)', async ({ page }, testInfo) => {
  // Engines before MKF cfa6d126 wrote spacers as {material: 'plastic', rotation} with no
  // insulationMaterial; the MAS schema rejects that, so the loader refused the design.
  const mas = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'etd49_wound_10uH_5T.json'), 'utf-8'));
  const halfSet = mas.magnetic.core.geometricalDescription[0];
  mas.magnetic.core.geometricalDescription.push({
    type: 'spacer', material: 'plastic', rotation: [0, 0, 0],
    coordinates: [...halfSet.coordinates], dimensions: [0.004, 0.0001, 0.004],
  });
  const file = testInfo.outputPath('legacy-spacer.json');
  fs.writeFileSync(file, JSON.stringify(mas));

  const dialogs = [];
  page.on('dialog', async (dialog) => { dialogs.push(dialog.message()); await dialog.dismiss(); });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(file);
  await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
  expect(dialogs).toEqual([]);
  const legacy = await page.evaluate(() => {
    const core = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas.magnetic.core;
    return (core.geometricalDescription ?? []).filter((element) => element.type === 'spacer' && element.insulationMaterial == null).length;
  });
  expect(legacy, 'no spacer in the old format survives the load').toBe(0);
});
