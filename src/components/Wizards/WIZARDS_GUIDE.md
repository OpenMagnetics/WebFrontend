# Converter Wizard Authoring Guide

How to create, integrate and validate a new converter wizard in the OpenMagnetics
WebFrontend. Follow this in order; each section ends with a checkable result.

The reference implementation is **`DabWizard.vue`** (golden standard). The
**`PsfbWizard.vue`** is a faithful copy that you can also study. Both wrap
**`ConverterWizardBase.vue`**, which provides the layout, waveform
orchestration, MAS-store wiring, navigation helpers and SPICE-code generation.

---

## 0. Hard rules (read first, no exceptions)

These are non-negotiable conventions enforced across all wizards. Skipping any
of them is a bug — even if "the backend doesn't support it yet". Fix the
backend, do not silently drop the UI.

1. **Every wizard MUST expose the `designLevel` toggle** with the two
   load-bearing strings, in this exact spelling:
   - `'Help me with the design'`
   - `'I know the design I want'`

   Rendered via the `#design-mode` slot using `ElementFromListRadio` (see
   `SepicWizard.vue:312-330` for the canonical snippet). The wizard's
   `data()` must initialise `localData.designLevel` (or `designMode` for
   newer SMPS wizards — pick one and stay consistent within a wizard) to
   `'Help me with the design'`.

2. **`getCalculateFn()` MUST branch on `designLevel`** and route to the
   matching backend wrapper:
   ```js
   getCalculateFn() {
     if (this.localData.designLevel === 'I know the design I want') {
       return (p) => this.taskQueueStore.calculateAdvanced<Name>Inputs(p);
     }
     return (p) => this.taskQueueStore.calculate<Name>Inputs(p);
   }
   ```
   If the advanced backend wrapper does not yet exist, **add it** in
   `WebLibMKF/src/libMKF.cpp` and the matching MKF C++ entry point first.
   Do not omit the toggle to mask the missing backend (that is exactly the
   "silent shortcut" the project rules forbid).

3. **`buildParams(mode)` MUST switch on `designLevel`** to emit either the
   help-me-design fields (e.g. `currentRippleRatio`, `qualityFactor`) or
   the I-know-the-design fields (e.g. `desiredInductance`, `desiredTurnsRatios`,
   explicit tank elements for resonant topologies).

4. **The `#design-or-switch-parameters` slot MUST conditionally render** the
   correct input set per `designLevel` (`v-if` / `v-else`), so the user can
   actually type the values they just selected via the toggle.

5. **Headless Playwright tests MUST cover both modes** — open the wizard,
   click Analytical in default mode, switch the radio to `'I know the design
   I want'`, fill the design fields, click Analytical again, assert both
   paths produce waveforms without unhandled errors.

If `MKF/src/converter_models/<Name>.{h,cpp}` does not yet have a method that
consumes the I-know-the-design inputs (e.g. `process(desiredInductance, ...)`),
**that backend method must be added before the wizard is considered complete.**
This is real C++ work, not a Vue shortcut.

---

## 0.1 Prerequisites — backend support

Before starting in Vue, make sure the C++ backend exposes:

1. A converter class in `MKF/src/converter_models/<YourConverter>.{h,cpp}`
   with at least:
   - `set_*` methods for every input parameter
   - `process()` that returns design requirements + operating points
   - (optional) `simulate_ideal_waveforms()`
   - (optional) `generate_spice_netlist()` returning a string
2. Embind bindings in `WebLibMKF/src/libMKF.cpp`:
   - `calculate_<name>_inputs(json) -> json`
   - `simulate_<name>_ideal_waveforms(json) -> json`
   - `generate_<name>_spice_code(json) -> json`
3. A topology entry in `WebSharedComponents/assets/ts/MAS.ts`
   (`Topologies.<YourConverter>`).
4. Build WASM and copy to both frontend asset folders (see `AGENTS.md`).

Verify in the browser console:
```js
mkf.calculate_<name>_inputs(JSON.stringify({ /* minimal valid params */ }))
```
returns valid JSON (not `Exception ...`). If it fails here, do **not** start
the Vue work — fix C++ first.

---

## 1. Add a TaskQueue calculation method

File: `src/stores/taskQueue.js`

Add a section near the other converters (search for `Phase Shift Full Bridge`
as a model):

```js
// ==========================================
// Wizard Calculation Methods - <Your Converter>
// ==========================================
async calculate<Name>Inputs(params) {
    const mkf = await waitForMkf();
    await mkf.ready;
    const result = await mkf.calculate_<name>_inputs(JSON.stringify(params));
    if (result.startsWith('Exception')) throw new Error(result);
    return JSON.parse(result);
},
async simulate<Name>IdealWaveforms(params) {
    const mkf = await waitForMkf();
    await mkf.ready;
    const result = await mkf.simulate_<name>_ideal_waveforms(JSON.stringify(params));
    if (result.startsWith('Exception')) throw new Error(result);
    return JSON.parse(result);
},
```

The MKF runtime is generic — any function exposed via embind is reachable as
`mkf.<name>`; nothing else needs wiring in `mkfWorker.js` / `mkfRuntime.js`.

SPICE generation (`taskQueueStore.generateSpiceCode(topology, params)`) is
shared and dispatches by topology. If you exposed a new SPICE function in
`libMKF.cpp`, register it in the existing dispatcher in `taskQueue.js`
(grep for `generateSpiceCode`).

---

## 2. Register the wizard in the state store

File: `src/stores/state.js`

Add an entry under `Wizards`:
```js
Wizards: {
  ...
  YourConverter: 'yourConverter',
}
```

---

## 3. Create the wizard component

File: `src/components/Wizards/<Name>Wizard.vue`

**Copy `DabWizard.vue` verbatim** and rename. It's the cleanest, most complete
template. Then edit:

### 3.1 `<script setup>` imports

Keep all of them — every shared input (`Dimension`, `DimensionReadOnly`,
`PairOfDimensions`, `TripleOfDimensions`, `ElementFromList`,
`ElementFromListRadio`, `DimensionWithTolerance`, `CompactVoltageInput`)
is used somewhere in the standard layout.

Also commonly imported from `WebSharedComponents/assets/js/`:
- `defaults.js` — `minimumMaximumScalePerParameter` (keys: `frequency`,
  `temperature`, `voltage`, `current`, `inductance`, `capacitance`, `power`),
  `defaultDesignRequirements`, `defaultFlybackWizardInputs`,
  `isolationSideOrdered`, `filterMas`.
- `utils.js` — `deepCopy`, `combinedStyle`, `combinedClass`.
- For chokes only: `EmiSpectrumView` (rendered in `#col3-extra`).
- Direct WASM access: `waitForMkf` from
  `WebSharedComponents/assets/js/mkfRuntime.js` (rare; only when bypassing
  `taskQueueStore` to call multi-variant entry points like
  `calculate_advanced_cmc_inputs`).

### 3.2 `data()` — required keys

The shape depends on the **wizard family** (see §3.2b). For an isolated SMPS
converter (DAB/PSFB/PSHB/Flyback/LLC):

```js
const localData = {
  inputVoltage: { nominal: 400, tolerance: 0.1 },          // DimensionWithTolerance
  outputsParameters: [{ voltage: V, current: I, turnsRatio: N }],  // multi-output
  numberOutputs: 1,
  switchingFrequency: 100000,
  efficiency: 0.97,
  ambientTemperature: 25,
  insulationType: InsulationType.Basic,
  designMode: 'Help me with the design',                   // or 'I know the design I want'
  // ...converter-specific knobs (modulation, phase shift, etc.)
};
return {
  masStore, taskQueueStore, localData,
  insulationTypes: ['No', 'Basic', 'Reinforced'],
  designLevelOptions: ['Help me with the design', 'I know the design I want'],
  errorMessage: "", simulatingWaveforms: false, waveformSource: '',
  waveformError: "", magneticWaveforms: [], converterWaveforms: [],
  designRequirements: null, simulatedTurnsRatios: null,
  simulatedOperatingPoints: [],
  numberOfPeriods: 2, numberOfSteadyStatePeriods: 1,
  waveformViewMode: 'magnetic',                        // toggled by the base
  forceWaveformUpdate: 0,                              // REQUIRED — bumped after every waveform run
  <name>Diagnostics: null,                             // populated by postProcessResults
};
```

> The two design-mode strings `'Help me with the design'` and
> `'I know the design I want'` are **load-bearing magic constants** — they are
> compared as raw strings in `buildParams`, `updateNumberOutputs`, and several
> `v-if` clauses. Do not paraphrase them. Older choke wizards use the field
> name `designLevel` instead of `designMode`; pick one and be consistent.

### 3.2b Wizard families

