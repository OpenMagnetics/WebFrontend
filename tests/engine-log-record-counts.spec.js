/**
 * ABT #2410 (Alf, 2026-11-15): a user's drum (DR 2.8x1.0 (S), material A043, 200 turns of Round 0.034,
 * 2.9 A rms triangular / 200 V rectangular at 100 kHz, 100 uH required), loaded as they saved it.
 *
 * ENGLOG-COUNT-1: the Engine log header counted every repeat ("8 records, 4219 warnings, 3 errors"):
 * one loss-factor notice was logged once per harmonic per thermal iteration (x4128). The header now
 * counts records ("8 records: 5 warnings, 3 errors"), each row keeps its own repeat count, and MKF
 * reports a material used outside its data once per calculation, with the extremes asked.
 *
 * ENGLOG-COUNT-2: "Turns for inductance" on this drum fails in MKF (200 V for 5 us on a 0.79 mm2
 * centre column saturates any turns count that gives 100 uH). The Engine log states MKF's own reason
 * instead of "worker returned -1; see the worker console".
 *
 * Fixture: tests/fixtures/drum_dr2p8_a043_rectangular_100khz.json, the user's file unchanged.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';
import { engineLogRecords } from './utils/index.js';

const FIXTURE = new URL('./fixtures/drum_dr2p8_a043_rectangular_100khz.json', import.meta.url).pathname;
const LOSS_FACTOR = 'Material A043: its loss factor is tabulated from';

async function loadFixtureIntoBuilder(page) {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
    await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
    await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
    await page.evaluate(() => {
        document.querySelector('#app').__vue_app__.config.globalProperties.$stateStore.setCurrentToolSubsection('magneticBuilder');
    });
    await expect(page.locator('[data-cy$="-Core-Advise-button"]').first()).toBeVisible({ timeout: 30000 });
}

const counted = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;

test.describe('Engine log counts records (ABT #2410)', () => {
    test.describe.configure({ timeout: 240000 });

    test('ENGLOG-COUNT-1: the header counts distinct records; MKF reports the loss factor once per calculation with the range asked', async ({ page }) => {
        await loadFixtureIntoBuilder(page);
        await page.locator('[data-cy="EngineLogPanel-toggle"]').click({ timeout: 60000 });
        await expect.poll(async () => (await engineLogRecords(page)).some((r) => r.message.startsWith(LOSS_FACTOR)),
            { timeout: 120000 }).toBe(true);

        const lossFactor = (await engineLogRecords(page, { level: 'WARNING' })).filter((r) => r.message.startsWith(LOSS_FACTOR));
        expect(lossFactor, 'one row for the material and quantity').toHaveLength(1);
        // One report per calculation, naming the lowest and highest harmonic asked above its data.
        expect(lossFactor[0].latestDetail).toMatch(/^asked from \S+ \S*Hz to \S+ \S*Hz, above that range$/);

        // The header counts the rows, whatever their repeat counts; it is read when the log is quiet.
        const expectedHeader = async () => {
            const records = await engineLogRecords(page);
            const warnings = records.filter((r) => r.level === 'WARNING').length;
            const errors = records.filter((r) => r.level === 'ERROR' || r.level === 'CRITICAL').length;
            return `${counted(records.length, 'record')}: ${counted(warnings, 'warning')}` + (errors > 0 ? `, ${counted(errors, 'error')}` : '');
        };
        const header = page.locator('[data-cy="EngineLogPanel-counts"]');
        await expect.poll(async () => (await header.innerText()).replace(/\s+/g, ' ').trim() === await expectedHeader(),
            { timeout: 30000 }).toBe(true);
        // Each row keeps its own repeat count.
        const row = page.locator('[data-cy="EngineLogPanel-record"]').filter({ hasText: LOSS_FACTOR }).first();
        await expect(row).toBeVisible();
        const { count } = (await engineLogRecords(page)).find((r) => r.message.startsWith(LOSS_FACTOR));
        if (count > 1) await expect(row).toContainText(`x${count}`);
    });

    test('ENGLOG-COUNT-2: "Turns for inductance" on this drum logs MKF\'s reason, not "worker returned -1"', async ({ page }) => {
        await loadFixtureIntoBuilder(page);
        const turnsButton = page.locator('[data-cy$="-Core-TurnsToInductance-button"]').first();
        await expect(turnsButton).toBeEnabled({ timeout: 60000 });
        await turnsButton.click();
        await expect.poll(async () => (await engineLogRecords(page, { level: 'ERROR' }))
            .filter((r) => r.message.includes('Could not find a number of turns for the required inductance'))
            .map((r) => `${r.message} ${r.detail ?? ''}`).join('\n'), { timeout: 60000 })
            .toMatch(/cannot reach the magnetizing inductance of 100 uH with a core that is not saturated/);
        const all = (await engineLogRecords(page)).map((r) => `${r.message} ${r.detail ?? ''}`).join('\n');
        expect(all).not.toContain('worker returned');
        expect(await page.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas.magnetic.coil.functionalDescription[0].numberTurns),
            'the turns stay as they were').toBe(200);
    });
});
