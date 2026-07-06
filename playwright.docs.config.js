import { defineConfig, devices } from '@playwright/test';
import { assertHeadlessEnv } from './tests/utils/env.js';

// User-guide screenshot capture (ABT #141) — separate from the test suite.
// Run: npx playwright test --config playwright.docs.config.js
// Optionally filter: -g "docshot: home"
// Headless is mandatory (see CLAUDE.md).
assertHeadlessEnv();

export default defineConfig({
  testDir: './tests/docshots',
  globalSetup: './tests/global-setup.js',
  fullyParallel: true,
  workers: 2, // WASM-heavy flows; keep memory pressure low for stable renders
  retries: 0,
  reporter: [['list']],
  use: {
    // Spread the device profile FIRST so our explicit viewport/scale below
    // win (the profile carries viewport: 1280x720, deviceScaleFactor: 1).
    ...devices['Desktop Chrome'],
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    headless: true,
    launchOptions: { headless: true, args: ['--headless=new'] },
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // crisp print-quality PNGs for the PDF
    storageState: 'tests/.auth/storage-state.json',
  },
});
