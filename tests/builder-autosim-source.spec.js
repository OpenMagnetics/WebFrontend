/**
 * Auto-simulation had two copies: the builder simulates by its own
 * magneticBuilderSettings store, while the Settings switch and the Resimulate
 * button read the global settings store. When they disagreed the builder sat
 * Outdated with no Resimulate button and the switch said "on". Both now read
 * the store the builder honours.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

const FIXTURE = new URL('./fixtures/04_forward_xfmr_e3216_n87.json', import.meta.url).pathname;

test('AUTOSIM-1: with the builder not auto-simulating, Resimulate is offered and brings Core Info up to date', async ({ page }) => {
    test.setTimeout(180000);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
    await page.locator('[data-cy="Header-Load-MAS-file-button"]').waitFor({ state: 'attached', timeout: 20000 });
    // The diverged state: the builder's copy off, the global copy still on.
    await page.evaluate(() => {
        const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
        pinia._s.get('settings').magneticBuilderSettings.enableAutoSimulation = true;
        const mbs = pinia._s.get('magneticBuilderSettings');
        if (!mbs) throw new Error('magneticBuilderSettings store is not mounted');
        mbs.enableAutoSimulation = false;
    });
    await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
    await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
    await page.evaluate(() => {
        document.querySelector('#app').__vue_app__.config.globalProperties.$stateStore.setCurrentToolSubsection('magneticBuilder');
    });

    const badge = page.locator('.coreinfo-outdated-badge');
    await expect(badge).toBeVisible({ timeout: 60000 });
    const resimulate = page.locator('[data-cy$="resimulate-button"]').first();
    await expect(resimulate, 'the builder is not auto-simulating, so Resimulate must be offered').toBeVisible();
    await resimulate.click();
    await expect(badge).toHaveCount(0, { timeout: 60000 });
});
