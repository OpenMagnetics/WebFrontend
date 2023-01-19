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
var store = null

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
const thd = ref(null);

function getOutputs(data) {
    const rawDataValues = []
    store.getDataPoints.value.forEach((item) => {
        rawDataValues.push(item.y)
    })
    const sampledDataPoints = data
    const sampledTimePoints = commonStore.getSampledTimePoints.value
    const harmonicsFrequencies = commonStore.getHarmonicsFrequencies.value
    const harmonicsAmplitude = store.getHarmonicsAmplitude.value
    const maxMin = Utils.getMaxMinInPoints(sampledDataPoints)
    const rawMaxMin = Utils.getMaxMinInPoints(rawDataValues)
    const peakToPeakRaw = Math.max(maxMin['max'], rawMaxMin['max']) - Math.min(maxMin['min'], rawMaxMin['min'])
    peakToPeak.value = Utils.removeTrailingZeroes(Utils.roundWithDecimals(peakToPeakRaw, 0.01))
    const dcOffsetRaw = sampledDataPoints.reduce((a, b) => a + b, 0) / sampledDataPoints.length
    dcOffset.value = Utils.removeTrailingZeroes(Utils.roundWithDecimals(dcOffsetRaw, 0.01, true))
    const rmsRaw = Utils.getRootMeanSquare(sampledDataPoints)
    rms.value = Utils.removeTrailingZeroes(Utils.roundWithDecimals(rmsRaw, 0.01))
    const effectiveSwitchingFrequencyRaw = Utils.getEffectiveFrequency(harmonicsAmplitude, harmonicsFrequencies)
    const aux = Utils.formatFrequency(effectiveSwitchingFrequencyRaw, 0.01)
    effectiveSwitchingFrequency.value =  Utils.removeTrailingZeroes(aux['label'], 2)
    effectiveSwitchingFrequencyUnit.value = aux['unit']
    const thdRaw = Utils.getTotalHarmonicDistorsion(harmonicsAmplitude)
    thd.value = Utils.removeTrailingZeroes(Utils.roundWithDecimals(thdRaw * 100, 0.1, true))
    store.setOutputs({
            label: store.getOutputs.value["label"],
            peakToPeak: peakToPeakRaw,
            offset: dcOffsetRaw,
            rms: rmsRaw,
            effectiveFrequency: effectiveSwitchingFrequencyRaw,
            thd: thdRaw,
        })
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

            <label class="fs-5 ms-3">THD:</label>
            <label class="fs-5 ms-2 me-4 float-end" style="width: 10px;">%</label>
            <label class="fs-5 bg-dark text-white float-end" style="width: 100%; max-width: 60px; text-align:right;">{{thd}}</label>

            <div></div>


    </div>
</template>

