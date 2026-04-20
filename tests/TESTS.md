# Frontend test architecture

The Playwright suite runs against the live dev server (`BASE_URL`, default `http://localhost:5173`). There are two test fixtures with different trade-offs.

## Cold vs. warm

| | Cold (`test`) | Warm (`warmTest`) |
|---|---|---|
| Import | `import { test, expect } from './_coverage.js'` | `import { warmTest as test, expect, resetStoresWarm } from './_coverage.js'` |
| Page scope | Per test | Per worker |
| WASM re-init | Every test (~3–5 s) | Once per worker |
| State isolation | Fresh browser context | You are responsible — call `resetStoresWarm(sharedPage)` |
| Navigation | `page.goto(...)` is fine | Avoid `goto`; use `$router.push` via `sharedPage.evaluate` |
| Failure blast radius | Contained to one test | Can leak into siblings if cleanup is missed |
| When to use | Default | Hot-path tests in a file that would otherwise pay WASM init N times |

Cold is the default because it's safe. Use warm when:
- A single spec file has ≥3 tests that all bootstrap the magnetic tool or a wizard, and
- The tests don't depend on browser-context-level isolation (no custom cookies, no reloads).

## Warm fixture expectations

A warm test receives `{ sharedPage }` instead of `{ page }`. The `sharedPage` is created once per Playwright worker and persists until the worker exits. Rules:

1. **Clean up after yourself.** Close modals, dismiss dropdowns, return to a known route. Later tests will see your leftovers.
2. **Reset Pinia at the start.** Call `await resetStoresWarm(sharedPage)` before injecting a new fixture. This invokes `store.resetMas('power')` and `store.resetMagneticTool()` where available.
3. **Don't call `sharedPage.goto()`.** Use SPA navigation:
   ```js
   await sharedPage.evaluate(() => {
     const router = document.querySelector('#app').__vue_app__.config.globalProperties.$router;
     router.push('/magnetic_tool');
   });
   ```
   First-test priming can still use `goto` as an escape hatch — see `warm-demo.spec.js` for the pattern.
4. **If a test can't be made idempotent, keep it cold.** Don't try to force it.

## Global setup

`tests/global-setup.js` runs once per test run and writes `tests/.auth/storage-state.json`. It pre-accepts the cookie banner so subsequent tests start without the consent overlay blocking clicks. The file is git-ignored and regenerated on each run.

If you drop `playwright.config.js`'s `globalSetup` or remove the `use.storageState` entry, `_coverage.js` falls back to `addInitScript` setting the same flag — nothing breaks, you just pay a few ms per test.

## Coverage mode

`COVERAGE=1 npx playwright test` flips `_coverage.js` into V8-coverage-collecting mode and emits a report to `test-results/coverage/index.html` via monocart-reporter. This works in both cold and warm fixtures; warm mode attributes coverage to the worker-lifetime page rather than per-test, which is a known limitation.

## Conventions

- File suffix `*.spec.js` — picked up by Playwright automatically.
- Test IDs: a short prefix per file (e.g. `CP-1`, `EX-MAS1`) so failures in a CI log are greppable back to their test.
- Helpers and fixtures live in `tests/utils.js` and `tests/_coverage.js`. Don't add a new helper file unless the domain is clearly different.
