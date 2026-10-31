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
 * ABT #2160: the design call's parts are pinned on every input-voltage point (khRunAtEachInputVoltage),
 * each on the key the Kirchhoff topology accepts as a pin, and every point is checked to come back
 * with the same parts.
 *
 * Pure function test: no page, no engine (the design-pin cases use a stand-in engine that reports
 * the diagnostics given to it).
 */
import { test, expect } from '@playwright/test';
import { buildKhConverterSpec, khRunAtEachInputVoltage } from '../WebSharedComponents/assets/js/kirchhoffRuntime.js';

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

// ── Design pins at every input voltage (ABT #2160) ──────────────────────────────────────────────
// A stand-in engine: the design call and every point report the same diagnostics (or the point's own,
// when a case changes a part at one point), and every spec sent is recorded.
const fakeDiagnostics = ({ capacitors = [], inductors = [], magnetics }) => ({
  magnetics: magnetics || [{ name: 'T1', isMain: true, windings: 2, magnetizingInductance: 1e-4, turnsRatios: [2] }],
  capacitors,
  computed: { extraInductors: inductors },
});
function standInEngine(design, atPoint = () => design) {
  const specs = [];
  const call = async (topology, specJson) => {
    const spec = JSON.parse(specJson);
    specs.push(spec);
    const parts = specs.length === 1 ? design : atPoint(spec);
    return JSON.stringify({ diagnostics: fakeDiagnostics(parts) });
  };
  return { call, specs };
}
const cap = (name, capacitance) => ({ name, capacitance });
const ind = (name, inductance) => ({ name, inductance });
const TWO_RAILS = { ...BASE_DC, operatingPoints: [{ outputVoltages: [12, 5], outputCurrents: [2, 1], switchingFrequency: 100000 }] };

