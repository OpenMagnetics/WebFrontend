/**
 * tests/mb-core-advise-no-candidate.spec.js
 *
 * Web bug report #194: the builder sat on an empty Core Configuration after Core Advise. The
 * adviser had culled every candidate, and the user read "No core can be advised. You are on
 * your own.", gone after 10 s: the task queue threw "No suitable core found ...", which the Core
 * panel only recognised as "no candidate" by matching /no candidate/i, so the engine's reason
 * was dropped. The same advise also switched the engine's temperature gate off every time: it
 * read adviserSettings.enableTemperatureFilter, a key the settings store no longer has.
 *
 * calculate_advised_cores is answered in the page with an empty result and the adviser's log, so
 * the reason is known; everything after the engine call runs for real.
 */
import { test, expect } from './_coverage.js';
import { stubEngineCalls, stubbedEngineCalls, withPinia, pause } from './utils/index.js';
import { goToBuilderStep, adviseCoreAndWait } from './utils/builder-helpers.js';

const ENGINE_REASON = 'Post-gap fringing guard rejected 48 core(s) whose finalized gap exceeded the fringing-factor limit (winding/proximity-loss risk).';
const ADVISER_LOG = [
    '[2026-11-13 12:52:57.381] [WARNING] [Core adviser] Dropping core material \'95\' from the ferrite candidate ranking: an operating frequency lies outside its fitted Steinmetz span',
    '[2026-11-13 12:52:59.449] [INFO] [Core adviser] Evaluating 812 candidates',
    `[2026-11-13 12:53:37.127] [WARNING] [Core adviser] ${ENGINE_REASON}`,
].join('\n');

async function coreSelectorErrorMessage(page) {
    return page.evaluate(() => {
        const button = document.querySelector('[data-cy$="-Core-Advise-button"]');
        if (button == null) throw new Error('Core Advise button not found');
        let instance = button.__vueParentComponent;
        while (instance != null && !(instance.type?.__file ?? '').endsWith('BasicCoreSelector.vue')) {
            instance = instance.parent;
        }
        if (instance == null) throw new Error('BasicCoreSelector instance not found above the Core Advise button');
        return instance.proxy.errorMessage;
    });
}

test.describe('Magnetic Builder — Core Advise without a candidate', () => {
    test.describe.configure({ timeout: 240000 });

    test('MB-ADVISE-NONE-1: the engine reason is shown and kept, and the temperature gate is the user\'s', async ({ page }) => {
        await stubEngineCalls(page, { calculate_advised_cores: JSON.stringify({ data: [], log: ADVISER_LOG }) });
        await goToBuilderStep(page);

        // The user's temperature gate, written to the engine as the Settings dialog does.
        const gate = await withPinia(page, async (pinia) => {
            const diagnostics = pinia._s.get('engineDiagnostics');
            await diagnostics.setTemperatureFilter(true, 120);
            return { enabled: diagnostics.coreAdviserEnableTemperatureFilter, maximum: diagnostics.coreAdviserMaximumTemperature };
        });
        expect(gate).toEqual({ enabled: true, maximum: 120 });

        await adviseCoreAndWait(page);
        expect((await stubbedEngineCalls(page)).map((call) => call.method)).toEqual(['calculate_advised_cores']);

        // The reason reaches the Engine log, as an error from the Core panel.
        const records = await withPinia(page, (pinia) => pinia._s.get('engineDiagnostics').records.map((r) => ({ level: r.level, module: r.module, message: r.message })));
        const adviseErrors = records.filter((r) => r.level === 'ERROR' && /core/i.test(r.module) && /advis/i.test(r.message));
        // One advise, one record: the Core panel's, which says why.
        expect(adviseErrors, JSON.stringify(records)).toHaveLength(1);
        expect(adviseErrors[0].module).toBe('Core');
        expect(adviseErrors[0].message).toContain('No core can be advised for these requirements');
        expect(adviseErrors[0].message).toContain(ENGINE_REASON);
        expect(adviseErrors[0].message).not.toContain('You are on your own');

        // The advise kept the user's gate instead of switching it off.
        const engineGate = await withPinia(page, async (pinia) => {
            const diagnostics = pinia._s.get('engineDiagnostics');
            await diagnostics.loadFromEngine();
            return { enabled: diagnostics.coreAdviserEnableTemperatureFilter, maximum: diagnostics.coreAdviserMaximumTemperature };
        });
        expect(engineGate).toEqual({ enabled: true, maximum: 120 });

        // The message stays past the old 10 s auto-clear.
        expect(await coreSelectorErrorMessage(page)).toContain(ENGINE_REASON);
        await pause(page, 11000, 'the Core panel used to clear its adviser error after 10 s; nothing signals that it did not');
        expect(await coreSelectorErrorMessage(page)).toContain(ENGINE_REASON);
    });
});
