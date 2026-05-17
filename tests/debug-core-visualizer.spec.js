/**
 * Regression test: Core2DVisualizer / Core3DVisualizer WASM functions work
 * with a core-only magnetic (no coil).
 *
 * Root causes fixed:
 *  1. magnetic_autocomplete_safe: Coil(empty_json) threw "key 'bobbin' not found"
 *  2. create_geometrical_description always called so buildCore gets full CoreShape variant
 *  3. applyMachining: zero-length gap created degenerate OCCT box → crash in WASM
 */
import { test, expect } from '@playwright/test';
import { BASE_URL, pause } from './utils.js';

const SIMPLE_CORE_MAGNETIC = {
    core: {
        functionalDescription: {
            shape: 'E 32/6/20',
            material: 'N87',
            gapping: [
                { type: 'subtractive', length: 0 },
                { type: 'subtractive', length: 0 },
                { type: 'residual', length: 0.0001 },
            ],
            numberStacks: 1,
            type: 'twoPieceSet',
        },
        geometricalDescription: null,
        processedDescription: null,
    },
};

test.describe('Core Visualizer WASM regression', () => {
    test.describe.configure({ timeout: 120000 });

    test('drawDimensionedFrontView core-only returns SVG', async ({ page }) => {
        await page.goto(`${BASE_URL}/magnetic_tool`, { waitUntil: 'networkidle', timeout: 30000 });
        await pause(page, 1000, 'mechanical: settle');

        const result = await page.evaluate(async (magnetic) => {
            let _mvbpp = null;
            try {
                const code = await (await fetch('/wasm/mvbpp.js')).text();
                const createMvbpp = new Function(code + '\nreturn createMvbpp;')();
                _mvbpp = await createMvbpp({ locateFile: (f) => `/wasm/${f}` });
            } catch(e) {
                return { error: 'init failed: ' + e.message };
            }

            try {
                // New unified API: drawView(json, dimensions, plane, offset,
                //                            widthPx, format).  Front view = XZ.
                const svg = _mvbpp.drawView(JSON.stringify(magnetic), true, 'XZ', 0.0, 400, 'svg');
                return {
                    ok: true,
                    svgLength: svg ? svg.length : 0,
                    hasSvgTag: svg ? svg.includes('<svg') : false,
                };
            } catch(e) {
                let msg = String(e);
                if (typeof e === 'number' && _mvbpp && _mvbpp.getExceptionMessage) {
                    try { msg = _mvbpp.getExceptionMessage(e); } catch {}
                }
                return { error: 'WASM ptr=' + e + ': ' + msg };
            }
        }, SIMPLE_CORE_MAGNETIC);

        expect(result.error).toBeUndefined();
        expect(result.ok).toBe(true);
        expect(result.hasSvgTag).toBe(true);
    });

    test('buildCoreSTL core-only returns binary data', async ({ page }) => {
        await page.goto(`${BASE_URL}/magnetic_tool`, { waitUntil: 'networkidle', timeout: 30000 });
        await pause(page, 1000, 'mechanical: settle');

        const result = await page.evaluate(async (magnetic) => {
            let _mvbpp = null;
            try {
                const code = await (await fetch('/wasm/mvbpp.js')).text();
                const createMvbpp = new Function(code + '\nreturn createMvbpp;')();
                _mvbpp = await createMvbpp({ locateFile: (f) => `/wasm/${f}` });
            } catch(e) {
                return { error: 'init failed: ' + e.message };
            }

            try {
                // New unified API: drawCore(magnetic, mode, plane, offset,
                //                            format, scale, polygonSegments,
                //                            symmetry, side).
                const stl = _mvbpp.drawCore(JSON.stringify(magnetic), '3D', 'XY', 0.0, 'stl', 1.0, 32, 'none', '');
                return { ok: true, stlLength: stl ? stl.length : 0 };
            } catch(e) {
                let msg = String(e);
                if (typeof e === 'number' && _mvbpp && _mvbpp.getExceptionMessage) {
                    try { msg = _mvbpp.getExceptionMessage(e); } catch {}
                }
                return { error: 'WASM ptr=' + e + ': ' + msg };
            }
        }, SIMPLE_CORE_MAGNETIC);

        expect(result.error).toBeUndefined();
        expect(result.ok).toBe(true);
        expect(result.stlLength).toBeGreaterThan(0);
    });
});
