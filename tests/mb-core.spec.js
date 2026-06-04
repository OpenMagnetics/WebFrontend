/**
 * Magnetic Builder battery — Core panel (Groups A–G).
 *
 * Split from the legacy magnetic-builder-battery.spec.js monolith. See
 * tests/utils/builder-helpers.js for the shared setup.
 *
 *   A – Navigation to the builder step (from wizard)
 *   B – Core: Core Advise button (automatic recommendation)
 *   C – Core: Manual shape selection (shape family, shape name)
 *   D – Core: Material selection (manufacturer → material name)
 *   E – Core: Gapping configuration
 *   F – Core: Number of stacks (stackable shapes)         [SKIP, conditional]
 *   G – Core: Advanced Core Mode (Customize → submodes)
 */

import { test, expect } from './_coverage.js';
import { isBenign, pause } from './utils.js';
import { ss, goToBuilderStep, adviseCoreAndWait, adviseWireAndWait,
         selectOptions, selectValue, pickOption, pickFirstOption, numberInput } from './utils/builder-helpers.js';

// =====================================================================
// GROUP A – Navigation to builder step
// =====================================================================
test.describe('MB – Group A – Navigation', () => {
  test.describe.configure({ timeout: 180000 });

  test('MB-A1 – Buck wizard → Review Specs → builder step loads (Core Advise visible)', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await goToBuilderStep(page);
    await ss(page, 'A1-builder-step');
    expect(errors).toEqual([]);
  });

  test('MB-A2 – Three-column layout visible (Core / Wire / Coil panels)', async ({ page }) => {
    await goToBuilderStep(page);
    // Core panel is always present at the builder step. Wire and Coil panels
    // are conditionally rendered after the previous column is "complete".
    await expect(page.locator('.core-config-panel').first()).toBeVisible();
    await adviseCoreAndWait(page);
    await expect(page.locator('.wire-config-panel').first()).toBeVisible();
    await adviseWireAndWait(page);
    await expect(page.locator('.coil-config-panel').first()).toBeVisible();
    await ss(page, 'A2-three-columns');
  });

  test('MB-A3 – Storyline panel shows all 4 steps', async ({ page }) => {
    await goToBuilderStep(page);
    // Storyline labels use non-breaking spaces ("Design  Req.", "Op.  Points",
    // "Magnetic.  Builder"). Use permissive regexes.
    await expect(page.locator('.storyline-step').filter({ hasText: /Design.*Req/i }).first()).toBeVisible();
    await expect(page.locator('.storyline-step').filter({ hasText: /Op.*Points/i }).first()).toBeVisible();
    await expect(page.locator('.storyline-step').filter({ hasText: /Magnetic.*Builder/i }).first()).toBeVisible();
    await expect(page.locator('.storyline-step').filter({ hasText: /Summary/i }).first()).toBeVisible();
    await ss(page, 'A3-storyline-steps');
  });

  test('MB-A4 – Context menu panel and Settings button visible in builder step', async ({ page }) => {
    await goToBuilderStep(page);
    await expect(page.locator('.toolmenu-panel').first()).toBeVisible();
    await expect(page.locator('[data-cy$="settings-modal-button"]').first()).toBeVisible();
    await ss(page, 'A4-context-menu');
  });

  test('MB-A5 – Control panel visible (Undo present, Exports gated on completion)', async ({ page }) => {
    await goToBuilderStep(page);
    await expect(page.locator('button[title="Undo"]').first()).toBeVisible();
    // At this point the design is incomplete (coil.turnsDescription is null),
    // so ControlPanel.vue renders the "Complete design to enable exports"
    // hint rather than the All-Exports dropdown. That proves the control
    // panel itself is mounted and gating works. Real export-button
    // reachability is covered by MB-T2/MB-T3.
    const incompleteHint = page.locator('.cp-incomplete').first();
    await expect(incompleteHint, 'Control panel must render the incomplete-state hint before coil is built').toBeVisible();
    await ss(page, 'A5-control-panel');
  });
});

