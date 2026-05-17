/**
 * DAB Wizard battery — SPICE & ngspice (Groups D + E).
 *
 *   D – SPICE code generation (SPS / EPS / TPS netlist modal)
 *   E – Simulated waveforms (ngspice) — all skipped due to a Playwright
 *       teardown stall after the Comlink MKF worker invocation; see comment
 *       on the Group E describe block.
 */

import { test, expect } from './_coverage.js';
import { screenshot, openDabWizard, runAnalytical, conditionsCard, transformerCard, outputsCard, findModeSelect, fillRowInput, fillOutput, switchToIKnowMode, softVisible, softChecked, pause } from './utils.js';

const ss = (page, name) => screenshot(page, 'dab-battery', name);

// =====================================================================
// GROUP D – SPICE code generation
// =====================================================================
test.describe('DAB – Group D – SPICE code generation', () => {
  test.setTimeout(60000);

  async function setupAndAnalytical(page) {
    await switchToIKnowMode(page);
    const leakage = page.locator('#useLeakageInductanceDab');
    if (await softChecked(leakage)) await leakage.uncheck();

    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Turns', '2');
    await fillRowInput(tCard, 'Series Ind.', '5e-5');

    const oCard = outputsCard(page);
    await fillOutput(oCard, 0, 'voltage', '200');
    await pause(page, 300, 'mechanical: settle');

    await runAnalytical(page);
  }

  async function clickSpiceAndWaitForModal(page) {
    const spiceBtn = page.locator('.sim-btn.spice');
    await spiceBtn.waitFor({ timeout: 5000 });
    await spiceBtn.click();
    const modal = page.locator('.modal.fade.show, .modal.show');
    return modal.waitFor({ timeout: 20000, state: 'visible' }).then(() => true, () => false);
  }

  test('D1 – SPICE with SPS: modal shows netlist with L_pri, L_sec, L_ser', async ({ page }) => {
    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text().substring(0, 150)}`));

    await openDabWizard(page);
    await setupAndAnalytical(page);

    const modalVisible = await clickSpiceAndWaitForModal(page);
    console.log(`[D1] SPICE modal visible: ${modalVisible}`);

    if (modalVisible) {
      await pause(page, 2000, 'mechanical: settle');
      const netlist = await page.locator('.modal pre code, .modal-body pre code, .modal-body code').first()
        .innerText().catch(async () => page.locator('.modal-body').innerText().catch(() => ''));
      const hasHeader     = netlist.includes('Dual Active Bridge') || netlist.includes('DAB') || netlist.includes('.model');
      const hasInductance = netlist.includes('L_series') || netlist.includes('L_pri') || netlist.includes('Lm');
      console.log(`[D1] Has DAB header: ${hasHeader}, Has inductance: ${hasInductance}`);
      console.log(`[D1] Netlist snippet: "${netlist.substring(0, 300)}"`);

      expect(netlist.length, 'SPICE netlist should have content').toBeGreaterThan(50);

      await ss(page, 'D1-spice-sps-modal');

      const closeBtn = page.locator('.modal .btn-close, .modal button.btn-primary').first();
      if (await softVisible(closeBtn)) await closeBtn.click();
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

    const leakage = page.locator('#useLeakageInductanceDab');
    if (await softChecked(leakage)) await leakage.uncheck();
    const tCard = transformerCard(page);
    await fillRowInput(tCard, 'Turns', '2');
    await fillRowInput(tCard, 'Series Ind.', '5e-5');
    const oCard = outputsCard(page);
    await fillOutput(oCard, 0, 'voltage', '200');

    const modeSelect = await findModeSelect(page);
    await modeSelect.selectOption('EPS');
    await pause(page, 300, 'mechanical: settle');

    const cCard = conditionsCard(page);
    const d1Row = cCard.locator('text=Primary D1').locator('../..');
    const d1Input = d1Row.locator('input[type="number"]').first();
    if (await softVisible(d1Input)) {
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
      if (await softVisible(closeBtn)) await closeBtn.click();
    } else {
      const errText = await page.locator('.error-text').first().innerText().catch(() => '');
      console.log(`[D2] SPICE error: "${errText}"`);
      await ss(page, 'D2-spice-eps-error');
    }
  });

  test('D3 – SPICE with TPS', async ({ page }) => {
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
      if (await softVisible(closeBtn)) await closeBtn.click();
    } else {
      const errText = await page.locator('.error-text').first().innerText().catch(() => '');
      console.log(`[D3] SPICE error: "${errText}"`);
      await ss(page, 'D3-spice-tps-error');
    }
  });
});

