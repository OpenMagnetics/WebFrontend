/**
 * A user's file (2026-10-13, ABT #1838): a PQ 35/40 transformer whose coil is stored
 * wound, seven sections stacked 1-2-1-2-1-2-1. On load the builder wound it again from the knobs
 * of the coil panel (pattern, proportions, margins), which it reads back from the stored sections.
 * That is not the stored layout: the re-wind came out 15 % taller than the winding window, the
 * turns overlapped, and the first simulation failed with a thermal "disconnected node(s)" banner
 * on a design that simulates fine as stored.
 *
 * The panel skipped its own wind while the design was loading, but the inputs it mounts report
 * their first value as an update, and so do the turns inputs next to it; each of those asked for a
 * wind. A coil that is loaded wound now keeps its layout until something a wind depends on changes.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/index.js';
import { numberInput } from './utils/builder-helpers.js';
import { installActivityProbe, activityMark, waitForIdle, waitForActionSince } from './utils/activity.js';

const FIXTURE = new URL('./fixtures/pq3540_stacked_1212121_stored_layout.json', import.meta.url).pathname;
const WIND = 'magneticBuilderTaskQueue.wind';

// Winds the engine was asked for since the page loaded, whatever their outcome.
const windCalls = (page) => page.evaluate((key) => {
  const probe = window.__omActivity;
  return (probe.completed[key] ?? 0)
    + probe.failed.filter((failure) => failure.action === key).length
    + [...probe.inflight.values()].filter((action) => action === key).length;
}, WIND);

const turnCoordinates = (page) => page.evaluate(() =>
  document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas
    .magnetic.coil.turnsDescription.map((turn) => [...turn.coordinates]));

const calculationIssues = (page) => page.locator('[data-cy$="-CalculationIssue"]').allInnerTexts();

test('LOADMAS-COIL-1: a coil loaded wound keeps its stored layout until the coil is changed', async ({ page }) => {
  test.setTimeout(300000);
  const stored = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const storedCoordinates = stored.magnetic.coil.turnsDescription.map((turn) => turn.coordinates);
  expect(storedCoordinates.length).toBe(88);

  const alerts = [];
  page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
  await installActivityProbe(page);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__ != null);
  const beforeLoad = await activityMark(page);
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
  await Promise.race([
    page.waitForURL('**/magnetic_tool**', { timeout: 120000 }),
    page.waitForEvent('dialog', { timeout: 120000 }),
  ]);
  expect(alerts, 'the load is not refused').toEqual([]);
  await expect(page.locator('[data-cy$="-NumberTurns-container"]').first()).toBeVisible({ timeout: 60000 });
  // The first simulation of the loaded design has run, or failed, once the app is idle.
  await waitForActionSince(page, beforeLoad, 'magneticBuilderTaskQueue.simulate', { timeout: 120000 });
  await waitForIdle(page, { since: beforeLoad, quietMs: 3000, timeout: 180000, label: 'the loaded design' });

  await test.step('loading does not wind, and the stored turns are the ones on screen', async () => {
    expect(await windCalls(page), 'winds asked of the engine during the load').toBe(0);
    expect(await turnCoordinates(page)).toEqual(storedCoordinates);
    const issues = await calculationIssues(page);
    expect(issues.filter((issue) => /thermal|temperature|disconnected|does not fit/i.test(issue)),
      'no thermal or fit "Calculation issue" on a layout that simulates as stored').toEqual([]);
  });

  await test.step('reloading the page does not wind it either', async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__omActivity != null);
    const beforeReload = await activityMark(page);
    await expect(page.locator('[data-cy$="-NumberTurns-container"]').first()).toBeVisible({ timeout: 120000 });
    await waitForActionSince(page, beforeReload, 'magneticBuilderTaskQueue.simulate', { timeout: 120000 });
    await waitForIdle(page, { since: beforeReload, quietMs: 3000, timeout: 180000, label: 'the reloaded design' });
    expect(await windCalls(page), 'winds asked of the engine after the reload').toBe(0);
    expect(await turnCoordinates(page)).toEqual(storedCoordinates);
  });

  await test.step('changing the number of turns winds the coil', async () => {
    const storedTurns = stored.magnetic.coil.functionalDescription[0].numberTurns;
    const beforeEdit = await activityMark(page);
    const turnsInput = numberInput(page.locator('[data-cy$="-NumberTurns-container"]').first());
    await turnsInput.click({ clickCount: 3 });
    await turnsInput.fill(String(storedTurns - 1));
    await turnsInput.press('Tab');
    await waitForActionSince(page, beforeEdit, WIND, { timeout: 60000 });
    await waitForIdle(page, { since: beforeEdit, quietMs: 1000, timeout: 180000, label: 'the edited design' });
    expect(await windCalls(page)).toBeGreaterThan(0);
    const rewound = await turnCoordinates(page);
    expect(rewound.length, 'one turn less on the first winding, times its parallels')
      .toBe(storedCoordinates.length - stored.magnetic.coil.functionalDescription[0].numberParallels);
    expect(rewound).not.toEqual(storedCoordinates.slice(0, rewound.length));
  });
});

