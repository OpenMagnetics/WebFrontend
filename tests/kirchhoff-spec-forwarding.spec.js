/**
 * tests/kirchhoff-spec-forwarding.spec.js
 *
 * The wizard → Kirchhoff spec translation (WebSharedComponents kirchhoffRuntime.js
 * buildKhConverterSpec) must hand every design input to the config key the Kirchhoff topology
 * actually reads (Kirchhoff src/<Topology>.cpp, cfg::get(d.config, <key>, ...)).
 *
 * The bug this locks down (user report, Active Clamp Forward, 2026-10-28): the wizard's
 * diodeVoltageDrop was never forwarded (Kirchhoff then sized the ACF around its synchronous-
 * rectifier drop Io·0.01 instead of the 0.7 V the user entered); currentRippleRatio went to
 * config.rippleRatio, which only buck and boost read; maximumDutyCycle went to config.maxDutyCycle,
 * which the ACF and AHB do not read; maximumSwitchCurrent and maximumDrainSourceVoltage were
 * never forwarded at all.
 *
 * Pure function test: no page, no engine.
 */
import { test, expect } from '@playwright/test';
import { buildKhConverterSpec } from '../WebSharedComponents/assets/js/kirchhoffRuntime.js';

// The user's Active Clamp Forward, "I know the design I want", as ForwardWizard.buildParams() sends it.
const USER_ACF_PARAMS = {
  inputVoltage: { minimum: 24, maximum: 125 },
  switchingFrequency: 140000,
  diodeVoltageDrop: 0.7,
  efficiency: 0.92,
  converterType: 'Active Clamp Forward',
  desiredInductance: 50e-6,
  desiredDutyCycle: [[0.55]],
  desiredTurnsRatios: [1],
  operatingPoints: [{ outputVoltages: [13], outputCurrents: [24], switchingFrequency: 140000, ambientTemperature: 25 }],
};

const BASE_DC = {
  inputVoltage: { minimum: 36, maximum: 72 },
  switchingFrequency: 100000,
  efficiency: 0.9,
  operatingPoints: [{ outputVoltages: [12], outputCurrents: [2], switchingFrequency: 100000, ambientTemperature: 25 }],
};

