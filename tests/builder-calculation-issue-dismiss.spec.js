/**
 * A builder calculation that fails (e.g. "Exception: No coil found" after Advise all) is an ERROR
 * record of the 'Builder' in the Engine log, not a banner over the cards (Alf, 2026-10-22; it used
 * to be a dismissable "Calculation issue" banner). A failure that repeats while still unsolved is
 * one record; after a success of the same action, the next failure is recorded again.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';
import { engineLogRecords } from './utils/index.js';

const FIXTURE = new URL('./fixtures/04_forward_xfmr_e3216_n87.json', import.meta.url).pathname;

async function report(page, success, message) {
    await page.evaluate(([ok, text]) => {
        const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
        // The action Advise all reports through, with the builder's (success, message) convention.
        pinia._s.get('magneticBuilderTaskQueue').allWiresAdvised(ok, text);
    }, [success, message]);
}

const noCoilRecords = async (page) => (await engineLogRecords(page, { source: 'Builder', level: 'ERROR' })).filter((r) => r.message.includes('No coil found'));

test('CALCISSUE-1: a calculation failure is a Builder error in the Engine log, recorded again after it was solved', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
    await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
    await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
    await page.evaluate(() => {
        document.querySelector('#app').__vue_app__.config.globalProperties.$stateStore.setCurrentToolSubsection('magneticBuilder');
    });
    await expect(page.locator('[data-cy$="-Core-Advise-button"]').first()).toBeVisible({ timeout: 30000 });

    await report(page, false, 'Exception: No coil found');
    await expect.poll(() => noCoilRecords(page)).toEqual([{ level: 'ERROR', module: 'Builder', message: 'Exception: No coil found', count: 1 }]);
    await expect(page.locator('[data-cy$="-CalculationIssue"]'), 'no banner over the cards').toHaveCount(0);

    // Still unsolved: the same failure is not recorded twice.
    await report(page, false, 'Exception: No coil found');
    expect((await noCoilRecords(page)).map((r) => r.count)).toEqual([1]);

    // Solved, then failing again: recorded again.
    await report(page, true, []);
    await report(page, false, 'Exception: No coil found');
    await expect.poll(async () => (await noCoilRecords(page)).reduce((n, r) => n + r.count, 0)).toBe(2);
});
