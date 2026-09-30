/**
 * tests/wizards/stale-results.spec.js
 *
 * "Results out of date" state of the converter wizards (ABT #1520).
 *
 * A user reported an LLC at 90 V / 3.3 kW whose secondary read 4.05 A RMS — the exact numbers of a
 * 330 W run. The wizards keep the last run's waveforms and diagnostics on screen after an input
 * changes (and, after an engine throw, beside the error), with nothing to say they no longer answer
 * for the inputs the user now sees. ConverterWizardBase now compares the key of the displayed run
 * (the same JSON.stringify(buildParams('analytical')) key processWizardData reuses stored runs on,
 * ABT #1368/#1370) against the current inputs and, when they differ or the latest run threw:
 *   - shows [data-cy="wizard-results-stale-banner"],
 *   - greys the waveforms and the Diagnostics card (.results-stale),
 *   - disables "Design Magnetic" until a new run.
 */
import { test, expect } from '../_coverage.js';
import {
  openWizard, runAnalytical, waitForAnalyticalDone, WIZARD_CATALOG,
} from '../utils/index.js';

const banner = (page) => page.locator('[data-cy="wizard-results-stale-banner"]');
const waveformsResults = (page) => page.locator('[data-cy="wizard-waveforms-results"]');
const diagnosticsBody = (page) => page.locator('[data-cy="wizard-diagnostics-body"]');
const designMagnetic = (page) => page.locator('[data-cy="wizard-design-magnetic-button"]');

/** The <input> of a Dimension field (its data-cy sits on the InputNumber wrapper). */
const numberInput = (page, cy) => page.locator(`[data-cy="${cy}"] input`).first();

/** Type into a number field the way a user does (select all, type, Tab to commit). */
async function typeNumber(page, cy, value) {
  const input = numberInput(page, cy);
  await input.waitFor({ state: 'visible', timeout: 15_000 });
  await input.click();
  await input.press('Control+a');
  await input.type(String(value), { delay: 30 });
  await input.press('Tab');
  return input.inputValue();
}

/** State of the base component: which run the screen shows and why it is (not) stale. */
const readBase = (page) => page.evaluate(() => {
  const base = window.__omFindComponent('ConverterWizardBase');
  if (!base) throw new Error('ConverterWizardBase instance not found in the page');
  return JSON.parse(JSON.stringify({
    runs: base.resultsRunId,
    lastRunError: base.lastRunError,
    reason: base.resultsStaleReason,
  }));
});

async function expectCurrent(page, what) {
  await expect(banner(page), `${what}: no stale banner`).toHaveCount(0);
  await expect(waveformsResults(page), `${what}: waveforms not greyed`).not.toHaveClass(/results-stale/);
  if (await diagnosticsBody(page).count()) {
    await expect(diagnosticsBody(page), `${what}: diagnostics not greyed`).not.toHaveClass(/results-stale/);
  }
  await expect(designMagnetic(page), `${what}: Design Magnetic enabled`).toBeEnabled();
}

async function expectStale(page, reason, what) {
  await expect(banner(page), `${what}: stale banner shown`).toBeVisible();
  await expect(banner(page)).toHaveAttribute('data-stale-reason', reason);
  await expect(waveformsResults(page), `${what}: waveforms greyed`).toHaveClass(/results-stale/);
  await expect(diagnosticsBody(page), `${what}: diagnostics greyed`).toHaveClass(/results-stale/);
  await expect(designMagnetic(page), `${what}: Design Magnetic blocked`).toBeDisabled();
}

