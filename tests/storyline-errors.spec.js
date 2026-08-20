/**
 * tests/storyline-errors.spec.js
 *
 * The Continue button turns into "Fix Errors" when a step is incomplete, but it
 * used to be the only signal — the reasons were either never computed
 * (DesignRequirements emitted a bare boolean) or computed and dropped on the
 * floor (OperatingPoints built `errorMessages` that nothing rendered). Users
 * were left hunting for the offending field.
 *
 * These lock down that the reasons reach the sidebar panel and name something
 * the user can act on.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';
import { withPinia } from './utils/index.js';

const panelItems = (page) => page.locator('[data-cy$="-StorylineErrors-list"] li');

// The sidebar card is only a summary; the readable list lives in the dialog.
async function openErrorDetails(page) {
  const card = page.locator('[data-cy$="-StorylineErrors-open"]').first();
  await card.waitFor({ state: 'visible', timeout: 20000 });
  await card.click();
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

test('Operating Points reasons reach the panel @layout', async ({ page }) => {
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

test('the panel is hidden once the step is valid @layout', async ({ page }) => {
  await openMagneticTool(page);

  await withPinia(page, (pinia) => {
    const mas = pinia._s.get('mas').mas;
    mas.inputs.designRequirements.name = 'A named design';
    mas.inputs.designRequirements.magnetizingInductance = { nominal: 100e-6 };
    mas.inputs.designRequirements.turnsRatios = [];
    return true;
  });

  await expect(page.locator('[data-cy$="-StorylineErrors-panel"]')).toHaveCount(0, { timeout: 20000 });
});
