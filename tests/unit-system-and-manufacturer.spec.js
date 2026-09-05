/**
 * ABT #1099 — the two profile preferences.
 *
 * Unit system: storage stays SI; under `imperial` the length family shows
 * in / mil (in², in³), temperatures °F, in the inputs, the read-only results
 * and the catalogue tables. Electrical quantities stay SI.
 *
 * Preferred core manufacturer: the core adviser searches that maker's
 * materials first (MKF Settings preferredCoreMaterial*Manufacturer, exposed
 * through get/set_settings), so an advised buck core carries a material of
 * that manufacturer.
 */
import { test, expect } from './_coverage.js';
import { isBenign, pause } from './utils.js';
import { goToBuilderStep, adviseCoreAndWait } from './utils/builder-helpers.js';

async function setPreference(page, key, value) {
  await page.evaluate(([k, v]) => {
    const app = document.querySelector('#app').__vue_app__;
    app.config.globalProperties.$pinia._s.get('settings').userPreferences[k] = v;
  }, [key, value]);
}

async function coreState(page) {
  return page.evaluate(() => {
    const app = document.querySelector('#app').__vue_app__;
    const core = app.config.globalProperties.$pinia._s.get('mas').mas.magnetic.core;
    const material = core.functionalDescription.material;
    const gaps = (core.functionalDescription.gapping ?? []).filter(g => g.type !== 'residual');
    return {
      materialName: typeof material === 'string' ? material : material?.name,
      manufacturer: typeof material === 'string' ? null : material?.manufacturerInfo?.name,
      gapLength: gaps.length ? gaps[0].length : null,
    };
  });
}

const unitLabel = (page, suffix) => page.locator(`[data-cy$="${suffix}-DimensionUnit-input"] .p-select-label`).first();

test.describe('Profile preferences: unit system and preferred manufacturer (ABT #1099)', () => {
  test.describe.configure({ timeout: 300000 });

  test('imperial unit system: results, inputs and catalogue tables switch; SI storage untouched', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });
    page.on('pageerror', e => errors.push(`pageerror: ${e}`));

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await pause(page, 1500, 'core info settle');

    const before = await coreState(page);
    await expect(unitLabel(page, '-CoreInfo-EffectiveLength')).toHaveText('mm');
    await expect(unitLabel(page, '-Gap-GapLength')).toContainText('m');

    // ── Switch to imperial: read-only results and the gap input re-render in in / mil.
    await setPreference(page, 'unitSystem', 'imperial');
    await pause(page, 800, 'unit watchers');
    await expect(unitLabel(page, '-CoreInfo-EffectiveLength'), 'effective length reads in inches').toHaveText('in');
    const gapUnit = await unitLabel(page, '-Gap-GapLength').innerText();
    expect(['mil', 'in'], 'a sub-millimetre gap reads in mil or in').toContain(gapUnit.trim());
    const gapShown = Number((await page.locator('[data-cy$="-Gap-GapLength-number-input"] input').first().inputValue()).replace(/,/g, ''));
    const expectedGap = gapUnit.trim() === 'mil' ? before.gapLength / 2.54e-5 : before.gapLength / 0.0254;
    expect(gapShown, 'the displayed gap is the SI gap converted').toBeCloseTo(expectedGap, 1);
    expect((await coreState(page)).gapLength, 'the stored SI value did not move').toBeCloseTo(before.gapLength, 12);

    // ── Typing in the imperial input stores SI: 10 mil → 0.254 mm.
    const gapInput = page.locator('[data-cy$="-Gap-GapLength-number-input"] input').first();
    if (gapUnit.trim() !== 'mil') {
      await page.locator('[data-cy$="-Gap-GapLength-DimensionUnit-input"]').first().click();
      await page.locator('.p-select-overlay').last().getByRole('option', { name: 'mil', exact: true }).click();
    }
    await gapInput.fill('10');
    await gapInput.press('Enter');
    await pause(page, 2500, 'gap update + reprocess');
    expect((await coreState(page)).gapLength, '10 mil stored as 0.254 mm').toBeCloseTo(10 * 2.54e-5, 9);

    // ── Catalogue tables retitle and convert.
    await page.locator('[data-cy$="-Core-ShapeTable-button"]').first().click();
    const shapeTable = page.locator('[data-cy$="-AdvancedCoreInfo-ShapeTable"] table');
    await expect(shapeTable.locator('tbody tr').first()).toBeVisible({ timeout: 15000 });
    const headers = (await shapeTable.locator('thead th').allInnerTexts()).map(h => h.trim().toUpperCase());
    expect(headers.some(h => h.includes('WIDTH (IN)')), `width column must be in inches (headers: ${headers.join(' | ')})`).toBe(true);
    expect(headers.some(h => h.includes('MM')), 'no millimetre column remains').toBe(false);
    const firstWidth = Number((await shapeTable.locator('tbody tr').first().locator('td').nth(2).innerText()).trim());
    expect(firstWidth, 'a core width in inches is a few inches at most').toBeLessThan(10);
    await page.keyboard.press('Escape');
    await expect(shapeTable).toBeHidden({ timeout: 10000 });

    // ── Back to SI restores millimetres.
    await setPreference(page, 'unitSystem', 'si');
    await pause(page, 800, 'unit watchers');
    await expect(unitLabel(page, '-CoreInfo-EffectiveLength')).toHaveText('mm');

    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('preferred core manufacturer steers the advised material', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    // Three consecutive advises on ONE page: this used to trip the 3D worker's
    // Dummy-wire autocomplete on the third (ABT #1100, enrichment sent no
    // `inputs`), so the console-error check below also guards that fix.
    await goToBuilderStep(page);
    async function adviseWith(preference) {
      await setPreference(page, 'preferredCoreManufacturer', preference);
      await adviseCoreAndWait(page);
      return coreState(page);
    }

    const tdk = await adviseWith('TDK');
    expect(tdk.manufacturer, `the advised material must be TDK's (got ${tdk.materialName} by ${tdk.manufacturer})`).toBe('TDK');

    const ferroxcube = await adviseWith('Ferroxcube');
    expect(ferroxcube.manufacturer, `the advised material must be Ferroxcube's (got ${ferroxcube.materialName})`).toBe('Ferroxcube');

    // Clearing the preference hands the choice back to the engine default.
    const cleared = await adviseWith(null);
    expect(cleared.manufacturer, 'a manufacturer is still set').toBeTruthy();
    expect(cleared.manufacturer, 'the engine default is not the last preference').not.toBe('Ferroxcube');

    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });
});