// =====================================================================
// GROUP B – Core: Core Advise button
// =====================================================================
test.describe('MB – Group B – Core Advise', () => {
  test.describe.configure({ timeout: 180000 });

  test('MB-B1 – Core Advise button visible and enabled (incomplete core state)', async ({ page }) => {
    await goToBuilderStep(page);
    const btn = page.locator('[data-cy$="-Core-Advise-button"]').first();
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
    await ss(page, 'B1-core-advise-btn');
  });

  test('MB-B2 – Core Advise click triggers loading indicator', async ({ page }) => {
    await goToBuilderStep(page);
    const btn = page.locator('[data-cy$="-Core-Advise-button"]').first();
    await btn.click();
    await page.waitForFunction(
      () => {
        const loading = document.querySelector('[data-cy$="-BasicCoreSelector-loading"]');
        const b = document.querySelector('[data-cy$="-Core-Advise-button"]');
        return loading || (b && b.disabled);
      },
      { timeout: 5000 }
    );
    await ss(page, 'B2-core-advise-loading');
  });

  test('MB-B3 – Core Advise completes and populates manufacturer + material', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await ss(page, 'B3-core-advised');

    const mfg = await selectValue(page, '-MaterialManufacturers');
    expect(mfg.length, 'manufacturer select must have a non-empty value after advise').toBeGreaterThan(0);

    const mat = await selectValue(page, '-MaterialNames');
    expect(mat.length, 'material name select must have a non-empty value after advise').toBeGreaterThan(0);

    expect(errors).toEqual([]);
  });

  test('MB-B4 – Core Advise after switching Buck wizard to "I know" mode', async ({ page }) => {
    // BuckBoostWizard (launched as Buck → dataTestLabel "BuckWizard") uses
    // ElementFromListRadio for the design-level — not .design-mode-label.
    await goToBuilderStep(page, {
      setupFn: async (p) => {
        // PrimeVue RadioButton: a real click drives its v-model; setting
        // .checked + a native change event does not.
        const iKnow = p.locator('[data-cy="BuckWizard-DesignLevel-I know the design I want-radio-input"]');
        await expect(iKnow).toBeVisible();
        await iKnow.click();
        await pause(p, 400, 'mechanical: settle');
        await expect(p.locator('[data-cy="BuckWizard-Inductance-number-input"]')).toBeVisible();
      },
    });

    await adviseCoreAndWait(page);
    await ss(page, 'B4-core-advised-iknow');

    expect((await selectValue(page, '-MaterialManufacturers')).length).toBeGreaterThan(0);
  });
});

// =====================================================================
// GROUP C – Core: Manual shape selection
// =====================================================================
test.describe('MB – Group C – Core Manual Shape', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-C1 – Core shape selector visible (AdvancedCoreInfo container)', async ({ page }) => {
    await goToBuilderStep(page);
    const shapeSel = page.locator('[data-cy$="-AdvancedCoreInfo-ShapeFamilies-container"]').first();
    await expect(shapeSel).toBeVisible();
    await expect(shapeSel.locator('.p-select').first(), 'shape-family PrimeVue select must be present').toBeVisible();
    await ss(page, 'C1-core-shape-selector');
  });

  test('MB-C2 – Select first available shape family', async ({ page }) => {
    await goToBuilderStep(page);
    const coreInfoEl = page.locator('[data-cy$="-AdvancedCoreInfo-ShapeFamilies-container"]').first();
    await expect(coreInfoEl).toBeVisible();
    const opts = await selectOptions(page, '-AdvancedCoreInfo-ShapeFamilies');
    expect(opts.length, 'shape-family select must have at least one option').toBeGreaterThan(0);
    const picked = await pickFirstOption(page, '-AdvancedCoreInfo-ShapeFamilies');
    await pause(page, 600, 'mechanical: settle');
    expect(await selectValue(page, '-AdvancedCoreInfo-ShapeFamilies')).toBe(picked);
    await ss(page, 'C2-shape-family-selected');
  });

  test('MB-C3 – Shape selectors populated after Core Advise', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    const coreInfoEl = page.locator('[data-cy$="-AdvancedCoreInfo-ShapeFamilies-container"]').first();
    await expect(coreInfoEl).toBeVisible();
    const selectsCount = await coreInfoEl.locator('.p-select').count();
    expect(selectsCount).toBeGreaterThan(0);
    await ss(page, 'C3-shape-after-advise');
  });

  test('MB-C4 – Shape family select exposes multiple options', async ({ page }) => {
    await goToBuilderStep(page);
    const opts = await selectOptions(page, '-AdvancedCoreInfo-ShapeFamilies');
    expect(opts.length, 'shape-family select must offer at least 2 options').toBeGreaterThan(1);
    await ss(page, 'C4-shape-families');
  });
});

