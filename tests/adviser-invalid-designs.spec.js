/**
 * ABT #260 — INVALID (failed-validity-filter) designs must never be selectable.
 *
 * MKF's CoilAdviser keeps designs whose coil failed its validity filters in the
 * result list, marking them by prefixing manufacturerInfo.reference with
 * 'INVALID (failed validity filters): '. They are not buildable, so the
 * Magnetic Adviser must exclude them from the pick list (showing a visible
 * "N hidden" note instead of silently shrinking the list) and the Kirchhoff
 * handoff must never return them.
 *
 * This spec seeds the persisted advise cache with INVALID-marked rows and
 * remounts the adviser — no backend adviser run needed.
 */

import { test, expect } from './_coverage.js';
import { openWizard, goToMagneticAdviser, pause } from './utils.js';
import { withPinia } from './utils/index.js';

const BUCK_CY = 'Buck-link';

// NB: the advise rows are inlined inside withPinia callbacks below — withPinia
// serializes the callback into the page context, so it cannot close over
// helpers defined in this file.

test.describe('Adviser — INVALID designs excluded (ABT #260)', () => {
  test.describe.configure({ timeout: 120000 });

  test('AD-INV1: cached INVALID advises are dropped on mount and reported visibly', async ({ page }) => {
    const ok = await goToMagneticAdviser(page, () => openWizard(page, BUCK_CY));
    expect(ok, 'goToMagneticAdviser must succeed').toBe(true);
    await expect(
      page.locator('[data-cy="MagneticBuilder-MagneticAdviser-calculate-mas-advises-button"]')
    ).toBeVisible({ timeout: 10000 });

    // Seed the (persisted) advise cache with INVALID-only rows, as a stale
    // pre-#260 cache would contain, then remount the adviser component.
    await withPinia(page, (pinia) => {
      const cache = pinia._s.get('adviseCache');
      cache.currentMasAdvises = [
        {
          mas: {
            inputs: { operatingPoints: [] },
            magnetic: {
              manufacturerInfo: { reference: 'INVALID (failed validity filters): 98 E 13/7/6 2 stacks gapped 0.13 mm, Turns: 24' },
              coil: { functionalDescription: [] },
              core: {},
            },
            outputs: [],
          },
          scoringPerFilter: {},
          weightedTotalScoring: 0,
        },
        {
          mas: {
            inputs: { operatingPoints: [] },
            magnetic: {
              manufacturerInfo: { reference: 'INVALID (failed validity filters): another overfilled design' },
              coil: { functionalDescription: [] },
              core: {},
            },
            outputs: [],
          },
          scoringPerFilter: {},
          weightedTotalScoring: 0,
        },
      ];
      const state = pinia._s.get('state');
      state.getCurrentToolState().subsection = 'magneticBuilder';
    });
    await pause(page, 300, 'mechanical: let the builder subsection mount');
    await withPinia(page, (pinia) => {
      const state = pinia._s.get('state');
      state.getCurrentToolState().subsection = 'magneticAdviser';
    });

    // The mount-time filter must drop both rows and say so.
    const note = page.locator('[data-cy="MagneticBuilder-MagneticAdviser-dropped-invalid-advises"]');
    await expect(note, 'dropped-invalid note must be visible').toBeVisible({ timeout: 10000 });
    await expect(note).toContainText('2');
    await expect(note).toContainText('validity filters');

    // No INVALID design may be rendered as a selectable card.
    await expect(page.locator('[data-cy$="-select-button"]')).toHaveCount(0);

    // The cache itself must have been scrubbed (so no other consumer sees them).
    const cacheState = await withPinia(page, (pinia) => {
      const cache = pinia._s.get('adviseCache');
      return {
        length: cache.currentMasAdvises.length,
        refs: cache.currentMasAdvises.map((a) => a.mas.magnetic.manufacturerInfo.reference),
      };
    });
    expect(cacheState.length, 'INVALID advises must be scrubbed from the cache').toBe(0);
  });
});
