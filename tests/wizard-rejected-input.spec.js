/**
 * User report #188 (Vienna): "When I type 115 Nominal AC input and 350V DC output I am
 * getting: DC Bus voltage (350 V) must exceed sqrt(2)*V_LL (566 V)". The line-to-line
 * field rejected 115 (below its 360 V minimum) without writing it, so the wizard kept
 * using 400 V and complained about the wrong thing. A rejected input now names its own
 * problem in the wizard's error and blocks the actions until it is fixed; fixing it
 * writes the value the field shows.
 */
import { test, expect } from './_coverage.js';
import { openWizard } from './utils.js';

async function typeInto(page, selector, value) {
  const input = page.locator(selector).first();
  await expect(input).toBeVisible({ timeout: 20000 });
  await input.focus();
  await input.press('Control+a');
  await input.pressSequentially(String(value));
  await input.press('Enter');
}

function viennaData(page) {
  return page.evaluate(() => {
    const wizard = window.__omFindComponent?.('ViennaWizard');
    if (wizard == null) throw new Error('ViennaWizard component not found');
    return { vll: { ...wizard.localData.lineToLineVoltage }, vdc: wizard.localData.outputDcVoltage };
  });
}

test('WIZIN-1: a rejected line-to-line voltage is reported as such and blocks the wizard', async ({ page }) => {
  test.setTimeout(120000);
  await openWizard(page, 'Vienna-link');
  const error = page.locator('[data-cy="ConverterWizard-error-message"]');
  const analytical = page.locator('button.sim-btn.analytical').first();

  await typeInto(page, '[data-cy$="ViennaWizard-LineToLineVoltage-nominal-number-input"] input', 115);
  await typeInto(page, '[data-cy$="ViennaWizard-OutputDcVoltage-number-input"] input', 350);

  await expect(error).toContainText('Nominal value must be greater than minimum value');
  await expect(error).not.toContainText('566');
  await expect(analytical).toBeDisabled();

  // Lower the bounds: the field is valid again and the wizard uses the 115 V it shows.
  await typeInto(page, '[data-cy$="ViennaWizard-LineToLineVoltage-minimum-number-input"] input', 100);
  await typeInto(page, '[data-cy$="ViennaWizard-LineToLineVoltage-maximum-number-input"] input', 130);
  await expect(error).toHaveCount(0);
  await expect(analytical).toBeEnabled();
  const data = await viennaData(page);
  expect(data.vll.nominal).toBeCloseTo(115, 6);
  expect(data.vll.minimum).toBeCloseTo(100, 6);
  expect(data.vll.maximum).toBeCloseTo(130, 6);
  expect(data.vdc).toBeCloseTo(350, 6);
});
