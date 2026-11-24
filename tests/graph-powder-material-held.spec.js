/**
 * ABT #2542 (Alf, 2026-11-24): the impedance and Q-factor graphs failed with "Error calculating the impedance:
 * unreachable" for every powder material (X-SMC29, Somaloy, Kool Mµ, Edge, XFlux, Mix 26/40) once the graph's
 * span passed the top of the material's complex-permeability table. MKF has no estimate for powders and holds
 * each part at its last tabulated value (allowMaterialDataExtrapolation, on in the web); the WASM engine trapped
 * in that path instead (the refusal's catch handler compiled to 'unreachable').
 *
 * Design: 04_forward_xfmr_e3216_n87.json (the GRAPH-ESTIMATED design) with its core material set to Kool Mµ 26 (tabulated to 27.2 MHz), so the
 * default span (1 kHz to 100 MHz) goes past the table.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';
import { installActivityProbe } from './utils/activity.js';

const FIXTURE = new URL('./fixtures/e3216_kool_mu_26.json', import.meta.url).pathname;

const drawnPoints = (page) => page.evaluate(() => {
  const chartElement = document.querySelector('[data-cy$="-Graph-DataLimits"]')?.closest('.graph-data-limits')?.parentElement?.querySelector('.chart');
  if (chartElement == null) return null;
  let chart = chartElement.__vueParentComponent;
  while (chart && chart.proxy.$refs?.vchart == null) chart = chart.parent;
  if (chart == null) return null;
  return chart.proxy.$refs.vchart.getOption().series
    .reduce((count, series) => count + series.data.filter((point) => point[1] !== '-').length, 0);
});

test.describe('A powder material past its complex-permeability table (ABT #2542)', () => {
  test.describe.configure({ timeout: 240000 });

  for (const graph of ['impedanceOverFrequency', 'qFactorOverFrequency']) {
    test(`GRAPH-POWDER-1 ${graph}: Kool Mµ 26 draws over the default span, held past its table`, async ({ page }) => {
      await installActivityProbe(page);
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
      const alerts = [];
      page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
      await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
      await Promise.race([
        page.waitForURL('**/magnetic_tool**', { timeout: 60000 }),
        page.waitForEvent('dialog', { timeout: 60000 }),
      ]);
      expect(alerts, 'the load is not refused').toEqual([]);
      await page.evaluate((graph) => {
        const app = document.querySelector('#app').__vue_app__.config.globalProperties;
        app.$stateStore.setCurrentToolSubsection('magneticBuilder');
        app.$pinia._s.get('magneticBuilderSettings').enableGraphs = true;
        app.$stateStore.graphParameters.graph = graph;
      }, graph);

      // The data-limits pill says which stretch is held at the last tabulated value.
      const notes = page.locator('[data-cy$="-Graph-DataLimits"]');
      await expect(notes).toHaveAttribute('aria-label', /Kool Mµ 26/, { timeout: 120000 });
      await expect.poll(() => drawnPoints(page), { timeout: 60000 }).toBeGreaterThan(10);
      await expect(page.locator('[data-cy$="-Graph-ErrorMessage"]')).toHaveCount(0);
      await page.screenshot({ path: test.info().outputPath(`${graph}-kool-mu-26.png`) });
    });
  }
});
