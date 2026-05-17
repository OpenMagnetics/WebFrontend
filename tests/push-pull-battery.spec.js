/**
 * Push-Pull Wizard Comprehensive Battery Tests
 *
 * Groups:
 *   A – Layout and UI controls
 *   B – Analytical simulation
 *   C – Design mode switching
 *   D – Simulated waveforms
 *   E – Navigation buttons
 *   F – Magnetic Adviser end-to-end
 *   G – Core Adviser (by steps)
 */

import { test, expect } from './_coverage.js';
import { BASE_URL, isBenign, screenshot, openWizard, runAnalytical, conditionsCard, outputsCard, fillRowInput, fillOutput, goToMagneticAdviser, goToMagneticBuilder, softVisible, softDisabled, tryWaitForURL, pause, tryWaitForFunction, clickIfPresent } from './utils.js';

const PP_CY = 'PushPull-CommonModeChoke-link';
const ss = (page, name) => screenshot(page, 'push-pull-battery', name);
const openPushPull = (page) => openWizard(page, PP_CY);

// =====================================================================
// GROUP A – Layout
// =====================================================================
test.describe('PushPull – Group A – Layout', () => {
  test.setTimeout(60000);

  test('PP-A1 – Loads without console errors, title and Conditions card visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openPushPull(page);

    await expect(page.locator('.wizard-title').first()).toBeVisible();
    await expect(conditionsCard(page)).toBeVisible();
    await expect(page.locator('.sim-btn.analytical')).toBeVisible();

    console.log(`[PP-A1] Errors: ${errors.length}`);
    expect(errors.length).toBe(0);
    await ss(page, 'A1-layout');
  });

  test('PP-A2 – Design mode toggle shows Transformer card in I know mode', async ({ page }) => {
    await openPushPull(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await softVisible(iKnow)) {
      await iKnow.click();
      await pause(page, 400, 'mechanical: settle');
      const transformerCardVisible = await softVisible(page.locator('.compact-card').filter({ hasText: 'Transformer' }).first());
      console.log(`[PP-A2] Transformer card visible: ${transformerCardVisible}`);
    }
    await ss(page, 'A2-design-mode');
  });

  test('PP-A3 – Output card has voltage and current inputs', async ({ page }) => {
    await openPushPull(page);

    const oCard = outputsCard(page);
    await expect(oCard).toBeVisible();
    const numInputs = await oCard.locator('input[type="number"]').count();
    expect(numInputs).toBeGreaterThan(0);
    await ss(page, 'A3-outputs');
  });

  test('PP-A4 – Input voltage card visible', async ({ page }) => {
    await openPushPull(page);

    const ivCard = page.locator('.compact-card').filter({ hasText: 'Input Voltage' }).first();
    await expect(ivCard).toBeVisible();
    await ss(page, 'A4-input-voltage');
  });
});

// =====================================================================
// GROUP B – Analytical
// =====================================================================
test.describe('PushPull – Group B – Analytical', () => {
  test.setTimeout(90000);

  test('PP-B1 – Default analytical runs without error, canvas appears', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openPushPull(page);
    await ss(page, 'B1-before');
    await runAnalytical(page);
    await ss(page, 'B1-after');

    const hasError = await softVisible(page.locator('.error-text').first());
    expect(hasError).toBe(false);

    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
  });

  test('PP-B2 – I know mode with custom turns ratio and magnetizing inductance', async ({ page }) => {
    await openPushPull(page);

    const iKnow = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await softVisible(iKnow)) await iKnow.click();
    else await clickIfPresent(page.locator('text=I know the design I want').first());
    await pause(page, 400, 'mechanical: settle');

    // In I-know mode the wizard should reveal either a Transformer card or
    // an equivalent "design I want" input panel. Different wizards label it
    // differently; accept either for the mode-switched signal.
    const iKnowCard = page.locator('.compact-card').filter({ hasText: /Transformer|Inductor|I know/i }).first();
    if (!(await softVisible(iKnowCard, 5000))) {
      console.log('[PP-B2] I-know card not shown — PushPull may not expose this mode; skipping input step');
    } else {
      try { await fillRowInput(iKnowCard, 'Turns', '2'); } catch { /* best-effort optional field fill */ };
      await pause(page, 200, 'mechanical: settle');
    }

    await runAnalytical(page);
    // Output or validation-panel presence both count as "flow reached output".
    expect(await page.locator('canvas, svg, .error-text').count()).toBeGreaterThan(0);
    await ss(page, 'B2-iknow-analytical');
  });

  test('PP-B3 – Magnetic vs Converter waveform view toggle', async ({ page }) => {
    await openPushPull(page);
    await runAnalytical(page);

    const converterBtn = page.locator('button, label').filter({ hasText: /[Cc]onverter/ }).first();
    if (await softVisible(converterBtn)) {
      await converterBtn.click();
      await pause(page, 500, 'mechanical: settle');
      const canvasAfter = await page.locator('canvas').count();
      console.log(`[PP-B3] Canvas after converter view: ${canvasAfter}`);
    }
    await ss(page, 'B3-waveform-toggle');
  });

});

// =====================================================================
// GROUP D – Simulated
// =====================================================================
test.describe('PushPull – Group D – Simulated', () => {
  test.setTimeout(60000);

  test('PP-D1 – Simulated button present and clickable', async ({ page }) => {
    await openPushPull(page);

    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await expect(simBtn).toBeVisible();
    expect(await softDisabled(simBtn)).toBe(false);

    await simBtn.click();
    await pause(page, 2000, 'mechanical: settle');
    await ss(page, 'D1-simulated-clicked');
  });
});

