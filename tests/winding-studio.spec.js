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
import { test, expect } from './_coverage.js';
import { BASE_URL, screenshot, pause } from './utils.js';

const CLASSIC_FIXTURE = '/home/alf/OpenMagnetics/WebFrontend/MagneticBuilder/src/public/test_wound_coil.json';
const MULTICOLUMN_FIXTURE = '/home/alf/OpenMagnetics/WebFrontend/tests/fixtures/multicolumn_e42_transformer.json';
const TOROIDAL_FIXTURE = '/home/alf/OpenMagnetics/WebFrontend/tests/fixtures/toroidal_cmc_t2515.json';
const CORRUPT_TOROID_FIXTURE = '/home/alf/OpenMagnetics/WebFrontend/tests/fixtures/toroidal_stale_pin_corrupt_t402416.json';
const ss = (page, name) => screenshot(page, 'winding-studio', name);

function countTurnGlyphs(parsed) {
  return parsed.magnetic.coil.turnsDescription.reduce(
    (count, turn) => count + 1 + (turn.additionalCoordinates?.length ?? 0),
    0,
  );
}

async function goToMagneticTool(page) {
  await page.goto(`${BASE_URL}/magnetic_tool`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(
    () => !window.location.pathname.includes('engine_loader'),
    null,
    { timeout: 45000 },
  );
  await pause(page, 800, 'mechanical: settle');
}

async function injectMas(page, fixturePath, { heal = true, mountFirst = false } = {}) {
  const parsed = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

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
    await selectBuilderState(page);
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      return pinia._s.get('magneticBuilderTaskQueue') != null;
    }, null, { timeout: 30000 });
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
  const toggle = page.locator('[data-cy$="-Coil-WindingStudio-button"]').first();
  await expect(toggle).toBeVisible({ timeout: 10000 });
  const studio = page.locator('.winding-studio');
  if (!(await studio.isVisible().catch(() => false))) {
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

    // Both windings appear in the legend.
    const chips = studio.locator('.winding-studio-chip');
    await expect(chips).toHaveCount(parsed.magnetic.coil.functionalDescription.length);

    // The fit badge reports the wound design fits.
    await expect(studio.locator('[data-cy$="-WindingStudio-fit"]')).toHaveText(/✓ fits/);

    // Return crossings render dimmed (opacity 0.55) and are present for every
    // turn that carries additionalCoordinates.
    const nReturns = parsed.magnetic.coil.turnsDescription.reduce(
      (count, turn) => count + (turn.additionalCoordinates?.length ?? 0),
      0,
    );
    const dimmed = await turnGlyphs.evaluateAll((nodes) =>
      nodes.filter((node) => Number(node.getAttribute('opacity')) === 0.55).length,
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
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
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
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
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
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
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
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
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
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
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
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
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
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
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
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
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
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
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
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
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
});
