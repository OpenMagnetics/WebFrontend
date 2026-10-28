/**
 * A stored design carries its own copy of its core material. An old DMEGC DMR96 copy (MAS 051605e)
 * has a Steinmetz temperature factor ct(T) that is negative at every temperature, so MKF refuses its
 * core-loss data (INVALID_LOSS_DATA). The design itself cannot be computed with the library's copy
 * either, for a reason that has nothing to do with the material (a tertiary turn overlaps its
 * enclosure). The material is judged on its own: the file's copy is named as refused and the
 * library's copy offered, whatever the rest of the design does.
 *
 * The fixture is a stored design from the corpus of saved web designs, copied unchanged.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

const FIXTURE = 'pq3535_dmr96_old_copy_steinmetz_ct_negative.json';
const fixtureText = () => fs.readFileSync(new URL(`./fixtures/${FIXTURE}`, import.meta.url).pathname, 'utf8');
const NOTICE = '[data-cy$="-OutdatedCoreMaterial"]';
const INVALID = '[data-cy$="-OutdatedCoreMaterial-invalid"]';

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

test.describe('Load MAS: a stored core material whose loss data MKF refuses', () => {
  test('LOADMAS-LOSSDATA-MATERIAL-1: the refused copy is named and the library\'s copy replaces it on request', async ({ page }) => {
    test.setTimeout(300000);
    const material = JSON.parse(fixtureText()).magnetic.core.functionalDescription.material;
    expect(material.name).toBe('DMR96');

    await load(page);
    const notice = page.locator(NOTICE);
    await expect(notice).toBeVisible({ timeout: 120000 });
    const invalid = page.locator(INVALID);
    await expect(invalid).toBeVisible();
    await expect(invalid).toContainText('DMR96');
    await expect(invalid.locator('[data-cy$="-OutdatedCoreMaterial-reason"]')).toHaveAttribute('data-code', 'INVALID_LOSS_DATA');

    // Coil info does not compute with the refused copy; it says the material must be updated.
    const coilInfoRefused = page.locator('[data-cy$="-CoilInfo-RefusedCoreMaterial"]');
    await expect(coilInfoRefused).toBeVisible({ timeout: 60000 });
    await expect(coilInfoRefused).toContainText('The core material DMR96 must be updated');

    // Kept until the user decides.
    expect(await storedMaterial(page)).toEqual(material);

    await expect(page.locator('[data-cy$="-OutdatedCoreMaterial-useLibrary"]')).toHaveText('Update DMR96 to the latest library data');
    await page.locator('[data-cy$="-OutdatedCoreMaterial-useLibrary"]').click();
    await expect(notice).toHaveCount(0);
    await expect(coilInfoRefused).toHaveCount(0);
    const library = await page.evaluate(async (name) => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      return pinia._s.get('taskQueue').getMaterialData(name);
    }, material.name);
    expect(await storedMaterial(page)).toEqual(library);
  });
});
