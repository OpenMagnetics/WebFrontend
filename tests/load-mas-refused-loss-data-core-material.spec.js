/**
 * A stored design carries its own copy of its core material. An old DMEGC DMR96 copy (MAS 051605e)
 * has a Steinmetz temperature factor ct(T) that is negative over most of its temperatures, so MKF
 * cannot use its core-loss data there (INVALID_LOSS_DATA). The design itself cannot be computed with
 * the library's copy either, for a reason that has nothing to do with the material (a tertiary turn
 * overlaps its enclosure). The material is judged on its own, by MKF (check_core_material,
 * compare_core_material_volumetric_losses), whatever the rest of the design does.
 *
 * Alf, 2026-10-28 ("option 2 as a warning in log"): loss data MKF cannot use is NOT a refusal. The
 * copy is reported as differing from the library's (the library's copy offered), the temperatures
 * where its loss data is invalid are a WARNING in the Engine log, and the design is computed with
 * the file's copy where MKF can. Until 2026-10-28 this test expected the copy to be refused (the
 * "-invalid" notice and Coil info gated); only that expected outcome changed, not the fixture.
 *
 * The fixture is a stored design from the corpus of saved web designs, copied unchanged.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';
import { engineLogRecords } from './utils/index.js';

const FIXTURE = 'pq3535_dmr96_old_copy_steinmetz_ct_negative.json';
const fixtureText = () => fs.readFileSync(new URL(`./fixtures/${FIXTURE}`, import.meta.url).pathname, 'utf8');
const NOTICE = '[data-cy$="-OutdatedCoreMaterial"]';
const INVALID = '[data-cy$="-OutdatedCoreMaterial-invalid"]';
const DIFFERS = '[data-cy$="-OutdatedCoreMaterial-differs"]';

async function load(page) {
  const alerts = [];
  page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles({
    name: FIXTURE,
    mimeType: 'application/json',
    buffer: Buffer.from(fixtureText()),
  });
  await page.waitForURL('**/magnetic_tool**', { timeout: 120000 });
  expect(alerts, 'the load is not refused').toEqual([]);
}

const storedMaterial = (page) => page.evaluate(() => {
  const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
  return JSON.parse(JSON.stringify(pinia._s.get('mas').mas.magnetic.core.functionalDescription.material));
});

test.describe('Load MAS: a stored core material whose loss data MKF cannot use', () => {
  test('LOADMAS-LOSSDATA-MATERIAL-1: the copy is reported as differing, the invalid temperatures are a warning, the library\'s copy replaces it on request', async ({ page }) => {
    test.setTimeout(300000);
    const material = JSON.parse(fixtureText()).magnetic.core.functionalDescription.material;
    expect(material.name).toBe('DMR96');

    await load(page);
    const notice = page.locator(NOTICE);
    await expect(notice).toBeVisible({ timeout: 120000 });
    // Not refused: the notice says the copy differs from the library's.
    await expect(page.locator(INVALID)).toHaveCount(0);
    await expect(page.locator(DIFFERS)).toContainText('DMR96');
    const invalidLossData = page.locator('[data-cy$="-OutdatedCoreMaterial-invalidLossData"]');
    await expect(invalidLossData).toHaveAttribute('data-code', 'INVALID_LOSS_DATA');
    await expect(invalidLossData).toContainText(/from -?[0-9.]+ °C to -?[0-9.]+ °C/);
    // The library's copy prices points the file's copy cannot.
    await expect(page.locator('[data-cy$="-OutdatedCoreMaterial-refusedByFile"]')).toBeVisible();

    // The temperatures where the copy's loss data is invalid are a warning in the Engine log, and the
    // material is judged on its own: no error says it could not be judged.
    await expect.poll(async () => (await engineLogRecords(page, { source: 'Load', level: 'WARNING' }))
      .filter((r) => r.code === 'INVALID_LOSS_DATA').map((r) => r.message), { timeout: 30000 })
      .toEqual([expect.stringMatching(/^The design's copy of core material DMR96 has core-loss data the engine cannot use from -?[0-9.]+ °C to -?[0-9.]+ °C/)]);
    expect(await engineLogRecords(page, { source: 'Load', level: 'ERROR' })).toEqual([]);

    // Coil info is not gated: the design is computed with the file's copy where MKF can.
    await expect(page.locator('.coilinfo-panel').first()).toBeVisible({ timeout: 60000 });
    await expect(page.locator('[data-cy$="-CoilInfo-RefusedCoreMaterial"]')).toHaveCount(0);

    // Kept until the user decides.
    expect(await storedMaterial(page)).toEqual(material);

    await expect(page.locator('[data-cy$="-OutdatedCoreMaterial-useLibrary"]')).toHaveText('Update DMR96 to the latest library data');
    await page.locator('[data-cy$="-OutdatedCoreMaterial-useLibrary"]').click();
    await expect(notice).toHaveCount(0);
    const library = await page.evaluate(async (name) => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      return pinia._s.get('taskQueue').getMaterialData(name);
    }, material.name);
    expect(await storedMaterial(page)).toEqual(library);
  });
});
