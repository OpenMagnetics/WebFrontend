/**
 * Magnetic-Builder shared helpers.
 *
 * Extracted from the legacy magnetic-builder-battery.spec.js so the per-group
 * spec files (mb-core / mb-wire / mb-coil / mb-settings / mb-e2e) can stay
 * focused on assertions.
 *
 * Throw loudly on failure (CLAUDE.md "no fallbacks, no defaults"); do not
 * swallow timeouts.
 */

import { expect } from '@playwright/test';
import { openWizard, runAnalytical, screenshot } from '../utils.js';
import { pause } from './wait.js';

export const BUCK_CY    = 'Buck-link';
export const FLYBACK_CY = 'Flyback-link';
export const PP_CY      = 'PushPull-link';

/** Screenshot helper bound to the legacy "mb-battery" subdir so file paths stay stable. */
export const ss = (page, name) => screenshot(page, 'mb-battery', name);

/**
 * Open a wizard (Buck by default), run analytical, click Review Specs, then
 * click the "Magnetic Builder" storyline tab. Throws if any step fails or if
 * the Core Advise button does not appear within the timeout.
 *
 * setupFn (optional): runs after openWizard, before runAnalytical. Used to
 * tweak the wizard (e.g. switch to "I know" mode).
 */
export async function goToBuilderStep(page, { openFn = null, setupFn = null } = {}) {
  const fn = openFn ?? (() => openWizard(page, BUCK_CY));
  await fn();
  if (setupFn) await setupFn(page);
  await runAnalytical(page);

  const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
  await expect(reviewBtn, 'Review Specs button must be visible after analytical').toBeVisible({ timeout: 10000 });
  await expect(reviewBtn, 'Review Specs button must be enabled').toBeEnabled();
  await reviewBtn.click();
  await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });
  await pause(page, 1500, 'storyline transition + WASM rehydrate after Review Specs');

  // Click "Magnetic Builder" storyline step. Storyline.vue renders step labels
  // as plain text inside .storyline-step divs. Label is "Magnetic.  Builder"
  // (with a period and non-breaking space).
  const builderStep = page.locator('.storyline-step').filter({ hasText: /Magnetic.*Builder/i }).first();
  await expect(builderStep, 'Magnetic Builder storyline step must be present').toBeVisible({ timeout: 10000 });
  await builderStep.click();
  await pause(page, 800, 'storyline step transition animation');

  const coreAdvise = page.locator('[data-cy$="-Core-Advise-button"]').first();
  await expect(coreAdvise, 'Core Advise button must be visible on the builder step').toBeVisible({ timeout: 15000 });
}

/**
 * Click Core Advise and wait for the loading indicator to disappear (up to
 * timeoutMs). Throws if the button is not visible/enabled, or if loading
 * doesn't finish in time.
 */
export async function adviseCoreAndWait(page, timeoutMs = 90000) {
  const btn = page.locator('[data-cy$="-Core-Advise-button"]').first();
  await expect(btn, 'Core Advise button must be visible').toBeVisible({ timeout: 10000 });
  await expect(btn, 'Core Advise button must be enabled').toBeEnabled();
  await btn.click();
  await page.waitForFunction(
    () => {
      const loading = document.querySelector('[data-cy$="-BasicCoreSelector-loading"]');
      const b = document.querySelector('[data-cy$="-Core-Advise-button"]');
      return !loading && b && !b.disabled;
    },
    { timeout: timeoutMs }
  );
  await pause(page, 500, 'core advise settle: ECharts redraw + diagnostics card mount');
}

/**
 * Click Wire Advise and wait for the loading indicator to disappear (up to
 * timeoutMs). Throws if the button isn't visible/enabled. The Wire Advise
 * button only appears once the core is complete — call after adviseCoreAndWait.
 */
export async function adviseWireAndWait(page, timeoutMs = 90000) {
  const btn = page.locator('[data-cy$="Wire-Advise-button"]').first();
  await expect(btn, 'Wire Advise button must be visible').toBeVisible({ timeout: 15000 });
  await expect(btn, 'Wire Advise button must be enabled').toBeEnabled();
  await btn.click();
  await page.waitForFunction(
    () => {
      const loading = document.querySelector('[data-cy$="-BasicWireSelector-loading"]');
      const b = document.querySelector('[data-cy$="Wire-Advise-button"]');
      return !loading && b && !b.disabled;
    },
    { timeout: timeoutMs }
  );
  await pause(page, 500, 'wire advise settle: coil-config-panel mount');
}

/**
 * Click "Advise all" (multi-winding wizards) and wait for all wires to finish.
 * Falls back to single-winding Advise if "Advise all" is not present.
 */
export async function adviseAllWiresAndWait(page, timeoutMs = 120000) {
  await page.waitForFunction(
    () => !!document.querySelector('[data-cy$="Wire-Advise-All-button"], [data-cy$="Wire-Advise-button"]'),
    { timeout: 15000 }
  );
  const adviseAll = page.locator('[data-cy$="Wire-Advise-All-button"]:visible').first();
  const adviseAllCount = await adviseAll.count();
  if (adviseAllCount > 0) {
    await expect(adviseAll, 'Advise all (multi-winding) must be enabled').toBeEnabled();
    await adviseAll.click();
    await page.waitForFunction(
      () => {
        const loading = document.querySelector('[data-cy$="-BasicWireSelector-loading"]');
        const b = document.querySelector('[data-cy$="Wire-Advise-All-button"]');
        return !loading && b && !b.disabled;
      },
      { timeout: timeoutMs }
    );
    await pause(page, 1000, 'multi-winding advise settle: all coil panels mount');
    return;
  }
  await adviseWireAndWait(page, timeoutMs);
}

/** Convenience: builder step with Core + Wire advised, exposing the Coil panel. */
export async function goToBuilderWithCoil(page) {
  await goToBuilderStep(page);
  await adviseCoreAndWait(page);
  await adviseWireAndWait(page);
  await expect(page.locator('.coil-config-panel').first()).toBeVisible({ timeout: 10000 });
}

/**
 * Return the visible option values of an ElementFromList select identified by
 * data-cy suffix (without the trailing `-select` — that's appended here).
 */
export async function selectOptions(page, dataCySuffix) {
  const sel = page.locator(`[data-cy$="${dataCySuffix}-select"]`).first();
  await expect(sel, `select with suffix "${dataCySuffix}-select" must be visible`).toBeVisible();
  return sel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
}

/** Pick the first option from a select identified by data-cy suffix. */
export async function pickFirstOption(page, dataCySuffix) {
  const sel = page.locator(`[data-cy$="${dataCySuffix}-select"]`).first();
  await expect(sel, `select with suffix "${dataCySuffix}-select" must be visible`).toBeVisible();
  const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
  expect(opts.length, `select "${dataCySuffix}-select" must have at least one option`).toBeGreaterThan(0);
  await sel.selectOption(opts[0]);
  await pause(page, 400, 'Vue reactivity after selectOption');
  return opts[0];
}
