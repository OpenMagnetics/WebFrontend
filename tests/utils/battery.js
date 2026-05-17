/**
 * tests/utils/battery.js
 *
 * `makeBatterySpec(wizard, opts?)` generates the standard "battery" of tests
 * for one wizard (Groups A/B/D/E/F/G in the legacy naming) using the catalog
 * + scenario library. Adding a wizard to the suite becomes:
 *
 *   // tests/wizards/buck.spec.js
 *   import { makeBatterySpec, getWizard } from '../utils/index.js';
 *   makeBatterySpec(getWizard('buck'));
 *
 * Group mapping (legacy → battery):
 *   A – Layout                → group_A_layout
 *   B – Analytical            → group_B_analytical
 *   D – Simulated             → group_D_simulated   (only if capabilities.simulated)
 *   E – Navigation            → group_E_navigation  (Review Specs / Design Magnetic)
 *   F – Magnetic Adviser e2e  → group_F_adviser     (only if capabilities.adviser)
 *   G – Core Adviser e2e      → group_G_coreAdviser (only if capabilities.coreAdviser)
 *
 * Groups F/G delegate to scenarios.fullMagneticViaAdviser /
 * fullMagneticViaCoreAndWireAdvisers — single source of truth.
 *
 * Per-wizard quirks (e.g. "Flyback needs MosfetInputType radio before B2")
 * go into the catalog entry's optional `precondition(page)` hook, NOT into
 * a forked battery file.
 */
import { test, expect } from '../_coverage.js';
import {
  openWizard,
  runAnalytical,
  conditionsCard,
  collectConsoleErrors,
  expectNoConsoleErrors,
  fullMagneticViaAdviser,
  fullMagneticViaCoreAndWireAdvisers,
  runSimulated,
} from './index.js';

/**
 * @param {import('./catalog.js').WizardSpec} wizard
 * @param {{
 *   skipGroups?: ReadonlyArray<'A'|'B'|'D'|'E'|'F'|'G'>,
 *   precondition?: (page: import('@playwright/test').Page) => Promise<void>,
 * }} [opts]
 */
export function makeBatterySpec(wizard, opts = {}) {
  const { skipGroups = [], precondition } = opts;
  const skip = (g) => skipGroups.includes(g);
  const open = async (page) => {
    await openWizard(page, wizard.linkCy);
    if (precondition) await precondition(page);
  };

  test.describe(`${wizard.key} battery @scenario`, () => {
    test.setTimeout(wizard.tags.includes('heavy') ? 360_000 : 240_000);

    if (!skip('A')) {
      test(`${wizard.title}-A1 — layout: title + Conditions card + Analytical button`, async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await open(page);
        await expect(page.locator('.wizard-title').first()).toBeVisible();
        await expect(conditionsCard(page)).toBeVisible();
        await expect(page.locator('.sim-btn.analytical')).toBeVisible();
        expectNoConsoleErrors(errors);
      });
    }

    if (!skip('B')) {
      test(`${wizard.title}-B1 — analytical runs, canvas appears`, async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await open(page);
        await runAnalytical(page);
        await expect(page.locator('.error-text').first()).toBeHidden();
        expect(await page.locator('canvas').count()).toBeGreaterThan(0);
        expectNoConsoleErrors(errors);
      });
    }

    if (!skip('D') && wizard.capabilities.simulated) {
      test(`${wizard.title}-D1 — simulated button enabled and clickable`, async ({ page }) => {
        await open(page);
        await runSimulated(page);
      });
    }

    if (!skip('E')) {
      test(`${wizard.title}-E1 — Review Specs navigates to magnetic_tool`, async ({ page }) => {
        await open(page);
        await runAnalytical(page);
        const btn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
        await expect(btn).toBeVisible();
        await btn.click();
        await page.waitForURL('**/magnetic_tool**', { timeout: 30_000 });
        expect(page.url()).toContain('magnetic_tool');
      });

      test(`${wizard.title}-E2 — Design Magnetic navigates to magnetic_tool`, async ({ page }) => {
        await open(page);
        await runAnalytical(page);
        const btn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
        await expect(btn).toBeVisible();
        await btn.click();
        await page.waitForURL('**/magnetic_tool**', { timeout: 30_000 });
        expect(page.url()).toContain('magnetic_tool');
      });
    }

    if (!skip('F') && wizard.capabilities.adviser) {
      test(`${wizard.title}-F1 — full magnetic via Magnetic Adviser`, async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await fullMagneticViaAdviser(page, wizard);
        expectNoConsoleErrors(errors);
      });
    }

    if (!skip('G') && wizard.capabilities.coreAdviser) {
      test(`${wizard.title}-G1 — full magnetic via Core Adviser`, async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await fullMagneticViaCoreAndWireAdvisers(page, wizard, {
          withGeometry: wizard.capabilities.wireAdviser,
        });
        expectNoConsoleErrors(errors);
      });
    }
  });
}
