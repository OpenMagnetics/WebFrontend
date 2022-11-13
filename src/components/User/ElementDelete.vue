<script setup>
import { ref } from 'vue'
import axios from "axios"
import { useUserStore } from '/src/stores/user'

const emit = defineEmits(['delete_operation_point'])
const userStore = useUserStore()
var requestingDelete = false

function onDeleteElement() {
    if (userStore.getUserSubsection.value == 'operationPoints')
        if (!requestingDelete) {
            requestingDelete = true
            const url = import.meta.env.VITE_API_ENDPOINT + '/operation_point_delete/' + userStore.getIdToDelete.value
            const data = {"username": userStore.getUsername.value}
            axios.post(url, data)
            .then(response => {
                requestingDelete = false
                emit("delete_operation_point", response.data["id"])
            })
            .catch(error => {
                requestingDelete = false
                console.error("error.data")
                console.error(error.data)
            });
        }
    // TODO add rest of cases 
}

</script>


<template>
    <div class="modal fade" id="deleteElementModal" tabindex="-1" aria-labelledby="modalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content bg-dark text-white">
                <div class="modal-header">
                    <h1 class="modal-title fs-5" id="modalLabel">Deleting <slot name="elementType"></slot>: <br/> <slot name="elementName"></slot> </h1>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body row mt-2">
                    <h1 class="modal-title fs-5 text-center col-12" >Are you sure? All data will be lost</h1>
                    <button class="btn text-dark bg-danger mt-4 offset-1 col-5" data-bs-dismiss="modal" @click="onDeleteElement">Yes, delete it</button>
                    <button class="btn btn-primary mx-auto d-block mt-4 offset-1 col-5" data-bs-dismiss="modal" >No, take my back</button>
                </div>
            </div>
        </div>
    </div>
</template>