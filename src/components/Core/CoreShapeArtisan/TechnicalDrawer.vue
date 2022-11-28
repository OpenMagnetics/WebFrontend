<script setup>
import { ref } from 'vue'
import { useCoreStore } from '/src/stores/core'
        
const coreStore = useCoreStore();

const topView = ref(null)
const frontView = ref(null)
const posting = ref(true)


coreStore.$onAction((action) => {
    if (action.name == "setTechnicalDrawing") {
        posting.value = false
        var views = action.args[0]
        topView.value.innerHTML = views['top_view']
        frontView.value.innerHTML = views['front_view']
    }
    else if (action.name == "requestingNewShape") {
        posting.value = true
    }
})

</script>


<template>
    <div class="row">
        <img v-if="posting" class="mx-auto d-block col-12" alt="loading" style="width: 100%; height: auto;" src="/images/loading.gif">
        <div v-show="!posting" ref="topView" class="col-12" style="height: 100%;">

        </div>
        <img v-if="posting" class="mx-auto d-block col-12" alt="loading" style="width: 100%; height: auto;" src="/images/loading.gif">
        <div v-show="!posting" ref="frontView" class="col-12" style="height: 100%;">

        </div>
    </div>
</template>