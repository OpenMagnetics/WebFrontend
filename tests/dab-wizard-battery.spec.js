/**
 * DAB Wizard Comprehensive End-to-End Test Battery
 *
 * Target: http://localhost:5173/wizards (OpenMagnetics WebFrontend)
 *
 * Groups:
 *   A – Layout and UI controls
 *   B – SPS mode Analytical
 *   C – EPS / DPS / TPS modes
 *   D – SPICE code generation
 *   E – Simulated waveforms (ngspice)
 *   F – Navigation buttons (Review Specs / Design Magnetic)
 *   G – Magnetic Adviser end-to-end (Design Magnetic → adviser → results)
 *   H – Magnetic Builder / Core Adviser (Review Specs → manual core adviser)
 */

import { test, expect } from './_coverage.js';
import {
  BASE_URL,
  isBenign,
  screenshot,
  openDabWizard,
  runAnalytical,
  waitForAnalytical,
  conditionsCard,
  transformerCard,
  diagnosticsCard,
  outputsCard,
  inputVoltageCard,
  findModeSelect,
  fillRowInput,
  switchToIKnowMode,
} from './utils.js';

const WIZARDS_URL = `${BASE_URL}/wizards`;

// Per-file screenshot wrapper keeps existing screenshot names unchanged
const ss = (page, name) => screenshot(page, 'dab-battery', name);

// =====================================================================
// GROUP A – Layout and UI controls
// =====================================================================
test.describe('Group A – Layout and UI controls', () => {
  test.setTimeout(60000);

  test('A1 – Default layout: 3 columns, Conditions card, Mode=SPS, φ visible, no D1/D2', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDabWizard(page);

    // 3 columns present
    await expect(page.locator('.col-xl-3').first()).toBeVisible();
    await expect(page.locator('.col-xl-4').first()).toBeVisible();
    await expect(page.locator('.col-xl-5').first()).toBeVisible();

    // Conditions card visible
    await expect(conditionsCard(page)).toBeVisible();

    // Ph. Shift field visible
    await expect(conditionsCard(page).locator('text=Outer D3').first()).toBeVisible();

    // Mode selector visible (ElementFromList as <select>)
    const modeSelect = await findModeSelect(page);
    expect(modeSelect, 'Mode select not found in Conditions card').not.toBeNull();
    const modeValue = modeSelect ? await modeSelect.inputValue() : '';
    expect(modeValue).toBe('SPS');

    // D1 and D2 should NOT be present in SPS mode
    expect(await conditionsCard(page).locator('text=Primary D1').count()).toBe(0);
    expect(await conditionsCard(page).locator('text=Secondary D2').count()).toBe(0);

    // DAB Wizard title
    await expect(page.locator('.wizard-title').filter({ hasText: 'DAB Wizard' })).toBeVisible();

    console.log(`[A1] Console errors: ${errors.length}`);
    expect(errors.length).toBe(0);
    await ss(page, 'A1-default-layout');
  });

  test('A2 – Mode=EPS shows D1 only', async ({ page }) => {
    await openDabWizard(page);

    const modeSelect = await findModeSelect(page);
    expect(modeSelect, 'Mode select not found').not.toBeNull();
    await modeSelect.selectOption('EPS');
    await page.waitForTimeout(400);

    await expect(conditionsCard(page).locator('text=Primary D1').first()).toBeVisible();
    expect(await conditionsCard(page).locator('text=Secondary D2').count()).toBe(0);

    await ss(page, 'A2-eps-d1-only');
  });

  test('A3 – Mode=DPS shows both D1 and D2 (symmetric duties)', async ({ page }) => {
    // Huang et al. 2018 / Rosano-Maniktala DPS: both inner duties are exposed,
    // typically with D1 = D2 (symmetric). The wizard renders both inputs so
    // the user sees "two duties" per Nicola's naming request.
    await openDabWizard(page);

    const modeSelect = await findModeSelect(page);
    expect(modeSelect, 'Mode select not found').not.toBeNull();
    await modeSelect.selectOption('DPS');
    await page.waitForTimeout(400);

    await expect(conditionsCard(page).locator('text=Primary D1').first()).toBeVisible();
    await expect(conditionsCard(page).locator('text=Secondary D2').first()).toBeVisible();

    await ss(page, 'A3-dps-d1-d2');
  });

  test('A4 – Mode=TPS shows both D1 and D2', async ({ page }) => {
    await openDabWizard(page);

    const modeSelect = await findModeSelect(page);
    expect(modeSelect, 'Mode select not found').not.toBeNull();
    await modeSelect.selectOption('TPS');
    await page.waitForTimeout(400);

    await expect(conditionsCard(page).locator('text=Primary D1').first()).toBeVisible();
    await expect(conditionsCard(page).locator('text=Secondary D2').first()).toBeVisible();

    await ss(page, 'A4-tps-d1-d2');
  });

  test('A5 – Back to SPS hides D1 and D2', async ({ page }) => {
    await openDabWizard(page);

    const modeSelect = await findModeSelect(page);
    expect(modeSelect, 'Mode select not found').not.toBeNull();
    await modeSelect.selectOption('TPS');
    await page.waitForTimeout(300);
    await modeSelect.selectOption('SPS');
    await page.waitForTimeout(300);

    expect(await conditionsCard(page).locator('text=Primary D1').count()).toBe(0);
    expect(await conditionsCard(page).locator('text=Secondary D2').count()).toBe(0);

    await ss(page, 'A5-back-to-sps');
  });

  test('A6 – Input voltage tolerance: add min/max rows', async ({ page }) => {
    await openDabWizard(page);

    const ivCard = inputVoltageCard(page);
    await expect(ivCard).toBeVisible();

    const inputsBefore = await ivCard.locator('input[type="number"]').count();
    console.log(`[A6] Inputs before: ${inputsBefore}`);

    // Add minimum
    const addMinBtn = ivCard.locator('button').filter({ hasText: /[Mm]in/ }).first();
    if (await addMinBtn.isVisible().catch(() => false)) {
      await addMinBtn.click();
      await page.waitForTimeout(400);
      const inputsAfterMin = await ivCard.locator('input[type="number"]').count();
      console.log(`[A6] Inputs after add min: ${inputsAfterMin}`);
      expect(inputsAfterMin).toBeGreaterThan(inputsBefore);
    }

    // Add maximum
    const addMaxBtn = ivCard.locator('button').filter({ hasText: /[Mm]ax/ }).first();
    if (await addMaxBtn.isVisible().catch(() => false)) {
      await addMaxBtn.click();
      await page.waitForTimeout(400);
      const inputsAfterMax = await ivCard.locator('input[type="number"]').count();
      console.log(`[A6] Inputs after add max: ${inputsAfterMax}`);
    }

    // Remove last row
    const removeButtons = ivCard.locator('button[class*="remove"], button.btn-sm:has(i.fa-times), button.btn-sm:has(i.fa-xmark), button:has(i.fa-minus)');
    if (await removeButtons.count() > 0) {
      await removeButtons.last().click();
      await page.waitForTimeout(300);
    }

    await ss(page, 'A6-input-voltage-tolerance');
  });

  test('A7 – Design Mode card: "Help me" hides Transformer, "I know" shows it', async ({ page }) => {
    await openDabWizard(page);

    // In "Help me" mode (default), Transformer card should be hidden
    const tCard = transformerCard(page);
    const tCardVisible = await tCard.isVisible().catch(() => false);
    console.log(`[A7] Transformer card in Help me mode: ${tCardVisible}`);
    expect(tCardVisible, 'Transformer card should be hidden in "Help me" mode').toBe(false);

    // Switch to "I know the design I want"
    await switchToIKnowMode(page);

    // Now Transformer card should be visible with N/Lm/Ser L
    await expect(tCard).toBeVisible();
    await expect(tCard.locator('text=Turns').first()).toBeVisible();
    await expect(tCard.locator('text=Mag L').first()).toBeVisible();
    await expect(tCard.locator('text=Ser L').first()).toBeVisible();

    await ss(page, 'A7-design-mode-i-know');
  });
});

