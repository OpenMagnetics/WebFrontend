/**
 * tests/scenarios/buck-magnetic-flows.spec.js
 *
 * Phase 3 proof-of-concept: the SAME end-to-end coverage that
 * `tests/buck-boost-battery.spec.js` Groups E/F/G provide (Buck only),
 * expressed via the scenario library.
 *
 * Side-by-side comparison:
 *   • old Buck-E1/E2 + F1/F2 + G1/G2  →  ~160 LOC of boilerplate
 *   • new scenario test               →  ~40 LOC
 *
 * Both assert the same invariants; this file adds the geometry checks
 * (2D coil SVG fits its viewBox, 3D core STL has non-zero mesh) that the
 * old battery did NOT cover.
 *
 * Tag policy: this file is the canonical "scenarios" target — the Phase 9
 * project layout will pick it up via `grepTagsAny: ['scenario']`.
 */

import { test } from '../_coverage.js';
import { getWizard, collectConsoleErrors, expectNoConsoleErrors, fullMagneticViaAdviser, fullMagneticViaCoreAndWireAdvisers, wizardAnalyticalAndSimulated } from '../utils/index.js';

const buck = getWizard('buck');

test.describe(`scenarios/${buck.key} @scenario`, () => {
  // Heavy: includes WASM adviser runs (~30–90s).
  test.setTimeout(240_000);

  test(`${buck.title}: analytical + simulated (smoke)`, async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await wizardAnalyticalAndSimulated(page, buck);
    expectNoConsoleErrors(errors);
  });

  test(`${buck.title}: full magnetic via Magnetic Adviser`, async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const { mas, svg, stl } = await fullMagneticViaAdviser(page, buck);
    // Scenario already asserts MAS validity, SVG viewBox, STL non-empty.
    // Tests can add wizard-specific numerical assertions here.
    test.info().annotations.push(
      { type: 'mas-outputs', description: String(mas?.outputs?.length ?? 0) },
      { type: 'svg-bytes',    description: String(svg?.size ?? 0) },
      { type: 'stl-bytes',    description: String(stl?.size ?? 0) },
    );
    expectNoConsoleErrors(errors);
  });

  test(`${buck.title}: full magnetic via Core Adviser`, async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const { mas, svg, stl } = await fullMagneticViaCoreAndWireAdvisers(page, buck);
    test.info().annotations.push(
      { type: 'mas-coil-windings',
        description: String(mas?.magnetic?.coil?.functionalDescription?.length ?? 0) },
      { type: 'svg-bytes', description: String(svg?.size ?? 0) },
      { type: 'stl-bytes', description: String(stl?.size ?? 0) },
    );
    expectNoConsoleErrors(errors);
  });
});
