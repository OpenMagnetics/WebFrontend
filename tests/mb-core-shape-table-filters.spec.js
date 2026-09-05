/**
 * The Magnetic Builder core-shape table (the modal behind the table icon
 * next to the shape dropdown) must let the user order and filter by the
 * VALUE of every column, not only by one global text search.
 *
 * Users reported: "the table doesn't allow filtering by the column values".
 * Before this, every numeric cell was a pre-formatted string ("12.3 mm²"),
 * so ordering was lexicographic and no range filter was possible.
 *
 * The table is WebSharedComponents/Common/FilterableDataTable.vue (ported
 * from Würth's Asgard frontend): a funnel per column opens a popover with a
 * min/max range for numeric columns and a search + multi-select for text
 * columns; active filters show as removable tags with a "Clear all".
 */
import { test, expect } from './_coverage.js';
import { isBenign, pause } from './utils.js';
import { goToBuilderStep, adviseCoreAndWait } from './utils/builder-helpers.js';

const LABEL = '-AdvancedCoreInfo-ShapeTable';

/** Column index (0-based) of a column by its header title. */
async function columnIndex(page, title) {
  const headers = await page.locator(`[data-cy$="${LABEL}"] table thead th`).allInnerTexts();
  const idx = headers.findIndex(h => h.trim().toUpperCase().startsWith(title.toUpperCase()));
  expect(idx, `column "${title}" must exist (headers: ${headers.map(h => h.trim()).join(' | ')})`).toBeGreaterThanOrEqual(0);
  return idx;
}

/** Text of the given column on the CURRENT page of the table. */
async function columnCells(page, title) {
  const idx = await columnIndex(page, title);
  return page.locator(`[data-cy$="${LABEL}"] table tbody tr td:nth-child(${idx + 1})`).allInnerTexts();
}

/** "N of M shapes after filtering" → { filtered, total }. */
async function counts(page) {
  const text = (await page.locator(`[data-cy$="${LABEL}-filter-count"]`).innerText()).trim();
  const m = text.match(/^(\d+)(?: of (\d+))? shapes/);
  expect(m, `summary must read "N [of M] shapes…" (got "${text}")`).toBeTruthy();
  const total = m[2] ? Number(m[2]) : Number(m[1]);
  return { filtered: Number(m[1]), total };
}

async function openShapeTable(page) {
  const btn = page.locator('.shape-table-btn').first();
  await expect(btn, 'the "open core shape table" button must be visible').toBeVisible({ timeout: 15000 });
  await btn.click();
  const table = page.locator(`[data-cy$="${LABEL}"] table`);
  await expect(table, 'the shape table must open').toBeVisible({ timeout: 15000 });
  await expect(page.locator(`[data-cy$="${LABEL}"] table tbody tr`).first(), 'the table must have rows').toBeVisible({ timeout: 15000 });
  await pause(page, 300, 'dialog enter transition');
}

