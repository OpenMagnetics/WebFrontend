/**
 * A stored design carries its own copy of its core material, taken from the library when it was
 * designed; the library is refitted since (a stored TP4A copy's Steinmetz ct(T) turns negative
 * above 149 C). Alf, 2026-10-14: warn, keep the file's copy, offer the library's, and only where
 * the results would change: MKF's volumetric core losses with the two copies differ by more than
 * 10 % (MKF's compare_core_material_volumetric_losses, at points of the library copy's own data;
 * until 2026-10-28 the web compared the whole design's core losses per operating point).
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';
import { engineLogRecords } from './utils/index.js';

const fixture = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url).pathname, 'utf8'));
const NOTICE = '[data-cy$="-OutdatedCoreMaterial"]';

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

// A null key and an absent one are the same unset field: MKF writes a core without its unset keys
// (MKF 7695c88a), while the fixture's copy still carries them as null.
const withoutNulls = (value) => JSON.parse(JSON.stringify(value, (key, each) => (each === null ? undefined : each)));

const storedMas = (page) => page.evaluate(() => {
  const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
  return JSON.parse(JSON.stringify(pinia._s.get('mas').mas));
});

test.describe('Load MAS: a stored core material older than the library', () => {
  test('LOADMAS-MATERIAL-1: a copy whose core losses differ is named, kept, and replaced only on request', async ({ page }) => {
    test.setTimeout(300000);
    const mas = fixture('default_two_winding_pq2715.json');
    const material = mas.magnetic.core.functionalDescription.material;
    expect(typeof material, 'the fixture carries its own copy of the material').toBe('object');
    // The stored copy's Steinmetz fit gives twice the library's losses.
    let ranges = 0;
    for (const method of material.volumetricLosses.default) {
      if (method?.method != 'steinmetz') continue;
      for (const range of method.ranges) { range.k *= 2; ranges++; }
    }
    expect(ranges).toBeGreaterThan(0);

    await load(page, mas, 'stale_material_copy.json');
    const notice = page.locator(NOTICE);
    await expect(notice).toBeVisible({ timeout: 120000 });
    await expect(notice).toContainText(material.name);
    await expect(page.locator('[data-cy$="-OutdatedCoreMaterial-invalid"]')).toHaveCount(0);
    const text = await page.locator('[data-cy$="-OutdatedCoreMaterial-largestDifference"]').innerText();
    const [, fromFile, fromLibrary] = text.match(/([0-9.e+-]+) W\/m³ with the file's copy, ([0-9.e+-]+) W\/m³ with the library's/);
    expect(Number(fromFile) / Number(fromLibrary), 'twice the Steinmetz k, twice the losses').toBeCloseTo(2, 1);
    // The material is judged on its own: nothing about it is an error or a warning in the log.
    expect((await engineLogRecords(page, { source: 'Load' })).filter((r) => r.message.includes('core material'))).toEqual([]);

    // Kept until the user decides.
    let loaded = await storedMas(page);
    expect(withoutNulls(loaded.magnetic.core.functionalDescription.material.volumetricLosses)).toEqual(withoutNulls(material.volumetricLosses));

    // The builder recomputes with the library's copy: its core losses become the library's.
    await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      window.__builderCoreLosses = [];
      pinia._s.get('magneticBuilderTaskQueue').$onAction(({ name, args }) => {
        if (name == 'coreLossesCalculated' && args[0]) window.__builderCoreLosses.push(args[1].coreLossesData.coreLosses);
      });
    });
    // Alf, 2026-10-16: one option that updates the material to the latest library data.
    await expect(page.locator('[data-cy$="-OutdatedCoreMaterial-useLibrary"]')).toHaveText(`Update ${material.name} to the latest library data`);
    await page.locator('[data-cy$="-OutdatedCoreMaterial-useLibrary"]').click();
    await expect(notice).toHaveCount(0);
    await page.waitForFunction(() => (window.__builderCoreLosses ?? []).some((value) => value > 0), null, { timeout: 60000 });
    loaded = await storedMas(page);
    const library = await page.evaluate(async (name) => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      return pinia._s.get('taskQueue').getMaterialData(name);
    }, material.name);
    expect(loaded.magnetic.core.functionalDescription.material).toEqual(library);

    // The same design saved with the library's copy loads without the notice.
    // The loader's check runs before the design reaches the store: once the store holds it, a
    // notice would already be there.
    const warnings = [];
    page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()); });
    await load(page, loaded, 'library_material_copy.json');
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      return pinia._s.get('mas').mas.magnetic.core.processedDescription != null;
    });
    await expect(page.locator(NOTICE)).toHaveCount(0);
    expect(warnings.filter((text) => text.includes('differs from the library'))).toEqual([]);
  });

  test('LOADMAS-MATERIAL-3: a copy whose core losses stay within 10 % of the library\'s is not reported', async ({ page }) => {
    test.setTimeout(300000);
    const mas = fixture('default_two_winding_pq2715.json');
    const material = mas.magnetic.core.functionalDescription.material;
    // The stored copy's Steinmetz fit gives 5 % more than the library's: a copy that differs, but not
    // in its results.
    let ranges = 0;
    for (const method of material.volumetricLosses.default) {
      if (method?.method != 'steinmetz') continue;
      for (const range of method.ranges) { range.k *= 1.05; ranges++; }
    }
    expect(ranges).toBeGreaterThan(0);
    const warnings = [];
    page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()); });
    await load(page, mas, 'close_material_copy.json');
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      return pinia._s.get('mas').mas.magnetic.core.processedDescription != null;
    });
    await expect(page.locator(NOTICE)).toHaveCount(0);
    expect(warnings.filter((text) => text.includes('differs from the library'))).toEqual([]);
    expect((await engineLogRecords(page, { source: 'Load' })).filter((r) => r.message.includes('core material'))).toEqual([]);
  });

  test('LOADMAS-MATERIAL-2: keeping the file\'s copy closes the notice and changes nothing', async ({ page }) => {
    test.setTimeout(300000);
    const mas = fixture('default_two_winding_pq2715.json');
    const material = mas.magnetic.core.functionalDescription.material;
    for (const method of material.volumetricLosses.default) {
      if (method?.method != 'steinmetz') continue;
      for (const range of method.ranges) range.k *= 2;
    }
    await load(page, mas, 'stale_material_copy.json');
    await expect(page.locator(NOTICE)).toBeVisible({ timeout: 120000 });
    await page.locator('[data-cy$="-OutdatedCoreMaterial-keepFile"]').click();
    await expect(page.locator(NOTICE)).toHaveCount(0);
    const loaded = await storedMas(page);
    expect(withoutNulls(loaded.magnetic.core.functionalDescription.material.volumetricLosses)).toEqual(withoutNulls(material.volumetricLosses));
  });
});
