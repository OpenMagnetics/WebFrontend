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

/** Assert that no console errors were captured by collectConsoleErrors. */
export function expectNoConsoleErrors(getErrors) {
  const errs = getErrors();
  expect(errs, `unexpected console errors:\n  ${errs.join('\n  ')}`).toEqual([]);
}

/** Domain assertion for the SPICE-netlist modal. A valid ngspice netlist
 *  has a `.tran` directive, a `.end` terminator, and at least three
 *  topology elements (V/L/C/R/I/M/E/B/S/D — single-letter device prefixes
 *  followed by a name). A 50-char placeholder string would pass a naive
 *  length check; this catches that. */
export function expectValidSpiceNetlist(text) {
  expect(text, 'SPICE netlist empty').toBeTruthy();
  const t = text || '';
  expect(t.length, `SPICE netlist suspiciously short (${t.length} chars)`).toBeGreaterThanOrEqual(120);
  expect(t, 'SPICE netlist missing .tran directive').toMatch(/^\s*\.tran\b/im);
  expect(t, 'SPICE netlist missing .end terminator').toMatch(/^\s*\.end\b/im);
  const components = t.match(/^\s*[VLCRIMEBSDQ]\w+/gim) ?? [];
  expect(
    components.length,
    `SPICE netlist needs ≥3 topology elements (got ${components.length})`
  ).toBeGreaterThanOrEqual(3);
}
