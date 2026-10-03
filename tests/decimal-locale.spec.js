/**
 * ABT #1513: number inputs must not read the decimal sign from the browser
 * locale. Under de-DE / es-ES the '.' is the grouping separator, so PrimeVue's
 * InputNumber turned '3.3' into 33 (a 3.3 kW field became 33 kW, silently).
 * Every Dimension input now shows '.' and accepts both '.' and ','.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

const FREQUENCY_INPUT = '[data-cy$="-SwitchingFrequency-number-input"] input';

async function typedFrequency(page, text) {
  await page.goto(`${BASE_URL}/insulation_adviser`, { waitUntil: 'domcontentloaded' });
  const input = page.locator(FREQUENCY_INPUT).first();
  await expect(input).toBeVisible({ timeout: 20000 });
  await input.focus();
  await input.press('Control+a');
  await input.press('Backspace');
  await input.pressSequentially(text);
  await input.press('Enter');
  await expect(input).toHaveValue('3.3');
  return page.evaluate(() => {
    const app = document.querySelector('#app').__vue_app__;
    const mas = app.config.globalProperties.$pinia._s.get('mas').mas;
    return mas.inputs.operatingPoints[0].excitationsPerWinding[0].frequency;
  });
}

for (const locale of ['de-DE', 'es-ES', 'en-US']) {
  test.describe(`Decimal input under ${locale}`, () => {
    test.use({ locale });

    for (const text of ['3.3', '3,3']) {
      test(`DEC-${locale}: typing ${text} kHz stores 3.3 kHz`, async ({ page }) => {
        const unit = await page.goto(`${BASE_URL}/insulation_adviser`, { waitUntil: 'domcontentloaded' })
          .then(() => page.locator('[data-cy$="-SwitchingFrequency-DimensionUnit-input"]').first().innerText({ timeout: 20000 }));
        expect(unit.trim(), 'the frequency field must be in kHz for this test').toBe('kHz');
        const frequency = await typedFrequency(page, text);
        expect(frequency).toBeCloseTo(3300, 6);
      });
    }
  });
}
