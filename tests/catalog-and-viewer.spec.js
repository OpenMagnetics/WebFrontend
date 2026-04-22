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
import { BASE_URL, screenshot } from './utils.js';

const ss = (page, name) => screenshot(page, 'catalog-viewer', name);

async function goToRoute(page, routePath, { timeout = 45000 } = {}) {
  await page.goto(`${BASE_URL}${routePath}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(
    () => !window.location.pathname.includes('engine_loader'),
    null,
    { timeout },
  );
  await page.waitForTimeout(800);
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
    await page.waitForTimeout(2000);
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });
    await ss(page, 'CAT1-table');
  });

  test('CAT2: DataTable initialises with at least the empty-state row', async ({ page }) => {
    await goToRoute(page, '/catalog');
    await page.waitForTimeout(2500);
    // DataTable renders a "No data available" row when data is missing; a
    // real data row otherwise. Either proves the component mounted.
    const rowCount = await page.locator('table tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('CAT3: column headers Reference and Core present', async ({ page }) => {
    await goToRoute(page, '/catalog');
    await page.waitForTimeout(2000);
    // DataTable can wrap/rename thead; search anywhere inside the first table.
    const tableText = await page.locator('table').first().textContent({ timeout: 10000 });
    expect(tableText).toMatch(/Reference/);
    expect(tableText).toMatch(/Core/);
  });

  test('CAT4: clicking first "View" button navigates to /magnetic_viewer', async ({ page }) => {
    await goToRoute(page, '/catalog');
    await page.waitForTimeout(2500);
    if ((await realRowCount(page)) === 0) {
      test.skip(true, 'No catalog data in dev env (public/cmcs.ndjson missing)');
      return;
    }
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
 * /magnetic_viewer is Catalog.vue::viewMagnetic(). Without catalog data, the
 * viewer is unreachable and viewer tests skip.
 */
async function reachViewerViaCatalog(page) {
  await goToRoute(page, '/catalog');
  await page.waitForTimeout(2500);
  if ((await realRowCount(page)) === 0) return false;
  const viewBtn = page.locator('table tbody button').filter({ hasText: /^View$/ }).first();
  if (!(await viewBtn.isVisible().catch(() => false))) return false;
  await viewBtn.click();
  await page.waitForURL('**/magnetic_viewer**', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);
  return page.url().includes('magnetic_viewer');
}

test.describe('Magnetic Viewer — interactive view', () => {
  test.describe.configure({ timeout: 90000 });

  test('MV1: viewer page loads after selecting a catalog entry', async ({ page }) => {
    if (!(await reachViewerViaCatalog(page))) {
      test.skip(true, 'Viewer unreachable without catalog data');
      return;
    }
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'MV1-loaded');
  });

  test('MV2: viewer exposes a summary region', async ({ page }) => {
    if (!(await reachViewerViaCatalog(page))) {
      test.skip(true, 'Viewer unreachable without catalog data');
      return;
    }
    const anySummary = page.locator('.compact-card, [data-cy*="summary" i], h2, h3').first();
    await expect(anySummary).toBeVisible({ timeout: 10000 });
    await ss(page, 'MV2-summary');
  });

  test('MV3: viewer renders at least one canvas/svg visualization', async ({ page }) => {
    if (!(await reachViewerViaCatalog(page))) {
      test.skip(true, 'Viewer unreachable without catalog data');
      return;
    }
    await page.waitForTimeout(2000);
    const visuals = await page.locator('canvas, svg').count();
    expect(visuals).toBeGreaterThan(0);
  });

  test('MV4: viewer surfaces a download/export action', async ({ page }) => {
    if (!(await reachViewerViaCatalog(page))) {
      test.skip(true, 'Viewer unreachable without catalog data');
      return;
    }
    const anyAction = page.locator('button').filter({ hasText: /Download|Export|PDF|Datasheet|STP|STL/i });
    const count = await anyAction.count();
    expect(count).toBeGreaterThan(0);
    await ss(page, 'MV4-actions');
  });

  test('MV5: browser back returns to a valid route', async ({ page }) => {
    if (!(await reachViewerViaCatalog(page))) {
      test.skip(true, 'Viewer unreachable without catalog data');
      return;
    }
    await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(1500);
    expect(page.url()).toMatch(/catalog|\/$/);
  });
});
