# MKF bug reports from WebFrontend CMC flow

Investigation date: 2026-04-19. All data below was captured live by reading the Pinia masStore after a CMC wizard → Design Magnetic → Advise Core → Advise all Wires flow.

Repro MAS (CMC wizard default): 230 V nominal, 5 A line current, 50 Hz line frequency, 150 kHz / 1 kΩ impedance requirement. The adviser picked T 20/10/10, TDK, N87.

---

## Status summary (2026-04-20)

Fixes landed on MKF branch `fix/cmc-bugs` (pending merge to main):

| Bug | Status | Commit(s) |
|---|---|---|
| A — insulation sections summing > 360° | **fixed** | `fd49fc16` (regression test); resolved as a cascade effect of the material-filter + saturation-filter fixes below — once the adviser picks a core that goes through the CONTIGUOUS+POLAR `calculate_insulation` branch, insulation `dimensions[1]` is correctly set to a tape-thickness angle (e.g. 0.14°) instead of 360°. Wizard default now produces `C 179.49° / I 0.14° / C 179.49° / I 0.14°`, total 359.26°. |
| B — adviser picks power ferrite (N87) | **fixed** | `0b13b6ef` + `2d664780` + `3d7318a7` |
| C — identical +I current on both CMC windings → B >> Bsat | **fixed** | `ece1888c` — identical currents are correct per MKF dot convention; `get_common_mode_choke_magnetizing_current` drops the DC bias. `424221e8` replaces the "1% of line current" heuristic with a 100 mA physics-based default. |
| D — 4-winding (three-phase + neutral) CMC routed through multiport path | **fixed** | `8cfd73c7` extended `can_be_common_mode_choke` to size ∈ [2, 4] |
| E — transformer 1:1 stomp on pre-populated magnetizing current | **fixed** | `8cfd73c7` adds a `!primaryHasMagnetizingCurrent` guard around the CMC branch in `Inputs::process_operating_point` |
| F — N30 (27 W core losses) wins over A07 (6 mW) for default CMC | **fixed** | `3d7318a7` admits dual-use Signal-Processing materials with complex permeability into the Interference-Suppression pool, so A07-family and T37 become candidates |

Material filter now honors MAS's `application` tag (both `guess_material_application` and `check_material_application`), so future misclassifications are a data fix in MAS, not an MKF fix.

All six bugs in this report are fixed on `fix/cmc-bugs`. The OVERLAPPING+POLAR branch of `calculate_insulation` still writes `windingWindowAngle` into `dimensions[1]` by design (for a genuine radial-stacked toroid layout, a full-arc ring IS the correct geometry) — the original Bug A only manifested when that path ran for a CMC that should have gone CONTIGUOUS, and the upstream material-filter / saturation-filter changes now steer the adviser toward cores that take the CONTIGUOUS path.

---

## Bug A — `calculate_advised_coil` returns toroidal sections that sum to >> 360°

**Status:** FIXED on `fix/cmc-bugs`. The cascade of material-filter + saturation-filter fixes steers the adviser toward proper CMC cores (T37/N30/T38) that are processed through `calculate_insulation`'s CONTIGUOUS+POLAR branch — which correctly uses `wound_distance_to_angle(tapeThickness, windingWindowRadialHeight)` so insulation `dimensions[1]` is ~0.14° instead of 360°. Regression test `fd49fc16` pins the assertion. The OVERLAPPING+POLAR branch still writes `windingWindowAngle` into `dimensions[1]`, but that is geometrically correct for a genuine radial-stack layout and no longer activates for CMC toroidal flows.

**Observed (live, frontend pulled from masStore):**
```
sectionsDescription = [
  { type: "conduction", dimensions[1]: 311.28°, fillingFactor: 0.862 },
  { type: "insulation", dimensions[1]: 360.00° },
  { type: "conduction", dimensions[1]: 360.00°, fillingFactor: 0.753 },
  { type: "insulation", dimensions[1]: 360.00° }
]
Sum of angular extents = 1391.28°   (≈ 388% of a full turn)
```

