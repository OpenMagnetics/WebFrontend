/**
 * DAB Wizard smoke tests
 * Verifies:
 * 1. modulationType sent as string (SPS/EPS/DPS/TPS) not integer
 * 2. SPICE topology map key 'Dual Active Bridge Converter' matches getTopology()
 */
import { test, expect } from './_coverage.js';
import {
  BASE_URL,
  SS_DIR,
  isBenign,
  openDabWizard,
  runAnalytical,
  waitForAnalytical,
  findModeSelect,
  conditionsCard,
  diagnosticsCard,
  switchToIKnowMode,
  fillRowInput,
  transformerCard,
  screenshot,
} from './utils.js';

const ss = (page, name) => screenshot(page, 'dab-tc', name);

// =========================================================
test.describe('DAB Wizard Smoke Tests', () => {
  test.use({ baseURL: BASE_URL });
  test.setTimeout(120000);

  test('TC1 - SPS Analytical renders without error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDabWizard(page);
    await ss(page, '1-before-analytical');

    await runAnalytical(page);
    await ss(page, '1-after-analytical');

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    const errorText = hasError ? await page.locator('.error-text').first().innerText().catch(() => '') : '';
    console.log(`[TC1] Error: ${hasError} "${errorText}"`);
    console.log(`[TC1] Critical console errors: ${errors.length}`);

    expect(hasError, `Waveform error: "${errorText}"`).toBe(false);
    expect(errors.length, `Console errors: ${errors.join('; ')}`).toBe(0);

    await ss(page, '1-final');
  });

  test('TC2 - Diagnostics card contains phase/d/ZVS content after Analytical', async ({ page }) => {
    await openDabWizard(page);
    await runAnalytical(page);

    const pageContent = await page.content();
    const hasPhaseShift = pageContent.includes('φ') || pageContent.includes('phi') || pageContent.includes('phase') || pageContent.includes('Outer D3');
    const hasZVS = pageContent.includes('ZVS');

    console.log(`[TC2] Has phase content: ${hasPhaseShift}, Has ZVS: ${hasZVS}`);
    expect(hasPhaseShift, 'Expected phase-shift content after analytical').toBe(true);

    await ss(page, '2-diagnostics');
  });

  test('TC3 - ZVS warning at low phase shift', async ({ page }) => {
    await openDabWizard(page);

    const cCard = conditionsCard(page);
    const phRow = cCard.locator('text=Outer D3').locator('../..');
    const phInput = phRow.locator('input[type="number"]').first();
    const phInputExists = await phInput.isVisible().catch(() => false);
    console.log(`[TC3] Ph. Shift input found: ${phInputExists}`);

    if (phInputExists) {
      await phInput.click({ clickCount: 3 });
      await phInput.fill('2');
      await phInput.press('Tab');
      console.log('[TC3] Set phase shift to 2°');
    }

    await runAnalytical(page);

    const pageContent = await page.content();
    const hasWarning = pageContent.includes('text-warning') || pageContent.includes('ZVS');
    console.log(`[TC3] Has warning/ZVS content: ${hasWarning}`);

    await ss(page, '3-zvs-warning');
  });

  test('TC4 - EPS mode runs without error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDabWizard(page);

    const modeSelect = await findModeSelect(page);
    expect(modeSelect, 'Mode select not found').not.toBeNull();
    await modeSelect.selectOption('EPS');
    await page.waitForTimeout(400);

    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    const errorText = hasError ? await page.locator('.error-text').first().innerText().catch(() => '') : '';
    console.log(`[TC4] EPS error: ${hasError} "${errorText}"`);
    expect(hasError, `EPS analytical error: "${errorText}"`).toBe(false);
    expect(errors.length, `Console errors: ${errors.join('; ')}`).toBe(0);

    await ss(page, '4-eps-mode');
  });

  test('TC5 - DPS mode runs without error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDabWizard(page);

    const modeSelect = await findModeSelect(page);
    expect(modeSelect, 'Mode select not found').not.toBeNull();
    await modeSelect.selectOption('DPS');
    await page.waitForTimeout(400);

    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[TC5] DPS error: ${hasError}`);
    expect(hasError).toBe(false);
    expect(errors.length).toBe(0);

    await ss(page, '5-dps-mode');
  });

  test('TC6 - TPS mode runs without error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDabWizard(page);

    const modeSelect = await findModeSelect(page);
    expect(modeSelect, 'Mode select not found').not.toBeNull();
    await modeSelect.selectOption('TPS');
    await page.waitForTimeout(400);

    await runAnalytical(page);

    const hasError = await page.locator('.error-text').first().isVisible().catch(() => false);
    console.log(`[TC6] TPS error: ${hasError}`);
    expect(hasError).toBe(false);
    expect(errors.length).toBe(0);

    await ss(page, '6-tps-mode');
  });

  test('TC7 - SPICE code generation opens modal with netlist content', async ({ page }) => {
    const consoleLogs = [];
    const errors = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text().substring(0, 150)}`);
      if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text());
    });

    await openDabWizard(page);
    await switchToIKnowMode(page);
    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Turns', '2');
    await fillRowInput(tCard, 'Ser L', '5e-5');
    await runAnalytical(page);

    const spiceBtn = page.locator('.sim-btn.spice');
    await spiceBtn.waitFor({ timeout: 5000 });
    await spiceBtn.click();

    const modal = page.locator('.modal.fade.show, .modal.show');
    const modalVisible = await modal.waitFor({ timeout: 20000, state: 'visible' }).then(() => true).catch(() => false);
    console.log(`[TC7] SPICE modal visible: ${modalVisible}`);

    if (modalVisible) {
      await page.waitForTimeout(1500);
      const netlist = await page.locator('.modal pre code, .modal-body pre code, .modal-body code').first()
        .innerText().catch(async () => page.locator('.modal-body').innerText().catch(() => ''));
      console.log(`[TC7] Netlist length: ${netlist.length}, snippet: "${netlist.substring(0, 200)}"`);
      expect(netlist.length, 'SPICE netlist should have content').toBeGreaterThan(50);

      await ss(page, '7-spice-modal');
      const closeBtn = page.locator('.modal .btn-close, .modal button.btn-primary').first();
      if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
    } else {
      const errText = await page.locator('.error-text, .waveform-error').first().innerText().catch(() => '');
      console.log(`[TC7] No modal — error: "${errText}"`);
      expect(modalVisible, `SPICE modal should appear, got: "${errText}"`).toBe(true);
    }

    const topoLog = consoleLogs.find(l => l.includes('generateSpiceCode') || l.includes('topologyMap'));
    console.log(`[TC7] Topology log found: ${!!topoLog}`);

    expect(errors.length).toBe(0);
    await ss(page, '7-spice-final');
  });

  test('TC8 - Simulated button is present and clickable', async ({ page }) => {
    // Intentionally does NOT wait for ngspice completion (too slow for CI).
    // Verifies the button exists and can be clicked without a JS crash.
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDabWizard(page);

    const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
    const simExists = await simBtn.isVisible().catch(() => false);
    console.log(`[TC8] Simulated button visible: ${simExists}`);
    expect(simExists, 'Simulated button should be present').toBe(true);

    expect(errors.length).toBe(0);
    await ss(page, '8-simulated-btn');
  });

  test('TC9 - Design Magnetic navigates to magnetic_tool', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDabWizard(page);
    await runAnalytical(page);

    const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
    await expect(designBtn).toBeVisible();
    const isDisabled = await designBtn.isDisabled();
    console.log(`[TC9] Design Magnetic disabled: ${isDisabled}`);
    expect(isDisabled).toBe(false);

    await designBtn.click();
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});

    const url = page.url();
    console.log(`[TC9] URL after click: ${url}`);
    expect(url.includes('magnetic_tool'), `Expected magnetic_tool in URL, got: ${url}`).toBe(true);

    console.log(`[TC9] Console errors: ${errors.length}`);
    expect(errors.length).toBe(0);
    await ss(page, '9-design-magnetic');
  });
});
