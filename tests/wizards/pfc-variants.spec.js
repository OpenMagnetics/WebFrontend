/**
 * PFC topology-variant integration testbench.
 *
 * The PFC wizard now exposes a `topologyVariant` selector (PfcWizard.vue) that
 * flows through to the MAS PowerFactorCorrection model — parsed directly from the
 * aux JSON by calculate_pfc_inputs (no extra backend wiring). This spec proves
 * every SHIPPED variant runs end-to-end through the wizard's analytical path:
 *
 *   boost · bridgeless · semiBridgeless · interleavedBoost · totemPole · sepic · cuk
 *
 * (buck / buckBoost throw in MKF and Vienna has its own wizard, so they are not
 * offered in the selector and not tested here.)
 *
 * MKF runs in a Web Worker (Comlink proxy), so we drive everything through the
 * real UI — selecting the variant in the dropdown, clicking Analytical, and
 * asserting the canvas renders with no error banner and no console errors. That
 * is the genuine integration path (dropdown → aux → worker → WASM → waveforms).
 * A final differentiator test confirms the variant actually reaches the backend
 * (boost vs interleaved size to a different computed inductance), guarding
 * against a silently-ignored field.
 */

import { test, expect } from '../_coverage.js';
import { openWizard, runAnalytical } from '../utils/index.js';
import { collectConsoleErrors } from '../utils/console.js';
import { expectNoConsoleErrors } from '../utils/assertions.js';
import { getWizard } from '../utils/catalog.js';

const PFC = getWizard('pfc');                 // linkCy 'Pfc-link', wizardPrefix 'PfcWizard'
const variantSel = `[data-cy="${PFC.wizardPrefix}-TopologyVariant-select"]`;
const indValue   = `[data-cy="${PFC.wizardPrefix}-PfcInd-number-label"]`;

// enum value → visible label (must match dropdownLabelsConverterWizards.pfcVariant).
const VARIANTS = [
  { value: 'boost',            label: 'Boost (classic)' },
  { value: 'bridgeless',       label: 'Bridgeless' },
  { value: 'semiBridgeless',   label: 'Semi-Bridgeless' },
  { value: 'interleavedBoost', label: 'Interleaved Boost' },
  { value: 'totemPole',        label: 'Totem-Pole' },
  { value: 'sepic',            label: 'SEPIC' },
  { value: 'cuk',              label: 'Ćuk' },
];
const labelOf = (v) => VARIANTS.find((x) => x.value === v).label;

// ElementFromList renders a PrimeVue <Select> (not a native <select>): click to
// open the overlay, then click the option by its exact accessible name.
async function selectVariant(page, value) {
  const sel = page.locator(variantSel).first();
  await sel.waitFor({ state: 'visible', timeout: 10_000 });
  await sel.click();
  const opt = page.getByRole('option', { name: labelOf(value), exact: true });
  await opt.waitFor({ state: 'visible', timeout: 5_000 });
  await opt.click();
}

test.describe('PFC topology variants @scenario', () => {
  test.setTimeout(180_000);

  for (const { value: variant } of VARIANTS) {
    test(`PFC-Variant[${variant}] — select + analytical renders, no errors`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await openWizard(page, PFC.linkCy);

      await selectVariant(page, variant);

      // The selector drives conditional UI — proves the selection registered
      // reactively before we even hit the backend.
      if (variant === 'interleavedBoost') {
        await expect(page.locator(`[data-cy="${PFC.wizardPrefix}-NumberOfPhases-select"]`).first())
          .toBeVisible();
      }
      if (variant === 'totemPole') {
        await expect(page.locator(`[data-cy="${PFC.wizardPrefix}-TotemPoleHint"]`).first())
          .toBeVisible();
      }

      await runAnalytical(page);

      await expect(page.locator('.error-text').first()).toBeHidden();
      expect(await page.locator('canvas').count(),
        `${variant}: analytical must render at least one waveform canvas`).toBeGreaterThan(0);
      // Diagnostics populate only when the backend actually sized the variant.
      await expect(page.locator(indValue).first(),
        `${variant}: computed-inductance diagnostic must appear`).toBeVisible();

      expectNoConsoleErrors(errors);
    });
  }

  test('PFC-Variant — interleaved sizes differently from boost (field reaches backend)', async ({ page }) => {
    // Guard against a silently-ignored topologyVariant: a 2-phase interleaved
    // boost sizes each cell for Pout/2, so its computed inductance must differ
    // from the single-cell boost at the same nameplate. If the field were
    // dropped, both would compute the identical value.
    await openWizard(page, PFC.linkCy);

    await selectVariant(page, 'boost');
    await runAnalytical(page);
    const boostL = (await page.locator(indValue).first().textContent())?.trim();

    await selectVariant(page, 'interleavedBoost');
    await runAnalytical(page);
    const interleavedL = (await page.locator(indValue).first().textContent())?.trim();

    console.log(`[PFC-Variant differentiator] boost L=${boostL}  interleaved(2ph) L=${interleavedL}`);
    expect(boostL, 'boost computed inductance must be readable').toBeTruthy();
    expect(interleavedL, 'interleaved computed inductance must be readable').toBeTruthy();
    expect(interleavedL,
      'interleaved must size differently from boost — else topologyVariant was ignored')
      .not.toBe(boostL);
  });
});
