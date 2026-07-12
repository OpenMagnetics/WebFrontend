<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import { useAuthStore } from '../stores/auth'
import { useInventoryStore, ENGINE_HAS_CONTEXT_ADVISERS } from '../stores/inventory'
import api from '../services/accountApi'
import { download } from 'WebSharedComponents/assets/js/utils.js'
</script>

<script>
const PART_TYPES = ['coreShape', 'coreMaterial', 'core', 'bobbin', 'wire'];
const TYPE_LABELS = {
    coreShape: 'Core shape', coreMaterial: 'Core material', core: 'Core',
    bobbin: 'Bobbin', wire: 'Wire',
};

export default {
    data() {
        const authStore = useAuthStore();
        const inventoryStore = useInventoryStore();
        return {
            authStore,
            inventoryStore,
            PART_TYPES,
            TYPE_LABELS,
            ENGINE_HAS_CONTEXT_ADVISERS,
            parts: [],
            loading: true,
            error: "",
            info: "",
            importType: 'coreShape',
            refType: 'core',
            refName: "",
        }
    },
    computed: {
        scope: {
            get() { return this.inventoryStore.scope; },
            set(value) {
                this.inventoryStore.scope = value;
                this.info = "Adviser scope saved — it is applied the next time the engine loads (reload the page or open a design tool).";
            },
        },
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
                const { data } = await api.get('/inventory');
                this.parts = data.parts;
                await this.inventoryStore.fetchContext();
            } catch (error) {
                this.error = "Could not load your inventory: " + (error.response?.data?.detail || error.message);
            }
        },
        async addCatalogRef() {
            this.error = "";
            try {
                await api.post('/inventory', {
                    part_type: this.refType, source: 'catalog', catalog_ref: this.refName.trim(),
                });
                this.refName = "";
                await this.refresh();
            } catch (error) {
                this.error = "Could not add: " + (error.response?.data?.detail || error.message);
            }
        },
        pickImportFile() {
            this.$refs.ndjsonInput.click();
        },
        async importNdjson(event) {
            this.error = "";
            this.info = "";
            const file = event.target.files.item(0);
            if (file == null) {
                return;
            }
            try {
                const text = await file.text();
                const { data } = await api.post(`/inventory/import?part_type=${this.importType}`, text,
                    { headers: { 'Content-Type': 'application/x-ndjson' } });
                const withIssues = data.imported.filter((r) => r.schema_errors.length > 0).length;
                this.info = `Imported ${data.imported.length} ${TYPE_LABELS[this.importType].toLowerCase()} records`
                    + (withIssues > 0 ? ` (${withIssues} with schema warnings)` : '')
                    + (data.errors.length > 0 ? `; ${data.errors.length} lines failed: ${data.errors[0]}` : '');
                await this.refresh();
            } catch (error) {
                this.error = "Import failed: " + (error.response?.data?.detail || error.message);
            } finally {
                event.target.value = "";
            }
        },
        async exportNdjson(partType) {
            try {
                const { data } = await api.get(`/inventory/export.ndjson?part_type=${partType}`,
                    { responseType: 'text' });
                download(data, `my-inventory-${partType}s.ndjson`, "application/x-ndjson");
            } catch (error) {
                this.error = "Export failed: " + (error.response?.data?.detail || error.message);
            }
        },
        async deletePart(part) {
            if (!window.confirm(`Remove "${part.name}" from your inventory?`)) {
                return;
            }
            try {
                await api.delete(`/inventory/${part.id}`);
                await this.refresh();
            } catch (error) {
                this.error = "Could not delete: " + (error.response?.data?.detail || error.message);
            }
        },
        partsOfType(partType) {
            return this.parts.filter((p) => p.part_type === partType);
        },
    }
}
</script>

