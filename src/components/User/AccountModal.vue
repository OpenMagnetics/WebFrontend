<script setup>
import Dialog from 'primevue/dialog'
import { useAuthStore } from '../../stores/auth'
import api from '../../services/accountApi'
</script>

<script>
// Minimal-friction sign-in: one email field, then one password field. Whether
// the password step registers or logs in is decided by /auth/check_email, so
// new users never see a separate "create account" form.
export default {
    components: { Dialog },
    emits: ['update:visible', 'logged-in'],
    props: {
        visible: { type: Boolean, default: false },
    },
    data() {
        const authStore = useAuthStore();
        return {
            authStore,
            step: 'email',        // 'email' | 'password'
            email: "",
            password: "",
            emailExists: null,
            error: "",
            info: "",
            busy: false,
        }
    },
    watch: {
        visible(shown) {
            if (shown) {
                this.step = 'email';
                this.password = "";
                this.error = "";
                this.info = "";
            }
        },
    },
    computed: {
        submitLabel() {
            return this.emailExists ? "Log in" : "Create account";
        },
    },
    methods: {
        close() {
            this.$emit('update:visible', false);
        },
        async onContinue() {
            this.error = "";
            this.info = "";
            this.busy = true;
            try {
                this.emailExists = await this.authStore.checkEmail(this.email);
                this.step = 'password';
                this.$nextTick(() => this.$refs.passwordInput?.focus());
            } catch (error) {
                this.error = error.response?.data?.detail || "Could not reach the account service";
            } finally {
                this.busy = false;
            }
        },
        async onSubmit() {
            this.error = "";
            this.info = "";
            this.busy = true;
            try {
                if (this.emailExists) {
                    await this.authStore.login(this.email, this.password);
                }
                else {
                    await this.authStore.register(this.email, this.password);
                }
                this.close();
                this.$emit('logged-in');
            } catch (error) {
                const detail = error.response?.data?.detail;
                this.error = (typeof detail === 'string' && detail) || "Could not reach the account service";
            } finally {
                this.busy = false;
            }
        },
        async onForgotPassword() {
            this.error = "";
            this.busy = true;
            try {
                await api.post('/auth/request_password_reset', { email: this.email });
                this.info = "If this email has an account, a reset link is on its way.";
            } catch (error) {
                const detail = error.response?.data?.detail;
                this.error = (typeof detail === 'string' && detail) || "Could not send the reset email";
            } finally {
                this.busy = false;
            }
        },
    }
}
</script>
<template>
    <Dialog
        :visible="visible"
        @update:visible="(v) => $emit('update:visible', v)"
        :modal="true"
        :draggable="false"
        :style="{ width: 'min(90vw, 420px)' }">
        <template #header>
            <div class="d-flex align-items-center">
                <i class="pi pi-user text-primary mr-2 text-xl"></i>
                <h5 data-cy="AccountModal-title" class="modal-title text-white mb-0">Your OpenMagnetics account</h5>
            </div>
        </template>
        <div class="px-2 py-2">
            <small class="text-secondary d-block mb-3">
                Optional — everything keeps working without an account. Signing in adds cloud-saved
                designs and, soon, your own parts inventory.
            </small>
            <form v-if="step === 'email'" @submit.prevent="onContinue">
                <label class="text-white mb-1" for="account-email">Email</label>
                <input
                    id="account-email"
                    data-cy="AccountModal-email-input"
                    v-model.trim="email"
                    type="email"
                    required
                    autocomplete="email"
                    class="form-control bg-secondary text-white border-secondary"
                    placeholder="you@example.com"
                />
                <button
                    data-cy="AccountModal-continue-button"
                    :disabled="busy || email === ''"
                    type="submit"
                    class="p-button p-button-primary w-100 mt-3">
                    <i v-if="busy" class="pi pi-refresh fa-spin mr-2"></i>
                    Continue
                </button>
            </form>
            <form v-else @submit.prevent="onSubmit">
                <div class="text-white mb-2">
                    <i class="pi pi-envelope mr-1"></i>{{ email }}
                    <button type="button" class="btn btn-link btn-sm p-0 ms-2" @click="step = 'email'">change</button>
                </div>
                <label class="text-white mb-1" for="account-password">
                    {{ emailExists ? "Password" : "Choose a password (8+ characters)" }}
                </label>
                <input
                    id="account-password"
                    ref="passwordInput"
                    data-cy="AccountModal-password-input"
                    v-model="password"
                    type="password"
                    required
                    minlength="8"
                    :autocomplete="emailExists ? 'current-password' : 'new-password'"
                    class="form-control bg-secondary text-white border-secondary"
                />
                <button
                    data-cy="AccountModal-submit-button"
                    :disabled="busy || password.length < 8"
                    type="submit"
                    class="p-button p-button-primary w-100 mt-3">
                    <i v-if="busy" class="pi pi-refresh fa-spin mr-2"></i>
                    {{ submitLabel }}
                </button>
                <button
                    v-if="emailExists"
                    data-cy="AccountModal-forgot-password-button"
                    type="button"
                    :disabled="busy"
                    class="btn btn-link btn-sm w-100 mt-2"
                    @click="onForgotPassword">
                    Forgot password?
                </button>
            </form>
            <div v-if="error" data-cy="AccountModal-error" class="alert alert-danger mt-3 mb-0 py-2">{{ error }}</div>
            <div v-if="info" data-cy="AccountModal-info" class="alert alert-info mt-3 mb-0 py-2">{{ info }}</div>
        </div>
    </Dialog>
</template>
