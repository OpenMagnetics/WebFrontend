/**
 * 2D real winding: a coil that does not fit is DRAWN, with the reason beside it.
 *
 * The design (PQ 65/60, seven axially stacked sections S,P,S,P,S,P,S; primary 45 turns of
 * 1.865 mm litz split in series over three sections, secondary 3 turns x 4 parallels of
 * edge-wound flat wire, one parallel per section) fits as stored, but re-wound with real
 * winding its sections need room for the lead crossings the stored layout never reserved,
 * and the stack outgrows the window. MKF lays it out in full and says it does not fit
 * (ABT #1487). The 2D view must show that coil, ring the turns that leave the window, and put
 * MKF's reason under the drawing -- not a blank view, and not a drawing that looks fine.
 *
 * With real winding off the stored layout is drawn as it is, with no warning.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';
import { engineLogMessages } from './utils/index.js';

const fitWarnings = async (page) => (await engineLogMessages(page, { source: 'Magnetic drawing', level: 'WARNING' })).filter((m) => m.includes('does not fit'));

const MAS_FIXTURE = new URL('./fixtures/pq65_stacked_sections_real_winding_unfit.json', import.meta.url).pathname;
const PLOT = '[data-cy="MagneticAdvise-core-field-plot-image"]';

async function setRealWinding(page, on) {
    await page.evaluate((value) => {
        const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
        const settings = pinia._s.get('settings');
        if (!settings?.magneticBuilderSettings) {
            throw new Error('settings store has no magneticBuilderSettings');
        }
        settings.magneticBuilderSettings.useRealWindingGeometry = value;
    }, on);
}

test.describe('2D real winding — a coil that does not fit', () => {
    test.describe.configure({ timeout: 240000 });

    test('2DRW-FIT-1: real winding on draws the overflowing coil, rings its escaping turns and shows why', async ({ page }) => {
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
        await page.locator('[data-cy="Header-Load-MAS-file-button"]').waitFor({ state: 'attached', timeout: 20000 });
        await setRealWinding(page, false);

        await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(MAS_FIXTURE);
        await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
        await page.evaluate(() => {
            const ss = document.querySelector('#app').__vue_app__.config.globalProperties.$stateStore;
            ss.setCurrentToolSubsection('magneticBuilder');
        });

        // Real winding off: the stored layout, drawn, no ring, no warning.
        const plotSvg = page.locator(`${PLOT} svg`).first();
        await expect(plotSvg).toBeVisible({ timeout: 120000 });
        await expect(page.locator(`${PLOT} .fit_problem_turn`)).toHaveCount(0);
        expect(await fitWarnings(page)).toEqual([]);

        // Real winding on: the same view redraws the re-wound coil, with the overflow marked, and the
        // reason is a warning in the Engine log (Alf, 2026-10-22: not text under the drawing).
        await setRealWinding(page, true);
        await expect.poll(async () => (await fitWarnings(page)).length, { timeout: 180000 }).toBeGreaterThan(0);
        await expect(page.locator('[data-cy$="-FitWarning"]'), 'nothing drawn under the plot').toHaveCount(0);
        await expect(page.locator(`${PLOT} svg`).first()).toBeVisible();
        expect(await page.locator(`${PLOT} .fit_problem_turn`).count(), 'no escaping turn is ringed').toBeGreaterThan(0);
        expect(await page.locator(`${PLOT} .fit_problem_window`).count(), 'the winding window is not outlined').toBeGreaterThan(0);
        // The reason travels as a warning, not as an error that replaces the drawing.
        expect(await engineLogMessages(page, { source: 'Magnetic drawing', level: 'ERROR' })).toEqual([]);

        // And off again: the overflow marks go, and no new warning is logged.
        const warningsWithRealWinding = (await fitWarnings(page)).length;
        await setRealWinding(page, false);
        await expect(page.locator(`${PLOT} .fit_problem_turn`)).toHaveCount(0, { timeout: 120000 });
        expect((await fitWarnings(page)).length).toBe(warningsWithRealWinding);
    });
});