/**
 * A planar coil loaded wound was kept, except when its wire could not be told by the two knobs
 * of the planar wire panel (copper thickness by standard name, track width). The panel's inputs
 * report an update when they receive the values read back from the stored wire; the panel then
 * built the wire again from the knobs, and for a wire named "3 oz." but 0.5 mm thick that is
 * another wire (0.104 mm): the design changed on load and its stored layout was cleared and
 * wound again. Nor did the planar coil panel ever end the loading state the loader turns on,
 * so the core panel ignored the user's changes from then on.
 */
const PLANAR_FIXTURE = new URL('./fixtures/planar_one_turn_copper_thickness_off_standard.json', import.meta.url).pathname;
const WIND_PLANAR = 'magneticBuilderTaskQueue.windPlanar';

test('LOADMAS-COIL-2: a planar coil loaded wound keeps its wire and its layout until the wire is changed', async ({ page }) => {
  test.setTimeout(300000);
  const stored = JSON.parse(fs.readFileSync(PLANAR_FIXTURE, 'utf8'));
  const storedCoordinates = stored.magnetic.coil.turnsDescription.map((turn) => turn.coordinates);
  const storedWire = stored.magnetic.coil.functionalDescription[0].wire;
  expect(storedWire.conductingHeight.nominal).toBe(0.0005);

  const planarWinds = () => page.evaluate((key) => {
    const probe = window.__omActivity;
    return (probe.completed[key] ?? 0)
      + probe.failed.filter((failure) => failure.action === key).length
      + [...probe.inflight.values()].filter((action) => action === key).length;
  }, WIND_PLANAR);
  const design = () => page.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    const coil = pinia._s.get('mas').mas.magnetic.coil;
    return {
      copperThickness: coil.functionalDescription[0].wire.conductingHeight.nominal,
      trackWidth: coil.functionalDescription[0].wire.conductingWidth.nominal,
      turns: coil.turnsDescription?.map((turn) => ({ coordinates: [...turn.coordinates], dimensions: [...turn.dimensions] })) ?? null,
      loadingDesign: pinia._s.get('state').loadingDesign,
    };
  });

  const alerts = [];
  page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
  await installActivityProbe(page);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__ != null);
  const beforeLoad = await activityMark(page);
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(PLANAR_FIXTURE);
  await Promise.race([
    page.waitForURL('**/magnetic_tool**', { timeout: 120000 }),
    page.waitForEvent('dialog', { timeout: 120000 }),
  ]);
  expect(alerts, 'the load is not refused').toEqual([]);
  const trackWidthInput = numberInput(page.locator('[data-cy$="-WirWidth-container"]').first());
  await expect(trackWidthInput).toBeVisible({ timeout: 60000 });
  await waitForIdle(page, { since: beforeLoad, quietMs: 3000, timeout: 180000, label: 'the loaded planar design' });

  await test.step('loading keeps the stored wire and the stored turns', async () => {
    expect(await planarWinds(), 'planar winds asked of the engine during the load').toBe(0);
    const loaded = await design();
    expect(loaded.copperThickness).toBe(storedWire.conductingHeight.nominal);
    expect(loaded.trackWidth).toBe(storedWire.conductingWidth.nominal);
    expect(loaded.turns.map((turn) => turn.coordinates)).toEqual(storedCoordinates);
  });

  await test.step('the loading state ends', async () => {
    await page.waitForFunction(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
      ._s.get('state').loadingDesign === false, null, { timeout: 15000 });
  });

  await test.step('changing the track width winds the coil with the new wire', async () => {
    const beforeEdit = await activityMark(page);
    await trackWidthInput.click({ clickCount: 3 });
    await trackWidthInput.fill('4');
    await trackWidthInput.press('Tab');
    await waitForActionSince(page, beforeEdit, WIND_PLANAR, { timeout: 60000 });
    await waitForIdle(page, { since: beforeEdit, quietMs: 1000, timeout: 180000, label: 'the edited planar design' });
    const edited = await design();
    expect(edited.trackWidth).toBeCloseTo(0.004, 9);
    expect(edited.turns.length).toBe(storedCoordinates.length);
    expect(edited.turns[0].dimensions[0]).toBeCloseTo(0.004, 9);
  });
});
