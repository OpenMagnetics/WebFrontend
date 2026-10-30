/**
 * tests/acf-user-design.spec.js
 *
 * A user's Active Clamp Forward, "I know the design I want", failed on openmagnetics.com with
 * "analytical_active_clamp_forward: T1 cannot be larger than period/2": the engine refused every
 * forward duty above 0.5, although the active clamp resets the core over the whole off-time
 * (fixed in Kirchhoff cc193c7, ABT #2131). The design: Vin 24-125 V, 13 V / 24 A, turns ratio 1,
 * duty 0.55, 140 kHz, 50 uH, diode drop 0.7 V, efficiency 92 %.
 *
 * The user typed the duty 0.55 in the Duty Cycle Nom. row but entered only Input Voltage Min. and
 * Max. Since ABT #2160 every entered input voltage is its own operating point and a typed duty
 * belongs to the input voltage of its row, so this duty belongs to no operating point. The wizard
 * must say so in plain words instead of applying it to some voltage or dropping it silently
 * (Alf, 2026-10-29: "Assert the error"). The working case lives in acf-input-voltage-points.spec.js.
 *
 * The design is typed into the wizard the way the user did, and the wizard's own state is then
 * checked against it, so a renamed or rescaled input fails here instead of silently testing
 * another design.
 */
import { test, expect } from './_coverage.js';
import { openWizard, switchToIKnowMode } from './utils/index.js';
import { collectConsoleErrors } from './utils/console.js';
import { expectNoConsoleErrors } from './utils/assertions.js';

const P = 'ActiveClampForwardWizard';

// Type into a PrimeVue InputNumber the way a user does (fill() is intercepted by InputNumber).
async function typeInto(page, cy, value, index = 0) {
  const input = page.locator(`[data-cy="${cy}"] input`).nth(index);
  await input.waitFor({ state: 'visible', timeout: 15000 });
  await input.click();
  await input.press('Control+a');
  await input.type(String(value), { delay: 30 });
  await input.press('Tab');
}

// The unit prefix a Dimension input shows (e.g. "kHz", "µH"), so the typed number means the value.
async function displayedScale(page, cy) {
  const unit = (await page.locator(`[data-cy="${cy}"]`).first().locator('xpath=..').innerText()).trim();
  return unit;
}

const readWizard = (page) => page.evaluate(() => {
  const wizard = window.__omFindComponent('ForwardWizard');
  if (!wizard) throw new Error('ForwardWizard component instance not found in the page');
  // buildParams must refuse this design; its message is what the test checks.
  let paramsError = null;
  try {
    wizard.buildParams('analytical');
  } catch (e) {
    paramsError = String(e.message);
  }
  return JSON.parse(JSON.stringify({
    converterName: wizard.converterName,
    localData: wizard.localData,
    paramsError,
    errorMessage: wizard.errorMessage,
  }));
});

test.describe("A user's Active Clamp Forward above 50 % duty", () => {
  test.setTimeout(240_000);

  test('a Duty Cycle Nom. without Input Voltage Nom. shows a clear error', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openWizard(page, 'ActiveClampForward-link');
    await switchToIKnowMode(page);

    await typeInto(page, `${P}-InputVoltage-minimum-number-input`, 24);
    await typeInto(page, `${P}-InputVoltage-maximum-number-input`, 125);
    await typeInto(page, `${P}-OutputsParameters voltage-number-input`, 13);
    await typeInto(page, `${P}-OutputsParameters current-number-input`, 24);
    await typeInto(page, `${P}-OutputsParameters turnsRatio-number-input`, 1);
    // The Duty Cycle starts empty (ABT #2160), so its Nom. row is added first, as a user does.
    await page.locator(`[data-cy="${P}-DutyCycle-nominal-add-button"]`).click();
    await typeInto(page, `${P}-DutyCycle-nominal-number-input`, 0.55);
    // Frequency and inductance are typed in the prefix the field shows; the state check below
    // proves the typed number landed as 140 kHz / 50 uH.
    const fUnit = await displayedScale(page, `${P}-SwitchingFrequency-number-input`);
    await typeInto(page, `${P}-SwitchingFrequency-number-input`, /k/.test(fUnit) ? 140 : 140000);
    const lUnit = await displayedScale(page, `${P}-Inductance-number-input`);
    await typeInto(page, `${P}-Inductance-number-input`, /µ|u/.test(lUnit) ? 50 : /m/.test(lUnit) ? 0.05 : 50e-6);
    await typeInto(page, `${P}-DiodeVoltageDrop-number-input`, 0.7);
    await typeInto(page, `${P}-Efficiency-number-input`, 92);

    const before = await readWizard(page);
    expect(before.converterName).toBe('Active Clamp Forward');
    const d = before.localData;
    expect(d.designLevel).toBe('I know the design I want');
    expect(d.inputVoltage.minimum).toBe(24);
    expect(d.inputVoltage.maximum).toBe(125);
    expect(d.outputsParameters.map((o) => [o.voltage, o.current, o.turnsRatio])).toEqual([[13, 24, 1]]);
    expect(d.dutyCycle.nominal).toBeCloseTo(0.55, 12);
    expect(d.switchingFrequency).toBeCloseTo(140000, 6);
    expect(d.inductance).toBeCloseTo(50e-6, 12);
    expect(d.diodeVoltageDrop).toBeCloseTo(0.7, 12);
    expect(d.efficiency).toBeCloseTo(0.92, 12);

    // The duty 0.55 sits in the Nom. row, and there is no Input Voltage Nom.: the wizard says so,
    // names the fields as the UI shows them, and refuses to build the engine request.
    const expected = 'The Duty Cycle Nom. has no Input Voltage Nom.: a duty cycle applies to the input voltage of '
      + 'the same row. Enter the Input Voltage Nom. or clear the Duty Cycle Nom. row.';
    expect(before.errorMessage).toBe(expected);
    expect(before.paramsError).toBe(expected);
    await expect(page.locator('[data-cy="ConverterWizard-error-message"]')).toContainText(expected);
    expectNoConsoleErrors(errors);
  });
});
