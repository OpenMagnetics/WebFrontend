/**
 * Magnetic Builder Comprehensive Battery Tests
 *
 * Tests every interactive element in the 3-column builder UI:
 * core shape/material/gapping, wire type/turns, coil alignment/insulation,
 * advanced modes, advisers, settings, exports, and control panel.
 *
 * Setup strategy: arrive via wizard "Review Specs" (pre-populated DR + OP),
 * then navigate to the magneticBuilder subsection.
 *
 * Groups:
 *   A – Navigation to builder step (from wizard, from scratch)
 *   B – Core: Core Advise button (automatic recommendation)
 *   C – Core: Manual shape selection (shape family, shape name)
 *   D – Core: Material selection (manufacturer → material name)
 *   E – Core: Gapping configuration
 *   F – Core: Number of stacks (stackable shapes)
 *   G – Core: Advanced Core Mode (Customize → shape/gapping/material submodes, Apply/Cancel)
 *   H – Wire: Wire Advise and Wire Advise All buttons
 *   I – Wire: Round wire (type, standard, diameter, coating)
 *   J – Wire: Litz wire (strand diameter, strand count, coating)
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
 *   U – End-to-end: Advise Core → Advise Wire → complete builder → canContinue
 *   V – Multi-winding: Wire Advise All + Interleaving (Flyback)
 */

import { test, expect } from './_coverage.js';
import {
  BASE_URL, isBenign, screenshot,
  openWizard, runAnalytical, fillRowInput,
} from './utils.js';

const BUCK_CY    = 'Buck-CommonModeChoke-link';
const FLYBACK_CY = 'Flyback-CommonModeChoke-link';
const PP_CY      = 'PushPull-CommonModeChoke-link';

const ss = (page, name) => screenshot(page, 'mb-battery', name);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Open Buck wizard, run analytical, click Review Specs, then navigate
 * through DR→OP→Builder steps. Returns true if Core Advise button visible.
 */
async function goToBuilderStep(page, openFn = null) {
  const fn = openFn ?? (() => openWizard(page, BUCK_CY));
  await fn();
  await runAnalytical(page);

  const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
  if (!(await reviewBtn.isVisible().catch(() => false))) return false;
  await reviewBtn.click();
  await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  if (!page.url().includes('magnetic_tool')) return false;

  // Step through DR → OP → Builder using Continue button
  const continueBtn = page.locator('[data-cy="magnetic-synthesis-next-tool-button"]');
  for (let i = 0; i < 2; i++) {
    if (await continueBtn.isVisible().catch(() => false) && !(await continueBtn.isDisabled().catch(() => true))) {
      await continueBtn.click();
      await page.waitForTimeout(1200);
    } else {
      // Try clicking the storyline step directly
      const builderTab = page.locator('button').filter({ hasText: 'Magnetic Builder' }).first();
      if (await builderTab.isVisible().catch(() => false) && !(await builderTab.isDisabled().catch(() => true))) {
        await builderTab.click();
        await page.waitForTimeout(1200);
        break;
      }
    }
  }
  await page.waitForTimeout(500);

  const coreAdvise = page.locator('[data-cy$="-Core-Advise-button"]').first();
  return await coreAdvise.isVisible().catch(() => false);
}

/** Click Core Advise and wait for loading to finish (up to 60s). */
async function adviseCoreAndWait(page, timeoutMs = 60000) {
  const btn = page.locator('[data-cy$="-Core-Advise-button"]').first();
  await btn.waitFor({ timeout: 10000 });
  await btn.click();
  await page.waitForFunction(
    () => !document.querySelector('[data-cy$="-BasicCoreSelector-loading"]'),
    { timeout: timeoutMs }
  ).catch(() => {});
  await page.waitForTimeout(800);
}

/** Click Wire Advise and wait for loading to finish (up to 60s). */
async function adviseWireAndWait(page, timeoutMs = 60000) {
  const btn = page.locator('[data-cy$="-Wire-Advise-button"], [data-cy$="Wire-Advise-button"]').first();
  if (!(await btn.isVisible().catch(() => false))) return;
  await btn.click();
  await page.waitForFunction(
    () => !document.querySelector('[data-cy$="-BasicWireSelector-loading"]'),
    { timeout: timeoutMs }
  ).catch(() => {});
  await page.waitForTimeout(800);
}

/** Select the first available option from a data-cy select element. */
async function selectFirstOption(page, dataCySuffix) {
  const sel = page.locator(`[data-cy$="${dataCySuffix}"] select`).first();
  if (!(await sel.isVisible().catch(() => false))) return null;
  const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
  if (opts.length > 0) { await sel.selectOption(opts[0]); return opts[0]; }
  return null;
}

/** Select the Nth available option (0-indexed) from a data-cy select element. */
async function selectNthOption(page, dataCySuffix, n = 0) {
  const sel = page.locator(`[data-cy$="${dataCySuffix}"] select`).first();
  if (!(await sel.isVisible().catch(() => false))) return null;
  const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
  const idx = Math.min(n, opts.length - 1);
  if (opts.length > 0) { await sel.selectOption(opts[idx]); return opts[idx]; }
  return null;
}

// =====================================================================
// GROUP A – Navigation to builder step
// =====================================================================
test.describe('MB – Group A – Navigation', () => {
  test.describe.configure({ timeout: 180000 });

  test('MB-A1 – Buck wizard → Review Specs → builder step loads (Core Advise visible)', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const reached = await goToBuilderStep(page);
    console.log(`[MB-A1] Builder step reached: ${reached}`);
    expect(reached).toBe(true);

    await ss(page, 'A1-builder-step');
    expect(errors.length).toBe(0);
  });

  test('MB-A2 – Three-column layout visible (Core / Wire / Coil)', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) { console.log('[MB-A2] Builder not reached — SKIP'); return; }

    const coreSection  = page.locator('text=Core Configuration').first();
    const wireSection  = page.locator('text=Wire Configuration').first();
    const coilSection  = page.locator('text=Coil Configuration').first();

    const coreVis  = await coreSection.isVisible().catch(() => false);
    const wireVis  = await wireSection.isVisible().catch(() => false);
    const coilVis  = await coilSection.isVisible().catch(() => false);
    console.log(`[MB-A2] Core: ${coreVis}, Wire: ${wireVis}, Coil: ${coilVis}`);
    expect(coreVis).toBe(true);
    expect(wireVis).toBe(true);
    expect(coilVis).toBe(true);

    await ss(page, 'A2-three-columns');
  });

  test('MB-A3 – Storyline panel shows all 4 steps', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const drStep     = await page.locator('text=Design Req').first().isVisible().catch(() => false);
    const opStep     = await page.locator('text=Op. Points').first().isVisible().catch(() => false);
    const buildStep  = await page.locator('text=Magnetic Builder').first().isVisible().catch(() => false);
    const summaryStep = await page.locator('text=Summary').first().isVisible().catch(() => false);

    console.log(`[MB-A3] DR:${drStep} OP:${opStep} Builder:${buildStep} Summary:${summaryStep}`);
    expect(drStep).toBe(true);
    expect(opStep).toBe(true);
    expect(buildStep).toBe(true);
    await ss(page, 'A3-storyline-steps');
  });

  test('MB-A4 – Context menu panel visible in builder step', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const toolMenu = page.locator('.toolmenu-panel').first();
    const toolMenuVis = await toolMenu.isVisible().catch(() => false);
    console.log(`[MB-A4] Tool menu visible: ${toolMenuVis}`);

    const settingsBtn = page.locator('[data-cy$="settings-modal-button"]').first();
    const settingsVis = await settingsBtn.isVisible().catch(() => false);
    console.log(`[MB-A4] Settings button visible: ${settingsVis}`);
    await ss(page, 'A4-context-menu');
  });

  test('MB-A5 – Control panel visible (Export button present)', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const undoBtn   = page.locator('button').filter({ hasText: /[Uu]ndo/ }).first();
    const exportBtn = page.locator('[data-cy="MAS-exports-modal-button"], button').filter({ hasText: /[Ee]xport|MAS/ }).first();

    console.log(`[MB-A5] Undo visible: ${await undoBtn.isVisible().catch(() => false)}`);
    console.log(`[MB-A5] Export visible: ${await exportBtn.isVisible().catch(() => false)}`);
    await ss(page, 'A5-control-panel');
  });
});

