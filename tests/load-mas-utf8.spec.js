/**
 * ABT #2544 (2026-11-24): "Load MAS" read the file as ISO-8859-1. A MAS file is JSON, which is UTF-8, so every
 * non-ASCII character came out as two (µ as "Âµ", ö as "Ã¶"). A material named by its library name, e.g.
 * "Kool Mµ 26", was then refused ("Core material 'Kool MÂµ 26' is not in the library"), and inline names such
 * as the manufacturer "Höganäs" loaded garbled and were saved back garbled. Alvier's delivery of about 171 MAS
 * files carries such names.
 *
 * Design: e3216_kool_mu_26.json (GRAPH-POWDER-1's) written with a raw UTF-8 µ instead of the µ escape.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

const FIXTURE = new URL('./fixtures/e3216_kool_mu_26_raw_utf8.json', import.meta.url).pathname;

test('LOADMAS-UTF8-1: a MAS file with raw UTF-8 names loads with its names intact', async ({ page }) => {
  test.setTimeout(180000);
  const raw = fs.readFileSync(FIXTURE);
  expect(raw.includes(Buffer.from('Kool Mµ 26', 'utf8')), 'the fixture holds a raw UTF-8 µ').toBe(true);
  const alerts = [];
  page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
  await Promise.race([
    page.waitForURL('**/magnetic_tool**', { timeout: 90000 }),
    page.waitForEvent('dialog', { timeout: 90000 }),
  ]);
  expect(alerts, 'the load is not refused').toEqual([]);
  const material = await page.evaluate(() => {
    const material = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas')
      .mas.magnetic.core.functionalDescription.material;
    return typeof material === 'string' ? material : material.name;
  });
  expect(material).toBe('Kool Mµ 26');
});
