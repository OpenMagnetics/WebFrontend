/**
 * Coil 2D section plot (SVG) tests — WASM path only, no backend.
 *
 * Before MKF's CCI-coordinates fix, the section and field plots called the
 * Python backend (/plot_core, /plot_core_and_fields) because the WASM painter
 * couldn't render litz wires. The CCI coords are now compiled into libMKF.wasm,
 * so these routes must now hit mkf.plot_turns() and mkf.plot_magnetic_field()
 * locally. This suite verifies:
 *   CP-1  Section SVG downloads and starts with <svg
 *   CP-2  Section+H-field SVG downloads and starts with <svg
 *   CP-3  No POST to /plot_core or /plot_core_and_fields during the downloads
 *   CP-4  Wire2DVisualizer renders a litz wire without calling /plot_wire
 *
 * Uses the same Pinia injection setup as exporters-content.spec.js.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { test, expect } from './_coverage.js';
import { BASE_URL, screenshot } from './utils.js';

const MAS_FIXTURE = '/home/alf/OpenMagnetics/WebFrontend/MagneticBuilder/src/public/test_wound_coil.json';
const ss = (page, name) => screenshot(page, 'coil-plot-wasm', name);

async function goToRoute(page, routePath, { timeout = 45000 } = {}) {
  await page.goto(`${BASE_URL}${routePath}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(
    () => !window.location.pathname.includes('engine_loader'),
    null,
    { timeout },
  );
  await page.waitForTimeout(800);
}

/**
 * Load the wound-coil fixture, navigate to magnetic_tool, inject the MAS
 * directly into Pinia, install a self-healing subscription, and open the
 * "All exports" dropdown. Matches the setup used in exporters-content.spec.js.
 */
async function setupCompleteMagnetic(page) {
  const parsed = JSON.parse(fs.readFileSync(MAS_FIXTURE, 'utf-8'));

  await goToRoute(page, '/magnetic_tool');
  await page.waitForTimeout(1000);

  await page.evaluate((parsedMas) => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    const mas = pinia._s.get('mas');
    const state = pinia._s.get('state');

    let healing = false;
    mas.$subscribe(() => {
      if (healing) return;
      const tdStripped = mas.mas?.magnetic?.coil?.turnsDescription == null && mas.mas?.magnetic?.coil;
      const opsStripped = (mas.mas?.inputs?.operatingPoints?.length ?? 0) === 0
        && parsedMas.inputs?.operatingPoints?.length > 0;
      if (tdStripped || opsStripped) {
        healing = true;
        if (tdStripped) mas.mas.magnetic = JSON.parse(JSON.stringify(parsedMas.magnetic));
        if (opsStripped) mas.mas.inputs = JSON.parse(JSON.stringify(parsedMas.inputs));
        healing = false;
      }
    });
    mas.setMas(parsedMas);

    state.selectWorkflow?.('design');
    state.selectTool?.('magneticBuilder');
    state.setCurrentToolSubsection('magneticBuilder');
    state.setCurrentToolSubsectionStatus('designRequirements', true);
    state.setCurrentToolSubsectionStatus('operatingPoints', true);
  }, parsed);

  await page.waitForTimeout(2500);

  const dropdown = page.locator('.cp-btn-all').first();
  await expect(dropdown).toBeVisible({ timeout: 5000 });
  await dropdown.click();
  await page.waitForTimeout(400);
  return true;
}

async function openCoilModal(page) {
  const btn = page.locator('[data-cy="Coil-exports-modal-button"]');
  await expect(btn).toBeVisible({ timeout: 5000 });
  await btn.click();
  await page.waitForTimeout(700);
  await expect(page.locator('.modal.show').first()).toBeVisible({ timeout: 3000 });
}

/**
 * Click `locator` and capture the resulting download. Returns the path to the
 * saved file and the URL strings of all /plot_core* POSTs observed during the
 * operation (for assertion).
 */
async function captureDownloadAndPlotCalls(page, locator, timeoutMs = 20000) {
  const plotCalls = [];
  const onRequest = (req) => {
    const url = req.url();
    if (/\/plot_core(_and_fields)?\b/.test(url) && req.method() === 'POST') {
      plotCalls.push(url);
    }
  };
  page.on('request', onRequest);
  try {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: timeoutMs }),
      locator.click(),
    ]);
    const tmpPath = path.join(os.tmpdir(), `om-svg-${Date.now()}-${download.suggestedFilename()}`);
    await download.saveAs(tmpPath);
    // Give any late-firing backend request time to appear before we stop listening
    await page.waitForTimeout(500);
    return { filename: download.suggestedFilename(), path: tmpPath, plotCalls };
  } finally {
    page.off('request', onRequest);
  }
}

