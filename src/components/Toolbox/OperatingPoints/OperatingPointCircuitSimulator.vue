<script setup>
import { useMasStore } from '../../../stores/mas'
import { useTaskQueueStore } from '../../../stores/taskQueue'
import WaveformGraph from './Output/WaveformGraph.vue'
import WaveformFourier from './Output/WaveformFourier.vue'
import WaveformOutput from './Output/WaveformOutput.vue'
import WaveformSimpleOutput from './Output/WaveformSimpleOutput.vue'
import WaveformCombinedOutput from './Output/WaveformCombinedOutput.vue'
import WaveformInputColumnNames from './Input/WaveformInputColumnNames.vue'
import { roundWithDecimals, deepCopy, combinedStyle } from '/WebSharedComponents/assets/js/utils.js'

import { defaultOperatingPointExcitation, defaultPrecision, defaultSinusoidalNumberPoints } from '/WebSharedComponents/assets/js/defaults.js'
import { tooltipsMagneticSynthesisOperatingPoints } from '/WebSharedComponents/assets/js/texts.js'

</script>
<script>

export default {
    emits: ["updatedSignal", "importedWaveform", "clearMode"],
    props: {
        loadedFile: {
            type: String,
            required: true,
        },
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
        allColumnNames: {
            type: Array,
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        if (masStore.mas.inputs.operatingPoints.length == 0) {
            masStore.mas.inputs.operatingPoints.push(
                {
                    name: "Op. Point No. 1",
                    conditions: {ambientTemperature: 42},
                    excitationsPerWinding: [deepCopy(defaultOperatingPointExcitation)]
                }
            );
        }

        return {
            masStore,
            taskQueueStore,
            errorMessages: "",
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
    },
    created () {

    },
    mounted () {
    },
    methods: {
        clearMode() {
            this.$emit("clearMode");
        },
        async extractOperatingPoint(file) {
            try {
                const numberWindings = this.masStore.mas.inputs.designRequirements.turnsRatios.length + 1;
                const frequency = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].frequency;
                const desiredMagnetizingInductance = await this.taskQueueStore.resolveDimensionWithTolerance(this.masStore.mas.inputs.designRequirements.magnetizingInductance);
                const mapColumnNames = this.$stateStore.operatingPointsCircuitSimulator.columnNames[this.currentOperatingPointIndex];

                var operatingPoint = await this.taskQueueStore.extractOperatingPoint(file, numberWindings, frequency, desiredMagnetizingInductance, mapColumnNames);
                this.errorMessages = "";
                this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex] = operatingPoint.excitationsPerWinding[this.currentWindingIndex]
                this.$stateStore.operatingPointsCircuitSimulator.confirmedColumns[this.currentOperatingPointIndex][this.currentWindingIndex] = true;
                this.$emit("importedWaveform");
                this.$emit("updatedSignal");

            } catch (error) {
                this.errorMessages = error.toString();
                this.$stateStore.operatingPointsCircuitSimulator.confirmedColumns[this.currentOperatingPointIndex][this.currentWindingIndex] = true;
                this.$emit("importedWaveform");
                this.$emit("updatedSignal");
            }
        },
        updatedSwitchingFrequency(frequency) {
            this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding.forEach((elem) => {
                elem.frequency = frequency;
            })
        },
        updatedColumnNames() {
            // this.extractOperatingPoint(this.loadedFile);
        },
        confirmColumns() {
            this.extractOperatingPoint(this.loadedFile);
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

                <WaveformInputColumnNames class="scrollable-column border-bottom border-top rounded-4 border-2"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-selected'"
                    :allColumnNames="allColumnNames"
                    :currentOperatingPointIndex="currentOperatingPointIndex"
                    :currentWindingIndex="currentWindingIndex"
                    @updatedSwitchingFrequency="updatedSwitchingFrequency"
                    @updatedColumnName="updatedColumnNames"
                />

                <button
                    :style="$styleStore.operatingPoints.confirmColumnsButton"
                    :disabled='loadedFile==""'
                    :data-cy="dataTestLabel + '-import-button'"
                    class="btn btn-success fs-5 col-sm-12 col-md-12 mt-3 p-0"
                    style="max-height: 2em"
                    @click="confirmColumns"
                >
                    {{$stateStore.operatingPointsCircuitSimulator.confirmedColumns[currentOperatingPointIndex][currentWindingIndex]? 'Update columns' : 'Confirm columns'}}
                </button>
                <div v-if='loadedFile=="" && !$stateStore.operatingPointsCircuitSimulator.confirmedColumns[currentOperatingPointIndex][currentWindingIndex]' class="col-12">
                    <label :data-cy="dataTestLabel + '-error-text'" class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">Please reload file</label>
                </div>
                <div v-if='errorMessages != ""' class="col-12">
                    <label :data-cy="dataTestLabel + '-error-text'" class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
                </div>
                <button
                    :style="$styleStore.operatingPoints.goBackSelectingButton"
                    :data-cy="dataTestLabel + '-import-button'"
                    class="btn btn-success fs-5 col-sm-12 col-md-12 mt-3 p-0"
                    style="max-height: 2em"
                    @click="clearMode"
                >
                    {{'Go back to selecting mode'}}
                </button>
            </div>
            <div v-if="$stateStore.operatingPointsCircuitSimulator.confirmedColumns[currentOperatingPointIndex][currentWindingIndex]" class="col-lg-8 col-md-12 row m-0 p-0" style="max-width: 800px;">
                <WaveformGraph class=" col-12 py-2"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformGraph'"
                    :enableDrag="false"
                />
                <WaveformFourier class="col-12 mt-1" style="max-height: 150px;"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformFourier'"
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
<!--                 <button :data-cy="dataTestLabel + '-reset-button'" class="btn btn-danger fs-6 offset-md-10 col-sm-12 col-md-2  mt-2 p-0" style="max-height: 2em" @click="resetCurrentExcitation"> Reset Point
                </button> -->
            </div>
        </div>
    </div>
</template>
