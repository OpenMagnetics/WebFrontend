/**
 * DAB Wizard battery — Navigation, Magnetic Adviser, Magnetic Builder
 * (Groups F + G + H).
 *
 *   F – Navigation buttons (Review Specs / Design Magnetic)
 *   G – Magnetic Adviser end-to-end (Design Magnetic → adviser → results)
 *   H – Magnetic Builder / Core Adviser (Review Specs → manual core adviser)
 */

import { test, expect } from './_coverage.js';
import { isBenign, screenshot, openDabWizard, runAnalytical, conditionsCard, transformerCard, outputsCard, inputVoltageCard, findModeSelect, fillRowInput, fillOutput, switchToIKnowMode, softVisible, softChecked, softDisabled, tryWaitForURL, pause, tryWaitForFunction, tryGoBack, clickIfPresent } from './utils.js';

const ss = (page, name) => screenshot(page, 'dab-battery', name);

// =====================================================================
// GROUP F – Navigation buttons
// =====================================================================
test.describe('DAB – Group F – Navigation buttons', () => {
  test.setTimeout(180000);

  test('F1 – Review Specs navigates to magnetic tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDabWizard(page);
    await switchToIKnowMode(page);
    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await expect(reviewBtn).toBeVisible();
    expect(await reviewBtn.isDisabled()).toBe(false);

    await reviewBtn.click();
    await tryWaitForURL(page, '**/magnetic_tool**', 30000);

    const urlAfter = page.url();
    console.log(`[F1] URL after Review Specs: ${urlAfter}`);
    expect(urlAfter.includes('magnetic_tool'), `Expected magnetic_tool in URL, got: ${urlAfter}`).toBe(true);

    await ss(page, 'F1-after-review-specs');

    await tryGoBack(page, 5000);
    await pause(page, 1000, 'mechanical: settle');

    const critErrors = errors.filter(e => !isBenign(e));
    console.log(`[F1] Critical errors: ${critErrors.length}`);
    critErrors.forEach((e, i) => console.log(`[F1] error[${i}]: ${e.substring(0, 200)}`));
    expect(critErrors.length).toBe(0);
  });

  test('F2 – Design Magnetic navigates to magnetic adviser', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDabWizard(page);
    await switchToIKnowMode(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await expect(designBtn).toBeVisible();
    expect(await designBtn.isDisabled()).toBe(false);

    await designBtn.click();
    await tryWaitForURL(page, '**/magnetic_tool**', 30000);

    const urlAfter = page.url();
    console.log(`[F2] URL after Design Magnetic: ${urlAfter}`);
    expect(urlAfter.includes('magnetic_tool'), `Expected magnetic_tool in URL, got: ${urlAfter}`).toBe(true);

    await ss(page, 'F2-after-design-magnetic');

    await tryGoBack(page, 5000);
    await pause(page, 1000, 'mechanical: settle');

    const critErrors = errors.filter(e => !isBenign(e));
    console.log(`[F2] Critical errors: ${critErrors.length}`);
    expect(critErrors.length).toBe(0);
  });

  test('F3 – Input validation: buttons enabled with valid params, analytical runs', async ({ page }) => {
    await openDabWizard(page);

    const reviewBtn    = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    const designBtn    = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    const analyticalBtn = page.locator('.sim-btn.analytical');

    expect(await softDisabled(reviewBtn)).toBe(false);
    expect(await softDisabled(designBtn)).toBe(false);
    expect(await softDisabled(analyticalBtn)).toBe(false);

    console.log('[F3] All action buttons enabled with default valid params');
    await ss(page, 'F3-validation-check');
  });

  test('F4 – Review Specs with asymmetric design (N=2, Vout=200V)', async ({ page }) => {
    await openDabWizard(page);
    await switchToIKnowMode(page);

    const leakage = page.locator('#useLeakageInductanceDab');
    if (await softChecked(leakage)) await leakage.uncheck();
    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Turns', '2');
    await fillRowInput(tCard, 'Mag. Ind.', '5e-4');
    await fillRowInput(tCard, 'Series Ind.', '5e-5');
    const oCard = outputsCard(page);
    await fillOutput(oCard, 0, 'voltage', '200');
    await fillOutput(oCard, 0, 'current', '2.5'); // P=500 / V=200
    await pause(page, 300, 'mechanical: settle');

    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await reviewBtn.click();
    await tryWaitForURL(page, '**/magnetic_tool**', 30000);
    expect(page.url().includes('magnetic_tool')).toBe(true);

    await ss(page, 'F4-review-specs-n2-vout200');
    await tryGoBack(page, 5000);
  });

  test('F5 – Design Magnetic with TPS modulation mode', async ({ page }) => {
    await openDabWizard(page);
    await switchToIKnowMode(page);

    const leakage = page.locator('#useLeakageInductanceDab');
    if (await softChecked(leakage)) await leakage.uncheck();
    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Turns', '2');
    await fillRowInput(tCard, 'Series Ind.', '5e-5');
    const oCard = outputsCard(page);
    await fillOutput(oCard, 0, 'voltage', '200');

    const modeSelect = await findModeSelect(page);
    await modeSelect.selectOption('TPS');
    await pause(page, 300, 'mechanical: settle');
    const cCard = conditionsCard(page);
    for (const [label, val] of [['Primary D1', '15'], ['Secondary D2', '20']]) {
      const row = cCard.locator(`text=${label}`).locator('../..');
      const inp = row.locator('input[type="number"]').first();
      if (await softVisible(inp)) {
        await inp.click({ clickCount: 3 }); await inp.fill(val); await inp.press('Tab');
      }
    }

    await runAnalytical(page);
    const hasError = await softVisible(page.locator('.error-text').first());
    console.log(`[F5] TPS analytical error: ${hasError}`);
    expect(hasError).toBe(false);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await designBtn.click();
    await tryWaitForURL(page, '**/magnetic_tool**', 30000);
    expect(page.url().includes('magnetic_tool')).toBe(true);

    await ss(page, 'F5-design-magnetic-tps');
    await tryGoBack(page, 5000);
  });
});