<template>
  <div class="d-flex flex-column min-vh-100">
    <Header />
    <div class="container text-white mt-4 flex-grow-1" style="min-height: 60vh">
        <h2 data-cy="MyInventory-title" class="mb-4"><i class="pi pi-box mr-2"></i>My inventory</h2>

        <div v-if="loading" class="text-secondary">Loading…</div>
        <div v-else-if="!authStore.isLoggedIn" data-cy="MyInventory-signed-out" class="alert alert-info">
            Sign in from the header to keep an inventory of the cores, shapes, materials and wires you
            stock — and let the advisers design with them.
        </div>

        <template v-else>
            <div class="card bg-dark border-secondary p-3 mb-4">
                <h5 class="mb-2">Adviser scope</h5>
                <div class="form-check">
                    <input class="form-check-input" type="radio" id="scope-public" value="public" v-model="scope" data-cy="MyInventory-scope-public" />
                    <label class="form-check-label" for="scope-public">Public catalog only (default)</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="radio" id="scope-merge" value="merge" v-model="scope" data-cy="MyInventory-scope-merge" />
                    <label class="form-check-label" for="scope-merge">Public catalog <strong>plus</strong> my inventory</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="radio" id="scope-only" value="only" v-model="scope"
                           :disabled="!ENGINE_HAS_CONTEXT_ADVISERS" data-cy="MyInventory-scope-only" />
                    <label class="form-check-label" for="scope-only" :class="{ 'text-secondary': !ENGINE_HAS_CONTEXT_ADVISERS }">
                        <strong>Only</strong> my inventory (advisers design exclusively with parts I stock)
                        <span v-if="!ENGINE_HAS_CONTEXT_ADVISERS" class="badge bg-secondary ms-1"
                              title="The current engine build lacks the context-adviser exports; tracked in the issue board.">
                            arriving with the next engine update
                        </span>
                    </label>
                </div>
            </div>

            <div class="card bg-dark border-secondary p-3 mb-4">
                <h5 class="mb-2">Add parts</h5>
                <div class="d-flex gap-2 flex-wrap align-items-center mb-2">
                    <span class="text-secondary">Import private parts (MAS ndjson, e.g. a Core Studio export):</span>
                    <select v-model="importType" class="form-select bg-secondary text-white border-secondary" style="max-width: 11rem" data-cy="MyInventory-import-type">
                        <option v-for="t in PART_TYPES" :key="t" :value="t">{{ TYPE_LABELS[t] }}</option>
                    </select>
                    <input type="file" ref="ndjsonInput" accept=".ndjson,.jsonl,.json,.txt" hidden @change="importNdjson" />
                    <button class="p-button p-button-primary" data-cy="MyInventory-import-button" @click="pickImportFile">
                        <i class="pi pi-upload mr-2"></i>Import ndjson
                    </button>
                </div>
                <div class="d-flex gap-2 flex-wrap align-items-center">
                    <span class="text-secondary">Or reference a public catalog part you stock:</span>
                    <select v-model="refType" class="form-select bg-secondary text-white border-secondary" style="max-width: 11rem" data-cy="MyInventory-ref-type">
                        <option v-for="t in PART_TYPES" :key="t" :value="t">{{ TYPE_LABELS[t] }}</option>
                    </select>
                    <input v-model="refName" placeholder="Exact catalog part name" data-cy="MyInventory-ref-name"
                           class="form-control bg-secondary text-white border-secondary" style="max-width: 22rem"
                           @keyup.enter="refName.trim() && addCatalogRef()" />
                    <button :disabled="refName.trim() === ''" class="p-button p-button-primary" data-cy="MyInventory-ref-add" @click="addCatalogRef">Add</button>
                </div>
            </div>

            <div v-if="error" data-cy="MyInventory-error" class="alert alert-warning py-2">{{ error }}</div>
            <div v-if="info" data-cy="MyInventory-info" class="alert alert-info py-2">{{ info }}</div>

            <div v-if="parts.length === 0" data-cy="MyInventory-empty" class="text-secondary">
                Nothing in your inventory yet. Import parts above, or author them in the Core Studio and export/import the ndjson.
            </div>

            <template v-for="partType in PART_TYPES" :key="partType">
                <div v-if="partsOfType(partType).length > 0" class="mb-4">
                    <div class="d-flex align-items-center gap-2 mb-1">
                        <h5 class="mb-0">{{ TYPE_LABELS[partType] }}s ({{ partsOfType(partType).length }})</h5>
                        <button class="p-button p-button-outlined p-button-sm" @click="exportNdjson(partType)" title="Export as MAS ndjson">
                            <i class="pi pi-download"></i>
                        </button>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-dark table-hover align-middle" :data-cy="`MyInventory-table-${partType}`">
                            <thead><tr><th>Name</th><th>Source</th><th>Stock</th><th>Order code</th><th>Notes</th><th></th></tr></thead>
                            <tbody>
                                <tr v-for="part in partsOfType(partType)" :key="part.id">
                                    <td>{{ part.name }}</td>
                                    <td><span class="badge" :class="part.source === 'private' ? 'bg-primary' : 'bg-secondary'">{{ part.source }}</span></td>
                                    <td>{{ part.stock_qty ?? '—' }}</td>
                                    <td>{{ part.order_code ?? '—' }}</td>
                                    <td class="text-truncate" style="max-width: 16rem">{{ part.notes ?? '' }}</td>
                                    <td class="text-end">
                                        <button class="p-button p-button-outlined p-button-danger p-button-sm"
                                                :data-cy="`MyInventory-delete-${part.name}`"
                                                @click="deletePart(part)" title="Remove"><i class="pi pi-trash"></i></button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </template>
        </template>
    </div>
    <Footer />
  </div>
</template>
