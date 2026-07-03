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
import { expectValidSpiceNetlist } from './assertions.js';

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
    // select-button is in the DOM (or the empty-state appears). The card
    // data-cy is `${parentLabel}-advise-N-select-button`; parentLabel may
    // be empty so we match by suffix.
    await page.waitForFunction(
      () =>
        document.querySelector(
          '[data-cy*="-advise-"][data-cy$="-select-button"]'
        ) !== null
        || /No Results Yet/i.test(document.body.innerText),
      { timeout: timeoutMs }
    );
    await settleAnimations(page, 500);

    const count = await page
      .locator(
        '[data-cy*="-advise-"][data-cy$="-select-button"]'
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
    // Card data-cy is `${parentLabel}-advise-N-select-button`; parentLabel
    // defaults to '' in MagneticAdviser/Advise.vue, so we suffix-match the
    // index. Picking the Nth match by data-cy ordering keeps it deterministic.
    const sel = page.locator(
      `[data-cy$="-advise-${index}-select-button"]`
    ).first();
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
    // After "Review Specs" we land on /magnetic_tool at the storyline's
    // first step (designRequirements). Navigate to the "Magnetic Builder"
    // storyline step where BasicCoreSelector (with its Advise button)
    // is mounted. Storyline data-cy comes from toPascalCase(title) so
    // "Magnetic Builder" → "MagneticBuilder".
    const storyBtn = page.locator('[data-cy="storyline-MagneticBuilder-button"]').first();
    if (await storyBtn.isVisible().catch(() => false)) {
      if (!(await storyBtn.isDisabled())) {
        await storyBtn.click();
        await settleAnimations(page, 400);
      }
    }
    // Backwards-compat: older builds exposed a tab button at this id; if
    // it exists, click it as well. Harmless when absent.
    const builderTab = page.locator(
      '[data-cy="MagneticBuilder-magnetic-builder-button"]'
    );
    if (await builderTab.isVisible().catch(() => false)) {
      await builderTab.click();
      await settleAnimations(page, 300);
    }
    const btn = coreAdviseBtn(page);
    try {
      await btn.waitFor({ state: 'visible', timeout: 15_000 });
    } catch (e) {
      const diag = await page.evaluate(() => {
        const allCy = Array.from(document.querySelectorAll('[data-cy]'))
          .map((el) => el.getAttribute('data-cy'))
          .filter((c) => /Core|Advise|magnetic-builder|MagneticBuilder|storyline/i.test(c))
          .slice(0, 40);
        const subBtns = Array.from(document.querySelectorAll('[data-cy$="-magnetic-builder-button"]'))
          .map((el) => ({ cy: el.getAttribute('data-cy'), visible: el.offsetParent !== null }));
        const url = location.href;
        return { url, subBtns, allCy };
      });
      throw new Error(`runCoreAdviser: Core-Advise button never visible.\nDiagnostics: ${JSON.stringify(diag, null, 2)}\nOriginal: ${e.message}`);
    }
    if (await btn.isDisabled()) {
      throw new Error('runCoreAdviser: Core Advise button is disabled before click');
    }
    await btn.click();

    // Wait until the WASM run resolves: either a core was assigned, or the
    // BasicCoreSelector posted its "No core can be advised" inline error
    // (it clears itself after 10s, so we must catch it inside that window).
    // The button re-enabling alone is insufficient — see the silent-failure
    // path at BasicCoreSelector.vue:500-505.
    await page.waitForFunction(() => {
      const btn = document.querySelector('[data-cy$="-Core-Advise-button"]');
      if (!btn || btn.disabled) return false;
      const app = document.querySelector('#app')?.__vue_app__;
      const store = app?.config?.globalProperties?.$pinia?._s?.get?.('mas');
      const core = store?.mas?.magnetic?.core?.functionalDescription;
      const shape = typeof core?.shape === 'string' ? core.shape : core?.shape?.name;
      if (shape && shape !== '') return true;
      // Error label is `text-danger` inside the core selector; match by text.
      const err = Array.from(document.querySelectorAll('label.text-danger'))
        .some(el => /No core can be advised/i.test(el.textContent || ''));
      return err;
    }, { timeout: timeoutMs });

    const result = await page.evaluate(() => {
      const app = document.querySelector('#app')?.__vue_app__;
      const store = app?.config?.globalProperties?.$pinia?._s?.get?.('mas');
      const core = store?.mas?.magnetic?.core?.functionalDescription;
      const shape = typeof core?.shape === 'string' ? core.shape : core?.shape?.name ?? null;
      const material = typeof core?.material === 'string' ? core.material : core?.material?.name ?? null;
      const errEl = Array.from(document.querySelectorAll('label.text-danger'))
        .find(el => /No core can be advised/i.test(el.textContent || ''));
      return {
        shape,
        material,
        onPageError: errEl ? errEl.textContent.trim().slice(0, 200) : null,
      };
    });
    if (!result.shape || !result.material) {
      throw new Error(
        `runCoreAdviser: Core Adviser completed but did not populate a core ` +
        `(shape=${JSON.stringify(result.shape)}, material=${JSON.stringify(result.material)})` +
        (result.onPageError ? ` — on-page error: "${result.onPageError}"` : '')
      );
    }
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
    // The exports buttons live inside the ControlPanel "All Exports"
    // Bootstrap dropdown — they are display:none until the parent
    // dropdown-toggle is opened. If our target isn't visible yet, open
    // the parent dropdown that owns it.
    if (!(await btn.isVisible().catch(() => false))) {
      const dropdownMenu = page.locator('.dropdown-menu', { has: btn }).first();
      const toggle = dropdownMenu.locator('xpath=preceding-sibling::button[contains(@class,"dropdown-toggle")]').first();
      if (await toggle.count()) {
        await toggle.click();
        await settleAnimations(page, 150);
      }
    }
    await btn.waitFor({ state: 'visible', timeout: 10_000 });
    await btn.click();
    // Exporters are PrimeVue Dialogs since ed89b98 ("drop Bootstrap vocabulary");
    // keep .modal.show for any remaining Bootstrap modals.
    await page.locator('.modal.show, .p-dialog').first().waitFor({ state: 'visible', timeout: 5_000 });
  });
}

