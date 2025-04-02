<script setup>
import { useMasStore } from '../../../stores/mas'
import WaveformInputHarmonic from './Input/WaveformInputHarmonic.vue'
import WaveformGraph from './Output/WaveformGraph.vue'
import WaveformFourier from './Output/WaveformFourier.vue'
import WaveformOutput from './Output/WaveformOutput.vue'
import WaveformSimpleOutput from './Output/WaveformSimpleOutput.vue'
import WaveformCombinedOutput from './Output/WaveformCombinedOutput.vue'
import { formatFrequency, removeTrailingZeroes, roundWithDecimals, deepCopy, ordinalSuffixOf } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import { combinedStyle, combinedClass } from '/WebSharedComponents/assets/js/utils.js'

import { defaultOperatingPointExcitationWithHarmonics, defaultPrecision, defaultSinusoidalNumberPoints } from '/WebSharedComponents/assets/js/defaults.js'
import { tooltipsMagneticSynthesisOperatingPoints } from '/WebSharedComponents/assets/js/texts.js'

</script>
<script>

export default {
    emits: ['clearMode', 'updatedSignal'],
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        currentOperatingPointIndex: {
            type: Number,
            default: 0,
        },
        currentWindingIndex: {
            type: Number,
            default: 0,
        },
    },
    data() {
        const masStore = useMasStore();
        // masStore.mas.inputs.operatingPoints = [];
        if (masStore.mas.inputs.operatingPoints.length == 0) {

            masStore.mas.inputs.operatingPoints.push(
                {
                    name: "Op. Point No. 1",
                    conditions: {ambientTemperature: 42},
                    excitationsPerWinding: [deepCopy(defaultOperatingPointExcitationWithHarmonics)]
                }
            );
        }

        masStore.mas.inputs.operatingPoints.forEach((operatingPoint, operatingPointIndex) => {
            masStore.mas.inputs.operatingPoints[operatingPointIndex] = this.checkAndFixOperatingPoint(operatingPoint);
        })

        const forceUpdateCurrent = 0;
        const forceUpdateVoltage = 0;
        const blockingRebounds = false;
        return {
            masStore,
            forceUpdateCurrent,
            forceUpdateVoltage,
            blockingRebounds,
            errorMessages: {
                current: "",
                voltage: "",
            },
        }
    },
    computed: {
        styleTooltip() {
            var relative_placement;
            relative_placement = 'right'
            return {
                theme: {
                    placement: relative_placement,
                    "text-align": "start",
                },
            }
        },
    },
    watch: { 
        'currentOperatingPointIndex'(newValue, oldValue) {
            this.forceUpdateCurrent += 1;
            this.forceUpdateVoltage += 1;

        },
        'currentWindingIndex'(newValue, oldValue) {
            this.forceUpdateCurrent += 1;
            this.forceUpdateVoltage += 1;
        },
    },
    created () {

    },
    mounted () {
        this.processHarmonics("current");
        this.processHarmonics("voltage");
    },
    methods: {
        checkAndFixOperatingPoint(operatingPoint) {

            operatingPoint.excitationsPerWinding.forEach((elem, windingIndex) => {
                if (elem == null || elem.current.harmonics == null || elem.voltage.harmonics == null) {
                    operatingPoint.excitationsPerWinding[windingIndex] = deepCopy(defaultOperatingPointExcitationWithHarmonics)
                } 
            })
            return operatingPoint;
        },
        checkFrequencies(signalDescriptor) {
            this.errorMessages[signalDescriptor] = "";
            this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics.frequencies.forEach((frequency, index) => {
                if (index > 1 && this.errorMessages[signalDescriptor] == "") {
                    if (frequency % this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics.frequencies[1] != 0) {

                            const frequencyAux = formatFrequency(frequency, 0.001);
                            const mainFrequencyAux = formatFrequency(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics.frequencies[1], 0.001);
                            this.errorMessages[signalDescriptor] = `Frequency ${removeTrailingZeroes(frequencyAux.label, 5)} ${frequencyAux.unit} must be a multiple of ${removeTrailingZeroes(mainFrequencyAux.label, 5)} ${mainFrequencyAux.unit}`
                            return false;
                    }
                } 
            })
            return true;
        },
        processHarmonics(signalDescriptor) {
            console.log("processHarmonics")
            this.masStore.mas.inputs.operatingPoints.forEach((operatingPoint, operatingPointIndex) => {
                this.masStore.mas.inputs.operatingPoints[operatingPointIndex] = this.checkAndFixOperatingPoint(operatingPoint);
            })

            this.$mkf.ready.then(_ => {
                const frequency = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics.frequencies[1];
                this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].waveform = null;
                this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].processed = null;
                const result = this.$mkf.standardize_signal_descriptor(JSON.stringify(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor]), frequency);

                if (result.startsWith("Exception")) {
                    console.error(result);
                    return;
                }
                else {
                    const parsedResult = JSON.parse(result);
                    const aux = this.$mkf.get_main_harmonic_indexes(JSON.stringify(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics), 0.05, 1);

                    const filteredHarmonics = {
                        amplitudes: [parsedResult.harmonics.amplitudes[0]],
                        frequencies: [parsedResult.harmonics.frequencies[0]]
                    }
                    // console.log(deepCopy(filteredHarmonics.frequencies))
                    for (var i = 0; i < aux.size(); i++) {
                        filteredHarmonics.amplitudes.push(parsedResult.harmonics.amplitudes[aux.get(i)]);
                        filteredHarmonics.frequencies.push(parsedResult.harmonics.frequencies[aux.get(i)]);
                    }

                    parsedResult.harmonics = filteredHarmonics;
                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor] = parsedResult;
                    console.log(deepCopy(this.currentWindingIndex))
                    console.log(deepCopy(filteredHarmonics.frequencies.length))
                }

                // this.$emit('updatedSignal');
                this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed(signalDescriptor);
            })
        },
        onFrequencyChanged(signalDescriptor) {
            if (this.checkFrequencies(signalDescriptor)) {
                this.processHarmonics(signalDescriptor);
                this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].frequency = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.harmonics.frequencies[1]

                if (this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.harmonics.frequencies[1] != this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.harmonics.frequencies[1]) {

                    if (signalDescriptor == "current") {
                        this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.harmonics.frequencies[1] = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.harmonics.frequencies[1];
                        this.forceUpdateVoltage += 1;
                    }
                    else {
                        this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.harmonics.frequencies[1] = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.harmonics.frequencies[1];
                        this.forceUpdateCurrent += 1;
                    }
                }
            }
        },
        onAmplitudeChanged(signalDescriptor) {
            if (!this.blockingRebounds) {
                this.blockingRebounds = true;
                setTimeout(() => this.blockingRebounds = false, 20);
                if (this.checkFrequencies(signalDescriptor)) {

                    this.processHarmonics(signalDescriptor);
                    if (signalDescriptor == "current") {
                        this.forceUpdateCurrent += 1;
                    }
                    else {
                        this.forceUpdateVoltage += 1;
                    }
                }
            }
        },
        onAddPointBelow(index, signalDescriptor) {
            var newFrequency = 0;
            var newAmplitude = 0;
            if (index < this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics.frequencies.length - 1) {
                newFrequency = (this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics.frequencies[index] + this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics.frequencies[index + 1]) / 2;
                newAmplitude = (this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics.amplitudes[index] + this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics.amplitudes[index + 1]) / 2;
            }
            else {
                newFrequency = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics.frequencies[index] * 2;
                newAmplitude = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics.amplitudes[index] / 2;
            }
            this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics.frequencies.splice(index + 1, 0, newFrequency);
            this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics.amplitudes.splice(index + 1, 0, newAmplitude);
            if (signalDescriptor == "current") {
                this.forceUpdateCurrent += 1;
            }
            else {
                this.forceUpdateVoltage += 1;
            }
        },
        onRemovePoint(index, signalDescriptor) {
            this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics.frequencies.splice(index, 1);
            this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics.amplitudes.splice(index, 1);
            if (signalDescriptor == "current") {
                this.forceUpdateCurrent += 1;
            }
            else {
                this.forceUpdateVoltage += 1;
            }
        },
    }
}
</script>

