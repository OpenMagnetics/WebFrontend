<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import { useAuthStore } from '../stores/auth'
import { useCloudDesignStore } from '../stores/cloudDesign'
import api from '../services/accountApi'
</script>

<script>
export default {
    data() {
        const authStore = useAuthStore();
        const cloudDesignStore = useCloudDesignStore();
        return {
            authStore,
            cloudDesignStore,
            currentPassword: "",
            newPassword: "",
            deletePassword: "",
            showDelete: false,
            busy: false,
            error: "",
            info: "",
        }
    },
    async mounted() {
        if (!this.authStore.checked) {
            await this.authStore.fetchMe();
        }
    },
    methods: {
        async changePassword() {
            this.error = "";
            this.info = "";
            this.busy = true;
            try {
                await api.post('/auth/change_password', {
                    current_password: this.currentPassword,
                    new_password: this.newPassword,
                });
                this.info = "Password changed. Other devices were signed out.";
                this.currentPassword = "";
                this.newPassword = "";
            } catch (error) {
                const detail = error.response?.data?.detail;
                this.error = (typeof detail === 'string' && detail) || "Could not change the password";
            } finally {
                this.busy = false;
            }
        },
        async requestVerify() {
            this.error = "";
            this.info = "";
            try {
                await api.post('/auth/request_verify');
                this.info = "Verification email sent — check your inbox.";
            } catch (error) {
                const detail = error.response?.data?.detail;
                this.error = (typeof detail === 'string' && detail) || "Could not send the verification email";
            }
        },
        exportEverything() {
            // Plain navigation: the browser downloads the zip with the session cookie.
            window.location.href = import.meta.env.VITE_API_ENDPOINT + '/me/export';
        },
        async deleteAccount() {
            this.error = "";
            this.busy = true;
            try {
                await api.request({ method: 'DELETE', url: '/me', data: { password: this.deletePassword } });
                this.cloudDesignStore.unlink();
                this.authStore.clearSession();
                await this.$router.push(`${import.meta.env.BASE_URL}`);
            } catch (error) {
                const detail = error.response?.data?.detail;
                this.error = (typeof detail === 'string' && detail) || "Could not delete the account";
            } finally {
                this.busy = false;
            }
        },
    }
}
</script>

<template>
  <div class="d-flex flex-column min-vh-100">
    <Header />
    <div class="container text-white mt-4 flex-grow-1" style="min-height: 60vh; max-width: 640px">
        <h2 data-cy="Account-title" class="mb-4"><i class="pi pi-user mr-2"></i>Account</h2>

        <div v-if="!authStore.checked" class="text-secondary">Loading…</div>
        <div v-else-if="!authStore.isLoggedIn" data-cy="Account-signed-out" class="alert alert-info">
            Sign in from the header to manage your account.
        </div>

        <template v-else>
            <div class="card bg-dark border-secondary mb-4 p-3">
                <div><span class="text-secondary">Email:</span> {{ authStore.user.email }}
                    <span v-if="authStore.user.email_verified" class="badge bg-success ms-2">verified</span>
                    <button v-else data-cy="Account-verify-button" class="btn btn-link btn-sm p-0 ms-2" @click="requestVerify">
                        verify (needed for password recovery)
                    </button>
                </div>
                <div><span class="text-secondary">Name:</span> {{ authStore.user.display_name }}</div>
                <div><span class="text-secondary">Member since:</span> {{ new Date(authStore.user.created_at).toLocaleDateString() }}</div>
            </div>

            <div class="card bg-dark border-secondary mb-4 p-3">
                <h5 class="mb-3">Change password</h5>
                <form @submit.prevent="changePassword">
                    <input v-model="currentPassword" data-cy="Account-current-password-input" type="password" required
                           autocomplete="current-password" placeholder="Current password"
                           class="form-control bg-secondary text-white border-secondary mb-2" />
                    <input v-model="newPassword" data-cy="Account-new-password-input" type="password" required minlength="8"
                           autocomplete="new-password" placeholder="New password (8+ characters)"
                           class="form-control bg-secondary text-white border-secondary mb-2" />
                    <button :disabled="busy || newPassword.length < 8 || currentPassword === ''"
                            data-cy="Account-change-password-button" type="submit" class="p-button p-button-primary">
                        Change password
                    </button>
                </form>
            </div>

            <div class="card bg-dark border-secondary mb-4 p-3">
                <h5 class="mb-3">Your data</h5>
                <p class="text-secondary mb-2">Download everything in your account (designs as MAS JSON) as a zip.</p>
                <button data-cy="Account-export-button" class="p-button p-button-outlined" @click="exportEverything">
                    <i class="pi pi-download mr-2"></i>Export everything
                </button>
            </div>

            <div class="card bg-dark border-danger mb-4 p-3">
                <h5 class="text-danger mb-3">Delete account</h5>
                <p class="text-secondary mb-2">Deletes your account and every design stored in it. There is no undo — export first.</p>
                <button v-if="!showDelete" data-cy="Account-delete-button" class="p-button p-button-outlined p-button-danger"
                        @click="showDelete = true">Delete my account…</button>
                <form v-else @submit.prevent="deleteAccount" class="d-flex gap-2 flex-wrap">
                    <input v-model="deletePassword" data-cy="Account-delete-password-input" type="password" required
                           autocomplete="current-password" placeholder="Confirm with your password"
                           class="form-control bg-secondary text-white border-secondary" style="max-width: 18rem" />
                    <button :disabled="busy || deletePassword === ''" data-cy="Account-delete-confirm-button"
                            type="submit" class="p-button p-button-danger">Delete forever</button>
                    <button type="button" class="p-button p-button-outlined p-button-secondary" @click="showDelete = false">Cancel</button>
                </form>
            </div>

            <div v-if="error" data-cy="Account-error" class="alert alert-danger py-2">{{ error }}</div>
            <div v-if="info" data-cy="Account-info" class="alert alert-info py-2">{{ info }}</div>
        </template>
    </div>
    <Footer />
  </div>
</template>
