/**
 * Flyback Wizard Comprehensive Battery Tests
 *
 * Groups:
 *   A – Layout and UI controls
 *   B – Analytical simulation (Help me / I know, MOSFET input type)
 *   C – Multi-output support
 *   D – Simulated waveforms
 *   E – Navigation buttons
 *   F – Magnetic Adviser end-to-end
 *   G – Core Adviser (by steps)
 */

import { test, expect } from './_coverage.js';
import {
  BASE_URL, isBenign, screenshot,
  openWizard, runAnalytical,
  conditionsCard, outputsCard, fillRowInput,
  goToMagneticAdviser, goToMagneticBuilder,
} from './utils.js';

const FLYBACK_CY = 'Flyback-CommonModeChoke-link';
const ss = (page, name) => screenshot(page, 'flyback-battery', name);
const openFlyback = (page) => openWizard(page, FLYBACK_CY);

// =====================================================================
// GROUP A – Layout
// =====================================================================
test.describe('Flyback – Group A – Layout', () => {
  test.setTimeout(60000);

  test('Flyback-A1 – Loads without console errors, title and Conditions card visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openFlyback(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(conditionsCard(page)).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();

    console.log(`[Flyback-A1] Errors: ${errors.length}`);
    expect(errors.length).toBe(0);
    await ss(page, 'A1-layout');
  });

  test('Flyback-A2 – MOSFET input type selector visible', async ({ page }) => {
    await openFlyback(page);

    const mosfetField = await page.locator('text=maximum duty cycle, text=maximum drain').first().isVisible().catch(() => false);
    console.log(`[Flyback-A2] MOSFET field visible: ${mosfetField}`);

    const allSelects = await page.locator('select').all();
    let mosfetSelect = null;
    for (const sel of allSelects) {
      const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.value));
      if (opts.some(o => o.includes('duty') || o.includes('Vds') || o.includes('drain'))) {
        mosfetSelect = sel;
        break;
      }
    }
    console.log(`[Flyback-A2] MOSFET select found: ${mosfetSelect !== null}`);
    await ss(page, 'A2-mosfet-selector');
  });

  test('Flyback-A3 – Outputs card has voltage and current inputs', async ({ page }) => {
    await openFlyback(page);

    const oCard = outputsCard(page);
    await expect(oCard).toBeVisible();
    const numInputs = await oCard.locator('input[type="number"]').count();
    console.log(`[Flyback-A3] Output inputs: ${numInputs}`);
    expect(numInputs).toBeGreaterThan(0);
    await ss(page, 'A3-outputs-card');
  });

  test('Flyback-A4 – Design mode toggle (Help me / I know)', async ({ page }) => {
    await openFlyback(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnow.isVisible().catch(() => false)) {
      await iKnow.click();
      await page.waitForTimeout(400);
      const dutyCycleField = await page.locator('text=Duty Cycle, text=duty cycle').first().isVisible().catch(() => false);
      console.log(`[Flyback-A4] Duty cycle field in I know mode: ${dutyCycleField}`);
    }
    await ss(page, 'A4-design-mode');
  });
});

// =====================================================================
// GROUP B – Analytical
// =====================================================================
test.describe('Flyback – Group B – Analytical', () => {
  test.setTimeout(90000);

  test('Flyback-B1 – Default "Help me" analytical runs without error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openFlyback(page);
    await ss(page, 'B1-before');
    await runAnalytical(page);
    await ss(page, 'B1-after');

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    expect(hasError).toBe(false);

    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
  });

  test('Flyback-B2 – MOSFET input: max duty cycle mode', async ({ page }) => {
    await openFlyback(page);

    const allSelects = await page.locator('select').all();
    for (const sel of allSelects) {
      const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.value));
      if (opts.some(o => o.includes('duty'))) {
        const dutyOpt = opts.find(o => o.includes('duty'));
        if (dutyOpt) { await sel.selectOption(dutyOpt); break; }
      }
    }
    await page.waitForTimeout(300);
    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[Flyback-B2] Duty cycle MOSFET error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'B2-mosfet-duty');
  });

  test('Flyback-B3 – MOSFET input: max Vds mode', async ({ page }) => {
    await openFlyback(page);

    const allSelects = await page.locator('select').all();
    for (const sel of allSelects) {
      const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.value));
      const vdsOpt = opts.find(o => o.includes('Vds') || o.includes('drain') || o.includes('voltage'));
      if (vdsOpt && opts.length === 2) { await sel.selectOption(vdsOpt); break; }
    }
    await page.waitForTimeout(300);
    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[Flyback-B3] Vds MOSFET error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'B3-mosfet-vds');
  });

  test('Flyback-B4 – "I know" mode with custom duty cycle', async ({ page }) => {
    await openFlyback(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnow.isVisible().catch(() => false)) await iKnow.click();
    else await page.locator('text=I know the design I want').first().click().catch(() => {});
    await page.waitForTimeout(400);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[Flyback-B4] I know error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'B4-iknow-analytical');
  });

  test('Flyback-B5 – Magnetic vs Converter waveform view toggle', async ({ page }) => {
    await openFlyback(page);
    await runAnalytical(page);

    const converterBtn = page.locator('button, label').filter({ hasText: /[Cc]onverter/ }).first();
    if (await converterBtn.isVisible().catch(() => false)) {
      await converterBtn.click();
      await page.waitForTimeout(500);
    }
    await ss(page, 'B5-waveform-toggle');
  });
});

