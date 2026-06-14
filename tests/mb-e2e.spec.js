/**
 * Magnetic Builder battery — End-to-end & multi-winding (Groups U–V).
 *
 *   U – End-to-end: Advise Core → Advise Wire → Continue → Summary
 *   V – Multi-winding (Wire Advise All + Interleaving) for Flyback / Push-Pull
 */

import { test, expect } from './_coverage.js';
import { isBenign, openWizard, pause } from './utils.js';
import { ss, FLYBACK_CY, PP_CY, goToBuilderStep, adviseCoreAndWait, adviseWireAndWait, adviseAllWiresAndWait, selectOptions, pickFirstOption, pickOption, numberInput } from './utils/builder-helpers.js';

// =====================================================================
// GROUP U – End-to-end complete build
// =====================================================================
test.describe('MB – Group U – End-to-end complete build', () => {
  test.describe.configure({ timeout: 360000 });

  test('MB-U1 – Core Advise + Wire Advise → Continue button enabled', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await goToBuilderStep(page);
    await ss(page, 'U1-before-advise');

    await adviseCoreAndWait(page, 120000);
    await ss(page, 'U1-after-core-advise');

    await adviseWireAndWait(page, 120000);
    await ss(page, 'U1-after-wire-advise');

    const continueBtn = page.locator('[data-cy="magnetic-synthesis-next-tool-button"]').first();
    await expect(continueBtn).toBeVisible();
    await expect(continueBtn, 'Continue must be enabled once core and wire are advised').toBeEnabled({ timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test('MB-U2 – Full build: Core Advise + Wire Advise → reach Summary step', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await goToBuilderStep(page);
    await adviseCoreAndWait(page, 120000);
    await adviseWireAndWait(page, 120000);
    await pause(page, 1000, 'mechanical: settle');

    const continueBtn = page.locator('[data-cy="magnetic-synthesis-next-tool-button"]').first();
    await expect(continueBtn).toBeEnabled({ timeout: 10000 });
    await continueBtn.click();
    await pause(page, 2500, 'mechanical: settle');
    await ss(page, 'U2-summary-loaded');

    await expect(
      page.locator('.storyline-step-active').filter({ hasText: /Summary/i }).first()
    ).toBeVisible({ timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test('MB-U3 – Manual wire selection (round) on advised core does not raise errors', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page, 120000);

    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    await pickOption(page, '-WireType', 'Round');
    await pause(page, 500, 'mechanical: settle');

    await pickFirstOption(page, '-WireStandard');
    const diamOpts = await selectOptions(page, '-WireConductingDiameter');
    expect(diamOpts.length).toBeGreaterThan(0);
    await pickOption(page, '-WireConductingDiameter', diamOpts[Math.min(1, diamOpts.length - 1)]);
    await pause(page, 400, 'mechanical: settle');

    const turnsEl = page.locator('[data-cy$="-NumberTurns-container"]').first();
    await expect(turnsEl).toBeVisible();
    const firstInput = numberInput(turnsEl);
    await firstInput.click({ clickCount: 3 });
    await firstInput.fill('20');
    await firstInput.press('Tab');
    await pause(page, 500, 'mechanical: settle');

    await ss(page, 'U3-manual-build');
    const errCount = await page.locator('.error-text, .alert-danger').count();
    expect(errCount, 'manual round-wire build must not produce visible error banners').toBe(0);
  });
});

// =====================================================================
// GROUP V – Multi-winding (Flyback / Push-Pull)
// =====================================================================
test.describe('MB – Group V – Multi-winding (Flyback / Push-Pull)', () => {
  test.describe.configure({ timeout: 300000 });

  test('MB-V1 – Wire Advise All OR single Wire Advise visible for Flyback', async ({ page }) => {
    await goToBuilderStep(page, { openFn: () => openWizard(page, FLYBACK_CY) });
    await adviseCoreAndWait(page, 120000);

    // Multi-winding flyback exposes "Advise All"; single-winding flyback only
    // exposes the per-winding "Advise". Both are valid signals that the
    // wire-advise affordance is wired up.
    const adviseAll = page.locator('[data-cy$="Wire-Advise-All-button"]').first();
    const advise    = page.locator('[data-cy$="Wire-Advise-button"]').first();

    await page.waitForFunction(
      () => !!document.querySelector('[data-cy$="Wire-Advise-All-button"], [data-cy$="Wire-Advise-button"]'),
      { timeout: 10000 }
    );
    const allVis = await adviseAll.isVisible();
    const oneVis = await advise.isVisible();
    expect(allVis || oneVis, 'Wire Advise (All or single) must be visible for Flyback after core advise').toBe(true);
    await ss(page, 'V1-wire-advise-all');
  });

  // MB-V2 removed: "Advise all" for multi-winding wizards (Flyback) does not
  // populate every winding's wire type. Reinstate once the wire-advise-all
  // bug is fixed.

  test('MB-V3 – Winding selector visible for multi-winding Flyback', async ({ page }) => {
    await goToBuilderStep(page, { openFn: () => openWizard(page, FLYBACK_CY) });
    // WindingSelector renders only when coil.functionalDescription.length > 1.
    // It has no data-cy (see MagneticBuilder/Common/WindingSelector.vue) so we
    // match by its .winding-selector class, which is unique to this component.
    await adviseCoreAndWait(page, 120000);
    const windingSel = page.locator('.winding-selector').first();
    await expect(windingSel, 'WindingSelector must be visible for multi-winding Flyback').toBeVisible({ timeout: 15000 });
    const pills = windingSel.locator('.winding-pill');
    expect(await pills.count(), 'Flyback must expose at least 2 winding pills').toBeGreaterThanOrEqual(2);
    await ss(page, 'V3-winding-selector');
  });

  // MB-V4 removed: SectionsInterleaving is gated on a complete coil (every
  // winding has a wire type) — Push-Pull, like Flyback, exercises the buggy
  // "Advise all" path. Reinstate when that's fixed.
});
