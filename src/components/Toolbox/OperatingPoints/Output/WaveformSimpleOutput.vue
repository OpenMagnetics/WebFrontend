<script setup>

import DimensionReadOnly from '/WebSharedComponents/DataInput/DimensionReadOnly.vue'
import { removeTrailingZeroes } from '/WebSharedComponents/assets/js/utils.js'
import { minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
import { toTitleCase, combinedStyle, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
</script>

<script>
export default {
    props: {
        modelValue:{
            type: Object,
            required: true
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const blockingRebounds = false;

        const localData = {
            rmsPower: null,
        }
        return {
            blockingRebounds,
            localData,
        }
    },
    computed: {
    },
    watch: {
        'modelValue.current.waveform': {
            handler(newValue, oldValue) {
                this.process("current");
                this.process("voltage");
            },
            deep: true
        },
        'modelValue.current.processed': {
            handler(newValue, oldValue) {
                this.process("current");
                this.process("voltage");
            },
            deep: true
        },
        'modelValue.voltage.waveform': {
            handler(newValue, oldValue) {
                this.process("current");
                this.process("voltage");
            },
            deep: true
        },
        'modelValue.voltage.processed': {
            handler(newValue, oldValue) {
                this.process("current");
                this.process("voltage");
            },
            deep: true
        },
    },
    mounted () {
        this.process("current");
        this.process("voltage");
    },
    methods: {
        async process(signalDescriptor) {
            await this.$mkf.ready;
            if (this.modelValue[signalDescriptor].harmonics == null) {
                this.modelValue[signalDescriptor].harmonics = JSON.parse(await this.$mkf.calculate_harmonics(JSON.stringify(this.modelValue[signalDescriptor].waveform), this.modelValue.frequency));
            }
            var result = await this.$mkf.calculate_processed(JSON.stringify(this.modelValue[signalDescriptor].harmonics), JSON.stringify(this.modelValue[signalDescriptor].waveform));
            if (result.startsWith("Exception")) {
                console.error(result);
            }
            else {
                var processed = JSON.parse(result);
                this.modelValue[signalDescriptor].processed.acEffectiveFrequency = processed.acEffectiveFrequency;
                this.modelValue[signalDescriptor].processed.effectiveFrequency = processed.effectiveFrequency;
                this.modelValue[signalDescriptor].processed.peak = processed.peak;
                this.modelValue[signalDescriptor].processed.rms = processed.rms;
                this.modelValue[signalDescriptor].processed.thd = processed.thd;
                if (this.modelValue[signalDescriptor].processed.label == 'Custom') {
                    this.modelValue[signalDescriptor].processed.dutyCycle = processed.dutyCycle;
                    this.modelValue[signalDescriptor].processed.peakToPeak = processed.peakToPeak;
                    this.modelValue[signalDescriptor].processed.offset = processed.offset;
                }
                this.localData.rmsPower = await this.$mkf.calculate_rms_power(JSON.stringify(this.modelValue));
            }
        }
    }
}
</script>

<template>
    <div class="container-flex">
        <div class="row mt-3">
            <DimensionReadOnly 
                class="offset-1 col-11"
                :name="'rms'"
                :replaceTitle="'Current RMS:'"
                :unit="'A'"
                :dataTestLabel="dataTestLabel + '-Rms'"
                :value="modelValue.current.processed.rms"
                :min="minimumMaximumScalePerParameter.current.min"
                :max="minimumMaximumScalePerParameter.current.max"
                :disableShortenLabels="true"
                :valueFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
            />
            <DimensionReadOnly 
                class="offset-1 col-11"
                :name="'rms'"
                :replaceTitle="'Voltage RMS:'"
                :unit="'V'"
                :dataTestLabel="dataTestLabel + '-Rms'"
                :value="modelValue.voltage.processed.rms"
                :min="minimumMaximumScalePerParameter.voltage.min"
                :max="minimumMaximumScalePerParameter.voltage.max"
                :disableShortenLabels="true"
                :valueFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
            />
            <DimensionReadOnly 
                class="offset-1 col-11"
                :name="'rms'"
                :replaceTitle="'Power:'"
                :unit="'W'"
                :dataTestLabel="dataTestLabel + '-Rms'"
                :value="localData.rmsPower"
                :min="minimumMaximumScalePerParameter.power.min"
                :max="minimumMaximumScalePerParameter.power.max"
                :disableShortenLabels="true"
                :valueFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
            />
        </div>
    </div>
</template>

