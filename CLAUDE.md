# CLAUDE.md

> **MKF is authoritative for all magnetics math.** Before implementing any
> magnetics calculation or assuming an MKF / PyOM / WASM API, consult
> [`../MKF/CAPABILITIES.md`](../MKF/CAPABILITIES.md). If a capability you
> need isn't listed there, ask — don't reimplement it in the frontend.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Vue 3 SPA for openmagnetics.com — a magnetics design tool. The frontend wraps a C++ engine compiled to WebAssembly (MKF) and embeds the `MagneticBuilder` app as a submodule. End-to-end flow: design requirements → operating points → core/wire/coil adviser → simulation → export (3D STL, 2D SVG, PDF, MAS JSON).

## Commands

```bash
npm install                # deps
npm run dev                # vite dev server on http://localhost:5173
npm run build              # production build (4GB heap)
npm run build:css          # compile SCSS → CSS (rarely needed; vite handles)
npm run test:lint          # static test-lint (no-waitForTimeout, no-headed, no-silent-catch, …)
npm run test:lint:ci       # same, error on violations (CI gate)

# Playwright (headless ONLY — see hard rules below)
npx playwright test                            # full suite
npx playwright test --project=site             # one project: site|wizards-light|scenarios|heavy
npx playwright test tests/wizards/buck.spec.js # single file
npx playwright test -g "some test name"        # single test by name
COVERAGE=1 npm run test:coverage               # V8 coverage → test-results/coverage/index.html
```

Submodules: `WebSharedComponents` (shared Vue components, MAS.ts schema) and `MagneticBuilder` (embeddable builder app). Both must be initialized; `MagneticBuilder` carries its own copy of stores, MAS.ts, and WASM.

## Hard rules

- **Playwright runs headless only.** Never `--headed`, `headless: false`, `PWDEBUG=1`, `HEADED=1`, `devtools:true`, `slowMo`. Enforced at three layers in `playwright.config.js` + `assertHeadlessEnv()` + lint rules. For visual debug, use `page.screenshot()` or the Playwright MCP browser tools.
- **No silent fallbacks.** When required input is missing, throw a loud, specific error. No `value_or(...)`, no `.catch(() => default)`, no hardcoded "typical" values, no in-band sentinels. Applies to JS, the WASM C++ paths, and tests. See `tests/TESTS.md` and the global CLAUDE.md section "No fallbacks, no defaults, no silent shortcuts".
- **No hardcoded `localhost:5173` in tests.** Use `BASE_URL` from `tests/utils/env.js` or Playwright's `baseURL`.
- **`waitForTimeout` only in `tests/utils/wait.js`.** Elsewhere, wait on a real signal (`waitForFunction`/`waitForSelector`/`waitForResponse`).
- **Skipped tests** must carry a `https://…` issue URL in the skip reason, or be listed in `tests/_skips.json`.

## Architecture

### WASM (MKF C++ → JS)

The MKF C++ library is built into WebAssembly by the sibling `WebLibMKF` project and consumed here. WASM files exist in **two locations that must be kept in sync**:

- `src/assets/js/libMKF.wasm.{js,wasm}`
- `MagneticBuilder/src/assets/js/libMKF.wasm.{js,wasm}`

Loader chain: `src/assets/js/libMKF.wasm.js` → `WebSharedComponents/assets/js/mkfWorker.js` (Comlink worker) → `WebSharedComponents/assets/js/mkfModule.js`. UI calls flow through `stores/taskQueue.js`, which wraps every WASM/HTTP call and also doubles as an event bus via Pinia `$onAction`.

To rebuild WASM after a C++ change in `OpenMagnetics/MKF/`: edit in MKF, copy the file into `WebLibMKF/build/_deps/mkf-src/...`, `ninja -j5` in `WebLibMKF/build/`, then copy `libMKF.wasm.{js,wasm}` to **both** locations above. Full workflow with examples in `AGENTS.md`. WASM C++ requires `-fexceptions` to be built with for `try/catch` to work — without it, catch blocks are no-ops and exceptions surface as integer pointers in JS.

### Stores (Pinia)

Stores in `src/stores/` are split into two categories — full table in `src/stores/STORES.md`:

- **Contract stores** (`mas`, `state`, `settings`, `user`, `style`, `storeVersioning`) — duplicated across WebFrontend, MagneticBuilder, and consumer repos (`eb-modelling-el-choker`, `eb-modelling-el-magnetic`). The `return {…}` shape is the embedding contract. Any change must roll out everywhere or embedded builds break silently. Use `from '/src/stores/...'` (absolute) when a store should be overridable by the host app, `from '../stores/...'` (relative) when it belongs to *this* package.
- **Local stores** (`taskQueue`, `modelSettings`, `magneticBuilderSettings`, `history`, `adviseCache`, …) — package-local, free to refactor.

Persisted stores use `pinia-plugin-persistedstate` → localStorage. Bump `STORE_VERSION_DATE` in `storeVersioning.js` when changing a persisted store's shape (it wipes user state).

