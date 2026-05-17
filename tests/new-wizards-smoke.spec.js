/**
 * Smoke tests for the 5 new wizards (Cuk, Zeta, FourSwitchBuckBoost, Weinberg, CLLLC).
 *
 * Each test opens the wizard via its header link, asserts the title is shown,
 * and runs the Analytical compute path. Headless-only — never run with --headed.
 */

import { test, expect } from './_coverage.js';
import { openWizard, runAnalytical, isBenign } from './utils.js';

const WIZARDS = [
  { cy: 'Cuk-CommonModeChoke-link',                title: 'Cuk Wizard' },
  { cy: 'Zeta-CommonModeChoke-link',               title: 'Zeta Wizard' },
  { cy: 'FourSwitchBuckBoost-CommonModeChoke-link',title: 'Four-Switch Buck-Boost Wizard' },
  { cy: 'Weinberg-CommonModeChoke-link',           title: 'Weinberg Wizard' },
  { cy: 'Clllc-link',                              title: 'CLLLC Wizard' },
];

for (const w of WIZARDS) {
  test(`${w.title} – opens and runs analytical`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => { if (!isBenign(e.message)) errors.push(e.message); });
    page.on('console', m => { if (m.type() === 'error' && !isBenign(m.text())) errors.push(m.text()); });

    await openWizard(page, w.cy);
    await expect(page.locator('.wizard-title')).toContainText(w.title, { timeout: 10000 });

    // Analytical compute should run without throwing. Some wizards may surface
    // a benign error banner (e.g. backend missing for CLLLC sim path) — we only
    // assert the button click does not raise an unhandled pageerror.
    await runAnalytical(page, 60000);

    expect(errors, `Unhandled errors: ${errors.join('\n')}`).toEqual([]);
  });
}
