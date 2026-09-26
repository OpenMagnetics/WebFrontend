/**
 * Builder layouts (ABT #1121): the keys, and how a test switches between them.
 *
 * Kept beside the other builder helpers so the layout contract battery and the
 * per-layout specs agree on one list — a layout added to the registry without a
 * key here is a layout nothing tests.
 */

/** Registry keys, in the order Settings offers them. */
export const BUILDER_LAYOUTS = ['columns', 'rosano', 'cockpit', 'compare', 'planar'];

/** The root marker each layout renders, for asserting which one is on screen. */
export const LAYOUT_MARKERS = {
    columns: '-LayoutColumns',
    rosano: '-LayoutRosano',
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

/**
 * Runs in the page: measures whether a layout fits (ABT #1121).
 *
 * Four things a layout can get wrong that no assertion about a control being
 * present would catch — a child drawn outside its card, two cards on top of
 * each other, neighbours in a row starting at different heights, and the page
 * scrolling sideways. Pass it to `page.evaluate`.
 *
 * Text clipped inside its own control is deliberately NOT measured: the info
 * grids ellipsise their labels on purpose and carry the full name in a tooltip.
 */
export const auditGeometry = () => {
    const CARD = '.panel-frame, .core-config-panel, .wire-config-panel, .coil-config-panel,'
        + ' .coreinfo-panel, .wireinfo-panel, .coilinfo-panel, .graph-panel';
    const round = (value) => Math.round(value);
    const visible = (element) => {
        const box = element.getBoundingClientRect();
        if (box.width < 1 || box.height < 1) return false;
        const style = getComputedStyle(element);
        return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
    };
    const name = (element) => element.getAttribute('data-cy')
        || `${element.tagName.toLowerCase()}"${(element.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 32)}"`;

    const findings = { pageOverflow: null, escaping: [], overlaps: [], misaligned: [] };

    const root = document.documentElement;
    if (root.scrollWidth > root.clientWidth + 1) {
        findings.pageOverflow = { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
    }

    const cards = [...document.querySelectorAll(CARD)].filter(visible);

    for (const card of cards) {
        const cardBox = card.getBoundingClientRect();
        const walk = (element) => {
            for (const child of element.children) {
                if (!visible(child)) continue;
                const style = getComputedStyle(child);
                // Overlays, tooltips and loading spinners are placed against
                // something other than the flow on purpose — and so is
                // everything inside them, so the whole subtree is skipped.
                if (style.position === 'fixed' || style.position === 'absolute') continue;
                const box = child.getBoundingClientRect();
                const over = {
                    right: round(box.right - cardBox.right),
                    bottom: round(box.bottom - cardBox.bottom),
                    left: round(cardBox.left - box.left),
                    top: round(cardBox.top - box.top),
                };
                if (Math.max(over.right, over.bottom, over.left, over.top) > 2) {
                    findings.escaping.push({ card: name(card), child: name(child), over });
                }
                walk(child);
            }
        };
        walk(card);
    }

    const outer = cards.filter((card) => !cards.some((other) => other !== card && other.contains(card)));
    for (let i = 0; i < outer.length; i++) {
        for (let j = i + 1; j < outer.length; j++) {
            const a = outer[i].getBoundingClientRect();
            const b = outer[j].getBoundingClientRect();
            const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (width > 2 && height > 2) {
                findings.overlaps.push({ a: name(outer[i]), b: name(outer[j]), area: round(width * height) });
            }
        }
    }

    const rows = new Map();
    for (const card of outer) {
        const box = card.getBoundingClientRect();
        const key = Math.round(box.top / 24);
        if (!rows.has(key)) rows.set(key, []);
        rows.get(key).push({ card, box });
    }
    for (const [, members] of rows) {
        if (members.length < 2) continue;
        const tops = members.map((member) => member.box.top);
        const spread = Math.max(...tops) - Math.min(...tops);
        if (spread > 2) {
            findings.misaligned.push({ cards: members.map((member) => name(member.card)), topSpread: round(spread) });
        }
    }

    return findings;
};
