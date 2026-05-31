<script setup>
import Dialog from 'primevue/dialog'
</script>
<script>
export default {
    components: { Dialog },
    emits: ["delete_operation_point", "update:visible"],
    props: { visible: { type: Boolean, default: false } },
    data() {
        return {
            requestingDelete: false,
        }
    },
    methods: {
        onDeleteElement() {
            if (this.$userStore.getUserSubsection.value == 'operationPoints')
                if (!this.requestingDelete) {
                    this.requestingDelete = true
                    const url = import.meta.env.VITE_API_ENDPOINT + '/operation_point_delete/' + this.$userStore.getIdToDelete.value
                    const data = {"username": this.$userStore.getUsername.value}
                    this.$axios.post(url, data)
                    .then(response => {
                        this.requestingDelete = false
                        this.$emit("delete_operation_point", response.data["id"])
                    })
                    .catch(error => {
                        this.requestingDelete = false
                        console.error("error.data")
                        console.error(error.data)
                    });
                }
            this.$emit('update:visible', false)
        },
    },
}
</script>


<template>
    <Dialog :visible="visible"
        @update:visible="(v) => $emit('update:visible', v)" :modal="true" :draggable="false">
        <template #header>
            <p class="modal-title text-xl">Deleting <slot name="elementType"></slot>: <br/> <slot name="elementName"></slot> </p>
        </template>
        <div class="row mt-2">
            <p class="modal-title text-xl text-center col-12">Are you sure? All data will be lost</p>
            <button class="btn text-dark bg-danger mt-4 col-offset-1 col-5" @click="onDeleteElement">Yes, delete it</button>
            <button class="p-button p-button-primary mx-auto d-block mt-4 col-offset-1 col-5" @click="$emit('update:visible', false)">No, take my back</button>
        </div>
    </Dialog>
</template>
