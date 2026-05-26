/**
 * tests/scenarios/_all-wizards-simulated.spec.js
 *
 * Standardized end-to-end coverage across every wizard in WIZARD_CATALOG:
 *
 *   Path A  Simulated → Design Magnetic → Core Adviser → Wire Adviser (Advise All)
 *           → verify the magnetic is fully advised + simulated, temperature SVG
 *           toggle round-trips, advanced parasitics modal opens.
 *
 *   Path B  Simulated → Design Magnetic → Magnetic Adviser → Get Advised
 *           → Load → verify (same checks).
 *
 * Both paths use the wizard's shipped defaults — if a wizard's defaults don't
 * yield a magnetic, the test fails loudly. That's the contract: defaults must
 * always produce a result.
 *
 * Adding a new wizard = one entry in utils/catalog.js. No new spec file.
 *
 * Tags:
 *   @scenario  — every test here
 *   @heavy     — wizards flagged 'heavy' in the catalog (DAB, LLC, CLLC, CLLLC)
 */

import { test } from '../_coverage.js';
import {
  WIZARD_CATALOG,
  pathACoreThenWireAdvisers,
  pathBMagneticAdviser,
  expectMagneticFullyAdvisedAndSimulated,
} from '../utils/index.js';

for (const wizard of WIZARD_CATALOG) {
  const heavy = wizard.tags.includes('heavy');
  const tagSuffix = ['@scenario', heavy && '@heavy'].filter(Boolean).join(' ');

  test.describe(`${wizard.key} ${tagSuffix}`, () => {
    // Tight per-test timeout: a wizard that needs > 2 min per path is either
    // hung in an internal retry loop or genuinely broken — either way, we
    // want fast feedback. Heavy resonant designs (DAB, LLC, CLLC, CLLLC) get
    // 4 min. Bump per-wizard via .setTimeout in the test body if needed.
    test.setTimeout(heavy ? 240_000 : 120_000);

    test(`${wizard.title}: Path A — Simulated → Design Magnetic → Core+Wire Advisers`, async ({ page }) => {
      await pathACoreThenWireAdvisers(page, wizard);
      await expectMagneticFullyAdvisedAndSimulated(page);
    });

    test(`${wizard.title}: Path B — Simulated → Design Magnetic → Magnetic Adviser → Load`, async ({ page }) => {
      await pathBMagneticAdviser(page, wizard);
      await expectMagneticFullyAdvisedAndSimulated(page);
    });
  });
}
