/**
 * ABT #2410: drum cores in the Magnetic Builder.
 *
 * A user built a PQ 27/15 design and changed its shape to a drumRing (DRR) and a semi-shielded drum
 * (DRS). What went wrong, and what these tests hold:
 *  - the PQ's gapping was carried onto the drum, and MKF refused the drum for it (WSC checkAndFixMas
 *    now drops a gapping carried onto a drumRing or semi-shielded drum);
 *  - the refusal left the PQ's processed and geometrical descriptions, columns and bobbin in the store
 *    under the drum's name, so Core Info showed the PQ's numbers and the turns stayed on the PQ bobbin,
 *    outside the drum. A core change is now applied whole or not at all: a refused one puts the previous
 *    core back and says why in Core Info and the Engine log;
 *  - the Winding Studio drew every core as an outer rectangle minus windows. A drum is drawn from MKF's
 *    own outline (the Painter's plot_core);
 *  - a semi-shielded drum computes nothing without its shell material, which no catalogue drum states:
 *    the core panel says so, and offers a "Shell material" picker. The shell is the second entry of
 *    functionalDescription.material, a core material of type magneticEpoxy (MAS materialType, MKF
 *    Core::resolve_semishielded_shell_material). The catalogue has none yet, so the user defines one in
 *    the builder's material editor (the Customize flow), typed magnetic epoxy. A new shell starts with no
 *    magnetic data (nothing is copied from the drum), and it is not applied until it has a permeability.
 *
 * The start is the default two-winding PQ 27/15 design (95, gapped 0.23 mm); each test makes one change.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL, engineLogRecords } from './utils/index.js';
import { installActivityProbe, activityMark, waitForIdle } from './utils/activity.js';
import { typeSi, enterLossPoints, fitSteinmetz, unitScale } from './utils/materialEditor.js';

const FIXTURE = new URL('./fixtures/default_two_winding_pq2715.json', import.meta.url).pathname;
const DRR = 'DRR 1.9/0.98/0.85/0.2156/0.5488/0.2156/2.8/2.02/1.07';
const DRS = 'DRS 4/1.65/1.85/0.45/0.75/0.45/4/4/1.8';
// MKF's effective length of that drumRing: the corrected value with the exact flange c2 term (ABT #2414,
// MKF 7108c01a). It was 2.196447 mm while the flange term was counted twice.
const DRR_EFFECTIVE_LENGTH_MM = 2.757842;

// The semi-shielded drum's shell permeability the user enters in DRUM-6.
const SHELL_PERMEABILITY = 10;
// The shell's saturation point and measured loss points the user enters in DRUM-6: every core material
// states a saturation (MAS), and MKF prices the shell's core losses from its own loss data, fitting a
// loss model to points at two or more flux densities and two or more frequencies.
const SHELL_SATURATION = { temperature: 25, magneticFluxDensity: 0.4, magneticField: 20000 };
const SHELL_LOSS_POINTS = [
  { frequency: 100000, magneticFluxDensity: 0.1, value: 113000 },
  { frequency: 200000, magneticFluxDensity: 0.1, value: 278000 },
  { frequency: 200000, magneticFluxDensity: 0.05, value: 49000 },
  { frequency: 100000, magneticFluxDensity: 0.05, value: 20000 },
];

// The user defines the shell in the builder's material editor. It starts with NO magnetic data (nothing is
// copied from the drum): name, manufacturer and type are entered here.
async function defineShell(page, { name, manufacturer, type }) {
  await expect(page.locator('[data-cy$="-Core-ShellMaterial"]').first()).toBeVisible();
  await page.locator('[data-cy$="-Core-DefineShellMaterial-button"]').first().click();
  await expect(page.locator('[data-cy$="-ShellMaterialTitle"]').first()).toBeVisible({ timeout: 60000 });
  const names = page.locator('[data-cy$="-AdvancedCoreSelectorMaterial-MaterialName-text-input"]');
  await expect(names.first()).toBeVisible({ timeout: 60000 });
  await expect(names.first(), 'a new shell starts without a name').toHaveValue('');
  await names.nth(0).fill(name);
  await names.nth(0).press('Tab');
  await names.nth(1).fill(manufacturer);
  await names.nth(1).press('Tab');
  await page.locator('[data-cy$="-AdvancedCoreSelectorMaterial-Material-select"]').first().click();
  await page.getByRole('option', { name: type, exact: true }).first().click();
  await expect(page.locator('[data-cy$="-InitialPermeabilityVersusTemperature-PropertyTool-add-first-value-button"]').first(),
    'a new shell has no permeability').toBeVisible();
}

// One initial-permeability point, through the "Init. Permeability vs Temperature" editor.
async function enterInitialPermeability(page, { temperature, value }) {
  await page.locator('[data-cy$="-InitialPermeabilityVersusTemperature-PropertyTool-add-first-value-button"]').first().click();
  const row = '-InitialPermeabilityVersusTemperature-PropertyTool-Property-0';
  for (const [field, number] of [['temperature', temperature], ['value', value]]) {
    const input = page.locator(`[data-cy$="${row} ${field}-number-input"] input`).first();
    await input.click();
    await input.press('Control+a');
    await input.type(String(number), { delay: 40 });
    await input.press('Tab');
  }
}

// One saturation point, through the "Saturation vs Temperature" editor: temperature, flux density and
// the magnetic field it is reached at.
async function enterSaturation(page, { temperature, magneticFluxDensity, magneticField }) {
  const tool = '-SaturationVersusTemperature-PropertyTool';
  await page.locator(`[data-cy$="${tool}-add-first-value-button"]`).first().click();
  await typeSi(page, `${tool}-Property-0 temperature`, temperature);
  await typeSi(page, `${tool}-Property-0 magneticFluxDensity`, magneticFluxDensity);
  await typeSi(page, `${tool}-Property-0 magneticField`, magneticField);
}

// Measured loss points, through the "Volumetric Losses" editor, from its "Add data" row (25 C), and the
// Steinmetz model MKF fits to them: the points alone give the engine no core-loss model.
async function enterLosses(page, points) {
  await page.locator('[data-cy$="-seed-loss-points-button"]').first().click();
  await page.locator('[data-cy$="-VolumetricLossesPerTemperature-PropertyTool-edit-button"]').first().click();
  await enterLossPoints(page, points);
  await fitSteinmetz(page);
}

const storeMaterial = (page) => page.evaluate(() => {
  const core = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas.magnetic.core;
  const list = core.functionalDescription.material;
  return {
    summary: { isList: Array.isArray(list), length: Array.isArray(list) ? list.length : null,
      drum: Array.isArray(list) ? (typeof list[0] === 'string' ? list[0] : list[0]?.name) : (typeof list === 'string' ? list : list?.name),
      shellName: Array.isArray(list) ? list[1]?.name ?? null : null, shellType: Array.isArray(list) ? list[1]?.material ?? null : null,
      coating: core.functionalDescription.coating ?? null, shape: core.functionalDescription.shape?.name },
    shell: Array.isArray(list) && list.length > 1 ? JSON.parse(JSON.stringify(list[1])) : null,
  };
});

// The inductance Core Info shows, in henries: the number ("4.46") and its unit ("µH") are separate elements
// (WSC DataInput/DimensionReadOnly.vue), so the unit is read and scaled, never assumed.
async function shownInductance(page) {
  const label = '-CoreInfo-MagnetizingInductance';
  const number = page.locator(`[data-cy$="${label}-number-label"]`).first();
  const text = (await number.innerText()).trim();
  if (!/^-?[\d.]+(e-?\d+)?$/.test(text)) throw new Error(`Core Info shows the inductance as '${text}', not a number`);
  const unit = page.locator(`[data-cy$="${label}-DimensionUnit-input"], [data-cy$="${label}-DimensionUnit-text"]`).first();
  await expect(unit, 'Core Info shows the inductance\'s unit').toBeVisible();
  return Number(text) * unitScale(await unit.innerText(), 'H');
}

// The engine the page ships (src/assets/js/libMKF.wasm.*), loaded in node: an independent probe of MKF.
let engine = null;
async function loadEngine() {
  if (engine == null) {
    const dir = new URL('../src/assets/js/', import.meta.url).pathname;
    const factory = (await import(`${dir}libMKF.wasm.js`)).default;
    engine = await factory({ wasmBinary: fs.readFileSync(`${dir}libMKF.wasm.wasm`) });
  }
  return engine;
}

// MKF's magnetizing inductance of the DRS built afresh with material [95, shell]. Throws what MKF throws.
async function engineInductance(shell, { coil, operatingPoint }) {
  const mkf = await loadEngine();
  const answer = (text) => {
    if (typeof text === 'string' && text.startsWith('Exception')) throw new Error(text);
    return text;
  };
  const shape = JSON.parse(answer(mkf.get_shape_data(DRS)));
  const type = answer(mkf.get_core_type_for_shape_family('drumSemishielded'));
  const core = answer(mkf.calculate_core_data(JSON.stringify({ name: 'Custom',
    functionalDescription: { name: 'Custom', type, material: ['95', shell], shape, gapping: [], numberStacks: 1 } }), false));
  return Number(answer(mkf.calculate_inductance_from_number_turns_and_gapping(core, JSON.stringify(coil), JSON.stringify(operatingPoint), '{}')));
}

async function loadPq(page, testInfo) {
  await installActivityProbe(page);
  const file = testInfo.outputPath('design.json');
  fs.writeFileSync(file, fs.readFileSync(FIXTURE, 'utf8'));
  const alerts = [];
  page.on('dialog', async (dialog) => { alerts.push(dialog.message()); await dialog.accept(); });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__ != null);
  const mark = await activityMark(page);
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(file);
  await page.waitForURL('**/magnetic_tool**', { timeout: 120000 });
  expect(alerts, 'the load is not refused').toEqual([]);
  await waitForIdle(page, { since: mark, quietMs: 3000, timeout: 240000, label: 'the PQ design' });
}

