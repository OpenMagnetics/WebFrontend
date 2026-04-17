/**
 * Shared utilities for all wizard Playwright tests.
 */
import path from 'path';

export const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
export const SS_DIR = process.env.SCREENSHOT_DIR || '/home/alf/OpenMagnetics/MKF/build';

// ── Error filtering ────────────────────────────────────────────────────────

export const BENIGN_PATTERNS = [
  /ECharts.*dispose/i,
  /ResizeObserver loop/i,
  /favicon/i,
  /vite.*client/i,
  /Failed to fetch|net::ERR_CONNECTION_REFUSED|localhost:888|localhost:800/i,
  /ERR_EMPTY_RESPONSE|ERR_CONNECTION_RESET|Network Error|AxiosError/i,
  /Request failed with status code/i,
  /ECONNREFUSED/i,
  /multi-output configuration detected/i,
];
export function isBenign(text) { return BENIGN_PATTERNS.some(p => p.test(text)); }

// ── Screenshot helper ──────────────────────────────────────────────────────

export async function screenshot(page, prefix, name) {
  const filePath = path.join(SS_DIR, `${prefix}-${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false, timeout: 10000 }).catch(() => {});
  console.log(`[ss] ${filePath}`);
  return filePath;
}

// ── Navigation ─────────────────────────────────────────────────────────────

/**
 * Navigate to the DAB Wizard by clicking the Wizards header dropdown.
 * Waits until the Analytical button is visible so callers can act immediately.
 */
export async function openDabWizard(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1000);

  const clicked = await page.evaluate(() => {
    const toggles = Array.from(document.querySelectorAll('.dropdown-toggle'));
    const wizardsToggle = toggles.find(el => el.textContent.includes('Wizards'));
    if (wizardsToggle) {
      wizardsToggle.click();
      const dropdown = wizardsToggle.closest('.dropdown') || wizardsToggle.parentElement;
      const menu = dropdown?.querySelector('.dropdown-menu');
      if (menu) menu.classList.add('show');
    }
    const dabLink = document.querySelector('[data-cy="Dab-link"]');
    if (dabLink) { dabLink.click(); return true; }
    return false;
  });

  console.log(`[openDabWizard] click result: ${clicked}`);
  await page.waitForURL('**/wizards', { timeout: 15000 }).catch(() => {});
  await page.waitForSelector('.sim-btn.analytical', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(300);
  console.log('[openDabWizard] DAB wizard ready');
}

// ── Analytical simulation helpers ──────────────────────────────────────────

/**
 * Wait for the analytical spinner to stop (actual completion signal).
 * Prefers waitForFunction over a hardcoded sleep.
 */
export async function waitForAnalytical(page, timeoutMs = 30000) {
  await page.waitForFunction(
    () => !document.querySelector('.sim-btn.analytical .fa-spinner'),
    { timeout: timeoutMs }
  ).catch(() => {});
  await page.waitForTimeout(500);
}

/** Click Analytical and wait for it to finish. */
export async function runAnalytical(page, timeoutMs = 30000) {
  const btn = page.locator('.sim-btn.analytical');
  await btn.waitFor({ timeout: 5000 });
  await btn.click();
  await waitForAnalytical(page, timeoutMs);
}

// ── Card locator factories ─────────────────────────────────────────────────

export const conditionsCard   = page => page.locator('.compact-card').filter({ hasText: 'Conditions' }).first();
export const transformerCard  = page => page.locator('.compact-card').filter({ hasText: 'Transformer' }).first();
export const diagnosticsCard  = page => page.locator('.compact-card').filter({ hasText: 'Diagnostics' }).first();
export const outputsCard      = page => page.locator('.compact-card').filter({ hasText: 'Outputs' }).first();
export const inputVoltageCard = page => page.locator('.compact-card').filter({ hasText: 'Input Voltage' }).first();

// ── Form helpers ───────────────────────────────────────────────────────────

/**
 * Find the modulation mode <select> inside the Conditions card.
 * Returns null if not found.
 */
export async function findModeSelect(page) {
  const card = conditionsCard(page);
  const selects = await card.locator('select').all();
  for (const sel of selects) {
    const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.value));
    if (opts.some(o => ['SPS', 'EPS', 'DPS', 'TPS'].includes(o))) return sel;
  }
  return null;
}

/**
 * Fill a labelled number input inside a card by matching its label text.
 * Uses triple-click (clickCount:3) to select existing value before filling.
 */
export async function fillRowInput(card, labelText, value) {
  const row = card.locator(`text=${labelText}`).locator('../..');
  const input = row.locator('input[type="number"]').first();
  if (await input.isVisible().catch(() => false)) {
    await input.click({ clickCount: 3 });
    await input.fill(String(value));
    await input.press('Tab');
  }
}

/**
 * Switch to "I know the design I want" mode.
 * After clicking, verifies the Transformer card becomes visible.
 */
export async function switchToIKnowMode(page) {
  const label = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
  if (await label.isVisible().catch(() => false)) {
    await label.click();
  } else {
    await page.locator('text=I know the design I want').first().click().catch(() => {});
  }
  await page.waitForTimeout(300);
  const switched = await transformerCard(page).isVisible().catch(() => false);
  if (!switched) {
    console.warn('[switchToIKnowMode] Transformer card not visible after mode switch');
  }
}

// ── Generic wizard opener ──────────────────────────────────────────────────

/**
 * Open any wizard by its header data-cy link attribute.
 * Waits for the Analytical button (or falls back to waiting for /wizards URL).
 */
export async function openWizard(page, dataCy) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1000);

  const clicked = await page.evaluate((cy) => {
    const toggles = Array.from(document.querySelectorAll('.dropdown-toggle'));
    const wizardsToggle = toggles.find(el => el.textContent.includes('Wizards'));
    if (wizardsToggle) {
      wizardsToggle.click();
      const dropdown = wizardsToggle.closest('.dropdown') || wizardsToggle.parentElement;
      const menu = dropdown?.querySelector('.dropdown-menu');
      if (menu) menu.classList.add('show');
    }
    const link = document.querySelector(`[data-cy="${cy}"]`);
    if (link) { link.click(); return true; }
    return false;
  }, dataCy);

  console.log(`[openWizard:${dataCy}] click result: ${clicked}`);
  await page.waitForURL('**/wizards', { timeout: 15000 }).catch(() => {});
  await page.waitForSelector('.sim-btn.analytical', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(300);
  console.log(`[openWizard:${dataCy}] wizard ready`);
}

// ── Generic Magnetic Adviser navigation ───────────────────────────────────

/**
 * Navigate from a wizard to the Magnetic Adviser tool.
 * openFn: () => Promise<void>  – opens the wizard
 * setupFn: (page) => Promise<void> | null  – optional extra setup before analytical
 * Returns true on success, false on failure.
 */
export async function goToMagneticAdviser(page, openFn, setupFn = null) {
  await openFn();
  if (setupFn) await setupFn(page);

  await runAnalytical(page);

  const designBtn = page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
  await designBtn.waitFor({ timeout: 10000 }).catch(() => {});
  if (await designBtn.isDisabled().catch(() => true)) {
    console.log('[goToMagneticAdviser] Design Magnetic disabled — skipping');
    return false;
  }

  await designBtn.click();
  await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  if (!page.url().includes('magnetic_tool')) return false;

  const magneticAdviserBtn = page.locator('button').filter({ hasText: /^Magnetic Adviser$/ }).first();
  if (await magneticAdviserBtn.isVisible().catch(() => false)) {
    await magneticAdviserBtn.click();
    await page.waitForTimeout(1500);
  } else {
    const byCy = page.locator('[data-cy$="-magnetics-adviser-button"]').first();
    if (await byCy.isVisible().catch(() => false)) {
      await byCy.click();
      await page.waitForTimeout(1500);
    }
  }
  return true;
}

// ── Generic Magnetic Builder navigation ───────────────────────────────────

/**
 * Navigate from a wizard to the Magnetic Builder via Review Specs.
 * Returns true on success, false on failure.
 */
export async function goToMagneticBuilder(page, openFn, setupFn = null) {
  await openFn();
  if (setupFn) await setupFn(page);

  await runAnalytical(page);

  const reviewBtn = page.locator('button').filter({ hasText: 'Review Specs' }).first();
  if (!(await reviewBtn.isVisible().catch(() => false))) return false;
  if (await reviewBtn.isDisabled().catch(() => true)) return false;

  await reviewBtn.click();
  await page.waitForURL('**/magnetic_tool**', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  return page.url().includes('magnetic_tool');
}