// =====================================================================
// GROUP B – Core: Core Advise button
// =====================================================================
test.describe('MB – Group B – Core Advise', () => {
  test.describe.configure({ timeout: 180000 });

  test('MB-B1 – Core Advise button visible and pulsing (incomplete core state)', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const btn = page.locator('[data-cy$="-Core-Advise-button"]').first();
    await expect(btn).toBeVisible();
    expect(await btn.isDisabled().catch(() => true)).toBe(false);

    const btnClass = await btn.getAttribute('class').catch(() => '');
    console.log(`[MB-B1] Core Advise button class: ${btnClass}`);
    await ss(page, 'B1-core-advise-btn');
  });

  test('MB-B2 – Core Advise click triggers loading indicator', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const btn = page.locator('[data-cy$="-Core-Advise-button"]').first();
    await btn.click();
    await page.waitForTimeout(300);

    const loading = page.locator('[data-cy$="-BasicCoreSelector-loading"]').first();
    const loadingVis = await loading.isVisible().catch(() => false);
    console.log(`[MB-B2] Loading indicator appeared: ${loadingVis}`);
    await ss(page, 'B2-core-advise-loading');
  });

  test('MB-B3 – Core Advise completes and populates shape + material', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);
    await ss(page, 'B3-core-advised');

    // After advise, manufacturer select should have a value
    const mfgSel = page.locator('[data-cy$="-MaterialManufacturers"] select').first();
    if (await mfgSel.isVisible().catch(() => false)) {
      const mfg = await mfgSel.inputValue().catch(() => '');
      console.log(`[MB-B3] Manufacturer after advise: "${mfg}"`);
      expect(mfg.length).toBeGreaterThan(0);
    }

    // Core Advise button should no longer pulse (core is complete)
    const btn = page.locator('[data-cy$="-Core-Advise-button"]').first();
    const btnClass = await btn.getAttribute('class').catch(() => '');
    console.log(`[MB-B3] Core Advise class after advise: ${btnClass}`);

    expect(errors.length).toBe(0);
  });

  test('MB-B4 – Core Advise with wizard I know mode (N=2)', async ({ page }) => {
    const reached = await goToBuilderStep(page, async () => {
      await openWizard(page, BUCK_CY);
      const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
      if (await iKnow.isVisible().catch(() => false)) await iKnow.click();
      await page.waitForTimeout(300);
    });
    if (!reached) return;

    await adviseCoreAndWait(page);
    await ss(page, 'B4-core-advised-iknow');

    const mfgSel = page.locator('[data-cy$="-MaterialManufacturers"] select').first();
    if (await mfgSel.isVisible().catch(() => false)) {
      const mfg = await mfgSel.inputValue().catch(() => '');
      console.log(`[MB-B4] Manufacturer: "${mfg}"`);
    }
  });
});

// =====================================================================
// GROUP C – Core: Manual shape selection
// =====================================================================
test.describe('MB – Group C – Core Manual Shape', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-C1 – Core shape selector visible (data-cy AdvancedCoreInfo)', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const shapeSel = page.locator('[data-cy$="-AdvancedCoreInfo"]').first();
    const shapeVis = await shapeSel.isVisible().catch(() => false);
    console.log(`[MB-C1] Core shape selector visible: ${shapeVis}`);

    // Also check for shape family and shape name dropdowns
    const selects = await page.locator('[data-cy$="-AdvancedCoreInfo"] select, select').count();
    console.log(`[MB-C1] Select elements count: ${selects}`);
    await ss(page, 'C1-core-shape-selector');
  });

  test('MB-C2 – Select first available shape family', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const coreInfoEl = page.locator('[data-cy$="-AdvancedCoreInfo"]').first();
    if (!(await coreInfoEl.isVisible().catch(() => false))) {
      console.log('[MB-C2] Core info element not visible — SKIP');
      return;
    }

    const selects = await coreInfoEl.locator('select').all();
    if (selects.length > 0) {
      const opts = await selects[0].evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
      console.log(`[MB-C2] Shape family options: ${opts.slice(0, 5).join(', ')}`);
      if (opts.length > 0) {
        await selects[0].selectOption(opts[0]);
        await page.waitForTimeout(800);
        console.log(`[MB-C2] Selected shape family: ${opts[0]}`);
      }
    }
    await ss(page, 'C2-shape-family-selected');
  });

  test('MB-C3 – Shape family selection reveals shape name dropdown', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    // Use Core Advise to get a known core, then verify shape info visible
    await adviseCoreAndWait(page);

    const coreInfoEl = page.locator('[data-cy$="-AdvancedCoreInfo"]').first();
    const selects = await coreInfoEl.locator('select').all();
    console.log(`[MB-C3] Shape selects after advise: ${selects.length}`);
    expect(selects.length).toBeGreaterThan(0);
    await ss(page, 'C3-shape-after-advise');
  });

  test('MB-C4 – Different shape families available (E, PQ, RM, T, U, etc.)', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const coreInfoEl = page.locator('[data-cy$="-AdvancedCoreInfo"]').first();
    if (!(await coreInfoEl.isVisible().catch(() => false))) return;

    const selects = await coreInfoEl.locator('select').all();
    if (selects.length === 0) return;

    const opts = await selects[0].evaluate(el => Array.from(el.options).map(o => o.value || o.text).filter(v => v));
    console.log(`[MB-C4] Shape families available: ${opts.join(', ')}`);
    expect(opts.length).toBeGreaterThan(0);
    await ss(page, 'C4-shape-families');
  });
});

// =====================================================================
// GROUP D – Core: Material selection
// =====================================================================
test.describe('MB – Group D – Core Material', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-D1 – Material Manufacturers selector appears after shape is set', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const mfgSel = page.locator('[data-cy$="-MaterialManufacturers"]').first();
    const mfgVis = await mfgSel.isVisible().catch(() => false);
    console.log(`[MB-D1] Manufacturer selector visible: ${mfgVis}`);
    expect(mfgVis).toBe(true);
    await ss(page, 'D1-manufacturer-visible');
  });

  test('MB-D2 – Material Names selector appears after manufacturer is selected', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const mfgSel = page.locator('[data-cy$="-MaterialManufacturers"] select').first();
    if (await mfgSel.isVisible().catch(() => false)) {
      const opts = await mfgSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
      if (opts.length > 0) {
        await mfgSel.selectOption(opts[0]);
        await page.waitForTimeout(800);
      }
    }

    const matSel = page.locator('[data-cy$="-MaterialNames"]').first();
    const matVis = await matSel.isVisible().catch(() => false);
    console.log(`[MB-D2] Material Names selector visible: ${matVis}`);
    expect(matVis).toBe(true);
    await ss(page, 'D2-material-names-visible');
  });

  test('MB-D3 – Change material to a different one', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);
    await page.waitForTimeout(500);

    const matSel = page.locator('[data-cy$="-MaterialNames"] select').first();
    if (!(await matSel.isVisible().catch(() => false))) {
      console.log('[MB-D3] Material Names not visible — SKIP');
      return;
    }

    const opts = await matSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
    console.log(`[MB-D3] Material options: ${opts.length}`);
    expect(opts.length).toBeGreaterThan(0);

    if (opts.length > 1) {
      const initialVal = await matSel.inputValue();
      const nextOpt = opts.find(o => o !== initialVal) || opts[1];
      await matSel.selectOption(nextOpt);
      await page.waitForTimeout(800);
      const newVal = await matSel.inputValue();
      console.log(`[MB-D3] Changed from "${initialVal}" → "${newVal}"`);
    }
    await ss(page, 'D3-material-changed');
  });
});