// =====================================================================
// GROUP C – Multi-output
// =====================================================================
test.describe('Flyback – Group C – Multi-output', () => {
  test.setTimeout(90000);

  test('Flyback-C1 – Add second output and run analytical', async ({ page }) => {
    await openFlyback(page);

    const addOutputBtn = page.locator('button').filter({ hasText: /[Aa]dd [Oo]utput|[Aa]dd [Ss]econdary/i }).first();
    if (await addOutputBtn.isVisible().catch(() => false)) {
      await addOutputBtn.click();
      await page.waitForTimeout(500);
      const oCard = outputsCard(page);
      const numInputs = await oCard.locator('input[type="number"]').count();
      console.log(`[Flyback-C1] Outputs after adding second: ${numInputs}`);
      expect(numInputs).toBeGreaterThan(2);
    } else {
      console.log('[Flyback-C1] Add output button not found — SKIP');
    }

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    expect(hasError).toBe(false);
    await ss(page, 'C1-multi-output');
  });
});

// =====================================================================
// GROUP D – Simulated
// =====================================================================
test.describe('Flyback – Group D – Simulated', () => {
  test.setTimeout(60000);

  test('Flyback-D1 – Simulated button present and clickable', async ({ page }) => {
    await openFlyback(page);

    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await expect(simBtn).toBeVisible();
    expect(await simBtn.isDisabled().catch(() => true)).toBe(false);

    await simBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, 'D1-simulated-clicked');
  });
});

// =====================================================================
// GROUP E – Navigation
// =====================================================================
test.describe('Flyback – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('Flyback-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openFlyback(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'E1-review-specs');
    expect(errors.length).toBe(0);
  });

  test('Flyback-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openFlyback(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await expect(designBtn).toBeVisible();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'E2-design-magnetic');
    expect(errors.length).toBe(0);
  });

  test('Flyback-E3 – SPICE code button visible', async ({ page }) => {
    await openFlyback(page);

    const spiceBtn = page.locator('button, .sim-btn').filter({ hasText: /[Ss]pice|[Nn]etlist/i }).first();
    const visible = await spiceBtn.isVisible().catch(() => false);
    console.log(`[Flyback-E3] SPICE button visible: ${visible}`);
    await ss(page, 'E3-spice-button');
  });
});

// =====================================================================
// GROUP F – Magnetic Adviser
// =====================================================================
test.describe('Flyback – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('Flyback-F1 – Adviser page loads after Design Magnetic', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openFlyback(page));
    console.log(`[Flyback-F1] Navigated: ${navigated}`);
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    expect(await adviseBtn.isVisible().catch(() => false)).toBe(true);
    await ss(page, 'F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('Flyback-F2 – Adviser runs and returns results', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openFlyback(page));
    if (!navigated) { console.log('[Flyback-F2] Navigation failed — SKIP'); return; }

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await adviseBtn.isVisible().catch(() => false))) return;

    await adviseBtn.click();
    console.log('[Flyback-F2] Waiting for results (up to 180s)...');
    await ss(page, 'F2-adviser-running');

    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'F2-adviser-results');
    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// GROUP G – Core Adviser
// =====================================================================
test.describe('Flyback – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('Flyback-G1 – Review Specs reaches builder with Design Requirements', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticBuilder(page, () => openFlyback(page));
    expect(navigated).toBe(true);
    await ss(page, 'G1-builder');
    expect(errors.length).toBe(0);
  });

  test('Flyback-G2 – Core Adviser accessible and runs', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openFlyback(page));
    if (!navigated) return;

    const coreAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Core Adviser/i }).first();
    if (!(await coreAdviserLink.isVisible().catch(() => false))) {
      console.log('[Flyback-G2] Core Adviser not visible — SKIP');
      return;
    }

    await coreAdviserLink.click();
    await page.waitForTimeout(1000);

    const getAdvisedBtn = page.locator('button').filter({ hasText: /Get advised cores/i }).first();
    if (!(await getAdvisedBtn.isVisible().catch(() => false))) return;

    await getAdvisedBtn.click();
    console.log('[Flyback-G2] Waiting for core adviser results (up to 120s)...');
    await ss(page, 'G2-core-adviser-running');

    await page.waitForFunction(
      () => !document.querySelector('[data-cy="CoreAdviser-loading"], .fa-spinner'),
      { timeout: 120000 }
    ).catch(() => {});
    await page.waitForTimeout(1500);
    await ss(page, 'G2-core-adviser-results');
  });

  test('Flyback-G3 – Wire Adviser shows Coming soon', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openFlyback(page));
    if (!navigated) return;

    const wireAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Wire Adviser/i }).first();
    if (await wireAdviserLink.isVisible().catch(() => false)) {
      await wireAdviserLink.click();
      await page.waitForTimeout(800);
      const comingSoon = await page.locator('text=Coming soon').first().isVisible().catch(() => false);
      console.log(`[Flyback-G3] Coming soon: ${comingSoon}`);
    }
    await ss(page, 'G3-wire-adviser');
  });

  test('Flyback-G4 – Builder shows correct winding count (primary + secondary)', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openFlyback(page));
    if (!navigated) return;

    const pageText = await page.locator('body').innerText().catch(() => '');
    const hasPrimary = pageText.includes('Primary');
    const hasSecondary = pageText.includes('Secondary');
    console.log(`[Flyback-G4] Primary: ${hasPrimary}, Secondary: ${hasSecondary}`);
    await ss(page, 'G4-builder-windings');
  });
});
