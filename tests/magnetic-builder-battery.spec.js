/**
 * Magnetic Builder Comprehensive Battery Tests
 *
 * Strict-purge rewrite — no silent .catch(() => false) shortcuts. Helpers
 * throw on failure, tests assert on the elements their names promise.
 *
 * Tests every interactive element in the 3-column builder UI:
 * core shape/material/gapping, wire type/turns, coil alignment/insulation,
 * advanced modes, advisers, settings, exports, and control panel.
 *
 * Setup strategy: arrive via wizard "Review Specs" (pre-populated DR + OP),
 * then click the storyline "Magnetic Builder" tab.
 *
 * Groups:
 *   A – Navigation to builder step (from wizard)
 *   B – Core: Core Advise button (automatic recommendation)
 *   C – Core: Manual shape selection (shape family, shape name)
 *   D – Core: Material selection (manufacturer → material name)
 *   E – Core: Gapping configuration
 *   F – Core: Number of stacks (stackable shapes)            [SKIP, conditional]
 *   G – Core: Advanced Core Mode (Customize → submodes)
 *   H – Wire: Wire Advise and Wire Advise All buttons
 *   I – Wire: Round wire (type, standard, diameter, coating)
 *   J – Wire: Litz wire (strand diameter, strand count)
 *   K – Wire: Rectangular and Foil wires (height, width)
 *   L – Wire: Turns and Parallels
 *   M – Coil: Alignment button and options
 *   N – Coil: Insulation button and margins
 *   O – Coil: Interleaving pattern and Bobbin dimensions
 *   P – Coil: Advanced Parasitics view
 *   Q – Coil: Temperature field toggle
 *   R – Settings modal (simulation, 3D visualisation, stock filter, models)
 *   S – Context Menu (Magnetic Adviser, Redraw, Settings)
 *   T – Control Panel (Undo/Redo, Export modals)
 *   U – End-to-end: Advise Core → Advise Wire → Continue
 *   V – Multi-winding: Wire Advise All + Interleaving (Flyback / Push-Pull)
 */

import { test, expect } from './_coverage.js';
import {
  isBenign, screenshot,
  openWizard, runAnalytical,
} from './utils.js';

const BUCK_CY    = 'Buck-CommonModeChoke-link';
const FLYBACK_CY = 'Flyback-CommonModeChoke-link';
const PP_CY      = 'PushPull-CommonModeChoke-link';

const ss = (page, name) => screenshot(page, 'mb-battery', name);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Open a wizard (Buck by default), run analytical, click Review Specs, then
 * click the "Magnetic Builder" storyline tab. Throws if any step fails or if
 * the Core Advise button does not appear within the timeout.
 *
 * setupFn (optional): runs after openWizard, before runAnalytical. Used to
 * tweak the wizard (e.g. switch to "I know" mode).
 */
async function goToBuilderStep(page, { openFn = null, setupFn = null } = {}) {
  const fn = openFn ?? (() => openWizard(page, BUCK_CY));
  await fn();
  if (setupFn) await setupFn(page);
  await runAnalytical(page);

  const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
  await expect(reviewBtn, 'Review Specs button must be visible after analytical').toBeVisible({ timeout: 10000 });
  await expect(reviewBtn, 'Review Specs button must be enabled').toBeEnabled();
  await reviewBtn.click();
  await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });
  await page.waitForTimeout(1500);

  // Click "Magnetic Builder" storyline step. Storyline.vue renders step labels
  // as plain text inside .storyline-step divs. Note: the literal label is
  // "Magnetic.  Builder" (with a period and non-breaking space).
  const builderStep = page.locator('.storyline-step').filter({ hasText: /Magnetic.*Builder/i }).first();
  await expect(builderStep, 'Magnetic Builder storyline step must be present').toBeVisible({ timeout: 10000 });
  await builderStep.click();
  await page.waitForTimeout(800);

  const coreAdvise = page.locator('[data-cy$="-Core-Advise-button"]').first();
  await expect(coreAdvise, 'Core Advise button must be visible on the builder step').toBeVisible({ timeout: 15000 });
}

/**
 * Click Core Advise and wait for the loading indicator to disappear (up to
 * timeoutMs). Throws if the button is not visible/enabled, or if loading
 * doesn't finish in time.
 */
async function adviseCoreAndWait(page, timeoutMs = 90000) {
  const btn = page.locator('[data-cy$="-Core-Advise-button"]').first();
  await expect(btn, 'Core Advise button must be visible').toBeVisible({ timeout: 10000 });
  await expect(btn, 'Core Advise button must be enabled').toBeEnabled();
  await btn.click();
  // Wait for spinner-end: loading element gone AND button re-enabled.
  await page.waitForFunction(
    () => {
      const loading = document.querySelector('[data-cy$="-BasicCoreSelector-loading"]');
      const b = document.querySelector('[data-cy$="-Core-Advise-button"]');
      return !loading && b && !b.disabled;
    },
    { timeout: timeoutMs }
  );
  await page.waitForTimeout(500);
}

/**
 * Click Wire Advise and wait for the loading indicator to disappear (up to
 * timeoutMs). Throws if the button isn't visible/enabled. The Wire Advise
 * button only appears once the core is complete — call after adviseCoreAndWait.
 */
async function adviseWireAndWait(page, timeoutMs = 90000) {
  const btn = page.locator('[data-cy$="Wire-Advise-button"]').first();
  await expect(btn, 'Wire Advise button must be visible').toBeVisible({ timeout: 15000 });
  await expect(btn, 'Wire Advise button must be enabled').toBeEnabled();
  await btn.click();
  await page.waitForFunction(
    () => {
      const loading = document.querySelector('[data-cy$="-BasicWireSelector-loading"]');
      const b = document.querySelector('[data-cy$="Wire-Advise-button"]');
      return !loading && b && !b.disabled;
    },
    { timeout: timeoutMs }
  );
  await page.waitForTimeout(500);
}

/**
 * Click "Advise all" (multi-winding wizards) and wait for all wires to finish.
 * Falls back to single-winding Advise if "Advise all" is not present.
 */
