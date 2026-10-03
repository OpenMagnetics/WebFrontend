/**
 * ABT #1233: mvbWorker reads four options. STL tolerances and an STP "include
 * bobbin" used to be passed and silently ignored, so a caller believed it got
 * what it asked for. An unknown option now throws before the worker is touched.
 */
import { test, expect } from '@playwright/test';
import { buildCoreSTL, buildMagneticSTEP, buildCoreShellSTL } from '../WebSharedComponents/assets/js/mvbRuntime.js';

test('MVBOPT-1: an option the worker does not read is refused', async () => {
  await expect(buildCoreSTL({}, { tolMm: 0.1, angTol: 0.2, binary: true }))
    .rejects.toThrow(/buildCoreSTL does not support option\(s\) tolMm, angTol, binary/);
  await expect(buildMagneticSTEP({}, { includeBobbin: true }))
    .rejects.toThrow(/buildMagneticSTEP does not support option\(s\) includeBobbin/);
  await expect(buildCoreShellSTL({}, { tolMm: 1 }))
    .rejects.toThrow(/buildCoreShellSTL does not support option\(s\) tolMm/);
});
