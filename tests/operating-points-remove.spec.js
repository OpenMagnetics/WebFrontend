/**
 * tests/operating-points-remove.spec.js
 *
 * Web bug reports #189 / #190: "Unable to remove Op. Point No. 2 if you don't select the
 * import type from the beginning". A new operating point has no mode until the user picks
 * one, and its card then only said "Choose a mode for this operating point first": the
 * Remove and Select buttons lived in the branch for points WITH a mode, so once another
 * point was selected the mode-less one could be neither selected nor removed.
 *
 * Removing a point also left the per-point bookkeeping behind: the mode of every later
 * point shifted onto its neighbour (modePerPoint was never spliced), and the cooling
 * control of the removed point stayed on the card that moved into its place.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL, collectConsoleErrors, withPinia } from './utils/index.js';


async function openOperatingPointsInManualMode(page) {
    await page.goto(`${BASE_URL}/magnetic_tool`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/magnetic_tool', { timeout: 120000 });
    await page.click('button:has-text("Continue")');
    await page.click('text=I will define it manually');
    await expect(page.locator('text=Switch to Harmonics view')).toBeVisible({ timeout: 20000 });
}

async function addOperatingPoint(page) {
    await page.click('button:has-text("Add New OP")');
    await expect(page.locator('text=Where do you want to import')).toBeVisible({ timeout: 10000 });
}

function card(page, index) {
    return page.locator('.op-card').nth(index);
}

function removeButton(page, index) {
    return page.locator(`[data-cy$="-remove-operating-point-${index}-button"]`);
}

function selectButton(page, index) {
    return page.locator(`[data-cy$="-select-operating-point-${index}-button"]`);
}

async function bookkeeping(page) {
    return withPinia(page, (pinia) => {
        const state = pinia._s.get('state');
        const mas = pinia._s.get('mas');
        return {
            names: mas.mas.inputs.operatingPoints.map((op) => op.name),
            cooling: mas.mas.inputs.operatingPoints.map((op) => op.conditions?.cooling ?? null),
            modes: [...state.operatingPoints.modePerPoint],
        };
    });
}

test.describe('operating points — removing a point', () => {
    test.describe.configure({ timeout: 180000 });

    test('OP-REMOVE-1: a point whose mode was never chosen can be selected and removed', async ({ page }) => {
        const getErrors = collectConsoleErrors(page);
        await openOperatingPointsInManualMode(page);

        // The second point is added and left without a mode, as in the report.
        await addOperatingPoint(page);
        await expect(page.locator('.op-card')).toHaveCount(2);

        // Going back to the first point must not strand the second one.
        await selectButton(page, 0).click();
        await expect(card(page, 1)).toContainText('Choose a mode for this operating point first');
        await expect(selectButton(page, 1)).toBeVisible({ timeout: 10000 });
        await expect(removeButton(page, 1)).toBeVisible();
        // Continue is blocked by the point without a mode, and says so, even while another is on screen.
        await expect(page.locator('[data-cy$="-OperatingPoints-error-text"]')).toContainText('Choose how to define operating point Op. Point No. 2');

        await removeButton(page, 1).click();
        await expect(page.locator('[data-cy$="-OperatingPoints-error-text"]')).not.toContainText('Choose how to define');
        await expect(page.locator('.op-card')).toHaveCount(1);
        const after = await bookkeeping(page);
        expect(after.names).toEqual(['Op. Point No. 1']);
        expect(after.modes).toEqual(['Manual']);
        expect(getErrors()).toEqual([]);
    });

    test('OP-REMOVE-2: the current point can be removed, also when it is the last one', async ({ page }) => {
        const getErrors = collectConsoleErrors(page);
        await openOperatingPointsInManualMode(page);
        await addOperatingPoint(page);

        // The new point is the current one and has no mode yet; removing it brings back point 1.
        await expect(removeButton(page, 1)).toBeVisible({ timeout: 10000 });
        await removeButton(page, 1).click();
        await expect(page.locator('.op-card')).toHaveCount(1);
        await expect(page.locator('text=Switch to Harmonics view')).toBeVisible({ timeout: 20000 });
        // The only point left cannot be removed: the design needs one.
        await expect(removeButton(page, 0)).toHaveCount(0);
        expect((await bookkeeping(page)).modes).toEqual(['Manual']);
        expect(getErrors()).toEqual([]);
    });

    test('OP-REMOVE-3: removing a middle point keeps the modes and cooling of the points after it', async ({ page }) => {
        const getErrors = collectConsoleErrors(page);
        await openOperatingPointsInManualMode(page);

        // Point 2: harmonics list, forced air.
        await addOperatingPoint(page);
        await page.click('text=I want to introduce a list of harmonics');
        const cooling2 = card(page, 1).locator(`[data-cy$="-ConditionsCooling-select"]`);
        await cooling2.click();
        await page.getByRole('option', { name: 'Forced air' }).click();
        await expect(cooling2).toContainText('Forced air');

        // Point 3: manual, natural convection.
        await addOperatingPoint(page);
        await page.click('text=I will define it manually');
        await expect(page.locator('text=Switch to Harmonics view')).toBeVisible({ timeout: 20000 });
        // A new point starts as a copy of the current one, cooling included.
        const cooling3 = card(page, 2).locator(`[data-cy$="-ConditionsCooling-select"]`);
        await cooling3.click();
        await page.getByRole('option', { name: 'Natural convection' }).click();
        await expect(cooling3).toContainText('Natural convection');

        const before = await bookkeeping(page);
        expect(before.modes).toEqual(['Manual', 'HarmonicsList', 'Manual']);
        expect(before.cooling[1]).not.toBeNull();
        expect(before.cooling[2]).toBeNull();

        await removeButton(page, 1).click();
        await expect(page.locator('.op-card')).toHaveCount(2);

        const after = await bookkeeping(page);
        expect(after.names).toEqual(['Op. Point No. 1', 'Op. Point No. 3']);
        expect(after.modes).toEqual(['Manual', 'Manual']);
        expect(after.cooling).toEqual([null, null]);
        // The card now holding point 3 shows point 3's cooling, not the removed point's.
        await expect(card(page, 1).locator(`[data-cy$="-ConditionsCooling-select"]`)).toContainText('Natural convection');
        expect(getErrors()).toEqual([]);
    });
});