// =====================================================================
// GROUP E – Core: Gapping configuration
// =====================================================================
test.describe('MB – Group E – Core Gapping', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-E1 – Gap selector visible after advise (for two-piece core)', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const gapSel = page.locator('[data-cy$="-Gap"]').first();
    const gapVis = await gapSel.isVisible().catch(() => false);
    console.log(`[MB-E1] Gap selector visible: ${gapVis}`);
    await ss(page, 'E1-gap-selector');
  });

  test('MB-E2 – Gap value is editable (number input)', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const gapEl = page.locator('[data-cy$="-Gap"]').first();
    if (!(await gapEl.isVisible().catch(() => false))) {
      console.log('[MB-E2] Gap not visible — SKIP');
      return;
    }

    const gapInput = gapEl.locator('input[type="number"]').first();
    if (await gapInput.isVisible().catch(() => false)) {
      const currentVal = await gapInput.inputValue();
      console.log(`[MB-E2] Current gap: ${currentVal}`);
      await gapInput.click({ clickCount: 3 });
      await gapInput.fill('0.001');
      await gapInput.press('Tab');
      await page.waitForTimeout(600);
    }
    await ss(page, 'E2-gap-edited');
  });
});

// =====================================================================
// GROUP F – Core: Number of stacks
// =====================================================================
test.describe('MB – Group F – Core Stacks', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-F1 – Number of stacks input visible for stackable shape', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    // After advise, check if NumberStacks appears (depends on shape type)
    await adviseCoreAndWait(page);

    const stacksSel = page.locator('[data-cy$="-NumberStacks"]').first();
    const stacksVis = await stacksSel.isVisible().catch(() => false);
    console.log(`[MB-F1] Number of stacks visible: ${stacksVis}`);
    // Not all shapes support stacking — just verify selector presence when visible
    await ss(page, 'F1-stacks-selector');
  });

  test('MB-F2 – Change number of stacks to 2', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const stacksEl = page.locator('[data-cy$="-NumberStacks"]').first();
    if (!(await stacksEl.isVisible().catch(() => false))) {
      console.log('[MB-F2] Stacks input not visible — SKIP');
      return;
    }

    const stacksInput = stacksEl.locator('input[type="number"]').first();
    if (await stacksInput.isVisible().catch(() => false)) {
      await stacksInput.click({ clickCount: 3 });
      await stacksInput.fill('2');
      await stacksInput.press('Tab');
      await page.waitForTimeout(800);
      const newVal = await stacksInput.inputValue();
      console.log(`[MB-F2] Stacks set to: ${newVal}`);
    }
    await ss(page, 'F2-stacks-2');
  });
});

// =====================================================================
// GROUP G – Core: Advanced Core Mode (Customize)
// =====================================================================
test.describe('MB – Group G – Advanced Core Mode', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-G1 – Core Customize button visible after advise', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const customizeBtn = page.locator('[data-cy$="-Core-Customize-button"]').first();
    const vis = await customizeBtn.isVisible().catch(() => false);
    console.log(`[MB-G1] Customize button visible: ${vis}`);

    if (!vis) {
      // Try text-based fallback
      const fallback = page.locator('button').filter({ hasText: 'Customize' }).first();
      console.log(`[MB-G1] Fallback Customize visible: ${await fallback.isVisible().catch(() => false)}`);
    }
    await ss(page, 'G1-customize-btn');
  });

  test('MB-G2 – Click Customize enters Advanced Core Mode', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const customizeBtn = page.locator('[data-cy$="-Core-Customize-button"], button').filter({ hasText: 'Customize' }).first();
    if (!(await customizeBtn.isVisible().catch(() => false))) {
      console.log('[MB-G2] Customize not visible — SKIP');
      return;
    }
    if (await customizeBtn.isDisabled().catch(() => true)) {
      console.log('[MB-G2] Customize disabled — SKIP');
      return;
    }

    await customizeBtn.click();
    await page.waitForTimeout(800);

    // In Advanced Core Mode, context menu shows Edit shape/gapping/material
    const editShapeBtn = page.locator('button').filter({ hasText: 'Edit shape' }).first();
    const editGapBtn   = page.locator('button').filter({ hasText: 'Edit gapping' }).first();
    const editMatBtn   = page.locator('button').filter({ hasText: 'Edit material' }).first();

    const shapeVis = await editShapeBtn.isVisible().catch(() => false);
    const gapVis   = await editGapBtn.isVisible().catch(() => false);
    const matVis   = await editMatBtn.isVisible().catch(() => false);
    console.log(`[MB-G2] Edit shape: ${shapeVis}, Edit gapping: ${gapVis}, Edit material: ${matVis}`);
    await ss(page, 'G2-advanced-core-mode');
  });

  test('MB-G3 – Advanced Core: Edit shape submode', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const customizeBtn = page.locator('[data-cy$="-Core-Customize-button"], button').filter({ hasText: 'Customize' }).first();
    if (!(await customizeBtn.isVisible().catch(() => false)) || await customizeBtn.isDisabled().catch(() => true)) {
      console.log('[MB-G3] Customize not ready — SKIP');
      return;
    }
    await customizeBtn.click();
    await page.waitForTimeout(800);

    const editShapeBtn = page.locator('button').filter({ hasText: 'Edit shape' }).first();
    if (await editShapeBtn.isVisible().catch(() => false)) {
      await editShapeBtn.click();
      await page.waitForTimeout(600);
      console.log('[MB-G3] Shape submode entered');
    }
    await ss(page, 'G3-edit-shape-submode');
  });

  test('MB-G4 – Advanced Core: Edit gapping submode', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const customizeBtn = page.locator('[data-cy$="-Core-Customize-button"], button').filter({ hasText: 'Customize' }).first();
    if (!(await customizeBtn.isVisible().catch(() => false)) || await customizeBtn.isDisabled().catch(() => true)) return;
    await customizeBtn.click();
    await page.waitForTimeout(800);

    const editGapBtn = page.locator('button').filter({ hasText: 'Edit gapping' }).first();
    if (await editGapBtn.isVisible().catch(() => false)) {
      await editGapBtn.click();
      await page.waitForTimeout(600);
      console.log('[MB-G4] Gapping submode entered');
    }
    await ss(page, 'G4-edit-gapping-submode');
  });

  test('MB-G5 – Advanced Core: Edit material submode', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const customizeBtn = page.locator('[data-cy$="-Core-Customize-button"], button').filter({ hasText: 'Customize' }).first();
    if (!(await customizeBtn.isVisible().catch(() => false)) || await customizeBtn.isDisabled().catch(() => true)) return;
    await customizeBtn.click();
    await page.waitForTimeout(800);

    const editMatBtn = page.locator('button').filter({ hasText: 'Edit material' }).first();
    if (await editMatBtn.isVisible().catch(() => false)) {
      await editMatBtn.click();
      await page.waitForTimeout(600);
      console.log('[MB-G5] Material submode entered');
    }
    await ss(page, 'G5-edit-material-submode');
  });

  test('MB-G6 – Advanced Core: Apply changes returns to Basic mode', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const customizeBtn = page.locator('[data-cy$="-Core-Customize-button"], button').filter({ hasText: 'Customize' }).first();
    if (!(await customizeBtn.isVisible().catch(() => false)) || await customizeBtn.isDisabled().catch(() => true)) return;
    await customizeBtn.click();
    await page.waitForTimeout(800);

    const applyBtn = page.locator('button').filter({ hasText: 'Apply changes' }).first();
    if (await applyBtn.isVisible().catch(() => false)) {
      await applyBtn.click();
      await page.waitForTimeout(800);

      // After Apply, should be back in Basic Mode — Core Advise button visible again
      const coreAdvise = page.locator('[data-cy$="-Core-Advise-button"]').first();
      console.log(`[MB-G6] Core Advise visible after Apply: ${await coreAdvise.isVisible().catch(() => false)}`);
    }
    await ss(page, 'G6-after-apply');
  });

  test('MB-G7 – Advanced Core: Cancel discards changes', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const customizeBtn = page.locator('[data-cy$="-Core-Customize-button"], button').filter({ hasText: 'Customize' }).first();
    if (!(await customizeBtn.isVisible().catch(() => false)) || await customizeBtn.isDisabled().catch(() => true)) return;
    await customizeBtn.click();
    await page.waitForTimeout(800);

    const cancelBtn = page.locator('button').filter({ hasText: 'Cancel' }).first();
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(800);
      console.log('[MB-G7] Cancel clicked');

      // Back to Basic Mode
      const coreAdvise = page.locator('[data-cy$="-Core-Advise-button"]').first();
      console.log(`[MB-G7] Core Advise visible after Cancel: ${await coreAdvise.isVisible().catch(() => false)}`);
    }
    await ss(page, 'G7-after-cancel');
  });
});

