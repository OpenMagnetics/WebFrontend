/**
 * The app's default excitation carried a primary voltage of -20.5 / +70.5 V switching at half
 * the period (25 V of net volt-seconds), and the ABT #1670 reflect bug wrote 0 / -100 V into
 * secondaries. Since ABT #1585 the engine refuses to integrate unbalanced voltages, so every saved
 * transformer still carrying them stopped loading ("not volt-second balanced", 2026-10-10).
 * The import migrates exactly those two waveforms and the design loads.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

const LEGACY_TWO_WINDING = new URL('./fixtures/default_two_winding_pq2715.json', import.meta.url).pathname;

test('LOADMAS-LEGACYV-1: a transformer saved with the old default voltages loads, with balanced voltages', async ({ page }) => {
  test.setTimeout(180000);
  const alerts = [];
  const warnings = [];
  page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
  page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()); });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(LEGACY_TWO_WINDING);
  await page.waitForURL('**/magnetic_tool**', { timeout: 90000 });
  expect(alerts, 'the load is not refused').toEqual([]);

  const loaded = await page.evaluate(() => {
    const mas = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas;
    const [primary, secondary] = mas.inputs.operatingPoints[0].excitationsPerWinding;
    return { primary: primary.voltage.waveform.data, secondary: secondary.voltage.waveform.data,
             turnsRatio: mas.inputs.designRequirements.turnsRatios[0].nominal };
  });
  expect(Math.max(...loaded.primary)).toBeCloseTo(50, 9);
  expect(Math.min(...loaded.primary)).toBeCloseTo(-50, 9);
  expect(Math.max(...loaded.secondary)).toBeCloseTo(50 / loaded.turnsRatio, 9);
  expect(Math.min(...loaded.secondary)).toBeCloseTo(-50 / loaded.turnsRatio, 9);
  expect(warnings.some((text) => text.includes('old default voltage')), 'the primary migration is reported').toBe(true);
  expect(warnings.some((text) => text.includes('older versions wrote when reflecting a winding')), 'the secondary migration is reported').toBe(true);
});