| Family | Examples | Key differences |
|---|---|---|
| **Multi-output isolated converter** | DAB, PSFB, LLC, Flyback | The full "standard" shape above. LLC's `outputsParameters` is `[{ voltage, power }]` (no `current`/`turnsRatio`), an exception to the standard shape. |
| **Single-output isolated converter** | PSHB, AHB | `outputVoltage` / `outputPower` scalars instead of `outputsParameters[]`; `:showNumberOutputs="false"`; no `updateNumberOutputs`. (Both wizards previously omitted `#design-mode` and were stuck in implicit "I know the design" mode; that has been fixed and they now match the DAB pattern.) |
| **Choke — common mode (CMC)** | `CmcWizard` | No `outputsParameters`, no `efficiency`, no `insulationType`. Uses `operatingVoltage` / `operatingCurrent` / `lineFrequency` / `lineImpedance`. Tabular data (`impedancePoints[]`, `attenuationPoints[]`) with `_uidCounter`/`_id` keys plus add/remove row methods. EMI-spectrum keys (`parasiticCap_pF`, `dvdt_V_ns`, `ripplePeakToPeak`, `switchingFrequencyEmi`, `dutyCycleEmi`). `getInsulationType()` returns `null`; `getIsolationSides()` returns `isolationSideOrdered.slice(0,n).map(s => s.toLowerCase())` — i.e. `['primary', 'secondary', ...]`. Mounts `EmiSpectrumView` (`mode: 'cm'`) via `#col3-extra`. |
| **Choke — differential mode (DMC)** | `DmcWizard` | Same general shape as CMC, but every winding sits on the line side: `getIsolationSides()` returns `Array(n).fill('primary')`. Mounts `EmiSpectrumView` (`mode: 'dm'`) via `#col3-extra`. |
| **Multi-topology shared component** | `BuckBoostWizard` (Buck/Boost/BuckBoost), `ForwardWizard` (3 variants), `IsolatedBuckBoostWizard`, `PushPullWizard` | Accepts a `converterName: String` prop and uses it to derive the title and lookup the topology key + the taskQueue method name via a hand-written `topologyMap`. Mounted in `Wizards.vue` multiple times with different `:converterName`. |
| **Single-stage non-isolated (PFC)** | `PfcWizard` | Hardcoded `converterName: 'Power Factor Correction (PFC)'` in `data()`; mounted once. Bypasses `processWizardData` and assembles the mas store inline (see `PfcWizard.vue:243-261`). |
| **Flyback-style mixed-tolerance** | `FlybackWizard` | `dutyCycle` is itself a `DimensionWithTolerance`; in `buildParams` it zips with the `inputVoltage` triple to produce a `desiredDutyCycle` array. Uses `defaultFlybackWizardInputs` from `defaults.js` instead of literal init. |

When in doubt, pick the closest sibling and copy.

### 3.3 The wizard contract — methods

`ConverterWizardBase` calls these on the wizard via
`this.$refs.base.<helper>(this, ...)`. Most are **required**, some are
**optional**.

| Method | Req? | Purpose |
|---|---|---|
| `buildParams(mode)` | one of | Build the JSON payload for `calculate_*` / `simulate_*`. `mode` is `'analytical'` or `'simulation'`. Must return a plain object. |
| `buildInputs()` | one of | Older alternative used by LLC. Async; returns the same payload. The base accepts either (`processWizardData` falls back). |
| `buildOperatingPoint()` | conv. | Convention: returns one operating-point sub-object embedded in `buildParams`. **Important:** include `switchingFrequency` and `ambientTemperature` *inside* the op-point as well as at top-level — DAB and PSFB both do this. PSHB folds it inline inside `buildParams`. |
| `getCalculateFn()` | yes | Return `(p) => taskQueueStore.calculate<Name>Inputs(p)`. May switch between simple/advanced backends per `localData.designLevel` (CMC and the BuckBoost-family wizards do this). |
| `getSimulateFn()` | yes | Return `(p) => taskQueueStore.simulate<Name>IdealWaveforms(p)`. The handler name on the wizard is up to you — what matters is the `@get-simulated-waveforms="…"` binding in the template. May pass extra args (CMC: parasitic cap, dV/dt) or reshape MKF output into MAS operating points (DMC). |
| `getDefaultFrequency()` | one of | Return `this.localData.switchingFrequency` (or `lineFrequency` for chokes). |
| `getFrequency()` | one of | Older alias used by LLC. Base falls through to either. |
| `getTopology()` | yes | Return `Topologies.YourConverter`. |
| `getIsolationSides()` | yes | Array length must match the number of windings. Use the `IsolationSide` enum for converters; CMC returns `['primary','secondary',…]` lowercased; DMC returns `Array(n).fill('primary')`. |
| `getInsulationType()` | yes | Return `this.localData.insulationType` for converters; **return `null` for chokes** — that disables the insulation block in MAS. |
| `getCoilGroups()` | optional | Return an array of arrays of winding *names*; each group becomes a `woundWith` cluster (interleaved/parallel windings sharing a section). Only AHB uses this — `AhbWizard.vue:105` returns `[['Secondary', 'Tertiary']]`. Omit if not needed. |
| `isValid()` | optional | Boolean — gates `:disableActions`. Implemented only by DAB, PSFB, PSHB, AHB; every other wizard omits it and uses bare `:disableActions="errorMessage != ''"`. |
| `postProcessResults(result, mode)` | optional | Cache `<name>Diagnostics`, derived turns ratios, etc. `mode` is `'analytical' \| 'simulation'`. |
| `updateNumberOutputs(n)` | multi-out only | Grow / shrink `outputsParameters`. Single-output wizards omit. |
| `updateErrorMessage()` | yes | Trivial helper — `this.errorMessage = ""`. |
| `dismissError()` | optional | Most wizards inline it directly: `@dismiss-error="errorMessage=''; waveformError=''"`. Only DAB, PSFB, PSHB, AHB define a `dismissError()` method. |
| `process()`, `processAndReview()`, `processAndAdvise()` | yes | Copy from DAB. The category strings differ — see §3.7. |
| `getAnalyticalWaveforms()`, `simulateIdealWaveforms()`, `getSpiceCode()` | yes (any used) | Delegates to `this.$refs.base.executeWaveformAction(this, 'analytical' \| 'simulation')` or `generateSpiceCode(this)`. Set `:showSpiceCodeButton="false"` on the base to hide the SPICE button entirely. |

**Important `buildParams` rules** (mirror DAB):
- Always send `outputs` as parallel arrays `outputVoltages` / `outputCurrents`
  derived from `outputsParameters` (multi-output family).
- Compute `desiredTurnsRatios` automatically in *Help-me* mode
  (`Vin / Vout` per output); use the user-supplied value in *I-know* mode.
- Only send optional knobs (`seriesInductance`, ...) when the user actually
  provided a positive value AND is in *I-know* mode. Per project policy,
  let the backend throw if a required field is missing — **do not silently
  default**.

### 3.3b Helpers exposed by `$refs.base`

Beyond `processWizardData`, `executeWaveformAction`, `navigateToReview`,
`navigateToAdvise`, `generateSpiceCode`, the base also exposes:

- **`extractSinglePeriod(time, data, frequency)`** — extracts one period from a
  raw multi-period trace using `1/frequency` as the period length.
- **`extractSinglePeriodFromOperatingPoints(ops, freq)`** — same idea, but
  walks every excitation in every operating point and returns a fresh array
  of operating points. Used by PFC.
- **`processSimulatedOperatingPoints(ops, tqs)`** — fills harmonics / processed
  data when missing (called automatically inside `processWizardData`).
- **Formatters / display helpers** (call as `this.$refs.base.<name>(...)`):
  `formatFrequency`, `formatImpedance`, `formatInductance`, `formatCapacitance`,
  `getMagnetizingInductanceDisplay`, `getTurnsRatioDisplay`,
  `getOperatingPointLabel`.
- **Visualizer helpers**: `getPairedWaveformsList`,
  `getPairedWaveformDataForVisualizer`, `getPairedWaveformAxisLimits`,
  `getPairedWaveformTitle`, `getTimeAxisOptions`, `getSingleWaveformDataForVisualizer`.
- **Pipeline helpers**: `processWaveformResults`, `processAnalyticalWaveforms`,
  `processSimulationWaveforms`, `assignResultsToMasStore`,
  `setOperatingPointsModeToManual`, `validateWaveforms`,
  `pruneHarmonicsForInputs`, `synthesizeWaveformFromHarmonics`,
  `buildMagneticWaveformsFromInputs`, `convertConverterWaveforms`.

### 3.3c Multi-method backends

If your converter needs more than one MKF call per analytical run (DMC calls
`proposeDmcDesign` → `calculateDmcInputs`), do the chain inside
`getCalculateFn`'s returned closure. The closure can be `async` and call
`taskQueueStore` methods sequentially. Same applies for `getSimulateFn`.

