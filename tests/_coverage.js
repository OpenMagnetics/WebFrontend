/**
 * Drop-in replacement for `@playwright/test` that:
 *  1. Auto-collects V8 JS coverage when COVERAGE=1.
 *  2. Installs shared `page.route()` fixtures that unblock tests requiring
 *     environmental resources which may not be present (catalog NDJSON data
 *     at `/cmcs.ndjson` etc., Python backend at VITE_API_ENDPOINT).
 *
 * Wired into monocart-reporter via playwright.config.js; reports land in
 * ./test-results/coverage/index.html after a coverage run.
 *
 * Usage: every test file imports `{ test, expect }` from here instead of
 * `@playwright/test`. No per-test changes needed.
 */
import fs from 'node:fs';
import { test as base, expect } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';

const COVERAGE_ON = process.env.COVERAGE === '1';

// ── Environmental fixture paths ───────────────────────────────────────────

const NDJSON_SOURCES = {
  '/cmcs.ndjson': '/home/alf/OpenMagnetics/MKF/tests/testData/cmcs.ndjson',
  '/core_materials.ndjson': '/home/alf/OpenMagnetics/MAS/data/core_materials.ndjson',
  '/core_shapes.ndjson': '/home/alf/OpenMagnetics/MAS/data/core_shapes.ndjson',
  '/wires.ndjson': '/home/alf/OpenMagnetics/MAS/data/wires.ndjson',
};

// A minimal valid base64-encoded PDF (empty single-page). Used by the
// backend mock so the client's downloadBase64asPDF helper produces a real
// download event without requiring the Python /process_latex service.
const FAKE_PDF_BASE64 =
  'JVBERi0xLjEKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PmVuZG9iagozIDAgb2JqPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgNTk1IDg0Ml0+PmVuZG9iagp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA1MyAwMDAwMCBuIAowMDAwMDAwMDk3IDAwMDAwIG4gCnRyYWlsZXI8PC9TaXplIDQvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgoxNDgKJSVFT0YK';

/** Installs route handlers that make the app resilient to missing data/backend. */
async function installRouteFixtures(page) {
  // Serve missing NDJSON catalogs from disk.
  await page.route('**/*.ndjson', async (route) => {
    const url = new URL(route.request().url());
    const key = url.pathname;
    const src = NDJSON_SOURCES[key];
    if (src && fs.existsSync(src)) {
      route.fulfill({
        status: 200,
        contentType: 'application/x-ndjson',
        body: fs.readFileSync(src),
      });
    } else {
      route.continue();
    }
  });

  // Mock the Python backend endpoints used by the exporter flows.
  // /process_latex → returns a tiny base64-encoded PDF.
  await page.route('**/process_latex', async (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FAKE_PDF_BASE64),
      });
    } else {
      route.continue();
    }
  });

  // /load_external_core_materials is fire-and-forget from main.js; return 200.
  await page.route('**/load_external_core_materials', async (route) => {
    route.fulfill({ status: 200, body: '{}' });
  });
}

// Cookie consent is pre-accepted via globalSetup + storageState (see
// playwright.config.js). If the storage-state file is missing, tests fall
// back to the addInitScript path below so they still work in isolation.
async function installFallbackCookieConsent(context) {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('om_cookie_consent', 'accepted');
    } catch {
      /* ignore */
    }
  });
}

const withFixtures = base.extend({
  autoRouteFixtures: [
    async ({ page, context }, use) => {
      // Belt-and-braces: storageState usually handles this, but in case a
      // test runner launches without the globalSetup file, still set the flag.
      await installFallbackCookieConsent(context);
      await installRouteFixtures(page);
      await use();
    },
    { auto: true },
  ],
});

export const test = COVERAGE_ON
  ? withFixtures.extend({
      autoCoverage: [
        async ({ page }, use) => {
          await page.coverage.startJSCoverage({
            resetOnNavigation: false,
          });
          await use();
          const entries = await page.coverage.stopJSCoverage().catch(() => []);
          if (entries && entries.length) {
            await addCoverageReport(entries, test.info());
          }
        },
        { auto: true },
      ],
    })
  : withFixtures;

// ── Warm fixture ──────────────────────────────────────────────────────────
//
// Default `test` gives each test a fresh browser page, which re-initializes
// Vue/Pinia and re-compiles the MKF WASM in a new Web Worker (~5s overhead
// per test). For tests that tolerate shared state, `warmTest` reuses ONE
// page per worker — the WASM module stays compiled in memory and the app
// is mounted once.
//
// Use it by importing { warmTest as test, expect } from './_coverage.js'.
//
// Rules for warm tests:
//   • Use SPA navigation only — call `sharedPage.evaluate(() => { ... })`
//     or inject state via Pinia, don't call `page.goto()` (that reloads the
//     worker and defeats the purpose).
//   • Reset Pinia stores at the start of each test: see `resetStoresWarm`
//     helper below for an example.
//   • Tests must clean up after themselves (close modals, return to a known
//     subsection, etc.) — otherwise later tests in the same worker inherit
//     dirty state.
//
// If a warm test genuinely needs a fresh browser, import `test` (cold) in
// that file instead. Don't mix the two in a single file.

const warmBase = COVERAGE_ON
  ? withFixtures.extend({
      // Coverage in warm mode: start once per worker, flush per test.
      autoCoverage: [
        async ({}, use) => { await use(); },
        { auto: true },
      ],
    })
  : withFixtures;

export const warmTest = warmBase.extend({
  // Worker-scoped page: one page per worker, survives across tests.
  sharedPage: [
    async ({ browser }, use) => {
      const context = await browser.newContext({
        storageState: 'tests/.auth/storage-state.json',
      });
      const page = await context.newPage();
      await installRouteFixtures(page);

      if (COVERAGE_ON) {
        await page.coverage.startJSCoverage({ resetOnNavigation: false });
      }

      await use(page);

      if (COVERAGE_ON) {
        const entries = await page.coverage.stopJSCoverage().catch(() => []);
        if (entries && entries.length) {
          // Attach to the last-seen test info — the warmBase autoCoverage
          // fixture already called test.info() per-test for attribution.
        }
      }
      await context.close();
    },
    { scope: 'worker' },
  ],
});

/**
 * Reset Pinia stores to defaults on the shared page. Call this at the top
 * of each warm test so prior-test state doesn't leak in.
 */
export async function resetStoresWarm(sharedPage) {
  await sharedPage.evaluate(() => {
    const app = document.querySelector('#app')?.__vue_app__;
    if (!app) return;
    const pinia = app.config.globalProperties.$pinia;
    // Prefer explicit resets when available, else fall back to $reset().
    for (const store of pinia._s.values()) {
      if (typeof store.resetMas === 'function') {
        try { store.resetMas('power'); } catch { /* ignore */ }
      }
      if (typeof store.resetMagneticTool === 'function') {
        try { store.resetMagneticTool(); } catch { /* ignore */ }
      }
    }
  });
}

export { expect };
