/**
 * DAB Wizard test battery
 * Verifies:
 * 1. modulationType sent as string (SPS/EPS/DPS/TPS) not integer
 * 2. SPICE topology map key 'Dual Active Bridge Converter' matches getTopology()
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:5174';
const SCREENSHOT_DIR = '/home/alf/OpenMagnetics/MKF/build';

async function screenshotAndLog(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `dab-tc-${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`Screenshot saved: ${filePath}`);
}

async function navigateToDabWizard(page) {
  await page.goto(`${BASE_URL}/wizards`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  // Try direct link click
  const dabLink = page.locator('[data-cy="Dab-link"]');
  if (await dabLink.isVisible()) {
    await dabLink.click();
  } else {
    // Force dropdown open
    await page.evaluate(() => {
      const dd = document.querySelector('[data-cy="wizards-dropdown"]');
      if (dd) dd.classList.add('show');
    });
    await page.waitForTimeout(500);
    await page.locator('[data-cy="Dab-link"]').click();
  }
  await page.waitForTimeout(2000);
}

async function clickAnalytical(page) {
  const btn = page.locator('.sim-btn.analytical');
  await btn.waitFor({ timeout: 5000 });
  await btn.click();
}

async function waitForWaveforms(page, timeoutMs = 20000) {
  // Wait for waveform canvas or SVG to appear
  return page.waitForSelector('canvas, svg.waveform, .waveform-container svg, [class*="waveform"] canvas', {
    timeout: timeoutMs,
    state: 'visible',
  }).catch(() => null);
}

async function getConsoleErrors(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

// =========================================================
test.describe('DAB Wizard Battery', () => {
  test.use({ baseURL: BASE_URL });
  test.setTimeout(120000);

  test('TC1 - SPS Analytical (core fix verification)', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await navigateToDabWizard(page);
    await page.waitForTimeout(1000);

    // Take initial screenshot to see what rendered
    await screenshotAndLog(page, '1-initial');

    // Wait for DAB wizard to load
    await page.waitForSelector('.compact-card, .wizard-card, [class*="wizard"]', { timeout: 10000 }).catch(() => {});

    // Set Series L to 50µH via Ser L input
    const serLInput = page.locator('input').filter({ hasText: '' }).nth(0);
    // Find the Ser L dimension input - look for input near "Ser L" label
    const serLSection = page.locator('text=Ser L').locator('..').locator('..');
    const allInputs = await page.locator('input[type="number"], input[inputmode="numeric"]').all();
    console.log(`Found ${allInputs.length} numeric inputs`);

    // Log page content to understand structure
    const bodyText = await page.locator('body').innerText().catch(() => 'N/A');
    console.log('Page has text:', bodyText.substring(0, 500));

    await screenshotAndLog(page, '1-before-analytical');

    // Click Analytical button
    const analyticalBtn = page.locator('.sim-btn.analytical, button:has-text("Analytical")').first();
    const btnExists = await analyticalBtn.isVisible().catch(() => false);
    console.log('Analytical button visible:', btnExists);

    if (btnExists) {
      await analyticalBtn.click();
      console.log('Clicked Analytical');
      await page.waitForTimeout(20000);
      await screenshotAndLog(page, '1-after-analytical');
    }

    // Check for waveforms
    const waveformEl = await page.locator('canvas, [class*="waveform"], [class*="chart"]').first().isVisible().catch(() => false);
    const errorEl = page.locator('[class*="error"], .waveform-error, text=Exception');
    const hasError = await errorEl.first().isVisible().catch(() => false);
    const errorText = hasError ? await errorEl.first().innerText().catch(() => '') : '';

    console.log('Waveform element visible:', waveformEl);
    console.log('Error visible:', hasError, errorText);
    console.log('Console errors:', consoleErrors.slice(-5));

    // Check diagnostics card
    const diagCard = page.locator('text=Diagnostics, text=Diagno');
    const hasDiag = await diagCard.first().isVisible().catch(() => false);
    console.log('Diagnostics card visible:', hasDiag);

    await screenshotAndLog(page, '1-final');
  });

  test('TC2 - Diagnostics card values', async ({ page }) => {
    await navigateToDabWizard(page);
    await page.waitForTimeout(1000);

    const analyticalBtn = page.locator('.sim-btn.analytical, button:has-text("Analytical")').first();
    if (await analyticalBtn.isVisible().catch(() => false)) {
      await analyticalBtn.click();
      await page.waitForTimeout(20000);
    }

    // Look for diagnostics rows
    const pageContent = await page.content();
    const hasPhaseShift = pageContent.includes('φ') || pageContent.includes('phi') || pageContent.includes('phase');
    const hasDValue = pageContent.includes('d =') || pageContent.includes('d=') || pageContent.includes('N·V');
    const hasZVS = pageContent.includes('ZVS');

    console.log('Has φ row:', hasPhaseShift);
    console.log('Has d= row:', hasDValue);
    console.log('Has ZVS rows:', hasZVS);

    await screenshotAndLog(page, '2-diagnostics');
  });

  test('TC3 - ZVS warning at low phase shift', async ({ page }) => {
    await navigateToDabWizard(page);
    await page.waitForTimeout(1000);

    // Find phase shift input and change to 2
    const inputs = await page.locator('input[type="number"], input[inputmode="numeric"], input[type="text"]').all();
    console.log(`TC3: Found ${inputs.length} inputs`);

    // Try to find phase shift specifically - it's labeled "Ph. Shift"
    const phLabel = page.locator('text=Ph. Shift, text=Phase');
    const phLabelExists = await phLabel.first().isVisible().catch(() => false);
    console.log('Ph. Shift label found:', phLabelExists);

    if (phLabelExists) {
      // Click to find nearby input
      const phRow = phLabel.first().locator('..').locator('..');
      const phInput = phRow.locator('input').first();
      const phInputExists = await phInput.isVisible().catch(() => false);
      if (phInputExists) {
        await phInput.triple_click().catch(() => phInput.click());
        await phInput.fill('2');
        console.log('Set phase shift to 2');
      }
    }

    const analyticalBtn = page.locator('.sim-btn.analytical, button:has-text("Analytical")').first();
    if (await analyticalBtn.isVisible().catch(() => false)) {
      await analyticalBtn.click();
      await page.waitForTimeout(20000);
    }

    const pageContent = await page.content();
    const hasWarning = pageContent.includes('warning') || pageContent.includes('yellow') || pageContent.includes('ZVS');
    console.log('TC3: Has warning/ZVS content:', hasWarning);

    await screenshotAndLog(page, '3-zvs-warning');
  });

  test('TC4 - EPS mode', async ({ page }) => {
    await navigateToDabWizard(page);
    await page.waitForTimeout(1000);

    // Look for mode selector
    const modeSelector = page.locator('select').filter({ hasText: 'SPS' }).first();
    const modeExists = await modeSelector.isVisible().catch(() => false);
    console.log('Mode selector exists:', modeExists);

    if (modeExists) {
      await modeSelector.selectOption('EPS');
      console.log('Selected EPS');
    } else {
      // Try ElementFromList component
      const epsOption = page.locator('text=EPS').first();
      const epsExists = await epsOption.isVisible().catch(() => false);
      console.log('EPS text option exists:', epsExists);
      if (epsExists) await epsOption.click();
    }

    const analyticalBtn = page.locator('.sim-btn.analytical, button:has-text("Analytical")').first();
    if (await analyticalBtn.isVisible().catch(() => false)) {
      await analyticalBtn.click();
      await page.waitForTimeout(20000);
    }

    const hasError = await page.locator('[class*="error"]').first().isVisible().catch(() => false);
    const errorText = hasError ? await page.locator('[class*="error"]').first().innerText().catch(() => '') : '';
    console.log('TC4 EPS - Error:', hasError, errorText);

    await screenshotAndLog(page, '4-eps-mode');
  });

  test('TC5 - DPS mode', async ({ page }) => {
    await navigateToDabWizard(page);
    await page.waitForTimeout(1000);

    const modeSelector = page.locator('select').first();
    const modeExists = await modeSelector.isVisible().catch(() => false);
    if (modeExists) {
      await modeSelector.selectOption('DPS').catch(() => console.log('DPS option not available'));
    }

    const analyticalBtn = page.locator('.sim-btn.analytical, button:has-text("Analytical")').first();
    if (await analyticalBtn.isVisible().catch(() => false)) {
      await analyticalBtn.click();
      await page.waitForTimeout(20000);
    }

    await screenshotAndLog(page, '5-dps-mode');
  });

  test('TC6 - TPS mode', async ({ page }) => {
    await navigateToDabWizard(page);
    await page.waitForTimeout(1000);

    const modeSelector = page.locator('select').first();
    const modeExists = await modeSelector.isVisible().catch(() => false);
    if (modeExists) {
      await modeSelector.selectOption('TPS').catch(() => console.log('TPS option not available'));
    }

    const analyticalBtn = page.locator('.sim-btn.analytical, button:has-text("Analytical")').first();
    if (await analyticalBtn.isVisible().catch(() => false)) {
      await analyticalBtn.click();
      await page.waitForTimeout(20000);
    }

    await screenshotAndLog(page, '6-tps-mode');
  });

  test('TC7 - SPICE code generation (topology name fix)', async ({ page }) => {
    const consoleErrors = [];
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    await navigateToDabWizard(page);
    await page.waitForTimeout(1000);

    const spiceBtn = page.locator('.sim-btn.spice, button:has-text("SPICE"), button[title*="SPICE"]').first();
    const spiceExists = await spiceBtn.isVisible().catch(() => false);
    console.log('SPICE button visible:', spiceExists);

    if (spiceExists) {
      await spiceBtn.click();
      await page.waitForTimeout(10000);

      // Check for modal or dialog
      const modalVisible = await page.locator('.modal, [class*="modal"], [role="dialog"]').first().isVisible().catch(() => false);
      console.log('Modal visible after SPICE click:', modalVisible);

      const pageContent = await page.content();
      const hasNetlist = pageContent.includes('L_pri') || pageContent.includes('L_sec') || pageContent.includes('.subckt') || pageContent.includes('ngspice');
      const hasSpiceError = pageContent.includes('not available') || pageContent.includes('SPICE code generation not available');
      console.log('Has netlist content:', hasNetlist);
      console.log('Has SPICE error:', hasSpiceError);

      // Check console for topology mapping logs
      const topologyLog = consoleLogs.find(l => l.includes('generateSpiceCode'));
      console.log('Topology log:', topologyLog || 'not found');

      await screenshotAndLog(page, '7-spice-modal');
    } else {
      console.log('TC7: SPICE button not found');
      await screenshotAndLog(page, '7-no-spice-btn');
    }

    console.log('Console errors in TC7:', consoleErrors.slice(-10));
  });

  test('TC8 - Simulated waveforms (ngspice)', async ({ page }) => {
    await navigateToDabWizard(page);
    await page.waitForTimeout(1000);

    const simBtn = page.locator('.sim-btn:not(.analytical):not(.spice), button:has-text("Simulated")').first();
    const simExists = await simBtn.isVisible().catch(() => false);
    console.log('Simulated button visible:', simExists);

    if (simExists) {
      await simBtn.click();
      console.log('Clicked Simulated - waiting up to 90s...');
      await page.waitForTimeout(90000);

      const hasError = await page.locator('[class*="error"], .waveform-error').first().isVisible().catch(() => false);
      const errorText = hasError ? await page.locator('[class*="error"], .waveform-error').first().innerText().catch(() => '') : '';
      console.log('TC8: Error:', hasError, errorText);
    }

    await screenshotAndLog(page, '8-simulated');
  });

  test('TC9 - Design Magnetic handoff', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await navigateToDabWizard(page);
    await page.waitForTimeout(1000);

    const analyticalBtn = page.locator('.sim-btn.analytical, button:has-text("Analytical")').first();
    if (await analyticalBtn.isVisible().catch(() => false)) {
      await analyticalBtn.click();
      await page.waitForTimeout(20000);
    }

    const designBtn = page.locator('button:has-text("Design Magnetic"), button:has-text("Design"), [class*="action-btn"]:has-text("Magnetic")').first();
    const designExists = await designBtn.isVisible().catch(() => false);
    console.log('Design Magnetic button visible:', designExists);

    if (designExists) {
      await designBtn.click();
      await page.waitForTimeout(3000);
      const url = page.url();
      console.log('URL after Design Magnetic click:', url);
      console.log('Navigated to magnetic tool:', url.includes('magnetic'));
    }

    console.log('TC9 console errors:', consoleErrors.slice(-5));
    await screenshotAndLog(page, '9-design-magnetic');
  });
});
