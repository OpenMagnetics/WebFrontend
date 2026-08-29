/**
 * Winding Studio (P0) — JS-rendered interactive cross-section, feature-flagged.
 *
 * The studio renders the coil cross-section as live SVG straight from the MAS
 * descriptions (no WASM painter in the loop), so turns/sections are DOM nodes
 * with identity. This suite verifies:
 *   WS-1  In the real builder: toggling the Studio button swaps the painter
 *         SVG for the studio and renders one glyph per turn + the section
 *         outlines (classic ER coil).
 *   WS-2  Hovering a turn shows the tooltip (real builder).
 *   WS-3  A multi-column (lateral-leg) MAS renders turns in BOTH windows,
 *         including the return crossings from additionalCoordinates. Runs on
 *         the /winding_studio_dev harness: the builder's auto-rewind still
 *         goes through the legacy single-window wind() (multi-column wiring
 *         is P1) and would replace the injected multi-column coil.
 *
 * WS-1/2 use the same Pinia injection setup as coil-plot-wasm.spec.js.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from './_coverage.js';
import { BASE_URL, screenshot, pause } from './utils.js';

// ABT #929: repo-relative, not '/home/alf/...'. These only ever resolved on one machine.
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const fixture = (...parts) => path.join(REPO_ROOT, ...parts);

const CLASSIC_FIXTURE = fixture('MagneticBuilder', 'src', 'public', 'test_wound_coil.json');
const MULTICOLUMN_FIXTURE = fixture('tests', 'fixtures', 'multicolumn_e42_transformer.json');
const TOROIDAL_FIXTURE = fixture('tests', 'fixtures', 'toroidal_cmc_t2515.json');
const CORRUPT_TOROID_FIXTURE = fixture('tests', 'fixtures', 'toroidal_stale_pin_corrupt_t402416.json');
const CATALOG_BOBBIN_FIXTURE = fixture('tests', 'fixtures', 'multicolumn_e42_catalog_bobbin.json');
const ss = (page, name) => screenshot(page, 'winding-studio', name);

function countTurnGlyphs(parsed) {
  const turns = parsed.magnetic.coil.turnsDescription;
  const base = turns.reduce(
    (count, turn) => count + 1 + (turn.additionalCoordinates?.length ?? 0),
    0,
  );
  // Single-window coils carry no far-side crossings in the MAS (physics
  // consumers would misread them); the studio synthesizes the center-leg
  // mirror as display geometry — one extra shadowed glyph per turn.
  const bobbin = parsed.magnetic.coil.bobbin;
  const windowCount = (typeof bobbin === 'object' ? bobbin?.processedDescription?.windingWindows?.length : 1) ?? 1;
  return windowCount <= 1 ? base + turns.length : base;
}

// ABT #929: every helper below reaches into
// document.querySelector('#app').__vue_app__.config.globalProperties.$pinia, and nothing used to
// guarantee Vue had attached __vue_app__ before the first one did. goToMagneticTool leaving
// engine_loader plus a fixed 800 ms pause is not that guarantee — on a cold or loaded run the
// mount lands later, and the reach throws "Cannot read properties of undefined (reading
// 'config')". Whether it did depended on what ran before, which is why a different subset of
// WS-* failed on every identical run. Wait on the real signal instead.
async function waitForVueApp(page) {
  try {
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      return pinia != null && pinia._s.get('state') != null && pinia._s.get('mas') != null;
    }, null, { timeout: 45000 });
  }
  catch (error) {
    // ABT #929: same reason as waitForBuilderMounted — a bare timeout here says nothing about
    // WHICH of the three conditions was missing, and this wait is where the surviving failures
    // land. Report what the page actually had.
    const state = await page.evaluate(() => ({
      url: window.location.pathname,
      hasAppEl: document.querySelector('#app') != null,
      hasVueApp: document.querySelector('#app')?.__vue_app__ != null,
      stores: [...(document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia?._s.keys() ?? [])],
      bodyText: (document.body?.innerText ?? '').slice(0, 120).replace(/\s+/g, ' '),
    })).catch(evaluateError => ({ evaluateFailed: String(evaluateError).slice(0, 160) }));
    throw new Error(`the Vue app never became usable within 45 s. Page state: ${JSON.stringify(state)}`);
  }
}

// ABT #929: the app can park on /engine_loader. main.js already recovers from one cause of
// that (a lazy chunk vite cannot serve under concurrent cold loads, ABT #909) with a hard
// navigation, but the other cause — the 32 MB engine's own fetch being aborted mid-stream,
// which this file provokes by cold-loading it once per test, 22 times — has no such recovery
// and the app sits there. That is what the diagnosis caught: "url":"/engine_loader" after 60 s
// of retries. Do what the app does for its sibling case: reload once, loudly, and only then
// fail. The log line matters — if this ever starts firing on every run it is a real regression,
// not the dev server, and silence would hide that.
async function reachMagneticTool(page, { reloads = 1 } = {}) {
  for (let attempt = 0; attempt <= reloads; attempt++) {
    if (attempt === 0) {
      await page.goto(`${BASE_URL}/magnetic_tool`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    }
    else {
      console.warn('[ABT #929] app parked on /engine_loader; recovering with a full page load '
                   + `(attempt ${attempt} of ${reloads})`);
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    }
    try {
      await page.waitForFunction(
        () => !window.location.pathname.includes('engine_loader'),
        null,
        { timeout: 45000 },
      );
      return;
    }
    catch (error) {
      if (attempt === reloads) {
        throw new Error(`the app never left /engine_loader, even after ${reloads} full reload(s). `
                        + `The engine did not finish loading: ${error.message}`);
      }
    }
  }
}

async function goToMagneticTool(page) {
  await reachMagneticTool(page);
  await waitForVueApp(page);
  await pause(page, 800, 'mechanical: settle');
}

// ABT #929: selecting the builder pushes /engine_loader on purpose — main.js calls it the
// "trampoline", a remount forced by navigating to the loader and bouncing straight back. When
// that bounce loses (leaveEngineLoader retrying a push that cannot succeed) the app parks on the
// loader, and THAT is what the diagnosis caught: url "/engine_loader" with the builder store
// never registering.
//
// An earlier version of this helper re-asserted the selection twelve times while waiting. That
// made it worse, not better: every re-selection fires the trampoline again, so a parked app got
// pushed back onto the loader eleven more times. Select once, and if we end up parked, recover
// the way main.js recovers from its sibling case — a full page load — rather than pushing again.
async function waitForBuilderMounted(page, selectBuilderState, { settleMs = 20000 } = {}) {
  const builderIsUp = () => page.waitForFunction(() => {
    const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
    if (pinia == null) return false;
    return pinia._s.get('magneticBuilderTaskQueue') != null;
  }, null, { timeout: settleMs });

  await selectBuilderState(page);
  try {
    await builderIsUp();
    return;
  }
  catch { /* fall through to the one recovery below */ }

  const parked = page.url().includes('engine_loader');
  console.warn(`[ABT #929] builder did not mount in ${settleMs} ms (parked on engine_loader: ${parked}); `
               + 'recovering with a full page load');
  // Navigate, do not reload. Reloading while parked on /engine_loader lands back ON the loader,
  // and main.js then bounces to `from.path`, which on a fresh document is "/" — so the recovery
  // put the app on the HOME page and the builder could never mount there. That is exactly what
  // the diagnosis reported: 'never mounted, even after a full page load ... "url":"/"'.
  await reachMagneticTool(page, { reloads: 0 });
  await waitForVueApp(page);
  await selectBuilderState(page);
  try {
    await builderIsUp();
    return;
  }
  catch (error) {
    const diagnosis = await page.evaluate(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return { app: 'no vue app on the page' };
      const state = pinia._s.get('state');
      return {
        url: window.location.pathname,
        stores: [...pinia._s.keys()],
        currentTool: state?.currentTool ?? null,
        currentToolSubsection: state?.currentToolSubsection ?? null,
      };
    }).catch(evaluateError => ({ evaluateFailed: String(evaluateError).slice(0, 160) }));
    throw new Error('the Magnetic Builder never mounted, even after a full page load. '
                    + `Last wait: ${error.message}. App state: ${JSON.stringify(diagnosis)}`);
  }
}