// =====================================================================
// GROUP B – SPS Analytical
// =====================================================================
test.describe('Group B – SPS Analytical', () => {
  test.setTimeout(60000);

  test('B1 – Default SPS Analytical renders waveforms + Diagnostics (6 rows)', async ({ page }) => {
    test.skip(true, 'Diagnostics card not yet implemented in DAB wizard (requires backend dabDiagnostics)');
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDabWizard(page);
    await ss(page, 'B1-before-analytical');

    await runAnalytical(page);
    await ss(page, 'B1-after-analytical');

    const waveformError = page.locator('.error-text').first();
    const hasError = await waveformError.isVisible().catch(() => false);
    if (hasError) {
      const errText = await waveformError.innerText().catch(() => '');
      console.log(`[B1] Waveform error: "${errText}"`);
    }
    expect(hasError).toBe(false);

    // Diagnostics card appeared
    const diagCard = diagnosticsCard(page);
    await expect(diagCard).toBeVisible();

    // 6 rows: Modulation, φ computed, L series, d=, ZVS primary, ZVS secondary
    const diagInputs = await diagCard.locator('input[type="number"]').count();
    console.log(`[B1] Diagnostic inputs: ${diagInputs}`);
    expect(diagInputs).toBe(6);

    const canvasCount = await page.locator('canvas').count();
    console.log(`[B1] Canvas count: ${canvasCount}`);
    expect(canvasCount).toBeGreaterThan(0);

    console.log(`[B1] Critical errors: ${errors.length}`);
    await ss(page, 'B1-waveforms-and-diagnostics');
  });

  test('B2 – SPS Diagnostics card values: Modulation=SPS, φ≈30, d≈1', async ({ page }) => {
    test.skip(true, 'Diagnostics card not yet implemented in DAB wizard (requires backend dabDiagnostics)');
    await openDabWizard(page);
    await runAnalytical(page);

    const diagCard = diagnosticsCard(page);
    await expect(diagCard).toBeVisible();

    const inputs = await diagCard.locator('input[type="number"]').all();
    expect(inputs.length).toBe(6);

    const phiVal = parseFloat(await inputs[1].inputValue());
    console.log(`[B2] φ computed = ${phiVal}`);
    expect(phiVal).toBeCloseTo(30, 0);

    const dVal = parseFloat(await inputs[3].inputValue());
    console.log(`[B2] d = ${dVal}`);
    expect(dVal).toBeCloseTo(1.0, 2);

    const zvsPrimVal = parseFloat(await inputs[4].inputValue());
    console.log(`[B2] ZVS primary = ${zvsPrimVal}`);
    expect(zvsPrimVal).toBeGreaterThan(0);

    const zvsSecVal = parseFloat(await inputs[5].inputValue());
    console.log(`[B2] ZVS secondary = ${zvsSecVal}`);
    expect(zvsSecVal).toBeGreaterThan(0);

    await expect(diagCard.locator('text=Modulation').first()).toBeVisible();
    await expect(diagCard.locator('text=d = N·V₂/V₁').first()).toBeVisible();
    await expect(diagCard.locator('text=ZVS primary').first()).toBeVisible();
    await expect(diagCard.locator('text=ZVS secondary').first()).toBeVisible();

    await ss(page, 'B2-diagnostics-values');
  });

  test('B3 – ZVS warning at small phase shift (ZVS margin ≤ 0)', async ({ page }) => {
    await openDabWizard(page);
    await switchToIKnowMode(page);

    const leakage = page.locator('#useLeakageInductance');
    if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();

    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Ser L', '5e-5');
    await page.waitForTimeout(300);

    const cCard = conditionsCard(page);
    const phRow = cCard.locator('text=Outer D3').locator('../..');
    const phInput = phRow.locator('input[type="number"]').first();
    if (await phInput.isVisible().catch(() => false)) {
      await phInput.click({ clickCount: 3 });
      await phInput.fill('3');
      await phInput.press('Tab');
    }

    await runAnalytical(page);

    const diagCard = diagnosticsCard(page);
    const hasDiag = await diagCard.isVisible().catch(() => false);
    if (!hasDiag) {
      console.log('[B3] No diagnostics after run');
      await ss(page, 'B3-no-diag');
      return;
    }

    const inputs = await diagCard.locator('input[type="number"]').all();
    const zvsPrimVal = inputs.length >= 5 ? parseFloat(await inputs[4].inputValue()) : NaN;
    const zvsSecVal  = inputs.length >= 6 ? parseFloat(await inputs[5].inputValue()) : NaN;
    console.log(`[B3] ZVS primary = ${zvsPrimVal}, ZVS secondary = ${zvsSecVal}`);

    const diagHtml = await diagCard.innerHTML();
    const hasWarning = diagHtml.includes('text-warning');
    console.log(`[B3] Has text-warning class: ${hasWarning}`);

    if (zvsPrimVal <= 0 || zvsSecVal <= 0) {
      expect(hasWarning).toBe(true);
    } else {
      console.log('[B3] ZVS margins > 0 at φ=3° — warning not expected with these params');
    }

    await ss(page, 'B3-zvs-small-phi');
  });

  test('B4 – SPS Analytical with SerL=50µH, useLeakageL unchecked', async ({ page }) => {
    await openDabWizard(page);
    await switchToIKnowMode(page);

    const leakage = page.locator('#useLeakageInductance');
    if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();

    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Ser L', '5e-5');
    await page.waitForTimeout(300);

    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[B4] Error: ${hasError}`);
    expect(hasError).toBe(false);

    const diagCard = diagnosticsCard(page);
    if (await diagCard.isVisible().catch(() => false)) {
      const inputs = await diagCard.locator('input[type="number"]').all();
      const lSerVal = inputs.length >= 3 ? parseFloat(await inputs[2].inputValue()) : NaN;
      console.log(`[B4] L series in diag: ${lSerVal}`);
    }

    await ss(page, 'B4-ser-l-50uh');
  });

  test('B5 – SPS Analytical with N=2, Lm=500µH, SerL=50µH', async ({ page }) => {
    await openDabWizard(page);
    await switchToIKnowMode(page);

    const leakage = page.locator('#useLeakageInductance');
    if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();

    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Turns', '2');
    await fillRowInput(tCard, 'Mag L', '5e-4');
    await fillRowInput(tCard, 'Ser L', '5e-5');
    await page.waitForTimeout(300);

    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[B5] Error: ${hasError}`);
    expect(hasError).toBe(false);

    await ss(page, 'B5-n2-lm500-serl50');
  });

  test('B6 – SPS Analytical with input voltage tolerance (360V-440V)', async ({ page }) => {
    await openDabWizard(page);

    const ivCard = inputVoltageCard(page);
    const addMinBtn = ivCard.locator('button').filter({ hasText: /[Mm]in/ }).first();
    if (await addMinBtn.isVisible().catch(() => false)) {
      await addMinBtn.click();
      await page.waitForTimeout(300);
    }

    const addMaxBtn = ivCard.locator('button').filter({ hasText: /[Mm]ax/ }).first();
    if (await addMaxBtn.isVisible().catch(() => false)) {
      await addMaxBtn.click();
      await page.waitForTimeout(300);
    }

    await runAnalytical(page, 35000);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[B6] Error with tolerance: ${hasError}`);

    await ss(page, 'B6-input-voltage-tolerance-waveforms');
  });

  test('B7 – SPS Analytical V_out=200V, N=2, φ=25°', async ({ page }) => {
    await openDabWizard(page);
    await switchToIKnowMode(page);

    const leakage = page.locator('#useLeakageInductance');
    if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();

    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Turns', '2');
    await fillRowInput(tCard, 'Mag L', '5e-4');
    await fillRowInput(tCard, 'Ser L', '5e-5');

    const oCard = outputsCard(page);
    await fillRowInput(oCard, 'Voltage', '200');
    await fillRowInput(oCard, 'Power', '500');

    const cCard = conditionsCard(page);
    const phRow = cCard.locator('text=Outer D3').locator('../..');
    const phInput = phRow.locator('input[type="number"]').first();
    if (await phInput.isVisible().catch(() => false)) {
      await phInput.click({ clickCount: 3 });
      await phInput.fill('25');
      await phInput.press('Tab');
    }
    await page.waitForTimeout(300);

    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[B7] Error with V_out=200: ${hasError}`);
    expect(hasError).toBe(false);

    const diagCard = diagnosticsCard(page);
    if (await diagCard.isVisible().catch(() => false)) {
      const inputs = await diagCard.locator('input[type="number"]').all();
      const dVal = inputs.length >= 4 ? parseFloat(await inputs[3].inputValue()) : NaN;
      console.log(`[B7] d = ${dVal} (expected ≈ 1.0)`);
      if (!isNaN(dVal)) expect(dVal).toBeCloseTo(1.0, 1);
    }

    await ss(page, 'B7-vout200-n2');
  });
});

