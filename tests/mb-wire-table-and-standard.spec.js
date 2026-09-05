/**
 * ABT #1110 — the wire standard follows the profile unit system and the wire
 * table replaces the standard field.
 *
 * - Under SI the wire adviser offers IEC 60317 wires (mm sizes); under imperial
 *   NEMA MW 1000 C (AWG). The engine's preferred standard is pushed before each
 *   advise, so the same design advised twice lands on the two standards.
 * - The "Standard" dropdown is gone from the wire panel.
 * - The "Wires" button opens a table of every catalogue wire; picking a row
 *   puts that wire on the winding.
 */
import { test, expect } from './_coverage.js';
import { isBenign, pause } from './utils.js';
import { goToBuilderStep, adviseCoreAndWait, adviseWireAndWait } from './utils/builder-helpers.js';

async function setPreference(page, key, value) {
  await page.evaluate(([k, v]) => {
    const app = document.querySelector('#app').__vue_app__;
    app.config.globalProperties.$pinia._s.get('settings').userPreferences[k] = v;
  }, [key, value]);
}

async function wireState(page) {
  return page.evaluate(() => {
    const app = document.querySelector('#app').__vue_app__;
    const wire = app.config.globalProperties.$pinia._s.get('mas').mas.magnetic.coil.functionalDescription[0].wire;
    if (typeof wire === 'string') return { name: wire, type: null, standard: null };
    const strand = wire.strand;
    return {
      name: wire.name,
      type: wire.type,
      standard: wire.standard ?? (strand && typeof strand === 'object' ? strand.standard : null),
      standardName: wire.standardName ?? (strand && typeof strand === 'object' ? strand.standardName : null),
    };
  });
}

test.describe('Wire standard follows the unit system; wire table (ABT #1110)', () => {
  test.describe.configure({ timeout: 300000 });

  test('advised wire is IEC 60317 under SI and NEMA MW 1000 C under imperial; no standard field', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });
    page.on('pageerror', e => errors.push(`pageerror: ${e}`));

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);

    await expect(page.locator('[data-cy$="-WireStandard"]'), 'the standard dropdown is gone').toHaveCount(0);

    await adviseWireAndWait(page);
    const si = await wireState(page);
    expect(si.standard, `SI advises an IEC 60317 wire (got ${si.name} / ${si.standard})`).toBe('IEC 60317');

    await setPreference(page, 'unitSystem', 'imperial');
    await pause(page, 800, 'unit watchers');
    await adviseWireAndWait(page);
    const imperial = await wireState(page);
    expect(imperial.standard, `imperial advises a NEMA MW 1000 C wire (got ${imperial.name} / ${imperial.standard})`).toBe('NEMA MW 1000 C');

    // The size list follows the standard: an AWG size is offered under imperial.
    const sizeSelect = page.locator('[data-cy$="-WireConductingDiameter-select"], [data-cy$="-StrandConductingDiameter-select"]').first();
    await expect(sizeSelect).toBeVisible();
    await sizeSelect.click();
    const options = (await page.locator('.p-select-overlay').last().locator('[role="option"]').allInnerTexts()).map(t => t.trim());
    await page.keyboard.press('Escape');
    expect(options.some(o => /AWG/.test(o)), `AWG sizes are listed (got ${options.slice(0, 5).join(', ')}…)`).toBe(true);

    await setPreference(page, 'unitSystem', 'si');
    await pause(page, 800, 'unit watchers');

    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('the Wires table lists the catalogue and a row replaces the winding wire', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text()); });
    page.on('pageerror', e => errors.push(`pageerror: ${e}`));

    await goToBuilderStep(page);
    await adviseCoreAndWait(page);
    await adviseWireAndWait(page);
    const before = await wireState(page);

    await page.locator('[data-cy$="Wire-WireTable-button"]').first().click();
    const table = page.locator('[data-cy$="Wire-WireTable"] table');
    await expect(table.locator('tbody tr').first()).toBeVisible({ timeout: 30000 });
    const headers = (await table.locator('thead th').allInnerTexts()).map(h => h.trim().toUpperCase());
    for (const title of ['NAME', 'TYPE', 'STANDARD', 'SIZE', 'COND. Ø (MM)', 'STRANDS', 'COATING']) {
      expect(headers.some(h => h.startsWith(title)), `column ${title} (headers: ${headers.join(' | ')})`).toBe(true);
    }
    const summary = (await page.locator('[data-cy$="Wire-WireTable-filter-count"]').innerText()).trim();
    const total = Number(summary.match(/(\d+) wires/)?.[1]);
    expect(total, `thousands of catalogue wires (summary: ${summary})`).toBeGreaterThan(1000);

    // Pick a round wire that is not the current one.
    await page.locator('[data-cy$="Wire-WireTable-filter-typeLabel"]').click();
    const typeSelect = page.locator('[data-cy$="Wire-WireTable-filter-typeLabel-select"]');
    await expect(typeSelect).toBeVisible();
    await typeSelect.selectOption({ label: 'Round' });
    await page.keyboard.press('Escape');
    const rows = table.locator('tbody tr');
    const nameIdx = headers.findIndex(h => h.startsWith('NAME'));
    let picked = null;
    for (let i = 0; i < Math.min(await rows.count(), 5); i++) {
      const name = (await rows.nth(i).locator('td').nth(nameIdx).innerText()).trim();
      if (name !== before.name) { picked = name; await rows.nth(i).click(); break; }
    }
    expect(picked, 'a different round wire was picked').toBeTruthy();
    await expect(table).toBeHidden({ timeout: 10000 });
    await pause(page, 3000, 'wire assignment + rewind');
    const after = await wireState(page);
    expect(after.name, 'the picked wire is on the winding').toBe(picked);
    expect(after.type).toBe('round');

    expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });
});