const DESIGN_PIN_CASES = [
  { topology: 'flyback', params: TWO_RAILS, parts: { capacitors: [cap('Cin', 1e-5), cap('Cclmp', 1.3e-10), cap('Cout', 8e-5), cap('Cout2', 9e-5)] },
    config: { outputCapacitance: [8e-5, 9e-5], snubberCap: 1.3e-10 } },
  { topology: 'two_switch_flyback', params: BASE_DC, parts: { capacitors: [cap('Cclmp', 1.5e-10), cap('Cout', 7e-5)] },
    config: { outputCapacitance: [7e-5], snubberCap: 1.5e-10 } },
  { topology: 'active_clamp_flyback', params: BASE_DC, parts: { capacitors: [cap('Cout', 8e-5)] }, config: { outputCapacitance: [8e-5] } },
  { topology: 'boost', params: BASE_DC, parts: { capacitors: [cap('Cout', 1.7e-5)] }, config: { outputCapacitance: 1.7e-5 } },
  { topology: 'weinberg', params: BASE_DC, parts: { capacitors: [cap('Cout', 3.2e-5)] }, config: { outputCapacitance: 3.2e-5 } },
  { topology: 'forward', params: TWO_RAILS, parts: { inductors: [ind('Lout', 1.2e-4), ind('Lout2', 9.7e-5)] },
    config: { outputInductance: [1.2e-4, 9.7e-5] } },
  { topology: 'two_switch_forward', params: TWO_RAILS, parts: { inductors: [ind('Lout', 1.2e-4), ind('Lout2', 9.7e-5)] },
    config: { outputInductance: [1.2e-4, 9.7e-5] } },
  { topology: 'acf', params: BASE_DC, parts: { inductors: [ind('Lout', 8.6e-6)] }, config: { outputInductance: [8.6e-6] } },
  { topology: 'sepic', params: BASE_DC, parts: { inductors: [ind('L2', 2.6e-4)], capacitors: [cap('Cs', 1.4e-5)] },
    config: { inductanceL2: 2.6e-4, couplingCapacitance: 1.4e-5 } },
  { topology: 'zeta', params: BASE_DC, parts: { inductors: [ind('L2', 2.6e-4)], capacitors: [cap('Cc', 1e-5)] },
    config: { inductanceL2: 2.6e-4, couplingCapacitance: 1e-5 } },
  { topology: 'cuk', params: BASE_DC, parts: { inductors: [ind('L2', 2.2e-4)], capacitors: [cap('C1', 5.3e-6), cap('Crc_sw', 1e-9)] },
    config: { inductanceL2: 2.2e-4, couplingCapacitance: 5.3e-6 } },
  // Alf 2026-10-31: the stand-in transformer has Kirchhoff's real push-pull shape [1, n, n]
  { topology: 'push_pull', params: BASE_DC, parts: { capacitors: ['Csn1', 'Csn2', 'Csn3', 'Csn4'].map((n) => cap(n, 5.8e-11)).concat([cap('Cdmp', 1e-9)]),
    magnetics: [{ name: 'T1', isMain: true, windings: 4, magnetizingInductance: 1.44e-4, turnsRatios: [1, 1.51, 1.51] }] },
    config: { snubberCap: 5.8e-11 } },
  { topology: 'fsbb', params: BASE_DC, parts: { capacitors: [cap('Csw1', 2.2e-9), cap('Crc_sw1', 3.7e-9), cap('Crc_sw2', 3.7e-9)] },
    config: { snubberCap: 3.7e-9 } },
  { topology: 'dab', params: BASE_DC, parts: { inductors: [ind('Lr', 1.9e-4)], capacitors: [cap('Crc_pri', 1.24e-10), cap('CsnA_hi', 1.24e-10), cap('CsnE_lo', 1.24e-10)] },
    config: { snubberCap: 1.24e-10 }, dr: { desiredSeriesInductance: 1.9e-4 } },
  { topology: 'psfb', params: BASE_DC, parts: { inductors: [ind('Lr', 2e-6), ind('Lout', 2.4e-5)], capacitors: [cap('Crc_pri', 1.24e-10), cap('CsnA', 2.2e-9)] },
    config: { outputInductance: 2.4e-5, snubberCap: 1.24e-10 }, dr: { desiredSeriesInductance: 2e-6 } },
  { topology: 'pshb', params: BASE_DC, parts: { inductors: [ind('Lr', 2e-6), ind('Lout', 2.5e-5)], capacitors: [cap('Crc_pri', 4.96e-10)] },
    config: { outputInductance: 2.5e-5, snubberCap: 4.96e-10 }, dr: { desiredSeriesInductance: 2e-6 } },
  { topology: 'src', params: BASE_DC, parts: { inductors: [ind('Lr', 5.2e-5)], capacitors: [cap('Cr', 4.9e-8)] },
    dr: { desiredResonantInductance: 5.2e-5, desiredResonantCapacitance: 4.9e-8 } },
];

