/**
 * tests/acf-input-voltage-points.spec.js
 *
 * ABT #2160: a converter wizard evaluates ONE design at every input voltage the user entered,
 * one operating point per entered voltage (Nom. / Min. / Max.), and never at a voltage the user
 * did not enter. Before the fix the wizards sent a single point at the middle of the range, so the
 * customer's Active Clamp Forward (24-125 V) was simulated at 74.5 V only.
 *
 * 1. The customer's Active Clamp Forward (see acf-user-design.spec.js) with the Duty Cycle left
 *    empty, as the wizard now starts: two operating points, 24 V and 125 V, each with the duty the
 *    engine derives from the turns ratio (about 0.575 and 0.110), and Design Magnetic carries both
 *    points into the Magnetic Tool.
 * 2. "Help me with the design" (Flyback defaults, Input Voltage Min. 120 V and Max. 375 V): the
 *    turns ratio and magnetizing inductance are designed once and are the same at every input voltage.
 */
import { test, expect } from './_coverage.js';
import { openWizard, runAnalytical, switchToIKnowMode, withPinia } from './utils/index.js';
import { clickDesignMagnetic } from './utils/flows.js';
import { collectConsoleErrors } from './utils/console.js';
import { expectNoConsoleErrors } from './utils/assertions.js';
import { getWizard } from './utils/catalog.js';

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
    magnetizingInductance: p.diagnostics?.computed?.magnetizingInductance ?? null,
    turnsRatio: p.diagnostics?.computed?.turnsRatio ?? null,
  }));
});

const readMas = (page) => withPinia(page, (pinia) => {
  const mas = pinia._s.get('mas').mas;
  return {
    coilNames: (mas.magnetic?.coil?.functionalDescription || []).map((w) => w.name),
    operatingPoints: (mas.inputs.operatingPoints || []).map((op) => ({
      name: op.name,
      windings: (op.excitationsPerWinding || []).length,
    })),
    turnsRatios: (mas.inputs.designRequirements?.turnsRatios || []).map((t) =>
      ['minimum', 'nominal', 'maximum'].filter((k) => typeof t[k] === 'number').map((k) => t[k])),
  };
});

test.describe('One operating point per entered input voltage', () => {
  test.setTimeout(240_000);

  test("the customer's Active Clamp Forward with an empty duty runs at 24 V and at 125 V", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openWizard(page, 'ActiveClampForward-link');
    await switchToIKnowMode(page);

    await typeInto(page, `${P}-InputVoltage-minimum-number-input`, 24);
    await typeInto(page, `${P}-InputVoltage-maximum-number-input`, 125);
    await typeInto(page, `${P}-OutputsParameters voltage-number-input`, 13);
    await typeInto(page, `${P}-OutputsParameters current-number-input`, 24);
    await typeInto(page, `${P}-OutputsParameters turnsRatio-number-input`, 1);
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
    // The Duty Cycle starts empty (Alf, 2026-10-29) and was not typed.
    expect(d.dutyCycle).toEqual({ minimum: null, nominal: null, maximum: null });
    expect(d.switchingFrequency).toBeCloseTo(140000, 6);
    expect(d.inductance).toBeCloseTo(50e-6, 12);

    await runAnalytical(page, 120_000);
    await expect(page.locator('[data-cy="ConverterWizard-error-message"]')).toHaveCount(0);
    const waveformError = await page.evaluate(() => window.__omFindComponent('ForwardWizard').waveformError);
    expect(waveformError, 'error after Analytical').toBe('');

    const points = await readPoints(page);
    expect(points.map((p) => p.inputVoltage)).toEqual([24, 125]);
    expect(points[0].dutyCycle).toBeCloseTo(0.575, 2);
    expect(points[1].dutyCycle).toBeCloseTo(0.110, 2);
    for (const p of points) {
      expect(p.forcedDutyCycle, `${p.name}: no duty was typed, so none is pinned`).toBeNull();
      expect(p.magnetizingInductance).toBeCloseTo(50e-6, 12);
      expect(p.turnsRatio).toBeCloseTo(1, 12);
    }
    // The card names each point and shows its own duty.
    const names = page.locator(`[data-cy="${P}-KhDiagnostics-operatingPoint-name"]`);
    await expect(names).toHaveCount(2);
    await expect(names.nth(0)).toContainText('24');
    await expect(names.nth(1)).toContainText('125');
    const duties = page.locator(`[data-cy="${P}-KhDiagnostics-dutyCycle-value"]`);
    await expect(duties).toHaveText([points[0].dutyCycle.toFixed(3), points[1].dutyCycle.toFixed(3)]);

    await clickDesignMagnetic(page);
    const mas = await readMas(page);
    expect(mas.coilNames.length).toBe(2);
    expect(mas.operatingPoints.map((op) => op.name)).toEqual(points.map((p) => p.name));
    for (const op of mas.operatingPoints) expect(op.windings, `${op.name} windings`).toBe(2);
    expect(mas.turnsRatios).toEqual([[1]]);
    expectNoConsoleErrors(errors);
  });

  test('Help me with the design: one turns ratio and one inductance at every input voltage (Flyback)', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const { linkCy, wizardPrefix: p } = getWizard('flyback');
    await openWizard(page, linkCy);

    const { d, designMode } = await page.evaluate(() => {
      const wizard = window.__omFindComponent('FlybackWizard');
      if (!wizard) throw new Error('FlybackWizard component instance not found in the page');
      return JSON.parse(JSON.stringify({ d: wizard.localData, designMode: wizard.localData.designLevel }));
    });
    expect(designMode).toBe('Help me with the design');
    // Premise: the defaults carry a Min. and a Max. input voltage, so there are two points.
    expect(d.inputVoltage, 'Flyback default Input Voltage').toEqual({ minimum: 120, maximum: 375 });

    await runAnalytical(page, 120_000);
    await expect(page.locator('[data-cy="ConverterWizard-error-message"]')).toHaveCount(0);

    const points = await readPoints(page);
    const expectedVoltages = ['nominal', 'minimum', 'maximum'].map((k) => d.inputVoltage[k]).filter((v) => v != null);
    expect(points.map((pt) => pt.inputVoltage)).toEqual(expectedVoltages);
    for (const pt of points) {
      expect(pt.turnsRatio, `${pt.name} turns ratio`).toBe(points[0].turnsRatio);
      expect(pt.magnetizingInductance, `${pt.name} magnetizing inductance`).toBe(points[0].magnetizingInductance);
    }
    expect(points[0].turnsRatio).toBeGreaterThan(0);
    expect(points[0].magnetizingInductance).toBeGreaterThan(0);
    // One value, so the card shows no per-point list for them.
    await expect(page.locator(`[data-cy="${p}-KhDiagnostics-turnsRatio-perPoint"]`)).toHaveCount(0);
    await expect(page.locator(`[data-cy="${p}-KhDiagnostics-inductance-perPoint"]`)).toHaveCount(0);
    await expect(page.locator(`[data-cy="${p}-KhDiagnostics-operatingPoint-name"]`)).toHaveCount(points.length);

    await clickDesignMagnetic(page);
    const mas = await readMas(page);
    expect(mas.operatingPoints.map((op) => op.name)).toEqual(points.map((pt) => pt.name));
    expectNoConsoleErrors(errors);
  });
});
