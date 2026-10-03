/**
 * LLC / CLLC / SRC operating frequency by design mode (ABT #1539), and the CLLC tank overrides (ABT #1538).
 *
 *  - "Help me with the design": there is no Op. Frequency input; after a run the wizard shows the frequency the
 *    engine drives the tank at, read-only, equal to the Kirchhoff diagnostics' switching frequency.
 *  - "I know the design I want": Op. Frequency forces the drive. Two runs at two frequencies must report those two
 *    frequencies, different tank currents and different delivered output voltages: the output voltage is the tank's
 *    result there, not the target. The wizards show no field labelled "output voltage"; the delivered voltage is the
 *    secondary's square-wave amplitude, shown as the Winding 2 "Peak voltage" in the Diagnostics card's Windings
 *    table (engine operating point, voltage_peak). A regression to "Vout = target" would pin it at one value.
 *  - CLLC "I know": ticking the tank overrides changes the design the engine returns.
 */
import { test, expect } from './_coverage.js';
import { openWizard, runAnalytical, switchToIKnowMode } from './utils/index.js';
import { collectConsoleErrors } from './utils/console.js';
import { expectNoConsoleErrors } from './utils/assertions.js';
import { getWizard } from './utils/catalog.js';

const kh = (p, key) => `[data-cy="${p}-KhDiagnostics-${key}"]`;

const SI = { '': 1, k: 1e3, M: 1e6, m: 1e-3, 'µ': 1e-6, u: 1e-6, n: 1e-9, p: 1e-12 };
function parseSi(text, unit) {
  const m = String(text).trim().match(new RegExp(`^(-?\\d+(?:\\.\\d+)?)\\s*([kMmµunp]?)${unit}$`));
  if (!m) throw new Error(`parseSi: "${text}" is not a number in ${unit}`);
  return Number(m[1]) * SI[m[2]];
}

async function khFrequency(page, p) {
  return parseSi(await page.locator(kh(p, 'switchingFrequency-value')).first().innerText(), 'Hz');
}
async function khPrimaryRms(page, p) {
  return parseSi(await page.locator(kh(p, 'primaryRmsCurrent-value')).first().innerText(), 'A');
}
// Delivered output voltage: the Winding 2 cell of the Diagnostics "Peak voltage" row (volts, one decimal).
async function khDeliveredVout(page, p) {
  const header = page.locator(`${kh(p, 'windings')} thead th`);
  await expect(header.nth(3), 'the Windings table column read as the output must be Winding 2').toHaveText('Winding 2');
  const text = await page.locator(`${kh(p, 'winding-voltagePeak')} td.kh-num`).nth(1).innerText();
  const volts = Number(text);
  if (!Number.isFinite(volts)) throw new Error(`khDeliveredVout: "${text}" is not a voltage`);
  return volts;
}

// Types a value into a Dimension input in the unit prefix it currently displays (e.g. "110" in kHz).
// The data-cy sits on the InputNumber wrapper <span>; the editable element is the <input> inside it.
async function setDimension(page, cyPrefix, displayed) {
  const input = page.locator(`[data-cy="${cyPrefix}-number-input"] input`).first();
  await expect(input).toBeVisible();
  await input.click();
  await input.press('Control+a');
  await input.type(String(displayed), { delay: 30 });
  await input.press('Tab');
}

// Two forced frequencies per wizard, both inside the default band and on the inductive side of each default tank.
// vout: delivered output voltage the engine gives at that frequency for the default design (Kirchhoff 4462565,
// node probe of the shipped libKirchhoff), where one was measured.
const CASES = [
  { key: 'llc',  f1: 105e3, f2: 115e3, vout: { 105e3: 43.91, 115e3: 42.37 } },   // fr 100 kHz, band 80-120 kHz
  { key: 'cllc', f1: 120e3, f2: 140e3, vout: { 140e3: 340.8 } },                 // fr 120 kHz, band 80-200 kHz
  { key: 'src',  f1: 100e3, f2: 120e3, vout: { 120e3: 42.72 } },                 // fr 100 kHz, band 80-150 kHz
];

