/**
 * ABT #1698 / #1670: the Operating Points reflect button gives v2 = v1 / n (MKF's
 * Inputs::calculate_reflected_secondary, not a binding-side copy that threw on the default
 * rectangle).
 * ABT #1697: a coil the engine winds carries insulation layers whose materials have the MAS
 * fields of the engine's MAS (density, provenance); the web's MAS sentry, generated from the
 * same MAS, must accept them in wire Advise All and simulate.
 * Both with 0 console errors.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

const TWO_WINDING = new URL('./fixtures/default_two_winding_pq2715.json', import.meta.url).pathname;
const FORWARD = new URL('./fixtures/04_forward_xfmr_e3216_n87.json', import.meta.url).pathname;
const gp = 'document.querySelector("#app").__vue_app__.config.globalProperties';

function collectConsoleErrors(page) {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(`pageerror ${e.message}`));
    return errors;
}

async function loadMas(page, file, subsection) {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__ != null, null, { timeout: 60000 });
    await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(file);
    await page.waitForURL('**/magnetic_tool**', { timeout: 90000 });
    await page.evaluate(`${gp}.$stateStore.setCurrentToolSubsection('${subsection}')`);
}

test.describe('Reflect and insulation layers (ABT #1697, #1698)', () => {
    test.describe.configure({ timeout: 420000 });

    test('REFLECT-1 the secondary reflect button gives v2 = v1 / n', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await loadMas(page, TWO_WINDING, 'operatingPoints');
        const reflect = page.locator('[data-cy$="-operating-point-0-winding-1-reflect-button"]').first();
        await expect(reflect).toBeVisible({ timeout: 60000 });
        // The fixture's secondary still holds the 0/-100 V the #1670 bug wrote; wait for the
        // reflection to replace it.
        await reflect.click();
        await page.waitForFunction(`(() => { const op = ${gp}.$pinia._s.get('mas').mas.inputs.operatingPoints[0];
            const p = op.excitationsPerWinding[0].voltage.waveform.data, s = op.excitationsPerWinding[1].voltage.waveform.data;
            return Math.abs(Math.max(...s) - Math.max(...p)) < 1e-6; })()`, null, { timeout: 60000 });
        const r = await page.evaluate(`(() => { const mas = ${gp}.$pinia._s.get('mas').mas; const op = mas.inputs.operatingPoints[0];
            return { p: op.excitationsPerWinding[0].voltage.waveform.data, s: op.excitationsPerWinding[1].voltage.waveform.data,
                     n: mas.inputs.designRequirements.turnsRatios[0].nominal }; })()`);
        expect(r.s).toHaveLength(r.p.length);
        r.p.forEach((v, i) => expect(r.s[i]).toBeCloseTo(v / r.n, 9));
        expect(errors).toEqual([]);
    });

    test('INSUL-1 wire Advise All winds a coil with insulation layers the MAS sentry accepts, and it simulates', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await loadMas(page, FORWARD, 'magneticBuilder');
        await page.evaluate(`(() => { window.__wireAdviseOutcome = null;
            const un = ${gp}.$pinia._s.get('magneticBuilderTaskQueue').$onAction(({ name, after, onError }) => {
                if (name !== 'adviseAllWires') return;
                after(() => { window.__wireAdviseOutcome = 'done'; un(); });
                onError((e) => { window.__wireAdviseOutcome = 'failed: ' + (e?.message ?? e); un(); }); }); })()`);
        await page.locator('[data-cy$="Wire-Advise-All-button"]').first().click({ timeout: 90000 });
        await page.waitForFunction(() => window.__wireAdviseOutcome != null, null, { timeout: 300000 });
        expect(await page.evaluate(() => window.__wireAdviseOutcome)).toBe('done');
        await page.waitForFunction(`(${gp}.$pinia._s.get('mas').mas.magnetic.coil.layersDescription || []).some((l) => l.type === 'insulation' && l.insulationMaterial)`, null, { timeout: 60000 });
        const magnetic = await page.evaluate(`JSON.parse(JSON.stringify(${gp}.$pinia._s.get('mas').mas.magnetic))`);
        const errorsOfMagnetic = await page.evaluate(async (m) => {
            const { masSchemaErrors } = await import('/WebSharedComponents/assets/js/masValidator.js');
            // As the sentry sees it: the task queue strips nulls before every engine call.
            const strip = (v) => {
                if (Array.isArray(v)) v.forEach(strip);
                else if (v && typeof v === 'object') for (const k of Object.keys(v)) { if (v[k] === null) delete v[k]; else strip(v[k]); }
                return v;
            };
            return masSchemaErrors('Magnetic', strip(m));
        }, magnetic);
        expect(errorsOfMagnetic).toEqual([]);
        // The builder simulates the wound magnetic after the advise; give it time to finish.
        await page.waitForTimeout(10000);
        expect(errors.filter((e) => /MAS sentry|Simulation error/.test(e))).toEqual([]);
        expect(errors).toEqual([]);
    });
});
