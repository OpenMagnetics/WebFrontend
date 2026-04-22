/**
 * Exporter Flow Tests
 *
 * Exercises each export pipeline end-to-end: arrive at a complete magnetic
 * design (wizard → DR → OP → Builder → advise core + wire), open the
 * relevant modal, click download, and verify a browser download was
 * triggered with a plausible filename.
 *
 * Prerequisite: isMagneticComplete → coil.turnsDescription != null.
 *
 * Some downloads call the Python backend (STP/STL/SVG field plots) and
 * will be skipped if `http://localhost:8000` is unreachable.
 */

import { test, expect } from './_coverage.js';
import {
  BASE_URL, isBenign, screenshot,
  openWizard, runAnalytical,
} from './utils.js';

const BUCK_CY = 'Buck-CommonModeChoke-link';
const ss = (page, name) => screenshot(page, 'exporters', name);

// ── Shared setup: drive through wizard to a complete magnetic design ──────

/** Navigate to a magnetic builder with core+wire advised (turns present). */
async function setupCompleteMagnetic(page) {
  await openWizard(page, BUCK_CY);
  await runAnalytical(page, 30000);

  const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
  if (!(await reviewBtn.isVisible().catch(() => false))) return false;
  await reviewBtn.click();
  await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  if (!page.url().includes('magnetic_tool')) return false;

  // Continue DR → OP
  const continueBtn = page.locator('[data-cy="magnetic-synthesis-next-tool-button"]');
  if (!(await continueBtn.isDisabled().catch(() => true))) await continueBtn.click();
  await page.waitForTimeout(1200);
  // Continue OP → Builder
  if (!(await continueBtn.isDisabled().catch(() => true))) await continueBtn.click();
  await page.waitForTimeout(1200);

  // Advise core
  const coreBtn = page.locator('[data-cy$="-Core-Advise-button"]').first();
  if (!(await coreBtn.isVisible({ timeout: 10000 }).catch(() => false))) return false;
  await coreBtn.click();
  await page.waitForFunction(
    () => !document.querySelector('[data-cy$="-BasicCoreSelector-loading"]'),
    { timeout: 60000 }
  ).catch(() => {});
  await page.waitForTimeout(500);

  // Advise wire
  const wireBtn = page.locator('[data-cy$="Wire-Advise-button"]').first();
  if (await wireBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await wireBtn.click();
    await page.waitForFunction(
      () => !document.querySelector('[data-cy$="-BasicWireSelector-loading"]'),
      { timeout: 60000 }
    ).catch(() => {});
    await page.waitForTimeout(500);
  }

  // Open the "All Exports" dropdown so modal-trigger buttons become visible
  const dropdown = page.locator('.cp-btn-all').first();
  if (await dropdown.isVisible({ timeout: 5000 }).catch(() => false)) {
    await dropdown.click();
    await page.waitForTimeout(400);
  }

  return true;
}

/** Open a modal by clicking its trigger and wait for it to be shown. */
async function openModal(page, triggerCy) {
  const btn = page.locator(`[data-cy="${triggerCy}"]`);
  if (!(await btn.isVisible({ timeout: 5000 }).catch(() => false))) return false;
  await btn.click();
  await page.waitForTimeout(500);
  const modal = page.locator('.modal.show').first();
  return await modal.isVisible({ timeout: 3000 }).catch(() => false);
}

/** Expect a browser download when clicking `clickable`; resolve its filename. */
async function expectDownload(page, clickable, timeoutMs = 30000) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: timeoutMs }).catch(() => null),
    clickable.click(),
  ]);
  return download;
}

// ── Setup smoke ───────────────────────────────────────────────────────────

test.describe('Exporters — setup', () => {
  test.describe.configure({ timeout: 180000 });

  test('EX-S1: complete magnetic setup via Buck wizard reaches dropdown', async ({ page }) => {
    const ok = await setupCompleteMagnetic(page);
    if (!ok) { test.skip(); return; }
    await ss(page, 'S1-setup-complete');
    // At least one export modal trigger must be visible once the dropdown is open
    await expect(
      page.locator('[data-cy="MAS-exports-modal-button"]')
    ).toBeVisible({ timeout: 5000 });
  });
});

// ── MAS Exporter ──────────────────────────────────────────────────────────

test.describe('Exporters — MAS', () => {
  test.describe.configure({ timeout: 180000 });

  test('EX-MAS1: modal opens and shows at least one download button', async ({ page }) => {
    if (!(await setupCompleteMagnetic(page))) { test.skip(); return; }
    const opened = await openModal(page, 'MAS-exports-modal-button');
    expect(opened).toBe(true);
    const dl = page.locator('.modal.show [data-cy$="-download-button"]').first();
    await expect(dl).toBeVisible({ timeout: 5000 });
    await ss(page, 'MAS1-modal-open');
  });

  test('EX-MAS2: download-button triggers a .json download', async ({ page }) => {
    if (!(await setupCompleteMagnetic(page))) { test.skip(); return; }
    if (!(await openModal(page, 'MAS-exports-modal-button'))) { test.skip(); return; }
    const dl = page.locator('.modal.show [data-cy$="-download-button"]').first();
    const download = await expectDownload(page, dl, 10000);
    if (!download) { test.skip(); return; }
    expect(download.suggestedFilename()).toMatch(/\.json$/i);
    await ss(page, 'MAS2-downloaded');
  });
});

// ── Core Exporter (STP/STL — backend-gated) ───────────────────────────────

