/**
 * tests/utils/nav.js
 *
 * Wizard / tool navigation. These are the *primitives* — one navigation step
 * each. Compose them into end-to-end flows in tests/utils/scenarios.js.
 */
import { BASE_URL } from './env.js';
import {
  analyticalBtn,
  designMagneticBtn,
  reviewSpecsBtn,
  magneticAdviserBtn,
} from './locators.js';
import { waitForAnalyticalDone, settleAnimations } from './wait.js';

/**
 * Open any wizard by its header data-cy. Opens the Wizards top-level
 * dropdown, then the relevant submenu group, then clicks the item.
 * Waits for the Analytical button to be present (proof the wizard is ready).
 *
 * Throws on missing data-cy or missing analytical button.
 */
export async function openWizard(page, dataCy) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // The home page (/) is a non-data view: no engine_loader redirect, no $mkf
  // assignment. Give Vue's router a moment to mount and attach the nav handlers
  // before we try to click a wizard link.
  await settleAnimations(page, 500);

  const clicked = await page.evaluate((cy) => {
    const toggles = Array.from(document.querySelectorAll('.dropdown-toggle'));
    const wizardsToggle = toggles.find((el) => el.textContent.includes('Wizards'));
    if (wizardsToggle) {
      wizardsToggle.click();
      const dropdown = wizardsToggle.closest('.dropdown') || wizardsToggle.parentElement;
      const menu = dropdown?.querySelector('.dropdown-menu');
      if (menu) menu.classList.add('show');
    }
    const link = document.querySelector(`[data-cy="${cy}"]`);
    if (!link) return false;
    const groupLi = link.closest('.dropdown-submenu');
    if (groupLi) {
      const groupToggle = groupLi.querySelector('.dropdown-submenu-toggle');
      if (groupToggle) groupToggle.click();
      const panel = groupLi.querySelector('.submenu-panel');
      if (panel) panel.classList.add('submenu-open');
    }
    link.click();
    return true;
  }, dataCy);

  if (!clicked) {
    throw new Error(`openWizard: link with [data-cy="${dataCy}"] not found in nav`);
  }

  // Clicking the wizard link navigates to /wizards, but the router may redirect
  // through /engine_loader first (WASM init + data load). On a cold browser this
  // takes 30-90 s; 120 s covers the worst case without masking real failures.
  await page.waitForURL('**/wizards', { timeout: 120_000 });
  await analyticalBtn(page).waitFor({ state: 'visible', timeout: 15000 });
  await settleAnimations(page, 200);
}

/** Click Analytical and wait for it to finish. */
export async function runAnalytical(page, timeoutMs = 30000) {
  const btn = analyticalBtn(page);
  await btn.waitFor({ state: 'visible', timeout: 5000 });
  await btn.click();
  await waitForAnalyticalDone(page, timeoutMs);
}

/**
 * From a wizard, click "Design Magnetic" → land on Magnetic Tool → click
 * the Magnetic Adviser button. Returns the Page (chainable).
 *
 * Throws if "Design Magnetic" is disabled (means upstream setup is wrong —
 * we want a hard fail, not a silent skip).
 */
export async function goToMagneticAdviser(page) {
  const designBtn = designMagneticBtn(page);
  await designBtn.waitFor({ state: 'visible', timeout: 10000 });
  if (await designBtn.isDisabled()) {
    throw new Error('goToMagneticAdviser: "Design Magnetic" is disabled');
  }
  await designBtn.click();
  await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });

  const adviser = magneticAdviserBtn(page);
  if (await adviser.isVisible().catch(() => false)) {
    await adviser.click();
  } else {
    const byCy = page.locator('[data-cy$="-magnetics-adviser-button"]').first();
    if (!(await byCy.isVisible().catch(() => false))) {
      throw new Error('goToMagneticAdviser: no Magnetic Adviser entry found on tool page');
    }
    await byCy.click();
  }
  return page;
}

/**
 * From a wizard, click "Review Specs" → land on Magnetic Tool / Builder.
 * Throws if the button is missing or disabled.
 */
export async function goToMagneticBuilder(page) {
  const btn = reviewSpecsBtn(page);
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  if (await btn.isDisabled()) {
    throw new Error('goToMagneticBuilder: "Review Specs" is disabled');
  }
  await btn.click();
  await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });
  return page;
}
