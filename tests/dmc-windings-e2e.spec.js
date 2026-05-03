import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

async function openDmcWizard(page) {
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[err] ${msg.text()}`);
  });
  page.on('pageerror', err => console.log(`[pageerror] ${err.message}`));

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

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

  await page.waitForSelector('[data-cy="DmcWizard-title"]', { timeout: 30000 });
  await page.waitForTimeout(500);
}

// Click a configuration radio by its visible label.
async function selectConfiguration(page, labelMatch) {
  const labelLocator = page.locator('label, .form-check-label, span').filter({ hasText: labelMatch }).first();
  if (await labelLocator.isVisible().catch(() => false)) {
    await labelLocator.click();
  } else {
    // Fallback: click on the radio input itself
    const radios = await page.locator('input[type="radio"]').all();
    for (const r of radios) {
      const lbl = await r.evaluate(el => {
        const id = el.id;
        const byFor = id && document.querySelector(`label[for="${id}"]`)?.textContent || '';
        const sibling = el.closest('label')?.textContent || '';
        const parentText = el.parentElement?.textContent || '';
        return (byFor + ' ' + sibling + ' ' + parentText).trim();
      });
      if (labelMatch.test(lbl)) {
        await r.check({ force: true });
        break;
      }
    }
  }
  await page.waitForTimeout(300);
}

async function clickDesignMagnetic(page) {
  const btn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
  await btn.waitFor({ timeout: 5000 });
  await btn.click();
  await page.waitForURL('**/magnetic_tool**', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function readFunctionalDescription(page) {
  return await page.evaluate(() => {
    const app = document.querySelector('#app').__vue_app__;
    // Pinia stores are registered on app._context.config.globalProperties.$pinia._s
    // (private Map). Look up by store id ('mas').
    const pinia =
      app._context?.config?.globalProperties?.$pinia ||
      app.config?.globalProperties?.$pinia;
    if (!pinia || !pinia._s) return { error: 'no pinia', appKeys: Object.keys(app || {}) };
    const masStore = pinia._s.get('mas');
    if (!masStore) {
      return { error: 'no mas store', storeIds: Array.from(pinia._s.keys()) };
    }
    const mas = masStore.mas;
    if (!mas) return { error: 'no mas' };
    const fd = mas.magnetic?.coil?.functionalDescription || [];
    return {
      topology: mas.inputs?.designRequirements?.topology,
      isolationSides: mas.inputs?.designRequirements?.isolationSides,
      numWindings: fd.length,
      windings: fd.map(w => ({
        name: w.name,
        isolationSide: w.isolationSide,
        numberTurns: w.numberTurns,
        hasWire: !!w.wire,
      })),
      numOperatingPoints: mas.inputs?.operatingPoints?.length || 0,
      excitationsCountPerOp: (mas.inputs?.operatingPoints || []).map(op => op.excitationsPerWinding?.length || 0),
    };
  });
}

test('DMC-windings - single line (asymmetric) produces 1 winding', async ({ page }) => {
  test.setTimeout(180000);
  await openDmcWizard(page);
  // Default is now balanced (2 windings); explicitly pick the asymmetric option.
  await selectConfiguration(page, /Single line.*asymmetric/i);
  await clickDesignMagnetic(page);
  const fd = await readFunctionalDescription(page);
  console.log('[single line]', JSON.stringify(fd, null, 2));
  expect(fd.topology).toBe('DifferentialModeChoke');
  expect(fd.numWindings).toBe(1);
  expect(fd.windings[0].isolationSide).toBe('primary');
  expect(fd.numOperatingPoints).toBeGreaterThan(0);
  expect(fd.excitationsCountPerOp[0]).toBe(1);
});

test('DMC-windings - default is the balanced 2-winding configuration', async ({ page }) => {
  test.setTimeout(180000);
  await openDmcWizard(page);
  // No selection — proceed with whatever the wizard chose.
  await clickDesignMagnetic(page);
  const fd = await readFunctionalDescription(page);
  console.log('[default]', JSON.stringify(fd, null, 2));
  expect(fd.topology).toBe('DifferentialModeChoke');
  expect(fd.numWindings).toBe(2);
  expect(fd.excitationsCountPerOp[0]).toBe(2);
});

test('DMC-windings - single phase balanced produces 2 windings (Line + Neutral)', async ({ page }) => {
  test.setTimeout(180000);
  await openDmcWizard(page);
  await selectConfiguration(page, /Line\s*\+\s*Neutral|balanced/i);
  await clickDesignMagnetic(page);
  const fd = await readFunctionalDescription(page);
  console.log('[balanced single phase]', JSON.stringify(fd, null, 2));
  expect(fd.topology).toBe('DifferentialModeChoke');
  expect(fd.numWindings).toBe(2);
  const sides = fd.windings.map(w => w.isolationSide);
  expect(new Set(sides).size).toBe(2);
  expect(fd.excitationsCountPerOp[0]).toBe(2);
});

test('DMC-windings - three phase produces 3 windings', async ({ page }) => {
  test.setTimeout(180000);
  await openDmcWizard(page);
  await selectConfiguration(page, /Three phase(?!.*neutral)/i);
  await clickDesignMagnetic(page);
  const fd = await readFunctionalDescription(page);
  console.log('[three phase]', JSON.stringify(fd, null, 2));
  // Snapshot the magnetic_tool view so we can see what actually renders.
  await page.screenshot({ path: 'tests/screenshots/dmc-3phase-magnetic-tool.png', fullPage: true });
  // Also count winding-related DOM elements on the page so we can detect
  // a visual "missing winding" mismatch.
  const ui = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      windingMentions: (text.match(/Winding\s*\d+|Primary|Secondary|Tertiary|Quaternary|L1|L2|L3|\bN\b/g) || []).slice(0, 30),
      // Number of distinct elements that look like a winding card/section/tab
      windingTabs: document.querySelectorAll('[class*="winding"], [data-cy*="Winding"], [data-cy*="winding"]').length,
    };
  });
  console.log('[three phase UI]', JSON.stringify(ui, null, 2));

  // Probe Design Requirements live: turnsRatios length, isolationSides length,
  // and how many DOM rows render for each.
  const probe = await page.evaluate(() => {
    const app = document.querySelector('#app').__vue_app__;
    const pinia = app._context?.config?.globalProperties?.$pinia || app.config?.globalProperties?.$pinia;
    const masStore = pinia?._s?.get('mas');
    const dr = masStore?.mas?.inputs?.designRequirements;
    return {
      numberWindings: dr?.numberWindings,
      turnsRatios: dr?.turnsRatios,
      turnsRatiosLen: dr?.turnsRatios?.length,
      isolationSides: dr?.isolationSides,
      isolationSidesLen: dr?.isolationSides?.length,
      // DOM probe (loose): how many Bootstrap dropdowns / select elements render under the IsolationSides section
      isoSideSelectors: document.querySelectorAll('[data-cy*="IsolationSides"] select, [data-cy*="IsolationSides"] .dropdown').length,
    };
  });
  console.log('[three phase probe]', JSON.stringify(probe, null, 2));

  // Drive into Design Requirements, wait for content, count visible isolation rows.
  const designReq = page.locator('button').filter({ hasText: /Design.*Req/i }).first();
  if (await designReq.isVisible().catch(() => false)) {
    await designReq.click();
    await page.waitForTimeout(3000);
    // Scroll the IsolationSides label into view so the screenshot captures
    // all of its rows (some pages use internal-overflow scrolling that
    // fullPage doesn't traverse).
    await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('span, div, label, h5, h6'));
      const target = labels.find(el => /Isolation Sides/i.test(el.textContent || ''));
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/dmc-3phase-design-req-v2.png', fullPage: true });
    const rows = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label, span, div')).map(el => el.textContent?.trim() || '');
      return {
        primary: labels.filter(t => t === 'Primary').length,
        secondary: labels.filter(t => t === 'Secondary').length,
        tertiary: labels.filter(t => t === 'Tertiary').length,
        quaternary: labels.filter(t => t === 'Quaternary').length,
      };
    });
    console.log('[design-req visible]', JSON.stringify(rows, null, 2));
  }

  // Look for the WindingSelector (radio-tab style switcher between windings)
  const windingSelectorInfo = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasL1: /\bL1\b/.test(text),
      hasL2: /\bL2\b/.test(text),
      hasL3: /\bL3\b/.test(text),
      hasN: /\bN\b/.test(text),
      hasPrimary: /Primary/i.test(text),
      hasSecondary: /Secondary/i.test(text),
      hasTertiary: /Tertiary/i.test(text),
      windingSelectorButtons: document.querySelectorAll('[class*="winding-selector"] button, [class*="WindingSelector"] button').length,
      // Most-likely tab-strip selector: ElementFromListRadio with winding names
      bsRadioInputs: document.querySelectorAll('.btn-check, .form-check-input').length,
    };
  });
  console.log('[three phase after adviser]', JSON.stringify(windingSelectorInfo, null, 2));

  expect(fd.topology).toBe('DifferentialModeChoke');
  expect(fd.numWindings).toBe(3);
  const sides = fd.windings.map(w => w.isolationSide);
  expect(new Set(sides).size).toBe(3);
  expect(fd.excitationsCountPerOp[0]).toBe(3);
});

test('DMC-windings - three phase + neutral produces 4 windings', async ({ page }) => {
  test.setTimeout(180000);
  await openDmcWizard(page);
  await selectConfiguration(page, /Three phase \+ neutral/i);
  await clickDesignMagnetic(page);
  const fd = await readFunctionalDescription(page);
  console.log('[three phase + neutral]', JSON.stringify(fd, null, 2));
  expect(fd.topology).toBe('DifferentialModeChoke');
  expect(fd.numWindings).toBe(4);
  const sides = fd.windings.map(w => w.isolationSide);
  expect(new Set(sides).size).toBe(4);
  expect(fd.excitationsCountPerOp[0]).toBe(4);
});
