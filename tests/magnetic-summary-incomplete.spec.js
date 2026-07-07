/**
 * Regression for ABT #162 — MagneticSummary crashed in its mounted hook when
 * the summary subsection was reached with an incomplete MAS
 * (TypeError: Cannot read properties of undefined (reading magnetizingInductance)),
 * after which the component tree stopped patching until reload.
 *
 * Per the no-fallbacks rule the fix is a LOUD guard: detect the missing
 * required fields and render an explicit "Design incomplete — missing X" panel
 * (and a console.error), rather than silently rendering zeros/blanks or
 * crashing.
 */
import { test, expect } from './_coverage.js';
import { isBenign, pause } from './utils.js';

const BASE = process.env.BASE_URL || 'http://localhost:5173';

test.describe('MagneticSummary incomplete-design guard (ABT #162)', () => {
  test.describe.configure({ timeout: 120000 });

  test('summary with incomplete MAS renders a loud panel, no crash', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      const t = msg.text();
      if (msg.type() === 'error'
        && !isBenign(t)
        && !/WebSocket connection to 'ws:\/\/localhost/.test(t)
        && !/vite.*failed to connect to websocket/i.test(t)
        && !/WebSocket closed without opened/i.test(t)
        && !/falling back to ArrayBuffer instantiation/i.test(t)
        // The guard's own explicit diagnostic is expected, not a failure.
        && !/\[MagneticSummary\] Cannot render summary — design is incomplete/.test(t)) {
        errors.push(t);
      }
    });

    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { try { localStorage.removeItem('state'); } catch {} });
    await page.goto(`${BASE}/magnetic_tool`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.storyline-step').first(), 'magnetic tool must mount').toBeVisible({ timeout: 20000 });
    await pause(page, 500, 'settle after mount');

    // Drive the summary subsection with a deliberately incomplete MAS.
    const forced = await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const state = pinia._s.get('state');
      const masStore = pinia._s.get('mas');
      if (masStore.mas) {
        masStore.mas.outputs = [];
        if (masStore.mas.inputs) masStore.mas.inputs.designRequirements = undefined;
      }
      state.getCurrentToolState().subsection = 'magneticSummary';
      return true;
    });
    expect(forced).toBe(true);

    // The loud incomplete panel must appear and list the missing pieces.
    const panel = page.locator('[data-cy="MagneticBuilder-MagneticSummary-incomplete"]');
    await expect(panel, 'incomplete-design panel must render').toBeVisible({ timeout: 15000 });
    await expect(panel).toContainText('Design incomplete');
    await expect(panel).toContainText('computed outputs');

    // No unexpected crash — specifically the old magnetizingInductance TypeError.
    const crash = errors.filter(e => /magnetizingInductance|Cannot read properties of undefined/.test(e));
    expect(crash, `no crash reading magnetizingInductance: ${crash.join('\n')}`).toEqual([]);
    expect(errors, `no unexpected console errors: ${errors.join('\n')}`).toEqual([]);
  });
});