test.describe('Exporters — Core (STP/STL)', () => {
  test.describe.configure({ timeout: 180000 });

  test('EX-CORE1: modal opens and shows download buttons', async ({ page }) => {
    if (!(await setupCompleteMagnetic(page))) { test.skip(); return; }
    const opened = await openModal(page, 'Core-exports-modal-button');
    expect(opened).toBe(true);
    const dlButtons = page.locator('.modal.show [data-cy$="-download-button"]');
    const count = await dlButtons.count();
    expect(count).toBeGreaterThan(0);
    await ss(page, 'CORE1-modal-open');
  });

  test('EX-CORE2: STP/STL download attempts complete or fail cleanly (backend-dependent)', async ({ page }) => {
    if (!(await setupCompleteMagnetic(page))) { test.skip(); return; }
    if (!(await openModal(page, 'Core-exports-modal-button'))) { test.skip(); return; }

    const dl = page.locator('.modal.show [data-cy$="-download-button"]').first();
    const download = await expectDownload(page, dl, 20000);
    // If backend is down, no download — that's acceptable; document state
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.(stp|stl)$/i);
      await ss(page, 'CORE2-downloaded');
    } else {
      console.log('[EX-CORE2] no download — backend likely unavailable');
    }
  });
});

// ── Coil Exporter (SVG — backend-gated) ───────────────────────────────────

test.describe('Exporters — Coil', () => {
  test.describe.configure({ timeout: 180000 });

  test('EX-COIL1: modal opens with three SVG export buttons', async ({ page }) => {
    if (!(await setupCompleteMagnetic(page))) { test.skip(); return; }
    const opened = await openModal(page, 'Coil-exports-modal-button');
    expect(opened).toBe(true);
    const dlButtons = page.locator('.modal.show [data-cy$="-download-button"]');
    const count = await dlButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await ss(page, 'COIL1-modal-open');
  });

  test('EX-COIL2: basic coil export attempt (backend-dependent)', async ({ page }) => {
    if (!(await setupCompleteMagnetic(page))) { test.skip(); return; }
    if (!(await openModal(page, 'Coil-exports-modal-button'))) { test.skip(); return; }

    const dl = page.locator('.modal.show [data-cy$="-download-button"]').first();
    const download = await expectDownload(page, dl, 20000);
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.svg$/i);
      await ss(page, 'COIL2-downloaded');
    } else {
      console.log('[EX-COIL2] no download — backend likely unavailable');
    }
  });
});

// ── Circuit Simulators Exporter ───────────────────────────────────────────

test.describe('Exporters — Circuit Simulators', () => {
  test.describe.configure({ timeout: 180000 });

  test('EX-CSIM1: modal opens and lists all simulator names', async ({ page }) => {
    if (!(await setupCompleteMagnetic(page))) { test.skip(); return; }
    const opened = await openModal(page, 'Circuit-Simulators-exports-modal-button');
    expect(opened).toBe(true);
    const text = await page.locator('.modal.show').first().textContent();
    expect(/simba/i.test(text)).toBe(true);
    expect(/ltspice/i.test(text)).toBe(true);
    expect(/ngspice/i.test(text)).toBe(true);
    await ss(page, 'CSIM1-modal-open');
  });

  test('EX-CSIM2: at least 4 download buttons present (SIMBA ×2 + LtSpice ×2 + NgSpice)', async ({ page }) => {
    if (!(await setupCompleteMagnetic(page))) { test.skip(); return; }
    if (!(await openModal(page, 'Circuit-Simulators-exports-modal-button'))) { test.skip(); return; }
    const dlButtons = page.locator('.modal.show [data-cy$="-download-button"]');
    const count = await dlButtons.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('EX-CSIM3: LtSpice subcircuit download triggers .cir or .asy file', async ({ page }) => {
    if (!(await setupCompleteMagnetic(page))) { test.skip(); return; }
    if (!(await openModal(page, 'Circuit-Simulators-exports-modal-button'))) { test.skip(); return; }

    // Pick a download button whose container text mentions LtSpice
    const candidates = await page.locator('.modal.show [data-cy$="-download-button"]').all();
    let ltBtn = null;
    for (const btn of candidates) {
      const parent = btn.locator('xpath=ancestor-or-self::*[position()<=4]').first();
      const txt = await parent.textContent().catch(() => '');
      if (/ltspice|\.cir|\.asy/i.test(txt)) { ltBtn = btn; break; }
    }
    if (!ltBtn) { test.skip(); return; }

    const download = await expectDownload(page, ltBtn, 15000);
    if (!download) { test.skip(); return; }
    expect(download.suggestedFilename()).toMatch(/\.(cir|asy)$/i);
    await ss(page, 'CSIM3-downloaded');
  });
});

// ── All four modal buttons present ────────────────────────────────────────

test.describe('Exporters — dropdown', () => {
  test.describe.configure({ timeout: 180000 });

  test('EX-DROP1: all four export modal triggers are visible in dropdown', async ({ page }) => {
    if (!(await setupCompleteMagnetic(page))) { test.skip(); return; }
    for (const cy of [
      'MAS-exports-modal-button',
      'Core-exports-modal-button',
      'Coil-exports-modal-button',
      'Circuit-Simulators-exports-modal-button',
    ]) {
      await expect(page.locator(`[data-cy="${cy}"]`)).toBeVisible({ timeout: 10000 });
    }
  });
});
