/**
 * Regression coverage for a user-reported bug (2026-08-07): in the Magnetic
 * Builder "Graphs" panel, MINIMUM/MAXIMUM DC BIAS and NO. POINTS rendered as
 * bare labels — the <InputNumber> was in the DOM but clipped to height 0
 * (GraphCommonParameters stacks .dim-row into a column, so Dimension's
 * `flex: 1 1 0` put the basis on the HEIGHT, and the refactored
 * .dim-value-row's `overflow: hidden` clipped it away).
 *
 * Measures the rendered height of each field's input, not just its
 * presence — the input WAS present in the DOM the whole time, so a mere
 * existence check would not have caught this.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

const MAS_FIXTURE = new URL('./fixtures/04_forward_xfmr_e3216_n87.json', import.meta.url).pathname;

test.describe('Magnetic Builder Graphs panel — DC-bias fields', () => {
    test.describe.configure({ timeout: 120000 });

    test('graph DC-bias fields render a visible input', async ({ page }) => {
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
        await page.waitForTimeout(800);
        await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(MAS_FIXTURE);
        await page.waitForURL('**/magnetic_tool**', { timeout: 60000 });
        await page.waitForTimeout(5000);

        await page.evaluate(() => {
            const ss = document.querySelector('#app').__vue_app__.config.globalProperties.$stateStore;
            ss.setCurrentToolSubsection('magneticBuilder');
            // The Graphs panel is behind a MagneticBuilder setting that defaults off.
            const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
            const mbs = pinia.state.value.magneticBuilderSettings;
            if (mbs) mbs.enableGraphs = true;
            ss.graphParameters.graph = 'magnetizingInductanceOverDcBias';
        });
        await page.waitForTimeout(12000);

        const probe = await page.evaluate(() => {
            const rows = [];
            document.querySelectorAll('[data-cy*="GraphCommonParameters"]').forEach((el) => {
                const dc = el.dataset.cy;
                const input = el.querySelector('input');
                const valueRow = el.querySelector('.dim-value-row');
                const r = input ? input.getBoundingClientRect() : null;
                const vr = valueRow ? valueRow.getBoundingClientRect() : null;
                rows.push({
                    dc,
                    hasInput: !!input,
                    inputValue: input ? input.value : null,
                    inputHeight: r ? Math.round(r.height) : 0,
                    valueRowHeight: vr ? Math.round(vr.height) : 0,
                });
            });
            return rows;
        });

        // Only the field containers — '-title' / '-DimensionUnit-input' sub-nodes
        // legitimately hold no <input> of their own.
        const dcFields = probe.filter((r) => /(DcBias|NumberPoints)-container$/.test(r.dc || ''));
        expect(dcFields.length, `no DC-bias/points fields found; saw ${JSON.stringify(probe.map(p => p.dc))}`)
            .toBeGreaterThan(0);
        for (const f of dcFields) {
            expect(f.hasInput, `${f.dc} must render an <input>`).toBe(true);
            expect(f.inputHeight, `${f.dc} input must have non-zero height`).toBeGreaterThan(8);
            expect(f.valueRowHeight, `${f.dc} value row must have non-zero height`).toBeGreaterThan(8);
            expect(f.inputValue, `${f.dc} must show a value`).not.toBe('');
        }
    });
});
