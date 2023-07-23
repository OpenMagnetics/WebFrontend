<script setup>
import * as Utils from '/src/assets/js/utils.js'
import { useCoreStore } from '/src/stores/core'
import * as Defaults from '/src/assets/js/defaults.js'

</script>
<script>

export default {
    data() {
        const posting = false;
        const coreStore = useCoreStore();
        return {
            posting,
            coreStore,
            effectiveLength: null,
            effectiveArea: null,
            effectiveVolume: null,
            minimumArea: null,
        }
    },
    computed: {
        styleTooltip() {
            var relative_placement;
            relative_placement = 'top'
            return {
                    theme: {
                        placement: relative_placement,
                        width: '400px',
                        "text-align": "center",
                    },
                }
        },
    },
    mounted() {

        this.$userStore.$onAction((action) => {
            if (action.name == "setGlobalCore") {
                var globalCore = action.args[0]
                this.effectiveLength = Utils.removeTrailingZeroes(globalCore['processedDescription']['effectiveParameters']['effectiveLength'] * 1000, 1)
                this.effectiveArea = Utils.removeTrailingZeroes(globalCore['processedDescription']['effectiveParameters']['effectiveArea'] * 1000000, 1)
                this.effectiveVolume = Utils.removeTrailingZeroes(globalCore['processedDescription']['effectiveParameters']['effectiveVolume'] * 1000000000, 1)
                this.minimumArea = Utils.removeTrailingZeroes(globalCore['processedDescription']['effectiveParameters']['minimumArea'] * 1000000, 1)
            }
        })
    }
}
</script>


<template>
    <div v-tooltip="styleTooltip" class="container-flex text-white mt-2 mb-3 pb-3 border-bottom me-2">
        <div class="row">
            <label class="fs-4 ms-3 mb-3 text-white col-12"> Outputs for shape</label>
            <div class="col-xl-6 col-lg-12">
                <label v-tooltip="'Effective length of the shape. Want to know more about it? Read our article: https://openmagnetics.com/musings/7'" class="fs-5 ms-3">Eff. length:</label>
                <label data-test-id="CoreShapeArtisanOutput-effectiveLength-text" class="fs-5 bg-dark text-white float-end" style=" text-align:right;">{{effectiveLength + ' mm'}}</label>
            </div>
            <div class="col-xl-6 col-lg-12">
                <label v-tooltip="'Effective area of the shape. Want to know more about it? Read our article: https://openmagnetics.com/musings/7'" class="fs-5 ms-3">Eff. area:</label>
                <label data-test-id="CoreShapeArtisanOutput-effectiveArea-text" class="fs-5 bg-dark text-white float-end" style=" text-align:right;">{{effectiveArea + ' mm²'}}</label>
            </div>
            <div class="col-xl-6 col-lg-12">
                <label v-tooltip="'Effective volume of the shape. Want to know more about it? Read our article: https://openmagnetics.com/musings/7'" class="fs-5 ms-3">Eff. volume:</label>
                <label data-test-id="CoreShapeArtisanOutput-effectiveVolume-text" class="fs-5 bg-dark text-white float-end" style=" text-align:right;">{{effectiveVolume + ' mm³'}}</label>
            </div>
            <div class="col-xl-6 col-lg-12">
                <label v-tooltip="'Minimum area of the shape. Want to know more about it? Read our article: https://openmagnetics.com/musings/7'" class="fs-5 ms-3">Min. area:</label>
                <label data-test-id="CoreShapeArtisanOutput-minimumArea-text" class="fs-5 bg-dark text-white float-end" style=" text-align:right;">{{minimumArea + ' mm²'}}</label>
            </div>
        </div>
    </div>
</template>

