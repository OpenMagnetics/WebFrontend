/**
 * ABT #1234: a MAS that MKF cannot complete is not loaded half-processed.
 * The loader used to swallow the masAutocomplete failure with a console.warn
 * and load the raw document, so the user edited and simulated a design MKF
 * had never validated. Now the load fails and the user is told why.
 */
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