// ── Coil 2D section SVG ───────────────────────────────────────────────────

test.describe('Coil 2D plot — WASM path', () => {
  test.describe.configure({ timeout: 180000 });

  test('CP-1: Download Winding 2D Section returns an SVG without hitting /plot_core', async ({ page }) => {
    await setupCompleteMagnetic(page);
    await openCoilModal(page);

    const btn = page.locator('.modal.show button').filter({ hasText: /^Download Winding 2D Section$/ }).first();
    await expect(btn).toBeVisible({ timeout: 5000 });

    const dl = await captureDownloadAndPlotCalls(page, btn, 15000);

    expect(dl.filename).toMatch(/\.svg$/i);
    const body = fs.readFileSync(dl.path, 'utf-8');
    expect(body.startsWith('<svg')).toBe(true);
    expect(body.length).toBeGreaterThan(1000);
    expect(dl.plotCalls).toEqual([]);
    await ss(page, 'CP1-section-no-backend');
  });

  test('CP-2: Section + H field (with fringing) returns SVG without backend', async ({ page }) => {
    await setupCompleteMagnetic(page);
    await openCoilModal(page);

    const btn = page.locator('.modal.show button').filter({ hasText: /^Download Winding 2D Section with H field$/ }).first();
    await expect(btn).toBeVisible({ timeout: 5000 });

    const dl = await captureDownloadAndPlotCalls(page, btn, 20000);

    expect(dl.filename).toMatch(/\.svg$/i);
    const body = fs.readFileSync(dl.path, 'utf-8');
    expect(body.startsWith('<svg')).toBe(true);
    expect(body.length).toBeGreaterThan(1000);
    expect(dl.plotCalls).toEqual([]);
    await ss(page, 'CP2-field-no-backend');
  });

  test('CP-3: Section + H field (no fringing) returns SVG without backend', async ({ page }) => {
    await setupCompleteMagnetic(page);
    await openCoilModal(page);

    const btn = page.locator('.modal.show button')
      .filter({ hasText: /Download Winding 2D Section with H field but no fringing/ })
      .first();
    await expect(btn).toBeVisible({ timeout: 5000 });

    const dl = await captureDownloadAndPlotCalls(page, btn, 20000);

    expect(dl.filename).toMatch(/\.svg$/i);
    const body = fs.readFileSync(dl.path, 'utf-8');
    expect(body.startsWith('<svg')).toBe(true);
    expect(dl.plotCalls).toEqual([]);
    await ss(page, 'CP3-field-no-fringing-no-backend');
  });
});

// ── Litz-wire Wire2DVisualizer ────────────────────────────────────────────

test.describe('Wire2DVisualizer — litz uses WASM', () => {
  test.describe.configure({ timeout: 180000 });

  test('CP-4: after swapping to a litz wire, no POST /plot_wire is made', async ({ page }) => {
    const plotWireCalls = [];
    page.on('request', (req) => {
      if (/\/plot_wire\b/.test(req.url()) && req.method() === 'POST') {
        plotWireCalls.push(req.url());
      }
    });

    await setupCompleteMagnetic(page);

    // Swap the first winding's wire to a minimal litz-typed wire. The purpose
    // of the test is to verify the routing decision in Wire2DVisualizer.tryToSend:
    // when type === 'litz', the old code path always called /plot_wire. The new
    // code path must go through mkf.plot_wire locally regardless of type, so no
    // POST /plot_wire should appear.
    await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const mas = pinia._s.get('mas');
      const litz = {
        type: 'litz',
        standard: 'IEC 60317',
        material: 'copper',
        numberConductors: 7,
        strand: {
          type: 'round',
          standard: 'IEC 60317',
          material: 'copper',
          conductingDiameter: { nominal: 0.000202 },
          outerDiameter: { nominal: 0.000212 },
          numberConductors: 1,
          coating: { type: 'enamelled', grade: 1 },
        },
        coating: { type: 'enamelled', grade: 1 },
        outerDiameter: { nominal: 0.0007 },
        name: 'Litz 7x0.202mm (test)',
      };
      mas.mas.magnetic.coil.functionalDescription[0].wire = litz;
    });

    // Give Wire2DVisualizer's watcher time to fire and either paint locally or
    // — in the old behaviour — POST to the backend.
    await page.waitForTimeout(2000);
    await ss(page, 'CP4-after-litz-swap');

    expect(plotWireCalls).toEqual([]);
  });
});
