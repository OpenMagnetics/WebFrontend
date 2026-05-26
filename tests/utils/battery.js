/**
 * tests/utils/battery.js
 *
 * `makeBatterySpec(wizard, opts?)` generates the standard "battery" of tests
 * for one wizard using the catalog + scenario library. Adding a wizard to the
 * suite becomes:
 *
 *   // tests/wizards/buck.spec.js
 *   import { makeBatterySpec, getWizard } from '../utils/index.js';
 *   makeBatterySpec(getWizard('buck'));
 *
 * Group mapping:
 *   A – Layout                → group_A_layout            (always @smoke)
 *   B – Analytical (default)  → group_B_analytical
 *   B2 – iKnowMode analytical → only if capabilities.iKnowMode
 *   B3 – iKnowMode simulated  → only if iKnowMode && simulated
 *   D – Simulated             → only if capabilities.simulated
 *   E – Navigation            → Review Specs / Design Magnetic (smokeDeep also marks E1)
 *   F – Magnetic Adviser e2e  → only if capabilities.adviser     (tagged @heavy)
 *   G1 – Core Adviser e2e     → only if capabilities.coreAdviser (tagged @heavy)
 *   G2 – Core → Wire chain    → only if capabilities.wireAdviser (tagged @heavy)
 *   H – Option-matrix         → one analytical run per wizard.options[] entry
 *
 * @smoke covers: every wizard's A1 + smokeDeep wizards' B1/E1 + the single
 *   `smokeBuilder` wizard's F1 (one full Magnetic Builder run in smoke).
 * @heavy covers: F/G tests only (long WASM adviser runs).
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
  pathACoreThenWireAdvisers,
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
 *   skipGroups?: ReadonlyArray<'A'|'B'|'D'|'E'|'F'|'G'|'H'>,
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

  // Smoke tag — appended to test title so Playwright's tag-grep picks it up.
  const SMOKE = ' @smoke';
  const HEAVY = ' @heavy';

  test.describe(`${wizard.key} battery @scenario`, () => {
    // Per-test timeouts are set inline on F/G; the describe-level cap is just
    // a safety net. Drop the legacy 15-min ceiling — any adviser run taking
    // more than 3 min on a dev machine is a bug, not a slow test.
    test.setTimeout(180_000);

    if (!skip('A')) {
      test(`${wizard.title}-A1 — layout: title + Conditions card + Analytical button${SMOKE}`, async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await open(page);
        await expect(page.locator('.wizard-title').first()).toBeVisible();
        await expect(conditionsCard(page)).toBeVisible();
        await expect(page.locator('.sim-btn.analytical')).toBeVisible();
        expectNoConsoleErrors(errors);
      });
    }

    if (!skip('B')) {
      const smokeTag = wizard.smokeDeep ? SMOKE : '';
      test(`${wizard.title}-B1 — analytical runs, canvas appears${smokeTag}`, async ({ page }) => {
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

      if (wizard.capabilities.simulated) {
        test(`${wizard.title}-B3 — "I know the design" simulated runs, canvas appears`, async ({ page }) => {
          const errors = collectConsoleErrors(page);
          await open(page);
          await switchToIKnowMode(page);
          await runSimulated(page);
          await expect(page.locator('.error-text').first()).toBeHidden();
          expect(await page.locator('canvas').count()).toBeGreaterThan(0);
          expectNoConsoleErrors(errors);
        });
      }
    }

    if (!skip('D') && wizard.capabilities.simulated) {
      // Real run — click Simulated, wait for spinner to clear, assert chart
      // rendered + no console errors. The legacy "button is clickable" check
      // was too shallow: a wizard whose simulated path threw still passed.
      test(`${wizard.title}-D1 — simulated runs, canvas appears`, async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await open(page);
        await runSimulated(page);
        await expect(page.locator('.error-text').first()).toBeHidden();
        expect(await page.locator('canvas').count()).toBeGreaterThan(0);
        expectNoConsoleErrors(errors);
      });
    }

    if (!skip('S') && wizard.capabilities.spice) {
      test(`${wizard.title}-S1 — SPICE modal opens with non-empty netlist`, async ({ page }) => {
        await open(page);
        await runAnalytical(page);
        await runSpice(page);
      });
    }

    if (!skip('E')) {
      const smokeE1 = wizard.smokeDeep ? SMOKE : '';
      test(`${wizard.title}-E1 — Review Specs navigates to magnetic_tool${smokeE1}`, async ({ page }) => {
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
      // Tagged @heavy; one wizard (buck via smokeBuilder) also tagged @smoke
      // so the smoke project exercises the full Magnetic Builder once.
      const smokeF1 = wizard.smokeBuilder ? SMOKE : '';
      test(`${wizard.title}-F1 — simulated → Design Magnetic → Magnetic Adviser → valid MAS${HEAVY}${smokeF1}`, async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await pathBMagneticAdviser(page, wizard);
        const mas = await dumpMAS(page);
        expectValidMagnetic(mas);
        expectNoConsoleErrors(errors);
      });
    }

    if (!skip('G') && wizard.capabilities.coreAdviser) {
      // G1: simulated (or analytical when unavailable) → Design Magnetic
      //     → Core Adviser → validate MAS
      test(`${wizard.title}-G1 — simulated → Design Magnetic → Core Adviser → valid MAS${HEAVY}`, async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await openWizard(page, wizard.linkCy);
        if (precondition) await precondition(page);
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

    if (!skip('G') && wizard.capabilities.coreAdviser && wizard.capabilities.wireAdviser) {
      // G2: Core → Wire adviser chain. Uses pathACoreThenWireAdvisers which
      // runs Simulated → Design Magnetic → Core Advise → Wire Advise All.
      test(`${wizard.title}-G2 — simulated → Core + Wire Adviser → valid MAS${HEAVY}`, async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await pathACoreThenWireAdvisers(page, wizard);
        const mas = await dumpMAS(page);
        expectValidMagnetic(mas);
        expectNoConsoleErrors(errors);
      });
    }

    if (!skip('H') && wizard.options.length > 0) {
      // H: one analytical run per named wizard option toggle. The toggle
      // selector convention is `[data-cy="<wizardPrefix>-<option>-toggle"]`
      // — wizards that don't expose this convention should leave options
      // empty in the catalog rather than papering over the gap here.
      for (const opt of wizard.options) {
        test(`${wizard.title}-H[${opt}] — analytical runs with ${opt} toggled`, async ({ page }) => {
          const errors = collectConsoleErrors(page);
          await open(page);
          const toggle = page.locator(`[data-cy="${wizard.wizardPrefix}-${opt}-toggle"]`).first();
          await toggle.waitFor({ state: 'visible', timeout: 10_000 });
          await toggle.click();
          await runAnalytical(page);
          await expect(page.locator('.error-text').first()).toBeHidden();
          expect(await page.locator('canvas').count()).toBeGreaterThan(0);
          expectNoConsoleErrors(errors);
        });
      }
    }
  });
}
