/**
 * ABT #1855 (Alf, 2026-10-14): a saturating operating point gives a saturation warning for that point
 * and does not stop the simulation of the others. MKF's simulate returns numbers for every point;
 * analyze_results says which of them describe a saturated core, and the builder shows that next to
 * the point.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

const fixture = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url).pathname, 'utf8'));

test.describe('Simulation findings per operating point (ABT #1855)', () => {
  test('SIMFIND-1: an operating point that saturates is named; the other one still simulates', async ({ page }) => {
    test.setTimeout(300000);
    const mas = fixture('default_two_winding_pq2715.json');
    // A real wire, wound by MKF: the fixture's placeholder "Dummy" wire burns about 2 kW.
    for (const winding of mas.magnetic.coil.functionalDescription) {
      winding.wire = 'Round 0.4 - Grade 1';
    }
    delete mas.magnetic.coil.sectionsDescription;
    delete mas.magnetic.coil.layersDescription;
    delete mas.magnetic.coil.turnsDescription;
    const [first] = mas.inputs.operatingPoints;
    first.name = 'Nominal';
    // The same voltages at a twentieth of the frequency: twenty times the volt-seconds.
    const slow = JSON.parse(JSON.stringify(first));
    slow.name = 'Twenty times slower';
    for (const excitation of slow.excitationsPerWinding) {
      excitation.frequency /= 20;
      for (const signal of [excitation.voltage, excitation.current]) {
        if (signal == null) continue;
        signal.waveform.time = signal.waveform.time.map((time) => time * 20);
        delete signal.harmonics;
      }
    }
    mas.inputs.operatingPoints = [first, slow];
    delete mas.outputs;

    const alerts = [];
    page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles({
      name: 'one_point_saturates.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(mas)),
    });
    await page.waitForURL('**/magnetic_tool**', { timeout: 120000 });
    expect(alerts, 'the load is not refused').toEqual([]);

    const slowPoint = page.locator('[data-cy$="-SimulationFindings-1"]');
    await expect(slowPoint).toContainText('Twenty times slower', { timeout: 180000 });
    await expect(slowPoint).toContainText('The core saturates');
    await expect(page.locator('[data-cy$="-SimulationFindings-0"]').filter({ hasText: 'saturates' })).toHaveCount(0);

    // Both points were simulated: the saturating one does not take the other's numbers with it.
    const outputs = await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      return pinia._s.get('mas').mas.outputs;
    });
    expect(outputs.length).toBe(2);
    expect(outputs[0].coreLosses.coreLosses).toBeGreaterThan(0);
    expect(outputs[1].coreLosses).toBeTruthy();
  });

  test('SIMFIND-2: a voltage whose volt-seconds do not balance is simulated and named', async ({ page }) => {
    test.setTimeout(300000);
    // ABT #1855 (Alf, 2026-10-14): MKF no longer refuses an unbalanced voltage; it simulates its
    // balanced part (the mean removed) and says so for that operating point.
    const mas = fixture('multicolumn_e42_transformer.json');
    const excitation = mas.inputs.operatingPoints[0].excitationsPerWinding[0];
    const period = 1 / excitation.frequency;
    excitation.voltage = { waveform: { data: [0, 60, 60, 0, 0], time: [0, 0, period / 2, period / 2, period] } };
    const alerts = [];
    const warnings = [];
    page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
    page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()); });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles({
      name: 'unbalanced_voltage.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(mas)),
    });
    await page.waitForURL('**/magnetic_tool**', { timeout: 120000 });
    expect(alerts, 'the load is not refused').toEqual([]);
    expect(warnings.filter((text) => text.includes('MKF could not complete this design')), 'MKF completes the design').toEqual([]);
    const point = page.locator('[data-cy$="-SimulationFindings-0"]');
    await expect(point).toContainText('not volt-second balanced', { timeout: 180000 });
    await expect(point).toContainText('the mean removed');
    await expect(page.locator('[data-cy$="-CalculationIssue"]')).toHaveCount(0);
  });
});
