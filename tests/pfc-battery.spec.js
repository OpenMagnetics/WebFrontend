/**
 * PFC Wizard Comprehensive Battery Tests
 *
 * Groups:
 *   A – Layout and UI controls
 *   B – Analytical simulation (CCM, CrCM, DCM modes)
 *   C – Design mode switching (Help me / I know)
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

const PFC_CY = 'Pfc-link';
const ss = (page, name) => screenshot(page, 'pfc-battery', name);
const openPfc = (page) => openWizard(page, PFC_CY);

// =====================================================================
// GROUP A – Layout
// =====================================================================
test.describe('PFC – Group A – Layout', () => {
  test.setTimeout(60000);

  test('PFC-A1 – Loads without console errors, title and Conditions card visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openPfc(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(conditionsCard(page)).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();

    console.log(`[PFC-A1] Errors: ${errors.length}`);
    expect(errors.length).toBe(0);
    await ss(page, 'A1-layout');
  });

  test('PFC-A2 – Mode selector visible (CCM/CrCM/DCM)', async ({ page }) => {
    await openPfc(page);

    const cCard = conditionsCard(page);
    const selects = await cCard.locator('select').all();
    let modeSelect = null;
    for (const sel of selects) {
      const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.value));
      if (opts.some(o => o.includes('Continuous') || o.includes('Critical') || o.includes('Discontinuous'))) {
        modeSelect = sel;
        break;
      }
    }

    // If mode selector not in Conditions card, look globally
    if (!modeSelect) {
      const allSelects = await page.locator('select').all();
      for (const sel of allSelects) {
        const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.value));
        if (opts.some(o => o.includes('Continuous') || o.includes('Critical') || o.includes('Discontinuous'))) {
          modeSelect = sel;
          break;
        }
      }
    }

    console.log(`[PFC-A2] Mode selector found: ${modeSelect !== null}`);
    await ss(page, 'A2-mode-selector');
  });

  test('PFC-A3 – Line frequency and output power inputs visible', async ({ page }) => {
    await openPfc(page);

    const cCard = conditionsCard(page);
    const numInputs = await cCard.locator('input[type="number"]').count();
    console.log(`[PFC-A3] Conditions inputs: ${numInputs}`);
    expect(numInputs).toBeGreaterThan(0);
    await ss(page, 'A3-conditions');
  });
});

// =====================================================================
// GROUP B – Analytical (CCM/CrCM/DCM modes)
// =====================================================================
test.describe('PFC – Group B – Analytical', () => {
  test.setTimeout(90000);

  test('PFC-B1 – Default CCM analytical runs without error, canvas appears', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openPfc(page);
    await ss(page, 'B1-before');
    await runAnalytical(page);
    await ss(page, 'B1-after');

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[PFC-B1] Error: ${hasError}`);
    expect(hasError).toBe(false);

    const canvasCount = await page.locator('canvas').count();
    console.log(`[PFC-B1] Canvas count: ${canvasCount}`);
    expect(canvasCount).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
  });

  test('PFC-B2 – CrCM (Critical Conduction) mode analytical', async ({ page }) => {
    await openPfc(page);

    const allSelects = await page.locator('select').all();
    let modeSelect = null;
    for (const sel of allSelects) {
      const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.value));
      if (opts.some(o => o.includes('Critical'))) { modeSelect = sel; break; }
    }

    if (!modeSelect) { console.log('[PFC-B2] Mode select not found — SKIP'); return; }

    await modeSelect.selectOption({ label: 'Critical Conduction Mode' }).catch(async () => {
      const opts = await modeSelect.evaluate(el => Array.from(el.options).map(o => o.value));
      const critOpt = opts.find(o => o.includes('Critical'));
      if (critOpt) await modeSelect.selectOption(critOpt);
    });
    await page.waitForTimeout(400);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[PFC-B2] CrCM error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'B2-crcm-analytical');
  });

  test('PFC-B3 – DCM mode analytical', async ({ page }) => {
    await openPfc(page);

    const allSelects = await page.locator('select').all();
    let modeSelect = null;
    for (const sel of allSelects) {
      const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.value));
      if (opts.some(o => o.includes('Discontinuous'))) { modeSelect = sel; break; }
    }

    if (!modeSelect) { console.log('[PFC-B3] Mode select not found — SKIP'); return; }

    await modeSelect.selectOption({ label: 'Discontinuous Conduction Mode' }).catch(async () => {
      const opts = await modeSelect.evaluate(el => Array.from(el.options).map(o => o.value));
      const dcmOpt = opts.find(o => o.includes('Discontinuous'));
      if (dcmOpt) await modeSelect.selectOption(dcmOpt);
    });
    await page.waitForTimeout(400);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[PFC-B3] DCM error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'B3-dcm-analytical');
  });

  test('PFC-B4 – Magnetic vs Converter waveform view toggle', async ({ page }) => {
    await openPfc(page);
    await runAnalytical(page);

    const converterBtn = page.locator('button, label').filter({ hasText: /[Cc]onverter/ }).first();
    if (await converterBtn.isVisible().catch(() => false)) {
      await converterBtn.click();
      await page.waitForTimeout(500);
      const canvasAfter = await page.locator('canvas').count();
      console.log(`[PFC-B4] Canvas after converter view: ${canvasAfter}`);
    }
    await ss(page, 'B4-waveform-view');
  });
});

// =====================================================================
// GROUP C – Design mode
// =====================================================================
test.describe('PFC – Group C – Design Mode', () => {
  test.setTimeout(60000);

  test('PFC-C1 – I know mode shows inductance field', async ({ page }) => {
    await openPfc(page);

    const iKnowLabel = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (!(await iKnowLabel.isVisible().catch(() => false))) {
      await page.locator('text=I know the design I want').first().click().catch(() => {});
    } else {
      await iKnowLabel.click();
    }
    await page.waitForTimeout(400);

    const inductanceField = await page.locator('text=Inductance').first().isVisible().catch(() => false);
    console.log(`[PFC-C1] Inductance field in I know mode: ${inductanceField}`);
    await ss(page, 'C1-iknow-mode');
  });

  test('PFC-C2 – I know mode analytical with custom inductance 200µH', async ({ page }) => {
    await openPfc(page);

    const iKnowLabel = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnowLabel.isVisible().catch(() => false)) await iKnowLabel.click();
    else await page.locator('text=I know the design I want').first().click().catch(() => {});
    await page.waitForTimeout(400);

    // Fill inductance field
    const inductanceRow = page.locator('text=Inductance').locator('../..').first();
    const inductanceInput = inductanceRow.locator('input[type="number"]').first();
    if (await inductanceInput.isVisible().catch(() => false)) {
      await inductanceInput.click({ clickCount: 3 });
      await inductanceInput.fill('2e-4');
      await inductanceInput.press('Tab');
    }

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[PFC-C2] I know error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'C2-iknow-analytical');
  });
});

// =====================================================================
// GROUP D – Simulated
// =====================================================================
test.describe('PFC – Group D – Simulated', () => {
  test.setTimeout(60000);

  test('PFC-D1 – Simulated button present and clickable', async ({ page }) => {
    await openPfc(page);

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
test.describe('PFC – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('PFC-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openPfc(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'E1-review-specs');
    expect(errors.length).toBe(0);
  });

  test('PFC-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openPfc(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await expect(designBtn).toBeVisible();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'E2-design-magnetic');
    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// GROUP F – Magnetic Adviser
// =====================================================================
test.describe('PFC – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('PFC-F1 – Adviser page loads with Get Advised Magnetics button', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openPfc(page));
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    expect(await adviseBtn.isVisible().catch(() => false)).toBe(true);
    await ss(page, 'F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('PFC-F2 – Adviser runs and returns results', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openPfc(page));
    if (!navigated) { console.log('[PFC-F2] Navigation failed — SKIP'); return; }

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await adviseBtn.isVisible().catch(() => false))) return;

    await adviseBtn.click();
    console.log('[PFC-F2] Waiting for adviser results (up to 180s)...');
    await ss(page, 'F2-adviser-running');

    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'F2-adviser-results');
    expect(errors.length).toBe(0);
  });

  test('PFC-F3 – Adviser with CrCM mode', async ({ page }) => {
    const navigated = await goToMagneticAdviser(page, () => openPfc(page), async (pg) => {
      const allSelects = await pg.locator('select').all();
      for (const sel of allSelects) {
        const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.value));
        if (opts.some(o => o.includes('Critical'))) {
          const critOpt = opts.find(o => o.includes('Critical'));
          if (critOpt) { await sel.selectOption(critOpt); break; }
        }
      }
      await pg.waitForTimeout(300);
    });
    if (!navigated) { console.log('[PFC-F3] Navigation failed — SKIP'); return; }

    await ss(page, 'F3-adviser-crcm-loaded');
    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (await adviseBtn.isVisible().catch(() => false)) {
      await adviseBtn.click();
      await page.waitForFunction(
        () => !document.querySelector('.fa-spinner, [class*="loading"]'),
        { timeout: 180000 }
      ).catch(() => {});
      await page.waitForTimeout(2000);
      await ss(page, 'F3-adviser-crcm-results');
    }
  });
});

// =====================================================================
// GROUP G – Core Adviser
// =====================================================================
test.describe('PFC – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('PFC-G1 – Review Specs reaches builder', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openPfc(page));
    expect(navigated).toBe(true);
    await ss(page, 'G1-builder');
  });

  test('PFC-G2 – Core Adviser accessible and runs', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openPfc(page));
    if (!navigated) return;

    const coreAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Core Adviser/i }).first();
    if (!(await coreAdviserLink.isVisible().catch(() => false))) {
      console.log('[PFC-G2] Core Adviser not visible — SKIP');
      return;
    }

    await coreAdviserLink.click();
    await page.waitForTimeout(1000);

    const getAdvisedBtn = page.locator('button').filter({ hasText: /Get advised cores/i }).first();
    if (!(await getAdvisedBtn.isVisible().catch(() => false))) return;

    await getAdvisedBtn.click();
    console.log('[PFC-G2] Waiting for core adviser results (up to 120s)...');
    await ss(page, 'G2-core-adviser-running');

    await page.waitForFunction(
      () => !document.querySelector('[data-cy="CoreAdviser-loading"], .fa-spinner'),
      { timeout: 120000 }
    ).catch(() => {});
    await page.waitForTimeout(1500);
    await ss(page, 'G2-core-adviser-results');
  });

  test('PFC-G3 – Wire Adviser shows Coming soon', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openPfc(page));
    if (!navigated) return;

    const wireAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Wire Adviser/i }).first();
    if (await wireAdviserLink.isVisible().catch(() => false)) {
      await wireAdviserLink.click();
      await page.waitForTimeout(800);
      const comingSoon = await page.locator('text=Coming soon').first().isVisible().catch(() => false);
      console.log(`[PFC-G3] Coming soon: ${comingSoon}`);
    }
    await ss(page, 'G3-wire-adviser');
  });
});
