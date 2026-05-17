/**
 * tests/utils/forms.js
 *
 * Form-filling primitives for wizard cards. These throw loudly when the UI
 * shape doesn't match expectations (per CLAUDE.md no-silent-fallback rule):
 * a renamed label means the test has silently stopped exercising what its
 * name advertises, and we want that to be a hard fail, not a skip.
 */
import { conditionsCard, transformerCard } from './locators.js';
import { settleAnimations } from './wait.js';

/**
 * Find the modulation-mode <select> inside the Conditions card.
 * Returns the locator, or throws if none of the cards' <select>s carry the
 * expected SPS/EPS/DPS/TPS options.
 */
export async function findModeSelect(page) {
  const card = conditionsCard(page);
  const selects = await card.locator('select').all();
  for (const sel of selects) {
    const opts = await sel.evaluate((el) => Array.from(el.options).map((o) => o.value));
    if (opts.some((o) => ['SPS', 'EPS', 'DPS', 'TPS'].includes(o))) return sel;
  }
  throw new Error('findModeSelect: no SPS/EPS/DPS/TPS <select> in Conditions card');
}

/**
 * Fill a labelled number input inside a card by matching its label text.
 * Triple-clicks to select existing value, fills, presses Tab to commit.
 */
export async function fillRowInput(card, labelText, value) {
  const labelLoc = card.locator(`text=${labelText}`);
  const labelCount = await labelLoc.count();
  if (labelCount === 0) {
    throw new Error(`fillRowInput: label "${labelText}" not found in card`);
  }
  const row = labelLoc.first().locator('../..');
  const input = row.locator('input[type="number"]').first();
  const visible = await input.isVisible().catch(() => false);
  if (!visible) {
    throw new Error(`fillRowInput: number input under label "${labelText}" is not visible`);
  }
  await input.click({ clickCount: 3 });
  await input.fill(String(value));
  await input.press('Tab');
}

/**
 * Fill one field of a specific Outputs-card row.
 *  • "I know" mode → Triple → 3 inputs/row [voltage, current, turnsRatio]
 *  • "Help me"   → Pair   → 2 inputs/row [voltage, current]
 * Throws on out-of-range row / wrong mode for the requested field.
 */
export async function fillOutput(oCard, rowIndex, field, value) {
  const fieldOrder = ['voltage', 'current', 'turnsRatio'];
  const fieldIdx = fieldOrder.indexOf(field);
  if (fieldIdx < 0) {
    throw new Error(`fillOutput: unknown field "${field}" (expected voltage|current|turnsRatio)`);
  }
  const inputs = oCard.locator('input[type="number"]');
  const total = await inputs.count();
  if (total === 0) throw new Error('fillOutput: no number inputs in outputs card');
  const hasTurns = (await oCard.locator('input[data-cy*="turnsRatio"]').count()) > 0;
  const cols = hasTurns ? 3 : 2;
  if (field === 'turnsRatio' && !hasTurns) {
    throw new Error('fillOutput: turnsRatio requested but outputs card is in 2-col mode');
  }
  const absIdx = rowIndex * cols + fieldIdx;
  if (absIdx >= total) {
    throw new Error(
      `fillOutput: row ${rowIndex} field "${field}" → input ${absIdx} out of range ` +
      `(${total} inputs, ${cols} cols)`
    );
  }
  const input = inputs.nth(absIdx);
  const visible = await input.isVisible().catch(() => false);
  if (!visible) {
    throw new Error(`fillOutput: input #${absIdx} (row ${rowIndex} ${field}) is not visible`);
  }
  await input.click({ clickCount: 3 });
  await input.fill(String(value));
  await input.press('Tab');
}

/**
 * Switch the wizard to "I know the design I want" mode. Verifies that the
 * Transformer card appears (which is gated on the mode switch).
 */
export async function switchToIKnowMode(page) {
  const label = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
  if (await label.isVisible().catch(() => false)) {
    await label.click();
  } else {
    const fallback = page.locator('text=I know the design I want').first();
    if (!(await fallback.isVisible().catch(() => false))) {
      throw new Error('switchToIKnowMode: neither .design-mode-label nor fallback text found');
    }
    await fallback.click();
  }
  await settleAnimations(page, 300);
  const switched = await transformerCard(page).isVisible().catch(() => false);
  if (!switched) {
    throw new Error('switchToIKnowMode: Transformer card not visible after mode switch');
  }
}
