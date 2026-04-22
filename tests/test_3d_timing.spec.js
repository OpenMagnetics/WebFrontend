/**
 * Verifies MVB++ buildTurnsSTL timing after removing BRepAlgoAPI_Fuse per-turn.
 * Boots the MVB worker directly in the browser (via the app's /wasm/mvbpp.js),
 * calls buildTurnsSTL with the 76-turn fixture, and asserts < 5 s.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

const FIXTURE = '/home/alf/Downloads/custom_magnetic (4).json';

test.describe('3D visualizer timing', () => {
  test.describe.configure({ timeout: 120000 });

  test('3DT-1: buildTurnsSTL completes under 5s with no-fuse build', async ({ page }) => {
    const parsed = JSON.parse(fs.readFileSync(FIXTURE, 'utf-8'));
    const magnetic = parsed.magnetic ?? parsed;

    // Load the app so /wasm/ assets are reachable
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(
      () => !window.location.pathname.includes('engine_loader'),
      null,
      { timeout: 45000 },
    );

    // Boot mvbpp worker inline and call buildTurnsSTL
    const result = await page.evaluate(async (mag) => {
      const code = await (await fetch('/wasm/mvbpp.js')).text();
      const createMvbpp = new Function(code + '\nreturn createMvbpp;')();
      const mvbpp = await createMvbpp({ locateFile: (f) => `/wasm/${f}` });

      // Full 76-turn timing
      const t0 = performance.now();
      const full = mvbpp.buildTurnsSTL(JSON.stringify(mag), 1.0, 16, 0.1, 0.1, true);
      const elapsed = performance.now() - t0;

      // Geometry check: build a 2-turn slice and a 1-turn slice.
      // Each turn in a uniform toroid is a cached rotation of the same canonical shape,
      // so the per-turn STL contribution should be equal (same byte count / number of triangles).
      // Support both snake_case and camelCase turns key
      const turnsKey = mag.coil.turns_description ? 'turns_description' : 'turnsDescription';

      const clone2 = JSON.parse(JSON.stringify(mag));
      clone2.coil[turnsKey] = clone2.coil[turnsKey].slice(0, 2);
      const twoTurns = mvbpp.buildTurnsSTL(JSON.stringify(clone2), 1.0, 16, 0.1, 0.1, true);

      const clone1 = JSON.parse(JSON.stringify(mag));
      clone1.coil[turnsKey] = clone1.coil[turnsKey].slice(0, 1);
      const oneTurn = mvbpp.buildTurnsSTL(JSON.stringify(clone1), 1.0, 16, 0.1, 0.1, true);

      // STL binary: 80-byte header + 4-byte triangle count + 50 bytes/triangle
      // For a compound STL, byte count = header(84) + triangles * 50
      // 2 turns should have exactly 2× triangles of 1 turn
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
    expect(result.ms, `Expected < 5000ms, got ${result.ms.toFixed(0)}ms`).toBeLessThan(5000);

    // Each turn must have the same triangle count → cache produces identical geometry
    expect(result.twoTurnTri, '2-turn STL should have exactly 2× triangles of 1-turn').toBe(result.oneTurnTri * 2);
  });
});
