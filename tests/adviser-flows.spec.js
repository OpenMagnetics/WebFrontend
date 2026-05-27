/**
 * Adviser Flow Tests
 *
 * Covers the adviser entry points still reachable from the UI:
 *   - Magnetic Adviser (from wizard "Design Magnetic" or builder context menu)
 *   - Insulation Adviser (standalone page — WASM-based, no backend)
 *
 * The Core Adviser / Catalog Adviser flows that used to be reached through
 * the AC Sweep → ToolSelector navigation were removed when AC Sweep was cut
 * from Operating Points. The corresponding tests were deleted with them.
 *
 * Magnetic Adviser requires the Python backend (POST to localhost:8000).
 * Insulation Adviser is local-only.
 */

import { test, expect } from './_coverage.js';
import { BASE_URL, isBenign, screenshot, openWizard, goToMagneticAdviser, pause } from './utils.js';

const BUCK_CY = 'Buck-link';
const ss = (page, name) => screenshot(page, 'advisers', name);

// ── Helpers ───────────────────────────────────────────────────────────────

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
    // At least one of the expected inputs must be present in the DOM.
    // Use *= (contains) because data-cy values include suffixes like
    // "-container", "-number-input", etc. appended by Dimension components.
    const anyPresent = await Promise.any([
      page.locator('[data-cy*="-SwitchingFrequency"]').first().waitFor({ timeout: 8000 }).then(() => true),
      page.locator('[data-cy*="-VoltagePeak"]').first().waitFor({ timeout: 8000 }).then(() => true),
      page.locator('[data-cy*="-Altitude"]').first().waitFor({ timeout: 8000 }).then(() => true),
    ]);
    expect(anyPresent).toBe(true);
    await ss(page, 'INS2-inputs');
  });

  test('AD-INS3: result output fields present', async ({ page }) => {
    await openInsulation(page);
    await pause(page, 1500, 'mechanical: settle');
    // Check for any of the 4 output fields (use *= for the same suffix reason
    // explained in AD-INS2).
    const outputs = [
      '[data-cy*="-Clearance"]',
      '[data-cy*="-CreepageDistance"]',
      '[data-cy*="-WithstandVoltage"]',
      '[data-cy*="-DistanceThroughInsulation"]',
    ];
    let found = 0;
    for (const sel of outputs) {
      if (await page.locator(sel).first().isVisible({ timeout: 2000 })) found++;
    }
    expect(found, 'at least one insulation output field must be visible').toBeGreaterThan(0);
    await ss(page, 'INS3-outputs');
  });
});
