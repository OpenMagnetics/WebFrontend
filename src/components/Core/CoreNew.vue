<template>
    <div class="modal fade" id="newCoreModal" tabindex="-1" aria-labelledby="newCoreModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content bg-dark text-white">
                <div class="modal-header">
                    <p class="modal-title fs-5" id="newCoreModalLabel">New core</p>
                    <button data-cy="CoreNew-corner-close-button" type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="newCoreModalClose"></button>
                </div>
                <div class="modal-body row mt-4">
                    <p class="modal-title fs-5 text-center col-12" >Are you sure? All changes will be lost</p>
                    <button data-cy="CoreNew-new-button" class="btn text-dark bg-danger mt-5 offset-1 col-5" data-bs-dismiss="modal" @click="$emit('onNewCore')">Yes, new one please!</button>
                    <button data-cy="CoreNew-close-button" class="btn btn-primary mx-auto d-block mt-5 offset-1 col-5" data-bs-dismiss="modal" >No, take my back</button>
                </div>
            </div>
        </div>
    </div>
</template>