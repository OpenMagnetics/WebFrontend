/**
 * tests/utils/index.js
 *
 * Barrel re-export. New specs should:
 *
 *   import { openWizard, runAnalytical, expectValidMagnetic } from './utils/index.js';
 *
 * Legacy `tests/utils.js` re-exports from here as a backwards-compat shim
 * during the Phase 1→4 migration. Do not add new exports to tests/utils.js.
 */

export * from './env.js';
export * from './console.js';
export * from './wait.js';
export * from './locators.js';
export * from './forms.js';
export * from './nav.js';
export * from './steps.js';
export * from './assertions.js';
export * from './scenarios.js';
export * from './catalog.js';
export * from './battery.js';
