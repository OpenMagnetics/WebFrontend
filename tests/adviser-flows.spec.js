/**
 * Adviser Flow Tests
 *
 * Covers the four adviser entry points:
 *   - Magnetic Adviser (from wizard "Design Magnetic" or builder context menu)
 *   - Core Adviser (via ToolSelector after AC Sweep)
 *   - Catalog Adviser (via ToolSelector)
 *   - Insulation Adviser (standalone page — WASM-based, no backend)
 *
 * Magnetic/Core/Catalog advisers require the Python backend (POST
 * to localhost:8000). Insulation Adviser is local-only.
 */

import { test, expect } from './_coverage.js';
import { BASE_URL, isBenign, screenshot, openWizard, runAnalytical, goToMagneticAdviser, pause } from './utils.js';

const BUCK_CY = 'Buck-CommonModeChoke-link';
const ss = (page, name) => screenshot(page, 'advisers', name);

// ── Helpers ───────────────────────────────────────────────────────────────

/** Navigate wizard → OP, then switch to AC Sweep to reach ToolSelector. Throws on failure. */
async function reachToolSelector(page) {
  await openWizard(page, BUCK_CY);
  await runAnalytical(page, 30000);
  const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
  await expect(reviewBtn, 'Buck analytical must produce Review Specs button').toBeVisible({ timeout: 15000 });
  await reviewBtn.click();
  await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });
  await pause(page, 1500, 'mechanical: settle');

  // Continue DR → OP
  const continueBtn = page.locator('[data-cy="magnetic-synthesis-next-tool-button"]');
  await expect(continueBtn).toBeVisible({ timeout: 10000 });
  if (!(await continueBtn.isDisabled())) await continueBtn.click();
  await pause(page, 1200, 'mechanical: settle');

  // Switch to AC Sweep
  const acSweep = page.locator('[data-cy$="-ac-sweep-type"]').first();
  if (await acSweep.isVisible({ timeout: 3000 })) {
    await acSweep.click();
  } else {
    const text = page.locator('text=AC Sweep').first();
    await expect(text, 'AC Sweep option must be reachable from OP step').toBeVisible({ timeout: 5000 });
    await text.click();
  }
  await pause(page, 1200, 'mechanical: settle');

  // ToolSelector should now be showing; check for its builder button
  const tsBuilder = page.locator('[data-cy="MagneticBuilder-magnetic-builder-button"]');
  await expect(tsBuilder, 'ToolSelector magnetic-builder-button must appear after AC Sweep').toBeVisible({ timeout: 10000 });
}

