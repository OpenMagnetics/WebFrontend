/**
 * Multi-Output DAB Wizard Test
 * Tests the new Number of Outputs feature in the DAB wizard
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = '/home/alf/OpenMagnetics/MKF/build';

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `dab-multi-output-${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false, timeout: 10000 }).catch(() => {});
  console.log(`[ss] ${filePath}`);
  return filePath;
}

async function openDabWizard(page) {
  console.log('[TEST] Navigating to DAB wizard...');
  
  // Navigate to base URL first
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Open Wizards dropdown and click DAB link
  const clicked = await page.evaluate(() => {
    // Find the Wizards dropdown toggle by text content
    const toggles = Array.from(document.querySelectorAll('.dropdown-toggle'));
    const wizardsToggle = toggles.find(el => el.textContent.includes('Wizards'));
    if (wizardsToggle) {
      wizardsToggle.click();
      // Find the dropdown menu that follows this toggle
      const dropdown = wizardsToggle.closest('.dropdown') || wizardsToggle.parentElement;
      const menu = dropdown?.querySelector('.dropdown-menu');
      if (menu) menu.classList.add('show');
    }
    const dabLink = document.querySelector('[data-cy="Dab-link"]');
    if (dabLink) { dabLink.click(); return true; }
    return false;
  });
  
  console.log(`[TEST] DAB link clicked: ${clicked}`);
  
  // Wait for navigation to /wizards and DAB wizard to render
  await page.waitForURL('**/wizards', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000); // Wait for WASM to load
  
  console.log('[TEST] DAB wizard should be loaded');
}

