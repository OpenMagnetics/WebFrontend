/**
 * Winding Studio used to store, on windows of contiguous sections, the top/bottom gaps of a drawn
 * rectangle as its margins, which MKF reads as left/right ones: the painter drew 11.89 mm of tape
 * beside a section in a 3.08 mm wide window, across the whole core (Alf, 2026-11-05, custom_magnetic
 * (47).json). Loading such a file drops the margins that cannot fit their window and says so in the
 * Engine log (Alf, 2026-11-06: "Flag and clear on load").
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';
import { engineLogMessages } from './utils/engineLog.js';

const STALE_MARGINS = new URL('./fixtures/e16_contiguous_stale_margins.json', import.meta.url).pathname;

test('LOADMAS-MARGINS-1: margins that cannot fit their window are removed on load, and the removal is reported', async ({ page }) => {
  test.setTimeout(180000);
  const alerts = [];
  page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(STALE_MARGINS);
  await page.waitForURL('**/magnetic_tool**', { timeout: 90000 });
  expect(alerts, 'the load is not refused').toEqual([]);

  await expect.poll(() => engineLogMessages(page, { source: 'Load', level: 'WARNING' }), { timeout: 30000 })
    .toEqual(expect.arrayContaining([
      expect.stringMatching(/section 'Primary section 0' carried margins of 0\.00 mm and 11\.89 mm left and right of its 2\.54 mm width, in a 3\.08 mm wide window of contiguous sections; margins that do not fit the window were removed/),
      expect.stringMatching(/section 'Secondary section 0' carried margins of 15\.29 mm and 0\.00 mm left and right/),
    ]));

  const coil = await page.evaluate(() =>
    document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas.magnetic.coil);
  const window0 = coil.bobbin.processedDescription.windingWindows[0];
  for (const section of coil.sectionsDescription.filter((s) => s.type === 'conduction')) {
    const [left, right] = section.margin ?? [0, 0];
    expect(left + section.dimensions[0] + right, `${section.name} fits its window with its margins`)
      .toBeLessThanOrEqual(window0.width * (1 + 1e-3));
  }
});