async function pick(page, suffix, label) {
  const mark = await activityMark(page);
  await page.locator(`[data-cy$="${suffix}-select"]`).first().click();
  await page.getByRole('option', { name: label, exact: true }).first().click();
  await waitForIdle(page, { since: mark, quietMs: 3000, timeout: 240000, label: `${suffix} ${label}` });
}

async function setNumber(page, suffix, value) {
  const mark = await activityMark(page);
  const input = page.locator(`[data-cy$="${suffix}-number-input"] input`).first();
  await input.click();
  await input.press('Control+a');
  await input.type(String(value), { delay: 40 });
  await input.press('Tab');
  await waitForIdle(page, { since: mark, quietMs: 3000, timeout: 240000, label: suffix });
}

// The magnetic as the store holds it, in mm.
const designState = (page) => page.evaluate(() => {
  const magnetic = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas.magnetic;
  const core = magnetic.core;
  const functional = core.functionalDescription;
  const shape = functional.shape;
  const coil = magnetic.coil;
  const bobbin = Array.isArray(coil.bobbin) ? coil.bobbin[0] : coil.bobbin;
  const mm = (value) => (value == null ? null : +(value * 1e3).toFixed(6));
  const central = (core.processedDescription?.columns ?? []).find((column) => column.type === 'central');
  return {
    shapeName: typeof shape === 'string' ? shape : shape?.name,
    family: typeof shape === 'string' ? null : shape?.family,
    type: functional.type,
    gapping: (functional.gapping ?? []).map((gap) => [gap.type, mm(gap.length)]),
    effectiveLength: mm(core.processedDescription?.effectiveParameters?.effectiveLength),
    effectiveArea: core.processedDescription?.effectiveParameters?.effectiveArea == null ? null
      : +(core.processedDescription.effectiveParameters.effectiveArea * 1e6).toFixed(6),
    pieces: (core.geometricalDescription ?? []).map((piece) => (typeof piece.shape === 'string' ? piece.shape : piece.shape?.name)),
    centralColumnHalfWidth: central == null ? null : mm(central.width / 2),
    coreWindow: (core.processedDescription?.windingWindows ?? []).map((window) => ({ width: mm(window.width), height: mm(window.height) }))[0] ?? null,
    bobbinWindow: (bobbin?.processedDescription?.windingWindows ?? []).map((window) => ({
      x: mm(window.coordinates[0]), y: mm(window.coordinates[1]), width: mm(window.width), height: mm(window.height) }))[0] ?? null,
    turns: (coil.turnsDescription ?? []).map((turn) => ({ name: turn.name, x: mm(turn.coordinates[0]), y: mm(turn.coordinates[1]),
      width: mm(turn.dimensions?.[0]), height: mm(turn.dimensions?.[1]) })),
  };
});

