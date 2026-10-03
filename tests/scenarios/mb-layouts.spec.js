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
import { test, expect } from '../_coverage.js';
import { isBenign } from '../utils.js';
import {
  goToBuilderStep,
  adviseCoreAndWait,
  adviseWireAndWait,
  selectOptions,
  pickOption,
} from '../utils/builder-helpers.js';
import {
  BUILDER_LAYOUTS,
  LAYOUT_MARKERS,
  setBuilderLayout,
  setBuilderGraphs,
  currentBuilderLayout,
  designFingerprint,
  auditGeometry,
} from '../utils/layouts.js';
import {
  installActivityProbe,
  activityMark,
  waitForIdle,
  waitForStableLayout,
} from '../utils/activity.js';

// ABT #1415: every step used to settle on a fixed pause (1.5-4 s, 18 of them). Each one now waits
// on what the step actually sets off: the builder's store actions and engine requests going idle
// (utils/activity.js), the layout's own data-cy marker, the store a reload rehydrates, and the
// three.js scene holding meshes. Each wait is taken from a mark set BEFORE the step, so work left
// over from the previous step cannot satisfy it.

/** The cards auditGeometry measures: when their boxes stop moving, the reflow is over. */
const CARDS = '.panel-frame, .core-config-panel, .wire-config-panel, .coil-config-panel,'
  + ' .coreinfo-panel, .wireinfo-panel, .coilinfo-panel, .graph-panel';

/** Switch layout and wait for it to be mounted AND for everything its mount set off to finish. */
async function switchLayout(page, layout) {
  const mark = await activityMark(page);
  await setBuilderLayout(page, layout);
  await expect(
    page.locator(`[data-cy$="${LAYOUT_MARKERS[layout]}"]`),
    `the ${layout} layout must mount`,
  ).toHaveCount(1, { timeout: 30000 });
  await waitForIdle(page, { since: mark, label: `the ${layout} layout's mount` });
}

/** Read the three.js scene under `container`: resolves once it holds meshes with vertices. */
async function waitForSolid(page, container, timeout = 120000) {
  const handle = await page.waitForFunction((css) => {
    const el = document.querySelector(css);
    const vm = el && window.__omFindComponent((i) => i.proxy?.$refs?.scene?.scene && i.proxy.$el?.contains?.(el));
    const scene = vm?.$refs?.scene?.scene;
    if (!scene || vm.updating) return false;
    let meshes = 0;
    let vertices = 0;
    const walk = (object) => {
      for (const child of (object.children ?? [])) {
        if (child.isMesh && child.geometry?.attributes?.position) {
          meshes += 1;
          vertices += child.geometry.attributes.position.count;
        }
        walk(child);
      }
    };
    walk(scene);
    return meshes > 0 ? { meshes, vertices } : false;
  }, container, { timeout });
  return handle.jsonValue();
}

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

