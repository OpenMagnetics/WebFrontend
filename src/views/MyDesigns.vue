<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import { useMasStore } from '/MagneticBuilder/src/stores/mas'
import { useTaskQueueStore } from '../stores/taskQueue'
import { useAuthStore } from '../stores/auth'
import { useCloudDesignStore } from '../stores/cloudDesign'
import api from '../services/accountApi'
import OrgSelector from '../components/User/OrgSelector.vue'
import { useOrgContextStore } from '../stores/orgContext'
import { loadMasIntoApp } from '../services/loadMasIntoApp'
import { download } from 'WebSharedComponents/assets/js/utils.js'
</script>

<script>
export default {
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const authStore = useAuthStore();
        const cloudDesignStore = useCloudDesignStore();
        const orgContextStore = useOrgContextStore();
        return {
            orgContextStore,
            masStore,
            taskQueueStore,
            authStore,
            cloudDesignStore,
            designs: [],
            loading: true,
            busyId: null,
            error: "",
            saveName: "",
            showSaveInput: false,
            // 'save' (first save of an unlinked design) or 'saveAs' (new copy, relinked).
            saveMode: 'save',
        }
    },
    async mounted() {
        if (!this.authStore.checked) {
            await this.authStore.fetchMe();
        }
        if (this.authStore.isLoggedIn) {
            await this.refresh();
            // Arriving from the header's "Save design to account" (ABT #344):
            // open the save flow immediately instead of showing a bare list.
            if (this.$route.query.save === '1') {
                this.startSaveCurrent();
            }
            else if (this.$route.query.saveAs === '1') {
                this.startSaveAs();
            }
        }
        this.loading = false;
    },
    watch: {
        // The header's "Save design as…" while already on this page.
        '$route.query.saveAs'(value) {
            if (value === '1' && this.authStore.isLoggedIn) {
                this.startSaveAs();
            }
        },
    },
    methods: {
        async refresh() {
            this.error = "";
            try {
                const { data } = await api.get('/designs' + this.orgContextStore.orgQuery);
                this.designs = data.designs;
            } catch (error) {
                this.error = "Could not load your designs: " + (error.response?.data?.detail || error.message);
            }
        },
        defaultName() {
            const reference = this.masStore.mas?.magnetic?.manufacturerInfo?.reference;
            return (reference && String(reference)) || `Design ${new Date().toISOString().slice(0, 10)}`;
        },
        startSaveCurrent() {
            if (this.cloudDesignStore.isLinked) {
                this.saveCurrent(null);
            }
            else {
                this.saveMode = 'save';
                this.saveName = this.defaultName();
                this.showSaveInput = true;
            }
        },
        startSaveAs() {
            this.saveMode = 'saveAs';
            this.saveName = this.cloudDesignStore.name
                ? this.uniqueCopyName(this.cloudDesignStore.name)
                : this.defaultName();
            this.showSaveInput = true;
        },
        confirmSaveInput() {
            if (this.saveName === '') {
                return;
            }
            if (this.saveMode === 'saveAs') {
                this.saveCurrentAs(this.saveName);
            }
            else {
                this.saveCurrent(this.saveName);
            }
        },
        // "<name> (copy)", then "(copy 2)", "(copy 3)"… — first one not in the list.
        uniqueCopyName(name) {
            const taken = new Set(this.designs.map((design) => design.name));
            let candidate = `${name} (copy)`;
            for (let index = 2; taken.has(candidate); index++) {
                candidate = `${name} (copy ${index})`;
            }
            return candidate;
        },
        async saveCurrentAs(name) {
            this.error = "";
            this.showSaveInput = false;
            try {
                let result;
                if (this.orgContextStore.selectedOrgId != null) {
                    // Org designs belong to the organization; no local link.
                    const { data } = await api.post('/designs' + this.orgContextStore.orgQuery,
                        { name, mas: this.masStore.mas });
                    result = data;
                } else {
                    result = await this.cloudDesignStore.saveAs(this.masStore.mas, name);
                }
                if (result.schema_errors != null && result.schema_errors.length > 0) {
                    this.error = "Saved, but the design does not validate against the current MAS schema: "
                        + result.schema_errors[0];
                }
                await this.refresh();
            } catch (error) {
                this.error = "Could not save as a new design: " + (error.response?.data?.detail || error.message);
            }
        },
        // Copy a saved design server-side. Fetches the FULL MAS (the list only
        // has summaries) and creates a new design; the working design and its
        // link are not touched.
        async duplicateDesign(design) {
            this.error = "";
            this.busyId = design.id;
            try {
                const { data } = await api.get(`/designs/${design.id}`);
                if (data.mas == null) {
                    throw new Error(`the server returned no MAS for "${design.name}"`);
                }
                await api.post('/designs' + this.orgContextStore.orgQuery,
                    { name: this.uniqueCopyName(design.name), mas: data.mas });
                await this.refresh();
            } catch (error) {
                this.error = "Could not duplicate: " + (error.response?.data?.detail || error.message);
            } finally {
                this.busyId = null;
            }
        },
        async saveCurrent(name) {
            this.error = "";
            this.showSaveInput = false;
            try {
                let result;
                if (this.orgContextStore.selectedOrgId != null) {
                    // Org designs belong to the organization; no local link.
                    const { data } = await api.post('/designs' + this.orgContextStore.orgQuery,
                        { name: name || this.defaultName(), mas: this.masStore.mas });
                    result = data;
                } else {
                    result = await this.cloudDesignStore.save(this.masStore.mas, name);
                }
                if (result.schema_errors != null && result.schema_errors.length > 0) {
                    this.error = "Saved, but the design does not validate against the current MAS schema: "
                        + result.schema_errors[0];
                }
                await this.refresh();
            } catch (error) {
                if (error.response?.status === 409) {
                    const current = error.response.data.detail.current_version;
                    if (window.confirm(`This design was modified elsewhere (now at version ${current}). Overwrite it with your local copy?`)) {
                        await this.cloudDesignStore.overwrite(this.masStore.mas);
                        await this.refresh();
                    }
                }
                else {
                    this.error = "Could not save: " + (error.response?.data?.detail || error.message);
                }
            }
        },
        async openDesign(design) {
            this.error = "";
            this.busyId = design.id;
            try {
                const { data } = await api.get(`/designs/${design.id}`);
                this.cloudDesignStore.link(data);
                await loadMasIntoApp(data.mas, {
                    masStore: this.masStore,
                    stateStore: this.$stateStore,
                    userStore: this.$userStore,
                    taskQueueStore: this.taskQueueStore,
                    router: this.$router,
                    route: this.$route,
                });
            } catch (error) {
                console.error(error);
                this.error = "Could not open the design: " + (error.response?.data?.detail || error.message);
            } finally {
                this.busyId = null;
            }
        },
        async shareDesign(design) {
            this.error = "";
            this.busyId = design.id;
            try {
                const { data } = await api.post(`/designs/${design.id}/share`, {});
                const url = `${window.location.origin}/share/d/${data.token}`;
                let copied = false;
                try {
                    await navigator.clipboard.writeText(url);
                    copied = true;
                } catch (clipboardError) {
                    // Clipboard needs a secure context / permission; the prompt below still shows the URL.
                }
                window.prompt(copied ? "Share link (copied to clipboard):" : "Share link:", url);
            } catch (error) {
                this.error = "Could not create the share link: " + (error.response?.data?.detail || error.message);
            } finally {
                this.busyId = null;
            }
        },
        async downloadDesign(design) {
            this.busyId = design.id;
            try {
                const { data } = await api.get(`/designs/${design.id}`);
                download(JSON.stringify(data.mas, null, 4), `${design.name}.json`, "text/plain");
            } catch (error) {
                this.error = "Could not download: " + (error.response?.data?.detail || error.message);
            } finally {
                this.busyId = null;
            }
        },
        async renameDesign(design) {
            const name = window.prompt("New name", design.name);
            if (name == null || name.trim() === "" || name === design.name) {
                return;
            }
            try {
                await api.put(`/designs/${design.id}`, { name: name.trim() });
                if (this.cloudDesignStore.designId === design.id) {
                    this.cloudDesignStore.name = name.trim();
                }
                await this.refresh();
            } catch (error) {
                this.error = "Could not rename: " + (error.response?.data?.detail || error.message);
            }
        },
        async deleteDesign(design) {
            if (!window.confirm(`Delete "${design.name}"? This cannot be undone.`)) {
                return;
            }
            try {
                await api.delete(`/designs/${design.id}`);
                if (this.cloudDesignStore.designId === design.id) {
                    this.cloudDesignStore.unlink();
                }
                await this.refresh();
            } catch (error) {
                this.error = "Could not delete: " + (error.response?.data?.detail || error.message);
            }
        },
        formatDate(iso) {
            return new Date(iso).toLocaleString();
        },
    }
}
</script>

