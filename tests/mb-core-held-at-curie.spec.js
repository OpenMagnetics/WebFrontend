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
 * limit and the losses just before the hold. MKF's hold is unchanged.
 * Decision (Alf, 2026-11-20, "show the losses before the hold in red"): the core losses shown are the
 * losses just before the hold, in the danger colour with the hold on hover, here, in Coil Info's total
 * and in the summary. The held core's flux density stays hidden.
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
const heldHint = (page) => page.locator('.coreinfo-header [data-cy$="-CoreInfo-HeldAtDataLimit"]');
const coreLosses = (page) => page.locator('.coreinfo-panel [data-cy$="-CoreLosses-container"]');
// Rows MKF computes on the held core (paramagnetic, B ~100x below the design's): hidden on a hold.
// The advanced view shows the two flux-density peaks, the simple view the saturation proportion.
const heldCoreRows = (page) => ({
  advanced: page.locator('.coreinfo-panel [data-cy$="-MagneticFluxDensityPeak-container"], .coreinfo-panel [data-cy$="-MagneticFluxDensityAcPeak-container"]'),
  simple: page.locator('.coreinfo-panel [data-cy$="-SaturationProportion-container"]'),
});
const isSimpleView = async (page) => (await page.locator('.coreinfo-panel .coreinfo-simple').count()) > 0;
// The theme's danger colour as the browser computes it.
const dangerColor = (page) => page.evaluate(() => {
  const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
  const probe = document.createElement('span');
  probe.style.color = pinia._s.get('style').magneticBuilder.inputLabelDangerBgColor.color;
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
});
const colorOf = (locator) => locator.evaluate((element) => getComputedStyle(element).color);

