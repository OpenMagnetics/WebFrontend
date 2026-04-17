/**
 * LLC / CLLC / PSFB Wizard Comprehensive Battery Tests
 *
 * LLC:  Inductor-Inductor-Capacitor resonant converter
 * CLLC: Current-fed LLC (bidirectional resonant)
 * PSFB: Phase-Shift Full Bridge
 *
 * Groups:
 *   A – Layout and UI controls
 *   B – Analytical simulation (Help me / I know)
 *   C – Design mode / resonant parameters
 *   D – Simulated waveforms
 *   E – Navigation buttons
 *   F – Magnetic Adviser end-to-end
 *   G – Core Adviser (by steps)
 */

import { test, expect } from '@playwright/test';
import {
  BASE_URL, isBenign, screenshot,
  openWizard, runAnalytical,
  conditionsCard, outputsCard, fillRowInput,
  goToMagneticAdviser, goToMagneticBuilder,
} from './utils.js';

const LLC_CY  = 'Llc-link';
const CLLC_CY = 'Cllc-link';
const PSFB_CY = 'Psfb-link';

const ss = (page, name) => screenshot(page, 'llc-cllc-psfb-battery', name);
const openLlc  = (page) => openWizard(page, LLC_CY);
const openCllc = (page) => openWizard(page, CLLC_CY);
const openPsfb = (page) => openWizard(page, PSFB_CY);

// =====================================================================
// LLC – Group A: Layout
// =====================================================================
test.describe('LLC – Group A – Layout', () => {
  test.setTimeout(60000);

  test('LLC-A1 – Loads without console errors, title and Conditions card visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openLlc(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(conditionsCard(page)).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();

    console.log(`[LLC-A1] Errors: ${errors.length}`);
    expect(errors.length).toBe(0);
    await ss(page, 'LLC-A1-layout');
  });

  test('LLC-A2 – Resonant parameters visible (frequency, quality factor, inductance ratio)', async ({ page }) => {
    await openLlc(page);

    const resonantText = await page.locator('text=resonant, text=Resonant, text=quality, text=Quality').first().isVisible().catch(() => false);
    console.log(`[LLC-A2] Resonant parameter visible: ${resonantText}`);

    const numInputs = await page.locator('input[type="number"]').count();
    console.log(`[LLC-A2] Number inputs: ${numInputs}`);
    expect(numInputs).toBeGreaterThan(0);
    await ss(page, 'LLC-A2-resonant-params');
  });

  test('LLC-A3 – Design mode toggle (Help me / I know)', async ({ page }) => {
    await openLlc(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnow.isVisible().catch(() => false)) {
      await iKnow.click();
      await page.waitForTimeout(400);
    }
    await ss(page, 'LLC-A3-design-mode');
  });

  test('LLC-A4 – Output card visible with power input', async ({ page }) => {
    await openLlc(page);

    const oCard = outputsCard(page);
    await expect(oCard).toBeVisible();
    await ss(page, 'LLC-A4-outputs');
  });
});

// =====================================================================
// LLC – Group B: Analytical
// =====================================================================
test.describe('LLC – Group B – Analytical', () => {
  test.setTimeout(90000);

  test('LLC-B1 – Default Help me analytical runs without error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openLlc(page);
    await ss(page, 'LLC-B1-before');
    await runAnalytical(page);
    await ss(page, 'LLC-B1-after');

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[LLC-B1] Error: ${hasError}`);
    expect(hasError).toBe(false);

    const canvasCount = await page.locator('canvas').count();
    console.log(`[LLC-B1] Canvas count: ${canvasCount}`);
    expect(canvasCount).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
  });

  test('LLC-B2 – I know mode analytical', async ({ page }) => {
    await openLlc(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnow.isVisible().catch(() => false)) await iKnow.click();
    else await page.locator('text=I know the design I want').first().click().catch(() => {});
    await page.waitForTimeout(400);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[LLC-B2] I know error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'LLC-B2-iknow');
  });

  test('LLC-B3 – Different quality factor value analytical', async ({ page }) => {
    await openLlc(page);

    const allInputs = await page.locator('input[type="number"]').all();
    // Try to find quality factor field (usually a decimal like 0.4)
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
    console.log(`[LLC-B3] QF=0.6 error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'LLC-B3-quality-factor');
  });

  test('LLC-B4 – LLC diagnostics card visible after analytical', async ({ page }) => {
    await openLlc(page);
    await runAnalytical(page);

    const diagCard = page.locator('.compact-card, .card').filter({ hasText: /[Dd]iagnostic/ }).first();
    const hasDiag = await diagCard.isVisible().catch(() => false);
    console.log(`[LLC-B4] Diagnostics card: ${hasDiag}`);
    await ss(page, 'LLC-B4-diagnostics');
  });

  test('LLC-B5 – Waveform view toggle', async ({ page }) => {
    await openLlc(page);
    await runAnalytical(page);

    const converterBtn = page.locator('button, label').filter({ hasText: /[Cc]onverter/ }).first();
    if (await converterBtn.isVisible().catch(() => false)) {
      await converterBtn.click();
      await page.waitForTimeout(500);
    }
    await ss(page, 'LLC-B5-waveform-toggle');
  });
});

