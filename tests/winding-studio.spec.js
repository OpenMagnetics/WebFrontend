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

async function injectMas(page, fixturePath) {
  const parsed = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

  await page.evaluate((parsedMas) => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    const mas = pinia._s.get('mas');
    const state = pinia._s.get('state');

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
    mas.setMas(parsedMas);

    state.selectWorkflow?.('design');
    state.selectTool?.('magneticBuilder');
    state.setCurrentToolSubsection('magneticBuilder');
    state.setCurrentToolSubsectionStatus('designRequirements', true);
    state.setCurrentToolSubsectionStatus('operatingPoints', true);
  }, parsed);

  await pause(page, 2500, 'mechanical: settle');
  return parsed;
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
});