// =====================================================================
// GROUP D – Core: Material selection
// =====================================================================
test.describe('MB – Group D – Core Material', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-D1 – Material Manufacturers selector appears after Core Advise', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await expect(page.locator('[data-cy$="-MaterialManufacturers-container"]').first()).toBeVisible();
    await ss(page, 'D1-manufacturer-visible');
  });

  test('MB-D2 – Material Names selector populated after manufacturer is set', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const mfgOpts = await selectOptions(page, '-MaterialManufacturers');
    expect(mfgOpts.length).toBeGreaterThan(0);
    await pickFirstOption(page, '-MaterialManufacturers');
    await pause(page, 800, 'mechanical: settle');

    const matOpts = await selectOptions(page, '-MaterialNames');
    expect(matOpts.length, 'Material Names must have options for the chosen manufacturer').toBeGreaterThan(0);
    await ss(page, 'D2-material-names-visible');
  });

  test('MB-D3 – Material can be changed to a different option', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const opts = await selectOptions(page, '-MaterialNames');
    expect(opts.length).toBeGreaterThan(1);

    const initialVal = await selectValue(page, '-MaterialNames');
    const nextOpt = opts.find(o => o !== initialVal);
    expect(nextOpt, 'a different material option must exist').toBeTruthy();
    await pickOption(page, '-MaterialNames', nextOpt);
    await pause(page, 800, 'mechanical: settle');
    expect(await selectValue(page, '-MaterialNames')).toBe(nextOpt);
    await ss(page, 'D3-material-changed');
  });
});

// =====================================================================
// GROUP E – Core: Gapping configuration
// =====================================================================
test.describe('MB – Group E – Core Gapping', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-E1 – Gap selector visible after Core Advise', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    const gapSel = page.locator('[data-cy$="-Gap-container"]').first();
    // For toroidal cores there is no gap; for two-piece cores there is. The
    // Buck wizard's advised core is virtually always two-piece.
    await expect(gapSel).toBeVisible();
    await ss(page, 'E1-gap-selector');
  });

  test('MB-E2 – Gap value is editable (number input accepts new value)', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const gapEl = page.locator('[data-cy$="-Gap-container"]').first();
    await expect(gapEl).toBeVisible();
    const gapInput = numberInput(gapEl);
    await expect(gapInput).toBeVisible();
    await gapInput.click({ clickCount: 3 });
    await gapInput.fill('0.001');
    await gapInput.press('Tab');
    await pause(page, 600, 'mechanical: settle');
    const val = parseFloat(await gapInput.inputValue());
    expect(val).toBeGreaterThan(0);
    await ss(page, 'E2-gap-edited');
  });
});

// =====================================================================
// GROUP F removed: NumberStacks input only renders for stackable shape
// families (E, ETD, EFD, U). Core Adviser returns non-stackable shapes
// (EQ, PQ, etc.), so visibility is non-deterministic. Reinstate when the
// wizard exposes a way to force a stackable advised shape.