test.describe('Kirchhoff design pins at every input voltage', () => {
  for (const { topology, params, parts, config = {}, dr = {} } of DESIGN_PIN_CASES) {
    test(`${topology}: every point carries the design's parts (${[...Object.keys(config), ...Object.keys(dr)].join(', ')})`, async () => {
      const engine = standInEngine(parts);
      const runs = await khRunAtEachInputVoltage(engine.call, topology, params, 'analytical');
      // Premise: Min. and Max. were entered, so one design call and two points.
      expect(engine.specs.length).toBe(3);
      expect(runs.points.map((p) => p.point.value)).toEqual([36, 72]);
      for (const spec of engine.specs.slice(1)) {
        for (const [key, value] of Object.entries(config)) expect(spec.config?.[key], `config.${key}`).toEqual(value);
        for (const [key, value] of Object.entries(dr)) expect(spec.designRequirements[key], `designRequirements.${key}`).toEqual(value);
      }
      // The design call itself is never pinned.
      for (const key of Object.keys(config)) expect(engine.specs[0].config?.[key]).toBeUndefined();
    });
  }

  test('a point that comes back with another output capacitor throws, naming the part', async () => {
    const design = { capacitors: [cap('Cout', 8e-5), cap('Cout2', 9e-5)] };
    const engine = standInEngine(design, (spec) => (spec.operatingPoints[0].inputVoltage === 72
      ? { capacitors: [cap('Cout', 8e-5), cap('Cout2', 4e-5)] } : design));
    await expect(khRunAtEachInputVoltage(engine.call, 'flyback', TWO_RAILS, 'analytical'))
      .rejects.toThrow(/The converter changed between input voltages: Output capacitors Cout is \[0\.00008, 0\.00009\] in the design but \[0\.00008, 0\.00004\] at Max\. input \(72 V\)/);
  });

  test('a point that comes back with another snubber throws', async () => {
    const design = { capacitors: [cap('Crc_pri', 1.24e-10)] };
    const engine = standInEngine(design, () => ({ capacitors: [cap('Crc_pri', 2e-10)] }));
    await expect(khRunAtEachInputVoltage(engine.call, 'psfb', BASE_DC, 'analytical'))
      .rejects.toThrow(/Snubber capacitor Crc_pri is 1\.24e-10 in the design but 2e-10 at Min\. input \(36 V\)/);
  });

  test('a part the design does not have is not pinned', async () => {
    const engine = standInEngine({ capacitors: [cap('Cin', 1e-5)] });
    await khRunAtEachInputVoltage(engine.call, 'flyback', BASE_DC, 'analytical');
    for (const spec of engine.specs.slice(1)) {
      expect(spec.config?.outputCapacitance).toBeUndefined();
      expect(spec.config?.snubberCap).toBeUndefined();
    }
  });

  test('a design with an output capacitor on some outputs only throws', async () => {
    const engine = standInEngine({ capacitors: [cap('Cout', 8e-5)] });
    await expect(khRunAtEachInputVoltage(engine.call, 'flyback', TWO_RAILS, 'analytical'))
      .rejects.toThrow(/reports capacitors Cout but has 2 outputs; expected one Cout per output/);
  });

  test('a listed part without a value throws', async () => {
    const engine = standInEngine({ inductors: [ind('L2', null)], capacitors: [cap('Cs', 1e-5)] });
    await expect(khRunAtEachInputVoltage(engine.call, 'sepic', BASE_DC, 'analytical'))
      .rejects.toThrow(/the design lists inductor L2 with no inductance \(got null\)/);
  });

  test('energy-budget snubbers of different values cannot share one pin: it throws', async () => {
    const engine = standInEngine({ capacitors: [cap('Crc_pri', 1.24e-10), cap('CsnA_hi', 2.5e-10)] });
    await expect(khRunAtEachInputVoltage(engine.call, 'dab', BASE_DC, 'analytical'))
      .rejects.toThrow(/energy-budget snubbers differ \(Crc_pri 1\.24e-10, CsnA_hi 2\.5e-10\)/);
  });
});

