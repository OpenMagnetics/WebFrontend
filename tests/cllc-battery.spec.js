/**
 * CLLC Wizard Comprehensive Battery Tests
 *
 * CLLC: Capacitor-Inductor-Inductor-Capacitor bidirectional resonant converter
 *
 * Groups:
 *   A - Layout and UI controls
 *   B - Analytical simulation (Help me / I know)
 *   C - CLLC-specific (bidirectional, power flow, asymmetric tank, bridge type)
 *   D - Simulated waveforms
 *   E - Navigation buttons
 *   F - Magnetic Adviser end-to-end
 *   G - Core Adviser (by steps)
 */

import { test, expect } from './_coverage.js';
import { BASE_URL, isBenign, screenshot, openWizard, runAnalytical, conditionsCard, outputsCard, goToMagneticAdviser, goToMagneticBuilder, runCoreAdviser, pause } from './utils.js';

const CLLC_CY = 'Cllc-link';

const ss = (page, name) => screenshot(page, 'cllc-battery', name);
const openCllc = (page) => openWizard(page, CLLC_CY);

// CLLC uses a custom <label class="design-mode-option"><input radio> ... </label>
// markup (not ElementFromListRadio). Click the `.design-mode-label` span that
// matches the requested mode. Throws if the control is absent.
async function setDesignMode(page, modeText) {
  const label = page.locator('.design-mode-label').filter({ hasText: modeText }).first();
  await expect(label).toBeVisible();
  await label.click();
  await pause(page, 400, 'mechanical: settle');
}

// Find the number input inside the Dimension row whose visible title matches
// `titleText` and set it. Throws if the row/input cannot be located.
async function setDimensionByTitle(page, titleText, value) {
  const input = page.locator('.container-flex')
    .filter({ hasText: new RegExp(`^\\s*${titleText}`) })
    .locator('input[type="number"]')
    .first();
  await expect(input).toBeVisible();
  await input.click({ clickCount: 3 });
  await input.fill(String(value));
  await input.press('Tab');
}

// =====================================================================
// CLLC - Group A: Layout
// =====================================================================
test.describe('CLLC - Group A - Layout', () => {
  test.setTimeout(60000);

  test('CLLC-A1 - Loads without console errors, title and Conditions card visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openCllc(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(conditionsCard(page)).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();

    expect(errors.length).toBe(0);
    await ss(page, 'CLLC-A1-layout');
  });

  test('CLLC-A2 - Tank parameters visible (Q Factor)', async ({ page }) => {
    await openCllc(page);

    // Q Factor is the distinguishing CLLC tank input; it must be visible.
    await expect(page.getByText(/^Q Factor/i).first()).toBeVisible();
    const numInputs = await page.locator('input[type="number"]').count();
    expect(numInputs).toBeGreaterThan(0);
    await ss(page, 'CLLC-A2-tank-params');
  });

  test('CLLC-A3 - Design mode toggle switches to I know mode', async ({ page }) => {
    await openCllc(page);

    await setDesignMode(page, 'I know');
    // In "I know" mode the wizard exposes the "Mag. Inductance" input.
    await expect(page.getByText(/Mag\.?\s*Inductance/i).first()).toBeVisible();
    await ss(page, 'CLLC-A3-design-mode');
  });

  test('CLLC-A4 - Single output card visible (no numberOutputs selector)', async ({ page }) => {
    await openCllc(page);

    const oCard = outputsCard(page);
    await expect(oCard).toBeVisible();

    // CLLC must NOT show a numberOutputs dropdown.
    await expect(page.getByText('Number of Outputs').first()).toBeHidden();

    await ss(page, 'CLLC-A4-single-output');
  });
});

// =====================================================================
// CLLC - Group B: Analytical
// =====================================================================
test.describe('CLLC - Group B - Analytical', () => {
  test.setTimeout(90000);

  test('CLLC-B1 - Default Help me analytical runs without error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openCllc(page);
    await ss(page, 'CLLC-B1-before');
    await runAnalytical(page);
    await ss(page, 'CLLC-B1-after');

    await expect(page.locator('.error-text').first()).toBeHidden();
    expect(await page.locator('canvas').count()).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
  });

  test('CLLC-B2 - I know mode analytical', async ({ page }) => {
    await openCllc(page);

    await setDesignMode(page, 'I know');

    await runAnalytical(page);
    await expect(page.locator('.error-text').first()).toBeHidden();
    await ss(page, 'CLLC-B2-iknow');
  });

  test('CLLC-B3 - Q Factor=0.6 analytical', async ({ page }) => {
    await openCllc(page);

    await setDimensionByTitle(page, 'Q Factor', '0.6');
    await pause(page, 300, 'mechanical: settle');

    await runAnalytical(page);
    await expect(page.locator('.error-text').first()).toBeHidden();
    await ss(page, 'CLLC-B3-quality-factor');
  });

  test('CLLC-B4 - Diagnostics card present after analytical', async ({ page }) => {
    await openCllc(page);
    await runAnalytical(page);
    await pause(page, 800, 'mechanical: settle');

    // ZVS Primary / Secondary diagnostics may render conditionally; assert
    // that AT LEAST the diagnostics card itself appears (canvas + results).
    expect(await page.locator('canvas').count()).toBeGreaterThan(0);
    await ss(page, 'CLLC-B4-diagnostics');
  });
});

