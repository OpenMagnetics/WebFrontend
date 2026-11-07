/**
 * ABT #2301 (a user, 2026-11-07): a forward transformer on a PQ 26/25 came out with its Primary and
 * Secondary inside the core's centre column, and its simulation stopped. The user "just entered the
 * turns and a small wire size". Cause: Winding Studio section rectangles ("pins", kept by section NAME)
 * from an earlier design in the same tab were re-imposed on every wind of the new one. A 2 px nudge of a
 * selected section in the Studio pins it, and nothing visible happens, so the user never knew.
 *
 *  - PINS-1: the user's path. Design 1 on E 20/10/6, sections nudged in the Studio; New Magnetic,
 *    the same wizard, PQ 26/25 with the same turns and wires. Every section must lie in the PQ 26/25 window.
 *  - PINS-2: a pin that lies outside the coil's winding window (drawn on another design or core) is dropped
 *    at the next wind and the Engine log says so.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL, engineLogMessages } from './utils/index.js';
import { numberInput } from './utils/builder-helpers.js';
import { openWizard, runAnalytical, clickDesignMagnetic } from './utils/index.js';
import { installActivityProbe, activityMark, waitForIdle, waitForActionSince } from './utils/activity.js';

const WIND = 'magneticBuilderTaskQueue.wind';
const FIXTURE = new URL('./fixtures/default_two_winding_pq2715.json', import.meta.url).pathname;

// The coil as the user sees it: where each section and winding sits against the bobbin's winding window (mm).
const coilState = (page) => page.evaluate(() => {
  const stores = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s;
  const coil = stores.get('mas').mas.magnetic.coil;
  const bobbin = Array.isArray(coil.bobbin) ? coil.bobbin[0] : coil.bobbin;
  const window = bobbin?.processedDescription?.windingWindows?.[0];
  const mm = (value) => +(value * 1e3).toFixed(3);
  return {
    windowInnerX: mm(window.coordinates[0] - window.width / 2),
    windowOuterX: mm(window.coordinates[0] + window.width / 2),
    conductiveSections: (coil.sectionsDescription ?? []).filter((section) => section.type === 'conduction')
      .map((section) => ({ name: section.name, innerX: mm(section.coordinates[0] - section.dimensions[0] / 2),
        outerX: mm(section.coordinates[0] + section.dimensions[0] / 2) })),
    turnsMinX: Object.fromEntries(Object.entries((coil.turnsDescription ?? []).reduce((byWinding, turn) => {
      (byWinding[turn.winding] ??= []).push(mm(turn.coordinates[0]));
      return byWinding;
    }, {})).map(([winding, xs]) => [winding, Math.min(...xs)])),
    pins: Object.keys(stores.get('windingStudio')?.customSectionRects ?? {}),
  };
});

const expectEverySectionInWindow = (state) => {
  expect(state.conductiveSections.length).toBeGreaterThan(0);
  for (const section of state.conductiveSections) {
    expect(section.innerX, `${section.name} starts inside the winding window`).toBeGreaterThanOrEqual(state.windowInnerX - 0.01);
    expect(section.outerX, `${section.name} ends inside the winding window`).toBeLessThanOrEqual(state.windowOuterX + 0.01);
  }
};

async function pick(page, suffix, label) {
  const mark = await activityMark(page);
  await page.locator(`[data-cy$="${suffix}-select"]`).first().click();
  await page.getByRole('option', { name: label, exact: true }).first().click();
  await waitForIdle(page, { since: mark, quietMs: 3000, timeout: 200000, label: suffix });
}

async function setNumber(page, suffix, value) {
  const mark = await activityMark(page);
  const input = page.locator(`[data-cy$="${suffix}-number-input"] input`).first();
  await input.click();
  await input.press('Control+a');
  await input.type(String(value), { delay: 40 });
  await input.press('Tab');
  await waitForIdle(page, { since: mark, quietMs: 3000, timeout: 200000, label: suffix });
}

// Core, material, then the user's three windings: 10 turns of 0.5 mm, 10 of 0.25 mm, 1 of foil 8 mm x 100 um.
async function designForwardTransformer(page, shapeFamily, shape) {
  await pick(page, '-ShapeFamilies', shapeFamily);
  await pick(page, '-ShapeNames', shape);
  const material = await page.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas.magnetic.core.functionalDescription.material);
  if (!(material?.name === 'PC44' || material === 'PC44')) {
    await pick(page, '-MaterialManufacturers', 'TDK');
    await pick(page, '-MaterialNames', 'PC44');
  }
  const windings = [[10, 'Round', '0.5 mm'], [10, 'Round', '0.25 mm'], [1, 'Foil', null]];
  for (let index = 0; index < windings.length; index++) {
    const [turns, type, diameter] = windings[index];
    await page.getByRole('button', { name: `Winding ${index + 1}`, exact: true }).first().click();
    await setNumber(page, '-NumberTurns', turns);
    const wire = await page.evaluate((k) => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas.magnetic.coil.functionalDescription[k].wire, index);
    if (type === 'Round') {
      if (wire?.type !== 'round') await pick(page, '-WireType', 'Round');
      if (wire?.standardName !== diameter) await pick(page, '-WireConductingDiameter', diameter);
    }
    else {
      if (wire?.type !== 'foil') await pick(page, '-WireType', 'Foil');
      await setNumber(page, '-WireConductingHeight', 8);
      const unit = (await page.locator('[data-cy$="-WireConductingWidth-DimensionUnit-input"]').first().innerText()).trim();
      if (!/^(um|µm|μm)$/.test(unit)) throw new Error(`The foil width input is in '${unit}', this test enters micrometres`);
      await setNumber(page, '-WireConductingWidth', 100);
    }
  }
}

// What the user did without meaning to: select a section in the Studio and move it 2 px.
async function nudgeInStudio(page, sectionName) {
  const section = page.locator(`[data-cy$="-WindingStudio-section-${sectionName}"]`).first();
  const box = await section.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const handle = page.locator('[data-cy$="-WindingStudio-transform-move"]').first();
  await handle.waitFor({ state: 'visible', timeout: 10000 });
  const handleBox = await handle.boundingBox();
  const mark = await activityMark(page);
  const x = handleBox.x + handleBox.width / 2;
  const y = handleBox.y + handleBox.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 2, y + 2, { steps: 2 });
  await page.mouse.up();
  await waitForIdle(page, { since: mark, quietMs: 3000, timeout: 200000, label: 'studio nudge' });
}

test('PINS-1: section rectangles drawn on an earlier design are not imposed on a new one', async ({ page }) => {
  test.setTimeout(1200000);
  await installActivityProbe(page);
  await openWizard(page, 'SingleSwitchForward-link');
  await runAnalytical(page, 120000);
  let mark = await activityMark(page);
  await clickDesignMagnetic(page);
  await waitForIdle(page, { since: mark, quietMs: 4000, timeout: 240000, label: 'the first design' });
  await designForwardTransformer(page, 'E', 'E 20/10/6');

  if (await page.locator('[data-cy$="-WindingStudio"]').count() === 0) {
    await page.locator('[data-cy$="-Coil-WindingStudio-button"]').first().click();
  }
  await page.locator('[data-cy$="-WindingStudio-section-Primary section 0"]').first().waitFor({ state: 'attached', timeout: 60000 });
  await nudgeInStudio(page, 'Primary section 0');
  await nudgeInStudio(page, 'Secondary 0 section 0');
  expect((await coilState(page)).pins.length, 'the nudges pinned the sections of the first design').toBeGreaterThan(0);

  // New Magnetic -> Single-Switch Forward, in the app (no reload: a reload empties the store and hides the bug).
  await page.evaluate(() => {
    const toggle = document.querySelector('[data-cy="Header-new-magnetic-toggle"]');
    toggle.click();
    const menu = (toggle.closest('.dropdown') || toggle.parentElement).querySelector('.dropdown-menu');
    if (menu) menu.classList.add('show');
    const link = document.querySelector('[data-cy="SingleSwitchForward-link"]');
    const group = link.closest('.dropdown-submenu');
    if (group) {
      group.querySelector('.dropdown-submenu-toggle')?.click();
      group.querySelector('.submenu-panel')?.classList.add('submenu-open');
    }
    link.click();
  });
  await page.waitForURL('**/wizards', { timeout: 120000 });
  await runAnalytical(page, 120000);
  mark = await activityMark(page);
  await clickDesignMagnetic(page);
  await waitForIdle(page, { since: mark, quietMs: 4000, timeout: 240000, label: 'the second design' });
  await designForwardTransformer(page, 'PQ', 'PQ 26/25');

  const state = await coilState(page);
  expect(state.pins, 'no section rectangle of the first design is left').toEqual([]);
  expectEverySectionInWindow(state);
  for (const [winding, innerX] of Object.entries(state.turnsMinX)) {
    expect(innerX, `the turns of ${winding} are not inside the centre column`).toBeGreaterThan(state.windowInnerX - 0.01);
  }
});

