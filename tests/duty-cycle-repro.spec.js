/**
 * Regression test for duty cycle rounding bug:
 * Entering 94.37% duty cycle in New Magnetic → Operating Points → Manual mode,
 * then changing current peak-to-peak caused it to round to 95%.
 *
 * Root cause: calculateInducedVoltage discretizes waveforms into N=20 points
 * (94.37% → k=19 → 95%). Fix: capture user's dutyCycle and original voltage label
 * before calling WASM, restore both after. Original label ("Rectangular") prevents
 * WaveformOutput from re-overwriting dutyCycle.
 */
import { test, expect } from './_coverage.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

async function openFresh(page) {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(800);
    const link = page.locator('[data-cy="Header-new-magnetic-link"]');
    await link.waitFor({ timeout: 10000 });
    await link.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
}

test('duty cycle 94.37% does not round after changing current', async ({ page }) => {
    await openFresh(page);

    const opTab = page.locator('[data-cy="storyline-Op.Points-button"]');
    await opTab.waitFor({ timeout: 10000 });
    await opTab.click();
    await page.waitForTimeout(1000);

    const manualBtn = page.locator('[data-cy="OperatingPoint-source-Manual-button"]')
        .filter({ hasText: /manually/i }).first();
    await manualBtn.waitFor({ timeout: 5000 });
    await manualBtn.click();
    await page.waitForTimeout(800);

    const dutyCycleInput = page.locator('[data-cy$="-DutyCycle-number-input"]').first();
    await dutyCycleInput.waitFor({ timeout: 8000 });

    await dutyCycleInput.click({ clickCount: 3 });
    await dutyCycleInput.fill('94.37');
    await dutyCycleInput.press('Tab');
    await page.waitForTimeout(300);

    const peakToPeakInput = page.locator('[data-cy$="-current-peakToPeak-number-input"]').first();
    const peakVisible = await peakToPeakInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (peakVisible) {
        await peakToPeakInput.click({ clickCount: 3 });
        await peakToPeakInput.fill('2');
        await peakToPeakInput.press('Tab');
    } else {
        const currentInputs = page.locator('[data-cy*="-current-"] [data-cy$="-number-input"]');
        const count = await currentInputs.count();
        if (count > 0) {
            const input = currentInputs.first();
            await input.click({ clickCount: 3 });
            await input.fill('2');
            await input.press('Tab');
        }
    }

    // Wait for autoInduceVoltageFromCurrent debounce (500ms) + processing
    await page.waitForTimeout(1500);

    const dutyCycleAfterChange = await dutyCycleInput.inputValue();
    const dcValue = parseFloat(dutyCycleAfterChange);
    expect(dcValue).toBeCloseTo(94.37, 1);
});
