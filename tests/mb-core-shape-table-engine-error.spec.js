/**
 * When the engine cannot build the core shapes table (calculate_all_core_data_from_shapes answers
 * "Exception: <shape>: <what>"), the shapes table window says so, in the engine's words, and shows no
 * table: a partial table would read as the whole database. The failure is one ERROR record of the
 * Core in the Engine log, not two.
 *
 * Before: CoreShapeSelector called processAllCoresFromShapes without awaiting it, so the throw was an
 * unhandled rejection and the window opened empty with no message.
 *
 * The engine's reply is stubbed in the builder's task queue: the stub does what
 * processAllCoresFromShapes does with an "Exception" reply (report it through the
 * (success, message) convention, then throw it).
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';
import { engineLogRecords } from './utils/index.js';

const FIXTURE = new URL('./fixtures/04_forward_xfmr_e3216_n87.json', import.meta.url).pathname;
const REPLY = 'Exception: E 42/21/15: the shape has no winding window dimensions';
const READABLE = 'E 42/21/15: the shape has no winding window dimensions';

test('SHAPETABLE-ERR: the shapes table window shows why the engine could not build it', async ({ page }) => {
    test.setTimeout(180000);
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(String(error?.message ?? error)));

    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
    await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
    await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
    await page.evaluate(() => {
        document.querySelector('#app').__vue_app__.config.globalProperties.$stateStore.setCurrentToolSubsection('magneticBuilder');
    });
    const shapesButton = page.locator('[data-cy$="-Core-ShapeTable-button"]').first();
    await expect(shapesButton).toBeVisible({ timeout: 30000 });

    // The engine refuses the table; the shape lists are fetched again, which rebuilds it.
    await page.evaluate((reply) => {
        const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
        const taskQueue = pinia._s.get('magneticBuilderTaskQueue');
        if (typeof taskQueue.processAllCoresFromShapes !== 'function') throw new Error('no taskQueue.processAllCoresFromShapes');
        window.__shapeTableCalls = 0;
        taskQueue.processAllCoresFromShapes = async () => {
            window.__shapeTableCalls += 1;
            taskQueue.allCoresFromShapesProcessed(false, reply);
            throw new Error(reply);
        };
        taskQueue.getCoreShapes(pinia._s.get('mas').mas, null);
    }, REPLY);
    await expect.poll(() => page.evaluate(() => window.__shapeTableCalls), { timeout: 30000 }).toBeGreaterThan(0);

    await shapesButton.click();
    const error = page.locator('[data-cy$="-ShapeTable-error"]').first();
    await expect(error, 'the window names the engine\'s reason').toBeVisible({ timeout: 15000 });
    await expect(error).toHaveText(`The core shapes table could not be built: ${READABLE}`);
    await expect(page.locator('[data-cy$="-ShapeTable"] table'), 'no table pretends to be the database').toHaveCount(0);

    // Reported once, as the Core's error, and caught (no unhandled rejection).
    await expect.poll(async () => (await engineLogRecords(page, { source: 'Core', level: 'ERROR' }))
        .filter((r) => r.message.includes(READABLE)).map((r) => r.count), { timeout: 10000 }).toEqual([1]);
    expect(pageErrors.filter((e) => e.includes('E 42/21/15')), 'the failure is caught').toEqual([]);
});
