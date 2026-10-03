/**
 * The builder's "Calculation issue" banner (e.g. "Exception: No coil found"
 * after Advise all) stayed until a later success of the same action; there
 * was no way to close it. It has an X that dismisses it until the next failure.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

const FIXTURE = new URL('./fixtures/04_forward_xfmr_e3216_n87.json', import.meta.url).pathname;

async function reportFailure(page, message) {
    await page.evaluate((text) => {
        const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
        // The action Advise all reports through, with the builder's (success, message) convention.
        pinia._s.get('magneticBuilderTaskQueue').allWiresAdvised(false, text);
    }, message);
}

test('CALCISSUE-1: the calculation issue banner can be dismissed and comes back on the next failure', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
    await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
    await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
    await page.evaluate(() => {
        document.querySelector('#app').__vue_app__.config.globalProperties.$stateStore.setCurrentToolSubsection('magneticBuilder');
    });
    await expect(page.locator('[data-cy$="-Core-Advise-button"]').first()).toBeVisible({ timeout: 30000 });

    const banner = page.locator('[data-cy$="-CalculationIssue"]');
    await reportFailure(page, 'Exception: No coil found');
    await expect(banner).toContainText('No coil found');

    await page.locator('[data-cy$="-CalculationIssue-dismiss"]').click();
    await expect(banner).toHaveCount(0);

    await reportFailure(page, 'Exception: No coil found');
    await expect(banner).toContainText('No coil found');
});
