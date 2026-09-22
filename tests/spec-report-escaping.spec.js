/**
 * Specifications report — names from an imported MAS render as text.
 *
 * MagneticSpecificationsSummary builds its sentences as HTML strings and
 * renders them with v-html. Winding and operating-point names are free text
 * in MAS, so a file whose names contain markup must show that markup
 * literally: no element is created and no handler runs.
 *
 * Reach path is the one pdf-export.spec.js uses: load a MAS through the
 * header, then jump to the magneticSpecificationsSummary subsection through
 * the state store.
 */

import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL, pause } from './utils.js';

const BASE_FIXTURE = new URL('./fixtures/04_forward_xfmr_e3216_n87.json', import.meta.url).pathname;
const PDF_BTN = '[data-cy$="-download-PDF-File-button"]';

const PRIMARY_NAME = '<img src=x onerror="window.__specReportInjected=1">Primary';
const SECONDARY_NAME = '<b>Secondary</b> 12V';
const OPERATING_POINT_NAME = '<img src=x onerror="window.__specReportInjected=2">OP';

function writeMaliciousFixture(testInfo) {
  const mas = JSON.parse(fs.readFileSync(BASE_FIXTURE, 'utf8'));
  mas.magnetic.coil.functionalDescription[0].name = PRIMARY_NAME;
  mas.magnetic.coil.functionalDescription[1].name = SECONDARY_NAME;
  mas.inputs.operatingPoints[0].name = OPERATING_POINT_NAME;
  const out = testInfo.outputPath('markup_in_names.json');
  fs.writeFileSync(out, JSON.stringify(mas));
  return out;
}

test.describe('Specifications report — escaping', () => {
  test.describe.configure({ timeout: 120000 });

  test('SR1: markup in winding and operating-point names is shown as text', async ({ page }, testInfo) => {
    const fixture = writeMaliciousFixture(testInfo);

    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 45000 });
    await pause(page, 800, 'mechanical: settle');
    await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(fixture);
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });
    await pause(page, 3500, 'mechanical: settle');

    await page.evaluate(() => {
      document.querySelector('#app').__vue_app__
        .config.globalProperties.$stateStore
        .setCurrentToolSubsection('magneticSpecificationsSummary');
    });
    await expect(page.locator(PDF_BTN)).toBeVisible({ timeout: 10000 });

    const turnsRatios = page.locator('h3', { hasText: 'Turns ratios' });
    await expect(turnsRatios).toHaveCount(1);
    await expect(turnsRatios).toContainText(`between ${PRIMARY_NAME} and ${SECONDARY_NAME} winding`);

    const operatingPoint = page.locator('h3', { hasText: 'Overview of operating point' });
    await expect(operatingPoint).toHaveCount(1);
    await expect(operatingPoint).toContainText(OPERATING_POINT_NAME);
    await expect(operatingPoint).toContainText(`Winding ${PRIMARY_NAME} has a`);

    // The report's own markup (<b>, <font>) is still there; nothing from the names is.
    await expect(turnsRatios.locator('b font')).toHaveCount(1);
    for (const h3 of [turnsRatios, operatingPoint]) {
      await expect(h3.locator('img')).toHaveCount(0);
    }
    await expect(turnsRatios.locator('b', { hasText: /^Secondary$/ })).toHaveCount(0);

    await pause(page, 500, 'mechanical: let any image error handler fire');
    expect(await page.evaluate(() => window.__specReportInjected ?? null)).toBeNull();
  });
});
