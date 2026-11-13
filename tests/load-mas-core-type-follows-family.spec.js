/**
 * ABT #2372 (web report #193): an EI saved with type twoPieceSet. Older builders kept the previous
 * family's type when the family changed, and MKF processed the EI as a mirrored E+E (twice the
 * effective length and volume). MKF now refuses a type that contradicts the family, so the loader
 * re-types such a core from MKF's family rule, drops what was computed for the wrong type, and says
 * so as a load correction (the Engine log). It never changes a core whose type already fits.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

const eiCore = (type) => ({
  name: 'Custom',
  functionalDescription: {
    type,
    material: '3C95',
    numberStacks: 1,
    shape: {
      type: 'custom', family: 'ei', name: 'EI 12.7/3.4/1.25/12.7/2.77/7.11/3.56', magneticCircuit: 'open',
      dimensions: { A: { nominal: 0.0127 }, B: { nominal: 0.0034 }, B2: { nominal: 0.00125 }, C: { nominal: 0.0127 },
                    D: { nominal: 0.00277 }, E: { nominal: 0.00711 }, F: { nominal: 0.00356 } },
    },
    gapping: [
      { type: 'subtractive', length: 5e-5, coordinates: [0, 2.5e-5, 0], distanceClosestNormalSurface: 0.002745, area: 4.5212e-5 },
      { type: 'residual', length: 5e-6, coordinates: [0.0049525, 0, 0], distanceClosestNormalSurface: 0.0027675, area: 3.5497e-5 },
    ],
  },
  processedDescription: { effectiveParameters: { effectiveLength: 0.02174 } },
  geometricalDescription: [],
});

// The engine's answer is MKF's core_type_for_shape_family; here it is stood in for so the loader's own
// step is exercised on its own.
async function migrate(page, core) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  return page.evaluate(async (core) => {
    const { giveCoreTheTypeOfItsFamily } = await import('/src/services/loadMasIntoApp.js');
    const mas = { magnetic: { core: JSON.parse(JSON.stringify(core)) } };
    const corrections = [];
    const asked = [];
    const taskQueueStore = { getCoreTypeForShapeFamily: async (family) => { asked.push(family); return family === 'ei' ? 'pieceAndPlate' : 'twoPieceSet'; } };
    await giveCoreTheTypeOfItsFamily(mas, corrections, taskQueueStore);
    return { core: mas.magnetic.core, corrections, asked };
  }, core);
}

test.describe('the core type follows its shape family on load (ABT #2372)', () => {
  test('CORETYPE-LOAD-1: an EI stored as twoPieceSet is loaded as a pieceAndPlate, visibly', async ({ page }) => {
    const { core, corrections, asked } = await migrate(page, eiCore('twoPieceSet'));
    expect(asked, 'the type comes from the engine\'s family rule').toEqual(['ei']);
    expect(core.functionalDescription.type).toBe('pieceAndPlate');
    expect(core.processedDescription, 'the effective parameters of the mirrored E+E are not kept').toBeUndefined();
    expect(core.geometricalDescription).toBeUndefined();
    for (const gap of core.functionalDescription.gapping) {
      expect(gap.coordinates, 'gap positions computed for the wrong type are recomputed').toBeUndefined();
      expect(gap.distanceClosestNormalSurface).toBeUndefined();
    }
    expect(core.functionalDescription.gapping.map((gap) => [gap.type, gap.length])).toEqual([['subtractive', 5e-5], ['residual', 5e-6]]);
    expect(corrections.length).toBe(1);
    expect(corrections[0].operatingPointIndex, 'reported in the Engine log, not on an operating point').toBeNull();
    expect(corrections[0].message).toContain("was stored as 'twoPieceSet'");
    expect(corrections[0].message).toContain("a 'ei' core is a 'pieceAndPlate'");
  });

  test('CORETYPE-LOAD-2: a core whose type fits its family is left as it is', async ({ page }) => {
    const stored = eiCore('pieceAndPlate');
    const { core, corrections } = await migrate(page, stored);
    expect(core).toEqual(stored);
    expect(corrections).toEqual([]);
  });
});
