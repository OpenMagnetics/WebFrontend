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

    test('shape from zero: family dimension letters generate and engine validates', async ({ page }) => {
        await openCoreStudio(page);
        const familySelect = page.locator('[data-cy="CoreStudio-shape-family-select"]');
        await expect(async () => {
            expect(await familySelect.locator('option').count()).toBeGreaterThan(5);
        }).toPass({ timeout: 30000 });
        await familySelect.selectOption('e');
        await page.click('[data-cy="CoreStudio-shape-blank-button"]');
        await page.waitForSelector('[data-cy="CoreStudio-shape-dim-A-nominal"]', { timeout: 15000 });

        await page.fill('[data-cy="CoreStudio-shape-name-input"]', 'E 20 ScratchSpec');
        const dims = { A: '20', B: '10', C: '5', D: '7', E: '14', F: '5' };
        for (const [key, value] of Object.entries(dims)) {
            const input = page.locator(`[data-cy="CoreStudio-shape-dim-${key}-nominal"]`);
            await input.fill(value);
            await input.press('Tab');
        }
        await page.click('[data-cy="CoreStudio-shape-validate-button"]');
        const results = page.locator('[data-cy="CoreStudio-shape-results"]');
        await expect(results).toBeVisible({ timeout: 30000 });
        const ae = parseFloat((await results.innerText()).match(/([\d.]+)\s*mm²/)[1]);
        expect(ae).toBeGreaterThan(10);
    });

    test('material curves: template curves visible, editable, removable; paste + engine round-trip (ABT #323)', async ({ page }) => {
        await openCoreStudio(page);
        await page.click('[data-cy="CoreStudio-tab-material"]');

        // Load 3C97 — a template with measured curves (complex μ, saturation …).
        const mfrSelect = page.locator('[data-cy="CoreStudio-material-manufacturer-select"]');
        await expect(async () => {
            expect(await mfrSelect.locator('option').count()).toBeGreaterThan(3);
        }).toPass({ timeout: 30000 });
        await mfrSelect.selectOption('Ferroxcube');
        const templateSelect = page.locator('[data-cy="CoreStudio-material-template-select"]');
        await expect(async () => {
            expect(await templateSelect.locator('option', { hasText: '3C97' }).count()).toBeGreaterThan(0);
        }).toPass({ timeout: 15000 });
        await templateSelect.selectOption('3C97');
        await page.click('[data-cy="CoreStudio-material-load-button"]');
        await page.waitForSelector('[data-cy="CoreStudio-material-curves"]', { timeout: 15000 });

        // Inherited curves are visible with their point counts — not silent.
        await expect(page.locator('[data-cy="CoreStudio-material-curve-permeability-complex-real-count"]')).not.toHaveText('not set');
        await expect(page.locator('[data-cy="CoreStudio-material-curve-permeability-initial-count"]')).toContainText('points');

        // Removing one half of the complex permeability removes BOTH halves
        // (a half-present complex block would be schema-invalid).
        await page.$eval('[data-cy="CoreStudio-material-curve-permeability-complex-real"]', (el) => { el.open = true; });
        await page.click('[data-cy="CoreStudio-material-curve-permeability-complex-real-remove"]');
        await expect(page.locator('[data-cy="CoreStudio-material-curve-permeability-complex-real-count"]')).toHaveText('not set');
        await expect(page.locator('[data-cy="CoreStudio-material-curve-permeability-complex-imaginary-count"]')).toHaveText('not set');

        // Paste a resistivity-vs-temperature table (datasheet style).
        await page.$eval('[data-cy="CoreStudio-material-curve-resistivity"]', (el) => { el.open = true; });
        await page.click('[data-cy="CoreStudio-material-curve-resistivity-paste"]');
        await page.fill('[data-cy="CoreStudio-material-curve-resistivity-paste-text"]', '8, 25\n5, 60\n3, 100');
        await page.click('[data-cy="CoreStudio-material-curve-resistivity-paste-apply"]');
        await expect(page.locator('[data-cy="CoreStudio-material-curve-resistivity-count"]')).toHaveText('3 points');

        // A malformed paste line is rejected with a specific error.
        await page.$eval('[data-cy="CoreStudio-material-curve-bhCycle"]', (el) => { el.open = true; });
        await page.click('[data-cy="CoreStudio-material-curve-bhCycle-paste"]');
        await page.fill('[data-cy="CoreStudio-material-curve-bhCycle-paste-text"]', '0.3, banana, 25');
        await page.click('[data-cy="CoreStudio-material-curve-bhCycle-paste-apply"]');
        await expect(page.locator('[data-cy="CoreStudio-material-curve-bhCycle-error"]')).toContainText('banana');

        // Engine round-trip still accepts the edited material.
        await page.fill('[data-cy="CoreStudio-material-name-input"]', '3C97 CurveSpec');
        await page.click('[data-cy="CoreStudio-material-validate-button"]');
        const results = page.locator('[data-cy="CoreStudio-material-results"]');
        await expect(results).toBeVisible({ timeout: 60000 });
        await expect(results).toContainText('8 Ω·m');
    });

    test('material from zero with a complex-μ curve: half-complex refused, full curve accepted (ABT #323)', async ({ page }) => {
        await openCoreStudio(page);
        await page.click('[data-cy="CoreStudio-tab-material"]');
        await page.click('[data-cy="CoreStudio-material-blank-button"]');

        await page.fill('[data-cy="CoreStudio-material-name-input"]', 'ScratchCurve 01');
        await page.fill('[data-cy="CoreStudio-material-mfr-input"]', 'Spec Co');
        await page.fill('[data-cy="CoreStudio-material-mu-input"]', '2200');
        await page.fill('[data-cy="CoreStudio-material-bsat-input"]', '0.39');
        await page.locator('[data-cy="CoreStudio-material-bsat-input"]').press('Tab');
        await page.fill('[data-cy="CoreStudio-material-resistivity-input"]', '5');
        await page.locator('[data-cy="CoreStudio-material-resistivity-input"]').press('Tab');
        await page.fill('[data-cy="CoreStudio-material-steinmetz-0-k"]', '1.54');
        await page.fill('[data-cy="CoreStudio-material-steinmetz-0-alpha"]', '1.46');
        await page.fill('[data-cy="CoreStudio-material-steinmetz-0-beta"]', '2.86');

        // μ′ alone must be refused loudly …
        await page.$eval('[data-cy="CoreStudio-material-curve-permeability-complex-real"]', (el) => { el.open = true; });
        await page.click('[data-cy="CoreStudio-material-curve-permeability-complex-real-paste"]');
        await page.fill('[data-cy="CoreStudio-material-curve-permeability-complex-real-paste-text"]', '2200 25 10000\n1800 25 100000\n900 25 1000000');
        await page.click('[data-cy="CoreStudio-material-curve-permeability-complex-real-paste-apply"]');
        await page.click('[data-cy="CoreStudio-material-validate-button"]');
        await expect(page.locator('[data-cy="CoreStudio-error"]')).toContainText('BOTH', { timeout: 30000 });

        // … and with μ″ added the engine round-trip accepts the material.
        await page.$eval('[data-cy="CoreStudio-material-curve-permeability-complex-imaginary"]', (el) => { el.open = true; });
        await page.click('[data-cy="CoreStudio-material-curve-permeability-complex-imaginary-paste"]');
        await page.fill('[data-cy="CoreStudio-material-curve-permeability-complex-imaginary-paste-text"]', '10 25 10000\n50 25 100000\n800 25 1000000');
        await page.click('[data-cy="CoreStudio-material-curve-permeability-complex-imaginary-paste-apply"]');
        await page.click('[data-cy="CoreStudio-material-validate-button"]');
        const results = page.locator('[data-cy="CoreStudio-material-results"]');
        await expect(results).toBeVisible({ timeout: 60000 });
        await expect(results).toContainText('2200');
    });

    test('material JSON import: full record loads, metadata editable, 1-point curve reads back its value (ABT #323/#339)', async ({ page }) => {
        await openCoreStudio(page);
        await page.click('[data-cy="CoreStudio-tab-material"]');

        // Load a complete MAS record through the JSON catch-all, with a
        // SINGLE-POINT initial-permeability curve — the exact shape that used
        // to read back mu_i = 1 from the engine (ABT #339).
        const record = {
            name: 'JsonSpec 01', type: 'custom', material: 'ferrite',
            manufacturerInfo: { name: 'Spec Co', status: 'prototype', reference: 'JS-01' },
            curieTemperature: 215, density: 4800,
            permeability: { initial: [{ value: 2200, temperature: 25 }] },
            saturation: [{ magneticFluxDensity: 0.39, magneticField: 1200, temperature: 25 }],
            resistivity: [{ value: 5, temperature: 25 }],
            volumetricLosses: { default: [{ method: 'steinmetz', ranges: [{ minimumFrequency: 1, maximumFrequency: 1000000, k: 1.54, alpha: 1.46, beta: 2.86, ct0: 1, ct1: 0, ct2: 0 }] }] },
            massLosses: { default: [{ method: 'magnetec' }] },
        };
        await page.click('[data-cy="CoreStudio-material-json-button"]');
        await page.fill('[data-cy="CoreStudio-material-json-text"]', JSON.stringify(record));
        await page.click('[data-cy="CoreStudio-material-json-apply"]');
        await page.waitForSelector('[data-cy="CoreStudio-material-curves"]', { timeout: 10000 });

        // Every-property surfaces: type, manufacturer status, massLosses.
        await expect(page.locator('[data-cy="CoreStudio-material-type-select"]')).toHaveValue('custom');
        await expect(page.locator('[data-cy="CoreStudio-material-mfr-status-select"]')).toHaveValue('prototype');
        await expect(page.locator('[data-cy="CoreStudio-material-masslosses-remove"]')).toBeVisible();
        await expect(page.locator('[data-cy="CoreStudio-material-curve-permeability-initial-count"]')).toHaveText('1 point');

        // Optional metadata fields write into the record.
        await page.fill('[data-cy="CoreStudio-material-family-input"]', 'Spec Family');
        await page.locator('[data-cy="CoreStudio-material-family-input"]').press('Tab');
        await page.selectOption('[data-cy="CoreStudio-material-composition-select"]', 'MnZn');

        // Engine round-trip: the 1-point curve must read back 2200, not 1.
        await page.click('[data-cy="CoreStudio-material-validate-button"]');
        const results = page.locator('[data-cy="CoreStudio-material-results"]');
        await expect(results).toBeVisible({ timeout: 60000 });
        await expect(results).toContainText('2200');
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
