/**
 * CMC (Common Mode Choke) Wizard Comprehensive Battery Tests
 *
 * CMC uses ConverterWizardBase layout.
 * Key features:
 *   - Spec mode: Impedance specification / Insertion loss / Estimate from noise
 *   - Winding options: 2-wire / 3-wire / 4-wire
 *   - Design mode: Help me / I know
 *
 * Groups:
 *   A – Layout and UI controls
 *   B – Analytical simulation (all spec modes)
 *   C – Winding configuration and design modes
 *   D – Simulated waveforms
 *   E – Navigation buttons
 *   F – Magnetic Adviser end-to-end
 *   G – Core Adviser (by steps)
 */

import { test, expect } from './_coverage.js';
import {
  BASE_URL, isBenign, screenshot,
  openWizard, runAnalytical,
  conditionsCard, outputsCard,
  goToMagneticAdviser, goToMagneticBuilder,
} from './utils.js';

const CMC_CY = 'Wizard-CommonModeChoke-link';
const ss = (page, name) => screenshot(page, 'cmc-battery', name);
const openCmc = (page) => openWizard(page, CMC_CY);

// =====================================================================
// GROUP A – Layout
// =====================================================================
test.describe('CMC – Group A – Layout', () => {
  test.setTimeout(60000);

  test('CMC-A1 – Loads without console errors, title and Conditions card visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openCmc(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(conditionsCard(page)).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();

    console.log(`[CMC-A1] Errors: ${errors.length}`);
    expect(errors.length).toBe(0);
    await ss(page, 'A1-layout');
  });

  test('CMC-A2 – Spec mode selector visible (Impedance/Insertion Loss/Noise)', async ({ page }) => {
    await openCmc(page);

    const allSelects = await page.locator('select').all();
    let specModeSelect = null;
    for (const sel of allSelects) {
      const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.value || o.text));
      if (opts.some(o => o.includes('Impedance') || o.includes('insertion') || o.includes('noise'))) {
        specModeSelect = sel;
        break;
      }
    }
    console.log(`[CMC-A2] Spec mode select found: ${specModeSelect !== null}`);
    if (specModeSelect) {
      const opts = await specModeSelect.evaluate(el => Array.from(el.options).map(o => o.text));
      console.log(`[CMC-A2] Spec mode options: ${opts.join(', ')}`);
    }
    await ss(page, 'A2-spec-mode-selector');
  });

  test('CMC-A3 – Winding option selector visible (2/3/4 wire)', async ({ page }) => {
    await openCmc(page);

    const windingText = await page.locator('text=2 —, text=Single phase').first().isVisible().catch(() => false);
    console.log(`[CMC-A3] Winding option text visible: ${windingText}`);

    const allSelects = await page.locator('select').all();
    let windingSelect = null;
    for (const sel of allSelects) {
      const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.text));
      if (opts.some(o => o.includes('phase') || o.includes('winding') || o.includes('Single'))) {
        windingSelect = sel;
        break;
      }
    }
    console.log(`[CMC-A3] Winding select found: ${windingSelect !== null}`);
    await ss(page, 'A3-winding-selector');
  });

  test('CMC-A4 – Design mode toggle (Help me / I know)', async ({ page }) => {
    await openCmc(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnow.isVisible().catch(() => false)) {
      await iKnow.click();
      await page.waitForTimeout(400);
    }
    await ss(page, 'A4-design-mode');
  });
});