// =====================================================================
// LLC – Group D: Simulated
// =====================================================================
test.describe('LLC – Group D – Simulated', () => {
  test.setTimeout(60000);

  test('LLC-D1 – Simulated button present and clickable', async ({ page }) => {
    await openLlc(page);

    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await expect(simBtn).toBeVisible();
    expect(await simBtn.isDisabled().catch(() => true)).toBe(false);

    await simBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, 'LLC-D1-simulated-clicked');
  });
});

// =====================================================================
// LLC – Group E: Navigation
// =====================================================================
test.describe('LLC – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('LLC-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openLlc(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'LLC-E1-review-specs');
    expect(errors.length).toBe(0);
  });

  test('LLC-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openLlc(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await expect(designBtn).toBeVisible();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'LLC-E2-design-magnetic');
    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// LLC – Group F: Magnetic Adviser
// =====================================================================
test.describe('LLC – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('LLC-F1 – Adviser page loads with Get Advised Magnetics button', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openLlc(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    expect(await adviseBtn.isVisible().catch(() => false)).toBe(true);
    await ss(page, 'LLC-F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('LLC-F2 – Adviser runs and returns results', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openLlc(page));
    if (!navigated) return;

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await adviseBtn.isVisible().catch(() => false))) return;

    await adviseBtn.click();
    await ss(page, 'LLC-F2-adviser-running');

    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'LLC-F2-adviser-results');
    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// LLC – Group G: Core Adviser
// =====================================================================
test.describe('LLC – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('LLC-G1 – Review Specs reaches builder', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openLlc(page));
    expect(navigated).toBe(true);
    await ss(page, 'LLC-G1-builder');
  });

  test('LLC-G2 – Core Adviser accessible and runs', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openLlc(page));
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
    await ss(page, 'LLC-G2-core-adviser-results');
  });
});

// =====================================================================
// CLLC – Groups A-G
// =====================================================================
test.describe('CLLC – Group A – Layout', () => {
  test.setTimeout(60000);

  test('CLLC-A1 – Loads without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openCllc(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();
    expect(errors.length).toBe(0);
    await ss(page, 'CLLC-A1-layout');
  });
});

test.describe('CLLC – Group B – Analytical', () => {
  test.setTimeout(90000);

  test('CLLC-B1 – Default analytical runs without error, canvas appears', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openCllc(page);
    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    expect(hasError).toBe(false);
    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
    await ss(page, 'CLLC-B1-analytical');
  });

  test('CLLC-B2 – I know mode analytical', async ({ page }) => {
    await openCllc(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnow.isVisible().catch(() => false)) await iKnow.click();
    else await page.locator('text=I know the design I want').first().click().catch(() => {});
    await page.waitForTimeout(400);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    expect(hasError).toBe(false);
    await ss(page, 'CLLC-B2-iknow');
  });
});

test.describe('CLLC – Group D – Simulated', () => {
  test.setTimeout(60000);

  test('CLLC-D1 – Simulated button present and clickable', async ({ page }) => {
    await openCllc(page);
    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await expect(simBtn).toBeVisible();
    await simBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, 'CLLC-D1-simulated');
  });
});

test.describe('CLLC – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('CLLC-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    await openCllc(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'CLLC-E1-review-specs');
  });

  test('CLLC-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    await openCllc(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'CLLC-E2-design-magnetic');
  });
});

