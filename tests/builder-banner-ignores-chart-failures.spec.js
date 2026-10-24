/**
 * Regression coverage for a user report (2026-09-23): importing a flyback
 * design on a TDG TP5 core (a power ferrite with no complex permeability data,
 * like 877 of the 1073 catalogue materials) lit a permanent red
 * "Calculation issue: Exception: [MATERIAL_DATA_MISSING] ..." banner across the
 * whole Magnetic Builder.
 *
 * The builder's default graph is the impedance sweep, which MKF rightly refuses
 * for such a material; the graph already reports that under the chart. The
 * builder-level banner (added with "Continue is gated on filled inputs") was
 * subscribed to EVERY taskQueue action, so it repeated the chart's expected,
 * local failure as if the design itself had failed — and never cleared, since
 * the sweep fails again on every wind.
 *
 * Signal: wait until the taskQueue reports the failed sweep (the very event
 * that used to raise the banner), then require the chart's own record and no
 * builder record. Since 2026-10-22 (Alf) both live in the Engine log, not on
 * the page: the chart's failure is logged under the chart's name, and a design
 * failure would be logged under 'Builder'. Since 2026-10-23 (Alf) the chart also says it where it
 * would be drawn, and nowhere else on the page does.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';
import { engineLogMessages } from './utils/index.js';

const TP5_REFUSED = 'Complex permeability data is not available for TP5';
const chartRecords = async (page) => (await engineLogMessages(page, { source: 'Impedance Over Frequency graph', level: 'ERROR' })).filter((m) => m.includes(TP5_REFUSED));

const MAS_FIXTURE = new URL('./fixtures/flyback_e16_tdg_tp5_no_complex_permeability.json', import.meta.url).pathname;

test.describe('Magnetic Builder — a chart-local failure is not a design failure', () => {
    test.describe.configure({ timeout: 180000 });

    test('impedance sweep on a material without complex permeability shows no "Calculation issue" banner', async ({ page }) => {
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
        await page.locator('[data-cy="Header-Load-MAS-file-button"]').waitFor({ state: 'attached', timeout: 20000 });

        await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(MAS_FIXTURE);
        await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });

        await page.evaluate(() => {
            const ss = document.querySelector('#app').__vue_app__.config.globalProperties.$stateStore;
            ss.setCurrentToolSubsection('magneticBuilder');
            // The Graphs panel is behind a MagneticBuilder setting that defaults off.
            const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
            const mbs = pinia.state.value.magneticBuilderSettings;
            if (!mbs) {
                throw new Error('magneticBuilderSettings store is not mounted');
            }
            mbs.enableGraphs = true;
            ss.graphParameters.graph = 'impedanceOverFrequency';
        });

        // The chart reports the refused sweep as its own: MKF has no complex
        // permeability for TP5, and the graph's record says so.
        await expect.poll(async () => (await chartRecords(page)).length, { timeout: 90000 }).toBeGreaterThan(0);

        // ... and the builder does not turn it into a design failure.
        const builderFailures = async () => (await engineLogMessages(page, { source: 'Builder' })).filter((m) => m.includes(TP5_REFUSED));
        expect(await builderFailures()).toEqual([]);
        // The chart says why it is empty where it would be drawn (Alf, 2026-10-23), and nothing
        // else on the page repeats it.
        const inChart = page.locator('[data-cy$="-Graph-ErrorMessage"]').filter({ hasText: TP5_REFUSED });
        await expect(inChart).toHaveCount(1);
        await expect(page.getByText(TP5_REFUSED), 'only the chart says it').toHaveCount(1);

        // Nor when the sweep fails again. Count the failures as the builder's
        // taskQueue reports them (the very event that used to raise the
        // banner), then force one more sweep through the graph parameters.
        await page.evaluate(() => {
            const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
            const taskQueue = pinia._s.get('magneticBuilderTaskQueue');
            if (!taskQueue) {
                throw new Error(`magneticBuilderTaskQueue store is not mounted; stores: ${[...pinia._s.keys()].join(', ')}`);
            }
            window.__failedImpedanceSweeps = 0;
            taskQueue.$onAction(({ name, args, after }) => {
                after(() => {
                    if (name === 'impedanceOverFrequencySwept' && args[0] === false) {
                        window.__failedImpedanceSweeps += 1;
                    }
                });
            });
            const ss = document.querySelector('#app').__vue_app__.config.globalProperties.$stateStore;
            ss.graphParameters.numberPoints = ss.graphParameters.numberPoints + 1;
        });
        await page.waitForFunction(() => window.__failedImpedanceSweeps >= 1, null, { timeout: 90000 });
        expect((await chartRecords(page)).length).toBeGreaterThan(0);
        expect(await builderFailures()).toEqual([]);
    });
});
