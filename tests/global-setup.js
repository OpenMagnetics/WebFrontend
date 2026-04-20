/**
 * Playwright globalSetup — runs once per test run, before any test.
 *
 * Produces a storageState file with the cookie-consent flag pre-accepted so
 * every subsequent test context starts without the consent banner blocking
 * clicks. Also primes the MKF WASM by navigating once to /magnetic_tool and
 * waiting past the engine_loader screen — this doesn't persist WASM state
 * (each new browser context re-instantiates the wasm in a new worker), but
 * it does confirm early that the dev server is reachable.
 *
 * Wired in playwright.config.js via globalSetup + use.storageState.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const STORAGE_PATH = path.resolve('tests/.auth/storage-state.json');

export default async function globalSetup() {
  fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.evaluate(() => {
    try { localStorage.setItem('om_cookie_consent', 'accepted'); } catch { /* ignore */ }
  });

  await context.storageState({ path: STORAGE_PATH });
  await browser.close();
}