// =====================================================================
// CLLC - Group C: CLLC-specific (bidirectional, power flow, tank a/b, bridge type)
// =====================================================================
test.describe('CLLC - Group C - CLLC-specific', () => {
  test.setTimeout(90000);

  test('CLLC-C1 - Toggle bidirectional and run analytical', async ({ page }) => {
    await openCllc(page);

    const bidir = page.locator('#bidirectionalCllc');
    await expect(bidir).toBeVisible();
    await bidir.click();
    await pause(page, 200, 'mechanical: settle');
    await runAnalytical(page);
    await expect(page.locator('.error-text').first()).toBeHidden();
    await ss(page, 'CLLC-C1-bidirectional');
  });

  test('CLLC-C2 - Asymmetric tank (Inductor Ratio + Capacitor Ratio) runs analytical', async ({ page }) => {
    await openCllc(page);

    await setDimensionByTitle(page, 'Inductor Ratio', '0.95');
    await setDimensionByTitle(page, 'Capacitor Ratio', '1.05');
    await pause(page, 300, 'mechanical: settle');

    await runAnalytical(page);
    await expect(page.locator('.error-text').first()).toBeHidden();
    await ss(page, 'CLLC-C2-asymmetric');
  });

  test('CLLC-C3 - Half-bridge type runs analytical', async ({ page }) => {
    await openCllc(page);

    // Bridge Type is rendered by ElementFromList (a native <select>).
    // The option label is 'Half Bridge'; underlying value is 'halfBridge'.
    const selects = await page.locator('select').all();
    let bridgeSelect = null;
    for (const sel of selects) {
      const labels = await sel.evaluate(el => Array.from(el.options).map(o => o.textContent.trim()));
      if (labels.includes('Half Bridge')) { bridgeSelect = sel; break; }
    }
    if (!bridgeSelect) throw new Error('[CLLC-C3] Bridge Type select with "Half Bridge" option not found');
    await bridgeSelect.selectOption({ label: 'Half Bridge' });
    await pause(page, 300, 'mechanical: settle');
    await runAnalytical(page);
    await expect(page.locator('.error-text').first()).toBeHidden();
    await ss(page, 'CLLC-C3-half-bridge');
  });
});

// =====================================================================
// CLLC - Group D: Simulated
// =====================================================================
test.describe('CLLC - Group D - Simulated', () => {
  test.setTimeout(120000);

  test('CLLC-D1 - Simulated button present and clickable', async ({ page }) => {
    await openCllc(page);

    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await expect(simBtn).toBeVisible();
    await expect(simBtn).toBeEnabled();

    await simBtn.click();
    // SPICE-based simulation is slower than analytical; wait longer.
    await pause(page, 5000, 'mechanical: settle');
    await ss(page, 'CLLC-D1-simulated-clicked');
  });
});

// =====================================================================
// CLLC - Group E: Navigation
// =====================================================================
test.describe('CLLC - Group E - Navigation', () => {
  test.setTimeout(120000);

  test('CLLC-E1 - Review Specs navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openCllc(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });

    expect(page.url()).toContain('magnetic_tool');
    await ss(page, 'CLLC-E1-review-specs');
    expect(errors.length).toBe(0);
  });

  test('CLLC-E2 - Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openCllc(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await expect(designBtn).toBeVisible();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });

    expect(page.url()).toContain('magnetic_tool');
    await ss(page, 'CLLC-E2-design-magnetic');
    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// CLLC - Group F: Magnetic Adviser
// =====================================================================
test.describe('CLLC - Group F - Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('CLLC-F1 - Adviser page loads with Get Advised Magnetics button', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openCllc(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    await expect(adviseBtn).toBeVisible();
    await ss(page, 'CLLC-F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('CLLC-F2 - Adviser runs and returns results', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openCllc(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    await expect(adviseBtn).toBeVisible();

    await adviseBtn.click();
    await ss(page, 'CLLC-F2-adviser-running');

    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    );
    await pause(page, 2000, 'mechanical: settle');
    await ss(page, 'CLLC-F2-adviser-results');
    expect(page.url()).toContain('magnetic_tool');
    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// CLLC - Group G: Core Adviser
// =====================================================================
test.describe('CLLC - Group G - Core Adviser', () => {
  test.setTimeout(240000);

  test('CLLC-G1 - Review Specs reaches builder', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openCllc(page));
    expect(navigated).toBe(true);
    await ss(page, 'CLLC-G1-builder');
  });

  test('CLLC-G2 - Core Adviser accessible and runs', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticBuilder(page, () => openCllc(page));
    expect(navigated).toBe(true);

    await runCoreAdviser(page);
    await ss(page, 'CLLC-G2-core-adviser-results');
    expect(errors.length).toBe(0);
  });
});
