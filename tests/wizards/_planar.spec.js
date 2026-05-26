/**
 * Planar magnetic smoke check.
 *
 * The Planar option lives in the Magnetic Builder ControlPanel's reset
 * dropdown (src/components/Toolbox/ControlPanel.vue:315). Clicking it sets
 * `mas.inputs.designRequirements.wiringTechnology = WiringTechnology.Printed`
 * (the lowercase enum string "printed" per MAS.ts) and re-runs
 * the engine_loader, which is a distinct WASM init path from the default
 * "Wound" flow. Smoke covers it once via Buck because:
 *   - Buck is already the smoke F1 wizard (cheapest full builder flow).
 *   - The reset dropdown only renders in subsection==='magneticBuilder',
 *     so we need to reach the builder first anyway.
 */
import { test, expect } from '../_coverage.js';
import {
  getWizard,
  openWizard,
  runAnalytical,
  clickDesignMagnetic,
  collectConsoleErrors,
  expectNoConsoleErrors,
} from '../utils/index.js';

const buck = getWizard('buck');

test.describe('planar smoke @scenario', () => {
  test.setTimeout(120_000);

  test('Planar reset switches wiringTechnology to "Printed" @smoke', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openWizard(page, buck.linkCy);
    await runAnalytical(page);
    await clickDesignMagnetic(page);

    // Reset dropdown lives in the Magnetic Builder ControlPanel. It only
    // renders when the storyline subsection is 'magneticBuilder', which is
    // the state after clickDesignMagnetic.
    const resetToggle = page.locator('button.cp-btn.dropdown-toggle[title="Reset"]').first();
    await resetToggle.waitFor({ state: 'visible', timeout: 15_000 });
    await resetToggle.click();

    const planarItem = page.locator('button.dropdown-item').filter({ hasText: /^\s*Planar\s*$/ }).first();
    await planarItem.waitFor({ state: 'visible', timeout: 5_000 });
    await planarItem.click();

    // reset() pushes engine_loader then the loader sends us back to the
    // magnetic_tool. Wait for the wiringTechnology to flip in the store —
    // that's the real assertion; URL alone is racy.
    await page.waitForFunction(() => {
      const app = document.querySelector('#app')?.__vue_app__;
      const mas = app?.config?.globalProperties?.$pinia?._s?.get?.('mas');
      return mas?.mas?.inputs?.designRequirements?.wiringTechnology === 'printed';
    }, { timeout: 30_000 });

    const wiringTech = await page.evaluate(() => {
      const app = document.querySelector('#app')?.__vue_app__;
      const mas = app?.config?.globalProperties?.$pinia?._s?.get?.('mas');
      return mas?.mas?.inputs?.designRequirements?.wiringTechnology;
    });
    expect(wiringTech).toBe('printed');
    expectNoConsoleErrors(errors);
  });
});