### 3.3d Backend variant selection

If your converter exposes "simple" and "advanced" entry points (CMC has
`calculate_cmc_inputs` vs `calculate_advanced_cmc_inputs`; Flyback similar),
branch inside `getCalculateFn`/`getSimulateFn` on the user's design-level
selection. CMC bypasses `taskQueueStore` and calls `mkf.<name>(JSON)` directly
via `waitForMkf()` — acceptable when no queueing semantics are needed.

### 3.3e Period repetition (always handled by MKF)

Every MKF converter entry point honors `numberOfPeriods` — analytical bindings
call `repeat_operating_points_waveforms` (`libMKF.cpp`) and SPICE bindings set
`config.extractOnePeriod = true; config.numberOfPeriods = N;` so ngspice emits
exactly N cycles. **Don't tile waveforms in JS.** If a new entry point ignores
the field, fix it in MKF using the same pattern instead of working around it
in the wizard. The previously-existing JS-side helpers
`repeatWaveformForPeriods` / `repeatWaveformsForPeriods` on the base and
`IsolatedBuckBoostWizard` have been removed; do not reintroduce them.

> Note: `useConverterWaveforms.js` (the visualizer composable) still has its
> own `repeatWaveformForPeriods` for display-only repetition. That helper is
> private to the visualizer and is fed `numberOfPeriods=1` in normal use
> (since MKF already returns N periods). Don't conflate it with the deleted
> wizard-level helpers.

### 3.3f `waveformViewMode` watcher

Most wizards force a chart redraw when toggling magnetic ↔ converter:

```js
watch: {
  waveformViewMode() { this.forceWaveformUpdate++; }
}
```

Present in CMC, DMC, Flyback, BuckBoost, Forward, IsolatedBuckBoost, LLC,
PFC, PushPull. **Absent** in DAB, PSFB, PSHB, AHB — those rely on the chart
component re-rendering on prop change. Add the watcher only if you observe
a stale chart on toggle.

### 3.4 Template — standard slot layout

```vue
<ConverterWizardBase
  ref="base"
  title="<Name> Wizard" titleIcon="bi bi-..."
  subtitle="..."
  :col1Width="3" :col2Width="4" :col3Width="5"
  :magneticWaveforms="magneticWaveforms" :converterWaveforms="converterWaveforms"
  :simulatingWaveforms="simulatingWaveforms" :waveformSource="waveformSource"
  :waveformError="waveformError" :errorMessage="errorMessage"
  :numberOfPeriods="numberOfPeriods" :numberOfSteadyStatePeriods="numberOfSteadyStatePeriods"
  :waveformViewMode="waveformViewMode"
  :waveformForceUpdate="forceWaveformUpdate"
  :disableActions="errorMessage != '' || !isValid()"
  @update:numberOfPeriods="numberOfPeriods = $event"
  @update:numberOfSteadyStatePeriods="numberOfSteadyStatePeriods = $event"
  @update:waveformViewMode="waveformViewMode = $event"
  @get-analytical-waveforms="getAnalyticalWaveforms"
  @get-simulated-waveforms="simulateIdealWaveforms"
  @get-spice-code="getSpiceCode"
  @dismiss-error="dismissError"
>
  <template #conditions>      <!-- frequency, modulation, temp, eff, insulation -->
  <template #design-mode>     <!-- radio: Help-me vs I-know (omit only for chokes / PFC) -->
  <template #design-or-switch-parameters-title v-if="...I know...">
  <template #design-or-switch-parameters     v-if="...I know...">
  <template #col1-footer>     <!-- Review Specs / Design Magnetic buttons -->
  <template #input-voltage>   <!-- CompactVoltageInput -->
  <template #outputs>         <!-- numberOutputs + Pair/TripleOfDimensions per output -->
  <template #diagnostics v-if="<name>Diagnostics">   <!-- DimensionReadOnly rows -->
  <template #col3-extra>      <!-- chokes mount EmiSpectrumView here -->
</ConverterWizardBase>
```

For multi-topology shared components, also expose:
```js
props: { converterName: { type: String, required: true }, dataTestLabel: ... }
```
and derive title / topology / taskQueue method via a hand-written
`topologyMap` that throws on unknown names — see `BuckBoostWizard.vue:118-127`,
`ForwardWizard.vue:138-147`, `IsolatedBuckBoostWizard.vue:138-146`:
```js
title() { return `${this.converterName} Wizard`; },
getTopology() {
  const topologyMap = {
    'Buck':       Topologies.BuckConverter,
    'Boost':      Topologies.BoostConverter,
    'Buck-Boost': Topologies.BuckBoostConverter,
  };
  const t = topologyMap[this.converterName];
  if (!t) throw new Error(`Unknown converterName: ${this.converterName}`);
  return t;
},
getCalculateFn() {
  const fnMap = {
    'Buck':       'calculateBuckInputs',
    'Boost':      'calculateBoostInputs',
    'Buck-Boost': 'calculateBuckBoostInputs',
  };
  const fn = fnMap[this.converterName];
  if (!fn) throw new Error(`Unknown converterName: ${this.converterName}`);
  return (p) => this.taskQueueStore[fn](p);
},
```

**Do not omit** the `:waveformViewMode` and `:waveformForceUpdate` props plus
their `@update:` events. Without `waveformViewMode` the magnetic↔converter
toggle is a no-op (the PSFB review bug, also found later on PSHB and AHB —
both were missing the prop bind AND the `@update:` listener). Without
`waveformForceUpdate` the chart may stale after re-runs that produce identical
bounds.

### 3.4b Field-label naming rule (no cryptic abbreviations)

Every user-visible field label (the `replaceTitle="..."` prop on
`Dimension*` components, the `<label>` on `CompactVoltageInput`, and any
panel/header text) must be a **full English name** or a **standard, widely
recognised abbreviation**. Single- or two-letter symbol-style labels are
forbidden because they are unreadable to anyone who is not the author.

| Allowed | Forbidden |
|---|---|
| `Switching Frequency`, `Sw. Freq`, `Frequency` | `f`, `Fs`, `Fsw` |
| `Duty Cycle`, `Duty` | `D` |
| `Leakage Inductance`, `Leak. Ind.` | `Lk L`, `Lk`, `Lk_p` |
| `Magnetizing Inductance`, `Mag. Ind.` | `Mag L`, `Lm` |
| `Output Inductance`, `Out. Ind.` | `Out L`, `Lo` |
| `Clamp Capacitance`, `Cb (Clamp Cap.)` | `Cb`, `C` |
| `Output Capacitance`, `Out. Cap.` | `Co` |
| `Efficiency` | `Eff`, `η` (alone) |
| `Insulation` | `Insul`, `Iso` |

