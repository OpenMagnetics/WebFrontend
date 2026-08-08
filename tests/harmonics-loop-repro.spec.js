/**
 * Regression coverage for a user-reported bug ("OM se queda pillado
 * pensando" / ABT #580, 2026-08-07): editing a harmonic in the Op. Points
 * harmonics view flooded the console with
 *   TypeError: null is not an object (evaluating 'modelValue.voltage.processed.rms')
 * forever, because processHarmonics nulled waveform/processed on the LIVE
 * store object across the WASM await while WaveformSimpleOutput re-rendered,
 * and the Dimension forceUpdate watcher re-emitted 'update' as a fake user
 * edit, creating a self-sustaining reactive loop.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

test.describe('harmonics edit does not loop', () => {
    test.describe.configure({ timeout: 240000 });

    test('editing harmonics produces no repeated processed.rms TypeError', async ({ page }) => {
        const errors = [];
        const starts = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
            if (msg.text().includes('[processHarmonics] START')) starts.push(msg.text());
        });
        page.on('pageerror', (err) => errors.push(String(err)));

        await page.goto(`${BASE_URL}/magnetic_tool`, { waitUntil: 'domcontentloaded' });
        await page.waitForURL('**/magnetic_tool', { timeout: 120000 });

        await page.click('button:has-text("Continue")');
        await page.click('text=I want to introduce a list of harmonics');

        await expect(page.locator('[data-cy$="-Harmonic-0-add-point-below-button"]').first())
            .toBeVisible({ timeout: 30000 });

        // The user hit this in SIMPLE mode ("Show advanced outputs" = No), which
        // mounts WaveformSimpleOutput ("Quick stats") — the component that
        // dereferences processed.rms unguarded. The default advancedMode=true
        // mounts the guarded WaveformOutput instead and hides the bug entirely.
        await page.click('[data-cy$="settings-modal-button"]');
        const advancedSlider = page.locator('[data-cy="Settings-Modal-bar-spider-button"]');
        await expect(advancedSlider).toBeVisible({ timeout: 15000 });
        await advancedSlider.evaluate((el) => {
            el.value = '0';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await page.click('[data-cy="Settings-Modal-update-settings-button"]');

        // Simple mode must be in effect, i.e. the Quick stats card is what renders.
        await expect(page.locator('text=Quick stats').first()).toBeVisible({ timeout: 30000 });

        // Let the mount-time processing chain settle before measuring.
        await page.waitForTimeout(9000);
        const baseline = errors.length;

        // Edit the current fundamental frequency — the path that cross-writes the
        // voltage fundamental and bumps forceUpdateVoltage (the old loop trigger).
        const startsBefore = starts.length;
        const target = page.locator('[data-cy="-Harmonic-1-HarmonicFrequency-1-number-input"] input').first();
        await target.scrollIntoViewIfNeeded();
        await target.click({ force: true });
        await target.press('Control+a');
        await target.pressSequentially('1000', { delay: 60 });
        await target.press('Tab');

        await page.waitForTimeout(12000);
        expect(starts.length - startsBefore,
            'the edit must actually reach processHarmonics, otherwise this test proves nothing')
            .toBeGreaterThan(0);

        // Now sit idle: a reactive loop keeps logging even with no interaction.
        const settled = errors.length;
        await page.waitForTimeout(8000);
        const whileIdle = errors.length - settled;

        const rmsErrors = errors.filter((e) => /processed/.test(e) && /null|undefined/.test(e));

        expect(whileIdle, `console must be quiet when idle (no reactive loop); baseline=${baseline} errors=${JSON.stringify(errors.slice(0, 5))}`).toBe(0);
        expect(rmsErrors, 'no processed.rms null dereference').toEqual([]);

        // Quick stats must still resolve to real values after the edit.
        await expect(page.locator('text=Calculating…')).toHaveCount(0);
    });
});
