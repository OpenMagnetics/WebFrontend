<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import { useMasStore } from '/MagneticBuilder/src/stores/mas'
import { useTaskQueueStore } from '../stores/taskQueue'
import { useAuthStore } from '../stores/auth'
import { useCloudDesignStore } from '../stores/cloudDesign'
import api from '../services/accountApi'
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
        return {
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
        }
    },
    async mounted() {
        if (!this.authStore.checked) {
            await this.authStore.fetchMe();
        }
        if (this.authStore.isLoggedIn) {
            await this.refresh();
        }
        this.loading = false;
    },
    methods: {
        async refresh() {
            this.error = "";
            try {
                const { data } = await api.get('/designs');
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
                this.saveName = this.defaultName();
                this.showSaveInput = true;
            }
        },
        async saveCurrent(name) {
            this.error = "";
            this.showSaveInput = false;
            try {
                const result = await this.cloudDesignStore.save(this.masStore.mas, name);
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
  <div class="d-flex flex-column min-vh-100">
    <Header />
    <div class="container text-white mt-4 flex-grow-1" style="min-height: 60vh">
        <h2 data-cy="MyDesigns-title" class="mb-4"><i class="pi pi-cloud mr-2"></i>My designs</h2>

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
                <template v-if="showSaveInput">
                    <input
                        data-cy="MyDesigns-save-name-input"
                        v-model.trim="saveName"
                        class="form-control bg-secondary text-white border-secondary"
                        style="max-width: 20rem"
                        @keyup.enter="saveCurrent(saveName)"
                    />
                    <button
                        data-cy="MyDesigns-save-confirm-button"
                        :disabled="saveName === ''"
                        class="p-button p-button-primary"
                        @click="saveCurrent(saveName)">Save</button>
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
