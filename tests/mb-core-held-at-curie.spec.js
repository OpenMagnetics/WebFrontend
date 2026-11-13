/**
 * ABT #2370 (user reports of 2026-10-22): a PQ 20/16 N49 inductor at ~308 kHz read 33 uW of core
 * loss at 95 mT with 8 turns, and 0.29 W at 48 mT with 4.
 *
 * With 8 turns the core's own iGSE losses heat it with no steady temperature below N49's 240 C
 * Curie point. MKF holds the core there, paramagnetic, and the losses it computes in that state are
 * tiny: the 33 uW. The engine says so (coreHeldAtDataLimit, coreHeldAt, coreLossesBeforeHold) and
 * MagneticBuilder's Core Info showed the held losses as the result anyway.
 *
 * Decision (Alf, 2026-11-13): the web never shows the held losses; Core Info shows an error with the
 * limit and the losses just before the hold, and Coil Info shows no total that adds them. MKF's hold
 * is unchanged.
 *
 * The fixture is the user's saved design (the 4-turn state); the test sets 8 turns in memory, the
 * state the user reported first. It drives the real engine committed with the web.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/index.js';

const FIXTURE = new URL('./fixtures/pq2016_n49_308khz_4_turns.json', import.meta.url).pathname;

async function loadDesignWithTurns(page, testInfo, numberTurns) {
  const mas = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const coil = mas.magnetic.coil;
  coil.functionalDescription[0].numberTurns = numberTurns;
  // The stored winding is the 4-turn one: the builder winds the new turn count itself.
  delete coil.sectionsDescription;
  delete coil.layersDescription;
  delete coil.turnsDescription;
  delete mas.outputs;
  const file = testInfo.outputPath('design.json');
  fs.writeFileSync(file, JSON.stringify(mas));
  const alerts = [];
  page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__ != null);
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(file);
  await Promise.race([
    page.waitForURL('**/magnetic_tool**', { timeout: 120000 }),
    page.waitForEvent('dialog', { timeout: 120000 }),
  ]);
  expect(alerts, 'the load is not refused').toEqual([]);
}

const heldError = (page) => page.locator('.coreinfo-panel [data-cy$="-CoreLosses-HeldAtDataLimit"]');
const coreLosses = (page) => page.locator('.coreinfo-panel [data-cy$="-CoreLosses-container"]');
// Rows MKF computes on the held core (paramagnetic, B ~100x below the design's): hidden on a hold.
// The advanced view shows the two flux-density peaks, the simple view the saturation proportion.
const heldCoreRows = (page) => ({
  advanced: page.locator('.coreinfo-panel [data-cy$="-MagneticFluxDensityPeak-container"], .coreinfo-panel [data-cy$="-MagneticFluxDensityAcPeak-container"]'),
  simple: page.locator('.coreinfo-panel [data-cy$="-SaturationProportion-container"]'),
});
const isSimpleView = async (page) => (await page.locator('.coreinfo-panel .coreinfo-simple').count()) > 0;

test('CORE-HOLD-2370: a core held at its Curie point shows an error with the losses before the hold, never the held losses', async ({ page }, testInfo) => {
  test.setTimeout(240000);
  await loadDesignWithTurns(page, testInfo, 8);
  await expect(heldError(page).first(), 'Core Info states the hold as an error').toBeVisible({ timeout: 120000 });
  await expect(heldError(page).first()).toHaveText(
    /^No steady temperature: the core reaches its Curie temperature \(240\s*°C\)\. Losses before the hold: 11(\.\d+)?\s*W at 23[89](\.\d+)?\s*°C\.$/);
  await expect(coreLosses(page), 'the held losses are not shown as the core losses').toHaveCount(0);
  await expect(page.locator('.coreinfo-panel'), 'no microwatt reading anywhere in Core Info').not.toContainText(/µW|μW|uW/);
  const rows = heldCoreRows(page);
  await expect(rows.advanced, 'no flux-density peaks of the held core').toHaveCount(0);
  await expect(rows.simple, 'no saturation proportion of the held core').toHaveCount(0);
  // (The engine computed 11.04 W at 238.8 C before the hold for this design.)
  // The title-bar hint carries the same statement on hover.
  const hint = page.locator('.coreinfo-header [data-cy$="-CoreInfo-HeldAtDataLimit"]');
  await expect(hint).toHaveText(/Held at 240\s*°C/);
  await expect(hint).toHaveAttribute('aria-label', /Losses before the hold: 11(\.\d+)?\s*W at 23[89](\.\d+)?\s*°C/);
  // Coil Info's total adds the core losses: once MKF's findings name the hold, it is not shown either.
  const heldTotal = page.locator('[data-cy$="-TotalLosses-HeldAtDataLimit"]');
  await expect(heldTotal.first(), 'Coil Info states that there is no total').toBeVisible({ timeout: 120000 });
  await expect(heldTotal.first()).toHaveText(/^No total losses: the core has no steady temperature within its material's data/);
  await expect(page.locator('[data-cy$="-TotalLosses-container"]'), 'no total with the held core losses').toHaveCount(0);
});

test('CORE-HOLD-2370-4T: with 4 turns the core settles and Core Info shows its losses', async ({ page }, testInfo) => {
  test.setTimeout(240000);
  await loadDesignWithTurns(page, testInfo, 4);
  await expect(coreLosses(page).first(), 'Core Info shows the losses').toBeVisible({ timeout: 120000 });
  await expect(heldError(page)).toHaveCount(0);
  const rows = heldCoreRows(page);
  if (await isSimpleView(page)) {
    await expect(rows.simple, 'the saturation proportion is shown').toHaveCount(1);
  } else {
    await expect(rows.advanced, 'both flux-density peaks are shown').toHaveCount(2);
  }
  await expect(page.locator('[data-cy$="-TotalLosses-container"]').first(), 'Coil Info shows the total').toBeVisible({ timeout: 120000 });
  await expect(page.locator('[data-cy$="-TotalLosses-HeldAtDataLimit"]')).toHaveCount(0);
});

// The summary (and the datasheet printed from it) asks MKF's analyze_results about the outputs it
// shows; a CORE_ABOVE_MATERIAL_DATA_LIMIT finding replaces the core losses and the total with the
// same error Core Info shows.
async function openSummary(page) {
  await page.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    pinia._s.get('state').getCurrentToolState().subsection = 'magneticSummary';
  });
  await expect(page.locator('[data-cy$="-MagneticSummary-incomplete"]'), 'the summary has a complete design').toHaveCount(0);
  await expect(page.locator('.datasheet-container'), 'the summary renders').toBeVisible({ timeout: 30000 });
}
const HELD_TEXT = /^No steady temperature: the core reaches its Curie temperature \(240\s*°C\)\. Losses before the hold: 11(\.\d+)?\s*W at 23[89](\.\d+)?\s*°C\.$/;