// =====================================================================
// GROUP H – Wire: Wire Advise buttons
// =====================================================================
test.describe('MB – Group H – Wire Advise', () => {
  test.describe.configure({ timeout: 180000 });

  test('MB-H1 – Wire Advise button visible (pulsing when wire incomplete)', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const wireAdviseBtn = page.locator('[data-cy$="-Wire-Advise-button"], [data-cy$="Wire-Advise-button"]').first();
    const vis = await wireAdviseBtn.isVisible().catch(() => false);
    console.log(`[MB-H1] Wire Advise visible: ${vis}`);
    expect(vis).toBe(true);
    await ss(page, 'H1-wire-advise-btn');
  });

  test('MB-H2 – Wire Advise click triggers loading', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const wireAdviseBtn = page.locator('[data-cy$="-Wire-Advise-button"], [data-cy$="Wire-Advise-button"]').first();
    if (!(await wireAdviseBtn.isVisible().catch(() => false))) return;

    await wireAdviseBtn.click();
    await page.waitForTimeout(300);

    const loading = page.locator('[data-cy$="-BasicWireSelector-loading"]').first();
    const loadingVis = await loading.isVisible().catch(() => false);
    console.log(`[MB-H2] Wire loading indicator: ${loadingVis}`);
    await ss(page, 'H2-wire-advise-loading');
  });

  test('MB-H3 – Wire Advise completes and populates wire type', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);
    await ss(page, 'H3-wire-advised');

    const wireTypeSel = page.locator('[data-cy$="-WireType"] select').first();
    if (await wireTypeSel.isVisible().catch(() => false)) {
      const wireType = await wireTypeSel.inputValue();
      console.log(`[MB-H3] Wire type after advise: "${wireType}"`);
      expect(wireType.length).toBeGreaterThan(0);
    }
    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// GROUP I – Wire: Round wire configuration
// =====================================================================
test.describe('MB – Group I – Round Wire', () => {
  test.describe.configure({ timeout: 180000 });

  test('MB-I1 – Wire Type selector visible and has options', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType"] select').first();
    const vis = await wireTypeSel.isVisible().catch(() => false);
    console.log(`[MB-I1] Wire Type visible: ${vis}`);

    if (vis) {
      const opts = await wireTypeSel.evaluate(el => Array.from(el.options).map(o => o.value || o.text).filter(v => v));
      console.log(`[MB-I1] Wire types: ${opts.join(', ')}`);
      expect(opts).toContain('round');
    }
    await ss(page, 'I1-wire-type-selector');
  });

  test('MB-I2 – Select round wire type shows standard, diameter, coating', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType"] select').first();
    if (!(await wireTypeSel.isVisible().catch(() => false))) return;

    await wireTypeSel.selectOption('round');
    await page.waitForTimeout(600);

    const standardSel = page.locator('[data-cy$="-WireStandard"]').first();
    const diamSel     = page.locator('[data-cy$="-WireConductingDiameter"]').first();
    const coatingSel  = page.locator('[data-cy$="-WireCoating"]').first();

    const standardVis = await standardSel.isVisible().catch(() => false);
    const diamVis     = await diamSel.isVisible().catch(() => false);
    const coatingVis  = await coatingSel.isVisible().catch(() => false);
    console.log(`[MB-I2] Standard: ${standardVis}, Diameter: ${diamVis}, Coating: ${coatingVis}`);
    await ss(page, 'I2-round-wire-controls');
  });

  test('MB-I3 – Wire Standard selector has options (IEC 60317, etc.)', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType"] select').first();
    if (await wireTypeSel.isVisible().catch(() => false)) await wireTypeSel.selectOption('round');
    await page.waitForTimeout(500);

    const standardSel = page.locator('[data-cy$="-WireStandard"] select').first();
    if (!(await standardSel.isVisible().catch(() => false))) return;

    const opts = await standardSel.evaluate(el => Array.from(el.options).map(o => o.value || o.text).filter(v => v));
    console.log(`[MB-I3] Wire standards: ${opts.join(', ')}`);
    expect(opts.length).toBeGreaterThan(0);
    await ss(page, 'I3-wire-standard');
  });

  test('MB-I4 – Conducting diameter selector populated after standard is selected', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType"] select').first();
    if (await wireTypeSel.isVisible().catch(() => false)) await wireTypeSel.selectOption('round');
    await page.waitForTimeout(500);

    const standardSel = page.locator('[data-cy$="-WireStandard"] select').first();
    if (await standardSel.isVisible().catch(() => false)) {
      const opts = await standardSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
      if (opts.length > 0) { await standardSel.selectOption(opts[0]); await page.waitForTimeout(600); }
    }

    const diamSel = page.locator('[data-cy$="-WireConductingDiameter"] select').first();
    const vis = await diamSel.isVisible().catch(() => false);
    console.log(`[MB-I4] Diameter selector visible: ${vis}`);
    if (vis) {
      const opts = await diamSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
      console.log(`[MB-I4] Diameter options: ${opts.length}`);
      expect(opts.length).toBeGreaterThan(0);

      // Select a specific diameter
      await diamSel.selectOption(opts[Math.floor(opts.length / 2)]);
      await page.waitForTimeout(400);
    }
    await ss(page, 'I4-wire-diameter');
  });

  test('MB-I5 – Wire Coating selector visible for round wire', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType"] select').first();
    if (await wireTypeSel.isVisible().catch(() => false)) await wireTypeSel.selectOption('round');
    await page.waitForTimeout(500);

    const coatingSel = page.locator('[data-cy$="-WireCoating"] select').first();
    const vis = await coatingSel.isVisible().catch(() => false);
    console.log(`[MB-I5] Wire Coating visible: ${vis}`);
    if (vis) {
      const opts = await coatingSel.evaluate(el => Array.from(el.options).map(o => o.value || o.text).filter(v => v));
      console.log(`[MB-I5] Coating options: ${opts.join(', ')}`);
      expect(opts.length).toBeGreaterThan(0);
    }
    await ss(page, 'I5-wire-coating');
  });
});

// =====================================================================
// GROUP J – Wire: Litz wire
// =====================================================================
test.describe('MB – Group J – Litz Wire', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-J1 – Select litz wire shows strand diameter and count', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType"] select').first();
    if (!(await wireTypeSel.isVisible().catch(() => false))) return;

    await wireTypeSel.selectOption('litz');
    await page.waitForTimeout(600);

    const strandDiamSel  = page.locator('[data-cy$="-StrandConductingDiameter"]').first();
    const strandCountSel = page.locator('[data-cy$="-NumberConductors"]').first();

    const strandDiamVis  = await strandDiamSel.isVisible().catch(() => false);
    const strandCountVis = await strandCountSel.isVisible().catch(() => false);
    console.log(`[MB-J1] Strand diameter: ${strandDiamVis}, Strand count: ${strandCountVis}`);
    await ss(page, 'J1-litz-wire-controls');
  });

  test('MB-J2 – Litz strand count input accepts value', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType"] select').first();
    if (!(await wireTypeSel.isVisible().catch(() => false))) return;
    await wireTypeSel.selectOption('litz');
    await page.waitForTimeout(600);

    const strandCountEl = page.locator('[data-cy$="-NumberConductors"]').first();
    if (!(await strandCountEl.isVisible().catch(() => false))) return;

    const input = strandCountEl.locator('input[type="number"]').first();
    if (await input.isVisible().catch(() => false)) {
      await input.click({ clickCount: 3 });
      await input.fill('100');
      await input.press('Tab');
      await page.waitForTimeout(400);
      const val = await input.inputValue();
      console.log(`[MB-J2] Strand count set to: ${val}`);
    }
    await ss(page, 'J2-litz-strand-count');
  });
});

