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
| `settings` | WebFrontend, MagneticBuilder, el-choker | Per-tool display settings (decimals, auto-recalc, etc.) |
| `user` | WebFrontend, MagneticBuilder | Tool-box workflow state, visualizer state (mis-named; has nothing to do with users) |
| `style` | Theme variants: `style`, `fairRiteStyle`, `weStyle` — host picks one and binds it to `$styleStore` | Per-consumer visual theme |
| `storeVersioning` | Full impl in WebFrontend + MagneticBuilder; thin stubs elsewhere | Clears persisted stores when a breaking change ships (see `STORE_VERSION_DATE`) |

**Before changing any of these:** list the consumer repos, confirm the API change lands in each, and run each consumer's tests.

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

## Theme selection

Every app mounts exactly one theme store and exposes it as `$styleStore` in `main.js`:

```js
import { useFairRiteStyleStore } from '/src/stores/fairRiteStyle'
app.config.globalProperties.$styleStore = useFairRiteStyleStore()
```

`style`, `fairRiteStyle`, and `weStyle` are alternative themes, not duplicates. They share the same shape (`theme`, `storyline`, `designRequirements`, …) so components can read `$styleStore.xxx` theme-agnostically. Consumer repos typically keep their own `style.js` with the branding they want.

## Conventions

- **Derived state is a `computed`, not a method.** `state.js` used to expose `hasCurrentApplicationMirroredWindings()` as a method reading `selectedApplication`; it drifted out of sync with the MAS whenever a design was loaded without going through the wizard. Now `masStore.hasMirroredWindings` is a `computed` reading `mas.inputs.designRequirements.topology`. Follow this pattern — if the answer depends only on state, make it a getter.
- **`$onAction` as event bus.** Several stores expose empty "signal" functions (`importedMas()`, `updatedTurnsRatios()`, `newWireCreated()`) that callers invoke so other stores can subscribe via `$onAction`. This is deliberate; don't remove them unless you remove the subscribers too.
- **Persistence.** Stores declared with `{ persist: true }` save to localStorage via `pinia-plugin-persistedstate`. `storeVersioning.js` wipes these when the schema changes — bump `STORE_VERSION_DATE` when you change a persisted store's shape.
