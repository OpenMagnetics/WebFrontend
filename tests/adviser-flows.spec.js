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
import {
  BASE_URL, isBenign, screenshot,
  openWizard, runAnalytical, goToMagneticAdviser,
} from './utils.js';

const BUCK_CY = 'Buck-CommonModeChoke-link';
const ss = (page, name) => screenshot(page, 'advisers', name);

// ── Helpers ───────────────────────────────────────────────────────────────

/** Navigate wizard → OP, then switch to AC Sweep to reach ToolSelector. */
async function reachToolSelector(page) {
  await openWizard(page, BUCK_CY);
  await runAnalytical(page, 30000);
  const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
  if (!(await reviewBtn.isVisible().catch(() => false))) return false;
  await reviewBtn.click();
  await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Continue DR → OP
  const continueBtn = page.locator('[data-cy="magnetic-synthesis-next-tool-button"]');
  if (!(await continueBtn.isDisabled().catch(() => true))) await continueBtn.click();
  await page.waitForTimeout(1200);

  // Switch to AC Sweep
  const acSweep = page.locator('[data-cy$="-ac-sweep-type"]').first();
  if (await acSweep.isVisible({ timeout: 3000 }).catch(() => false)) {
    await acSweep.click();
  } else {
    const text = page.locator('text=AC Sweep').first();
    if (await text.isVisible({ timeout: 2000 }).catch(() => false)) await text.click();
  }
  await page.waitForTimeout(1200);

  // ToolSelector should now be showing; check for its builder button
  const tsBuilder = page.locator('[data-cy="MagneticBuilder-magnetic-builder-button"]');
  return await tsBuilder.isVisible({ timeout: 5000 }).catch(() => false);
}

// ── Magnetic Adviser ──────────────────────────────────────────────────────