test.describe('MB – core shape table filters and orders by column value', () => {
  test.describe.configure({ timeout: 240000 });

  test('funnel filters, numeric ordering, tags, clear-all and row pick', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await openShapeTable(page);

    // ── Opens pre-filtered to the current shape's family, as a visible, removable tag.
    const familyTag = page.locator(`[data-cy$="${LABEL}-filter-tag-familyLabel"]`);
    await expect(familyTag, 'the table must open filtered to the current family').toBeVisible();
    const presetFamily = (await familyTag.innerText()).replace(/^Family:\s*/, '').trim();
    expect(presetFamily.length, 'the family tag must name a family').toBeGreaterThan(0);
    for (const cell of await columnCells(page, 'Family')) {
      expect(cell.trim(), 'every visible row must belong to the preset family').toBe(presetFamily);
    }
    const preset = await counts(page);
    expect(preset.filtered, 'family preset must leave rows').toBeGreaterThan(0);
    expect(preset.total, 'the database has many shapes').toBeGreaterThan(preset.filtered);

    // ── Removing the tag shows everything.
    await familyTag.locator('button').click();
    await expect(familyTag).toBeHidden();
    const all = await counts(page);
    expect(all.filtered, 'clearing the family filter must show every shape').toBe(all.total);

    // ── Numeric range filter on effective area: min/max in the popover.
    await page.locator(`[data-cy$="${LABEL}-filter-effectiveArea"]`).click();
    const minInput = page.locator(`[data-cy$="${LABEL}-filter-effectiveArea-min"]`);
    await expect(minInput, 'the effective-area popover must open with a Min input').toBeVisible();
    await minInput.fill('50');
    await page.locator(`[data-cy$="${LABEL}-filter-effectiveArea-max"]`).fill('100');
    await page.keyboard.press('Escape');
    await expect(minInput).toBeHidden();

    const areaTag = page.locator(`[data-cy$="${LABEL}-filter-tag-effectiveArea"]`);
    await expect(areaTag).toBeVisible();
    expect((await areaTag.innerText()).trim()).toContain('50 – 100');
    const ranged = await counts(page);
    expect(ranged.filtered, 'a 50–100 mm² window must keep some shapes').toBeGreaterThan(0);
    expect(ranged.filtered, 'a 50–100 mm² window must drop some shapes').toBeLessThan(ranged.total);
    for (const cell of await columnCells(page, 'Eff. Area')) {
      const v = Number(cell);
      expect(Number.isFinite(v), `cell "${cell}" must be a plain number`).toBe(true);
      expect(v).toBeGreaterThanOrEqual(50);
      expect(v).toBeLessThanOrEqual(100);
    }

    // ── Text filter on the name column stacks with the range filter.
    await page.locator(`[data-cy$="${LABEL}-filter-name"]`).click();
    const nameInput = page.locator(`[data-cy$="${LABEL}-filter-name-text"]`);
    await expect(nameInput).toBeVisible();
    await nameInput.fill('E');
    await page.keyboard.press('Escape');
    const stacked = await counts(page);
    expect(stacked.filtered, 'name filter must combine with the range filter').toBeLessThanOrEqual(ranged.filtered);
    for (const cell of await columnCells(page, 'Name')) {
      expect(cell.toUpperCase(), 'every visible name must contain the search text').toContain('E');
    }

    // ── Family multi-select: pick a family from the list.
    await page.locator(`[data-cy$="${LABEL}-filter-familyLabel"]`).click();
    const familySelect = page.locator(`[data-cy$="${LABEL}-filter-familyLabel-select"]`);
    await expect(familySelect).toBeVisible();
    const familyOptions = await familySelect.locator('option').allInnerTexts();
    expect(familyOptions.length, 'the family list must offer the distinct families').toBeGreaterThan(1);
    expect(new Set(familyOptions).size, 'families must be listed once each').toBe(familyOptions.length);
    await page.keyboard.press('Escape');

    // ── Clear all → back to the full list.
    await page.locator(`[data-cy$="${LABEL}-filter-clear-all"]`).click();
    await expect(areaTag).toBeHidden();
    const cleared = await counts(page);
    expect(cleared.filtered, '"Clear all" must restore every shape').toBe(cleared.total);

    // ── Ordering by a numeric column is numeric, not lexicographic.
    const areaIdx = await columnIndex(page, 'Eff. Area');
    const areaHeader = page.locator(`[data-cy$="${LABEL}"] table thead th`).nth(areaIdx);
    await areaHeader.locator('.dt-column-title').click();
    await pause(page, 200, 'DataTables redraw after ordering');
    const asc = (await columnCells(page, 'Eff. Area')).map(Number);
    expect(asc.length).toBeGreaterThan(2);
    for (let i = 1; i < asc.length; i++) {
      expect(asc[i], `ascending order broke at row ${i}: ${asc.join(', ')}`).toBeGreaterThanOrEqual(asc[i - 1]);
    }
    await areaHeader.locator('.dt-column-title').click();
    await pause(page, 200, 'DataTables redraw after ordering');
    const desc = (await columnCells(page, 'Eff. Area')).map(Number);
    for (let i = 1; i < desc.length; i++) {
      expect(desc[i], `descending order broke at row ${i}: ${desc.join(', ')}`).toBeLessThanOrEqual(desc[i - 1]);
    }
    // The largest core in the database is far bigger than 100 mm²: a
    // string sort would have put a "9x.x" value first instead.
    expect(desc[0]).toBeGreaterThan(100);

    // ── The new columns are present and populated.
    for (const title of ['Width', 'Height', 'Depth', 'Window Area', 'Area Product']) {
      const cells = await columnCells(page, title);
      expect(cells.length).toBeGreaterThan(0);
      for (const cell of cells) {
        expect(Number(cell), `"${title}" cell "${cell}" must be a positive number`).toBeGreaterThan(0);
      }
    }

    // ── Clicking a row applies that shape and closes the dialog.
    await page.locator(`[data-cy$="${LABEL}-filter-name"]`).click();
    await nameInput.fill('PQ 20/16');
    await page.keyboard.press('Escape');
    const firstRow = page.locator(`[data-cy$="${LABEL}"] table tbody tr`).first();
    const pickedName = (await firstRow.locator('td').first().innerText()).trim();
    expect(pickedName).toContain('PQ 20/16');
    await firstRow.click();
    await expect(page.locator(`[data-cy$="${LABEL}"] table`)).toBeHidden({ timeout: 10000 });
    await page.waitForFunction((name) => {
      const app = document.querySelector('#app').__vue_app__;
      const mas = app.config.globalProperties.$pinia._s.get('mas');
      const shape = mas.mas.magnetic.core?.functionalDescription?.shape;
      return (typeof shape === 'string' ? shape : shape?.name) === name;
    }, pickedName, { timeout: 15000 });

    // ── Nothing left behind: no stray popovers once the dialog is closed.
    await pause(page, 300, 'dialog leave transition + table unmount');
    expect(await page.locator('.column-filter-popover').count(), 'popovers must be removed with the table').toBe(0);

    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });
});