<template>
    <div class="container">
        <div class="row" v-tooltip="styleTooltip">
            <div class="col-lg-4 col-md-12" style="max-width: 360px;">

                <label
                    :style="combinedStyle([$styleStore.operatingPoints.inputTitleFontSize, $styleStore.operatingPoints.commonParameterTextColor])"
                    :data-cy="dataTestLabel + '-current-title'"
                    class="mx-0 p-0 mb-4"
                >
                    {{masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].name + ' - ' + masStore.mas.magnetic.coil.functionalDescription[currentWindingIndex].name}}
                </label>

                <label
                    :style="combinedStyle([$styleStore.operatingPoints.inputTitleFontSize, $styleStore.operatingPoints.commonParameterTextColor])"
                    :data-cy="dataTestLabel + '-current-title'"
                    class="mx-0 p-0 mb-4"
                >
                    {{'Current harmonics'}}
                </label>

                {{masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[0].current.harmonics.amplitudes.length}}
                {{masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[1].current.harmonics.amplitudes.length}}
                <div 
                    v-if="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex] != null && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.harmonics"
                    v-for="index in masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.harmonics.amplitudes.length" :key="index">
                    <WaveformInputHarmonic class="col-12 mb-1 text-start"
                        :dataTestLabel="dataTestLabel + '-Harmonic-' + (index - 1)"
                        :index="index - 1"
                        :title="(index - 1) == 0? 'DC' : ordinalSuffixOf(index - 1)"
                        :unit="'A'"
                        :forceUpdate="forceUpdateCurrent"
                        :block="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.harmonics.frequencies.length < 3 || (index - 1) == 0"
                        :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.harmonics"
                        @onFrequencyChanged="onFrequencyChanged('current')"
                        @onAmplitudeChanged="onAmplitudeChanged('current')"
                        @onAddPointBelow="onAddPointBelow(index - 1, 'current')"
                        @onRemovePoint="onRemovePoint(index - 1, 'current')"
                    />
                </div>
                <div v-if='errorMessages.current != ""' class="col-12">
                    <label :data-cy="dataTestLabel + '-error-text'" class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages.current}}</label>
                </div>
                <label
                    :style="combinedStyle([$styleStore.operatingPoints.inputTitleFontSize, $styleStore.operatingPoints.commonParameterTextColor])"
                    :data-cy="dataTestLabel + '-current-title'"
                    class="mx-0 p-0 mb-4"
                >
                    {{'Voltage harmonics'}}
                </label>
                <div
                    v-if="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex] != null && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].voltage.harmonics"
                    v-for="index in masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].voltage.harmonics.amplitudes.length" :key="index">

                    <WaveformInputHarmonic class="col-12 mb-1 text-start"
                        :dataTestLabel="dataTestLabel + '-Harmonic-' + (index - 1)"
                        :index="index - 1"
                        :unit="'V'"
                        :title="(index - 1) == 0? 'DC' : ordinalSuffixOf(index - 1)"
                        :forceUpdate="forceUpdateVoltage"
                        :block="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].voltage.harmonics.frequencies.length < 3 || (index - 1) == 0"
                        :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].voltage.harmonics"
                        @onFrequencyChanged="onFrequencyChanged('voltage')"
                        @onAmplitudeChanged="onAmplitudeChanged('voltage')"
                        @onAddPointBelow="onAddPointBelow(index - 1, 'voltage')"
                        @onRemovePoint="onRemovePoint(index - 1, 'voltage')"
                    />
                </div>
                <div v-if='errorMessages.voltage != ""' class="col-12">
                    <label :data-cy="dataTestLabel + '-error-text'" class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages.voltage}}</label>
                </div>
                <button
                    :style="$styleStore.operatingPoints.goBackSelectingButton"
                    :data-cy="dataTestLabel + '-import-button'"
                    class="btn btn-success fs-5 col-sm-12 col-md-12 mt-3 p-0"
                    style="max-height: 2em"
                    @click="$emit('clearMode')">
                    {{'Go back to selecting mode'}}
                </button>
            </div> 
            <div v-if="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex] !=null && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.waveform != null && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.processed != null && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].voltage.waveform != null && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].voltage.processed != null" class="col-lg-8 col-md-12 row m-0 p-0 align-items-start" style="max-width: 800px;">
                <WaveformGraph class=" col-12 py-2"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformGraph'"
                    :enableDrag="false"
                />
                <WaveformFourier class="col-12 mt-1" style="max-height: 150px;"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :updateHarmonics="false"
                    :dataTestLabel="dataTestLabel + '-WaveformFourier'"
                    :harmonicPowerThresholdVoltage="0.05"
                    :harmonicPowerThresholdCurrent="0.05"
                />

                <WaveformSimpleOutput class="col-lg-12 col-md-12 m-0 px-2"
                    v-if="!$settingsStore.operatingPointSettings.advancedMode"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformOutput-current'"
                />

                <WaveformOutput class="col-lg-6 col-md-6 m-0 px-2"
                    v-if="$settingsStore.operatingPointSettings.advancedMode"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformOutput-current'"
                    :signalDescriptor="'current'"
                />
                <WaveformOutput class="col-lg-6 col-md-6 m-0 px-2"
                    v-if="$settingsStore.operatingPointSettings.advancedMode"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformOutput-voltage'"
                    :signalDescriptor="'voltage'"
                />
                <WaveformCombinedOutput class="col-12 m-0 px-2 border-top"
                    v-if="$settingsStore.operatingPointSettings.advancedMode"
                    :dataTestLabel="dataTestLabel + '-WaveformCombinedOutput'"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                />
                <!-- <button :data-cy="dataTestLabel + '-reset-button'" class="btn btn-danger fs-6 offset-md-10 col-sm-12 col-md-2  mt-2 p-0" style="max-height: 2em" @click="resetCurrentExcitation"> Reset Point -->
                <!-- </button> -->
            </div>
        </div>
    </div>
</template>
