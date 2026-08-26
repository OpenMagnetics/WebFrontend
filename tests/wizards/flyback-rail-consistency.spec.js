/**
 * tests/wizards/flyback-rail-consistency.spec.js
 *
 * Regression guard for ABT #914 (user report, 2026-08-26).
 *
 * Every secondary of a flyback shares one core, so the rails are NOT independent: each turns ratio
 * must give the same reflected voltage, n_i*(|V_i| + Vd) = Vor. In "I know the design I want" the
 * user supplies BOTH the rail voltage and the ratio, and the engine honours the RATIO
 * (req::provided_turns_ratio) — so an inconsistent pair silently designs a different converter than
 * the one described.
 *
 * The user hit exactly that: `turnsRatio` defaults to 8 and updateNumberOutputs() copies the previous
 * rail's values, so four rails all carried 8, their entered voltages were ignored, and every winding
 * came out at the same voltage — including the one they called "the 5 V rail", which their MAS shows
 * as a ~10.5 V winding.
 *
 * Driven at the component level on purpose: the assertion is about the validation rule, and going
 * through PrimeVue inputs made it fail for reasons unrelated to the rule.
 */
import { test, expect } from '../_coverage.js';
import { openWizard } from '../utils/index.js';

/** Set the wizard's design level + rails, run its validation, return the resulting error text. */
const validate = (page, designLevel, rails) => page.evaluate(([level, outputs]) => {
  let node = document.querySelector('[data-cy="FlybackWizard-OutputsParameters voltage-number-input"]');
  while (node && !node.__vueParentComponent) node = node.parentElement;
  let component = node?.__vueParentComponent;
  while (component && (component.type?.__name || component.type?.name) !== 'FlybackWizard') {
    component = component.parent;
  }
  if (!component) throw new Error('FlybackWizard component instance not found');
  const wizard = component.proxy;
  wizard.localData.designLevel = level;
  wizard.localData.outputsParameters = outputs;
  wizard.updateErrorMessage();
  return wizard.errorMessage;
}, [designLevel, rails]);

const I_KNOW = 'I know the design I want';
const HELP_ME = 'Help me with the design';

test.describe('Flyback rail consistency @scenario', () => {
  test('a rail whose turns ratio contradicts its voltage is reported, not silently redesigned',
    async ({ page }) => {
      test.setTimeout(300_000);
      await openWizard(page, 'Flyback-link');

      // The reported case: a 5 V rail left on the default ratio copied from the 12 V rail.
      const msg = await validate(page, I_KNOW, [
        { voltage: 12, current: 2, turnsRatio: 8 },
        { voltage: 5, current: 8, turnsRatio: 8 },
      ]);
      expect(msg).toMatch(/Output 2/);
      expect(msg, 'must say what the rail will actually be').toMatch(/12\.00 V, not the 5 V entered/);
      expect(msg, 'must offer the ratio that would honour the entered voltage').toMatch(/Use 17\.82 for 5 V/);
    });

  test('rails whose ratios agree on one reflected voltage raise nothing', async ({ page }) => {
    test.setTimeout(300_000);
    await openWizard(page, 'Flyback-link');
    expect(await validate(page, I_KNOW, [
      { voltage: 12, current: 2, turnsRatio: 8 },
      { voltage: 5, current: 8, turnsRatio: 17.82 },
    ])).toBe('');
  });

  test('a negative rail is judged on |V|, so it may share a positive rail’s ratio', async ({ page }) => {
    test.setTimeout(300_000);
    await openWizard(page, 'Flyback-link');
    // -12 V and +12 V reflect identically, so this pair IS consistent (ABT #904 rails).
    expect(await validate(page, I_KNOW, [
      { voltage: 12, current: 2, turnsRatio: 8 },
      { voltage: -12, current: 1, turnsRatio: 8 },
    ])).toBe('');
  });

  test('"Help me with the design" never complains — it has no turns-ratio input', async ({ page }) => {
    test.setTimeout(300_000);
    await openWizard(page, 'Flyback-link');
    expect(await validate(page, HELP_ME, [
      { voltage: 12, current: 2, turnsRatio: 8 },
      { voltage: 5, current: 8, turnsRatio: 8 },
    ])).toBe('');
  });
});
