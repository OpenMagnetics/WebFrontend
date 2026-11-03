/**
 * tests/storyline-errors.spec.js
 *
 * The Continue button turns into "Fix Errors" when a step is incomplete, but it
 * used to be the only signal — the reasons were either never computed
 * (DesignRequirements emitted a bare boolean) or computed and dropped on the
 * floor (OperatingPoints built `errorMessages` that nothing rendered). Users
 * were left hunting for the offending field.
 *
 * These lock down that the reasons reach the user (as ERROR records of the
 * "Design step" module in the Engine log, opened from the footer) and name
 * something the user can act on.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';
import { withPinia, engineLogMessages } from './utils/index.js';

const panelItems = (page) => page.locator('[data-cy="EngineLogPanel-record"]').filter({ hasText: 'Design step' });

// The reasons are records in the Engine log, opened from its footer button.
async function openErrorDetails(page) {
  const toggle = page.locator('[data-cy="EngineLogPanel-toggle"]');
  await toggle.waitFor({ state: 'visible', timeout: 20000 });
  await toggle.click();
  await panelItems(page).first().waitFor({ state: 'visible', timeout: 20000 });
}

async function openMagneticTool(page) {
  await page.goto(`${BASE_URL}/magnetic_tool`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.dr-container', { timeout: 120000 });
}

test('Design Requirements names each blocking requirement @layout', async ({ page }) => {
  await openMagneticTool(page);

  await withPinia(page, (pinia) => {
    const mas = pinia._s.get('mas').mas;
    mas.inputs.designRequirements.name = '';
    mas.magnetic.coil.functionalDescription = [
      { name: 'Primary', isolationSide: 'primary' },
      { name: 'Secondary 0', isolationSide: 'secondary' },
    ];
    mas.inputs.designRequirements.turnsRatios = [{ minimum: null, nominal: null, maximum: null }];
    return true;
  });

  await openErrorDetails(page);
  await expect(panelItems(page)).toHaveCount(2, { timeout: 20000 });
  const items = (await panelItems(page).allTextContents()).map(t => t.trim());

  expect(items.some(t => /has no name/i.test(t)), `items: ${JSON.stringify(items)}`).toBe(true);
  // The reason must point at the winding row the user can actually see.
  expect(items.some(t => /Turns ratio for Secondary 0/i.test(t)), `items: ${JSON.stringify(items)}`).toBe(true);

  // Panel and button agree.
  await expect(page.locator('[data-cy="magnetic-synthesis-next-tool-button"]').first()).toHaveText(/Fix Errors/i);
});

test('Operating Points reasons reach the Engine log @layout', async ({ page }) => {
  await openMagneticTool(page);

  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('[data-cy^="storyline-"]'))
      .find(el => /op/i.test(el.textContent));
    if (!button) throw new Error('storyline Op. Points button not found');
    button.click();
  });

  await openErrorDetails(page);
  const items = (await panelItems(page).allTextContents()).map(t => t.trim());
  // OperatingPoints already built this text; it just never had anywhere to go.
  expect(items.some(t => /winding/i.test(t) && /operating point/i.test(t)),
         `items: ${JSON.stringify(items)}`).toBe(true);
});

test('the reasons leave the Engine log once the step is valid @layout', async ({ page }) => {
  await openMagneticTool(page);

  await withPinia(page, (pinia) => {
    const mas = pinia._s.get('mas').mas;
    mas.inputs.designRequirements.name = 'A named design';
    mas.inputs.designRequirements.magnetizingInductance = { nominal: 100e-6 };
    mas.inputs.designRequirements.turnsRatios = [];
    return true;
  });

  await expect.poll(() => withPinia(page, (pinia) =>
    pinia._s.get('engineDiagnostics').records.filter((r) => r.module === 'Design step').length),
  { timeout: 20000 }).toBe(0);
});

// User report 2026-11-03: the Summary step always said "1 thing to fix before continuing / This
// step is not complete yet". Steps start as not complete and the Summary never reported, so the
// last page of every finished design claimed something was wrong without saying what.
const SUMMARY_FIXTURE = new URL('./fixtures/etd49_wound_10uH_5T.json', import.meta.url).pathname;

async function openSummary(page) {
  await withPinia(page, (pinia) => {
    pinia._s.get('state').getCurrentToolState().subsection = 'magneticSummary';
    return true;
  });
}

test('SUMMARY-STEP-1: a finished design reaches the Summary with nothing to fix @layout', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(SUMMARY_FIXTURE);
  await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
  await expect.poll(() => withPinia(page, (pinia) => pinia._s.get('mas').mas.outputs.length),
    { message: 'the builder simulates the loaded design', timeout: 90000 }).toBeGreaterThan(0);

  await openSummary(page);
  await expect.poll(() => withPinia(page, (pinia) => pinia._s.get('state').getCurrentToolState().canContinue.magneticSummary),
    { message: 'the Summary step reports that it is complete', timeout: 30000 }).toBe(true);
  expect(await engineLogMessages(page, { source: 'Design step' })).toEqual([]);
});

test('SUMMARY-STEP-2: the Summary of an unfinished design says what is missing @layout', async ({ page }) => {
  await openMagneticTool(page);
  await withPinia(page, (pinia) => {
    pinia._s.get('mas').mas.outputs = [];
    return true;
  });
  await openSummary(page);

  await expect.poll(() => engineLogMessages(page, { source: 'Design step' }), { timeout: 30000 })
    .toContainEqual(expect.stringMatching(/^Summary: The summary needs computed outputs/));
  const messages = await engineLogMessages(page, { source: 'Design step' });
  expect(messages.some((m) => /did not say what is missing|not complete yet/i.test(m)), JSON.stringify(messages)).toBe(false);
});
