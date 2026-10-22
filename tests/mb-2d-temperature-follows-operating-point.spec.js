/**
 * Alf, 2026-10-23: "changing an operating point in MB does not update the 2D temperature plot,
 * if the temperature is shown".
 *
 * The 2D visualizer only re-plots when its change key moves: the inputs, the magnetic, the plot
 * mode or forceUpdate. Selecting another operating point changes none of them (the index is a
 * separate prop), so the operatingPointIndex watcher called handleModelChange and it returned
 * early: the drawing on screen stayed the one of the previous operating point. Every mode that
 * depends on the operating point (temperature, magnetic/electric field, wire losses) was hit.
 *
 * The design is the stored PQ 35/40 transformer with its second operating point replaced by a
 * copy of the first at a different ambient temperature, so both points draw a valid temperature
 * field and the two drawings must differ.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/index.js';
import { installActivityProbe, activityMark, waitForIdle, waitForActionSince } from './utils/activity.js';

const SOURCE = new URL('./fixtures/pq3540_stacked_1212121_stored_layout.json', import.meta.url).pathname;
const PLOT = '[data-cy="MagneticAdvise-core-field-plot-image"]';

// What every 2D view on screen shows, in DOM order: the temperatures on its colour bar, or null
// when it holds no temperature field (the basic drawing it replaces carries no text at all).
// The bar labels are the comparison, not the svg markup: MKF names its fill classes at random on
// every paint, so two drawings of the same operating point never match byte for byte.
const plotted = (page) => page.locator(PLOT).evaluateAll((views) => views.map((view) => {
  const svg = view.querySelector('svg');
  if (svg == null) return null;
  const labels = [...svg.querySelectorAll('text')].map((text) => text.textContent.trim())
    .filter((label) => label.endsWith('°C'));
  return labels.length > 0 ? labels.join(' | ') : null;
}));
const isTemperatureField = (labels) => labels != null;

test('MB-2D-OP-1: the 2D temperature plot is redrawn when another operating point is selected', async ({ page }, testInfo) => {
  test.setTimeout(300000);

  const mas = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  expect(mas.inputs.operatingPoints.length, 'the source design has two operating points').toBe(2);
  const second = structuredClone(mas.inputs.operatingPoints[0]);
  second.name = 'Cold point';
  expect(second.conditions.ambientTemperature).toBe(100);
  second.conditions.ambientTemperature = 25;
  mas.inputs.operatingPoints[1] = second;
  const fixture = testInfo.outputPath('two_operating_points.json');
  fs.writeFileSync(fixture, JSON.stringify(mas));

  const alerts = [];
  page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
  await installActivityProbe(page);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__ != null);
  const beforeLoad = await activityMark(page);
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(fixture);
  await Promise.race([
    page.waitForURL('**/magnetic_tool**', { timeout: 120000 }),
    page.waitForEvent('dialog', { timeout: 120000 }),
  ]);
  expect(alerts, 'the load is not refused').toEqual([]);
  await waitForActionSince(page, beforeLoad, 'magneticBuilderTaskQueue.simulate', { timeout: 120000 });
  await waitForIdle(page, { since: beforeLoad, quietMs: 3000, timeout: 180000, label: 'the loaded design' });

  const toggle = page.locator('[data-cy$="-Coil-ToggleTemperaturePlot-button"]').first();
  await expect(toggle).toBeVisible({ timeout: 60000 });
  await toggle.click();
  await expect(toggle).toContainText('Hide Temperature');

  const stateIndex = () => page.evaluate(() =>
    document.querySelector('#app').__vue_app__.config.globalProperties.$stateStore.currentOperatingPoint);
  expect(await stateIndex()).toBe(0);

  // The first temperature drawing is on screen in every 2D view.
  await expect.poll(async () => {
    const now = await plotted(page);
    return now.length > 0 && now.every(isTemperatureField);
  }, { timeout: 120000, message: 'the 2D views did not draw the temperature field' }).toBe(true);
  await waitForIdle(page, { quietMs: 3000, timeout: 180000, label: 'the first temperature plot' });
  const first = await plotted(page);
  expect(first.every(isTemperatureField)).toBe(true);
  // The colour bar starts at the ambient temperature of the operating point drawn.
  const startsAt = (labels, ambient) => labels.split(' | ').includes(`${ambient}°C`);
  for (const labels of first) expect(startsAt(labels, 100), `drawn for the 100 °C point: ${labels}`).toBe(true);

  await page.locator('[data-cy$="-OperatingPointSelector-select"]').first().click();
  await page.locator('[role="option"]', { hasText: 'Cold point' }).click();
  expect(await stateIndex(), 'the selector moved the operating point').toBe(1);

  await waitForIdle(page, { quietMs: 3000, timeout: 180000, label: 'the plot of the second operating point' });
  await expect.poll(async () => {
    const now = await plotted(page);
    return now.length === first.length && now.every((labels, i) => isTemperatureField(labels) && labels !== first[i]);
  }, { timeout: 60000, message: 'a 2D temperature view still shows the first operating point' }).toBe(true);
  for (const labels of await plotted(page)) expect(startsAt(labels, 25), `drawn for the 25 °C point: ${labels}`).toBe(true);

  // And back: the drawing of the first operating point returns.
  await page.locator('[data-cy$="-OperatingPointSelector-select"]').first().click();
  await page.locator('[role="option"]', { hasText: mas.inputs.operatingPoints[0].name }).click();
  expect(await stateIndex()).toBe(0);
  await waitForIdle(page, { quietMs: 3000, timeout: 180000, label: 'the plot of the first operating point again' });
  await expect.poll(async () => {
    const now = await plotted(page);
    return now.length === first.length && now.every((labels, i) => labels === first[i]);
  }, { timeout: 60000, message: 'returning to the first operating point did not redraw its temperature field' }).toBe(true);
});
