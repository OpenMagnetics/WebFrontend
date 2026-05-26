/**
 * tests/utils/flows.js
 *
 * Composable mid-level flows. Each flow drives the UI to a known state and
 * throws on failure — NO assertions about correctness/completeness here
 * (that's tests/utils/verification.js).
 *
 * Reuses existing primitives from steps.js / nav.js / wait.js — flows.js
 * should grow by composition, not by re-implementing buttons.
 */
import { test, expect } from '@playwright/test';
import { openWizard, runAnalytical } from './nav.js';
import {
  runMagneticAdviser,
  selectAdvisedResult,
  runCoreAdviser,
  runSimulated,
} from './steps.js';
import {
  designMagneticBtn,
} from './locators.js';
import {
  settleAnimations,
  softVisible,
  tryWaitForFunction,
} from './wait.js';

/* ── Wizard side ──────────────────────────────────────────────────────── */

/**
 * Run Simulated mode on the current wizard. Delegates to steps.runSimulated.
 * Re-exported here so test files can import everything wizard-flow from one place.
 */
export async function runSimulatedInWizard(page, opts) {
  return runSimulated(page, opts);
}

/**
 * Click "Design Magnetic" and wait for /magnetic_tool. Throws if the button
 * is disabled (means the wizard never completed simulation/analytical).
 */
export async function clickDesignMagnetic(page) {
  return test.step('clickDesignMagnetic', async () => {
    const btn = designMagneticBtn(page);
    await btn.waitFor({ state: 'visible', timeout: 10_000 });
    if (await btn.isDisabled()) {
      throw new Error('clickDesignMagnetic: "Design Magnetic" button is disabled');
    }
    await btn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30_000 });
    // Builder needs a moment to hydrate its panels (Core / Coil / etc.).
    await tryWaitForFunction(page, () =>
      document.querySelector('[data-cy$="-Core-Advise-button"]') !== null,
      { timeout: 30_000 });
    await settleAnimations(page, 300);
  });
}

/* ── Builder side: Core Adviser ───────────────────────────────────────── */

/** Click the Core Configuration "Advise" button and wait for completion. */
export async function runCoreAdviserInBuilder(page, opts) {
  return runCoreAdviser(page, opts);
}

/* ── Builder side: Wire Adviser ───────────────────────────────────────── */

/**
 * Click "Advise All" in Wire Configuration. For single-winding designs the
 * button is "Wire-Advise-button" (no "-All-"); fall back to that.
 * Waits for every winding in masStore to have a wire.
 */
export async function runWireAdviserAll(page, { timeoutMs = 180_000 } = {}) {
  return test.step('runWireAdviserAll', async () => {
    const all = page.locator('[data-cy$="Wire-Advise-All-button"]').first();
    const single = page.locator('[data-cy$="Wire-Advise-button"]').first();

    let btn;
    if (await softVisible(all, 5_000)) {
      btn = all;
    } else if (await softVisible(single, 5_000)) {
      btn = single;
    } else {
      throw new Error(
        'runWireAdviserAll: neither "Wire-Advise-All-button" nor "Wire-Advise-button" is visible'
      );
    }
    if (await btn.isDisabled()) {
      throw new Error('runWireAdviserAll: wire adviser button is disabled');
    }
    await btn.click();

    // Wait until every winding has a real wire object (not null, not "Dummy").
    await page.waitForFunction(() => {
      const app = document.querySelector('#app')?.__vue_app__;
      const store = app?.config?.globalProperties?.$pinia?._s?.get?.('mas');
      const windings = store?.mas?.magnetic?.coil?.functionalDescription;
      if (!Array.isArray(windings) || windings.length === 0) return false;
      return windings.every(w => {
        const wire = w.wire;
        if (!wire) return false;
        const name = typeof wire === 'string' ? wire : wire.name;
        return name && name !== 'Dummy';
      });
    }, { timeout: timeoutMs });
    await settleAnimations(page, 300);
  });
}

/* ── Builder side: Magnetic Adviser ──────────────────────────────────── */

/**
 * Open Magnetic Adviser panel → Get Advised Magnetics → select result → Load.
 * Composes runMagneticAdviser + selectAdvisedResult into one flow.
 */
