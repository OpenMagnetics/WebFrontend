// DMC wizard → "Review Specs" must open the design-requirements step.
//
// The DMC hands off with application 'filter'. The requirements step reads
// its required and optional lists by application, and 'filter' had none, so
// the step threw on every render: an empty page on prod, a recursive-update
// crash in dev. These tests open the step from each hand-off the DMC wizard
// produces and check it renders the requirement index without any error.
import { test, expect } from './_coverage.js';
import { openWizard, runAnalytical, tryWaitForURL, pause, softVisible, switchToIKnowMode } from './utils.js';

const LABEL = 'MagneticBuilder-DesignRequirements';
const REQUIRED = ['NumberWindings', 'MagnetizingInductance', 'TurnsRatios'];

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
    page.on('console', (m) => {
        const text = m.text();
        if (m.type() === 'error' || /Unhandled error/.test(text)) errors.push(`[${m.type()}] ${text}`);
    });
    return errors;
}

async function openReviewSpecs(page, { singleLine = false, iKnow = false } = {}) {
    await openWizard(page, 'Dmc-link');
    if (singleLine) {
        const radio = page.locator('label, .form-check-label, span').filter({ hasText: /single line/i }).first();
        expect(await softVisible(radio), 'the DMC wizard offers a single-line configuration').toBe(true);
        await radio.click();
        await pause(page, 300, 'dmc review specs: configuration settles');
    }
    if (iKnow) await switchToIKnowMode(page);
    await runAnalytical(page, 30000);
    await page.locator('button').filter({ hasText: 'Review Specs' }).first().click();
    await tryWaitForURL(page, '**/magnetic_tool**', 60000);
    await page.locator(`[data-cy="${LABEL}-${REQUIRED[0]}-required-button"]`).waitFor({ state: 'visible', timeout: 30000 });
}

async function requirementRows(page) {
    return page.evaluate(() => ({
        application: document.querySelector('#app').__vue_app__.config.globalProperties.$pinia.state.value.state.selectedApplication,
        required: [...document.querySelectorAll('[data-cy$="-required-button"]')].map((e) => e.dataset.cy),
        optional: [...document.querySelectorAll('[data-cy$="-add-remove-button"]')].map((e) => e.dataset.cy),
    }));
}

for (const variant of [
    { name: 'two-line', opts: {} },
    { name: 'single-line', opts: { singleLine: true } },
    { name: 'I know the design', opts: { iKnow: true } },
]) {
    test(`DMC-REVIEW-1 ${variant.name}: Review Specs opens the requirements step without errors`, async ({ page }) => {
        test.setTimeout(180000);
        const errors = watchErrors(page);
        await openReviewSpecs(page, variant.opts);
        const rows = await requirementRows(page);
        expect(rows.application).toBe('filter');
        expect(rows.required.sort()).toEqual(REQUIRED.map((n) => `${LABEL}-${n}-required-button`).sort());
        // Every other requirement the application lists is offered as an optional row.
        expect(rows.optional.length).toBeGreaterThan(0);
        for (const name of ['MinimumImpedance', 'WiringTechnology', 'Insulation', 'IsolationSides', 'OperatingTemperature']) {
            expect(rows.optional).toContain(`${LABEL}-${name}-add-remove-button`);
        }
        expect(errors).toEqual([]);
    });
}

test('DMC-REVIEW-2: changing the wiring technology of a wound DMC resets it to the DMC default magnetic', async ({ page }) => {
    test.setTimeout(180000);
    const errors = watchErrors(page);
    await openReviewSpecs(page);
    // Stand in for a coil that was already wound: the reset only applies when
    // the coil has a turns description. The core name marks the old magnetic.
    await page.evaluate(() => {
        const mas = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia.state.value.mas.mas;
        mas.magnetic.coil.turnsDescription = [];
        mas.magnetic.core.name = 'dmc-review-2-wound-core';
    });
    await page.locator(`[data-cy="${LABEL}-WiringTechnology-add-remove-button"]`).click();
    await page.locator(`[data-cy="${LABEL}-WiringTechnology-printed-radio-input"]`).click();
    await page.waitForFunction(() => {
        const mas = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia.state.value.mas.mas;
        return mas.magnetic.core.name !== 'dmc-review-2-wound-core';
    }, null, { timeout: 15000 });
    const magnetic = await page.evaluate(() => {
        const mas = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia.state.value.mas.mas;
        return {
            wiringTechnology: mas.inputs.designRequirements.wiringTechnology,
            coreName: mas.magnetic.core.name,
            turnsDescription: mas.magnetic.coil.turnsDescription ?? null,
            windings: mas.magnetic.coil.functionalDescription.map((w) => ({ name: w.name, isolationSide: w.isolationSide })),
        };
    });
    expect(magnetic.wiringTechnology).toBe('printed');
    // The DMC default (dmcMas), not the common-mode choke one (two windings, Primary/Secondary).
    expect(magnetic).toEqual({
        wiringTechnology: 'printed',
        coreName: 'DummyCore',
        turnsDescription: null,
        windings: [{ name: 'Primary', isolationSide: 'primary' }],
    });
    expect(errors).toEqual([]);
});