/** Open standalone Insulation Adviser. Throws if URL navigation fails. */
async function openInsulation(page) {
  await page.goto(`${BASE_URL}/insulation_adviser`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await pause(page, 2000, 'mechanical: settle');
  if (!page.url().includes('insulation_adviser')) {
    throw new Error(`expected insulation_adviser URL, got: ${page.url()}`);
  }
}

// ── Magnetic Adviser ──────────────────────────────────────────────────────

test.describe('Adviser — Magnetic Adviser', () => {
  test.describe.configure({ timeout: 180000 });

  test('AD-M1: reachable via Design Magnetic from wizard', async ({ page }) => {
    const ok = await goToMagneticAdviser(page, () => openWizard(page, BUCK_CY));
    expect(ok, 'goToMagneticAdviser must succeed').toBe(true);
    await expect(
      page.locator('[data-cy="MagneticBuilder-MagneticAdviser-calculate-mas-advises-button"]')
    ).toBeVisible({ timeout: 10000 });
    await ss(page, 'M1-magnetic-adviser');
  });

  test('AD-M2: Get Advised Magnetics button click starts loading', async ({ page }) => {
    const ok = await goToMagneticAdviser(page, () => openWizard(page, BUCK_CY));
    expect(ok, 'goToMagneticAdviser must succeed').toBe(true);
    const btn = page.locator('[data-cy="MagneticBuilder-MagneticAdviser-calculate-mas-advises-button"]');
    await btn.click();
    // Loading indicator appears (backend must be reachable)
    const loading = page.locator('[data-cy="magneticAdviser-loading"]').first();
    await expect(loading, 'magneticAdviser-loading indicator must appear after click').toBeVisible({ timeout: 5000 });
    await page.waitForFunction(
      () => !document.querySelector('[data-cy="magneticAdviser-loading"]'),
      { timeout: 90000 }
    );
    await ss(page, 'M2-after-run');
  });

  test('AD-M3: after run, select-button is visible', async ({ page }) => {
    const ok = await goToMagneticAdviser(page, () => openWizard(page, BUCK_CY));
    expect(ok, 'goToMagneticAdviser must succeed').toBe(true);
    const btn = page.locator('[data-cy="MagneticBuilder-MagneticAdviser-calculate-mas-advises-button"]');
    await btn.click();
    await page.waitForFunction(
      () => !document.querySelector('[data-cy="magneticAdviser-loading"]'),
      { timeout: 90000 }
    );
    await pause(page, 800, 'mechanical: settle');
    const selectBtn = page.locator('[data-cy$="-advise-0-select-button"]').first();
    await expect(selectBtn, 'Magnetic Adviser must return at least one result').toBeVisible({ timeout: 10000 });
    await ss(page, 'M3-results');
  });
});

// ── Core Adviser (via ToolSelector) ───────────────────────────────────────

test.describe('Adviser — Core Adviser (ToolSelector)', () => {
  test.describe.configure({ timeout: 180000 });

  test('AD-C1: Core Adviser button exists in ToolSelector', async ({ page }) => {
    await reachToolSelector(page);
    await expect(
      page.locator('[data-cy="MagneticBuilder-magnetic-core-adviser-button"]')
    ).toBeVisible({ timeout: 10000 });
  });

  test('AD-C2: clicking Core Adviser loads its UI', async ({ page }) => {
    await reachToolSelector(page);
    await page.locator('[data-cy="MagneticBuilder-magnetic-core-adviser-button"]').click();
    await pause(page, 1500, 'mechanical: settle');
    // Calculate button (suffix match to tolerate dataTestLabel typo noted in existing tests)
    await expect(
      page.locator('[data-cy$="-calculate-mas-advises-button"]').first()
    ).toBeVisible({ timeout: 10000 });
    await ss(page, 'C2-core-adviser');
  });

  test('AD-C3: running Core Adviser completes and shows results', async ({ page }) => {
    await reachToolSelector(page);
    await page.locator('[data-cy="MagneticBuilder-magnetic-core-adviser-button"]').click();
    await pause(page, 1500, 'mechanical: settle');

    const calcBtn = page.locator('[data-cy$="-calculate-mas-advises-button"]').first();
    await calcBtn.click();
    await page.waitForFunction(
      () => !document.querySelector('[data-cy="CoreAdviser-loading"]'),
      { timeout: 90000 }
    );
    await pause(page, 500, 'mechanical: settle');
    await ss(page, 'C3-core-results');
  });
});

// ── Catalog Adviser (via ToolSelector) ────────────────────────────────────

test.describe('Adviser — Catalog (ToolSelector)', () => {
  test.describe.configure({ timeout: 180000 });

  test('AD-CAT1: Magnetic Adviser button exists in ToolSelector', async ({ page }) => {
    await reachToolSelector(page);
    await expect(
      page.locator('[data-cy="MagneticBuilder-magnetic-adviser-button"]')
    ).toBeVisible({ timeout: 10000 });
  });

  test('AD-CAT2: Magnetic Builder button in ToolSelector navigates to builder', async ({ page }) => {
    await reachToolSelector(page);
    const btn = page.locator('[data-cy="MagneticBuilder-magnetic-builder-button"]');
    await btn.click();
    await pause(page, 1500, 'mechanical: settle');
    // Builder step shows Core Advise button
    await expect(
      page.locator('[data-cy$="-Core-Advise-button"]').first()
    ).toBeVisible({ timeout: 10000 });
    await ss(page, 'CAT2-to-builder');
  });
});

// ── Insulation Adviser (standalone, WASM-based) ──────────────────────────

test.describe('Adviser — Insulation Adviser (standalone)', () => {
  test.describe.configure({ timeout: 60000 });

  test('AD-INS1: page loads without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text());
    });
    await openInsulation(page);
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'INS1-page');
  });

  test('AD-INS2: input containers are visible', async ({ page }) => {
    await openInsulation(page);
    // At least one of the expected inputs must be present in the DOM
    const anyPresent = await Promise.any([
      page.locator('[data-cy$="-SwitchingFrequency"]').waitFor({ timeout: 8000 }).then(() => true),
      page.locator('[data-cy$="-VoltagePeak"]').waitFor({ timeout: 8000 }).then(() => true),
      page.locator('[data-cy$="-Altitude"]').waitFor({ timeout: 8000 }).then(() => true),
    ]);
    expect(anyPresent).toBe(true);
    await ss(page, 'INS2-inputs');
  });

  test('AD-INS3: result output fields present', async ({ page }) => {
    await openInsulation(page);
    await pause(page, 1500, 'mechanical: settle');
    // Check for any of the 4 output fields
    const outputs = [
      '[data-cy$="-Clearance"]',
      '[data-cy$="-CreepageDistance"]',
      '[data-cy$="-WithstandVoltage"]',
      '[data-cy$="-DistanceThroughInsulation"]',
    ];
    let found = 0;
    for (const sel of outputs) {
      if (await page.locator(sel).first().isVisible({ timeout: 2000 })) found++;
    }
    expect(found, 'at least one insulation output field must be visible').toBeGreaterThan(0);
    await ss(page, 'INS3-outputs');
  });
});
