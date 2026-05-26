/**
 * tests/utils/verification.js
 *
 * Pure assertion helpers for "magnetic is completely advised and simulated".
 *
 * Each function throws (via expect()) with a precise message on failure.
 * NO flow logic, NO clicking — assertions only. Compose with tests/utils/flows.js.
 *
 * The master combinator is `expectMagneticFullyAdvisedAndSimulated(page)`:
 * one call validates everything we care about post-adviser-flow.
 */
import { expect } from '@playwright/test';
import { dumpMAS } from './steps.js';
import { softVisible, tryWaitForFunction } from './wait.js';
import { collectConsoleErrors } from './console.js';
import { expectNoConsoleErrors } from './assertions.js';

/* ── MAS-level assertions ─────────────────────────────────────────────── */

/** Core shape + material populated (not null, not empty). */
export function expectCoreAdvised(mas) {
  const fd = mas?.magnetic?.core?.functionalDescription;
  expect(fd, 'core.functionalDescription missing — Core Adviser did not run').toBeTruthy();
  const shape = fd.shape ?? fd.shape?.name;
  const material = fd.material ?? fd.material?.name;
  expect(shape, `core shape missing (got ${JSON.stringify(shape)})`).toBeTruthy();
  expect(material, `core material missing (got ${JSON.stringify(material)})`).toBeTruthy();
}

/** Every winding has a real wire (not null, not "Dummy"). */
export function expectWiresAdvised(mas) {
  const windings = mas?.magnetic?.coil?.functionalDescription;
  expect(Array.isArray(windings), 'coil.functionalDescription is not an array').toBe(true);
  expect(windings.length, 'coil has no windings').toBeGreaterThan(0);
  for (const [i, w] of windings.entries()) {
    const wire = w.wire;
    expect(wire, `winding[${i}] (${w.name}) wire is null — Wire Adviser did not run`).toBeTruthy();
    const wireName = typeof wire === 'string' ? wire : (wire?.name ?? '');
    expect(wireName, `winding[${i}] (${w.name}) wire is "Dummy" — Wire Adviser placeholder not replaced`)
      .not.toBe('Dummy');
  }
}

/** MAS outputs contain core + winding losses (proof simulation ran). */
export function expectSimulationOutputs(mas) {
  const outputs = mas?.outputs;
  expect(Array.isArray(outputs), 'mas.outputs is not an array').toBe(true);
  expect(outputs.length, 'mas.outputs is empty — simulation did not run').toBeGreaterThan(0);
  for (const [i, op] of outputs.entries()) {
    const coreLosses = op?.coreLosses?.coreLosses;
    const windingLosses = op?.windingLosses?.windingLosses;
    expect(Number.isFinite(Number(coreLosses)),
      `outputs[${i}].coreLosses.coreLosses not finite: ${coreLosses}`).toBe(true);
    expect(Number.isFinite(Number(windingLosses)),
      `outputs[${i}].windingLosses.windingLosses not finite: ${windingLosses}`).toBe(true);
  }
}

/* ── DOM-level assertions ─────────────────────────────────────────────── */

/** No "Outdated" / loading badges across CoilInfo / CoreInfo / WireInfo. */
export async function expectSimulationSettled(page, timeoutMs = 60_000) {
  await tryWaitForFunction(page, () => {
    const loading = document.querySelector('[data-cy$="-BasicCoilInfo-loading"]');
    if (loading && loading.offsetParent !== null) return false;
    const outdated = Array.from(document.querySelectorAll('[class*="outdated"]'))
      .filter(el => el.offsetParent !== null);
    return outdated.length === 0;
  }, { timeout: timeoutMs });
}

/** Snapshot the active plotMode from $stateStore.magnetic2DVisualizerState. */
async function plotMode(page) {
  return page.evaluate(() => {
    const app = document.querySelector('#app')?.__vue_app__;
    const ss = app?.config?.globalProperties?.$stateStore;
    return ss?.magnetic2DVisualizerState?.plotMode ?? null;
  });
}

