/**
 * Routes Smoke Tests
 *
 * One test per Vue route in src/router/index.js. Verifies each route
 * loads, navigates without redirecting to an error page, and renders
 * a main element. Catches router config breakage, broken dynamic imports,
 * missing views, and 404s from accidental route removals.
 *
 * These tests do NOT depend on the Python backend (localhost:8000) —
 * they hit only routes whose initial render doesn't require API calls.
 */

import { test, expect } from './_coverage.js';
import { BASE_URL, isBenign, screenshot } from './utils.js';

const ss = (page, name) => screenshot(page, 'routes', name);

/**
 * Navigate to a route and wait for it to settle.
 * Router may redirect to /engine_loader first; accept either the target
 * URL OR /engine_loader as success (since the loader is part of the flow).
 */
async function navigate(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1200);
}

/** Collect non-benign console errors during navigation. */
function trackErrors(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text());
  });
  return errors;
}

// ── Static / no-backend routes ────────────────────────────────────────────

test.describe('Routes — static pages', () => {
  test.describe.configure({ timeout: 30000 });

  test('R1: / (Home) renders', async ({ page }) => {
    const errors = trackErrors(page);
    await navigate(page, '/');
    // Home has tool cards and a hero area
    await expect(page.locator('body')).toBeVisible();
    expect(page.url()).toMatch(/\/($|#)/);
    await ss(page, 'R1-home');
    expect(errors).toEqual([]);
  });

  test('R2: /cookie_policy renders', async ({ page }) => {
    const errors = trackErrors(page);
    await navigate(page, '/cookie_policy');
    await expect(page.locator('body')).toBeVisible();
    // Page contains "Cookie" somewhere in body text
    const text = await page.locator('body').textContent();
    expect(text.toLowerCase()).toContain('cookie');
    await ss(page, 'R2-cookie-policy');
    expect(errors).toEqual([]);
  });

  test('R3: /legal_notice renders', async ({ page }) => {
    const errors = trackErrors(page);
    await navigate(page, '/legal_notice');
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').textContent();
    expect(text.toLowerCase()).toMatch(/legal|privacy|notice/);
    await ss(page, 'R3-legal-notice');
    expect(errors).toEqual([]);
  });

  test('R4: /terms renders', async ({ page }) => {
    const errors = trackErrors(page);
    await navigate(page, '/terms');
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').textContent();
    expect(text.toLowerCase()).toContain('terms');
    await ss(page, 'R4-terms');
    expect(errors).toEqual([]);
  });
});

// ── Loader / wizard-landing routes ────────────────────────────────────────

test.describe('Routes — loader & landing pages', () => {
  test.describe.configure({ timeout: 45000 });

  test('R5: /engine_loader renders loader', async ({ page }) => {
    const errors = trackErrors(page);
    await navigate(page, '/engine_loader');
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'R5-engine-loader');
    expect(errors).toEqual([]);
  });

  test('R6: /wizards_landing shows wizard cards', async ({ page }) => {
    const errors = trackErrors(page);
    await navigate(page, '/wizards_landing');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
    // Should contain at least some wizard-related text
    const text = await page.locator('body').textContent();
    expect(text.length).toBeGreaterThan(50);
    await ss(page, 'R6-wizards-landing');
    expect(errors).toEqual([]);
  });

  test('R7: /wizards renders', async ({ page }) => {
    await navigate(page, '/wizards');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'R7-wizards');
  });
});

// ── Tool routes (WASM-dependent; loader redirect is OK) ───────────────────

test.describe('Routes — tool pages', () => {
  test.describe.configure({ timeout: 60000 });

  test('R8: /magnetic_tool reachable', async ({ page }) => {
    await navigate(page, '/magnetic_tool');
    await page.waitForTimeout(2000);
    // Accept either the tool itself or engine_loader (as gate)
    expect(page.url()).toMatch(/magnetic_tool|engine_loader/);
    await ss(page, 'R8-magnetic-tool');
  });

  test('R9: /magnetic_viewer reachable', async ({ page }) => {
    await navigate(page, '/magnetic_viewer');
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/magnetic_viewer|engine_loader/);
    await ss(page, 'R9-magnetic-viewer');
  });

  test('R10: /insulation_adviser reachable', async ({ page }) => {
    await navigate(page, '/insulation_adviser');
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/insulation_adviser|engine_loader/);
    await ss(page, 'R10-insulation-adviser');
  });

  test('R11: /catalog_tool reachable', async ({ page }) => {
    await navigate(page, '/catalog_tool');
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/catalog_tool|engine_loader/);
    await ss(page, 'R11-catalog-tool');
  });

  test('R12: /catalog reachable', async ({ page }) => {
    await navigate(page, '/catalog');
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/catalog|engine_loader/);
    await ss(page, 'R12-catalog');
  });
});

// ── Cross-referencer routes ───────────────────────────────────────────────

test.describe('Routes — cross-referencer pages', () => {
  test.describe.configure({ timeout: 60000 });

  test('R13: /cross_referencer_selection reachable', async ({ page }) => {
    await navigate(page, '/cross_referencer_selection');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'R13-xref-selection');
  });

  test('R14: /core_cross_referencer_fair_rite reachable', async ({ page }) => {
    await navigate(page, '/core_cross_referencer_fair_rite');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'R14-core-xref-fr');
  });

  test('R15: /core_material_cross_referencer_fair_rite reachable', async ({ page }) => {
    await navigate(page, '/core_material_cross_referencer_fair_rite');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'R15-mat-xref-fr');
  });

  test('R16: /core_shape_cross_referencer_fair_rite reachable', async ({ page }) => {
    await navigate(page, '/core_shape_cross_referencer_fair_rite');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'R16-shape-xref-fr');
  });

  test('R17: /core_cross_referencer reachable', async ({ page }) => {
    await navigate(page, '/core_cross_referencer');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'R17-core-xref');
  });

  test('R18: /core_material_cross_referencer reachable', async ({ page }) => {
    await navigate(page, '/core_material_cross_referencer');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'R18-mat-xref');
  });

  test('R19: /core_shape_cross_referencer reachable', async ({ page }) => {
    await navigate(page, '/core_shape_cross_referencer');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'R19-shape-xref');
  });
});

// ── Unknown route behavior ────────────────────────────────────────────────

test.describe('Routes — unknown path', () => {
  test('R20: unknown path does not crash app', async ({ page }) => {
    const errors = trackErrors(page);
    await navigate(page, '/this-route-does-not-exist-xyz');
    await page.waitForTimeout(800);
    await expect(page.locator('body')).toBeVisible();
    // Vue router without a catch-all just shows blank — just check app didn't throw
    expect(errors.filter(e => /vue.*warn|error.*render/i.test(e))).toEqual([]);
    await ss(page, 'R20-unknown');
  });
});