test.describe('Kirchhoff spec forwarding', () => {
  test("the user's Active Clamp Forward carries its 0.7 V diode drop", () => {
    const spec = buildKhConverterSpec('acf', USER_ACF_PARAMS);
    expect(spec.config).toEqual({ diodeVoltageDrop: 0.7 });
    expect(spec.designRequirements.magnetizingInductance).toEqual({ nominal: 50e-6 });
    expect(spec.designRequirements.turnsRatios).toEqual([{ nominal: 1 }]);
    expect(spec.designRequirements.efficiency).toBe(0.92);
  });

  const RIPPLE_KEYS = {
    buck: 'rippleRatio', boost: 'rippleRatio',
    flyback: 'inductorRippleRatio', forward: 'inductorRippleRatio', two_switch_forward: 'inductorRippleRatio',
    acf: 'inductorRippleRatio', push_pull: 'inductorRippleRatio', isolated_buck: 'inductorRippleRatio',
    isolated_buck_boost: 'inductorRippleRatio', fsbb: 'inductorRippleRatio',
    sepic: 'l1RippleRatio', cuk: 'l1RippleRatio', zeta: 'l1RippleRatio', weinberg: 'l1RippleRatio',
  };
  for (const [topology, key] of Object.entries(RIPPLE_KEYS)) {
    test(`${topology}: currentRippleRatio reaches config.${key}`, () => {
      const spec = buildKhConverterSpec(topology, { ...BASE_DC, currentRippleRatio: 0.27 });
      expect(spec.config[key]).toBe(0.27);
      if (key !== 'rippleRatio') expect(spec.config.rippleRatio).toBeUndefined();
    });
  }

  test('pfc: currentRippleRatio reaches config.currentRippleFraction', () => {
    const spec = buildKhConverterSpec('pfc', { inputVoltage: { minimum: 85, maximum: 265 }, outputVoltage: 400,
      outputPower: 300, switchingFrequency: 100000, currentRippleRatio: 0.3, diodeVoltageDrop: 0.6 });
    expect(spec.config.currentRippleFraction).toBe(0.3);
    expect(spec.config.diodeVoltageDrop).toBe(0.6);
  });

  test('vienna: currentRippleRatio reaches config.inductorRippleRatio', () => {
    const spec = buildKhConverterSpec('vienna', { lineToLineVoltage: 400, outputVoltage: 800, outputPower: 10000,
      switchingFrequency: 50000, currentRippleRatio: 0.25 });
    expect(spec.config.inductorRippleRatio).toBe(0.25);
  });

  const MAX_DUTY_KEYS = {
    flyback: 'maxDutyCycle', forward: 'maxDutyCycle', two_switch_forward: 'maxDutyCycle', push_pull: 'maxDutyCycle',
    acf: 'operatingDutyCycle', ahb: 'maximumDutyCycle',
  };
  for (const [topology, key] of Object.entries(MAX_DUTY_KEYS)) {
    test(`${topology}: maximumDutyCycle reaches config.${key}`, () => {
      const spec = buildKhConverterSpec(topology, { ...BASE_DC, maximumDutyCycle: 0.44 });
      expect(spec.config[key]).toBe(0.44);
      if (key !== 'maxDutyCycle') expect(spec.config.maxDutyCycle).toBeUndefined();
    });
  }

  test('the switch-stress limits reach config verbatim', () => {
    const spec = buildKhConverterSpec('buck', { ...BASE_DC, maximumSwitchCurrent: 8 });
    expect(spec.config.maximumSwitchCurrent).toBe(8);
    const fly = buildKhConverterSpec('flyback', { ...BASE_DC, maximumDrainSourceVoltage: 600 });
    expect(fly.config.maximumDrainSourceVoltage).toBe(600);
  });

  test('a ripple ratio for a topology with no mapped key throws', () => {
    expect(() => buildKhConverterSpec('dab', { ...BASE_DC, currentRippleRatio: 0.3 }))
      .toThrow(/currentRippleRatio for dab/);
    expect(() => buildKhConverterSpec('buck', { ...BASE_DC, maximumDutyCycle: 0.5 }))
      .toThrow(/maximumDutyCycle for buck/);
  });

  test('a non-numeric value throws instead of being forwarded', () => {
    expect(() => buildKhConverterSpec('acf', { ...USER_ACF_PARAMS, diodeVoltageDrop: 'abc' }))
      .toThrow(/diodeVoltageDrop for acf must be a number/);
  });
  // PFC conduction mode / wide-bandgap switch (2026-10-28): KH design_pfc reads config.mode and
  // config.wideBandgapSwitch; the wizard's choice never reached them, so KH sized every PFC in CCM.
  const PFC_BASE = { inputVoltage: { minimum: 85, maximum: 265 }, outputVoltage: 400, outputPower: 300,
    switchingFrequency: 65000, lineFrequency: 50, topologyVariant: 'boost' };
  const PFC_MODES = {
    continuousConductionMode: 'ccm', discontinuousConductionMode: 'dcm', criticalConductionMode: 'crm',
  };
  for (const [mode, key] of Object.entries(PFC_MODES)) {
    test(`pfc: conduction mode ${mode} reaches config.mode = ${key}`, () => {
      const spec = buildKhConverterSpec('pfc', { ...PFC_BASE, mode });
      expect(spec.config.mode).toBe(key);
    });
  }

  test('pfc: wideBandgapSwitch reaches config.wideBandgapSwitch', () => {
    expect(buildKhConverterSpec('pfc', { ...PFC_BASE, wideBandgapSwitch: false }).config.wideBandgapSwitch).toBe(false);
    expect(buildKhConverterSpec('pfc', { ...PFC_BASE, wideBandgapSwitch: true }).config.wideBandgapSwitch).toBe(true);
  });

  test('pfc: an unknown conduction mode or a non-boolean wideBandgapSwitch throws', () => {
    expect(() => buildKhConverterSpec('pfc', { ...PFC_BASE, mode: 'burstMode' }))
      .toThrow(/unknown PFC conduction mode 'burstMode'/);
    expect(() => buildKhConverterSpec('pfc', { ...PFC_BASE, wideBandgapSwitch: 'yes' }))
      .toThrow(/wideBandgapSwitch must be a boolean/);
  });
});