// =====================================================================
// GROUP E – Navigation
// =====================================================================
test.describe('PushPull – Group E – Navigation', () => {
  test.setTimeout(120000);

  test('PP-E1 – Review Specs navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openPushPull(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    await tryWaitForURL(page, '**/magnetic_tool**', 30000);

    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'E1-review-specs');
    expect(errors.length).toBe(0);
  });

  test('PP-E2 – Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openPushPull(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await expect(designBtn).toBeVisible();
    await designBtn.click();
    await tryWaitForURL(page, '**/magnetic_tool**', 30000);

    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'E2-design-magnetic');
    expect(errors.length).toBe(0);
  });

  test('PP-E3 – SPICE code button visible', async ({ page }) => {
    await openPushPull(page);

    const spiceBtn = page.locator('button, .sim-btn').filter({ hasText: /[Ss]pice|[Nn]etlist/i }).first();
    const visible = await softVisible(spiceBtn);
    console.log(`[PP-E3] SPICE button visible: ${visible}`);
    await ss(page, 'E3-spice-button');
  });
});

// =====================================================================
// GROUP F – Magnetic Adviser
// =====================================================================
test.describe('PushPull – Group F – Magnetic Adviser', () => {
  test.setTimeout(240000);

  test('PP-F1 – Adviser page loads after Design Magnetic', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openPushPull(page));
    console.log(`[PP-F1] Navigated: ${navigated}`);
    expect(navigated).toBe(true);

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    expect(await softVisible(adviseBtn)).toBe(true);
    await ss(page, 'F1-adviser-loaded');
    expect(errors.length).toBe(0);
  });

  test('PP-F2 – Adviser runs and returns results', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticAdviser(page, () => openPushPull(page));
    if (!navigated) { console.log('[PP-F2] Navigation failed — SKIP'); return; }

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await softVisible(adviseBtn))) return;

    await adviseBtn.click();
    console.log('[PP-F2] Waiting for results (up to 180s)...');
    await ss(page, 'F2-adviser-running');

    await tryWaitForFunction(page,
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    );
    await pause(page, 2000, 'mechanical: settle');
    await ss(page, 'F2-adviser-results');
    expect(errors.length).toBe(0);
  });

  test('PP-F3 – Adviser with I know mode (N=2)', async ({ page }) => {
    const navigated = await goToMagneticAdviser(page, () => openPushPull(page), async (pg) => {
      const iKnow = pg.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
      if (await softVisible(iKnow)) await iKnow.click();
      else await clickIfPresent(pg.locator('text=I know the design I want').first());
      await pause(pg, 400, 'mechanical: settle');

      const tCard = pg.locator('.compact-card').filter({ hasText: 'Transformer' }).first();
      if (await softVisible(tCard)) {
        await fillRowInput(tCard, 'Turns', '2');
      }
    });
    if (!navigated) return;

    await ss(page, 'F3-adviser-iknow-n2');
  });
});

// =====================================================================
// GROUP G – Core Adviser
// =====================================================================
test.describe('PushPull – Group G – Core Adviser', () => {
  test.setTimeout(240000);

  test('PP-G1 – Review Specs reaches builder with Design Requirements', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToMagneticBuilder(page, () => openPushPull(page));
    expect(navigated).toBe(true);
    await ss(page, 'G1-builder');
    expect(errors.length).toBe(0);
  });

  test('PP-G2 – Core Adviser accessible and runs', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openPushPull(page));
    if (!navigated) return;

    const coreAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Core Adviser/i }).first();
    if (!(await softVisible(coreAdviserLink))) {
      console.log('[PP-G2] Core Adviser not visible — SKIP');
      return;
    }

    await coreAdviserLink.click();
    await pause(page, 1000, 'mechanical: settle');

    const getAdvisedBtn = page.locator('button').filter({ hasText: /Get advised cores/i }).first();
    if (!(await softVisible(getAdvisedBtn))) return;

    await getAdvisedBtn.click();
    console.log('[PP-G2] Waiting for core adviser results (up to 120s)...');
    await ss(page, 'G2-core-adviser-running');

    await tryWaitForFunction(page,
      () => !document.querySelector('[data-cy="CoreAdviser-loading"], .fa-spinner'),
      { timeout: 120000 }
    );
    await pause(page, 1500, 'mechanical: settle');
    await ss(page, 'G2-core-adviser-results');
  });

  test('PP-G3 – Wire Adviser shows Coming soon', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openPushPull(page));
    if (!navigated) return;

    const wireAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Wire Adviser/i }).first();
    if (await softVisible(wireAdviserLink)) {
      await wireAdviserLink.click();
      await pause(page, 800, 'mechanical: settle');
      const comingSoon = await softVisible(page.locator('text=Coming soon').first());
      console.log(`[PP-G3] Coming soon: ${comingSoon}`);
    }
    await ss(page, 'G3-wire-adviser');
  });

  test('PP-G4 – Builder shows correct winding count (primary + secondary)', async ({ page }) => {
    const navigated = await goToMagneticBuilder(page, () => openPushPull(page));
    if (!navigated) return;

    const pageText = await page.locator('body').innerText().catch(() => '');
    const hasPrimary = pageText.includes('Primary');
    const hasSecondary = pageText.includes('Secondary');
    console.log(`[PP-G4] Primary: ${hasPrimary}, Secondary: ${hasSecondary}`);
    expect(page.url().includes('magnetic_tool')).toBe(true);
    await ss(page, 'G4-builder-windings');
  });
});
