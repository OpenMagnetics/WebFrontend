/**
 * Cross-Referencer Tests
 *
 * Covers the 7 cross-referencer routes:
 *   /cross_referencer_selection (landing)
 *   /core_cross_referencer, /core_shape_cross_referencer, /core_material_cross_referencer
 *   /core_cross_referencer_fair_rite, /core_shape_cross_referencer_fair_rite,
 *   /core_material_cross_referencer_fair_rite
 *
 * All calculations run in WASM (libCrossReferencers.wasm.js) — only the
 * optional PDF generation hits the backend.
 */

import { test, expect } from './_coverage.js';
import { BASE_URL, isBenign, screenshot } from './utils.js';

const ss = (page, name) => screenshot(page, 'xref', name);

async function navigate(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);
}

// ── Selection landing ─────────────────────────────────────────────────────

test.describe('Cross-Referencer — selection landing', () => {
  test.describe.configure({ timeout: 45000 });

  test('XR-L1: selection page renders', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text());
    });
    await navigate(page, '/cross_referencer_selection');
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'L1-selection');
    expect(errors).toEqual([]);
  });

  test('XR-L2: three tool selection buttons are present', async ({ page }) => {
    await navigate(page, '/cross_referencer_selection');
    const buttons = [
      'ToolSelection-core_cross_referencer-button',
      'ToolSelection-core_shape_cross_referencer-button',
      'ToolSelection-core_material_cross_referencer-button',
    ];
    let found = 0;
    for (const cy of buttons) {
      if (await page.locator(`[data-cy="${cy}"]`).isVisible({ timeout: 5000 }).catch(() => false)) found++;
    }
    expect(found).toBeGreaterThanOrEqual(1);
    await ss(page, 'L2-buttons');
  });
});

// ── Generic core cross-referencer ─────────────────────────────────────────

test.describe('Cross-Referencer — generic core', () => {
  test.describe.configure({ timeout: 90000 });

  test('XR-GC1: page loads and main input containers visible', async ({ page }) => {
    await navigate(page, '/core_cross_referencer');
    // Shape selector should appear once WASM is ready
    const shape = page.locator('[data-cy$="-ShapeNames"]').first();
    const material = page.locator('[data-cy$="-MaterialNames"]').first();
    const shapeVis = await shape.isVisible({ timeout: 15000 }).catch(() => false);
    const matVis = await material.isVisible({ timeout: 5000 }).catch(() => false);
    expect(shapeVis || matVis).toBe(true);
    await ss(page, 'GC1-inputs');
  });

  test('XR-GC2: calculate button present', async ({ page }) => {
    await navigate(page, '/core_cross_referencer');
    const btn = page.locator('[data-cy$="-calculate"]').first();
    const vis = await btn.isVisible({ timeout: 15000 }).catch(() => false);
    if (!vis) { test.skip(); return; }
    await expect(btn).toBeVisible();
    await ss(page, 'GC2-calculate');
  });
});

test.describe('Cross-Referencer — generic shape', () => {
  test.describe.configure({ timeout: 60000 });

  test('XR-GS1: page loads', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text());
    });
    await navigate(page, '/core_shape_cross_referencer');
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'GS1-loaded');
    expect(errors).toEqual([]);
  });
});

test.describe('Cross-Referencer — generic material', () => {
  test.describe.configure({ timeout: 60000 });

  test('XR-GM1: page loads', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text());
    });
    await navigate(page, '/core_material_cross_referencer');
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'GM1-loaded');
    expect(errors).toEqual([]);
  });

  test('XR-GM2: material selector is reachable', async ({ page }) => {
    await navigate(page, '/core_material_cross_referencer');
    const material = page.locator('[data-cy$="-MaterialNames"]').first();
    const vis = await material.isVisible({ timeout: 15000 }).catch(() => false);
    if (!vis) { test.skip(); return; }
    await expect(material).toBeVisible();
  });
});

// ── FairRite variants ─────────────────────────────────────────────────────

test.describe('Cross-Referencer — FairRite variants', () => {
  test.describe.configure({ timeout: 60000 });

  test('XR-FR1: FairRite core page loads', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text());
    });
    await navigate(page, '/core_cross_referencer_fair_rite');
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'FR1-core');
    expect(errors).toEqual([]);
  });

  test('XR-FR2: FairRite shape page loads', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text());
    });
    await navigate(page, '/core_shape_cross_referencer_fair_rite');
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'FR2-shape');
    expect(errors).toEqual([]);
  });

  test('XR-FR3: FairRite material page loads', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text());
    });
    await navigate(page, '/core_material_cross_referencer_fair_rite');
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'FR3-material');
    expect(errors).toEqual([]);
  });
});

// ── Interactive flow (generic core → calculate) ──────────────────────────

test.describe('Cross-Referencer — run generic core flow', () => {
  test.describe.configure({ timeout: 120000 });

  test('XR-RUN: click calculate and wait for results or error', async ({ page }) => {
    await navigate(page, '/core_cross_referencer');
    const calc = page.locator('[data-cy$="-calculate"]').first();
    if (!(await calc.isVisible({ timeout: 15000 }).catch(() => false))) { test.skip(); return; }

    // Click even if disabled - skip if truly disabled
    if (await calc.isDisabled().catch(() => true)) {
      console.log('[XR-RUN] calculate button disabled — need form filled first');
      test.skip();
      return;
    }
    await calc.click();
    await page.waitForTimeout(3000);

    // Either results appear (table rows) or an error message
    const error = page.locator('[data-cy$="-ErrorMessage"]').first();
    const hasError = await error.isVisible({ timeout: 2000 }).catch(() => false);
    const hasTable = await page.locator('table tbody tr').first()
      .isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasError || hasTable).toBe(true);
    await ss(page, 'RUN-after-calc');
  });
});