// The drumRing's ferrite as MKF's Painter draws it (plot_magnetic, scratchpad drum/drr_carried_plot_magnetic.svg
// of ABT #2410, engine MKF 7b020fbf): painter units, i.e. metres x 30000, y flipped. Post, two flanges, ring.
const DRR_PAINTER_FERRITE = [
  '0.0,8.2 12.7,8.2 12.7,-8.2 0.0,-8.2', '-0.0,8.2 -12.7,8.2 -12.7,-8.2 -0.0,-8.2',
  '0.0,-8.2 28.5,-8.2 28.5,-14.7 0.0,-14.7', '-0.0,-8.2 -28.5,-8.2 -28.5,-14.7 -0.0,-14.7',
  '0.0,14.7 28.5,14.7 28.5,8.2 0.0,8.2', '-0.0,14.7 -28.5,14.7 -28.5,8.2 -0.0,8.2',
  '30.3,16.1 42.0,16.1 42.0,-16.1 30.3,-16.1', '-30.3,16.1 -42.0,16.1 -42.0,-16.1 -30.3,-16.1',
].map((points) => points.split(' ').map((pair) => pair.split(',').map((value) => Number(value) * 1000 / 30000)));

const changeToDrumRing = async (page) => {
  await pick(page, '-ShapeFamilies', 'DRUMRING');
  await pick(page, '-ShapeNames', DRR);
};