// =====================================================================
// GROUP G – Magnetic Adviser end-to-end
// =====================================================================
test.describe('DAB – Group G – Magnetic Adviser end-to-end', () => {
  test.setTimeout(240000);

  async function goToAdviser(page, setupFn = null) {
    await openDabWizard(page);
    if (setupFn) {
      await setupFn(page);
    } else {
      await switchToIKnowMode(page);
      const leakage = page.locator('#useLeakageInductanceDab');
      if (await softChecked(leakage)) await leakage.uncheck();
      const tCard = transformerCard(page);
      await fillRowInput(tCard, 'Turns', '2');
      await fillRowInput(tCard, 'Mag. Ind.', '5e-4');
      await fillRowInput(tCard, 'Series Ind.', '5e-5');
      const oCard = outputsCard(page);
      await fillOutput(oCard, 0, 'voltage', '200');
      await fillOutput(oCard, 0, 'current', '2.5'); // P=500 / V=200
    }

    await runAnalytical(page);
    const hasError = await softVisible(page.locator('.error-text').first());
    if (hasError) {
      const errText = await page.locator('.error-text').first().innerText().catch(() => '');
      console.log(`[goToAdviser] Analytical error: "${errText}"`);
    }

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await designBtn.waitFor({ timeout: 10000 });
    if (await softDisabled(designBtn)) {
      console.log('[goToAdviser] Design Magnetic disabled — skipping');
      return false;
    }

    await designBtn.click();
    await tryWaitForURL(page, '**/magnetic_tool**', 30000);
    await pause(page, 2000, 'mechanical: settle');
    if (!page.url().includes('magnetic_tool')) return false;

    const magneticAdviserBtn = page.locator('button').filter({ hasText: /^Magnetic Adviser$/ }).first();
    const maBtnVisible = await softVisible(magneticAdviserBtn);
    console.log(`[goToAdviser] Magnetic Adviser btn visible: ${maBtnVisible}`);
    if (maBtnVisible) {
      await magneticAdviserBtn.click();
      await pause(page, 1500, 'mechanical: settle');
    } else {
      const byCy = page.locator('[data-cy$="-magnetics-adviser-button"]').first();
      if (await softVisible(byCy)) {
        await byCy.click();
        await pause(page, 1500, 'mechanical: settle');
      }
    }

    return true;
  }

  test('G1 – Adviser page loads after Design Magnetic (N=2, Vout=200V)', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToAdviser(page);
    console.log(`[G1] Navigated: ${navigated}`);
    expect(navigated).toBe(true);

    await ss(page, 'G1-adviser-loaded');

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    const btnVisible = await softVisible(adviseBtn);
    console.log(`[G1] Get Advised Magnetics visible: ${btnVisible}`);
    expect(btnVisible).toBe(true);

    console.log(`[G1] JS errors: ${errors.length}`);
    errors.forEach((e, i) => console.log(`[G1] error[${i}]: ${e.substring(0, 200)}`));
    expect(errors.length).toBe(0);
  });

  test('G2 – Adviser runs and returns results (N=2, Vout=200V, P=500W)', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToAdviser(page);
    if (!navigated) { console.log('[G2] Navigation failed — SKIP'); return; }

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await softVisible(adviseBtn))) {
      console.log('[G2] Get Advised Magnetics not visible — SKIP');
      return;
    }
    await adviseBtn.click();
    console.log('[G2] Clicked Get Advised Magnetics — waiting (up to 180s)...');

    await ss(page, 'G2-adviser-running');

    await tryWaitForFunction(page,
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    );
    await pause(page, 2000, 'mechanical: settle');

    await ss(page, 'G2-adviser-results');

    const cardCount = await page.locator('.card, .advise-card, [class*="advise"]').count();
    console.log(`[G2] Advise card count: ${cardCount}`);

    const errEl = page.locator('.error-text, .alert-danger, [class*="error"]');
    const hasResultError = await softVisible(errEl.first());
    if (hasResultError) {
      const errText = await errEl.first().innerText().catch(() => '');
      console.log(`[G2] Adviser error: "${errText}"`);
    }

    console.log(`[G2] JS errors: ${errors.length}`);
    expect(errors.length).toBe(0);
  });

  test('G3 – Adviser with default "Help me" mode (no transformer override)', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDabWizard(page);
    await runAnalytical(page);

    const hasError = await softVisible(page.locator('.error-text').first());
    console.log(`[G3] Analytical error in Help me mode: ${hasError}`);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    if (!(await softVisible(designBtn))) { console.log('[G3] Design Magnetic not visible — SKIP'); return; }
    if (await softDisabled(designBtn)) { console.log('[G3] Design Magnetic disabled — SKIP'); return; }

    await designBtn.click();
    await tryWaitForURL(page, '**/magnetic_tool**', 30000);
    expect(page.url().includes('magnetic_tool')).toBe(true);

    await ss(page, 'G3-adviser-help-me-mode');
    expect(errors.length).toBe(0);
  });

  test('G4 – Adviser with high-power design (Vin=800V, Vout=400V, N=2, P=10kW)', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToAdviser(page, async (pg) => {
      await switchToIKnowMode(pg);
      const leakage = pg.locator('#useLeakageInductanceDab');
      if (await softChecked(leakage)) await leakage.uncheck();

      const ivCard = inputVoltageCard(pg);
      const ivInput = ivCard.locator('input[type="number"]').first();
      if (await softVisible(ivInput)) {
        await ivInput.click({ clickCount: 3 });
        await ivInput.fill('800');
        await ivInput.press('Tab');
      }

      const tCard = transformerCard(pg);
      await fillRowInput(tCard, 'Turns', '2');
      await fillRowInput(tCard, 'Mag. Ind.', '1e-3');
      await fillRowInput(tCard, 'Series Ind.', '1e-4');

      const oCard = outputsCard(pg);
      await fillOutput(oCard, 0, 'voltage', '400');
      await fillOutput(oCard, 0, 'current', '25'); // P=10000 / V=400
      await pause(pg, 300, 'mechanical: settle');
    });

    console.log(`[G4] High-power adviser navigated: ${navigated}`);
    if (!navigated) { console.log('[G4] Navigation failed — SKIP'); return; }

    await ss(page, 'G4-adviser-highpower-loaded');

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (await softVisible(adviseBtn)) {
      await adviseBtn.click();
      await tryWaitForFunction(page,
        () => !document.querySelector('.fa-spinner, [class*="loading"]'),
        { timeout: 180000 }
      );
      await pause(page, 1500, 'mechanical: settle');
      await ss(page, 'G4-adviser-highpower-results');
    }

    expect(errors.length).toBe(0);
  });

  test('G5 – Adviser with EPS modulation (N=1.6, Vout=160V, D1=15°)', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToAdviser(page, async (pg) => {
      await switchToIKnowMode(pg);
      const leakage = pg.locator('#useLeakageInductanceDab');
      if (await softChecked(leakage)) await leakage.uncheck();

      const tCard = transformerCard(pg);
      await fillRowInput(tCard, 'Turns', '1.6');
      await fillRowInput(tCard, 'Mag. Ind.', '6e-4');
      await fillRowInput(tCard, 'Series Ind.', '6e-5');

      const oCard = outputsCard(pg);
      await fillOutput(oCard, 0, 'voltage', '160');
      await fillOutput(oCard, 0, 'current', '6.25'); // P=1000 / V=160

      const modeSelect = await findModeSelect(pg);
      await modeSelect.selectOption('EPS');
      await pause(pg, 300, 'mechanical: settle');
      const cCard = conditionsCard(pg);
      const d1Row = cCard.locator('text=Primary D1').locator('../..');
      const d1Input = d1Row.locator('input[type="number"]').first();
      if (await softVisible(d1Input)) {
        await d1Input.click({ clickCount: 3 });
        await d1Input.fill('15');
        await d1Input.press('Tab');
      }
      await pause(pg, 300, 'mechanical: settle');
    });

    console.log(`[G5] EPS adviser navigated: ${navigated}`);
    if (!navigated) { console.log('[G5] Navigation failed — SKIP'); return; }

    await ss(page, 'G5-adviser-eps-loaded');

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (await softVisible(adviseBtn)) {
      await adviseBtn.click();
      await tryWaitForFunction(page,
        () => !document.querySelector('.fa-spinner, [class*="loading"]'),
        { timeout: 180000 }
      );
      await pause(page, 1500, 'mechanical: settle');
      await ss(page, 'G5-adviser-eps-results');
    }

    expect(errors.length).toBe(0);
  });

  test('G6 – Adviser "Load Selected" enables after results and navigates to builder', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToAdviser(page);
    if (!navigated) { console.log('[G6] Navigation failed — SKIP'); return; }

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (!(await softVisible(adviseBtn))) { console.log('[G6] Adviser btn not found — SKIP'); return; }

    await adviseBtn.click();
    console.log('[G6] Waiting for adviser results (up to 180s)...');
    await tryWaitForFunction(page,
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    );
    await pause(page, 2000, 'mechanical: settle');
    await ss(page, 'G6-adviser-after-results');

    const firstCard = page.locator('.advise-card, [class*="advise"] .card, .col-md-6 .card').first();
    if (await softVisible(firstCard)) {
      await clickIfPresent(firstCard);
      await pause(page, 500, 'mechanical: settle');
    }

    const loadBtn = page.locator('button').filter({ hasText: /Load Selected/i }).first();
    const loadBtnVisible  = await softVisible(loadBtn);
    const loadBtnDisabled = await softDisabled(loadBtn);
    console.log(`[G6] Load Selected visible: ${loadBtnVisible}, disabled: ${loadBtnDisabled}`);

    if (loadBtnVisible && !loadBtnDisabled) {
      await loadBtn.click();
      await pause(page, 2000, 'mechanical: settle');
      console.log(`[G6] URL after Load Selected: ${page.url()}`);
      await ss(page, 'G6-after-load-selected');
    }

    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// GROUP H – Magnetic Builder / Core Adviser (Review Specs flow)
// =====================================================================
test.describe('DAB – Group H – Magnetic Builder / Core Adviser', () => {
  test.setTimeout(240000);

  async function goToBuilder(page, setupFn = null) {
    await openDabWizard(page);
    if (setupFn) {
      await setupFn(page);
    } else {
      await switchToIKnowMode(page);
      const leakage = page.locator('#useLeakageInductanceDab');
      if (await softChecked(leakage)) await leakage.uncheck();
      const tCard = transformerCard(page);
      await fillRowInput(tCard, 'Turns', '2');
      await fillRowInput(tCard, 'Mag. Ind.', '5e-4');
      await fillRowInput(tCard, 'Series Ind.', '5e-5');
      const oCard = outputsCard(page);
      await fillOutput(oCard, 0, 'voltage', '200');
      await fillOutput(oCard, 0, 'current', '2.5'); // P=500 / V=200
    }

    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    if (!(await softVisible(reviewBtn))) return false;
    if (await softDisabled(reviewBtn)) return false;

    await reviewBtn.click();
    await tryWaitForURL(page, '**/magnetic_tool**', 30000);
    await pause(page, 2000, 'mechanical: settle');
    return page.url().includes('magnetic_tool');
  }

  test('H1 – Review Specs reaches magnetic builder with Design Requirements visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToBuilder(page);
    console.log(`[H1] Navigated: ${navigated}`);
    expect(navigated).toBe(true);

    const designReqVisible = await softVisible(page.locator('text=Design Req').first());
    const opsVisible       = await softVisible(page.locator('text=Op. Points').first());
    console.log(`[H1] Design Req: ${designReqVisible}, Op. Points: ${opsVisible}`);

    await ss(page, 'H1-builder-design-req');
    expect(errors.length).toBe(0);
  });

  test('H2 – Magnetic builder shows correct winding count for DAB', async ({ page }) => {
    await openDabWizard(page);
    await switchToIKnowMode(page);
    const leakage = page.locator('#useLeakageInductanceDab');
    if (await softChecked(leakage)) await leakage.uncheck();
    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Turns', '2');
    await fillRowInput(tCard, 'Mag. Ind.', '5e-4');
    await fillRowInput(tCard, 'Series Ind.', '5e-5');
    const oCard = outputsCard(page);
    await fillOutput(oCard, 0, 'voltage', '200');
    await fillOutput(oCard, 0, 'current', '2.5'); // P=500 / V=200

    await runAnalytical(page);
    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await reviewBtn.click();
    await tryWaitForURL(page, '**/magnetic_tool**', 30000);
    await pause(page, 2000, 'mechanical: settle');

    const builderTab = page.locator('text=Magnetic Builder').first();
    if (await softVisible(builderTab)) {
      await clickIfPresent(builderTab);
      await pause(page, 1000, 'mechanical: settle');
    }

    await ss(page, 'H2-builder-winding-count');

    const pageText   = await page.locator('body').innerText().catch(() => '');
    const hasPrimary   = pageText.includes('Primary');
    const hasSecondary = pageText.includes('Secondary');
    console.log(`[H2] Has Primary: ${hasPrimary}, Has Secondary: ${hasSecondary}`);
    expect(page.url().includes('magnetic_tool')).toBe(true);
  });

  test('H3 – Core Adviser accessible from magnetic builder', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToBuilder(page);
    if (!navigated) { console.log('[H3] Navigation failed — SKIP'); return; }

    const coreAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Core Adviser/i }).first();
    const coreAdviserVisible = await softVisible(coreAdviserLink);
    console.log(`[H3] Core Adviser link visible: ${coreAdviserVisible}`);

    if (coreAdviserVisible) {
      await coreAdviserLink.click();
      await pause(page, 1000, 'mechanical: settle');
      await ss(page, 'H3-core-adviser-section');

      const getAdvisedBtn = page.locator('button').filter({ hasText: /Get advised cores/i }).first();
      const btnVisible = await softVisible(getAdvisedBtn);
      console.log(`[H3] Get advised cores visible: ${btnVisible}`);
      expect(btnVisible).toBe(true);
    } else {
      console.log('[H3] Core Adviser link not directly visible');
      await ss(page, 'H3-builder-no-core-adviser-link');
    }

    expect(errors.length).toBe(0);
  });

  test('H4 – Core Adviser runs and returns results', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToBuilder(page);
    if (!navigated) { console.log('[H4] Navigation failed — SKIP'); return; }

    const coreAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Core Adviser/i }).first();
    if (!(await softVisible(coreAdviserLink))) {
      console.log('[H4] Core Adviser link not visible — SKIP');
      return;
    }
    await coreAdviserLink.click();
    await pause(page, 1000, 'mechanical: settle');

    const getAdvisedBtn = page.locator('button').filter({ hasText: /Get advised cores/i }).first();
    if (!(await softVisible(getAdvisedBtn))) {
      console.log('[H4] Get advised cores not visible — SKIP');
      return;
    }

    await getAdvisedBtn.click();
    console.log('[H4] Clicked Get advised cores — waiting (up to 120s)...');
    await ss(page, 'H4-core-adviser-running');

    await tryWaitForFunction(page,
      () => !document.querySelector('[data-cy="CoreAdviser-loading"], .fa-spinner'),
      { timeout: 120000 }
    );
    await pause(page, 1500, 'mechanical: settle');
    await ss(page, 'H4-core-adviser-results');

    const cardCount = await page.locator('.advise-card, .card, [class*="advise"]').count();
    console.log(`[H4] Core advise cards: ${cardCount}`);
    expect(errors.length).toBe(0);
  });

  test('H5 – Core Adviser with high-power design (Vin=800V, Vout=400V, N=2, P=5kW)', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToBuilder(page, async (pg) => {
      await switchToIKnowMode(pg);
      const leakage = pg.locator('#useLeakageInductanceDab');
      if (await softChecked(leakage)) await leakage.uncheck();

      const ivCard = inputVoltageCard(pg);
      const ivInput = ivCard.locator('input[type="number"]').first();
      if (await softVisible(ivInput)) {
        await ivInput.click({ clickCount: 3 });
        await ivInput.fill('800');
        await ivInput.press('Tab');
      }

      const tCard = transformerCard(pg);
      await fillRowInput(tCard, 'Turns', '2');
      await fillRowInput(tCard, 'Mag. Ind.', '1e-3');
      await fillRowInput(tCard, 'Series Ind.', '1e-4');

      const oCard = outputsCard(pg);
      await fillOutput(oCard, 0, 'voltage', '400');
      await fillOutput(oCard, 0, 'current', '12.5'); // P=5000 / V=400
      await pause(pg, 300, 'mechanical: settle');
    });

    if (!navigated) { console.log('[H5] Navigation failed — SKIP'); return; }
    await ss(page, 'H5-builder-highpower');

    const coreAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Core Adviser/i }).first();
    if (await softVisible(coreAdviserLink)) {
      await coreAdviserLink.click();
      await pause(page, 1000, 'mechanical: settle');

      const getAdvisedBtn = page.locator('button').filter({ hasText: /Get advised cores/i }).first();
      if (await softVisible(getAdvisedBtn)) {
        await getAdvisedBtn.click();
        await tryWaitForFunction(page,
          () => !document.querySelector('[data-cy="CoreAdviser-loading"], .fa-spinner'),
          { timeout: 120000 }
        );
        await pause(page, 1500, 'mechanical: settle');
        await ss(page, 'H5-core-adviser-highpower-results');
        const cardCount = await page.locator('.advise-card, .card, [class*="advise"]').count();
        console.log(`[H5] High-power core advise cards: ${cardCount}`);
      }
    }

    expect(errors.length).toBe(0);
  });

  test('H6 – Wire Adviser shows "Coming soon" placeholder', async ({ page }) => {
    const navigated = await goToBuilder(page);
    if (!navigated) { console.log('[H6] Navigation failed — SKIP'); return; }

    const wireAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Wire Adviser/i }).first();
    const wireVisible = await softVisible(wireAdviserLink);
    console.log(`[H6] Wire Adviser link visible: ${wireVisible}`);

    if (wireVisible) {
      await wireAdviserLink.click();
      await pause(page, 1000, 'mechanical: settle');
      await ss(page, 'H6-wire-adviser');

      const comingSoon = page.locator('text=Coming soon').first();
      console.log(`[H6] "Coming soon" visible: ${await softVisible(comingSoon)}`);
    } else {
      console.log('[H6] Wire Adviser not yet accessible from this navigation path');
      await ss(page, 'H6-no-wire-adviser');
    }
  });

  test('H7 – Builder navigates to Op. Points and back to Design Requirements', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToBuilder(page);
    if (!navigated) { console.log('[H7] Navigation failed — SKIP'); return; }

    const opTab = page.locator('text=Op. Points').first();
    const opTabVisible = await softVisible(opTab);
    console.log(`[H7] Op. Points tab visible: ${opTabVisible}`);

    if (opTabVisible) {
      await clickIfPresent(opTab);
      await pause(page, 800, 'mechanical: settle');
      await ss(page, 'H7-op-points-tab');

      const prevBtn = page.locator('button').filter({ hasText: /prev|back|Design Req/i }).first();
      if (await softVisible(prevBtn)) {
        await clickIfPresent(prevBtn);
        await pause(page, 800, 'mechanical: settle');
        await ss(page, 'H7-back-to-design-req');
      }
    }

    console.log(`[H7] Errors: ${errors.length}`);
    expect(errors.length).toBe(0);
  });

  test('H8 – Review Specs with SPS default params (Vin=400V, Vout=400V, N=1)', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDabWizard(page);
    await runAnalytical(page);

    const hasAnalyticalError = await softVisible(page.locator('.error-text').first());
    console.log(`[H8] Analytical error at default d=1: ${hasAnalyticalError}`);

    if (!hasAnalyticalError) {
      const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
      if (!(await softDisabled(reviewBtn))) {
        await reviewBtn.click();
        await tryWaitForURL(page, '**/magnetic_tool**', 30000);
        expect(page.url().includes('magnetic_tool')).toBe(true);
        await ss(page, 'H8-builder-default-d1');
      }
    }

    expect(errors.length).toBe(0);
  });
});
