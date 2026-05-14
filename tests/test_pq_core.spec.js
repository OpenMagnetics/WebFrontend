/**
 * Regression test for ShapePQ buildLateralPiece self-intersection bug.
 * When e*cos_g > c (column arc extends past the flat outer wall), the
 * polygon was self-intersecting, producing a zero-volume shape.
 * This test verifies that PQ 32/12 core STL output is non-empty.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

test.describe('PQ core rendering', () => {
  test('3DC-1: buildCoreSTL returns non-empty bytes for PQ 32/12', async ({ page }) => {
    await page.route('**/fixture_pq.json', r => r.fulfill({ contentType: 'application/json', body: fs.readFileSync(new URL('./fixtures/pq_32_12.json', import.meta.url)) }));

    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(() => !window.location.pathname.includes('engine_loader'), null, { timeout: 45000 });

    const result = await page.evaluate(async () => {
      const code = await (await fetch('/wasm/mvbpp.js')).text();
      const createMvbpp = new Function(code + '\nreturn createMvbpp;')();
      const mvbpp = await createMvbpp({ locateFile: f => `/wasm/${f}` });

      const mag = await (await fetch('/fixture_pq.json')).json();
      let bytes = 0, err = null;
      try {
        // New unified API: drawCore(magnetic, mode, plane, offset, format,
        //                            scale, polygonSegments, symmetry, side)
        const r = mvbpp.drawCore(JSON.stringify(mag), '3D', 'XY', 0.0, 'stl', 1.0, 32, 'none', '');
        bytes = r ? r.length : 0;
      } catch(e) { err = String(e); }
      return { bytes, err };
    });

    expect(result.bytes, `PQ core STL should be non-empty, err: ${result.err}`).toBeGreaterThan(0);
  });
});