test.describe('Builder layouts (ABT #1121) @heavy', () => {
  test.describe.configure({ timeout: 900000 });

  // Before the first navigation: the probe is an init script and must see the app boot.
  test.beforeEach(async ({ page }) => { await installActivityProbe(page); });

  test('every layout renders, and the core can be edited in each', async ({ page }) => {
    const errors = [];
    watchConsole(page, errors);
    await page.setViewportSize({ width: 1500, height: 950 });

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);
    await waitForIdle(page, { label: 'the first design' });

    for (const layout of BUILDER_LAYOUTS) {
      await switchLayout(page, layout);

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

      // … and editing there reaches the design. Wait on the design itself: the
      // panels around it are busy reprocessing, and a fixed pause races them.
      const beforeEdit = await activityMark(page);
      await pickOption(page, '-AdvancedCoreInfo-ShapeNames', other);
      await page.waitForFunction((expected) => {
        const app = document.querySelector('#app').__vue_app__;
        const shape = app.config.globalProperties.$pinia._s.get('mas').mas.magnetic.core.functionalDescription.shape;
        return (typeof shape === 'string' ? shape : shape?.name) === expected;
      }, other, { timeout: 60000 });
      await waitForIdle(page, { since: beforeEdit, label: `autocomplete + reprocess after the shape change in ${layout}` });

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
    await waitForIdle(page, { label: 'the advised design' });

    const before = await designFingerprint(page);
    for (const layout of ['rosano', 'cockpit', 'compare', 'planar', 'columns']) {
      await switchLayout(page, layout);
    }
    const after = await designFingerprint(page);

    expect(after, 'a layout arranges the design, it does not edit it').toEqual(before);
    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('the Settings dropdown chooses the layout, and it survives a reload', async ({ page }) => {
    const errors = [];
    watchConsole(page, errors);

    await goToBuilderStep(page);
    await waitForIdle(page, { label: 'the builder mount' });

    await page.locator('[data-cy$="settings-modal-button"]').first().click();
    // Either settings dialog: the site's own (MagneticBuilderSettingsModal) and
    // MagneticBuilder's both offer the same choice, writing the same setting.
    const select = page.locator('[data-cy$="layout-select"]').first();
    await expect(select, 'Settings offers the layout').toBeVisible({ timeout: 15000 });
    const beforeChoice = await activityMark(page);
    await select.selectOption('rosano');
    await page.keyboard.press('Escape');
    await expect(select, 'the settings dialog closes').toBeHidden({ timeout: 15000 });

    await expect(page.locator('[data-cy$="-LayoutRosano"]')).toHaveCount(1, { timeout: 30000 });
    await waitForIdle(page, { since: beforeChoice, label: 'the rosano layout mount' });
    expect(await currentBuilderLayout(page)).toBe('rosano');

    // Persisted: the store is written to localStorage, so a reload keeps it.
    // The reload rehydrates magneticBuilderSettings when the store is first created,
    // so wait for that store to exist — that is the moment the remembered value is in.
    await page.reload();
    await page.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      return pinia?._s?.get('magneticBuilderSettings') != null;
    }, null, { timeout: 60000 });
    expect(await currentBuilderLayout(page), 'the choice is remembered').toBe('rosano');

    await setBuilderLayout(page, 'columns');
    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('rosano: a row per part, with the alternatives and the wire response', async ({ page }) => {
    const errors = [];
    watchConsole(page, errors);
    await page.setViewportSize({ width: 1500, height: 950 });

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);
    await switchLayout(page, 'rosano');

    for (const band of ['-Band-Core', '-Band-Wire', '-Band-Coil']) {
      await expect(page.locator(`[data-cy$="${band}"]`), `the ${band} row`).toHaveCount(1);
    }

    // The third cell of the core row: the alternatives map, which fetches itself
    // as soon as the design can be ranked — no button press to see it.
    await expect(
      page.locator('[data-cy$="-Band-Alternatives"] .chart').first(),
      'the alternatives map loads by itself',
    ).toBeVisible({ timeout: 90000 });
    await expect(page.locator('[data-cy$="-Band-Alternatives-find-button"]')).toBeEnabled();

    // The third cell of the wire row: a winding graph, chosen from the winding domain
    // only — when the builder's graphs are on (Settings; off by default).
    const graphSelect = page.locator('[data-cy$="-Band-WireGraph-GraphPanel-GraphSelector-select"]').first();
    await expect(graphSelect, 'graphs are off by default, so the wire row plots nothing').toHaveCount(0);
    await expect(page.getByText('Graphs are off in this builder.').first()).toBeVisible();
    await setBuilderGraphs(page, true);
    await expect(graphSelect, 'the wire row plots the winding').toBeVisible({ timeout: 30000 });

    await setBuilderLayout(page, 'columns');
    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('cockpit: the tabs swap the canvas', async ({ page }) => {
    const errors = [];
    watchConsole(page, errors);
    await page.setViewportSize({ width: 1500, height: 950 });

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await switchLayout(page, 'cockpit');

    // Geometry is the first tab: the view switch is there.
    await expect(page.locator('[data-cy$="-Cockpit-VisualizerSwitch"]')).toHaveCount(1);

    // The tab's own panel appearing IS the switch having happened; toHaveCount polls for it.
    await page.locator('[data-cy$="-Cockpit-tab-alternatives"]').first().click();
    await expect(page.locator('[data-cy$="-Cockpit-Alternatives"]')).toHaveCount(1, { timeout: 15000 });
    await expect(page.locator('[data-cy$="-Cockpit-VisualizerSwitch"]')).toHaveCount(0);

    await page.locator('[data-cy$="-Cockpit-tab-geometry"]').first().click();
    await expect(page.locator('[data-cy$="-Cockpit-VisualizerSwitch"]')).toHaveCount(1, { timeout: 15000 });

    await setBuilderLayout(page, 'columns');
    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('planar: a wound design is told the stack is for printed windings', async ({ page }) => {
    const errors = [];
    watchConsole(page, errors);
    await page.setViewportSize({ width: 1500, height: 950 });

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await switchLayout(page, 'planar');

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
    await switchLayout(page, 'rosano');

    // The solid needs a wound coil, so wait for the winding rather than racing it.
    // (The options go THIRD: passed second they were the page function's argument, so the
    // 90 s limit never applied and a coil that never wound ran into the 900 s test budget.)
    await page.waitForFunction(() => {
      const app = document.querySelector('#app').__vue_app__;
      return app.config.globalProperties.$pinia._s.get('mas').mas.magnetic.coil.turnsDescription != null;
    }, null, { timeout: 90000 });

    await expect(page.locator('[data-cy$="-Band-VisualizerSwitch-2D"]')).toHaveCount(1);
    await pickOption(page, '-Band-VisualizerSwitch-View', 'Solid (3D)');
    await expect(page.locator('[data-cy$="-Band-VisualizerSwitch-3D"]')).toHaveCount(1, { timeout: 15000 });
    await expect(page.locator('[data-cy$="-Band-VisualizerSwitch-2D"]')).toHaveCount(0);
    // The solid is built: the three.js scene in that cell holds meshes.
    const solid = await waitForSolid(page, '[data-cy$="-Band-VisualizerSwitch-3D"] .magnetic-3d-visualizer-container');
    expect(solid.vertices, 'the solid carries geometry').toBeGreaterThan(0);

    await setBuilderLayout(page, 'columns');
    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  /**
   * Every layout must fit: nothing drawn outside the card it belongs to, no two
   * cards on top of each other, neighbours in a row sharing a top edge, and the
   * page never scrolling sideways. Header button rows used to spill past the
   * right edge of a narrow card, and Compare's stacked column collapsed to its
   * content width — both invisible to a test that only asserts a control exists.
   */
  test('nothing overflows, overlaps or sits out of line in any layout', async ({ page }) => {
    const errors = [];
    watchConsole(page, errors);

    await page.setViewportSize({ width: 1500, height: 950 });
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);
    await waitForIdle(page, { label: 'the advised design' });

    for (const width of [1500, 1280]) {
      const beforeResize = await activityMark(page);
      await page.setViewportSize({ width, height: 950 });
      await waitForIdle(page, { since: beforeResize, label: `the redraw at ${width}px` });
      await waitForStableLayout(page, CARDS);
      for (const layout of BUILDER_LAYOUTS) {
        await switchLayout(page, layout);
        await waitForStableLayout(page, CARDS);

        const found = await page.evaluate(auditGeometry);
        const where = `${layout} at ${width}px`;
        expect(found.pageOverflow, `${where}: the page scrolls sideways`).toBeNull();
        expect(found.escaping, `${where}: drawn outside its card`).toEqual([]);
        expect(found.overlaps, `${where}: cards on top of each other`).toEqual([]);
        expect(found.misaligned, `${where}: neighbours out of line`).toEqual([]);
      }
    }

    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });
});
