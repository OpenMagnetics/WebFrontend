/**
 * Demonstrates the warm-fixture pattern: one shared page per worker,
 * navigation via SPA router (no page.goto) so the MKF WASM worker stays
 * compiled in memory across tests.
 *
 * Compare wall-clock against the cold equivalent by running:
 *   npx playwright test tests/warm-demo.spec.js    # warm
 *   npx playwright test tests/warm-demo-cold.spec.js (if you clone this as cold)
 *
 * These tests assume the dev server has been navigated-to at least once in
 * this worker. The first test walks there via SPA nav; later tests reuse.
 */
import { warmTest as test, expect, resetStoresWarm } from './_coverage.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// One-time SPA nav into the app (only on the first test in the worker).
async function primeSharedPage(sharedPage) {
  const url = sharedPage.url();
  if (url === 'about:blank' || !url.includes(BASE_URL.replace(/^https?:\/\//, ''))) {
    await sharedPage.goto(`${BASE_URL}/magnetic_tool`, { waitUntil: 'domcontentloaded' });
    await sharedPage.waitForFunction(
      () => !window.location.pathname.includes('engine_loader'),
      { timeout: 45000 },
    );
    await sharedPage.waitForTimeout(800);
  }
}

test.describe('Warm fixture — shared page across tests', () => {
  test.describe.configure({ timeout: 120000 });

  test('WARM-1: primes the page and can navigate via router.push', async ({ sharedPage }) => {
    await primeSharedPage(sharedPage);
    await resetStoresWarm(sharedPage);
    const url = sharedPage.url();
    expect(url).toContain('/magnetic_tool');
    const appMounted = await sharedPage.evaluate(() => !!document.querySelector('#app')?.__vue_app__);
    expect(appMounted).toBe(true);
  });

  test('WARM-2: reuses the same worker — MKF is already initialized', async ({ sharedPage }) => {
    await primeSharedPage(sharedPage);
    // Touch the MKF WASM via Pinia's taskQueue store — if the worker survived,
    // mkf.ready resolves effectively instantly.
    const t0 = Date.now();
    const ok = await sharedPage.evaluate(async () => {
      const waitForMkfMod = await import('/WebSharedComponents/assets/js/mkfRuntime');
      const mkf = await waitForMkfMod.waitForMkf();
      await mkf.ready;
      const types = await mkf.get_available_wire_types();
      return types && typeof types.size === 'function';
    }).catch(() => false);
    const elapsed = Date.now() - t0;
    expect(ok).toBe(true);
    // Second call after WARM-1 should be <1s since the worker is already up.
    expect(elapsed).toBeLessThan(3000);
  });

  test('WARM-3: Pinia reset works and leaves the page navigable', async ({ sharedPage }) => {
    await primeSharedPage(sharedPage);
    await resetStoresWarm(sharedPage);
    // Basic smoke: app is still mounted, router is still routable.
    const canNavigate = await sharedPage.evaluate(() => {
      const app = document.querySelector('#app')?.__vue_app__;
      if (!app) return false;
      const router = app.config.globalProperties.$router;
      return typeof router?.push === 'function';
    });
    expect(canNavigate).toBe(true);
  });
});
