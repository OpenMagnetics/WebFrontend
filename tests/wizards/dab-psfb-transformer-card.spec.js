/**
 * tests/wizards/dab-psfb-transformer-card.spec.js
 *
 * ABT #1541. In "I know the design I want" the DAB and PSFB Transformer card carried a turns-ratio
 * input (localData.turnsRatio) that buildParams never sent: the engine gets desiredTurnsRatios from
 * the per-output ratios only. A field the engine ignores looks like a design input, so it was removed.
 *
 * The same field was also the silent fallback for simulatedTurnsRatios when a run came back without
 * designRequirements.turnsRatios. That now throws instead (no default), and the ratios the wizard
 * keeps are the engine's own.
 */
import { test, expect } from '../_coverage.js';
import { openWizard, runAnalytical } from '../utils/index.js';

const I_KNOW = 'I know the design I want';

for (const { key, link, component } of [
  { key: 'DAB', link: 'Dab-link', component: 'DabWizard' },
  { key: 'PSFB', link: 'Psfb-link', component: 'PsfbWizard' },
]) {
  test.describe(`${key} Transformer card (ABT #1541) @scenario`, () => {
    test(`${key}: "I know the design" has no Transformer-card turns ratio; the per-output ratio drives the run`,
      async ({ page }) => {
        test.setTimeout(300_000);
        await openWizard(page, link);
        await page.evaluate(([name, level]) => {
          const wizard = window.__omFindComponent(name);
          if (!wizard) throw new Error(`${name} component instance not found`);
          wizard.localData.designMode = level;
        }, [component, I_KNOW]);

        // The card is there (its magnetizing-inductance field renders) ...
        await expect(page.locator(`[data-cy="${component}-MagnetizingInductance-container"]`)).toBeVisible();
        // ... without the removed field, and nothing is left in localData for it.
        await expect(page.locator(`[data-cy="${component}-TurnsRatio-container"]`)).toHaveCount(0);
        expect(await page.evaluate((name) =>
          Object.prototype.hasOwnProperty.call(window.__omFindComponent(name).localData, 'turnsRatio'), component))
          .toBe(false);

        // The per-output ratio is what the engine is asked for, and what comes back.
        const perOutput = await page.evaluate((name) => {
          const wizard = window.__omFindComponent(name);
          wizard.localData.outputsParameters[0].turnsRatio = 2.5;
          return wizard.buildParams('analytical').desiredTurnsRatios;
        }, component);
        expect(perOutput).toEqual([2.5]);
        await runAnalytical(page, 120_000);
        const got = await page.evaluate((name) => {
          const wizard = window.__omFindComponent(name);
          return { ratios: JSON.parse(JSON.stringify(wizard.simulatedTurnsRatios)), error: wizard.waveformError || '' };
        }, component);
        expect(got.error).toBe('');
        expect(got.ratios[0]).toBeCloseTo(2.5, 2);
      });

    test(`${key}: a result without designRequirements.turnsRatios throws, no fallback`, async ({ page }) => {
      test.setTimeout(300_000);
      await openWizard(page, link);
      const outcome = await page.evaluate((name) => {
        const wizard = window.__omFindComponent(name);
        const tryIt = (dr) => { try { return { value: wizard.turnsRatiosFromDesignRequirements(dr) }; } catch (e) { return { error: e.message }; } };
        return {
          missing: tryIt({}),
          noNominal: tryIt({ turnsRatios: [{ minimum: 1 }] }),
          ok: tryIt({ turnsRatios: [{ nominal: 3 }] }),
        };
      }, component);
      expect(outcome.missing.error).toMatch(/no designRequirements\.turnsRatios/);
      expect(outcome.noNominal.error).toMatch(/turnsRatios\[0\] has no nominal value/);
      expect(outcome.ok.value).toEqual([3]);
    });
  });
}
