/**
 * Builder layouts (ABT #1121): the keys, and how a test switches between them.
 *
 * Kept beside the other builder helpers so the layout contract battery and the
 * per-layout specs agree on one list — a layout added to the registry without a
 * key here is a layout nothing tests.
 */

/** Registry keys, in the order Settings offers them. */
export const BUILDER_LAYOUTS = ['columns', 'bands', 'cockpit', 'compare', 'planar'];

/** The root marker each layout renders, for asserting which one is on screen. */
export const LAYOUT_MARKERS = {
    columns: '-LayoutColumns',
    bands: '-LayoutBands',
    cockpit: '-LayoutCockpit',
    compare: '-LayoutCompare',
    planar: '-LayoutPlanar',
};

/**
 * Switch layout the way the app does: through the setting. The Settings dialog
 * writes the same key, and `mb-layouts.spec.js` covers that path separately.
 */
export async function setBuilderLayout(page, key) {
    if (!BUILDER_LAYOUTS.includes(key)) {
        throw new Error(`Unknown builder layout "${key}"`);
    }
    await page.evaluate((layout) => {
        const app = document.querySelector('#app').__vue_app__;
        app.config.globalProperties.$pinia._s.get('magneticBuilderSettings').layout = layout;
    }, key);
}

/** The layout the store currently holds. */
export async function currentBuilderLayout(page) {
    return page.evaluate(() => {
        const app = document.querySelector('#app').__vue_app__;
        return app.config.globalProperties.$pinia._s.get('magneticBuilderSettings').layout;
    });
}

/** The parts of the design a layout must never change by being chosen. */
export async function designFingerprint(page) {
    return page.evaluate(() => {
        const app = document.querySelector('#app').__vue_app__;
        const magnetic = app.config.globalProperties.$pinia._s.get('mas').mas.magnetic;
        const name = (value) => (typeof value === 'string' ? value : value?.name ?? null);
        return {
            shape: name(magnetic.core.functionalDescription.shape),
            material: name(magnetic.core.functionalDescription.material),
            gapping: (magnetic.core.functionalDescription.gapping ?? []).map((gap) => gap.length),
            turns: magnetic.coil.functionalDescription.map((winding) => winding.numberTurns),
            wires: magnetic.coil.functionalDescription.map((winding) => name(winding.wire)),
        };
    });
}
