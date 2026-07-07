/**
 * Regression for ABT #157 — U cores could not be gapped with a spacer.
 *
 * The basic CoreGappingSelector hardcoded 3 gaps (an E-family assumption:
 * central + 2 laterals). A U core has only 2 columns, so a spacer sent 3
 * additive gaps: MKF stacked all three in the central column and left the
 * lateral column ungapped (residual). The fix drives the gap count from
 * core.processedDescription.columns.length, so a U-core spacer emits exactly
 * 2 additive gaps — one additive gap per column.
 */
import { test, expect } from './_coverage.js';
import { isBenign, pause } from './utils.js';
import { goToBuilderStep, adviseCoreAndWait, pickOption, selectOptions } from './utils/builder-helpers.js';

// Wait until the mas-store core has a processed description, then read its
// shape family and per-column gapping.
async function readGapping(page) {
  await page.waitForFunction(() => {
    const app = document.querySelector('#app').__vue_app__;
    const mas = app.config.globalProperties.$pinia._s.get('mas');
    return mas.mas.magnetic.core?.processedDescription?.columns != null;
  }, { timeout: 30000 });
  return await page.evaluate(() => {
    const app = document.querySelector('#app').__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const mas = pinia._s.get('mas');
    const core = mas.mas.magnetic.core;
    const shape = core?.functionalDescription?.shape;
    return {
      family: typeof shape === 'string' ? null : shape?.family,
      shapeName: typeof shape === 'string' ? shape : shape?.name,
      columns: core?.processedDescription?.columns?.length ?? null,
      gapping: (core?.functionalDescription?.gapping ?? []).map(g => ({
        type: g.type,
        x: Array.isArray(g.coordinates) ? Number(g.coordinates[0].toFixed(5)) : null,
      })),
    };
  });
}

test.describe('MB – U-core spacer (ABT #157)', () => {
  test.describe.configure({ timeout: 180000 });

  test('spacer on a U core gaps BOTH columns (2 additive gaps, not 3)', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await goToBuilderStep(page);
    // Advise a core first so a material is set; the basic selector only
    // reprocesses (populating processedDescription) once the core has a
    // material, and we need the processed columns to check the gapping.
    await adviseCoreAndWait(page);

    // Force a U-family shape in the basic core selector.
    const families = await selectOptions(page, '-AdvancedCoreInfo-ShapeFamilies');
    const uFamily = families.find(f => /^U\b|^U$|^U /i.test(f) || f.trim().toLowerCase() === 'u');
    expect(uFamily, `a U shape family must be offered (got: ${families.join(', ')})`).toBeTruthy();
    await pickOption(page, '-AdvancedCoreInfo-ShapeFamilies', uFamily);
    await pause(page, 800, 'mechanical: settle after family change');

    const shapes = await selectOptions(page, '-AdvancedCoreInfo-ShapeNames');
    expect(shapes.length, 'the U family must offer at least one shape').toBeGreaterThan(0);
    await pickOption(page, '-AdvancedCoreInfo-ShapeNames', shapes[0]);
    await pause(page, 1200, 'mechanical: settle after shape change (core reprocess)');

    const before = await readGapping(page);
    expect(before.family, `the U family must be applied (got ${before.family} / ${before.shapeName})`).toBe('u');
    expect(before.columns, 'a U core must have exactly 2 columns').toBe(2);

    // Select the Spacer gap type in the basic gapping selector.
    await pickOption(page, '-Gap-GapType', 'Spacer');
    await pause(page, 1200, 'mechanical: settle after gapping reprocess');

    const after = await readGapping(page);
    const additive = after.gapping.filter(g => g.type === 'additive');
    const columnXs = new Set(additive.map(g => g.x));

    // One additive gap per column, all columns covered — NOT 3 stacked in one.
    expect(additive.length, `spacer must place one additive gap per column; got ${JSON.stringify(after.gapping)}`).toBe(2);
    expect(columnXs.size, 'the two additive gaps must sit in two distinct columns').toBe(2);
    expect(after.gapping.some(g => g.type === 'residual'),
      'no column should be left residual/ungapped under a spacer').toBe(false);

    expect(errors).toEqual([]);
  });
});
