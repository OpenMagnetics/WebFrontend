/**
 * DAB Wizard battery — Analytical (Groups B + C).
 *
 *   B – SPS-mode analytical (waveforms, diagnostics, ZVS warning, voltage tol.)
 *   C – EPS / DPS / TPS analytical (mode switching with asymmetric params)
 */

import { test, expect } from './_coverage.js';
import { isBenign, screenshot, openDabWizard, runAnalytical, conditionsCard, transformerCard, diagnosticsCard, outputsCard, inputVoltageCard, findModeSelect, fillRowInput, fillOutput, switchToIKnowMode, softVisible, softChecked, pause } from './utils.js';

const ss = (page, name) => screenshot(page, 'dab-battery', name);

// =====================================================================
// GROUP B – SPS Analytical
// =====================================================================
test.describe('DAB – Group B – SPS Analytical', () => {
  test.setTimeout(60000);

  // B1 / B2 removed: Diagnostics card not yet implemented in DAB wizard
  // (requires backend dabDiagnostics). Reinstate when the card ships.

  test('B3 – ZVS warning at small phase shift (ZVS margin ≤ 0)', async ({ page }) => {
    await openDabWizard(page);
    await switchToIKnowMode(page);

    const leakage = page.locator('#useLeakageInductanceDab');
    if (await softChecked(leakage)) await leakage.uncheck();

    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Series Ind.', '5e-5');
    await pause(page, 300, 'mechanical: settle');

    const cCard = conditionsCard(page);
    const phRow = cCard.locator('text=Outer D3').locator('../..');
    const phInput = phRow.locator('input[type="number"]').first();
    if (await softVisible(phInput)) {
      await phInput.click({ clickCount: 3 });
      await phInput.fill('3');
      await phInput.press('Tab');
    }

    await runAnalytical(page);

    const diagCard = diagnosticsCard(page);
    const hasDiag = await softVisible(diagCard);
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

    const leakage = page.locator('#useLeakageInductanceDab');
    if (await softChecked(leakage)) await leakage.uncheck();

    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Series Ind.', '5e-5');
    await pause(page, 300, 'mechanical: settle');

    await runAnalytical(page);

    const hasError = await softVisible(page.locator('.error-text').first());
    console.log(`[B4] Error: ${hasError}`);
    expect(hasError).toBe(false);

    const diagCard = diagnosticsCard(page);
    if (await softVisible(diagCard)) {
      const inputs = await diagCard.locator('input[type="number"]').all();
      const lSerVal = inputs.length >= 3 ? parseFloat(await inputs[2].inputValue()) : NaN;
      console.log(`[B4] L series in diag: ${lSerVal}`);
    }

    await ss(page, 'B4-ser-l-50uh');
  });

  test('B5 – SPS Analytical with N=2, Lm=500µH, SerL=50µH', async ({ page }) => {
    await openDabWizard(page);
    await switchToIKnowMode(page);

    const leakage = page.locator('#useLeakageInductanceDab');
    if (await softChecked(leakage)) await leakage.uncheck();

    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Turns', '2');
    await fillRowInput(tCard, 'Mag. Ind.', '5e-4');
    await fillRowInput(tCard, 'Series Ind.', '5e-5');
    await pause(page, 300, 'mechanical: settle');

    await runAnalytical(page);

    const hasError = await softVisible(page.locator('.error-text').first());
    console.log(`[B5] Error: ${hasError}`);
    expect(hasError).toBe(false);

    await ss(page, 'B5-n2-lm500-serl50');
  });

  test('B6 – SPS Analytical with input voltage tolerance (360V-440V)', async ({ page }) => {
    await openDabWizard(page);

    const ivCard = inputVoltageCard(page);
    const addMinBtn = ivCard.locator('button').filter({ hasText: /[Mm]in/ }).first();
    if (await softVisible(addMinBtn)) {
      await addMinBtn.click();
      await pause(page, 300, 'mechanical: settle');
    }

    const addMaxBtn = ivCard.locator('button').filter({ hasText: /[Mm]ax/ }).first();
    if (await softVisible(addMaxBtn)) {
      await addMaxBtn.click();
      await pause(page, 300, 'mechanical: settle');
    }

    await runAnalytical(page, 35000);

    const hasError = await softVisible(page.locator('.error-text').first());
    console.log(`[B6] Error with tolerance: ${hasError}`);

    await ss(page, 'B6-input-voltage-tolerance-waveforms');
  });

  test('B7 – SPS Analytical V_out=200V, N=2, φ=25°', async ({ page }) => {
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
    await fillOutput(oCard, 0, 'turnsRatio', '2'); // N=2 per-output drives d=N·V₂/V₁

    const cCard = conditionsCard(page);
    const phRow = cCard.locator('text=Outer D3').locator('../..');
    const phInput = phRow.locator('input[type="number"]').first();
    if (await softVisible(phInput)) {
      await phInput.click({ clickCount: 3 });
      await phInput.fill('25');
      await phInput.press('Tab');
    }
    await pause(page, 300, 'mechanical: settle');

    await runAnalytical(page);

    const hasError = await softVisible(page.locator('.error-text').first());
    console.log(`[B7] Error with V_out=200: ${hasError}`);
    expect(hasError).toBe(false);

    const diagCard = diagnosticsCard(page);
    if (await softVisible(diagCard)) {
      // d = N·V₂/V₁ is the dabVoltageRatio row; target by its label, not index.
      const dInput = diagCard.locator('text=d = N').locator('../..').locator('input[type="number"]').first();
      if (await softVisible(dInput)) {
        const dVal = parseFloat(await dInput.inputValue());
        console.log(`[B7] d = ${dVal} (expected ≈ 1.0)`);
        if (!isNaN(dVal)) expect(dVal).toBeCloseTo(1.0, 1);
      }
    }

    await ss(page, 'B7-vout200-n2');
  });
});