**Expected:** for a toroid (`coil.bobbin.processedDescription.windingWindows[0].shape == "circular"`), `sum(sectionsDescription[i].dimensions[1]) ≤ 360°`. For a CMC (two windings contiguous) the natural physical layout is ≤ 180° per conduction section with two insulator arcs between them.

**Smoking gun: insulation sections have `dimensions[1] == 360°`.** The insulation size should be a small tape-thickness angle (tens of degrees at most), computed by `wound_distance_to_angle` in `calculate_insulation` / `calculate_mechanical_insulation`. Either:

- a different codepath is writing `windingWindowAngle` (the full 360°) into insulation `dimensions[1]` for this CMC case, **OR**
- `_insulationSections[...]` is being initialized with `dimensions[1] == windingWindowAngle` and never overwritten with the real tape-angle for this CMC flow.

**Where to look in MKF:**
- `src/constructive_models/Coil.cpp`
  - `calculate_mechanical_insulation` (lines 1491–1606) — produces a section with `dimensions[0] = windingWindowRadialHeight`, `dimensions[1] = tapeThicknessInAngle`. Verify this is called for CMC / toroidal with `WindingOrientation::CONTIGUOUS`.
  - `calculate_insulation` (line 1609+) — if this runs instead for the CMC case and hits a branch that passes `windingWindowAngle` as dimension[1] (e.g. line 1476 in the OVERLAPPING branch), that's the bug.
  - `wind_by_round_sections` (lines 3036–3322) — consumes `_insulationSections`. If the insulation dimensions are wrong here, the sum check from `e199814a` won't save us because the adviser doesn't see it.
- `src/advisers/CoilAdviser.cpp` — the adviser commit `e199814a` should reject wires that would overflow. Confirm it checks after `_insulationSections` is built, not before.

**Minimum regression test:** a single Catch2 test that calls `calculate_advised_coil` with a CMC MAS (two windings, `topology == "CommonModeChoke"`, toroidal `T 20/10/10` core) and asserts:
```cpp
double total = 0;
for (const auto& s : result.magnetic.coil.sectionsDescription) total += s.dimensions[1];
REQUIRE(total <= 360.0);
REQUIRE(result.magnetic.coil.sectionsDescription.size() == 4);
REQUIRE(std::count_if(begin, end, is_conduction) == 2);
```

---

## Bug B — `calculate_advised_cores` picks power ferrite (N87) for a CMC design

**Status:** FIXED on `fix/cmc-bugs` branch. `Core::check_material_application` (and `guess_material_application`) now respects the MAS `application` tag for Interference-Suppression queries. N87 is tagged Power, so it's excluded. Signal-Processing-tagged materials that ship complex-permeability data (ACME A-series, TDK T37/K10, Fair-Rite 61) are admitted as dual-use CMC candidates. Power ferrites (N87, 3C94, Fair-Rite 67/77/78) are correctly kept out.

**Observed:** with `topology == "CommonModeChoke"` and `isolationSides == [primary, primary]` (both windings same side, CMC), the adviser returns a T 20/10/10 in TDK **N87**. N87 has initial permeability ≈ 2200 and Bsat ≈ 0.495 T — it is a power-converter ferrite, inappropriate for CMC.

**Expected:** for CMC, restrict to high-µ materials (initial permeability ≥ ~5000). Typical materials are TDK VITROPERM 500F (nanocrystalline, µ_i > 20000), TP4A (µ_i ≈ 10000), etc.

**Root cause (likely):** `CoreAdviser::add_ferrite_materials_by_losses` (`src/advisers/CoreAdviser.cpp`, ~lines 2097–2174) filters materials by `Core::guess_material_application()` (POWER vs INTERFERENCE_SUPPRESSION) but does not special-case CMC topology for initial-permeability thresholds.