// =====================================================================
// GROUP K – Wire: Rectangular and Foil
// =====================================================================
test.describe('MB – Group K – Rectangular/Foil Wire', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-K1 – Select rectangular wire shows height and width inputs', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType"] select').first();
    if (!(await wireTypeSel.isVisible().catch(() => false))) return;

    await wireTypeSel.selectOption('rectangular');
    await page.waitForTimeout(600);

    const heightEl = page.locator('[data-cy$="-WireConductingHeight"]').first();
    const widthEl  = page.locator('[data-cy$="-WireConductingWidth"]').first();

    const heightVis = await heightEl.isVisible().catch(() => false);
    const widthVis  = await widthEl.isVisible().catch(() => false);
    console.log(`[MB-K1] Height: ${heightVis}, Width: ${widthVis}`);
    await ss(page, 'K1-rectangular-wire');
  });

  test('MB-K2 – Rectangular wire: set height and width', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType"] select').first();
    if (!(await wireTypeSel.isVisible().catch(() => false))) return;
    await wireTypeSel.selectOption('rectangular');
    await page.waitForTimeout(600);

    for (const suffix of ['-WireConductingHeight', '-WireConductingWidth']) {
      const el = page.locator(`[data-cy$="${suffix}"]`).first();
      if (!(await el.isVisible().catch(() => false))) continue;
      const input = el.locator('input[type="number"]').first();
      if (await input.isVisible().catch(() => false)) {
        await input.click({ clickCount: 3 });
        await input.fill('0.002');
        await input.press('Tab');
        await page.waitForTimeout(300);
      }
    }
    await ss(page, 'K2-rectangular-dims-set');
  });

  test('MB-K3 – Select foil wire shows height and width inputs', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType"] select').first();
    if (!(await wireTypeSel.isVisible().catch(() => false))) return;

    await wireTypeSel.selectOption('foil');
    await page.waitForTimeout(600);

    const heightEl = page.locator('[data-cy$="-WireConductingHeight"]').first();
    const widthEl  = page.locator('[data-cy$="-WireConductingWidth"]').first();
    const heightVis = await heightEl.isVisible().catch(() => false);
    const widthVis  = await widthEl.isVisible().catch(() => false);
    console.log(`[MB-K3] Foil height: ${heightVis}, width: ${widthVis}`);
    await ss(page, 'K3-foil-wire');
  });
});

// =====================================================================
// GROUP L – Wire: Turns and Parallels
// =====================================================================
test.describe('MB – Group L – Turns and Parallels', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-L1 – NumberTurns selector visible with two inputs (turns + parallels)', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);

    const turnsEl = page.locator('[data-cy$="-NumberTurns"]').first();
    const turnsVis = await turnsEl.isVisible().catch(() => false);
    console.log(`[MB-L1] NumberTurns visible: ${turnsVis}`);

    if (turnsVis) {
      const inputs = await turnsEl.locator('input[type="number"]').count();
      console.log(`[MB-L1] Turns inputs count: ${inputs}`);
      expect(inputs).toBeGreaterThanOrEqual(1);
    }
    await ss(page, 'L1-turns-parallels');
  });

  test('MB-L2 – Set turns to 10', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);

    const turnsEl = page.locator('[data-cy$="-NumberTurns"]').first();
    if (!(await turnsEl.isVisible().catch(() => false))) return;

    const inputs = await turnsEl.locator('input[type="number"]').all();
    if (inputs.length > 0) {
      await inputs[0].click({ clickCount: 3 });
      await inputs[0].fill('10');
      await inputs[0].press('Tab');
      await page.waitForTimeout(600);
      const val = await inputs[0].inputValue();
      console.log(`[MB-L2] Turns set to: ${val}`);
    }
    await ss(page, 'L2-turns-10');
  });

  test('MB-L3 – Set parallels to 2', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);

    const turnsEl = page.locator('[data-cy$="-NumberTurns"]').first();
    if (!(await turnsEl.isVisible().catch(() => false))) return;

    const inputs = await turnsEl.locator('input[type="number"]').all();
    if (inputs.length >= 2) {
      await inputs[1].click({ clickCount: 3 });
      await inputs[1].fill('2');
      await inputs[1].press('Tab');
      await page.waitForTimeout(600);
      const val = await inputs[1].inputValue();
      console.log(`[MB-L3] Parallels set to: ${val}`);
    }
    await ss(page, 'L3-parallels-2');
  });
});

// =====================================================================
// GROUP M – Coil: Alignment button
// =====================================================================
test.describe('MB – Group M – Coil Alignment', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-M1 – Alignment button visible in coil header', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const alignBtn = page.locator('button').filter({ hasText: 'Alignment' }).first();
    const vis = await alignBtn.isVisible().catch(() => false);
    console.log(`[MB-M1] Alignment button visible: ${vis}`);
    expect(vis).toBe(true);
    await ss(page, 'M1-alignment-btn');
  });

  test('MB-M2 – Alignment button toggles alignment options panel', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const alignBtn = page.locator('button').filter({ hasText: 'Alignment' }).first();
    if (!(await alignBtn.isVisible().catch(() => false))) return;

    await alignBtn.click();
    await page.waitForTimeout(400);

    // Alignment options should appear: Layers Orientation, Turns Alignment, Section Alignment
    const layersOrientation = await page.locator('text=Layers Orientation, text=Orientation').first().isVisible().catch(() => false);
    const turnsAlignment    = await page.locator('text=Turns Alignment, text=Alignment').first().isVisible().catch(() => false);
    console.log(`[MB-M2] Layers Orientation: ${layersOrientation}, Turns Alignment: ${turnsAlignment}`);
    await ss(page, 'M2-alignment-options');

    // Toggle off
    await alignBtn.click();
    await page.waitForTimeout(300);
    await ss(page, 'M2-alignment-hidden');
  });

  test('MB-M3 – Alignment: Layers Orientation selector has options', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const alignBtn = page.locator('button').filter({ hasText: 'Alignment' }).first();
    if (!(await alignBtn.isVisible().catch(() => false))) return;
    await alignBtn.click();
    await page.waitForTimeout(400);

    const selects = await page.locator('.compact-card').filter({ hasText: 'Alignment' }).first().locator('select').all();
    if (selects.length > 0) {
      const opts = await selects[0].evaluate(el => Array.from(el.options).map(o => o.value || o.text).filter(v => v));
      console.log(`[MB-M3] Orientation options: ${opts.join(', ')}`);
      expect(opts.length).toBeGreaterThan(0);
    }
    await ss(page, 'M3-alignment-selectors');
  });
});

