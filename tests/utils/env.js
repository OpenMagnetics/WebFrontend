/**
 * tests/utils/env.js
 *
 * Single source of truth for environment-derived test config.
 *
 * Rules (enforced by tests/lint-tests.js):
 *   • No spec file may hardcode `http://localhost:5173` etc. Import BASE_URL
 *     from here (or use page.goto('/...') with Playwright's `baseURL`).
 *   • Paths under the user's home dir (screenshots, fixtures) must come from
 *     env vars so a fresh checkout doesn't break.
 *   • Headless is non-negotiable. We refuse to even start if any of the
 *     headed-debug knobs are set (PWDEBUG, PWHEADED, HEADED=1).
 *
 * Throw loudly on bad config — never fall back silently (CLAUDE.md rule).
 */
import path from 'node:path';
import os from 'node:os';

export const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

/**
 * Directory for ad-hoc screenshots captured by tests via utils.screenshot().
 * Defaults to a path inside the OS temp dir so it works on any checkout.
 */
export const SS_DIR =
  process.env.SCREENSHOT_DIR ||
  path.join(os.tmpdir(), 'om-webfrontend-screenshots');

/** Per-worker scratch dir for downloads / generated artifacts. */
export function workerScratchDir(workerIndex) {
  return path.join(os.tmpdir(), `om-wf-worker-${workerIndex}`);
}

/** Per-worker storage-state path (cookie consent etc.). */
export function workerStorageStatePath(workerIndex) {
  return path.resolve(`tests/.auth/storage-state-${workerIndex}.json`);
}

/**
 * Guard: refuse to run if the env tries to force headed mode.
 * Called from playwright.config.js at import time.
 */
export function assertHeadlessEnv() {
  const offenders = [];
  if (process.env.PWDEBUG) offenders.push('PWDEBUG');
  if (process.env.PWHEADED) offenders.push('PWHEADED');
  if (process.env.HEADED === '1' || process.env.HEADED === 'true') offenders.push('HEADED');
  if (offenders.length) {
    throw new Error(
      `tests/utils/env.js: refusing to launch — ${offenders.join(', ')} forces headed mode. ` +
      `CLAUDE.md mandates headless. Unset and re-run.`
    );
  }
}