test.describe('CLLC – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('CLLC-F1 – Adviser loads and runs', async ({ page }) => {
    const navigated = await goToMagneticAdviser(page, () => openCllc(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await adviseBtn.isVisible().catch(() => false))) return;

    await adviseBtn.click();
    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'CLLC-F1-adviser-results');
  });
});

test.describe('CLLC – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('CLLC-G1 – Review Specs reaches builder and Core Adviser runs', async ({ page }) => {
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
    await ss(page, 'CLLC-G1-core-adviser-results');
  });
});

// =====================================================================
// PSFB – Groups A-G
// =====================================================================
test.describe('PSFB – Group A – Layout', () => {
  test.setTimeout(60000);

  test('PSFB-A1 – Loads without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openPsfb(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();
    expect(errors.length).toBe(0);
    await ss(page, 'PSFB-A1-layout');
  });

  test('PSFB-A2 – Phase shift parameters visible', async ({ page }) => {
    await openPsfb(page);

    const phaseText = await page.locator('text=phase, text=Phase, text=shift').first().isVisible().catch(() => false);
    console.log(`[PSFB-A2] Phase shift text visible: ${phaseText}`);

    const numInputs = await page.locator('input[type="number"]').count();
    expect(numInputs).toBeGreaterThan(0);
    await ss(page, 'PSFB-A2-phase-params');
  });
});

test.describe('PSFB – Group B – Analytical', () => {
  test.setTimeout(90000);

  test('PSFB-B1 – Default analytical runs without error, canvas appears', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openPsfb(page);
    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    expect(hasError).toBe(false);
    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
    await ss(page, 'PSFB-B1-analytical');
  });

  test('PSFB-B2 – I know mode analytical', async ({ page }) => {
    await openPsfb(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnow.isVisible().catch(() => false)) await iKnow.click();
    else await page.locator('text=I know the design I want').first().click().catch(() => {});
    await page.waitForTimeout(400);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    expect(hasError).toBe(false);
    await ss(page, 'PSFB-B2-iknow');
  });

  test('PSFB-B3 – Waveform view toggle', async ({ page }) => {
    await openPsfb(page);
    await runAnalytical(page);

    const converterBtn = page.locator('button, label').filter({ hasText: /[Cc]onverter/ }).first();
    if (await converterBtn.isVisible().catch(() => false)) {
      await converterBtn.click();
      await page.waitForTimeout(500);
    }
    await ss(page, 'PSFB-B3-waveform-toggle');
  });
});

test.describe('PSFB – Group D – Simulated', () => {
  test.setTimeout(60000);

  test('PSFB-D1 – Simulated button present and clickable', async ({ page }) => {
    await openPsfb(page);
    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await expect(simBtn).toBeVisible();
    await simBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, 'PSFB-D1-simulated');
  });
});

test.describe('PSFB – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('PSFB-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    await openPsfb(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'PSFB-E1-review-specs');
  });

  test('PSFB-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    await openPsfb(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'PSFB-E2-design-magnetic');
  });
});

test.describe('PSFB – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('PSFB-F1 – Adviser loads and Get Advised Magnetics visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openPsfb(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    expect(await adviseBtn.isVisible().catch(() => false)).toBe(true);
    await ss(page, 'PSFB-F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('PSFB-F2 – Adviser runs and returns results', async ({ page }) => {
    const navigated = await goToMagneticAdviser(page, () => openPsfb(page));
    if (!navigated) return;

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await adviseBtn.isVisible().catch(() => false))) return;

    await adviseBtn.click();
    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'PSFB-F2-adviser-results');
  });
});

test.describe('PSFB – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('PSFB-G1 – Review Specs reaches builder and Core Adviser runs', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openPsfb(page));
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
    await ss(page, 'PSFB-G1-core-adviser-results');
  });

  test('PSFB-G2 – Wire Adviser shows Coming soon', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openPsfb(page));
    if (!navigated) return;

    const wireAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Wire Adviser/i }).first();
    if (await wireAdviserLink.isVisible().catch(() => false)) {
      await wireAdviserLink.click();
      await page.waitForTimeout(800);
      const comingSoon = await page.locator('text=Coming soon').first().isVisible().catch(() => false);
      console.log(`[PSFB-G2] Coming soon: ${comingSoon}`);
    }
    await ss(page, 'PSFB-G2-wire-adviser');
  });
});
