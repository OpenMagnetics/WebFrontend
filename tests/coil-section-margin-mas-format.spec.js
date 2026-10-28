/**
 * The coil panel writes each conduction section's margin back into the design. It used to write
 * an object holding only the two widths, { topOrLeftWidth, bottomOrRightWidth }, onto a section
 * that had no margin: the MAS format's object form (marginInfo) also requires numberLayers and
 * layerThickness, so the builder's own design stopped following the MAS format, every simulation
 * of it was refused, and the engine failed reading the margin ("key 'layerThickness' not found").
 * On a margin stored in the array form [top, bottom] it set those two widths as properties of the
 * array, so the array never changed and a margin the user edited was lost when the design was saved.
 *
 * Now the panel writes the margin in the form it already has, and a section without one gets the
 * array form. (The array case is not guarded here: a margin edit winds the coil, and the wound
 * sections the engine returns replace the panel's copy, so the lost edit does not show after a wind.)
 */
import { test, expect } from './_coverage.js';
import { BASE_URL, engineLogRecords } from './utils/index.js';
import { installActivityProbe, activityMark, waitForIdle, waitForActionSince } from './utils/activity.js';

// MKF's test data test_mas_autocomplete_json_2_548.json: a planar ELP 38/8/25 transformer whose
// 31 sections carry no margin.
const PLANAR_WITHOUT_MARGINS = new URL('./fixtures/planar_elp38_sections_without_margin.json', import.meta.url).pathname;

// The conduction sections' margins in the builder's design, with what JSON (the saved file) keeps
// of them and the properties an array margin carries beyond its elements.
const conductionMargins = (page) => page.evaluate(() => {
  const mas = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas;
  return mas.magnetic.coil.sectionsDescription
    .filter((section) => section.type === 'conduction')
    .map((section) => ({
      name: section.name,
      isArray: Array.isArray(section.margin),
      saved: section.margin === undefined ? null : JSON.parse(JSON.stringify(section.margin)),
      arrayProperties: Array.isArray(section.margin)
        ? Object.keys(section.margin).filter((key) => !/^\d+$/.test(key)) : [],
    }));
});

// A margin the MAS format accepts: none, the array [top, bottom], or a complete marginInfo object.
function marginProblem({ saved, isArray, arrayProperties }) {
  if (saved == null) return null;
  if (isArray) {
    if (saved.length !== 2 || !saved.every((v) => typeof v === 'number')) return `array ${JSON.stringify(saved)}`;
    if (arrayProperties.length > 0) return `array carrying properties ${arrayProperties.join(', ')}`;
    return null;
  }
  const missing = ['topOrLeftWidth', 'bottomOrRightWidth', 'numberLayers', 'layerThickness'].filter((key) => saved[key] == null);
  return missing.length > 0 ? `object without ${missing.join(', ')}` : null;
}

async function loadDesign(page, fixture) {
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
}

const marginRecords = async (page) => (await engineLogRecords(page))
  .filter((r) => /MAS format|margin|layerThickness/i.test(`${r.message} ${r.detail ?? ''}`));

test('COIL-MARGIN-1: sections loaded without a margin get one in the MAS format, and the design simulates', async ({ page }) => {
  test.setTimeout(360000);
  await loadDesign(page, PLANAR_WITHOUT_MARGINS);

  const margins = await conductionMargins(page);
  expect(margins.length, 'conduction sections in the builder').toBeGreaterThan(0);
  expect(margins.map((m) => [m.name, marginProblem(m)]).filter(([, problem]) => problem != null),
    'margins the MAS format refuses').toEqual([]);
  expect(await marginRecords(page), 'Engine log records about the margin or the MAS format').toEqual([]);
});
