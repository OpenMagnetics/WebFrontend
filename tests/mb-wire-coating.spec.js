/**
 * User report #177/#178: "If we change from an enameled wire to a TIW, the wire diameter
 * in the Magnetic Builder is exactly the same". A round wire was replaced by its
 * catalogue entry (grade 1 enamel) and the chosen coating pasted on top, keeping the
 * enamelled outer diameter and the catalogue name.
 */
import { test, expect } from './_coverage.js';
import { goToBuilderStep } from './utils/builder-helpers.js';

const createWire = (page, size, coating) => page.evaluate(async ([size, coating]) => {
  const taskQueue = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('magneticBuilderTaskQueue');
  try {
    const wire = await taskQueue.createNewWire({ type: 'round', roundConductingDiameter: size, coating }, '');
    const outer = wire.outerDiameter;
    return { name: wire.name ?? null, outer: outer.nominal ?? (outer.minimum + outer.maximum) / 2 };
  } catch (error) {
    return { error: String(error?.message ?? error) };
  }
}, [size, coating]);

test('MBWIRE-1: a TIW coating gives a round wire its insulated outer diameter', async ({ page }) => {
  test.setTimeout(180000);
  await goToBuilderStep(page);

  const enamelled = await createWire(page, '24 AWG', 'Enamel grade 1');
  const tiw = await createWire(page, '24 AWG', 'TIW, TR 155, BV 9.0 kV');
  expect(enamelled.error).toBeUndefined();
  expect(tiw.error).toBeUndefined();
  // Three insulation layers add about 0.3 mm to a 0.51 mm conductor.
  expect(tiw.outer - enamelled.outer).toBeGreaterThan(0.0002);
  expect(tiw.name, 'a TIW wire is no longer the enamelled catalogue wire').toBeNull();

  const enamelledGrade2 = await createWire(page, '24 AWG', 'Enamel grade 2');
  expect(enamelledGrade2.outer).toBeGreaterThan(enamelled.outer);

  // MKF has no insulated-wire build data for IEC sizes: say so instead of keeping
  // the enamelled diameter.
  const iecTiw = await createWire(page, '0.5 mm', 'TIW, TR 155, BV 9.0 kV');
  expect(iecTiw.error).toContain('MKF could not size a TIW, TR 155, BV 9.0 kV coating on the IEC 60317 wire 0.5 mm');
});