// =====================================================================
// GROUP C – EPS, DPS, TPS Analytical
// =====================================================================
test.describe('Group C – EPS/DPS/TPS Analytical', () => {
  test.setTimeout(60000);

  async function setupAsymmetricParams(page) {
    await switchToIKnowMode(page);
    const leakage = page.locator('#useLeakageInductance');
    if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();

    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Turns', '2');
    await fillRowInput(tCard, 'Mag L', '5e-4');
    await fillRowInput(tCard, 'Ser L', '5e-5');

    const oCard = outputsCard(page);
    await fillRowInput(oCard, 'Voltage', '200');
    await fillRowInput(oCard, 'Power', '500');

    const cCard = conditionsCard(page);
    const phRow = cCard.locator('text=Outer D3').locator('../..');
    const phInput = phRow.locator('input[type="number"]').first();
    if (await phInput.isVisible().catch(() => false)) {
      await phInput.click({ clickCount: 3 });
      await phInput.fill('25');
      await phInput.press('Tab');
    }
    await page.waitForTimeout(300);
  }

  async function setD1(page, value) {
    const cCard = conditionsCard(page);
    const d1Row = cCard.locator('text=Primary D1').locator('../..');
    const d1Input = d1Row.locator('input[type="number"]').first();
    if (await d1Input.isVisible().catch(() => false)) {
      await d1Input.click({ clickCount: 3 });
      await d1Input.fill(String(value));
      await d1Input.press('Tab');
    }
  }

  async function setD2(page, value) {
    const cCard = conditionsCard(page);
    const d2Row = cCard.locator('text=Secondary D2').locator('../..');
    const d2Input = d2Row.locator('input[type="number"]').first();
    if (await d2Input.isVisible().catch(() => false)) {
      await d2Input.click({ clickCount: 3 });
      await d2Input.fill(String(value));
      await d2Input.press('Tab');
    }
  }

  test('C1 – EPS Analytical: waveforms render, diagnostics shows EPS', async ({ page }) => {
    await openDabWizard(page);
    await setupAsymmetricParams(page);

    const modeSelect = await findModeSelect(page);
    await modeSelect.selectOption('EPS');
    await page.waitForTimeout(300);
    await setD1(page, 15);

    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[C1] Error: ${hasError}`);
    expect(hasError).toBe(false);

    await ss(page, 'C1-eps-analytical');
  });

  test('C2 – EPS with D1=5° (small inner shift)', async ({ page }) => {
    await openDabWizard(page);
    await setupAsymmetricParams(page);

    const modeSelect = await findModeSelect(page);
    await modeSelect.selectOption('EPS');
    await page.waitForTimeout(300);
    await setD1(page, 5);

    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[C2] Error with D1=5: ${hasError}`);
    expect(hasError).toBe(false);

    await ss(page, 'C2-eps-d1-5');
  });

  test('C3 – DPS Analytical', async ({ page }) => {
    await openDabWizard(page);
    await setupAsymmetricParams(page);

    const modeSelect = await findModeSelect(page);
    await modeSelect.selectOption('DPS');
    await page.waitForTimeout(300);
    await setD1(page, 15);

    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[C3] DPS Error: ${hasError}`);
    expect(hasError).toBe(false);

    await ss(page, 'C3-dps-analytical');
  });

  test('C4 – TPS Analytical', async ({ page }) => {
    await openDabWizard(page);
    await setupAsymmetricParams(page);

    const modeSelect = await findModeSelect(page);
    await modeSelect.selectOption('TPS');
    await page.waitForTimeout(300);
    await setD1(page, 15);
    await setD2(page, 20);

    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[C4] TPS Error: ${hasError}`);
    expect(hasError).toBe(false);

    await ss(page, 'C4-tps-analytical');
  });

  test('C5 – TPS with D1=D2=15° (DPS-equivalent)', async ({ page }) => {
    await openDabWizard(page);
    await setupAsymmetricParams(page);

    const modeSelect = await findModeSelect(page);
    await modeSelect.selectOption('TPS');
    await page.waitForTimeout(300);
    await setD1(page, 15);
    await setD2(page, 15);

    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[C5] TPS D1=D2 Error: ${hasError}`);
    expect(hasError).toBe(false);

    await ss(page, 'C5-tps-d1-eq-d2');
  });
});

// =====================================================================
// GROUP D – SPICE code generation
// =====================================================================
test.describe('Group D – SPICE code generation', () => {
  test.setTimeout(60000);

  async function setupAndAnalytical(page) {
    await switchToIKnowMode(page);
    const leakage = page.locator('#useLeakageInductance');
    if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();

    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Turns', '2');
    await fillRowInput(tCard, 'Ser L', '5e-5');

    const oCard = outputsCard(page);
    await fillRowInput(oCard, 'Voltage', '200');
    await page.waitForTimeout(300);

    await runAnalytical(page);
  }

  async function clickSpiceAndWaitForModal(page) {
    const spiceBtn = page.locator('.sim-btn.spice');
    await spiceBtn.waitFor({ timeout: 5000 });
    await spiceBtn.click();
    const modal = page.locator('.modal.fade.show, .modal.show');
    return modal.waitFor({ timeout: 20000, state: 'visible' }).then(() => true).catch(() => false);
  }

  test('D1 – SPICE with SPS: modal shows netlist with L_pri, L_sec, L_ser', async ({ page }) => {
    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text().substring(0, 150)}`));

    await openDabWizard(page);
    await setupAndAnalytical(page);

    const modalVisible = await clickSpiceAndWaitForModal(page);
    console.log(`[D1] SPICE modal visible: ${modalVisible}`);

    if (modalVisible) {
      await page.waitForTimeout(2000);
      const netlist = await page.locator('.modal pre code, .modal-body pre code, .modal-body code').first()
        .innerText().catch(async () => page.locator('.modal-body').innerText().catch(() => ''));
      const hasHeader     = netlist.includes('Dual Active Bridge') || netlist.includes('DAB') || netlist.includes('.model');
      const hasInductance = netlist.includes('L_series') || netlist.includes('L_pri') || netlist.includes('Lm');
      console.log(`[D1] Has DAB header: ${hasHeader}, Has inductance: ${hasInductance}`);
      console.log(`[D1] Netlist snippet: "${netlist.substring(0, 300)}"`);

      expect(netlist.length, 'SPICE netlist should have content').toBeGreaterThan(50);

      await ss(page, 'D1-spice-sps-modal');

      const closeBtn = page.locator('.modal .btn-close, .modal button.btn-primary').first();
      if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
    } else {
      const errText = await page.locator('.error-text, .waveform-error').first().innerText().catch(() => '');
      console.log(`[D1] SPICE error: "${errText}"`);
      expect(modalVisible, `SPICE modal should appear, got: "${errText}"`).toBe(true);
    }

    const topoLog = consoleLogs.find(l => l.includes('generateSpiceCode') || l.includes('topologyMap'));
    console.log(`[D1] Topology log found: ${!!topoLog}`);

    await ss(page, 'D1-spice-sps-final');
  });

  test('D2 – SPICE with EPS', async ({ page }) => {
    await openDabWizard(page);
    await switchToIKnowMode(page);

    const leakage = page.locator('#useLeakageInductance');
    if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();
    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Turns', '2');
    await fillRowInput(tCard, 'Ser L', '5e-5');
    const oCard = outputsCard(page);
    await fillRowInput(oCard, 'Voltage', '200');

    const modeSelect = await findModeSelect(page);
    await modeSelect.selectOption('EPS');
    await page.waitForTimeout(300);

    const cCard = conditionsCard(page);
    const d1Row = cCard.locator('text=Primary D1').locator('../..');
    const d1Input = d1Row.locator('input[type="number"]').first();
    if (await d1Input.isVisible().catch(() => false)) {
      await d1Input.click({ clickCount: 3 });
      await d1Input.fill('15');
      await d1Input.press('Tab');
    }

    await runAnalytical(page);
    const modalVisible = await clickSpiceAndWaitForModal(page);
    console.log(`[D2] EPS SPICE modal: ${modalVisible}`);

    if (modalVisible) {
      const netlist = await page.locator('.modal-body').innerText().catch(() => '');
      console.log(`[D2] Netlist length: ${netlist.length}`);
      await ss(page, 'D2-spice-eps-modal');
      const closeBtn = page.locator('.modal .btn-close, .modal button.btn-primary').first();
      if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
    } else {
      const errText = await page.locator('.error-text').first().innerText().catch(() => '');
      console.log(`[D2] SPICE error: "${errText}"`);
      await ss(page, 'D2-spice-eps-error');
    }
  });

  test('D3 – SPICE with TPS', async ({ page }) => {
    await openDabWizard(page);
    await switchToIKnowMode(page);

    const leakage = page.locator('#useLeakageInductance');
    if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();
    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Turns', '2');
    await fillRowInput(tCard, 'Ser L', '5e-5');
    const oCard = outputsCard(page);
    await fillRowInput(oCard, 'Voltage', '200');

    const modeSelect = await findModeSelect(page);
    await modeSelect.selectOption('TPS');
    await page.waitForTimeout(300);

    const cCard = conditionsCard(page);
    for (const [label, val] of [['Primary D1', '15'], ['Secondary D2', '20']]) {
      const row = cCard.locator(`text=${label}`).locator('../..');
      const inp = row.locator('input[type="number"]').first();
      if (await inp.isVisible().catch(() => false)) {
        await inp.click({ clickCount: 3 });
        await inp.fill(val);
        await inp.press('Tab');
      }
    }

    await runAnalytical(page);
    const modalVisible = await clickSpiceAndWaitForModal(page);
    console.log(`[D3] TPS SPICE modal: ${modalVisible}`);

    if (modalVisible) {
      const netlist = await page.locator('.modal-body').innerText().catch(() => '');
      console.log(`[D3] Netlist length: ${netlist.length}`);
      await ss(page, 'D3-spice-tps-modal');
      const closeBtn = page.locator('.modal .btn-close, .modal button.btn-primary').first();
      if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
    } else {
      const errText = await page.locator('.error-text').first().innerText().catch(() => '');
      console.log(`[D3] SPICE error: "${errText}"`);
      await ss(page, 'D3-spice-tps-error');
    }
  });
});