// =====================================================================
// GROUP G – Core: Advanced Core Mode (Customize)
// =====================================================================
test.describe('MB – Group G – Advanced Core Mode', () => {
  test.describe.configure({ timeout: 120000 });

  async function enterCustomize(page) {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    const customizeBtn = page.locator('[data-cy$="-Core-Customize-button"]').first();
    await expect(customizeBtn).toBeVisible();
    await expect(customizeBtn).toBeEnabled();
    await customizeBtn.click();
    await pause(page, 800, 'mechanical: settle');
  }

  test('MB-G1 – Core Customize button visible and enabled after advise', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    const customizeBtn = page.locator('[data-cy$="-Core-Customize-button"]').first();
    await expect(customizeBtn).toBeVisible();
    await expect(customizeBtn).toBeEnabled();
    await ss(page, 'G1-customize-btn');
  });

  test('MB-G2 – Click Customize reveals Edit gapping, Edit material, Apply, Cancel buttons', async ({ page }) => {
    await enterCustomize(page);
    // Initial Advanced-Core submode is Shape (per state.js), so the "Edit
    // shape" button is hidden via `v-if="... submode != Shape"`. Only the
    // other two submode-switch buttons plus Apply/Cancel are visible.
    await expect(page.locator('button').filter({ hasText: /^\s*Edit gapping\s*$/ }).first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /^\s*Edit material\s*$/ }).first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Apply changes/i }).first()).toBeVisible();
    await expect(page.locator('.toolmenu-panel button').filter({ hasText: /^\s*Cancel\s*$/ }).first()).toBeVisible();
    await ss(page, 'G2-advanced-core-mode');
  });

  test('MB-G3 – Advanced Core: Edit shape submode reachable after switching away and back', async ({ page }) => {
    await enterCustomize(page);
    await page.locator('button').filter({ hasText: /^\s*Edit gapping\s*$/ }).first().click();
    await pause(page, 500, 'mechanical: settle');
    const editShape = page.locator('button').filter({ hasText: /^\s*Edit shape\s*$/ }).first();
    await expect(editShape).toBeVisible();
    await editShape.click();
    await pause(page, 500, 'mechanical: settle');
    await expect(page.locator('button').filter({ hasText: /Apply changes/i }).first()).toBeVisible();
    await ss(page, 'G3-edit-shape-submode');
  });

  test('MB-G4 – Advanced Core: Edit gapping submode entered', async ({ page }) => {
    await enterCustomize(page);
    const btn = page.locator('button').filter({ hasText: /^\s*Edit gapping\s*$/ }).first();
    await expect(btn).toBeVisible();
    await btn.click();
    await pause(page, 600, 'mechanical: settle');
    await expect(page.locator('button').filter({ hasText: /Apply changes/i }).first()).toBeVisible();
    await ss(page, 'G4-edit-gapping-submode');
  });

  test('MB-G5 – Advanced Core: Edit material submode entered', async ({ page }) => {
    await enterCustomize(page);
    const btn = page.locator('button').filter({ hasText: /^\s*Edit material\s*$/ }).first();
    await expect(btn).toBeVisible();
    await btn.click();
    await pause(page, 600, 'mechanical: settle');
    await expect(page.locator('button').filter({ hasText: /Apply changes/i }).first()).toBeVisible();
    await ss(page, 'G5-edit-material-submode');
  });

  test('MB-G6 – Advanced Core: Apply returns to Basic mode', async ({ page }) => {
    await enterCustomize(page);
    const applyBtn = page.locator('button').filter({ hasText: /Apply changes/i }).first();
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();
    await pause(page, 800, 'mechanical: settle');
    await expect(page.locator('[data-cy$="-Core-Advise-button"]').first()).toBeVisible();
    await ss(page, 'G6-after-apply');
  });

  test('MB-G7 – Advanced Core: Cancel returns to Basic mode', async ({ page }) => {
    await enterCustomize(page);
    const cancelBtn = page.locator('.toolmenu-panel button').filter({ hasText: /^\s*Cancel\s*$/ }).first();
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    await pause(page, 800, 'mechanical: settle');
    await expect(page.locator('[data-cy$="-Core-Advise-button"]').first()).toBeVisible();
    await ss(page, 'G7-after-cancel');
  });
});
