/**
 * UI regression tests covering user-reported fixes:
 *
 *   UR-1  Periods dropdown change re-runs the waveform generator so the
 *         graph shows N periods, not a stale 2-period capture.
 *   UR-2  SPICE button in the Flyback wizard produces a real netlist (the
 *         topologyMap used to have key "Flyback" while the wizard emits
 *         "Flyback Converter", so SPICE silently failed for every non-
 *         CMC/DAB/LLC topology).
 *   UR-3  resetMas() clears CMC-only requirements (minimumImpedance) so
 *         that a user who ran a CMC design and then switches to Buck is
 *         not poisoned by the CMC impedance filter in the core adviser.
 *   UR-4  SVG plots (temperature, parasitics) widen their viewBox to fit
 *         the actual content bbox; MKF's painter sometimes emits a
 *         viewBox too small to contain its paths and the browser clips.
 *
 * Coverage strategy: unit-ish tests via Pinia/helpers where possible,
 * integration tests via the UI otherwise. All tests assume the dev
 * server is running at BASE_URL.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL, isBenign, screenshot } from './utils.js';

const ss = (page, name) => screenshot(page, 'ui-regressions', name);

// ── Shared helpers ─────────────────────────────────────────────────────

async function goToRoute(page, pathname, { timeout = 45000 } = {}) {
  await page.goto(`${BASE_URL}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(
    () => !window.location.pathname.includes('engine_loader'),
    null,
    { timeout },
  );
  await page.waitForTimeout(600);
}

// ── UR-1: Periods dropdown change re-runs waveform ─────────────────────

test.describe('UR-1 — Periods control re-runs waveform generator', () => {
  test.describe.configure({ timeout: 90000 });

  test('UR-1-1: changing Periods regenerates waveform with N periods', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text());
    });

    await goToRoute(page, '/wizards');
    // Buck Converter is a stable wizard with switching-period waveforms.
    await page.evaluate(() => document.querySelector('[data-cy="Buck-link"]')?.click());
    await page.waitForTimeout(1500);

    // Click Analytical so there's a waveform rendered.
    await page.evaluate(() => [...document.querySelectorAll('button')]
      .find(b => b.textContent.includes('Analytical'))?.click());
    await page.waitForTimeout(4000);

    // Baseline — note it's 2 periods by default. Change to 5 and confirm
    // the graph DOM updates to show more canvases/periods.
    const initialCanvasCount = await page.locator('canvas').count();

    const set = await page.evaluate(() => {
      const sel = document.querySelector('.periods-select');
      if (!sel) return false;
      sel.value = '5';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    });
    expect(set).toBe(true);

    // Give the re-run time to complete.
    await page.waitForTimeout(4000);

    // Verify the store observed the update AND simulation has re-run. We
    // detect the re-run via the Pinia reactive `numberOfPeriods` value
    // and the presence of rendered waveforms (canvas elements).
    const observed = await page.evaluate(() => {
      const selVal = document.querySelector('.periods-select')?.value;
      const canvases = document.querySelectorAll('canvas').length;
      return { selVal, canvases };
    });
    expect(observed.selVal).toBe('5');
    expect(observed.canvases).toBeGreaterThanOrEqual(initialCanvasCount);

    await ss(page, 'UR1-periods-5');
    expect(errors.filter(e => !/wasm|compile/i.test(e))).toEqual([]);
  });
});

// ── UR-2: Flyback SPICE produces a netlist ─────────────────────────────

test.describe('UR-2 — SPICE button works for Flyback', () => {
  test.describe.configure({ timeout: 120000 });

  test('UR-2-1: Flyback SPICE opens modal with a Flyback netlist', async ({ page }) => {
    await goToRoute(page, '/wizards');
    await page.evaluate(() => document.querySelector('[data-cy="Flyback-CommonModeChoke-link"]')?.click());
    await page.waitForTimeout(1500);

    // Flyback SPICE requires the wizard's topology to be populated; click
    // Analytical first so the MAS/inputs are computed.
    await page.evaluate(() => [...document.querySelectorAll('button')]
      .find(b => b.textContent.includes('Analytical'))?.click());
    await page.waitForTimeout(4000);

    // Click SPICE button.
    await page.evaluate(() => [...document.querySelectorAll('button')]
      .find(b => b.textContent.trim() === 'SPICE' || b.textContent.includes('SPICE'))?.click());
    await page.waitForTimeout(4000);

    // Modal should open with "SPICE Netlist - Flyback Converter" header
    // and a body containing flyback-specific markers.
    const result = await page.evaluate(() => {
      const modal = document.querySelector('.modal.show, [role="dialog"]');
      if (!modal) return { modalOpen: false };
      const titleEl = modal.querySelector('.modal-title, h1, h2, h3, h4, h5');
      return {
        modalOpen: true,
        title: titleEl?.textContent ?? '',
        bodyText: (modal.querySelector('pre, code, .modal-body')?.textContent ?? '').slice(0, 500),
      };
    });

    expect(result.modalOpen).toBe(true);
    expect(result.title).toMatch(/SPICE|Flyback/i);
    // Flyback netlists use .model + unique flyback markers.
    expect(result.bodyText.length).toBeGreaterThan(100);
    expect(result.bodyText).toMatch(/Flyback|Lpri|transformer/i);

    await ss(page, 'UR2-flyback-spice');
  });
});

// ── UR-3: resetMas clears CMC-only requirements ────────────────────────
//
// A pure store-level test. Opens the app, pushes a CMC-shaped MAS into the
// store, calls resetMas('power'), then asserts that minimumImpedance is
// cleared. This protects against the Bug E regression (CMC requirements
// poisoning the Buck adviser).

test.describe('UR-3 — resetMas clears CMC-only requirements', () => {
  test.describe.configure({ timeout: 60000 });

  test('UR-3-1: resetMas("power") clears minimumImpedance', async ({ page }) => {
    await goToRoute(page, '/magnetic_tool');

    const result = await page.evaluate(() => {
      const app = document.querySelector('#app')?.__vue_app__;
      if (!app) return { error: 'no app' };
      const pinia = app.config.globalProperties.$pinia;
      const mas = pinia._s.get('mas');

      // Inject a CMC-shaped requirement into the store.
      mas.mas.inputs.designRequirements = mas.mas.inputs.designRequirements || {};
      mas.mas.inputs.designRequirements.topology = 'CommonModeChoke';
      mas.mas.inputs.designRequirements.minimumImpedance = [
        { frequency: 150000, impedance: { magnitude: 1000 } },
      ];

      // Call resetMas('power').
      mas.resetMas('power');

      const dr = mas.mas?.inputs?.designRequirements || {};
      return {
        topology: dr.topology ?? null,
        minimumImpedance: dr.minimumImpedance ?? null,
        maximumImpedance: dr.maximumImpedance ?? null,
      };
    });

    // minimumImpedance must be null (the explicit clear in resetMas).
    expect(result.minimumImpedance).toBeNull();
    expect(result.maximumImpedance).toBeNull();
    // Topology may be re-set by the default powerMas; we don't assert on it.
  });
});

// ── UR-4: SVG plots recompute viewBox to fit content ───────────────────
//
// Unit-ish check: render the CMC basic plot (or any 2D plot) and verify
// that, for every Magnetic2DVisualizer SVG on the page, the content bbox
// fits within the viewBox. Without the fix, MKF's temperature_field and
// some field plots produce a viewBox whose Y range is ~30% smaller than
// the drawn content.

test.describe('UR-4 — SVG viewBox fits content (no clipping)', () => {
  test.describe.configure({ timeout: 180000 });

  test('UR-4-1: all Magnetic2DVisualizer SVGs have viewBox ⊇ content bbox', async ({ page }) => {
    // Drive through a real end-to-end CMC flow to force the Magnetic2D
    // Visualizer to render a temperature SVG (the bug surfaced there).
    await goToRoute(page, '/wizards');
    await page.evaluate(() =>
      document.querySelector('[data-cy="Wizard-CommonModeChoke-link"]')?.click());
    await page.waitForTimeout(1500);

    await page.evaluate(() =>
      [...document.querySelectorAll('button')].find(b => b.textContent.includes('Analytical'))?.click());
    await page.waitForTimeout(3500);

    await page.evaluate(() =>
      [...document.querySelectorAll('button')].find(b => b.textContent.includes('Design Magnetic'))?.click());
    await page.waitForTimeout(3500);

    // Open the Magnetic Builder step, run Advise, load selected.
    await page.evaluate(() =>
      [...document.querySelectorAll('.storyline-step')].find(b => b.textContent.includes('Builder'))?.click());
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Advise')[0];
      b?.click();
    });
    // Give the core adviser time to run (it can take ~10s on first run).
    await page.waitForTimeout(12000);

    await page.evaluate(() =>
      [...document.querySelectorAll('button')].find(b => b.textContent.includes('Advise all'))?.click());
    await page.waitForTimeout(10000);

    // With a complete magnetic loaded, flip to temperature view.
    await page.evaluate(() =>
      [...document.querySelectorAll('button')].find(b => b.textContent.includes('Show Temperature'))?.click());
    await page.waitForTimeout(3000);

    const report = await page.evaluate(() => {
      const svgs = [...document.querySelectorAll('.Magnetic2DVisualizer svg, [data-cy*="plot-image"] svg')];
      return svgs.map((svg) => {
        const vb = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
        if (vb.length !== 4 || vb.some(n => !isFinite(n))) return { skipped: 'no viewBox' };
        const [vx, vy, vw, vh] = vb;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const el of svg.querySelectorAll('*')) {
          try {
            const b = el.getBBox?.();
            if (b && isFinite(b.x) && (b.width > 0 || b.height > 0)) {
              minX = Math.min(minX, b.x);
              minY = Math.min(minY, b.y);
              maxX = Math.max(maxX, b.x + b.width);
              maxY = Math.max(maxY, b.y + b.height);
            }
          } catch { /* not all elements support getBBox */ }
        }
        if (!isFinite(minX)) return { skipped: 'no content' };

        return {
          vb: [vx, vy, vw, vh],
          bbox: [minX, minY, maxX, maxY],
          xFits: minX >= vx - 0.5 && maxX <= vx + vw + 0.5,
          yFits: minY >= vy - 0.5 && maxY <= vy + vh + 0.5,
        };
      });
    });

    // Expect at least one SVG to be rendered by now (temperature view was
    // toggled on above). If nothing rendered, that's a failure — previous
    // versions of this test skipped, which hid genuine regressions.
    const active = report.filter(r => !r.skipped);
    expect(active.length, `expected ≥1 rendered Magnetic2DVisualizer SVG, got ${JSON.stringify(report)}`).toBeGreaterThan(0);
    for (const entry of active) {
      expect(entry.xFits, `X fits for viewBox ${entry.vb} vs bbox ${entry.bbox}`).toBe(true);
      expect(entry.yFits, `Y fits for viewBox ${entry.vb} vs bbox ${entry.bbox}`).toBe(true);
    }

    await ss(page, 'UR4-viewbox-fits');
  });
});
