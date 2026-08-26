/**
 * tests/wizards/flyback-negative-rail.spec.js
 *
 * Regression guard for negative output rails on the Flyback wizard (user report:
 * "the flyback tool doesn't support negative rails").
 *
 * A -12 V rail is the same transformer as a +12 V one with that secondary's dot /
 * rectifier reversed: identical turns ratio, volt-seconds and RMS current. The engine
 * is therefore fed |Vout| (kirchhoffRuntime.buildKhConverterSpec takes the magnitude)
 * and the magnetic design must come out bit-for-bit the same. What used to block it was
 * purely the input layer: Dimension clamped anything below `min` (1e-6 V) up to +1e-6,
 * so the minus sign was swallowed before it ever reached the wizard's localData.
 *
 * Locks down:
 *   1. the voltage field accepts and keeps a negative value,
 *   2. a -12 V rail designs identically to a +12 V one (turns ratio, Lm, RMS currents),
 *   3. a mixed +5 / +12 / -12 multi-output design produces four windings and no errors,
 *   4. the sign reaches the engine — Kirchhoff puts the rail below ground (ABT #904),
 *   5. the same holds for the other topologies that gained polarity (forward family, push-pull),
 *      and does NOT leak into Active Clamp Forward, whose engine still takes magnitudes only.
 */
import { test, expect } from '../_coverage.js';
import { openWizard, runAnalytical } from '../utils/index.js';
import { pickOption } from '../utils/builder-helpers.js';

const VOLTAGE_CY = 'FlybackWizard-OutputsParameters voltage-number-input';
const CURRENT_CY = 'FlybackWizard-OutputsParameters current-number-input';

/**
 * Type into a PrimeVue InputNumber the way a user does: focus, select-all, type.
 * fill() is NOT usable here — PrimeVue's InputNumber intercepts keystrokes and drops the
 * minus sign of a programmatically-set value.
 */
async function typeInto(page, cy, index, value) {
  const input = page.locator(`[data-cy="${cy}"] input`).nth(index);
  await input.waitFor({ state: 'visible', timeout: 15000 });
  await input.click();
  await input.press('Control+a');
  await input.type(String(value), { delay: 40 });
  await input.press('Tab');
  return input.inputValue();
}

/** Read the wizard component's own state (localData + the engine's design requirements). */
const readWizard = (page) => page.evaluate(() => {
  let node = document.querySelector('[data-cy="FlybackWizard-OutputsParameters voltage-number-input"]');
  while (node && !node.__vueParentComponent) node = node.parentElement;
  let component = node?.__vueParentComponent;
  while (component && (component.type?.__name || component.type?.name) !== 'FlybackWizard') {
    component = component.parent;
  }
  if (!component) throw new Error('FlybackWizard component instance not found in the page');
  const wizard = component.proxy;
  // Structured-clone the reactive tree: Vue proxies are not serialisable across the CDP bridge.
  return JSON.parse(JSON.stringify({
    rails: wizard.localData.outputsParameters.map((o) => o.voltage),
    errorMessage: wizard.errorMessage,
    waveformError: wizard.waveformError,
    turnsRatios: wizard.designRequirements?.turnsRatios?.map((t) => t.nominal) ?? null,
    magnetizingInductance: wizard.designRequirements?.magnetizingInductance?.nominal ?? null,
    windings: (wizard.simulatedOperatingPoints?.[0]?.excitationsPerWinding ?? []).map((e) => ({
      name: e.name,
      currentRms: e.current?.processed?.rms ?? null,
      voltageRms: e.voltage?.processed?.rms ?? null,
    })),
  }));
});

test.describe('Flyback negative output rails @scenario', () => {
  test('a -12 V rail is accepted and designs identically to +12 V', async ({ page }) => {
    await openWizard(page, 'Flyback-link');

    await typeInto(page, VOLTAGE_CY, 0, 12);
    await runAnalytical(page, 120000);
    const positive = await readWizard(page);

    const shown = await typeInto(page, VOLTAGE_CY, 0, -12);
    expect(shown.startsWith('-'), `voltage field must keep the minus sign, got "${shown}"`).toBe(true);

    await runAnalytical(page, 120000);
    const negative = await readWizard(page);

    expect(negative.rails).toEqual([-12]);
    expect(negative.errorMessage).toBeFalsy();
    expect(negative.waveformError).toBeFalsy();

    // The sign is a winding-orientation choice, so the magnetic design must not move.
    expect(negative.turnsRatios).toEqual(positive.turnsRatios);
    expect(negative.magnetizingInductance).toEqual(positive.magnetizingInductance);
    expect(negative.windings.map((w) => w.currentRms)).toEqual(positive.windings.map((w) => w.currentRms));
  });

  test('a mixed +5 / +12 / -12 multi-output design builds four windings', async ({ page }) => {
    await openWizard(page, 'Flyback-link');
    await pickOption(page, 'FlybackWizard-NumberOutputs', '3');

    await typeInto(page, VOLTAGE_CY, 0, 5);
    await typeInto(page, CURRENT_CY, 0, 2);
    await typeInto(page, VOLTAGE_CY, 1, 12);
    await typeInto(page, CURRENT_CY, 1, 1);
    const shown = await typeInto(page, VOLTAGE_CY, 2, -12);
    await typeInto(page, CURRENT_CY, 2, 1);
    expect(shown.startsWith('-')).toBe(true);

    await runAnalytical(page, 120000);
    const result = await readWizard(page);

    expect(result.rails).toEqual([5, 12, -12]);
    expect(result.errorMessage).toBeFalsy();
    expect(result.waveformError).toBeFalsy();
    expect(result.windings.map((w) => w.name)).toEqual(
      ['Primary', 'Secondary 0', 'Secondary 1', 'Secondary 2']);

    // -12 V and +12 V carry the same magnitude, so they must share a turns ratio and RMS current.
    expect(result.turnsRatios[2]).toEqual(result.turnsRatios[1]);
    expect(result.windings[3].currentRms).toEqual(result.windings[2].currentRms);
  });
});