<template>
  <div class="om-account-page d-flex flex-column min-vh-100">
    <Header />
    <div class="container text-white mt-4 flex-grow-1" style="min-height: 60vh">
        <div class="d-flex align-items-center gap-3 mb-4 flex-wrap">
            <h2 data-cy="MyDesigns-title" class="mb-0"><i class="pi pi-cloud mr-2"></i>My designs</h2>
            <OrgSelector v-if="authStore.isLoggedIn" @changed="refresh" />
        </div>

        <div v-if="loading" class="text-secondary">Loading…</div>

        <div v-else-if="!authStore.isLoggedIn" data-cy="MyDesigns-signed-out" class="alert alert-info">
            Sign in from the header to save designs to your account.
        </div>

        <template v-else>
            <div class="mb-3 d-flex gap-2 align-items-center flex-wrap">
                <button
                    data-cy="MyDesigns-save-current-button"
                    class="p-button p-button-primary"
                    @click="startSaveCurrent">
                    <i class="pi pi-save mr-2"></i>
                    {{ cloudDesignStore.isLinked ? `Save current design (${cloudDesignStore.name})` : "Save current design" }}
                </button>
                <button
                    data-cy="MyDesigns-save-as-button"
                    class="p-button p-button-outlined p-button-primary"
                    title="Save the current design as a new design with another name; later saves go to the new one"
                    @click="startSaveAs">
                    <i class="pi pi-copy mr-2"></i>Save as…
                </button>
                <template v-if="showSaveInput">
                    <input
                        data-cy="MyDesigns-save-name-input"
                        v-model.trim="saveName"
                        class="form-control bg-secondary text-white border-secondary"
                        style="max-width: 20rem"
                        :placeholder="saveMode === 'saveAs' ? 'Name of the new design' : 'Design name'"
                        @keyup.enter="confirmSaveInput"
                    />
                    <button
                        data-cy="MyDesigns-save-confirm-button"
                        :disabled="saveName === ''"
                        class="p-button p-button-primary"
                        @click="confirmSaveInput">{{ saveMode === 'saveAs' ? 'Save as new design' : 'Save' }}</button>
                    <button class="p-button p-button-outlined p-button-secondary" @click="showSaveInput = false">Cancel</button>
                </template>
            </div>

            <div v-if="error" data-cy="MyDesigns-error" class="alert alert-warning py-2">{{ error }}</div>

            <div v-if="designs.length === 0" data-cy="MyDesigns-empty" class="text-secondary">
                No designs saved yet. Design something, then hit "Save current design".
            </div>

            <div v-else class="table-responsive">
                <table class="table table-dark table-hover align-middle" data-cy="MyDesigns-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Updated</th>
                            <th>Revisions</th>
                            <th></th>
                            <th class="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="design in designs" :key="design.id" :data-cy="`MyDesigns-row-${design.name}`">
                            <td>
                                {{ design.name }}
                                <i v-if="cloudDesignStore.designId === design.id" title="Linked to your current work" class="pi pi-link ms-1 text-primary"></i>
                            </td>
                            <td>{{ formatDate(design.updated_at) }}</td>
                            <td>{{ design.revisions }}</td>
                            <td>
                                <span v-if="design.schema_valid === false"
                                      title="This design does not validate against the current MAS schema"
                                      class="badge bg-warning text-dark">schema</span>
                            </td>
                            <td class="text-end">
                                <button
                                    :data-cy="`MyDesigns-open-${design.name}`"
                                    :disabled="busyId === design.id"
                                    class="p-button p-button-primary p-button-sm mx-1"
                                    @click="openDesign(design)">
                                    <i v-if="busyId === design.id" class="pi pi-refresh fa-spin"></i>
                                    <span v-else>Open</span>
                                </button>
                                <button class="p-button p-button-outlined p-button-sm mx-1" @click="downloadDesign(design)" title="Download MAS file">
                                    <i class="pi pi-download"></i>
                                </button>
                                <button :data-cy="`MyDesigns-share-${design.name}`"
                                        class="p-button p-button-outlined p-button-sm mx-1"
                                        @click="shareDesign(design)" title="Create a public share link">
                                    <i class="pi pi-share-alt"></i>
                                </button>
                                <button
                                    :data-cy="`MyDesigns-duplicate-${design.name}`"
                                    :disabled="busyId === design.id"
                                    class="p-button p-button-outlined p-button-sm mx-1"
                                    @click="duplicateDesign(design)" title="Duplicate: save a copy of this design">
                                    <i class="pi pi-copy"></i>
                                </button>
                                <button class="p-button p-button-outlined p-button-sm mx-1" @click="renameDesign(design)" title="Rename">
                                    <i class="pi pi-pencil"></i>
                                </button>
                                <button
                                    :data-cy="`MyDesigns-delete-${design.name}`"
                                    class="p-button p-button-outlined p-button-danger p-button-sm mx-1"
                                    @click="deleteDesign(design)" title="Delete">
                                    <i class="pi pi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>
    </div>
    <Footer />
  </div>
</template>
