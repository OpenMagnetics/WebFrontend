/**
 * A core material handed to MKF as a full record reaches it intact. A material whose losses are given
 * per mass (Nanoperm 2000, `massLosses: magnetec`) carries `volumetricLosses: {}`, which MAS requires.
 * clean() removed empty objects, so checkCoreMaterial / compareCoreMaterialVolumetricLosses sent the
 * material without it and the user read MKF's raw "key 'volumetricLosses' not found".
 *
 * Null values are still taken out (what clean() was for); empty objects and arrays are kept.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

const FIXTURE = new URL('./fixtures/04_forward_xfmr_e3216_n87.json', import.meta.url).pathname;

test.describe('A core material reaches the engine intact', () => {
    test.describe.configure({ timeout: 120000 });

    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
    });

    test('MATINTACT-1: withoutNulls keeps empty objects and arrays, drops nulls', async ({ page }) => {
        const out = await page.evaluate(async () => {
            const { withoutNulls } = await import('/WebSharedComponents/assets/js/utils.js');
            const material = { name: 'X', volumetricLosses: {}, massLosses: { default: [{ method: 'magnetec' }] }, curieTemperature: null, alternatives: [], heat: { conductivity: undefined } };
            const copy = withoutNulls(material);
            return { copy, untouched: 'curieTemperature' in material };
        });
        expect(out.copy).toEqual({ name: 'X', volumetricLosses: {}, massLosses: { default: [{ method: 'magnetec' }] }, alternatives: [], heat: {} });
        expect(out.untouched, 'the argument is not changed').toBe(true);
    });

    test('MATINTACT-2: a mass-loss material with volumetricLosses {} is judged by MKF, not refused for a missing key', async ({ page }) => {
        // Loading a design creates the app's task queue (the store under test).
        await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
        await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
        const out = await page.evaluate(async () => {
            const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
            const taskQueue = pinia._s.get('taskQueue');
            if (taskQueue == null) throw new Error('the taskQueue store is not created');
            const material = await taskQueue.getMaterialData('Nanoperm 2000');
            if (material.massLosses == null) throw new Error('Nanoperm 2000 has no massLosses in this engine: the case this test needs is gone');
            // As a stored design embeds it: the required key present and empty, the losses per mass.
            material.volumetricLosses = {};
            const result = {};
            for (const [name, call] of [
                ['checkCoreMaterial', () => taskQueue.checkCoreMaterial(material)],
                ['compareCoreMaterialVolumetricLosses', () => taskQueue.compareCoreMaterialVolumetricLosses(material, material)],
            ]) {
                try { result[name] = { ok: true, reply: JSON.stringify(await call()).slice(0, 300) }; }
                catch (error) { result[name] = { ok: false, reply: String(error?.message ?? error) }; }
            }
            return result;
        });
        for (const [name, { reply }] of Object.entries(out)) {
            expect(reply, `${name}: MKF received the material without volumetricLosses`).not.toContain("'volumetricLosses' not found");
        }
        // The verdict on the material itself comes back.
        expect(out.checkCoreMaterial.ok, `checkCoreMaterial answered: ${out.checkCoreMaterial.reply}`).toBe(true);
        // The comparison may refuse the material for what its data lacks (a mass-loss material states
        // no volumetric-loss points to compare at), which MKF says in its own words; never the missing key.
        if (!out.compareCoreMaterialVolumetricLosses.ok) {
            expect(out.compareCoreMaterialVolumetricLosses.reply).toMatch(/^Exception: \[[A-Z_]+\] Material Nanoperm 2000 /);
        }
    });
});