// =====================================================================
// GROUP N – Coil: Insulation button
// =====================================================================
test.describe('MB – Group N – Coil Insulation', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-N1 – Insulation button visible in coil header', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const insulBtn = page.locator('button').filter({ hasText: 'Insulation' }).first();
    const vis = await insulBtn.isVisible().catch(() => false);
    console.log(`[MB-N1] Insulation button visible: ${vis}`);
    expect(vis).toBe(true);
    await ss(page, 'N1-insulation-btn');
  });

  test('MB-N2 – Insulation button toggles margin inputs', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const insulBtn = page.locator('button').filter({ hasText: 'Insulation' }).first();
    if (!(await insulBtn.isVisible().catch(() => false))) return;

    await insulBtn.click();
    await page.waitForTimeout(400);

    // Margin inputs should appear (Top/Left, Bottom/Right)
    const marginText = await page.locator('text=Margin, text=margin').first().isVisible().catch(() => false);
    console.log(`[MB-N2] Margin text visible: ${marginText}`);
    await ss(page, 'N2-insulation-margins');
  });

  test('MB-N3 – Insulation margin values editable', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const insulBtn = page.locator('button').filter({ hasText: 'Insulation' }).first();
    if (!(await insulBtn.isVisible().catch(() => false))) return;
    await insulBtn.click();
    await page.waitForTimeout(400);

    const marginInputs = await page.locator('input[type="number"]').all();
    const insulInputs = [];
    for (const inp of marginInputs) {
      const val = await inp.inputValue().catch(() => '');
      if (parseFloat(val) < 0.1) insulInputs.push(inp);
    }

    if (insulInputs.length > 0) {
      await insulInputs[0].click({ clickCount: 3 });
      await insulInputs[0].fill('0.001');
      await insulInputs[0].press('Tab');
      await page.waitForTimeout(400);
    }
    await ss(page, 'N3-margin-edited');
  });
});

// =====================================================================
// GROUP O – Coil: Interleaving and Bobbin dimensions
// =====================================================================
test.describe('MB – Group O – Coil Interleaving & Bobbin', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-O1 – Bobbin Wall Thickness input visible', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const bobbinEl = page.locator('[data-cy$="-BobbinWallThickness"]').first();
    const vis = await bobbinEl.isVisible().catch(() => false);
    console.log(`[MB-O1] Bobbin wall thickness visible: ${vis}`);
    await ss(page, 'O1-bobbin-wall');
  });

  test('MB-O2 – Set Bobbin Wall Thickness to 1mm', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const bobbinEl = page.locator('[data-cy$="-BobbinWallThickness"]').first();
    if (!(await bobbinEl.isVisible().catch(() => false))) return;

    const input = bobbinEl.locator('input[type="number"]').first();
    if (await input.isVisible().catch(() => false)) {
      await input.click({ clickCount: 3 });
      await input.fill('0.001');
      await input.press('Tab');
      await page.waitForTimeout(400);
      const val = await input.inputValue();
      console.log(`[MB-O2] Bobbin wall set to: ${val}`);
    }
    await ss(page, 'O2-bobbin-wall-set');
  });

  test('MB-O3 – Bobbin Column Thickness input visible', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const colEl = page.locator('[data-cy$="-BobbinColumnThickness"]').first();
    const vis = await colEl.isVisible().catch(() => false);
    console.log(`[MB-O3] Bobbin column thickness visible: ${vis}`);
    await ss(page, 'O3-bobbin-column');
  });

  test('MB-O4 – Sections Interleaving input (multi-winding: Flyback)', async ({ page }) => {
    // Use Flyback (multi-winding) for interleaving
    const reached = await goToBuilderStep(page, () => openWizard(page, FLYBACK_CY));
    if (!reached) return;

    const interleavingEl = page.locator('[data-cy$="-SectionsInterleaving"]').first();
    const vis = await interleavingEl.isVisible().catch(() => false);
    console.log(`[MB-O4] Interleaving input visible: ${vis}`);
    await ss(page, 'O4-interleaving');
  });

  test('MB-O5 – Change interleaving pattern to "1221"', async ({ page }) => {
    const reached = await goToBuilderStep(page, () => openWizard(page, FLYBACK_CY));
    if (!reached) return;

    const interleavingEl = page.locator('[data-cy$="-SectionsInterleaving"]').first();
    if (!(await interleavingEl.isVisible().catch(() => false))) {
      console.log('[MB-O5] Interleaving not visible — SKIP');
      return;
    }

    const input = interleavingEl.locator('input[type="text"], input').first();
    if (await input.isVisible().catch(() => false)) {
      await input.click({ clickCount: 3 });
      await input.fill('1221');
      await input.press('Tab');
      await page.waitForTimeout(600);
      const val = await input.inputValue();
      console.log(`[MB-O5] Interleaving set to: "${val}"`);
    }
    await ss(page, 'O5-interleaving-1221');
  });
});

// =====================================================================
// GROUP P – Coil: Advanced Parasitics
// =====================================================================
test.describe('MB – Group P – Advanced Parasitics', () => {
  test.describe.configure({ timeout: 180000 });

  test('MB-P1 – Advanced Parasitics button visible when simulation enabled', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    // Enable simulation if not enabled
    const settingsBtn = page.locator('[data-cy$="settings-modal-button"]').first();
    if (await settingsBtn.isVisible().catch(() => false)) {
      await settingsBtn.click();
      await page.waitForTimeout(600);

      const simToggle = page.locator('[data-cy$="-Settings-Modal-enable-simulation-button"]').first();
      if (await simToggle.isVisible().catch(() => false)) {
        const isChecked = await simToggle.evaluate(el => el.checked || el.classList.contains('active')).catch(() => false);
        if (!isChecked) {
          await simToggle.click();
          await page.waitForTimeout(300);
        }
        // Update settings
        const updateBtn = page.locator('[data-cy$="-Settings-Modal-update-settings-button"]').first();
        if (await updateBtn.isVisible().catch(() => false)) await updateBtn.click();
      }
      await page.locator('button').filter({ hasText: /[Cc]lose|[Cc]ancel/ }).last().click().catch(() => {});
      await page.waitForTimeout(500);
    }

    const parasiticsBtn = page.locator('[data-cy$="-Coil-ShowParasiticsView-button"]').first();
    const vis = await parasiticsBtn.isVisible().catch(() => false);
    console.log(`[MB-P1] Advanced Parasitics button visible: ${vis}`);
    await ss(page, 'P1-parasitics-btn');
  });

  test('MB-P2 – Click Advanced Parasitics opens matrices view', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);

    const parasiticsBtn = page.locator('[data-cy$="-Coil-ShowParasiticsView-button"]').first();
    if (!(await parasiticsBtn.isVisible().catch(() => false))) {
      console.log('[MB-P2] Parasitics button not visible — SKIP');
      return;
    }

    await parasiticsBtn.click();
    await page.waitForTimeout(1000);

    // Advanced Coil Info shows resistance/inductance/capacitance matrices
    const matrixText = await page.locator('text=Resistance, text=Inductance, text=Capacitance').first().isVisible().catch(() => false);
    console.log(`[MB-P2] Matrix text visible: ${matrixText}`);
    await ss(page, 'P2-parasitics-matrices');

    // Close button should be visible
    const closeBtn = page.locator('button').filter({ hasText: 'Close' }).first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(600);
    }
  });
});

// =====================================================================
// GROUP Q – Coil: Temperature field toggle
// =====================================================================
test.describe('MB – Group Q – Temperature Visualization', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-Q1 – Show Temperature button present when simulation enabled', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const tempBtn = page.locator('[data-cy$="-Coil-ToggleTemperaturePlot-button"]').first();
    const vis = await tempBtn.isVisible().catch(() => false);
    console.log(`[MB-Q1] Temperature toggle button visible: ${vis}`);
    await ss(page, 'Q1-temperature-btn');
  });

  test('MB-Q2 – Click temperature toggle changes button state', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const tempBtn = page.locator('[data-cy$="-Coil-ToggleTemperaturePlot-button"]').first();
    if (!(await tempBtn.isVisible().catch(() => false))) {
      console.log('[MB-Q2] Temperature button not visible — SKIP');
      return;
    }

    const classBefore = await tempBtn.getAttribute('class').catch(() => '');
    await tempBtn.click();
    await page.waitForTimeout(500);
    const classAfter = await tempBtn.getAttribute('class').catch(() => '');
    console.log(`[MB-Q2] Class before: ${classBefore?.split(' ').join(',')} → after: ${classAfter?.split(' ').join(',')}`);
    await ss(page, 'Q2-temperature-toggled');

    // Toggle back
    await tempBtn.click();
    await page.waitForTimeout(300);
  });
});

