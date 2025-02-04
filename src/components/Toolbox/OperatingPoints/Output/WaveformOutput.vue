<script setup>
import DimensionReadOnly from '/WebSharedComponents/DataInput/DimensionReadOnly.vue'
import { removeTrailingZeroes } from '/WebSharedComponents/assets/js/utils.js'
import { minimumMaximumScalePerParameter, titleColor } from '/WebSharedComponents/assets/js/defaults.js'
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
        const blockingRebounds = false;

        return {
            blockingRebounds,
        }
    },
    computed: {
    },
    watch: {
        'modelValue.current.waveform': {
            handler(newValue, oldValue) {
                if (this.signalDescriptor == 'current')
                    this.process();
            },
            deep: true
        },
        'modelValue.current.processed': {
            handler(newValue, oldValue) {
                if (this.signalDescriptor == 'current')
                    this.process();
            },
            deep: true
        },
        'modelValue.voltage.waveform': {
            handler(newValue, oldValue) {
                if (this.signalDescriptor == 'voltage')
                    this.process();
            },
            deep: true
        },
        'modelValue.voltage.processed': {
            handler(newValue, oldValue) {
                if (this.signalDescriptor == 'voltage')
                    this.process();
            },
            deep: true
        },
    },
    mounted () {
        this.process();
    },
    methods: {
        process() {
            this.$mkf.ready.then(_ => {
                if (this.modelValue[this.signalDescriptor].harmonics == null) {
                    this.modelValue[this.signalDescriptor].harmonics = JSON.parse(this.$mkf.calculate_harmonics(JSON.stringify(this.modelValue[this.signalDescriptor].waveform), this.modelValue.frequency));
                }
                var processed = JSON.parse(this.$mkf.calculate_processed(JSON.stringify(this.modelValue[this.signalDescriptor].harmonics), JSON.stringify(this.modelValue[this.signalDescriptor].waveform)));
                this.modelValue[this.signalDescriptor].processed.acEffectiveFrequency = processed.acEffectiveFrequency;
                this.modelValue[this.signalDescriptor].processed.effectiveFrequency = processed.effectiveFrequency;
                this.modelValue[this.signalDescriptor].processed.peak = processed.peak;
                this.modelValue[this.signalDescriptor].processed.rms = processed.rms;
                this.modelValue[this.signalDescriptor].processed.thd = processed.thd;
                if (this.modelValue[this.signalDescriptor].processed.label == 'Custom') {
                    this.modelValue[this.signalDescriptor].processed.dutyCycle = processed.dutyCycle;
                    this.modelValue[this.signalDescriptor].processed.peakToPeak = processed.peakToPeak;
                    this.modelValue[this.signalDescriptor].processed.offset = processed.offset;
                }
            });
        }
    }
}
</script>

<template>
    <div class="container-flex">
        <label class="fs-4" :class="titleColor(signalDescriptor)"> Outputs for {{signalDescriptor}}</label>
        <DimensionReadOnly 
            :name="'dutyCycle'"
            :unit="null"
            :altUnit="'%'"
            :visualScale="100"
            :dataTestLabel="dataTestLabel + '-DutyCycle'"
            :value="removeTrailingZeroes(modelValue[signalDescriptor].processed.dutyCycle)"
            :min="minimumMaximumScalePerParameter.percentage.min"
            :max="minimumMaximumScalePerParameter.percentage.max"
            :disableShortenLabels="true"
            :labelBgColor="$settingsStore.labelBgColor"
            :inputBgColor="$settingsStore.labelBgColor"
            :textColor="$settingsStore.textColor"
        />
        <DimensionReadOnly 
            :name="'peakToPeak'"
            :unit="signalDescriptor == 'current'? 'A' : 'V'"
            :dataTestLabel="dataTestLabel + '-PeakToPeak'"
            :value="modelValue[signalDescriptor].processed.peakToPeak"
            :min="minimumMaximumScalePerParameter[signalDescriptor].min"
            :max="minimumMaximumScalePerParameter[signalDescriptor].max"
            :disableShortenLabels="true"
            :labelBgColor="$settingsStore.labelBgColor"
            :inputBgColor="$settingsStore.labelBgColor"
            :textColor="$settingsStore.textColor"
        />
        <DimensionReadOnly 
            :name="'offset'"
            :unit="signalDescriptor == 'current'? 'A' : 'V'"
            :dataTestLabel="dataTestLabel + '-Offset'"
            :value="modelValue[signalDescriptor].processed.offset"
            :min="minimumMaximumScalePerParameter[signalDescriptor].min"
            :max="minimumMaximumScalePerParameter[signalDescriptor].max"
            :disableShortenLabels="true"
            :labelBgColor="$settingsStore.labelBgColor"
            :inputBgColor="$settingsStore.labelBgColor"
            :textColor="$settingsStore.textColor"
        />
        <DimensionReadOnly 
            :name="'effectiveFrequency'"
            :unit="'Hz'"
            :dataTestLabel="dataTestLabel + '-EffectiveFrequency'"
            :value="modelValue[signalDescriptor].processed.effectiveFrequency"
            :min="minimumMaximumScalePerParameter.frequency.min"
            :max="minimumMaximumScalePerParameter.frequency.max"
            :disableShortenLabels="true"
            :labelBgColor="$settingsStore.labelBgColor"
            :inputBgColor="$settingsStore.labelBgColor"
            :textColor="$settingsStore.textColor"
        />
        <DimensionReadOnly 
            :name="'peak'"
            :unit="signalDescriptor == 'current'? 'A' : 'V'"
            :dataTestLabel="dataTestLabel + '-Peak'"
            :value="modelValue[signalDescriptor].processed.peak"
            :min="minimumMaximumScalePerParameter[signalDescriptor].min"
            :max="minimumMaximumScalePerParameter[signalDescriptor].max"
            :disableShortenLabels="true"
            :labelBgColor="$settingsStore.labelBgColor"
            :inputBgColor="$settingsStore.labelBgColor"
            :textColor="$settingsStore.textColor"
        />
        <DimensionReadOnly 
            :name="'rms'"
            :unit="signalDescriptor == 'current'? 'A' : 'V'"
            :dataTestLabel="dataTestLabel + '-Rms'"
            :value="modelValue[signalDescriptor].processed.rms"
            :min="minimumMaximumScalePerParameter[signalDescriptor].min"
            :max="minimumMaximumScalePerParameter[signalDescriptor].max"
            :disableShortenLabels="true"
            :labelBgColor="$settingsStore.labelBgColor"
            :inputBgColor="$settingsStore.labelBgColor"
            :textColor="$settingsStore.textColor"
        />
        <DimensionReadOnly 
            :name="'thd'"
            :unit="null"
            :altUnit="'%'"
            :visualScale="100"
            :dataTestLabel="dataTestLabel + '-Thd'"
            :value="modelValue[signalDescriptor].processed.thd"
            :min="minimumMaximumScalePerParameter.percentage.min"
            :max="minimumMaximumScalePerParameter.percentage.max"
            :disableShortenLabels="true"
            :labelBgColor="$settingsStore.labelBgColor"
            :inputBgColor="$settingsStore.labelBgColor"
            :textColor="$settingsStore.textColor"
        />

    </div>
</template>

