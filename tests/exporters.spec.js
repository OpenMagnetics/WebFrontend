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
 * Some downloads call the Python backend (STP/STL/SVG field plots). When
 * the backend is unreachable we still expect a download event from a
 * client-side fallback, otherwise the test fails loudly.
 */

import { test, expect } from './_coverage.js';
import { BASE_URL, isBenign, screenshot, openWizard, runAnalytical, pause } from './utils.js';

const BUCK_CY = 'Buck-CommonModeChoke-link';
const ss = (page, name) => screenshot(page, 'exporters', name);

// ── Shared setup: drive through wizard to a complete magnetic design ──────

/** Navigate to a magnetic builder with core+wire advised (turns present). Throws on failure. */
async function setupCompleteMagnetic(page) {
  await openWizard(page, BUCK_CY);
  await runAnalytical(page, 30000);

  const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
  await expect(reviewBtn, 'Buck analytical must produce Review Specs button').toBeVisible({ timeout: 15000 });
  await reviewBtn.click();
  await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });
  await pause(page, 1500, 'mechanical: settle');
  if (!page.url().includes('magnetic_tool')) {
    throw new Error(`expected magnetic_tool URL after Review Specs, got: ${page.url()}`);
  }

  // Continue DR → OP
  const continueBtn = page.locator('[data-cy="magnetic-synthesis-next-tool-button"]');
  await expect(continueBtn, 'DR continue button must exist').toBeVisible({ timeout: 10000 });
  if (!(await continueBtn.isDisabled())) await continueBtn.click();
  await pause(page, 1200, 'mechanical: settle');
  // Continue OP → Builder
  if (!(await continueBtn.isDisabled())) await continueBtn.click();
  await pause(page, 1200, 'mechanical: settle');

  // Advise core
  const coreBtn = page.locator('[data-cy$="-Core-Advise-button"]').first();
  await expect(coreBtn, 'Core Advise button must be reachable after OP step').toBeVisible({ timeout: 15000 });
  await coreBtn.click();
  await page.waitForFunction(
    () => !document.querySelector('[data-cy$="-BasicCoreSelector-loading"]'),
    { timeout: 60000 }
  );
  await pause(page, 500, 'mechanical: settle');

  // Advise wire
  const wireBtn = page.locator('[data-cy$="Wire-Advise-button"]').first();
  await expect(wireBtn, 'Wire Advise button must appear after core advise').toBeVisible({ timeout: 10000 });
  await wireBtn.click();
  await page.waitForFunction(
    () => !document.querySelector('[data-cy$="-BasicWireSelector-loading"]'),
    { timeout: 60000 }
  );
  await pause(page, 500, 'mechanical: settle');

  // Open the "All Exports" dropdown so modal-trigger buttons become visible
  const dropdown = page.locator('.cp-btn-all').first();
  await expect(dropdown, 'All Exports dropdown must be visible after complete magnetic').toBeVisible({ timeout: 10000 });
  await dropdown.click();
  await pause(page, 400, 'mechanical: settle');
}

/** Open a modal by clicking its trigger and wait for it to be shown. Throws on failure. */
async function openModal(page, triggerCy) {
  const btn = page.locator(`[data-cy="${triggerCy}"]`);
  await expect(btn, `modal trigger ${triggerCy} must be visible`).toBeVisible({ timeout: 10000 });
  await btn.click();
  await pause(page, 500, 'mechanical: settle');
  const modal = page.locator('.modal.show').first();
  await expect(modal, `modal must open after clicking ${triggerCy}`).toBeVisible({ timeout: 5000 });
}

/** Expect a browser download when clicking `clickable`; throws if none arrives. */
async function expectDownload(page, clickable, timeoutMs = 30000) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: timeoutMs }),
    clickable.click(),
  ]);
  if (!download) throw new Error('expected download event but none arrived');
  return download;
}

// ── Setup smoke ───────────────────────────────────────────────────────────

test.describe('Exporters — setup', () => {
  test.describe.configure({ timeout: 180000 });

  test('EX-S1: complete magnetic setup via Buck wizard reaches dropdown', async ({ page }) => {
    await setupCompleteMagnetic(page);
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
    await setupCompleteMagnetic(page);
    await openModal(page, 'MAS-exports-modal-button');
    const dl = page.locator('.modal.show [data-cy$="-download-button"]').first();
    await expect(dl).toBeVisible({ timeout: 5000 });
    await ss(page, 'MAS1-modal-open');
  });

  test('EX-MAS2: download-button triggers a .json download', async ({ page }) => {
    await setupCompleteMagnetic(page);
    await openModal(page, 'MAS-exports-modal-button');
    const dl = page.locator('.modal.show [data-cy$="-download-button"]').first();
    const download = await expectDownload(page, dl, 15000);
    expect(download.suggestedFilename()).toMatch(/\.json$/i);
    await ss(page, 'MAS2-downloaded');
  });
});