test.describe('Wizard results out of date (ABT #1520) @scenario', () => {
  test('LLC: changing the output power marks the results stale until a re-run', async ({ page }) => {
    test.setTimeout(240_000);
    await openWizard(page, 'Llc-link');
    await waitForAnalyticalDone(page, 120_000);
    // The mount-time run answers for the defaults.
    expect((await readBase(page)).runs).toBeGreaterThan(0);
    await expectCurrent(page, 'after the mount-time run');
    const rmsBefore = await page.locator('[data-cy="LlcWizard-KhDiagnostics-primaryRmsCurrent-value"]').innerText();

    await typeNumber(page, 'LlcWizard-OutputsParameters-0 power-number-input', 3300);
    // The field re-scales its display (3.3 kW); the wizard must hold 3300 W.
    expect(await page.evaluate(() => window.__omFindComponent('LlcWizard').localData.outputsParameters[0].power)).toBe(3300);
    await expectStale(page, 'changed', 'after changing the power');
    await expect(banner(page)).toContainText('Inputs changed');
    // What is on screen is still the old run — that is exactly why it must be marked.
    await expect(page.locator('[data-cy="LlcWizard-KhDiagnostics-primaryRmsCurrent-value"]')).toHaveText(rmsBefore);

    await runAnalytical(page, 120_000);
    await expectCurrent(page, 'after the re-run');
    await expect(page.locator('[data-cy="LlcWizard-KhDiagnostics-primaryRmsCurrent-value"]')).not.toHaveText(rmsBefore);
  });

  test('SRC: an engine throw never leaves the previous results looking current', async ({ page }) => {
    test.setTimeout(240_000);
    await openWizard(page, 'Src-link');
    await waitForAnalyticalDone(page, 120_000);
    await expectCurrent(page, 'after the mount-time run');

    // A design the engine genuinely refuses: "I know the design I want" forces the drive frequency
    // (ABT #1539), and 90 kHz is below the default 100 kHz series-tank resonance, where the tank input
    // is capacitive and the engine throws "below-resonance operation is not modelled". (This test
    // used an LLC with a pinned n = 3 that could not reach the output; since #1539 an I-know LLC is
    // driven at its Op. Frequency and returns whatever Vout the tank gives, so it no longer throws.)
    await page.evaluate(() => {
      const wizard = window.__omFindComponent('SrcWizard');
      if (!wizard) throw new Error('SrcWizard instance not found');
      Object.assign(wizard.localData, {
        designMode: 'I know the design I want',
        resonantFrequency: 100000,
        operatingSwitchingFrequency: 90000,
      });
    });
    await runAnalytical(page, 120_000);

    await expect(page.locator('.simulation-body .error-text'), 'the engine must throw for this design')
      .toContainText(/below-resonance operation is not modelled/);
    await expectStale(page, 'failed', 'after the engine throw');
    await expect(banner(page)).toContainText('The last run failed');
    expect((await readBase(page)).lastRunError).toMatch(/below-resonance operation is not modelled/);

    // Going back to a design that works and re-running clears it.
    await page.evaluate(() => {
      const wizard = window.__omFindComponent('SrcWizard');
      wizard.localData.operatingSwitchingFrequency = 120000;
    });
    await runAnalytical(page, 120_000);
    expect((await readBase(page)).lastRunError).toBe('');
    await expectCurrent(page, 'after a successful re-run');
  });

  test('Buck: changing the output current marks the results stale until a re-run', async ({ page }) => {
    test.setTimeout(240_000);
    await openWizard(page, 'Buck-link');
    await waitForAnalyticalDone(page, 120_000);
    await expectCurrent(page, 'after the mount-time run');

    const current = await numberInput(page, 'BuckWizard-OutputCurrent-number-input').inputValue();
    await typeNumber(page, 'BuckWizard-OutputCurrent-number-input', Number(current) * 2);
    await expectStale(page, 'changed', 'after changing the output current');

    await runAnalytical(page, 120_000);
    await expectCurrent(page, 'after the re-run');

    // Putting the value back is still a change against the run on screen.
    await typeNumber(page, 'BuckWizard-OutputCurrent-number-input', Number(current));
    await expectStale(page, 'changed', 'after restoring the output current');
  });

  test('Flyback: changing an output marks the results stale until a re-run', async ({ page }) => {
    test.setTimeout(240_000);
    await openWizard(page, 'Flyback-link');
    await waitForAnalyticalDone(page, 120_000);
    await expectCurrent(page, 'after the mount-time run');

    const cy = 'FlybackWizard-OutputsParameters current-number-input';
    const current = await numberInput(page, cy).inputValue();
    await typeNumber(page, cy, Number(current) * 2);
    await expectStale(page, 'changed', 'after changing the output current');

    await runAnalytical(page, 120_000);
    await expectCurrent(page, 'after the re-run');
  });
});

/**
 * No false alarm: a run whose inputs are still on screen must never be flagged. A wizard that
 * writes run results back into its inputs (so buildParams changes after every run) would show the
 * banner permanently — this sweep catches that on every wizard in the catalog.
 */
test.describe('Wizard results are current right after a run (ABT #1520) @scenario', () => {
  for (const wizard of WIZARD_CATALOG) {
    test(`${wizard.key}: no stale banner after an Analytical run`, async ({ page }) => {
      test.setTimeout(240_000);
      await openWizard(page, wizard.linkCy);
      await waitForAnalyticalDone(page, 120_000);
      await runAnalytical(page, 120_000);
      const state = await readBase(page);
      expect(state.lastRunError, `${wizard.key}: the default design must run`).toBe('');
      expect(state.runs, `${wizard.key}: a run must have produced results`).toBeGreaterThan(0);
      expect(state.reason, `${wizard.key}: results of the run just made must be current`).toBe('');
      await expectCurrent(page, wizard.key);
    });
  }
});