/**
 * The other topologies that gained per-rail polarity (Kirchhoff ABT #904). Active Clamp Forward is
 * deliberately EXCLUDED — kirchhoffRuntime still sends |Vout| for 'acf', so the wizard must not offer
 * a minus sign there or the user would silently get a positive rail.
 */
// `voltageCy` differs by wizard: the SMPS ones label the group `-OutputsParameters`, while the
// resonant/DAB ones suffix the rail index (`-OutputsParameters-0`).
const NEGATIVE_CAPABLE = [
  { key: 'single-switch-forward', linkCy: 'SingleSwitchForward-link', voltageCy: 'SingleSwitchForwardWizard-OutputsParameters voltage-number-input' },
  { key: 'two-switch-forward', linkCy: 'TwoSwitchForward-link', voltageCy: 'TwoSwitchForwardWizard-OutputsParameters voltage-number-input' },
  { key: 'active-clamp-forward', linkCy: 'ActiveClampForward-link', voltageCy: 'ActiveClampForwardWizard-OutputsParameters voltage-number-input' },
  { key: 'push-pull', linkCy: 'PushPull-link', voltageCy: 'PushPullWizard-OutputsParameters voltage-number-input' },
  { key: 'llc', linkCy: 'Llc-link', voltageCy: 'LlcWizard-OutputsParameters-0 voltage-number-input' },
  { key: 'src', linkCy: 'Src-link', voltageCy: 'SrcWizard-OutputsParameters-0 voltage-number-input' },
];

for (const { key, linkCy, voltageCy } of NEGATIVE_CAPABLE) {
  test.describe(`${key} negative output rails @scenario`, () => {
    test(`${key} accepts a -12 V rail and still designs it`, async ({ page }) => {
      test.setTimeout(300_000);
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

      await openWizard(page, linkCy);
      const shown = await typeInto(page, voltageCy, 0, -12);
      expect(shown.startsWith('-'), `voltage field must keep the minus sign, got "${shown}"`).toBe(true);

      await runAnalytical(page, 120_000);

      const state = await page.evaluate((selector) => {
        let node = document.querySelector(`[data-cy="${selector}"]`);
        while (node && !node.__vueParentComponent) node = node.parentElement;
        let component = node?.__vueParentComponent;
        while (component && !component.proxy?.localData?.outputsParameters) component = component.parent;
        if (!component) throw new Error('wizard component instance not found');
        const wizard = component.proxy;
        return JSON.parse(JSON.stringify({
          rails: wizard.localData.outputsParameters.map((o) => o.voltage),
          errorMessage: wizard.errorMessage,
          waveformError: wizard.waveformError,
          windingCount: (wizard.simulatedOperatingPoints?.[0]?.excitationsPerWinding ?? []).length,
        }));
      }, voltageCy);

      expect(state.rails[0]).toBe(-12);
      expect(state.errorMessage).toBeFalsy();
      expect(state.waveformError).toBeFalsy();
      expect(state.windingCount).toBeGreaterThan(1);
      expect(errors.filter((e) => /Exception|WebAssembly|RuntimeError/i.test(e))).toEqual([]);
    });
  });
}

/**
 * The active-bridge topologies still take magnitudes only (Kirchhoff throws on a negative rail),
 * so their wizards must NOT offer a minus sign — otherwise the user would silently get a POSITIVE
 * rail. This is the guard that keeps the allowlist and the UI honest with each other.
 */
for (const { key, linkCy, voltageCy } of [
  { key: 'dab', linkCy: 'Dab-link', voltageCy: 'DabWizard-OutputsParameters-0 voltage-number-input' },
  { key: 'cllc', linkCy: 'Cllc-link', voltageCy: 'CllcWizard-OutputsParameters voltage-number-input' },
]) {
  test(`${key} does NOT offer negative rails (active bridge — engine takes magnitudes only) @scenario`,
    async ({ page }) => {
      test.setTimeout(300_000);
      await openWizard(page, linkCy);
      const shown = await typeInto(page, voltageCy, 0, -12);
      expect(shown.startsWith('-'),
        `${key} must not accept a negative rail while its engine takes |Vout|, got "${shown}"`)
        .toBe(false);
    });
}