### Theme

Apps mount exactly one theme store as `$styleStore` in `main.js` (`style.js` or `fairRiteStyle.js`). They share the same shape so components read `$styleStore.xxx` theme-agnostically.

### MAS schema

`WebSharedComponents/assets/ts/MAS.ts` is auto-generated from the MAS JSON schemas by the `vite-plugin-mas-regen` plugin at dev-server startup and at build time (catches schema drift early). Three copies are regenerated: WebFrontend's, MagneticBuilder's, and MagneticBuilder's nested submodule copy.

### Wizards

Converter wizards live in `src/components/Wizards/`. **`DabWizard.vue` is the golden reference**; `ConverterWizardBase.vue` provides layout, waveform orchestration, MAS-store wiring, and SPICE generation. Full authoring guide: `src/components/Wizards/WIZARDS_GUIDE.md` (1284 lines — read it before adding/modifying a wizard). Key invariants distilled below.

**Wizard families** (§3.2b — pick the closest sibling and copy):
1. Multi-output isolated SMPS — DAB (golden), LLC, PSFB, Flyback. `outputsParameters[]`.
2. Single-output isolated — PSHB, AHB. Scalar `outputVoltage`/`outputPower`, `:showNumberOutputs="false"`.
3. CMC choke — no `outputsParameters`/`efficiency`/`insulationType`; tabular impedance/attenuation data; EMI keys; `getInsulationType()` → `null`; `getIsolationSides()` → `['primary','secondary',…]` lowercased; mounts `EmiSpectrumView` (`mode:'cm'`) in `#col3-extra`.
4. DMC choke — same as CMC but `getIsolationSides()` → `Array(n).fill('primary')`; `EmiSpectrumView` (`mode:'dm'`).
5. Multi-topology shared — `BuckBoostWizard`, `ForwardWizard`, `IsolatedBuckBoostWizard`, `PushPullWizard`. Take `converterName` prop, use hand-written `topologyMap` to derive title/topology/taskQueue method (throw on unknown).
6. PFC — hardcoded `converterName`, bypasses `processWizardData`, inline mas-store assembly.

**Load-bearing magic strings** (§0): `'Help me with the design'` and `'I know the design I want'` are compared raw in many spots — never paraphrase. Field name is `designMode` on newer SMPS wizards, `designLevel` on older chokes — be consistent within a wizard.