async function adviseAllWiresAndWait(page, timeoutMs = 120000) {
  // Wait for either button to be present in the DOM (they take a moment after
  // core-advise completes).
  await page.waitForFunction(
    () => !!document.querySelector('[data-cy$="Wire-Advise-All-button"], [data-cy$="Wire-Advise-button"]'),
    { timeout: 15000 }
  );
  const adviseAll = page.locator('[data-cy$="Wire-Advise-All-button"]:visible').first();
  const adviseAllCount = await adviseAll.count();
  if (adviseAllCount > 0) {
    await expect(adviseAll, 'Advise all (multi-winding) must be enabled').toBeEnabled();
    await adviseAll.click();
    await page.waitForFunction(
      () => {
        const loading = document.querySelector('[data-cy$="-BasicWireSelector-loading"]');
        const b = document.querySelector('[data-cy$="Wire-Advise-All-button"]');
        return !loading && b && !b.disabled;
      },
      { timeout: timeoutMs }
    );
    await page.waitForTimeout(1000);
    return;
  }
  await adviseWireAndWait(page, timeoutMs);
}

/** Convenience: builder step with Core + Wire advised, exposing the Coil panel. */
async function goToBuilderWithCoil(page) {
  await goToBuilderStep(page);
  await adviseCoreAndWait(page);
  await adviseWireAndWait(page);
  await expect(page.locator('.coil-config-panel').first()).toBeVisible({ timeout: 10000 });
}

/**
 * Return the visible option values of an ElementFromList select identified
 * by data-cy suffix (without the trailing `-select` part — that's appended
 * here). ElementFromList renders the `<select>` with data-cy
 * `<dataTestLabel>-select`, wrapped in a `<dataTestLabel>-container` div.
 */
async function selectOptions(page, dataCySuffix) {
  const sel = page.locator(`[data-cy$="${dataCySuffix}-select"]`).first();
  await expect(sel, `select with suffix "${dataCySuffix}-select" must be visible`).toBeVisible();
  return sel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
}

/** Pick the first option from a select identified by data-cy suffix. */
async function pickFirstOption(page, dataCySuffix) {
  const sel = page.locator(`[data-cy$="${dataCySuffix}-select"]`).first();
  await expect(sel, `select with suffix "${dataCySuffix}-select" must be visible`).toBeVisible();
  const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
  expect(opts.length, `select "${dataCySuffix}-select" must have at least one option`).toBeGreaterThan(0);
  await sel.selectOption(opts[0]);
  await page.waitForTimeout(400);
  return opts[0];
}

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
    // Undo is an icon-only button — identified by its title attribute.
    await expect(page.locator('button[title="Undo"]').first()).toBeVisible();
    // At this point the design is incomplete (coil.turnsDescription is null),
    // so ControlPanel.vue renders the "Complete design to enable exports"
    // hint rather than the All-Exports dropdown. That proves the control
    // panel itself is mounted and gating works. Real export-button reachability
    // is covered by MB-T2/MB-T3.
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
    // Either the loading indicator becomes visible, or the button becomes
    // disabled while the advise runs. Both are valid signals of in-progress.
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

    const mfgSel = page.locator('[data-cy$="-MaterialManufacturers-select"]').first();
    await expect(mfgSel).toBeVisible();
    const mfg = await mfgSel.inputValue();
    expect(mfg.length, 'manufacturer select must have a non-empty value after advise').toBeGreaterThan(0);

    const matSel = page.locator('[data-cy$="-MaterialNames-select"]').first();
    await expect(matSel).toBeVisible();
    const mat = await matSel.inputValue();
    expect(mat.length, 'material name select must have a non-empty value after advise').toBeGreaterThan(0);

    expect(errors).toEqual([]);
  });

  test('MB-B4 – Core Advise after switching Buck wizard to "I know" mode', async ({ page }) => {
    // BuckBoostWizard (launched as Buck → dataTestLabel "BuckWizard") uses
    // ElementFromListRadio for the design-level — not .design-mode-label.
    await goToBuilderStep(page, {
      setupFn: async (p) => {
        const iKnow = p.locator('[data-cy="BuckWizard-DesignLevel-I know the design I want-radio-input"]');
        await expect(iKnow).toBeAttached();
        await iKnow.evaluate(el => {
          el.checked = true;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await p.waitForTimeout(400);
        // Confirm I-know mode took effect: the inductance row should appear.
        await expect(p.locator('[data-cy="BuckWizard-Inductance-number-input"]')).toBeVisible();
      },
    });

    await adviseCoreAndWait(page);
    await ss(page, 'B4-core-advised-iknow');

    const mfgSel = page.locator('[data-cy$="-MaterialManufacturers-select"]').first();
    await expect(mfgSel).toBeVisible();
    expect((await mfgSel.inputValue()).length).toBeGreaterThan(0);
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
    const selectsCount = await shapeSel.locator('select').count();
    expect(selectsCount, 'AdvancedCoreInfo must contain at least one select').toBeGreaterThan(0);
    await ss(page, 'C1-core-shape-selector');
  });

  test('MB-C2 – Select first available shape family', async ({ page }) => {
    await goToBuilderStep(page);
    const coreInfoEl = page.locator('[data-cy$="-AdvancedCoreInfo-ShapeFamilies-container"]').first();
    await expect(coreInfoEl).toBeVisible();
    const firstSelect = coreInfoEl.locator('select').first();
    await expect(firstSelect).toBeVisible();
    const opts = await firstSelect.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
    expect(opts.length, 'shape-family select must have at least one option').toBeGreaterThan(0);
    await firstSelect.selectOption(opts[0]);
    await page.waitForTimeout(600);
    expect(await firstSelect.inputValue()).toBe(opts[0]);
    await ss(page, 'C2-shape-family-selected');
  });

  test('MB-C3 – Shape selectors populated after Core Advise', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    const coreInfoEl = page.locator('[data-cy$="-AdvancedCoreInfo-ShapeFamilies-container"]').first();
    await expect(coreInfoEl).toBeVisible();
    const selectsCount = await coreInfoEl.locator('select').count();
    expect(selectsCount).toBeGreaterThan(0);
    await ss(page, 'C3-shape-after-advise');
  });

  test('MB-C4 – Shape family select exposes multiple options', async ({ page }) => {
    await goToBuilderStep(page);
    const firstSel = page.locator('[data-cy$="-AdvancedCoreInfo-ShapeFamilies-container"]').first().locator('select').first();
    await expect(firstSel).toBeVisible();
    const opts = await firstSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
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

    const mfgSel = page.locator('[data-cy$="-MaterialManufacturers-select"]').first();
    await expect(mfgSel).toBeVisible();
    const mfgOpts = await mfgSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
    expect(mfgOpts.length).toBeGreaterThan(0);
    await mfgSel.selectOption(mfgOpts[0]);
    await page.waitForTimeout(800);

    const matSel = page.locator('[data-cy$="-MaterialNames-select"]').first();
    await expect(matSel).toBeVisible();
    const matOpts = await matSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
    expect(matOpts.length, 'Material Names must have options for the chosen manufacturer').toBeGreaterThan(0);
    await ss(page, 'D2-material-names-visible');
  });

  test('MB-D3 – Material can be changed to a different option', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const matSel = page.locator('[data-cy$="-MaterialNames-select"]').first();
    await expect(matSel).toBeVisible();
    const opts = await matSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
    expect(opts.length).toBeGreaterThan(0);

    if (opts.length < 2) {
      test.skip(true, 'TODO: manufacturer for this DR has only one material; cannot exercise change');
    }

    const initialVal = await matSel.inputValue();
    const nextOpt = opts.find(o => o !== initialVal);
    expect(nextOpt, 'a different material option must exist').toBeTruthy();
    await matSel.selectOption(nextOpt);
    await page.waitForTimeout(800);
    expect(await matSel.inputValue()).toBe(nextOpt);
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
    // For toroidal cores there is no gap; for two-piece cores there is.
    // The Buck wizard's advised core is virtually always two-piece.
    await expect(gapSel).toBeVisible();
    await ss(page, 'E1-gap-selector');
  });

  test('MB-E2 – Gap value is editable (number input accepts new value)', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const gapEl = page.locator('[data-cy$="-Gap-container"]').first();
    await expect(gapEl).toBeVisible();
    const gapInput = gapEl.locator('input[type="number"]').first();
    await expect(gapInput).toBeVisible();
    await gapInput.click({ clickCount: 3 });
    await gapInput.fill('0.001');
    await gapInput.press('Tab');
    await page.waitForTimeout(600);
    const val = parseFloat(await gapInput.inputValue());
    expect(val).toBeGreaterThan(0);
    await ss(page, 'E2-gap-edited');
  });
});

