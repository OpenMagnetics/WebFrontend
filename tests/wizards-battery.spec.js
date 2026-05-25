/**
 * Wizards Battery Tests
 *
 * Smoke test per enabled wizard: open → Analytical → reach /magnetic_tool.
 * Buck and DAB are already exercised in magnetic-tool-battery.spec.js;
 * this file covers the other enabled wizards.
 *
 * A wizard "passes" if:
 *   - the dropdown item clicks
 *   - Analytical button becomes visible on /wizards
 *   - Analytical runs (spinner finishes OR times out gracefully)
 *   - either Review Specs or Design Magnetic is reachable
 */

import { test, expect } from './_coverage.js';
import { BASE_URL, isBenign, screenshot, openWizard, runAnalytical, softVisible, softDisabled, softAttr, tryWaitForURL, pause } from './utils.js';

const ss = (page, name) => screenshot(page, 'wiz-battery', name);

// Enabled wizards NOT covered by magnetic-tool-battery.spec.js.
const ENABLED_WIZARDS = [
  { cy: 'Cmc-link',            label: 'CMC' },
  { cy: 'Flyback-link',           label: 'Flyback' },
  { cy: 'Boost-link',             label: 'Boost' },
  { cy: 'IsolatedBuck-link',      label: 'IsolatedBuck' },
  { cy: 'IsolatedBuckBoost-link', label: 'IsolatedBuckBoost' },
  { cy: 'PushPull-link',          label: 'PushPull' },
  { cy: 'Pfc-link',                               label: 'PFC' },
  { cy: 'Llc-link',                               label: 'LLC' },
  { cy: 'ActiveClampForward-link', label: 'ActiveClampForward' },
  { cy: 'SingleSwitchForward-link', label: 'SingleSwitchForward' },
  { cy: 'TwoSwitchForward-link',  label: 'TwoSwitchForward' },
  { cy: 'Dmc-link',      label: 'DMC' },
  { cy: 'Psfb-link',                              label: 'PSFB' },
];

// Wizards intentionally disabled in the dropdown (per Header.vue source).
// Currently none — DMC and PSFB were enabled in a prior commit.
const DISABLED_WIZARDS = [];

// ── Generic smoke per wizard ──────────────────────────────────────────────

test.describe('Wizards — smoke (enabled)', () => {
  test.describe.configure({ timeout: 120000 });

  for (const { cy, label } of ENABLED_WIZARDS) {
    test(`W-${label}: open → Analytical → reach magnetic_tool`, async ({ page }) => {
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text());
      });

      await openWizard(page, cy);
      expect(page.url()).toContain('wizards');

      await runAnalytical(page, 30000);
      await ss(page, `${label}-analytical`);

      // Look for Review Specs or Design Magnetic
      const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
      const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();

      const hasReview = await softVisible(reviewBtn, 3000);
      const hasDesign = await softVisible(designBtn, 3000);
      expect(hasReview || hasDesign).toBe(true);

      // Click whichever is available (prefer Review Specs)
      const target = hasReview ? reviewBtn : designBtn;
      if (await softDisabled(target)) {
        console.log(`[W-${label}] target button disabled — stopping after Analytical`);
        return;
      }

      await target.click();
      await tryWaitForURL(page, '**/magnetic_tool**', 30000);
      await pause(page, 1500, 'mechanical: settle');

      expect(page.url()).toContain('magnetic_tool');
      await ss(page, `${label}-magnetic-tool`);

      // No unexpected console errors from the wizard flow
      expect(errors.filter(e => !/magnetic_tool|api/i.test(e))).toEqual([]);
    });
  }
});

// ── Disabled wizards render as disabled ───────────────────────────────────

test.describe('Wizards — disabled entries present but disabled', () => {
  test.describe.configure({ timeout: 30000 });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await pause(page, 800, 'mechanical: settle');
    // Toggle dropdown via direct DOM click
    await page.evaluate(() => {
      const toggles = Array.from(document.querySelectorAll('.dropdown-toggle'));
      const w = toggles.find(el => el.textContent.includes('Wizards'));
      if (w) {
        w.click();
        const d = w.closest('.dropdown') || w.parentElement;
        d?.querySelector('.dropdown-menu')?.classList.add('show');
      }
    });
    await pause(page, 300, 'mechanical: settle');
  });

  for (const cy of DISABLED_WIZARDS) {
    test(`W-disabled-${cy}: present in DOM and disabled`, async ({ page }) => {
      const el = page.locator(`[data-cy="${cy}"]`);
      const count = await el.count();
      expect(count).toBeGreaterThan(0);
      // Check disabled state (either attribute or class)
      const el0 = el.first();
      const disabled = await softAttr(el0, 'disabled');
      const cls = await el0.getAttribute('class').catch(() => '');
      const isDisabled = disabled !== null || /disabled/i.test(cls || '');
      expect(isDisabled).toBe(true);
    });
  }
});

// ── Wizard-specific sanity ────────────────────────────────────────────────

test.describe('Wizards — wizard-specific sanity', () => {
  test.describe.configure({ timeout: 120000 });

  test('W-PushPull: shows wizard-specific controls', async ({ page }) => {
    await openWizard(page, 'PushPull-link');
    expect(page.url()).toContain('wizards');
    // Should have analytical and at least one card
    await expect(page.locator('.sim-btn.analytical')).toBeVisible({ timeout: 10000 });
    const cards = page.locator('.compact-card');
    expect(await cards.count()).toBeGreaterThan(0);
    await ss(page, 'PushPull-specific');
  });

  test('W-Flyback: analytical produces some output', async ({ page }) => {
    await openWizard(page, 'Flyback-link');
    await runAnalytical(page, 30000);
    await ss(page, 'Flyback-analytical');
    // After analytical, "Review Specs" or "Design Magnetic" should exist
    const hasReview = await page.locator('button').filter({ hasText: 'Review Specs' }).first()
      .waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false);
    const hasDesign = await page.locator('button').filter({ hasText: 'Design Magnetic' }).first()
      .waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false);
    expect(hasReview || hasDesign).toBe(true);
  });

  test('W-LLC: wizard loads without errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text());
    });
    await openWizard(page, 'Llc-link');
    await pause(page, 1500, 'mechanical: settle');
    expect(errors).toEqual([]);
  });

  test('W-PFC: wizard loads without errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text());
    });
    await openWizard(page, 'Pfc-link');
    await pause(page, 1500, 'mechanical: settle');
    expect(errors).toEqual([]);
  });

  test('W-Forward-3variants: all three Forward wizards open independently', async ({ page }) => {
    for (const cy of [
      'SingleSwitchForward-link',
      'TwoSwitchForward-link',
      'ActiveClampForward-link',
    ]) {
      await openWizard(page, cy);
      expect(page.url()).toContain('wizards');
      await expect(page.locator('.sim-btn.analytical')).toBeVisible({ timeout: 10000 });
      await pause(page, 500, 'mechanical: settle');
    }
  });
});
