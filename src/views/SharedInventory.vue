<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import { useAuthStore } from '../stores/auth'
import { useInventoryStore } from '../stores/inventory'
import api from '../services/accountApi'
</script>

<script>
const TYPE_LABELS = {
    coreShape: 'Core shapes', coreMaterial: 'Core materials', core: 'Cores',
    bobbin: 'Bobbins', wire: 'Wires',
};

// Public landing page for a shared inventory (share/i/<token>). Logged-in
// visitors can MOUNT it: the parts join their adviser context ("public +
// mine + theirs") through /inventory/context.json.
export default {
    data() {
        return {
            authStore: useAuthStore(),
            inventoryStore: useInventoryStore(),
            TYPE_LABELS,
            shared: null,
            mounted_: false,
            loading: true,
            busy: false,
            error: "",
            info: "",
        }
    },
    computed: {
        grouped() {
            const groups = {};
            for (const part of this.shared?.parts || []) {
                (groups[part.part_type] = groups[part.part_type] || []).push(part);
            }
            return groups;
        },
    },
    async mounted() {
        await this.authStore.fetchMe();
        try {
            const { data } = await api.get(`/share/i/${this.$route.params.token}`);
            this.shared = data;
            if (this.authStore.isLoggedIn) {
                const { data: mine } = await api.get('/me/mounts');
                this.mounted_ = mine.mounts.some((m) => m.token === this.$route.params.token && !m.revoked);
            }
        } catch (error) {
            this.error = error.response?.status === 404
                ? "This share link does not exist or was revoked by its owner."
                : "Could not load the shared inventory: " + (error.response?.data?.detail || error.message);
        } finally {
            this.loading = false;
        }
    },
    methods: {
        async toggleMount() {
            this.busy = true;
            this.error = "";
            try {
                if (this.mounted_) {
                    await api.delete(`/share/i/${this.$route.params.token}/mount`);
                    this.mounted_ = false;
                    this.info = "Unmounted — these parts leave your advisers on the next engine load.";
                } else {
                    await api.post(`/share/i/${this.$route.params.token}/mount`);
                    this.mounted_ = true;
                    this.info = "Mounted! With adviser scope 'Public plus my inventory', these parts join your searches on the next engine load.";
                }
                this.inventoryStore.context = null;   // force a re-fetch next applyScope
            } catch (error) {
                this.error = (typeof error.response?.data?.detail === 'string' && error.response.data.detail)
                    || "Could not update the mount";
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
    <div class="container text-white mt-5 flex-grow-1" style="max-width: 760px">
        <div v-if="loading" class="text-secondary">Loading shared inventory…</div>
        <div v-else-if="error && shared == null" data-cy="SharedInventory-error" class="alert alert-warning">{{ error }}</div>
        <template v-else>
            <h3 data-cy="SharedInventory-title"><i class="pi pi-box mr-2"></i>{{ shared.owner }}'s parts inventory</h3>
            <p class="text-secondary">{{ shared.parts.length }} shared parts. Anyone with this link can browse them;
                sign in to mount them into your own advisers.</p>
            <div class="d-flex gap-2 flex-wrap mb-3">
                <button v-if="authStore.isLoggedIn" data-cy="SharedInventory-mount-button" :disabled="busy"
                        class="p-button" :class="mounted_ ? 'p-button-outlined' : 'p-button-primary'" @click="toggleMount">
                    <i class="pi mr-2" :class="mounted_ ? 'pi-eject' : 'pi-download'"></i>
                    {{ mounted_ ? "Unmount from my advisers" : "Mount into my advisers" }}
                </button>
                <span v-else class="text-secondary align-self-center">Sign in (top right) to mount this inventory.</span>
            </div>
            <div v-if="info" data-cy="SharedInventory-info" class="alert alert-info py-2">{{ info }}</div>
            <div v-if="error" class="alert alert-warning py-2">{{ error }}</div>

            <div v-for="(parts, partType) in grouped" :key="partType" class="mb-3">
                <h5>{{ TYPE_LABELS[partType] }} ({{ parts.length }})</h5>
                <div class="table-responsive">
                    <table class="table table-dark table-sm align-middle">
                        <tbody>
                            <tr v-for="part in parts" :key="part.name">
                                <td>{{ part.name }}</td>
                                <td><span class="badge" :class="part.source === 'private' ? 'bg-primary' : 'bg-secondary'">{{ part.source }}</span></td>
                                <td class="text-secondary">{{ part.order_code ?? '' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </template>
    </div>
    <Footer />
  </div>
</template>
