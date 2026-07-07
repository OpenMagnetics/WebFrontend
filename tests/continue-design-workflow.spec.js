/**
 * Regression for ABT #161 — "Continue design" after visiting the Insulation
 * Coordinator landed on a blank /magnetic_tool.
 *
 * Root cause: visiting /insulation_adviser sets selectedWorkflow =
 * 'insulationCoordinator'. Neither continueMagneticToolDesign() (Header) nor
 * MagneticTool.created() restored a magnetic-tool workflow, so GenericTool
 * resolved getCurrentToolState() = toolboxStates['insulationCoordinator']
 * ['magneticBuilder'] === undefined and rendered nothing (blank tool area).
 *
 * The fix restores selectedWorkflow to 'design' whenever the active workflow
 * cannot host the magnetic builder.
 */
import { test, expect } from './_coverage.js';
import { isBenign, pause } from './utils.js';

const BASE = process.env.BASE_URL || 'http://localhost:5173';

function readWorkflow(page) {
  return page.evaluate(() => {
    const app = document.querySelector('#app').__vue_app__;
    const state = app.config.globalProperties.$pinia._s.get('state');
    return {
      workflow: state.selectedWorkflow,
      tool: state.selectedTool,
      toolState: (() => {
        try { return state.getCurrentToolState() != null; } catch { return false; }
      })(),
    };
  });
}

test.describe('Continue design restores workflow (ABT #161)', () => {
  test.describe.configure({ timeout: 120000 });

  test('insulation -> magnetic tool is not blank and workflow is restored', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      const t = msg.text();
      // Ignore Vite HMR websocket noise (the dev client targets the default
      // port; harmless) and the benign Emscripten WASM-loader fallback message.
      if (msg.type() === 'error'
        && !isBenign(t)
        && !/WebSocket connection to 'ws:\/\/localhost/.test(t)
        && !/falling back to ArrayBuffer instantiation/i.test(t)) errors.push(t);
    });

    // Start from a clean persisted state so a stale workflow from storageState
    // can't mask the flow.
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { try { localStorage.removeItem('state'); } catch {} });

    // 1) Visit the Insulation Coordinator — this sets workflow=insulationCoordinator.
    //    Wait for the component to actually mount (its created() sets the workflow).
    await page.goto(`${BASE}/insulation_adviser`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const st = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('state');
      return st && st.selectedWorkflow === 'insulationCoordinator';
    }, { timeout: 20000 });

    // 2) Navigate to the magnetic tool (the destination of "Continue design").
    await page.goto(`${BASE}/magnetic_tool`, { waitUntil: 'domcontentloaded' });

    // The tool area must actually render the builder UI (storyline steps),
    // not an empty main. Waiting for this also guarantees the MagneticTool
    // component has mounted and run its workflow-restore guard.
    const storyline = page.locator('.storyline-step');
    await expect(storyline.first(), 'the magnetic tool storyline must render (page is not blank)').toBeVisible({ timeout: 20000 });
    await pause(page, 500, 'settle after mount');

    // Workflow must have been restored to a magnetic-tool workflow, and the
    // current tool state must resolve (i.e. the page can render its content).
    const afterTool = await readWorkflow(page);
    expect(afterTool.workflow, 'magnetic tool must restore a magnetic-builder-capable workflow').toBe('design');
    expect(afterTool.tool, 'the magnetic builder tool must be selected').toBe('magneticBuilder');
    expect(afterTool.toolState, 'getCurrentToolState() must resolve (page not blank)').toBe(true);

    expect(errors, `no console errors: ${errors.join('\n')}`).toEqual([]);
  });

  test('Header "Continue design" button lands on a working magnetic tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      const t = msg.text();
      // Ignore Vite HMR websocket noise (the dev client targets the default
      // port; harmless) and the benign Emscripten WASM-loader fallback message.
      if (msg.type() === 'error'
        && !isBenign(t)
        && !/WebSocket connection to 'ws:\/\/localhost/.test(t)
        && !/falling back to ArrayBuffer instantiation/i.test(t)) errors.push(t);
    });

    // Drive the exact ticket flow: insulation, then magnetic tool (which marks
    // a design loaded), then Home, then the Continue button.
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { try { localStorage.removeItem('state'); } catch {} });
    await page.goto(`${BASE}/insulation_adviser`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const st = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('state');
      return st && st.selectedWorkflow === 'insulationCoordinator';
    }, { timeout: 20000 });
    await page.goto(`${BASE}/magnetic_tool`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.storyline-step').first(), 'magnetic tool must mount').toBeVisible({ timeout: 20000 });
    await pause(page, 500, 'settle after mount (marks design loaded)');

    // Force the drifted state the ticket describes so the Continue button is
    // exercised against a non-magnetic workflow: workflow=insulationCoordinator
    // while a design is loaded.
    await page.evaluate(() => {
      const app = document.querySelector('#app').__vue_app__;
      const state = app.config.globalProperties.$pinia._s.get('state');
      state.selectWorkflow('insulationCoordinator');
      state.selectTool('magneticBuilder');
      state.designLoaded();
    });

    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await pause(page, 800, 'home mount');

    const continueBtn = page.locator('button.om-continue-btn').filter({ hasText: 'Continue design' }).first();
    await expect(continueBtn, 'Continue design button must be visible with a design loaded').toBeVisible({ timeout: 10000 });
    await continueBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });

    const storyline = page.locator('.storyline-step');
    await expect(storyline.first(), 'the magnetic tool storyline must render after Continue').toBeVisible({ timeout: 20000 });
    await pause(page, 500, 'settle after mount');

    const after = await readWorkflow(page);
    expect(after.workflow, 'Continue design must restore a magnetic-builder-capable workflow').toBe('design');
    expect(after.toolState, 'getCurrentToolState() must resolve after Continue (page not blank)').toBe(true);

    expect(errors, `no console errors: ${errors.join('\n')}`).toEqual([]);
  });
});