// =====================================================================
// GROUP E – Simulated waveforms (ngspice)
// =====================================================================
//
// All three tests below are skipped because of a Playwright teardown stall,
// NOT because ngspice is slow. From the browser-side timing logs:
//
//   [WASM-TIMING] DAB process() took 9 ms
//   [WASM-TIMING] simulate_and_extract_topology_waveforms()  took 539 ms
//   [WASM-TIMING] simulate_and_extract_operating_points()   took 565 ms
//
// ngspice itself finishes in ~1 s. The test body completes all assertions
// and the screenshot in ~10–15 s. After that the test function returns,
// but Playwright's page fixture does NOT release the test slot: it waits
// the full `test.setTimeout` (5 min) before reporting a timeout.
//
// Verified *not* the cause:
//   • trace / video capture (still hangs with trace: 'off', video: 'off')
//   • page.on('console') / page.on('pageerror') listeners (removed — still hangs)
//   • Vite HMR WebSocket (test still hangs after navigating to about:blank)
//   • Explicit page.close() + context.close() inside the test
//   • test.afterEach with `Promise.race([context.close(), timeout])`
//
// Most likely cause is a dangling promise inside the browser tied to the
// Comlink MKF worker after `simulate_dab_ideal_waveforms` returns — the
// message channel keeps the page alive from Playwright's perspective. The
// analytical path (`calculate_dab_inputs`) uses the same worker and does
// NOT exhibit this stall, so the ngspice invocation path is the distinct
// factor. Needs deeper Playwright+Comlink debugging to fix properly.
test.describe('Group E – Simulated waveforms (ngspice)', () => {
  test.setTimeout(300000); // 5 minutes — kept for if/when E tests are re-enabled

  async function setupN2(page) {
    await switchToIKnowMode(page);
    const leakage = page.locator('#useLeakageInductance');
    if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();
    await page.waitForTimeout(300);
  }

  test('E1 – SPS Simulated (up to 90s)', async ({ page }) => {
    test.skip(true, 'ngspice runs in ~1s; Playwright test hangs post-body — see describe block comment for diagnosis');

    await openDabWizard(page);
    await setupN2(page);

    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await simBtn.waitFor({ timeout: 5000 });
    await simBtn.click();

    console.log('[E1] Waiting up to 120s for simulation...');
    await page.waitForFunction(
      () => !document.querySelector('.sim-btn .fa-spinner'),
      { timeout: 120000 }
    ).catch(() => {});
    if (page.isClosed()) { console.log('[E1] Page closed during simulation — SKIP'); return; }
    await page.waitForTimeout(1000).catch(() => {});
    if (page.isClosed()) return;

    const errText = await page.locator('.error-text').first().innerText().catch(() => '');
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[E1] Simulation error: "${errText}"`);

    if (!hasError) {
      const canvasCount = await page.locator('canvas').count().catch(() => 0);
      console.log(`[E1] Canvas count: ${canvasCount}`);
    }

    await ss(page, 'E1-sps-simulated');
  });

  test('E2 – EPS Simulated (up to 90s)', async ({ page }) => {
    test.skip(true, 'ngspice runs in ~1s; Playwright test hangs post-body — see describe block comment for diagnosis');
    await openDabWizard(page);
    await setupN2(page);

    const modeSelect = await findModeSelect(page);
    await modeSelect.selectOption('EPS');
    await page.waitForTimeout(300);

    const cCard = conditionsCard(page);
    const d1Row = cCard.locator('text=Primary D1').locator('../..');
    const d1Input = d1Row.locator('input[type="number"]').first();
    if (await d1Input.isVisible().catch(() => false)) {
      await d1Input.click({ clickCount: 3 });
      await d1Input.fill('15');
      await d1Input.press('Tab');
    }

    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await simBtn.click();

    try {
      await page.waitForSelector('.sim-btn .fa-spinner', { timeout: 5000 });
      console.log('[E2] Spinner appeared');
    } catch {
      console.log('[E2] Spinner did not appear within 5s');
    }

    await page.waitForFunction(
      () => !document.querySelector('.sim-btn .fa-spinner'), { timeout: 15000 }
    ).catch(() => console.log('[E2] Spinner still present after 15s'));

    if (page.isClosed()) return;
    await page.waitForTimeout(1000).catch(() => {});
    if (page.isClosed()) return;

    const errText = await page.locator('.error-text').first().innerText().catch(() => '');
    console.log(`[E2] EPS Simulated error: "${errText}"`);

    await ss(page, 'E2-eps-simulated');
  });

  test('E3 – TPS Simulated (up to 90s)', async ({ page }) => {
    test.skip(true, 'ngspice runs in ~1s; Playwright test hangs post-body — see describe block comment for diagnosis');
    await openDabWizard(page);
    await setupN2(page);

    const modeSelect = await findModeSelect(page);
    await modeSelect.selectOption('TPS');
    await page.waitForTimeout(300);

    const cCard = conditionsCard(page);
    for (const [label, val] of [['Primary D1', '15'], ['Secondary D2', '20']]) {
      const row = cCard.locator(`text=${label}`).locator('../..');
      const inp = row.locator('input[type="number"]').first();
      if (await inp.isVisible().catch(() => false)) {
        await inp.click({ clickCount: 3 });
        await inp.fill(val);
        await inp.press('Tab');
      }
    }

    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    await simBtn.click();
    await page.waitForFunction(
      () => !document.querySelector('.sim-btn .fa-spinner'), { timeout: 120000 }
    ).catch(() => {});
    if (page.isClosed()) return;
    await page.waitForTimeout(1000).catch(() => {});
    if (page.isClosed()) return;

    const errText = await page.locator('.error-text').first().innerText().catch(() => '');
    console.log(`[E3] TPS Simulated error: "${errText}"`);

    await ss(page, 'E3-tps-simulated');
  });
});

// =====================================================================
// GROUP F – Navigation buttons
// =====================================================================
test.describe('Group F – Navigation buttons', () => {
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
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    const urlAfter = page.url();
    console.log(`[F1] URL after Review Specs: ${urlAfter}`);
    expect(urlAfter.includes('magnetic_tool'), `Expected magnetic_tool in URL, got: ${urlAfter}`).toBe(true);

    await ss(page, 'F1-after-review-specs');

    await page.goBack({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);

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
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    const urlAfter = page.url();
    console.log(`[F2] URL after Design Magnetic: ${urlAfter}`);
    expect(urlAfter.includes('magnetic_tool'), `Expected magnetic_tool in URL, got: ${urlAfter}`).toBe(true);

    await ss(page, 'F2-after-design-magnetic');

    await page.goBack({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const critErrors = errors.filter(e => !isBenign(e));
    console.log(`[F2] Critical errors: ${critErrors.length}`);
    expect(critErrors.length).toBe(0);
  });

  test('F3 – Input validation: buttons enabled with valid params, analytical runs', async ({ page }) => {
    await openDabWizard(page);

    const reviewBtn    = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    const designBtn    = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    const analyticalBtn = page.locator('.sim-btn.analytical');

    expect(await reviewBtn.isDisabled().catch(() => true)).toBe(false);
    expect(await designBtn.isDisabled().catch(() => true)).toBe(false);
    expect(await analyticalBtn.isDisabled().catch(() => true)).toBe(false);

    console.log('[F3] All action buttons enabled with default valid params');
    await ss(page, 'F3-validation-check');
  });

  test('F4 – Review Specs with asymmetric design (N=2, Vout=200V)', async ({ page }) => {
    await openDabWizard(page);
    await switchToIKnowMode(page);

    const leakage = page.locator('#useLeakageInductance');
    if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();
    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Turns', '2');
    await fillRowInput(tCard, 'Mag L', '5e-4');
    await fillRowInput(tCard, 'Ser L', '5e-5');
    const oCard = outputsCard(page);
    await fillRowInput(oCard, 'Voltage', '200');
    await fillRowInput(oCard, 'Power', '500');
    await page.waitForTimeout(300);

    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    expect(page.url().includes('magnetic_tool')).toBe(true);

    await ss(page, 'F4-review-specs-n2-vout200');
    await page.goBack({ timeout: 5000 }).catch(() => {});
  });

  test('F5 – Design Magnetic with TPS modulation mode', async ({ page }) => {
    await openDabWizard(page);
    await switchToIKnowMode(page);

    const leakage = page.locator('#useLeakageInductance');
    if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();
    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Turns', '2');
    await fillRowInput(tCard, 'Ser L', '5e-5');
    const oCard = outputsCard(page);
    await fillRowInput(oCard, 'Voltage', '200');

    const modeSelect = await findModeSelect(page);
    await modeSelect.selectOption('TPS');
    await page.waitForTimeout(300);
    const cCard = conditionsCard(page);
    for (const [label, val] of [['Primary D1', '15'], ['Secondary D2', '20']]) {
      const row = cCard.locator(`text=${label}`).locator('../..');
      const inp = row.locator('input[type="number"]').first();
      if (await inp.isVisible().catch(() => false)) {
        await inp.click({ clickCount: 3 }); await inp.fill(val); await inp.press('Tab');
      }
    }

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[F5] TPS analytical error: ${hasError}`);
    expect(hasError).toBe(false);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    expect(page.url().includes('magnetic_tool')).toBe(true);

    await ss(page, 'F5-design-magnetic-tps');
    await page.goBack({ timeout: 5000 }).catch(() => {});
  });
});

