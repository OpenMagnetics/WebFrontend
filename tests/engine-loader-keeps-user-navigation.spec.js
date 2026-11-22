/**
 * A page that needs the engine opens through /engine_loader, which sends the user on to that page once
 * the engine is up. A user who clicks elsewhere while it loads (the logo, home) must get there: the
 * loader sends nobody back once they have moved.
 *
 * The loader checked only that the current route was still the loader. A navigation the user started
 * is not current until its lazy chunk has loaded, so when the engine came up in that window the loader
 * pushed its own destination, and that newer navigation cancelled the user's: a click on the logo from
 * the legal notice landed on the legal notice again (H10 in the 2026-11-21 gate).
 *
 * The window is a few hundred milliseconds in a real session. Here it is held open: the engine script
 * is held until the user has clicked, and Home's chunk until the engine is up and the loader has had
 * its chance to leave.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/index.js';
import { pause } from './utils/wait.js';

const routeName = (page) => page.evaluate(() =>
  document.querySelector('#app')?.__vue_app__?.config.globalProperties.$router.currentRoute.value.name ?? null);

test('LOADER-NAV-1: a click home while the engine loads is not overridden by the loader', async ({ page }) => {
  test.setTimeout(120000);
  let releaseEngine;
  const engineHeld = new Promise((resolve) => { releaseEngine = resolve; });
  await page.context().route(/\/wasm\/libMKF\.wasm\.(js|wasm)/, async (route) => { await engineHeld; await route.continue(); });
  let releaseHome;
  const homeHeld = new Promise((resolve) => { releaseHome = resolve; });
  let homeRequested = false;
  // The Home view's lazy chunk: the source module on the dev server, the hashed chunk in a build.
  await page.route(/\/(src\/views\/Home\.vue|assets\/(?:js\/)?Home-[^/]*\.js)(\?|$)/, async (route) => {
    homeRequested = true;
    await homeHeld;
    await route.continue();
  });

  await page.goto(`${BASE_URL}/legal_notice`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__?.config.globalProperties
    .$router.currentRoute.value.name === 'EngineLoader', null, { timeout: 60000 });
  expect(await page.evaluate(() => window.__omEngineReady === true), 'the engine is still held').toBe(false);

  await page.locator('[data-cy="Header-logo-home-link"]').click();
  await expect.poll(() => homeRequested, { timeout: 15000, message: 'the click started the navigation home' }).toBe(true);
  expect(await routeName(page), 'the navigation home is pending on its chunk').toBe('EngineLoader');

  releaseEngine();
  await page.waitForFunction(() => window.__omEngineReady === true, null, { timeout: 60000 });
  // The loader leaves no sooner than 500 ms after it started and then retries every 250 ms; nothing
  // signals that it decided not to leave, so give it that time before letting Home load.
  await pause(page, 2000, 'mechanical: the loader would have pushed its destination by now');

  releaseHome();
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__?.config.globalProperties
    .$router.currentRoute.value.name !== 'EngineLoader', null, { timeout: 30000 });
  expect(await routeName(page), 'the user is where they clicked').toBe('Home');
  expect(new URL(page.url()).pathname).toBe('/');
});
