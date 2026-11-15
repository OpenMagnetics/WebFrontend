/**
 * The builder's core-material editor (Customize -> Edit material), on any custom material.
 *
 * Found while defining the shell of a semi-shielded drum (ABT #2410), but the editor is the one every
 * custom material goes through:
 *  - a saturation point is a MAS bhCyclePoint (flux density, magnetic field AND temperature, all
 *    required), but the "Saturation vs Temperature" editor offered only temperature and flux density:
 *    the field could not be entered, so a new material's saturation could never be complete;
 *  - its onDimensionUpdate wrote this.data[this.indexes[index]], and nothing ever filled `indexes`:
 *    every edit threw "Cannot set properties of undefined";
 *  - its assignLocalData appended to the rows without clearing them, so every add or remove showed
 *    every point again;
 *  - the measured-loss editor only let the user change a point's frequency and value: the flux density
 *    and temperature were fixed by the first point, while the engine's loss-model fit needs points at two
 *    or more flux densities and two or more frequencies. It also kept the axis and series labels of its
 *    first grouping;
 *  - measured points alone give MKF no core-loss model (CoreLossesModel::get_methods reads only models),
 *    and the editor had no way to turn them into one: a material defined with measured losses failed
 *    with "No model found for material". The editor now asks MKF to fit a Steinmetz model to them.
 *
 * The start is the default two-winding PQ 27/15 design, core material 95 (a catalogue ferrite with
 * saturation points at several temperatures).
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/index.js';
import { installActivityProbe, activityMark, waitForIdle } from './utils/activity.js';
import { typeSi, enterLossPoints, fitSteinmetz } from './utils/materialEditor.js';

const FIXTURE = new URL('./fixtures/default_two_winding_pq2715.json', import.meta.url).pathname;

const SATURATION = '-SaturationVersusTemperature-PropertyTool';
const LOSSES = '-VolumetricLossesPerTemperature-PropertyTool';

async function openMaterialEditor(page, testInfo) {
  await installActivityProbe(page);
  const file = testInfo.outputPath('design.json');
  fs.writeFileSync(file, fs.readFileSync(FIXTURE, 'utf8'));
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__ != null);
  let mark = await activityMark(page);
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(file);
  await page.waitForURL('**/magnetic_tool**', { timeout: 120000 });
  await waitForIdle(page, { since: mark, quietMs: 3000, timeout: 240000, label: 'the PQ design' });
  mark = await activityMark(page);
  await page.locator('[data-cy$="-Core-Customize-button"]').first().click();
  const editMaterial = page.locator('button').filter({ hasText: /^\s*Edit material\s*$/ });
  if (await editMaterial.count() > 0) {
    await editMaterial.first().click();
  }
  await expect(page.locator(`[data-cy$="${SATURATION}-edit-button"]`).first()).toBeVisible({ timeout: 60000 });
  await waitForIdle(page, { since: mark, quietMs: 3000, timeout: 240000, label: 'the material editor' });
}

// The material the editor is editing (the advanced core selector's local copy), as plain data.
const editedMaterial = (page) => page.evaluate(() => {
  const find = (instance) => {
    if (instance == null) return null;
    if (instance.type?.__name === 'AdvancedCoreSelectorMaterial' || instance.type?.name === 'AdvancedCoreSelectorMaterial'
      || (instance.props?.core != null && instance.proxy?.normalizeInitialPermeability != null)) {
      return instance.props.core.functionalDescription.material;
    }
    const children = instance.subTree == null ? [] : collect(instance.subTree);
    for (const child of children) {
      const found = find(child);
      if (found != null) return found;
    }
    return null;
  };
  const collect = (vnode) => {
    const out = [];
    const walk = (node) => {
      if (node == null) return;
      if (node.component != null) { out.push(node.component); return; }
      if (Array.isArray(node.children)) node.children.forEach(walk);
      if (node.suspense?.activeBranch) walk(node.suspense.activeBranch);
    };
    walk(vnode);
    return out;
  };
  const material = find(document.querySelector('#app').__vue_app__._instance);
  if (material == null) throw new Error('the material editor is not mounted');
  return JSON.parse(JSON.stringify(material));
});

// Console errors and page errors raised from now on.
function collectErrors(page) {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(String(error)));
  return errors;
}

const rows = (page, tool) => page.locator(`[data-cy$="${tool}-remove-point-button"]`);