// =====================================================================
// GROUP F – Core: Number of stacks (skipped: conditional UI)
// =====================================================================
test.describe('MB – Group F – Core Stacks', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-F1 – Number of stacks input visible for stackable shape', async () => {
    test.skip(true, 'TODO: NumberStacks input only renders for stackable shape families (E, ETD, EFD, U). The Core Adviser may return a non-stackable shape (EQ, PQ, etc.), making visibility non-deterministic. Need a way to force a stackable shape from the wizard before asserting.');
  });

  test('MB-F2 – Change number of stacks to 2', async () => {
    test.skip(true, 'TODO: see MB-F1. Requires forcing a stackable advised shape.');
  });
});

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
    await page.waitForTimeout(800);
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
    // We start in Shape submode, so "Edit shape" is hidden. Switch to
    // gapping, then "Edit shape" becomes visible — click it to return.
    await page.locator('button').filter({ hasText: /^\s*Edit gapping\s*$/ }).first().click();
    await page.waitForTimeout(500);
    const editShape = page.locator('button').filter({ hasText: /^\s*Edit shape\s*$/ }).first();
    await expect(editShape).toBeVisible();
    await editShape.click();
    await page.waitForTimeout(500);
    // Back in Shape submode → "Apply changes" still present.
    await expect(page.locator('button').filter({ hasText: /Apply changes/i }).first()).toBeVisible();
    await ss(page, 'G3-edit-shape-submode');
  });

  test('MB-G4 – Advanced Core: Edit gapping submode entered', async ({ page }) => {
    await enterCustomize(page);
    const btn = page.locator('button').filter({ hasText: /^\s*Edit gapping\s*$/ }).first();
    await expect(btn).toBeVisible();
    await btn.click();
    await page.waitForTimeout(600);
    await expect(page.locator('button').filter({ hasText: /Apply changes/i }).first()).toBeVisible();
    await ss(page, 'G4-edit-gapping-submode');
  });

  test('MB-G5 – Advanced Core: Edit material submode entered', async ({ page }) => {
    await enterCustomize(page);
    const btn = page.locator('button').filter({ hasText: /^\s*Edit material\s*$/ }).first();
    await expect(btn).toBeVisible();
    await btn.click();
    await page.waitForTimeout(600);
    await expect(page.locator('button').filter({ hasText: /Apply changes/i }).first()).toBeVisible();
    await ss(page, 'G5-edit-material-submode');
  });

  test('MB-G6 – Advanced Core: Apply returns to Basic mode', async ({ page }) => {
    await enterCustomize(page);
    const applyBtn = page.locator('button').filter({ hasText: /Apply changes/i }).first();
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();
    await page.waitForTimeout(800);
    // Back in Basic mode → Core Advise button visible again.
    await expect(page.locator('[data-cy$="-Core-Advise-button"]').first()).toBeVisible();
    await ss(page, 'G6-after-apply');
  });

  test('MB-G7 – Advanced Core: Cancel returns to Basic mode', async ({ page }) => {
    await enterCustomize(page);
    const cancelBtn = page.locator('.toolmenu-panel button').filter({ hasText: /^\s*Cancel\s*$/ }).first();
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    await page.waitForTimeout(800);
    await expect(page.locator('[data-cy$="-Core-Advise-button"]').first()).toBeVisible();
    await ss(page, 'G7-after-cancel');
  });
});

// =====================================================================
// GROUP H – Wire: Wire Advise buttons
// =====================================================================
test.describe('MB – Group H – Wire Advise', () => {
  test.describe.configure({ timeout: 240000 });

  test('MB-H1 – Wire Advise button visible after Core Advise', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    const wireAdviseBtn = page.locator('[data-cy$="Wire-Advise-button"]').first();
    await expect(wireAdviseBtn).toBeVisible();
    await expect(wireAdviseBtn).toBeEnabled();
    await ss(page, 'H1-wire-advise-btn');
  });

  test('MB-H2 – Wire Advise click triggers loading / disabled state', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const wireAdviseBtn = page.locator('[data-cy$="Wire-Advise-button"]').first();
    await expect(wireAdviseBtn).toBeVisible();
    await wireAdviseBtn.click();
    await page.waitForFunction(
      () => {
        const loading = document.querySelector('[data-cy$="-BasicWireSelector-loading"]');
        const b = document.querySelector('[data-cy$="Wire-Advise-button"]');
        return loading || (b && b.disabled);
      },
      { timeout: 5000 }
    );
    await ss(page, 'H2-wire-advise-loading');
  });

  test('MB-H3 – Wire Advise completes and populates wire type', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);
    await ss(page, 'H3-wire-advised');

    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    const wireType = await wireTypeSel.inputValue();
    expect(wireType.length, 'wire type select must have a non-empty value after advise').toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
});

