<script setup>
</script>

<script>

export default {
    data() {
        return {
            isReported: false,
            userInformation: "",
            posting: false,
        }
    },
    methods: {
        onReportBug(event) {
            this.posting = true

            const data = {
                "userDataDump": this.$userStore.dump,  
                "userInformation": this.userInformation,
                "username": this.$userStore.username,
            }
            console.log(data)
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
    },
    mounted() {
    }
}
</script>
<template>
    <div class="modal fade" id="reportBugModal" aria-labelledby="reportBugModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content bg-dark text-white">
                <div class="modal-header">
                    <h1 class="modal-title fs-5" id="reportBugModalLabel">Report bug</h1>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="reportBugModalClose"></button>
                </div>
                <div class="modal-body row mt-1 px-4">
                    <label class="fs-5 mb-1" for="bugReportUserInformation">Let us know what happened</label>
                    <textarea class="bg-light rounded-2 my-2 text-white" placeholder="Leave a comment here" id="bugReportUserInformation" style="height: 100px" v-model="userInformation"></textarea>
                    <button :disabled="isReported || posting" class="btn text-dark bg-primary mt-2 offset-1 col-5" @click="onReportBug" >{{posting? "Reporting" : isReported? "Bug reported, thanks!" : "Report bug"}}</button>
                    <button :disabled="posting" class="btn btn-dark text-primary border-primary mx-auto d-block mt-2 offset-1 col-5" data-bs-dismiss="modal" >Close</button>

                </div>
            </div>
        </div>
    </div>
</template>