// ── Turns ratios: pinned in the form the topology reads (ABT #2160) ─────────────────────────────
// Kirchhoff reports the main transformer's ratios per WINDING (diagnostics.magnetics[].turnsRatios) but each
// topology reads designRequirements.turnsRatios its own way (Kirchhoff src/<Topology>.cpp provided_turns_ratio).
// push_pull reads one ratio per output at index 1 + i while its transformer reports
// [1 (2nd primary half), (N_i, N_i) per output]; copying the report index for index made output 2 read
// output 1's second half, so the Min./Max. points came back with another converter.
const transformer = (windings, turnsRatios) => [{ name: 'T1', isMain: true, windings, magnetizingInductance: 1.44e-4, turnsRatios }];
const railsAt = (volts, amps) => ({ ...BASE_DC, operatingPoints: [{ outputVoltages: volts, outputCurrents: amps, switchingFrequency: 100000 }] });
const TURNS_RATIO_CASES = [
  { name: 'push_pull, 2 outputs: one ratio per output after the 2nd primary half', topology: 'push_pull',
    params: railsAt([12, 5], [1, 2]), magnetics: transformer(6, [1, 1.51, 1.51, 3.37, 3.37]), sent: [1, 1.51, 3.37] },
  { name: 'push_pull, 3 outputs: one ratio per output after the 2nd primary half', topology: 'push_pull',
    params: railsAt([12, 5, 3.3], [1, 2, 1]), magnetics: transformer(8, [1, 1.51, 1.51, 3.37, 3.37, 4.8, 4.8]), sent: [1, 1.51, 3.37, 4.8] },
  // Topologies that read the per-winding list itself keep it verbatim (llc reads output i at 2*i on a
  // centre-tapped rectifier, Llc.cpp; forward reads 1 + i after the demag winding, Forward.cpp).
  { name: 'llc, 2 centre-tapped outputs: the per-winding list as reported', topology: 'llc',
    params: railsAt([48, 24], [10, 2]), magnetics: transformer(5, [3.9, 3.9, 7.69, 7.69]), sent: [3.9, 3.9, 7.69, 7.69] },
  { name: 'forward, 2 outputs: the per-winding list as reported', topology: 'forward',
    params: railsAt([12, 5], [3, 1]), magnetics: transformer(4, [1, 1.3, 2.91]), sent: [1, 1.3, 2.91] },
];

test.describe('Kirchhoff turns ratios pinned as each topology reads them', () => {
  for (const { name, topology, params, magnetics, sent } of TURNS_RATIO_CASES) {
    test(name, async () => {
      const engine = standInEngine({ magnetics });
      await khRunAtEachInputVoltage(engine.call, topology, params, 'analytical');
      expect(engine.specs.length).toBe(3);
      for (const spec of engine.specs.slice(1)) {
        expect(spec.designRequirements.turnsRatios).toEqual(sent.map((n) => ({ nominal: n })));
      }
    });
  }

  test('push_pull: a point whose second output comes back with another ratio throws, naming the transformer', async () => {
    const design = { magnetics: transformer(6, [1, 1.51, 1.51, 3.37, 3.37]) };
    const engine = standInEngine(design, () => ({ magnetics: transformer(6, [1, 1.51, 1.51, 1.51, 1.51]) }));
    await expect(khRunAtEachInputVoltage(engine.call, 'push_pull', railsAt([12, 5], [1, 2]), 'analytical'))
      .rejects.toThrow(/Turns ratios of T1 is \[1, 1\.51, 1\.51, 3\.37, 3\.37\] in the design but \[1, 1\.51, 1\.51, 1\.51, 1\.51\] at Min\. input \(36 V\)/);
  });

  test('push_pull: a transformer whose windings do not split into one group per output throws', async () => {
    const engine = standInEngine({ magnetics: transformer(5, [1, 1.51, 1.51, 3.37]) });
    await expect(khRunAtEachInputVoltage(engine.call, 'push_pull', railsAt([12, 5], [1, 2]), 'analytical'))
      .rejects.toThrow(/T1 reports turns ratios \[1, 1\.51, 1\.51, 3\.37\]: 3 windings after the first 1 do not split into one group per output for 2 outputs/);
  });

  test('push_pull: an output whose two secondary halves differ cannot take one pin: it throws', async () => {
    const engine = standInEngine({ magnetics: transformer(6, [1, 1.51, 1.51, 3.37, 3.4]) });
    await expect(khRunAtEachInputVoltage(engine.call, 'push_pull', railsAt([12, 5], [1, 2]), 'analytical'))
      .rejects.toThrow(/T1 reports turns ratios \[3\.37, 3\.4\] for the windings of output 2, but the spec pins one turns ratio per output/);
  });
});
