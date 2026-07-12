<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import api from '../services/accountApi'
import { useAuthStore } from '../stores/auth'
</script>

<script>
// Landing page for the two email links (verification and password reset).
// One view, two modes, selected by the route name; the token comes from the
// ?token= query parameter of the emailed URL.
export default {
    data() {
        const authStore = useAuthStore();
        return {
            authStore,
            mode: null,        // 'verify' | 'reset'
            token: "",
            newPassword: "",
            busy: false,
            done: false,
            error: "",
        }
    },
    async mounted() {
        this.mode = this.$route.name === 'VerifyEmail' ? 'verify' : 'reset';
        this.token = String(this.$route.query.token || "");
        if (this.token === "") {
            this.error = "This link is missing its token — use the full link from the email.";
            return;
        }
        if (this.mode === 'verify') {
            this.busy = true;
            try {
                await api.post('/auth/verify_email', { token: this.token });
                this.done = true;
                if (this.authStore.isLoggedIn) {
                    this.authStore.user.email_verified = true;
                }
            } catch (error) {
                const detail = error.response?.data?.detail;
                this.error = (typeof detail === 'string' && detail) || "Could not verify the email";
            } finally {
                this.busy = false;
            }
        }
    },
    methods: {
        async submitReset() {
            this.busy = true;
            this.error = "";
            try {
                await api.post('/auth/reset_password', { token: this.token, new_password: this.newPassword });
                this.done = true;
            } catch (error) {
                const detail = error.response?.data?.detail;
                this.error = (typeof detail === 'string' && detail) || "Could not reset the password";
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
    <div class="container text-white mt-5 flex-grow-1" style="max-width: 480px">
        <template v-if="mode === 'verify'">
            <h3 data-cy="EmailAction-title"><i class="pi pi-envelope mr-2"></i>Email verification</h3>
            <div v-if="busy" class="text-secondary mt-3">Verifying…</div>
            <div v-else-if="done" data-cy="EmailAction-done" class="alert alert-success mt-3">
                Your email is verified. You can now recover your password if you ever forget it.
            </div>
        </template>
        <template v-else>
            <h3 data-cy="EmailAction-title"><i class="pi pi-key mr-2"></i>Set a new password</h3>
            <div v-if="done" data-cy="EmailAction-done" class="alert alert-success mt-3">
                Password changed — you can sign in with it now (top-right of the header).
            </div>
            <form v-else-if="token !== ''" @submit.prevent="submitReset" class="mt-3">
                <input v-model="newPassword" data-cy="EmailAction-password-input" type="password" required minlength="8"
                       autocomplete="new-password" placeholder="New password (8+ characters)"
                       class="form-control bg-secondary text-white border-secondary mb-2" />
                <button :disabled="busy || newPassword.length < 8" data-cy="EmailAction-submit-button"
                        type="submit" class="p-button p-button-primary">
                    <i v-if="busy" class="pi pi-refresh fa-spin mr-2"></i>Change password
                </button>
            </form>
        </template>
        <div v-if="error" data-cy="EmailAction-error" class="alert alert-danger mt-3">{{ error }}</div>
    </div>
    <Footer />
  </div>
</template>
