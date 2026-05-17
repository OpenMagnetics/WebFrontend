/**
 * tests/utils/steps.js
 *
 * Composable single-purpose steps that operate on the magnetic tool. Each
 * step is one named verb; scenarios.js stitches them into end-to-end flows.
 *
 * Every step:
 *   • takes `(page, opts?)`
 *   • throws on missing UI rather than returning false
 *   • wraps itself in `test.step(...)` so traces / HTML reports show the
 *     scenario as a tree of named steps
 *   • returns whatever downstream steps need (a count, a buffer, void)
 *
 * Data-cy reference (verified against src/ on 2026-05-17):
 *   MagneticBuilder-MagneticAdviser-calculate-mas-advises-button
 *   MagneticBuilder-MagneticAdviser-load-and-go-to-builder-button
 *   MagneticBuilder-MagneticAdviser-advise-{N}-select-button
 *   MagneticBuilder-magnetic-core-adviser-button
 *   MagneticBuilder-magnetic-builder-button
 *   {Coil,Core,MAS,Circuit-Simulators}-exports-modal-button
 *   {dataTestLabel}-download-button   (inside CoreStl/CoilWinding/etc. exporters)
 */
import path from 'node:path';
import os from 'node:os';
import { test, expect } from '@playwright/test';
import { settleAnimations, waitForCoreAdviserDone, waitForStore } from './wait.js';
import { coreAdviseBtn } from './locators.js';

/* ── Pinia store access ───────────────────────────────────────────────── */

/**
 * Runs `fn(pinia)` in the page context where `pinia` is the app's Pinia
 * instance. Throws if the Vue app or pinia plugin is not yet attached.
 *
 * Pinia store keys (verified): 'mas', 'state', 'adviseCache', 'user',
 * 'settings', 'catalog'. Use `pinia._s.get(key)` to access each.
 */
export async function withPinia(page, fn) {
  const result = await page.evaluate((src) => {
    const app = document.querySelector('#app')?.__vue_app__;
    if (!app) throw new Error('withPinia: #app.__vue_app__ not found');
    const pinia = app.config.globalProperties.$pinia;
    if (!pinia?._s) throw new Error('withPinia: $pinia._s missing');
    // eslint-disable-next-line no-new-func
    const f = new Function('pinia', `return (${src})(pinia);`);
    return f(pinia);
  }, fn.toString());
  return result;
}

/* ── Magnetic Adviser ─────────────────────────────────────────────────── */

/**
 * On the magnetic-tool page after clicking the Magnetic Adviser entry,
 * click "Get Advised Magnetics" and wait for the spinner to clear.
 * Returns the number of advised-result cards visible.
 */
export async function runMagneticAdviser(page, { timeoutMs = 180_000 } = {}) {
  return test.step('runMagneticAdviser', async () => {
    const btn = page.locator(
      '[data-cy="MagneticBuilder-MagneticAdviser-calculate-mas-advises-button"]'
    );
    await btn.waitFor({ state: 'visible', timeout: 15_000 });
    if (await btn.isDisabled()) {
      throw new Error('runMagneticAdviser: calculate button is disabled');
    }
    await btn.click();

    // Done when the loading panel goes away AND at least one result-card's
    // select-button is in the DOM (or the empty-state appears).
    await page.waitForFunction(
      () =>
        document.querySelector(
          '[data-cy^="MagneticBuilder-MagneticAdviser-advise-"][data-cy$="-select-button"]'
        ) !== null
        || /No Results Yet/i.test(document.body.innerText),
      { timeout: timeoutMs }
    );
    await settleAnimations(page, 500);

    const count = await page
      .locator(
        '[data-cy^="MagneticBuilder-MagneticAdviser-advise-"][data-cy$="-select-button"]'
      )
      .count();
    return count;
  });
}

/**
 * Click the select-button on advised-result row N and then commit by
 * clicking "Load Selected" (load-and-go-to-builder). The page navigates
 * back to the builder view with the chosen design loaded.
 */
export async function selectAdvisedResult(page, index = 0) {
  return test.step(`selectAdvisedResult[${index}]`, async () => {
    const sel = page.locator(
      `[data-cy="MagneticBuilder-MagneticAdviser-advise-${index}-select-button"]`
    );
    await sel.waitFor({ state: 'visible', timeout: 10_000 });
    await sel.click();
    await settleAnimations(page, 250);

    const loadBtn = page.locator(
      '[data-cy="MagneticBuilder-MagneticAdviser-load-and-go-to-builder-button"]'
    );
    await loadBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(loadBtn).toBeEnabled();
    await loadBtn.click();
    await settleAnimations(page, 800);
  });
}

/* ── Core Adviser ─────────────────────────────────────────────────────── */

/**
 * From the builder tab, click the Core "Advise" button and wait for the
 * WASM run to re-enable it. Returns void.
 */
export async function runCoreAdviser(page, { timeoutMs = 120_000 } = {}) {
  return test.step('runCoreAdviser', async () => {
    const builderTab = page.locator(
      '[data-cy="MagneticBuilder-magnetic-builder-button"]'
    );
    if (await builderTab.isVisible().catch(() => false)) {
      await builderTab.click();
      await settleAnimations(page, 300);
    }
    const btn = coreAdviseBtn(page);
    await btn.waitFor({ state: 'visible', timeout: 15_000 });
    if (await btn.isDisabled()) {
      throw new Error('runCoreAdviser: Core Advise button is disabled before click');
    }
    await btn.click();
    await waitForCoreAdviserDone(page, timeoutMs);
  });
}

/* ── MAS / store snapshots ────────────────────────────────────────────── */

/**
 * Snapshot the current MAS from the Pinia 'mas' store. Throws if the store
 * is missing or has no MAS (we want hard fails, not nulls).
 */
