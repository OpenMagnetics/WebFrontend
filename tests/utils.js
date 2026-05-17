/**
 * tests/utils.js  (LEGACY SHIM)
 *
 * Backwards-compat re-exports from the new tests/utils/ package. All new code
 * should import from './utils/index.js' (or a specific submodule) directly.
 *
 * This file will be deleted at the end of Phase 4 once every spec has been
 * migrated. Do NOT add new helpers here — add them under tests/utils/.
 */
import path from 'node:path';
import fs from 'node:fs';

// New canonical exports (everything below comes from utils/).
export {
  BASE_URL,
  SS_DIR,
} from './utils/env.js';
export {
  KNOWN_NOISE as BENIGN_PATTERNS,
  isKnownNoise as isBenign,
} from './utils/console.js';
export {
  waitForAnalyticalDone as waitForAnalytical,
  waitForCoreAdviserDone,
  softVisible,
  softChecked,
  softDisabled,
  softEnabled,
  softWaitFor,
  softAttr,
  softText,
  clickIfPresent,
  tryWaitForURL,
  tryWaitForSelector,
  tryWaitForFunction,
  tryGoBack,
  pause,
  settleAnimations,
} from './utils/wait.js';
export {
  conditionsCard,
  transformerCard,
  diagnosticsCard,
  outputsCard,
  inputVoltageCard,
} from './utils/locators.js';
export {
  findModeSelect,
  fillRowInput,
  fillOutput,
  switchToIKnowMode,
} from './utils/forms.js';
export {
  openWizard,
  runAnalytical,
} from './utils/nav.js';

import { goToMagneticAdviser as _goToMagneticAdviser, goToMagneticBuilder as _goToMagneticBuilder, runAnalytical as _runAnalytical } from './utils/nav.js';

/**
 * LEGACY signature: goToMagneticAdviser(page, openFn, setupFn?).
 * The new utils/nav.js helper assumes the wizard is already open and takes
 * only `page`. This wrapper preserves the old call shape for migration.
 * Returns true on success; throws on hard navigation failures (was: returned
 * false on missing buttons — but the new helper throws, which is preferred).
 */
export async function goToMagneticAdviser(page, openFn, setupFn = null) {
  await openFn();
  if (setupFn) await setupFn(page);
  await _runAnalytical(page);
  await _goToMagneticAdviser(page);
  return page.url().includes('magnetic_tool');
}

/** LEGACY signature: goToMagneticBuilder(page, openFn, setupFn?). */
export async function goToMagneticBuilder(page, openFn, setupFn = null) {
  await openFn();
  if (setupFn) await setupFn(page);
  await _runAnalytical(page);
  await _goToMagneticBuilder(page);
  return page.url().includes('magnetic_tool');
}

import { SS_DIR } from './utils/env.js';
import { openWizard } from './utils/nav.js';
import { waitForCoreAdviserDone } from './utils/wait.js';
import { coreAdviseBtn } from './utils/locators.js';
import { settleAnimations } from './utils/wait.js';

/**
 * Legacy screenshot helper. New code should use page.screenshot() directly
 * with a per-worker path from utils/env.js#workerScratchDir().
 */
export async function screenshot(page, prefix, name) {
  fs.mkdirSync(SS_DIR, { recursive: true });
  const filePath = path.join(SS_DIR, `${prefix}-${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false, timeout: 10000 });
  return filePath;
}

/** Legacy DAB-specific opener. Thin wrapper over openWizard('Dab-link'). */
export async function openDabWizard(page) {
  await openWizard(page, 'Dab-link');
}

/**
 * Legacy Core Adviser runner. Click the Magnetic Builder tab, click Advise,
 * wait for the WASM run to re-enable the button.
 *
 * Throws on missing UI rather than silently returning.
 */
export async function runCoreAdviser(page) {
  if (!page.url().includes('magnetic_tool')) {
    throw new Error(`runCoreAdviser: expected /magnetic_tool, got ${page.url()}`);
  }
  const builderTab = page.locator('button, a, [role="tab"], .nav-link')
    .filter({ hasText: /Magnetic.\s*Builder/i }).first();
  if (await builderTab.isVisible().catch(() => false)) {
    await builderTab.click();
    await settleAnimations(page, 300);
  }
  const adviseBtn = coreAdviseBtn(page);
  await adviseBtn.waitFor({ state: 'visible', timeout: 15000 });
  await adviseBtn.click();
  await waitForCoreAdviserDone(page);
}
