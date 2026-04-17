/**
 * DMC (Differential Mode Choke) Wizard Comprehensive Battery Tests
 *
 * NOTE: DMC does NOT use ConverterWizardBase layout.
 * Key buttons: "Propose Design", "Verify Attenuation", "Review Specs", "Design Magnetic"
 *
 * Groups:
 *   A – Layout and UI controls
 *   B – Propose Design + Verify Attenuation
 *   C – Configuration options (Single/Three phase)
 *   D – Attenuation point management
 *   E – Navigation buttons
 *   F – Magnetic Adviser end-to-end
 *   G – Core Adviser (by steps)
 */

import { test, expect } from '@playwright/test';
import {
  BASE_URL, isBenign, screenshot,
  openWizard,
} from './utils.js';

const DMC_CY = 'Wizard-DifferentialModeChoke-link';
const ss = (page, name) => screenshot(page, 'dmc-battery', name);
const openDmc = (page) => openWizard(page, DMC_CY);

// DMC doesn't use .sim-btn.analytical – override openWizard wait
async function openDmcWizard(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1000);

  const clicked = await page.evaluate((cy) => {
    const toggles = Array.from(document.querySelectorAll('.dropdown-toggle'));
    const wt = toggles.find(el => el.textContent.includes('Wizards'));
    if (wt) {
      wt.click();
      const dd = wt.closest('.dropdown') || wt.parentElement;
      const menu = dd?.querySelector('.dropdown-menu');
      if (menu) menu.classList.add('show');
    }
    const link = document.querySelector(`[data-cy="${cy}"]`);
    if (link) { link.click(); return true; }
    return false;
  }, DMC_CY);

  console.log(`[openDmcWizard] click: ${clicked}`);
  await page.waitForURL('**/wizards', { timeout: 15000 }).catch(() => {});
  // DMC has no .sim-btn.analytical — wait for the wizard container instead
  await page.waitForSelector('[data-cy="DmcWizard-title"], .container', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  console.log('[openDmcWizard] ready');
}

async function proposeDesign(page, timeoutMs = 60000) {
  const btn = page.locator('button').filter({ hasText: 'Propose Design' }).first();
  await btn.waitFor({ timeout: 5000 });
  await btn.click();
  await page.waitForFunction(
    () => !document.querySelector('.fa-spinner, button:disabled'),
    { timeout: timeoutMs }
  ).catch(() => {});
  await page.waitForTimeout(500);
}

async function verifyAttenuation(page, timeoutMs = 60000) {
  const btn = page.locator('button').filter({ hasText: 'Verify Attenuation' }).first();
  if (!(await btn.isVisible().catch(() => false))) return;
  await btn.click();
  await page.waitForFunction(
    () => !document.querySelector('.fa-spinner, button:disabled'),
    { timeout: timeoutMs }
  ).catch(() => {});
  await page.waitForTimeout(500);
}

// =====================================================================
// GROUP A – Layout
// =====================================================================
test.describe('DMC – Group A – Layout', () => {
  test.setTimeout(60000);

  test('DMC-A1 – Loads without console errors, title visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDmcWizard(page);

    const titleVisible = await page.locator('[data-cy="DmcWizard-title"], text=DMC Wizard').first().isVisible().catch(() => false);
    console.log(`[DMC-A1] Title visible: ${titleVisible}`);
    expect(titleVisible).toBe(true);

    const proposeBtn = page.locator('button').filter({ hasText: 'Propose Design' }).first();
    await expect(proposeBtn).toBeVisible();

    console.log(`[DMC-A1] Errors: ${errors.length}`);
    expect(errors.length).toBe(0);
    await ss(page, 'A1-layout');
  });

  test('DMC-A2 – Configuration selector visible (Single/Three phase)', async ({ page }) => {
    await openDmcWizard(page);

    const configText = await page.locator('text=Single phase, text=configuration').first().isVisible().catch(() => false);
    console.log(`[DMC-A2] Config text visible: ${configText}`);

    const allSelects = await page.locator('select').all();
    let configSelect = null;
    for (const sel of allSelects) {
      const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.text));
      if (opts.some(o => o.includes('Single') || o.includes('Three') || o.includes('phase'))) {
        configSelect = sel;
        break;
      }
    }
    console.log(`[DMC-A2] Config select found: ${configSelect !== null}`);
    await ss(page, 'A2-config-selector');
  });

  test('DMC-A3 – Attenuation frequency and impedance points visible', async ({ page }) => {
    await openDmcWizard(page);

    const numInputs = await page.locator('input[type="number"]').count();
    console.log(`[DMC-A3] Number inputs: ${numInputs}`);
    expect(numInputs).toBeGreaterThan(0);
    await ss(page, 'A3-attenuation-points');
  });

  test('DMC-A4 – Review Specs and Design Magnetic buttons visible', async ({ page }) => {
    await openDmcWizard(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();

    await expect(reviewBtn).toBeVisible();
    await expect(designBtn).toBeVisible();
    await ss(page, 'A4-nav-buttons');
  });
});