async function injectMas(page, fixturePath, { heal = true, mountFirst = false } = {}) {
  const parsed = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  // ABT #929: callers reach here from several entry points, not all of them via
  // goToMagneticTool. Re-assert the app is mounted before touching the stores.
  await waitForVueApp(page);

  const selectBuilderState = (page_) => page_.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    const state = pinia._s.get('state');
    state.selectWorkflow?.('design');
    state.selectTool?.('magneticBuilder');
    state.setCurrentToolSubsection('magneticBuilder');
    state.setCurrentToolSubsectionStatus('designRequirements', true);
    state.setCurrentToolSubsectionStatus('operatingPoints', true);
  });

  if (mountFirst) {
    // Mount the builder BEFORE injecting: needed by tests that let the
    // builder legitimately re-wind the fixture (no healing) — injecting
    // before the tool mounts loses the race against its mount-time design
    // reset. The magneticBuilderTaskQueue store existing means the builder
    // machinery is up.
    //
    // ABT #929: selecting the tool ONCE and then waiting lost that same race the
    // comment above describes — the builder's mount-time design reset can land after our
    // selection and undo it, and then the store we are waiting for never appears and the
    // test dies on a 30 s timeout. Which tests it hit depended on what ran before, which
    // is why a different subset failed on every run. Re-assert the selection while
    // waiting instead of asserting it once and hoping.
    await waitForBuilderMounted(page, selectBuilderState);
  }

  await page.evaluate(([parsedMas, healFlag]) => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    const mas = pinia._s.get('mas');

    if (healFlag) {
      // Keeps the fixture's wound coil in place against checkAndFixMas's
      // strip-then-rewind. Do NOT use in tests that intentionally re-wind
      // (the heal would revert the new placement).
      let healing = false;
      mas.$subscribe(() => {
        if (healing) return;
        const tdStripped = mas.mas?.magnetic?.coil?.turnsDescription == null && mas.mas?.magnetic?.coil;
        if (tdStripped) {
          healing = true;
          mas.mas.magnetic = JSON.parse(JSON.stringify(parsedMas.magnetic));
          healing = false;
        }
      });
    }
    mas.setMas(parsedMas);
  }, [parsed, heal]);
  if (!mountFirst) {
    await selectBuilderState(page);
  }

  await pause(page, 2500, 'mechanical: settle');
  return parsed;
}

