/**
 * Shared Kirchhoff diagnostics card (src/components/Wizards/KhDiagnosticsPanel.vue).
 *
 * The card renders Kirchhoff's universal diagnostics envelope in three sections:
 * Operating point (value tiles), Components (label/value rows) and Windings (a table
 * with the windings as columns). Every section and row is conditional on the envelope.
 *
 * LLC exercises all three sections, a transformer (magnetizing inductance, turns ratio),
 * a resonant tank and a capacitor role tag. Buck exercises the inductor-only case: no
 * turns ratio, the main inductance labelled "Inductance", one winding column.
 */
import { test, expect } from './_coverage.js';
import { openWizard, runAnalytical } from './utils/index.js';
import { collectConsoleErrors } from './utils/console.js';
import { expectNoConsoleErrors } from './utils/assertions.js';
import { getWizard } from './utils/catalog.js';

const cy = (prefix, key) => `[data-cy="${prefix}-KhDiagnostics-${key}"]`;

test.describe('Kirchhoff diagnostics card', () => {
  test.setTimeout(120_000);

  test('LLC: operating point tiles, components with roles, windings table', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const { linkCy, wizardPrefix: p } = getWizard('llc');
    await openWizard(page, linkCy);
    await runAnalytical(page, 60_000);

    await expect(page.locator(cy(p, 'panel')).first()).toBeVisible();

    // Operating point: one tile per scalar, value + label.
    const op = page.locator(cy(p, 'operatingPoint')).first();
    await expect(op).toBeVisible();
    for (const key of ['switchingFrequency', 'primaryRmsCurrent', 'conductionMode', 'dutyCycle', 'primaryPeakCurrent']) {
      await expect(op.locator(cy(p, key))).toHaveCount(1);
    }
    await expect(page.locator(cy(p, 'switchingFrequency-value')).first()).toHaveText(/^\d+(\.\d+)? (Hz|kHz|MHz)$/);
    await expect(page.locator(cy(p, 'conductionMode-value')).first()).toHaveText(/^(CCM|DCM)$/);
    await expect(page.locator(cy(p, 'primaryRmsCurrent-value')).first()).toHaveText(/^\d+\.\d{3} A$/);

    // Components: transformer rows and the capacitor role tag.
    const comp = page.locator(cy(p, 'components')).first();
    await expect(comp).toBeVisible();
    await expect(page.locator(cy(p, 'inductance')).first()).toContainText('Magnetizing inductance');
    await expect(page.locator(cy(p, 'inductance-value')).first()).toHaveText(/^\d+(\.\d+)? (nH|µH|mH|H)$/);
    await expect(page.locator(cy(p, 'turnsRatio-value')).first()).toHaveText(/^\d+\.\d{3}$/);
    await expect(page.locator(cy(p, 'resonantCapacitance-value')).first()).toHaveText(/^\d+(\.\d+)? (pF|nF|µF|mF)$/);
    await expect(comp.locator('[data-cy$="-role"]', { hasText: 'resonant' })).toHaveCount(1);
    await expect(comp.locator('[data-cy$="-rating"]').first()).toHaveText(/^\d+\.\d V rated$/);

    // Windings: windings are the columns, quantities the rows, with a units column.
    const win = page.locator(cy(p, 'windings')).first();
    await expect(win).toBeVisible();
    await expect(win.locator('thead th')).toHaveText(['Quantity', 'Unit', 'Primary', 'Winding 2']);
    await expect(win.locator(cy(p, 'winding-currentRms')).locator('th')).toHaveText('RMS current');
    await expect(win.locator(cy(p, 'winding-currentRms')).locator('td').first()).toHaveText('A');
    await expect(win.locator(cy(p, 'winding-voltagePeak')).locator('td').first()).toHaveText('V');

    expectNoConsoleErrors(errors);
  });

  test('Buck: inductor-only card has no turns ratio and one winding column', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const { linkCy, wizardPrefix: p } = getWizard('buck');
    await openWizard(page, linkCy);
    await runAnalytical(page, 60_000);

    await expect(page.locator(cy(p, 'operatingPoint')).first()).toBeVisible();
    await expect(page.locator(cy(p, 'inductance')).first()).toContainText(/^\s*Inductance/);
    await expect(page.locator(cy(p, 'turnsRatio'))).toHaveCount(0);
    await expect(page.locator(cy(p, 'resonantCapacitance'))).toHaveCount(0);
    await expect(page.locator(cy(p, 'windings')).first().locator('thead th')).toHaveText(['Quantity', 'Unit', 'Primary']);

    expectNoConsoleErrors(errors);
  });
});
