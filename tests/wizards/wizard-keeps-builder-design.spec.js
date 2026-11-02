/**
 * tests/wizards/wizard-keeps-builder-design.spec.js
 *
 * Regression guard for a user report (2026-11-02): "I need to go often forwards and backwards
 * between the dashboard (to calculate the converter and L) and the back-end where the physical
 * parameters are shown".
 *
 * Two defects made that round trip lose work:
 *   1. Opening a wizard silently REPLACED the builder's design requirements and operating points.
 *      Every wizard run, including the automatic one a wizard makes on mount with its defaults,
 *      wrote its result into the shared MAS store. A finished magnetic then sat in the builder
 *      against a spec the user never entered (prod: RM 7 N designed at 200 kHz / 319 uH came back
 *      as 100 kHz / 1.275 mH after a look at the Flyback wizard).
 *   2. The wizard forgot what the user typed: every mount started from the defaults.
 *
 * Locks down: a wizard writes the design ONLY on "Design Magnetic" / "Review Specs", and a wizard
 * reopens with the inputs it was left with.
 */
import { test, expect } from '../_coverage.js';
import { openWizard, runAnalytical, clickDesignMagnetic, withPinia } from '../utils/index.js';

const FREQUENCY_CY = 'FlybackWizard-SwitchingFrequency-number-input';

async function typeInto(page, cy, value) {
  const input = page.locator(`[data-cy="${cy}"] input`).first();
  await input.waitFor({ state: 'visible', timeout: 15000 });
  await input.click();
  await input.press('Control+a');
  await input.type(String(value), { delay: 40 });
  await input.press('Tab');
}

const readDesign = (page) => withPinia(page, (pinia) => {
  const mas = pinia._s.get('mas').mas;
  return JSON.parse(JSON.stringify({
    frequency: mas.inputs.operatingPoints[0].excitationsPerWinding[0].frequency,
    magnetizingInductance: mas.inputs.designRequirements.magnetizingInductance?.nominal ?? null,
    turnsRatios: (mas.inputs.designRequirements.turnsRatios || []).map((t) => t.nominal),
    numberOperatingPoints: mas.inputs.operatingPoints.length,
  }));
});

/** Wait until the freshly mounted wizard has finished its own automatic run. */
async function waitForWizardAutoRun(page) {
  await page.waitForFunction(() => {
    const wizard = window.__omFindComponent('FlybackWizard');
    return wizard && !wizard.simulatingWaveforms && (wizard.simulatedOperatingPoints?.length ?? 0) > 0;
  }, null, { timeout: 60000 });
}

test.describe('wizard ⇄ builder round trip @scenario', () => {
  // Two cold engine loads plus a Design Magnetic hand-off per test.
  test.beforeEach(() => test.setTimeout(300_000));

  test('opening a wizard leaves the builder design alone, and the wizard keeps its inputs', async ({ page }) => {
    await openWizard(page, 'Flyback-link');
    await typeInto(page, FREQUENCY_CY, 200);
    await runAnalytical(page);
    await clickDesignMagnetic(page);

    const designed = await readDesign(page);
    expect(designed.frequency).toBe(200000);

    // Back to the wizard (openWizard reloads the app from /, as a returning user would).
    await openWizard(page, 'Flyback-link');
    await waitForWizardAutoRun(page);

    // The wizard really ran (so the check below is not vacuous)...
    const wizardRun = await page.evaluate(() => {
      const wizard = window.__omFindComponent('FlybackWizard');
      return wizard.simulatedOperatingPoints[0].excitationsPerWinding[0].frequency;
    });
    // ...with the inputs it was left with, not its defaults...
    expect(wizardRun).toBe(200000);
    await expect(page.locator(`[data-cy="${FREQUENCY_CY}"] input`).first()).toHaveValue('200');

    // ...and the builder's design is untouched.
    expect(await readDesign(page)).toEqual(designed);
  });

  test('a wizard preview run does not touch the builder design', async ({ page }) => {
    await openWizard(page, 'Flyback-link');
    await waitForWizardAutoRun(page);
    await clickDesignMagnetic(page);
    const designed = await readDesign(page);

    await openWizard(page, 'Flyback-link');
    await waitForWizardAutoRun(page);
    await typeInto(page, FREQUENCY_CY, 150);
    await runAnalytical(page);
    const previewed = await page.evaluate(() =>
      window.__omFindComponent('FlybackWizard').simulatedOperatingPoints[0].excitationsPerWinding[0].frequency);
    expect(previewed).toBe(150000);

    expect(await readDesign(page)).toEqual(designed);
  });
});
