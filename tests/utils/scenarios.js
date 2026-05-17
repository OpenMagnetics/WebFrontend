/**
 * tests/utils/scenarios.js
 *
 * End-to-end scenarios — orchestrations of nav + steps + assertions that
 * exercise a complete user flow. Each scenario is one named test.step at
 * the top level so reports show them as a single line of execution.
 *
 * Convention: scenarios produce a result object the test can assert against
 * (rather than asserting inside the scenario), but they DO assert structural
 * invariants along the way (e.g. "the adviser returned ≥1 result").
 */
import { test } from '@playwright/test';
import { openWizard, runAnalytical, goToMagneticAdviser, goToMagneticBuilder } from './nav.js';
import {
  runMagneticAdviser,
  selectAdvisedResult,
  runCoreAdviser,
  dumpMAS,
  download2DCoilSVG,
  build3DCoreSTL,
  runSimulated,
} from './steps.js';
import { expectValidMagnetic, expect2DSvgFits, expectStlNonEmpty } from './assertions.js';

/**
 * Full magnetic via the Magnetic Adviser:
 *   open wizard → analytical → Design Magnetic → run adviser → pick result[0]
 *   → dump MAS → assert validity → grab 2D coil SVG → build 3D core STL
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('./catalog.js').WizardSpec} wizard
 * @param {{ resultIndex?: number, withGeometry?: boolean }} [opts]
 * @returns {Promise<{ mas: object, svg?: string, stl?: { path: string, size: number } }>}
 */
export async function fullMagneticViaAdviser(page, wizard, opts = {}) {
  const { resultIndex = 0, withGeometry = true } = opts;
  return test.step(`scenario: fullMagneticViaAdviser(${wizard.key})`, async () => {
    if (!wizard.capabilities.adviser) {
      throw new Error(`fullMagneticViaAdviser: wizard "${wizard.key}" has capabilities.adviser=false`);
    }
    await openWizard(page, wizard.linkCy);
    await runAnalytical(page);
    await goToMagneticAdviser(page);

    const count = await runMagneticAdviser(page);
    if (count < 1) {
      throw new Error(`fullMagneticViaAdviser(${wizard.key}): adviser returned 0 results`);
    }
    await selectAdvisedResult(page, resultIndex);

    const mas = await dumpMAS(page);
    expectValidMagnetic(mas);

    const out = { mas };
    if (withGeometry) {
      out.svg = await download2DCoilSVG(page);
      expect2DSvgFits(out.svg.body);
      out.stl = await build3DCoreSTL(page);
      expectStlNonEmpty(out.stl);
    }
    return out;
  });
}

/**
 * Full magnetic via Core + (eventually) Wire advisers — the "I want to drive
 * each adviser by hand" flow:
 *   open wizard → analytical → Review Specs → run Core Adviser → dump MAS
 *   → assert validity → grab 2D coil SVG → build 3D core STL
 *
 * Wire Adviser is skipped until any wizard sets capabilities.wireAdviser=true.
 */
export async function fullMagneticViaCoreAndWireAdvisers(page, wizard, opts = {}) {
  const { withGeometry = true } = opts;
  return test.step(`scenario: fullMagneticViaCoreAndWireAdvisers(${wizard.key})`, async () => {
    if (!wizard.capabilities.coreAdviser) {
      throw new Error(`fullMagneticViaCoreAndWire…: wizard "${wizard.key}" lacks coreAdviser`);
    }
    await openWizard(page, wizard.linkCy);
    await runAnalytical(page);
    await goToMagneticBuilder(page);

    await runCoreAdviser(page);

    // Future: once any wizard exposes Wire Adviser, run it here. Today no
    // wizard does (catalog says wireAdviser:false for all), so we go
    // straight to MAS validation.

    const mas = await dumpMAS(page);
    expectValidMagnetic(mas);

    const out = { mas };
    if (withGeometry) {
      out.svg = await download2DCoilSVG(page);
      expect2DSvgFits(out.svg.body);
      out.stl = await build3DCoreSTL(page);
      expectStlNonEmpty(out.stl);
    }
    return out;
  });
}

/**
 * Drive a wizard end-to-end: analytical + simulated waveforms, no nav off
 * the wizard page. Cheap smoke flow used by per-wizard battery files.
 */
export async function wizardAnalyticalAndSimulated(page, wizard) {
  return test.step(`scenario: wizardAnalyticalAndSimulated(${wizard.key})`, async () => {
    await openWizard(page, wizard.linkCy);
    await runAnalytical(page);
    if (wizard.capabilities.simulated) {
      await runSimulated(page);
    }
  });
}
