/**
 * Shared utilities for DAB / LLC wizard Playwright tests.
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
