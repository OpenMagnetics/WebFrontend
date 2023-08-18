<script setup>
import Dimension from '/src/components/DataInput/Dimension.vue'
import * as Utils from '/src/assets/js/utils.js'
import * as Defaults from '/src/assets/js/defaults.js'


// const peakToPeak = ref(null);
// const dcOffset = ref(null);
// const effectiveSwitchingFrequency = ref(null);
// const effectiveSwitchingFrequencyUnit = ref(null);
// const rms = ref(null);
// const thd = ref(null);

// function getOutputs(data) {
//     const rawDataValues = []
//     store.getDataPoints.value.forEach((item) => {
//         rawDataValues.push(item.y)
//     })
//     const sampledDataPoints = data
//     const sampledTimePoints = commonStore.getSampledTimePoints.value
//     const harmonicsFrequencies = commonStore.getHarmonicsFrequencies.value
//     const harmonicsAmplitude = store.getHarmonicsAmplitude.value
//     const maxMin = Utils.getMaxMinInPoints(sampledDataPoints)
//     const rawMaxMin = Utils.getMaxMinInPoints(rawDataValues)
//     const peakToPeakRaw = Math.max(maxMin['max'], rawMaxMin['max']) - Math.min(maxMin['min'], rawMaxMin['min'])
//     peakToPeak.value = Utils.removeTrailingZeroes(Utils.roundWithDecimals(peakToPeakRaw, 0.01))
//     const dcOffsetRaw = sampledDataPoints.reduce((a, b) => a + b, 0) / sampledDataPoints.length
//     dcOffset.value = Utils.removeTrailingZeroes(Utils.roundWithDecimals(dcOffsetRaw, 0.01, true))
//     const rmsRaw = Utils.getRootMeanSquare(sampledDataPoints)
//     rms.value = Utils.removeTrailingZeroes(Utils.roundWithDecimals(rmsRaw, 0.01))
//     const effectiveSwitchingFrequencyRaw = Utils.getEffectiveFrequency(harmonicsAmplitude, harmonicsFrequencies)
//     const aux = Utils.formatFrequency(effectiveSwitchingFrequencyRaw, 0.01)
//     effectiveSwitchingFrequency.value =  Utils.removeTrailingZeroes(aux['label'], 2)
//     effectiveSwitchingFrequencyUnit.value = aux['unit']
//     const thdRaw = Utils.getTotalHarmonicDistorsion(harmonicsAmplitude)
//     thd.value = Utils.removeTrailingZeroes(Utils.roundWithDecimals(thdRaw * 100, 0.1, true))
//     store.setOutputs({
//             label: store.getOutputs.value["label"],
//             peakToPeak: peakToPeakRaw,
//             offset: dcOffsetRaw,
//             rms: rmsRaw,
//             effectiveFrequency: effectiveSwitchingFrequencyRaw,
//             thd: thdRaw,
//         })
// }

// store.$onAction((action) => {
//     if (action.name == "setSampledDataPoints") {
//         getOutputs(action.args[0])
//     }
// })

</script>

<script>
export default {
    props: {
        modelValue:{
            type: Object,
            required: true
        },
        signalDescriptor: {
            type: String,
            required: false,
            default: "current",
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        return {
        }
    },
    computed: {
    },
    watch: {
        modelValue(newValue, oldValue) {
            this.process();
        },
    },
    mounted () {
        this.process();
    },
    methods: {
        process() {
            this.$mkf.ready.then(_ => {
                this.modelValue[this.signalDescriptor].processed = JSON.parse(this.$mkf.calculate_processed(JSON.stringify(this.modelValue[this.signalDescriptor].harmonics), JSON.stringify(this.modelValue[this.signalDescriptor].waveform)));
                console.log(this.modelValue[this.signalDescriptor].processed);
            });
        }
    }
}
</script>


<template>
    <div class="container-flex">
        <label class="fs-4 ms-3 mb-3" :class="Defaults.titleColor(signalDescriptor)"> Outputs for {{signalDescriptor}}</label>


        <div class="border-bottom col-12" v-for="value, key in this.modelValue[this.signalDescriptor].processed">
            <Dimension 
                v-if="(value != null) && (typeof(value) != 'string')"
                :name="key"
                :unit="'TODO'"
                :dataTestLabel="dataTestLabel + '-' + key"
                :defaultValue="value"
                :readOnly="true"
                v-model="this.modelValue[this.signalDescriptor].processed"
            />
        </div>

<!--         <div></div>
        <label class="fs-5 ms-3">Peak To Peak:</label>
        <label class="fs-5 ms-2 me-4 float-end" style="width: 10px;">{{signalDescriptor == "current"? 'A' : 'V'}}</label>
        <label :data-cy="dataTestLabel + '-WaveformOutput-' + signalDescriptor + '-peakToPeak-text'" class="fs-5 bg-dark text-white float-end" style="width: 100%; max-width: 60px; text-align:right;">{{peakToPeak}}</label>

        <div></div>

        <label class="fs-5 ms-3">DC Offset:</label>
        <label class="fs-5 ms-2 me-4 float-end" style="width: 10px;">{{signalDescriptor == "current"? 'A' : 'V'}}</label>
        <label :data-cy="dataTestLabel + '-WaveformOutput-' + signalDescriptor + '-dcOffset-text'" class="fs-5 bg-dark text-white float-end" style="width: 100%; max-width: 60px; text-align:right;">{{dcOffset}}</label>

        <div></div>

        <label class="fs-5 ms-3">RMS:</label>
        <label class="fs-5 ms-2 me-4 float-end" style="width: 10px;">{{signalDescriptor == "current"? 'A' : 'V'}}</label>
        <label :data-cy="dataTestLabel + '-WaveformOutput-' + signalDescriptor + '-rms-text'" class="fs-5 bg-dark text-white float-end" style="width: 100%; max-width: 60px; text-align:right;">{{rms}}</label>

        <div></div>

        <label class="fs-5 ms-3">Eff. Frequency:</label>
        <label class="fs-5 ms-2 me-4 float-end" style="width: 10px;">{{effectiveSwitchingFrequencyUnit}}</label>
        <label :data-cy="dataTestLabel + '-WaveformOutput-' + signalDescriptor + '-effectiveSwitchingFrequency-text'" class="fs-5 bg-dark text-white float-end" style="width: 100%; max-width: 60px; text-align:right;">{{effectiveSwitchingFrequency}}</label>

        <div></div>

        <label class="fs-5 ms-3">THD:</label>
        <label class="fs-5 ms-2 me-4 float-end" style="width: 10px;">%</label>
        <label :data-cy="dataTestLabel + '-WaveformOutput-' + signalDescriptor + '-thd-text'" class="fs-5 bg-dark text-white float-end" style="width: 100%; max-width: 60px; text-align:right;">{{thd}}</label>

        <div></div>
 -->

    </div>
</template>

