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
  /ERR_SOCKET_NOT_CONNECTED|ERR_NAME_NOT_RESOLVED|ERR_ABORTED/i,
  /Request failed with status code/i,
  /ECONNREFUSED/i,
  /multi-output configuration detected/i,
  /Failed to load resource/i,
  // DEBUG prints from WASM modules that (incorrectly) use console.error
  /DEBUG \[[a-z_]+\]:/i,
  /\[DEBUG [a-z_]+\]/i,
  // WASM adviser diagnostic logs emitted to stderr → console.error
  /Impedance filter:/i,
  /Saturation filter:/i,
  /Temperature filter:/i,
  /Loss filter:/i,
  /Winding filter:/i,
  /Fit filter:/i,
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
 * Navigate to the DAB Wizard by clicking the Wizards header dropdown and
 * the Isolated Bridge / Push-Pull submenu. Thin wrapper around openWizard
 * kept for callers that still reference it by name.
 */
export async function openDabWizard(page) {
  await openWizard(page, 'Dab-link');
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
  // Throw loudly when the label is missing — silent skips hide stale tests
  // (a renamed label means the test stops exercising what its name advertises).
  // Check count first to avoid Playwright's 30s auto-wait on a non-existent locator.
  const labelLoc = card.locator(`text=${labelText}`);
  const labelCount = await labelLoc.count();
  if (labelCount === 0) {
    throw new Error(`fillRowInput: label "${labelText}" not found in card`);
  }
  const row = labelLoc.first().locator('../..');
  const input = row.locator('input[type="number"]').first();
  if (!(await input.isVisible().catch(() => false))) {
    throw new Error(`fillRowInput: number input under label "${labelText}" is not visible`);
  }
  await input.click({ clickCount: 3 });
  await input.fill(String(value));
  await input.press('Tab');
}

/**
 * Fill one field of a specific output row in the Outputs card.
 * Number inputs are laid out row-by-row inside PairOfDimensions / TripleOfDimensions:
 *   - "I know" mode → Triple → 3 inputs/row [voltage, current, turnsRatio]
 *   - "Help me" mode → Pair → 2 inputs/row [voltage, current]
 * Cols are detected from the total number of inputs and the visible row count.
 */
export async function fillOutput(oCard, rowIndex, field, value) {
  const fieldOrder = ['voltage', 'current', 'turnsRatio'];
  const fieldIdx = fieldOrder.indexOf(field);
  if (fieldIdx < 0) {
    throw new Error(`fillOutput: unknown field "${field}" (expected voltage|current|turnsRatio)`);
  }
  const inputs = oCard.locator('input[type="number"]');
  const total = await inputs.count();
  if (total === 0) throw new Error('fillOutput: no number inputs in outputs card');
  // Detect cols by checking for a turnsRatio data-cy (Triple mode → 3 cols, Pair → 2).
  const hasTurns = (await oCard.locator('input[data-cy*="turnsRatio"]').count()) > 0;
  const cols = hasTurns ? 3 : 2;
  if (field === 'turnsRatio' && !hasTurns) {
    throw new Error(`fillOutput: turnsRatio requested but outputs card is in 2-col mode (not "I know" mode?)`);
  }
  const absIdx = rowIndex * cols + fieldIdx;
  if (absIdx >= total) {
    throw new Error(`fillOutput: row ${rowIndex} field "${field}" → input ${absIdx} out of range (${total} inputs, ${cols} cols)`);
  }
  const input = inputs.nth(absIdx);
  if (!(await input.isVisible().catch(() => false))) {
    throw new Error(`fillOutput: input #${absIdx} (row ${rowIndex} ${field}) is not visible`);
  }
  await input.click({ clickCount: 3 });
  await input.fill(String(value));
  await input.press('Tab');
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
 *
 * The Wizards menu is now organised into 5 fly-out submenus
 * (Filters / PFC, Non-Isolated DC-DC, Isolated Single-Switch,
 * Isolated Bridge / Push-Pull, Resonant). Each item lives inside a
 * `.submenu-panel` that is hidden by default; we find the item's
 * parent `.dropdown-submenu` toggle and click it to open the panel
 * before clicking the item, so the navigation matches what a real
 * user would do.
 *
 * Waits for the Analytical button (or falls back to waiting for /wizards URL).
 */
export async function openWizard(page, dataCy) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1000);

  const clicked = await page.evaluate((cy) => {
    // 1. Open the Wizards top-level dropdown.
    const toggles = Array.from(document.querySelectorAll('.dropdown-toggle'));
    const wizardsToggle = toggles.find(el => el.textContent.includes('Wizards'));
    if (wizardsToggle) {
      wizardsToggle.click();
      const dropdown = wizardsToggle.closest('.dropdown') || wizardsToggle.parentElement;
      const menu = dropdown?.querySelector('.dropdown-menu');
      if (menu) menu.classList.add('show');
    }

    // 2. Locate the target item and open its parent submenu group.
    const link = document.querySelector(`[data-cy="${cy}"]`);
    if (!link) return false;
    const groupLi = link.closest('.dropdown-submenu');
    if (groupLi) {
      const groupToggle = groupLi.querySelector('.dropdown-submenu-toggle');
      if (groupToggle) groupToggle.click();
      const panel = groupLi.querySelector('.submenu-panel');
      if (panel) panel.classList.add('submenu-open');
    }

    // 3. Click the item.
    link.click();
    return true;
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

// ── Core Adviser flow ─────────────────────────────────────────────────────

/**
 * From the Magnetic Builder tool page (after goToMagneticBuilder), open the
 * Magnetic Builder tab and click the Core "Advise" button. The button is the
 * Core Adviser entry point in the three-column layout (left column = Core
 * configuration). Waits for the in-flight advise to finish (button becomes
 * re-enabled). Throws on missing UI rather than silently returning.
 */
export async function runCoreAdviser(page) {
  if (!page.url().includes('magnetic_tool')) {
    throw new Error(`runCoreAdviser: expected to be on /magnetic_tool, got ${page.url()}`);
  }

  // The "Magnetic. Builder" tab text uses non-breaking spaces — match loosely.
  const builderTab = page.locator('button, a, [role="tab"], .nav-link')
    .filter({ hasText: /Magnetic.\s*Builder/i }).first();
  if (await builderTab.isVisible().catch(() => false)) {
    await builderTab.click();
    await page.waitForTimeout(500);
  }

  const adviseBtn = page.locator('[data-cy$="-Core-Advise-button"]').first();
  await adviseBtn.waitFor({ state: 'visible', timeout: 15000 });
  await adviseBtn.click();

  // The button becomes disabled while the WASM core adviser runs, then re-enables.
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('[data-cy$="-Core-Advise-button"]');
      return btn && !btn.disabled;
    },
    { timeout: 120000 }
  );
}
