import { defineConfig, devices } from '@playwright/test';

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

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/global-setup.js',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: reporters,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    headless: true,
    viewport: { width: 1920, height: 1080 },
    storageState: 'tests/.auth/storage-state.json',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