// The engine's own effective parameters for a fresh core of this shape (no previous core involved).
const freshEffectiveParameters = (page, shapeName, family) => page.evaluate(async ({ shapeName, family }) => {
  const { waitForMkf } = await import('/WebSharedComponents/assets/js/mkfRuntime.js');
  const mkf = await waitForMkf();
  const shape = JSON.parse(await mkf.get_shape_data(shapeName));
  const type = await mkf.get_core_type_for_shape_family(family);
  const core = JSON.parse(await mkf.calculate_core_data(JSON.stringify({ name: 'Custom',
    functionalDescription: { name: 'Custom', type, material: '95', shape, gapping: [], numberStacks: 1 } }), false));
  return { effectiveLength: core.processedDescription.effectiveParameters.effectiveLength * 1e3,
    effectiveArea: core.processedDescription.effectiveParameters.effectiveArea * 1e6 };
}, { shapeName, family });

const expectTurnsInsideTheWindow = (state) => {
  expect(state.turns.length, 'the coil is wound').toBeGreaterThan(0);
  const inner = state.centralColumnHalfWidth;
  const outer = inner + state.coreWindow.width;
  const half = state.coreWindow.height / 2;
  for (const turn of state.turns) {
    expect(turn.x - turn.width / 2, `${turn.name} is outside the post`).toBeGreaterThanOrEqual(inner - 1e-6);
    expect(turn.x + turn.width / 2, `${turn.name} is inside the window, not beyond it`).toBeLessThanOrEqual(outer + 1e-6);
    expect(Math.abs(turn.y) + turn.height / 2, `${turn.name} is between the flanges`).toBeLessThanOrEqual(half + 1e-6);
  }
};

