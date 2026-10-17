# Stores architecture

This directory holds Pinia stores for the WebFrontend app. The same file names also exist in the `MagneticBuilder` submodule and in some consumer repos (`eb-modelling-el-choker`, `eb-modelling-el-magnetic`). That duplication is **intentional** — it is the embedding contract.

## Embedding model

`MagneticBuilder` ships as a submodule that can be (1) run standalone, (2) embedded inside WebFrontend, or (3) embedded inside a branded consumer (el-choker, el-magnetic, …). When embedded, the HOST app provides the shared stores. Three import patterns coexist:

| Pattern in a component | Resolves to |
|---|---|
| `from '../stores/mas'` (relative) | Always the local package's own store |
| `from '/src/stores/mas'` (absolute, rooted) | Whoever owns `/src` at build time — the host |
| `from '/OMWebFrontend/src/stores/mas'` | A specific submodule's store (consumer-chosen) |

Pick the pattern based on intent: use a relative import when the store belongs to *this* package (e.g. WASM task queue, visualizer state). Use an absolute import when the store should be overridable by whatever app hosts us.

## Contract stores (overridable)

These stores have multiple implementations across apps. The **public API** (what the `return {…}` block exposes) is the contract. Any change must be rolled out to every implementation or embedding will break in silent, strange ways.

| Store | Current implementors | Owns |
|---|---|---|
| `mas` | WebFrontend, MagneticBuilder, el-choker | `mas` MAS object, `resetMas`, `hasMirroredWindings` |
| `state` | WebFrontend, MagneticBuilder (+ submodule copies) | Selected tool/workflow/application, operating-points UI, subsection status |
| `settings` | WebFrontend, MagneticBuilder, el-choker | Per-tool display settings (decimals, auto-recalc, etc.) and `userPreferences` (`unitSystem`, `preferredCoreManufacturer`) |
| `user` | WebFrontend, MagneticBuilder | Tool-box workflow state, visualizer state (mis-named; has nothing to do with users) |
| `style` | Theme variants: `style`, `fairRiteStyle` — host picks one and binds it to `$styleStore` | Per-consumer visual theme |
| `storeVersioning` | Full impl in WebFrontend + MagneticBuilder; thin stubs elsewhere | Clears persisted stores when a breaking change ships (see `STORE_VERSION_DATE`) |

**Before changing any of these:** list the consumer repos, confirm the API change lands in each, and run each consumer's tests.

## Roaming (profile) settings

`src/services/profileSettings.js` (ABT #1099) syncs the user's tunables with the account
profile, one *section* per store with a whitelist of keys, merged per section (last write
wins on the section's own timestamp). Sections are registered in `src/main.js`:
`settings` (the contract store above minus assets/timings), `models` (`user.selectedModels`,
`simulationUseCurrentAsInput`), `simulationModels` (MagneticBuilder `modelSettings` model
choices + painter resolution) and `magneticBuilder` (MagneticBuilder `magneticBuilderSettings`
panel toggles). Navigation state (`state`), consent, `history` and `mas` never roam. To make a
new setting roam, add its key to the whitelist in `main.js`; the server (`PATCH
/me/settings/sections/{name}`) stores sections opaquely.

## Local stores (not overridable)

Used only by the package that owns them. Safe to refactor freely.

| Store | App | Purpose |
|---|---|---|
| `taskQueue` | WebFrontend + MagneticBuilder (local to each) | WASM + HTTP call wrappers; doubles as an event bus via Pinia `$onAction` |
| `modelSettings` | WebFrontend | Physics-model choices (loss models, thermal, etc.) |
| `magneticBuilderSettings` | WebFrontend | UI toggles specific to the embedded builder |
| `history` | Both | Undo/redo MAS history |
| `adviseCache` | Both | Latest magnetic/core adviser results |
| `dataCache` | MagneticBuilder | Timestamped wire-data cache |
| `catalog` | MagneticBuilder | Catalog tool filters + advises |
| `crossReferencer` | MagneticBuilder | Cross-referencer tool state |
| `storedCoilLayout` | MagneticBuilder | Per MAS store id, a hash of the wind inputs a loaded, already wound coil stands for; the coil panel keeps the stored layout while the hash matches and winds once it does not (ABT #1838). Persisted (a page reload must not wind the loaded coil either) and in the storeVersioning wipe list; holds no design data |
| `simulationFindings` | MagneticBuilder | Per MAS store id, MKF's findings on the last simulation (`analyze_results`, ABT #1855: saturation, volt-second imbalance, temperature limits), shown above the builder grouped by operating point; replaced by every simulation, dropped when one fails or the design changes. Not persisted, not part of the MAS |
| `auth` | WebFrontend | Optional account session (mirrors `/auth/me`; not persisted — cookie is the source of truth) |
| `coreMaterialNotice` | WebFrontend | The outdated core material copy the last loaded design carries (core losses differ from the library's by more than 10 %), shown above the builder until the user switches or keeps it. Not persisted |
| `loadCorrections` | WebFrontend | What the last load changed in the design's stored waveforms (a time axis 1000 times its period scaled onto it, a record short of its period closed), per operating point and winding, shown on the Op. Points page next to the point. Not persisted |
| `cloudDesign` | WebFrontend | Link between the local working design and its server-side "My Designs" entry (persisted; deliberately NOT in the storeVersioning wipe list, like `customParts`) |

## Theme selection

Every app mounts exactly one theme store and exposes it as `$styleStore` in `main.js`:

```js
import { useFairRiteStyleStore } from '/src/stores/fairRiteStyle'
app.config.globalProperties.$styleStore = useFairRiteStyleStore()
```

`style` and `fairRiteStyle` are alternative themes. They share the same shape (`theme`, `storyline`, `designRequirements`, …) so components can read `$styleStore.xxx` theme-agnostically. Consumer repos typically keep their own `style.js` with the branding they want.

## Conventions

- **Derived state is a `computed`, not a method.** `state.js` used to expose `hasCurrentApplicationMirroredWindings()` as a method reading `selectedApplication`; it drifted out of sync with the MAS whenever a design was loaded without going through the wizard. Now `masStore.hasMirroredWindings` is a `computed` reading `mas.inputs.designRequirements.topology`. Follow this pattern — if the answer depends only on state, make it a getter.
- **`$onAction` as event bus.** Several stores expose empty "signal" functions (`importedMas()`, `updatedTurnsRatios()`, `newWireCreated()`) that callers invoke so other stores can subscribe via `$onAction`. This is deliberate; don't remove them unless you remove the subscribers too.
- **Persistence.** Stores declared with `{ persist: true }` save to localStorage via `pinia-plugin-persistedstate`. `storeVersioning.js` wipes these when the schema changes — bump `STORE_VERSION_DATE` when you change a persisted store's shape.
