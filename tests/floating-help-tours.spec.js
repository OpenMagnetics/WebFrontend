/**
 * tests/floating-help-tours.spec.js
 *
 * Smoke tests for the FloatingHelpButton (ABT #163) on the views that do NOT
 * render the Header, and therefore have no Header help button:
 *   - the cross-referencer selection landing page
 *   - the core / shape / material cross referencers (and a Fair-Rite variant)
 *
 * Each test loads the view, clicks the floating help button, and asserts the
 * page tour opens with the expected first-step title and that a real anchored
 * step highlights a visible element (mirrors tests/help-tour.spec.js).
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

async function startFloatingTour(page) {
    const fab = page.locator('[data-cy="FloatingHelpButton"]');
    await fab.waitFor({ state: 'visible', timeout: 15000 });
    await fab.click();
    await page.waitForSelector('.driver-popover', { timeout: 5000 });
}

test.describe('floating help tours (cross referencers)', () => {
    test('selection landing: floating button opens the selection tour', async ({ page }) => {
        await page.goto(`${BASE_URL}/cross_referencer_selection`, { waitUntil: 'domcontentloaded' });
        await startFloatingTour(page);

        await expect(page.locator('.driver-popover-title')).toHaveText('Cross Referencer — pick your goal');
        await expect(page.locator('.driver-overlay')).toHaveCount(1);

        // Four steps: intro + one per substitution goal.
        const totalText = await page.locator('.driver-popover-progress-text').textContent();
        expect(Number(totalText.split(' of ')[1])).toBe(4);

        // Step 2 must anchor to a real, visible selection button.
        await page.click('.driver-popover-next-btn');
        await expect(page.locator('.driver-popover')).toBeVisible();
        await expect(page.locator('[data-cy="ToolSelection-core_cross_referencer-button"].driver-active-element'))
            .toBeVisible();
    });

    test('core cross referencer: floating button opens the core tour and anchors', async ({ page }) => {
        await page.goto(`${BASE_URL}/core_cross_referencer`, { waitUntil: 'domcontentloaded' });
        await startFloatingTour(page);

        await expect(page.locator('.driver-popover-title')).toHaveText('Core Cross Referencer');

        // Step 2 highlights the (always-present) inputs panel.
        await page.click('.driver-popover-next-btn');
        await expect(page.locator('[data-cy="CrossReferencer-inputs-panel"].driver-active-element'))
            .toBeVisible();
    });

    test('core shape cross referencer: floating button opens the shape tour', async ({ page }) => {
        await page.goto(`${BASE_URL}/core_shape_cross_referencer`, { waitUntil: 'domcontentloaded' });
        await startFloatingTour(page);
        await expect(page.locator('.driver-popover-title')).toHaveText('Core Shape Cross Referencer');
    });

    test('core material cross referencer: floating button opens the material tour', async ({ page }) => {
        await page.goto(`${BASE_URL}/core_material_cross_referencer`, { waitUntil: 'domcontentloaded' });
        await startFloatingTour(page);
        await expect(page.locator('.driver-popover-title')).toHaveText('Core Material Cross Referencer');
    });

    test('fair-rite core cross referencer reuses the core tour', async ({ page }) => {
        await page.goto(`${BASE_URL}/core_cross_referencer_fair_rite`, { waitUntil: 'domcontentloaded' });
        await startFloatingTour(page);
        await expect(page.locator('.driver-popover-title')).toHaveText('Core Cross Referencer');

        await page.click('.driver-popover-next-btn');
        await expect(page.locator('[data-cy="CrossReferencer-inputs-panel"].driver-active-element'))
            .toBeVisible();
    });

    test('escape closes the floating-button tour', async ({ page }) => {
        await page.goto(`${BASE_URL}/core_cross_referencer`, { waitUntil: 'domcontentloaded' });
        await startFloatingTour(page);
        await page.keyboard.press('Escape');
        await expect(page.locator('.driver-popover')).toHaveCount(0);
    });
});
