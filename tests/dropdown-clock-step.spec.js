/**
 * Menus stay open when the wall clock steps back.
 *
 * The control panel and header menus close on any document click, and rely on
 * @click.stop to keep a click inside a menu from reaching that closer. Vue
 * drops a handler for an event stamped (Date.now) at or before the moment the
 * handler was attached, so when the wall clock steps back between mount and
 * click (NTP, or WSL time sync, which steps this machine's clock back ~1.6 s
 * every ~30 s) the .stop is skipped and the menu closes 1 ms after opening.
 * This made the exporters tests fail intermittently. The tests step the page's
 * clock back the same way, so the race happens on every run.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';
import { goToBuilderStep, adviseCoreAndWait, adviseWireAndWait } from './utils/builder-helpers.js';

const stepClockBack = (page) => page.evaluate(() => {
    const realNow = Date.now.bind(Date);
    Date.now = () => realNow() - 5000;
});

test.describe('Menus survive a wall clock that steps back', () => {
    test.describe.configure({ timeout: 240000 });

    test('CLOCKSTEP-1: the control panel "All Exports" menu opens', async ({ page }) => {
        await goToBuilderStep(page);
        await adviseCoreAndWait(page);
        await adviseWireAndWait(page);
        const toggle = page.locator('.cp-btn-all').first();
        await expect(toggle).toBeVisible({ timeout: 30000 });

        await stepClockBack(page);
        await toggle.click();
        await expect(page.locator('[data-cy="MAS-exports-modal-button"]')).toBeVisible({ timeout: 5000 });
    });

    test('CLOCKSTEP-2: a header menu opens', async ({ page }) => {
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
        const toggle = page.locator('#header_wrapper .nav-item.dropdown > .dropdown-toggle').first();
        await expect(toggle).toBeVisible({ timeout: 30000 });
        const menu = page.locator('#header_wrapper .nav-item.dropdown').first().locator('.dropdown-menu');

        await stepClockBack(page);
        await toggle.click();
        await expect(menu).toBeVisible({ timeout: 5000 });
    });
});