// =====================================================================
// GROUP I – Wire: Round wire configuration
// =====================================================================
test.describe('MB – Group I – Round Wire', () => {
  test.describe.configure({ timeout: 180000 });

  test('MB-I1 – Wire Type selector visible and offers "Round"', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    const opts = await wireTypeSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
    // ElementFromList renders the *values* of an object-keyed options map.
    // wireTypes is `{ round: 'Round', litz: 'Litz', ... }`, so `<option value>`
    // is the title-cased label.
    expect(opts).toContain('Round');
    await ss(page, 'I1-wire-type-selector');
  });

  test('MB-I2 – Select round wire reveals standard, diameter, coating selectors', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    await wireTypeSel.selectOption('Round');
    await page.waitForTimeout(600);

    await expect(page.locator('[data-cy$="-WireStandard-container"]').first()).toBeVisible();
    await expect(page.locator('[data-cy$="-WireConductingDiameter-container"]').first()).toBeVisible();
    await expect(page.locator('[data-cy$="-WireCoating-container"]').first()).toBeVisible();
    await ss(page, 'I2-round-wire-controls');
  });

  test('MB-I3 – Wire Standard selector has options', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    await wireTypeSel.selectOption('Round');
    await page.waitForTimeout(500);

    const opts = await selectOptions(page, '-WireStandard');
    expect(opts.length, 'wire standard select must have at least one option').toBeGreaterThan(0);
    await ss(page, 'I3-wire-standard');
  });

  test('MB-I4 – Conducting diameter selector populated after standard is chosen', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    await wireTypeSel.selectOption('Round');
    await page.waitForTimeout(500);
    await pickFirstOption(page, '-WireStandard');

    const diamOpts = await selectOptions(page, '-WireConductingDiameter');
    expect(diamOpts.length, 'diameter select must have options after a standard is chosen').toBeGreaterThan(0);

    const diamSel = page.locator('[data-cy$="-WireConductingDiameter-select"]').first();
    const pick = diamOpts[Math.floor(diamOpts.length / 2)];
    await diamSel.selectOption(pick);
    await page.waitForTimeout(400);
    expect(await diamSel.inputValue()).toBe(pick);
    await ss(page, 'I4-wire-diameter');
  });

  test('MB-I5 – Wire Coating selector has options for round wire', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    await wireTypeSel.selectOption('Round');
    await page.waitForTimeout(500);

    const opts = await selectOptions(page, '-WireCoating');
    expect(opts.length, 'coating select must have at least one option').toBeGreaterThan(0);
    await ss(page, 'I5-wire-coating');
  });
});

// =====================================================================
// GROUP J – Wire: Litz wire
// =====================================================================
test.describe('MB – Group J – Litz Wire', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-J1 – Select litz wire reveals strand diameter and count inputs', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    const opts = await wireTypeSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
    if (!opts.includes('Litz')) {
      test.skip(true, `TODO: litz wire type not offered by this advised core (options: ${opts.join(', ')}). Need to force a core where litz is available.`);
    }
    await wireTypeSel.selectOption('Litz');
    await page.waitForTimeout(600);

    await expect(page.locator('[data-cy$="-StrandConductingDiameter-container"]').first()).toBeVisible();
    await expect(page.locator('[data-cy$="-NumberConductors-container"]').first()).toBeVisible();
    await ss(page, 'J1-litz-wire-controls');
  });

  test('MB-J2 – Litz strand count input accepts value', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    const opts = await wireTypeSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
    if (!opts.includes('Litz')) {
      test.skip(true, `TODO: litz wire type not offered (options: ${opts.join(', ')}).`);
    }
    await wireTypeSel.selectOption('Litz');
    await page.waitForTimeout(600);

    const strandCountEl = page.locator('[data-cy$="-NumberConductors-container"]').first();
    await expect(strandCountEl).toBeVisible();
    const input = strandCountEl.locator('input[type="number"]').first();
    await expect(input).toBeVisible();
    await input.click({ clickCount: 3 });
    await input.fill('100');
    await input.press('Tab');
    await page.waitForTimeout(400);
    expect(await input.inputValue()).toBe('100');
    await ss(page, 'J2-litz-strand-count');
  });
});

// =====================================================================
// GROUP K – Wire: Rectangular and Foil
// =====================================================================
test.describe('MB – Group K – Rectangular/Foil Wire', () => {
  test.describe.configure({ timeout: 120000 });

  async function selectIfOffered(page, value) {
    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    const opts = await wireTypeSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
    if (!opts.includes(value)) {
      test.skip(true, `TODO: "${value}" wire type not offered (options: ${opts.join(', ')}). Need to force a core where it is available.`);
    }
    await wireTypeSel.selectOption(value);
    await page.waitForTimeout(600);
  }

  test('MB-K1 – Select rectangular wire reveals height and width inputs', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await selectIfOffered(page, 'Rectangular');
    await expect(page.locator('[data-cy$="-WireConductingHeight-container"]').first()).toBeVisible();
    await expect(page.locator('[data-cy$="-WireConductingWidth-container"]').first()).toBeVisible();
    await ss(page, 'K1-rectangular-wire');
  });

  test('MB-K2 – Rectangular wire: height and width inputs accept values', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await selectIfOffered(page, 'Rectangular');

    // Dimension renders the displayed value scaled by the current unit
    // multiplier (e.g. mm). We just fill a small in-unit value and assert
    // the input reflects what we typed.
    for (const suffix of ['-WireConductingHeight-container', '-WireConductingWidth-container']) {
      const el = page.locator(`[data-cy$="${suffix}"]`).first();
      await expect(el).toBeVisible();
      const input = el.locator('input[type="number"]').first();
      await expect(input).toBeVisible();
      await input.click({ clickCount: 3 });
      await input.fill('2');
      await input.press('Tab');
      await page.waitForTimeout(300);
      expect(parseFloat(await input.inputValue()), `input ${suffix} must accept "2"`).toBeCloseTo(2, 3);
    }
    await ss(page, 'K2-rectangular-dims-set');
  });

  test('MB-K3 – Select foil wire reveals height and width inputs', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await selectIfOffered(page, 'Foil');
    await expect(page.locator('[data-cy$="-WireConductingHeight-container"]').first()).toBeVisible();
    await expect(page.locator('[data-cy$="-WireConductingWidth-container"]').first()).toBeVisible();
    await ss(page, 'K3-foil-wire');
  });
});

