/**
 * Circuit-simulator CSV import, end to end (ABT #1302, #1325).
 *
 * A user importing an LTspice export (time, I(L1), V(p1,p2)) at 45 kHz was told
 * "Could not read the magnetizing inductance ... resolve_dimension_with_tolerance did not return
 * within 120s". Three things were wrong behind it: the import was quadratic in the points per
 * period, the engine watchdog blamed whichever call happened to be queued, and V(p1,p2) was never
 * auto-detected on a one-winding design. file-uploads.spec.js only proves an upload input exists;
 * these tests drive the importer the way the user did and check what it produces.
 *
 * The waveforms are generated here, so every expected number is known exactly:
 *   current  triangle 2 A -> 3 A (rising for 40 % of the period) -> 2 A
 *   voltage  +24 V for 40 % of the period, -12 V for the rest
 *   => peak-to-peak 1 A, offset 2.5 A, mean |v*i| = 0.4*24*2.5 + 0.6*12*2.5 = 42 W
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL, collectConsoleErrors } from './utils/index.js';

// A one-winding design: the reported file came from an inductor.
const INDUCTOR_MAS = new URL('./fixtures/etd49_wound_10uH_5T.json', import.meta.url).pathname;
const FREQUENCY = 45000;

function writeExport(path, { separator, periods, pointsPerPeriod }) {
    const period = 1 / FREQUENCY;
    const total = periods * pointsPerPeriod;
    const lines = [['time', 'I(L1)', 'V(p1,p2)'].join(separator)];
    for (let i = 0; i < total; i++) {
        const t = periods * period * i / (total - 1);
        const phase = (t % period) / period;
        const current = phase < 0.4 ? 2 + phase / 0.4 : 3 - (phase - 0.4) / 0.6;
        const voltage = phase < 0.4 ? 24 : -12;
        lines.push([t.toExponential(12), current.toExponential(12), voltage.toExponential(12)].join(separator));
    }
    fs.writeFileSync(path, lines.join('\n'));
}

async function openCircuitSimulatorImport(page) {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(INDUCTOR_MAS);
    await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
    await page.getByText('Op. Points', { exact: true }).first().click();
    const upload = page.locator('#OperatingPoint-CircuitSimulator-upload-input');
    // A loaded design opens its operating point in manual mode; the importer is one step back.
    const backToModes = page.getByRole('button', { name: /Go back to selecting mode/i });
    await expect(upload.or(backToModes).first()).toBeAttached({ timeout: 30000 });
    if (await upload.count() === 0) {
        await backToModes.click();
    }
    await expect(upload).toBeAttached({ timeout: 15000 });
    return upload;
}

async function numberIn(page, dataCySuffix) {
    const label = page.locator(`[data-cy$="${dataCySuffix}-number-label"]`).first();
    await expect(label).toBeVisible();
    return Number((await label.innerText()).trim());
}

async function importAndConfirm(page, file) {
    const upload = await openCircuitSimulatorImport(page);
    await upload.setInputFiles(file);

    const columns = page.locator('.opc-card-body');
    await expect(columns).toBeVisible({ timeout: 120000 });
    // Auto-detection fills both signals: V(p1,p2) used to be filed under a second winding.
    await expect(columns).toContainText(/Current\s*I\(L1\)/);
    await expect(columns).toContainText(/Voltage\s*V\(p1,p2\)/);

    const frequency = page.locator('[data-cy*="-Frequency"] input').first();
    await frequency.fill(String(FREQUENCY));
    await frequency.press('Enter');

    const started = Date.now();
    await page.locator('[data-cy$="-import-button"]').first().click();
    await expect(page.locator('.opc-loading')).toHaveCount(0, { timeout: 120000 });
    await expect(page.locator('.opc-error')).toHaveCount(0);
    return Date.now() - started;
}

async function expectImportedSignals(page) {
    await expect.poll(() => numberIn(page, '-InstantaneousPower'), { timeout: 60000 }).toBeCloseTo(42, 0);
    expect(await numberIn(page, '-rmsPower')).toBeGreaterThan(0);
    const texts = await page.locator('[data-cy$="-PeakToPeak-number-label"]').allInnerTexts();
    expect(texts.length, 'current and voltage peak-to-peak are shown').toBeGreaterThanOrEqual(2);
    // Current 1 A peak to peak; voltage 36 V (24 - (-12)).
    expect(texts.map((t) => Number(t.trim()))).toEqual(expect.arrayContaining([
        expect.closeTo(1, 2), expect.closeTo(36, 1),
    ]));
}

test.describe('Circuit-simulator CSV import', () => {
    test.describe.configure({ timeout: 300000 });

    test('CSV-1: LTspice export (tab) on a one-winding design imports I(L1) and V(p1,p2)', async ({ page }, testInfo) => {
        const getErrors = collectConsoleErrors(page);
        const file = testInfo.outputPath('ltspice_inductor.txt');
        writeExport(file, { separator: '\t', periods: 4, pointsPerPeriod: 2000 });

        await importAndConfirm(page, file);
        await expectImportedSignals(page);
        expect(getErrors()).toEqual([]);
    });

    test('CSV-2: comma-separated export keeps V(p1,p2) as one column', async ({ page }, testInfo) => {
        const file = testInfo.outputPath('ltspice_inductor.csv');
        writeExport(file, { separator: ',', periods: 3, pointsPerPeriod: 1500 });

        await importAndConfirm(page, file);
        await expectImportedSignals(page);
    });

    test('CSV-3: a dense export (200k points per period) imports well inside the engine watchdog', async ({ page }, testInfo) => {
        const file = testInfo.outputPath('ltspice_dense.txt');
        writeExport(file, { separator: '\t', periods: 2, pointsPerPeriod: 200000 });

        const elapsed = await importAndConfirm(page, file);
        // The engine watchdog aborts a call after 120 s; before ABT #1302 this file took minutes.
        expect(elapsed).toBeLessThan(60000);
        await expect(page.getByText(/did not return within/)).toHaveCount(0);
        await expectImportedSignals(page);
    });
});
