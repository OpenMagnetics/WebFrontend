/**
 * A number field that must hold a value used to turn into '0' the moment its
 * last digit was deleted, with the caret left of the 0: deleting '5' and typing
 * '2' gave '20'. The emptied field now stays empty while typing, and an empty
 * field left by blur shows the last committed value again (nothing is written).
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

const FREQUENCY_INPUT = '[data-cy$="-SwitchingFrequency-number-input"] input';

function storedFrequency(page) {
  return page.evaluate(() => {
    const app = document.querySelector('#app').__vue_app__;
    const mas = app.config.globalProperties.$pinia._s.get('mas').mas;
    return mas.inputs.operatingPoints[0].excitationsPerWinding[0].frequency;
  });
}

async function emptiedFrequencyInput(page) {
  await page.goto(`${BASE_URL}/insulation_adviser`, { waitUntil: 'domcontentloaded' });
  const input = page.locator(FREQUENCY_INPUT).first();
  await expect(input).toBeVisible({ timeout: 20000 });
  const unit = await page.locator('[data-cy$="-SwitchingFrequency-DimensionUnit-input"]').first().innerText();
  expect(unit.trim(), 'the frequency field must be in kHz for this test').toBe('kHz');
  const before = await input.inputValue();
  expect(before.length, 'the frequency field must start with a value').toBeGreaterThan(0);
  await input.focus();
  await input.press('End');
  for (let i = 0; i < before.length; i++) await input.press('Backspace');
  return { input, before };
}

test('EMPTY-1: deleting every digit leaves the field empty, and typing 2 gives 2', async ({ page }) => {
  const { input } = await emptiedFrequencyInput(page);
  await expect(input).toHaveValue('');
  await input.pressSequentially('2');
  await expect(input).toHaveValue('2');
  await input.press('Enter');
  await expect(input).toHaveValue('2');
  expect(await storedFrequency(page)).toBeCloseTo(2000, 6);
});

test('EMPTY-2: a field left empty shows its stored value again and stores nothing', async ({ page }) => {
  const storedBefore = await (async () => {
    await page.goto(`${BASE_URL}/insulation_adviser`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(FREQUENCY_INPUT).first()).toBeVisible({ timeout: 20000 });
    return storedFrequency(page);
  })();
  const { input, before } = await emptiedFrequencyInput(page);
  await expect(input).toHaveValue('');
  await input.blur();
  await expect(input).toHaveValue(before);
  expect(await storedFrequency(page)).toBe(storedBefore);
});
