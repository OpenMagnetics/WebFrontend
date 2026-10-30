/**
 * tests/acf-duty-pin.spec.js
 *
 * ABT #2160: a Duty Cycle typed in "I know the design I want" is the switch command at the input
 * voltage of its row, held by Kirchhoff (spec.config.forcedDutyCycle). The load is held too, so the
 * delivered output voltage is a result, and the diagnostics card shows it next to the one asked for.
 * A row without a duty keeps the duty the engine derives from the turns ratio.
 *
 * The customer's Active Clamp Forward (acf-user-design.spec.js) with its duty 0.55 typed in the
 * Min. row, which has an input voltage (24 V); the Max. row (125 V) stays empty.
 *
 * NEEDS the libKirchhoff that carries the duty pin (forcedDutyCycle). With an engine that ignores
 * the pin, the wizard shows "The engine did not apply the Duty Cycle Min. ..." and this test fails.
 */
import { test, expect } from './_coverage.js';
import { openWizard, runAnalytical, switchToIKnowMode } from './utils/index.js';
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

async function displayedScale(page, cy) {
  return (await page.locator(`[data-cy="${cy}"]`).first().locator('xpath=..').innerText()).trim();
}

// Every point's diagnostics as the diagnostics card received them.
const readPoints = (page) => page.evaluate(() => {
  const panel = window.__omFindComponent('KhDiagnosticsPanel');
  if (!panel) throw new Error('KhDiagnosticsPanel component instance not found in the page');
  const pts = panel.diagnostics?.inputVoltagePoints;
  if (!Array.isArray(pts)) throw new Error('the diagnostics carry no inputVoltagePoints');
  return pts.map((p) => ({
    name: p.name,
    inputVoltage: p.inputVoltage,
    dutyCycle: p.diagnostics?.dutyCycle ?? null,
    forcedDutyCycle: p.diagnostics?.forcedDutyCycle ?? null,
    outputs: p.diagnostics?.outputs ?? null,
  }));
});

test.describe('A typed Duty Cycle is held at the input voltage of its row', () => {
  test.setTimeout(240_000);

  test("the customer's Active Clamp Forward with Duty Cycle Min. 0.55 at 24 V", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openWizard(page, 'ActiveClampForward-link');
    await switchToIKnowMode(page);

    await typeInto(page, `${P}-InputVoltage-minimum-number-input`, 24);
    await typeInto(page, `${P}-InputVoltage-maximum-number-input`, 125);
    await typeInto(page, `${P}-OutputsParameters voltage-number-input`, 13);
    await typeInto(page, `${P}-OutputsParameters current-number-input`, 24);
    await typeInto(page, `${P}-OutputsParameters turnsRatio-number-input`, 1);
    await page.locator(`[data-cy="${P}-DutyCycle-minimum-add-button"]`).click();
    await typeInto(page, `${P}-DutyCycle-minimum-number-input`, 0.55);
    const fUnit = await displayedScale(page, `${P}-SwitchingFrequency-number-input`);
    await typeInto(page, `${P}-SwitchingFrequency-number-input`, /k/.test(fUnit) ? 140 : 140000);
    const lUnit = await displayedScale(page, `${P}-Inductance-number-input`);
    await typeInto(page, `${P}-Inductance-number-input`, /µ|u/.test(lUnit) ? 50 : /m/.test(lUnit) ? 0.05 : 50e-6);
    await typeInto(page, `${P}-DiodeVoltageDrop-number-input`, 0.7);
    await typeInto(page, `${P}-Efficiency-number-input`, 92);

    const d = await page.evaluate(() => JSON.parse(JSON.stringify(window.__omFindComponent('ForwardWizard').localData)));
    expect(d.designLevel).toBe('I know the design I want');
    expect(d.inputVoltage).toEqual({ minimum: 24, maximum: 125 });
    expect(d.outputsParameters.map((o) => [o.voltage, o.current, o.turnsRatio])).toEqual([[13, 24, 1]]);
    expect(d.dutyCycle.minimum).toBeCloseTo(0.55, 12);
    expect(d.dutyCycle.nominal).toBeNull();
    expect(d.dutyCycle.maximum).toBeNull();
    expect(d.switchingFrequency).toBeCloseTo(140000, 6);
    expect(d.inductance).toBeCloseTo(50e-6, 12);

    await runAnalytical(page, 120_000);
    await expect(page.locator('[data-cy="ConverterWizard-error-message"]')).toHaveCount(0);
    const waveformError = await page.evaluate(() => window.__omFindComponent('ForwardWizard').waveformError);
    expect(waveformError, 'error after Analytical').toBe('');

    const points = await readPoints(page);
    expect(points.map((p) => p.inputVoltage)).toEqual([24, 125]);
    // 24 V: the typed duty is the switch command; the output voltage is what it delivers.
    expect(points[0].forcedDutyCycle).toBeCloseTo(0.55, 12);
    expect(points[0].dutyCycle).toBeCloseTo(0.55, 12);
    expect(points[0].outputs.length).toBe(1);
    expect(points[0].outputs[0].requestedVoltage).toBeCloseTo(13, 12);
    // 125 V: no duty typed, so the engine derives it from the turns ratio as before.
    expect(points[1].forcedDutyCycle).toBeNull();
    expect(points[1].dutyCycle).toBeCloseTo(0.110, 2);

    const delivered = page.locator(`[data-cy="${P}-KhDiagnostics-deliveredOutput"]`);
    await expect(delivered).toHaveCount(1);
    await expect(delivered).toHaveAttribute('data-point', '0');
    await expect(delivered).toHaveText(
      `Output with duty 0.55: ${points[0].outputs[0].voltage.toFixed(1)} V (asked 13.0 V)`);
    expectNoConsoleErrors(errors);
  });
});