test.describe('core-material editor (Customize -> Edit material)', () => {
  test.describe.configure({ timeout: 600000 });

  test('MATED-1: a saturation point is edited in place, with its magnetic field, and the edit reaches the material', async ({ page }, testInfo) => {
    await openMaterialEditor(page, testInfo);
    const before = await editedMaterial(page);
    expect(before.name, 'the premise: the catalogue material 95').toBe('95');
    expect(before.saturation.length, 'the premise: 95 has saturation points').toBeGreaterThan(0);
    const errors = collectErrors(page);

    await page.locator(`[data-cy$="${SATURATION}-edit-button"]`).first().click();
    const field = page.locator(`[data-cy$="${SATURATION}-Property-0 magneticField-number-input"] input`).first();
    await expect(field, 'each saturation point shows its magnetic field').toBeVisible();

    await typeSi(page, `${SATURATION}-Property-0 magneticFluxDensity`, 0.321);
    await typeSi(page, `${SATURATION}-Property-0 magneticField`, 987);
    const after = await editedMaterial(page);
    expect(after.saturation[0].magneticFluxDensity, 'the flux density entered').toBeCloseTo(0.321, 9);
    expect(after.saturation[0].magneticField, 'the magnetic field entered').toBeCloseTo(987, 6);
    expect(after.saturation.slice(1), 'the other points are untouched').toEqual(before.saturation.slice(1));
    expect(errors, 'editing a point raises no error').toEqual([]);
  });

  test('MATED-2: adding and removing saturation points shows each point once', async ({ page }, testInfo) => {
    await openMaterialEditor(page, testInfo);
    const before = await editedMaterial(page);
    const count = before.saturation.length;
    expect(count, 'the premise: 95 has saturation points').toBeGreaterThan(0);
    const errors = collectErrors(page);

    await page.locator(`[data-cy$="${SATURATION}-edit-button"]`).first().click();
    await expect(rows(page, SATURATION), 'one row per saturation point when the editor opens').toHaveCount(count);
    await page.locator(`[data-cy$="${SATURATION}-add-point-below-button"]`).first().click();
    await expect(rows(page, SATURATION), 'one more row, not every point again').toHaveCount(count + 1);
    expect((await editedMaterial(page)).saturation.length).toBe(count + 1);
    await page.locator(`[data-cy$="${SATURATION}-remove-point-button"]`).first().click();
    await expect(rows(page, SATURATION), 'back to one row per point').toHaveCount(count);
    expect((await editedMaterial(page)).saturation, 'the copy removed, the points as they were').toEqual(before.saturation);
    expect(errors).toEqual([]);
  });

  test('MATED-3: measured loss points are entered at two flux densities and two frequencies', async ({ page }, testInfo) => {
    await openMaterialEditor(page, testInfo);
    const before = await editedMaterial(page);
    expect((before.volumetricLosses?.default ?? []).some((method) => Array.isArray(method) && method.length > 0),
      'the premise: 95 has no measured loss points').toBe(false);
    const errors = collectErrors(page);

    await page.locator('[data-cy$="-seed-loss-points-button"]').first().click();
    await page.locator(`[data-cy$="${LOSSES}-edit-button"]`).first().click();
    const points = [
      { frequency: 100000, magneticFluxDensity: 0.1, value: 113000 },
      { frequency: 200000, magneticFluxDensity: 0.1, value: 278000 },
      { frequency: 200000, magneticFluxDensity: 0.05, value: 49000 },
      { frequency: 100000, magneticFluxDensity: 0.05, value: 20000 },
    ];
    await enterLossPoints(page, points);

    const after = await editedMaterial(page);
    const measured = after.volumetricLosses.default.find((method) => Array.isArray(method));
    const entered = measured.map((point) => ({ frequency: point.magneticFluxDensity.frequency,
      magneticFluxDensity: point.magneticFluxDensity.magneticFluxDensity.processed.peak, value: point.value, temperature: point.temperature }));
    const key = (point) => `${point.magneticFluxDensity}@${point.frequency}`;
    expect(entered.map(key).sort()).toEqual(points.map(key).sort());
    for (const point of points) {
      const stored = entered.find((candidate) => key(candidate) === key(point));
      expect(stored.value, key(point)).toBeCloseTo(point.value, 3);
      expect(stored.temperature).toBe(25);
    }

    // The points alone give the engine no loss model: MKF fits a Steinmetz model to them. The points
    // were made with alpha about 1.3 (x2.46 per frequency doubling) and beta about 2.5 (x5.65 per flux
    // density doubling), and the fit recovers them.
    const report = await fitSteinmetz(page);
    expect(report).toContain('Steinmetz model fitted to 4 points from 100 kHz to 200 kHz');
    const fitted = (await editedMaterial(page)).volumetricLosses.default.filter((method) => !Array.isArray(method) && method.method === 'steinmetz');
    expect(fitted.length, 'one Steinmetz model, next to the points').toBe(1);
    expect(fitted[0].ranges.length).toBe(1);
    expect(fitted[0].ranges[0].alpha).toBeCloseTo(1.3, 1);
    expect(fitted[0].ranges[0].beta).toBeCloseTo(2.5, 1);
    expect(errors).toEqual([]);
  });
});