/** Close any open modal/dialog (Bootstrap or PrimeVue). No-op if none is open. */
export async function closeOpenModal(page) {
  // PrimeVue Dialog (exporters since ed89b98): its X carries .p-dialog-close-button.
  const pDialog = page.locator('.p-dialog');
  if (await pDialog.count()) {
    const pClose = pDialog.first().locator('.p-dialog-close-button, .p-dialog-header-close').first();
    if (await pClose.count()) {
      await pClose.click({ force: true }).catch(() => {});
    } else {
      await page.keyboard.press('Escape').catch(() => {});
    }
    await pDialog.first().waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    return;
  }
  const modal = page.locator('.modal.show');
  if (await modal.count() === 0) return;
  // Click the modal's own X (data-bs-dismiss="modal") — Bootstrap handles
  // focus restoration cleanly, avoiding the "removeAttribute on null"
  // crash that happens when we race programmatic-hide with Vue unmount.
  const closeBtn = modal.first().locator('button.btn-close[data-bs-dismiss="modal"]').first();
  if (await closeBtn.count()) {
    await closeBtn.click({ force: true }).catch(() => {});
    try {
      await modal.first().waitFor({ state: 'hidden', timeout: 3_000 });
      return;
    } catch (_) { /* fall through */ }
  }
  // Fallback: Bootstrap Modal API hide().
  await page.evaluate(() => {
    const m = document.querySelector('.modal.show');
    if (!m) return;
    // eslint-disable-next-line no-undef
    const Modal = (window.bootstrap && window.bootstrap.Modal) || null;
    if (Modal) {
      const inst = Modal.getInstance(m);
      if (inst) inst.hide();
    }
  });
  await modal.first().waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
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
  const btn = page.locator('.modal.show button, .p-dialog button').filter({ hasText: re }).first();
  await btn.waitFor({ state: 'visible', timeout: 10_000 });
  await expect(btn).toBeEnabled();
  const consoleErrors = [];
  const errHandler = (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  };
  page.on('console', errHandler);
  try {
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
  } catch (e) {
    const relevant = consoleErrors.filter((m) =>
      /Exporter|Stl|STL|STP|MVB|worker|wasm|RangeError|Error/i.test(m)
    ).slice(0, 5);
    throw new Error(`captureModalDownload: no download within ${timeoutMs}ms for button matching ${re}.\nConsole errors: ${JSON.stringify(relevant, null, 2)}\nOriginal: ${e.message}`);
  } finally {
    page.off('console', errHandler);
  }
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
    // Building the full core+coil STL can take 60-90s for complex
    // geometries (toroidals, multi-section windings, large adviser-picked
    // shapes). The MVB worker is single-threaded and 4-way Playwright
    // contention can push this past 2 min, so use a generous 5-min
    // timeout — errors still surface via console.
    const dl = await captureModalDownload(page, /STL/i, { timeoutMs: 300_000 });
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
      () => !document.querySelector('.sim-btn.simulated .fa-spin'),
      { timeout: timeoutMs }
    );
    await settleAnimations(page, 300);
  });
}

/* ── SPICE code generation ────────────────────────────────────────────── */

/** Click the SPICE button, wait for the modal, and assert the netlist looks
 *  like a real ngspice netlist (via expectValidSpiceNetlist). */
export async function runSpice(page, { timeoutMs = 90_000 } = {}) {
  return test.step('runSpice', async () => {
    const btn = page.locator('.sim-btn.spice').first();
    await btn.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(btn).toBeEnabled();
    await btn.click();
    // Modal: <div class="modal fade show"> with a <pre><code>{{ spiceCode }}</code></pre>.
    const modal = page.locator('.modal.fade.show').first();
    await modal.waitFor({ state: 'visible', timeout: timeoutMs });
    const netlist = modal.locator('pre code').first();
    await expect(netlist).toBeVisible();
    const text = (await netlist.innerText()).trim();
    expectValidSpiceNetlist(text);
    // Close the modal so subsequent steps don't trip over an overlay. We use
    // .first() because the SPICE modal is the only `.modal.fade.show` open at
    // this point — if a future step opens an overlapping modal, this needs
    // a tighter selector.
    await modal.locator('button.btn-close').first().click();
    await modal.waitFor({ state: 'hidden', timeout: 5_000 });
  });
}
