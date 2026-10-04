/**
 * Every builder graph says why the engine refused its sweep. Seven of them
 * used to drop the error into the console and show an empty chart (ABT #1669).
 *
 * The sweep is made to fail in-page with a known engine-style message, one
 * graph at a time, so each graph's own catch path is what is checked.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

const FIXTURE = new URL('./fixtures/04_forward_xfmr_e3216_n87.json', import.meta.url).pathname;

const GRAPHS = [
    ['impedanceOverFrequency', ['sweepImpedanceOverFrequency'], 'the impedance'],
    ['qFactorOverFrequency', ['sweepQFactorOverFrequency'], 'the Q factor'],
    ['resistancesOverFrequency', ['sweepResistanceOverFrequency'], 'the resistance'],
    ['windingResistancesOverFrequency', ['sweepWindingResistanceOverFrequency'], 'the winding resistance'],
    ['coreLossesOverFrequency', ['sweepCoreLossesOverFrequency'], 'the core losses'],
    ['windingLossesOverFrequency', ['sweepWindingLossesOverFrequency'], 'the winding losses'],
    ['lossesOverFrequency', ['sweepCoreLossesOverFrequency', 'sweepWindingLossesOverFrequency'], ['the core losses', 'the winding losses']],
    ['magnetizingInductanceOverFrequency', ['sweepMagnetizingInductanceOverFrequency'], 'the magnetizing inductance'],
    ['magnetizingInductanceOverTemperature', ['sweepMagnetizingInductanceOverTemperature'], 'the magnetizing inductance'],
    ['magnetizingInductanceOverDcBias', ['sweepMagnetizingInductanceOverDcBias'], 'the magnetizing inductance'],
];

test.describe('Builder graphs report a refused sweep (ABT #1669)', () => {
    test.describe.configure({ timeout: 180000 });

    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
        await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
        await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
        await page.evaluate(() => {
            const app = document.querySelector('#app').__vue_app__.config.globalProperties;
            app.$stateStore.setCurrentToolSubsection('magneticBuilder');
            const mbs = app.$pinia._s.get('magneticBuilderSettings');
            if (!mbs) throw new Error('magneticBuilderSettings store is not mounted');
            mbs.enableGraphs = true;
        });
        await expect(page.locator('[data-cy$="-Core-Advise-button"]').first()).toBeVisible({ timeout: 30000 });
    });

    for (const [graph, sweeps, what] of GRAPHS) {
        test(`GRAPHERR ${graph}: shows the engine's reason`, async ({ page }) => {
            await page.evaluate(({ graph, sweeps }) => {
                const app = document.querySelector('#app').__vue_app__.config.globalProperties;
                const taskQueue = app.$pinia._s.get('magneticBuilderTaskQueue');
                for (const sweep of sweeps) {
                    if (typeof taskQueue[sweep] !== 'function') throw new Error(`no taskQueue.${sweep}`);
                    taskQueue[sweep] = () => Promise.reject(new Error('Exception: [TEST_REFUSAL] the engine refused this sweep'));
                }
                app.$stateStore.graphParameters.graph = graph;
                app.$stateStore.graphParameters.numberPoints = app.$stateStore.graphParameters.numberPoints + 1;
            }, { graph, sweeps });
            // A graph with two sweeps (total losses) names both reasons.
            for (const each of [what].flat()) {
                const label = page.locator('[data-cy$="-Graph-ErrorMessage"]').filter({ hasText: each });
                await expect(label.first()).toContainText(`Error calculating ${each}: the engine refused this sweep`, { timeout: 60000 });
            }
        });
    }
});
