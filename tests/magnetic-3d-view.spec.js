/**
 * "Do we have 3D on the web?" — the end-to-end answer, in a real browser.
 *
 * Two different questions, deliberately kept apart:
 *
 * 3DW-1 (engine)  Does the mvbpp.wasm WE ACTUALLY SERVE build geometry for a
 *                 magnetic that still needs a QUICK BOBBIN — core shape by name,
 *                 bobbin "basic", no geometricalDescription? This is the ABT #631
 *                 regression guard. Verified to FAIL against the pre-fix engine
 *                 (CORE_SHAPE_NOT_FOUND: EI 101/50) and pass after it.
 *
 * 3DW-2 (viewer)  Does the Magnetic Builder actually put geometry on screen?
 *                 Note this path does NOT reproduce #631 and passes on the old
 *                 engine too: the app pre-enriches the bobbin through libMKF.wasm
 *                 (compiled WITH exceptions, so MKF's catalogue skip works there)
 *                 before mvbpp is ever called. That is why the bug was invisible
 *                 from the UI and only showed up when a raw MAS went straight to
 *                 mvbpp. 3DW-2 exists to catch the OTHER failure: Magnetic3DVisualizer
 *                 wraps every mesh build in try/catch and only console.warn's
 *                 ("Could not build core/turns/bobbin"), so an engine that breaks
 *                 renders as an EMPTY SCENE, not an error.
 *
 * 3DW-3 (export) Does the whole-magnetic export still work through the app's own
 *                worker, in both idealised and REAL-WINDING mode? drawMagnetic is the
 *                one call whose arity the newer mvbpp changed (10 -> 12), and getting
 *                it wrong breaks "Download STP model" with an error that reads like a
 *                geometry failure.
 *
 * No test asserts "a canvas exists" — that proves nothing. They assert on the geometry:
 * bytes out of the engine, and meshes actually added to the three.js scene.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { BASE_URL, pause } from './utils.js';
import { openWizard, runAnalytical, goToMagneticBuilder } from './utils/nav.js';
import { runCoreAdviser } from './utils/steps.js';

// A raw MAS as it comes out of the catalogue: core shape by NAME, bobbin left as
// the "basic" placeholder, no geometricalDescription. This is the shape of design
// that needs a QUICK BOBBIN, which is what #631 killed.
const RAW_BY_NAME_MAGNETIC = {
    core: {
        functionalDescription: {
            shape: 'E 32/6/20',
            material: 'N87',
            gapping: [
                { type: 'subtractive', length: 0.001 },
                { type: 'residual', length: 0.00001 },
                { type: 'residual', length: 0.00001 },
            ],
            numberStacks: 1,
            type: 'twoPieceSet',
        },
        geometricalDescription: null,
        processedDescription: null,
    },
    coil: {
        bobbin: 'basic',
        functionalDescription: [
            {
                name: 'Primary',
                numberTurns: 12,
                numberParallels: 1,
                isolationSide: 'primary',
                wire: 'Round 0.5 - Grade 1',
            },
        ],
    },
};

// A fully-enriched, wound magnetic: real-winding geometry needs turns to route.
const REAL_WINDING_MAGNETIC = JSON.parse(
    readFileSync(new URL('./fixtures/etd49_wound_10uH_5T.json', import.meta.url), 'utf-8'),
).magnetic;

async function goToRoute(page, route, timeout = 60000) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout });
    await page.waitForFunction(
        () => !window.location.pathname.includes('engine_loader'),
        null,
        { timeout },
    );
    await pause(page, 800, 'mechanical: settle');
}

// The dev server's HMR socket points at a fixed port; when vite falls back to
// another port those failures flood the console and have nothing to do with 3D.
const isAppNoise = (text) => /\[vite\]|WebSocket|HMR/i.test(text);

test.describe('3D on the web', () => {
    test.describe.configure({ timeout: 180000 });

    test('3DW-1: the SERVED engine builds core, turns and assembly geometry for a by-name design (ABT #631)', async ({ page }) => {
        await goToRoute(page, '/magnetic_tool');

        const result = await page.evaluate(async (magnetic) => {
            const code = await (await fetch('/wasm/mvbpp.js')).text();
            const createMvbpp = new Function(code + '\nreturn createMvbpp;')();
            const mvbpp = await createMvbpp({ locateFile: (f) => `/wasm/${f}` });

            const json = JSON.stringify(magnetic);
            const args = [json, '3D', 'XY', 0.0, 'stl', 1.0, 16, 'none', ''];
            const run = (name, call) => {
                try {
                    const out = call();
                    return { name, ok: true, bytes: out ? out.length : 0 };
                } catch (e) {
                    const msg = typeof e === 'number'
                        ? (mvbpp.getExceptionMessage?.(e) ?? String(e))
                        : (e.message || String(e));
                    return { name, ok: false, error: String(msg).slice(0, 300) };
                }
            };
            return [
                // drawTurns and drawMagnetic both take the trailing real-winding pair
                // (useRealWindingGeometry, femReady); embind enforces exact arity, so pass
                // undefined to select the documented default.
                run('drawCore', () => mvbpp.drawCore(...args)),
                run('drawTurns', () => mvbpp.drawTurns(...args, true, undefined, undefined)),
                run('drawMagnetic', () => mvbpp.drawMagnetic(...args, true, undefined, undefined)),
            ];
        }, RAW_BY_NAME_MAGNETIC);

        for (const step of result) {
            expect(step.error ?? null, `${step.name} threw`).toBeNull();
            // An STL with no triangles is 84 bytes of header. Real geometry is far larger.
            expect(step.bytes, `${step.name} produced no geometry`).toBeGreaterThan(1000);
        }
    });

    // drawMagnetic is the ONE worker call whose arity the newer mvbpp changed (10 -> 12,
    // the trailing real-winding pair). Sending ten throws, which takes out both
    // "Download STP model" and the full-magnetic STL with an error that reads like a
    // geometry failure. Exercise the real runtime, not the raw module, so the worker's
    // argument list is what is under test.
    test('3DW-3: buildMagneticSTEP works in both ideal and real-winding modes', async ({ page }) => {
        await goToRoute(page, '/magnetic_tool');

        const out = await page.evaluate(async (magnetic) => {
            const rt = await import('/WebSharedComponents/assets/js/mvbRuntime.js');
            await rt.initMvbWorker();
            const res = {};
            for (const [label, opts] of [['ideal', {}], ['real', { useRealWindingGeometry: true }]]) {
                try {
                    const buf = await rt.buildMagneticSTEP(magnetic, opts);
                    res[label] = { bytes: buf.byteLength ?? buf.length };
                } catch (e) {
                    res[label] = { error: String(e.message || e).slice(0, 200) };
                }
            }
            return res;
        }, REAL_WINDING_MAGNETIC);

        expect(out.ideal.error ?? null, 'ideal-winding STEP export failed').toBeNull();
        expect(out.real.error ?? null, 'real-winding STEP export failed').toBeNull();
        expect(out.ideal.bytes).toBeGreaterThan(10000);
        expect(out.real.bytes).toBeGreaterThan(10000);
        // The two modes describe the same metal with different topology — one continuous
        // body per (winding, parallel) vs per-turn closed loops — so they must not be
        // byte-identical, or the flag silently did nothing.
        expect(out.real.bytes).not.toBe(out.ideal.bytes);
    });

    // The 3D VIEWER draws core, bobbin and turns as separate meshes so each can carry its
    // own colour and visibility toggle — so it cannot use the single-call drawMagnetic
    // assembly, and for a long time that meant it could not show the real winding at all.
    // drawTurns now has the real-winding form (MVB++), routed through the same
    // MagneticBuilder implementation the export uses, so the picture and the CAD agree.
    test('3DW-4: buildTurnsSTL draws the real winding, and it differs from the idealised loops', async ({ page }) => {
        await goToRoute(page, '/magnetic_tool');

        const out = await page.evaluate(async (magnetic) => {
            const rt = await import('/WebSharedComponents/assets/js/mvbRuntime.js');
            await rt.initMvbWorker();
            const res = {};
            for (const [label, opts] of [['ideal', {}], ['real', { useRealWindingGeometry: true }]]) {
                try {
                    const buf = await rt.buildTurnsSTL(magnetic, opts);
                    res[label] = { bytes: buf.byteLength ?? buf.length };
                } catch (e) {
                    res[label] = { error: String(e.message || e).slice(0, 200) };
                }
            }
            return res;
        }, REAL_WINDING_MAGNETIC);

        expect(out.ideal.error ?? null, 'idealised turns build failed').toBeNull();
        expect(out.real.error ?? null, 'real-winding turns build failed').toBeNull();
        // Binary STL: 84-byte header + 50 bytes/triangle. Anything near 84 is empty.
        expect(out.ideal.bytes).toBeGreaterThan(10000);
        expect(out.real.bytes).toBeGreaterThan(10000);
        expect(out.real.bytes).not.toBe(out.ideal.bytes);
    });

    test('3DW-2: the Magnetic Builder viewer puts real meshes on screen, and warns about none of them', async ({ page }) => {
        const warnings = [];
        page.on('console', (m) => {
            const text = m.text();
            if (isAppNoise(text)) return;
            if (/Could not build/i.test(text)) warnings.push(text.slice(0, 200));
        });

        // The real user path: a wizard supplies the requirements, the analytical
        // run makes "Review Specs" reachable, and the Magnetic Builder is where
        // Magnetic3DVisualizer actually mounts.
        await openWizard(page, 'Flyback-link');
        await runAnalytical(page, 60000);
        await goToMagneticBuilder(page);
        await pause(page, 2500, 'mechanical: tool mount');

        // The cookie banner sits over the bottom of the page and eats clicks.
        await page.getByRole('button', { name: /Essential only/i }).click({ timeout: 5000 }).catch(() => {});

        // /magnetic_tool opens on Design Requirements; the visualizer lives in the
        // Magnetic Builder step. Run the Core Adviser and take a result: until a
        // core shape and material exist there is genuinely nothing to draw, and an
        // empty scene would be correct rather than a regression.
        await runCoreAdviser(page, { timeoutMs: 180000 });

        // Guard the premise: until a core shape and material exist there is
        // genuinely nothing to draw, and an empty scene would be correct rather
        // than a regression.
        const design = await page.waitForFunction(() => {
            const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
            const m = pinia?._s?.get('mas')?.mas?.magnetic;
            const shape = m?.core?.functionalDescription?.shape;
            const name = shape?.name ?? shape;
            return name ? { shape: name, turns: m?.coil?.turnsDescription?.length ?? 0 } : false;
        }, null, { timeout: 120000 }).then((h) => h.jsonValue());
        expect(design.shape, 'no core shape was applied — nothing to draw').toBeTruthy();

        const canvas = page.locator('.magnetic-3d-visualizer-container canvas').first();
        await canvas.waitFor({ state: 'visible', timeout: 90000 });

        // Read the three.js scene, not a screenshot: WebGL can happily present an
        // empty frame, and an empty frame is precisely the #631 symptom.
        const scene = await page.waitForFunction(() => {
            const el = document.querySelector('.magnetic-3d-visualizer-container');
            const threeScene = el?.__vueParentComponent?.proxy?.$refs?.scene?.scene;
            if (!threeScene) return false;
            const meshes = [];
            const walk = (obj) => {
                for (const child of (obj.children ?? [])) {
                    if (child.isMesh && child.geometry?.attributes?.position) {
                        meshes.push(child.geometry.attributes.position.count);
                    }
                    walk(child);
                }
            };
            walk(threeScene);
            return meshes.length ? { meshes: meshes.length, vertices: meshes.reduce((a, b) => a + b, 0) } : false;
        }, null, { timeout: 120000 }).then((h) => h.jsonValue());

        expect(scene.meshes, 'no meshes were added to the three.js scene').toBeGreaterThan(0);
        expect(scene.vertices, 'meshes carry no vertices').toBeGreaterThan(100);

        // A silent partial render is the failure mode this whole test exists for.
        expect(warnings, `viewer could not build part of the magnetic:\n${warnings.join('\n')}`).toEqual([]);

        await expect(page.locator('[data-cy$="-core-build-failed"]')).toHaveCount(0);
    });

    // The whole point of giving drawTurns a real-winding form: the INTERACTIVE viewer can
    // now show it, not just the export. Drives the toggle the user actually clicks and
    // checks the scene changed. @heavy — core adviser + wire adviser + a swept conductor
    // rebuild is minutes, not seconds.
    test('3DW-5: the viewer rebuilds the conductors when real winding is toggled on', async ({ page }, testInfo) => {
        test.setTimeout(600000);
        const warnings = [];
        page.on('console', (m) => {
            if (!isAppNoise(m.text()) && /Could not build/i.test(m.text())) warnings.push(m.text().slice(0, 200));
        });

        await openWizard(page, 'Flyback-link');
        await runAnalytical(page, 60000);
        await goToMagneticBuilder(page);
        await pause(page, 2500, 'mechanical: tool mount');
        await page.getByRole('button', { name: /Essential only/i }).click({ timeout: 5000 }).catch(() => {});
        await runCoreAdviser(page, { timeoutMs: 180000 });

        // Real winding routes real CONDUCTORS, so the design needs real wires: without
        // them the coil has no turnsDescription and the toggle has nothing to rebuild.
        await page.locator('[data-cy$="Wire-Advise-All-button"]').first().click({ timeout: 60000 });
        await page.waitForFunction(() => {
            const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
            return (pinia?._s?.get('mas')?.mas?.magnetic?.coil?.turnsDescription?.length ?? 0) > 0;
        }, null, { timeout: 240000 });

        const readScene = () => page.waitForFunction(() => {
            const el = document.querySelector('.magnetic-3d-visualizer-container');
            const scene = el?.__vueParentComponent?.proxy?.$refs?.scene?.scene;
            if (!scene) return false;
            let meshes = 0, vertices = 0;
            const walk = (o) => {
                for (const c of (o.children ?? [])) {
                    if (c.isMesh && c.geometry?.attributes?.position) {
                        meshes++; vertices += c.geometry.attributes.position.count;
                    }
                    walk(c);
                }
            };
            walk(scene);
            return meshes ? { meshes, vertices } : false;
        }, null, { timeout: 180000 }).then((h) => h.jsonValue());

        const ideal = await readScene();
        await testInfo.attach('viewer-ideal.png', { body: await page.screenshot(), contentType: 'image/png' });

        const toggle = page.locator('[data-cy$="-real-winding-toggle"]').first();
        await toggle.waitFor({ state: 'visible', timeout: 30000 });
        await toggle.click();

        // What must hold is that the toggle REBUILDS the conductors — silently doing
        // nothing is the regression to catch. What must NOT be asserted here is that the
        // conductor routes: ConductorBuilder legitimately refuses designs whose leads and
        // dragbacks collide (the auto-advised Flyback is one — ABT #646), and turning that
        // upstream geometry defect into a red test here would only teach us to ignore it.
        // So: the geometry changed, or the viewer SAID it could not route. Never neither.
        const outcome = await page.waitForFunction((idealVertices) => {
            const el = document.querySelector('.magnetic-3d-visualizer-container');
            const vm = el?.__vueParentComponent?.proxy;
            const scene = vm?.$refs?.scene?.scene;
            if (!scene || vm.updating) return false;
            let meshes = 0, vertices = 0;
            const walk = (o) => {
                for (const c of (o.children ?? [])) {
                    if (c.isMesh && c.geometry?.attributes?.position) {
                        meshes++; vertices += c.geometry.attributes.position.count;
                    }
                    walk(c);
                }
            };
            walk(scene);
            if (vm.turnsBuildFailed) return { refused: true, error: String(vm.turnsBuildError).slice(0, 300) };
            return (meshes && vertices !== idealVertices) ? { meshes, vertices } : false;
        }, ideal.vertices, { timeout: 300000 }).then((h) => h.jsonValue());
        await testInfo.attach('viewer-realwinding.png', { body: await page.screenshot(), contentType: 'image/png' });

        if (outcome.refused) {
            // Refusal is an acceptable OUTCOME, not an acceptable silence: it has to be on
            // screen, and it has to name a routing failure rather than any old error.
            await expect(page.locator('[data-cy$="-turns-build-failed"]')).toHaveCount(1);
            expect(outcome.error, `turns build failed for a non-routing reason: ${outcome.error}`)
                .toMatch(/ConductorBuilder|collision|route/i);
            testInfo.annotations.push({ type: 'issue', description: `real winding refused: ${outcome.error}` });
            return;
        }

        expect(outcome.meshes, 'real-winding scene lost its meshes').toBeGreaterThan(0);
        expect(outcome.vertices).not.toBe(ideal.vertices);
        expect(warnings, `viewer could not build part of the magnetic:\n${warnings.join('\n')}`).toEqual([]);
    });
});
