<script setup>
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import { minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
import { WaveformLabel } from '/WebSharedComponents/assets/ts/MAS.ts'
import { toTitleCase, combinedStyle } from '/WebSharedComponents/assets/js/utils.js'

</script>

<script>
export default {
    emits: ["peakToPeakChanged", "offsetChanged", "labelChanged"],
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
        defaultValue:{
            type: Object,
            default: () => ({})
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const errorMessages = '';
        const forceUpdate = 0;
        return {
            errorMessages,
            forceUpdate,
        }
    },
    computed: {
        disableOffset() {
            return this.modelValue[this.signalDescriptor].processed.label === "Rectangular";
        },
        induceableSignal() {
            if (this.signalDescriptor == 'current') {
                return true;
            }
            else {
                return this.modelValue.current.processed.label != "Rectangular" && this.modelValue.current.processed.label != "Bipolar Rectangular" && this.modelValue.current.processed.label != "Unipolar Rectangular";
            }
        }
    },
    watch: {
        'modelValue.current.processed'(newValue, oldValue) {
            if (this.signalDescriptor == 'current'){
                this.forceUpdate += 1
            }
        },
        'modelValue.voltage.processed'(newValue, oldValue) {
            if (this.signalDescriptor == 'voltage'){
                this.forceUpdate += 1
            }
        },
    },
    methods: {
        peakToPeakChanged(value) {
            this.$emit("peakToPeakChanged");
        },
        offsetChanged(value) {
            this.$emit("offsetChanged");
        },
        labelChanged(value) {
            this.$emit("labelChanged");
        },
    }
}
</script>

<template>
    <div class="container-flex ">
        <div class="row text-center">
            <label 
                :style="combinedStyle([$styleStore.operatingPoints.inputTitleFontSize, signalDescriptor == 'current'? $styleStore.operatingPoints.currentTextColor : signalDescriptor == 'voltage'? $styleStore.operatingPoints.voltageTextColor : $styleStore.operatingPoints.commonParameterTextColor])"
            >{{toTitleCase(signalDescriptor)}} waveform</label>
        </div>
        <div class="row">

            <ElementFromList class="border-bottom border-1 pb-2 mb-1 col-12"
                :name="'label'"
                :dataTestLabel="dataTestLabel + '-Label'"
                :options="Object.values(WaveformLabel)"
                :titleSameRow="true"
                :replaceTitle="'Waveform'"
                v-model="modelValue[signalDescriptor].processed"
                @update="labelChanged"
                :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
            />

            <Dimension class="border-bottom border-1 col-12"
                :name="'peakToPeak'"
                :unit="signalDescriptor == 'current'? 'A' : 'V'"
                :dataTestLabel="dataTestLabel + '-PeakToPeak'"
                :min="minimumMaximumScalePerParameter[signalDescriptor]['min']"
                :max="minimumMaximumScalePerParameter[signalDescriptor]['max']"
                :defaultValue="defaultValue[signalDescriptor].processed.peakToPeak"
                :forceUpdate="forceUpdate"
                v-model="modelValue[signalDescriptor].processed"
                @update="peakToPeakChanged"
                :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
            />

            <Dimension class="border-bottom border-1 col-12"
                v-if="!disableOffset"
                :name="'offset'"
                :unit="signalDescriptor == 'current'? 'A' : 'V'"
                :dataTestLabel="dataTestLabel + '-Offset'"
                :min="minimumMaximumScalePerParameter[signalDescriptor]['min']"
                :max="minimumMaximumScalePerParameter[signalDescriptor]['max']"
                :defaultValue="defaultValue[signalDescriptor].processed.offset"
                :allowNegative="true"
                :allowZero="true"
                :forceUpdate="forceUpdate"
                v-model="modelValue[signalDescriptor].processed"
                @update="offsetChanged"
                :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
            />
            <button
                :style="combinedStyle([$styleStore.operatingPoints.inputTitleFontSize, signalDescriptor == 'current'? $styleStore.operatingPoints.currentBgColor : signalDescriptor == 'voltage'? $styleStore.operatingPoints.voltageBgColor : $styleStore.operatingPoints.commonParameterBgColor])"
                v-if="induceableSignal"
                :data-cy="`${dataTestLabel}-induce-button`"
                class="btn offset-1 col-10 mt-2 p-0"
                @click="$emit('induce')"
                style="max-height: 1.7em"
            >
                {{'Induce from ' + (signalDescriptor == 'current'? 'voltage' : 'current')}}
                <i class="fa-solid fa-bolt"></i>
                <i class="fa-solid fa-magnet"></i>
            </button>

        </div>
        <div class="row">
            <label :data-cy="dataTestLabel + '-error-text'" class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>
</template>