test('CORE-HOLD-2370-SUMMARY: the summary and its printed datasheet show the hold error, never the held core or total losses', async ({ page }, testInfo) => {
  test.setTimeout(240000);
  await loadDesignWithTurns(page, testInfo, 8);
  await expect(heldError(page).first()).toBeVisible({ timeout: 120000 });
  await openSummary(page);
  const coreCell = page.locator('[data-cy$="-Performance-CoreLosses-held"]');
  await expect(coreCell, 'the core losses row states the hold').toHaveText(HELD_TEXT, { timeout: 60000 });
  await expect(page.locator('[data-cy$="-Performance-TotalLosses-held"]')).toHaveText(/^No total losses: the core has no steady temperature within its material's data/);
  await expect(page.locator('[data-cy$="-KeyParameter-CoreLoss-held"]')).toHaveText('No steady temperature');
  await expect(page.locator('[data-cy$="-KeyParameter-CoreLoss-held"]')).toHaveAttribute('title', HELD_TEXT);
  await expect(page.locator('.datasheet-container'), 'no microwatt reading anywhere in the datasheet').not.toContainText(/µW|μW|uW/);
  // The PDF is the browser's print of this page (Print / Save PDF): render it and read its text.
  await page.emulateMedia({ media: 'print' });
  await expect(coreCell).toBeVisible();
  const pdfPath = testInfo.outputPath('datasheet.pdf');
  await page.pdf({ path: pdfPath, format: 'A4' });
  const { execFileSync } = await import('node:child_process');
  const pdfText = execFileSync('pdftotext', [pdfPath, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  // The table cell wraps over several lines, interleaved with the next column: check its parts.
  expect(pdfText, 'the printed datasheet states the hold').toContain('No steady temperature: the core reaches its');
  expect(pdfText, 'the printed datasheet gives the losses before the hold').toMatch(/the hold: 11(\.\d+)? W at 23[89](\.\d+)? °C\./);
  expect(pdfText, 'the printed datasheet states there is no total').toContain('No total losses');
  expect(pdfText, 'no microwatt reading in the printed datasheet').not.toMatch(/µW|μW|uW/);
});

test('CORE-HOLD-2370-SUMMARY-4T: with 4 turns the summary shows the core and total losses', async ({ page }, testInfo) => {
  test.setTimeout(240000);
  await loadDesignWithTurns(page, testInfo, 4);
  await expect(coreLosses(page).first()).toBeVisible({ timeout: 120000 });
  await openSummary(page);
  const table = page.locator('.datasheet-container .data-table');
  await expect(table.locator('tr', { hasText: 'Core Losses (Pcore)' }).locator('td.param-val')).toHaveText(/^\d+(\.\d+)?\s*m?W$/, { timeout: 60000 });
  await expect(table.locator('tr', { hasText: 'Total Losses' }).locator('td.param-val')).toHaveText(/^\d+(\.\d+)?\s*m?W$/);
  await expect(page.locator('[data-cy*="-Performance-"][data-cy$="-held"], [data-cy*="-Performance-"][data-cy$="-failed"]')).toHaveCount(0);
});
