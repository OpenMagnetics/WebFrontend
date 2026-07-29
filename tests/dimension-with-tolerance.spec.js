/**
 * tests/dimension-with-tolerance.spec.js
 *
 * Regression for the Dimension-family port of WSC PR #16 (ABT #349):
 * DimensionWithTolerance must share the refactored Dimension's semantics —
 * a unit change keeps the DISPLAYED number and the chosen prefix, rescaling
 * only the stored SI value — while its own tolerance machinery (add/derive,
 * remove, min<nominal<max ordering validation) keeps working.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

const DWT = 'MagneticBuilder-DesignRequirements-MagnetizingInductance';

async function storedInductance(page) {
    return page.evaluate(() => {
        const app = document.querySelector('#app').__vue_app__;
        const value = app.config.globalProperties.$pinia.state.value.mas.mas.inputs.designRequirements.magnetizingInductance;
        return JSON.parse(JSON.stringify(value));
    });
}

test.describe('DimensionWithTolerance — PR #16 semantics', () => {
    test.describe.configure({ timeout: 120000 });

    test('unit change keeps displayed number and prefix; add/remove and ordering validation intact', async ({ page }) => {
        await page.goto(`${BASE_URL}/magnetic_tool`, { waitUntil: 'domcontentloaded' });
        await page.waitForURL('**/magnetic_tool', { timeout: 120000 });
        const nominal = page.locator(`[data-cy="${DWT}-nominal-number-input"] input`);
        await expect(nominal).toBeVisible({ timeout: 30000 });

        // Fresh design: 100 µH.
        await expect(nominal).toHaveValue('100');
        expect((await storedInductance(page)).nominal).toBeCloseTo(0.0001, 10);

        // Unit µH → mH: displayed number and chosen prefix both stay; only
        // the stored SI value rescales (the pre-port behaviour re-normalised
        // the display to "0.1 H").
        await page.click(`[data-cy="${DWT}-nominal-DimensionUnit-input"]`);
        await page.locator('[role="option"]', { hasText: /^mH$/ }).click();
        await expect(nominal).toHaveValue('100');
        await expect(page.locator(`[data-cy="${DWT}-nominal-DimensionUnit-input"]`)).toContainText('mH');
        expect((await storedInductance(page)).nominal).toBeCloseTo(0.1, 10);

        // Typing under the chosen prefix stores value × prefix.
        await nominal.click({ clickCount: 3 });
        await nominal.fill('47');
        await nominal.press('Tab');
        await expect(async () => {
            expect((await storedInductance(page)).nominal).toBeCloseTo(0.047, 10);
        }).toPass({ timeout: 5000 });

        // Add maximum: derives 2× nominal.
        await page.click(`[data-cy="${DWT}-maximum-add-button"]`);
        await expect(async () => {
            expect((await storedInductance(page)).maximum).toBeCloseTo(0.094, 10);
        }).toPass({ timeout: 5000 });

        // Ordering validation: drive maximum below nominal → loud error.
        const maximum = page.locator(`[data-cy="${DWT}-maximum-number-input"] input`);
        await maximum.click({ clickCount: 3 });
        await maximum.fill('1');
        await maximum.press('Tab');
        await expect(page.locator(`[data-cy="${DWT}-error-text"]`))
            .toContainText('Nominal value must be smaller than maximum', { timeout: 5000 });

        // Remove maximum: error clears, model field nulled.
        await page.click(`[data-cy="${DWT}-maximum-remove-button"]`);
        await expect(page.locator(`[data-cy="${DWT}-error-text"]`)).toHaveCount(0, { timeout: 5000 });
        expect((await storedInductance(page)).maximum).toBeNull();
    });
});
