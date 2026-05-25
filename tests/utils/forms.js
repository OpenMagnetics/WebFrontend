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
 * Switch the wizard to "I know the design I want" mode. Verifies the radio
 * is selected after the click. The post-switch UI differs per topology:
 * isolated wizards reveal a Transformer card, non-isolated wizards (Buck /
 * Boost / Sepic / Cuk / Zeta / FSBB) reveal an Inductance input instead —
 * so this helper does NOT assert any specific card, only that the mode
 * actually switched.
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
  // Verify the I-know radio is now checked. Two wizard styles render this:
  //  (a) DAB/PSFB/PSHB/AHB: inline <label class="design-mode-option">
  //      <input type="radio" v-model="localData.designMode" value="..."/>
  //      <span class="design-mode-label">I know the design I want</span></label>
  //  (b) BuckBoost/Forward/IsolatedBuckBoost/PushPull/etc.: ElementFromListRadio
  //      renders <input type="radio" id="<value>-radio-input"> with a sibling
  //      <label for="<value>-radio-input">option text</label>.
  // Walk every checked radio, look at its associated label (either wrapping
  // <label> ancestor or sibling label[for=id]) and confirm the text matches.
  const switched = await page.evaluate(() => {
    const checked = [...document.querySelectorAll('input[type="radio"]:checked')];
    for (const input of checked) {
      const wrap = input.closest('label')?.textContent || '';
      const id = input.id;
      const forLbl = id ? (document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent || '') : '';
      const valueAttr = input.getAttribute('value') || '';
      if (/I know the design I want/i.test(wrap) || /I know the design I want/i.test(forLbl) || /I know the design I want/i.test(valueAttr)) {
        return true;
      }
    }
    return false;
  });
  if (!switched) {
    throw new Error('switchToIKnowMode: I-know radio not selected after click');
  }
}
