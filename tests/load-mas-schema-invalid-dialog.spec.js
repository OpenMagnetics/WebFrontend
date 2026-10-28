/**
 * A file that does not follow the MAS schema is refused, and the dialog says in words which part of
 * the design, which field and which value is wrong, and what to do: never the validator's JSON
 * pointers and parameters ("/magnetic/core/functionalDescription/gapping/0/length must be > 0
 * {"comparison":">","limit":0}"), which reached users until 2026-10-28.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

const fixture = () => JSON.parse(fs.readFileSync(new URL('./fixtures/04_forward_xfmr_e3216_n87.json', import.meta.url).pathname, 'utf8'));

test('LOADMAS-SCHEMA-1: a schema-invalid file is refused naming the part, the field, the value and what to do', async ({ page }) => {
  test.setTimeout(120000);
  const mas = fixture();
  // A gap of zero length: the schema wants every gap longer than 0.
  mas.magnetic.core.functionalDescription.gapping[0].length = 0;

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
  const dialog = page.waitForEvent('dialog', { timeout: 60000 });
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles({
    name: 'zero_gap.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(mas)),
  });
  const shown = await dialog;
  const message = shown.message();
  await shown.dismiss();

  expect(message).toContain('Could not load this file: it does not follow the MAS format:');
  expect(message).toContain('Core > gap 1: the length is 0, but must be greater than 0.');
  expect(message).toContain('Correct these values in the file and load it again.');
  expect(message, 'no JSON pointer').not.toContain('/magnetic/');
  expect(message, 'no validator parameters').not.toContain('"comparison"');
  expect(new URL(page.url()).pathname, 'nothing is opened').not.toContain('magnetic_tool');
});
