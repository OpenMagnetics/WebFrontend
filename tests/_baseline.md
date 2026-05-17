# Test-Suite Baseline (Phase 0)

Captured **before** the Phase 2+ scenario library / Phase 4 batterymigrations land. Use this as the reference against which the post-refactor
suite is compared (perf, flake, skip count).

> Update procedure: re-run the commands below and overwrite this file. Always
> keep the previous snapshot in git history so progress is auditable.

## Inventory

| Metric | Value |
|---|---|
| Spec files | 49 |
| Approx. LOC (tests/*.spec.js) | ~14 000 |
| Tests defined | ~590 |
| Largest file | `dab-wizard-battery.spec.js` (1596 LOC, 44 tests) |
| Second largest | `magnetic-builder-battery.spec.js` (1414 LOC, 73 tests) |
| Third largest | `magnetic-tool-battery.spec.js` (996 LOC, 60 tests) |

Run `find tests -name '*.spec.js' | xargs wc -l | sort -n` to re-derive.

## Lint findings (`node tests/lint-tests.js`)

Snapshot at the start of Phase 1 (after `utils/` package extracted, before
spec migrations):

| Rule | Count |
|---|---:|
| `no-silent-catch`       | 434 |
| `no-waitForTimeout`     | 430 |
| `skip-needs-issue-url`  |  40 |
| `no-headed-flag`        |   0 |
| `no-hardcoded-localhost`|   0 |
| `no-headless-false`     |   0 |
| `no-pwdebug`            |   0 |
| `no-devtools-true`      |   0 |
| `no-slowmo`             |   0 |
| **Total**               | **904** |

Phase 5 acceptance criterion: total = 0 with `--mode=error`.

## Skips

40 `test.skip` / `test.fixme` calls lack an issue URL. Triaged in Phase 6.
Notable hotspots:

- `magnetic-builder-battery.spec.js`: ~10 skips ("TODO: stackable shape",
  "TODO: litz not offered")
- `pfc-battery.spec.js`: 5 skips
- `pdf-export.spec.js`: 4 skips ("PDF button not reachable in this env" — env
  problem masquerading as test problem)

## Known hardcoded-path violations (NOT caught by lint yet — semantic)

| File | Issue |
|---|---|
| `tests/utils.js` (now shim) | `SS_DIR` defaulted to `/home/alf/OpenMagnetics/MKF/build` — fixed in Phase 1 (now `os.tmpdir()`) |
| `tests/_coverage.js` | Hardcoded absolute paths to `cmcs.ndjson` etc. — Phase 1 follow-up |
| Orphan repros | 9 files hardcode `localhost:5174` — to be deleted in Phase 7 |

## Concurrency

| Setting | Value |
|---|---|
| `fullyParallel` | `false` |
| `workers` | `1` |
| Projects | 1 (`chromium`) |
| Storage state | single shared file (Phase 1: per-worker files also written) |

Phase 9 target: 4 projects (`site` / `wizards-light` / `scenarios` /
`heavy`), parallel within projects.

## Performance baseline

TODO: run `npx playwright test --reporter=list 2>&1 | tee /tmp/baseline.log`
on a quiet machine and capture:

- Wall time
- Slowest 10 tests
- Total test count actually executed (vs. skipped)

Not run as part of this commit (requires a clean dev server).

## Warm-fixture coverage

Only `warm-demo.spec.js` uses the `warmTest` fixture from `_coverage.js`.
Phase 9 will roll the warm fixture out to the layout-only / non-WASM tests
(target: ~30% of the suite, expected ~2–3× speedup on those).
