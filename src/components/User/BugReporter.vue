<script setup>
import { useMasStore } from '../../stores/mas'
</script>

<script>

export default {
    data() {
        const masStore = useMasStore();
        return {
            isReported: false,
            userInformation: "",
            posting: false,
            masStore,
        }
    },
    methods: {
        onReportBug(event) {
            this.posting = true

            const data = {
                "userDataDump": this.masStore.mas,  
                "userInformation": this.userInformation,
                "username": "Anonymous",
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
                this.posting = false
            });
        }
    }
}
</script>
<template>
    <div class="modal fade" id="reportBugModal" aria-labelledby="reportBugModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-md modal-dialog-centered">
            <div class="modal-content bg-dark border-0 shadow-lg">
                <div class="modal-header border-bottom border-secondary px-4 py-3">
                    <div class="d-flex align-items-center">
                        <i class="fa-solid fa-bug text-danger me-2 fs-5"></i>
                        <h5 data-cy="BugReporter-title" class="modal-title text-white mb-0" id="reportBugModalLabel">Report Bug</h5>
                    </div>
                    <button data-cy="BugReporter-corner-close-modal-button" type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="reportBugModalClose"></button>
                </div>
                <div class="modal-body px-4 py-4">
                    <div class="mb-3">
                        <h6 class="text-white mb-1">What happened?</h6>
                        <small class="text-secondary">Let us know what happened and any contact info (in case you want to be contacted)</small>
                    </div>
                    <textarea data-cy="BugReporter-user-information-input" class="form-control bg-secondary text-white border-secondary" placeholder="Describe the issue..." id="bugReportUserInformation" rows="4" v-model="userInformation"></textarea>
                </div>
                <div class="modal-footer border-top border-secondary px-4 py-3">
                    <button data-cy="BugReporter-close-modal-button" :disabled="posting" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button data-cy="BugReporter-report-bug-button" :disabled="isReported || posting" class="btn btn-primary px-4" @click="onReportBug">
                        <i v-if="posting" class="fa-solid fa-spinner fa-spin me-2"></i>
                        <i v-else-if="isReported" class="fa-solid fa-check me-2"></i>
                        <i v-else class="fa-solid fa-paper-plane me-2"></i>
                        {{posting? "Reporting..." : isReported? "Reported!" : "Report Bug"}}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>