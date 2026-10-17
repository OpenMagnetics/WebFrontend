/**
 * A graph whose frequency range starts below the material's complex
 * permeability data (Fair-Rite 97 is tabulated from 10 kHz; the graphs start
 * at 1 kHz). MKF used to refuse it, and the graph had to say why and what to
 * change. Since ABT #1861 (Alf, 2026-10-14) MKF estimates the permeability
 * outside its measured span and says where: the graph draws that stretch
 * dashed and names the material and its measured span under the chart.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

const BASE_FIXTURE = new URL('./fixtures/04_forward_xfmr_e3216_n87.json', import.meta.url).pathname;

test.describe('Builder graphs — frequency outside the material data', () => {
    test.describe.configure({ timeout: 180000 });

    test('GRAPHSPAN-1: below the material data the impedance graph is dashed and names the measured span', async ({ page }, testInfo) => {
        const mas = JSON.parse(fs.readFileSync(BASE_FIXTURE, 'utf8'));
        mas.magnetic.core.functionalDescription.material = '97';
        const fixture = testInfo.outputPath('material_97.json');
        fs.writeFileSync(fixture, JSON.stringify(mas));

        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
        await page.locator('[data-cy="Header-Load-MAS-file-button"]').waitFor({ state: 'attached', timeout: 20000 });
        await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(fixture);
        await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
        await page.evaluate(() => {
            const ss = document.querySelector('#app').__vue_app__.config.globalProperties.$stateStore;
            ss.setCurrentToolSubsection('magneticBuilder');
            const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
            const mbs = pinia.state.value.magneticBuilderSettings;
            if (!mbs) {
                throw new Error('magneticBuilderSettings store is not mounted');
            }
            mbs.enableGraphs = true;
            ss.graphParameters.graph = 'impedanceOverFrequency';
            ss.graphParameters.minimumFrequency = 1e3;
        });

        const notes = page.locator('[data-cy$="-Graph-DataLimits"]');
        await expect(notes).toContainText('Dashed, ', { timeout: 90000 });
        await expect(notes).toContainText("97's");
        await expect(notes).toContainText('is measured from');
        await expect(page.getByText(/Cannot calculate the impedance/)).toHaveCount(0);
    });
});
