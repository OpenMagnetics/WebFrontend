<script setup>
import { ref } from 'vue'
import { useCoreStore } from '/src/stores/core'
        
const coreStore = useCoreStore();

const frontView = ref(null)
const modalFrontView = ref(null)
const posting = ref(true)

coreStore.$onAction((action) => {
    if (action.name == "setGappingTechnicalDrawing") {
        posting.value = false
        var views = action.args[0]
        frontView.value.innerHTML = views['front_view']
        modalFrontView.value.innerHTML = views['front_view']
    }
    else if (action.name == "requestingGappingTechnicalDrawing") {
        posting.value = true
        setTimeout(() => {posting.value = false}, 10000);
    }
})

function computeGapping() {
    coreStore.requestGappingTechnicalDrawing()
}

setTimeout(() => {coreStore.requestGappingTechnicalDrawing()}, 5000);

</script>


<template>
    <!-- Modal -->
    <div class="modal fade" id="GappingTechnicalDrawingSVGModal" tabindex="-1" aria-labelledby="GappingTechnicalDrawingSVGModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl bg-light">
            <div class="modal-header text-white">
                <p class="modal-title fs-5" id="GappingTechnicalDrawingSVGModalLabel">Gapping Technical Drawing</p>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="GappingTechnicalDrawingSVGModalLabelClose"></button>
            </div>
            <div class="modal-body">
                <div v-show="!posting" ref="modalFrontView" class="col-12" style="height: 100%;" />
                <img id="svg" v-if="posting" class="mx-auto d-block col-12" alt="loading" style="width: 100%; height: auto;" src="/images/loading.gif">
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
    <div class="container-flex">
        <div class="row">
            <button v-if="!posting" class="submit-btn btn mt-2 fs-6 bg-light text-primary col-12 " type="submit" @click="computeGapping">Compute gapping</button>
            <button class="btn" data-bs-toggle="modal" data-bs-target="#GappingTechnicalDrawingSVGModal">

            <img id="svg" v-if="posting" class="mx-auto d-block col-12" alt="loading" style="width: 100%; height: auto;" src="/images/loading.gif">
            <div v-show="!posting" ref="frontView" class="col-12" style="height: 100%;" />
            <label class="col-12 text-info" v-show="!posting">Click on image to enlarge</label>
            </button>

        </div>
    </div>
</template>
