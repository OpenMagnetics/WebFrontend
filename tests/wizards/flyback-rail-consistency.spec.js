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
 * The fix has two halves: dependent ratios are DERIVED as the user types a rail voltage, so the
 * common case is simply correct; and a ratio the user edits deliberately is respected but reported
 * if it contradicts its voltage (turns are integers in practice, so accepting a slightly different
 * rail voltage is a legitimate choice — silently designing a different converter is not).
 *
 * Driven at the component level on purpose: the assertions are about those rules, and going through
 * PrimeVue inputs made them fail for reasons unrelated to the rules.
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

/** Set rails, fire the wizard's own update handler for one field, return {rails, error}. */
const edit = (page, rails, dimension, index) => page.evaluate(([outputs, dim, i]) => {
  let node = document.querySelector('[data-cy="FlybackWizard-OutputsParameters voltage-number-input"]');
  while (node && !node.__vueParentComponent) node = node.parentElement;
  let component = node?.__vueParentComponent;
  while (component && (component.type?.__name || component.type?.name) !== 'FlybackWizard') {
    component = component.parent;
  }
  if (!component) throw new Error('FlybackWizard component instance not found');
  const wizard = component.proxy;
  wizard.localData.designLevel = 'I know the design I want';
  wizard.localData.outputsParameters = outputs;
  wizard.onOutputParameterUpdate({ dimension: dim }, i);
  return JSON.parse(JSON.stringify({
    ratios: wizard.localData.outputsParameters.map((o) => o.turnsRatio),
    error: wizard.errorMessage,
  }));
}, [rails, dimension, index]);

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

test.describe('Flyback dependent turns ratios @scenario', () => {
  test('entering a rail voltage derives that rail’s ratio, so the default case is correct',
    async ({ page }) => {
      test.setTimeout(300_000);
      await openWizard(page, 'Flyback-link');
      // The reported case: a 5 V rail still carrying the ratio copied from the 12 V rail.
      const r = await edit(page, [
        { voltage: 12, current: 2, turnsRatio: 8 },
        { voltage: 5, current: 8, turnsRatio: 8 },
      ], 'voltage', 1);
      expect(r.ratios[1], '5 V must derive its own ratio, not inherit 8').toBeCloseTo(17.82, 2);
      expect(r.error, 'a derived design is consistent, so nothing to report').toBe('');
    });

  test('changing the main rail moves Vor, and the dependent rails follow', async ({ page }) => {
    test.setTimeout(300_000);
    await openWizard(page, 'Flyback-link');
    const r = await edit(page, [
      { voltage: 24, current: 2, turnsRatio: 8 },
      { voltage: 5, current: 8, turnsRatio: 17.82 },
    ], 'voltage', 0);
    expect(r.ratios[1]).toBeCloseTo(34.67, 2);
    expect(r.error).toBe('');
  });

  test('a ratio the user edits deliberately is kept, and reported if it contradicts its voltage',
    async ({ page }) => {
      test.setTimeout(300_000);
      await openWizard(page, 'Flyback-link');
      const r = await edit(page, [
        { voltage: 24, current: 2, turnsRatio: 8 },
        { voltage: 5, current: 8, turnsRatio: 8 },
      ], 'turnsRatio', 1);
      expect(r.ratios[1], 'a deliberate edit must not be overwritten').toBe(8);
      expect(r.error).toMatch(/Output 2/);
      expect(r.error).toMatch(/not the 5 V entered/);
    });
});
