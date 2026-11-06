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
import { clickIfPresent } from './utils/wait.js';
import { installVueComponentFinder } from './_coverage.js';
import { engineLogRecords } from './utils/engineLog.js';

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
const WOUND_FIXTURE = new URL('./fixtures/etd49_wound_10uH_5T.json', import.meta.url).pathname;
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
    // This spec uses the plain Playwright fixture, so it installs the Vue component finder
    // (window.__omFindComponent, which works in production builds) itself.
    test.beforeEach(async ({ context }) => { await installVueComponentFinder(context); });

    test.describe.configure({ timeout: 180000 });

    test('3DW-1: the SERVED engine builds core, turns and assembly geometry for a by-name design (ABT #631)', async ({ page }) => {
        await goToRoute(page, '/magnetic_tool');

        const result = await page.evaluate(async (magnetic) => {
            const code = await (await fetch('/wasm/mvbpp.js')).text();
            const createMvbpp = new Function(code + '\nreturn createMvbpp;')();
            const mvbpp = await createMvbpp({ locateFile: (f) => `/wasm/${f}` });

            const json = JSON.stringify(magnetic);
            // wirePolygonSegments 0 = analytic, matching what mvbWorker passes (ABT #211).
            // 16 built a polygon profile costing 120-280 MB per turn and blew the browser's
            // memory cap on large designs; a test pinning 16 pins behaviour no user gets.
            const args = [json, '3D', 'XY', 0.0, 'stl', 1.0, 0, 'none', ''];
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
        await clickIfPresent(page.getByRole('button', { name: /Essential only/i }), 5000);

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
            const threeScene = el && window.__omFindComponent((i) => i.proxy?.$refs?.scene?.scene && i.proxy.$el?.contains?.(el))?.$refs?.scene?.scene;
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
        await clickIfPresent(page.getByRole('button', { name: /Essential only/i }), 5000);
        await runCoreAdviser(page, { timeoutMs: 180000 });

        // Real winding routes real CONDUCTORS, so the design needs real wires: without
        // them the coil has no turnsDescription and the toggle has nothing to rebuild.
        // Wait for the wire adviser itself to finish: the coil already has turns from the
        // core advise, and waiting on turnsDescription alone raced ahead with that coil.
        await page.evaluate(() => {
            const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
            window.__wireAdviseOutcome = null;
            const unsubscribe = pinia._s.get('magneticBuilderTaskQueue').$onAction(({ name, after, onError }) => {
                if (name !== 'adviseAllWires') return;
                after(() => { window.__wireAdviseOutcome = 'done'; unsubscribe(); });
                onError((error) => { window.__wireAdviseOutcome = `failed: ${error?.message ?? error}`; unsubscribe(); });
            });
        });
        await page.locator('[data-cy$="Wire-Advise-All-button"]').first().click({ timeout: 60000 });
        await page.waitForFunction(() => window.__wireAdviseOutcome != null, null, { timeout: 240000 });
        expect(await page.evaluate(() => window.__wireAdviseOutcome), 'the wire adviser').toBe('done');
        await page.waitForFunction(() => {
            const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
            return (pinia?._s?.get('mas')?.mas?.magnetic?.coil?.turnsDescription?.length ?? 0) > 0;
        }, null, { timeout: 240000 });

        const readScene = () => page.waitForFunction(() => {
            const el = document.querySelector('.magnetic-3d-visualizer-container');
            const scene = el && window.__omFindComponent((i) => i.proxy?.$refs?.scene?.scene && i.proxy.$el?.contains?.(el))?.$refs?.scene?.scene;
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

        // Real winding is a global Display setting (Tool menu > Settings > Display), not a
        // per-view button: flip the store the settings dialog writes to.
        await page.evaluate(() => {
            const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
            pinia._s.get('settings').magneticBuilderSettings.useRealWindingGeometry = true;
        });

        // What must hold is that the toggle REBUILDS the conductors — silently doing
        // nothing is the regression to catch. What must NOT be asserted here is that the
        // conductor routes: ConductorBuilder legitimately refuses designs whose leads and
        // dragbacks collide (the auto-advised Flyback is one — ABT #646), and turning that
        // upstream geometry defect into a red test here would only teach us to ignore it.
        // So: the geometry changed, or the viewer SAID it could not route. Never neither.
        const outcome = await page.waitForFunction((idealVertices) => {
            const el = document.querySelector('.magnetic-3d-visualizer-container');
            const vm = el && window.__omFindComponent((i) => i.proxy?.$refs?.scene?.scene && i.proxy.$el?.contains?.(el));
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
            if (meshes && vm.realWindingWarning) return { fellBack: true, warning: String(vm.realWindingWarning).slice(0, 400), meshes };
            return (meshes && vertices !== idealVertices) ? { meshes, vertices } : false;
        }, ideal.vertices, { timeout: 300000 }).then((h) => h.jsonValue());
        await testInfo.attach('viewer-realwinding.png', { body: await page.screenshot(), contentType: 'image/png' });

        // The viewer never refuses over the real winding (Alf, 2026-11-06): when it cannot be
        // built, the idealised turns stay on screen and a WARNING in the Engine log says why.
        // That warning must still name a routing failure rather than any old error. A wind
        // with turns inside the leads' connection corridors is one: the leads have no room to
        // route (the auto-advised Flyback's interleaved coil fits only as an ideal wind).
        expect(outcome.refused ?? false, `the viewer refused to draw the turns: ${outcome.error}`).toBe(false);
        if (outcome.fellBack) {
            const logged = await engineLogRecords(page, { source: '3D view', level: 'WARNING' });
            expect(logged.map((r) => r.message).join('\n'), 'the fallback to idealised turns is in the Engine log')
                .toMatch(/real winding could not be built/i);
            expect(outcome.warning, `real winding failed for a non-routing reason: ${outcome.warning}`)
                .toMatch(/ConductorBuilder|collision|route|connection corridor/i);
            testInfo.annotations.push({ type: 'issue', description: `real winding not built: ${outcome.warning}` });
            return;
        }

        expect(outcome.meshes, 'real-winding scene lost its meshes').toBeGreaterThan(0);
        expect(outcome.vertices).not.toBe(ideal.vertices);
        expect(warnings, `viewer could not build part of the magnetic:\n${warnings.join('\n')}`).toEqual([]);
    });

    // When the real winding cannot be built, the viewer draws the idealised turns and logs a
    // WARNING; it never shows a magnetic without its copper (Alf, 2026-11-06: "the 3D view in
    // the web should not throw, if something like [a real-winding refusal] happens, it should
    // log a warning, never refuse"). The engine is made to refuse every real-winding drawTurns
    // here, so the test does not depend on finding a design MKF happens to refuse.
    test('3DW-6: a real winding that cannot be built leaves the idealised turns on screen and a warning in the Engine log', async ({ page }) => {
        test.setTimeout(300000);
        await page.route('**/wasm/mvbpp.js*', async (route) => {
            const response = await route.fetch();
            const body = await response.text();
            const forced = `${body}
;createMvbpp = ((create) => async (options) => {
    const module = await create(options);
    const drawTurns = module.drawTurns;
    module.drawTurns = (...args) => {
        if (args[10] === true) throw new Error('Real winding: forced refusal for 3DW-6');
        return drawTurns(...args);
    };
    return module;
})(createMvbpp);`;
            await route.fulfill({ response, body: forced });
        });
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await clickIfPresent(page.getByRole('button', { name: /Essential only/i }), 5000);
        await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(WOUND_FIXTURE);
        await page.waitForURL('**/magnetic_tool**', { timeout: 90000 });
        await page.locator('.magnetic-3d-visualizer-container canvas').first().waitFor({ state: 'visible', timeout: 120000 });

        await page.evaluate(() => {
            const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
            pinia._s.get('settings').magneticBuilderSettings.useRealWindingGeometry = true;
        });

        const state = await page.waitForFunction(() => {
            const el = document.querySelector('.magnetic-3d-visualizer-container');
            const vm = el && window.__omFindComponent((i) => i.proxy?.$refs?.scene?.scene && i.proxy.$el?.contains?.(el));
            if (!vm || vm.updating || !vm.realWindingWarning) return false;
            return { warning: vm.realWindingWarning, failed: vm.turnsBuildFailed, turnsMeshes: vm.turnsMeshes.length };
        }, null, { timeout: 180000 }).then((h) => h.jsonValue());

        expect(state.failed, 'the viewer refused to draw the turns').toBe(false);
        expect(state.turnsMeshes, 'the idealised turns are drawn in place of the real winding').toBeGreaterThan(0);
        expect(state.warning).toMatch(/forced refusal for 3DW-6/);
        await expect(page.locator('[data-cy$="-turns-build-failed"]')).toHaveCount(0);
        await expect.poll(async () => (await engineLogRecords(page, { source: '3D view', level: 'WARNING' })).map((r) => r.message).join('\n'),
            { timeout: 30000 }).toMatch(/real winding could not be built, so the 3D view shows the idealised turns: .*forced refusal for 3DW-6/i);
    });

    // The viewer skips MVB++'s conductor collision gate for its own real-winding draw: colliding
    // conductors are drawn as they are and each collision is a WARNING in the Engine log (Alf,
    // 2026-11-06: "Skip it in the viewer"). The engine here refuses a real-winding drawTurns made
    // with the gate ON, and reports a collision the way MVB++ does (a FINDING on stderr) when it is
    // off, so the test holds whichever designs MVB++ happens to find colliding.
    test('3DW-7: the viewer draws colliding real-winding conductors and logs each collision as a warning', async ({ page }) => {
        test.setTimeout(300000);
        await page.route('**/wasm/mvbpp.js*', async (route) => {
            const response = await route.fetch();
            const body = await response.text();
            const forced = `${body}
;createMvbpp = ((create) => async (options) => {
    const module = await create(options);
    let skipping = false;
    const setSkipChecks = module.mvbppSetSkipChecks;
    module.mvbppSetSkipChecks = (on) => { skipping = !!on; return setSkipChecks(on); };
    const drawTurns = module.drawTurns;
    module.drawTurns = (...args) => {
        if (args[10] === true) {
            if (!skipping) throw new Error('3DW-7: a real-winding drawTurns ran with the collision gate on');
            options.printErr('[ConductorBuilder] FINDING (collision allowed by --skip-collision-check / MVB_SKIP_COLLISION_CHECK; copper left as drawn, not a part): Secondary parallel 0 turn 2 overlaps Secondary parallel 1 turn 2 by 0.1 mm (3DW-7)');
        }
        return drawTurns(...args);
    };
    return module;
})(createMvbpp);`;
            await route.fulfill({ response, body: forced });
        });
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await clickIfPresent(page.getByRole('button', { name: /Essential only/i }), 5000);
        await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(WOUND_FIXTURE);
        await page.waitForURL('**/magnetic_tool**', { timeout: 90000 });
        await page.locator('.magnetic-3d-visualizer-container canvas').first().waitFor({ state: 'visible', timeout: 120000 });

        await page.evaluate(() => {
            const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
            pinia._s.get('settings').magneticBuilderSettings.useRealWindingGeometry = true;
        });

        await expect.poll(async () => (await engineLogRecords(page, { source: '3D view', level: 'WARNING' })).map((r) => r.message).join('\n'),
            { timeout: 180000 }).toMatch(/The conductors collide, drawn as they are: Secondary parallel 0 turn 2 overlaps Secondary parallel 1 turn 2 by 0\.1 mm \(3DW-7\)/);
        const logged = (await engineLogRecords(page, { source: '3D view' })).map((r) => r.message).join('\n');
        expect(logged, 'the real winding was drawn, not replaced by the idealised turns').not.toMatch(/shows the idealised turns/);
        await expect(page.locator('[data-cy$="-turns-build-failed"]')).toHaveCount(0);
    });
});
