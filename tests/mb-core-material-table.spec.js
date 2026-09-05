/**
 * ABT #1072 — the Core Configuration header carries "Shapes" and "Materials"
 * buttons that open catalogue tables (FilterableDataTable) BEFORE any family
 * or manufacturer is chosen: the tables exist to browse across those.
 *
 * The material table lists every offerable material with properties the
 * engine resolves (initial permeability, saturation, Curie temperature,
 * resistivity, losses at 100 kHz / 100 mT / 100 °C), filterable per column;
 * picking a row applies the material to the core.
 *
 * ABT #1071 — picking a DRUM shape from the shape table after a gapped core
 * used to keep the previous core's subtractive gap, and the engine refused
 * it ("an open-circuit (drum) core cannot be gapped"), cascading into Vue
 * TypeErrors and an inductance "worker returned -1".
 */
import { test, expect } from './_coverage.js';
import { isBenign, pause } from './utils.js';
import { goToBuilderStep, adviseCoreAndWait } from './utils/builder-helpers.js';

const MAT = '-AdvancedCoreInfo-MaterialTable';
const SHAPE = '-AdvancedCoreInfo-ShapeTable';

async function columnIndex(page, label, title) {
  const headers = await page.locator(`[data-cy$="${label}"] table thead th`).allInnerTexts();
  const idx = headers.findIndex(h => h.trim().toUpperCase().startsWith(title.toUpperCase()));
  expect(idx, `column "${title}" must exist (headers: ${headers.map(h => h.trim()).join(' | ')})`).toBeGreaterThanOrEqual(0);
  return idx;
}

async function columnCells(page, label, title) {
  const idx = await columnIndex(page, label, title);
  return page.locator(`[data-cy$="${label}"] table tbody tr td:nth-child(${idx + 1})`).allInnerTexts();
}

async function counts(page, label, noun) {
  const text = (await page.locator(`[data-cy$="${label}-filter-count"]`).innerText()).trim();
  const m = text.match(new RegExp(`^(\\d+)(?: of (\\d+))? ${noun}`));
  expect(m, `summary must read "N [of M] ${noun}…" (got "${text}")`).toBeTruthy();
  return { filtered: Number(m[1]), total: m[2] ? Number(m[2]) : Number(m[1]) };
}

async function storeCore(page) {
  return page.evaluate(() => {
    const app = document.querySelector('#app').__vue_app__;
    const core = app.config.globalProperties.$pinia._s.get('mas').mas.magnetic.core;
    const shape = core?.functionalDescription?.shape;
    const material = core?.functionalDescription?.material;
    return {
      shape: typeof shape === 'string' ? shape : shape?.name,
      material: typeof material === 'string' ? material : material?.name,
      type: core?.functionalDescription?.type,
      realGaps: (core?.functionalDescription?.gapping ?? []).filter(g => g.type !== 'residual' && g.length > 1e-6).length,
    };
  });
}

