/**
 * DAB Wizard battery — UI layout & mode switching (Group A).
 *
 * Verifies the default 3-column layout, mode-driven visibility of D1/D2,
 * input-voltage tolerance rows, and Design-Mode (Help me / I know) toggle.
 */

import { test, expect } from './_coverage.js';
import { isBenign, screenshot, openDabWizard, conditionsCard, transformerCard, inputVoltageCard, findModeSelect, switchToIKnowMode, softVisible, pause } from './utils.js';

const ss = (page, name) => screenshot(page, 'dab-battery', name);

test.describe('DAB – Group A – Layout and UI controls', () => {
  test.setTimeout(60000);

  test('A1 – Default layout: 3 columns, Conditions card, Mode=SPS, φ visible, no D1/D2', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await openDabWizard(page);

    await expect(page.locator('.col-xl-3').first()).toBeVisible();
    await expect(page.locator('.col-xl-4').first()).toBeVisible();
    await expect(page.locator('.col-xl-5').first()).toBeVisible();

    await expect(conditionsCard(page)).toBeVisible();
    await expect(conditionsCard(page).locator('text=Outer D3').first()).toBeVisible();

    const modeSelect = await findModeSelect(page);
    expect(modeSelect, 'Mode select not found in Conditions card').not.toBeNull();
    const modeValue = modeSelect ? await modeSelect.inputValue() : '';
    expect(modeValue).toBe('SPS');

    expect(await conditionsCard(page).locator('text=Primary D1').count()).toBe(0);
    expect(await conditionsCard(page).locator('text=Secondary D2').count()).toBe(0);

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
    await pause(page, 400, 'mechanical: settle');

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
    await pause(page, 400, 'mechanical: settle');

    await expect(conditionsCard(page).locator('text=Primary D1').first()).toBeVisible();
    await expect(conditionsCard(page).locator('text=Secondary D2').first()).toBeVisible();

    await ss(page, 'A3-dps-d1-d2');
  });

  test('A4 – Mode=TPS shows both D1 and D2', async ({ page }) => {
    await openDabWizard(page);

    const modeSelect = await findModeSelect(page);
    expect(modeSelect, 'Mode select not found').not.toBeNull();
    await modeSelect.selectOption('TPS');
    await pause(page, 400, 'mechanical: settle');

    await expect(conditionsCard(page).locator('text=Primary D1').first()).toBeVisible();
    await expect(conditionsCard(page).locator('text=Secondary D2').first()).toBeVisible();

    await ss(page, 'A4-tps-d1-d2');
  });

  test('A5 – Back to SPS hides D1 and D2', async ({ page }) => {
    await openDabWizard(page);

    const modeSelect = await findModeSelect(page);
    expect(modeSelect, 'Mode select not found').not.toBeNull();
    await modeSelect.selectOption('TPS');
    await pause(page, 300, 'mechanical: settle');
    await modeSelect.selectOption('SPS');
    await pause(page, 300, 'mechanical: settle');

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

    const addMinBtn = ivCard.locator('button').filter({ hasText: /[Mm]in/ }).first();
    if (await softVisible(addMinBtn)) {
      await addMinBtn.click();
      await pause(page, 400, 'mechanical: settle');
      const inputsAfterMin = await ivCard.locator('input[type="number"]').count();
      console.log(`[A6] Inputs after add min: ${inputsAfterMin}`);
      expect(inputsAfterMin).toBeGreaterThan(inputsBefore);
    }

    const addMaxBtn = ivCard.locator('button').filter({ hasText: /[Mm]ax/ }).first();
    if (await softVisible(addMaxBtn)) {
      await addMaxBtn.click();
      await pause(page, 400, 'mechanical: settle');
      const inputsAfterMax = await ivCard.locator('input[type="number"]').count();
      console.log(`[A6] Inputs after add max: ${inputsAfterMax}`);
    }

    const removeButtons = ivCard.locator('button[class*="remove"], button.btn-sm:has(i.fa-times), button.btn-sm:has(i.fa-xmark), button:has(i.fa-minus)');
    if (await removeButtons.count() > 0) {
      await removeButtons.last().click();
      await pause(page, 300, 'mechanical: settle');
    }

    await ss(page, 'A6-input-voltage-tolerance');
  });

  test('A7 – Design Mode card: "Help me" hides Transformer, "I know" shows it', async ({ page }) => {
    await openDabWizard(page);

    const tCard = transformerCard(page);
    const tCardVisible = await softVisible(tCard);
    console.log(`[A7] Transformer card in Help me mode: ${tCardVisible}`);
    expect(tCardVisible, 'Transformer card should be hidden in "Help me" mode').toBe(false);

    await switchToIKnowMode(page);

    await expect(tCard).toBeVisible();
    await expect(tCard.locator('text=Turns').first()).toBeVisible();
    await expect(tCard.locator('text=Mag. Ind.').first()).toBeVisible();
    await expect(tCard.locator('text=Series Ind.').first()).toBeVisible();

    await ss(page, 'A7-design-mode-i-know');
  });
});