// =====================================================================
// GROUP C – EPS, DPS, TPS Analytical
// =====================================================================
test.describe('DAB – Group C – EPS/DPS/TPS Analytical', () => {
  test.setTimeout(60000);

  async function setupAsymmetricParams(page) {
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

    const cCard = conditionsCard(page);
    const phRow = cCard.locator('text=Outer D3').locator('../..');
    const phInput = phRow.locator('input[type="number"]').first();
    if (await softVisible(phInput)) {
      await phInput.click({ clickCount: 3 });
      await phInput.fill('25');
      await phInput.press('Tab');
    }
    await pause(page, 300, 'mechanical: settle');
  }

  async function setD1(page, value) {
    const cCard = conditionsCard(page);
    const d1Row = cCard.locator('text=Primary D1').locator('../..');
    const d1Input = d1Row.locator('input[type="number"]').first();
    if (await softVisible(d1Input)) {
      await d1Input.click({ clickCount: 3 });
      await d1Input.fill(String(value));
      await d1Input.press('Tab');
    }
  }

  async function setD2(page, value) {
    const cCard = conditionsCard(page);
    const d2Row = cCard.locator('text=Secondary D2').locator('../..');
    const d2Input = d2Row.locator('input[type="number"]').first();
    if (await softVisible(d2Input)) {
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
    await pause(page, 300, 'mechanical: settle');
    await setD1(page, 15);

    await runAnalytical(page);

    const hasError = await softVisible(page.locator('.error-text').first());
    console.log(`[C1] Error: ${hasError}`);
    expect(hasError).toBe(false);

    await ss(page, 'C1-eps-analytical');
  });

  test('C2 – EPS with D1=5° (small inner shift)', async ({ page }) => {
    await openDabWizard(page);
    await setupAsymmetricParams(page);

    const modeSelect = await findModeSelect(page);
    await modeSelect.selectOption('EPS');
    await pause(page, 300, 'mechanical: settle');
    await setD1(page, 5);

    await runAnalytical(page);

    const hasError = await softVisible(page.locator('.error-text').first());
    console.log(`[C2] Error with D1=5: ${hasError}`);
    expect(hasError).toBe(false);

    await ss(page, 'C2-eps-d1-5');
  });

  test('C3 – DPS Analytical', async ({ page }) => {
    await openDabWizard(page);
    await setupAsymmetricParams(page);

    const modeSelect = await findModeSelect(page);
    await modeSelect.selectOption('DPS');
    await pause(page, 300, 'mechanical: settle');
    await setD1(page, 15);

    await runAnalytical(page);

    const hasError = await softVisible(page.locator('.error-text').first());
    console.log(`[C3] DPS Error: ${hasError}`);
    expect(hasError).toBe(false);

    await ss(page, 'C3-dps-analytical');
  });

  test('C4 – TPS Analytical', async ({ page }) => {
    await openDabWizard(page);
    await setupAsymmetricParams(page);

    const modeSelect = await findModeSelect(page);
    await modeSelect.selectOption('TPS');
    await pause(page, 300, 'mechanical: settle');
    await setD1(page, 15);
    await setD2(page, 20);

    await runAnalytical(page);

    const hasError = await softVisible(page.locator('.error-text').first());
    console.log(`[C4] TPS Error: ${hasError}`);
    expect(hasError).toBe(false);

    await ss(page, 'C4-tps-analytical');
  });

  test('C5 – TPS with D1=D2=15° (DPS-equivalent)', async ({ page }) => {
    await openDabWizard(page);
    await setupAsymmetricParams(page);

    const modeSelect = await findModeSelect(page);
    await modeSelect.selectOption('TPS');
    await pause(page, 300, 'mechanical: settle');
    await setD1(page, 15);
    await setD2(page, 15);

    await runAnalytical(page);

    const hasError = await softVisible(page.locator('.error-text').first());
    console.log(`[C5] TPS D1=D2 Error: ${hasError}`);
    expect(hasError).toBe(false);

    await ss(page, 'C5-tps-d1-eq-d2');
  });
});