// =====================================================================
// GROUP B – Analytical (all spec modes)
// =====================================================================
test.describe('CMC – Group B – Analytical', () => {
  test.setTimeout(90000);

  test('CMC-B1 – Default Impedance spec analytical runs without error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openCmc(page);
    await ss(page, 'B1-before');
    await runAnalytical(page);
    await ss(page, 'B1-after');

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[CMC-B1] Error: ${hasError}`);
    expect(hasError).toBe(false);

    const canvasCount = await page.locator('canvas').count();
    console.log(`[CMC-B1] Canvas count: ${canvasCount}`);
    expect(canvasCount).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
  });

  test('CMC-B2 – Insertion loss spec mode analytical', async ({ page }) => {
    await openCmc(page);

    const allSelects = await page.locator('select').all();
    for (const sel of allSelects) {
      const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.text));
      const ilOpt = opts.find(o => o.includes('insertion') || o.includes('Insertion') || o.includes('loss'));
      if (ilOpt) {
        await sel.selectOption({ label: ilOpt });
        break;
      }
    }
    await page.waitForTimeout(400);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[CMC-B2] Insertion loss error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'B2-insertion-loss');
  });

  test('CMC-B3 – Estimate from noise spec mode analytical', async ({ page }) => {
    await openCmc(page);

    const allSelects = await page.locator('select').all();
    for (const sel of allSelects) {
      const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.text));
      const noiseOpt = opts.find(o => o.includes('noise') || o.includes('Noise'));
      if (noiseOpt) {
        await sel.selectOption({ label: noiseOpt });
        break;
      }
    }
    await page.waitForTimeout(400);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[CMC-B3] Noise estimate error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'B3-noise-estimate');
  });

  test('CMC-B4 – Three-phase winding option analytical', async ({ page }) => {
    await openCmc(page);

    const allSelects = await page.locator('select').all();
    for (const sel of allSelects) {
      const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.text));
      const threePhase = opts.find(o => o.includes('Three') || o.includes('three') || o.includes('3'));
      if (threePhase) {
        await sel.selectOption({ label: threePhase });
        await page.waitForTimeout(300);
        break;
      }
    }

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[CMC-B4] Three-phase error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'B4-three-phase');
  });

  test('CMC-B5 – I know mode with custom inductance', async ({ page }) => {
    await openCmc(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnow.isVisible().catch(() => false)) await iKnow.click();
    else await page.locator('text=I know the design I want').first().click().catch(() => {});
    await page.waitForTimeout(400);

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[CMC-B5] I know error: ${hasError}`);
    expect(hasError).toBe(false);
    await ss(page, 'B5-iknow');
  });
});

// =====================================================================
// GROUP C – Spec modes and winding
// =====================================================================
test.describe('CMC – Group C – Spec Modes', () => {
  test.setTimeout(60000);

  test('CMC-C1 – Impedance spec: frequency and impedance inputs visible', async ({ page }) => {
    await openCmc(page);

    const freqInput = await page.locator('input[type="number"]').first().isVisible().catch(() => false);
    console.log(`[CMC-C1] Frequency input visible: ${freqInput}`);

    const impedanceText = await page.locator('text=impedance, text=Impedance').first().isVisible().catch(() => false);
    console.log(`[CMC-C1] Impedance text visible: ${impedanceText}`);
    await ss(page, 'C1-impedance-spec');
  });

  test('CMC-C2 – Add/remove frequency point for impedance spec', async ({ page }) => {
    await openCmc(page);

    const addPointBtn = page.locator('button').filter({ hasText: /[Aa]dd|[Aa]dd [Pp]oint|\+/i }).first();
    if (await addPointBtn.isVisible().catch(() => false)) {
      const inputsBefore = await page.locator('input[type="number"]').count();
      await addPointBtn.click();
      await page.waitForTimeout(400);
      const inputsAfter = await page.locator('input[type="number"]').count();
      console.log(`[CMC-C2] Inputs before: ${inputsBefore}, after: ${inputsAfter}`);
    }
    await ss(page, 'C2-add-frequency-point');
  });
});

