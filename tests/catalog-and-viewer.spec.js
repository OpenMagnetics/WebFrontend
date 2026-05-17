/**
 * Catalog + Magnetic Viewer Tests
 *
 * Covers the /catalog table view and the /magnetic_viewer page reached from
 * clicking a catalog row.
 *
 * Environment caveat: /cmcs.ndjson is not served in the dev environment
 * (no public/*.ndjson fixture, Vite SPA fallback returns index.html). The
 * Catalog view therefore renders an empty "No data available" row. Tests
 * that depend on real rows (CAT4, all MV tests) detect this and skip
 * cleanly rather than fail. Populate public/cmcs.ndjson from MAS/data to
 * unlock full coverage.
 */

import { test, expect } from './_coverage.js';
import { BASE_URL, screenshot, pause } from './utils.js';

const ss = (page, name) => screenshot(page, 'catalog-viewer', name);

async function goToRoute(page, routePath, { timeout = 45000 } = {}) {
  await page.goto(`${BASE_URL}${routePath}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(
    () => !window.location.pathname.includes('engine_loader'),
    null,
    { timeout },
  );
  await pause(page, 800, 'mechanical: settle');
}

/** Count real data rows, excluding DataTables' "no data available" placeholder. */
async function realRowCount(page) {
  return page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr');
    let real = 0;
    rows.forEach((r) => {
      if (!r.querySelector('.dt-empty')) real++;
    });
    return real;
  });
}

// ── Catalog view ──────────────────────────────────────────────────────────

test.describe('Catalog — table view', () => {
  test.describe.configure({ timeout: 90000 });

  test('CAT1: /catalog loads and renders the table', async ({ page }) => {
    await goToRoute(page, '/catalog');
    await pause(page, 2000, 'mechanical: settle');
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });
    await ss(page, 'CAT1-table');
  });

  test('CAT2: DataTable initialises with at least the empty-state row', async ({ page }) => {
    await goToRoute(page, '/catalog');
    await pause(page, 2500, 'mechanical: settle');
    // DataTable renders a "No data available" row when data is missing; a
    // real data row otherwise. Either proves the component mounted.
    const rowCount = await page.locator('table tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('CAT3: column headers Reference and Core present', async ({ page }) => {
    await goToRoute(page, '/catalog');
    await pause(page, 2000, 'mechanical: settle');
    // DataTable can wrap/rename thead; search anywhere inside the first table.
    const tableText = await page.locator('table').first().textContent({ timeout: 10000 });
    expect(tableText).toMatch(/Reference/);
    expect(tableText).toMatch(/Core/);
  });

  test('CAT4: clicking first "View" button navigates to /magnetic_viewer', async ({ page }) => {
    await goToRoute(page, '/catalog');
    await pause(page, 2500, 'mechanical: settle');
    const rows = await realRowCount(page);
    expect(rows, 'catalog must have rows — check _coverage.js NDJSON mock for /cmcs.ndjson').toBeGreaterThan(0);
    const viewBtn = page.locator('table tbody button').filter({ hasText: /^View$/ }).first();
    await viewBtn.waitFor({ timeout: 10000 });
    await viewBtn.click();
    await page.waitForURL('**/magnetic_viewer**', { timeout: 15000 });
    expect(page.url()).toContain('magnetic_viewer');
    await ss(page, 'CAT4-viewer');
  });
});

// ── Magnetic Viewer ───────────────────────────────────────────────────────

/**
 * Reach the viewer via the catalog. The only UI-surfaced path to
 * /magnetic_viewer is Catalog.vue::viewMagnetic(). The _coverage fixture
 * serves /cmcs.ndjson from MKF testData, so rows are always present.
 */
async function reachViewerViaCatalog(page) {
  await goToRoute(page, '/catalog');
  await pause(page, 2500, 'mechanical: settle');
  const rows = await realRowCount(page);
  if (rows === 0) {
    throw new Error('catalog has zero real rows — _coverage.js NDJSON mock missing or broken');
  }
  const viewBtn = page.locator('table tbody button').filter({ hasText: /^View$/ }).first();
  await expect(viewBtn, 'first View button must be visible in catalog row').toBeVisible();
  await viewBtn.click();
  await page.waitForURL('**/magnetic_viewer**', { timeout: 15000 });
  await pause(page, 2500, 'mechanical: settle');
  if (!page.url().includes('magnetic_viewer')) {
    throw new Error(`magnetic_viewer route not reached; url=${page.url()}`);
  }
}

test.describe('Magnetic Viewer — interactive view', () => {
  test.describe.configure({ timeout: 90000 });

  test('MV1: viewer page loads after selecting a catalog entry', async ({ page }) => {
    await reachViewerViaCatalog(page);
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'MV1-loaded');
  });

  test('MV2: viewer exposes a summary region', async ({ page }) => {
    await reachViewerViaCatalog(page);
    const anySummary = page.locator('.compact-card, [data-cy*="summary" i], h2, h3').first();
    await expect(anySummary).toBeVisible({ timeout: 10000 });
    await ss(page, 'MV2-summary');
  });

  test('MV3: viewer renders at least one canvas/svg visualization', async ({ page }) => {
    await reachViewerViaCatalog(page);
    await pause(page, 2000, 'mechanical: settle');
    const visuals = await page.locator('canvas, svg').count();
    expect(visuals).toBeGreaterThan(0);
  });

  test('MV4: viewer surfaces a download/export action', async ({ page }) => {
    await reachViewerViaCatalog(page);
    const anyAction = page.locator('button').filter({ hasText: /Download|Export|PDF|Datasheet|STP|STL/i });
    const count = await anyAction.count();
    expect(count).toBeGreaterThan(0);
    await ss(page, 'MV4-actions');
  });

  test('MV5: browser back returns to a valid route', async ({ page }) => {
    await reachViewerViaCatalog(page);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await pause(page, 1500, 'mechanical: settle');
    expect(page.url()).toMatch(/catalog|\/$/);
  });
});
