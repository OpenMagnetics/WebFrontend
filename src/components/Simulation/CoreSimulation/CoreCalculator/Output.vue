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
            totalCoreLosses: "Soon",
            maximumCoreTemperatureRise: "Soon",
            EddyCurrentLosses: "Soon",
            HysteresisLosses: "Soon",
            magneticFluxDensityMaximum: "Soon",
            magneticFluxDensityPeakToPeak: "Soon",
        }
    },
    computed: {
        styleTooltip() {
            var relative_placement;
            relative_placement = 'top'
            return {
                    theme: {
                        placement: relative_placement,
                        width: '200px',
                        "text-align": "center",
                    },
                }
        },
    },
    mounted() {

        this.$userStore.$onAction((action) => {
        })
    }
}
</script>


<template>
    <div v-tooltip="styleTooltip" class="container-flex text-white mt-2 mb-3 pb-3 border-bottom me-2">
        <div class="row">
            <label class="fs-4 ms-3 mb-3 text-white col-12"> Outputs for shape</label>
            <div class="col-xl-4 col-lg-12">
                <div class="container">
                    <div class="row">
                        <label v-tooltip="'Total losses of the magnetic core'" class="m-0 p-0 fs-5 col-8">Total core losses:</label>
                        <label class="fs-5 bg-dark text-white float-end m-0 p-0 col-4" style=" text-align:right;">{{totalCoreLosses + ' W'}}</label>
                    </div>
                    <div class="row">
                        <label v-tooltip="'Maximum temperature rise in the magnetic core'" class="m-0 p-0 fs-5 col-8">Max. Temp Rise:</label>
                        <label class="fs-5 bg-dark text-white float-end m-0 p-0 col-4" style=" text-align:right;">{{maximumCoreTemperatureRise + ' W'}}</label>
                    </div>
                </div>
            </div>
            <div class="col-xl-4 col-lg-12">
                <div class="container">
                    <div class="row">
                        <label v-tooltip="'Losses of the magnetic core due to eddy currents'" class="m-0 p-0 fs-5 col-8">Eddy Curr. losses:</label>
                        <label class="fs-5 bg-dark text-white float-end m-0 p-0 col-4" style=" text-align:right;">{{EddyCurrentLosses + ' W'}}</label>
                    </div>
                    <div class="row">
                        <label v-tooltip="'Losses of the magnetic core due to hysteresis'" class="m-0 p-0 fs-5 col-8">Hysteresis losses:</label>
                        <label class="fs-5 bg-dark text-white float-end m-0 p-0 col-4" style=" text-align:right;">{{HysteresisLosses + ' W'}}</label>
                    </div>
                </div>
            </div>
            <div class="col-xl-4 col-lg-12">
                <div class="container">
                    <div class="row">
                        <label v-tooltip="'Maximum value that of the magnetic flux density inside the core'" class="m-0 p-0 fs-5 col-8">Peak B (Bmax):</label>
                        <label class="fs-5 bg-dark text-white float-end m-0 p-0 col-4" style=" text-align:right;">{{magneticFluxDensityMaximum + ' T'}}</label>
                    </div>
                    <div class="row">
                        <label v-tooltip="'Peak to peak value of the magnetic flux density'" class="m-0 p-0 fs-5 col-8">Peak to Peak B (ΔB):</label>
                        <label class="fs-5 bg-dark text-white float-end m-0 p-0 col-4" style=" text-align:right;">{{magneticFluxDensityPeakToPeak + ' T'}}</label>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