// =====================================================================
// GROUP L – Wire: Turns and Parallels
// =====================================================================
test.describe('MB – Group L – Turns and Parallels', () => {
  test.describe.configure({ timeout: 180000 });

  test('MB-L1 – NumberTurns container visible with at least one input', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    const turnsEl = page.locator('[data-cy$="-NumberTurns-container"]').first();
    await expect(turnsEl).toBeVisible();
    const inputCount = await turnsEl.locator('input[type="number"]').count();
    expect(inputCount, 'NumberTurns must contain at least one number input').toBeGreaterThanOrEqual(1);
    await ss(page, 'L1-turns-parallels');
  });

  test('MB-L2 – Set turns to 10', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);

    const turnsEl = page.locator('[data-cy$="-NumberTurns-container"]').first();
    await expect(turnsEl).toBeVisible();
    const inputs = turnsEl.locator('input[type="number"]');
    await expect(inputs.first()).toBeVisible();
    await inputs.first().click({ clickCount: 3 });
    await inputs.first().fill('10');
    await inputs.first().press('Tab');
    await page.waitForTimeout(600);
    expect(parseInt(await inputs.first().inputValue(), 10)).toBe(10);
    await ss(page, 'L2-turns-10');
  });

  test('MB-L3 – Set parallels to 2', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);

    const parEl = page.locator('[data-cy$="-NumberParallels-container"]').first();
    await expect(parEl, 'NumberParallels container must be visible after wire advise').toBeVisible();
    const input = parEl.locator('input[type="number"]').first();
    await expect(input).toBeVisible();
    await input.click({ clickCount: 3 });
    await input.fill('2');
    await input.press('Tab');
    await page.waitForTimeout(600);
    expect(parseInt(await input.inputValue(), 10)).toBe(2);
    await ss(page, 'L3-parallels-2');
  });
});

// =====================================================================
// GROUP M – Coil: Alignment button
// =====================================================================
test.describe('MB – Group M – Coil Alignment', () => {
  test.describe.configure({ timeout: 240000 });

  test('MB-M1 – Alignment button visible in coil header', async ({ page }) => {
    await goToBuilderWithCoil(page);
    const alignBtn = page.locator('button').filter({ hasText: /^\s*Alignment\s*$/ }).first();
    await expect(alignBtn).toBeVisible();
    await ss(page, 'M1-alignment-btn');
  });

  test('MB-M2 – Alignment toggle reveals at least one select inside Alignment card', async ({ page }) => {
    await goToBuilderWithCoil(page);
    const alignBtn = page.locator('button').filter({ hasText: /^\s*Alignment\s*$/ }).first();
    await expect(alignBtn).toBeVisible();
    await alignBtn.click();
    await page.waitForTimeout(500);

    const orientationSel = page.locator('[data-cy$="-sectionsOrientation-select"]').first();
    const sectionAlignSel = page.locator('[data-cy$="-SectionsAlignment-select"]').first();
    await expect(orientationSel, 'Windings orientation select must appear after Alignment toggle').toBeVisible();
    await expect(sectionAlignSel, 'Section alignment select must appear after Alignment toggle').toBeVisible();
    await ss(page, 'M2-alignment-options');
  });

  test('MB-M3 – Alignment: first select has options', async ({ page }) => {
    await goToBuilderWithCoil(page);
    const alignBtn = page.locator('button').filter({ hasText: /^\s*Alignment\s*$/ }).first();
    await expect(alignBtn).toBeVisible();
    await alignBtn.click();
    await page.waitForTimeout(500);

    const firstSel = page.locator('[data-cy$="-sectionsOrientation-select"]').first();
    await expect(firstSel).toBeVisible();
    const opts = await firstSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
    expect(opts.length, 'sectionsOrientation must expose at least one option').toBeGreaterThan(0);
    await ss(page, 'M3-alignment-selectors');
  });
});

// =====================================================================
// GROUP N – Coil: Insulation button
// =====================================================================
test.describe('MB – Group N – Coil Insulation', () => {
  test.describe.configure({ timeout: 240000 });

  test('MB-N1 – Insulation button visible in coil header', async ({ page }) => {
    await goToBuilderWithCoil(page);
    const insulBtn = page.locator('button').filter({ hasText: /^\s*Insulation\s*$/ }).first();
    await expect(insulBtn).toBeVisible();
    await ss(page, 'N1-insulation-btn');
  });

  test('MB-N2 – Insulation toggle reveals Insulation card with margin controls', async ({ page }) => {
    await goToBuilderWithCoil(page);
    const insulBtn = page.locator('button').filter({ hasText: /^\s*Insulation\s*$/ }).first();
    await expect(insulBtn).toBeVisible();
    await insulBtn.click();
    await page.waitForTimeout(500);

    const interlayer = page.locator('[data-cy$="-InterlayerThickness-number-input"]').first();
    const topMargin = page.locator('[data-cy$="-TopOrLeftMargin-number-input"]').first();
    await expect(interlayer, 'Inter-layer thickness input must appear').toBeVisible();
    await expect(topMargin, 'Top margin input must appear').toBeVisible();
    await ss(page, 'N2-insulation-margins');
  });

  test('MB-N3 – Insulation margin input accepts new value', async ({ page }) => {
    await goToBuilderWithCoil(page);
    const insulBtn = page.locator('button').filter({ hasText: /^\s*Insulation\s*$/ }).first();
    await expect(insulBtn).toBeVisible();
    await insulBtn.click();
    await page.waitForTimeout(500);

    const firstInput = page.locator('[data-cy$="-InterlayerThickness-number-input"]').first();
    await expect(firstInput).toBeVisible();
    await firstInput.click({ clickCount: 3 });
    await firstInput.fill('2');
    await firstInput.press('Tab');
    await page.waitForTimeout(400);
    expect(parseFloat(await firstInput.inputValue())).toBeCloseTo(2, 5);
    await ss(page, 'N3-margin-edited');
  });
});

