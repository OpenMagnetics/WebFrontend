/**
 * User report 2026-10-09 (EPC_6x3mm.json): "no puedo cargar este MAS en OM". The file's
 * outputs came from an older engine: zero core and winding losses for unexcited operating
 * points and gappingReluctance 0 on an ungapped core. They pass quicktype's type check but
 * break the MAS schema's exclusiveMinimum 0, so the import quarantine (type check only) kept
 * them and the MAS sentry refused the whole load:
 *   "/outputs/0/coreLosses/coreLosses must be > 0".
 * Outputs are recomputed live, so a document that is valid without them must load.
 *
 * MAS 2.5.0 (ABT #1725) made 0 a valid core and winding loss (an unexcited operating point has
 * none), so the reported outputs are now valid and kept (LOADMAS-OUT-2). The quarantine still
 * drops outputs that break the bounds, which a negative loss does (LOADMAS-OUT-1).
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

const FIXTURE = new URL('./fixtures/etd49_wound_10uH_5T.json', import.meta.url).pathname;

async function loadWithOutputs(page, outputs, name) {
  const mas = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  mas.outputs = outputs;
  const alerts = [];
  page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(mas)),
  });
  await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
  expect(alerts, 'the load is not refused').toEqual([]);
  return page.evaluate(() =>
    document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas.outputs);
}

test('LOADMAS-OUT-1: outputs that break the schema bounds are dropped on import, not refused', async ({ page }) => {
  test.setTimeout(180000);
  // Type-correct, bound-violating outputs: a loss below the schema's minimum of 0.
  const loadedOutputs = await loadWithOutputs(page, [{
    coreLosses: { coreLosses: -1, volumetricLosses: -1, methodUsed: 'Proprietary', origin: 'simulation', temperature: 100 },
    windingLosses: { windingLosses: -1, methodUsed: 'Default', origin: 'simulation', temperature: 100 },
  }], 'negative_losses_outputs.json');
  for (const output of loadedOutputs) {
    expect(output?.coreLosses?.coreLosses ?? 1, 'the negative-loss output is not kept').not.toBe(-1);
  }
});

test('LOADMAS-OUT-2: zero core and winding losses (an unexcited operating point) are valid and kept', async ({ page }) => {
  test.setTimeout(180000);
  // Exactly as the reported file carries them.
  const loadedOutputs = await loadWithOutputs(page, [{
    coreLosses: { coreLosses: 0, volumetricLosses: 0, methodUsed: 'Proprietary', origin: 'simulation', temperature: 100 },
    windingLosses: { windingLosses: 0, methodUsed: 'Default', origin: 'simulation', temperature: 100 },
  }], 'zero_losses_outputs.json');
  expect(loadedOutputs.length, 'the zero-loss output is kept').toBe(1);
  expect(loadedOutputs[0].coreLosses.coreLosses).toBe(0);
  expect(loadedOutputs[0].windingLosses.windingLosses).toBe(0);
});
