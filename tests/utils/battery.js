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
 * Groups F/G use flows.pathBMagneticAdviser / pathACoreThenWireAdvisers
 * (simulated-first paths) and validate the resulting MAS.
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
  pathBMagneticAdviser,
  clickDesignMagnetic,
  runCoreAdviserInBuilder,
  dumpMAS,
  expectValidMagnetic,
  runSimulated,
  runSpice,
  switchToIKnowMode,
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
    test.setTimeout(wizard.tags.includes('heavy') ? 900_000 : 360_000);

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

    if (!skip('B') && wizard.capabilities.iKnowMode) {
      test(`${wizard.title}-B2 — "I know the design" analytical runs, canvas appears`, async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await open(page);
        await switchToIKnowMode(page);
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

    if (!skip('S') && wizard.capabilities.spice) {
      test(`${wizard.title}-S1 — SPICE modal opens with non-empty netlist`, async ({ page }) => {
        await open(page);
        // SPICE generation may need analytical results to seed the simulation;
        // run analytical first to mirror the user flow.
        await runAnalytical(page);
        await runSpice(page);
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
      // F: simulated (or analytical when unavailable) → Design Magnetic
      //    → Magnetic Adviser → load result → validate MAS
      test(`${wizard.title}-F1 — simulated → Design Magnetic → Magnetic Adviser → valid MAS`, async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await pathBMagneticAdviser(page, wizard);
        const mas = await dumpMAS(page);
        expectValidMagnetic(mas);
        expectNoConsoleErrors(errors);
      });
    }

    if (!skip('G') && wizard.capabilities.coreAdviser) {
      // G: simulated (or analytical when unavailable) → Design Magnetic
      //    → Core Adviser → validate MAS
      //    Wire Adviser step omitted until the WireAdviser.vue placeholder is
      //    replaced with a real implementation (currently shows "we are working on it").
      test(`${wizard.title}-G1 — simulated → Design Magnetic → Core Adviser → valid MAS`, async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await openWizard(page, wizard.linkCy);
        if (wizard.capabilities.simulated) {
          await runSimulated(page);
        } else {
          await runAnalytical(page);
        }
        await clickDesignMagnetic(page);
        await runCoreAdviserInBuilder(page);
        const mas = await dumpMAS(page);
        expectValidMagnetic(mas);
        expectNoConsoleErrors(errors);
      });
    }
  });
}