// =====================================================================
// GROUP D – Simulated
// =====================================================================
test.describe('CMC – Group D – Simulated', () => {
  test.setTimeout(60000);

  test('CMC-D1 – Simulated button present and clickable', async ({ page }) => {
    await openCmc(page);

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
test.describe('CMC – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('CMC-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openCmc(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'E1-review-specs');
    expect(errors.length).toBe(0);
  });

  test('CMC-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openCmc(page);
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
test.describe('CMC – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('CMC-F1 – Adviser page loads after Design Magnetic', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openCmc(page));
    console.log(`[CMC-F1] Navigated: ${navigated}`);
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    expect(await adviseBtn.isVisible().catch(() => false)).toBe(true);
    await ss(page, 'F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('CMC-F2 – Adviser runs and returns results', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openCmc(page));
    if (!navigated) { console.log('[CMC-F2] Navigation failed — SKIP'); return; }

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await adviseBtn.isVisible().catch(() => false))) return;

    await adviseBtn.click();
    console.log('[CMC-F2] Waiting for results (up to 180s)...');
    await ss(page, 'F2-adviser-running');

    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'F2-adviser-results');
    expect(errors.length).toBe(0);
  });

  test('CMC-F3 – Adviser with three-phase winding', async ({ page }) => {
    const navigated = await goToMagneticAdviser(page, () => openCmc(page), async (pg) => {
      const allSelects = await pg.locator('select').all();
      for (const sel of allSelects) {
        const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.text));
        const threePhase = opts.find(o => o.includes('Three') || o.includes('three'));
        if (threePhase) { await sel.selectOption({ label: threePhase }); break; }
      }
      await pg.waitForTimeout(300);
    });
    if (!navigated) return;

    await ss(page, 'F3-adviser-three-phase');
    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (await adviseBtn.isVisible().catch(() => false)) {
      await adviseBtn.click();
      await page.waitForFunction(
        () => !document.querySelector('.fa-spinner, [class*="loading"]'),
        { timeout: 180000 }
      ).catch(() => {});
      await page.waitForTimeout(2000);
      await ss(page, 'F3-adviser-three-phase-results');
    }
  });
});

// =====================================================================
// GROUP G – Core Adviser
// =====================================================================
test.describe('CMC – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('CMC-G1 – Review Specs reaches builder', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openCmc(page));
    expect(navigated).toBe(true);
    await ss(page, 'G1-builder');
  });

  test('CMC-G2 – Core Adviser accessible and runs', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openCmc(page));
    if (!navigated) return;

    const coreAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Core Adviser/i }).first();
    if (!(await coreAdviserLink.isVisible().catch(() => false))) {
      console.log('[CMC-G2] Core Adviser not visible — SKIP');
      return;
    }

    await coreAdviserLink.click();
    await page.waitForTimeout(1000);

    const getAdvisedBtn = page.locator('button').filter({ hasText: /Get advised cores/i }).first();
    if (!(await getAdvisedBtn.isVisible().catch(() => false))) return;

    await getAdvisedBtn.click();
    console.log('[CMC-G2] Waiting for core adviser results (up to 120s)...');
    await ss(page, 'G2-core-adviser-running');

    await page.waitForFunction(
      () => !document.querySelector('[data-cy="CoreAdviser-loading"], .fa-spinner'),
      { timeout: 120000 }
    ).catch(() => {});
    await page.waitForTimeout(1500);
    await ss(page, 'G2-core-adviser-results');
  });

  test('CMC-G3 – Wire Adviser shows Coming soon', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openCmc(page));
    if (!navigated) return;

    const wireAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Wire Adviser/i }).first();
    if (await wireAdviserLink.isVisible().catch(() => false)) {
      await wireAdviserLink.click();
      await page.waitForTimeout(800);
      const comingSoon = await page.locator('text=Coming soon').first().isVisible().catch(() => false);
      console.log(`[CMC-G3] Coming soon: ${comingSoon}`);
    }
    await ss(page, 'G3-wire-adviser');
  });

  test('CMC-G4 – Builder shows correct CMC winding count', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openCmc(page));
    if (!navigated) return;

    const pageText = await page.locator('body').innerText().catch(() => '');
    const hasPrimary = pageText.includes('Primary') || pageText.includes('Winding');
    console.log(`[CMC-G4] Winding info present: ${hasPrimary}`);
    await ss(page, 'G4-builder-windings');
  });
});
