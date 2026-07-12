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
// Public landing page for a shared design (share/d/<token>): anyone with the
// link can inspect, download or open the design — no account needed.
export default {
    data() {
        return {
            masStore: useMasStore(),
            taskQueueStore: useTaskQueueStore(),
            authStore: useAuthStore(),
            cloudDesignStore: useCloudDesignStore(),
            shared: null,
            loading: true,
            busy: false,
            error: "",
            info: "",
        }
    },
    async mounted() {
        this.authStore.fetchMe();
        try {
            const { data } = await api.get(`/share/d/${this.$route.params.token}`);
            this.shared = data;
        } catch (error) {
            this.error = error.response?.status === 404
                ? "This share link does not exist or was revoked by its owner."
                : "Could not load the shared design: " + (error.response?.data?.detail || error.message);
        } finally {
            this.loading = false;
        }
    },
    methods: {
        async openInApp() {
            this.busy = true;
            try {
                // Opening a shared design starts a fresh local copy — never
                // linked to the sharer's cloud design.
                this.cloudDesignStore.unlink();
                await loadMasIntoApp(JSON.parse(JSON.stringify(this.shared.mas)), {
                    masStore: this.masStore,
                    stateStore: this.$stateStore,
                    userStore: this.$userStore,
                    taskQueueStore: this.taskQueueStore,
                    router: this.$router,
                    route: this.$route,
                });
            } catch (error) {
                console.error(error);
                this.error = "Could not open the design: " + error.message;
                this.busy = false;
            }
        },
        downloadMas() {
            download(JSON.stringify(this.shared.mas, null, 4), `${this.shared.name}.json`, "text/plain");
        },
        async copyToMyDesigns() {
            this.busy = true;
            this.error = "";
            try {
                await api.post('/designs', { name: this.shared.name, mas: this.shared.mas });
                this.info = `Saved to your designs as "${this.shared.name}".`;
            } catch (error) {
                this.error = "Could not copy: " + (error.response?.data?.detail || error.message);
            } finally {
                this.busy = false;
            }
        },
    }
}
</script>

<template>
  <div class="om-account-page d-flex flex-column min-vh-100">
    <Header />
    <div class="container text-white mt-5 flex-grow-1" style="max-width: 640px">
        <div v-if="loading" class="text-secondary">Loading shared design…</div>
        <div v-else-if="error && shared == null" data-cy="SharedDesign-error" class="alert alert-warning">{{ error }}</div>
        <template v-else>
            <h3 data-cy="SharedDesign-title"><i class="pi pi-share-alt mr-2"></i>{{ shared.name }}</h3>
            <p class="text-secondary">
                Shared magnetic design · revision {{ shared.revision }} ·
                saved {{ new Date(shared.saved_at).toLocaleDateString() }} · MAS {{ shared.mas_version }}
            </p>
            <div class="d-flex gap-2 flex-wrap mt-3">
                <button data-cy="SharedDesign-open-button" :disabled="busy" class="p-button p-button-primary" @click="openInApp">
                    <i class="pi pi-box mr-2"></i>Open in OpenMagnetics
                </button>
                <button data-cy="SharedDesign-download-button" class="p-button p-button-outlined" @click="downloadMas">
                    <i class="pi pi-download mr-2"></i>Download MAS
                </button>
                <button v-if="authStore.isLoggedIn" data-cy="SharedDesign-copy-button" :disabled="busy"
                        class="p-button p-button-outlined" @click="copyToMyDesigns">
                    <i class="pi pi-cloud-upload mr-2"></i>Copy to My Designs
                </button>
            </div>
            <div v-if="info" data-cy="SharedDesign-info" class="alert alert-info mt-3">{{ info }}</div>
            <div v-if="error" class="alert alert-warning mt-3">{{ error }}</div>
        </template>
    </div>
    <Footer />
  </div>
</template>
