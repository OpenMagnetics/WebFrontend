# Frontend test architecture

Playwright suite for OpenMagnetics WebFrontend. Runs against the live dev
server (`BASE_URL`, default `http://localhost:5173`). Headless only, always.

## Non-negotiables

- **Headless only.** Never `headless: false`, `--headed`, `PWDEBUG=1`,
  `PWHEADED=1`, `HEADED=1`, `devtools:true`, `slowMo`. Three layers enforce
  this (`use.headless`, `launchOptions.headless`, `--headless=new`), plus
  `assertHeadlessEnv()` runs at config load, plus `tests/lint-tests.js`
  rules `no-headless-false`, `no-headed-flag`, `no-pwdebug`,
  `no-devtools-true`, `no-slowmo`.
- **No silent fallbacks.** Throw loudly when a precondition is missing.
  `value_or(...)`, `.catch(() => 0)`, "return false on missing UI" all hide
  real bugs. See CLAUDE.md "No fallbacks, no defaults, no silent shortcuts".
- **No hardcoded localhost ports.** Use `BASE_URL` from
  `tests/utils/env.js` or Playwright's `baseURL` config. Lint enforces.
- **`waitForTimeout` lives only in `tests/utils/wait.js`.** Everywhere else,
  use a real signal (`waitForFunction`, `waitForSelector`, `waitForResponse`).

Run `npm run test:lint` to see current violations; `npm run test:lint:ci`
to gate CI.

## Directory layout

```
tests/
  _coverage.js            Playwright fixture wrapper (cookie pre-accept,
                          /cmcs.ndjson + /process_latex mocks, warm fixture)
  _baseline.md            snapshot of suite state before each refactor wave
  _skips.json             allowlist of test.skip()s pending an issue URL
  global-setup.js         writes per-worker storage-state-${i}.json
  lint-tests.js           static lint (no-waitForTimeout, no-silent-catch, …)
  TESTS.md                this file

  utils/                  helper package (import from './utils/index.js')
    env.js                BASE_URL, SS_DIR, workerStorageStatePath, headless guard
    console.js            KNOWN_NOISE allowlist, collectConsoleErrors
    wait.js               settleAnimations + named waiters (ONLY file allowed
                          to call page.waitForTimeout)
    locators.js           card / button locator factories
    forms.js              fillRowInput, fillOutput, switchToIKnowMode
    nav.js                openWizard, runAnalytical, goToMagneticAdviser, …
    steps.js              composable verbs: runMagneticAdviser, dumpMAS,
                          download2DCoilSVG, build3DCoreSTL, runSimulated, …
    assertions.js         expectValidMagnetic, expect2DSvgFits,
                          expectStlNonEmpty, expectNumericalAgreement
    scenarios.js          end-to-end flows: fullMagneticViaAdviser,
                          fullMagneticViaCoreAndWireAdvisers, …
    catalog.js            WIZARD_CATALOG — one entry per wizard
    battery.js            makeBatterySpec(wizard) — generates Groups A/B/D/E/F/G
    index.js              barrel re-export — import from here in specs

  scenarios/              parameterized end-to-end specs
    _all-wizards.spec.js  loops WIZARD_CATALOG, 3 scenarios per wizard

  wizards/                one-line per-wizard battery specs (use makeBatterySpec)
    buck.spec.js, boost.spec.js, flyback.spec.js, …

  *.spec.js               legacy battery / regression / probe specs
  utils.js                LEGACY SHIM — re-exports from utils/. Deleted at
                          end of Phase 4.
```

## Adding a new wizard to the suite

1. Append one entry to `tests/utils/catalog.js` with `key`, `linkCy`,
   `wizardPrefix`, `topology`, `tags`, `capabilities` (adviser/coreAdviser/
   wireAdviser/simulated/iKnowMode).
2. Create `tests/wizards/<key>.spec.js`:
   ```js
   import { makeBatterySpec, getWizard } from '../utils/index.js';
   makeBatterySpec(getWizard('<key>'));
   ```
   This generates Groups A/B/D/E/F/G automatically (gated by capability flags).
3. If the wizard needs a pre-condition (e.g. picking a radio before
   analytical), add it to the catalog entry as a `precondition(page)` hook —
   never fork the battery file.

The parameterized `tests/scenarios/_all-wizards.spec.js` will pick up the
new entry on its next run; no edits needed there.

## Writing a new scenario / step

