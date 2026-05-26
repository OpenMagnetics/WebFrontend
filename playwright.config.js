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
    // Fast smoke: A1 layout for every wizard, B1/E1 for smokeDeep wizards,
    // one F1 (Magnetic Builder) run for buck. Target wall time: <60s.
    name: 'smoke',
    testDir: './tests',
    testMatch: ['wizards/**/*.spec.js'],
    grep: /@smoke/,
    fullyParallel: true,
    use: common,
  },
  {
    name: 'site',
    testDir: './tests',
    testMatch: ['home.spec.js', 'settings-and-modes.spec.js', 'ui-regressions.spec.js'],
    fullyParallel: true,
    use: common,
  },
  {
    name: 'wizards-light',
    testDir: './tests',
    testIgnore: ['scenarios/**', 'wizards/**', '_scratch/**'],
    grepInvert: /@scenario|@heavy/,
    fullyParallel: true,
    use: common,
  },
  {
    // Full coverage minus the long adviser runs.
    name: 'scenarios',
    testDir: './tests',
    testMatch: ['scenarios/**/*.spec.js', 'wizards/**/*.spec.js'],
    testIgnore: ['_scratch/**'],
    grepInvert: /@heavy/,
    fullyParallel: true,
    use: common,
  },
  {
    // Long WASM adviser runs (F1/G1/G2). Lower worker count to avoid WASM
    // memory thrash.
    name: 'heavy',
    testDir: './tests',
    grep: /@heavy/,
    testMatch: ['scenarios/**/*.spec.js', 'wizards/**/*.spec.js'],
    fullyParallel: true,
    use: common,
  },
];

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/global-setup.js',
  // Phase 10: parallel is on by default. Per-worker storage state is cloned
  // via the _coverage fixture and the mocks installed there are page-scoped,
  // so 4 workers is safe. CI can override with --workers=N if memory pressure
  // shows up (the `heavy` project runs WASM-intensive adviser flows; a 16-GB
  // CI runner can take 4, anything smaller should drop to 2).
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  // No global expect.timeout — many legacy specs wait on slow WASM panels
  // (Magnetic Adviser loading, AC Sweep tab, advise-N select buttons) that
  // take well over 5s. Per-locator timeouts are the right knob; trust them.
  reporter: reporters,
  use: common,
  projects,
});