test('PINS-2: a section rectangle outside the winding window is dropped at the next wind, and said so', async ({ page }) => {
  test.setTimeout(300000);
  await installActivityProbe(page);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__ != null);
  const beforeLoad = await activityMark(page);
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(FIXTURE);
  await page.waitForURL('**/magnetic_tool**', { timeout: 120000 });
  await expect(page.locator('[data-cy$="-NumberTurns-container"]').first()).toBeVisible({ timeout: 60000 });
  await waitForIdle(page, { since: beforeLoad, quietMs: 3000, timeout: 180000, label: 'the loaded design' });

  // A rectangle drawn on a smaller core: 3.5 mm from the axis, inside this PQ 27/15's centre column.
  await page.evaluate(() => {
    const studio = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('windingStudio');
    studio.setCustomSectionRect('Primary section 0', { coordinates: [0.0035, 0], dimensions: [0.001, 0.003], windowShape: 'rectangular' });
  });

  const beforeEdit = await activityMark(page);
  const turnsInput = numberInput(page.locator('[data-cy$="-NumberTurns-container"]').first());
  await turnsInput.click({ clickCount: 3 });
  await turnsInput.fill('14');
  await turnsInput.press('Tab');
  await waitForActionSince(page, beforeEdit, WIND, { timeout: 60000 });
  await waitForIdle(page, { since: beforeEdit, quietMs: 2000, timeout: 180000, label: 'the edited design' });

  const state = await coilState(page);
  expect(state.pins).toEqual([]);
  expectEverySectionInWindow(state);
  const notices = await engineLogMessages(page, { source: 'Winding Studio', level: 'WARNING' });
  expect(notices.some((message) => message.includes("'Primary section 0'") && message.includes('outside this coil\'s winding window')),
    `the Engine log says the rectangle was dropped: ${JSON.stringify(notices)}`).toBe(true);
});
