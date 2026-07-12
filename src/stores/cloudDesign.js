import { defineStore } from 'pinia'
import api from '../services/accountApi'

// Link between the local working design (mas store) and its server-side
// "My Designs" entry, so repeated saves update the same design (optimistic
// concurrency via If-Match) instead of piling up duplicates. Persisted under
// its own key — deliberately NOT in storeVersioning's wipe list, like
// customParts, so the link survives version-bump wipes.
export const useCloudDesignStore = defineStore("cloudDesign", {
    state: () => {
        return {
            designId: null,
            version: null,
            name: null,
        };
    },
    getters: {
        isLinked: (state) => state.designId != null,
    },
    actions: {
        link(design) {
            this.designId = design.id;
            this.version = design.version;
            this.name = design.name;
        },
        unlink() {
            this.designId = null;
            this.version = null;
            this.name = null;
        },
        // Save the document. Creates a new design when unlinked, otherwise
        // updates the linked one. A 409 (modified elsewhere) is thrown to the
        // caller, which decides between reload and overwrite.
        async save(mas, name) {
            if (this.designId == null) {
                if (name == null || name === "") {
                    throw new Error("cloudDesign.save: a name is required to create a design");
                }
                const { data } = await api.post('/designs', { name, mas });
                this.link(data);
                return data;
            }
            const { data } = await api.put(`/designs/${this.designId}`, { mas },
                { headers: { 'If-Match': String(this.version) } });
            this.version = data.version;
            return data;
        },
        // After a 409: take the server's current version and save on top of it.
        async overwrite(mas) {
            if (this.designId == null) {
                throw new Error("cloudDesign.overwrite: no linked design");
            }
            const { data: current } = await api.get(`/designs/${this.designId}`);
            const { data } = await api.put(`/designs/${this.designId}`, { mas },
                { headers: { 'If-Match': String(current.version) } });
            this.version = data.version;
            return data;
        },
    },
    persist: true,
})
