/**
 * User file 750372438rA.json (2026-10-13) was refused on load:
 *   "/inputs/operatingPoints/1/excitationsPerWinding/0/voltage must have required property 'waveform'".
 * Its second operating point was entered as a list of harmonics and saved while its signals still
 * held `harmonics` alone (the app's harmonics default; the Op. Points page has the engine rebuild
 * the waveform only when it is opened). The MAS schema requires a waveform or processed data on
 * every signal, so the MAS sentry refused the whole document. The loader now has MKF rebuild
 * those waveforms from the harmonics the file holds.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

const FIXTURE = new URL('./fixtures/default_two_winding_pq2715.json', import.meta.url).pathname;

test('LOADMAS-HARM-1: an operating point holding only harmonics loads, with its waveforms rebuilt', async ({ page }) => {
  test.setTimeout(180000);
  const mas = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const numberWindings = mas.inputs.operatingPoints[0].excitationsPerWinding.length;
  expect(numberWindings).toBe(2);
  // Exactly as the reported file carries them (defaultOperatingPointExcitationWithHarmonics).
  mas.inputs.operatingPoints.push({
    name: 'Op. Point No. 2',
    conditions: { ambientTemperature: 100 },
    excitationsPerWinding: Array.from({ length: numberWindings }, () => ({
      name: 'Primary winding excitation',
      frequency: 50,
      current: { harmonics: { amplitudes: [0, 10], frequencies: [0, 50] } },
      voltage: { harmonics: { amplitudes: [0, 100], frequencies: [0, 50] } },
    })),
  });

  const alerts = [];
  page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles({
    name: 'harmonics_only_operating_point.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(mas)),
  });
  await Promise.race([
    page.waitForURL('**/magnetic_tool**', { timeout: 120000 }),
    page.waitForEvent('dialog', { timeout: 120000 }),
  ]);
  expect(alerts, 'the load is not refused').toEqual([]);

  const excitations = await page.evaluate(() =>
    document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas
      .inputs.operatingPoints[1].excitationsPerWinding);
  expect(excitations.length).toBe(numberWindings);
  for (const excitation of excitations) {
    for (const [signalName, amplitude] of [['current', 10], ['voltage', 100]]) {
      const signal = excitation[signalName];
      expect(signal.waveform.data.length, `${signalName} waveform is rebuilt`).toBeGreaterThan(2);
      expect(signal.waveform.data.length).toBe(signal.waveform.time.length);
      // A 50 Hz sinusoid of the stored amplitude: one 20 ms period, peak and rms to match.
      expect(signal.waveform.time[signal.waveform.time.length - 1]).toBeGreaterThan(0.019);
      expect(signal.waveform.time[signal.waveform.time.length - 1]).toBeLessThanOrEqual(0.02);
      expect(Math.max(...signal.waveform.data)).toBeCloseTo(amplitude, 0);
      expect(signal.processed.rms).toBeCloseTo(amplitude / Math.SQRT2, 0);
      // The spectrum is still the one the file holds: the 50 Hz fundamental and nothing else.
      const fundamentalIndex = signal.harmonics.frequencies.indexOf(50);
      expect(fundamentalIndex, `${signalName} has a 50 Hz harmonic`).toBeGreaterThan(-1);
      expect(signal.harmonics.amplitudes[fundamentalIndex]).toBeCloseTo(amplitude, 0);
      signal.harmonics.amplitudes.forEach((harmonicAmplitude, index) => {
        if (index !== fundamentalIndex) {
          expect(Math.abs(harmonicAmplitude), `${signalName} harmonic at ${signal.harmonics.frequencies[index]} Hz`)
            .toBeLessThan(amplitude * 0.01);
        }
      });
    }
  }
});
