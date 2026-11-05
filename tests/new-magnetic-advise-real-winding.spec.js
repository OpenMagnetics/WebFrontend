/**
 * Two bugs on a new two-winding magnetic (Alf, 2026-11-05: "standard new magnetic, just selecting two
 * windings, then click on Advise Core and Advise Wires"):
 *
 * - With real winding geometry on, Advise Core threw COIL_WINDING_ERROR: checkAndFixMas ran a full
 *   mas_autocomplete to get the core's processed description and a bobbin, which wound its
 *   placeholder coil (1 turn of MKF's thinnest 0.01 mm wire) around a 0.006 mm bend radius. It now
 *   processes the core and builds the bobbin directly.
 * - Advise Wire on the first winding kept the adviser's layout, which the adviser had wound with its
 *   own copy of the other winding (two parallels for the "Dummy" secondary the coil holds with one):
 *   core losses failed with a bare "Exception: vector". The layout is now kept only when the other
 *   windings match the coil's.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/index.js';
import { pickOption, adviseCoreAndWait, adviseWireAndWait } from './utils/builder-helpers.js';

const masOf = (page) => page.evaluate(() =>
  document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas);

const consoleErrors = (page) => {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
};

// A new magnetic with two windings, its secondary's excitation reflected from the primary, in the
// builder. The real-winding switch is persisted first, as a returning user has it, so the engine
// boots with it (the engine reads the switch at start-up and on each wind, not on a store change).
async function newTwoWindingMagnetic(page, useRealWindingGeometry) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia._s.get('settings')?.magneticBuilderSettings != null);
  await page.evaluate((value) => {
    document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('settings').magneticBuilderSettings.useRealWindingGeometry = value;
  }, useRealWindingGeometry);
  // Off is the default, which an untouched store never writes.
  await page.waitForFunction((value) => (JSON.parse(localStorage.getItem('settings') ?? '{}').magneticBuilderSettings?.useRealWindingGeometry === true) === value, useRealWindingGeometry);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction((value) => document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia._s.get('settings')?.magneticBuilderSettings?.useRealWindingGeometry === value, useRealWindingGeometry);

  await page.locator('[data-cy="Header-new-magnetic-toggle"]').click();
  await page.locator('[data-cy="Header-new-magnetic-link"]').click();
  await page.waitForURL('**/magnetic_tool**');
  await pickOption(page, 'DesignRequirements-NumberWindings', '2');

  await page.locator('[data-cy="storyline-Op.Points-button"]').click();
  await page.locator('[data-cy="OperatingPoint-source-Manual-button"]').filter({ hasText: /manually/i }).first().click();
  const reflect = page.locator('[data-cy="MagneticBuilder-OperatingPoints-operating-point-0-winding-1-reflect-button"]');
  await expect(reflect).toBeVisible({ timeout: 60000 });
  await reflect.click();
  await page.waitForFunction(() => {
    const mas = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas;
    return mas.inputs.operatingPoints[0].excitationsPerWinding.length == 2;
  }, null, { timeout: 60000 });

  await page.locator('[data-cy="storyline-MagneticBuilder-button"]').click();
}

test('NEWMAG-REAL-WINDING: Advise Core on a new two-winding magnetic winds no placeholder coil', async ({ page }) => {
  test.setTimeout(240000);
  const errors = consoleErrors(page);
  await newTwoWindingMagnetic(page, true);
  await adviseCoreAndWait(page);

  const mas = await masOf(page);
  expect(mas.magnetic.core.processedDescription, 'the advised core is processed').not.toBeNull();
  expect(typeof mas.magnetic.coil.bobbin, 'the bobbin was built, not left "Dummy"').toBe('object');
  expect(errors.filter((text) => /COIL_WINDING_ERROR|Real winding refuses/.test(text)), 'no placeholder coil was wound').toEqual([]);
});

test('NEWMAG-ADVISE-ONE-WIRE: the layout kept after advising one winding describes the coil the builder holds', async ({ page }) => {
  test.setTimeout(240000);
  const errors = consoleErrors(page);
  await newTwoWindingMagnetic(page, false);
  await adviseCoreAndWait(page);
  // Core Info's core losses, computed on the coil the builder holds after the wire advice.
  await page.evaluate(() => {
    window.__coreLossesOutcomes = [];
    document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('magneticBuilderTaskQueue').$onAction(({ name, after, onError }) => {
      if (name !== 'calculateCoreLosses') return;
      after(() => window.__coreLossesOutcomes.push('done'));
      onError((error) => window.__coreLossesOutcomes.push(`failed: ${error?.message ?? error}`));
    });
  });
  await adviseWireAndWait(page);
  await page.waitForFunction(() => {
    const coil = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas.magnetic.coil;
    return coil.functionalDescription[0].wire !== 'Dummy' && window.__coreLossesOutcomes.length > 0;
  }, null, { timeout: 120000 });

  // The secondary is still "Dummy", so the coil may stay unwound; a layout it keeps describes its windings.
  const coil = (await masOf(page)).magnetic.coil;
  for (const winding of coil.turnsDescription == null ? [] : coil.functionalDescription) {
    const turns = coil.turnsDescription.filter((turn) => turn.winding == winding.name).length;
    expect(turns, `${winding.name}: described turns = ${winding.numberTurns} turns x ${winding.numberParallels} parallels`)
      .toBe(winding.numberTurns * winding.numberParallels);
  }
  const outcomes = await page.evaluate(() => window.__coreLossesOutcomes);
  expect(outcomes.filter((outcome) => outcome != 'done'), 'core losses computed').toEqual([]);
  await expect(page.locator('[data-cy$="-CoreInfo-SimulationError"]')).toHaveCount(0);
  expect(errors.filter((text) => /Exception: vector/.test(text))).toEqual([]);
});
