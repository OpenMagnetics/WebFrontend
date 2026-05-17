/**
 * Magnetic Builder battery — Wire panel (Groups H–L).
 *
 *   H – Wire: Wire Advise / Wire Advise All buttons
 *   I – Wire: Round wire (type, standard, diameter, coating)
 *   J – Wire: Litz wire (strand diameter, strand count)
 *   K – Wire: Rectangular and Foil wires (height, width)
 *   L – Wire: Turns and Parallels
 */

import { test, expect } from './_coverage.js';
import { isBenign, pause } from './utils.js';
import { ss, goToBuilderStep, adviseCoreAndWait, adviseWireAndWait, selectOptions, pickFirstOption } from './utils/builder-helpers.js';

// =====================================================================
// GROUP H – Wire Advise buttons
// =====================================================================
test.describe('MB – Group H – Wire Advise', () => {
  test.describe.configure({ timeout: 240000 });

  test('MB-H1 – Wire Advise button visible after Core Advise', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    const wireAdviseBtn = page.locator('[data-cy$="Wire-Advise-button"]').first();
    await expect(wireAdviseBtn).toBeVisible();
    await expect(wireAdviseBtn).toBeEnabled();
    await ss(page, 'H1-wire-advise-btn');
  });

  test('MB-H2 – Wire Advise click triggers loading / disabled state', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const wireAdviseBtn = page.locator('[data-cy$="Wire-Advise-button"]').first();
    await expect(wireAdviseBtn).toBeVisible();
    await wireAdviseBtn.click();
    await page.waitForFunction(
      () => {
        const loading = document.querySelector('[data-cy$="-BasicWireSelector-loading"]');
        const b = document.querySelector('[data-cy$="Wire-Advise-button"]');
        return loading || (b && b.disabled);
      },
      { timeout: 5000 }
    );
    await ss(page, 'H2-wire-advise-loading');
  });

  test('MB-H3 – Wire Advise completes and populates wire type', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);
    await ss(page, 'H3-wire-advised');

    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    const wireType = await wireTypeSel.inputValue();
    expect(wireType.length, 'wire type select must have a non-empty value after advise').toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
});

// =====================================================================
// GROUP I – Round wire
// =====================================================================
test.describe('MB – Group I – Round Wire', () => {
  test.describe.configure({ timeout: 180000 });

  test('MB-I1 – Wire Type selector visible and offers "Round"', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    const opts = await wireTypeSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
    // ElementFromList renders option *values* from the options map. wireTypes
    // is `{ round: 'Round', litz: 'Litz', ... }`, so values are title-cased.
    expect(opts).toContain('Round');
    await ss(page, 'I1-wire-type-selector');
  });

  test('MB-I2 – Select round wire reveals standard, diameter, coating selectors', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    await wireTypeSel.selectOption('Round');
    await pause(page, 600, 'mechanical: settle');

    await expect(page.locator('[data-cy$="-WireStandard-container"]').first()).toBeVisible();
    await expect(page.locator('[data-cy$="-WireConductingDiameter-container"]').first()).toBeVisible();
    await expect(page.locator('[data-cy$="-WireCoating-container"]').first()).toBeVisible();
    await ss(page, 'I2-round-wire-controls');
  });

  test('MB-I3 – Wire Standard selector has options', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    await wireTypeSel.selectOption('Round');
    await pause(page, 500, 'mechanical: settle');

    const opts = await selectOptions(page, '-WireStandard');
    expect(opts.length, 'wire standard select must have at least one option').toBeGreaterThan(0);
    await ss(page, 'I3-wire-standard');
  });

  test('MB-I4 – Conducting diameter selector populated after standard is chosen', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    await wireTypeSel.selectOption('Round');
    await pause(page, 500, 'mechanical: settle');
    await pickFirstOption(page, '-WireStandard');

    const diamOpts = await selectOptions(page, '-WireConductingDiameter');
    expect(diamOpts.length, 'diameter select must have options after a standard is chosen').toBeGreaterThan(0);

    const diamSel = page.locator('[data-cy$="-WireConductingDiameter-select"]').first();
    const pick = diamOpts[Math.floor(diamOpts.length / 2)];
    await diamSel.selectOption(pick);
    await pause(page, 400, 'mechanical: settle');
    expect(await diamSel.inputValue()).toBe(pick);
    await ss(page, 'I4-wire-diameter');
  });

  test('MB-I5 – Wire Coating selector has options for round wire', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    await wireTypeSel.selectOption('Round');
    await pause(page, 500, 'mechanical: settle');

    const opts = await selectOptions(page, '-WireCoating');
    expect(opts.length, 'coating select must have at least one option').toBeGreaterThan(0);
    await ss(page, 'I5-wire-coating');
  });
});