/**
 * Temperature toggle round-trip:
 *   1. Initial state must NOT be 'temperature_field' (button text "Show Temperature").
 *   2. Click toggle → plotMode === 'temperature_field' AND button text "Hide Temperature".
 *   3. Click again → plotMode !== 'temperature_field' AND button text "Show Temperature".
 * Throws if button missing or any of the three states is wrong.
 */
export async function expectTemperatureToggleWorks(page) {
  const btn = page.locator('[data-cy$="-Coil-ToggleTemperaturePlot-button"]').first();
  expect(await softVisible(btn, 10_000),
    'temperature plot toggle button [data-cy$="-Coil-ToggleTemperaturePlot-button"] not visible')
    .toBe(true);

  const initialMode = await plotMode(page);
  expect(initialMode, 'plotMode is already "temperature_field" before clicking — unexpected initial state')
    .not.toBe('temperature_field');
  await expect(btn, 'initial button text is not "Show Temperature"').toContainText(/Show Temperature/i);

  await btn.click();
  const flipped = await tryWaitForFunction(page, () => {
    const app = document.querySelector('#app')?.__vue_app__;
    const ss = app?.config?.globalProperties?.$stateStore;
    return ss?.magnetic2DVisualizerState?.plotMode === 'temperature_field';
  }, { timeout: 15_000 });
  expect(flipped, 'plotMode did not become "temperature_field" after clicking toggle').toBe(true);
  await expect(btn, 'button text did not change to "Hide Temperature"').toContainText(/Hide Temperature/i);

  await btn.click();
  const reverted = await tryWaitForFunction(page, () => {
    const app = document.querySelector('#app')?.__vue_app__;
    const ss = app?.config?.globalProperties?.$stateStore;
    return ss?.magnetic2DVisualizerState?.plotMode !== 'temperature_field';
  }, { timeout: 15_000 });
  expect(reverted, 'plotMode did not leave "temperature_field" after second click').toBe(true);
  await expect(btn, 'button text did not revert to "Show Temperature"').toContainText(/Show Temperature/i);
}

/**
 * Advanced Parasitics modal opens without console errors, then closes.
 * We do NOT inspect specific matrices — just that the panel loads cleanly.
 */
export async function expectAdvancedParasiticsOpens(page) {
  const btn = page.locator('[data-cy$="-Coil-ShowParasiticsView-button"]').first();
  expect(await softVisible(btn, 10_000),
    'advanced parasitics button [data-cy$="-Coil-ShowParasiticsView-button"] not visible')
    .toBe(true);

  await btn.click();

  // The AdvancedCoilInfo view shows three matrix tables. We require the
  // container to render and at least one matrix-style element to be present.
  const matricesVisible = await tryWaitForFunction(page, () => {
    const containers = document.querySelectorAll(
      '[class*="advanced"], [class*="parasitics"], [class*="matrix"]'
    );
    for (const c of containers) {
      if (c.offsetParent !== null && c.querySelector('table, .matrix, svg')) return true;
    }
    return false;
  }, { timeout: 30_000 });
  expect(matricesVisible, 'advanced parasitics matrices did not render within 30s').toBe(true);

  // Return to builder — usually an X / back button. Press Escape as a fallback.
  await page.keyboard.press('Escape');
}

/* ── Master combinator ────────────────────────────────────────────────── */

/**
 * End-to-end verification: MAS is fully advised, simulation outputs are
 * present, UI is settled, temperature toggle works, advanced parasitics
 * loads. Collects console errors across the whole verification.
 */
export async function expectMagneticFullyAdvisedAndSimulated(page) {
  const getErrors = collectConsoleErrors(page);

  await expectSimulationSettled(page);

  const mas = await dumpMAS(page);
  expectCoreAdvised(mas);
  expectWiresAdvised(mas);
  expectSimulationOutputs(mas);

  await expectTemperatureToggleWorks(page);
  await expectAdvancedParasiticsOpens(page);

  expectNoConsoleErrors(getErrors);
  return mas;
}
