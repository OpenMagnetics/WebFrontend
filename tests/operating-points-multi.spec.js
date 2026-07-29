/**
 * tests/operating-points-multi.spec.js
 *
 * Regression for ABT #345 (user report 2026-07-29): adding a SECOND operating
 * point desynced the per-point mode bookkeeping, ran the FFT with an
 * undefined voltage waveform (WASM "Cannot pass non-string to std::string"
 * storm), and crashed the builder's induce() on `.dutyCycle` of undefined —
 * leaving the workflow stuck before Magnetic Builder.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

test.describe('operating points — second point', () => {
    test.describe.configure({ timeout: 180000 });

    test('add OP2, define manually, continue to builder: no console errors, OP selector populated', async ({ page }) => {
        const errors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });

        await page.goto(`${BASE_URL}/magnetic_tool`, { waitUntil: 'domcontentloaded' });
        await page.waitForURL('**/magnetic_tool', { timeout: 120000 });

        // Design requirements → operating points.
        await page.click('button:has-text("Continue")');
        await page.click('text=I will define it manually');
        await expect(page.locator('text=Switch to Harmonics view')).toBeVisible({ timeout: 20000 });

        // Add a SECOND operating point: it must ask for its mode (the old
        // index bug assigned the mode to the wrong slot).
        await page.click('button:has-text("Add New OP")');
        await expect(page.locator('text=Where do you want to import')).toBeVisible({ timeout: 10000 });
        await page.click('text=I will define it manually');
        await expect(page.locator('text=Switch to Harmonics view')).toBeVisible({ timeout: 20000 });

        // Continue into the Magnetic Builder.
        await page.click('button:has-text("Continue")');
        await expect(page.locator('button:has-text("Advise")').first()).toBeVisible({ timeout: 30000 });

        // The sidebar operating-point selector must show a real selection,
        // not an empty PrimeVue select.
        await expect(page.locator('[data-cy="MagneticBuilder-OperatingPointSelector-container"]'))
            .toContainText('Op. Point', { timeout: 15000 });

        // No engine/FFT/induce errors anywhere along the flow.
        expect(errors).toEqual([]);
    });
});
