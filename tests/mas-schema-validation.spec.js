/**
 * ABT #1388 — MAS documents are validated against the REAL MAS JSON Schema, and
 * every MAS download is a valid document.
 *
 * The MAS sentry used quicktype's Convert.to* (MAS.ts), which checks types,
 * enums and unknown keys but not bounds, patterns, const or oneOf. It accepted
 * documents the schema rejects. And "Download MAS file only with magnetic"
 * deleted inputs and outputs, which MAS requires, so it never produced a valid
 * MAS file. These tests run the validator the app ships, in the page.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';
import { goToBuilderStep, adviseCoreAndWait, adviseWireAndWait } from './utils/builder-helpers.js';
import { buildSchemaBundle } from '../WebSharedComponents/build-tools/vite-plugin-mas-regen.js';

const ETD49 = JSON.parse(fs.readFileSync(new URL('./fixtures/etd49_wound_10uH_5T.json', import.meta.url), 'utf-8'));
const MKF = new URL('../../MKF/', import.meta.url).pathname;

async function validator(page) {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
}
const schemaErrors = (page, kind, doc) => page.evaluate(async ([k, d]) => {
    const { masSchemaErrors } = await import('/WebSharedComponents/assets/js/masValidator.js');
    return masSchemaErrors(k, d);
}, [kind, doc]);

test.describe('MAS schema validation (ABT #1388)', () => {
    test.describe.configure({ timeout: 180000 });

    test('the committed schema bundle is the MAS + PEAS schemas the engine is built with', async () => {
        const committed = fs.readFileSync(new URL('../WebSharedComponents/assets/js/masSchemas.json', import.meta.url), 'utf-8');
        // The same schema directories the mas-regen plugin uses (vite.config.js): the
        // OM_MAS_SCHEMAS_DIR / OM_PEAS_SCHEMAS_DIR overrides when the engine is built from
        // a tree other than the local MKF checkout, MKF's MAS + PEAS submodules otherwise.
        const fresh = buildSchemaBundle(process.env.OM_MAS_SCHEMAS_DIR || `${MKF}MAS/schemas`,
                                        process.env.OM_PEAS_SCHEMAS_DIR || `${MKF}PEAS/schemas`);
        expect(committed === fresh, 'masSchemas.json is stale: run the dev server (mas-regen) and commit it').toBe(true);
    });

    test('a valid MAS passes; values the type check accepted but the schema forbids are rejected', async ({ page }) => {
        await validator(page);
        expect(await schemaErrors(page, 'Mas', ETD49)).toEqual([]);

        // A null for an absent optional: MAS has no null there.
        const withNull = structuredClone(ETD49);
        withNull.magnetic.coil.bobbin.name = null;
        expect((await schemaErrors(page, 'Mas', withNull)).length).toBeGreaterThan(0);

        // A negative number of turns has the right TYPE (quicktype accepts it);
        // the schema's minimum rejects it.
        const negativeTurns = structuredClone(ETD49);
        negativeTurns.magnetic.coil.functionalDescription[0].numberTurns = -5;
        const errors = await schemaErrors(page, 'Mas', negativeTurns);
        expect(errors.some((e) => e.includes('/magnetic/coil/functionalDescription/0/numberTurns')),
            `expected a numberTurns violation, got ${JSON.stringify(errors)}`).toBe(true);
        const quicktypeAccepts = await page.evaluate(async (d) => {
            const { Convert } = await import('/WebSharedComponents/assets/ts/MAS.ts');
            try { Convert.toMas(JSON.stringify(d)); return true; } catch { return false; }
        }, negativeTurns);
        expect(quicktypeAccepts, 'the gap this test exists for: the type check alone accepts it').toBe(true);

        // A MAS Magnetic document is the magnetic alone.
        expect(await schemaErrors(page, 'Magnetic', ETD49.magnetic)).toEqual([]);
        expect((await schemaErrors(page, 'Mas', { magnetic: ETD49.magnetic })).length,
            'a MAS without inputs and outputs is not a valid MAS').toBeGreaterThan(0);
    });

    test('both MAS downloads validate, and the magnetic-only file loads back', async ({ page }, testInfo) => {
        await goToBuilderStep(page);
        await adviseCoreAndWait(page);
        await adviseWireAndWait(page);

        const downloads = {};
        for (const [label, kind] of [['only with magnetic', 'Magnetic'], ['with excitations and results', 'Mas']]) {
            // The export entries sit in the control panel's "All Exports" dropdown.
            await page.locator('.cp-btn-all').first().click();
            await page.locator('[data-cy="MAS-exports-modal-button"]').first().click();
            const button = page.locator('.p-dialog [data-cy$="-download-button"]', { hasText: label }).first();
            const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), button.click()]);
            const file = testInfo.outputPath(`${kind}.json`);
            await download.saveAs(file);
            downloads[kind] = file;
            await page.keyboard.press('Escape');
            const doc = JSON.parse(fs.readFileSync(file, 'utf-8'));
            expect(await schemaErrors(page, kind, doc), `the "${label}" download is a valid MAS ${kind}`).toEqual([]);
        }

        // Load the magnetic-only file back through Load MAS.
        await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(downloads.Magnetic);
        await page.waitForFunction(() => {
            const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
            const shape = pinia._s.get('mas')?.mas?.magnetic?.core?.functionalDescription?.shape;
            return shape != null && (typeof shape === 'string' ? shape : shape.name);
        }, null, { timeout: 60000, polling: 500 });
    });
});
