/**
 * A voltage MKF cannot take (e.g. one that is not volt-second balanced) is said next to the
 * voltage in the operating-point editor, in MKF's own words, as soon as it is entered. Before,
 * MKF's refusal went to the console only and the user first met it as a banner in the builder.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

test('OP-VOLTAGE-1: an unbalanced voltage is reported next to the voltage, and the report goes when it is balanced again', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-cy="Header-new-magnetic-link"]').click();
    await page.waitForURL('**/magnetic_tool**');
    await page.locator('[data-cy="storyline-Op.Points-button"]').click();
    await page.locator('[data-cy="OperatingPoint-source-Manual-button"]').filter({ hasText: /manually/i }).first().click();

    const issue = page.locator('[data-cy$="-voltage-issue"]');
    const voltageCard = page.locator('.opm-card-voltage');

    // A new design is an inductor: the voltage is derived from the current until the user takes it over.
    await page.locator('[data-cy$="-drive-with-voltage"]').click();
    await expect(voltageCard.getByRole('button', { name: 'Go back to setting the current' })).toBeVisible();
    await expect(issue).toHaveCount(0);

    // A unipolar rectangle (0 V / +V) never reverses: its volt-seconds cannot balance.
    await voltageCard.getByRole('combobox', { name: 'Rectangular', exact: true }).click();
    await page.getByRole('option', { name: 'Unipolar Rectangular', exact: true }).click();
    await expect(issue).toContainText('not volt-second balanced', { timeout: 15000 });

    await voltageCard.getByRole('combobox', { name: 'Unipolar Rectangular', exact: true }).click();
    await page.getByRole('option', { name: 'Rectangular', exact: true }).click();
    await expect(issue).toHaveCount(0, { timeout: 15000 });
});
