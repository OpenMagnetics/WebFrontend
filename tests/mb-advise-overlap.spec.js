/**
 * The core and wire advisers must not overlap. Clicking "Advise all" for the
 * wires while an advised core was being applied ran the wire adviser on a
 * half-swapped coil (MKF: "Bobbin is dummy") and left the panels Outdated.
 * The wire Advise buttons are disabled for the whole core advise, including
 * the steps that apply its result.
 */

import { test, expect } from './_coverage.js';
import { isBenign, openWizard, pause } from './utils.js';
import { FLYBACK_CY, goToBuilderStep } from './utils/builder-helpers.js';

test('MB-ADV-1: wire Advise all is disabled while an advised core is being applied', async ({ page }) => {
  test.setTimeout(300000);
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !isBenign(m.text())) errors.push(m.text()); });
  await goToBuilderStep(page, { openFn: () => openWizard(page, FLYBACK_CY) });

  // At the moment the advised core starts being applied, try Advise all, as a
  // user clicking right after the core result shows up would.
  await page.evaluate(() => {
    const tq = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('magneticBuilderTaskQueue');
    window.__overlap = null;
    window.__wireAdviseRuns = 0;
    tq.$onAction(({ name, onError }) => {
      if (name === 'adviseAllWires' || name === 'adviseWire') {
        window.__wireAdviseRuns++;
        onError((e) => console.error('wire advise failed: ' + (e?.message ?? e)));
      }
      if (name === 'coreAdvised' && window.__overlap == null) {
        const b = document.querySelector('[data-cy$="Wire-Advise-All-button"]');
        window.__overlap = b == null ? 'absent' : (b.disabled ? 'disabled' : 'enabled');
        b?.click();
      }
    });
  });
  await page.locator('[data-cy$="-Core-Advise-button"]').first().click();
  await page.waitForFunction(() => window.__overlap != null, null, { timeout: 120000 });
  expect(await page.evaluate(() => window.__overlap)).toBe('disabled');

  await page.waitForFunction(() => {
    const loading = document.querySelector('[data-cy$="-BasicCoreSelector-loading"]');
    const b = document.querySelector('[data-cy$="-Core-Advise-button"]');
    return !loading && b && !b.disabled;
  }, null, { timeout: 120000 });
  expect(await page.evaluate(() => window.__wireAdviseRuns)).toBe(0);

  // Once the core is in, the wires can be advised and every panel ends up to date.
  const all = page.locator('[data-cy$="Wire-Advise-All-button"]').first();
  await expect(all).toBeEnabled();
  await all.click();
  await page.waitForFunction(() => window.__wireAdviseRuns === 1, null, { timeout: 30000 });
  await expect(page.locator('[data-cy$="-BasicWireSelector-loading"]')).toHaveCount(0, { timeout: 120000 });
  await expect(page.locator('.coreinfo-outdated-badge, .wireinfo-outdated-badge, .coilinfo-outdated-badge')).toHaveCount(0, { timeout: 60000 });
  await pause(page, 500, 'mechanical: late console errors');
  expect(errors).toEqual([]);
});
