/**
 * Dead time in the isolated buck family, "I know the design I want".
 *
 * - Isolated Buck: the Dead Time between its two switches reaches Kirchhoff as config.forcedDeadTime
 *   (s; Kirchhoff cfg::forced_dead_time), with the diode drop the wizard sends (config.diodeVoltageDrop).
 *   Before, kirchhoffRuntime threw on any non-zero dead time, so the wizard's default 100 ns failed.
 * - Isolated Buck-Boost: one switch and a diode, so no dead time: no Dead Time input, none sent, and a
 *   value that still arrives in the spec throws a plain message instead of being dropped.
 *
 * Checked on the request: what the wizard's buildParams() sends and the spec buildKhConverterSpec makes
 * of it. That Kirchhoff applies the dead time needs the libKirchhoff that takes it for isolated_buck.
 */
import { test, expect } from './_coverage.js';
import { openWizard, switchToIKnowMode } from './utils/index.js';
import { buildKhConverterSpec } from '../WebSharedComponents/assets/js/kirchhoffRuntime.js';

const BASE = {
  inputVoltage: { minimum: 36, maximum: 72 },
  switchingFrequency: 750000,
  diodeVoltageDrop: 0.7,
  efficiency: 0.9,
  desiredInductance: 10e-6,
  desiredTurnsRatios: [5, 5],
  operatingPoints: [{ outputVoltages: [10, 10], outputCurrents: [0.02, 0.1], switchingFrequency: 750000, ambientTemperature: 25 }],
};

test.describe('Dead time of the isolated buck family', () => {
  test('isolated_buck: the dead time reaches config.forcedDeadTime', () => {
    const spec = buildKhConverterSpec('isolated_buck', { ...BASE, desiredDeadTime: [100e-9] });
    expect(spec.config.forcedDeadTime).toBe(100e-9);
    expect(spec.config.diodeVoltageDrop).toBe(0.7);
    const zero = buildKhConverterSpec('isolated_buck', { ...BASE, desiredDeadTime: [0] });
    expect(zero.config.forcedDeadTime, 'zero is a dead time too').toBe(0);
    expect('forcedDeadTime' in buildKhConverterSpec('isolated_buck', BASE).config).toBe(false);
  });

  test('isolated_buck: a non-numeric or second dead time throws', () => {
    expect(() => buildKhConverterSpec('isolated_buck', { ...BASE, desiredDeadTime: ['abc'] })).toThrow(/desiredDeadTime for isolated_buck must be a number/);
    expect(() => buildKhConverterSpec('isolated_buck', { ...BASE, desiredDeadTime: [1e-7, 2e-7] })).toThrow(/takes one dead time/);
  });

  test('isolated_buck_boost: no forcedDeadTime, and a dead time that arrives throws', () => {
    const spec = buildKhConverterSpec('isolated_buck_boost', BASE);
    expect(spec.config == null || !('forcedDeadTime' in spec.config)).toBe(true);
    expect(() => buildKhConverterSpec('isolated_buck_boost', { ...BASE, desiredDeadTime: [100e-9] }))
      .toThrow('The Isolated Buck-Boost has no dead time to set: it has one switch and a diode. Remove the Dead Time value.');
  });

  for (const [link, label, topology, hasDeadTime] of [
    ['IsolatedBuck-link', 'IsolatedBuckWizard', 'isolated_buck', true],
    ['IsolatedBuckBoost-link', 'IsolatedBuckBoostWizard', 'isolated_buck_boost', false],
  ]) {
    test(`${label}: the request ${hasDeadTime ? 'carries' : 'carries no'} config.forcedDeadTime`, async ({ page }) => {
      test.setTimeout(120000);
      await openWizard(page, link);
      await switchToIKnowMode(page);
      await expect(page.locator(`[data-cy="${label}-DeadTime-number-input"]`), 'the Dead Time input').toHaveCount(hasDeadTime ? 1 : 0);
      const params = await page.evaluate(() => {
        const wizard = window.__omFindComponent('IsolatedBuckBoostWizard');
        if (!wizard) throw new Error('IsolatedBuckBoostWizard component instance not found in the page');
        return JSON.parse(JSON.stringify(wizard.buildParams('analytical')));
      });
      const spec = buildKhConverterSpec(topology, params);
      if (hasDeadTime) {
        expect(params.desiredDeadTime).toEqual([100e-9]);
        expect(spec.config.forcedDeadTime).toBe(100e-9);
        expect(spec.config.diodeVoltageDrop).toBe(0.7);
      }
      else {
        expect('desiredDeadTime' in params).toBe(false);
        expect(spec.config == null || !('forcedDeadTime' in spec.config)).toBe(true);
      }
    });
  }
});
