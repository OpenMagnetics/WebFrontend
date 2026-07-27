/**
 * ABT #223: the WASM binding for calculate_instantaneous_power "guarded" the
 * missing processed data with
 *     if (!excitation.get_current().value().get_processed().value().get_rms().value())
 * which dereferences the very optionals it is testing. On the DEFAULT manual
 * operating-point view the excitations carry waveforms but no `processed` block
 * yet, so every call threw bad_optional_access and the worker logged a generic
 * "[MKF Worker] Error calling calculate_instantaneous_power" (8-16 per view).
 *
 * The binding now calls Inputs::calculate_instantaneous_power directly, which
 * works from the waveforms and throws specific MISSING_DATA messages instead.
 */

import { test, expect } from './_coverage.js';
import { BASE_URL, pause } from './utils.js';

const POWER_ERROR = /calculate_instantaneous_power|Power calculation failed/i;

test.describe('Instantaneous power on the default manual operating point', () => {
  test('no power-calculation errors when the manual editor opens', async ({ page }) => {
    test.setTimeout(180000);

    const powerErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && POWER_ERROR.test(message.text())) {
        powerErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => {
      if (POWER_ERROR.test(String(error?.message ?? error))) {
        powerErrors.push(String(error?.message ?? error));
      }
    });

    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await pause(page, 800, 'mechanical: settle');
    await page.locator('[data-cy="Header-new-magnetic-link"]').click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 45000 });
    await pause(page, 1500, 'mechanical: settle');

    const continueButton = page.locator('[data-cy="magnetic-synthesis-next-tool-button"]');
    await expect(continueButton).toBeEnabled({ timeout: 30000 });
    await continueButton.click();

    const manualButton = page.locator('button').filter({ hasText: 'I will define it manually' }).first();
    await expect(manualButton).toBeVisible({ timeout: 30000 });
    await manualButton.click();

    // The primary's editor mounts and processes; that is the flow that used to
    // spray the worker errors.
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      return pinia._s.get('mas').mas.inputs.operatingPoints[0]
        ?.excitationsPerWinding[0]?.current?.processed?.rms != null;
    }, null, { timeout: 60000 });
    await pause(page, 1500, 'mechanical: let pending power calls resolve');

    expect(powerErrors, `power calculation errors:\n${powerErrors.join('\n')}`).toEqual([]);
  });
});