Rationale: cryptic labels block code review, mislead end users (engineers
unfamiliar with that one wizard's local jargon), and turn every help-me
form into a guessing game. The maintainer's intent must be readable from
the rendered page alone.

Status: AHB / PSHB / PSFB / SRC diagnostic labels were cleaned up in the
2026-05 audit pass (see `WIZARDS_AUDIT_PLAN.md`). Inputs across all wizards
are clean. Audit any new wizard for the same; cryptic 1- or 2-letter
labels must not regress.

### 3.4c Tooltips on every input field

Every editable form field in a wizard MUST have a tooltip explaining what
the user is supposed to type. The mechanism is the project-wide
`v-tooltip` directive (Bootstrap-backed; already globally registered) plus
a centralised dictionary in `WebSharedComponents/assets/js/texts.js`.

**Step 1 — the dictionary.** Tooltips live in `tooltipsConverterWizards`
(at the bottom of `texts.js`), keyed by the `name=` value passed to the
`<Dimension>` / `<ElementFromList>` / `<DimensionReadOnly>` component.
Same field name across wizards reuses the same tooltip — that is by
design and prevents drift between wizards.

```js
// WebSharedComponents/assets/js/texts.js
export const tooltipsConverterWizards = {
    "switchingFrequency":   "Nominal switching frequency of the converter (the rate at which the main switches commute).",
    "magnetizingInductance": "Primary-side magnetizing inductance of the transformer.",
    // ... add new entries here when you add new field names ...
}
```

**Step 2 — the shared inputs already accept the prop.**
`Dimension.vue`, `ElementFromList.vue` and `DimensionReadOnly.vue` all
expose a `tooltip: { type: String, default: null }` prop and bind
`v-tooltip="tooltip"` on the label element. Nothing else to wire.

**Step 3 — the wizard imports and passes it.** Add the import once at
the top of the wizard `<script>`:

```js
import { tooltipsConverterWizards } from 'WebSharedComponents/assets/js/texts'
```

…then pass `:tooltip="tooltipsConverterWizards['<name>']"` next to the
existing `:name="'<name>'"` on every input:

```vue
<Dimension
    :name="'switchingFrequency'"
    :tooltip="tooltipsConverterWizards['switchingFrequency']"
    :replaceTitle="'Sw. Freq'"
    unit="Hz"
    ... />
<ElementFromList
    :name="'rectifierType'"
    :tooltip="tooltipsConverterWizards['rectifierType']"
    :replaceTitle="'Rectifier'"
    :options="rectifierOptions" ... />
```

**Rules:**

- Every editable field — `<Dimension>`, `<ElementFromList>`,
  `<CompactVoltageInput>` — MUST have a `:tooltip`. No exceptions.
- Diagnostic `<DimensionReadOnly>` rows MUST also have one — they are
  the most cryptic part of the page and the user has no other way to
  learn what each abbreviation means. Use the same dictionary keyed by
  the diagnostic's `name=` (e.g. `ahbCb`, `psfbDeadTime`, `dabD3`).
  Convention: prefix each name with the wizard's lowercase short name
  (`ahb*`, `psfb*`, `pshb*`, `dab*`, `llc*`, …) so all diagnostics for
  one wizard cluster together in the dictionary.
- If a wizard introduces a new `name=` not yet in the dictionary, you
  MUST add an entry. A missing key resolves to `undefined` and silently
  hides the tooltip — that is a correctness regression, not a styling
  detail. Add a `// TODO add tooltip` comment if you genuinely cannot
  write the description in the moment.
- The directive accepts `null` (renders nothing) — that is the safe
  default in the shared components. It does NOT mean "OK to leave
  blank in production".

**Verification:** open the wizard in the browser, hover any label;
within ~300 ms a tooltip with the dictionary text must appear. The
DOM marker is `.tooltip.bs-tooltip-auto.fade.show` (Bootstrap-backed).
A label that produces no tooltip on hover means either the dictionary
key is missing or the `:tooltip` binding was forgotten on that input.

### 3.4d Human-readable labels for camelCase enum dropdowns

Several backend enums (e.g. `centerTapped`, `fullBridge`,
`currentDoubler`, `ahbFlyback`, `continuousConductionMode`) are stored
as raw camelCase strings in the model. Showing them verbatim in a
`<select>` is unacceptable — users see "ahbFlyback" instead of
"AHB Flyback". The wizards solve this with the `optionLabels` prop on
`<ElementFromList>` and `<ElementFromListRadio>`.

**Mechanism.** Both shared components accept:

```js
optionLabels: { type: Object, default: null }
```

When provided, the `<option>` / `<label>` text becomes
`optionLabels[value] ?? value`, but the `:value` bound on the underlying
DOM element is still the raw enum key. The stored model value is
therefore unchanged — only the displayed label is humanised. Round-trip
load/save is preserved.

**Dictionary.** Display labels live in `dropdownLabelsConverterWizards`
in `WebSharedComponents/assets/js/texts.js`, grouped by dropdown
identity (NOT by wizard, so AHB / PSFB / PSHB share `rectifierType`):

```js
export const dropdownLabelsConverterWizards = {
    rectifierType: {
        centerTapped:   'Center-Tapped',
        fullBridge:     'Full Bridge',
        currentDoubler: 'Current Doubler',
        ahbFlyback:     'AHB Flyback',
    },
    pfcMode: {
        continuousConductionMode:    'Continuous (CCM)',
        'Critical Conduction Mode':  'Critical (BCM)',
        discontinuousConductionMode: 'Discontinuous (DCM)',
    },
    // ...
}
```

**Wiring.** Import once, pass the relevant sub-map:

```js
import { tooltipsConverterWizards, dropdownLabelsConverterWizards } from 'WebSharedComponents/assets/js/texts'
```

```vue
<ElementFromList
    :name="'rectifierType'"
    :tooltip="tooltipsConverterWizards['rectifierType']"
    :optionLabels="dropdownLabelsConverterWizards.rectifierType"
    :options="rectifierOptions" ... />
```

**Rules.**

- Do NOT rewrite the `*Options` array to pretty strings. The array
  contents are the persisted enum values; they must match what the
  backend / MAS schema expects. Fix the *display* layer only.
- Do NOT rely on `toTitleCase()` for these. It would render
  `ahbFlyback` as "Ahb Flyback" — wrong. Always use an explicit
  dictionary entry.
- A missing dictionary entry falls back to the raw key (so the
  dropdown still works) but is a regression — add the entry.
- Acceptable to leave as-is: arrays already populated with
  human-readable strings (`['No', 'Basic', 'Reinforced']`,
  `['SPS', 'EPS', 'DPS', 'TPS']`, etc.).

**Verification.** Open the wizard, open the dropdown, every visible
option must read as English (or an industry-standard abbreviation).
Then select an option and re-open the wizard — the persisted JSON must
still contain the raw camelCase key, not the pretty label.

### 3.5 Available slots in `ConverterWizardBase`

| Slot | Purpose |
|---|---|
| `header` | Override the entire header. Use the `wizard-header`, `wizard-header-content`, `wizard-icon-container` classes; put `data-cy="<dataTestLabel>-title"` on the title for tests. **DMC is currently the only wizard that overrides this.** |
| `design-mode` | Help-me / I-know radio group. Required on every isolated-converter wizard. Chokes (CMC, DMC) and CurrentTransformer (passive sensor) omit it. PFC was historically listed as exempt but now exposes the standard radio at `PfcWizard.vue:368`. AHB and PSHB previously omitted it (mode was implicitly always "I know") — both now match the DAB pattern. |
| `design-or-switch-parameters-title` | Title row above the I-know panel. |
| `design-or-switch-parameters` | Turns ratio, magnetizing/series inductance, rectifier type, etc. |
| `conditions` | Operating conditions (freq, mode, temp, efficiency, insulation). |
| `col1-footer` | Action buttons + error text. Use `action-btn-sm`, `action-btn-sm primary` / `secondary`, `error-text` classes. |
| `input-voltage` | The input-voltage card. Use `CompactVoltageInput`. Hide the entire card with `:showInputVoltage="false"`. |
| `outputs` | Number-of-outputs selector + per-output rows. Hide with `:showNumberOutputs="false"` for single-output wizards. |
| `diagnostics` | `DimensionReadOnly` rows. Convention: cache results in `<name>Diagnostics` data field; highlight bad margins with `:textColor="value <= 0 ? 'text-warning' : ..."`. |
| `waveform-controls` | Extra controls in the waveform header. |
| `waveforms` | Override the entire waveform area (rarely needed). |
| `col3-extra` | Extra content under col 3. CMC/DMC mount `EmiSpectrumView` here with props `mode: 'cm'\|'dm'`, `switchingFrequency`, `voltageSwing`, `parasiticCap_pF`, `dvdt_V_ns`, `inductance`, `capacitance`, `lineImpedance`, `regulatoryStandard`, `forceUpdate`. |

### 3.6 Available props on `ConverterWizardBase`

`title`, `titleIcon`, `subtitle`, `col1Width`, `col2Width`, `col3Width`,
`showInputVoltage`, `showNumberOutputs`, `magneticWaveforms`,
`converterWaveforms`, `waveformViewMode`, `waveformForceUpdate`,
`simulatingWaveforms`, `waveformError`, `waveformSource`, `errorMessage`,
`numberOfPeriods`, `numberOfSteadyStatePeriods`, `showPeriodsSelector`,
`showSteadyStateSelector`, `disableActions`, `showSpiceCodeButton`.

### 3.7 Events emitted by `ConverterWizardBase`

`update:waveformViewMode`, `update:numberOfPeriods`,
`update:numberOfSteadyStatePeriods`, `get-analytical-waveforms`,
`get-simulated-waveforms`, `get-spice-code`, `dismiss-error`.

### 3.8 Store interactions: MAS reset and navigation categories

The first lines of every `process()` are:

```js
this.masStore.resetMas("<category>");
this.$stateStore.closeCoilAdvancedInfo();   // ← always called, never documented before
```

The category string and the navigate-* "category" arg are coupled to which
section opens in `magnetic_tool`:

| Wizard family | `resetMas(arg)` | `navigateToReview / Advise(..., category)` |
|---|---|---|
| Isolated SMPS converter (DAB, PSFB, PSHB, Flyback, …) | `"power"` | `"Power"` |
| Common-mode choke (CMC) | `"power"` | `"CommonModeChoke"` |
| Differential-mode choke (DMC) | `"dmc"` | `"Filter"` |

Pick from existing sibling wizards; do not invent new strings without also
adding handling in the `magnetic_tool` view.

### 3.9 Styling and CSS class conventions

Every input is styled through the global `$styleStore.wizard.*` keys:
`inputFontSize`, `inputLabelFontSize`, `inputValueBgColor`,
`inputTextColor`, `addButton`, `removeButton`. Pass them on every
`Dimension` / `ElementFromList` / etc.

Required class names used by tests / theme:
- Headers: `wizard-header`, `wizard-header-content`, `wizard-icon-container`
- Buttons: `action-btn-sm`, `action-btn-sm primary`, `action-btn-sm secondary`
- Errors: `error-text`
- Compact rows: `compact-header`

### 3.10 Test data-cy fan-out convention

Playwright tests target inputs via `dataTestLabel + '-<FieldName>'`. Pass
`:dataTestLabel="dataTestLabel + '-FieldName'"` to every input that a test
might address. Examples in CMC/DMC/Flyback. Without this convention the
existing test runner's selectors won't match.

When you override `#header`, also set `data-cy="<dataTestLabel>-title"` on
the title element so navigation tests still locate the wizard.

> ⚠️ **Known gap:** The newer SMPS wizards (DAB, LLC, PSFB, PSHB, AHB)
> currently thread `dataTestLabel` only to `CompactVoltageInput`. Other
> inputs in those wizards emit `data-cy="-container"` / `"-title"` (no
> prefix), so Playwright selectors built from `dataTestLabel + '-FieldName'`
> resolve only for `InputVoltage`. New wizards must follow the older
> CMC/DMC/Flyback pattern of fanning the prefix out to **every** input.

---

## 4. Mount the wizard in the router view

File: `src/views/Wizards.vue`

1. Add an `import` line.
2. Add a conditional render block:
```vue
<YourWizard
  v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.YourConverter"
  :dataTestLabel="'YourWizard'"
/>
```

---

## 5. Add the landing-page entry

File: `src/views/WizardsLanding.vue`

1. A method:
```js
async onYourWizard() {
  this.$stateStore.resetMagneticTool();
  this.$stateStore.selectWorkflow("design");
  this.$stateStore.selectWizard(this.$stateStore.Wizards.YourConverter);
  await this.$nextTick();
  await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
},
```
2. A button in the topology grid that calls `onYourWizard`.

---

## 6. Add the header menu link

File: `src/components/Header.vue`

The header **Wizards** dropdown is the primary entry point users have for
reaching a wizard. A wizard that is implemented but not registered in this
dropdown (or registered but `:disabled="true"`) is effectively invisible to
end users — Playwright tests targeting the link will also fail. Always add
an `<li><button>` entry inside the `<ul class="dropdown-menu px-3">` block:

```html
<li>
    <button
        data-cy="<Name>-link"
        :class="headerTogglerIsVisible ? 'w-100' : 'mx-0'"
        class="dropdown-item btn btn-block nav-link px-2"
        @click="onWizards($stateStore.Wizards.YourConverter)"
        @mouseenter="hoveredWizard = '<Name>'"
        @mouseleave="hoveredWizard = null"
    >
        <i class="me-2 bi bi-<icon>"></i>{{'<Display Name> Wizard'}}
    </button>
</li>
```

Rules:

- **No `:disabled="true"`** on a wizard that is actually working. The
  attribute is only acceptable for wizards that are intentionally hidden
  from production (e.g. work-in-progress); in that case add a `// TODO`
  comment next to it explaining why.
- The `data-cy` value is what Playwright tests target — it must be unique
  across the whole header. Convention is `<Name>-link` (e.g. `Dab-link`,
  `Llc-link`). A few legacy entries use `<Name>-CommonModeChoke-link`;
  prefer the shorter form for new wizards.
- The `@click` handler must point at the matching `$stateStore.Wizards.<Key>`
  enum entry. A typo here silently navigates to the wrong wizard.
- After saving, manually verify in the browser that:
  1. Opening the **Wizards** dropdown shows your entry.
  2. The entry is **not greyed out** (not disabled).
  3. Clicking it routes to `/wizards` and mounts the correct component
     (check the page's `data-cy` prefix).

---

## 7. Run the build

```bash
npm run build
```

It must finish with **zero errors**. Build-time errors are almost always
missing imports, unmatched slot names, or template syntax mistakes.

---

## 8. Smoke-test in the browser

1. `npm run dev`, open the page, click the new wizard.
2. In the browser console, watch for:
   - `Exception ...` strings (indicates C++ rejected the JSON).
   - Vue warnings about missing props or unknown slots.
3. Test, in order:
   - Type a valid set of inputs in *Help-me* mode → click **Get Analytical Waveforms** → graph appears.
   - Click **Get Simulated Waveforms** → graph updates, takes longer.
   - Toggle *magnetic ↔ converter* view in the waveform header.
   - Switch to *I-know* mode → extra Transformer panel appears.
   - Increase **Number of Outputs** → extra rows appear and waveform regenerates.
   - **Get SPICE Code** → modal opens with non-empty netlist.
   - **Review Specs** and **Design Magnetic** → navigation succeeds.

---

## 8a. Verify the converter waveforms actually come from MKF

A wizard that *renders* a chart is not a wizard that is *correct*. Every
wizard MUST be verified end-to-end against MKF: the JS sends well-formed
parameters → MKF returns operating points + converter waveforms → the
visualizer plots them. Skipping this step is how the PSFB stale-buffer bug
and the DMC-period scaling bug both shipped.

### 8a.1 The data flow (read this first)

```
buildParams(mode)                                  ← wizard
   │
   ▼
executeWaveformAction(wizard, mode)                ← ConverterWizardBase
   │   adds aux.numberOfPeriods (and numberOfSteadyStatePeriods if simulation)
   ▼
getCalculateFn() / getSimulateFn()                 ← wizard
   │
   ▼
taskQueueStore.{calculate|simulate}<Topology>…    ← src/stores/taskQueue.js
   │   JSON.stringify(params) → mkf.<topology>_… → JSON.parse(result)
   ▼
processWaveformResults(...)                        ← ConverterWizardBase
   │   processAnalyticalWaveforms / processSimulationWaveforms
   │   buildMagneticWaveformsFromInputs / convertConverterWaveforms
   ▼
wizard.magneticWaveforms / wizard.converterWaveforms
   │
   ▼
ConverterWaveformVisualizer (chart in the page)
```

The **only** place numbers are invented on the JS side is `buildParams`.
Everything from there on is pass-through transformation. If the chart looks
wrong, the bug is almost always in `buildParams` (wrong field name, wrong
units, missing knob) — not in the visualizer.

### 8a.2 Mandatory in-browser verification per wizard

Open DevTools **before** clicking any button. With the wizard open in
*Help-me* mode and known inputs:

1. **Watch the network/worker console.** A successful MKF call logs nothing
   on its own. An *unsuccessful* one prints `Exception … from MKF` or a
   `WebAssembly` trap. Any such message → stop and fix; do **not** ship a
   wizard that throws into the console even if the chart still appears.

2. **Inspect the raw MKF result.** Add a temporary log at the wizard's
   `getSimulateFn` (or in the matching `taskQueue.js` action) and confirm
   the returned object has the expected shape:

   ```js
   // analytical: { operatingPoints: [...], designRequirements: {...} }
   // simulation: { converterWaveforms: [...], inputs: { operatingPoints, designRequirements } }
   //         or  { converterWaveforms: [...], operatingPoints, designRequirements }
   ```

   `processSimulationWaveforms` throws "Simulation did not return operating
   points" or "No magnetic waveforms were generated…" if the shape is off.
   Those errors land in `wizard.waveformError` and show as a red banner,
   not as a silent failure — but you must still confirm the banner does
   NOT appear during a normal happy-path run.

3. **Sanity-check the magnetic waveforms.** For typical SMPS inputs the
   primary current must be triangular (CCM) or trapezoidal (DCM); the
   primary voltage must be square. If you see a flat line, a single spike,
   or NaN → the params sent to MKF are wrong (wrong field name, wrong
   unit, missing winding). Compare against DAB / Flyback as the golden
   reference.

4. **Sanity-check the converter waveforms.** Toggle the *converter view*
   and confirm input/output voltage and current waveforms exist for every
   operating point. A missing trace usually means MKF returned `null` for
   that field — which is itself a real bug to file against MKF, not to
   paper over with `?? 0` or `?? []` in the JS.

5. **Period-count test.** Set **Number of Periods** to 1 → run analytical
   → count visible periods on the chart. Set to 4 → run again → count
   again. The ratio MUST be exactly 4×. If it is 1× or 8×, the
   `numberOfPeriods` knob is not being threaded through to MKF (1×) or is
   being applied twice — once by MKF and once in JS via a stale
   `repeatWaveformForPeriods` (8×). The JS must NOT re-tile the result;
   `processAnalyticalWaveforms` has the warning comment about this.

6. **Steady-state test (simulation only).** Set **Steady-State Periods**
   to 1 → run simulation; bump to 5 → run again. The waveform shape
   should converge (overshoots damp out) but the period count visible on
   screen stays at `numberOfPeriods`. If the period count *also* changes,
   the simulator is conflating the two knobs.

7. **Forced-update check.** Click **Get Analytical Waveforms** twice in
   a row with identical inputs. The chart MUST visibly redraw (subtle
   flicker) the second time — confirming `forceWaveformUpdate` is wired
   through. If it doesn't, the visualizer is caching and downstream
   inductance / loss calculations will be stale.

8. **MAS round-trip.** After a successful run, click **Review Specs**
   and confirm the operating points appear in the magnetic_tool. Empty
   operating points there means `assignResultsToMasStore` got an empty
   array, which means MKF returned no operating points — back to step 2.

### 8a.3 Cross-check against MKF directly

For any non-trivial new topology, do this once before declaring victory:

1. Open `WebLibMKF/src/libMKF.cpp` and confirm the embind binding for
   your `simulate_<topology>_…` function exists, has the right return
   type, and matches the JSON shape you assume in `taskQueue.js`.
2. Run the matching MKF unit test (`MKF/tests/test<Topology>.cpp` or the
   equivalent) and confirm it passes against the same numerical inputs
   you typed in the wizard. Different numbers in the test vs the wizard
   → one of them is wrong.
3. If you changed C++ to support the new wizard, follow the WASM rebuild
   workflow in `AGENTS.md` (build WebLibMKF, copy the WASM to **both**
   `src/assets/js/` and `MagneticBuilder/src/assets/js/`).

### 8a.4 Add an automated waveform regression test

Once verified manually, lock it in. Pattern: `tests/dmc-battery.spec.js`
for analytical/simulation period scaling, `tests/llc-psfb-battery.spec.js`
for happy-path SPICE generation. The test must:

- Drive the wizard via `data-cy` selectors only (no `nth-child`).
- Click **Get Analytical Waveforms** AND **Get Simulated Waveforms**.
- Assert the canvas/SVG actually rendered series (e.g. inspect
  `wizard.magneticWaveforms.length > 0` via `page.evaluate`).
- For period-sensitive topologies, run with two different
  `numberOfPeriods` values and assert the ratio.

A wizard with no waveform regression test is one PR away from silently
going back to a flat-line chart.

### 8a.5 Audit the SPICE probe choices for converter & magnetic views

Even when the chart renders and the period count is right, the *traces*
themselves can be lies. This is a backend (`MKF/src/converter_models/*.cpp`)
concern, but every wizard author has to verify it because the symptoms only
show up in the rendered chart. The pattern that bit the AHB wizard (and is
present in PSFB, PSHB, Cllc, LLC, DAB, PushPull, ActiveClampForward,
SingleSwitchForward, TwoSwitchForward, IsolatedBuckBoost, IsolatedBuck and
Buck as of this writing) has three flavours:

**(A) Input Voltage must be the DC source rail, not a tank node.**

Wrong: probing `vab`, `v(sw)`, `pri_trafo_in`, or any node downstream of a
series capacitor / leakage / resonant inductor. These all *include* tank
ringing or DC-blocking-cap voltage and look nothing like an input rail.

Right: probe the actual DC voltage source you wired into the netlist, e.g.
`v(vin_dc)`. Add a `.save v(vin_dc)` and read it via `getWfm("v(vin_dc)")`.
For half-bridge / full-bridge inputs that means inserting a real DC rail
node even if the topology lets you collapse it.

**(B) Input Current must be a clean source ammeter, not a tank-loop branch.**

Wrong: probing `vpri_sense#branch` when `Vpri_sense` is in a loop with a
DC-blocking or resonant capacitor. The cap forces the average to zero, so
the displayed input current oscillates around 0 and bears no resemblance to
the actual draw from the supply.

Wrong-2: probing `i(Vdc)` when ngspice's idealized switch model dumps
nanosecond di/dt spikes through the supply (200 kA artifacts).

Right: insert a dedicated zero-volt sense source **upstream of the
high-side switch** (e.g. `Vq1_sense vin_dc q1_drain 0`, then route `S1`
through `q1_drain`). Probe `i(Vq1_sense)` and **clamp** it to a physical
bound such as `±2 · max|i(Vpri_sense)|` to suppress the ngspice SW-model
idealization spikes. Document the clamp in the extractor comment so
future readers know it is a numerical guard, not data.

**(C) Magnetic winding voltages must be true differential probes,
never lumped tank, never post-rectifier DC.**

Wrong-1 (primary): probing `v(sw) − v(pri_top)` lumps the DC-blocking cap
+ leakage inductance + magnetizing inductance into the displayed "primary
winding voltage". You see a slowly-rising ramp with cap charging instead
of the bipolar square the magnetic component actually sees.

Wrong-2 (secondary, center-tap / full-bridge / current-doubler): probing
`out_node` (the post-rectifier filter-cap node) shows the +12 V DC bus,
not the bipolar square at the secondary winding terminals.

Right: add a dedicated differential E-source per winding that copies the
*winding-only* node-to-node voltage to a probe-only node, e.g.

```spice
Evpri_w     vpri_w     0  sw       pri_dot   1
Evsec_a_w   vsec_a_w   0  sec_a    sec_ct    1
Evsec_b_w   vsec_b_w   0  sec_b    sec_ct    1
```

`.save` those nodes and have the extractor publish them as the magnetic
winding voltages. The DAB extractor (golden) and the post-fix AHB
extractor (`MKF/src/converter_models/AsymmetricHalfBridge.cpp` ~line 2008)
are the references.

**Audit checklist for any new wizard:**

1. Open the C++ extractor and trace every waveform written into the result
   to the exact `.save`d node it came from.
2. Confirm Input V is the DC source rail node.
3. Confirm Input I is a sense-source branch upstream of the topology's
   first switch, with a documented physical clamp.
4. Confirm each magnetic winding voltage is a differential E-source probe
   reading exactly the two terminals of that winding — nothing more.
5. Add a manual screenshot test (Playwright headless OK) that asserts the
   primary-winding voltage is bipolar and the input voltage is flat to
   within 1 % of the entered DC value over the visible window.

**Known-clean references:** `Boost.cpp`, `Flyback.cpp`, post-fix
`AsymmetricHalfBridge.cpp`, partially `Dab.cpp` (Input V correct,
Input I still has the cap-loop bug as of this writing).

---

## 9. Add Playwright tests

Pattern: `tests/llc-psfb-battery.spec.js` is a good model. For each
wizard:

- Group A: open from header (uses `data-cy="<Name>-link"`).
- Group B: `Help-me` mode end-to-end.
- Group D: `I-know` mode end-to-end.
- Group E: multi-output.
- Group F: SPICE code generation.
- Group G: error paths (invalid inputs).

Run:
```bash
npx playwright test tests/<your-spec>.spec.js
```

---

## 10. Things that have bitten people (avoid)

1. **Forgetting `:waveformViewMode` / `@update:waveformViewMode`** — the
   toggle silently no-ops. Found on PSFB during review.
2. **Forgetting `:waveformForceUpdate` and the `forceWaveformUpdate` data
   field** — the chart can stale on re-runs that produce identical axis
   bounds.
3. **Sending defaults the user didn't enter** — violates the project's
   "no fallbacks, no defaults, no silent shortcuts" rule. Only send a knob
   when the user provided it AND the mode requires it.
4. **`numberOfSteadyStatePeriods`** — `1` is fine for fast converters; bump
   it only when the simulator needs many periods to settle. Every current
   wizard initializes it to `1`.
5. **Confusing per-output `turnsRatio`** with the legacy single-winding
   `turnsRatio`. New code uses the per-output array; the single one in the
   *I-know* panel is preserved only for backward compatibility with old MAS
   payloads. Keep both for parity with DAB unless you also clean DAB up.
6. **Missing topology in `MAS.ts`** — `getTopology()` will return `undefined`
   and `setupMasStore` will crash silently in console.
7. **Wrong `IsolationSide` count** — must match the number of windings the
   backend produces, otherwise `setupMasStore` writes garbage. Chokes use
   lowercase strings (`'primary'`); converters use the `IsolationSide` enum.
8. **`buildParams` returning `undefined`** — `processWizardData` will throw
   `Wizard must implement buildParams() or buildInputs()`. Always return an
   object.
9. **Forgetting `closeCoilAdvancedInfo()`** at the top of `process()` — the
   right column of the advise/review page can open with stale coil details
   from the previous run. Currently every wizard has it; keep the regression
   guard in mind.
10. **Mismatched `resetMas` / navigate category strings** — wrong magnetic_tool
    section opens (or none does). Copy from the closest sibling, don't invent.
11. **Paraphrasing `'Help me with the design'` / `'I know the design I want'`** —
    they are compared as raw strings in many places. Keep the exact text.
12. **Field name collision** — `designLevel` vs `designMode`. Older choke
    wizards use `designLevel`; newer SMPS wizards use `designMode`. Pick one
    consistently.
13. **Non-unique HTML `id=`** on shared checkboxes (e.g. `useLeakageInductance`
    used to collide between DAB and PSFB on the same page). Always suffix the
    id with the wizard name (`useLeakageInductanceDab`, `useLeakageInductancePsfb`,
    `useLeakageInductancePshb`, `useLeakageInductanceAhb`).
14. **`getInsulationType()` returning `'No'` instead of `null` for chokes** —
    `null` is correct; `'No'` may still wire up an insulation block.
15. **`buildOperatingPoint` missing `switchingFrequency` / `ambientTemperature`
    inside the op-point** — backend requires them at *both* top-level and
    inside each operating point.
16. **`updateNumberOutputs` missing on a multi-output wizard** — the
    Number-of-Outputs dropdown becomes a no-op (the array doesn't grow).
17. **Wizard implemented but not in the header dropdown, or registered as
    `:disabled="true"`** — the wizard is unreachable for users even though
    it works. Real examples found in audit: PSFB was left `:disabled="true"`
    after going live; PSHB and AHB were never added to the dropdown at all.
    Always add an enabled `<li><button>` to `Header.vue`'s wizards menu
    (see §6) and verify it appears + is clickable in the browser.
18. **"Chart appears, must be working"** — false. A chart appears as long as
    JS produces *any* series data; it says nothing about whether MKF was
    called, whether the right MKF function was called, or whether MKF
    returned the right shape. Always run the §8a checks (raw-result log +
    period-count ratio + steady-state convergence + MAS round-trip) before
    declaring a wizard done. Bugs caught by this in production: PSFB
    converter waveforms going stale on re-runs; DMC `numberOfPeriods` not
    threading through to MKF; analytical waveforms being re-tiled in JS
    *and* in MKF, doubling the period count.
19. **Wrong "Input Voltage" probe in the converter view** — probing a tank
    node (`vab`, `v(sw)`, `pri_trafo_in`) or any node downstream of a
    series cap / leakage L instead of the DC supply rail. Symptom: input
    voltage shows ringing, ramps, or values that drift far from the
    entered Vin. Fix: probe the actual DC source node (`v(vin_dc)` or
    equivalent). Found in AHB, PSFB, PSHB, Cllc, LLC, PushPull and
    several others; see §8a.5.
20. **Wrong "Input Current" probe — averages to zero** — probing
    `vpri_sense#branch` when that ammeter is in series with a DC-blocking
    or resonant cap. The cap forces zero average; the displayed input
    current is the AC tank current and is not what the supply sees. Fix:
    insert a dedicated zero-V sense source upstream of the high-side
    switch (`Vq1_sense vin_dc q1_drain 0`), route the switch through the
    new node, and clamp the result against ngspice SW-model di/dt spikes.
    See §8a.5 and the post-fix AHB extractor.
21. **Cryptic 1- or 2-letter field labels** — `Lk L`, `Cb`, `Co`, `Eff`,
    `Insul`, `D`, `Fs`. Forbidden — see §3.4b. Use full names or normal
    abbreviations (`Leakage Inductance`, `Clamp Capacitance`, `Output
    Capacitance`, `Efficiency`, `Insulation`, `Duty Cycle`, `Switching
    Frequency`).
22. **ngspice SW-model di/dt spikes contaminating Input Current** — the
    idealized voltage-controlled switch model produces unphysical
    nanosecond current spikes (10⁵ A range) at switching transitions,
    which dominate any auto-scaled chart and make the real waveform
    invisible. Fix: clamp the extracted input-current samples against a
    physical bound derived from the primary current
    (`±2 · max|i(Vpri_sense)|`) before publishing them. Document the
    clamp in code so it is not mistaken for measured data.
23. **Magnetic winding voltage = lumped tank or post-rectifier DC bus** —
    the magnetic view's primary voltage must be the voltage *across the
    winding alone*, not across (cap + leakage + winding); the secondary
    voltage must be the bipolar AC at the winding terminals, not the
    post-rectifier filter-cap node. Use a per-winding differential
    E-source probe (`Evpri_w`, `Evsec_a_w`, …) and save those probe-only
    nodes. See §8a.5.
24. **Field has no tooltip** — every editable input MUST have
    `:tooltip="tooltipsConverterWizards['<name>']"` AND a corresponding
    entry in the dictionary in `WebSharedComponents/assets/js/texts.js`.
    A missing dictionary key silently resolves to `undefined` and the
    tooltip never appears — caught only by hover-testing every label
    in the browser. See §3.4c.
25. **Dropdown shows raw camelCase enum** — backend enums like
    `centerTapped`, `ahbFlyback`, `continuousConductionMode` must NOT
    be displayed verbatim. Pass `:optionLabels="dropdownLabelsConverterWizards.<group>"`
    to `<ElementFromList>` / `<ElementFromListRadio>`; the prop swaps
    the *displayed* text only (the bound `:value` and the persisted
    model value remain the raw enum key). Do NOT pretty-print the
    `*Options` array — that breaks the round-trip with the backend.
    Do NOT use `toTitleCase()` either — it produces "Ahb Flyback".
    See §3.4d.
26. **Empty card because the wizard didn't fill the slot** — in
    `ConverterWizardBase.vue`, every slot wrapper that the wizard might
    omit MUST be guarded with `v-if="$slots['<slot-name>']"` (see the
    `design-or-switch-parameters` block as the canonical example, line
    ~1058). The `design-mode` card was missing this guard and rendered
    an empty "Design Mode" box for AHB/PSHB. The right fix when you
    notice an empty card is BOTH: (a) add the `v-if` guard in the base
    so the card doesn't render at all, AND (b) ask whether the wizard
    *should* have been supplying the slot in the first place — an empty
    card is often the symptom of an unfinished wizard, not just a
    cosmetic glitch (see WIZARDS_GUIDE.md history: AHB and PSHB silently
    operated in "I know the design" mode for months because nobody
    questioned the empty card).
    **Guarded slots in `ConverterWizardBase.vue` as of this audit:**
    `design-mode` (~1050), `design-or-switch-parameters` (~1059),
    `conditions` (~1069), `input-voltage` (~1088, via `showInputVoltage`
    prop), `outputs` (~1097), `diagnostics` (~1106). All eleven slot
    sites either render conditionally or have no wrapper card. If you
    add a new slot with a wrapper card, it MUST follow the same
    `v-if="$slots['...']"` pattern.

---

## 10a. Converter probe-correctness audit (current status)

Status of the §8a.5 audit across every converter as of this writing.
"Bug" = matches one of the bug families A/B/C in §8a.5 and needs the
same treatment AHB received in `MKF/src/converter_models/AsymmetricHalfBridge.cpp`.

| Converter | Input V | Input I | Magnetic winding V |
|---|---|---|---|
| `Boost` | clean | clean | n/a (non-isolated) |
| `Flyback` | clean | clean | clean |
| `AsymmetricHalfBridge` | **fixed** (`v(vin_dc)`) | **fixed** (`Vq1_sense` + clamp) | **fixed** (`Evpri_w`, `Evsec_*_w`) |
| `Dab` | clean (`vin_dc1`) | **fixed** (`Vq1_sense`+`Vq3_sense` summed; clamped; bidirectional sign flips naturally) | clean (already differential — `Evab` + `Bvsec_o<i>_diff`) |
| `PhaseShiftedFullBridge` | **fixed** (`v(vin_dc)`) | **fixed** (`Vq1_sense` + clamp; covers SW1 and BEHAVIORAL_PULSE modes) | **fixed** (`Evpri_w`, `Evsec_w_o<i>`) |
| `PhaseShiftedHalfBridge` | **fixed** (`v(vin_dc)`) | **fixed** (`Vq1_sense` + clamp; SW1 and BEHAVIORAL_PULSE modes) | **fixed** (`Evpri_w`, `Evsec_w_o<i>`) |
| `Cllc` | clean (`v(vin_p)` — already DC rail) | **fixed** (`Vq1_sense` + `Vq3_sense` summed; clamped) | **fixed** (`Evpri_w`, `Evsec_w`; works both power-flow directions) |
| `Llc` | **bug A** (synthetic disconnected `Vdc_supply` w/ 1 MΩ) | **bug B** (tank current avg 0) | check |
| `PushPull` | clean (already `Vin vin_dc 0`) | **fixed** (single center-tap ammeter `Vct_sense` captures sum of both half-winding draws; clamped) | clean (already differential B-sources / electrically-grounded center tap) |
| `ActiveClampForward` | clean (`v(vin_dc)`) | **fixed** (`Vq1_sense`; clamp branch doesn't touch `vin_dc`) | clean (`Lpri` winding-to-ground) |
| `SingleSwitchForward` | clean (`v(vin_dc)`) | **fixed** (`Vq1_sense`; demag-return D bypasses ammeter) | clean (`Lpri` winding-to-ground) |
| `TwoSwitchForward` | clean (`v(vin_dc)`) | **fixed** (`Vq1_sense`; D1/D2 bypass) | **fixed** (`Evpri_w` — `pri_gnd` floats between 0 and Vin) |
| `IsolatedBuckBoost` | clean | **fixed** (`Vq1_sense` — template consistency; prior `i(Vin)` was numerically equivalent) | clean (`Lpri` winding-to-ground) |
| `IsolatedBuck` | clean | **fixed** (`Vq1_sense` — template consistency) | clean (`Bvpri_diff`; secondaries winding-to-GND) |
| `Buck` | clean | **fixed** (`Vq1_sense` — separates S1 from snubber loop) | n/a |

**Status (2026-05-23 sweep):** queue completed. Every converter in the
table now has §8a.5-compliant probes. The standard fix pattern is
encoded as: dedicated `Vq*_sense` zero-V sense source upstream of each
input-side switch, summed in the extractor with a `±2·max|i(Vpri_sense)|`
clamp documented as a numerical guard against ngspice SW-model di/dt
spikes; differential `Evpri_w` / `Evsec_w_o<i>` E-source winding probes
when the bare-node mapping would lump tank or floating-ground offsets.
The post-fix `AsymmetricHalfBridge.cpp` remains the canonical template
for any future converter additions.

---

## 11. Quick file-touch checklist for a new wizard

- [ ] `MKF/src/converter_models/<X>.{h,cpp}` (backend logic)
- [ ] `WebLibMKF/src/libMKF.cpp` (embind bindings)
- [ ] Build & copy WASM to both `src/assets/js/` and `MagneticBuilder/src/assets/js/`
- [ ] `WebSharedComponents/assets/ts/MAS.ts` (`Topologies.<X>`)
- [ ] `src/stores/state.js` (`Wizards.<X>`)
- [ ] `src/stores/taskQueue.js` (calculate / simulate methods; chain extra
      methods inside `getCalculateFn` if your backend needs propose+calculate)
- [ ] `src/components/Wizards/<X>Wizard.vue`
  - [ ] Pick the right family (multi-out converter / single-out / choke /
        multi-topology / Flyback-style) and copy the closest sibling.
  - [ ] `forceWaveformUpdate: 0` in `data()`.
  - [ ] All required contract methods present (see §3.3 table).
  - [ ] `getInsulationType()` returns `null` for chokes.
  - [ ] `:waveformViewMode` + `:waveformForceUpdate` props bound on base.
  - [ ] `dataTestLabel` fanned out as `dataTestLabel + '-Field'` to every input.
  - [ ] `process()` calls `resetMas("...")` AND `closeCoilAdvancedInfo()`.
  - [ ] `processAndReview` / `processAndAdvise` use the right category string.
  - [ ] Unique HTML `id=` on every checkbox (suffix with wizard name if shared).
- [ ] `src/views/Wizards.vue` (mount it; for multi-topology wizards, mount once
      per `:converterName` value).
- [ ] `src/views/WizardsLanding.vue` (landing button + handler).
- [ ] `src/components/Header.vue` — add an `<li><button>` inside the
      `<ul class="dropdown-menu px-3">` of the **Wizards** dropdown, with
      `data-cy="<Name>-link"`, the right `$stateStore.Wizards.<Key>` enum,
      and **without** `:disabled="true"`. Open the dropdown in the browser
      and confirm the entry is visible and clickable (not greyed out).
- [ ] `tests/<x>.spec.js` (Playwright coverage; uses the `data-cy` selectors).
- [ ] `npm run build` passes.
- [ ] Manual smoke test in browser:
  - [ ] Open the **Wizards** dropdown in the header, confirm the new entry
        appears, is **enabled** (not greyed out), and clicking it opens the
        wizard.
  - [ ] Help-me end-to-end → Analytical waveforms appear.
  - [ ] Simulated waveforms appear.
  - [ ] **Verify against MKF (see §8a):** raw MKF result has the expected
        shape; analytical and simulation both produce non-empty
        `magneticWaveforms` and `converterWaveforms`; doubling
        `numberOfPeriods` doubles the visible period count exactly;
        re-clicking the action redraws the chart (forced-update wired);
        Review Specs shows the operating points in magnetic_tool.
  - [ ] Magnetic ↔ Converter view toggle works (the PSFB bug check).
  - [ ] **Probe audit (see §8a.5):** Input Voltage trace is flat at the
        entered DC value (not a tank node); Input Current trace looks like
        a real supply draw (not a zero-mean tank current, no
        100-kA-range spikes); each magnetic winding voltage is bipolar AC
        across that winding alone (not lumped tank, not the post-rectifier
        DC bus). Cross-check the C++ extractor uses dedicated `.save`d
        probe nodes (`v(vin_dc)`, `Vq1_sense#branch`, `v(vpri_w)`,
        `v(vsec_*_w)`) — never raw tank or filter-cap nodes.
  - [ ] All field labels are full names or standard abbreviations (no
        cryptic 1- or 2-letter labels — see §3.4b).
  - [ ] Every editable input has `:tooltip="tooltipsConverterWizards['<name>']"`
        AND a matching entry in the dictionary in
        `WebSharedComponents/assets/js/texts.js`. Hover every label in
        the browser to confirm the tooltip actually appears (see §3.4c).
  - [ ] I-know mode reveals the Transformer panel.
  - [ ] Multi-output: changing Number of Outputs grows/shrinks the rows.
  - [ ] SPICE Code button opens a modal with non-empty netlist.
  - [ ] Review Specs and Design Magnetic both navigate to `magnetic_tool`
        with the correct category section open.

---

## 12. Recently added wizards (May 2026)

Three converter/measurement wizards added in the catalog-parity pass — see
`MISSING_WIZARDS_PLAN.md` §7 for the full status table. Use them as
templates for the patterns they introduce:

- **`SrcWizard.vue`** — Series Resonant Converter. Resonant family
  (`Llc`/`Cllc`/`Clllc` siblings). Demonstrates `rectifierType` +
  `useSynchronousRectifier` variant selectors hooked into a single MKF
  calculate/simulate path (`calculate_src_inputs` /
  `simulate_src_ideal_waveforms`). Two-winding isolated transformer when
  `isolated=true`, otherwise single inductor.

- **`ViennaWizard.vue`** — 3-phase 3-level Vienna PFC. New "Three-Phase
  PFC" submenu in the header. **Convention: Phase A only.** The wizard
  displays a single-phase view labelled "per-phase, identical by symmetry"
  because the 3-phase Vienna is balanced. Send `phaseCount: 1` to MKF
  (= interleaving count per leg, NOT grid phase count); the grid is
  hard-coded as 3 in the UI label. Variant / switchType / samplingStrategy
  selectors are exposed but MKF's Phase-1+2 implementation only accepts
  the default triplet (`viennaI` / `tType` / `peakOfLineOnly`); other
  combinations throw server-side, by design (no silent fallback).
  Analytical + SPICE both wired (`simulate_vienna_ideal_waveforms`); the
  SPICE path is a **single-phase emulation** (MKF `Vienna.h:173-184`
  FIXME-vienna-1: Phases B/C are 120° rotations of Phase A, not solved
  legs). Result diagnostics include
  `viennaDiagnostics.spiceMode = "singlePhaseEmulation"` so the UI can
  badge the limitation. Full 3-phase netlist deferred.

- **`CurrentTransformerWizard.vue`** — passive measurement magnetic. New
  "Measurement" submenu in the header. **Has no design-mode toggle**
  (passive sensor — no "Help me design"/"I know the design" split — the
  only design lever is the turns ratio). Uses MKF
  `process_current_transformer`. `iKnowMode: false` in the catalog;
  `simulated: false` (no SPICE). Wires through `Topologies.CurrentTransformer`
  and calls `masStore.resetMas("power")` (the store accepts only
  `power|filter|dmc`; "measurement" is a UI grouping only).

The plan doc (`MISSING_WIZARDS_PLAN.md` §7) lists the deferred variant
selectors (CLLC / CLLLC / Flyback / IsolatedBuckBoost / PFC / FSBB) — pick
one up by following the `LlcWizard.vue` `rectifierType` pattern: add the
field to MKF `Advanced<X>::{from,to}_json`, expose a radio in the wizard,
include in `buildParams`. Rebuild WASM and copy to both asset dirs.
