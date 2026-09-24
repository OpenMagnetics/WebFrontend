/**
 * Verifies MVB++ buildTurnsSTL timing after removing BRepAlgoAPI_Fuse per-turn.
 * Boots the MVB worker directly in the browser (via the app's /wasm/mvbpp.js),
 * calls buildTurnsSTL with the 76-turn fixture, and asserts it stays under a
 * measured budget.
 *
 * Budget, re-baselined 2026-09-24 (ABT #1384): the current engine (mvbpp
 * b643e57, analytic wire profile) builds these 76 turns in 5.6-6.4 s (five
 * runs, median 5.8 s, host load ~7.5; 6.0 s on an idle host per the MVB++
 * session; the 2026-09-05 engine measured the same). The old 5 s budget
 * (ABT #641) predates it. 9 s = 1.5x the measured cost: it still catches a
 * real regression such as the per-turn BRepAlgoAPI_Fuse coming back, which
 * cost an order of magnitude, while tolerating ordinary load. On a heavily
 * loaded host (load > ~25) it can exceed 9 s; that is the host, not the build.
 */
const BUILD_TURNS_BUDGET_MS = 9000;
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

const FIXTURE = new URL('./fixtures/toroid_76turns.json', import.meta.url);

test.describe('3D visualizer timing', () => {
  test.describe.configure({ timeout: 120000 });

  test('3DT-1: buildTurnsSTL of 76 turns stays within its measured 9 s budget', async ({ page }) => {
    const parsed = JSON.parse(fs.readFileSync(FIXTURE, 'utf-8'));
    const magnetic = parsed.magnetic ?? parsed;

    // Load the app so /wasm/ assets are reachable
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(
      () => !window.location.pathname.includes('engine_loader'),
      null,
      { timeout: 45000 },
    );

    // Boot mvbpp worker inline and call drawTurns
    const result = await page.evaluate(async (mag) => {
      const code = await (await fetch('/wasm/mvbpp.js')).text();
      const createMvbpp = new Function(code + '\nreturn createMvbpp;')();
      const mvbpp = await createMvbpp({ locateFile: (f) => `/wasm/${f}` });

      // drawTurns takes a full Magnetic JSON (uses bobbin context for toroidal
      // turns). Signature — keep this in step with mvbWorker.js:290, which is
      // what the real app calls:
      //   drawTurns(json, mode, plane, offset, format, scale,
      //             polygonSegments, symmetry, side, paintCoating,
      //             useRealWindingGeometry, femReady)
      // paintCoating=true → OUTER (insulation) diameter (frontend default).
      //
      // This test used to stop at paintCoating, pinning the OLD 10-argument
      // arity. That made it pass against a binary the real app could not use:
      // mvbWorker.js has passed twelve arguments since the real-winding work,
      // so a 10-arg mvbpp answers the test and throws for every actual user
      // ("Could not build turns … called with 12 arguments, expected 10").
      // The test was the stale side, not the engine — so it must call exactly
      // what the app calls.
      const turnsKey = mag.coil.turns_description ? 'turns_description' : 'turnsDescription';

      // wirePolygonSegments 0 = analytic, as mvbWorker now passes (ABT #211/#860).
      // The 16-gon profile is what made this slow and what killed large designs.
      const t0 = performance.now();
      const full = mvbpp.drawTurns(JSON.stringify(mag), '3D', 'XY', 0.0, 'stl', 1.0, 0, 'none', '', true, undefined, undefined);
      const elapsed = performance.now() - t0;

      // Geometry check: build a 2-turn slice and a 1-turn slice. Each turn in
      // a uniform toroid is a cached rotation of the same canonical shape, so
      // the per-turn STL contribution should be equal.
      const clone2 = JSON.parse(JSON.stringify(mag));
      clone2.coil[turnsKey] = clone2.coil[turnsKey].slice(0, 2);
      const twoTurns = mvbpp.drawTurns(JSON.stringify(clone2),
                                        '3D', 'XY', 0.0, 'stl', 1.0, 0, 'none', '', true, undefined, undefined);

      const clone1 = JSON.parse(JSON.stringify(mag));
      clone1.coil[turnsKey] = clone1.coil[turnsKey].slice(0, 1);
      const oneTurn  = mvbpp.drawTurns(JSON.stringify(clone1),
                                        '3D', 'XY', 0.0, 'stl', 1.0, 0, 'none', '', true, undefined, undefined);

      // STL binary: 80-byte header + 4-byte triangle count + 50 bytes/triangle
      const triCount = (n) => n ? (n.length - 84) / 50 : 0;

      return {
        ms: elapsed,
        bytes: full ? full.length : 0,
        oneTurnTri: triCount(oneTurn),
        twoTurnTri: triCount(twoTurns),
      };
    }, magnetic);

    console.log(`buildTurnsSTL: ${result.ms.toFixed(0)}ms, ${result.bytes} bytes`);
    console.log(`Geometry check: 1 turn = ${result.oneTurnTri} tri, 2 turns = ${result.twoTurnTri} tri`);

    expect(result.bytes, 'Full STL output should be non-empty').toBeGreaterThan(0);
    expect(result.ms, `Expected < ${BUILD_TURNS_BUDGET_MS}ms, got ${result.ms.toFixed(0)}ms`).toBeLessThan(BUILD_TURNS_BUDGET_MS);

    // Each turn must have the same triangle count → cache produces identical geometry
    expect(result.twoTurnTri, '2-turn STL should have exactly 2× triangles of 1-turn').toBe(result.oneTurnTri * 2);
  });
});
