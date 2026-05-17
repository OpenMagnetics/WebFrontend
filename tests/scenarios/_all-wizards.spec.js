/**
 * tests/scenarios/_all-wizards.spec.js
 *
 * Parameterized end-to-end scenarios across every wizard in WIZARD_CATALOG.
 * For each entry it runs (subject to capability flags):
 *
 *   1. wizardAnalyticalAndSimulated  (cheap smoke — every wizard)
 *   2. fullMagneticViaAdviser        (requires capabilities.adviser)
 *   3. fullMagneticViaCoreAndWire…   (requires capabilities.coreAdviser)
 *
 * Adding a new wizard = appending one entry to utils/catalog.js. No new test
 * file needed.
 *
 * Tags:
 *   @scenario  — every test here
 *   @heavy     — wizards flagged 'heavy' in the catalog (DAB at 240s+)
 *   @smoke     — flagged wizards' analytical-and-simulated test only
 *
 * This file REPLACES the per-wizard Groups E/F/G blocks in the legacy
 * `*-battery.spec.js` files. Those files are kept (skipped/deleted in
 * Phase 4) until this file is validated against the dev server.
 */

import { test } from '../_coverage.js';
import { WIZARD_CATALOG, collectConsoleErrors, expectNoConsoleErrors, fullMagneticViaAdviser, fullMagneticViaCoreAndWireAdvisers, wizardAnalyticalAndSimulated } from '../utils/index.js';

for (const wizard of WIZARD_CATALOG) {
  const heavy = wizard.tags.includes('heavy');
  const smoke = wizard.tags.includes('smoke');
  const tagSuffix = ['@scenario', heavy && '@heavy', smoke && '@smoke'].filter(Boolean).join(' ');

  test.describe(`${wizard.key} ${tagSuffix}`, () => {
    test.setTimeout(heavy ? 360_000 : 240_000);

    test(`${wizard.title}: analytical + simulated`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await wizardAnalyticalAndSimulated(page, wizard);
      expectNoConsoleErrors(errors);
    });

    if (wizard.capabilities.adviser) {
      test(`${wizard.title}: full magnetic via Magnetic Adviser`, async ({ page }) => {
        const errors = collectConsoleErrors(page);
        const { mas, svg, stl } = await fullMagneticViaAdviser(page, wizard);
        test.info().annotations.push(
          { type: 'mas-outputs', description: String(mas?.outputs?.length ?? 0) },
          { type: 'svg-bytes',    description: String(svg?.size ?? 0) },
          { type: 'stl-bytes',    description: String(stl?.size ?? 0) },
        );
        expectNoConsoleErrors(errors);
      });
    }

    if (wizard.capabilities.coreAdviser) {
      test(`${wizard.title}: full magnetic via Core Adviser`, async ({ page }) => {
        const errors = collectConsoleErrors(page);
        // Some wizards may not have a windable coil after Core Adviser alone
        // (Wire Adviser would be the next step); disable geometry capture
        // until Wire Adviser is wired up in the catalog.
        const { mas } = await fullMagneticViaCoreAndWireAdvisers(page, wizard, {
          withGeometry: wizard.capabilities.wireAdviser,
        });
        test.info().annotations.push(
          { type: 'mas-coil-windings',
            description: String(mas?.magnetic?.coil?.functionalDescription?.length ?? 0) },
        );
        expectNoConsoleErrors(errors);
      });
    }
  });
}
