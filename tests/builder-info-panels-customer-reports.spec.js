/**
 * Two user reports of 2026-11-05 and the panels they exposed.
 *
 * ABT #2276: "for any transformer design I cannot get core and coil info; this json was ok 2 weeks
 * ago". The web's Heatsink cooling option wrote only the heatsink's own resistance, and since
 * 2026-10-24 (ABT #1611) MKF refuses a heatsink without the thermal interface between the core and it.
 * Such a design now loads with the interface the Heatsink option writes (Alf: 1 K*cm^2/W).
 *
 * ABT #2277: after a core change Core Info stayed "Outdated" and Resimulate did nothing; Wire Info's
 * current density read negative micro- or nano-amperes.
 * - A current whose processed data lacks the effective frequency had every Wire Info AC figure
 *   refused by MKF, and the bindings' -1 shown as -0.08 uA/mm2. A refused figure is now Wire Info's
 *   error, never a number.
 * - When the simulation fails (there: the coil no longer fits the new core) the panels kept the
 *   previous core's numbers and the reason reached only the Engine log. Now they show the reason
 *   (first sentence, all of it on hover) and hide the stale numbers (Alf, 2026-11-05).
 *
 * ABT #2273: a core that self-heats past its material data (here N87's Curie point) is held there by
 * MKF, and the loss at the held state is tiny (0.13 W shown for a 2.2 kW core). Core Info says so,
 * with the limit and the loss just before the hold.
 *
 * The fixture is a wound ETD 49 inductor; each test changes in memory only what the report was about.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/index.js';

const FIXTURE = new URL('./fixtures/etd49_wound_10uH_5T.json', import.meta.url).pathname;

async function loadDesign(page, testInfo, edit) {
  const mas = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  edit(mas);
  const file = testInfo.outputPath('design.json');
  fs.writeFileSync(file, JSON.stringify(mas));
  const alerts = [];
  page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__ != null);
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(file);
  await Promise.race([
    page.waitForURL('**/magnetic_tool**', { timeout: 120000 }),
    page.waitForEvent('dialog', { timeout: 120000 }),
  ]);
  expect(alerts, 'the load is not refused').toEqual([]);
}

const coreLosses = (page) => page.locator('.coreinfo-panel [data-cy$="-CoreLosses-container"]');
const coreError = (page) => page.locator('[data-cy$="-CoreInfo-SimulationError"]');

test('INFO-2276: a design with the old Heatsink cooling opens with Core and Coil Info computed', async ({ page }, testInfo) => {
  test.setTimeout(240000);
  await loadDesign(page, testInfo, (mas) => {
    mas.inputs.operatingPoints[0].conditions.cooling = { thermalResistance: 5 };
  });
  await expect(coreLosses(page).first(), 'Core Info computes').toBeVisible({ timeout: 120000 });
  await expect(coreError(page)).toHaveCount(0);
  await expect(page.locator('[data-cy$="-CoilInfo-SimulationError"]')).toHaveCount(0);
  const cooling = await page.evaluate(() =>
    document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas.inputs.operatingPoints[0].conditions.cooling);
  expect(cooling.thermalResistance).toBe(5);
  expect(cooling.interfaceThermalResistance, 'the interface the Heatsink option writes').toBe(1e-4);

  // Op. Points shows it as a pad datasheet gives it, editable.
  await page.locator('.storyline-step').filter({ hasText: /Op.*Points/i }).first().click();
  const interfaceRth = page.locator('[data-cy$="-ConditionsHeatsinkInterfaceRth-number-input"] input').first();
  await expect(interfaceRth).toBeVisible({ timeout: 30000 });
  await expect(interfaceRth).toHaveValue(/^1(\.0*)?$/);
  await expect(page.locator('[data-cy$="-ConditionsHeatsinkInterfaceRth-DimensionUnit-text"]').first()).toHaveText(/K·cm²\/W/);
});

test('INFO-2277-ERR: a simulation that fails shows its reason in Core Info and hides the previous numbers', async ({ page }, testInfo) => {
  test.setTimeout(240000);
  await loadDesign(page, testInfo, () => {});
  await expect(coreLosses(page).first()).toBeVisible({ timeout: 120000 });
  // A cold plate without its interface: MKF refuses it by name (ABT #1611), as it refused the
  // user's coil once it no longer fit the new core.
  await page.evaluate(() => {
    const app = document.querySelector('#app').__vue_app__.config.globalProperties;
    app.$pinia._s.get('mas').mas.inputs.operatingPoints[0].conditions.cooling = { thermalResistance: 5, maximumTemperature: 80 };
    app.$stateStore.resimulate();
  });
  await expect(coreError(page), 'the reason is in the panel').toBeVisible({ timeout: 120000 });
  await expect(coreError(page)).toHaveAttribute('aria-label', /interfaceThermalResistance/);
  await expect(coreLosses(page), 'the previous design\'s core losses are gone').toHaveCount(0);
});

test('INFO-2273: a core held at its Curie point says so in Core Info, with the loss before the hold', async ({ page }, testInfo) => {
  test.setTimeout(240000);
  // Four times the fixture's excitation (waveforms, harmonics and levels alike): the N87 core
  // self-heats past its 210 C Curie point.
  await loadDesign(page, testInfo, (mas) => {
    for (const excitation of mas.inputs.operatingPoints[0].excitationsPerWinding) {
      for (const signal of [excitation.current, excitation.voltage]) {
        signal.waveform.data = signal.waveform.data.map((value) => 4 * value);
        signal.harmonics.amplitudes = signal.harmonics.amplitudes.map((value) => 4 * value);
        for (const key of ['peak', 'peakToPeak', 'rms', 'offset']) signal.processed[key] *= 4;
      }
    }
  });
  await expect(coreLosses(page).first()).toBeVisible({ timeout: 120000 });
  // In Core Info's title bar (Alf, 2026-11-05).
  const hold = page.locator('.coreinfo-header [data-cy$="-CoreInfo-HeldAtDataLimit"]');
  await expect(hold).toHaveText(/Held at 210\s*°C/);
  await expect(hold).toHaveAttribute('aria-label', /Curie temperature \(210\s*°C\)/);
  await expect(hold).toHaveAttribute('aria-label', /Just before the hold the core lost \d+(\.\d+)?\s*k?W/);
});