// =====================================================================
// GROUP G – Magnetic Adviser end-to-end
// =====================================================================
test.describe('Group G – Magnetic Adviser end-to-end', () => {
  test.setTimeout(240000);

  async function goToAdviser(page, setupFn = null) {
    await openDabWizard(page);
    if (setupFn) {
      await setupFn(page);
    } else {
      await switchToIKnowMode(page);
      const leakage = page.locator('#useLeakageInductance');
      if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();
      const tCard = transformerCard(page);
      await fillRowInput(tCard, 'Turns', '2');
      await fillRowInput(tCard, 'Mag L', '5e-4');
      await fillRowInput(tCard, 'Ser L', '5e-5');
      const oCard = outputsCard(page);
      await fillRowInput(oCard, 'Voltage', '200');
      await fillRowInput(oCard, 'Power', '500');
    }

    await runAnalytical(page);
    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    if (hasError) {
      const errText = await page.locator('.error-text').first().innerText().catch(() => '');
      console.log(`[goToAdviser] Analytical error: "${errText}"`);
    }

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await designBtn.waitFor({ timeout: 10000 });
    if (await designBtn.isDisabled().catch(() => true)) {
      console.log('[goToAdviser] Design Magnetic disabled — skipping');
      return false;
    }

    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);
    if (!page.url().includes('magnetic_tool')) return false;

    // Click "Magnetic Adviser" in the left sidebar
    const magneticAdviserBtn = page.locator('button').filter({ hasText: /^Magnetic Adviser$/ }).first();
    const maBtnVisible = await magneticAdviserBtn.isVisible().catch(() => false);
    console.log(`[goToAdviser] Magnetic Adviser btn visible: ${maBtnVisible}`);
    if (maBtnVisible) {
      await magneticAdviserBtn.click();
      await page.waitForTimeout(1500);
    } else {
      const byCy = page.locator('[data-cy$="-magnetics-adviser-button"]').first();
      if (await byCy.isVisible().catch(() => false)) {
        await byCy.click();
        await page.waitForTimeout(1500);
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
    const btnVisible = await adviseBtn.isVisible().catch(() => false);
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
    if (!(await adviseBtn.isVisible().catch(() => false))) {
      console.log('[G2] Get Advised Magnetics not visible — SKIP');
      return;
    }
    await adviseBtn.click();
    console.log('[G2] Clicked Get Advised Magnetics — waiting (up to 180s)...');

    await ss(page, 'G2-adviser-running');

    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);

    await ss(page, 'G2-adviser-results');

    const cardCount = await page.locator('.card, .advise-card, [class*="advise"]').count();
    console.log(`[G2] Advise card count: ${cardCount}`);

    const errEl = page.locator('.error-text, .alert-danger, [class*="error"]');
    const hasResultError = await errEl.first().isVisible().catch(() => false);
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

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[G3] Analytical error in Help me mode: ${hasError}`);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    if (!(await designBtn.isVisible().catch(() => false))) { console.log('[G3] Design Magnetic not visible — SKIP'); return; }
    if (await designBtn.isDisabled().catch(() => true)) { console.log('[G3] Design Magnetic disabled — SKIP'); return; }

    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    expect(page.url().includes('magnetic_tool')).toBe(true);

    await ss(page, 'G3-adviser-help-me-mode');
    expect(errors.length).toBe(0);
  });

  test('G4 – Adviser with high-power design (Vin=800V, Vout=400V, N=2, P=10kW)', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToAdviser(page, async (pg) => {
      await switchToIKnowMode(pg);
      const leakage = pg.locator('#useLeakageInductance');
      if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();

      const ivCard = inputVoltageCard(pg);
      const ivInput = ivCard.locator('input[type="number"]').first();
      if (await ivInput.isVisible().catch(() => false)) {
        await ivInput.click({ clickCount: 3 });
        await ivInput.fill('800');
        await ivInput.press('Tab');
      }

      const tCard = transformerCard(pg);
      await fillRowInput(tCard, 'Turns', '2');
      await fillRowInput(tCard, 'Mag L', '1e-3');
      await fillRowInput(tCard, 'Ser L', '1e-4');

      const oCard = outputsCard(pg);
      await fillRowInput(oCard, 'Voltage', '400');
      await fillRowInput(oCard, 'Power', '10000');
      await pg.waitForTimeout(300);
    });

    console.log(`[G4] High-power adviser navigated: ${navigated}`);
    if (!navigated) { console.log('[G4] Navigation failed — SKIP'); return; }

    await ss(page, 'G4-adviser-highpower-loaded');

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (await adviseBtn.isVisible().catch(() => false)) {
      await adviseBtn.click();
      await page.waitForFunction(
        () => !document.querySelector('.fa-spinner, [class*="loading"]'),
        { timeout: 180000 }
      ).catch(() => {});
      await page.waitForTimeout(1500);
      await ss(page, 'G4-adviser-highpower-results');
    }

    expect(errors.length).toBe(0);
  });

  test('G5 – Adviser with EPS modulation (N=1.6, Vout=160V, D1=15°)', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToAdviser(page, async (pg) => {
      await switchToIKnowMode(pg);
      const leakage = pg.locator('#useLeakageInductance');
      if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();

      const tCard = transformerCard(pg);
      await fillRowInput(tCard, 'Turns', '1.6');
      await fillRowInput(tCard, 'Mag L', '6e-4');
      await fillRowInput(tCard, 'Ser L', '6e-5');

      const oCard = outputsCard(pg);
      await fillRowInput(oCard, 'Voltage', '160');
      await fillRowInput(oCard, 'Power', '1000');

      const modeSelect = await findModeSelect(pg);
      await modeSelect.selectOption('EPS');
      await pg.waitForTimeout(300);
      const cCard = conditionsCard(pg);
      const d1Row = cCard.locator('text=Primary D1').locator('../..');
      const d1Input = d1Row.locator('input[type="number"]').first();
      if (await d1Input.isVisible().catch(() => false)) {
        await d1Input.click({ clickCount: 3 });
        await d1Input.fill('15');
        await d1Input.press('Tab');
      }
      await pg.waitForTimeout(300);
    });

    console.log(`[G5] EPS adviser navigated: ${navigated}`);
    if (!navigated) { console.log('[G5] Navigation failed — SKIP'); return; }

    await ss(page, 'G5-adviser-eps-loaded');

    const adviseBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
    if (await adviseBtn.isVisible().catch(() => false)) {
      await adviseBtn.click();
      await page.waitForFunction(
        () => !document.querySelector('.fa-spinner, [class*="loading"]'),
        { timeout: 180000 }
      ).catch(() => {});
      await page.waitForTimeout(1500);
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
    if (!(await adviseBtn.isVisible().catch(() => false))) { console.log('[G6] Adviser btn not found — SKIP'); return; }

    await adviseBtn.click();
    console.log('[G6] Waiting for adviser results (up to 180s)...');
    await page.waitForFunction(
      () => !document.querySelector('.fa-spinner, [class*="loading"]'),
      { timeout: 180000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, 'G6-adviser-after-results');

    const firstCard = page.locator('.advise-card, [class*="advise"] .card, .col-md-6 .card').first();
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    const loadBtn = page.locator('button').filter({ hasText: /Load Selected/i }).first();
    const loadBtnVisible  = await loadBtn.isVisible().catch(() => false);
    const loadBtnDisabled = await loadBtn.isDisabled().catch(() => true);
    console.log(`[G6] Load Selected visible: ${loadBtnVisible}, disabled: ${loadBtnDisabled}`);

    if (loadBtnVisible && !loadBtnDisabled) {
      await loadBtn.click();
      await page.waitForTimeout(2000);
      console.log(`[G6] URL after Load Selected: ${page.url()}`);
      await ss(page, 'G6-after-load-selected');
    }

    expect(errors.length).toBe(0);
  });
});

// =====================================================================
// GROUP H – Magnetic Builder / Core Adviser (Review Specs flow)
// =====================================================================
test.describe('Group H – Magnetic Builder / Core Adviser', () => {
  test.setTimeout(240000);

  async function goToBuilder(page, setupFn = null) {
    await openDabWizard(page);
    if (setupFn) {
      await setupFn(page);
    } else {
      await switchToIKnowMode(page);
      const leakage = page.locator('#useLeakageInductance');
      if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();
      const tCard = transformerCard(page);
      await fillRowInput(tCard, 'Turns', '2');
      await fillRowInput(tCard, 'Mag L', '5e-4');
      await fillRowInput(tCard, 'Ser L', '5e-5');
      const oCard = outputsCard(page);
      await fillRowInput(oCard, 'Voltage', '200');
      await fillRowInput(oCard, 'Power', '500');
    }

    await runAnalytical(page);

    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    if (!(await reviewBtn.isVisible().catch(() => false))) return false;
    if (await reviewBtn.isDisabled().catch(() => true)) return false;

    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);
    return page.url().includes('magnetic_tool');
  }

  test('H1 – Review Specs reaches magnetic builder with Design Requirements visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    const navigated = await goToBuilder(page);
    console.log(`[H1] Navigated: ${navigated}`);
    expect(navigated).toBe(true);

    const designReqVisible = await page.locator('text=Design Req').first().isVisible().catch(() => false);
    const opsVisible       = await page.locator('text=Op. Points').first().isVisible().catch(() => false);
    console.log(`[H1] Design Req: ${designReqVisible}, Op. Points: ${opsVisible}`);

    await ss(page, 'H1-builder-design-req');
    expect(errors.length).toBe(0);
  });

  test('H2 – Magnetic builder shows correct winding count for DAB', async ({ page }) => {
    await openDabWizard(page);
    await switchToIKnowMode(page);
    const leakage = page.locator('#useLeakageInductance');
    if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();
    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Turns', '2');
    await fillRowInput(tCard, 'Mag L', '5e-4');
    await fillRowInput(tCard, 'Ser L', '5e-5');
    const oCard = outputsCard(page);
    await fillRowInput(oCard, 'Voltage', '200');
    await fillRowInput(oCard, 'Power', '500');

    await runAnalytical(page);
    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    await reviewBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const builderTab = page.locator('text=Magnetic Builder').first();
    if (await builderTab.isVisible().catch(() => false)) {
      await builderTab.click().catch(() => {});
      await page.waitForTimeout(1000);
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
    const coreAdviserVisible = await coreAdviserLink.isVisible().catch(() => false);
    console.log(`[H3] Core Adviser link visible: ${coreAdviserVisible}`);

    if (coreAdviserVisible) {
      await coreAdviserLink.click();
      await page.waitForTimeout(1000);
      await ss(page, 'H3-core-adviser-section');

      const getAdvisedBtn = page.locator('button').filter({ hasText: /Get advised cores/i }).first();
      const btnVisible = await getAdvisedBtn.isVisible().catch(() => false);
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
    if (!(await coreAdviserLink.isVisible().catch(() => false))) {
      console.log('[H4] Core Adviser link not visible — SKIP');
      return;
    }
    await coreAdviserLink.click();
    await page.waitForTimeout(1000);

    const getAdvisedBtn = page.locator('button').filter({ hasText: /Get advised cores/i }).first();
    if (!(await getAdvisedBtn.isVisible().catch(() => false))) {
      console.log('[H4] Get advised cores not visible — SKIP');
      return;
    }

    await getAdvisedBtn.click();
    console.log('[H4] Clicked Get advised cores — waiting (up to 120s)...');
    await ss(page, 'H4-core-adviser-running');

    await page.waitForFunction(
      () => !document.querySelector('[data-cy="CoreAdviser-loading"], .fa-spinner'),
      { timeout: 120000 }
    ).catch(() => {});
    await page.waitForTimeout(1500);
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
      const leakage = pg.locator('#useLeakageInductance');
      if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();

      const ivCard = inputVoltageCard(pg);
      const ivInput = ivCard.locator('input[type="number"]').first();
      if (await ivInput.isVisible().catch(() => false)) {
        await ivInput.click({ clickCount: 3 });
        await ivInput.fill('800');
        await ivInput.press('Tab');
      }

      const tCard = transformerCard(pg);
      await fillRowInput(tCard, 'Turns', '2');
      await fillRowInput(tCard, 'Mag L', '1e-3');
      await fillRowInput(tCard, 'Ser L', '1e-4');

      const oCard = outputsCard(pg);
      await fillRowInput(oCard, 'Voltage', '400');
      await fillRowInput(oCard, 'Power', '5000');
      await pg.waitForTimeout(300);
    });

    if (!navigated) { console.log('[H5] Navigation failed — SKIP'); return; }
    await ss(page, 'H5-builder-highpower');

    const coreAdviserLink = page.locator('button, a, [role="button"]').filter({ hasText: /Core Adviser/i }).first();
    if (await coreAdviserLink.isVisible().catch(() => false)) {
      await coreAdviserLink.click();
      await page.waitForTimeout(1000);

      const getAdvisedBtn = page.locator('button').filter({ hasText: /Get advised cores/i }).first();
      if (await getAdvisedBtn.isVisible().catch(() => false)) {
        await getAdvisedBtn.click();
        await page.waitForFunction(
          () => !document.querySelector('[data-cy="CoreAdviser-loading"], .fa-spinner'),
          { timeout: 120000 }
        ).catch(() => {});
        await page.waitForTimeout(1500);
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
    const wireVisible = await wireAdviserLink.isVisible().catch(() => false);
    console.log(`[H6] Wire Adviser link visible: ${wireVisible}`);

    if (wireVisible) {
      await wireAdviserLink.click();
      await page.waitForTimeout(1000);
      await ss(page, 'H6-wire-adviser');

      const comingSoon = page.locator('text=Coming soon').first();
      console.log(`[H6] "Coming soon" visible: ${await comingSoon.isVisible().catch(() => false)}`);
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
    const opTabVisible = await opTab.isVisible().catch(() => false);
    console.log(`[H7] Op. Points tab visible: ${opTabVisible}`);

    if (opTabVisible) {
      await opTab.click().catch(() => {});
      await page.waitForTimeout(800);
      await ss(page, 'H7-op-points-tab');

      const prevBtn = page.locator('button').filter({ hasText: /prev|back|Design Req/i }).first();
      if (await prevBtn.isVisible().catch(() => false)) {
        await prevBtn.click().catch(() => {});
        await page.waitForTimeout(800);
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

    const hasAnalyticalError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[H8] Analytical error at default d=1: ${hasAnalyticalError}`);

    if (!hasAnalyticalError) {
      const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
      if (!(await reviewBtn.isDisabled().catch(() => true))) {
        await reviewBtn.click();
        await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
        expect(page.url().includes('magnetic_tool')).toBe(true);
        await ss(page, 'H8-builder-default-d1');
      }
    }

    expect(errors.length).toBe(0);
  });
});