export async function runMagneticAdviserAndLoad(page, { resultIndex = 0 } = {}) {
  return test.step('runMagneticAdviserAndLoad', async () => {
    // Open Magnetic Adviser if not already there.
    const adviserCalcBtn = page.locator(
      '[data-cy="MagneticBuilder-MagneticAdviser-calculate-mas-advises-button"]'
    );
    if (!(await softVisible(adviserCalcBtn, 3_000))) {
      const entry = page.locator('[data-cy$="-magnetics-adviser-button"]').first();
      await entry.waitFor({ state: 'visible', timeout: 10_000 });
      await entry.click();
      await settleAnimations(page, 300);
    }

    const count = await runMagneticAdviser(page);
    if (count <= resultIndex) {
      throw new Error(
        `runMagneticAdviserAndLoad: requested resultIndex=${resultIndex} but only ${count} returned`
      );
    }
    await selectAdvisedResult(page, resultIndex);

    // After Load we land back on the builder.
    await tryWaitForFunction(page, () =>
      document.querySelector('[data-cy$="-Core-Advise-button"]') !== null,
      { timeout: 30_000 });
    await settleAnimations(page, 500);
  });
}

/* ── Builder side: settle waiter ──────────────────────────────────────── */

/**
 * Wait for the builder's simulation panels to finish. Generous timeout —
 * heavy designs (DAB high-power, planar) re-run all models after a core or
 * wire change.
 */
export async function waitForBuilderSimulationSettled(page, timeoutMs = 180_000) {
  return test.step('waitForBuilderSimulationSettled', async () => {
    await tryWaitForFunction(page, () => {
      // CoilInfo loading spinner gone
      const spinner = document.querySelector('[data-cy$="-BasicCoilInfo-loading"]');
      if (spinner && spinner.offsetParent !== null) return false;
      // MAS outputs present
      const app = document.querySelector('#app')?.__vue_app__;
      const store = app?.config?.globalProperties?.$pinia?._s?.get?.('mas');
      const outputs = store?.mas?.outputs;
      if (!Array.isArray(outputs) || outputs.length === 0) return false;
      return outputs.every(op =>
        op?.coreLosses?.coreLosses != null &&
        op?.windingLosses?.windingLosses != null
      );
    }, { timeout: timeoutMs });
    await settleAnimations(page, 300);
  });
}

/* ── High-level paths ─────────────────────────────────────────────────── */

/**
 * Path A: Simulated → Design Magnetic → Core Advise → Wire Advise All
 *         → wait for simulation to settle.
 * Verification is the caller's responsibility.
 */
export async function pathACoreThenWireAdvisers(page, wizard) {
  return test.step(`pathA: ${wizard.key}`, async () => {
    await openWizard(page, wizard.linkCy);
    if (wizard.capabilities.simulated === false) {
      await runAnalytical(page);
    } else {
      await runSimulatedInWizard(page);
    }
    await clickDesignMagnetic(page);
    await runCoreAdviserInBuilder(page);
    await runWireAdviserAll(page);
    await waitForBuilderSimulationSettled(page);
  });
}

/**
 * Path B: Simulated → Design Magnetic → Magnetic Adviser → Get Advised
 *         → Load → wait for simulation to settle.
 * Verification is the caller's responsibility.
 */
export async function pathBMagneticAdviser(page, wizard) {
  return test.step(`pathB: ${wizard.key}`, async () => {
    await openWizard(page, wizard.linkCy);
    if (wizard.capabilities.simulated === false) {
      await runAnalytical(page);
    } else {
      await runSimulatedInWizard(page);
    }
    await clickDesignMagnetic(page);

    // Path B starts at the builder; navigate into Magnetic Adviser.
    const entry = page.locator('[data-cy$="-magnetics-adviser-button"]').first();
    expect(await softVisible(entry, 15_000),
      'Magnetic Adviser entry button not visible on builder page').toBe(true);
    await entry.click();
    await settleAnimations(page, 300);

    await runMagneticAdviserAndLoad(page);
    await waitForBuilderSimulationSettled(page);
  });
}
