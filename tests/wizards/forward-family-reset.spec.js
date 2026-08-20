/**
 * tests/wizards/forward-family-reset.spec.js
 *
 * Regression guard for the forward family's reset mechanism.
 *
 * Only the SINGLE-switch forward resets the core through a tertiary
 * demagnetization winding. The two-switch forward resets through its two clamp
 * diodes and the active-clamp forward through the clamp capacitor/FET — neither
 * has a demag winding, so neither may ever produce one.
 *
 * The bug this locks down: ForwardWizard.getSimulateFn() called
 * simulateForwardIdealWaveforms() for all three variants. `forward` is
 * kirchhoffRuntime's legacy alias for the SINGLE-switch topology, so clicking
 * "Simulated" on a Two-Switch / Active Clamp design returned three windings
 * (Primary / Demagnetization winding / Secondary 0) and turnsRatios[0] == 1,
 * and those results were merged straight into the MAS store.
 */
import { test, expect } from '../_coverage.js';
import { openWizard, runSimulated, runAnalytical, withPinia, clickDesignMagnetic } from '../utils/index.js';

const readWindings = (page) => withPinia(page, (pinia) => {
  const mas = pinia._s.get('mas').mas;
  return {
    excitationNames: (mas.inputs.operatingPoints?.[0]?.excitationsPerWinding || []).map(e => e.name),
    turnsRatios: mas.inputs.designRequirements?.turnsRatios || [],
    coilNames: (mas.magnetic?.coil?.functionalDescription || []).map(w => w.name),
    isolationSides: mas.inputs.designRequirements?.isolationSides || [],
  };
});

const hasDemag = (names) => names.some(n => /demag/i.test(String(n)));

for (const { key, linkCy, title } of [
  { key: 'two-switch-forward',  linkCy: 'TwoSwitchForward-link',  title: 'Two-Switch Forward' },
  { key: 'active-clamp-forward', linkCy: 'ActiveClampForward-link', title: 'Active Clamp Forward' },
]) {
  test.describe(`${key} reset mechanism @scenario`, () => {
    test(`${title} has no demagnetization winding (analytical and simulated)`, async ({ page }) => {
      await openWizard(page, linkCy);

      await runAnalytical(page);
      const analytical = await readWindings(page);
      expect(hasDemag(analytical.excitationNames), `analytical windings: ${JSON.stringify(analytical.excitationNames)}`).toBe(false);
      expect(analytical.excitationNames.length).toBe(2);
      expect(analytical.turnsRatios.length).toBe(1);

      await runSimulated(page);
      const simulated = await readWindings(page);
      expect(hasDemag(simulated.excitationNames), `simulated windings: ${JSON.stringify(simulated.excitationNames)}`).toBe(false);
      expect(simulated.excitationNames.length).toBe(2);
      expect(simulated.turnsRatios.length).toBe(1);

      // …and the design that reaches the Magnetic Tool carries the same two windings.
      await clickDesignMagnetic(page);
      const built = await readWindings(page);
      expect(hasDemag(built.coilNames), `coil windings: ${JSON.stringify(built.coilNames)}`).toBe(false);
      expect(built.coilNames.length).toBe(2);
      expect(built.isolationSides).toEqual(['primary', 'secondary']);
    });
  });
}

test.describe('single-switch-forward reset mechanism @scenario', () => {
  test('Single-Switch Forward keeps its demagnetization winding on the primary side', async ({ page }) => {
    await openWizard(page, 'SingleSwitchForward-link');
    await runAnalytical(page);

    const analytical = await readWindings(page);
    expect(hasDemag(analytical.excitationNames), `windings: ${JSON.stringify(analytical.excitationNames)}`).toBe(true);
    expect(analytical.excitationNames.length).toBe(3);

    await clickDesignMagnetic(page);
    const built = await readWindings(page);
    expect(built.coilNames.length).toBe(3);
    // The demag winding shares the primary's reference — it must not be labelled
    // `secondary`, which would also push the real secondary off the end of the list.
    expect(built.isolationSides).toEqual(['primary', 'primary', 'secondary']);
  });
});
