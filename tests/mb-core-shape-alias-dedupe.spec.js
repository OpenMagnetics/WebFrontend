/**
 * Regression for ABT #924 — the core-shape dropdown offered alias names as if
 * they were separate sizes.
 *
 * MKF's coreShapeDatabase is a LOOKUP index keyed by the canonical shape name
 * AND by every alias, and get_core_shape_names() used to enumerate its keys.
 * The EFD family therefore listed "EFD 20", "EFD 20/10/7", "EFD 25",
 * "EFD 25/13/9", … — the same six shapes under eleven names. Clicking the
 * alias row resolved to the same shape, the engine echoed back the canonical
 * name, and the dropdown re-labelled itself, which a user reported as
 * "I clicked EFD25, but it always ends up choosing EFD25/13/9".
 */
import { test, expect } from './_coverage.js';
import { isBenign, pause } from './utils.js';
import { goToBuilderStep, adviseCoreAndWait, pickOption, selectOptions, selectValue } from './utils/builder-helpers.js';

test.describe('MB – core shape dropdown lists each size once (ABT #924)', () => {
  test.describe.configure({ timeout: 180000 });

  test('the EFD family offers canonical names only, and a pick keeps its label', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const families = await selectOptions(page, '-AdvancedCoreInfo-ShapeFamilies');
    const efd = families.find(f => f.trim().toUpperCase() === 'EFD');
    expect(efd, `an EFD shape family must be offered (got: ${families.join(', ')})`).toBeTruthy();
    await pickOption(page, '-AdvancedCoreInfo-ShapeFamilies', efd);
    await pause(page, 800, 'mechanical: settle after family change');

    const shapes = await selectOptions(page, '-AdvancedCoreInfo-ShapeNames');

    // No name twice, and no alias short-form alongside the full IEC name.
    expect(new Set(shapes).size, `no shape may be listed twice (got: ${shapes.join(', ')})`).toBe(shapes.length);
    expect(shapes, 'the EFD family must offer exactly its six catalogue sizes').toEqual([
      'EFD 10/5/3', 'EFD 12/6/3.5', 'EFD 15/8/5', 'EFD 20/10/7', 'EFD 25/13/9', 'EFD 30/15/9',
    ]);

    // The size the user picks is the size the dropdown keeps showing.
    await pickOption(page, '-AdvancedCoreInfo-ShapeNames', 'EFD 25/13/9');
    await pause(page, 1500, 'mechanical: settle after shape change (core reprocess)');
    expect(await selectValue(page, '-AdvancedCoreInfo-ShapeNames')).toBe('EFD 25/13/9');

    const applied = await page.evaluate(() => {
      const app = document.querySelector('#app').__vue_app__;
      const mas = app.config.globalProperties.$pinia._s.get('mas');
      const shape = mas.mas.magnetic.core?.functionalDescription?.shape;
      return typeof shape === 'string' ? shape : shape?.name;
    });
    expect(applied, 'the mas store must carry the shape the user picked').toBe('EFD 25/13/9');

    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });
});
