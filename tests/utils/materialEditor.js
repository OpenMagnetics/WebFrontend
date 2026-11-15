// The builder's core-material editor, driven like a user.
//
// Typing an SI value into a <Dimension> field (WebSharedComponents/DataInput/Dimension.vue).
//
// A Dimension shows its value in the unit its prefix selector holds (100000 Hz shows as "100" next to
// "kHz"), and reads what is typed in that unit. To enter an SI value the test reads the prefix shown and
// types the value scaled to it; it never guesses the prefix.
import { expect } from '@playwright/test';

const PREFIXES = { p: 1e-12, n: 1e-9, 'µ': 1e-6, 'μ': 1e-6, u: 1e-6, m: 1e-3, k: 1e3, M: 1e6, G: 1e9 };

/** The scale of the unit a Dimension shows, e.g. "kHz" with base "Hz" -> 1000. Throws on an unknown label. */
export function unitScale(label, baseUnit) {
  const text = label.trim();
  if (text === baseUnit) return 1;
  if (text.endsWith(baseUnit) && text.length === baseUnit.length + 1 && PREFIXES[text[0]] != null) {
    return PREFIXES[text[0]];
  }
  throw new Error(`the unit shown is '${text}', which is not ${baseUnit} with a metric prefix`);
}

/**
 * Types `value` (SI) into the Dimension whose dataTestLabel ends with `label`, then leaves the field.
 * `baseUnit` defaults from the field name: Hz, T, A/m, W/m³, °C.
 */
export async function typeSi(page, label, value, baseUnit = null) {
  const name = label.split(' ').pop();
  const unit = baseUnit ?? { frequency: 'Hz', magneticFluxDensity: 'T', magneticField: 'A/m', value: 'W/m³', temperature: '°C' }[name];
  if (unit == null) throw new Error(`no base unit known for the field '${name}': pass it`);
  const input = page.locator(`[data-cy$="${label}-number-input"] input`).first();
  await expect(input, `${label} is shown`).toBeVisible();
  const unitLabel = page.locator(`[data-cy$="${label}-DimensionUnit-input"]`).first();
  const scale = unit === '°C' && (await unitLabel.count()) === 0 ? 1 : unitScale(await unitLabel.innerText(), unit);
  const display = Number((value / scale).toPrecision(12));
  await input.click();
  await input.press('Control+a');
  await input.type(String(display), { delay: 30 });
  await input.press('Tab');
}

/**
 * Enters measured loss points through the editor's rows, starting from the one seeded point (25 C).
 * The rows are grouped into one curve per flux density, and the editor shows one curve at a time, the
 * lowest flux density first: so the points go in at the seeded 0.1 T first, then a copy is moved to
 * 0.05 T, which becomes the shown curve.
 */
export async function enterLossPoints(page, [p1, p2, p3, p4]) {
  const LOSSES = '-VolumetricLossesPerTemperature-PropertyTool';
  const row = (index) => `${LOSSES}-Property-${index}`;
  const addBelow = (index) => page.locator(`[data-cy$="${LOSSES}-add-point-below-button"]`).nth(index).click();
  // Curve at p1's flux density: p1 then p2.
  await typeSi(page, `${row(0)} frequency`, p1.frequency);
  await typeSi(page, `${row(0)} value`, p1.value);
  await addBelow(0);
  await typeSi(page, `${row(1)} frequency`, p2.frequency);
  await typeSi(page, `${row(1)} value`, p2.value);
  // A copy of p2 moved to p3's flux density: that curve (the lower flux density) is now the one shown.
  await addBelow(1);
  await typeSi(page, `${row(2)} magneticFluxDensity`, p3.magneticFluxDensity);
  await expect(page.locator(`[data-cy$="${LOSSES}-remove-point-button"]`), 'the moved point is its own curve').toHaveCount(1);
  await typeSi(page, `${row(0)} frequency`, p3.frequency);
  await typeSi(page, `${row(0)} value`, p3.value);
  await addBelow(0);
  await typeSi(page, `${row(1)} frequency`, p4.frequency);
  await typeSi(page, `${row(1)} value`, p4.value);
}

/**
 * Fits the Steinmetz model to the measured points with the editor's button (MKF does the fit) and waits
 * for its report. Throws with the editor's message when MKF refuses the points.
 */
export async function fitSteinmetz(page) {
  const LOSSES = '-VolumetricLossesPerTemperature';
  await page.locator(`[data-cy$="${LOSSES}-fit-steinmetz-button"]`).first().click();
  const report = page.locator(`[data-cy$="${LOSSES}-fit-steinmetz-report"]`).first();
  const error = page.locator(`[data-cy$="${LOSSES}-fit-steinmetz-error"]`).first();
  await expect(report.or(error)).toBeVisible({ timeout: 60000 });
  if (await error.isVisible()) throw new Error(`the Steinmetz fit was refused: ${await error.innerText()}`);
  return report.innerText();
}
