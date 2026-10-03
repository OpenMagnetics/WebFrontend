/**
 * A graph whose frequency range starts below the material's complex
 * permeability data (Fair-Rite 97 is tabulated from 10 kHz; the graphs start
 * at 1 kHz) is refused by MKF. The impedance graph used to say only "Error
 * calculating impedance"; it must say why and what to change.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

const BASE_FIXTURE = new URL('./fixtures/04_forward_xfmr_e3216_n87.json', import.meta.url).pathname;

test.describe('Builder graphs — frequency outside the material data', () => {
    test.describe.configure({ timeout: 180000 });

    test('GRAPHSPAN-1: the impedance graph names the material range and the setting to change', async ({ page }, testInfo) => {
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

        const label = page.getByText(/Cannot calculate the impedance at 1 kHz: material 97 has complex permeability data only from 10 kHz to/);
        await expect(label).toBeVisible({ timeout: 90000 });
        await expect(label).toContainText('set the minimum frequency to at least 10 kHz');
    });
});