**Fix sketch:**
1. In `add_ferrite_materials_by_losses`, detect CMC: `inputs.get_design_requirements().get_topology() == Topology::COMMON_MODE_CHOKE`.
2. If CMC, filter `coreMaterialsToEvaluate` to `mat.get_permeability().get_initial().value_or(0) >= 5000` (threshold is heuristic — confirm with available materials in the stock database).
3. Fallback: if the filter empties the list (user database has no high-µ materials), fall back to the unfiltered list and emit a `log()` so the adviser doesn't silently return nothing.

**File/lines:** `src/advisers/CoreAdviser.cpp:2097–2174`. Check `src/advisers/CoreAdviser.h:195` (`get_advised_core`) to confirm topology is reachable from `inputs`. It is — `add_initial_turns_by_inductance()` (lines 1072–1079) already reads topology.

**Regression test:** extend `tests/TestTopologyCmc.cpp` with a case asserting the advised core uses a material whose initial permeability ≥ 5000.

---

## Bug C — CMC operating point has identical current on both windings (common-mode by default)

**Status:** FIXED on `fix/cmc-bugs` branch. Identical +I on both windings is actually the *correct* MKF encoding (every winding's current is stored "into the dot"), and `Inputs::get_common_mode_choke_magnetizing_current` drops the DC bias so only the CM ripple drives flux. The saturation-at-1.167 T report was a symptom of `can_be_common_mode_choke` returning false and the code falling through to `is_multiport_inductor`. The 100 mA fixed fallback (commit `424221e8`) replaces the old 1 % of line-current heuristic so B no longer scales with load.

**Observed (live):**
```
op[0].excitationsPerWinding[0] (Line):    current peak 5.50 A,  RMS 5.01 A,  first-harmonic amplitude 5.0 A
op[0].excitationsPerWinding[1] (Neutral): current peak 5.50 A,  RMS 5.01 A,  first-harmonic amplitude 5.0 A
Both waveforms identical: [5, 5.025, 5.049, ...] A
```

Both windings get the same current vector, in the same direction. On a CMC this represents pure **common-mode** current (in-phase on both windings, fluxes add). Downstream, the B-field calculation with N87 (µ_i 2200, `A_L` ~3 µH/turn) and 19 turns × 5 A produces **B_peak = 1.167 T**, far above N87's B_sat = 0.495 T. That's why the Finalizer UI flags the design as saturated.

**Why this is wrong:** in normal operation, a CMC sees a power-frequency current that is purely **differential** — line carries +5 A, neutral carries −5 A, their fluxes cancel exactly in the core. Core B at 50 Hz is ~0. Common-mode current is the EMI noise the CMC is trying to block, which is typically 3–6 orders of magnitude smaller than the line current.

Modelling both windings at +5 A is the worst-possible operating point for a CMC — it treats the full line current as if it were common-mode. Of course saturation follows.

**The likely author intent** was probably "show the user what happens at full line current" — but the current direction is missing. For two windings on a single core in the MAS model, one winding's current should be phase-flipped (or the sign convention must reflect the winding direction) so that the fluxes subtract for line-frequency excitation.

**Where to look in MKF:**
- `src/converter_models/CommonModeChoke.cpp` (or wherever `CommonModeChoke::process()` lives). The operating-point construction inside `process()` — specifically the part that fills `excitationsPerWinding[]` with currents — needs to flip sign (or phase) on the second winding for the fundamental differential-mode component.
- Alternatively, generate **two** operating points from `calculate_cmc_inputs`: one "differential" (low B, line current, fluxes cancel) and one "common-mode" (high frequency, tiny current, fluxes add). Designers would pick the case relevant to their question.

**Regression test:** call `calculate_cmc_inputs` with a line-current-dominant CMC spec and assert that for the "line-frequency operating point" either:
- `excitationsPerWinding[1].current.waveform.data[i] ≈ -excitationsPerWinding[0].current.waveform.data[i]`, **or**
- the returned B-field after winding and simulation is near zero (not 1.167 T).

---

---

## Side fixes applied while testing (upstream-ready)

While rebuilding the WASM I needed two small MKF-side patches. Both are local to `/home/alf/OpenMagnetics/MKF/` and are ready to land upstream.

### MKF CMakeLists.txt — use `CMAKE_CURRENT_SOURCE_DIR` not `CMAKE_SOURCE_DIR`

`/home/alf/OpenMagnetics/MKF/CMakeLists.txt` lines 423, 431, 434 used `${CMAKE_SOURCE_DIR}` for the CCI generator script paths. When MKF is pulled in via `FetchContent_Declare`/`add_subdirectory` from another project (e.g. WebLibMKF), `CMAKE_SOURCE_DIR` is the parent project's source dir, so the script and `cci_coords` paths resolve to the wrong place. Changed all three occurrences to `${CMAKE_CURRENT_SOURCE_DIR}`. MKF is now consumable as a subproject.

### MKF scripts/generate_cci_data.py — avoid >7 MB startup function

The previous generator wrote the full 1000-entry coord map as a single `std::unordered_map<...> CCI_DATA = { ... };` braced-init-list at namespace scope. When compiled with max_strands=1000, Clang emits the initializer as one `_GLOBAL__sub_I_...` function >8 MB, which exceeds Chromium's per-function WASM compile limit (7654321 bytes) and aborts WASM instantiation in the browser with:

```
CompileError: WebAssembly.instantiate(): size 8315865 > maximum function size 7654321
```

Rewritten to emit flat `constexpr float[]` coordinate data plus a `constexpr CciEntry[]` index at namespace scope (both go to `.rodata`, no generated function body), and a lazy cache inside `get_cci_coordinates()`. Signature unchanged. See the new `/home/alf/OpenMagnetics/MKF/scripts/generate_cci_data.py`.

Verified: rebuilt libMKF.wasm is 31.5 MB (vs 35.8 MB broken and 26.3 MB original), loads cleanly in Chromium, litz painter renders proper CCI rosette (see `wire0Strands=7` showing 1+6 pattern in the UI wire visualizer).

---

---

## Bug E — cross-wizard state leakage poisons Buck / non-CMC advisers

**Status:** frontend + MKF interaction.

**Repro:**
1. Enter CMC wizard, run Analytical, Design Magnetic, Advise Core. (This leaves `topology: CommonModeChoke`, `minimumImpedance: [{frequency: 150000, magnitude: 1000}]`, and a sub-mH `magnetizingInductance` in the persisted Pinia mas store.)
2. Navigate to Buck wizard (or any non-CMC wizard).
3. Click Design Magnetic → Advise Core.

**Observed:** the Core Adviser returns zero candidates. Console shows the CMC impedance filter running against Buck candidates (`Impedance filter: core T … N=X f=150000 Z=… req=1000`). The adviser rejects every core because none meets the CMC impedance target.

**Root cause:**
1. **Pinia persists `mas` to localStorage.** On page reload or wizard switch, the old CMC requirements hydrate back.
2. **BuckBoostWizard.process() calls `masStore.resetMas("power")`**, which is supposed to clear state. But `MAS.Convert.toMas(JSON.stringify(Defaults.powerMas))` **drops the `topology` field** (schema mismatch — the default has `"Buck Converter"` but the MAS TypeScript schema expects an enum keyword without the space, so it's stripped during conversion). So after reset, `topology` is `undefined`, then `setupMasStore` re-applies `"Buck Converter"`, but the impedance/inductance carried over from the previous design still linger in `designRequirements`.
3. **MKF's Core Adviser gates on `minimumImpedance` presence**, not on `topology == CommonModeChoke`. So if the array is non-empty, the impedance filter runs — even for a Buck design where that constraint makes no sense.

**Frontend fix:** in `src/stores/mas.js::resetMas`, after the `toMas()` conversion, explicitly null out requirement fields that don't belong to the reset target (`minimumImpedance`, `leakageInductance`, `strayCapacitance`, `insulation`, `wiringTechnology`, etc. — everything the CMC flow adds). Either that, or forbid Pinia persistence of `mas.inputs.designRequirements` entirely and rebuild from the active wizard each time.

**MKF fix:** in `CoreAdviser`, only apply the impedance filter when `inputs.designRequirements.topology == CommonModeChoke`. A Buck design with a stray impedance requirement should still produce advice.

**Minimum regression test:** on the frontend, mount CMC wizard, advise, then switch to Buck wizard, advise. The Buck advise must return ≥1 candidate.

---

---

## Bug F — core adviser picks high-loss material when a 4500× lower-loss alternative exists

**Status:** FIXED on `fix/cmc-bugs` (commit `3d7318a7`). The normalization is actually already log-scale (`CoreAdviser.h:149` — `EFFICIENCY: {invert: true, log: true}`), so hypothesis (1) was wrong. Real cause was (2): A07 is tagged Signal Processing in MAS (ACME's primary classification — it's a dual-use NiZn broadband material), and the strict Interference-Suppression filter from the earlier Bug B work was excluding it along with the real Power ferrites. `check_material_application` now admits Signal-Processing-tagged materials *that carry a complex-permeability table* (the data needed by the impedance filter) as dual-use CMC candidates. A07, A061, K10, Fair-Rite 61, TDK T37 are back in the pool. Power ferrites (N87, 3C94, Fair-Rite 67/77/78) remain excluded. In Test_Cmc_AdviserKnowsItsACmc the wizard-default case now picks T37 (a Signal-Processing dual-use material with lower losses than N30) instead of high-loss N30.

**Observed (CMC default, 230 V / 5 A / 50 Hz / 150 kHz impedance ≥ 1 kΩ):**

| Material | Shape | Pcore at the same operating point |
|---|---|---|
| TDK **N30** (what the adviser picked) | T 63/38/25 | **27.18 W** |
| Acme **A07** (available alternative) | — | **6.01 mW** |

A07 is ~4500× lower loss than N30 for the same design point. Default adviser weights are Losses 40%, Dimensions 30%, Cost 30% — losses should dominate. They aren't.

**Where to look in MKF:** `src/advisers/CoreAdviser.cpp`, specifically the scoring/normalization step in `filter_available_cores_power_application` / `score_magnetic`. Grep for the per-metric normalization that produces `score_i` values in `[0, 1]` and then weighted-sums them.

**Likely root causes (ranked by probability):**

1. **Linear relative-to-worst normalization collapses the loss advantage.** If the adviser does `loss_score = 1 - loss/max_loss` across candidates, then:
   - N30 = 27.18 W → worst → score 0.0
   - A07 = 0.00601 W → score ≈ 0.99978
   - A tiny cheap-N30-ferrite with slightly higher loss than A07, say 50 mW → score ≈ 0.99816
   All the good options cluster in a narrow band near 1.0, so the Dimensions and Cost weights — which CAN differ by 2× — dominate. The adviser effectively optimizes for cost/size once losses drop below ~100 mW.
   - **Fix:** use a log-scale loss score (`1 - log(loss/best_loss) / log(worst_loss/best_loss)`), OR rank-based normalization (`score = 1 - rank/N`), OR a ratio-to-best (`best_loss / loss`). Any of these keeps the 4500× gap visible in the weighted sum.
2. **A07 might not be in the evaluated pool at all.** The adviser may filter by manufacturer whitelist or availability before scoring. Check that `add_ferrite_materials_by_losses` (and its siblings) includes A07-family materials when `useOnlyCoresInStock = false` (which the frontend sets for CMC — see `taskQueue.js:adviseCore`).
3. **A07 might be rejected by the new CMC saturation filter before scoring.** Commit `8cfd73c7 fix(cmc): extend CMC path to 4-winding + add saturation filter` rejects cores that saturate. If the filter uses the common-mode operating point (Bug C) then at 5 A primary current ALL high-µ cores saturate → A07 gets culled → N30 wins by default because its low µ means lower B. This is the most pernicious scenario: the saturation filter trained on Bug C's wrong operating point silently prefers power ferrites for CMC designs.

**Probes before attempting the fix:**

```cpp
// In CoreAdviser::get_advised_core, right after filter chain, log:
for (const auto& [mas, score] : scored) {
    std::cout << mas.magnetic.core.functionalDescription.material.name
              << " Pcore=" << computed_loss
              << " score=" << score
              << " (loss_w=" << loss_weighted << " dim_w=" << dim_weighted
              << " cost_w=" << cost_weighted << ")\n";
}
```

That immediately tells you whether A07 is present in `scored` and, if so, what the component scores look like.

**Regression test:** call `calculate_advised_cores` with the CMC default MAS, assert the returned magnetic's `magnetic.core.processedDescription.coreLosses` < 1 W (a generous cap; the right answer should be in the tens of mW). Also assert that the material's initial permeability ≥ 5000 (if Bug B is fixed too).

**Cross-reference:** Bug F interacts with Bug B (no CMC material filter) and Bug C (common-mode vs differential op point). If Bug C is fixed so that the saturation filter sees a ~0 T operating B for line-frequency current, A07 will stop being culled and the loss-score issue becomes the only remaining blocker.

---

---

## Bug G — `plot_temperature_field` viewBox too small, clips toroid top/bottom

**Status:** fixed on the frontend (Magnetic2DVisualizer.vue recomputes the viewBox after receiving the SVG). MKF-side fix still wanted so the SVG is correct on its own.

**Observed** (T 63/38/25 toroid, CMC design):
- SVG attributes: `width="2605.3"`, `height="1385.3"`, `viewBox="-1084.4 -692.7 2605.3 1385.3"` → Y span 1385.3 (from −693 to +693)
- Actual content Y span (sum of all path/circle bboxes): **2153.96** (from −1077 to +1077)
- Browser faithfully clips to the viewBox ⇒ top and bottom ~30% of the toroid are cut off.

**Root cause guess (from the dimensions):** the viewBox width was sized for **toroid + colorbar in X** but only the toroid-without-colorbar extent was used for Y. Toroid outer radius ~1077 in SVG units; the viewBox uses only 693 → Y-axis calculation under-reports by the toroid diameter.

**Where to look in MKF:** `src/support/Painter.cpp` (or wherever `paint_temperature_field` finalizes the SVG). Find the place where the final `viewBox` or root `<svg width=… height=…>` is set. Likely uses a bounding rectangle that includes the X-extent of the colorbar but only the Y-extent before the colorbar was added, OR treats the colorbar's vertical extent as the whole SVG's vertical extent.

**Regression test:** call `plot_temperature_field` with a toroid (T 20/10/10 is enough), parse the returned SVG, compute the bbox of all drawn shapes, assert `bbox ⊆ viewBox`.

**Frontend workaround currently in place** (`WebSharedComponents/Common/Magnetic2DVisualizer.vue::processSvgResult`): after insertion, traverses `svgEl.querySelectorAll('*')`, collects `getBBox()` unions, and rewrites the `viewBox` + `width`/`height` attributes to match, with 2% padding. Applies to every plot mode (temperature, magnetic field, wire losses). Safe to keep even after MKF fixes the root cause — it's a no-op when the viewBox already matches.

---

## Cross-cutting impact

Fixing Bug C is probably a precondition for ever picking a sane material (Bug B): if the model believes the core sees 1 T of flux, the adviser will prefer low-loss power ferrite to eat the losses instead of a high-µ CMC material. Once the operating-point current is differential, losses drop to ~0 and the adviser has latitude to pick the high-µ material for the impedance requirement.

So the recommended fix order is **C → B → A**.
