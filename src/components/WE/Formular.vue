<script setup >
import { useMasStore } from '/src/stores/mas'
import { useCatalogStore } from '/src/stores/catalog'
import { Modal } from "bootstrap";
</script>

<script>

export default {
    data() {
        const email = ""
        const name = ""
        const checked = false
        const masStore = useMasStore();
        const catalogStore = useCatalogStore();
        return {
            masStore,
            catalogStore,
            email,
            name,
            checked,
        }
    },
    methods: {
        storeAndCloseModal() {
            console.log(this.name)
            console.log(this.email)

            const data = {
                email: this.email,
                name: this.name,
                mas: this.masStore.mas,
            }
            console.log(this.catalogStore.requests)
            this.catalogStore.requests.push(data);
            console.log(this.catalogStore.requests)
            const url = import.meta.env.VITE_API_ENDPOINT + '/store_request';
            this.$axios.post(url, data)
            .then(response => {
            })
            .catch(error => {
                console.error(error)
            });
            this.$refs.closeModalButton.click()
        },
        changedCheckedValue(value) {
            this.checked = !this.checked
        },
    },
    computed: {
    },
    mounted() {
    },
    created() {
    }
}
</script>


<template>
    <div class="modal fade" id="requestModal" tabindex="-1" aria-labelledby="requestModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content bg-dark text-white">

                <div class="modal-body row ms-3 mt-4">
                    <label :for="'email-text-input'" class="rounded-2 fs-5 col-3">Name</label>
                    <input type="text" class="m-0 px-0 col-8 bg-light text-white" :id="'email-text-input'" v-model="name">
                </div>
                <div class="modal-body row ms-3 mt-4">
                    <label :for="'email-text-input'" class="rounded-2 fs-5  col-3">Email</label>
                    <input type="text" class="m-0 px-0 col-8 bg-light text-white" :id="'email-text-input'" v-model="email">
                </div>
                <div class="modal-body row ms-3 mt-4">
                    <input class="ms-3 form-check-input col-1" type="checkbox" :checked="false" @change="changedCheckedValue">

                    <label class="form-check-label col-11" :for="name + '-checkbox-input'">
                        I consent to be contacted in the future regarding my design.
                    </label>

                </div>

                <div class="modal-body row mt-4">
                    <p ref="notificationContent" class="modal-title fs-5 text-center col-12" ></p>
                    <button :disabled="!checked" data-cy="requestModal-accept-button" class="btn btn-primary mx-auto d-block mt-5 offset-1 col-5" @click="storeAndCloseModal">Request</button>
                    <button 
                        hidden    
                        ref="closeModalButton"
                        data-cy="requestModal-accept-button"
                        class="btn btn-primary mt-1 rounded-3"
                        data-bs-dismiss="modal"></button>
                </div>
            </div>
        </div>
    </div>
</template>