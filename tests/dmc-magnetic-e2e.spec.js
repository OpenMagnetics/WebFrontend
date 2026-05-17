/**
 * DMC Wizard → finished magnetic, two paths:
 *   A) Magnetic Adviser  — click "Get Advised Magnetics" and Load the first result
 *   B) Step-by-step      — Advise Core, then Advise Wire (per winding)
 *
 * For each, assert no JS console errors throughout, and that the resulting
 * MAS object has a populated core (shape + material) and at least one wire on
 * every winding.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL, isBenign, softVisible, softEnabled, softText, tryWaitForURL, pause, tryWaitForFunction, tryWaitForSelector, clickIfPresent } from './utils.js';

const TIMEOUT = 360000;

async function openDmcWizard(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await pause(page, 1500, 'mechanical: settle');
  await page.evaluate(() => {
    const toggles = Array.from(document.querySelectorAll('.dropdown-toggle'));
    const wt = toggles.find(el => el.textContent.includes('Wizards'));
    if (wt) {
      wt.click();
      const dd = wt.closest('.dropdown') || wt.parentElement;
      const menu = dd?.querySelector('.dropdown-menu');
      if (menu) menu.classList.add('show');
    }
    const link = document.querySelector('[data-cy="Wizard-DifferentialModeChoke-link"]');
    if (link) link.click();
  });
  await tryWaitForSelector(page,'[data-cy="DmcWizard-title"]', { timeout: 60000 });
  await pause(page, 500, 'mechanical: settle');
}

async function clickDesignMagnetic(page) {
  const btn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
  await btn.waitFor({ timeout: 10000 });
  await btn.click();
  await tryWaitForURL(page, '**/magnetic_tool**', 90000);
  await pause(page, 2000, 'mechanical: settle');
}

async function readMas(page) {
  return await page.evaluate(() => {
    const app = document.querySelector('#app').__vue_app__;
    const pinia =
      app._context?.config?.globalProperties?.$pinia ||
      app.config?.globalProperties?.$pinia;
    const masStore = pinia?._s?.get('mas');
    const mas = masStore?.mas;
    if (!mas) return { error: 'no mas' };
    const fd = mas.magnetic?.coil?.functionalDescription || [];
    const core = mas.magnetic?.core?.functionalDescription || {};
    return {
      coreShape: core.shape || (typeof core === 'string' ? core : null),
      coreMaterial: core.material || null,
      coreType: core.type || null,
      numWindings: fd.length,
      windings: fd.map(w => ({
        name: w.name,
        isolationSide: w.isolationSide,
        numberTurns: w.numberTurns,
        hasWire: !!w.wire && w.wire !== 'Dummy' && w.wire !== '',
        wireKind: typeof w.wire,
      })),
    };
  });
}

// =====================================================================
// PATH A — Magnetic Adviser (auto-design)
// =====================================================================
test('DMC → Magnetic Adviser produces a complete magnetic without console errors', async ({ page }) => {
  test.setTimeout(TIMEOUT);
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));

  await openDmcWizard(page);
  await clickDesignMagnetic(page);

  // Click "Magnetic Adviser" tool button in the left rail (or sidebar).
  const adviserNav = page.locator('button, a').filter({ hasText: /Magnetic Adviser/i }).first();
  await adviserNav.waitFor({ timeout: 10000 });
  await adviserNav.click();
  await pause(page, 1500, 'mechanical: settle');
  await page.screenshot({ path: 'tests/screenshots/dmc-magn-A1-adviser-blank.png', fullPage: true });

  // Click "Get Advised Magnetics" to run the auto-design.
  const goBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
  await goBtn.waitFor({ timeout: 10000 });
  await goBtn.click();

  // Wait for the adviser to produce a results list. Either a result card
  // appears or the "Load Selected" button enables.
  await tryWaitForFunction(page,
    () => {
      const txt = document.body.innerText;
      const loadBtn = Array.from(document.querySelectorAll('button')).find(
        b => /Load Selected/i.test(b.textContent || ''),
      );
      const hasResults = !/No Results Yet/i.test(txt);
      const enabled = loadBtn && !loadBtn.disabled;
      return hasResults && enabled;
    },
    { timeout: 240000 },
  );
  await page.screenshot({ path: 'tests/screenshots/dmc-magn-A2-adviser-results.png', fullPage: true });

  // Click "Load Selected" to apply the first design.
  const loadBtn = page.locator('button').filter({ hasText: /Load Selected/i }).first();
  await loadBtn.click();
  await pause(page, 3000, 'mechanical: settle');
  await page.screenshot({ path: 'tests/screenshots/dmc-magn-A3-loaded.png', fullPage: true });

  const result = await readMas(page);
  console.log('[adviser-result]', JSON.stringify(result, null, 2));
  expect(result.coreShape).toBeTruthy();
  expect(result.coreMaterial).toBeTruthy();
  expect(result.numWindings).toBeGreaterThanOrEqual(1);
  for (const w of result.windings) {
    expect(w.hasWire).toBe(true);
    expect(w.numberTurns).toBeGreaterThan(0);
  }
  if (errors.length) console.log('[errors]', errors.slice(0, 10));
  expect(errors.length).toBe(0);
});