test.describe('drum cores in the Magnetic Builder (ABT #2410)', () => {
  test.describe.configure({ timeout: 600000 });

  test('DRUM-1: PQ 27/15 -> drumRing is built as the drumRing, with its turns inside its window and a 3D preview', async ({ page }, testInfo) => {
    await loadPq(page, testInfo);
    const before = await designState(page);
    expect(before.shapeName, 'the premise: the design starts on the PQ').toBe('PQ 27/15');
    expect(before.gapping.some(([type]) => type === 'subtractive'), 'the premise: the PQ is gapped').toBe(true);

    await changeToDrumRing(page);
    const after = await designState(page);
    expect(after.shapeName).toBe(DRR);
    expect(after.family).toBe('drumRing');
    expect(after.type).toBe('pieceAndPlate');
    expect(after.pieces.length, 'the drumRing has its own geometry').toBeGreaterThan(0);
    expect(new Set(after.pieces), 'no piece of the PQ is left').toEqual(new Set([DRR]));
    expect(after.gapping.every(([type]) => type === 'residual'), `the PQ's gap is not carried onto the drum: ${JSON.stringify(after.gapping)}`).toBe(true);
    const fresh = await freshEffectiveParameters(page, DRR, 'drumRing');
    expect(after.effectiveLength, 'the effective length is the drumRing\'s, not the PQ\'s 33.5 mm').toBeCloseTo(fresh.effectiveLength, 6);
    expect(after.effectiveArea).toBeCloseTo(fresh.effectiveArea, 6);
    expect(after.effectiveLength, 'MKF\'s drumRing effective length (ABT #2414: exact flange term)').toBeCloseTo(DRR_EFFECTIVE_LENGTH_MM, 3);
    expect(after.coreWindow.width, 'the drumRing window (0.525 x 0.549 mm)').toBeCloseTo(0.525, 6);
    expectTurnsInsideTheWindow(after);
    await expect(page.locator('[data-cy$="-CoreInfo-CoreChangeRefused"]')).toHaveCount(0);

    // The 3D preview: meshes in the three.js scene, and no "unavailable" overlay.
    const canvas = page.locator('.magnetic-3d-visualizer-container canvas').first();
    await canvas.waitFor({ state: 'visible', timeout: 90000 });
    const scene = await page.waitForFunction(() => {
      const element = document.querySelector('.magnetic-3d-visualizer-container');
      const threeScene = element && window.__omFindComponent((instance) => instance.proxy?.$refs?.scene?.scene && instance.proxy.$el?.contains?.(element))?.$refs?.scene?.scene;
      if (!threeScene) return false;
      const meshes = [];
      const walk = (object) => {
        for (const child of (object.children ?? [])) {
          if (child.isMesh && child.geometry?.attributes?.position) meshes.push(child.geometry.attributes.position.count);
          walk(child);
        }
      };
      walk(threeScene);
      return meshes.length ? { meshes: meshes.length, vertices: meshes.reduce((a, b) => a + b, 0) } : false;
    }, null, { timeout: 120000 }).then((handle) => handle.jsonValue());
    expect(scene.meshes).toBeGreaterThan(0);
    expect(scene.vertices).toBeGreaterThan(100);
    await expect(page.locator('[data-cy$="-core-build-failed"]')).toHaveCount(0);
  });

  test('DRUM-2: PQ 27/15 -> semi-shielded drum is built without gaps and says it needs its shell material', async ({ page }, testInfo) => {
    await loadPq(page, testInfo);
    await expect(page.locator('[data-cy$="-Core-ShellMaterialMissing"]'), 'a PQ needs no shell material').toHaveCount(0);
    await pick(page, '-ShapeFamilies', 'DRUMSEMISHIELDED');
    await pick(page, '-ShapeNames', DRS);
    const after = await designState(page);
    expect(after.shapeName).toBe(DRS);
    expect(after.family).toBe('drumSemishielded');
    expect(after.type).toBe('pieceAndPlate');
    expect(after.gapping, 'a cast shell has no gaps; the PQ\'s are not carried').toEqual([]);
    expect(new Set(after.pieces)).toEqual(new Set([DRS]));
    const fresh = await freshEffectiveParameters(page, DRS, 'drumSemishielded');
    expect(after.effectiveLength).toBeCloseTo(fresh.effectiveLength, 6);
    await expect(page.locator('[data-cy$="-CoreInfo-CoreChangeRefused"]')).toHaveCount(0);
    const message = page.locator('[data-cy$="-Core-ShellMaterialMissing"]').first();
    await expect(message).toBeVisible();
    await expect(message).toContainText('semi-shielded drum needs the material of its magnetic-epoxy shell');
  });

  test('DRUM-6: a semi-shielded drum with a shell the user defines (magnetic epoxy, mu 10, a saturation point, measured losses) is simulated with that permeability', async ({ page }, testInfo) => {
    await loadPq(page, testInfo);
    await pick(page, '-ShapeFamilies', 'DRUMSEMISHIELDED');
    await pick(page, '-ShapeNames', DRS);
    const missing = page.locator('[data-cy$="-Core-ShellMaterialMissing"]').first();
    await expect(missing, 'the premise: the drum has no shell material yet').toBeVisible();
    const before = await designState(page);
    expect(before.shapeName).toBe(DRS);
    // Without its shell the drum cannot be simulated, and the Engine log says so (the premise). From here on,
    // with the shell defined and applied, no further shell error may be logged.
    const shellErrors = async () => (await engineLogRecords(page, { level: 'ERROR' }))
      .filter((record) => /shell|Semi-shielded/i.test(record.message));
    const shellErrorsBefore = await shellErrors();

    await defineShell(page, { name: 'Test shell epoxy', manufacturer: 'Test lab', type: 'MagneticEpoxy' });
    await enterInitialPermeability(page, { temperature: 25, value: SHELL_PERMEABILITY });
    await enterSaturation(page, SHELL_SATURATION);
    await enterLosses(page, SHELL_LOSS_POINTS);
    const mark = await activityMark(page);
    await page.locator('button').filter({ hasText: /Apply changes/i }).first().click();
    await waitForIdle(page, { since: mark, quietMs: 3000, timeout: 240000, label: 'the shell material' });

    const material = await storeMaterial(page);
    expect(material.summary, 'material = [drum, the user\'s magnetic-epoxy shell], no magneticEpoxy coating').toEqual({
      isList: true, length: 2, drum: '95', shellName: 'Test shell epoxy', shellType: 'magneticEpoxy', coating: null, shape: DRS });
    expect(material.shell.permeability.initial, 'the shell carries the permeability entered, nothing else')
      .toEqual([{ temperature: 25, value: SHELL_PERMEABILITY }]);
    expect(material.shell.saturation.length, 'the one saturation point entered').toBe(1);
    for (const key of ['temperature', 'magneticFluxDensity', 'magneticField']) {
      expect(material.shell.saturation[0][key], `saturation ${key}`).toBeCloseTo(SHELL_SATURATION[key], 6);
    }
    const lossPoints = material.shell.volumetricLosses.default.filter((method) => Array.isArray(method)).flat().map((point) => ({ frequency: point.magneticFluxDensity.frequency,
      magneticFluxDensity: point.magneticFluxDensity.magneticFluxDensity.processed.peak, value: point.value, temperature: point.temperature }));
    const lossKey = (point) => `${point.magneticFluxDensity}@${point.frequency}`;
    expect(lossPoints.map(lossKey).sort(), 'the four loss points entered').toEqual(SHELL_LOSS_POINTS.map(lossKey).sort());
    for (const point of SHELL_LOSS_POINTS) {
      const stored = lossPoints.find((candidate) => lossKey(candidate) === lossKey(point));
      expect(stored.value, lossKey(point)).toBeCloseTo(point.value, 3);
      expect(stored.temperature).toBe(25);
    }
    const models = material.shell.volumetricLosses.default.filter((method) => !Array.isArray(method));
    expect(models.map((model) => model.method), 'the Steinmetz model fitted to the points').toEqual(['steinmetz']);
    const after = await designState(page);
    expect(after, 'the shell changes no geometry, bobbin or turns').toEqual(before);

    await expect(missing, 'the shell material is given').toHaveCount(0);
    await expect(page.locator('[data-cy$="-Core-ShellMaterialIncomplete"]')).toHaveCount(0);
    await expect(page.locator('[data-cy$="-CoreInfo-SimulationError"]')).toHaveCount(0);
    await expect(page.locator('[data-cy$="-CoreInfo-CoreChangeRefused"]')).toHaveCount(0);
    const inductanceLabel = page.locator('[data-cy$="-CoreInfo-MagnetizingInductance-number-label"]').first();
    await expect(inductanceLabel, 'Core Info shows the drum\'s inductance').toBeVisible({ timeout: 120000 });
    await expect(inductanceLabel).toHaveText(/\d/);
    const shown = await shownInductance(page);

    // The engine itself (libMKF in node, not the page) on a core built afresh from the shape name and the
    // material list [95, that shell], with the design's coil and operating point.
    const design = await page.evaluate(() => {
      const mas = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas;
      return JSON.parse(JSON.stringify({ coil: mas.magnetic.coil, operatingPoint: mas.inputs.operatingPoints[0] }));
    });
    const probe = await engineInductance(material.shell, design);
    expect(shown / probe, `Core Info ${shown} H vs the engine ${probe} H with the shell at mu ${SHELL_PERMEABILITY}`).toBeGreaterThan(0.99);
    expect(shown / probe).toBeLessThan(1.01);
    // The permeability matters: the same shell at twice the permeability gives another inductance, so the
    // agreement above is the entered value's, not the drum's (about 3000).
    testInfo.annotations.push({ type: 'inductance', description: `Core Info ${shown} H, engine ${probe} H (ratio ${shown / probe})` });
    const doubled = await engineInductance({ ...material.shell, permeability: { initial: [{ temperature: 25, value: 2 * SHELL_PERMEABILITY }] } }, design);
    expect(Math.abs(doubled / probe - 1), 'the shell permeability changes the inductance').toBeGreaterThan(0.05);
    testInfo.annotations.push({ type: 'inductance at twice the permeability', description: `engine ${doubled} H (ratio ${doubled / probe})` });

    expect(await shellErrors(), 'no shell error logged once the shell is given').toEqual(shellErrorsBefore);
    await expect(page.locator('[data-cy$="-ShellMaterialNames-select"]').first(), 'the picker shows the shell').toContainText('Test shell epoxy');
    await page.locator('[data-cy$="-Core-ShellMaterial"]').first().screenshot({ path: testInfo.outputPath('drs-shell-picker.png') });
  });

  test('DRUM-7: a shell given a name and type but no permeability is not applied, the core is not simulated with it, and the editor says what is missing', async ({ page }, testInfo) => {
    await loadPq(page, testInfo);
    await pick(page, '-ShapeFamilies', 'DRUMSEMISHIELDED');
    await pick(page, '-ShapeNames', DRS);
    const before = await storeMaterial(page);
    expect(before.summary.isList, 'the premise: the drum has no shell material yet').toBe(false);

    await defineShell(page, { name: 'Shell without permeability', manufacturer: 'Test lab', type: 'MagneticEpoxy' });
    const mark = await activityMark(page);
    await page.locator('button').filter({ hasText: /Apply changes/i }).first().click();
    await waitForIdle(page, { since: mark, quietMs: 3000, timeout: 240000, label: 'the refused shell' });

    const message = page.locator('[data-cy$="-ShellMaterialIncomplete"]').first();
    await expect(message).toBeVisible();
    await expect(message).toContainText('The shell material needs its initial permeability');
    await expect(message).toContainText('before the semi-shielded drum can be simulated');
    await expect(page.locator('[data-cy$="-ShellMaterialTitle"]').first(), 'the editor stays open on the shell').toBeVisible();
    const after = await storeMaterial(page);
    expect(after.summary, 'the core keeps no shell: nothing was applied, nothing simulated with it').toEqual(before.summary);

    // The engine refuses that shell too: a semi-shielded drum whose shell has no permeability throws.
    const design = await page.evaluate(() => {
      const mas = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas;
      return JSON.parse(JSON.stringify({ coil: mas.magnetic.coil, operatingPoint: mas.inputs.operatingPoints[0] }));
    });
    const shell = { type: 'custom', name: 'Shell without permeability', material: 'magneticEpoxy', manufacturerInfo: { name: 'Test lab' },
      permeability: { initial: [] }, saturation: [], volumetricLosses: { default: [] } };
    await expect(engineInductance(shell, design)).rejects.toThrow(/Initial permeability list is empty for material: Shell without permeability/);
  });

  test('DRUM-3: a core change MKF refuses leaves the PQ whole and says why', async ({ page }, testInfo) => {
    await loadPq(page, testInfo);
    const before = await designState(page);
    expect(before.shapeName).toBe('PQ 27/15');
    const unit = (await page.locator('[data-cy$="-Gap-GapLength-DimensionUnit-input"]').first().innerText()).trim();
    const perMillimetre = { mm: 1, um: 1000, 'µm': 1000, 'μm': 1000 }[unit];
    if (perMillimetre == null) throw new Error(`The gap length input is in '${unit}', this test enters mm or um`);
    // 6 mm does not fit the PQ 27/15's 5.76 mm column: MKF refuses it ([GAP_INVALID_DIMENSIONS]).
    await setNumber(page, '-Gap-GapLength', 6 * perMillimetre);

    const refused = page.locator('[data-cy$="-CoreInfo-CoreChangeRefused"]').first();
    await expect(refused).toBeVisible({ timeout: 60000 });
    await expect(refused).toContainText('does not fit the winding column');
    const after = await designState(page);
    expect(after, 'the PQ comes back whole: shape, gaps, processed and geometrical descriptions, bobbin, turns').toEqual(before);
    const records = await engineLogRecords(page, { source: 'Core', level: 'ERROR' });
    expect(records.some((record) => record.message.includes('does not fit the winding column')), JSON.stringify(records)).toBe(true);
  });

  test('DRUM-4: the Winding Studio draws a drumRing from MKF\'s outline, with no column gaps', async ({ page }, testInfo) => {
    await loadPq(page, testInfo);
    await changeToDrumRing(page);
    if (await page.locator('[data-cy$="-WindingStudio"]').count() === 0) {
      await page.locator('[data-cy$="-Coil-WindingStudio-button"]').first().click();
    }
    const core = page.locator('[data-cy$="-WindingStudio-painter-core"]').first();
    await expect(core).toBeAttached({ timeout: 60000 });
    const polygons = await core.locator('polygon').evaluateAll((elements) => elements.map((element) =>
      element.getAttribute('points').trim().split(/\s+/).map((pair) => pair.split(',').map(Number))));
    // The same polygons as the Painter's whole-magnetic drawing, in any order (mm, 1 um).
    const key = (polygon) => polygon.map(([x, y]) => `${(x + 0).toFixed(3)},${(y + 0).toFixed(3)}`).join(' ');
    expect(polygons.map(key).sort(), 'post, two flanges and the ring, both halves').toEqual(DRR_PAINTER_FERRITE.map(key).sort());
    await expect(page.locator('[data-cy$="-WindingStudio-gap"]'), 'the drumRing rim clearances are not drawn as column gaps').toHaveCount(0);
    await page.locator('[data-cy$="-WindingStudio"]').first().screenshot({ path: testInfo.outputPath('studio-drr.png') });
  });

  test('DRUM-5: the Winding Studio refuses a core whose geometry belongs to another shape, and says why while the outline loads or fails', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    const result = await page.evaluate(async ({ fixture, drr }) => {
      const { buildStudioModel, parsePainterFerriteOutline } = await import('/MagneticBuilder/src/components/MagneticBuilder/WindingStudio/geometry.js');
      const pq = fixture.magnetic;
      // The PQ's processed and geometrical descriptions under a drumRing's name.
      const stale = JSON.parse(JSON.stringify(pq));
      stale.core.functionalDescription.shape = { ...stale.core.functionalDescription.shape, name: drr, family: 'drumRing' };
      const drum = JSON.parse(JSON.stringify(stale));
      drum.core.geometricalDescription = drum.core.geometricalDescription.map((piece) => ({ ...piece, shape: { ...piece.shape, name: drr, family: 'drumRing' } }));
      let parseError = null;
      try { parsePainterFerriteOutline('Exception: [INVALID_CORE_DATA] no core'); }
      catch (error) { parseError = error.message; }
      return {
        pq: buildStudioModel(pq).valid,
        stale: buildStudioModel(stale, { status: 'ready', polygons: [[[0, 0], [1, 0], [1, 1]]] }),
        loading: buildStudioModel(drum, { status: 'loading' }),
        failed: buildStudioModel(drum, { status: 'error', reason: 'the reason' }),
        none: buildStudioModel(drum, null),
        parseError,
      };
    }, { fixture: JSON.parse(fs.readFileSync(FIXTURE, 'utf8')), drr: DRR });
    expect(result.pq, 'the premise: the PQ itself is drawn').toBe(true);
    expect(result.stale.valid).toBe(false);
    expect(result.stale.reason).toContain('belongs to PQ 27/15');
    expect(result.loading).toEqual({ valid: false, reason: 'Loading the core outline from MKF…' });
    expect(result.none).toEqual({ valid: false, reason: 'Loading the core outline from MKF…' });
    expect(result.failed).toEqual({ valid: false, reason: 'MKF could not draw this core: the reason' });
    expect(result.parseError).toContain('MKF did not return a core drawing: Exception: [INVALID_CORE_DATA] no core');
  });
});
