<script setup>
import { useMasStore } from '../../stores/mas'
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
                <small class="text-secondary">Let us know what happened and any contact info (in case you want to be contacted)</small>
            </div>
            <textarea data-cy="BugReporter-user-information-input" class="form-control bg-secondary text-white border-secondary" placeholder="Describe the issue..." rows="4" v-model="userInformation"></textarea>
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