test('CORE-HOLD-2370: a core held at its Curie point shows the losses before the hold in the danger colour, never the held losses', async ({ page }, testInfo) => {
  test.setTimeout(240000);
  await loadDesignWithTurns(page, testInfo, 8);
  await expect(heldHint(page), 'Core Info\'s title bar states the hold').toBeVisible({ timeout: 120000 });
  // Alf, 2026-11-15: the hold is stated once, by the title-bar hint's tooltip and the Engine log; no inline copy.
  await expect(heldError(page), 'no inline copy of the hold message').toHaveCount(0);
  // The core losses are the losses before the hold (11.04 W), in the danger colour.
  const lossesValue = page.locator('.coreinfo-panel [data-cy$="-CoreLosses-number-label"]').first();
  await expect(lossesValue, 'the losses before the hold are shown').toHaveText(/^\s*11(\.\d+)?\s*$/);
  expect(await colorOf(lossesValue), 'in the danger colour').toBe(await dangerColor(page));
  await expect(page.locator('.coreinfo-panel'), 'no microwatt reading anywhere in Core Info').not.toContainText(/µW|μW|uW/);
  const rows = heldCoreRows(page);
  await expect(rows.advanced, 'no flux-density peaks of the held core').toHaveCount(0);
  await expect(rows.simple, 'no saturation proportion of the held core').toHaveCount(0);
  // (The engine computed 11.04 W at 238.8 C before the hold for this design.)
  // The title-bar hint carries the same statement on hover.
  const hint = page.locator('.coreinfo-header [data-cy$="-CoreInfo-HeldAtDataLimit"]');
  await expect(hint).toHaveText(/Held at 240\s*°C/);
  await expect(hint).toHaveAttribute('aria-label', /Losses before the hold: 11(\.\d+)?\s*W at 23[89](\.\d+)?\s*°C/);
  // Coil Info's total adds the losses before the hold, in the danger colour; there is no inline copy of the
  // hold message (Alf, 2026-11-15: Core Info's hint and the Engine log say it).
  await expect(page.locator('[data-cy$="-TotalLosses-HeldAtDataLimit"]'), 'no inline hold message in Coil Info').toHaveCount(0);
  const totalValue = page.locator('[data-cy$="-TotalLosses-number-label"]').first();
  await expect(totalValue, 'the total adds the losses before the hold').toHaveText(/^\s*1[1-9](\.\d+)?\s*$/, { timeout: 60000 });
  expect(await colorOf(totalValue), 'in the danger colour').toBe(await dangerColor(page));
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
// A flux-density reading: a number with T, mT or µT (the datasheet has no other tesla values).
const FLUX_VALUE = /\d\s*[mµμ]?T(?![A-Za-z])/;
const HELD_TEXT = /^No steady temperature: the core reaches its Curie temperature \(240\s*°C\)\. Losses before the hold: 11(\.\d+)?\s*W at 23[89](\.\d+)?\s*°C\.$/;

test('CORE-HOLD-2370-SUMMARY: the summary and its printed datasheet show the losses before the hold in the danger colour, never the held ones', async ({ page }, testInfo) => {
  test.setTimeout(240000);
  await loadDesignWithTurns(page, testInfo, 8);
  await expect(heldHint(page)).toBeVisible({ timeout: 120000 });
  await openSummary(page);
  const coreCell = page.locator('[data-cy$="-Performance-CoreLosses-held"]');
  await expect(coreCell, 'the core losses row shows the losses before the hold').toHaveText(/^11(\.\d+)? W$/, { timeout: 60000 });
  await expect(coreCell, 'with the hold on hover').toHaveAttribute('title', HELD_TEXT);
  await expect(coreCell).toHaveClass(/text-danger/);
  const totalCell = page.locator('[data-cy$="-Performance-TotalLosses-held"]');
  await expect(totalCell, 'the total adds them').toHaveText(/^1[1-9](\.\d+)? W$/);
  await expect(totalCell).toHaveClass(/text-danger/);
  await expect(page.locator('[data-cy$="-KeyParameter-CoreLoss-held"]')).toHaveText(/^11(\.\d+)?$/);
  await expect(page.locator('[data-cy$="-KeyParameter-CoreLoss-held"]')).toHaveClass(/text-danger/);
  await expect(page.locator('[data-cy$="-KeyParameter-CoreLoss-held"]')).toHaveAttribute('title', HELD_TEXT);
  // Rendered text only (innerText skips <style>, whose generated class names can contain 'uW'), and a number before the unit.
  const datasheetText = await page.locator('.datasheet-container').evaluate((element) => element.innerText);
  expect(datasheetText, 'no microwatt reading anywhere in the datasheet').not.toMatch(/\d\s*[µμu]W\b/);
  // The flux density of the held core (paramagnetic, ~100x low) is not shown either.
  await expect(page.locator('[data-cy$="-KeyParameter-PeakB-held"]')).toHaveText('No steady temperature');
  await expect(page.locator('[data-cy$="-ElectricalSpecs-PeakB-held"]')).toHaveText(HELD_TEXT);
  await expect(page.locator('.datasheet-container'), 'no flux-density value anywhere in the datasheet').not.toContainText(FLUX_VALUE);
  // The PDF is the browser's print of this page (Print / Save PDF): render it and read its text.
  await page.emulateMedia({ media: 'print' });
  await expect(coreCell).toBeVisible();
  const pdfPath = testInfo.outputPath('datasheet.pdf');
  await page.pdf({ path: pdfPath, format: 'A4' });
  const { execFileSync } = await import('node:child_process');
  const pdfText = execFileSync('pdftotext', [pdfPath, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  // The table cell wraps over several lines, interleaved with the next column: check its parts.
  // The flux-density row states the hold; the losses rows give the losses before it.
  expect(pdfText, 'the printed datasheet states the hold').toContain('No steady temperature: the core reaches its');
  expect(pdfText, 'the printed datasheet gives the losses before the hold').toMatch(/the hold: 11(\.\d+)? W at 23[89](\.\d+)? °C\./);
  expect(pdfText, 'no microwatt reading in the printed datasheet').not.toMatch(/µW|μW|uW/);
  expect(pdfText, 'no flux-density value in the printed datasheet').not.toMatch(FLUX_VALUE);
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
  // The flux density is shown when the core settles.
  await expect(page.locator('.key-param', { hasText: 'Peak B' }).locator('.param-value-row')).toHaveText(/^\s*\d+(\.\d+)?\s*[mµμ]?T\s*$/);
  await expect(page.locator('tr', { hasText: 'Peak Flux Density' }).locator('td.typ-value')).toHaveText(/^\d+(\.\d+)?$/);
});

test('CORE-HOLD-2370-SUMMARY-CHECK-FAILS: when analyze_results fails the summary shows its error instead of the losses and flux density', async ({ page }, testInfo) => {
  test.setTimeout(240000);
  await loadDesignWithTurns(page, testInfo, 4);
  await expect(coreLosses(page).first()).toBeVisible({ timeout: 120000 });
  await expect(page.locator('[data-cy$="-TotalLosses-container"]').first()).toBeVisible({ timeout: 120000 });
  // The builder's checks are done; from here MagneticBuilder's analyze_results fails.
  await page.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    pinia._s.get('magneticBuilderTaskQueue').analyzeResults = async () => { throw new Error('Exception: stubbed analyze_results failure'); };
  });
  await openSummary(page);
  const failedText = /^The engine could not check the simulated results for problems, so the losses and flux density are not shown: Exception: stubbed analyze_results failure$/;
  await expect(page.locator('[data-cy$="-Performance-CoreLosses-failed"]')).toHaveText(failedText, { timeout: 60000 });
  await expect(page.locator('[data-cy$="-Performance-TotalLosses-failed"]')).toHaveText(failedText);
  await expect(page.locator('[data-cy$="-ElectricalSpecs-PeakB-failed"]')).toHaveText(failedText);
  await expect(page.locator('[data-cy$="-KeyParameter-CoreLoss-failed"]')).toHaveText('Not checked');
  await expect(page.locator('[data-cy$="-KeyParameter-PeakB-failed"]')).toHaveText('Not checked');
  const table = page.locator('.datasheet-container .data-table');
  await expect(table.locator('tr', { hasText: 'Core Losses (Pcore)' }).locator('td.param-val')).not.toHaveText(/\d\s*m?W/);
  await expect(table.locator('tr', { hasText: 'Total Losses' }).locator('td.param-val')).not.toHaveText(/\d\s*m?W/);
  await expect(page.locator('.datasheet-container')).not.toContainText(FLUX_VALUE);
});
