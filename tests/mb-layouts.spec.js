/**
 * ABT #1121 — the builder's switchable layouts.
 *
 * The contract: a layout arranges the same components with the same props and
 * owns nothing else. So the first test is one battery run against EVERY layout
 * — edit the core, read the numbers, no console errors — which is what stops a
 * layout from quietly dropping a control. The rest cover only what is unique to
 * one layout, plus the two properties the switch itself must have: it changes
 * nothing in the design, and it is remembered.
 */
import { test, expect } from './_coverage.js';
import { isBenign, pause } from './utils.js';
import {
  goToBuilderStep,
  adviseCoreAndWait,
  adviseWireAndWait,
  selectOptions,
  pickOption,
} from './utils/builder-helpers.js';
import {
  BUILDER_LAYOUTS,
  LAYOUT_MARKERS,
  setBuilderLayout,
  currentBuilderLayout,
  designFingerprint,
} from './utils/layouts.js';

const SETTLE = 4000;

function watchConsole(page, errors) {
  page.on('console', (message) => {
    if (message.type() === 'error' && !isBenign(message.text())) errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error}`));
}

async function coreShape(page) {
  return page.evaluate(() => {
    const app = document.querySelector('#app').__vue_app__;
    const shape = app.config.globalProperties.$pinia._s.get('mas').mas.magnetic.core.functionalDescription.shape;
    return typeof shape === 'string' ? shape : shape?.name;
  });
}

test.describe('Builder layouts (ABT #1121)', () => {
  test.describe.configure({ timeout: 900000 });

  test('every layout renders, and the core can be edited in each', async ({ page }) => {
    const errors = [];
    watchConsole(page, errors);
    await page.setViewportSize({ width: 1500, height: 950 });

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);
    await pause(page, SETTLE, 'first design settles');

    for (const layout of BUILDER_LAYOUTS) {
      await setBuilderLayout(page, layout);
      await pause(page, SETTLE, `${layout} mounts and resimulates`);

      // The layout is the one asked for …
      await expect(
        page.locator(`[data-cy$="${LAYOUT_MARKERS[layout]}"]`),
        `the ${layout} layout must be on screen`,
      ).toHaveCount(1);

      // … the core panel is reachable in it once it has finished reprocessing …
      await expect(
        page.locator('[data-cy$="-AdvancedCoreInfo-ShapeNames-select"]').first(),
        `the ${layout} layout must offer the core's shape`,
      ).toBeVisible({ timeout: 60000 });
      const shapes = await selectOptions(page, '-AdvancedCoreInfo-ShapeNames');
      const current = await coreShape(page);
      const other = shapes.find((name) => name !== current);
      expect(other, `the ${layout} layout must offer another shape`).toBeTruthy();

      // … and editing there reaches the design.
      await pickOption(page, '-AdvancedCoreInfo-ShapeNames', other);
      await pause(page, SETTLE, 'checkAndFixMas + autocomplete + reprocess');
      expect(await coreShape(page), `the ${layout} layout must apply a shape change`).toBe(other);

      // The core's numbers are on screen in every layout, wherever it puts them.
      await expect(
        page.locator('[data-cy$="-CoreInfo-EffectiveLength-container"]').first(),
        `the ${layout} layout must show the core's effective length`,
      ).toBeVisible();
    }

    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('switching layout leaves the design untouched', async ({ page }) => {
    const errors = [];
    watchConsole(page, errors);

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);
    await pause(page, SETTLE, 'design settles');

    const before = await designFingerprint(page);
    for (const layout of ['bands', 'cockpit', 'compare', 'planar', 'columns']) {
      await setBuilderLayout(page, layout);
      await pause(page, 2500, `${layout} mounts`);
    }
    const after = await designFingerprint(page);

    expect(after, 'a layout arranges the design, it does not edit it').toEqual(before);
    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('the Settings dropdown chooses the layout, and it survives a reload', async ({ page }) => {
    const errors = [];
    watchConsole(page, errors);

    await goToBuilderStep(page);
    await pause(page, 1500, 'builder mounts');

    await page.locator('[data-cy$="settings-modal-button"]').first().click();
    // Either settings dialog: the site's own (MagneticBuilderSettingsModal) and
    // MagneticBuilder's both offer the same choice, writing the same setting.
    const select = page.locator('[data-cy$="layout-select"]').first();
    await expect(select, 'Settings offers the layout').toBeVisible({ timeout: 15000 });
    await select.selectOption('bands');
    await page.keyboard.press('Escape');
    await pause(page, 2500, 'dialog closes, layout mounts');

    await expect(page.locator('[data-cy$="-LayoutBands"]')).toHaveCount(1);
    expect(await currentBuilderLayout(page)).toBe('bands');

    // Persisted: the store is written to localStorage, so a reload keeps it.
    await page.reload();
    await pause(page, 4000, 'app boots');
    expect(await currentBuilderLayout(page), 'the choice is remembered').toBe('bands');

    await setBuilderLayout(page, 'columns');
    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('bands: a row per part, with the alternatives and the wire response', async ({ page }) => {
    const errors = [];
    watchConsole(page, errors);
    await page.setViewportSize({ width: 1500, height: 950 });

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);
    await setBuilderLayout(page, 'bands');
    await pause(page, SETTLE, 'bands mount');

    for (const band of ['-Band-Core', '-Band-Wire', '-Band-Coil']) {
      await expect(page.locator(`[data-cy$="${band}"]`), `the ${band} row`).toHaveCount(1);
    }

    // The third cell of the core row: alternatives, not yet fetched.
    await expect(page.locator('[data-cy$="-Band-Alternatives-empty"]')).toBeVisible();
    await expect(page.locator('[data-cy$="-Band-Alternatives-find-button"]')).toBeEnabled();

    // The third cell of the wire row: a winding graph, chosen from the winding domain only.
    const graphSelect = page.locator('[data-cy$="-Band-WireGraph-GraphPanel-GraphSelector-select"]').first();
    await expect(graphSelect, 'the wire row plots the winding').toBeVisible();

    await setBuilderLayout(page, 'columns');
    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('cockpit: the tabs swap the canvas', async ({ page }) => {
    const errors = [];
    watchConsole(page, errors);
    await page.setViewportSize({ width: 1500, height: 950 });

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await setBuilderLayout(page, 'cockpit');
    await pause(page, SETTLE, 'cockpit mounts');

    // Geometry is the first tab: the view switch is there.
    await expect(page.locator('[data-cy$="-Cockpit-VisualizerSwitch"]')).toHaveCount(1);

    await page.locator('[data-cy$="-Cockpit-tab-alternatives"]').first().click();
    await pause(page, 1500, 'tab switch');
    await expect(page.locator('[data-cy$="-Cockpit-Alternatives"]')).toHaveCount(1);
    await expect(page.locator('[data-cy$="-Cockpit-VisualizerSwitch"]')).toHaveCount(0);

    await page.locator('[data-cy$="-Cockpit-tab-geometry"]').first().click();
    await pause(page, 1500, 'tab switch back');
    await expect(page.locator('[data-cy$="-Cockpit-VisualizerSwitch"]')).toHaveCount(1);

    await setBuilderLayout(page, 'columns');
    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('planar: a wound design is told the stack is for printed windings', async ({ page }) => {
    const errors = [];
    watchConsole(page, errors);
    await page.setViewportSize({ width: 1500, height: 950 });

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await setBuilderLayout(page, 'planar');
    await pause(page, SETTLE, 'planar mounts');

    // The buck design under test is wound, so both the layout and the stack say so
    // rather than presenting winding layers as a board.
    await expect(page.locator('[data-cy$="-Planar-notPrinted"]')).toBeVisible();
    await expect(page.locator('[data-cy$="-Planar-Stackup-notPrinted"]')).toBeVisible();
    await expect(page.locator('[data-cy$="-Planar-Stackup-summary"]')).toHaveCount(0);

    await setBuilderLayout(page, 'columns');
    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('the geometry view switches between the cross-section and the solid', async ({ page }) => {
    const errors = [];
    watchConsole(page, errors);
    await page.setViewportSize({ width: 1500, height: 950 });

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);
    await setBuilderLayout(page, 'bands');
    await pause(page, SETTLE, 'bands mount');

    // The solid needs a wound coil, so wait for the winding rather than racing it.
    await page.waitForFunction(() => {
      const app = document.querySelector('#app').__vue_app__;
      return app.config.globalProperties.$pinia._s.get('mas').mas.magnetic.coil.turnsDescription != null;
    }, { timeout: 90000 });

    await expect(page.locator('[data-cy$="-Band-VisualizerSwitch-2D"]')).toHaveCount(1);
    await pickOption(page, '-Band-VisualizerSwitch-View', 'Solid (3D)');
    await pause(page, 3000, '3D builds');
    await expect(page.locator('[data-cy$="-Band-VisualizerSwitch-3D"]')).toHaveCount(1);
    await expect(page.locator('[data-cy$="-Band-VisualizerSwitch-2D"]')).toHaveCount(0);

    await setBuilderLayout(page, 'columns');
    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });
});
