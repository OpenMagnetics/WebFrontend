/**
 * A stored design carries its own copy of its core material. When MKF refuses that copy as data no
 * material can have (MATERIAL_INVALID_PROPERTY: Fair-Rite 95's old record held a remanence of
 * 0.8 T at 100 C, above its 0.39 T saturation; MAS efa957f corrected it to 0.08 T), the design
 * cannot be computed. Alf, 2026-10-26: on load, the stale-material notice quotes MKF's message and
 * offers the library's copy; the file's copy is never replaced silently. The verdict is MKF's
 * check_core_material on the copy alone (since 2026-10-28).
 *
 * The fixture is tests/fixtures/pq2715_95_1mhz_outside_steinmetz_span.json as it was before its
 * material was refreshed to MAS efa957f: the same design with the old material-95 record.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';
import { engineLogRecords } from './utils/index.js';

const fixture = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url).pathname, 'utf8'));
const NOTICE = '[data-cy$="-OutdatedCoreMaterial"]';
const INVALID = '[data-cy$="-OutdatedCoreMaterial-invalid"]';

async function load(page, document, name) {
  const alerts = [];
  page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(document)),
  });
  await page.waitForURL('**/magnetic_tool**', { timeout: 120000 });
  expect(alerts, 'the load is not refused').toEqual([]);
}

const storedMas = (page) => page.evaluate(() => {
  const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
  return JSON.parse(JSON.stringify(pinia._s.get('mas').mas));
});

const remanenceAt = (material, temperature) => material.remanence.find((point) => point.temperature == temperature).magneticFluxDensity;

test.describe('Load MAS: a stored core material MKF refuses', () => {
  test('LOADMAS-INVALID-MATERIAL-1: MKF\'s reason is quoted, the copy kept, and the library\'s offered', async ({ page }) => {
    test.setTimeout(300000);
    const mas = fixture('pq2715_95_old_material_remanence_above_saturation.json');
    const material = mas.magnetic.core.functionalDescription.material;
    expect(material.name).toBe('95');
    expect(remanenceAt(material, 100), 'the fixture carries the old record').toBe(0.8);

    await load(page, mas, 'old_material_95.json');
    const notice = page.locator(NOTICE);
    await expect(notice).toBeVisible({ timeout: 120000 });
    const invalid = page.locator(INVALID);
    await expect(invalid).toBeVisible();
    // MKF's error code is not part of the text the user reads; it stays on the reason (its tooltip).
    await expect(invalid).not.toContainText('[MATERIAL_INVALID_PROPERTY]');
    await expect(invalid.locator('[data-cy$="-OutdatedCoreMaterial-reason"]')).toHaveAttribute('data-code', 'MATERIAL_INVALID_PROPERTY');
    await expect(invalid).toContainText('remanence');
    await expect(invalid).toContainText('is not below its saturation flux density');
    // MKF judges the material on its own (check_core_material): a refusal, not an error about
    // whether it could be judged.
    expect(await engineLogRecords(page, { source: 'Load', level: 'ERROR' })).toEqual([]);

    // Kept until the user decides.
    let loaded = await storedMas(page);
    expect(remanenceAt(loaded.magnetic.core.functionalDescription.material, 100)).toBe(0.8);

    await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      window.__builderCoreLosses = [];
      pinia._s.get('magneticBuilderTaskQueue').$onAction(({ name, args }) => {
        if (name == 'coreLossesCalculated' && args[0]) window.__builderCoreLosses.push(args[1].coreLossesData.coreLosses);
      });
    });
    await expect(page.locator('[data-cy$="-OutdatedCoreMaterial-useLibrary"]')).toHaveText('Update 95 to the latest library data');
    await page.locator('[data-cy$="-OutdatedCoreMaterial-useLibrary"]').click();
    await expect(notice).toHaveCount(0);
    // With the library's copy the builder computes the core losses MKF refused before.
    await page.waitForFunction(() => (window.__builderCoreLosses ?? []).some((value) => value > 0), null, { timeout: 60000 });
    loaded = await storedMas(page);
    const library = await page.evaluate(async (name) => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      return pinia._s.get('taskQueue').getMaterialData(name);
    }, material.name);
    expect(loaded.magnetic.core.functionalDescription.material).toEqual(library);
    expect(remanenceAt(library, 100)).toBeLessThan(0.39);
  });

  test('LOADMAS-INVALID-MATERIAL-2: keeping the file\'s copy closes the notice and changes nothing', async ({ page }) => {
    test.setTimeout(300000);
    const mas = fixture('pq2715_95_old_material_remanence_above_saturation.json');
    await load(page, mas, 'old_material_95.json');
    await expect(page.locator(INVALID)).toBeVisible({ timeout: 120000 });
    await page.locator('[data-cy$="-OutdatedCoreMaterial-keepFile"]').click();
    await expect(page.locator(NOTICE)).toHaveCount(0);
    const loaded = await storedMas(page);
    expect(remanenceAt(loaded.magnetic.core.functionalDescription.material, 100)).toBe(0.8);
  });

  // Alf, 2026-10-27: the builder's info panels do not compute with a copy MKF refuses (each attempt
  // only logged MKF's refusal again); they say the material must be updated, and compute once it is.
  test('LOADMAS-INVALID-MATERIAL-3: no calculation errors while the material is refused', async ({ page }) => {
    test.setTimeout(300000);
    const errors = [];
    page.on('console', (message) => { if (message.type() == 'error') errors.push(message.text()); });
    const mas = fixture('pq2715_95_old_material_remanence_above_saturation.json');
    await load(page, mas, 'old_material_95.json');
    await expect(page.locator(INVALID)).toBeVisible({ timeout: 120000 });
    const coilInfoRefused = page.locator('[data-cy$="-CoilInfo-RefusedCoreMaterial"]');
    await expect(coilInfoRefused).toBeVisible({ timeout: 60000 });
    await expect(coilInfoRefused).toContainText('The core material 95 must be updated');

    await page.locator('[data-cy$="-OutdatedCoreMaterial-useLibrary"]').click();
    await expect(coilInfoRefused).toHaveCount(0);
    // With the library's copy Coil info simulates the design.
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const output = pinia._s.get('mas').mas.outputs?.[0];
      return output?.windingLosses?.windingLosses > 0 && output?.coreLosses?.coreLosses > 0;
    }, null, { timeout: 60000 });
    expect(errors.filter((text) => text.includes('[MATERIAL_INVALID_PROPERTY]')), 'nothing is computed with the refused copy').toEqual([]);
  });
});
