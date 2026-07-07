/**
 * tests/help-tour.spec.js
 *
 * Smoke tests for the guided-tour system (Help button in the header →
 * driver.js overlay with per-view steps, defined in src/tours/).
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

async function startTour(page) {
    await page.click('[data-cy="Header-help-tour-button"]');
    await page.waitForSelector('.driver-popover', { timeout: 5000 });
}

test.describe('help tour', () => {
    test('home: help button starts the tour and steps through it', async ({ page }) => {
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('[data-cy="Header-help-tour-button"]', { timeout: 15000 });

        // First-visit pulse present before the first run, gone after.
        const pulsedBefore = await page.locator('[data-cy="Header-help-tour-button"].om-help-pulse').count();

        await startTour(page);
        await expect(page.locator('.driver-popover-title')).toHaveText('Welcome to OpenMagnetics!');
        // Overlay darkens the page.
        await expect(page.locator('.driver-overlay')).toHaveCount(1);

        // Walk every step to the end; each step must keep a visible popover.
        const progress = page.locator('.driver-popover-progress-text');
        const totalText = await progress.textContent();
        const total = Number(totalText.split(' of ')[1]);
        expect(total).toBeGreaterThanOrEqual(3);
        for (let i = 1; i < total; i++) {
            await page.click('.driver-popover-next-btn');
            await expect(page.locator('.driver-popover')).toBeVisible();
        }
        // Last step: the next button reads "Done" and closes the tour.
        await page.click('.driver-popover-next-btn');
        await expect(page.locator('.driver-popover')).toHaveCount(0);
        await expect(page.locator('.driver-overlay')).toHaveCount(0);

        // Pulse is dismissed after the first tour run (persisted flag).
        if (pulsedBefore > 0) {
            await expect(page.locator('[data-cy="Header-help-tour-button"].om-help-pulse')).toHaveCount(0);
        }
    });

    test('escape closes the tour', async ({ page }) => {
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('[data-cy="Header-help-tour-button"]', { timeout: 15000 });
        await startTour(page);
        await page.keyboard.press('Escape');
        await expect(page.locator('.driver-popover')).toHaveCount(0);
    });

    test('wizards landing gets its own tour', async ({ page }) => {
        await page.goto(`${BASE_URL}/wizards_landing`, { waitUntil: 'domcontentloaded' });
        // Cold contexts trampoline through /engine_loader first; wait for the
        // actual landing page (route name drives which tour opens).
        await page.waitForURL('**/wizards_landing', { timeout: 120000 });
        await page.waitForSelector('.card', { timeout: 30000 });
        await startTour(page);
        await expect(page.locator('.driver-popover-title')).toHaveText('Design Wizards');
    });

    test('insulation adviser gets its own tour', async ({ page }) => {
        await page.goto(`${BASE_URL}/insulation_adviser`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('[data-cy="Header-help-tour-button"]', { timeout: 15000 });
        // The ia-cards render after the engine store settles; anchor on one.
        await page.waitForSelector('.ia-card', { timeout: 30000 });
        await startTour(page);
        await expect(page.locator('.driver-popover-title')).toHaveText('Insulation Coordinator');
        const totalText = await page.locator('.driver-popover-progress-text').textContent();
        expect(Number(totalText.split(' of ')[1])).toBeGreaterThanOrEqual(3);
    });
});
