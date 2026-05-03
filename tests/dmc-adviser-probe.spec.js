/**
 * Diagnostic probe: from DMC wizard → magnetic_tool → click "Get Advised
 * Magnetics" and report what actually happens in the first 60 seconds.
 * No long waits, no asserting completion — just observe and dump state.
 */
import { test } from './_coverage.js';
import { BASE_URL, isBenign } from './utils.js';

test('DMC adviser probe', async ({ page }) => {
  test.setTimeout(180000);
  const errors = [];
  const warns = [];
  page.on('console', msg => {
    const t = msg.text();
    if (msg.type() === 'error' && !isBenign(t)) errors.push(t.slice(0, 300));
    else if (msg.type() === 'warning' && /error|fail|exception/i.test(t)) warns.push(t.slice(0, 300));
  });
  page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
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
  await page.waitForSelector('[data-cy="DmcWizard-title"]', { timeout: 60000 });
  await page.waitForTimeout(500);

  // Click "Design Magnetic" → magnetic_tool
  await page.locator('button').filter({ hasText: 'Design Magnetic' }).first().click();
  await page.waitForURL('**/magnetic_tool**', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Snapshot 1: initial magnetic_tool state
  await page.screenshot({ path: 'tests/screenshots/dmc-probe-01-magnetic-tool.png', fullPage: true });

  // Read MAS state right after wizard hand-off.
  const after = await page.evaluate(() => {
    const app = document.querySelector('#app').__vue_app__;
    const pinia = app._context?.config?.globalProperties?.$pinia || app.config?.globalProperties?.$pinia;
    const masStore = pinia?._s?.get('mas');
    const stateStore = pinia?._s?.get('state');
    const mas = masStore?.mas;
    return {
      currentToolSubsection: stateStore?.currentToolSubsection,
      application: stateStore?.application,
      workflow: stateStore?.workflow,
      tool: stateStore?.tool,
      topology: mas?.inputs?.designRequirements?.topology,
      numWindings: mas?.magnetic?.coil?.functionalDescription?.length,
    };
  });
  console.log('[after-handoff]', JSON.stringify(after, null, 2));

  // Click Magnetic Adviser
  const adviserBtn = page.locator('button, a').filter({ hasText: /Magnetic Adviser/i }).first();
  await adviserBtn.waitFor({ timeout: 10000 });
  await adviserBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/screenshots/dmc-probe-02-adviser.png', fullPage: true });

  // Click Get Advised Magnetics and observe for 60s.
  const goBtn = page.locator('button').filter({ hasText: /Get Advised Magnetics/i }).first();
  await goBtn.waitFor({ timeout: 10000 });
  await goBtn.click();
  console.log('[clicked-go]', new Date().toISOString());

  // Sample state every ~15s for 60s.
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(15000);
    const sample = await page.evaluate(() => {
      const app = document.querySelector('#app').__vue_app__;
      const pinia = app._context?.config?.globalProperties?.$pinia || app.config?.globalProperties?.$pinia;
      const masStore = pinia?._s?.get('mas');
      // Look for results count, error messages, spinner presence
      const errEls = Array.from(document.querySelectorAll('.alert-danger, .text-danger, .error'))
        .map(e => e.textContent?.trim().slice(0, 200))
        .filter(Boolean);
      const txt = document.body.innerText;
      return {
        noResults: /No Results Yet/i.test(txt),
        hasSpinner: !!document.querySelector('.fa-spin, .spinner, [class*="loading"]'),
        loadEnabled: (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => /Load Selected/i.test(b.textContent || ''));
          return btn ? !btn.disabled : null;
        })(),
        errMsgs: errEls.slice(0, 3),
        outputsLen: masStore?.mas?.outputs?.length || 0,
      };
    });
    console.log(`[sample-${i}@${new Date().toISOString()}]`, JSON.stringify(sample));
    await page.screenshot({ path: `tests/screenshots/dmc-probe-03-sample-${i}.png`, fullPage: true });
    if (sample.loadEnabled || (errEls => errEls.length)(sample.errMsgs)) break;
  }

  console.log('[final-errors]', JSON.stringify(errors.slice(0, 10), null, 2));
  console.log('[final-warns]', JSON.stringify(warns.slice(0, 10), null, 2));
});

test('DMC stepwise probe (Advise Core + Advise Wire)', async ({ page }) => {
  test.setTimeout(180000);
  const errors = [];
  page.on('console', msg => {
    const t = msg.text();
    if (msg.type() === 'error' && !isBenign(t)) errors.push(t.slice(0, 300));
    else if (msg.type() === 'warning' && /MagneticAdviser|CoreAdviser|WireAdviser|error|fail|exception/i.test(t)) errors.push(`[warn] ${t.slice(0, 300)}`);
  });
  page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
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
  await page.waitForSelector('[data-cy="DmcWizard-title"]', { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.locator('button').filter({ hasText: 'Design Magnetic' }).first().click();
  await page.waitForURL('**/magnetic_tool**', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Click Magnetic Builder if not already there
  const builderNav = page.locator('button, a').filter({ hasText: /Magnetic.*Builder/i }).first();
  if (await builderNav.isVisible().catch(() => false)) {
    await builderNav.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: 'tests/screenshots/dmc-probe-B0-builder.png', fullPage: true });

  // Click "Advise" inside the Core Configuration card.
  const coreAdvise = page.locator('button').filter({ hasText: /^Advise$/ }).first();
  if (await coreAdvise.isVisible().catch(() => false)) {
    await coreAdvise.click();
    console.log('[B-clicked-advise-core]', new Date().toISOString());
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(15000);
      const s = await page.evaluate(() => {
        const app = document.querySelector('#app').__vue_app__;
        const pinia = app._context?.config?.globalProperties?.$pinia || app.config?.globalProperties?.$pinia;
        const masStore = pinia?._s?.get('mas');
        const core = masStore?.mas?.magnetic?.core?.functionalDescription;
        return {
          coreShape: core?.shape || null,
          coreMaterial: core?.material || null,
          hasSpinner: !!document.querySelector('.fa-spin, .spinner, [class*="loading"]'),
          errMsgs: Array.from(document.querySelectorAll('.alert-danger, .text-danger'))
            .map(e => e.textContent?.trim().slice(0, 200)).filter(Boolean).slice(0, 3),
        };
      });
      console.log(`[B-sample-${i}]`, JSON.stringify(s));
      await page.screenshot({ path: `tests/screenshots/dmc-probe-B${i + 1}-core.png`, fullPage: true });
      if (s.coreShape) break;
    }
  } else {
    console.log('[B] no "Advise" button found in Core Configuration');
  }
  console.log('[B-final-errors]', JSON.stringify(errors.slice(0, 10), null, 2));
});
