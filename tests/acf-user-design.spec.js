/**
 * tests/acf-user-design.spec.js
 *
 * A user's Active Clamp Forward, "I know the design I want", failed on openmagnetics.com with
 * "analytical_active_clamp_forward: T1 cannot be larger than period/2": the engine refused every
 * forward duty above 0.5, although the active clamp resets the core over the whole off-time
 * (fixed in Kirchhoff cc193c7, ABT #2131). The design: Vin 24-125 V, 13 V / 24 A, turns ratio 1,
 * duty 0.55, 140 kHz, 50 uH, diode drop 0.7 V, efficiency 92 %.
 *
 * The design is typed into the wizard the way the user did, and the wizard's own state is then
 * checked against it, so a renamed or rescaled input fails here instead of silently testing
 * another design. The engine must answer without an exception, the waveforms must draw, the
 * wizard must hand Kirchhoff the 0.7 V diode drop (it was dropped before), and Design Magnetic
 * must reach the Magnetic Tool with the two-winding transformer.
 */
import { test, expect } from './_coverage.js';
import { openWizard, runAnalytical, runSimulated, switchToIKnowMode, withPinia } from './utils/index.js';
import { clickDesignMagnetic } from './utils/flows.js';
import { collectConsoleErrors } from './utils/console.js';
import { expectNoConsoleErrors } from './utils/assertions.js';
import { buildKhConverterSpec } from '../WebSharedComponents/assets/js/kirchhoffRuntime.js';

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
  return JSON.parse(JSON.stringify({
    converterName: wizard.converterName,
    localData: wizard.localData,
    params: wizard.buildParams('analytical'),
    errorMessage: wizard.errorMessage,
    waveformError: wizard.waveformError,
    windings: (wizard.simulatedOperatingPoints?.[0]?.excitationsPerWinding ?? []).map((e) => ({
      name: e.name,
      currentPoints: e.current?.waveform?.data?.length ?? 0,
      voltagePoints: e.voltage?.waveform?.data?.length ?? 0,
    })),
  }));
});

test.describe("A user's Active Clamp Forward above 50 % duty", () => {
  test.setTimeout(240_000);

  test('designs, draws its waveforms and opens in the Magnetic Tool', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openWizard(page, 'ActiveClampForward-link');
    await switchToIKnowMode(page);

    await typeInto(page, `${P}-InputVoltage-minimum-number-input`, 24);
    await typeInto(page, `${P}-InputVoltage-maximum-number-input`, 125);
    await typeInto(page, `${P}-OutputsParameters voltage-number-input`, 13);
    await typeInto(page, `${P}-OutputsParameters current-number-input`, 24);
    await typeInto(page, `${P}-OutputsParameters turnsRatio-number-input`, 1);
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

    // What Kirchhoff receives: the user's 0.7 V drop, and none of the wizard's hidden defaults
    // (it has no ripple or switch-current input).
    expect(before.params.currentRippleRatio).toBeUndefined();
    expect(before.params.maximumSwitchCurrent).toBeUndefined();
    const spec = buildKhConverterSpec('acf', before.params);
    expect(spec.config).toEqual({ diodeVoltageDrop: before.params.diodeVoltageDrop });
    expect(spec.config.diodeVoltageDrop).toBeCloseTo(0.7, 12);

    await runAnalytical(page, 120_000);
    const analytical = await readWizard(page);
    expect(analytical.errorMessage, 'wizard error after Analytical').toBeFalsy();
    expect(analytical.waveformError, 'waveform error after Analytical').toBeFalsy();
    await expect(page.locator('.error-text').first()).toBeHidden();
    expect(analytical.windings.length).toBe(2);
    for (const w of analytical.windings) {
      expect(w.currentPoints, `${w.name} current waveform`).toBeGreaterThan(1);
      expect(w.voltagePoints, `${w.name} voltage waveform`).toBeGreaterThan(1);
    }
    expect(await page.locator('canvas').count()).toBeGreaterThan(0);

    await runSimulated(page, { timeoutMs: 120_000 });
    const simulated = await readWizard(page);
    expect(simulated.errorMessage, 'wizard error after Simulated').toBeFalsy();
    expect(simulated.waveformError, 'waveform error after Simulated').toBeFalsy();
    expect(simulated.windings.length).toBe(2);

    await clickDesignMagnetic(page);
    const built = await withPinia(page, (pinia) => {
      const mas = pinia._s.get('mas').mas;
      return {
        coilNames: (mas.magnetic?.coil?.functionalDescription || []).map((w) => w.name),
        isolationSides: mas.inputs.designRequirements?.isolationSides || [],
        // Kirchhoff emits the pinned ratio as a bound ({maximum: 1}), so read every numeric field.
        turnsRatios: (mas.inputs.designRequirements?.turnsRatios || []).map((t) =>
          ['minimum', 'nominal', 'maximum'].filter((k) => typeof t[k] === 'number').map((k) => t[k])),
      };
    });
    expect(built.coilNames.length).toBe(2);
    expect(built.isolationSides).toEqual(['primary', 'secondary']);
    expect(built.turnsRatios).toEqual([[1]]);
    expectNoConsoleErrors(errors);
  });
});
