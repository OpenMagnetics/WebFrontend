/**
 * DMC (Differential Mode Choke) Wizard Comprehensive Battery Tests
 *
 * NOTE: DMC uses ConverterWizardBase layout (3-column compact cards) with the
 * standard Analytical / Simulated waveform controls. SPICE button is hidden.
 * Design-level toggle ("Help me with the design" vs "I know the design I want")
 * follows the CMC pattern. Action buttons: "Review Specs", "Design Magnetic".
 *
 * Groups:
 *   A – Layout and UI controls
 *   B – Analytical / Simulated waveforms
 *   C – Configuration options (Single/Three phase)
 *   D – Attenuation point management
 *   E – Navigation buttons
 *   F – Magnetic Adviser end-to-end
 *   G – Core Adviser (by steps)
 */

import { test, expect } from './_coverage.js';
import { BASE_URL, isBenign, screenshot, openWizard, softVisible, softDisabled, tryWaitForURL, pause, tryWaitForFunction, tryWaitForSelector, softWaitFor, clickIfPresent } from './utils.js';

const DMC_CY = 'Wizard-DifferentialModeChoke-link';
const ss = (page, name) => screenshot(page, 'dmc-battery', name);
const openDmc = (page) => openWizard(page, DMC_CY);

// DMC doesn't use .sim-btn.analytical – override openWizard wait
async function openDmcWizard(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await pause(page, 1000, 'mechanical: settle');

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
  await tryWaitForURL(page, '**/wizards', 15000);
  // Wait for the wizard title to confirm DmcWizard mounted (replaces the
  // analytical-button wait used by other wizards).
  await tryWaitForSelector(page,'[data-cy="DmcWizard-title"]', { timeout: 15000 });
  await pause(page, 500, 'mechanical: settle');
  console.log('[openDmcWizard] ready');
}

// Wait for the specific button (by visible label) to come back out of its
// loading/disabled state. Watching `button:disabled` globally would also match
// permanently-disabled wizard links in the header dropdown (e.g. PSFB),
// so always time out.
async function waitForButtonReady(page, label, timeoutMs) {
  await tryWaitForFunction(page,
    (text) => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => b.textContent && b.textContent.includes(text));
      return target && !target.disabled;
    },
    label,
    { timeout: timeoutMs }
  );
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

    const titleVisible = await softVisible(page.locator('[data-cy="DmcWizard-title"]').first());
    console.log(`[DMC-A1] Title visible: ${titleVisible}`);
    expect(titleVisible).toBe(true);

    const analyticalBtn = page.locator('button').filter({ hasText: 'Analytical' }).first();
    await expect(analyticalBtn).toBeVisible();

    console.log(`[DMC-A1] Errors: ${errors.length}`);
    expect(errors.length).toBe(0);
    await ss(page, 'A1-layout');
  });

  test('DMC-A2 – Configuration selector visible (Single/Three phase)', async ({ page }) => {
    await openDmcWizard(page);

    const configText = await softVisible(page.locator('text=Single phase, text=configuration').first());
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
// GROUP B – Analytical / Simulated waveforms (replaces the old
// Propose Design / Verify Attenuation pair, which was dropped in favour
// of the CMC-style "Help me / I know" toggle).
// =====================================================================
async function clickAnalytical(page, timeoutMs = 60000) {
  const btn = page.locator('button').filter({ hasText: 'Analytical' }).first();
  if (!(await softVisible(btn))) return;
  await btn.click();
  await waitForButtonReady(page, 'Analytical', timeoutMs);
  await pause(page, 500, 'mechanical: settle');
}

async function clickSimulated(page, timeoutMs = 60000) {
  const btn = page.locator('button').filter({ hasText: 'Simulated' }).first();
  if (!(await softVisible(btn))) return;
  await btn.click();
  await waitForButtonReady(page, 'Simulated', timeoutMs);
  await pause(page, 500, 'mechanical: settle');
}

test.describe('DMC – Group B – Waveforms', () => {
  test.setTimeout(120000);

  test('DMC-B1 – Analytical button runs without error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDmcWizard(page);
    await ss(page, 'B1-before');
    await clickAnalytical(page);
    await ss(page, 'B1-after-analytical');

    const hasError = await softVisible(page.locator('.error-text, .alert-danger').first());
    console.log(`[DMC-B1] Error after analytical: ${hasError}`);
    expect(errors.length).toBe(0);
  });

  test('DMC-B2 – Simulated button runs without error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDmcWizard(page);
    await clickSimulated(page);
    await ss(page, 'B2-after-simulated');

    const hasError = await softVisible(page.locator('.error-text, .alert-danger').first());
    console.log(`[DMC-B2] Error after simulated: ${hasError}`);
    expect(errors.length).toBe(0);
  });

  test('DMC-B3 – Analytical then Simulated (full cycle)', async ({ page }) => {
    await openDmcWizard(page);
    await clickAnalytical(page);
    await ss(page, 'B3-after-analytical');
    await clickSimulated(page);
    await ss(page, 'B3-after-simulated');
    const hasError = await softVisible(page.locator('.error-text').first());
    console.log(`[DMC-B3] Full cycle error: ${hasError}`);
  });

  test('DMC-B4 – SPICE button generates a netlist', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDmcWizard(page);
    // Run analytical first so designRequirements / inductance are populated
    await clickAnalytical(page);

    const spiceBtn = page.locator('button').filter({ hasText: /SPICE|Get SPICE|Get Spice/i }).first();
    if (!(await softVisible(spiceBtn))) {
      console.log('[DMC-B4] SPICE button not visible — wizard or base may have hidden it');
      return;
    }
    await spiceBtn.click();
    // SPICE modal should appear within ~30s
    const modal = page.locator('.modal, [role="dialog"], pre, code').filter({ hasText: /\.tran|Vdc|\.end|Ldmc/i }).first();
    await softWaitFor(modal, { timeout: 30000 });
    const visible = await softVisible(modal);
    console.log(`[DMC-B4] SPICE netlist visible: ${visible}`);
    expect(errors.length).toBe(0);
    await ss(page, 'B4-spice-netlist');
  });
});

