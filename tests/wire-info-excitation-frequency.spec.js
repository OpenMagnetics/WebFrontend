/**
 * ABT #2279: the engine's wire calls took a current's frequency from its waveform's time span. A
 * sampled waveform whose axis stops one step before the period end (128 samples ending at 127/128 T)
 * then read 201.6 kHz for 200 kHz, and Wire Info's skin depth and current density came out wrong.
 * The calls now take the excitation, and its frequency: the same current stored either way gives
 * the same figures. Without a current, Wire Info has no current-dependent figures to show (it
 * showed an AC factor of 1.0 and losses of 0, which read as results).
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/index.js';

const FIXTURE = new URL('./fixtures/04_forward_xfmr_e3216_n87.json', import.meta.url).pathname;

test('WIRE-INFO-FREQ: an open 128-sample current and the same current as closed knots give the same Wire Info', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__ != null);
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
  await page.waitForURL('**/magnetic_tool**', { timeout: 120000 });
  await expect(page.locator('.wireinfo-panel').first()).toBeVisible({ timeout: 60000 });

  const results = await page.evaluate(async () => {
    const stores = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s;
    const taskQueue = stores.get('magneticBuilderTaskQueue');
    const mas = JSON.parse(JSON.stringify(stores.get('mas').mas));
    const frequency = 200e3;
    const period = 1 / frequency;
    const triangle = (t) => { const x = (t / period) % 1; return x < 0.5 ? -1 + 4 * x : 3 - 4 * x; };
    const openTime = [...Array(128)].map((_, i) => i * period / 128);
    const currents = {
      closed: { waveform: { time: [0, period / 2, period], data: [-1, 1, -1] } },
      open: { waveform: { time: openTime, data: openTime.map(triangle) } },
      none: null,
    };
    const answers = {};
    for (const [name, current] of Object.entries(currents)) {
      const operatingPoint = JSON.parse(JSON.stringify(mas.inputs.operatingPoints[0]));
      operatingPoint.excitationsPerWinding[0].frequency = frequency;
      if (current == null) {
        delete operatingPoint.excitationsPerWinding[0].current;
      }
      else {
        operatingPoint.excitationsPerWinding[0].current = current;
      }
      answers[name] = await taskQueue.calculateWireData(JSON.parse(JSON.stringify(mas.magnetic.coil)), operatingPoint, 0);
    }
    return answers;
  });

  for (const field of ['effectiveSkinDepth', 'effectiveCurrentDensity', 'skinAcFactor', 'skinAcLossesPerMeter', 'dcLossesPerMeter', 'skinAcResistancePerMeter']) {
    expect(results.closed[field], `closed ${field}`).toBeGreaterThan(0);
    expect(Math.abs(results.open[field] - results.closed[field]) / results.closed[field], `open vs closed ${field}`).toBeLessThan(1e-9);
    expect(results.none[field], `no current: ${field} is not shown`).toBeNull();
  }
});