// =====================================================================
// PATH B — Step-by-step: Advise Core, then Advise Wire per winding
// =====================================================================
test('DMC → Advise Core + Advise Wire produces a complete magnetic without console errors', async ({ page }) => {
  test.setTimeout(TIMEOUT);
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));

  await openDmcWizard(page);
  await clickDesignMagnetic(page);

  // Make sure we're on the Magnetic Builder subsection.
  const builderNav = page.locator('button, a').filter({ hasText: /Magnetic.*Builder/i }).first();
  if (await softVisible(builderNav)) {
    await builderNav.click();
    await pause(page, 1000, 'mechanical: settle');
  }
  await page.screenshot({ path: 'tests/screenshots/dmc-magn-B1-builder.png', fullPage: true });

  // Click "Advise" in the Core Configuration card.
  const adviseCoreBtn = page.locator('button').filter({ hasText: /^Advise$/i }).first();
  await adviseCoreBtn.waitFor({ timeout: 10000 });
  await adviseCoreBtn.click();
  await pause(page, 1500, 'mechanical: settle');

  // Wait for core to populate (shape + material non-empty).
  await page.waitForFunction(
    () => {
      const app = document.querySelector('#app').__vue_app__;
      const pinia = app._context?.config?.globalProperties?.$pinia || app.config?.globalProperties?.$pinia;
      const masStore = pinia?._s?.get('mas');
      const core = masStore?.mas?.magnetic?.core?.functionalDescription;
      return core && core.shape && core.shape !== '' && core.material && core.material !== '';
    },
    { timeout: 240000 },
  );
  await page.screenshot({ path: 'tests/screenshots/dmc-magn-B2-after-advise-core.png', fullPage: true });

  // For each winding, click "Advise" or the wire-side adviser button and wait
  // for that winding's wire to populate. The wire panel typically only shows
  // one winding at a time — find a winding switcher and iterate.
  const adviseWireForCurrent = async () => {
    const buttons = await page.locator('button').filter({ hasText: /Advise|Get Wire/i }).all();
    for (const b of buttons) {
      const txt = (await softText(b)) || '';
      if (/wire/i.test(txt) || /Advise All/i.test(txt) || /^Advise$/i.test(txt)) {
        if (await softVisible(b) && await softEnabled(b)) {
          await b.click();
          break;
        }
      }
    }
    await pause(page, 1500, 'mechanical: settle');
  };

  // First, try "Advise All Wires" if it exists (common helper button).
  const adviseAllBtn = page.locator('button').filter({ hasText: /Advise All Wires/i }).first();
  if (await softVisible(adviseAllBtn)) {
    await adviseAllBtn.click();
    await pause(page, 3000, 'mechanical: settle');
  } else {
    // Fall back: per-winding advise. Try clicking each winding tab/button and
    // running its advise.
    const numWindings = await page.evaluate(() => {
      const app = document.querySelector('#app').__vue_app__;
      const pinia = app._context?.config?.globalProperties?.$pinia || app.config?.globalProperties?.$pinia;
      const masStore = pinia?._s?.get('mas');
      return masStore?.mas?.magnetic?.coil?.functionalDescription?.length || 0;
    });
    for (let i = 0; i < numWindings; i++) {
      // Click the i-th winding-selector tab if it exists
      const tab = page.locator('[class*="winding"] button, [data-cy*="WindingSelector"] button').nth(i);
      if (await softVisible(tab)) {
        await clickIfPresent(tab);
        await pause(page, 800, 'mechanical: settle');
      }
      await adviseWireForCurrent();
    }
  }

  // Wait for ALL windings to have a wire populated.
  await tryWaitForFunction(page,
    () => {
      const app = document.querySelector('#app').__vue_app__;
      const pinia = app._context?.config?.globalProperties?.$pinia || app.config?.globalProperties?.$pinia;
      const masStore = pinia?._s?.get('mas');
      const fd = masStore?.mas?.magnetic?.coil?.functionalDescription || [];
      return fd.length > 0 && fd.every(w => w.wire && w.wire !== 'Dummy' && w.wire !== '');
    },
    { timeout: 240000 },
  );
  await page.screenshot({ path: 'tests/screenshots/dmc-magn-B3-after-advise-wires.png', fullPage: true });

  const result = await readMas(page);
  console.log('[stepwise-result]', JSON.stringify(result, null, 2));
  expect(result.coreShape).toBeTruthy();
  expect(result.coreMaterial).toBeTruthy();
  expect(result.numWindings).toBeGreaterThanOrEqual(1);
  for (const w of result.windings) {
    expect(w.hasWire).toBe(true);
  }
  if (errors.length) console.log('[errors]', errors.slice(0, 10));
  expect(errors.length).toBe(0);
});
