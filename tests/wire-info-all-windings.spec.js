/**
 * With auto-simulation off, Resimulate updated Wire Info of the selected winding only: switching to
 * another winding showed zeros marked Outdated (Alf, 2026-11-05). Resimulate now computes every
 * winding's Wire Info, and switching shows that winding's result while its inputs are unchanged.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/index.js';

const FIXTURE = new URL('./fixtures/04_forward_xfmr_e3216_n87.json', import.meta.url).pathname;

test('WIRE-INFO-ALL: after Resimulate every winding shows its Wire Info, not Outdated', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__ != null);
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
  await page.waitForURL('**/magnetic_tool**', { timeout: 120000 });

  const wireInfo = page.locator('.wireinfo-panel').first();
  await expect(wireInfo).toBeVisible({ timeout: 60000 });
  await page.evaluate(() => {
    document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('magneticBuilderSettings').enableAutoSimulation = false;
  });

  await page.locator('[data-cy$="resimulate-button"]').first().click();
  await expect(wireInfo.locator('.wireinfo-outdated-badge'), 'winding 1 computed').toHaveCount(0, { timeout: 60000 });

  for (const winding of ['Winding 2', 'Winding 3']) {
    // The wire card's winding tabs come first in the page.
    await page.getByText(winding, { exact: true }).first().click();
    await expect(wireInfo.locator('.wireinfo-outdated-badge'), `${winding} is not Outdated`).toHaveCount(0, { timeout: 30000 });
    await expect(wireInfo.locator('.wireinfo-dimmed')).toHaveCount(0);
    await expect(wireInfo.locator('[data-cy$="-WireInfo-Error"]')).toHaveCount(0);
  }
});

// The converter engines return processed data without the effective frequency; the wizard hand-off
// went straight to the builder with it null, and Wire Info's Jeff came out as negative micro-amperes
// (the customer report of ABT #2277). The hand-off completes it from MKF's processing.
test('WIRE-INFO-HANDOFF: a wizard hand-off reaches the builder with effective frequencies, and Wire Info computes', async ({ page }) => {
  test.setTimeout(180000);
  const { goToBuilderStep, adviseCoreAndWait, adviseWireAndWait } = await import('./utils/builder-helpers.js');
  await goToBuilderStep(page);
  const processed = await page.evaluate(() => {
    const mas = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas;
    return mas.inputs.operatingPoints.flatMap((op) => op.excitationsPerWinding.flatMap((excitation) =>
      ['current', 'voltage'].map((signal) => ({ signal, effectiveFrequency: excitation[signal]?.processed?.effectiveFrequency }))));
  });
  for (const { signal, effectiveFrequency } of processed) {
    expect(effectiveFrequency, `${signal} effective frequency`).toBeGreaterThan(0);
  }
  await adviseCoreAndWait(page);
  await adviseWireAndWait(page);
  const wireInfo = page.locator('.wireinfo-panel').first();
  await expect(wireInfo.locator('.wireinfo-grid')).toBeVisible({ timeout: 60000 });
  await expect(wireInfo.locator('[data-cy$="-WireInfo-Error"]')).toHaveCount(0);
});