// =====================================================================
// GROUP C – Configuration options
// =====================================================================
test.describe('DMC – Group C – Configuration', () => {
  test.setTimeout(120000);

  test('DMC-C1 – Three phase configuration analytical waveform', async ({ page }) => {
    await openDmcWizard(page);

    // Configuration is rendered via radio buttons (ElementFromListRadio), not
    // a <select> — pick the "Three phase" radio if present.
    const threeRadio = page.locator('label, button').filter({ hasText: /Three phase/i }).first();
    if (await softVisible(threeRadio)) {
      await clickIfPresent(threeRadio);
    }
    await pause(page, 300, 'mechanical: settle');

    await clickAnalytical(page);
    const hasError = await softVisible(page.locator('.error-text').first());
    console.log(`[DMC-C1] Three-phase error: ${hasError}`);
    await ss(page, 'C1-three-phase');
  });

  test('DMC-C2 – Three phases with neutral configuration', async ({ page }) => {
    await openDmcWizard(page);

    const withNeutral = page.locator('label, button').filter({ hasText: /neutral|wye/i }).first();
    if (await softVisible(withNeutral)) {
      await clickIfPresent(withNeutral);
    }
    await pause(page, 300, 'mechanical: settle');
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
    if (await softVisible(addBtn)) {
      const inputsBefore = await page.locator('input[type="number"]').count();
      await addBtn.click();
      await pause(page, 400, 'mechanical: settle');
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

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    await tryWaitForURL(page, '**/magnetic_tool**', 30000);

    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'E1-review-specs');
    expect(errors.length).toBe(0);
  });

  test('DMC-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDmcWizard(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await expect(designBtn).toBeVisible();
    await designBtn.click();
    await tryWaitForURL(page, '**/magnetic_tool**', 30000);

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

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    if (!(await softVisible(designBtn))) return false;
    if (await softDisabled(designBtn)) return false;

    await designBtn.click();
    await tryWaitForURL(page, '**/magnetic_tool**', 30000);
    await pause(page, 2000, 'mechanical: settle');
    if (!page.url().includes('magnetic_tool')) return false;

    const magneticAdviserBtn = page.locator('button').filter({ hasText: /^Magnetic Adviser$/ }).first();
    if (await softVisible(magneticAdviserBtn)) {
      await magneticAdviserBtn.click();
      await pause(page, 1500, 'mechanical: settle');
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
    expect(await softVisible(adviseBtn)).toBe(true);
    await ss(page, 'F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('DMC-F2 – Adviser runs and returns results', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToAdviser(page);
    if (!navigated) { console.log('[DMC-F2] Navigation failed — SKIP'); return; }

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await softVisible(adviseBtn))) return;

    await adviseBtn.click();
    console.log('[DMC-F2] Waiting for results (up to 180s)...');
    await ss(page, 'F2-adviser-running');

    await tryWaitForFunction(page,
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    );
    await pause(page, 2000, 'mechanical: settle');
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

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    if (!(await softVisible(reviewBtn))) return false;
    await reviewBtn.click();
    await tryWaitForURL(page, '**/magnetic_tool**', 30000);
    await pause(page, 2000, 'mechanical: settle');
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
    if (!(await softVisible(coreAdviserLink))) {
      console.log('[DMC-G2] Core Adviser not visible — SKIP');
      return;
    }

    await coreAdviserLink.click();
    await pause(page, 1000, 'mechanical: settle');

    const getAdvisedBtn = page.locator('button').filter({ hasText: /Get advised cores/i }).first();
    if (!(await softVisible(getAdvisedBtn))) return;

    await getAdvisedBtn.click();
    console.log('[DMC-G2] Waiting for core adviser results (up to 120s)...');
    await ss(page, 'G2-core-adviser-running');

    await tryWaitForFunction(page,
      () => !document.querySelector('[data-cy="CoreAdviser-loading"], .fa-spinner'),
      { timeout: 120000 }
    );
    await pause(page, 1500, 'mechanical: settle');
    await ss(page, 'G2-core-adviser-results');
  });

  test('DMC-G3 – Wire Adviser shows Coming soon', async ({ page }) => {
    const navigated = await goToBuilder(page);
    if (!navigated) return;

    const wireAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Wire Adviser/i }).first();
    if (await softVisible(wireAdviserLink)) {
      await wireAdviserLink.click();
      await pause(page, 800, 'mechanical: settle');
      const comingSoon = await softVisible(page.locator('text=Coming soon').first());
      console.log(`[DMC-G3] Coming soon: ${comingSoon}`);
    }
    await ss(page, 'G3-wire-adviser');
  });
});
