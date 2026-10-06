/**
 * ABT #1652: core losses outside a material's fitted Steinmetz span. Extrapolation is ON by
 * default for manual work (decided with the maintainer) and persisted: the builder calculates
 * and the engine log reports every extrapolation as a warning. Switched off, the engine refuses
 * and the builder says why.
 *
 * Fixture: PQ 27/15 in material 95 (Steinmetz fitted 100-500 kHz) at 1 MHz.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

const FIXTURE = new URL('./fixtures/pq2715_95_1mhz_outside_steinmetz_span.json', import.meta.url).pathname;

async function openApp(page) {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
}

async function loadFixtureIntoBuilder(page) {
    await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
    await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
    await page.evaluate(() => {
        document.querySelector('#app').__vue_app__.config.globalProperties.$stateStore.setCurrentToolSubsection('magneticBuilder');
    });
    await expect(page.locator('[data-cy$="-Core-Advise-button"]').first()).toBeVisible({ timeout: 30000 });
}

const persistedChoice = (page) => page.evaluate(() =>
    document.querySelector('#app').__vue_app__.config.globalProperties.$settingsStore.magneticBuilderSettings.allowMaterialDataExtrapolation);

test.describe('Material data extrapolation (ABT #1652)', () => {
    test.describe.configure({ timeout: 180000 });

    test('EXTRAP-1: on by default, the builder calculates and the engine log names the extrapolated data', async ({ page }) => {
        await openApp(page);
        expect(await persistedChoice(page)).toBe(true);
        await loadFixtureIntoBuilder(page);
        // The log is reachable while extrapolation is allowed, even with the panel itself off,
        // and fills in as the engine reports (other warnings, e.g. catalogue aliases, may come first).
        await page.locator('[data-cy="EngineLogPanel-toggle"]').click({ timeout: 60000 });
        await expect(page.locator('[data-cy="EngineLogPanel-extrapolating"]')).toBeVisible();
        const record = page.locator('[data-cy="EngineLogPanel-record"]').filter({ hasText: 'Material 95' }).first();
        await expect(record).toBeVisible({ timeout: 120000 });
        await expect(record).toContainText('extrapolated');
        await expect(record).toContainText('1000000');
        await expect(page.locator('[data-cy$="-CalculationIssue"]').filter({ hasText: 'MATERIAL_FREQUENCY_OUT_OF_SPAN' })).toHaveCount(0);
    });

    test('EXTRAP-2: switched off (and kept off across a reload), the engine refuses and the builder says why', async ({ page }) => {
        await openApp(page);
        await page.evaluate(() => {
            document.querySelector('#app').__vue_app__.config.globalProperties.$settingsStore.magneticBuilderSettings.allowMaterialDataExtrapolation = false;
        });
        await openApp(page);
        expect(await persistedChoice(page)).toBe(false);
        await loadFixtureIntoBuilder(page);
        await expect(page.locator('[data-cy$="-CalculationIssue"]').filter({ hasText: 'MATERIAL_FREQUENCY_OUT_OF_SPAN' }).first()).toBeVisible({ timeout: 120000 });
    });
});
