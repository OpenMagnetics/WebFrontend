/**
 * An exported MAS keeps its core material record intact, so it loads again.
 *
 * A material whose losses are given per mass (Nanoperm 2000, `massLosses: magnetec`) carries
 * `volumetricLosses: {}`, which MAS requires. The exporters (MASFileExporter, the core adviser's
 * MagneticCoreSummary, CoreCrossReferencerOutput) ran clean() over the whole document, which strips
 * empty objects: the file came out without `volumetricLosses` and was refused on load. The rest of
 * the document is still cleaned (no nulls, no empty objects); only the core material keeps its
 * empty objects (WebSharedComponents utils.js cleanKeepingCoreMaterials).
 *
 * The design is the stored forward transformer fixture with its core material replaced, in the
 * test, by the engine's Nanoperm 2000 record; the fixture file is not changed.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL, engineLogRecords } from './utils/index.js';

const FIXTURE = new URL('./fixtures/04_forward_xfmr_e3216_n87.json', import.meta.url).pathname;

async function loadDocument(page, document, name) {
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(document)),
  });
  await page.waitForURL('**/magnetic_tool**', { timeout: 120000 });
}

const storedMaterial = (page) => page.evaluate(() => {
  const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
  return JSON.parse(JSON.stringify(pinia._s.get('mas').mas.magnetic.core.functionalDescription.material));
});

test('MASEXPORT-MAT-1: cleanKeepingCoreMaterials cleans the document but not its core material', async ({ page }) => {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
  const out = await page.evaluate(async () => {
    const { cleanKeepingCoreMaterials } = await import('/WebSharedComponents/assets/js/utils.js');
    const material = { name: 'X', volumetricLosses: {}, massLosses: { default: [{ method: 'magnetec' }] }, curieTemperature: null, alternatives: [] };
    const mas = {
      inputs: { designRequirements: { name: 'd', wiringTechnology: null, extra: {} } },
      magnetic: { core: { functionalDescription: { shape: 'E 32/16/9', material, gapping: [], name: null } } },
    };
    return cleanKeepingCoreMaterials(mas);
  });
  expect(out).toEqual({
    inputs: { designRequirements: { name: 'd' } },
    magnetic: { core: { functionalDescription: { shape: 'E 32/16/9', gapping: [], material: { name: 'X', volumetricLosses: {}, massLosses: { default: [{ method: 'magnetec' }] }, alternatives: [] } } } },
  });
});

test('MASEXPORT-MAT-2: a design with a mass-loss core material is exported and loads back with volumetricLosses', async ({ page }) => {
  test.setTimeout(300000);
  const alerts = [];
  page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });

  // The engine's own record of Nanoperm 2000, as a stored design embeds it.
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  await loadDocument(page, fixture, 'forward.json');
  const nanoperm = await page.evaluate(async () => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    const taskQueue = pinia._s.get('taskQueue');
    if (taskQueue == null) throw new Error('the taskQueue store is not created');
    return taskQueue.getMaterialData('Nanoperm 2000');
  });
  expect(nanoperm.massLosses, 'Nanoperm 2000 has no massLosses in this engine: the case this test needs is gone').toBeTruthy();
  nanoperm.volumetricLosses = {};
  const design = structuredClone(fixture);
  design.magnetic.core.functionalDescription.material = nanoperm;

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await loadDocument(page, design, 'forward_nanoperm.json');
  expect(alerts, 'the design with Nanoperm 2000 loads').toEqual([]);
  expect((await storedMaterial(page)).volumetricLosses).toEqual({});

  // Export it, with excitations and results.
  await page.evaluate(() => {
    document.querySelector('#app').__vue_app__.config.globalProperties.$stateStore.setCurrentToolSubsection('magneticBuilder');
  });
  const exportsMenu = page.locator('.cp-btn-all').first();
  await expect(exportsMenu).toBeVisible({ timeout: 60000 });
  await exportsMenu.click();
  await page.locator('[data-cy="MAS-exports-modal-button"]').click();
  const button = page.locator('[data-cy$="-Magnetic-MAS-File-With-Excitations"] button').first();
  await expect(button).toBeVisible({ timeout: 10000 });
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), button.click()]);
  const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  const exportedMaterial = exported.magnetic.core.functionalDescription.material;
  expect(exportedMaterial.name).toBe('Nanoperm 2000');
  expect(exportedMaterial.volumetricLosses, 'the exported material keeps the volumetricLosses MAS requires').toEqual({});
  expect(exportedMaterial.massLosses).toEqual(nanoperm.massLosses);

  // And the exported file loads again.
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await loadDocument(page, exported, 'exported.json');
  expect(alerts, 'the exported file loads').toEqual([]);
  expect((await storedMaterial(page)).volumetricLosses).toEqual({});
  const errors = (await engineLogRecords(page, { level: 'ERROR' })).filter((r) => /volumetricLosses/.test(`${r.message} ${r.detail ?? ''}`));
  expect(errors, 'no load error about the material').toEqual([]);
});