export async function dumpMAS(page) {
  return test.step('dumpMAS', async () => {
    const mas = await page.evaluate(() => {
      const app = document.querySelector('#app')?.__vue_app__;
      if (!app) return { __err: 'no #app.__vue_app__' };
      const pinia = app.config.globalProperties.$pinia;
      const store = pinia?._s?.get?.('mas');
      if (!store) return { __err: 'no pinia.mas store' };
      // The store exposes `.mas` as a reactive ref.
      const raw = store.mas ?? store.$state?.mas;
      return raw ? JSON.parse(JSON.stringify(raw)) : { __err: 'mas store empty' };
    });
    if (mas && mas.__err) {
      throw new Error(`dumpMAS: ${mas.__err}`);
    }
    if (!mas) throw new Error('dumpMAS: page.evaluate returned nullish');
    return mas;
  });
}

/**
 * Wait until the magnetic store has at least one operating point — i.e. a
 * simulation has produced results. Sync barrier after runAnalytical /
 * runSimulated.
 */
export async function waitForOperatingPoint(page, timeoutMs = 30_000) {
  return test.step('waitForOperatingPoint', async () => {
    await waitForStore(page, () => {
      const app = document.querySelector('#app')?.__vue_app__;
      const store = app?.config?.globalProperties?.$pinia?._s?.get?.('mas');
      const ops = store?.mas?.inputs?.operatingPoints;
      return Array.isArray(ops) && ops.length > 0;
    }, timeoutMs);
  });
}

/* ── Export modals (2D / 3D / MAS) ────────────────────────────────────── */

const MODAL_CY = {
  mas:  'MAS-exports-modal-button',
  core: 'Core-exports-modal-button',
  coil: 'Coil-exports-modal-button',
  sim:  'Circuit-Simulators-exports-modal-button',
};

/** Open one of the four export modals by short key (mas|core|coil|sim). */
export async function openExportsModal(page, kind) {
  const cy = MODAL_CY[kind];
  if (!cy) throw new Error(`openExportsModal: unknown kind "${kind}" (mas|core|coil|sim)`);
  return test.step(`openExportsModal[${kind}]`, async () => {
    const btn = page.locator(`[data-cy="${cy}"]`).first();
    await btn.waitFor({ state: 'visible', timeout: 10_000 });
    await btn.click();
    await page.locator('.modal.show').first().waitFor({ state: 'visible', timeout: 5_000 });
  });
}

/** Close any open Bootstrap modal via Escape. No-op if none is open. */
export async function closeOpenModal(page) {
  const modal = page.locator('.modal.show');
  if (await modal.count() === 0) return;
  await page.keyboard.press('Escape');
  await modal.first().waitFor({ state: 'hidden', timeout: 5_000 });
}

/**
 * Generic "click a button inside the open modal whose text matches `re`,
 * capture the resulting browser download, save to a temp file, and return
 * the saved path + file size".
 *
 * Throws if no download fires within `timeoutMs` (downloads in this app are
 * synthesised client-side from blobs so they should appear immediately).
 */
export async function captureModalDownload(page, re, { timeoutMs = 30_000 } = {}) {
  const btn = page.locator('.modal.show button').filter({ hasText: re }).first();
  await btn.waitFor({ state: 'visible', timeout: 10_000 });
  await expect(btn).toBeEnabled();
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: timeoutMs }),
    btn.click(),
  ]);
  const filename = download.suggestedFilename();
  const dest = path.join(os.tmpdir(), `om-dl-${Date.now()}-${filename}`);
  await download.saveAs(dest);
  const fs = await import('node:fs');
  const size = fs.statSync(dest).size;
  return { filename, path: dest, size };
}

/**
 * Open the Coil modal and download "Winding 2D Section". Returns
 * { filename, path, size, body } — body is the SVG markup as a string.
 *
 * Caller is responsible for the modal being reachable (a built magnetic
 * with sections must be present, which is the case after
 * fullMagneticViaAdviser / fullMagneticViaCoreAndWireAdvisers).
 */
export async function download2DCoilSVG(page) {
  return test.step('download2DCoilSVG', async () => {
    await openExportsModal(page, 'coil');
    const dl = await captureModalDownload(page, /^Download Winding 2D Section$/);
    const fs = await import('node:fs');
    const body = fs.readFileSync(dl.path, 'utf-8');
    if (!body.startsWith('<svg')) {
      throw new Error(`download2DCoilSVG: downloaded file is not an SVG (starts with: ${body.slice(0, 40)})`);
    }
    await closeOpenModal(page);
    return { ...dl, body };
  });
}

/**
 * Open the Core modal and download an STL. Returns { filename, path, size }.
 * The button text matches both "Download Core STL" and the STP variant —
 * we ask for STL specifically.
 */
export async function build3DCoreSTL(page) {
  return test.step('build3DCoreSTL', async () => {
    await openExportsModal(page, 'core');
    const dl = await captureModalDownload(page, /STL/i);
    await closeOpenModal(page);
    return dl;
  });
}

/* ── Simulated waveforms ──────────────────────────────────────────────── */

/** Click the Simulated button on a wizard and wait for spinner to clear. */
export async function runSimulated(page, { timeoutMs = 60_000 } = {}) {
  return test.step('runSimulated', async () => {
    const btn = page.locator('.sim-btn.simulated, .sim-btn').filter({ hasText: 'Simulated' }).first();
    await btn.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(btn).toBeEnabled();
    await btn.click();
    await page.waitForFunction(
      () => !document.querySelector('.sim-btn.simulated .fa-spinner, .sim-btn .fa-spinner'),
      { timeout: timeoutMs }
    );
    await settleAnimations(page, 300);
  });
}
