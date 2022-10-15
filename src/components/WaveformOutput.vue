<script setup>
import { ref, watch, computed, defineProps, onMounted } from 'vue'
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import * as Utils from '/src/assets/js/waveformUtils.js'
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'
import * as Defaults from '/src/assets/js/waveformDefaults.js'

const commonStore = useCommonStore()
var store = null

const emit = defineEmits(['switching-frequency-change', 'duty-cycle-change'])

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
const props = defineProps({
    electricalParameter: {
        type: String,
        required: false,
        default: "current",
    },
})

if (props.electricalParameter == "current") {
    store = useCurrentStore()
} else {
    store = useVoltageStore()
}


const peakToPeak = ref(null);
const dcOffset = ref(null);
const effectiveSwitchingFrequency = ref(null);
const effectiveSwitchingFrequencyUnit = ref(null);
const rms = ref(null);

function getOutputs(data) {
    const sampledDataPoints = data
    const sampledTimePoints = commonStore.getSampledTimePoints.value
    const harmonicsFrequencies = commonStore.getHarmonicsFrequencies.value
    const harmonicsAmplitude = store.getHarmonicsAmplitude.value
    const maxMin = Utils.getMaxMinInPoints(sampledDataPoints)
    peakToPeak.value = Utils.removeTrailingZeroes(Utils.roundWithDecimals(maxMin['max'] - maxMin['min'], 0.01))
    dcOffset.value = Utils.removeTrailingZeroes(Utils.roundWithDecimals(sampledDataPoints.reduce((a, b) => a + b, 0) / sampledDataPoints.length, 0.01, true))
    rms.value = Utils.removeTrailingZeroes(Utils.roundWithDecimals(Utils.getRootMeanSquare(sampledDataPoints), 0.01))
    effectiveSwitchingFrequency.value = Utils.getEffectiveFrequency(harmonicsAmplitude, harmonicsFrequencies), 0.01
    const aux = Utils.formatFrequency(effectiveSwitchingFrequency.value)
    effectiveSwitchingFrequency.value =  Utils.removeTrailingZeroes(aux['label'], 2)
    effectiveSwitchingFrequencyUnit.value = aux['unit']
}

store.$onAction((action) => {
    if (action.name == "setSampledDataPoints") {
        getOutputs(action.args[0])
    }
})

</script>


<template>
    <div class="container-flex text-white mt-2 mb-3 pb-3 border-bottom me-2">
            <label class="fs-4 ms-3 mb-3" :class="Defaults.titleColor(electricalParameter)"> Outputs for {{electricalParameter}}</label>
            <div></div>
            <label class="fs-5 ms-3">Peak To Peak:</label>
            <label class="fs-5 ms-2 me-4 float-end" style="width: 10px;">{{electricalParameter == "current"? 'A' : 'V'}}</label>
            <label class="fs-5 bg-dark text-white float-end" style="width: 100%; max-width: 60px; text-align:right;">{{peakToPeak}}</label>

            <div></div>

            <label class="fs-5 ms-3">DC Offset:</label>
            <label class="fs-5 ms-2 me-4 float-end" style="width: 10px;">{{electricalParameter == "current"? 'A' : 'V'}}</label>
            <label class="fs-5 bg-dark text-white float-end" style="width: 100%; max-width: 60px; text-align:right;">{{dcOffset}}</label>

            <div></div>

            <label class="fs-5 ms-3">RMS:</label>
            <label class="fs-5 ms-2 me-4 float-end" style="width: 10px;">{{electricalParameter == "current"? 'A' : 'V'}}</label>
            <label class="fs-5 bg-dark text-white float-end" style="width: 100%; max-width: 60px; text-align:right;">{{rms}}</label>

            <div></div>

            <label class="fs-5 ms-3">Eff. Frequency:</label>
            <label class="fs-5 ms-2 me-4 float-end" style="width: 10px;">{{effectiveSwitchingFrequencyUnit}}</label>
            <label class="fs-5 bg-dark text-white float-end" style="width: 100%; max-width: 60px; text-align:right;">{{effectiveSwitchingFrequency}}</label>

            <div></div>


    </div>
</template>

