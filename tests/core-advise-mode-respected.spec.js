/**
 * Regression for ABT #153 (frontend part) — the Magnetic Builder's Basic core
 * selector hardcoded adviserSettings.coreAdviseMode = "standard cores" on every
 * Core Advise run (BasicCoreSelector.adviseCore), overriding whatever mode the
 * user configured. For designs only served by the "available cores" catalogue
 * (e.g. PFC boost inductors -> powder toroids) this silently returned zero
 * candidates with no way for the user to switch.
 *
 * The fix removes the hardcode; the mode now flows from the user's setting into
 * taskQueue.adviseCore. This test sets the mode to "available cores" and spies
 * on the value the Basic selector actually passes to adviseCore.
 */
import { test, expect } from './_coverage.js';
import { pause } from './utils.js';
import { goToBuilderStep } from './utils/builder-helpers.js';

test.describe('Basic core selector respects coreAdviseMode (ABT #153)', () => {
  test.describe.configure({ timeout: 180000 });

  test('Core Advise passes the user-configured mode, not a hardcoded one', async ({ page }) => {
    await goToBuilderStep(page);

    // Configure a non-default mode and install a spy on the store method the
    // Basic selector calls, capturing the mode it actually forwards.
    await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const settings = pinia._s.get('settings');
      settings.adviserSettings.coreAdviseMode = 'available cores';

      const tq = pinia._s.get('magneticBuilderTaskQueue');
      window.__capturedMode = undefined;
      const orig = tq.adviseCore.bind(tq);
      tq.adviseCore = (inputs, weights, adviserSettings) => {
        window.__capturedMode = adviserSettings ? adviserSettings.coreAdviseMode : null;
        // Never resolve — we only care about the argument, and this avoids a
        // heavy WASM adviser run + downstream mutation.
        return new Promise(() => {});
        void orig;
      };
    });

    const btn = page.locator('[data-cy$="-Core-Advise-button"]').first();
    await expect(btn, 'Core Advise button must be visible').toBeVisible({ timeout: 10000 });
    await btn.click();

    await page.waitForFunction(() => window.__capturedMode !== undefined, { timeout: 20000 });
    const mode = await page.evaluate(() => window.__capturedMode);

    expect(mode, 'Core Advise must forward the user-configured mode, not the old hardcoded "standard cores"').toBe('available cores');
  });
});
