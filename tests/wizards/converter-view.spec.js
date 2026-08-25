/**
 * tests/wizards/converter-view.spec.js
 *
 * Regression guard for the magnetic <-> converter waveform toggle (ABT #905).
 *
 * kirchhoffRuntime's `simulate_<topo>_ideal_waveforms` returns `converterWaveforms: []` on purpose —
 * the per-component overlays need a SECOND full ngspice run (`component_waveforms`), which would
 * double every Simulated click. It hands back the assembled TAS as `__converterTas` instead, and the
 * converter view fetches the overlays on demand.
 *
 * That lazy fetch was never implemented, so `converterWaveforms` was permanently empty — and the
 * visualizer gated its toggle on `converterWaveforms.length > 0`, which meant the Converter view was
 * unreachable for EVERY wizard, not just this one. This pins the whole path: toggle renders, click
 * fetches, real traces arrive, no console errors.
 */
import { test, expect } from '../_coverage.js';
import { openWizard, runSimulated } from '../utils/index.js';
import { collectConsoleErrors } from '../utils/console.js';

/** Read the base component's converter-view state. */
const readBase = (page) => page.evaluate(() => {
  let node = document.querySelector('[data-cy="FlybackWizard-OutputsParameters voltage-number-input"]');
  while (node && !node.__vueParentComponent) node = node.parentElement;
  let component = node?.__vueParentComponent;
  while (component && (component.type?.__name || component.type?.name) !== 'FlybackWizard') {
    component = component.parent;
  }
  if (!component) throw new Error('FlybackWizard component instance not found in the page');
  const base = component.proxy.$refs.base;
  const traces = base.effectiveConverterWaveforms?.[0]?.waveforms ?? [];
  return JSON.parse(JSON.stringify({
    viewMode: component.proxy.waveformViewMode,
    hasTas: !!base.converterTas,
    error: base.converterWaveformsError,
    labels: traces.map((t) => t.label),
    pointCounts: traces.map((t) => t.y?.length ?? 0),
  }));
});

test.describe('Converter waveform view @scenario', () => {
  test('the toggle renders after a simulation and lazily loads component overlays', async ({ page }) => {
    test.setTimeout(300_000);
    const consoleErrors = collectConsoleErrors(page);
    await openWizard(page, 'Flyback-link');
    await runSimulated(page, { timeoutMs: 180_000 });

    // The simulate path deliberately returns no converter traces; the toggle must still be offered
    // because a TAS came back with the result.
    const beforeClick = await readBase(page);
    expect(beforeClick.hasTas, 'simulation must carry __converterTas').toBe(true);

    const toggle = page.locator('.view-toggle button', { hasText: 'Converter' });
    await expect(toggle, 'the Converter toggle must render once a TAS is available').toBeVisible();

    await toggle.click();
    // The overlays come from a second ngspice run — wait for the in-panel progress state to clear.
    await page.waitForFunction(() => {
      const state = document.querySelector('.converter-state');
      return !state || !state.textContent.includes('Simulating');
    }, { timeout: 180_000 });

    const after = await readBase(page);
    expect(after.viewMode).toBe('converter');
    expect(after.error, 'component_waveforms must not error').toBeFalsy();
    expect(after.labels.length, 'expected per-component V/I traces').toBeGreaterThan(0);
    // The flyback deck's power components: the switch, the rectifier and the output cap.
    expect(after.labels.some((l) => /^Q1\b/.test(l)), `got: ${after.labels}`).toBe(true);
    expect(after.labels.some((l) => /^D1\b/.test(l)), `got: ${after.labels}`).toBe(true);
    expect(after.labels.some((l) => /^Cout\b/.test(l)), `got: ${after.labels}`).toBe(true);
    // Every trace must carry real samples, not an empty axis.
    expect(Math.min(...after.pointCounts)).toBeGreaterThan(1);

    expect(consoleErrors(), 'the converter view must not log console errors').toEqual([]);
  });
});
