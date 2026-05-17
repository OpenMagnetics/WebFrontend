/**
 * Playwright globalSetup — runs once per test run, before any test.
 *
 * Pre-accepts the cookie-consent flag in localStorage so every test context
 * starts without the banner blocking clicks, and confirms the dev server is
 * reachable.
 *
 * Per-worker storage state:
 *   We write storage-state-${i}.json for each configured worker index (and a
 *   default storage-state.json that the single-project config can fall back
 *   to). Each worker's context loads its own file so parallel runs don't
 *   race on shared cookie state.
 *
 *   The number of files we produce is max(workers, 4) — enough headroom for
 *   the 4-project layout introduced in Phase 9 without re-running setup.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { BASE_URL, workerStorageStatePath, assertHeadlessEnv } from './utils/env.js';

const LEGACY_STORAGE = path.resolve('tests/.auth/storage-state.json');

export default async function globalSetup(config) {
  assertHeadlessEnv();

  fs.mkdirSync(path.dirname(LEGACY_STORAGE), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.evaluate(() => {
    try { localStorage.setItem('om_cookie_consent', 'accepted'); } catch { /* ignore */ }
  });

  // Write the legacy single-state file (used by current single-project config)…
  await context.storageState({ path: LEGACY_STORAGE });

  // …and one per worker, so the Phase 9 parallel projects can pick them up
  // without re-running globalSetup. Cheap (a few KB each).
  const wantWorkers = Math.max(config?.workers ?? 1, 4);
  for (let i = 0; i < wantWorkers; i++) {
    const p = workerStorageStatePath(i);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    await context.storageState({ path: p });
  }

  await browser.close();
}