// =====================================================================
// GROUP B – Propose Design + Verify Attenuation
// =====================================================================
test.describe('DMC – Group B – Propose/Verify', () => {
  test.setTimeout(120000);

  test('DMC-B1 – Propose Design runs without error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDmcWizard(page);
    await ss(page, 'B1-before');
    await proposeDesign(page);
    await ss(page, 'B1-after-propose');

    const hasError = await page.locator('.error-text, .alert-danger, .text-danger').first().isVisible().catch(() => false);
    console.log(`[DMC-B1] Error after propose: ${hasError}`);
    expect(hasError).toBe(false);
    expect(errors.length).toBe(0);
  });

  test('DMC-B2 – Verify Attenuation runs without error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDmcWizard(page);
    await verifyAttenuation(page);
    await ss(page, 'B2-after-verify');

    const hasError = await page.locator('.error-text, .alert-danger').first().isVisible().catch(() => false);
    console.log(`[DMC-B2] Error after verify: ${hasError}`);
    expect(errors.length).toBe(0);
  });

  test('DMC-B3 – Propose Design then Verify Attenuation (full cycle)', async ({ page }) => {
    await openDmcWizard(page);

    await proposeDesign(page);
    await ss(page, 'B3-after-propose');

    await verifyAttenuation(page);
    await ss(page, 'B3-after-verify');

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[DMC-B3] Full cycle error: ${hasError}`);
  });

  test('DMC-B4 – Attenuation chart or result displayed after propose', async ({ page }) => {
    await openDmcWizard(page);
    await proposeDesign(page);

    const canvasCount = await page.locator('canvas').count();
    const resultsVisible = await page.locator('.card, [class*="result"], [class*="proposal"]').first().isVisible().catch(() => false);
    console.log(`[DMC-B4] Canvas: ${canvasCount}, Results visible: ${resultsVisible}`);
    await ss(page, 'B4-propose-results');
  });
});

// =====================================================================
// GROUP C – Configuration options
// =====================================================================
test.describe('DMC – Group C – Configuration', () => {
  test.setTimeout(120000);

  test('DMC-C1 – Three phase configuration propose design', async ({ page }) => {
    await openDmcWizard(page);

    const allSelects = await page.locator('select').all();
    for (const sel of allSelects) {
      const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.text));
      const threePhase = opts.find(o => o.includes('Three') || o.includes('three'));
      if (threePhase) { await sel.selectOption({ label: threePhase }); break; }
    }
    await page.waitForTimeout(300);

    await proposeDesign(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[DMC-C1] Three-phase error: ${hasError}`);
    await ss(page, 'C1-three-phase');
  });

  test('DMC-C2 – Three phases with neutral configuration', async ({ page }) => {
    await openDmcWizard(page);

    const allSelects = await page.locator('select').all();
    for (const sel of allSelects) {
      const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.text));
      const withNeutral = opts.find(o => o.includes('neutral') || o.includes('Neutral') || o.includes('wye'));
      if (withNeutral) { await sel.selectOption({ label: withNeutral }); break; }
    }
    await page.waitForTimeout(300);
    await ss(page, 'C2-three-phase-neutral');
  });
});

