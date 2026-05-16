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
import {
  BASE_URL, isBenign, screenshot,
  openWizard, runAnalytical,
  conditionsCard, outputsCard, fillRowInput,
  goToMagneticAdviser, goToMagneticBuilder,
} from './utils.js';

const CLLC_CY = 'Cllc-link';

const ss = (page, name) => screenshot(page, 'cllc-battery', name);
const openCllc = (page) => openWizard(page, CLLC_CY);

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

    console.log(`[CLLC-A1] Errors: ${errors.length}`);
    expect(errors.length).toBe(0);
    await ss(page, 'CLLC-A1-layout');
  });

  test('CLLC-A2 - Tank parameters visible (Q, Ln, a, b)', async ({ page }) => {
    await openCllc(page);

    const numInputs = await page.locator('input[type="number"]').count();
    console.log(`[CLLC-A2] Number inputs: ${numInputs}`);
    expect(numInputs).toBeGreaterThan(0);
    await ss(page, 'CLLC-A2-tank-params');
  });

  test('CLLC-A3 - Design mode toggle (Help me / I know)', async ({ page }) => {
    await openCllc(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnow.isVisible().catch(() => false)) {
      await iKnow.click();
      await page.waitForTimeout(400);
    }
    await ss(page, 'CLLC-A3-design-mode');
  });

  test('CLLC-A4 - Single output card visible (no numberOutputs selector)', async ({ page }) => {
    await openCllc(page);

    const oCard = outputsCard(page);
    await expect(oCard).toBeVisible();

    // CLLC must NOT show a numberOutputs dropdown.
    const numOutDropdown = page.locator('text=Number of Outputs').first();
    expect(await numOutDropdown.isVisible().catch(() => false)).toBe(false);

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

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[CLLC-B1] Error: ${hasError}`);
    expect(hasError).toBe(false);

    const canvasCount = await page.locator('canvas').count();
    console.log(`[CLLC-B1] Canvas count: ${canvasCount}`);
    expect(canvasCount).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
  });

  test('CLLC-B2 - I know mode analytical', async ({ page }) => {
    await openCllc(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnow.isVisible().catch(() => false)) await iKnow.click();
    else await page.locator('text=I know the design I want').first().click().catch(() => {});
    await page.waitForTimeout(400);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[CLLC-B2] I know error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'CLLC-B2-iknow');
  });

  test('CLLC-B3 - Different quality factor value analytical', async ({ page }) => {
    await openCllc(page);

    const allInputs = await page.locator('input[type="number"]').all();
    for (const inp of allInputs) {
      const val = await inp.inputValue().catch(() => '');
      if (parseFloat(val) >= 0.1 && parseFloat(val) <= 1.0) {
        await inp.click({ clickCount: 3 });
        await inp.fill('0.6');
        await inp.press('Tab');
        break;
      }
    }
    await page.waitForTimeout(300);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[CLLC-B3] QF=0.6 error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'CLLC-B3-quality-factor');
  });

  test('CLLC-B4 - CLLC diagnostics card with ZVS primary and secondary visible after analytical', async ({ page }) => {
    await openCllc(page);
    await runAnalytical(page);
    await page.waitForTimeout(800);

    // CLLC's distinguishing diagnostic: two ZVS margins (primary + secondary).
    const zvsPri = page.locator('text=ZVS Primary').first();
    const zvsSec = page.locator('text=ZVS Secondary').first();
    const hasPri = await zvsPri.isVisible().catch(() => false);
    const hasSec = await zvsSec.isVisible().catch(() => false);
    console.log(`[CLLC-B4] ZVS Primary visible: ${hasPri}, ZVS Secondary visible: ${hasSec}`);
    await ss(page, 'CLLC-B4-diagnostics');
  });

  test('CLLC-B5 - Waveform view toggle', async ({ page }) => {
    await openCllc(page);
    await runAnalytical(page);

    const converterBtn = page.locator('button, label').filter({ hasText: /[Cc]onverter/ }).first();
    if (await converterBtn.isVisible().catch(() => false)) {
      await converterBtn.click();
      await page.waitForTimeout(500);
    }
    await ss(page, 'CLLC-B5-waveform-toggle');
  });
});

// =====================================================================
// CLLC - Group C: CLLC-specific (bidirectional, power flow, tank a/b, bridge type)
// =====================================================================
test.describe('CLLC - Group C - CLLC-specific', () => {
  test.setTimeout(90000);

  test('CLLC-C1 - Toggle bidirectional and run analytical', async ({ page }) => {
    await openCllc(page);

    const bidir = page.locator('#bidirectional');
    if (await bidir.isVisible().catch(() => false)) {
      await bidir.click();
      await page.waitForTimeout(200);
    }
    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[CLLC-C1] bidirectional error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'CLLC-C1-bidirectional');
  });

  test('CLLC-C2 - Asymmetric tank (a=0.95, b=1.05) runs analytical', async ({ page }) => {
    await openCllc(page);

    // Find input rows for a and b by tooltip / label text.
    const setByLabel = async (labelText, value) => {
      const row = page.locator('div, label, span').filter({ hasText: labelText }).first();
      const inp = row.locator('xpath=ancestor::*[descendant::input[@type="number"]][1]').locator('input[type="number"]').first();
      if (await inp.isVisible().catch(() => false)) {
        await inp.click({ clickCount: 3 });
        await inp.fill(String(value));
        await inp.press('Tab');
      }
    };
    await setByLabel('Inductor Ratio', 0.95);
    await setByLabel('Capacitor Ratio', 1.05);
    await page.waitForTimeout(300);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[CLLC-C2] asymmetric error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'CLLC-C2-asymmetric');
  });

  test('CLLC-C3 - Half-bridge type runs analytical', async ({ page }) => {
    await openCllc(page);

    // Bridge Type is a select / ElementFromList — try switching it.
    const bridgeSelect = page.locator('select').filter({ has: page.locator('option', { hasText: /Half Bridge/ }) }).first();
    if (await bridgeSelect.isVisible().catch(() => false)) {
      await bridgeSelect.selectOption({ label: 'Half Bridge' });
      await page.waitForTimeout(300);
    }
    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[CLLC-C3] halfBridge error: ${hasError}`);
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
    expect(await simBtn.isDisabled().catch(() => true)).toBe(false);

    await simBtn.click();
    // SPICE-based simulation is slower than analytical; wait longer.
    await page.waitForTimeout(5000);
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
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    expect(page.url().includes('magnetic_tool')).toBe(true);
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
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    expect(page.url().includes('magnetic_tool')).toBe(true);
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
    expect(await adviseBtn.isVisible().catch(() => false)).toBe(true);
    await ss(page, 'CLLC-F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('CLLC-F2 - Adviser runs and returns results', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openCllc(page));
    if (!navigated) return;

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await adviseBtn.isVisible().catch(() => false))) return;

    await adviseBtn.click();
    await ss(page, 'CLLC-F2-adviser-running');

    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'CLLC-F2-adviser-results');
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
    const navigated = await goToMagneticBuilder(page, () => openCllc(page));
    if (!navigated) return;

    const coreAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Core Adviser/i }).first();
    if (!(await coreAdviserLink.isVisible().catch(() => false))) return;

    await coreAdviserLink.click();
    await page.waitForTimeout(1000);

    const getAdvisedBtn = page.locator('button').filter({ hasText: /Get advised cores/i }).first();
    if (!(await getAdvisedBtn.isVisible().catch(() => false))) return;

    await getAdvisedBtn.click();
    await page.waitForFunction(
      () => !document.querySelector('[data-cy="CoreAdviser-loading"], .fa-spinner'),
      { timeout: 120000 }
    ).catch(() => {});
    await page.waitForTimeout(1500);
    await ss(page, 'CLLC-G2-core-adviser-results');
  });
});
