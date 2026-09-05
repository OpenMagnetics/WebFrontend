/**
 * ABT #1084 — Undo must light up for every meaningful design edit, not only
 * once a coil has been wound.
 *
 * Before: history additions were blocked from the builder's mount and only a
 * wind() completion lifted the block, so after Advise + a shape change the
 * history was still empty (no wire yet → no wind → nothing recorded) and Undo
 * stayed disabled. Now a settle recorder records each burst of design changes
 * once the store has been quiet; the baseline after Advise is entry 0, every
 * later edit (shape, material, gap) is one step, undo/redo walk them, and a
 * rebound after undo does not truncate the redo stack.
 */
import { test, expect } from './_coverage.js';
import { isBenign, pause } from './utils.js';
import { goToBuilderStep, adviseCoreAndWait, adviseWireAndWait, selectOptions, pickOption } from './utils/builder-helpers.js';

async function history(page) {
  return page.evaluate(() => {
    const app = document.querySelector('#app').__vue_app__;
    const h = app.config.globalProperties.$pinia._s.get('history');
    const mas = app.config.globalProperties.$pinia._s.get('mas').mas;
    const shape = mas.magnetic.core.functionalDescription.shape;
    const material = mas.magnetic.core.functionalDescription.material;
    const gaps = (mas.magnetic.core.functionalDescription.gapping ?? []).filter(g => g.type !== 'residual');
    return {
      len: h.masHistory.length,
      ptr: h.historyPointer,
      shape: typeof shape === 'string' ? shape : shape?.name,
      material: typeof material === 'string' ? material : material?.name,
      gap: gaps.length ? gaps[0].length : null,
    };
  });
}

function undoButton(page) {
  return page.locator('button[title="Undo"], button[aria-label="Undo"], [data-cy$="-undo-button"]').first();
}
function redoButton(page) {
  return page.locator('button[title="Redo"], button[aria-label="Redo"], [data-cy$="-redo-button"]').first();
}

test.describe('MB – history records design edits (ABT #1084)', () => {
  test.describe.configure({ timeout: 300000 });

  test('advise = baseline, shape/material/gap edits = steps, undo/redo walk them', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await pause(page, 4000, 'settle recorder window after advise');

    const undo = undoButton(page);
    const redo = redoButton(page);
    await expect(undo, 'an Undo button must exist').toBeVisible();

    const baseline = await history(page);
    expect(baseline.len, 'the advised design must be recorded as the baseline').toBeGreaterThanOrEqual(1);
    expect(baseline.ptr).toBe(baseline.len - 1);
    await expect(undo, 'nothing to undo right after the baseline').toBeDisabled();

    // ── Shape edit → one step, Undo lights up.
    const shapes = await selectOptions(page, '-AdvancedCoreInfo-ShapeNames');
    const otherShape = shapes.find(s => s !== baseline.shape);
    expect(otherShape, 'the family must offer another shape').toBeTruthy();
    await pickOption(page, '-AdvancedCoreInfo-ShapeNames', otherShape);
    await pause(page, 6000, 'reprocess + settle window');
    const afterShape = await history(page);
    expect(afterShape.shape).toBe(otherShape);
    expect(afterShape.len, 'a shape edit must add exactly one history step').toBe(baseline.len + 1);
    expect(afterShape.ptr).toBe(afterShape.len - 1);
    await expect(undo).toBeEnabled();

    // ── Material edit → another step.
    const materials = await selectOptions(page, '-MaterialNames');
    const otherMaterial = materials.find(m => m !== afterShape.material);
    expect(otherMaterial, 'the manufacturer must offer another material').toBeTruthy();
    await pickOption(page, '-MaterialNames', otherMaterial);
    await pause(page, 6000, 'reprocess + settle window');
    const afterMaterial = await history(page);
    expect(afterMaterial.material).toBe(otherMaterial);
    expect(afterMaterial.len, 'a material edit must add exactly one history step').toBe(afterShape.len + 1);

    // ── Undo → previous material; Redo available and restores it.
    await undo.click();
    await pause(page, 3500, 'undo rebound window (2 s block) + settle');
    const afterUndo = await history(page);
    expect(afterUndo.material, 'undo must restore the previous material').toBe(afterShape.material);
    expect(afterUndo.shape, 'undo of the material edit must keep the shape edit').toBe(otherShape);
    expect(afterUndo.len, 'undo must not create or drop entries').toBe(afterMaterial.len);
    expect(afterUndo.ptr).toBe(afterMaterial.len - 2);
    await expect(redo, 'redo must be available after undo').toBeEnabled();

    await redo.click();
    await pause(page, 3500, 'redo rebound window + settle');
    const afterRedo = await history(page);
    expect(afterRedo.material, 'redo must restore the newer material').toBe(otherMaterial);
    expect(afterRedo.len, 'the redo stack must survive the rebound').toBe(afterMaterial.len);
    expect(afterRedo.ptr).toBe(afterMaterial.len - 1);

    // ── Two undos in a row reach the baseline shape.
    await undo.click();
    await pause(page, 3500, 'undo');
    await undo.click();
    await pause(page, 3500, 'undo');
    const back = await history(page);
    expect(back.shape, 'two undos must be back at the advised shape').toBe(baseline.shape);
    expect(back.ptr).toBe(baseline.len - 1);
    await expect(undo).toBeDisabled();

    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('with a wound coil, one gesture (gap for inductance → reprocess → rewind) is one step', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);
    await pause(page, 6000, 'wind completes + settle window');

    const undo = undoButton(page);
    const wound = await history(page);
    expect(wound.len, 'the wound design must be recorded').toBeGreaterThanOrEqual(1);
    expect(wound.ptr).toBe(wound.len - 1);

    // A gesture that mutates the design in several steps: the new gap is set,
    // the core reprocessed, the bobbin regenerated and the coil rewound
    // (wind's own addToHistory fires mid-burst) — exactly ONE undo step.
    await page.evaluate(() => {
      const app = document.querySelector('#app').__vue_app__;
      const req = app.config.globalProperties.$pinia._s.get('mas').mas.inputs.designRequirements.magnetizingInductance;
      req.nominal *= 0.5; if (req.minimum != null) req.minimum *= 0.5; if (req.maximum != null) req.maximum *= 0.5;
    });
    await pause(page, 3000, 'requirement edit settles as its own step');
    const afterRequirement = await history(page);
    await page.locator('[data-cy$="-Core-GapToInductance-button"]').first().click();
    await page.locator('[data-cy$="-Core-adjust-info"]').waitFor({ timeout: 30000 });
    await pause(page, 8000, 'reprocess + rewind + settle window');
    const afterGap = await history(page);
    expect(afterGap.gap, 'the gap must have changed').not.toBe(afterRequirement.gap);
    expect(afterGap.len, 'the whole gesture must be exactly one history step').toBe(afterRequirement.len + 1);
    expect(afterGap.ptr).toBe(afterGap.len - 1);
    await expect(undo).toBeEnabled();

    await undo.click();
    await pause(page, 4000, 'undo rebound (rewind) + block window');
    const afterUndo = await history(page);
    expect(afterUndo.gap, 'undo must restore the previous gap').toBe(afterRequirement.gap);
    expect(afterUndo.len, 'the rebound after undo must not add or drop entries').toBe(afterGap.len);
    expect(afterUndo.ptr).toBe(afterGap.len - 2);

    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });
});
