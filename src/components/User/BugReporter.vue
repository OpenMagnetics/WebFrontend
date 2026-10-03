<script setup>
import { useMasStore } from '../../stores/mas'
import { useAuthStore } from '../../stores/auth'
import Dialog from 'primevue/dialog'
</script>

<script>

export default {
    components: { Dialog },
    emits: ['update:visible'],
    props: {
        visible: { type: Boolean, default: false },
    },
    data() {
        const masStore = useMasStore();
        const authStore = useAuthStore();
        return {
            isReported: false,
            userInformation: "",
            contactEmail: "",
            errorMessage: "",
            posting: false,
            masStore,
            authStore,
        }
    },
    computed: {
        // The username column is how a report gets answered: the account
        // email when logged in, else the optional address the reporter typed.
        reporterContact() {
            if (this.authStore.isLoggedIn) {
                return this.authStore.user.email;
            }
            const typed = this.contactEmail.trim();
            return typed === "" ? "Anonymous" : typed;
        },
    },
    methods: {
        onReportBug(event) {
            this.errorMessage = ""
            const typed = this.contactEmail.trim();
            if (!this.authStore.isLoggedIn && typed !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typed)) {
                this.errorMessage = `"${typed}" is not an email address. Fix it or leave it empty to report anonymously.`
                return
            }
            this.posting = true

            const data = {
                "userDataDump": this.masStore.mas,
                "userInformation": this.userInformation,
                "username": this.reporterContact,
            }
            const url = import.meta.env.VITE_API_ENDPOINT + '/report_bug'

            this.$axios.post(url, data)
            .then(response => {
                this.posting = false
                this.isReported = true
                setTimeout(() => {this.isReported = false;}, 4000);
            })
            .catch(error => {
                console.error("Ironically, error in reporting a bug")
                this.errorMessage = `The report was not sent: ${error.message}`
                this.posting = false
            });
        }
    }
}
</script>
<template>
    <Dialog
        :visible="visible"
        @update:visible="(v) => $emit('update:visible', v)"
        :modal="true"
        :draggable="false"
        :style="{ width: 'min(90vw, 560px)' }">
        <template #header>
            <div class="d-flex align-items-center">
                <i class="pi pi-server text-danger mr-2 text-xl"></i>
                <h5 data-cy="BugReporter-title" class="modal-title text-white mb-0">Report Bug</h5>
            </div>
        </template>
        <div class="px-2 py-2">
            <div class="mb-3">
                <h6 class="text-white mb-1">What happened?</h6>
                <small class="text-color-secondary">Let us know what happened.</small>
            </div>
            <textarea data-cy="BugReporter-user-information-input" class="form-control" placeholder="Describe the issue..." rows="4" v-model="userInformation"></textarea>
            <div class="mt-3">
                <small v-if="authStore.isLoggedIn" data-cy="BugReporter-reply-to" class="text-color-secondary">We will reply to {{ authStore.user.email }} once it is fixed.</small>
                <template v-else>
                    <label for="bugReporterContactEmail" class="text-white mb-1 d-block">Email, if you want a reply (optional)</label>
                    <input id="bugReporterContactEmail" data-cy="BugReporter-contact-email-input" type="email" class="form-control" placeholder="you@example.com" autocomplete="email" v-model="contactEmail">
                </template>
            </div>
            <small v-if="errorMessage" data-cy="BugReporter-error-message" class="d-block mt-2 text-danger">{{ errorMessage }}</small>
        </div>
        <template #footer>
            <button data-cy="BugReporter-close-modal-button" :disabled="posting" class="p-button p-button-outlined p-button-secondary" @click="$emit('update:visible', false)">Cancel</button>
            <button data-cy="BugReporter-report-bug-button" :disabled="isReported || posting" class="p-button p-button-primary px-4" @click="onReportBug">
                <i v-if="posting" class="pi pi-refresh fa-spin fa-spin mr-2"></i>
                <i v-else-if="isReported" class="pi pi-check mr-2"></i>
                <i v-else class="pi pi-send mr-2"></i>
                {{posting? "Reporting..." : isReported? "Reported!" : "Report Bug"}}
            </button>
        </template>
    </Dialog>
</template>