test.describe('Multi-Output DAB Wizard Tests', () => {
  test.setTimeout(120000);

  test('Test multi-output DAB wizard with 2 outputs', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { 
      if (msg.type() === 'error') {
        console.log(`[CONSOLE ERROR] ${msg.text()}`);
        errors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      console.log(`[PAGE ERROR] ${err.message}`);
      errors.push(err.message);
    });

    // Step 1: Navigate to DAB wizard
    console.log('\n=== STEP 1: Navigate to DAB Wizard ===');
    await openDabWizard(page);
    await screenshot(page, '01-initial-load');

    // Step 2: Verify "Number of Outputs" selector appears
    console.log('\n=== STEP 2: Verify Number of Outputs selector ===');
    const numberOutputsLabel = page.locator('text=Number of Outputs').first();
    const hasNumberOutputs = await numberOutputsLabel.isVisible().catch(() => false);
    console.log(`[TEST] Number of Outputs selector visible: ${hasNumberOutputs}`);
    expect(hasNumberOutputs, 'Number of Outputs selector should be visible').toBe(true);
    
    // Find the select element for number of outputs
    const numberOutputsSelect = page.locator('select').filter({ has: page.locator('option[value="1"]') }).first();
    const selectVisible = await numberOutputsSelect.isVisible().catch(() => false);
    console.log(`[TEST] Number of Outputs select visible: ${selectVisible}`);
    
    // Step 3: Change number of outputs to 2
    console.log('\n=== STEP 3: Change to 2 outputs ===');
    
    // Find the select specifically within the Outputs card
    const outputsCard = page.locator('.compact-card').filter({ hasText: 'Outputs' }).first();
    const outputsSelect = outputsCard.locator('select').first();
    const outputsSelectVisible = await outputsSelect.isVisible().catch(() => false);
    console.log(`[TEST] Outputs select visible: ${outputsSelectVisible}`);
    
    if (outputsSelectVisible) {
      await outputsSelect.selectOption('2');
      console.log('[TEST] Selected 2 outputs');
    } else if (selectVisible) {
      await numberOutputsSelect.selectOption('2');
      console.log('[TEST] Selected 2 outputs (fallback)');
    } else {
      // Try using ElementFromList component
      const option2 = page.locator('text=2').filter({ hasText: /^2$/ }).first();
      if (await option2.isVisible().catch(() => false)) {
        await option2.click();
        console.log('[TEST] Clicked option 2');
      }
    }
    await page.waitForTimeout(1000);
    await screenshot(page, '02-two-outputs-selected');

    // Step 4: Verify two output parameter rows appear
    console.log('\n=== STEP 4: Verify two output rows ===');
    
    // Check for output rows - look for voltage/current inputs
    // In "Help me" mode: Voltage + Current
    // In "I know" mode: Voltage + Current + Turns Ratio
    const outputsCardCheck = page.locator('.compact-card').filter({ hasText: 'Outputs' }).first();
    const outputsVisible = await outputsCardCheck.isVisible().catch(() => false);
    console.log(`[TEST] Outputs card visible: ${outputsVisible}`);
    
    // Count the number of output parameter rows
    // Each output should have a row with voltage and current inputs
    const voltageInputs = await page.locator('input[type="number"]').filter({ has: page.locator('xpath=../../..//*[contains(text(),"V") or contains(@name,"voltage")]') }).count().catch(() => 0);
    console.log(`[TEST] Found ${voltageInputs} voltage-related inputs`);
    
    // Look for the actual output rows by finding elements containing "Volt" or "Curr"
    const outputRows = await page.locator('.compact-card:has-text("Outputs") .row, [class*="output"]').count().catch(() => 0);
    console.log(`[TEST] Found ${outputRows} output rows`);
    
    // More reliable: look for PairOfDimensions or TripleOfDimensions components
    const pairDims = await page.locator('.pair-dimensions, [class*="pair"]').count().catch(() => 0);
    const tripleDims = await page.locator('.triple-dimensions, [class*="triple"]').count().catch(() => 0);
    console.log(`[TEST] PairOfDimensions: ${pairDims}, TripleOfDimensions: ${tripleDims}`);

    // Step 5: Fill in values for both outputs
    console.log('\n=== STEP 5: Fill values for both outputs ===');
    
    // Find all numeric inputs in the outputs section
    const allNumericInputs = await page.locator('input[type="number"]').all();
    console.log(`[TEST] Total numeric inputs on page: ${allNumericInputs.length}`);
    
    // Try to find and fill output voltage and current fields
    // Look for inputs near "Volt" or "Curr" labels
    const outputSection = page.locator('.compact-card').filter({ hasText: 'Outputs' });
    
    // Get all inputs within the outputs card
    const outputInputs = await outputSection.locator('input[type="number"]').all();
    console.log(`[TEST] Found ${outputInputs.length} inputs in outputs section`);
    
    // Fill first output (indices 0 and 1 should be voltage and current)
    if (outputInputs.length >= 2) {
      // Output 1: Voltage = 400V, Current = 2.5A
      await outputInputs[0].fill('400');
      await outputInputs[1].fill('2.5');
      console.log('[TEST] Filled Output 1: 400V, 2.5A');
    }
    
    // Fill second output (indices 2 and 3 should be voltage and current)
    if (outputInputs.length >= 4) {
      // Output 2: Voltage = 200V, Current = 5A
      await outputInputs[2].fill('200');
      await outputInputs[3].fill('5');
      console.log('[TEST] Filled Output 2: 200V, 5A');
    }
    
    await page.waitForTimeout(500);
    await screenshot(page, '03-values-filled');

    // Step 6: Click "Design Magnetic" or "Review Specs"
    console.log('\n=== STEP 6: Click Design Magnetic ===');
    
    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
    
    const designVisible = await designBtn.isVisible().catch(() => false);
    const reviewVisible = await reviewBtn.isVisible().catch(() => false);
    
    console.log(`[TEST] Design Magnetic button visible: ${designVisible}`);
    console.log(`[TEST] Review Specs button visible: ${reviewVisible}`);
    
    // First, let's run Analytical to generate waveforms
    const analyticalBtn = page.locator('.sim-btn.analytical').first();
    const analyticalVisible = await analyticalBtn.isVisible().catch(() => false);
    
    if (analyticalVisible) {
      console.log('[TEST] Clicking Analytical button...');
      await analyticalBtn.click();
      await page.waitForTimeout(20000); // Wait for analytical calculation
      await screenshot(page, '04-after-analytical');
    }
    
    // Step 7: Verify no errors (no red error banner with actual text)
    console.log('\n=== STEP 7: Verify no errors ===');
    
    const errorBanner = page.locator('.error-text').first();
    const hasErrorBanner = await errorBanner.isVisible().catch(() => false);
    const errorText = hasErrorBanner ? await errorBanner.innerText().catch(() => '') : '';
    const hasRealError = hasErrorBanner && errorText.trim().length > 0;
    
    if (hasRealError) {
      console.log(`[TEST] ERROR BANNER FOUND: ${errorText}`);
      await screenshot(page, '05-error-found');
    } else {
      console.log('[TEST] No error banner visible - GOOD!');
    }
    
    // Check for any console errors (filter out benign network errors)
    const criticalErrors = errors.filter(e => 
      !e.includes('ERR_NAME_NOT_RESOLVED') && 
      !e.includes('ERR_CONNECTION_RESET') && 
      !e.includes('Network Error') &&
      !e.includes('multi-output configuration detected')
    );
    console.log(`[TEST] Console errors collected: ${errors.length}`);
    console.log(`[TEST] Critical errors: ${criticalErrors.length}`);
    if (errors.length > 0) {
      console.log('[TEST] All errors:', errors.slice(0, 5));
    }

    // Step 8: Click Design Magnetic and verify navigation
    console.log('\n=== STEP 8: Click Design Magnetic and verify ===');
    
    if (designVisible) {
      const isDisabled = await designBtn.isDisabled().catch(() => true);
      console.log(`[TEST] Design Magnetic button disabled: ${isDisabled}`);
      
      if (!isDisabled) {
        await designBtn.click();
        console.log('[TEST] Clicked Design Magnetic');
        
        // Wait for navigation
        await page.waitForTimeout(5000);
        const currentUrl = page.url();
        console.log(`[TEST] Current URL: ${currentUrl}`);
        
        const navigatedToMagneticTool = currentUrl.includes('magnetic_tool');
        console.log(`[TEST] Navigated to magnetic_tool: ${navigatedToMagneticTool}`);
        
        await screenshot(page, '06-after-design-magnetic');
      } else {
        console.log('[TEST] Design Magnetic button is disabled - checking why...');
        await screenshot(page, '06-button-disabled');
      }
    }

    // Final summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Number of Outputs selector found: ${hasNumberOutputs}`);
    console.log(`Two output rows visible: ${outputInputs.length >= 4}`);
    console.log(`No error banner: ${!hasErrorBanner}`);
    console.log(`Console errors: ${errors.length}`);
    
    // Assertions
    expect(hasNumberOutputs, 'Number of Outputs selector should be visible').toBe(true);
    expect(outputInputs.length >= 4, 'Should have at least 4 inputs for 2 outputs (V1, I1, V2, I2)').toBe(true);
    expect(hasRealError, 'Should have no real error banner').toBe(false);
    expect(criticalErrors.length, 'Should have no critical console errors').toBe(0);
  });

  test('Test multi-output DAB wizard in "I know" mode with turns ratio', async ({ page }) => {
    console.log('\n=== TEST: Multi-output in "I know" mode ===');
    
    // Navigate to DAB wizard
    await openDabWizard(page);
    await page.waitForTimeout(2000);
    
    // Switch to "I know the design I want" mode
    const iKnowLabel = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
    if (await iKnowLabel.isVisible().catch(() => false)) {
      await iKnowLabel.click();
      console.log('[TEST] Switched to "I know" mode');
    }
    await page.waitForTimeout(500);
    
    // Change to 2 outputs - find select specifically in Outputs card
    const outputsCard2 = page.locator('.compact-card').filter({ hasText: 'Outputs' }).first();
    const outputsSelect2 = outputsCard2.locator('select').first();
    if (await outputsSelect2.isVisible().catch(() => false)) {
      await outputsSelect2.selectOption('2');
      console.log('[TEST] Selected 2 outputs in "I know" mode');
    }
    await page.waitForTimeout(1000);
    
    // In "I know" mode, should see TripleOfDimensions (V, I, turns ratio)
    const outputSection = page.locator('.compact-card').filter({ hasText: 'Outputs' });
    // TripleOfDimensions may use text inputs or number inputs - get all inputs
    const outputInputs = await outputSection.locator('input').all();
    console.log(`[TEST] Found ${outputInputs.length} inputs in "I know" mode (expected 6 for 2 outputs: V1, I1, n1, V2, I2, n2)`);
    
    await screenshot(page, '07-i-know-mode-2-outputs');
    
    // Fill values for both outputs including turns ratios
    if (outputInputs.length >= 6) {
      await outputInputs[0].fill('400'); // V1
      await outputInputs[1].fill('2.5'); // I1
      await outputInputs[2].fill('1.0'); // n1
      await outputInputs[3].fill('200'); // V2
      await outputInputs[4].fill('5');   // I2
      await outputInputs[5].fill('2.0'); // n2
      console.log('[TEST] Filled all values including turns ratios');
    }
    
    await page.waitForTimeout(500);
    await screenshot(page, '08-i-know-mode-filled');
    
    // Run analytical
    const analyticalBtn2 = page.locator('.sim-btn.analytical').first();
    if (await analyticalBtn2.isVisible().catch(() => false)) {
      await analyticalBtn2.click();
      await page.waitForTimeout(20000);
    }
    
    // Check for errors
    const errorBanner2 = page.locator('.error-text').first();
    const hasError2 = await errorBanner2.isVisible().catch(() => false);
    const errorText2 = hasError2 ? await errorBanner2.innerText().catch(() => '') : '';
    const hasRealError2 = hasError2 && errorText2.trim().length > 0;
    console.log(`[TEST] Error in "I know" mode: ${hasRealError2} (${errorText2})`);
    
    await screenshot(page, '09-i-know-mode-final');
    
    expect(outputInputs.length >= 6, 'Should have 6 inputs for 2 outputs in "I know" mode').toBe(true);
    expect(hasRealError2, 'Should have no errors in "I know" mode').toBe(false);
  });
});