**Required-on-every-wizard checklist**:
- `getCalculateFn()` branches on design level; backend wrappers added in `taskQueue.js` + `libMKF.cpp` if absent (don't omit the toggle to mask missing backend).
- `buildParams(mode)` switches on design level; `#design-or-switch-parameters` slot conditionally rendered.
- `forceWaveformUpdate: 0` in `data()` AND bound as `:waveformForceUpdate` on base — chart stales without it.
- `:waveformViewMode` prop + `@update:waveformViewMode` listener — magnetic↔converter toggle no-ops without it (PSFB/PSHB/AHB bug).
- `getInsulationType()` returns `null` for chokes (not `'No'`).
- `process()` calls both `this.masStore.resetMas("<cat>")` AND `this.$stateStore.closeCoilAdvancedInfo()`.
- `resetMas` arg and navigate-category coupling (§3.8): isolated SMPS → `"power"`/`"Power"`; CMC → `"power"`/`"CommonModeChoke"`; DMC → `"dmc"`/`"Filter"`. Copy from sibling, don't invent.
- `buildOperatingPoint`: include `switchingFrequency` and `ambientTemperature` BOTH top-level AND inside each operating point.
- Multi-output wizards: `updateNumberOutputs(n)` present.
- Unique HTML `id=` on shared checkboxes (suffix with wizard name, e.g. `useLeakageInductancePsfb`).
- `dataTestLabel` fanned out as `dataTestLabel + '-Field'` to **every** input (known gap: DAB/LLC/PSFB/PSHB/AHB only thread it to `CompactVoltageInput`).
- `waveformViewMode` watcher bumping `forceWaveformUpdate` (CMC/DMC/Flyback/BuckBoost/Forward/IsolatedBuckBoost/LLC/PFC/PushPull have it; DAB/PSFB/PSHB/AHB intentionally skip).

**UX rules — non-negotiable**:
- §3.4b — no cryptic 1–2 letter labels (`Lk L`, `Cb`, `Fs`, `D`, `η`, `Eff`, `Insul` forbidden). Use full names or industry-standard abbreviations.
- §3.4c — every editable input AND `<DimensionReadOnly>` row needs `:tooltip="tooltipsConverterWizards['<name>']"` plus a matching entry in `WebSharedComponents/assets/js/texts.js`. Missing dict key silently resolves to `undefined`.
- §3.4d — camelCase enum dropdowns use `:optionLabels="dropdownLabelsConverterWizards.<group>"`. Never rewrite the options array (breaks round-trip) or `toTitleCase()` it (produces "Ahb Flyback").
- §10 #26 — every slot wrapper card in `ConverterWizardBase.vue` MUST `v-if="$slots['<name>']"` or it renders empty (AHB/PSHB shipped silently in I-know mode for months because the design-mode card was missing this guard).

**Period handling** (§3.3e): MKF owns period repetition. JS-side `repeatWaveformForPeriods` helpers were deleted; do NOT reintroduce. The visualizer composable `useConverterWaveforms.js` has its own private copy fed `numberOfPeriods=1`; don't conflate.

**Verification protocol** (§8a) — a rendered chart is NOT a working wizard. Mandatory in-browser checks before declaring done:
1. Watch console for `Exception … from MKF` / WebAssembly traps — never ship a wizard that throws even if the chart renders.
2. Log raw MKF result; confirm shape (`operatingPoints[]`, `designRequirements`, `converterWaveforms[]`).
3. Magnetic waveforms sane (triangular CCM / trapezoidal DCM / square voltage).
4. **Period-count ratio test**: 1× vs 4× periods must show exactly 4× cycles on screen. 1× → knob not threaded. 8× → tiled twice (JS+MKF).
5. Steady-state convergence test (1 vs 5 periods).
6. Forced-update flicker check (click action twice with identical inputs; chart must visibly redraw).
7. MAS round-trip via Review Specs.

**SPICE probe-correctness audit** (§8a.5) — C++ extractor bugs in `MKF/src/converter_models/*.cpp`:
- (A) Input V must be the DC source rail (`v(vin_dc)`), not a tank node (`vab`/`v(sw)`/`pri_trafo_in`).
- (B) Input I must be a dedicated upstream zero-V sense source (`Vq1_sense vin_dc q1_drain 0` → `i(Vq1_sense)`) with a physical clamp against ngspice SW-model 10⁵A spikes — never `vpri_sense#branch` (cap-loop averages to 0) or `i(Vdc)` (raw spikes).
- (C) Magnetic winding V must be per-winding differential E-source probes (`Evpri_w`, `Evsec_a_w`) — never lumped tank or post-rectifier DC bus.

Clean as of guide: Boost, Flyback, AHB (post-fix). Buggy: PSFB, PSHB, Cllc, LLC, DAB (Input I only), PushPull, the four forward-family wizards, Buck/IsolatedBuck/IBB (unchecked). Fix priority: PSFB → PSHB → Cllc → LLC → DAB → PushPull → forwards → buck family. PSFB+PSHB are literal copies of pre-fix AHB — use the AHB diff as template.

**File-touch checklist** for a new wizard (§11): MKF C++ → `WebLibMKF/src/libMKF.cpp` embind → rebuild WASM and copy to both `src/assets/js/` and `MagneticBuilder/src/assets/js/` → `MAS.ts` `Topologies.<X>` → `state.js` `Wizards.<X>` → `taskQueue.js` calc/sim methods → `<X>Wizard.vue` → `Wizards.vue` mount → `WizardsLanding.vue` button → `Header.vue` dropdown (`data-cy="<Name>-link"`, NOT `:disabled="true"`) → Playwright spec.

**Recently added** (May 2026, §12): `SrcWizard` (Series Resonant; resonant family), `ViennaWizard` (3-phase Vienna PFC, but SPICE is single-phase emulation — sets `viennaDiagnostics.spiceMode = "singlePhaseEmulation"`; only `viennaI`/`tType`/`peakOfLineOnly` triplet works server-side), `CurrentTransformerWizard` (passive sensor; no design-mode toggle; `iKnowMode: false`; no SPICE).

## Tests

Playwright suite organized into 4 projects (see `playwright.config.js`): `site`, `wizards-light`, `scenarios`, `heavy`. Selection by tag (`@smoke @scenario @heavy @layout @numerical @nightly`). Currently `workers: 1, fullyParallel: false` until per-worker storage state is end-to-end validated.

Helpers live in `tests/utils/` and are re-exported from `tests/utils/index.js` (always import from the barrel). Key files:

- `catalog.js` — `WIZARD_CATALOG` entry per wizard
- `battery.js` — `makeBatterySpec(wizard)` generates Groups A/B/D/E/F/G gated by capability flags
- `scenarios.js` / `steps.js` — composable end-to-end flows
- `_coverage.js` — fixture wrapper (cookie pre-accept, `/cmcs.ndjson` + `/process_latex` mocks, warm fixture for `warmTest`)
- `console.js` — `KNOWN_NOISE` allowlist + `expectNoConsoleErrors`; prefer fixing source over expanding the allowlist

Adding a wizard to the suite: append catalog entry, create `tests/wizards/<key>.spec.js` with one line `makeBatterySpec(getWizard('<key>'))`. Per-wizard preconditions go in the catalog `precondition(page)` hook, not in forked battery files. Full guide in `tests/TESTS.md`.

## Git push for OpenMagnetics repos

The default SSH key lacks write access. Use:
```bash
git -c core.sshCommand="/usr/bin/ssh -i ~/.ssh/hephaestus_om" push origin <branch>
# Submodules: add  -C <submodule-path>  before  -c
```