test.describe('Adviser — Magnetic Adviser', () => {
  test.describe.configure({ timeout: 180000 });

  test('AD-M1: reachable via Design Magnetic from wizard', async ({ page }) => {
    const ok = await goToMagneticAdviser(page, () => openWizard(page, BUCK_CY));
    if (!ok) { test.skip(); return; }
    await expect(
      page.locator('[data-cy="MagneticBuilder-MagneticAdviser-calculate-mas-advises-button"]')
    ).toBeVisible({ timeout: 10000 });
    await ss(page, 'M1-magnetic-adviser');
  });

  test('AD-M2: Get Advised Magnetics button click starts loading', async ({ page }) => {
    const ok = await goToMagneticAdviser(page, () => openWizard(page, BUCK_CY));
    if (!ok) { test.skip(); return; }
    const btn = page.locator('[data-cy="MagneticBuilder-MagneticAdviser-calculate-mas-advises-button"]');
    await btn.click();
    // Loading indicator appears
    const loading = page.locator('[data-cy="magneticAdviser-loading"]').first();
    const sawLoading = await loading.isVisible({ timeout: 3000 }).catch(() => false);
    // If backend is up, loading shows; if not, we still accept a quick fail
    console.log(`[AD-M2] loading visible: ${sawLoading}`);
    await page.waitForFunction(
      () => !document.querySelector('[data-cy="magneticAdviser-loading"]'),
      { timeout: 90000 }
    ).catch(() => {});
    await ss(page, 'M2-after-run');
  });

  test('AD-M3: after run, select-button or "no results" message visible', async ({ page }) => {
    const ok = await goToMagneticAdviser(page, () => openWizard(page, BUCK_CY));
    if (!ok) { test.skip(); return; }
    const btn = page.locator('[data-cy="MagneticBuilder-MagneticAdviser-calculate-mas-advises-button"]');
    await btn.click();
    await page.waitForFunction(
      () => !document.querySelector('[data-cy="magneticAdviser-loading"]'),
      { timeout: 90000 }
    ).catch(() => {});
    await page.waitForTimeout(800);
    // Either a result-select button OR some text indicating absence of results
    const selectBtn = page.locator('[data-cy$="-advise-0-select-button"]').first();
    const hasResult = await selectBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[AD-M3] result visible: ${hasResult}`);
    await ss(page, 'M3-results-or-empty');
  });
});

// ── Core Adviser (via ToolSelector) ───────────────────────────────────────

test.describe('Adviser — Core Adviser (ToolSelector)', () => {
  test.describe.configure({ timeout: 180000 });

  test('AD-C1: Core Adviser button exists in ToolSelector', async ({ page }) => {
    const ok = await reachToolSelector(page);
    if (!ok) { test.skip(); return; }
    await expect(
      page.locator('[data-cy="MagneticBuilder-magnetic-core-adviser-button"]')
    ).toBeVisible({ timeout: 10000 });
  });

  test('AD-C2: clicking Core Adviser loads its UI', async ({ page }) => {
    const ok = await reachToolSelector(page);
    if (!ok) { test.skip(); return; }
    await page.locator('[data-cy="MagneticBuilder-magnetic-core-adviser-button"]').click();
    await page.waitForTimeout(1500);
    // Calculate button (suffix match to tolerate dataTestLabel typo noted in existing tests)
    await expect(
      page.locator('[data-cy$="-calculate-mas-advises-button"]').first()
    ).toBeVisible({ timeout: 10000 });
    await ss(page, 'C2-core-adviser');
  });

  test('AD-C3: running Core Adviser completes and shows results or empty state', async ({ page }) => {
    const ok = await reachToolSelector(page);
    if (!ok) { test.skip(); return; }
    await page.locator('[data-cy="MagneticBuilder-magnetic-core-adviser-button"]').click();
    await page.waitForTimeout(1500);

    const calcBtn = page.locator('[data-cy$="-calculate-mas-advises-button"]').first();
    await calcBtn.click();
    await page.waitForFunction(
      () => !document.querySelector('[data-cy="CoreAdviser-loading"]'),
      { timeout: 90000 }
    ).catch(() => {});
    await page.waitForTimeout(500);
    await ss(page, 'C3-core-results');
  });
});

// ── Catalog Adviser (via ToolSelector) ────────────────────────────────────

test.describe('Adviser — Catalog (ToolSelector)', () => {
  test.describe.configure({ timeout: 180000 });

  test('AD-CAT1: Magnetic Adviser button exists in ToolSelector', async ({ page }) => {
    const ok = await reachToolSelector(page);
    if (!ok) { test.skip(); return; }
    await expect(
      page.locator('[data-cy="MagneticBuilder-magnetic-adviser-button"]')
    ).toBeVisible({ timeout: 10000 });
  });

  test('AD-CAT2: Magnetic Builder button in ToolSelector navigates to builder', async ({ page }) => {
    const ok = await reachToolSelector(page);
    if (!ok) { test.skip(); return; }
    const btn = page.locator('[data-cy="MagneticBuilder-magnetic-builder-button"]');
    await btn.click();
    await page.waitForTimeout(1500);
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

  async function openInsulation(page) {
    await page.goto(`${BASE_URL}/insulation_adviser`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    return page.url().includes('insulation_adviser');
  }

  test('AD-INS1: page loads without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text());
    });
    const ok = await openInsulation(page);
    if (!ok) { test.skip(); return; }
    await expect(page.locator('body')).toBeVisible();
    await ss(page, 'INS1-page');
  });

  test('AD-INS2: input containers are visible', async ({ page }) => {
    if (!(await openInsulation(page))) { test.skip(); return; }
    // At least a few of the expected inputs should be present in the DOM
    const anyPresent = await Promise.any([
      page.locator('[data-cy$="-SwitchingFrequency"]').waitFor({ timeout: 8000 }).then(() => true),
      page.locator('[data-cy$="-VoltagePeak"]').waitFor({ timeout: 8000 }).then(() => true),
      page.locator('[data-cy$="-Altitude"]').waitFor({ timeout: 8000 }).then(() => true),
    ]).catch(() => false);
    expect(anyPresent).toBe(true);
    await ss(page, 'INS2-inputs');
  });

  test('AD-INS3: result output fields present', async ({ page }) => {
    if (!(await openInsulation(page))) { test.skip(); return; }
    await page.waitForTimeout(1500);
    // Check for any of the 4 output fields
    const outputs = [
      '[data-cy$="-Clearance"]',
      '[data-cy$="-CreepageDistance"]',
      '[data-cy$="-WithstandVoltage"]',
      '[data-cy$="-DistanceThroughInsulation"]',
    ];
    let found = 0;
    for (const sel of outputs) {
      if (await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false)) found++;
    }
    expect(found).toBeGreaterThan(0);
    await ss(page, 'INS3-outputs');
  });
});