// =====================================================================
// GROUP J – Litz wire
// =====================================================================
test.describe('MB – Group J – Litz Wire', () => {
  test.describe.configure({ timeout: 120000 });

  test('MB-J1 – Select litz wire reveals strand diameter and count inputs', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    const opts = await wireTypeSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
    expect(opts, `Litz wire type must be offered by the advised core; got: ${opts.join(', ')}`).toContain('Litz');
    await wireTypeSel.selectOption('Litz');
    await pause(page, 600, 'mechanical: settle');

    await expect(page.locator('[data-cy$="-StrandConductingDiameter-container"]').first()).toBeVisible();
    await expect(page.locator('[data-cy$="-NumberConductors-container"]').first()).toBeVisible();
    await ss(page, 'J1-litz-wire-controls');
  });

  test('MB-J2 – Litz strand count input accepts value', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    const opts = await wireTypeSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
    expect(opts, `Litz wire type must be offered (options: ${opts.join(', ')})`).toContain('Litz');
    await wireTypeSel.selectOption('Litz');
    await pause(page, 600, 'mechanical: settle');

    const strandCountEl = page.locator('[data-cy$="-NumberConductors-container"]').first();
    await expect(strandCountEl).toBeVisible();
    const input = strandCountEl.locator('input[type="number"]').first();
    await expect(input).toBeVisible();
    await input.click({ clickCount: 3 });
    await input.fill('100');
    await input.press('Tab');
    await pause(page, 400, 'mechanical: settle');
    expect(await input.inputValue()).toBe('100');
    await ss(page, 'J2-litz-strand-count');
  });
});

// =====================================================================
// GROUP K – Rectangular and Foil
// =====================================================================
test.describe('MB – Group K – Rectangular/Foil Wire', () => {
  test.describe.configure({ timeout: 120000 });

  async function selectIfOffered(page, value) {
    const wireTypeSel = page.locator('[data-cy$="-WireType-select"]').first();
    await expect(wireTypeSel).toBeVisible();
    const opts = await wireTypeSel.evaluate(el => Array.from(el.options).map(o => o.value).filter(v => v));
    expect(opts, `"${value}" wire type must be offered (options: ${opts.join(', ')})`).toContain(value);
    await wireTypeSel.selectOption(value);
    await pause(page, 600, 'mechanical: settle');
  }

  test('MB-K1 – Select rectangular wire reveals height and width inputs', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await selectIfOffered(page, 'Rectangular');
    await expect(page.locator('[data-cy$="-WireConductingHeight-container"]').first()).toBeVisible();
    await expect(page.locator('[data-cy$="-WireConductingWidth-container"]').first()).toBeVisible();
    await ss(page, 'K1-rectangular-wire');
  });

  test('MB-K2 – Rectangular wire: height and width inputs accept values', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await selectIfOffered(page, 'Rectangular');

    // Dimension renders the displayed value scaled by the current unit
    // multiplier (e.g. mm). Fill a small in-unit value and assert the input
    // reflects what we typed.
    for (const suffix of ['-WireConductingHeight-container', '-WireConductingWidth-container']) {
      const el = page.locator(`[data-cy$="${suffix}"]`).first();
      await expect(el).toBeVisible();
      const input = el.locator('input[type="number"]').first();
      await expect(input).toBeVisible();
      await input.click({ clickCount: 3 });
      await input.fill('2');
      await input.press('Tab');
      await pause(page, 300, 'mechanical: settle');
      expect(parseFloat(await input.inputValue()), `input ${suffix} must accept "2"`).toBeCloseTo(2, 3);
    }
    await ss(page, 'K2-rectangular-dims-set');
  });

  test('MB-K3 – Select foil wire reveals height and width inputs', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await selectIfOffered(page, 'Foil');
    await expect(page.locator('[data-cy$="-WireConductingHeight-container"]').first()).toBeVisible();
    await expect(page.locator('[data-cy$="-WireConductingWidth-container"]').first()).toBeVisible();
    await ss(page, 'K3-foil-wire');
  });
});

// =====================================================================
// GROUP L – Turns and Parallels
// =====================================================================
test.describe('MB – Group L – Turns and Parallels', () => {
  test.describe.configure({ timeout: 180000 });

  test('MB-L1 – NumberTurns container visible with at least one input', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    const turnsEl = page.locator('[data-cy$="-NumberTurns-container"]').first();
    await expect(turnsEl).toBeVisible();
    const inputCount = await turnsEl.locator('input[type="number"]').count();
    expect(inputCount, 'NumberTurns must contain at least one number input').toBeGreaterThanOrEqual(1);
    await ss(page, 'L1-turns-parallels');
  });

  test('MB-L2 – Set turns to 10', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);

    const turnsEl = page.locator('[data-cy$="-NumberTurns-container"]').first();
    await expect(turnsEl).toBeVisible();
    const inputs = turnsEl.locator('input[type="number"]');
    await expect(inputs.first()).toBeVisible();
    await inputs.first().click({ clickCount: 3 });
    await inputs.first().fill('10');
    await inputs.first().press('Tab');
    await pause(page, 600, 'mechanical: settle');
    expect(parseInt(await inputs.first().inputValue(), 10)).toBe(10);
    await ss(page, 'L2-turns-10');
  });

  test('MB-L3 – Set parallels to 2', async ({ page }) => {
    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);

    const parEl = page.locator('[data-cy$="-NumberParallels-container"]').first();
    await expect(parEl, 'NumberParallels container must be visible after wire advise').toBeVisible();
    const input = parEl.locator('input[type="number"]').first();
    await expect(input).toBeVisible();
    await input.click({ clickCount: 3 });
    await input.fill('2');
    await input.press('Tab');
    await pause(page, 600, 'mechanical: settle');
    expect(parseInt(await input.inputValue(), 10)).toBe(2);
    await ss(page, 'L3-parallels-2');
  });
});
