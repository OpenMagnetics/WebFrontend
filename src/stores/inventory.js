import { defineStore } from 'pinia'
import api from '../services/accountApi'

// Gate for the 'only my inventory' adviser scope. The engine EXPORTS the
// calculate_advised_*_with_context twins, but MKF's LibraryContext flow is
// not production-ready: with a replace-context loaded, the standard-cores
// adviser still dereferences catalog shapes internally and throws
// CORE_SHAPE_NOT_FOUND ('E 100/60/28') — reproduced live 2026-07-13,
// ABT-filed to MKF. Flip when MKF's ctx flow survives a replace-context.
export const ENGINE_HAS_CONTEXT_ADVISERS = false;

// Account inventory (Phase 2): the user's approved-parts list, fetched from
// the backend and fed to the WASM engine. Two integration modes, selected by
// `scope` (persisted):
//   'public' — advisers see only the public catalog (today's behavior)
//   'merge'  — private parts are upserted into the engine databases on every
//              engine init (exactly like customParts.reinject), so they appear
//              in all selectors AND the adviser search space
//   'only'   — advisers run against the inventory alone via the engine's
//              LibraryContext (library_context_load + *_with_context calls)
// The parts themselves are NOT persisted — the server is the source of truth.
export const useInventoryStore = defineStore("inventory", {
    state: () => {
        return {
            scope: 'public',
            // /inventory/context.json payload: {context: {wires: [...], ...}, catalogRefs: {...}}
            context: null,
            catalogRefs: null,
            fetchedAt: null,
            lastError: null,
        };
    },
    getters: {
        hasParts: (state) => {
            if (state.context == null && state.catalogRefs == null) {
                return false;
            }
            const counts = [
                ...Object.values(state.context || {}).map((records) => records.length),
                ...Object.values(state.catalogRefs || {}).map((names) => names.length),
            ];
            return counts.some((n) => n > 0);
        },
        // Names of all private parts, for the telemetry privacy filter.
        privatePartNames: (state) => {
            const names = [];
            for (const records of Object.values(state.context || {})) {
                for (const record of records) {
                    if (record?.name) {
                        names.push(String(record.name));
                    }
                }
            }
            return names;
        },
    },
    actions: {
        async fetchContext() {
            const { data } = await api.get('/inventory/context.json');
            this.context = data.context;
            this.catalogRefs = data.catalogRefs;
            this.fetchedAt = new Date().toISOString();
            this.lastError = null;
            return data;
        },
        // Merge-inject private parts into the running engine databases, the
        // customParts.reinject pattern. Safe to call on every engine init.
        async injectMerge(mkf) {
            if (this.context == null) {
                return;
            }
            const ndjson = (key) => (this.context[key] || []).map((r) => JSON.stringify(r)).join('\n');
            const materials = ndjson('coreMaterials');
            const shapes = ndjson('coreShapes');
            const wires = ndjson('wires');
            if (materials.length > 0) {
                await mkf.load_core_materials(materials);
            }
            if (shapes.length > 0) {
                await mkf.load_core_shapes(shapes);
            }
            if (wires.length > 0) {
                await mkf.load_wires(wires);
            }
            // Cores/bobbins intentionally not merge-injected (same policy as
            // customParts): a core is usable by assembling shape+material, and
            // bobbins are generated from the core. In 'only' scope they DO
            // participate via the LibraryContext below.
        },
        // Build and load the engine LibraryContext for 'only' scope. Catalog
        // references are resolved to full records through the engine's
        // by-name getters; unresolvable refs are surfaced loudly.
        async loadEngineContext(mkf) {
            if (this.context == null) {
                throw new Error("inventory.loadEngineContext: no inventory fetched");
            }
            const payload = {};
            for (const [key, records] of Object.entries(this.context)) {
                payload[key] = [...records];
            }
            const resolvers = {
                coreMaterials: (name) => mkf.get_material_data(name),
                coreShapes: (name) => mkf.get_shape_data(name),
                wires: (name) => mkf.get_wire_data_by_name(name),
            };
            const unresolved = [];
            for (const [key, names] of Object.entries(this.catalogRefs || {})) {
                for (const name of names) {
                    const resolver = resolvers[key];
                    if (resolver == null) {
                        unresolved.push(`${key}/${name} (no by-name getter exported for this type yet)`);
                        continue;
                    }
                    const result = await resolver(name);
                    if (typeof result === 'string' && result.startsWith('Exception')) {
                        unresolved.push(`${key}/${name}: ${result}`);
                        continue;
                    }
                    payload[key] = payload[key] || [];
                    payload[key].push(typeof result === 'string' ? JSON.parse(result) : result);
                }
            }
            if (unresolved.length > 0) {
                this.lastError = `Some catalog references could not be resolved: ${unresolved.join('; ')}`;
                console.error('[inventory] ' + this.lastError);
            }
            await mkf.library_context_load(JSON.stringify(payload), 'replace');
        },
        // One entry point for the app: bring the engine in line with the
        // current scope. Called after engine init and on scope changes.
        async applyScope(mkf) {
            if (this.scope === 'only' && !ENGINE_HAS_CONTEXT_ADVISERS) {
                throw new Error("The 'only my inventory' scope needs the next engine update — " +
                    "the shipped engine lacks the context-adviser exports (see inventory.js gate)");
            }
            if (this.scope === 'public') {
                return;
            }
            if (this.context == null) {
                await this.fetchContext();
            }
            if (this.scope === 'merge') {
                await this.injectMerge(mkf);
            }
            else if (this.scope === 'only') {
                // 'only' also merge-injects so selectors can show the parts;
                // the restriction itself is enforced per adviser call.
                await this.injectMerge(mkf);
                await this.loadEngineContext(mkf);
            }
        },
        reset() {
            this.scope = 'public';
            this.context = null;
            this.catalogRefs = null;
            this.fetchedAt = null;
            this.lastError = null;
        },
    },
    persist: {
        pick: ['scope'],
    },
})
