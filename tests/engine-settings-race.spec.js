/**
 * ABT #1660: under imperial units, Wire Advise sometimes left the IEC wire on
 * the winding. Two races, both fixed:
 *
 * 1. Engine settings are one object in the worker, and writers used to read it
 *    whole, change their fields and write it whole back. A 2D redraw that read
 *    the settings before the advise pushed the NEMA standard wrote its stale
 *    (IEC) copy back after the push, and the advise offered IEC wires. Every
 *    settings change now goes through one queue, and the advise runs inside it.
 * 2. A wind started before the advised wire landed finished after it and wrote
 *    its coil, with the old wire, over the design. A wind whose windings changed
 *    while it ran is now discarded and the current coil is wound instead.
 *
 * SETTINGSRACE-1 redraws the 2D view every 25 ms (each redraw writes the
 * painter settings) for the whole of an imperial wire advise. It catches race 2
 * every time and race 1 about one run in three; SETTINGSRACE-2 checks the
 * settings queue itself deterministically.
 */
import { test, expect } from './_coverage.js';
import { goToBuilderStep, adviseCoreAndWait, adviseWireAndWait } from './utils/builder-helpers.js';

async function wireStandard(page) {
    return page.evaluate(() => {
        const wire = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas.magnetic.coil.functionalDescription[0].wire;
        if (typeof wire === 'string') return null;
        return wire.standard ?? wire.strand?.standard ?? null;
    });
}

test('SETTINGSRACE-1: 2D redraws during an imperial wire advise do not bring the IEC wire back', async ({ page }) => {
    test.setTimeout(300000);
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);
    await expect.poll(() => wireStandard(page), { timeout: 30000 }).toBe('IEC 60317');

    await page.evaluate(() => {
        const app = document.querySelector('#app').__vue_app__.config.globalProperties;
        app.$pinia._s.get('settings').userPreferences.unitSystem = 'imperial';
        // Count the winds that finish once the advised NEMA wire is on the winding:
        // the coil must be wound again for it, and nothing may put the IEC wire back.
        const masStore = app.$pinia._s.get('mas');
        window.__windsAfterNema = 0;
        app.$pinia._s.get('magneticBuilderTaskQueue').$onAction(({ name, args }) => {
            const wire = masStore.mas.magnetic.coil.functionalDescription?.[0]?.wire;
            if (name === 'wound' && args[0] === true && wire?.standard === 'NEMA MW 1000 C') {
                window.__windsAfterNema += 1;
            }
        });
        window.__redraws = 0;
        window.__redrawTimer = setInterval(() => { app.$stateStore.redraw(); window.__redraws++; }, 25);
    });
    try {
        await adviseWireAndWait(page);
    } finally {
        await page.evaluate(() => clearInterval(window.__redrawTimer));
    }
    expect(await page.evaluate(() => window.__redraws), 'redraws ran during the advise').toBeGreaterThan(10);
    await page.waitForFunction(() => window.__windsAfterNema >= 1, null, { timeout: 60000 });
    expect(await wireStandard(page), 'imperial advises a NEMA wire and it stays').toBe('NEMA MW 1000 C');
    const turns = await page.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
        ._s.get('mas').mas.magnetic.coil.turnsDescription?.length ?? 0);
    expect(turns, 'the coil is wound for the advised wire').toBeGreaterThan(0);

    await page.evaluate(() => {
        document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('settings').userPreferences.unitSystem = 'si';
    });
});

// The queue itself, deterministically: concurrent changes to different settings
// all survive. Without the queue every read happens before any write, and each
// write puts the others' fields back.
test('SETTINGSRACE-2: concurrent settings changes do not overwrite each other', async ({ page }) => {
    test.setTimeout(180000);
    await goToBuilderStep(page);
    const result = await page.evaluate(async () => {
        const taskQueue = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('magneticBuilderTaskQueue');
        const fields = ['painterColorFerrite', 'painterColorBobbin', 'painterColorCopper', 'painterColorInsulation', 'painterColorMargin', 'painterColorSpacer'];
        const before = await taskQueue.getSettings();
        for (const field of fields) {
            if (!(field in before)) throw new Error(`engine settings have no ${field}`);
        }
        await Promise.all(fields.map((field, i) => taskQueue.updateSettings((settings) => {
            settings[field] = `#00000${i}`;
        })));
        const after = await taskQueue.getSettings();
        await taskQueue.updateSettings((settings) => {
            for (const field of fields) settings[field] = before[field];
        });
        return fields.map((field, i) => [field, after[field], `#00000${i}`]);
    });
    for (const [field, got, wanted] of result) {
        expect(got, field).toBe(wanted);
    }
});
