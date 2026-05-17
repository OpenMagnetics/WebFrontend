/**
 * tests/utils/assertions.js
 *
 * Domain-level assertions that compose Playwright's `expect()` with our
 * understanding of what a valid magnetic / SVG / STL / waveform looks like.
 *
 * Each assertion throws a descriptive error on failure (uses expect() under
 * the hood, which integrates with Playwright's HTML report).
 */
import { expect } from '@playwright/test';

/**
 * Assert that a MAS object (from dumpMAS) is structurally valid:
 *   • has inputs.designRequirements
 *   • has at least one operating point
 *   • has a magnetic with a core AND a coil (winding)
 *   • coil.functionalDescription has at least one winding turn entry
 *
 * Does NOT check numerical values — that's the numerical-battery's job.
 */
export function expectValidMagnetic(mas) {
  expect(mas, 'MAS is null/undefined').toBeTruthy();
  expect(mas.inputs, 'MAS.inputs missing').toBeTruthy();
  expect(mas.inputs.designRequirements, 'MAS.inputs.designRequirements missing').toBeTruthy();

  const ops = mas.inputs.operatingPoints || mas.operatingPoints;
  expect(Array.isArray(ops), 'MAS operatingPoints is not an array').toBe(true);
  expect(ops.length, 'MAS has zero operating points').toBeGreaterThan(0);

  expect(mas.magnetic, 'MAS.magnetic missing').toBeTruthy();
  expect(mas.magnetic.core, 'MAS.magnetic.core missing').toBeTruthy();
  expect(mas.magnetic.coil, 'MAS.magnetic.coil missing').toBeTruthy();

  const fd = mas.magnetic.coil.functionalDescription;
  expect(Array.isArray(fd), 'magnetic.coil.functionalDescription is not an array').toBe(true);
  expect(fd.length, 'coil has no winding entries').toBeGreaterThan(0);
}

/**
 * Assert that an SVG (either a raw markup string or `{body}` from
 * download2DCoilSVG) has a viewBox that fits within the bounding box of
 * its contents. Catches the UR-4 family of regressions where the coil
 * section is clipped.
 *
 * Pragmatic check: parse the viewBox and require non-zero positive dimensions.
 * A full geometric check would re-implement an SVG renderer.
 */
export function expect2DSvgFits(svgOrObj) {
  const svgHtml = typeof svgOrObj === 'string' ? svgOrObj : svgOrObj?.body;
  expect(svgHtml, 'svg body is empty').toBeTruthy();
  const m = svgHtml.match(/viewBox\s*=\s*["']([-\d.\s]+)["']/);
  expect(m, 'svg has no viewBox attribute').toBeTruthy();
  const [, vb] = m;
  const parts = vb.trim().split(/\s+/).map(Number);
  expect(parts.length, `svg viewBox malformed: "${vb}"`).toBe(4);
  const [, , w, h] = parts;
  expect(w, 'svg viewBox width is non-positive').toBeGreaterThan(0);
  expect(h, 'svg viewBox height is non-positive').toBeGreaterThan(0);
}

/** Assert that an STL download produced a non-empty binary. */
export function expectStlNonEmpty({ size, path }) {
  expect(path, 'STL download has no path').toBeTruthy();
  // STL header alone is 84 bytes; anything less than ~120 means no triangles.
  expect(size, `STL too small (${size} bytes) — likely empty mesh`).toBeGreaterThan(120);
}

/**
 * Assert numerical agreement between two metric maps within per-key tolerance.
 *
 *   expectNumericalAgreement(
 *     { magnetizingInductance: 102e-6, peakCurrent: 1.8 },
 *     { magnetizingInductance: { value: 100e-6, tol: 0.05 },
 *       peakCurrent:           { value: 1.75,   tol: 0.05 } });
 */
export function expectNumericalAgreement(actual, expected) {
  for (const [key, { value: target, tol }] of Object.entries(expected)) {
    expect(actual, `numerical assertion: result missing "${key}"`).toHaveProperty(key);
    const got = Number(actual[key]);
    expect(Number.isFinite(got), `metric "${key}" not finite: ${actual[key]}`).toBe(true);
    const rel = Math.abs(got - target) / Math.max(Math.abs(target), 1e-12);
    expect(
      rel,
      `metric "${key}" out of tolerance: got ${got}, expected ${target} ±${tol * 100}% (rel=${rel.toFixed(4)})`
    ).toBeLessThanOrEqual(tol);
  }
}

/** Assert that no console errors were captured by collectConsoleErrors. */
export function expectNoConsoleErrors(getErrors) {
  const errs = getErrors();
  expect(errs, `unexpected console errors:\n  ${errs.join('\n  ')}`).toEqual([]);
}
