/**
 * The control panel's ANSYS export follows the backend's answer to
 * /is_high_performance_backend_available.
 *
 * ControlPanel.vue declared mounted() twice (2026-05-31 to 2026-10-17): the
 * second, which installs the dropdown closer, replaced the first, so the
 * availability check never ran and the ANSYS button stayed disabled even where
 * the high-performance backend was available.
 */
import { test, expect } from './_coverage.js';
import { goToBuilderStep, adviseCoreAndWait, adviseWireAndWait } from './utils/builder-helpers.js';

const answerAvailability = (page, available) => page.route('**/is_high_performance_backend_available', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(available) }));

test.describe('ANSYS export follows the high-performance backend availability', () => {
    test.describe.configure({ timeout: 240000 });

    for (const available of [true, false]) {
        test(`ANSYS-AVAIL-${available ? 1 : 2}: backend says ${available}, the ANSYS button is ${available ? 'enabled' : 'disabled'}`, async ({ page }) => {
            await answerAvailability(page, available);
            const asked = page.waitForRequest('**/is_high_performance_backend_available', { timeout: 120000 });
            await goToBuilderStep(page);
            await adviseCoreAndWait(page);
            await adviseWireAndWait(page);
            await asked;
            const ansys = page.locator('.cp-btn-ansys').first();
            await expect(ansys).toBeVisible({ timeout: 30000 });
            if (available) await expect(ansys).toBeEnabled({ timeout: 10000 });
            else await expect(ansys).toBeDisabled();
        });
    }
});
