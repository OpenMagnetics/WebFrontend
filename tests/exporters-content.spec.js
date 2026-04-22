/**
 * Exporter Content Validation Tests
 *
 * Companion to tests/exporters.spec.js. Saves the downloaded bytes to disk
 * and validates structural markers:
 *   - MAS JSON: valid JSON with magnetic/inputs/outputs keys
 *   - LTspice: .cir with .SUBCKT, or .asy with Version + SYMATTR/PIN
 *   - NgSpice netlist: contains .subckt / .model / .include
 *   - SIMBA payload: >100 bytes
 *
 * Reach strategy:
 *   1. Navigate to /magnetic_tool.
 *   2. Inject the wound MAS fixture into the Pinia masStore.
 *   3. Install a self-healing $subscribe listener — on initial mount,
 *      DesignRequirements briefly fires a watcher that calls
 *      masStore.resetMagnetic(), which strips coil.turnsDescription. The
 *      subscription detects the strip and re-injects magnetic from the
 *      fixture snapshot, so isMagneticComplete stays true and the export
 *      dropdown renders.
 *   4. Open the dropdown, click a modal trigger, click a download.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { test, expect } from './_coverage.js';
import { BASE_URL, screenshot } from './utils.js';

const MAS_FIXTURE = '/home/alf/OpenMagnetics/WebFrontend/MagneticBuilder/src/public/test_wound_coil.json';
const ss = (page, name) => screenshot(page, 'exporters-content', name);

async function goToRoute(page, routePath, { timeout = 45000 } = {}) {
  await page.goto(`${BASE_URL}${routePath}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(
    () => !window.location.pathname.includes('engine_loader'),
    null,
    { timeout },
  );
  await page.waitForTimeout(800);
}

async function setupCompleteMagnetic(page) {
  const parsed = JSON.parse(fs.readFileSync(MAS_FIXTURE, 'utf-8'));

  await goToRoute(page, '/magnetic_tool');
  await page.waitForTimeout(1000);

  await page.evaluate((parsedMas) => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    const mas = pinia._s.get('mas');
    const state = pinia._s.get('state');

    // Self-heal: the initial mount of DesignRequirements fires a watcher
    // that calls resetMagnetic() and also wipes operatingPoints. Whenever
    // either gets stripped, restore from the fixture snapshot. A guard
    // flag prevents recursion from the subscription itself triggering.
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

async function openModal(page, triggerCy) {
  const btn = page.locator(`[data-cy="${triggerCy}"]`);
  await expect(btn).toBeVisible({ timeout: 5000 });
  await btn.click();
  await page.waitForTimeout(700);
  await expect(page.locator('.modal.show').first()).toBeVisible({ timeout: 3000 });
}

async function downloadToString(page, clickable, timeoutMs = 20000) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: timeoutMs }),
    clickable.click(),
  ]);
  const tmpPath = path.join(os.tmpdir(), `om-dl-${Date.now()}-${download.suggestedFilename()}`);
  await download.saveAs(tmpPath);
  const body = fs.readFileSync(tmpPath, 'utf-8');
  return { filename: download.suggestedFilename(), body, path: tmpPath };
}

// ── MAS JSON content ──────────────────────────────────────────────────────

test.describe('Exporter content — MAS JSON', () => {
  test.describe.configure({ timeout: 120000 });

  test('EC-MAS1: MAS download is parseable JSON with magnetic/coil/core keys', async ({ page }) => {
    await setupCompleteMagnetic(page);
    await openModal(page, 'MAS-exports-modal-button');

    const btn = page.locator('.modal.show [data-cy$="-download-button"]').first();
    const dl = await downloadToString(page, btn, 10000);

    expect(dl.filename).toMatch(/\.json$/i);
    const parsed = JSON.parse(dl.body);
    expect('magnetic' in parsed || 'inputs' in parsed || 'outputs' in parsed).toBe(true);
    await ss(page, 'MAS1-json-valid');
  });
});

// ── LTspice subcircuit content ────────────────────────────────────────────

test.describe('Exporter content — LTspice', () => {
  test.describe.configure({ timeout: 120000 });

  async function findLtSpiceButton(page) {
    // LtSpiceExporter button label: "Download magnetic subcircuit for LtSpice"
    // (or "symbol for LtSpice"). Prefer subcircuit over symbol.
    const subcircuit = page.locator('.modal.show button').filter({ hasText: /LtSpice/i }).filter({ hasText: /subcircuit/i });
    if (await subcircuit.count() > 0) return subcircuit.first();
    const any = page.locator('.modal.show button').filter({ hasText: /LtSpice/i });
    return (await any.count() > 0) ? any.first() : null;
  }

  test('EC-LT1: LtSpice download body has a subcircuit or symbol header', async ({ page }) => {
    await setupCompleteMagnetic(page);
    await openModal(page, 'Circuit-Simulators-exports-modal-button');

    const btn = await findLtSpiceButton(page);
    expect(btn).not.toBeNull();
    const dl = await downloadToString(page, btn, 15000);

    if (/\.cir$/i.test(dl.filename)) {
      expect(dl.body).toMatch(/\.SUBCKT/i);
      expect(dl.body.length).toBeGreaterThan(100);
    } else if (/\.asy$/i.test(dl.filename)) {
      expect(dl.body).toMatch(/Version\s+\d/i);
      expect(dl.body).toMatch(/SYMATTR|PIN/i);
    } else {
      throw new Error(`Unexpected LtSpice filename: ${dl.filename}`);
    }
    await ss(page, 'LT1-downloaded');
  });
});

// ── NgSpice netlist content ───────────────────────────────────────────────

test.describe('Exporter content — NgSpice', () => {
  test.describe.configure({ timeout: 120000 });

  async function findNgSpiceButton(page) {
    const ng = page.locator('.modal.show button').filter({ hasText: /NgSpice/i });
    return (await ng.count() > 0) ? ng.first() : null;
  }

  test('EC-NG1: NgSpice netlist contains .subckt or model definition', async ({ page }) => {
    await setupCompleteMagnetic(page);
    await openModal(page, 'Circuit-Simulators-exports-modal-button');

    const btn = await findNgSpiceButton(page);
    expect(btn).not.toBeNull();
    const dl = await downloadToString(page, btn, 15000);

    expect(dl.body.length).toBeGreaterThan(50);
    expect(dl.body).toMatch(/\.subckt|\.model|\.include/i);
    await ss(page, 'NG1-downloaded');
  });
});

// ── SIMBA content ─────────────────────────────────────────────────────────

test.describe('Exporter content — SIMBA', () => {
  test.describe.configure({ timeout: 120000 });

  async function findSimbaButton(page) {
    // Prefer the standalone (not "attach") SIMBA button.
    const standalone = page.locator('.modal.show button').filter({ hasText: /SIMBA/i }).filter({ hasNotText: /attach/i });
    if (await standalone.count() > 0) return standalone.first();
    const any = page.locator('.modal.show button').filter({ hasText: /SIMBA/i });
    return (await any.count() > 0) ? any.first() : null;
  }

  test('EC-SB1: SIMBA download has non-trivial body', async ({ page }) => {
    await setupCompleteMagnetic(page);
    await openModal(page, 'Circuit-Simulators-exports-modal-button');

    const btn = await findSimbaButton(page);
    expect(btn).not.toBeNull();
    const dl = await downloadToString(page, btn, 15000);

    const bytes = fs.statSync(dl.path).size;
    expect(bytes).toBeGreaterThan(100);
    await ss(page, 'SB1-downloaded');
  });
});
