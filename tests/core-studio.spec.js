/**
 * tests/core-studio.spec.js
 *
 * Smoke tests for the Core Studio (/core_studio): authoring core shapes,
 * materials and cores in MAS format, validated through the WASM engine.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

async function openCoreStudio(page) {
    await page.goto(`${BASE_URL}/core_studio`, { waitUntil: 'domcontentloaded' });
    // Cold contexts trampoline through /engine_loader (WASM init).
    await page.waitForURL('**/core_studio', { timeout: 120000 });
    await page.waitForSelector('[data-cy="CoreStudio-title"]', { timeout: 30000 });
}

test.describe('core studio', () => {
    test.describe.configure({ timeout: 180000 });

    test('reachable from the header Tools dropdown', async ({ page }) => {
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('a.dropdown-toggle.om-nav-btn', { timeout: 15000 });
        // Re-click until the dropdown is actually open — guards against the
        // click landing before Vue has attached the toggle handler.
        await expect(async () => {
            await page.click('a.dropdown-toggle.om-nav-btn');
            await expect(page.locator('[data-cy="Header-core-studio-link"]')).toBeVisible({ timeout: 1500 });
        }).toPass({ timeout: 20000 });
        await page.click('[data-cy="Header-core-studio-link"]');
        await page.waitForURL('**/core_studio', { timeout: 120000 });
        await expect(page.locator('[data-cy="CoreStudio-title"]')).toHaveText('Core Studio');
    });

    test('shape flow: template loads, engine validates, effective parameters shown', async ({ page }) => {
        await openCoreStudio(page);

        // Families and templates populate from the engine.
        const familySelect = page.locator('[data-cy="CoreStudio-shape-family-select"]');
        await expect(async () => {
            expect(await familySelect.locator('option').count()).toBeGreaterThan(5);
        }).toPass({ timeout: 30000 });

        await familySelect.selectOption('e');
        const templateSelect = page.locator('[data-cy="CoreStudio-shape-template-select"]');
        await expect(async () => {
            expect(await templateSelect.locator('option').count()).toBeGreaterThan(5);
        }).toPass({ timeout: 15000 });
        await templateSelect.selectOption('E 25/13/7');
        await page.click('[data-cy="CoreStudio-shape-load-button"]');

        // Dimension grid appears with editable bounds.
        await page.waitForSelector('[data-cy^="CoreStudio-shape-dim-"]', { timeout: 15000 });

        // Name it and validate through the engine.
        await page.fill('[data-cy="CoreStudio-shape-name-input"]', 'E 25/13/7 SpecTest');
        await page.click('[data-cy="CoreStudio-shape-validate-button"]');
        const results = page.locator('[data-cy="CoreStudio-shape-results"]');
        await expect(results).toBeVisible({ timeout: 30000 });
        // E 25/13/7 effective area is ~52 mm² — assert the engine returned a
        // plausible number, not just any render.
        const text = await results.innerText();
        const ae = parseFloat(text.match(/([\d.]+)\s*mm²/)[1]);
        expect(ae).toBeGreaterThan(40);
        expect(ae).toBeLessThan(65);
    });

    test('material from zero: engine round-trip accepts a steinmetz material', async ({ page }) => {
        await openCoreStudio(page);
        await page.click('[data-cy="CoreStudio-tab-material"]');
        await page.click('[data-cy="CoreStudio-material-blank-button"]');

        await page.fill('[data-cy="CoreStudio-material-name-input"]', 'SpecMat 01');
        await page.fill('[data-cy="CoreStudio-material-mfr-input"]', 'Spec Co');
        await page.fill('[data-cy="CoreStudio-material-mu-input"]', '2200');
        await page.fill('[data-cy="CoreStudio-material-bsat-input"]', '0.39');
        await page.fill('[data-cy="CoreStudio-material-resistivity-input"]', '5');
        await page.locator('[data-cy="CoreStudio-material-resistivity-input"]').press('Tab');
        await page.fill('[data-cy="CoreStudio-material-steinmetz-0-k"]', '1.54');
        await page.fill('[data-cy="CoreStudio-material-steinmetz-0-alpha"]', '1.46');
        await page.fill('[data-cy="CoreStudio-material-steinmetz-0-beta"]', '2.86');

        await page.click('[data-cy="CoreStudio-material-validate-button"]');
        const results = page.locator('[data-cy="CoreStudio-material-results"]');
        await expect(results).toBeVisible({ timeout: 30000 });
        await expect(results).toContainText('2200');
        await expect(results).toContainText('steinmetz');
    });
});
