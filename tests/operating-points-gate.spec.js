/**
 * Operating Points continue-gate: every winding is SEEDED with a default
 * excitation at initialization, so a purely structural check let users
 * Continue with a secondary they never looked at — the design was then sized
 * against a default triangular waveform nobody entered. The gate now requires
 * every winding's excitation to be PROCESSED (processed.rms filled by MKF when
 * the winding's editor opens) — the same signal the winding buttons use for
 * their orange/teal color — and surfaces the per-winding error message.
 */

import { test, expect } from './_coverage.js';
import { BASE_URL, pause } from './utils.js';

async function openFreshMagneticTool(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await pause(page, 800, 'mechanical: settle');
  await page.locator('[data-cy="Header-new-magnetic-link"]').click();
  await page.waitForURL('**/magnetic_tool**', { timeout: 45000 });
  await pause(page, 1500, 'mechanical: settle');
}

test.describe('Operating points continue gate', () => {
  test('untouched secondary blocks Continue with an error; opening it unblocks', async ({ page }) => {
    test.setTimeout(180000);
    await openFreshMagneticTool(page);

    // Two-winding design: one turns ratio → primary + secondary (mirroring
    // the DR panel's own winding-list sync).
    await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const mas = pinia._s.get('mas');
      mas.mas.inputs.designRequirements.turnsRatios = [{ nominal: 1 }];
      const coil = mas.mas.magnetic.coil;
      if (coil.functionalDescription.length < 2) {
        const secondary = JSON.parse(JSON.stringify(coil.functionalDescription[0]));
        secondary.name = 'Secondary';
        secondary.isolationSide = 'secondary';
        coil.functionalDescription.push(secondary);
      }
    });
    await pause(page, 500, 'mechanical: settle');

    const continueButton = page.locator('[data-cy="magnetic-synthesis-next-tool-button"]');
    await expect(continueButton).toBeVisible({ timeout: 15000 });
    await expect(continueButton).toBeEnabled({ timeout: 15000 });
    await continueButton.click();

    // Operating Points step: pick the manual mode — the primary's editor opens
    // (and processes); the secondary sits untouched on its seeded default.
    const manualButton = page.locator('button').filter({ hasText: 'I will define it manually' }).first();
    await expect(manualButton).toBeVisible({ timeout: 30000 });
    await manualButton.click();
    const secondaryButton = page.locator('[data-cy$="-operating-point-0-winding-1-select-button"]');
    await expect(secondaryButton).toBeVisible({ timeout: 30000 });

    // The primary processes on mount; the gate must still hold for the
    // untouched secondary: Continue disabled + a specific error message.
    await expect(continueButton).toBeDisabled({ timeout: 30000 });
    await expect(page.locator('[data-cy$="-OperatingPoints-error-text"]')).toContainText(
      /winding .* have not been defined yet/, { timeout: 30000 });

    // The secondary's excitation is the seeded default: waveforms exist but
    // rms (the processed marker) is absent — exactly the silent-default trap.
    const secondaryState = await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const excitation = pinia._s.get('mas').mas.inputs.operatingPoints[0].excitationsPerWinding[1];
      return {
        hasWaveform: excitation?.current?.waveform != null,
        rms: excitation?.current?.processed?.rms ?? null,
      };
    });
    expect(secondaryState.hasWaveform).toBe(true);
    expect(secondaryState.rms).toBeNull();

    // Opening the secondary runs the MKF processing (fills rms) → gate opens.
    await secondaryButton.click();
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      return pinia._s.get('mas').mas.inputs.operatingPoints[0].excitationsPerWinding[1]?.current?.processed?.rms != null;
    }, null, { timeout: 60000 });
    await expect(continueButton).toBeEnabled({ timeout: 30000 });
    await expect(page.locator('[data-cy$="-OperatingPoints-error-text"]')).not.toContainText(
      /have not been defined yet/, { timeout: 10000 });
  });
});