test.describe('Resonant wizards: operating frequency by design mode (ABT #1539)', () => {
  test.setTimeout(180_000);

  for (const c of CASES) {
    test(`${c.key}: help-me hides Op. Frequency and shows the solved frequency`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const { linkCy, wizardPrefix: p } = getWizard(c.key);
      await openWizard(page, linkCy);
      await expect(page.locator(`[data-cy="${p}-OperatingSwitchingFrequency-container"]`)).toHaveCount(0);
      // The wizard computes on open, so the solved row may already be there; the run below refreshes it.
      await runAnalytical(page, 90_000);
      await expect(page.locator(`[data-cy="${p}-OperatingSwitchingFrequency-container"]`)).toHaveCount(0);
      const solved = page.locator(`[data-cy="${p}-OperatingFrequencySolved-container"]`).first();
      await expect(solved).toBeVisible();
      const engineHz = await khFrequency(page, p);
      expect(engineHz).toBeGreaterThan(0);
      const shown = await solved.locator(`[data-cy="${p}-OperatingFrequencySolved-number-label"]`).innerText();
      // With a unit, DimensionReadOnly renders it as a read-only unit Select ('-DimensionUnit-input').
      const unit = await solved.locator(`[data-cy="${p}-OperatingFrequencySolved-DimensionUnit-input"] .p-select-label`).innerText();
      const shownHz = parseSi(`${shown.trim()} ${unit.trim()}`, 'Hz');
      expect(Math.abs(shownHz - engineHz) / engineHz).toBeLessThan(0.01);
      expectNoConsoleErrors(errors);
    });

    test(`${c.key}: I-know Op. Frequency forces the drive frequency and changes the waveforms`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const { linkCy, wizardPrefix: p } = getWizard(c.key);
      await openWizard(page, linkCy);
      await switchToIKnowMode(page);
      await expect(page.locator(`[data-cy="${p}-OperatingFrequencySolved-container"]`)).toHaveCount(0);

      await setDimension(page, `${p}-OperatingSwitchingFrequency`, c.f1 / 1e3);
      await runAnalytical(page, 90_000);
      const fA = await khFrequency(page, p);
      const iA = await khPrimaryRms(page, p);
      const vA = await khDeliveredVout(page, p);

      await setDimension(page, `${p}-OperatingSwitchingFrequency`, c.f2 / 1e3);
      await runAnalytical(page, 90_000);
      await expect.poll(() => khFrequency(page, p), { timeout: 30_000 }).not.toBe(fA);
      const fB = await khFrequency(page, p);
      const iB = await khPrimaryRms(page, p);
      const vB = await khDeliveredVout(page, p);

      expect(Math.abs(fA - c.f1) / c.f1).toBeLessThan(0.005);
      expect(Math.abs(fB - c.f2) / c.f2).toBeLessThan(0.005);
      expect(Math.abs(iB - iA) / iA).toBeGreaterThan(0.01);
      // The delivered output voltage follows the forced frequency; it is not the target.
      expect(Math.abs(vB - vA) / vA, `delivered Vout ${vA} V at ${c.f1} Hz vs ${vB} V at ${c.f2} Hz`).toBeGreaterThan(0.01);
      for (const [f, v] of [[c.f1, vA], [c.f2, vB]]) {
        const expected = c.vout[f];
        if (expected !== undefined) {
          // Shown with one decimal: 0.05 V display rounding plus 0.5 % for engine drift.
          expect(Math.abs(v - expected), `delivered Vout at ${f} Hz`).toBeLessThanOrEqual(0.05 + 0.005 * expected);
        }
      }
      expectNoConsoleErrors(errors);
    });
  }

  test('cllc: I-know tank overrides change the design (ABT #1538)', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const { linkCy, wizardPrefix: p } = getWizard('cllc');
    await openWizard(page, linkCy);
    await switchToIKnowMode(page);
    await runAnalytical(page, 90_000);
    const capBefore = parseSi(await page.locator(kh(p, 'resonantCapacitance-value')).first().innerText(), 'F');
    const iBefore = await khPrimaryRms(page, p);

    await page.locator('#overridePrimaryResonantInductanceCllc').check();
    await setDimension(page, `${p}-PrimaryResonantInductance`, 36);    // µH
    await page.locator('#overrideSecondaryResonantInductanceCllc').check();
    await setDimension(page, `${p}-SecondaryResonantInductance`, 50);  // µH
    await page.locator('#overrideResonantCapacitanceCllc').check();
    await setDimension(page, `${p}-ResonantCapacitance`, 47);          // nF
    await runAnalytical(page, 90_000);

    await expect.poll(async () => parseSi(await page.locator(kh(p, 'resonantCapacitance-value')).first().innerText(), 'F'),
      { timeout: 30_000 }).not.toBe(capBefore);
    const capAfter = parseSi(await page.locator(kh(p, 'resonantCapacitance-value')).first().innerText(), 'F');
    expect(Math.abs(capAfter - 47e-9) / 47e-9).toBeLessThan(0.01);
    const iAfter = await khPrimaryRms(page, p);
    expect(Math.abs(iAfter - iBefore) / iBefore).toBeGreaterThan(0.01);
    expectNoConsoleErrors(errors);
  });
});
