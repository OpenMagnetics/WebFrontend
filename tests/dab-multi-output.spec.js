/**
 * Multi-Output DAB Wizard Tests
 * Tests the Number of Outputs feature in the DAB wizard.
 */
import { test, expect } from './_coverage.js';
import {
  BASE_URL,
  isBenign,
  screenshot,
  openDabWizard,
  runAnalytical,
  outputsCard,
  switchToIKnowMode,
} from './utils.js';

const ss = (page, name) => screenshot(page, 'dab-multi-output', name);

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Set the number of outputs in the Outputs card.
 * Tries the <select> inside the Outputs card first, then falls back to a global select.
 */
async function setNumberOfOutputs(page, n) {
  const card = outputsCard(page);
  const cardVisible = await card.isVisible().catch(() => false);

  if (cardVisible) {
    const sel = card.locator('select').first();
    if (await sel.isVisible().catch(() => false)) {
      await sel.selectOption(String(n));
      console.log(`[setOutputs] Selected ${n} via card select`);
      return;
    }
  }

  // Fallback: find any select that has option value matching n
  const allSelects = await page.locator('select').all();
  for (const sel of allSelects) {
    const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.value));
    if (opts.includes(String(n))) {
      await sel.selectOption(String(n));
      console.log(`[setOutputs] Selected ${n} via global select fallback`);
      return;
    }
  }

  console.warn(`[setOutputs] Could not find select for ${n} outputs`);
}

// ── Tests ──────────────────────────────────────────────────────────────────

test.describe('Multi-Output DAB Wizard', () => {
  test.setTimeout(120000);

  test('MO1 – Two-output "Help me" mode: Outputs card shows 4 inputs (V1,I1,V2,I2)', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isBenign(msg.text())) {
        console.log(`[CONSOLE ERROR] ${msg.text()}`);
        errors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      console.log(`[PAGE ERROR] ${err.message}`);
      errors.push(err.message);
    });

    // Step 1: Navigate
    await openDabWizard(page);
    await ss(page, '01-initial-load');

    // Step 2: Verify "Number of Outputs" selector is present
    const numberOutputsLabel = page.locator('text=Number of Outputs').first();
    const hasLabel = await numberOutputsLabel.isVisible().catch(() => false);
    console.log(`[MO1] Number of Outputs label visible: ${hasLabel}`);
    expect(hasLabel, 'Number of Outputs selector should be visible').toBe(true);

    // Step 3: Change to 2 outputs
    await setNumberOfOutputs(page, 2);
    await page.waitForTimeout(800);
    await ss(page, '02-two-outputs-selected');

    // Step 4: Count inputs in Outputs card — expect exactly 4 (V1, I1, V2, I2)
    const oCard = outputsCard(page);
    await expect(oCard).toBeVisible();
    const outputInputs = await oCard.locator('input[type="number"]').all();
    console.log(`[MO1] Inputs in Outputs card: ${outputInputs.length}`);
    expect(outputInputs.length, `Expected 4 inputs for 2 outputs, got ${outputInputs.length}`).toBe(4);

    // Step 5: Fill values
    await outputInputs[0].fill('400');   // V1
    await outputInputs[1].fill('2.5');   // I1
    await outputInputs[2].fill('200');   // V2
    await outputInputs[3].fill('5');     // I2
    console.log('[MO1] Filled: V1=400V I1=2.5A V2=200V I2=5A');
    await ss(page, '03-values-filled');

    // Step 6: Run Analytical
    await runAnalytical(page);
    await ss(page, '04-after-analytical');

    // Step 7: No error banner
    const errorBanner = page.locator('.error-text').first();
    const hasError = await errorBanner.isVisible().catch(() => false);
    const errorText = hasError ? await errorBanner.innerText().catch(() => '') : '';
    const hasRealError = hasError && errorText.trim().length > 0;
    console.log(`[MO1] Error banner: ${hasRealError} "${errorText}"`);
    if (hasRealError) await ss(page, '05-error-found');

    // Step 8: Design Magnetic should be enabled
    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    const designVisible  = await designBtn.isVisible().catch(() => false);
    const designDisabled = await designBtn.isDisabled().catch(() => true);
    console.log(`[MO1] Design Magnetic visible: ${designVisible}, disabled: ${designDisabled}`);

    if (designVisible && !designDisabled) {
      await designBtn.click();
      await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
      console.log(`[MO1] Navigated to: ${page.url()}`);
      expect(page.url().includes('magnetic_tool'), 'Should navigate to magnetic_tool').toBe(true);
      await ss(page, '06-after-design-magnetic');
    }

    // Assertions
    expect(hasRealError, 'Should have no error banner').toBe(false);
    expect(errors.length, `Console errors: ${errors.join('; ')}`).toBe(0);
  });

  test('MO2 – Two-output "I know" mode: Outputs card shows 6 inputs (V1,I1,n1,V2,I2,n2)', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text());
    });

    // Navigate and switch to "I know" mode first
    await openDabWizard(page);
    await switchToIKnowMode(page);
    await page.waitForTimeout(500);

    // Change to 2 outputs
    await setNumberOfOutputs(page, 2);
    await page.waitForTimeout(800);
    await ss(page, '07-i-know-mode-2-outputs');

    // In "I know" mode: expect 6 inputs (V, I, n per output × 2 outputs)
    const oCard = outputsCard(page);
    const outputInputs = await oCard.locator('input').all();
    console.log(`[MO2] Inputs in "I know" mode (expected 6): ${outputInputs.length}`);
    expect(outputInputs.length, `Expected 6 inputs (V1,I1,n1,V2,I2,n2), got ${outputInputs.length}`).toBe(6);

    // Fill all 6 values
    await outputInputs[0].fill('400'); // V1
    await outputInputs[1].fill('2.5'); // I1
    await outputInputs[2].fill('1.0'); // n1
    await outputInputs[3].fill('200'); // V2
    await outputInputs[4].fill('5');   // I2
    await outputInputs[5].fill('2.0'); // n2
    console.log('[MO2] Filled: V1=400 I1=2.5 n1=1.0 V2=200 I2=5 n2=2.0');
    await ss(page, '08-i-know-mode-filled');

    // Run Analytical
    await runAnalytical(page);
    await ss(page, '09-i-know-mode-final');

    // No errors
    const errorBanner = page.locator('.error-text').first();
    const hasError = await errorBanner.isVisible().catch(() => false);
    const errorText = hasError ? await errorBanner.innerText().catch(() => '') : '';
    const hasRealError = hasError && errorText.trim().length > 0;
    console.log(`[MO2] Error: ${hasRealError} "${errorText}"`);

    expect(hasRealError, `Should have no error in "I know" mode, got: "${errorText}"`).toBe(false);
    expect(errors.length, `Console errors: ${errors.join('; ')}`).toBe(0);
  });
});
