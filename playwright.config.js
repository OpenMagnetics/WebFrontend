import { defineConfig, devices } from '@playwright/test';
import { assertHeadlessEnv } from './tests/utils/env.js';

// Fail fast if PWDEBUG / HEADED / PWHEADED are set. Headless is mandatory
// (see CLAUDE.md). Defense in depth alongside the launchOptions below.
assertHeadlessEnv();

const COVERAGE_ON = process.env.COVERAGE === '1';

const reporters = [['list']];
if (COVERAGE_ON) {
  reporters.push([
    'monocart-reporter',
    {
      name: 'OpenMagnetics WebFrontend',
      outputFile: './test-results/coverage/report.html',
      coverage: {
        name: 'Frontend Coverage',
        outputDir: './test-results/coverage',
        entryFilter: () => true,
        sourceFilter: (sourcePath) => /\/src\//.test(sourcePath) && !/node_modules/.test(sourcePath),
        reports: [
          ['v8'],
          ['console-summary'],
        ],
      },
    },
  ]);
}

/**
 * Shared launchOptions / use block. Triple-headless: `use.headless` AND
 * `launchOptions.headless` AND `--headless=new`. Any one suffices; all three
 * together guard against accidental overrides in projects[] / env.
 */
const common = {
  baseURL: process.env.BASE_URL || 'http://localhost:5173',
  trace: 'on-first-retry',
  headless: true,
  launchOptions: { headless: true, args: ['--headless=new'] },
  viewport: { width: 1920, height: 1080 },
  storageState: 'tests/.auth/storage-state.json',
  ...devices['Desktop Chrome'],
};

/**
 * Project layout (Phase 9):
 *   site            cheap layout / smoke / home / settings — small, parallel-safe
 *   wizards-light   non-WASM wizard tests (analytical only, no Adviser nav)
 *   scenarios       end-to-end via tests/scenarios + tests/wizards battery template
 *   heavy           long WASM runs (DAB high-power, CMC sweeps, batteries that hit Core Adviser)
 *
 * Selection via Playwright's tag grep:
 *   site            grepInvert: @scenario|@heavy
 *   wizards-light   grep: @smoke (and grepInvert @scenario|@heavy)
 *   scenarios       grep: @scenario, grepInvert: @heavy
 *   heavy           grep: @heavy
 *
 * Per-project worker counts target a 16-core dev machine; CI overrides via
 * --workers=N.
 */
const projects = [
  {
    name: 'site',
    testDir: './tests',
    testMatch: ['home.spec.js', 'settings-and-modes.spec.js', 'ui-regressions.spec.js', 'new-wizards-smoke.spec.js'],
    use: common,
  },
  {
    name: 'wizards-light',
    testDir: './tests',
    testIgnore: ['scenarios/**', 'wizards/**', '_scratch/**'],
    grepInvert: /@scenario|@heavy/,
    use: common,
  },
  {
    name: 'scenarios',
    testDir: './tests',
    testMatch: ['scenarios/**/*.spec.js', 'wizards/**/*.spec.js'],
    testIgnore: ['_scratch/**'],
    grepInvert: /@heavy/,
    use: common,
  },
  {
    name: 'heavy',
    testDir: './tests',
    grep: /@heavy/,
    testMatch: ['scenarios/**/*.spec.js', 'wizards/**/*.spec.js'],
    use: common,
  },
];

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/global-setup.js',
  // Per-project parallel — global `workers` is overridden by --workers in CI.
  // Today we keep workers:1 until per-worker storage state is validated end
  // to end. Phase 9 acceptance criterion: flip to workers:4 + fullyParallel:true.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: reporters,
  use: common,
  projects,
});
