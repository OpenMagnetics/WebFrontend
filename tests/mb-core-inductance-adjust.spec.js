/**
 * ABT #1083 — two buttons next to Customize in the Core column:
 *   "Gap for inductance"   → gap that reaches the required magnetizing
 *                            inductance with the turns as they are
 *   "Turns for inductance" → turns that reach it with the gap as it is
 *
 * Physics-consistent checks rather than pinned numbers: halving the required
 * inductance must LENGTHEN the gap (L ∝ 1/ℓ_gap for a gapped core); restoring
 * it afterwards, with that longer gap kept, must RAISE the turns above the
 * advised count (L ∝ N²). Going down first keeps the flux density below the
 * advised design's, so no saturation/thermal edge case is provoked. Both use
 * calculate_gapping_from_number_turns_and_inductance /
 * calculate_number_turns_from_gapping_and_inductance bindings.
 */
import { test, expect } from './_coverage.js';
import { isBenign, pause } from './utils.js';
import { goToBuilderStep, adviseCoreAndWait } from './utils/builder-helpers.js';

async function coreState(page) {
  return page.evaluate(() => {
    const app = document.querySelector('#app').__vue_app__;
    const mas = app.config.globalProperties.$pinia._s.get('mas').mas;
    const gaps = (mas.magnetic.core.functionalDescription.gapping ?? []).filter(g => g.type !== 'residual');
    return {
      type: mas.magnetic.core.functionalDescription.type,
      longestGap: gaps.length ? Math.max(...gaps.map(g => g.length)) : 0,
      turns: mas.magnetic.coil.functionalDescription.map(w => w.numberTurns),
      target: mas.inputs.designRequirements.magnetizingInductance,
    };
  });
}

async function scaleRequiredInductance(page, factor) {
  return page.evaluate((f) => {
    const app = document.querySelector('#app').__vue_app__;
    const req = app.config.globalProperties.$pinia._s.get('mas').mas.inputs.designRequirements.magnetizingInductance;
    if (req.nominal == null) throw new Error('test expects a nominal magnetizing inductance requirement');
    req.nominal *= f;
    if (req.minimum != null) req.minimum *= f;
    if (req.maximum != null) req.maximum *= f;
    return req.nominal;
  }, factor);
}

test.describe('MB – gap / turns for the required inductance (ABT #1083)', () => {
  test.describe.configure({ timeout: 300000 });

  test('halving the requirement lengthens the gap, restoring it raises the turns', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });
    page.on('pageerror', e => errors.push(`pageerror: ${e}`));

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await pause(page, 2000, 'advise settle');

    const gapBtn = page.locator('[data-cy$="-Core-GapToInductance-button"]').first();
    const turnsBtn = page.locator('[data-cy$="-Core-TurnsToInductance-button"]').first();
    await expect(gapBtn, 'the gap button must sit in the core submenu').toBeVisible({ timeout: 15000 });
    await expect(turnsBtn, 'the turns button must sit in the core submenu').toBeVisible();

    const before = await coreState(page);
    expect(before.type, 'the advised buck core must be gappable').toBe('twoPieceSet');
    expect(before.longestGap, 'the advised core must be gapped').toBeGreaterThan(0);
    expect(before.turns[0]).toBeGreaterThan(0);
    await expect(gapBtn).toBeEnabled();
    await expect(turnsBtn).toBeEnabled();

    // ── Gap for inductance: L halved with the same turns → gap must grow.
    await scaleRequiredInductance(page, 0.5);
    await gapBtn.click();
    await expect(page.locator('[data-cy$="-Core-adjust-info"]'), 'a confirmation must be shown').toBeVisible({ timeout: 30000 });
    await pause(page, 2000, 'core reprocess after the new gap');
    const afterGap = await coreState(page);
    expect(afterGap.turns, 'the gap button must not touch the turns').toEqual(before.turns);
    expect(afterGap.longestGap, `a halved inductance needs a longer gap (was ${before.longestGap})`).toBeGreaterThan(before.longestGap);

    // ── Turns for inductance: requirement restored with the LONGER gap kept → more turns than advised.
    await scaleRequiredInductance(page, 2);
    await turnsBtn.click();
    await expect(page.locator('[data-cy$="-Core-adjust-info"]')).toContainText('Turns set to', { timeout: 30000 });
    await pause(page, 3000, 'rewind after the new turns');
    const afterTurns = await coreState(page);
    expect(afterTurns.longestGap, 'the turns button must not touch the gap').toBeCloseTo(afterGap.longestGap, 9);
    expect(afterTurns.turns[0], `the original inductance across a longer gap needs more turns (was ${afterGap.turns[0]})`).toBeGreaterThan(afterGap.turns[0]);
    expect(Number.isInteger(afterTurns.turns[0])).toBe(true);

    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });
});