// Drag a winding chip onto a core-leg drop slot. Slots only exist mid-drag,
// so start the drag, then aim at the requested column's slot.
async function dragChipToColumn(page, chipLocator, columnIndex) {
  const chipBox = await chipLocator.boundingBox();
  await page.mouse.move(chipBox.x + chipBox.width / 2, chipBox.y + chipBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(chipBox.x + chipBox.width / 2 + 30, chipBox.y + chipBox.height / 2 + 30, { steps: 3 });
  const slot = page.locator(`[data-studio-column="${columnIndex}"]`);
  await expect(slot).toBeVisible({ timeout: 3000 });
  const slotBox = await slot.boundingBox();
  await page.mouse.move(slotBox.x + slotBox.width / 2, slotBox.y + slotBox.height / 2, { steps: 5 });
  await page.mouse.up();
}

async function openStudio(page) {
  // ABT #929: the toggle only exists once the builder has mounted its coil section, and the
  // callers that reach here without mountFirst were racing that mount — "element(s) not found"
  // after 10 s, on whichever test happened to lose. Wait for the builder machinery on a real
  // signal first, then for the button itself.
  await page.waitForFunction(() => {
    const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
    if (pinia == null) return false;
    return pinia._s.get('magneticBuilderTaskQueue') != null;
  }, null, { timeout: 60000 });
  const toggle = page.locator('[data-cy$="-Coil-WindingStudio-button"]').first();
  await expect(toggle).toBeVisible({ timeout: 30000 });
  const studio = page.locator('.winding-studio');
  if (!(await studio.first().isVisible())) {
    await toggle.click();
  }
  await expect(studio.first()).toBeVisible({ timeout: 5000 });
  return studio.first();
}

test.describe('Winding Studio P0', () => {
  test('WS-1 studio toggle renders turns and sections for the classic wound coil', async ({ page }) => {
    const parsed = JSON.parse(fs.readFileSync(CLASSIC_FIXTURE, 'utf-8'));
    await goToMagneticTool(page);
    await injectMas(page, CLASSIC_FIXTURE);
    await ss(page, 'ws1-before-toggle');

    const studio = await openStudio(page);
    await ss(page, 'ws1-studio-open');

    const turnGlyphs = studio.locator('.winding-studio-turn');
    await expect(turnGlyphs).toHaveCount(countTurnGlyphs(parsed), { timeout: 5000 });

    const sectionOutlines = studio.locator('.winding-studio-section');
    await expect(sectionOutlines).toHaveCount(parsed.magnetic.coil.sectionsDescription.length);

    // Core silhouette present (even-odd path with the window cavities).
    await expect(studio.locator('svg path[fill-rule="evenodd"]')).toHaveCount(1);

    // Toggle back returns the painter visualizer.
    await page.locator('[data-cy$="-Coil-WindingStudio-button"]').first().click();
    await expect(studio).not.toBeVisible({ timeout: 5000 });
  });

  test('WS-2 hovering a turn shows tooltip and highlights its winding', async ({ page }) => {
    await goToMagneticTool(page);
    await injectMas(page, CLASSIC_FIXTURE);
    const studio = await openStudio(page);

    const firstTurn = studio.locator('.winding-studio-turn').first();
    await firstTurn.hover({ force: true });
    await pause(page, 200, 'mechanical: hover settle');

    const tooltip = studio.locator('.winding-studio-tooltip');
    await expect(tooltip).toBeVisible({ timeout: 3000 });
    const tooltipText = await tooltip.textContent();
    expect(tooltipText.length).toBeGreaterThan(0);
    await ss(page, 'ws2-turn-tooltip');
  });

  test('WS-3 multi-column MAS renders turns in both windows incl. return crossings', async ({ page }) => {
    const parsed = JSON.parse(fs.readFileSync(MULTICOLUMN_FIXTURE, 'utf-8'));
    await page.goto(`${BASE_URL}/winding_studio_dev`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(() => typeof window.__setStudioMas === 'function', null, { timeout: 30000 });
    await page.evaluate((mas) => window.__setStudioMas(mas), parsed);

    const studio = page.locator('.winding-studio').first();
    await expect(studio).toBeVisible({ timeout: 5000 });
    await ss(page, 'ws3-multicolumn');

    const turnGlyphs = studio.locator('.winding-studio-turn');
    await expect(turnGlyphs).toHaveCount(countTurnGlyphs(parsed), { timeout: 5000 });

    // Lateral placement: glyphs exist on BOTH sides of the main column.
    const positions = await turnGlyphs.evaluateAll((nodes) =>
      nodes.map((node) => Number(node.getAttribute('cx') ?? node.getAttribute('x'))),
    );
    expect(positions.some((x) => x < 0)).toBe(true);
    expect(positions.some((x) => x > 0)).toBe(true);

    // Both windings appear in the legend (winding chips only — the toolbar
    // also hosts Auto fit / gear chips with the same base class).
    const chips = studio.locator('[data-cy*="-WindingStudio-chip-"]');
    await expect(chips).toHaveCount(parsed.magnetic.coil.functionalDescription.length);

    // The fit badge reports the wound design fits.
    await expect(studio.locator('[data-cy$="-WindingStudio-fit"]')).toHaveText(/✓ fits/);

    // Return crossings render shadowed (darker, .winding-studio-shadow) and
    // are present for every turn that carries additionalCoordinates.
    const nReturns = parsed.magnetic.coil.turnsDescription.reduce(
      (count, turn) => count + (turn.additionalCoordinates?.length ?? 0),
      0,
    );
    const dimmed = await turnGlyphs.evaluateAll((nodes) =>
      nodes.filter((node) => node.classList.contains('winding-studio-shadow')).length,
    );
    expect(dimmed).toBe(nReturns);
  });

  test('WS-4 dragging a winding chip onto a leg re-winds it there (full stack)', async ({ page }) => {
    test.setTimeout(180000);
    const parsed = JSON.parse(fs.readFileSync(MULTICOLUMN_FIXTURE, 'utf-8'));
    await page.goto(`${BASE_URL}/winding_studio_dev`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(() => typeof window.__setStudioMas === 'function', null, { timeout: 60000 });
    await page.evaluate((mas) => window.__setStudioMas(mas), parsed);
    await expect(page.locator('.winding-studio').first()).toBeVisible({ timeout: 5000 });

    // The fixture has the Secondary on the LEFT lateral leg (own x < 0).
    const secondaryX = () => page.evaluate(() => {
      const mas = window.__getStudioMas();
      return (mas?.magnetic?.coil?.turnsDescription ?? [])
        .filter((turn) => turn.winding === 'Secondary')
        .map((turn) => turn.coordinates[0]);
    });
    expect((await secondaryX()).every((x) => x < 0)).toBe(true);

    // Drag the Secondary chip onto a leg and wait for the WASM re-wind.
    async function dragSecondaryToColumn(columnIndex) {
      await dragChipToColumn(page, page.locator('[data-cy="WindingStudioDev-WindingStudio-chip-Secondary"]'), columnIndex);
      // Re-wind finished: busy overlay gone and no error banner.
      await expect(page.locator('.winding-studio-busy')).not.toBeVisible({ timeout: 90000 });
      const error = await page.evaluate(() => window.__getStudioError());
      expect(error).toBeNull();
    }

    // 1. Onto the CENTER leg (column 0): secondary moves to the main window (+x).
    await dragSecondaryToColumn(0);
    await page.waitForFunction(() => {
      const mas = window.__getStudioMas();
      const turns = (mas?.magnetic?.coil?.turnsDescription ?? []).filter((t) => t.winding === 'Secondary');
      return turns.length > 0 && turns.every((t) => t.coordinates[0] > 0);
    }, null, { timeout: 30000 });
    await ss(page, 'ws4-secondary-on-center');

    // 2. Back onto the LEFT leg (column 2): secondary returns to negative x.
    await dragSecondaryToColumn(2);
    await page.waitForFunction(() => {
      const mas = window.__getStudioMas();
      const turns = (mas?.magnetic?.coil?.turnsDescription ?? []).filter((t) => t.winding === 'Secondary');
      return turns.length > 0 && turns.every((t) => t.coordinates[0] < 0);
    }, null, { timeout: 30000 });
    await ss(page, 'ws4-secondary-back-left');

    // The placement intent landed in the MAS (winding-level windingWindow).
    const windingWindow = await page.evaluate(() => {
      const mas = window.__getStudioMas();
      return mas.magnetic.coil.functionalDescription.find((w) => w.name === 'Secondary').windingWindow;
    });
    expect(windingWindow).toBe(2);
  });

  test('WS-5 builder: dragging Secondary onto the left leg re-winds it there', async ({ page }) => {
    test.setTimeout(180000);
    await goToMagneticTool(page);
    // No healing: the builder legitimately owns the coil here — it normalizes
    // the injected fixture through its own (columns-aware) wind machinery,
    // and the drag below must be able to CHANGE the result.
    await injectMas(page, MULTICOLUMN_FIXTURE, { heal: false, mountFirst: true });
    await pause(page, 2000, 'mechanical: builder settle after injection');
    const studio = await openStudio(page);

    // Wait for the builder's normalization rewind to settle: secondary wound
    // (in window 0 → +x, since the fixture windings carry no windingWindow).
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const turns = pinia._s.get('mas').mas?.magnetic?.coil?.turnsDescription ?? [];
      const secondary = turns.filter((t) => t.winding === 'Secondary');
      return secondary.length > 0 && secondary.every((t) => t.coordinates[0] > 0);
    }, null, { timeout: 60000 });
    await ss(page, 'ws5-builder-normalized');

    // Drag Secondary onto the LEFT lateral leg (column 2).
    await dragChipToColumn(page, page.locator('[data-cy$="-WindingStudio-chip-Secondary"]').first(), 2);

    // The placement round-trip (settings flip → core reprocess → bobbin regen →
    // columns-aware rewind) moves every secondary turn to negative x.
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const mas = pinia._s.get('mas').mas;
      const turns = mas?.magnetic?.coil?.turnsDescription ?? [];
      const secondary = turns.filter((t) => t.winding === 'Secondary');
      const intent = mas?.magnetic?.coil?.functionalDescription?.find((w) => w.name === 'Secondary')?.windingWindow;
      return intent === 2 && secondary.length > 0 && secondary.every((t) => t.coordinates[0] < 0);
    }, null, { timeout: 90000 });
    await ss(page, 'ws5-builder-secondary-left');
  });

  test('WS-6 builder: dragging a section boundary re-winds with new proportions', async ({ page }) => {
    test.setTimeout(180000);
    await goToMagneticTool(page);
    await injectMas(page, MULTICOLUMN_FIXTURE, { heal: false, mountFirst: true });
    await pause(page, 2000, 'mechanical: builder settle after injection');
    const studio = await openStudio(page);

    // Normalization: both windings in window 0, adjacent sections.
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const sections = pinia._s.get('mas').mas?.magnetic?.coil?.sectionsDescription ?? [];
      return sections.filter((s) => s.type === 'conduction').length === 2;
    }, null, { timeout: 60000 });

    // The contract under test: boundary drag → studio re-derives the
    // per-winding proportions → the builder re-winds with them. On this
    // single-layer fixture the WOUND geometry is proportion-invariant
    // (delimit_and_compact collapses each section to its actual layers), so
    // the observable is the proportions reaching the wind call — the same
    // knob the Alignment panel's proportion editor drives.
    await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const taskQueue = pinia._s.get('magneticBuilderTaskQueue');
      window.__windProportions = [];
      const original = taskQueue.wind;
      taskQueue.wind = async function (...args) {
        window.__windProportions.push(JSON.parse(JSON.stringify(args[2])));
        return original.apply(this, args);
      };
    });

    const boundary = studio.locator('[data-cy$="-WindingStudio-boundary"]').first();
    await expect(boundary).toBeVisible({ timeout: 5000 });
    const box = await boundary.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 15, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();

    // A re-wind fires with primary-heavier proportions and completes cleanly.
    await page.waitForFunction(() => {
      const calls = window.__windProportions ?? [];
      return calls.length > 0 && calls[calls.length - 1][0] > 0.55;
    }, null, { timeout: 60000 });
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const turns = pinia._s.get('mas').mas?.magnetic?.coil?.turnsDescription ?? [];
      return turns.length === 36;
    }, null, { timeout: 60000 });
    await expect(studio.locator('[data-cy$="-WindingStudio-fit"]')).toHaveText(/✓ fits/, { timeout: 15000 });
    await ss(page, 'ws6-boundary-resized');
  });

  test('WS-7 builder: dragging a section edge sets its margin and re-winds', async ({ page }) => {
    test.setTimeout(180000);
    await goToMagneticTool(page);
    await injectMas(page, MULTICOLUMN_FIXTURE, { heal: false, mountFirst: true });
    await pause(page, 2000, 'mechanical: builder settle after injection');
    const studio = await openStudio(page);

    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const sections = pinia._s.get('mas').mas?.magnetic?.coil?.sectionsDescription ?? [];
      return sections.filter((s) => s.type === 'conduction').length === 2;
    }, null, { timeout: 60000 });

    const primarySection = () => page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const sections = pinia._s.get('mas').mas?.magnetic?.coil?.sectionsDescription ?? [];
      const primary = sections.find((s) => s.type === 'conduction' && s.partialWindings[0].winding === 'Primary');
      return primary == null ? null : { margin: primary.margin ?? [0, 0], y: primary.coordinates[1] };
    });
    const before = await primarySection();
    expect(before.margin[0] ?? 0).toBeLessThan(1e-6);

    // Drag the Primary section's TOP edge DOWNWARD: the gap to the window wall
    // becomes topOrLeft margin tape and the turns re-spread below it.
    const edge = studio.locator('[data-cy$="-WindingStudio-edge-top"]').first();
    await expect(edge).toBeVisible({ timeout: 5000 });
    const box = await edge.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 20, { steps: 5 });
    await page.mouse.up();

    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const sections = pinia._s.get('mas').mas?.magnetic?.coil?.sectionsDescription ?? [];
      const primary = sections.find((s) => s.type === 'conduction' && s.partialWindings[0].winding === 'Primary');
      return primary != null && (primary.margin?.[0] ?? 0) > 0.0005;
    }, null, { timeout: 60000 });
    const after = await primarySection();
    expect(after.margin[0]).toBeGreaterThan(0.0005);
    // The turns don't need to re-pack here (24 x 0.855 mm fits the reduced
    // span), so the observable is the section shifting AWAY from the margined
    // top wall (physical y decreases by roughly half the margin).
    expect(after.y).toBeLessThan(before.y - 0.0002);
    await ss(page, 'ws7-margin-resized');
  });

  test('WS-8 builder: custom section rectangle — shrink height, winder re-flows into 2 layers', async ({ page }) => {
    test.setTimeout(180000);
    await goToMagneticTool(page);
    await injectMas(page, MULTICOLUMN_FIXTURE, { heal: false, mountFirst: true });
    await pause(page, 2000, 'mechanical: builder settle after injection');
    const studio = await openStudio(page);

    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const sections = pinia._s.get('mas').mas?.magnetic?.coil?.sectionsDescription ?? [];
      return sections.filter((s) => s.type === 'conduction').length === 2;
    }, null, { timeout: 60000 });

    const primaryState = () => page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const coil = pinia._s.get('mas').mas?.magnetic?.coil ?? {};
      const primary = (coil.sectionsDescription ?? []).find((s) => s.type === 'conduction' && s.partialWindings[0].winding === 'Primary');
      if (primary == null) return null;
      const layers = (coil.layersDescription ?? []).filter((l) => l.type === 'conduction' && l.section === primary.name).length;
      const turnYs = (coil.turnsDescription ?? []).filter((t) => t.winding === 'Primary').map((t) => t.coordinates[1]);
      return { height: primary.dimensions[1], layers, turnYMin: Math.min(...turnYs), turnYMax: Math.max(...turnYs) };
    });
    const before = await primaryState();
    expect(before.layers).toBe(1);

    // Select the Primary section: the free-transform overlay appears.
    await studio.locator('[data-cy$="-WindingStudio-section-Primary section 0"]').click({ force: true });
    const south = studio.locator('[data-cy$="-WindingStudio-transform-s"]');
    await expect(south).toBeVisible({ timeout: 5000 });

    // 1. Drag the bottom edge UP by ~45% of the section height (24 turns no
    //    longer fit in one column)...
    const sectionBox = await studio.locator('[data-cy$="-WindingStudio-transform-move"]').boundingBox();
    const south_ = await south.boundingBox();
    await page.mouse.move(south_.x + south_.width / 2, south_.y + south_.height / 2);
    await page.mouse.down();
    await page.mouse.move(south_.x + south_.width / 2, south_.y + south_.height / 2 - sectionBox.height * 0.45, { steps: 6 });
    await page.mouse.up();
    await page.waitForFunction((heightBefore) => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const coil = pinia._s.get('mas').mas?.magnetic?.coil ?? {};
      const primary = (coil.sectionsDescription ?? []).find((s) => s.type === 'conduction' && s.partialWindings[0].winding === 'Primary');
      return primary != null && primary.dimensions[1] < heightBefore * 0.7;
    }, before.height, { timeout: 60000 });

    // 2. ...then drag the EAST edge outward (the lateral resize) so the custom
    //    rectangle is wide enough for a second radial layer, and the winder
    //    re-flows the turns into it (sections are not recomputed).
    const east = studio.locator('[data-cy$="-WindingStudio-transform-e"]');
    await expect(east).toBeVisible({ timeout: 5000 });
    const east_ = await east.boundingBox();
    await page.mouse.move(east_.x + east_.width / 2, east_.y + east_.height / 2);
    await page.mouse.down();
    await page.mouse.move(east_.x + east_.width / 2 + Math.max(12, sectionBox.width * 1.2), east_.y + east_.height / 2, { steps: 6 });
    await page.mouse.up();

    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const coil = pinia._s.get('mas').mas?.magnetic?.coil ?? {};
      const primary = (coil.sectionsDescription ?? []).find((s) => s.type === 'conduction' && s.partialWindings[0].winding === 'Primary');
      if (primary == null) return false;
      const layers = (coil.layersDescription ?? []).filter((l) => l.type === 'conduction' && l.section === primary.name).length;
      return layers >= 2;
    }, null, { timeout: 60000 });

    const after = await primaryState();
    expect(after.height).toBeLessThan(before.height * 0.7);
    expect(after.layers).toBeGreaterThanOrEqual(2);
    // Turns stayed inside the custom rectangle's vertical extent.
    expect(after.turnYMax - after.turnYMin).toBeLessThan(after.height);
    await ss(page, 'ws8-custom-rect');

    // --- WS-9 part: the drawn rectangle is PINNED and survives a full re-wind ---

    // Deselect (plain click on the transform body), then change the
    // proportions via the boundary drag: a FULL wind runs, and the engine
    // re-imposes the pinned rectangle after its compaction pass.
    const moveZone = studio.locator('[data-cy$="-WindingStudio-transform-move"]');
    await moveZone.click({ force: true });
    await expect(moveZone).not.toBeVisible({ timeout: 5000 });

    const boundary = studio.locator('[data-cy$="-WindingStudio-boundary"]').first();
    await expect(boundary).toBeVisible({ timeout: 5000 });
    const bBox = await boundary.boundingBox();
    await page.mouse.move(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(bBox.x + bBox.width / 2 + 12, bBox.y + bBox.height / 2, { steps: 5 });
    await page.mouse.up();
    await pause(page, 4000, 'mechanical: full re-wind settles');

    const rewound = await primaryState();
    expect(rewound.height).toBeLessThan(before.height * 0.7);   // pin survived
    expect(rewound.layers).toBeGreaterThanOrEqual(2);
    await ss(page, 'ws9-pin-survives-rewind');

    // Clearing the custom layout returns to the automatic placement.
    const clearChip = studio.locator('[data-cy$="-WindingStudio-clear-custom"]');
    await expect(clearChip).toBeVisible({ timeout: 5000 });
    await clearChip.click();
    await page.waitForFunction((heightBefore) => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const coil = pinia._s.get('mas').mas?.magnetic?.coil ?? {};
      const primary = (coil.sectionsDescription ?? []).find((s) => s.type === 'conduction' && s.partialWindings[0].winding === 'Primary');
      return primary != null && primary.dimensions[1] > heightBefore * 0.8;
    }, before.height, { timeout: 60000 });
    const cleared = await primaryState();
    expect(cleared.layers).toBe(1);
    await ss(page, 'ws9-cleared');
  });

  test('WS-10 toroid: sector render + rotate drag re-winds at the new angle', async ({ page }) => {
    test.setTimeout(180000);
    const parsed = JSON.parse(fs.readFileSync(TOROIDAL_FIXTURE, 'utf-8'));
    await page.goto(`${BASE_URL}/winding_studio_dev`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(() => typeof window.__setStudioMas === 'function', null, { timeout: 60000 });
    await page.evaluate((mas) => window.__setStudioMas(mas), parsed);
    const studio = page.locator('.winding-studio').first();
    await expect(studio).toBeVisible({ timeout: 5000 });

    // Render: ring + all sections as sector paths + one glyph per crossing.
    const expectedTurnGlyphs = parsed.magnetic.coil.turnsDescription.reduce(
      (count, turn) => count + 1 + (turn.additionalCoordinates?.length ?? 0), 0);
    await expect(studio.locator('.winding-studio-turn')).toHaveCount(expectedTurnGlyphs, { timeout: 5000 });
    await expect(studio.locator('path.winding-studio-section')).toHaveCount(parsed.magnetic.coil.sectionsDescription.length);

    // Orientation matches the painter: MKF's export_svg wraps toroidal SVGs in
    // scale(1,-1), so the displayed painter view has data y pointing DOWN the
    // screen. The studio mirrors the same way — a turn at data (x, y) renders
    // at SVG (x, +y) mm (unlike the two-piece view, which flips y).
    const firstTurn = parsed.magnetic.coil.turnsDescription[0];
    const firstGlyph = studio.locator('.winding-studio-turn').first();
    expect(Number(await firstGlyph.getAttribute('cx'))).toBeCloseTo(firstTurn.coordinates[0] * 1000, 3);
    expect(Number(await firstGlyph.getAttribute('cy'))).toBeCloseTo(firstTurn.coordinates[1] * 1000, 3);
    await ss(page, 'ws10-toroid-render');

    const sectionTheta = () => page.evaluate(() => {
      const section = window.__getStudioMas().magnetic.coil.sectionsDescription.find((s) => s.name === 'Winding 1 section 0');
      return { theta: section.coordinates[1], span: section.dimensions[1] };
    });
    const before = await sectionTheta();

    // Select Winding 1 via its first turn; the sector transform appears.
    await studio.locator('.winding-studio-turn').first().click({ force: true });
    await expect(studio.locator('[data-cy$="-WindingStudio-sector-rotate"]')).toBeVisible({ timeout: 5000 });

    // Rotate the sector +30 degrees along its center-radius circle.
    const points = await page.evaluate(() => {
      const svg = document.querySelector('.winding-studio-svg');
      const ctm = svg.getScreenCTM();
      const mas = window.__getStudioMas();
      const core = mas.magnetic.core.processedDescription;
      const windowRadius = core.windingWindows[0].radialHeight * 1000;
      const section = mas.magnetic.coil.sectionsDescription.find((s) => s.name === 'Winding 1 section 0');
      const radius = windowRadius - section.coordinates[0] * 1000;
      const toClient = (angleDegrees) => {
        // Painter-matched mirror: data y maps DOWN the screen for toroids.
        const angle = (angleDegrees * Math.PI) / 180;
        return { x: radius * Math.cos(angle) * ctm.a + ctm.e, y: radius * Math.sin(angle) * ctm.d + ctm.f };
      };
      const theta = section.coordinates[1];
      return { from: toClient(theta), mid: toClient(theta + 15), to: toClient(theta + 30) };
    });
    await page.mouse.move(points.from.x, points.from.y);
    await page.mouse.down();
    await page.mouse.move(points.mid.x, points.mid.y, { steps: 4 });
    await page.mouse.move(points.to.x, points.to.y, { steps: 4 });
    await page.mouse.up();

    await page.waitForFunction((thetaBefore) => {
      const section = window.__getStudioMas()?.magnetic?.coil?.sectionsDescription?.find((s) => s.name === 'Winding 1 section 0');
      return section != null && Math.abs(section.coordinates[1] - thetaBefore - 30) < 3;
    }, before.theta, { timeout: 60000 });
    const after = await sectionTheta();
    expect(Math.abs(after.span - before.span)).toBeLessThan(1);
    expect(await page.evaluate(() => window.__getStudioError())).toBeNull();

    // Regression: the re-flow used to drop every toroidal outer return
    // crossing (additionalCoordinates) because rewind_layers_and_turns skipped
    // delimit_and_compact_round_window, the only pass that generated them —
    // "the toroid is missing the external turns" after any studio edit.
    const additionalAfterRewind = await page.evaluate(() => {
      const turns = window.__getStudioMas().magnetic.coil.turnsDescription;
      return { total: turns.length, withAdditional: turns.filter((t) => t.additionalCoordinates?.length).length };
    });
    expect(additionalAfterRewind.withAdditional).toBe(additionalAfterRewind.total);
    await ss(page, 'ws10-toroid-rotated');
  });

  test('WS-11 a pinned section rect is dropped when the core shape changes', async ({ page }) => {
    // Regression: a rect pinned on an E core (cartesian meters) used to survive
    // an E->T shape change and get re-imposed on the toroid's polar section —
    // meters read as degrees shrank the section to 0.005deg and silently wound
    // 4 of 42 turns. The BasicCoilSelector shape watcher must clear the pins.
    await goToMagneticTool(page);
    await injectMas(page, CLASSIC_FIXTURE);

    // The windingStudio store is instantiated by BasicCoilSelector's mount —
    // wait for it (and for the fixture's sections to be in place) rather than
    // racing the builder's mount timing.
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const mas = pinia._s.get('mas');
      return pinia._s.get('windingStudio') != null
        && (mas?.mas?.magnetic?.coil?.sectionsDescription ?? []).some((s) => s.type === 'conduction');
    }, null, { timeout: 30000 });

    const pinned = await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const mas = pinia._s.get('mas');
      const studio = pinia._s.get('windingStudio');
      const coil = mas.mas.magnetic.coil;
      const section = (coil.sectionsDescription ?? []).find((s) => s.type === 'conduction');
      if (section == null) {
        throw new Error('fixture has no conduction section to pin');
      }
      const windowShape = coil.bobbin?.processedDescription?.windingWindows?.[0]?.shape ?? null;
      studio.setCustomSectionRect(section.name, {
        coordinates: section.coordinates.slice(0, 2),
        dimensions: section.dimensions.slice(0, 2),
        windowShape,
      });
      return { count: studio.customSectionCount, windowShape };
    });
    expect(pinned.count).toBe(1);
    expect(pinned.windowShape).toBe('rectangular');

    // Change the core shape identity (same mutation the shape dropdown makes).
    await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const shape = pinia._s.get('mas').mas.magnetic.core.functionalDescription.shape;
      shape.family = 't';
      shape.name = 'T 40/24/16';
    });

    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      return pinia._s.get('windingStudio').customSectionCount === 0;
    }, null, { timeout: 10000 });
  });

  test('WS-12 a MAS corrupted by a stale pin imports and re-winds whole', async ({ page }) => {
    // Regression: the file a user exported after the WS-11 corruption (0.005deg
    // secondary section, 4/42 secondary turns, windingLosses missing its
    // required total) crashed the builder on import — the section-derived
    // proportions rounded to [1, 0] and wind() threw "Turns not created", while
    // the schema-invalid outputs blocked every simulate call. The import
    // quarantine + degenerate-proportion guard must recover the full coil.
    test.setTimeout(180000);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(CORRUPT_TOROID_FIXTURE);
    await page.waitForURL('**/magnetic_tool**', { timeout: 45000 });

    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app').__vue_app__?.config?.globalProperties?.$pinia;
      const coil = pinia?._s?.get('mas')?.mas?.magnetic?.coil;
      const turns = coil?.turnsDescription;
      if (!Array.isArray(turns)) return false;
      const perWinding = {};
      turns.forEach((turn) => { perWinding[turn.winding] = (perWinding[turn.winding] ?? 0) + 1; });
      return perWinding.Primary === 42 && perWinding.Secondary === 42;
    }, null, { timeout: 90000 });

    // The degenerate 0.005deg section must be gone from the re-wound coil.
    const spans = await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const coil = pinia._s.get('mas').mas.magnetic.coil;
      return (coil.sectionsDescription ?? [])
        .filter((s) => s.type === 'conduction')
        .map((s) => s.dimensions[1]);
    });
    for (const span of spans) {
      expect(span).toBeGreaterThan(1);
    }
    await ss(page, 'ws12-corrupt-import-recovered');
  });

  test('WS-13 builder: catalog bobbin + lateral drop appends an ad-hoc bobbin (two BOM items)', async ({ page }) => {
    // A design with a real CATALOG bobbin (Bobbin E42/20). Dropping a winding
    // on a lateral leg must KEEP the catalog part and add a generated ad-hoc
    // bobbin for that leg: coil.bobbin becomes the MAS per-column ARRAY
    // [catalog, lateral] — two BOM items. Dropping it back on the centre leg
    // prunes the unused lateral part and collapses back to the plain catalog
    // scalar (no phantom BOM items).
    test.setTimeout(180000);
    await goToMagneticTool(page);
    await injectMas(page, CATALOG_BOBBIN_FIXTURE, { heal: false, mountFirst: true });
    await pause(page, 2000, 'mechanical: builder settle after injection');
    const studio = await openStudio(page);

    const coilState = () => page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const coil = pinia._s.get('mas').mas?.magnetic?.coil ?? {};
      const secondary = (coil.turnsDescription ?? []).filter((t) => t.winding === 'Secondary');
      return {
        bobbinIsArray: Array.isArray(coil.bobbin),
        bobbinNames: Array.isArray(coil.bobbin) ? coil.bobbin.map((p) => p?.name ?? null) : [coil.bobbin?.name ?? null],
        windingWindow: coil.functionalDescription?.find((w) => w.name === 'Secondary')?.windingWindow ?? null,
        secondaryTurnCount: secondary.length,
        secondaryAllPositive: secondary.length > 0 && secondary.every((t) => t.coordinates[0] > 0),
        secondaryAllNegative: secondary.length > 0 && secondary.every((t) => t.coordinates[0] < 0),
      };
    });

    // Normalization: everything wound in the catalog bobbin's window (+x),
    // catalog part untouched.
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const turns = pinia._s.get('mas').mas?.magnetic?.coil?.turnsDescription ?? [];
      const secondary = turns.filter((t) => t.winding === 'Secondary');
      return secondary.length > 0 && secondary.every((t) => t.coordinates[0] > 0);
    }, null, { timeout: 60000 });
    const before = await coilState();
    expect(before.bobbinIsArray).toBe(false);
    expect(before.bobbinNames).toEqual(['Bobbin E42/20']);
    await ss(page, 'ws13-catalog-normalized');

    // Drag Secondary onto the LEFT lateral leg (column 2).
    await dragChipToColumn(page, page.locator('[data-cy$="-WindingStudio-chip-Secondary"]').first(), 2);

    // The array assembles ([catalog, ad-hoc lateral]), the placement intent
    // points at the lateral part's merged window (index 1: one catalog window
    // + first lateral window) and every secondary turn moves to negative x.
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const mas = pinia._s.get('mas').mas;
      const coil = mas?.magnetic?.coil ?? {};
      const secondary = (coil.turnsDescription ?? []).filter((t) => t.winding === 'Secondary');
      return Array.isArray(coil.bobbin) && coil.bobbin.length === 2
        && coil.functionalDescription?.find((w) => w.name === 'Secondary')?.windingWindow === 1
        && secondary.length > 0 && secondary.every((t) => t.coordinates[0] < 0);
    }, null, { timeout: 90000 });
    const lateral = await coilState();
    expect(lateral.bobbinNames[0]).toBe('Bobbin E42/20');
    // The ad-hoc part carries exactly the dropped column's window.
    const lateralPart = await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      return pinia._s.get('mas').mas.magnetic.coil.bobbin[1];
    });
    expect(lateralPart.processedDescription.windingWindows.length).toBe(1);
    expect(lateralPart.processedDescription.windingWindows[0].column).toBe(2);
    expect(lateralPart.processedDescription.windingWindows[0].coordinates[0]).toBeLessThan(0);
    await ss(page, 'ws13-catalog-lateral');

    // Back onto the CENTER leg: the unused ad-hoc part is pruned and the
    // bobbin collapses back to the plain catalog scalar.
    await dragChipToColumn(page, page.locator('[data-cy$="-WindingStudio-chip-Secondary"]').first(), 0);
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const coil = pinia._s.get('mas').mas?.magnetic?.coil ?? {};
      const secondary = (coil.turnsDescription ?? []).filter((t) => t.winding === 'Secondary');
      return !Array.isArray(coil.bobbin)
        && coil.functionalDescription?.find((w) => w.name === 'Secondary')?.windingWindow === 0
        && secondary.length > 0 && secondary.every((t) => t.coordinates[0] > 0);
    }, null, { timeout: 90000 });
    const restored = await coilState();
    expect(restored.bobbinNames).toEqual(['Bobbin E42/20']);
    await ss(page, 'ws13-catalog-back-center');
  });

  // Drag a winding chip onto another winding (turn or section) and pick an
  // action from the {interleave, swap, clear} menu — PI Expert's gesture,
  // driving the same pattern/repetitions knobs the Alignment panel edits.
  test('WS-14 builder: chip-on-winding drop interleaves, swaps and clears', async ({ page }) => {
    test.setTimeout(240000);
    await goToMagneticTool(page);
    await injectMas(page, MULTICOLUMN_FIXTURE, { heal: false, mountFirst: true });
    await pause(page, 2000, 'mechanical: builder settle after injection');
    const studio = await openStudio(page);

    const conductionSections = () => page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      return (pinia._s.get('mas').mas?.magnetic?.coil?.sectionsDescription ?? [])
        .filter((s) => s.type === 'conduction')
        .map((s) => s.partialWindings[0].winding);
    });
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const sections = pinia._s.get('mas').mas?.magnetic?.coil?.sectionsDescription ?? [];
      return sections.filter((s) => s.type === 'conduction').length === 2;
    }, null, { timeout: 60000 });

    // Drag the Secondary chip onto a Primary turn; the menu opens on release.
    async function dropSecondaryOnPrimary() {
      const chip = page.locator('[data-cy$="-WindingStudio-chip-Secondary"]').first();
      const chipBox = await chip.boundingBox();
      await page.mouse.move(chipBox.x + chipBox.width / 2, chipBox.y + chipBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(chipBox.x + chipBox.width / 2 + 30, chipBox.y + chipBox.height / 2 + 30, { steps: 3 });
      const primaryTurn = studio.locator('.winding-studio-turn[data-studio-winding="Primary"]').first();
      const turnBox = await primaryTurn.boundingBox();
      await page.mouse.move(turnBox.x + turnBox.width / 2, turnBox.y + turnBox.height / 2, { steps: 5 });
      await page.mouse.up();
      await expect(page.locator('[data-cy$="-WindingStudio-interleave-menu"]')).toBeVisible({ timeout: 3000 });
    }

    // 1. Interleave: repetitions 1 → 2, so 2 conduction sections become 4
    //    alternating P/S.
    await dropSecondaryOnPrimary();
    await page.locator('[data-cy$="-WindingStudio-interleave-interleave"]').click();
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const sections = (pinia._s.get('mas').mas?.magnetic?.coil?.sectionsDescription ?? [])
        .filter((s) => s.type === 'conduction');
      return sections.length === 4;
    }, null, { timeout: 90000 });
    const interleaved = await conductionSections();
    expect(interleaved.filter((name) => name === 'Primary').length).toBe(2);
    expect(interleaved.filter((name) => name === 'Secondary').length).toBe(2);
    await ss(page, 'ws14-interleaved');

    // 2. Clear: back to one section per winding, natural order.
    await dropSecondaryOnPrimary();
    await page.locator('[data-cy$="-WindingStudio-interleave-clear"]').click();
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const sections = (pinia._s.get('mas').mas?.magnetic?.coil?.sectionsDescription ?? [])
        .filter((s) => s.type === 'conduction');
      return sections.length === 2 && sections[0].partialWindings[0].winding === 'Primary';
    }, null, { timeout: 90000 });

    // 3. Swap: the two sections change order (Secondary wound first).
    await dropSecondaryOnPrimary();
    await page.locator('[data-cy$="-WindingStudio-interleave-swap"]').click();
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const sections = (pinia._s.get('mas').mas?.magnetic?.coil?.sectionsDescription ?? [])
        .filter((s) => s.type === 'conduction');
      return sections.length === 2 && sections[0].partialWindings[0].winding === 'Secondary';
    }, null, { timeout: 90000 });
    await ss(page, 'ws14-swapped');
  });

  // The painter's H-field map as an aligned background layer behind the
  // interactive SVG.
  test('WS-15 builder: field overlay renders behind the studio', async ({ page }) => {
    test.setTimeout(240000);
    await goToMagneticTool(page);
    await injectMas(page, MULTICOLUMN_FIXTURE, { heal: false, mountFirst: true });
    await pause(page, 2000, 'mechanical: builder settle after injection');
    const studio = await openStudio(page);
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      return (pinia._s.get('mas').mas?.magnetic?.coil?.turnsDescription ?? []).length > 0;
    }, null, { timeout: 60000 });

    await studio.locator('[data-cy$="-WindingStudio-field"]').check();
    const overlay = studio.locator('[data-cy$="-WindingStudio-field-overlay"]');
    await expect(overlay).toBeVisible({ timeout: 120000 });
    const width = Number(await overlay.getAttribute('width'));
    const height = Number(await overlay.getAttribute('height'));
    // Painter px / 30 = studio mm: the E42 overlay must be core-sized (~44 mm
    // wide incl. the lateral return overhang), not degenerate or px-sized.
    expect(width).toBeGreaterThan(20);
    expect(width).toBeLessThan(200);
    expect(height).toBeGreaterThan(20);
    expect(height).toBeLessThan(200);
    await ss(page, 'ws15-field-overlay');

    // Toggling off removes the overlay and restores the decoration.
    await studio.locator('[data-cy$="-WindingStudio-field"]').uncheck();
    await expect(overlay).not.toBeVisible({ timeout: 5000 });
  });

  // Per-window sections layout: the window gear applies orientation/alignment
  // to THAT window's bobbin entry and re-winds.
  test('WS-16 builder: window gear sets sections orientation for the window', async ({ page }) => {
    test.setTimeout(240000);
    await goToMagneticTool(page);
    await injectMas(page, MULTICOLUMN_FIXTURE, { heal: false, mountFirst: true });
    await pause(page, 2000, 'mechanical: builder settle after injection');
    const studio = await openStudio(page);
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const sections = pinia._s.get('mas').mas?.magnetic?.coil?.sectionsDescription ?? [];
      return sections.filter((s) => s.type === 'conduction').length === 2;
    }, null, { timeout: 60000 });

    await studio.locator('[data-cy$="-WindingStudio-window-gear-0"]').click();
    const menu = studio.locator('[data-cy$="-WindingStudio-window-menu"]');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await studio.locator('[data-cy$="-WindingStudio-window-orientation"]').selectOption('contiguous');
    await studio.locator('[data-cy$="-WindingStudio-window-apply"]').click();
    await expect(menu).not.toBeVisible({ timeout: 3000 });

    // The window entry carries the new orientation and the re-wound sections
    // stack along y (contiguous) instead of x.
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const coil = pinia._s.get('mas').mas?.magnetic?.coil;
      const window0 = coil?.bobbin?.processedDescription?.windingWindows?.[0];
      const conduction = (coil?.sectionsDescription ?? []).filter((s) => s.type === 'conduction');
      if (window0?.sectionsOrientation !== 'contiguous' || conduction.length !== 2) {
        return false;
      }
      const [a, b] = conduction;
      return Math.abs(a.coordinates[0] - b.coordinates[0]) < 1e-6
        && Math.abs(a.coordinates[1] - b.coordinates[1]) > 1e-4;
    }, null, { timeout: 90000 });
    await ss(page, 'ws16-window-contiguous');
  });

  // Toroid polish: angular margin wedges render from the MAS margins, and the
  // boundary between two adjacent sectors drags to new proportions.
  test('WS-17 builder: toroid margin wedges + sector boundary proportions', async ({ page }) => {
    test.setTimeout(240000);
    await goToMagneticTool(page);
    await injectMas(page, TOROIDAL_FIXTURE, { heal: false, mountFirst: true });
    await pause(page, 2000, 'mechanical: builder settle after injection');
    const studio = await openStudio(page);
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const sections = pinia._s.get('mas').mas?.magnetic?.coil?.sectionsDescription ?? [];
      return sections.filter((s) => s.type === 'conduction').length >= 2;
    }, null, { timeout: 60000 });

    // Boundary drag: spy on the wind proportions like WS-6.
    await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const taskQueue = pinia._s.get('magneticBuilderTaskQueue');
      window.__windProportions = [];
      const original = taskQueue.wind;
      taskQueue.wind = async function (...args) {
        window.__windProportions.push(JSON.parse(JSON.stringify(args[2])));
        return original.apply(this, args);
      };
    });
    const boundary = studio.locator('[data-cy$="-WindingStudio-sector-boundary"]').first();
    await expect(boundary).toBeVisible({ timeout: 5000 });
    // The wedge is annular: its bounding-box center can miss the path, so
    // compute exact screen points from the boundary's polar mid-point and
    // rotate it 15° around the ring center.
    const points = await page.evaluate(() => {
      const svg = document.querySelector('.winding-studio-svg');
      const el = document.querySelector('[data-cy$="-WindingStudio-sector-boundary"]');
      const theta = (Number(el.getAttribute('data-theta')) * Math.PI) / 180;
      const radius = Number(el.getAttribute('data-r-mid'));
      const ctm = svg.getScreenCTM();
      const toClient = (angle) => ({
        x: ctm.a * radius * Math.cos(angle) + ctm.e,
        y: ctm.d * radius * Math.sin(angle) + ctm.f,
      });
      return { from: toClient(theta), to: toClient(theta + (15 * Math.PI) / 180) };
    });
    await page.mouse.move(points.from.x, points.from.y);
    await page.mouse.down();
    await page.mouse.move(points.to.x, points.to.y, { steps: 8 });
    await page.mouse.up();
    await page.waitForFunction(() => {
      const calls = window.__windProportions ?? [];
      return calls.length > 0
        && Math.abs(calls[calls.length - 1][0] - calls[calls.length - 1][1]) > 0.02;
    }, null, { timeout: 60000 });
    await ss(page, 'ws17-sector-boundary');
  });

  // Display-only polish, verified on the harness (no builder rewind in the
  // loop): litz strand bundles and toroidal margin wedges.
  test('WS-18 litz strand bundles + toroid margin wedges render', async ({ page }) => {
    // 1. Litz: Primary re-typed as litz — buildTurnViews only reads wire.type.
    const parsed = JSON.parse(fs.readFileSync(MULTICOLUMN_FIXTURE, 'utf-8'));
    parsed.magnetic.coil.functionalDescription[0].wire = { type: 'litz', strand: 'Round 0.1 - Grade 1', numberConductors: 60 };
    // Margins in the schema's OBJECT form (marginInfo, as the Insulation panel
    // writes them) must render tape exactly like the engine's array form.
    parsed.magnetic.coil.sectionsDescription[0].margin = { topOrLeftWidth: 0.002, bottomOrRightWidth: 0.002 };
    await page.goto(`${BASE_URL}/winding_studio_dev`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(() => typeof window.__setStudioMas === 'function', null, { timeout: 30000 });
    await page.evaluate((mas) => window.__setStudioMas(mas), parsed);
    const studio = page.locator('.winding-studio').first();
    await expect(studio).toBeVisible({ timeout: 5000 });

    const primaryGlyphs = parsed.magnetic.coil.turnsDescription
      .filter((turn) => turn.winding === 'Primary')
      .reduce((count, turn) => count + 1 + (turn.additionalCoordinates?.length ?? 0), 0);
    // 7 strands per Primary glyph, none for the plain Secondary.
    await expect(studio.locator('.winding-studio-litz-strand')).toHaveCount(primaryGlyphs * 7, { timeout: 5000 });
    // Object-form margins draw tape (2 rects at margin opacity).
    const marginRects = await studio.locator('rect[opacity="0.8"]').count();
    expect(marginRects).toBeGreaterThanOrEqual(2);
    await ss(page, 'ws18-litz-strands');

    // 2. Toroid margin wedges: a conduction sector with margins grows the
    //    wedge layer (marginColor paths, pointer-events none).
    const toroid = JSON.parse(fs.readFileSync(TOROIDAL_FIXTURE, 'utf-8'));
    const conduction = toroid.magnetic.coil.sectionsDescription.find((s) => s.type === 'conduction');
    conduction.margin = [0.002, 0.002];
    await page.evaluate((mas) => window.__setStudioMas(mas), toroid);
    await expect(async () => {
      const wedges = await studio.locator('path').evaluateAll(
        (nodes) => nodes.filter((node) => node.getAttribute('pointer-events') === 'none'
          && node.getAttribute('opacity') === '0.8').length,
      );
      expect(wedges).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 10000 });
    await ss(page, 'ws18-margin-wedges');
  });

  // Auto fit: drops the drawn rectangles and re-winds with the engine's own
  // wire-based per-winding proportions (24-turn primary vs 12-turn secondary
  // on the same wire → ~[2/3, 1/3]).
  test('WS-22 builder: Auto fit re-winds with wire-based proportions', async ({ page }) => {
    test.setTimeout(240000);
    await goToMagneticTool(page);
    await injectMas(page, MULTICOLUMN_FIXTURE, { heal: false, mountFirst: true });
    await pause(page, 2000, 'mechanical: builder settle after injection');
    const studio = await openStudio(page);
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const sections = pinia._s.get('mas').mas?.magnetic?.coil?.sectionsDescription ?? [];
      return sections.filter((s) => s.type === 'conduction').length === 2;
    }, null, { timeout: 60000 });

    await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const taskQueue = pinia._s.get('magneticBuilderTaskQueue');
      window.__windProportions = [];
      const original = taskQueue.wind;
      taskQueue.wind = async function (...args) {
        window.__windProportions.push(JSON.parse(JSON.stringify(args[2])));
        return original.apply(this, args);
      };
    });

    // Skew the proportions away from auto with a boundary drag (primary smaller).
    const boundary = studio.locator('[data-cy$="-WindingStudio-boundary"]').first();
    await expect(boundary).toBeVisible({ timeout: 5000 });
    const box = await boundary.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 15, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForFunction(() => {
      const calls = window.__windProportions ?? [];
      return calls.length > 0 && calls[calls.length - 1][0] < 0.45;
    }, null, { timeout: 60000 });

    // Auto fit restores the engine's wire-based split.
    await studio.locator('[data-cy$="-WindingStudio-autofit"]').click();
    await page.waitForFunction(() => {
      const calls = window.__windProportions ?? [];
      const last = calls[calls.length - 1];
      return calls.length > 1 && Math.abs(last[0] - 2 / 3) < 0.08 && Math.abs(last[1] - 1 / 3) < 0.08;
    }, null, { timeout: 60000 });
    await ss(page, 'ws22-auto-fit');
  });

  // Groups editor: the wound-together partition (e.g. center-tapped halves).
  // Cross-side grouping JOINS the isolation sides; wire/parallels mismatches
  // are refused with a visible reason; grouped windings move between legs as
  // one; chips show the link marker; outside click applies.
  test('WS-23 builder: groups editor winds windings together, joins sides, moves as one', async ({ page }) => {
    test.setTimeout(300000);
    await goToMagneticTool(page);
    const parsed = JSON.parse(fs.readFileSync(MULTICOLUMN_FIXTURE, 'utf-8'));
    // Third winding with a DIFFERENT wire — never groupable. The Secondary
    // shares the Primary's wire but sits on the other isolation side —
    // groupable, with the sides joining.
    const bias = JSON.parse(JSON.stringify(parsed.magnetic.coil.functionalDescription[0]));
    bias.name = 'Bias';
    bias.numberTurns = 6;
    // Same object shape, different wire IDENTITY (name) — never groupable.
    bias.wire.name = 'Round 0.475 - Grade 1';
    parsed.magnetic.coil.functionalDescription.push(bias);
    delete parsed.magnetic.coil.sectionsDescription;
    delete parsed.magnetic.coil.layersDescription;
    delete parsed.magnetic.coil.turnsDescription;
    const fixturePath = 'tests/fixtures/.ws23-tmp.json';
    fs.writeFileSync(fixturePath, JSON.stringify(parsed));
    try {
      await injectMas(page, fixturePath, { heal: false, mountFirst: true });
    } finally {
      fs.unlinkSync(fixturePath);
    }
    await pause(page, 2000, 'mechanical: builder settle after injection');
    const studio = await openStudio(page);
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const sections = pinia._s.get('mas').mas?.magnetic?.coil?.sectionsDescription ?? [];
      return sections.filter((s) => s.type === 'conduction').length === 3;
    }, null, { timeout: 90000 });

    // Group Primary + Secondary (cross-side: allowed, sides join); the
    // different-wire Bias is refused with a VISIBLE reason.
    await studio.locator('[data-cy$="-WindingStudio-groups"]').click();
    const menu = studio.locator('[data-cy$="-WindingStudio-groups-menu"]');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await studio.locator('[data-cy$="-WindingStudio-group-0-Primary"]').click();
    await studio.locator('[data-cy$="-WindingStudio-group-0-Secondary"]').click();
    await expect(studio.locator('[data-cy$="-WindingStudio-group-0-Bias"]')).toBeDisabled();
    await expect(menu).toContainText(/Bias: needs the same wire/);
    await expect(menu).toContainText(/isolation sides join/);
    await studio.locator('[data-cy$="-WindingStudio-groups-apply"]').click();
    await expect(menu).not.toBeVisible({ timeout: 3000 });

    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const coil = pinia._s.get('mas').mas?.magnetic?.coil ?? {};
      const primary = coil.functionalDescription?.find((w) => w.name === 'Primary');
      const secondary = coil.functionalDescription?.find((w) => w.name === 'Secondary');
      const shared = (coil.sectionsDescription ?? []).some(
        (s) => s.type === 'conduction' && (s.partialWindings ?? []).length === 2);
      const counts = {};
      (coil.turnsDescription ?? []).forEach((t) => { counts[t.winding] = (counts[t.winding] ?? 0) + 1; });
      return primary?.woundWith?.includes('Secondary') === true
        && secondary?.woundWith?.includes('Primary') === true
        && secondary?.isolationSide === 'primary'
        && shared && counts.Primary === 24 && counts.Secondary === 12 && counts.Bias === 6;
    }, null, { timeout: 90000 });

    // Grouped chips carry the link marker; the ungrouped one does not.
    await expect(studio.locator('[data-cy$="-WindingStudio-chip-Primary"]')).toContainText('⛓');
    await expect(studio.locator('[data-cy$="-WindingStudio-chip-Bias"]')).not.toContainText('⛓');
    await ss(page, 'ws23-grouped');

    // Group placement: dragging ONE member to the left leg moves BOTH.
    await dragChipToColumn(page, studio.locator('[data-cy$="-WindingStudio-chip-Primary"]').first(), 2);
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const coil = pinia._s.get('mas').mas?.magnetic?.coil ?? {};
      const primary = coil.functionalDescription?.find((w) => w.name === 'Primary');
      const secondary = coil.functionalDescription?.find((w) => w.name === 'Secondary');
      const turns = coil.turnsDescription ?? [];
      const grouped = turns.filter((t) => t.winding === 'Primary' || t.winding === 'Secondary');
      return primary?.windingWindow === 2 && secondary?.windingWindow === 2
        && grouped.length > 0 && grouped.every((t) => t.coordinates[0] < 0);
    }, null, { timeout: 120000 });
    await ss(page, 'ws23-group-moved');

    // Ungroup by removing Secondary, applying via OUTSIDE CLICK.
    await studio.locator('[data-cy$="-WindingStudio-groups"]').click();
    await expect(menu).toBeVisible({ timeout: 3000 });
    await studio.locator('[data-cy$="-WindingStudio-group-0-Secondary"]').click();
    await studio.locator('.winding-studio-title').click();
    await expect(menu).not.toBeVisible({ timeout: 3000 });
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const coil = pinia._s.get('mas').mas?.magnetic?.coil ?? {};
      return coil.functionalDescription?.every((w) => w.woundWith == null)
        && (coil.sectionsDescription ?? []).filter((s) => s.type === 'conduction')
          .every((s) => (s.partialWindings ?? []).length === 1);
    }, null, { timeout: 90000 });
    await ss(page, 'ws23-ungrouped');
  });

  // Undo coalescing: successive states carrying the same gesture key collapse
  // into ONE history entry, and back() lands on the pre-gesture state.
  test('WS-19 history coalesces same-gesture entries into one undo step', async ({ page }) => {
    await goToMagneticTool(page);
    await pause(page, 1500, 'mechanical: builder settle');
    const result = await page.evaluate(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const history = pinia._s.get('history');
      // The 100ms rebound blocker sits between real wind completions too.
      history.unblockAdditions();
      history.addToHistory({ step: 'base' });
      await sleep(150);
      history.addToHistory({ step: 'pre' });
      await sleep(150);
      const lengthBeforeGesture = history.masHistory.length;
      history.addToHistory({ step: 'drag1' }, 'studio:test-gesture');
      await sleep(150);
      history.addToHistory({ step: 'drag2' }, 'studio:test-gesture');
      await sleep(150);
      history.addToHistory({ step: 'drag3' }, 'studio:test-gesture');
      await sleep(150);
      const grewBy = history.masHistory.length - lengthBeforeGesture;
      const top = history.masHistory[history.historyPointer].step;
      const backState = history.back();
      // A NEW gesture after undo must not coalesce into the restored entry.
      await sleep(150);
      history.addToHistory({ step: 'drag4' }, 'studio:test-gesture');
      const afterNewGesture = history.masHistory[history.historyPointer].step;
      return { grewBy, top, backStep: backState.step, afterNewGesture };
    });
    expect(result.grewBy).toBe(1);
    expect(result.top).toBe('drag3');
    expect(result.backStep).toBe('pre');
    expect(result.afterNewGesture).toBe('drag4');
  });

  // N-filar grouping + parallels winding style: "Wind together (bifilar)"
  // marks the pair as woundWith (mutual, shared sections); the section gear's
  // Parallels select forces multifilar vs turn-by-turn for a winding with
  // multiple parallels.
  test('WS-21 builder: bifilar grouping and parallels winding style', async ({ page }) => {
    test.setTimeout(240000);
    await goToMagneticTool(page);
    const parsed = JSON.parse(fs.readFileSync(MULTICOLUMN_FIXTURE, 'utf-8'));
    // Two parallels on the Primary so the Parallels style knob applies, and a
    // GROUPABLE pair: the engine requires wound-together windings to share
    // parallels, isolation side and wire (think primary + bias, not primary +
    // secondary across the barrier).
    parsed.magnetic.coil.functionalDescription[0].numberParallels = 2;
    parsed.magnetic.coil.functionalDescription[1].numberParallels = 2;
    parsed.magnetic.coil.functionalDescription[1].isolationSide = parsed.magnetic.coil.functionalDescription[0].isolationSide;
    parsed.magnetic.coil.functionalDescription[1].wire = JSON.parse(JSON.stringify(parsed.magnetic.coil.functionalDescription[0].wire));
    delete parsed.magnetic.coil.sectionsDescription;
    delete parsed.magnetic.coil.layersDescription;
    delete parsed.magnetic.coil.turnsDescription;
    const fixturePath = 'tests/fixtures/.ws21-tmp.json';
    fs.writeFileSync(fixturePath, JSON.stringify(parsed));
    try {
      await injectMas(page, fixturePath, { heal: false, mountFirst: true });
    } finally {
      fs.unlinkSync(fixturePath);
    }
    await pause(page, 2000, 'mechanical: builder settle after injection');
    const studio = await openStudio(page);
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const sections = pinia._s.get('mas').mas?.magnetic?.coil?.sectionsDescription ?? [];
      return sections.filter((s) => s.type === 'conduction').length === 2;
    }, null, { timeout: 60000 });

    // 1. Parallels style: select the Primary section, force turn-by-turn.
    await studio.locator('.winding-studio-turn[data-studio-winding="Primary"]').first().click();
    const sectionGear = studio.locator('[data-cy$="-WindingStudio-section-gear"]');
    await expect(sectionGear).toBeVisible({ timeout: 5000 });
    await sectionGear.click();
    const styleSelect = studio.locator('[data-cy$="-WindingStudio-section-winding-style"]');
    await expect(styleSelect).toBeVisible({ timeout: 3000 });
    await styleSelect.selectOption('windByConsecutiveTurns');
    await studio.locator('[data-cy$="-WindingStudio-section-apply"]').click();
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const sections = pinia._s.get('mas').mas?.magnetic?.coil?.sectionsDescription ?? [];
      const primary = sections.find((s) => s.type === 'conduction' && s.partialWindings[0].winding === 'Primary');
      return primary?.windingStyle === 'windByConsecutiveTurns';
    }, null, { timeout: 90000 });
    await ss(page, 'ws21-winding-style');

    // Deselect before the chip drag.
    await studio.locator('.winding-studio-title').click();

    // 2. Bifilar grouping: drop Secondary on Primary → "Wind together".
    async function dropSecondaryOnPrimary() {
      const chip = studio.locator('[data-cy$="-WindingStudio-chip-Secondary"]').first();
      const chipBox = await chip.boundingBox();
      await page.mouse.move(chipBox.x + chipBox.width / 2, chipBox.y + chipBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(chipBox.x + chipBox.width / 2 + 30, chipBox.y + chipBox.height / 2 + 30, { steps: 3 });
      const primaryTurn = studio.locator('.winding-studio-turn[data-studio-winding="Primary"]').first();
      const turnBox = await primaryTurn.boundingBox();
      await page.mouse.move(turnBox.x + turnBox.width / 2, turnBox.y + turnBox.height / 2, { steps: 5 });
      await page.mouse.up();
      await expect(page.locator('[data-cy$="-WindingStudio-interleave-menu"]')).toBeVisible({ timeout: 3000 });
    }
    await dropSecondaryOnPrimary();
    await page.locator('[data-cy$="-WindingStudio-interleave-group"]').click();
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const coil = pinia._s.get('mas').mas?.magnetic?.coil ?? {};
      const primary = coil.functionalDescription?.find((w) => w.name === 'Primary');
      const secondary = coil.functionalDescription?.find((w) => w.name === 'Secondary');
      const shared = (coil.sectionsDescription ?? []).some(
        (s) => s.type === 'conduction' && (s.partialWindings ?? []).length === 2);
      return primary?.woundWith?.includes('Secondary') === true
        && secondary?.woundWith?.includes('Primary') === true
        && shared;
    }, null, { timeout: 90000 });
    await ss(page, 'ws21-bifilar');

    // 3. Ungroup: the menu now offers "Stop winding together".
    await dropSecondaryOnPrimary();
    await page.locator('[data-cy$="-WindingStudio-interleave-ungroup"]').click();
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const coil = pinia._s.get('mas').mas?.magnetic?.coil ?? {};
      const primary = coil.functionalDescription?.find((w) => w.name === 'Primary');
      const secondary = coil.functionalDescription?.find((w) => w.name === 'Secondary');
      const sections = (coil.sectionsDescription ?? []).filter((s) => s.type === 'conduction');
      return primary?.woundWith == null && secondary?.woundWith == null
        && sections.length === 2 && sections.every((s) => (s.partialWindings ?? []).length === 1);
    }, null, { timeout: 90000 });
    await ss(page, 'ws21-ungrouped');
  });

  // Per-section gear (only while a section is selected): turns alignment +
  // layers orientation for THAT section; cosmetic alignment labels (enum
  // values untouched); click-outside closes the menu APPLYING the changes.
  test('WS-20 builder: section gear sets per-section layout, applies on outside click', async ({ page }) => {
    test.setTimeout(240000);
    await goToMagneticTool(page);
    await injectMas(page, MULTICOLUMN_FIXTURE, { heal: false, mountFirst: true });
    await pause(page, 2000, 'mechanical: builder settle after injection');
    const studio = await openStudio(page);
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return false;   // ABT #929: not mounted yet — poll again, do not throw
      const sections = pinia._s.get('mas').mas?.magnetic?.coil?.sectionsDescription ?? [];
      return sections.filter((s) => s.type === 'conduction').length === 2;
    }, null, { timeout: 60000 });

    // Select the Primary section (clicking a turn selects its section) — the
    // section gear appears only while selected.
    const sectionGear = studio.locator('[data-cy$="-WindingStudio-section-gear"]');
    await expect(sectionGear).not.toBeVisible();
    await studio.locator('.winding-studio-turn[data-studio-winding="Primary"]').first().click();
    await expect(sectionGear).toBeVisible({ timeout: 5000 });

    await sectionGear.click();
    const menu = studio.locator('[data-cy$="-WindingStudio-section-menu"]');
    await expect(menu).toBeVisible({ timeout: 3000 });

    // Cosmetic labels: with overlapping layers the 'innerOrTop' OPTION reads
    // 'top' — while its VALUE stays the real enum.
    const topOption = menu.locator('option[value="innerOrTop"]').first();
    await expect(topOption).toHaveText('top');

    // Pick 'innerOrTop' turns alignment, then click OUTSIDE the menu: it
    // must close AND apply (re-wind with the new per-section alignment).
    await studio.locator('[data-cy$="-WindingStudio-section-turns-alignment"]').selectOption('innerOrTop');
    const primarySectionName = await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      return (pinia._s.get('mas').mas.magnetic.coil.sectionsDescription ?? [])
        .find((s) => s.type === 'conduction' && s.partialWindings[0].winding === 'Primary').name;
    });
    await studio.locator('.winding-studio-title').click();
    await expect(menu).not.toBeVisible({ timeout: 3000 });

    await page.waitForFunction((sectionName) => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const layers = pinia._s.get('mas').mas?.magnetic?.coil?.layersDescription ?? [];
      const sectionLayers = layers.filter((l) => l.type === 'conduction' && l.section === sectionName);
      return sectionLayers.length > 0 && sectionLayers.every((l) => l.turnsAlignment === 'innerOrTop');
    }, primarySectionName, { timeout: 90000 });
    await ss(page, 'ws20-section-layout');
  });
});
