<script setup>
import { ref, watch, computed, defineProps } from 'vue'
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import * as Utils from '/src/assets/js/utils.js'
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'
import * as Defaults from '/src/assets/js/defaults.js'

const commonStore = useCommonStore()
const voltageStore = useVoltageStore()
const currentStore = useCurrentStore()

var currentSampledDataPoint = null
var voltageSampledDataPoint = null


const style = getComputedStyle(document.body);
const theme = {
  primary: style.getPropertyValue('--bs-primary'),
  secondary: style.getPropertyValue('--bs-secondary'),
  success: style.getPropertyValue('--bs-success'),
  info: style.getPropertyValue('--bs-info'),
  warning: style.getPropertyValue('--bs-warning'),
  danger: style.getPropertyValue('--bs-danger'),
  light: style.getPropertyValue('--bs-light'),
  dark: style.getPropertyValue('--bs-dark'),
  white: style.getPropertyValue('--bs-white'),
}


const rmsPower = ref(null);
const rmsPowerUnit = ref(null);
const instantaneousPower = ref(null);
const instantaneousPowerUnit = ref(null);

function getOutputs() {
    const currentRMS = Utils.getRootMeanSquare(currentSampledDataPoint)
    const voltageRMS = Utils.getRootMeanSquare(voltageSampledDataPoint)
    const rmsPowerAux = Utils.formatPower(currentRMS * voltageRMS)
    rmsPower.value = Utils.removeTrailingZeroes(rmsPowerAux['label'], 2)
    rmsPowerUnit.value = rmsPowerAux['unit']

    const instantaneousPowerRaw = Utils.getInstantaneousPower(currentSampledDataPoint, voltageSampledDataPoint)
    const instantaneousPowerAux = Utils.formatPower(Utils.removeTrailingZeroes(instantaneousPowerRaw, 2))
    instantaneousPower.value = Utils.removeTrailingZeroes(instantaneousPowerAux['label'], 2)
    instantaneousPowerUnit.value = instantaneousPowerAux['unit']
}

currentStore.$onAction((action) => {
    if (action.name == "setSampledDataPoints") {
        currentSampledDataPoint = action.args[0]
        if (voltageSampledDataPoint != null && currentSampledDataPoint != null)
            getOutputs()
    }
})

voltageStore.$onAction((action) => {
    if (action.name == "setSampledDataPoints") {
        voltageSampledDataPoint = action.args[0]
        if (voltageSampledDataPoint != null && currentSampledDataPoint != null)
            getOutputs()
    }
})

</script>


<template>
    <div class="container-flex text-white mt-2 mb-3 pb-3 border-bottom me-2">
            <label class="fs-4 ms-3 mb-3" :class="Defaults.titleColor('power')"> Outputs for Power</label>
            <div></div>
            <label class="fs-5 ms-3">RMS power:</label>
            <label class="fs-5 ms-2 me-4 float-end" style="width: 10px;">{{rmsPowerUnit}}</label>
            <label class="fs-5 bg-dark text-white float-end" style="width: 100%; max-width: 60px; text-align:right;">{{rmsPower}}</label>

            <div></div>
            <label class="fs-5 ms-3">Instantaneous power:</label>
            <label class="fs-5 ms-2 me-4 float-end" style="width: 10px;">{{instantaneousPowerUnit}}</label>
            <label class="fs-5 bg-dark text-white float-end" style="width: 100%; max-width: 60px; text-align:right;">{{instantaneousPower}}</label>

    </div>
</template>

