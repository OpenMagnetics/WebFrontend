<script setup>
import * as Utils from '/src/assets/js/utils.js'
import { useUserStore } from '/src/stores/user'
import { useCoreStore } from '/src/stores/core'
import * as Defaults from '/src/assets/js/defaults.js'

</script>
<script>

export default {
    data() {
        const userStore = useUserStore();
        const coreStore = useCoreStore();
        const fullCoreModelSelected = coreStore.fullCoreModel;
        return {
            fullCoreModelSelected,
            userStore,
            coreStore,
        }
    },
    computed: {
        styleTooltip() {
            var relative_placement;
            relative_placement = 'right'
            return {
                    theme: {
                        placement: relative_placement,
                        width: '200px',
                        "text-align": "center",
                    },
                }
        },
    },
    methods: {
        OnChange(event) {
            console.log(event.target.value)
            console.log(this.fullCoreModelSelected)
            this.coreStore.setFullCoreModel(this.fullCoreModelSelected == 1)
        },
    },
    mounted() {

    }
}
</script>


<template>
    <div v-tooltip="styleTooltip" class="container-flex text-white mt-2 mb-3 pb-3 border-top me-2">
        <div class="row">
            <label v-tooltip="'Show the full gapped core or just the ungapped original piece?'" class="fs-6 mt-2 p-0 ps-3 text-white col-6"> Full core?</label>
            <i class="fa-solid fa-xmark mt-2 pt-1 ps-2 text-danger col-1 p-0"></i>
            <input v-model="fullCoreModelSelected" @change="OnChange" type="range" class="mt-2 form-range offset-1 col-1" min="0" max="1" step="1" style="width: 30px">
            <i class="fa-solid fa-check mt-2 pt-1 text-success offset-1 col-1 p-0"></i>
        </div>
    </div>
</template>