- **Step** (one verb on the magnetic tool, e.g. "open the coil exports
  modal and download the SVG"): add to `tests/utils/steps.js`, wrap in
  `test.step('myStep', async () => …)`, throw on missing UI.
- **Scenario** (composition of steps producing a structural result, e.g.
  "full magnetic via Magnetic Adviser"): add to `tests/utils/scenarios.js`,
  return a result object the caller can assert against.
- **Assertion** (domain check on a returned object, e.g. "this SVG fits"):
  add to `tests/utils/assertions.js`. Use Playwright's `expect()` so it
  integrates with the HTML report.

## Projects

`playwright.config.js` defines four projects with tag-based selection:

| project       | matches                                          | parallel target |
|---------------|--------------------------------------------------|-----------------|
| site          | home, settings, ui-regressions, new-wizards-smoke | high            |
| wizards-light | per-topology battery files (non-WASM tests only)  | high            |
| scenarios     | `tests/scenarios/**`, `tests/wizards/**` minus @heavy | medium      |
| heavy         | DAB battery + anything tagged `@heavy`            | serial          |

Run one project: `npx playwright test --project=scenarios`.

Tags (apply via `test.describe('… @smoke @scenario @heavy', …)`):
- `@smoke`     — minimal "does it boot" tests
- `@scenario`  — anything in `tests/scenarios/` or `tests/wizards/`
- `@heavy`     — long WASM runs (DAB high-power, big CMC sweeps)
- `@layout`    — pure DOM/CSS assertions, no WASM
- `@numerical` — numerical agreement assertions (analytical vs simulated)
- `@nightly`   — slow tests that only run nightly in CI

Currently `workers: 1` and `fullyParallel: false` until per-worker storage
state is end-to-end validated (Phase 9 acceptance criterion).

## Cold vs. warm fixture

| | Cold (`test`) | Warm (`warmTest`) |
|---|---|---|
| Import | `import { test } from './_coverage.js'` | `import { warmTest as test, resetStoresWarm } from './_coverage.js'` |
| Page scope | Per test | Per worker |
| WASM re-init | Every test (~3–5 s) | Once per worker |
| State isolation | Fresh browser context | Caller must `resetStoresWarm(sharedPage)` |
| When to use | Default | ≥3 tests in one file all bootstrap the same tool/wizard |

Today only `warm-demo.spec.js` uses warm. Phase 9 will roll warm out to
layout-only tests under the `site` and `wizards-light` projects.

Warm rules:
1. Clean up — close modals, dismiss dropdowns, return to a known route.
2. Reset Pinia at the start: `await resetStoresWarm(sharedPage)`.
3. Don't `sharedPage.goto()`. Use SPA navigation via `$router.push`.
4. If a test can't be made idempotent, keep it cold.

## Coverage mode

`COVERAGE=1 npm run test:coverage` flips `_coverage.js` into V8 mode and
emits an HTML report to `test-results/coverage/index.html` via
monocart-reporter. Works in both cold and warm; warm attributes coverage
to the worker page rather than per-test, which is a known limitation.

## Skipping a test

Every `test.skip(...)` / `test.fixme(...)` MUST carry a `https://…` issue
URL in its reason, OR be listed in `tests/_skips.json` with the same
`file:line` coordinates. The lint rule `skip-needs-issue-url` enforces.

`_skips.json` is a transitional allowlist created in Phase 6; entries
without a real `issue` field are technical debt that must be paid down
before the suite is considered green.

## Console-error policy

Tests assert "no unexpected console errors" via:

```js
import { collectConsoleErrors, expectNoConsoleErrors } from './utils/index.js';
const errs = collectConsoleErrors(page);
// ... run test ...
expectNoConsoleErrors(errs);
```

`utils/console.js#KNOWN_NOISE` is a NARROW allowlist of patterns we have
decided to live with (browser quirks, dev-server connection failures in
offline tests, known WASM stderr lines tracked in MKF#TBD). Prefer fixing
the source over expanding this list.

## Migration / refactor status

| Phase | Status |
|---|---|
| 0  Lint script + baseline doc          | ✅ landed |
| 1  utils/ package + per-worker setup   | ✅ landed |
| 2  Scenario library (steps/scenarios/assertions/catalog) | ✅ landed |
| 3  Parameterized loop spec             | ✅ `tests/scenarios/_all-wizards.spec.js` |
| 4  `makeBatterySpec` template          | ✅ `tests/utils/battery.js` + `tests/wizards/*.spec.js` |
| 5  waitForTimeout / silent-catch sweep | ⏸  needs dev server validation first |
| 6  Skip triage                         | ✅ `_skips.json` allowlist + lint integration |
| 7  Orphan repro deletion               | ✅ 7 files removed |
| 8  WASM console contract               | ⏸  cross-repo (MKF) — not started |
| 9  4-project config                    | ✅ `playwright.config.js` projects[] |
| 10 TESTS.md rewrite                    | ✅ this file |

Phases 5 + 8 + the parallel-workers flip in Phase 9 are gated on running
the new scenario library end-to-end against the dev server. Until that
happens, the legacy `*-battery.spec.js` files remain authoritative.