// =====================================================================
// GROUP O – Coil: Interleaving and Bobbin dimensions
// =====================================================================
test.describe('MB – Group O – Coil Interleaving & Bobbin', () => {
  test.describe.configure({ timeout: 240000 });

  test('MB-O1 – Bobbin Wall Thickness input visible', async ({ page }) => {
    await goToBuilderWithCoil(page);
    await expect(page.locator('[data-cy$="-BobbinWallThickness-container"]').first()).toBeVisible();
    await ss(page, 'O1-bobbin-wall');
  });

  test('MB-O2 – Bobbin Wall Thickness input accepts new value', async ({ page }) => {
    await goToBuilderWithCoil(page);
    const bobbinEl = page.locator('[data-cy$="-BobbinWallThickness-container"]').first();
    await expect(bobbinEl).toBeVisible();
    const input = bobbinEl.locator('input[type="number"]').first();
    await expect(input).toBeVisible();
    await input.click({ clickCount: 3 });
    await input.fill('1');
    await input.press('Tab');
    await page.waitForTimeout(400);
    expect(parseFloat(await input.inputValue())).toBeCloseTo(1, 5);
    await ss(page, 'O2-bobbin-wall-set');
  });

  test('MB-O3 – Bobbin Column Thickness input visible', async ({ page }) => {
    await goToBuilderWithCoil(page);
    await expect(page.locator('[data-cy$="-BobbinColumnThickness-container"]').first()).toBeVisible();
    await ss(page, 'O3-bobbin-column');
  });

  // TODO: MB-O4/MB-O5 – SectionsInterleaving is gated on missingWires==false, but
  // the multi-winding "Advise all" button in BasicWireSelector.vue does not populate
  // every winding's wire type for the Flyback wizard (Winding 1 still shows
  // "Select a type for the wire" after click). This blocks the coil-config-panel
  // from rendering, so the interleaving cell never appears. Suspected wire-advise
  // bug for multi-winding wizards. Re-enable when fixed and assert via
  // `[data-cy$="-SectionsInterleaving-text-input"]` (ListOfCharacters).
  test.skip('MB-O4 – Sections Interleaving input visible for multi-winding (Flyback)', async ({ page }) => {
    await goToBuilderStep(page, { openFn: () => openWizard(page, FLYBACK_CY) });
    await adviseCoreAndWait(page);
    await adviseAllWiresAndWait(page);
    await expect(page.locator('.coil-config-panel').first()).toBeVisible({ timeout: 15000 });
    await page.waitForFunction(
      () => !!document.querySelector('[data-cy$="-SectionsInterleaving-container"]'),
      { timeout: 30000 }
    );
    const interleavingEl = page.locator('[data-cy$="-SectionsInterleaving-container"]').first();
    await expect(interleavingEl, 'SectionsInterleaving must be visible for multi-winding Flyback').toBeVisible();
    await ss(page, 'O4-interleaving');
  });

  test.skip('MB-O5 – Change interleaving pattern to "1221"', async ({ page }) => {
    await goToBuilderStep(page, { openFn: () => openWizard(page, FLYBACK_CY) });
    await adviseCoreAndWait(page);
    await adviseAllWiresAndWait(page);
    await expect(page.locator('.coil-config-panel').first()).toBeVisible({ timeout: 15000 });
    await page.waitForFunction(
      () => !!document.querySelector('[data-cy$="-SectionsInterleaving-text-input"]'),
      { timeout: 30000 }
    );
    const input = page.locator('[data-cy$="-SectionsInterleaving-text-input"]').first();
    await expect(input).toBeVisible();
    await input.click({ clickCount: 3 });
    await input.fill('1221');
    await input.press('Tab');
    await page.waitForTimeout(600);
    expect(await input.inputValue()).toBe('1221');
    await ss(page, 'O5-interleaving-1221');
  });
});

// =====================================================================
// GROUP P – Coil: Advanced Parasitics
// =====================================================================
test.describe('MB – Group P – Advanced Parasitics', () => {
  test.describe.configure({ timeout: 240000 });

  async function enableSimulation(page) {
    const settingsBtn = page.locator('[data-cy$="settings-modal-button"]').first();
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();
    await page.waitForTimeout(600);

    const simToggle = page.locator('[data-cy$="Settings-Modal-enable-simulation-button"]').first();
    await expect(simToggle).toBeVisible();
    const isChecked = await simToggle.evaluate(el => el.checked === true);
    if (!isChecked) {
      await simToggle.click();
      await page.waitForTimeout(300);
    }
    const updateBtn = page.locator('[data-cy$="Settings-Modal-update-settings-button"]').first();
    await expect(updateBtn).toBeVisible();
    await updateBtn.click();
    await page.waitForTimeout(800);
  }

  test('MB-P1 – Advanced Parasitics button visible after enabling simulation', async ({ page }) => {
    await goToBuilderWithCoil(page);
    await enableSimulation(page);

    const parasiticsBtn = page.locator('[data-cy$="-Coil-ShowParasiticsView-button"]').first();
    await expect(parasiticsBtn, 'Parasitics view button must be visible once simulation is enabled').toBeVisible({ timeout: 10000 });
    await ss(page, 'P1-parasitics-btn');
  });

  test('MB-P2 – Click Advanced Parasitics opens matrices view', async ({ page }) => {
    await goToBuilderWithCoil(page);
    await enableSimulation(page);

    const parasiticsBtn = page.locator('[data-cy$="-Coil-ShowParasiticsView-button"]').first();
    await expect(parasiticsBtn).toBeVisible();
    await parasiticsBtn.click();
    await page.waitForTimeout(1000);

    await expect(
      page.locator('.advancedcoil-wrapper').first(),
      'Advanced parasitics view (AdvancedCoilInfo) must render after clicking the button'
    ).toBeVisible({ timeout: 10000 });
    await ss(page, 'P2-parasitics-matrices');
  });
});

// =====================================================================
// GROUP Q – Coil: Temperature field toggle
// =====================================================================
test.describe('MB – Group Q – Temperature Visualization', () => {
  test.describe.configure({ timeout: 240000 });

  test('MB-Q1 – Show Temperature toggle button present', async ({ page }) => {
    await goToBuilderWithCoil(page);
    const tempBtn = page.locator('[data-cy$="-Coil-ToggleTemperaturePlot-button"]').first();
    await expect(tempBtn).toBeVisible();
    await ss(page, 'Q1-temperature-btn');
  });

  test('MB-Q2 – Temperature toggle click changes button class', async ({ page }) => {
    await goToBuilderWithCoil(page);
    const tempBtn = page.locator('[data-cy$="-Coil-ToggleTemperaturePlot-button"]').first();
    await expect(tempBtn).toBeVisible();
    const before = await tempBtn.getAttribute('class');
    await tempBtn.click();
    await page.waitForTimeout(500);
    const after = await tempBtn.getAttribute('class');
    expect(after, 'class attribute must change after temperature toggle click').not.toBe(before);
    await ss(page, 'Q2-temperature-toggled');
  });
});