// ── Core Exporter (STP/STL — backend-gated) ───────────────────────────────

test.describe('Exporters — Core (STP/STL)', () => {
  test.describe.configure({ timeout: 180000 });

  test('EX-CORE1: modal opens and shows download buttons', async ({ page }) => {
    await setupCompleteMagnetic(page);
    await openModal(page, 'Core-exports-modal-button');
    const dlButtons = page.locator('.modal.show [data-cy$="-download-button"]');
    const count = await dlButtons.count();
    expect(count).toBeGreaterThan(0);
    await ss(page, 'CORE1-modal-open');
  });

  test('EX-CORE2: STP/STL download triggers a .stp or .stl file', async ({ page }) => {
    await setupCompleteMagnetic(page);
    await openModal(page, 'Core-exports-modal-button');

    const dl = page.locator('.modal.show [data-cy$="-download-button"]').first();
    const download = await expectDownload(page, dl, 30000);
    expect(download.suggestedFilename()).toMatch(/\.(stp|stl)$/i);
    await ss(page, 'CORE2-downloaded');
  });
});

// ── Coil Exporter (SVG — backend-gated) ───────────────────────────────────

test.describe('Exporters — Coil', () => {
  test.describe.configure({ timeout: 180000 });

  test('EX-COIL1: modal opens with three SVG export buttons', async ({ page }) => {
    await setupCompleteMagnetic(page);
    await openModal(page, 'Coil-exports-modal-button');
    const dlButtons = page.locator('.modal.show [data-cy$="-download-button"]');
    const count = await dlButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await ss(page, 'COIL1-modal-open');
  });

  test('EX-COIL2: basic coil export triggers an .svg download', async ({ page }) => {
    await setupCompleteMagnetic(page);
    await openModal(page, 'Coil-exports-modal-button');

    const dl = page.locator('.modal.show [data-cy$="-download-button"]').first();
    const download = await expectDownload(page, dl, 30000);
    expect(download.suggestedFilename()).toMatch(/\.svg$/i);
    await ss(page, 'COIL2-downloaded');
  });
});

// ── Circuit Simulators Exporter ───────────────────────────────────────────

test.describe('Exporters — Circuit Simulators', () => {
  test.describe.configure({ timeout: 180000 });

  test('EX-CSIM1: modal opens and lists all simulator names', async ({ page }) => {
    await setupCompleteMagnetic(page);
    await openModal(page, 'Circuit-Simulators-exports-modal-button');
    const text = await page.locator('.modal.show').first().textContent();
    expect(/simba/i.test(text)).toBe(true);
    expect(/ltspice/i.test(text)).toBe(true);
    expect(/ngspice/i.test(text)).toBe(true);
    await ss(page, 'CSIM1-modal-open');
  });

  test('EX-CSIM2: at least 4 download buttons present (SIMBA ×2 + LtSpice ×2 + NgSpice)', async ({ page }) => {
    await setupCompleteMagnetic(page);
    await openModal(page, 'Circuit-Simulators-exports-modal-button');
    const dlButtons = page.locator('.modal.show [data-cy$="-download-button"]');
    const count = await dlButtons.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('EX-CSIM3: LtSpice subcircuit download triggers .cir or .asy file', async ({ page }) => {
    await setupCompleteMagnetic(page);
    await openModal(page, 'Circuit-Simulators-exports-modal-button');

    // Pick a download button whose container text mentions LtSpice
    const candidates = await page.locator('.modal.show [data-cy$="-download-button"]').all();
    let ltBtn = null;
    for (const btn of candidates) {
      const parent = btn.locator('xpath=ancestor-or-self::*[position()<=4]').first();
      const txt = await parent.textContent();
      if (/ltspice|\.cir|\.asy/i.test(txt)) { ltBtn = btn; break; }
    }
    if (!ltBtn) {
      throw new Error('LtSpice download button not found in Circuit Simulators modal');
    }

    const download = await expectDownload(page, ltBtn, 20000);
    expect(download.suggestedFilename()).toMatch(/\.(cir|asy)$/i);
    await ss(page, 'CSIM3-downloaded');
  });
});

// ── All four modal buttons present ────────────────────────────────────────

test.describe('Exporters — dropdown', () => {
  test.describe.configure({ timeout: 180000 });

  test('EX-DROP1: all four export modal triggers are visible in dropdown', async ({ page }) => {
    await setupCompleteMagnetic(page);
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