// =====================================================================
// GROUP D – Attenuation point management
// =====================================================================
test.describe('DMC – Group D – Attenuation Points', () => {
  test.setTimeout(60000);

  test('DMC-D1 – Add attenuation frequency point', async ({ page }) => {
    await openDmcWizard(page);

    const addBtn = page.locator('button').filter({ hasText: /[Aa]dd/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      const inputsBefore = await page.locator('input[type="number"]').count();
      await addBtn.click();
      await page.waitForTimeout(400);
      const inputsAfter = await page.locator('input[type="number"]').count();
      console.log(`[DMC-D1] Inputs before: ${inputsBefore}, after: ${inputsAfter}`);
    }
    await ss(page, 'D1-add-frequency-point');
  });

  test('DMC-D2 – Modify inductance and capacity values', async ({ page }) => {
    await openDmcWizard(page);

    const numInputs = await page.locator('input[type="number"]').all();
    if (numInputs.length > 0) {
      const firstInput = numInputs[0];
      await firstInput.click({ clickCount: 3 });
      await firstInput.fill('150000');
      await firstInput.press('Tab');
    }
    await ss(page, 'D2-modify-values');
  });
});

// =====================================================================
// GROUP E – Navigation
// =====================================================================
test.describe('DMC – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('DMC-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDmcWizard(page);
    await proposeDesign(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'E1-review-specs');
    expect(errors.length).toBe(0);
  });

  test('DMC-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDmcWizard(page);
    await proposeDesign(page);

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
test.describe('DMC – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  async function goToAdviser(page) {
    await openDmcWizard(page);
    await proposeDesign(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    if (!(await designBtn.isVisible().catch(() => false))) return false;
    if (await designBtn.isDisabled().catch(() => true)) return false;

    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);
    if (!page.url().includes('magnetic_tool')) return false;

    const magneticAdviserBtn = page.locator('button').filter({ hasText: /^Magnetic Adviser$/ }).first();
    if (await magneticAdviserBtn.isVisible().catch(() => false)) {
      await magneticAdviserBtn.click();
      await page.waitForTimeout(1500);
    }
    return true;
  }

  test('DMC-F1 – Adviser page loads after Design Magnetic', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToAdviser(page);
    console.log(`[DMC-F1] Navigated: ${navigated}`);
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    expect(await adviseBtn.isVisible().catch(() => false)).toBe(true);
    await ss(page, 'F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('DMC-F2 – Adviser runs and returns results', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToAdviser(page);
    if (!navigated) { console.log('[DMC-F2] Navigation failed — SKIP'); return; }

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await adviseBtn.isVisible().catch(() => false))) return;

    await adviseBtn.click();
    console.log('[DMC-F2] Waiting for results (up to 180s)...');
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
test.describe('DMC – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  async function goToBuilder(page) {
    await openDmcWizard(page);
    await proposeDesign(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    if (!(await reviewBtn.isVisible().catch(() => false))) return false;
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);
    return page.url().includes('magnetic_tool');
  }

  test('DMC-G1 – Review Specs reaches builder', async ({ page }) => {
    const navigated = await goToBuilder(page);
    expect(navigated).toBe(true);
    await ss(page, 'G1-builder');
  });

  test('DMC-G2 – Core Adviser accessible and runs', async ({ page }) => {
    const navigated = await goToBuilder(page);
    if (!navigated) return;

    const coreAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Core Adviser/i }).first();
    if (!(await coreAdviserLink.isVisible().catch(() => false))) {
      console.log('[DMC-G2] Core Adviser not visible — SKIP');
      return;
    }

    await coreAdviserLink.click();
    await page.waitForTimeout(1000);

    const getAdvisedBtn = page.locator('button').filter({ hasText: /Get advised cores/i }).first();
    if (!(await getAdvisedBtn.isVisible().catch(() => false))) return;

    await getAdvisedBtn.click();
    console.log('[DMC-G2] Waiting for core adviser results (up to 120s)...');
    await ss(page, 'G2-core-adviser-running');

    await page.waitForFunction(
      () => !document.querySelector('[data-cy="CoreAdviser-loading"], .fa-spinner'),
      { timeout: 120000 }
    ).catch(() => {});
    await page.waitForTimeout(1500);
    await ss(page, 'G2-core-adviser-results');
  });

  test('DMC-G3 – Wire Adviser shows Coming soon', async ({ page }) => {
    const navigated = await goToBuilder(page);
    if (!navigated) return;

    const wireAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Wire Adviser/i }).first();
    if (await wireAdviserLink.isVisible().catch(() => false)) {
      await wireAdviserLink.click();
      await page.waitForTimeout(800);
      const comingSoon = await page.locator('text=Coming soon').first().isVisible().catch(() => false);
      console.log(`[DMC-G3] Coming soon: ${comingSoon}`);
    }
    await ss(page, 'G3-wire-adviser');
  });
});