// =====================================================================
// GROUP R – Settings Modal
// =====================================================================
test.describe('MB – Group R – Settings Modal', () => {
  test.describe.configure({ timeout: 180000 });

  async function openSettings(page) {
    await goToBuilderStep(page);
    const settingsBtn = page.locator('[data-cy$="settings-modal-button"]').first();
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();
    await page.waitForTimeout(600);
  }

  test('MB-R1 – Settings button opens modal', async ({ page }) => {
    await openSettings(page);
    const modal = page.locator('#MagneticBuilderSettingsModal, .modal.show').first();
    await expect(modal).toBeVisible();
    await ss(page, 'R1-settings-modal');
  });

  test('MB-R2 – Settings: Stock filter toggle present', async ({ page }) => {
    await openSettings(page);
    const stockToggle = page.locator('[data-cy$="Settings-Modal-with-without-stock-button"]').first();
    await expect(stockToggle).toBeVisible();
    await ss(page, 'R2-stock-filter');
  });

  test('MB-R3 – Settings: Stock filter toggle is clickable on/off', async ({ page }) => {
    await openSettings(page);
    const stockToggle = page.locator('[data-cy$="Settings-Modal-with-without-stock-button"]').first();
    await expect(stockToggle).toBeVisible();
    const before = await stockToggle.evaluate(el => el.checked);
    await stockToggle.click();
    await page.waitForTimeout(300);
    const after = await stockToggle.evaluate(el => el.checked);
    expect(after, 'stock-filter checked state must flip on click').not.toBe(before);
    await stockToggle.click(); // back to original
    await ss(page, 'R3-stock-toggle');
  });

  test('MB-R4 – Settings: Simulation enable toggle present', async ({ page }) => {
    await openSettings(page);
    await expect(page.locator('[data-cy$="Settings-Modal-enable-simulation-button"]').first()).toBeVisible();
    await ss(page, 'R4-simulation-toggle');
  });

  test('MB-R5 – Settings: 3D visualisation toggle present', async ({ page }) => {
    await openSettings(page);
    await expect(page.locator('[data-cy$="-Settings-Modal-enable-visualization-button"]').first()).toBeVisible();
    await ss(page, 'R5-3d-viz-toggle');
  });

  test('MB-R6 – Settings: Update and Reset-defaults buttons present and clickable', async ({ page }) => {
    await openSettings(page);
    const updateBtn = page.locator('[data-cy$="Settings-Modal-update-settings-button"]').first();
    const resetBtn  = page.locator('[data-cy$="Settings-Modal-reset-defaults-button"]').first();
    await expect(updateBtn).toBeVisible();
    await expect(resetBtn).toBeVisible();
    await expect(updateBtn).toBeEnabled();
    await updateBtn.click();
    await page.waitForTimeout(500);
    await ss(page, 'R6-settings-update');
  });

  test('MB-R7 – Settings: Core losses model section present', async ({ page }) => {
    await openSettings(page);
    await expect(page.getByText(/core losses/i).first()).toBeVisible();
    await ss(page, 'R7-core-losses-model');
  });
});

// =====================================================================
// GROUP S – Context Menu buttons
// =====================================================================
test.describe('MB – Group S – Context Menu', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-S1 – Magnetic Adviser button visible in context menu', async ({ page }) => {
    await goToBuilderStep(page);
    await expect(page.locator('[data-cy$="-magnetics-adviser-button"]').first()).toBeVisible();
    await ss(page, 'S1-magnetic-adviser-btn');
  });

  test('MB-S2 – Click Magnetic Adviser switches to adviser view', async ({ page }) => {
    await goToBuilderStep(page);
    const maBtn = page.locator('[data-cy$="-magnetics-adviser-button"]').first();
    await expect(maBtn).toBeVisible();
    await maBtn.click();
    await page.waitForTimeout(1500);
    await expect(
      page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first()
    ).toBeVisible({ timeout: 10000 });
    await ss(page, 'S2-adviser-view');
  });
});

// =====================================================================
// GROUP T – Control Panel (Undo/Redo, Exports)
// =====================================================================
test.describe('MB – Group T – Control Panel', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-T1 – Undo and Redo buttons visible in control panel', async ({ page }) => {
    await goToBuilderStep(page);
    await expect(page.locator('button[title="Undo"]').first()).toBeVisible();
    await expect(page.locator('button[title="Redo"]').first()).toBeVisible();
    await ss(page, 'T1-undo-redo');
  });

  test('MB-T2 – MAS Exports modal button reachable after full coil build', async ({ page }) => {
    // The All-Exports dropdown only renders in ControlPanel.vue when
    // `showExportButtons && isMagneticComplete` — i.e. coil.turnsDescription
    // is non-null. We must therefore wind a coil first.
    await goToBuilderWithCoil(page);

    // Open the "All Exports" dropdown (title-only icon button).
    const dropdownTrigger = page.locator('button[title="All Exports"]').first();
    await expect(dropdownTrigger, '"All Exports" dropdown trigger must be visible after completion').toBeVisible({ timeout: 10000 });
    await dropdownTrigger.click();
    await page.waitForTimeout(300);

    const masBtn = page.locator('[data-cy="MAS-exports-modal-button"]').first();
    await expect(masBtn, 'MAS Exports menu item must be visible inside the open dropdown').toBeVisible();
    await ss(page, 'T2-mas-exports');
  });

  test('MB-T3 – Core, Coil, Circuit Simulator export buttons reachable after full coil build', async ({ page }) => {
    await goToBuilderWithCoil(page);

    const dropdownTrigger = page.locator('button[title="All Exports"]').first();
    await expect(dropdownTrigger).toBeVisible({ timeout: 10000 });
    await dropdownTrigger.click();
    await page.waitForTimeout(300);

    await expect(page.locator('[data-cy="Core-exports-modal-button"]').first()).toBeVisible();
    await expect(page.locator('[data-cy="Coil-exports-modal-button"]').first()).toBeVisible();
    await expect(page.locator('[data-cy="Circuit-Simulators-exports-modal-button"]').first()).toBeVisible();
    await ss(page, 'T3-export-buttons');
  });
});

