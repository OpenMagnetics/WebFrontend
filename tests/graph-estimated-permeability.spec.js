/**
 * ABT #1861 (Alf, 2026-10-14): MKF always extrapolates a ferrite's complex permeability outside its
 * measured span, and the impedance sweeps say where. The builder draws those stretches dashed and
 * says, under the chart, which material and which measured span the estimate comes from.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

const FIXTURE = new URL('./fixtures/04_forward_xfmr_e3216_n87.json', import.meta.url).pathname;

// The options of the chart the impedance / Q-factor graph draws.
const chartSeries = (page) => page.evaluate(() => {
  const chartElement = document.querySelector('[data-cy$="-Graph-DataLimits"]').parentElement.querySelector('.chart');
  let chart = chartElement.__vueParentComponent;
  while (chart && chart.proxy.$refs?.vchart == null) chart = chart.parent;
  chart = { proxy: chart.proxy.$refs.vchart };
  return chart.proxy.getOption().series.map((series) => ({
    name: series.name,
    dashed: series.lineStyle?.type == 'dashed',
    drawn: series.data.filter((point) => point[1] !== '-').length,
  }));
});

test.describe('Impedance graphs mark estimated complex permeability (ABT #1861)', () => {
  test.describe.configure({ timeout: 240000 });

  for (const [graph, label] of [['impedanceOverFrequency', 'Impedance'], ['qFactorOverFrequency', 'Q Factor']]) {
    test(`GRAPH-ESTIMATED ${graph}: the stretch beyond N87's measured span is dashed and explained`, async ({ page }) => {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
      await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
      await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
      await page.evaluate((graph) => {
        const app = document.querySelector('#app').__vue_app__.config.globalProperties;
        app.$stateStore.setCurrentToolSubsection('magneticBuilder');
        app.$pinia._s.get('magneticBuilderSettings').enableGraphs = true;
        // The graph's default span runs past N87's measured complex permeability (12.6 kHz to 4.47 MHz).
        app.$stateStore.graphParameters.graph = graph;
      }, graph);

      const notes = page.locator('[data-cy$="-Graph-DataLimits"]');
      await expect(notes).toContainText('Dashed, ', { timeout: 120000 });
      await expect(notes).toContainText("N87's");
      await expect(notes).toContainText('is measured from');

      const series = await chartSeries(page);
      const solid = series.filter((each) => each.name == label && !each.dashed);
      const dashed = series.filter((each) => each.name == `${label} (estimated permeability)` && each.dashed);
      expect(solid.length).toBe(1);
      expect(dashed.length).toBe(1);
      expect(solid[0].drawn).toBeGreaterThan(0);
      expect(dashed[0].drawn).toBeGreaterThan(1);
    });
  }
});