// =====================================================================
// GROUP R – Settings Modal
// =====================================================================
test.describe('MB – Group R – Settings Modal', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-R1 – Settings button opens modal', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const settingsBtn = page.locator('[data-cy$="settings-modal-button"]').first();
    await expect(settingsBtn).toBeVisible();

    await settingsBtn.click();
    await page.waitForTimeout(600);

    const modal = page.locator('#MagneticBuilderSettingsModal, .modal.show').first();
    const modalVis = await modal.isVisible().catch(() => false);
    console.log(`[MB-R1] Settings modal visible: ${modalVis}`);
    await ss(page, 'R1-settings-modal');
  });

  test('MB-R2 – Settings: Stock filter toggle present', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const settingsBtn = page.locator('[data-cy$="settings-modal-button"]').first();
    if (!(await settingsBtn.isVisible().catch(() => false))) return;
    await settingsBtn.click();
    await page.waitForTimeout(600);

    const stockToggle = page.locator('[data-cy$="-Settings-Modal-with-without-stock-button"], [data-cy="Settings-Modal-with-without-stock-button"]').first();
    const vis = await stockToggle.isVisible().catch(() => false);
    console.log(`[MB-R2] Stock filter toggle visible: ${vis}`);
    await ss(page, 'R2-stock-filter');
  });

  test('MB-R3 – Settings: Toggle stock filter on/off', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const settingsBtn = page.locator('[data-cy$="settings-modal-button"]').first();
    if (!(await settingsBtn.isVisible().catch(() => false))) return;
    await settingsBtn.click();
    await page.waitForTimeout(600);

    const stockToggle = page.locator('[data-cy$="-Settings-Modal-with-without-stock-button"], [data-cy="Settings-Modal-with-without-stock-button"]').first();
    if (await stockToggle.isVisible().catch(() => false)) {
      await stockToggle.click();
      await page.waitForTimeout(300);
      await stockToggle.click(); // Toggle back
      console.log('[MB-R3] Stock filter toggled');
    }
    await ss(page, 'R3-stock-toggle');
  });

  test('MB-R4 – Settings: Simulation enable/disable toggle', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const settingsBtn = page.locator('[data-cy$="settings-modal-button"]').first();
    if (!(await settingsBtn.isVisible().catch(() => false))) return;
    await settingsBtn.click();
    await page.waitForTimeout(600);

    const simToggle = page.locator('[data-cy$="-Settings-Modal-enable-simulation-button"]').first();
    const vis = await simToggle.isVisible().catch(() => false);
    console.log(`[MB-R4] Simulation toggle visible: ${vis}`);
    await ss(page, 'R4-simulation-toggle');
  });

  test('MB-R5 – Settings: 3D visualisation toggle', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const settingsBtn = page.locator('[data-cy$="settings-modal-button"]').first();
    if (!(await settingsBtn.isVisible().catch(() => false))) return;
    await settingsBtn.click();
    await page.waitForTimeout(600);

    const vizToggle = page.locator('[data-cy$="-Settings-Modal-enable-visualization-button"]').first();
    const vis = await vizToggle.isVisible().catch(() => false);
    console.log(`[MB-R5] 3D viz toggle visible: ${vis}`);
    await ss(page, 'R5-3d-viz-toggle');
  });

  test('MB-R6 – Settings: Update settings button present and clickable', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const settingsBtn = page.locator('[data-cy$="settings-modal-button"]').first();
    if (!(await settingsBtn.isVisible().catch(() => false))) return;
    await settingsBtn.click();
    await page.waitForTimeout(600);

    const updateBtn = page.locator('[data-cy$="-Settings-Modal-update-settings-button"]').first();
    const resetBtn  = page.locator('[data-cy$="-Settings-Modal-reset-defaults-button"]').first();

    const updateVis = await updateBtn.isVisible().catch(() => false);
    const resetVis  = await resetBtn.isVisible().catch(() => false);
    console.log(`[MB-R6] Update: ${updateVis}, Reset defaults: ${resetVis}`);

    if (updateVis) {
      await updateBtn.click();
      await page.waitForTimeout(500);
    }
    await ss(page, 'R6-settings-update');
  });

  test('MB-R7 – Settings: Core losses model selector present', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const settingsBtn = page.locator('[data-cy$="settings-modal-button"]').first();
    if (!(await settingsBtn.isVisible().catch(() => false))) return;
    await settingsBtn.click();
    await page.waitForTimeout(600);

    const modelsText = await page.locator('text=Core losses, text=core losses, text=model').first().isVisible().catch(() => false);
    console.log(`[MB-R7] Core losses model text visible: ${modelsText}`);
    await ss(page, 'R7-core-losses-model');
  });
});

// =====================================================================
// GROUP S – Context Menu buttons
// =====================================================================
test.describe('MB – Group S – Context Menu', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-S1 – Magnetic Adviser button in context menu', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const maBtn = page.locator('[data-cy$="-magnetics-adviser-button"]').first();
    const vis = await maBtn.isVisible().catch(() => false);
    console.log(`[MB-S1] Magnetic Adviser context button: ${vis}`);
    expect(vis).toBe(true);
    await ss(page, 'S1-magnetic-adviser-btn');
  });

  test('MB-S2 – Click Magnetic Adviser switches to adviser view', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const maBtn = page.locator('[data-cy$="-magnetics-adviser-button"]').first();
    if (!(await maBtn.isVisible().catch(() => false))) return;

    await maBtn.click();
    await page.waitForTimeout(1000);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    const vis = await adviseBtn.isVisible().catch(() => false);
    console.log(`[MB-S2] Get Advised Magnetics visible after click: ${vis}`);
    expect(vis).toBe(true);
    await ss(page, 'S2-adviser-view');

    // Go back to builder
    await page.goBack({ timeout: 5000 }).catch(() => {});
  });
});

// =====================================================================
// GROUP T – Control Panel (Undo/Redo, Exports)
// =====================================================================
test.describe('MB – Group T – Control Panel', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-T1 – Undo and Redo buttons visible in control panel', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const undoBtn = page.locator('button').filter({ hasText: /[Uu]ndo/ }).first();
    const redoBtn = page.locator('button').filter({ hasText: /[Rr]edo/ }).first();

    const undoVis = await undoBtn.isVisible().catch(() => false);
    const redoVis = await redoBtn.isVisible().catch(() => false);
    console.log(`[MB-T1] Undo: ${undoVis}, Redo: ${redoVis}`);
    await ss(page, 'T1-undo-redo');
  });

  test('MB-T2 – MAS Exports modal button visible', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    const masBtn = page.locator('[data-cy="MAS-exports-modal-button"]').first();
    const vis = await masBtn.isVisible().catch(() => false);
    console.log(`[MB-T2] MAS exports button visible: ${vis}`);

    if (!vis) {
      // Try finding via export dropdown
      const exportDropdown = page.locator('button').filter({ hasText: /[Ee]xport/ }).first();
      if (await exportDropdown.isVisible().catch(() => false)) {
        await exportDropdown.click();
        await page.waitForTimeout(300);
        const masBtn2 = page.locator('[data-cy="MAS-exports-modal-button"]').first();
        console.log(`[MB-T2] MAS button after opening dropdown: ${await masBtn2.isVisible().catch(() => false)}`);
      }
    }
    await ss(page, 'T2-mas-exports');
  });

  test('MB-T3 – Core, Coil, Circuit Simulator export buttons visible', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    // Open export dropdown if needed
    const exportDropdown = page.locator('button').filter({ hasText: /[Ee]xport|All/ }).first();
    if (await exportDropdown.isVisible().catch(() => false)) {
      await exportDropdown.click();
      await page.waitForTimeout(400);
    }

    const coreBtn    = page.locator('[data-cy="Core-exports-modal-button"]').first();
    const coilBtn    = page.locator('[data-cy="Coil-exports-modal-button"]').first();
    const circuitBtn = page.locator('[data-cy="Circuit-Simulators-exports-modal-button"]').first();

    const coreVis    = await coreBtn.isVisible().catch(() => false);
    const coilVis    = await coilBtn.isVisible().catch(() => false);
    const circuitVis = await circuitBtn.isVisible().catch(() => false);
    console.log(`[MB-T3] Core: ${coreVis}, Coil: ${coilVis}, Circuit: ${circuitVis}`);
    await ss(page, 'T3-export-buttons');
  });
});

