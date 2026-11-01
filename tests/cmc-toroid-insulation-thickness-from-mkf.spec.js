/**
 * The coil panel reads the insulation thicknesses of a stored coil back from MKF
 * (get_insulation_section_thickness / get_insulation_layer_thickness), not from the section's
 * dimensions.
 *
 * Before: on a toroid the panel took the intersection thickness as
 * `dimensions[0] * Math.sin(dimensions[1])` (a radial height times the sine of an angle in
 * degrees): for the T 25/15 common-mode choke below, 1.4 mm instead of the 25 µm the adviser
 * proposed, so the next wind asked the winder for a coil it refused.
 *
 * The engine calls are stubbed (tests/utils/engineStub.js) until the libMKF that exports them is
 * in; the task queue handles the replies for real. The fixture is not changed.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL, engineLogRecords, stubEngineCalls, stubbedEngineCalls } from './utils/index.js';
import { numberInput } from './utils/builder-helpers.js';
import { installActivityProbe, activityMark, waitForIdle, waitForActionSince } from './utils/activity.js';

const FIXTURE = new URL('./fixtures/toroidal_cmc_t2515.json', import.meta.url).pathname;
const THICKNESS = 2.5e-05;

async function loadToroidCmc(page) {
  const alerts = [];
  page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
  await installActivityProbe(page);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__ != null);
  const beforeLoad = await activityMark(page);
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
  await Promise.race([
    page.waitForURL('**/magnetic_tool**', { timeout: 120000 }),
    page.waitForEvent('dialog', { timeout: 120000 }),
  ]);
  expect(alerts, 'the load is not refused').toEqual([]);
  await expect(page.locator('[data-cy$="-NumberTurns-container"]').first()).toBeVisible({ timeout: 60000 });
  await waitForIdle(page, { since: beforeLoad, quietMs: 3000, timeout: 180000, label: 'the loaded toroid CMC' });
}

test('TOROID-INSUL-1: the wind of a toroid CMC carries the insulation thickness MKF reads from the coil', async ({ page }) => {
  test.setTimeout(300000);
  await stubEngineCalls(page, {
    get_insulation_section_thickness: String(THICKNESS),
    get_insulation_layer_thickness: String(THICKNESS),
  });
  await loadToroidCmc(page);

  await test.step('the panel asks MKF for the thickness of each insulation section of the stored coil', async () => {
    const sectionReads = (await stubbedEngineCalls(page)).filter((call) => call.method === 'get_insulation_section_thickness');
    const asked = [...new Set(sectionReads.map((call) => call.args[1]))].sort();
    expect(asked).toEqual([
      'Insulation between Winding 1 and Winding 2 section 1',
      'Insulation between Winding 2 and Winding 1 section 3',
    ]);
    // The coil handed over is the stored one, as MAS JSON.
    expect(JSON.parse(sectionReads[0].args[0]).sectionsDescription.length).toBe(4);
  });

  await test.step('a wind after an edit sends that thickness to the winder', async () => {
    await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      window.__windIntersectionThickness = [];
      pinia._s.get('magneticBuilderTaskQueue').$onAction(({ name, args }) => {
        if (name === 'wind') window.__windIntersectionThickness.push(args[0]._intersectionInsulationThickness);
      });
    });
    const beforeEdit = await activityMark(page);
    const turnsInput = numberInput(page.locator('[data-cy$="-NumberTurns-container"]').first());
    await turnsInput.click({ clickCount: 3 });
    await turnsInput.fill('29');
    await turnsInput.press('Tab');
    await waitForActionSince(page, beforeEdit, 'magneticBuilderTaskQueue.wind', { timeout: 60000 });
    const sent = await page.evaluate(() => window.__windIntersectionThickness);
    expect(sent.length).toBeGreaterThan(0);
    expect(sent.every((thickness) => thickness === THICKNESS), `intersection thickness sent to the winder: ${sent}`).toBe(true);
  });
});

test('TOROID-INSUL-2: an engine that cannot read the thickness is reported in the Engine log', async ({ page }) => {
  test.setTimeout(300000);
  const reply = "Exception: insulation section 'Insulation between Winding 1 and Winding 2 section 1' has no thickness in MAS";
  await stubEngineCalls(page, {
    get_insulation_section_thickness: reply,
    get_insulation_layer_thickness: reply,
  });
  await loadToroidCmc(page);

  await expect.poll(async () => (await engineLogRecords(page, { source: 'Winding', level: 'ERROR' }))
    .filter((record) => record.message.includes('has no thickness in MAS')).length, { timeout: 15000 })
    .toBeGreaterThan(0);
});
