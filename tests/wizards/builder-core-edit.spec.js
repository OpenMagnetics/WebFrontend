/**
 * Smoke: a Magnetic Builder core edit round-trips through checkAndFixMas and
 * the engine without a console error (ABT #1097).
 *
 * Why it lives in the smoke battery: on 2026-09-05 a WebSharedComponents main
 * merge dropped the `MagneticCircuit` import that checkAndFixMas uses, so
 * EVERY core fix-up threw a ReferenceError — and the wizard-only smoke gate
 * stayed green. A shape change and a material change are the two cheapest
 * paths through that code.
 */
import { test, expect } from '../_coverage.js';
import { isBenign, pause } from '../utils.js';
import { goToBuilderStep, adviseCoreAndWait, selectOptions, pickOption } from '../utils/builder-helpers.js';

test.describe('builder core edit @smoke', () => {
  test.describe.configure({ timeout: 240000 });

  test('Builder-S1 — advise, then change shape and material without a console error @smoke', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });
    page.on('pageerror', e => errors.push(`pageerror: ${e}`));

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const core = async () => page.evaluate(() => {
      const app = document.querySelector('#app').__vue_app__;
      const c = app.config.globalProperties.$pinia._s.get('mas').mas.magnetic.core;
      const s = c.functionalDescription.shape, m = c.functionalDescription.material;
      return { shape: typeof s === 'string' ? s : s?.name, material: typeof m === 'string' ? m : m?.name, processed: c.processedDescription != null };
    });
    const advised = await core();
    expect(advised.processed, 'the advised core must be processed').toBe(true);

    const shapes = await selectOptions(page, '-AdvancedCoreInfo-ShapeNames');
    const otherShape = shapes.find(s => s !== advised.shape);
    expect(otherShape, 'the family must offer another shape').toBeTruthy();
    await pickOption(page, '-AdvancedCoreInfo-ShapeNames', otherShape);
    await pause(page, 4000, 'checkAndFixMas + autocomplete + reprocess');
    const afterShape = await core();
    expect(afterShape.shape).toBe(otherShape);
    expect(afterShape.processed, 'the changed core must be processed again').toBe(true);

    const materials = await selectOptions(page, '-MaterialNames');
    const otherMaterial = materials.find(m => m !== afterShape.material);
    expect(otherMaterial, 'the manufacturer must offer another material').toBeTruthy();
    await pickOption(page, '-MaterialNames', otherMaterial);
    await pause(page, 4000, 'material change + reprocess');
    const afterMaterial = await core();
    expect(afterMaterial.material).toBe(otherMaterial);
    expect(afterMaterial.shape, 'a material change keeps the shape').toBe(otherShape);

    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });
});