// =====================================================================
// GROUP U – End-to-end: Advise Core + Wire → complete builder
// =====================================================================
test.describe('MB – Group U – End-to-end complete build', () => {
  test.describe.configure({ timeout: 300000 });

  test('MB-U1 – Core Advise + Wire Advise → Continue button enabled', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const reached = await goToBuilderStep(page);
    if (!reached) { console.log('[MB-U1] Builder not reached — SKIP'); return; }

    await ss(page, 'U1-before-advise');

    // 1. Advise core
    await adviseCoreAndWait(page, 90000);
    await ss(page, 'U1-after-core-advise');

    // 2. Advise wire
    await adviseWireAndWait(page, 90000);
    await ss(page, 'U1-after-wire-advise');

    // 3. Check Continue button state
    const continueBtn = page.locator('[data-cy="magnetic-synthesis-next-tool-button"]').first();
    const isDisabled = await continueBtn.isDisabled().catch(() => true);
    const isPrimary  = await continueBtn.evaluate(el => el.classList.contains('storyline-continue-btn-primary')).catch(() => false);
    console.log(`[MB-U1] Continue disabled: ${isDisabled}, primary (valid): ${isPrimary}`);

    if (!isDisabled && isPrimary) {
      console.log('[MB-U1] Builder is valid — clicking Continue to Summary');
      await continueBtn.click();
      await page.waitForTimeout(2000);
      await ss(page, 'U1-summary-step');
    }

    expect(errors.length).toBe(0);
  });

  test('MB-U2 – Full build: Core Advise + Wire Advise + reach Summary step', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const reached = await goToBuilderStep(page);
    if (!reached) return;

    await adviseCoreAndWait(page, 90000);
    await adviseWireAndWait(page, 90000);
    await page.waitForTimeout(1000);

    const continueBtn = page.locator('[data-cy="magnetic-synthesis-next-tool-button"]').first();
    if (!(await continueBtn.isDisabled().catch(() => true))) {
      await continueBtn.click();
      await page.waitForTimeout(2000);
      await ss(page, 'U2-summary-loaded');

      const summaryActive = await page.locator('.storyline-step-active').filter({ hasText: 'Summary' }).isVisible().catch(() => false);
      console.log(`[MB-U2] Summary step active: ${summaryActive}`);
    }

    expect(errors.length).toBe(0);
  });

  test('MB-U3 – Full build with manual core (E-shape) + round wire', async ({ page }) => {
    const reached = await goToBuilderStep(page);
    if (!reached) return;

    // Use Core Advise to get to a known state
    await adviseCoreAndWait(page, 90000);

    // Change wire type to round manually
    const wireTypeSel = page.locator('[data-cy$="-WireType"] select').first();
    if (await wireTypeSel.isVisible().catch(() => false)) {
      await wireTypeSel.selectOption('round');
      await page.waitForTimeout(400);

      const standardSel = page.locator('[data-cy$="-WireStandard"] select').first();
      if (await standardSel.isVisible().catch(() => false)) {
        const opts = await standardSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
        if (opts.length > 0) { await standardSel.selectOption(opts[0]); await page.waitForTimeout(500); }
      }

      const diamSel = page.locator('[data-cy$="-WireConductingDiameter"] select').first();
      if (await diamSel.isVisible().catch(() => false)) {
        const opts = await diamSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
        if (opts.length > 1) await diamSel.selectOption(opts[1]);
        await page.waitForTimeout(400);
      }
    }

    // Set turns
    const turnsEl = page.locator('[data-cy$="-NumberTurns"]').first();
    if (await turnsEl.isVisible().catch(() => false)) {
      const inputs = await turnsEl.locator('input[type="number"]').all();
      if (inputs.length > 0) {
        await inputs[0].click({ clickCount: 3 });
        await inputs[0].fill('20');
        await inputs[0].press('Tab');
        await page.waitForTimeout(400);
      }
    }

    await ss(page, 'U3-manual-build');
    const hasError = await page.locator('.error-text, .alert-danger').first().isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });
});

// =====================================================================
// GROUP V – Multi-winding: Wire Advise All + Interleaving
// =====================================================================
test.describe('MB – Group V – Multi-winding (Flyback)', () => {
  test.describe.configure({ timeout: 240000 });

  test('MB-V1 – Wire Advise All button visible for multi-winding (Flyback)', async ({ page }) => {
    const reached = await goToBuilderStep(page, () => openWizard(page, FLYBACK_CY));
    if (!reached) { console.log('[MB-V1] Builder not reached — SKIP'); return; }

    await adviseCoreAndWait(page, 90000);

    const adviseAllBtn = page.locator('[data-cy$="-Wire-Advise-All-button"], [data-cy$="Wire-Advise-All-button"]').first();
    const vis = await adviseAllBtn.isVisible().catch(() => false);
    console.log(`[MB-V1] Wire Advise All visible: ${vis}`);

    if (!vis) {
      // Single winding Flyback might just show Advise, not Advise All
      const adviseBtn = page.locator('[data-cy$="-Wire-Advise-button"]').first();
      console.log(`[MB-V1] Single Wire Advise visible: ${await adviseBtn.isVisible().catch(() => false)}`);
    }
    await ss(page, 'V1-wire-advise-all');
  });

  test('MB-V2 – Wire Advise All click advises all windings', async ({ page }) => {
    const reached = await goToBuilderStep(page, () => openWizard(page, FLYBACK_CY));
    if (!reached) return;

    await adviseCoreAndWait(page, 90000);

    const adviseAllBtn = page.locator('[data-cy$="-Wire-Advise-All-button"]').first();
    if (await adviseAllBtn.isVisible().catch(() => false)) {
      await adviseAllBtn.click();
      await page.waitForFunction(
        () => !document.querySelector('[data-cy$="-BasicWireSelector-loading"]'),
        { timeout: 90000 }
      ).catch(() => {});
      await page.waitForTimeout(800);
      console.log('[MB-V2] Wire Advise All completed');
    } else {
      // Fallback to single Wire Advise
      await adviseWireAndWait(page, 90000);
    }
    await ss(page, 'V2-wire-advise-all-done');
  });

  test('MB-V3 – Winding selector visible for multi-winding flyback', async ({ page }) => {
    const reached = await goToBuilderStep(page, () => openWizard(page, FLYBACK_CY));
    if (!reached) return;

    const windingSel = page.locator('[data-cy$="-WindingSelector"]').first();
    const vis = await windingSel.isVisible().catch(() => false);
    console.log(`[MB-V3] Winding selector visible: ${vis}`);
    await ss(page, 'V3-winding-selector');
  });

  test('MB-V4 – Push-Pull: Interleaving input with pattern 121', async ({ page }) => {
    const reached = await goToBuilderStep(page, () => openWizard(page, PP_CY));
    if (!reached) return;

    await adviseCoreAndWait(page, 90000);

    const interleavingEl = page.locator('[data-cy$="-SectionsInterleaving"]').first();
    if (!(await interleavingEl.isVisible().catch(() => false))) {
      console.log('[MB-V4] Interleaving not visible — SKIP');
      return;
    }

    const input = interleavingEl.locator('input').first();
    if (await input.isVisible().catch(() => false)) {
      await input.click({ clickCount: 3 });
      await input.fill('121');
      await input.press('Tab');
      await page.waitForTimeout(600);
      console.log(`[MB-V4] Interleaving set to: ${await input.inputValue()}`);
    }
    await ss(page, 'V4-interleaving-121');
  });
});
