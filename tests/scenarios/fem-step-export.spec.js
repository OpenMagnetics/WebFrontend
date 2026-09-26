/**
 * The FEM STEP export (Core Exports -> "Download FEM STEP (gmsh / OMFEM)").
 *
 * Not the model the viewer draws: the geometry a mesher takes, the same product as
 * `mvbpp_step_generator --real --fem --segments 12` -- real winding as fused, conformal
 * copper bodies at their conducting footprint (no coating), core and wire faceted together
 * at 12 segments, named solids. It is slow on purpose (minutes on a five-turn ETD49 in the
 * browser engine), hence @heavy.
 */
import fs from 'node:fs';
import { test, expect } from '../_coverage.js';
import { BASE_URL } from '../utils.js';

const FIXTURE = new URL('../fixtures/etd49_wound_10uH_5T.json', import.meta.url).pathname;
const CORE_NAME = JSON.parse(fs.readFileSync(FIXTURE, 'utf-8')).magnetic.core.name;

test.describe('FEM STEP export @heavy', () => {
    test('the FEM STEP of a wound design is a STEP with named core and winding solids', async ({ page }, testInfo) => {
        test.setTimeout(40 * 60 * 1000);
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
        await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
        await page.waitForFunction(() => {
            const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
            return (pinia._s.get('mas')?.mas?.magnetic?.coil?.turnsDescription?.length ?? 0) > 0;
        }, null, { timeout: 120000, polling: 500 });

        await page.locator('.cp-btn-all').first().click();
        await page.locator('[data-cy="Core-exports-modal-button"]').first().click();
        const button = page.locator('.p-dialog button', { hasText: 'Download FEM STEP' }).first();
        await expect(button).toBeEnabled({ timeout: 30000 });
        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 35 * 60 * 1000 }),
            button.click(),
        ]);
        const file = testInfo.outputPath('fem.step');
        await download.saveAs(file);
        const step = fs.readFileSync(file, 'latin1');
        expect(step.startsWith('ISO-10303-21'), 'a STEP file').toBe(true);
        const solids = (step.match(/MANIFOLD_SOLID_BREP/g) || []).length;
        expect(solids, 'core pieces and conductors as solids').toBeGreaterThan(1);
        const names = [...new Set((step.match(/PRODUCT\('([^']+)'/g) || []).map((s) => s.slice(9, -1)))];
        testInfo.annotations.push({ type: 'solids', description: `${solids} solids; names: ${names.join(', ')}` });
        // The names mvbpp_step_generator --fem gives: core pieces '<core name>_<i>', the bobbin,
        // and each conductor '<winding> parallel <p>' with its two terminals.
        expect(names, 'core pieces').toContain(`${CORE_NAME}_0`);
        expect(names, 'bobbin').toContain('Bobbin');
        expect(names, 'the primary conductor').toContain('Primary parallel 0');
        expect(names, 'its terminal leads').toContain('Primary parallel 0 terminal 0');
        await expect(page.locator('[data-cy$="-FEM-STEP-export-error"]')).toHaveCount(0);
    });
});