test.describe('MB – material table and header catalogue buttons (ABT #1072, #1071)', () => {
  test.describe.configure({ timeout: 300000 });

  test('Materials button → filterable table → pick applies the material; Shapes button → drum pick is clean', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });
    page.on('pageerror', e => errors.push(`pageerror: ${e}`));

    await goToBuilderStep(page);

    // ── Both catalogue buttons live in the header, before anything is selected.
    const shapesBtn = page.locator('[data-cy$="-Core-ShapeTable-button"]').first();
    const materialsBtn = page.locator('[data-cy$="-Core-MaterialTable-button"]').first();
    await expect(shapesBtn, 'the Shapes button must be in the Core Configuration header').toBeVisible({ timeout: 15000 });
    await expect(materialsBtn, 'the Materials button must be in the Core Configuration header').toBeVisible();
    await expect(materialsBtn, 'the Materials button enables once the material list is loaded').toBeEnabled({ timeout: 30000 });

    await adviseCoreAndWait(page);
    const before = await storeCore(page);
    expect(before.material, 'advise must have picked a material').toBeTruthy();

    // ── Material table: opens, resolves, lists offerable materials with engine-resolved numbers.
    await materialsBtn.click();
    const table = page.locator(`[data-cy$="${MAT}"] table`);
    await expect(table, 'the material table must open (engine summary may take a few seconds)').toBeVisible({ timeout: 60000 });
    await expect(page.locator(`[data-cy$="${MAT}"] table tbody tr`).first()).toBeVisible({ timeout: 15000 });
    await pause(page, 300, 'dialog enter transition');

    const all = await counts(page, MAT, 'materials');
    expect(all.total, 'the catalogue offers many materials').toBeGreaterThan(50);

    for (const title of ['Name', 'Manufacturer', 'Type', 'Permeability @25', 'Bsat @25', 'Curie', 'Losses @100 kHz']) {
      await columnIndex(page, MAT, title);
    }
    const mu = (await columnCells(page, MAT, 'Permeability @25')).map(Number);
    expect(mu.some(v => Number.isFinite(v) && v > 0), 'initial permeability cells must carry engine-resolved numbers').toBe(true);
    const bsat = (await columnCells(page, MAT, 'Bsat @25')).map(Number).filter(Number.isFinite);
    expect(bsat.length).toBeGreaterThan(0);
    for (const v of bsat) {
      expect(v, 'Bsat in mT must be in a physical range').toBeGreaterThan(100);
      expect(v).toBeLessThan(2500);
    }

    // ── Numeric range filter on permeability (e.g. "≥ 2000" = power ferrites).
    await page.locator(`[data-cy$="${MAT}-filter-initialPermeabilityA"]`).click();
    const minInput = page.locator(`[data-cy$="${MAT}-filter-initialPermeabilityA-min"]`);
    await expect(minInput).toBeVisible();
    await minInput.fill('2000');
    await page.keyboard.press('Escape');
    const ranged = await counts(page, MAT, 'materials');
    expect(ranged.filtered).toBeGreaterThan(0);
    expect(ranged.filtered).toBeLessThan(ranged.total);
    for (const cell of await columnCells(page, MAT, 'Permeability @25')) {
      expect(Number(cell)).toBeGreaterThanOrEqual(2000);
    }

    // ── Type multi-select lists the material classes once each.
    await page.locator(`[data-cy$="${MAT}-filter-materialTypeLabel"]`).click();
    const typeSelect = page.locator(`[data-cy$="${MAT}-filter-materialTypeLabel-select"]`);
    await expect(typeSelect).toBeVisible();
    const types = await typeSelect.locator('option').allInnerTexts();
    expect(types, 'ferrites must be among the offered material types').toContain('Ferrite');
    expect(new Set(types).size).toBe(types.length);
    await page.keyboard.press('Escape');

    // ── Pick a material different from the current one; it must land in the store.
    await page.locator(`[data-cy$="${MAT}-filter-clear-all"]`).click();
    await page.locator(`[data-cy$="${MAT}-filter-name"]`).click();
    const nameInput = page.locator(`[data-cy$="${MAT}-filter-name-text"]`);
    await nameInput.fill('3C9');
    await page.keyboard.press('Escape');
    const rows = page.locator(`[data-cy$="${MAT}"] table tbody tr`);
    const rowCount = await rows.count();
    expect(rowCount, 'a 3C9x ferrite must be offered').toBeGreaterThan(0);
    let picked = null;
    for (let i = 0; i < rowCount; i++) {
      const name = (await rows.nth(i).locator('td').first().innerText()).trim();
      if (name !== before.material) { picked = name; await rows.nth(i).click(); break; }
    }
    expect(picked, 'a material other than the current one must be pickable').toBeTruthy();
    await expect(table).toBeHidden({ timeout: 10000 });
    await page.waitForFunction((name) => {
      const app = document.querySelector('#app').__vue_app__;
      const material = app.config.globalProperties.$pinia._s.get('mas').mas.magnetic.core?.functionalDescription?.material;
      return (typeof material === 'string' ? material : material?.name) === name;
    }, picked, { timeout: 30000 });
    await pause(page, 2000, 'core reprocess after material change');

    // ── Shapes button opens the shape table; a DRUM pick must be clean (ABT #1071).
    await shapesBtn.click();
    await expect(page.locator(`[data-cy$="${SHAPE}"] table tbody tr`).first()).toBeVisible({ timeout: 15000 });
    await pause(page, 300, 'dialog enter transition');
    const familyTag = page.locator(`[data-cy$="${SHAPE}-filter-tag-familyLabel"]`);
    if (await familyTag.isVisible()) await familyTag.locator('button').click();
    await page.locator(`[data-cy$="${SHAPE}-filter-familyLabel"]`).click();
    const familySelect = page.locator(`[data-cy$="${SHAPE}-filter-familyLabel-select"]`);
    await expect(familySelect).toBeVisible();
    await familySelect.selectOption(['DRUM']);
    await page.keyboard.press('Escape');
    const drumRow = page.locator(`[data-cy$="${SHAPE}"] table tbody tr`).first();
    const drumName = (await drumRow.locator('td').first().innerText()).trim();
    await drumRow.click();
    await expect(page.locator(`[data-cy$="${SHAPE}"] table`)).toBeHidden({ timeout: 10000 });
    await page.waitForFunction((name) => {
      const app = document.querySelector('#app').__vue_app__;
      const shape = app.config.globalProperties.$pinia._s.get('mas').mas.magnetic.core?.functionalDescription?.shape;
      return (typeof shape === 'string' ? shape : shape?.name) === name;
    }, drumName, { timeout: 30000 });
    await pause(page, 6000, 'autocomplete + inductance + losses for the drum core');

    const after = await storeCore(page);
    expect(after.shape).toBe(drumName);
    expect(after.type, 'a drum is an open shape').toBe('openShape');
    expect(after.realGaps, 'no gap may be carried over onto an open-circuit core').toBe(0);
    expect(errors.filter(e => /cannot be gapped|worker returned -1|TypeError/.test(e)),
      `the drum pick must not throw (errors: ${errors.join(' | ')})`).toHaveLength(0);

    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });
});