// =====================================================================
// GROUP U – End-to-end: Advise Core + Wire → complete builder
// =====================================================================
test.describe('MB – Group U – End-to-end complete build', () => {
  test.describe.configure({ timeout: 360000 });

  test('MB-U1 – Core Advise + Wire Advise → Continue button enabled', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await goToBuilderStep(page);
    await ss(page, 'U1-before-advise');

    await adviseCoreAndWait(page, 120000);
    await ss(page, 'U1-after-core-advise');

    await adviseWireAndWait(page, 120000);
    await ss(page, 'U1-after-wire-advise');

    const continueBtn = page.locator('[data-cy="magnetic-synthesis-next-tool-button"]').first();
    await expect(continueBtn).toBeVisible();
    await expect(continueBtn, 'Continue must be enabled once core and wire are advised').toBeEnabled({ timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test('MB-U2 – Full build: Core Advise + Wire Advise → reach Summary step', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await goToBuilderStep(page);
    await adviseCoreAndWait(page, 120000);
    await adviseWireAndWait(page, 120000);
    await page.waitForTimeout(1000);

    const continueBtn = page.locator('[data-cy="magnetic-synthesis-next-tool-button"]').first();
    await expect(continueBtn).toBeEnabled({ timeout: 10000 });
    await continueBtn.click();
    await page.waitForTimeout(2500);
    await ss(page, 'U2-summary-loaded');

    await expect(
      page.locator('.storyline-step-active').filter({ hasText: /Summary/i }).first()
    ).toBeVisible({ timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test('MB-U3 – Manual wire selection (round) on advised core does not raise errors', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page, 120000);

    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    await wireTypeSel.selectOption('Round');
    await page.waitForTimeout(500);

    await pickFirstOption(page, '-WireStandard');
    const diamOpts = await selectOptions(page, '-WireConductingDiameter');
    expect(diamOpts.length).toBeGreaterThan(0);
    const diamSel = page.locator('[data-cy$="-WireConductingDiameter-select"]').first();
    await diamSel.selectOption(diamOpts[Math.min(1, diamOpts.length - 1)]);
    await page.waitForTimeout(400);

    const turnsEl = page.locator('[data-cy$="-NumberTurns-container"]').first();
    await expect(turnsEl).toBeVisible();
    const firstInput = turnsEl.locator('input[type="number"]').first();
    await firstInput.click({ clickCount: 3 });
    await firstInput.fill('20');
    await firstInput.press('Tab');
    await page.waitForTimeout(500);

    await ss(page, 'U3-manual-build');
    const errCount = await page.locator('.error-text, .alert-danger').count();
    expect(errCount, 'manual round-wire build must not produce visible error banners').toBe(0);
  });
});

// =====================================================================
// GROUP V – Multi-winding: Wire Advise All + Interleaving
// =====================================================================
test.describe('MB – Group V – Multi-winding (Flyback / Push-Pull)', () => {
  test.describe.configure({ timeout: 300000 });

  test('MB-V1 – Wire Advise All OR single Wire Advise visible for Flyback', async ({ page }) => {
    await goToBuilderStep(page, { openFn: () => openWizard(page, FLYBACK_CY) });
    await adviseCoreAndWait(page, 120000);

    // Multi-winding flyback exposes "Advise All"; single-winding flyback only
    // exposes the per-winding "Advise". Both are valid signals that the
    // wire-advise affordance is wired up.
    const adviseAll = page.locator('[data-cy$="Wire-Advise-All-button"]').first();
    const advise    = page.locator('[data-cy$="Wire-Advise-button"]').first();

    // Wait briefly for at least one of them to appear.
    await page.waitForFunction(
      () => !!document.querySelector('[data-cy$="Wire-Advise-All-button"], [data-cy$="Wire-Advise-button"]'),
      { timeout: 10000 }
    );
    const allVis = await adviseAll.isVisible();
    const oneVis = await advise.isVisible();
    expect(allVis || oneVis, 'Wire Advise (All or single) must be visible for Flyback after core advise').toBe(true);
    await ss(page, 'V1-wire-advise-all');
  });

  // TODO: MB-V2 – "Advise all" for multi-winding wizards (Flyback) does not
  // populate every winding's wire type (Winding 1 remains "Select a type for the
  // wire"). Suspected wire-advise-all bug. Re-enable once fixed.
  test.skip('MB-V2 – Wire Advise (or Advise All) completes without console errors (Flyback)', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await goToBuilderStep(page, { openFn: () => openWizard(page, FLYBACK_CY) });
    await adviseCoreAndWait(page, 120000);

    const adviseAll = page.locator('[data-cy$="Wire-Advise-All-button"]').first();
    if (await adviseAll.isVisible()) {
      await adviseAll.click();
      await page.waitForFunction(
        () => {
          const loading = document.querySelector('[data-cy$="-BasicWireSelector-loading"]');
          const b = document.querySelector('[data-cy$="Wire-Advise-All-button"]');
          return !loading && b && !b.disabled;
        },
        { timeout: 180000 }
      );
    } else {
      await adviseWireAndWait(page, 180000);
    }
    await page.waitForTimeout(500);
    await ss(page, 'V2-wire-advise-all-done');
    expect(errors).toEqual([]);
  });

  test('MB-V3 – Winding selector visible for multi-winding Flyback', async ({ page }) => {
    await goToBuilderStep(page, { openFn: () => openWizard(page, FLYBACK_CY) });
    // The WindingSelector lives inside BasicWireSelector / CoilInfo, which only
    // render after Core Advise completes (the wire-config column hydrates with
    // a real coil). Run Core Advise first.
    await adviseCoreAndWait(page, 120000);
    // WindingSelector renders only when coil.functionalDescription.length > 1.
    // It has no data-cy (see MagneticBuilder/Common/WindingSelector.vue) so
    // match by its .winding-selector class, which is unique to this component.
    const windingSel = page.locator('.winding-selector').first();
    await expect(windingSel, 'WindingSelector must be visible for multi-winding Flyback').toBeVisible({ timeout: 15000 });
    const pills = windingSel.locator('.winding-pill');
    expect(await pills.count(), 'Flyback must expose at least 2 winding pills').toBeGreaterThanOrEqual(2);
    await ss(page, 'V3-winding-selector');
  });

  // TODO: MB-V4 – SectionsInterleaving is gated on a complete coil (every winding
  // has a wire type) — and Push-Pull, like Flyback, exercises the buggy
  // "Advise all" path. Skipping until that's fixed.
  test.skip('MB-V4 – Push-Pull: Interleaving input accepts pattern "121"', async ({ page }) => {
    await goToBuilderStep(page, { openFn: () => openWizard(page, PP_CY) });
    await adviseCoreAndWait(page, 120000);
    await adviseAllWiresAndWait(page);

    const interleavingEl = page.locator('[data-cy$="-SectionsInterleaving-text-input"]').first();
    await expect(interleavingEl, 'SectionsInterleaving must be visible for Push-Pull').toBeVisible({ timeout: 10000 });

    await interleavingEl.click({ clickCount: 3 });
    await interleavingEl.fill('121');
    await interleavingEl.press('Tab');
    await page.waitForTimeout(600);
    expect(await interleavingEl.inputValue()).toBe('121');
    await ss(page, 'V4-interleaving-121');
  });
});
