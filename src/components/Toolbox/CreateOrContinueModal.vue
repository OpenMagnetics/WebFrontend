<script setup>
</script>

<script>

export default {
    data() {
        return {
        }
    },
    methods: {
    },
    mounted() {
    }
}
</script>
<template>
    <div class="modal fade" id="createOrContinueModal" aria-labelledby="createOrContinueModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-white">
                <div class="modal-header">
                    <div>
                        <h3 class="modal-title text-center" id="createOrContinueModalLabel">Create new design or continue with current one?</h3>
                        <p class="modal-title text-center" id="createOrContinueModalLabel">We save the current design you worked on, so you can continue with it or create a new one</p>
                    </div>
                </div>
                <div class="modal-body row mt-1 px-4">
                    <button data-cy="CreateOrContinueModal-create-button" class="btn text-dark bg-info mt-2 offset-1 col-5 fs-5 fw-bold" data-bs-dismiss="modal" @click="$emit('onCreate')" >Create new design</button>
                    <button data-cy="CreateOrContinueModal-continue-button" class="btn text-dark bg-primary mt-2 offset-1 col-5 fs-5 fw-bold" data-bs-dismiss="modal" @click="$emit('onContinue')" >Continue with current</button>
                </div>
            </div>
        </div>
    </div>
</template>