import { defineStore } from 'pinia'

// User-authored catalog parts, created in the Core Studio (/core_studio).
//
// Each entry is a full MAS record (core shape / core material / core), exactly
// one ndjson line of the corresponding MAS data file. Records are validated
// through the engine before they are stored here. They are re-injected into
// the running WASM databases after every engine init (see main.js) so they
// appear in every selector alongside the catalog parts, and they can be
// exported as .ndjson for contribution to the official MAS database.
export const useCustomPartsStore = defineStore("customParts", {
    state: () => {
        return {
            shapes: {},     // name -> shape record   (core_shapes.ndjson format)
            materials: {},  // name -> material record (core_materials.ndjson format)
            cores: {},      // name -> core record     (cores.ndjson format)
        };
    },
    actions: {
        upsertShape(record) {
            if (record?.name == null || record.name === "") {
                throw new Error("customParts.upsertShape: record has no name");
            }
            this.shapes[record.name] = record;
        },
        upsertMaterial(record) {
            if (record?.name == null || record.name === "") {
                throw new Error("customParts.upsertMaterial: record has no name");
            }
            this.materials[record.name] = record;
        },
        upsertCore(record) {
            if (record?.name == null || record.name === "") {
                throw new Error("customParts.upsertCore: record has no name");
            }
            this.cores[record.name] = record;
        },
        removeShape(name) { delete this.shapes[name]; },
        removeMaterial(name) { delete this.materials[name]; },
        removeCore(name) { delete this.cores[name]; },

        // One record per line — the exact format of the MAS data files.
        shapesNdjson() { return Object.values(this.shapes).map((r) => JSON.stringify(r)).join('\n'); },
        materialsNdjson() { return Object.values(this.materials).map((r) => JSON.stringify(r)).join('\n'); },
        coresNdjson() { return Object.values(this.cores).map((r) => JSON.stringify(r)).join('\n'); },

        // Push every stored record into the running WASM databases (the MKF
        // loaders upsert by name). Called from main.js after each engine init,
        // and from the Core Studio right after registering a new part.
        async reinject(mkf) {
            const materials = this.materialsNdjson();
            const shapes = this.shapesNdjson();
            if (materials.length > 0) {
                await mkf.load_core_materials(materials);
            }
            if (shapes.length > 0) {
                await mkf.load_core_shapes(shapes);
            }
            // Cores intentionally NOT auto-injected into the catalog database:
            // the catalog is stock-filtered elsewhere and a custom core is
            // already usable by assembling its shape + material in the builder.
        },
    },
    persist: true,
});
