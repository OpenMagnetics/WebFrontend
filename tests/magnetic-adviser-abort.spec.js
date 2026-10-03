/**
 * tests/magnetic-adviser-abort.spec.js
 *
 * An adviser search the engine watchdog aborts must tell the user why, where the results go.
 *
 * The Magnetic Adviser's calls run under the MKF worker watchdog (WebSharedComponents
 * mkfRuntime.js, 600 s budget for the adviser calls, ABT #1542). When it fired, or when the engine
 * restarted under a running search, the page showed only "No Results Yet" and the reason went to
 * the console, so an aborted search looked exactly like one that had not been started.
 *
 * This drives the real path — flyback wizard -> Design Magnetic -> builder -> Magnetic Adviser ->
 * Get Advised Magnetics — against the real engine. The default flyback search takes minutes, so it
 * is still running when the page clock is moved past the 600 s budget; the real watchdog then
 * aborts it and restarts the engine worker. Nothing in the app is stubbed.
 */
import { test, expect } from './_coverage.js';
import { openWizard, waitForAnalyticalDone, clickDesignMagnetic } from './utils/index.js';

const ADVISER_LABEL = 'MagneticBuilder-MagneticAdviser';

test.describe('Magnetic Adviser: an aborted search says why', () => {
  test('the watchdog aborting the search shows the reason instead of "No Results Yet"', async ({ page }) => {
    test.setTimeout(300_000);

    // Record when the adviser call is actually posted to the engine worker. The runtime queues
    // calls and arms a call's watchdog just before posting it, so once the post is seen the
    // 600 s timer exists and moving the clock past it fires it.
    await page.addInitScript(() => {
      window.__adviserCallPosted = false;
      const post = Worker.prototype.postMessage;
      Worker.prototype.postMessage = function (message, ...rest) {
        if (JSON.stringify(message).includes('calculate_advised_magnetics')) window.__adviserCallPosted = true;
        return post.call(this, message, ...rest);
      };
    });
    // Fake timers that flow in real time until fast-forwarded; installed before the app loads so
    // the watchdog's setTimeout is one the test can advance.
    await page.clock.install();

    await openWizard(page, 'Flyback-link');
    await waitForAnalyticalDone(page, 120_000);
    await clickDesignMagnetic(page);

    const entry = page.locator('[data-cy$="-magnetics-adviser-button"]').first();
    await entry.waitFor({ state: 'visible', timeout: 15_000 });
    await entry.click();

    const errorNote = page.locator(`[data-cy="${ADVISER_LABEL}-adviser-error"]`);
    await expect(errorNote, 'no error before a search has run').toHaveCount(0);

    await page.locator(`[data-cy="${ADVISER_LABEL}-calculate-mas-advises-button"]`).click();
    await page.locator('[data-cy="magneticAdviser-loading"]').waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForFunction(() => window.__adviserCallPosted === true, null, { timeout: 60_000 });
    // Still searching: the abort below is the watchdog's, not a search that finished.
    await expect(page.locator('[data-cy="magneticAdviser-loading"]')).toBeVisible();

    await page.clock.fastForward('10:01');

    await expect(errorNote).toBeVisible({ timeout: 30_000 });
    await expect(errorNote).toHaveText(
      'The adviser was stopped after 600 s without finishing — try narrower requirements or run it again.');
    await expect(page.getByText('No Results Yet'), 'the empty state must not replace the reason').toHaveCount(0);
    await expect(page.locator('[data-cy="magneticAdviser-loading"]')).toHaveCount(0);
    // Themed, not hard-coded: the note is drawn in the theme's danger colour.
    const colours = await errorNote.evaluate((el) => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--p-danger)';
      el.appendChild(probe);
      const danger = getComputedStyle(probe).color;
      probe.remove();
      return { note: getComputedStyle(el).color, danger };
    });
    expect(colours.note).toBe(colours.danger);
  });
});
