<script setup>

import DimensionReadOnly from '/WebSharedComponents/DataInput/DimensionReadOnly.vue'
import { removeTrailingZeroes } from '/WebSharedComponents/assets/js/utils.js'
import { minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
import { toTitleCase, combinedStyle } from '/WebSharedComponents/assets/js/utils.js'
import { useTaskQueueStore } from '../../../../stores/taskQueue'
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
        const taskQueueStore = useTaskQueueStore();

        return {
            blockingRebounds,
            taskQueueStore,
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
        async process() {
            try {
                if (this.modelValue[this.signalDescriptor].harmonics == null) {
                    this.modelValue[this.signalDescriptor].harmonics = await this.taskQueueStore.calculateHarmonics(this.modelValue[this.signalDescriptor].waveform, this.modelValue.frequency);
                }
                var processed = await this.taskQueueStore.calculateProcessed(this.modelValue[this.signalDescriptor].harmonics, this.modelValue[this.signalDescriptor].waveform);
                // Ensure processed object exists
                if (!this.modelValue[this.signalDescriptor].processed) {
                    this.modelValue[this.signalDescriptor].processed = {};
                }
                this.modelValue[this.signalDescriptor].processed.acEffectiveFrequency = processed.acEffectiveFrequency;
                this.modelValue[this.signalDescriptor].processed.effectiveFrequency = processed.effectiveFrequency;
                this.modelValue[this.signalDescriptor].processed.peak = processed.peak;
                this.modelValue[this.signalDescriptor].processed.rms = processed.rms;
                this.modelValue[this.signalDescriptor].processed.thd = processed.thd;
                const label = this.modelValue[this.signalDescriptor].processed.label;
                if (!label || label == 'Custom') {
                    this.modelValue[this.signalDescriptor].processed.dutyCycle = processed.dutyCycle;
                    this.modelValue[this.signalDescriptor].processed.peakToPeak = processed.peakToPeak;
                    this.modelValue[this.signalDescriptor].processed.offset = processed.offset;
                    this.modelValue[this.signalDescriptor].processed.label = 'Custom';
                }
            } catch (error) {
                console.error('Error in process:', error);
            }
        }
    }
}
</script>

<template>
    <div class="container-flex">
        <label
            :style="combinedStyle([$styleStore.operatingPoints.inputTitleFontSize, signalDescriptor == 'current'? $styleStore.operatingPoints.currentTextColor : signalDescriptor == 'voltage'? $styleStore.operatingPoints.voltageTextColor : $styleStore.operatingPoints.commonParameterTextColor])"
        > 
            {{`Outputs for ${signalDescriptor}`}}
        </label>
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
            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
            :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
            :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
            :textColor="$styleStore.operatingPoints.inputTextColor"
        />
        <DimensionReadOnly 
            :name="'peakToPeak'"
            :unit="signalDescriptor == 'current'? 'A' : 'V'"
            :dataTestLabel="dataTestLabel + '-PeakToPeak'"
            :value="modelValue[signalDescriptor].processed.peakToPeak"
            :min="minimumMaximumScalePerParameter[signalDescriptor].min"
            :max="minimumMaximumScalePerParameter[signalDescriptor].max"
            :disableShortenLabels="true"
            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
            :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
            :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
            :textColor="$styleStore.operatingPoints.inputTextColor"
        />
        <DimensionReadOnly 
            :name="'offset'"
            :unit="signalDescriptor == 'current'? 'A' : 'V'"
            :dataTestLabel="dataTestLabel + '-Offset'"
            :value="modelValue[signalDescriptor].processed.offset"
            :min="minimumMaximumScalePerParameter[signalDescriptor].min"
            :max="minimumMaximumScalePerParameter[signalDescriptor].max"
            :disableShortenLabels="true"
            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
            :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
            :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
            :textColor="$styleStore.operatingPoints.inputTextColor"
        />
        <DimensionReadOnly 
            :name="'effectiveFrequency'"
            :unit="'Hz'"
            :dataTestLabel="dataTestLabel + '-EffectiveFrequency'"
            :value="modelValue[signalDescriptor].processed.effectiveFrequency"
            :min="minimumMaximumScalePerParameter.frequency.min"
            :max="minimumMaximumScalePerParameter.frequency.max"
            :disableShortenLabels="true"
            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
            :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
            :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
            :textColor="$styleStore.operatingPoints.inputTextColor"
        />
        <DimensionReadOnly 
            :name="'peak'"
            :unit="signalDescriptor == 'current'? 'A' : 'V'"
            :dataTestLabel="dataTestLabel + '-Peak'"
            :value="modelValue[signalDescriptor].processed.peak"
            :min="minimumMaximumScalePerParameter[signalDescriptor].min"
            :max="minimumMaximumScalePerParameter[signalDescriptor].max"
            :disableShortenLabels="true"
            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
            :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
            :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
            :textColor="$styleStore.operatingPoints.inputTextColor"
        />
        <DimensionReadOnly 
            :name="'rms'"
            :unit="signalDescriptor == 'current'? 'A' : 'V'"
            :dataTestLabel="dataTestLabel + '-Rms'"
            :value="modelValue[signalDescriptor].processed.rms"
            :min="minimumMaximumScalePerParameter[signalDescriptor].min"
            :max="minimumMaximumScalePerParameter[signalDescriptor].max"
            :disableShortenLabels="true"
            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
            :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
            :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
            :textColor="$styleStore.operatingPoints.inputTextColor"
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
            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
            :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
            :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
            :textColor="$styleStore.operatingPoints.inputTextColor"
        />

    </div>
</template>

