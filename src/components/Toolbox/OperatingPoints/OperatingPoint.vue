<script setup>
import { useMasStore } from '/src/stores/mas'
import OperatingPointManual from '/src/components/Toolbox/OperatingPoints/OperatingPointManual.vue'
import OperatingPointHarmonics from '/src/components/Toolbox/OperatingPoints/OperatingPointHarmonics.vue'
import OperatingPointCircuitSimulator from '/src/components/Toolbox/OperatingPoints/OperatingPointCircuitSimulator.vue'
import { roundWithDecimals, deepCopy, removeTrailingZeroes, combinedStyle } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'

import { defaultOperatingPointExcitation, defaultPrecision, defaultSinusoidalNumberPoints, minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
import { tooltipsMagneticSynthesisOperatingPoints } from '/WebSharedComponents/assets/js/texts.js'

</script>
<script>

export default {
    emits: ["updatedWaveform", "importedWaveform", "selectedManualOrImported", "selectedAcSweepTypeSelected"],
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
        enableManual: {
            type: Boolean,
            default: true,
        },
        enableCircuitSimulatorImport: {
            type: Boolean,
            default: true,
        },
        enableAcSweep: {
            type: Boolean,
            default: true,
        },
        enableHarmonicsList: {
            type: Boolean,
            default: true,
        },
    },
    data() {
        const masStore = useMasStore();
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
            loadedFile: "",
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
        this.masStore.$onAction((action) => {
            if (action.name == "updatedInputExcitationProcessed") {
                const signalDescriptor = action.args[0];
            }
            if (action.name == "updatedInputExcitationWaveformUpdatedFromGraph") {
                const signalDescriptor = action.args[0];
            }
        })
    },
    methods: {
        updatedWaveform(signalDescriptor) {
            this.$emit('updatedWaveform', signalDescriptor);
        },
        importedWaveform() {
            this.$emit('importedWaveform');
        },
        extractMapColumnNames(file) {
            this.$mkf.ready.then(_ => {
                const numberWindings = this.masStore.mas.inputs.designRequirements.turnsRatios.length + 1;
                const frequency = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].frequency;
                this.$stateStore.operatingPointsCircuitSimulator.columnNames[this.currentOperatingPointIndex] = JSON.parse(this.$mkf.extract_map_column_names(file, numberWindings, frequency));
            });
        },
        extractAllColumnNames(file) {
            this.$mkf.ready.then(_ => {
                this.$stateStore.operatingPointsCircuitSimulator.allLastReadColumnNames = JSON.parse(this.$mkf.extract_column_names(file));
            });
        },
        onMASFileTypeSelected(event) {
            const fr = new FileReader();

            fr.onload = e => {
                const data = e.target.result;
            }
            fr.readAsText(this.$refs["OperatingPoint-MAS-upload-ref"].files.item(0));
        },
        onCircuitSimulatorFileTypeSelected(event) {
            const fr = new FileReader();

            fr.onload = e => {
                this.loadedFile = e.target.result;
                this.extractAllColumnNames(this.loadedFile);
                this.extractMapColumnNames(this.loadedFile);
                this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] = this.$stateStore.OperatingPointsMode.CircuitSimulatorImport;
            }
            fr.readAsText(this.$refs["OperatingPoint-CircuitSimulator-upload-ref"].files.item(0));
        },
        onHarmoncsTypeSelected(event) {
            this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] = this.$stateStore.OperatingPointsMode.HarmonicsList;
            this.$emit("selectedManualOrImported")
        },
        onManualTypeSelected(event) {
            this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] = this.$stateStore.OperatingPointsMode.Manual;
            this.$emit("selectedManualOrImported")
        },
        onAcSweepTypeSelected(event) {
            this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] = this.$stateStore.OperatingPointsMode.AcSweep;
            this.$emit("selectedAcSweepTypeSelected")
        },
        onCircuitSimulatorTypeSelected(event) {
            this.$refs['OperatingPoint-CircuitSimulator-upload-ref'].click()
        },
        clearMode(event) {
            this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] = null
        },
    }
}
</script>
<template>
    <div class="container">
        <div class="row" v-tooltip="styleTooltip">
            <OperatingPointManual
                v-if="$stateStore.operatingPoints.modePerPoint[currentOperatingPointIndex] === $stateStore.OperatingPointsMode.Manual"
                :currentOperatingPointIndex="currentOperatingPointIndex"
                :currentWindingIndex="currentWindingIndex"
                @updatedWaveform="updatedWaveform"
                @clearMode="clearMode"
            />
            <OperatingPointCircuitSimulator
                v-if="$stateStore.operatingPoints.modePerPoint[currentOperatingPointIndex] === $stateStore.OperatingPointsMode.CircuitSimulatorImport"
                :loadedFile="loadedFile"
                :currentOperatingPointIndex="currentOperatingPointIndex"
                :currentWindingIndex="currentWindingIndex"
                :allColumnNames="$stateStore.operatingPointsCircuitSimulator.allLastReadColumnNames"
                @clearMode="clearMode"
                @importedWaveform="importedWaveform"
            />
            <OperatingPointHarmonics
                v-if="$stateStore.operatingPoints.modePerPoint[currentOperatingPointIndex] === $stateStore.OperatingPointsMode.HarmonicsList"
                :currentOperatingPointIndex="currentOperatingPointIndex"
                :currentWindingIndex="currentWindingIndex"
                @clearMode="clearMode"
            />
            <div v-if="$stateStore.operatingPoints.modePerPoint[currentOperatingPointIndex] == null" class="col-12">
                <label
                    :style="combinedStyle([$styleStore.operatingPoints.inputTitleFontSize, $styleStore.operatingPoints.commonParameterTextColor])"
                    :data-cy="dataTestLabel + '-current-title'"
                    class="row mx-0 p-0 mb-4"
                >
                    {{masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].name}}
                </label>
                <div class="row mt-2">

                    <label
                    :style="combinedStyle([$styleStore.operatingPoints.inputTitleFontSize, $styleStore.operatingPoints.commonParameterTextColor])"
                        class="mt-3 mb-2"
                    > 
                        {{'Where do you want to import your operating point from?'}}
                    </label>
                </div>
                <div class="row mt-2">



                        <input type="file" id="OperatingPoint-CircuitSimulator-upload-input" ref="OperatingPoint-CircuitSimulator-upload-ref" @change="onCircuitSimulatorFileTypeSelected" style="display:none" hidden/>
                        <button
                            v-if="enableManual"
                            :style="$styleStore.operatingPoints.typeButton"
                            data-cy="OperatingPoint-source-Manual-button"
                            type="button"
                            @click="onCircuitSimulatorTypeSelected"
                            class="col-lg-4 col-md-12 offset-lg-1 btn mt-1 rounded-3"
                            style="min-height: 6em"
                        >
                            {{'Circuit simulator export file or CSV'}}
                        </button>

                        <button
                            v-if="enableCircuitSimulatorImport"
                            :style="$styleStore.operatingPoints.typeButton"
                            data-cy="OperatingPoint-source-Manual-button"
                            type="button"
                            @click="onManualTypeSelected"
                            class="col-lg-4 col-md-12 offset-lg-1 btn mt-1 rounded-3"
                            style="min-height: 6em"
                        >
                            {{'I will define it manually'}}
                        </button>
                        <button
                            v-if="enableHarmonicsList"
                            :style="$styleStore.operatingPoints.typeButton"
                            data-cy="OperatingPoint-source-Manual-button"
                            type="button"
                            @click="onHarmoncsTypeSelected"
                            class="col-lg-4 col-md-12 offset-lg-1 btn mt-5 rounded-3"
                            style="min-height: 6em"
                        >
                            {{'I want to introduce a list of harmonics'}}
                        </button>
                        <button
                            v-if="enableAcSweep"
                            :style="$styleStore.operatingPoints.typeButton"
                            data-cy="OperatingPoint-source-Ac-Sweep-button"
                            type="button"
                            @click="onAcSweepTypeSelected"
                            class="col-lg-4 col-md-12 offset-lg-1 btn mt-5 rounded-3"
                            style="min-height: 6em"
                        >
                            {{'I am here for the AC sweeps'}}
                        </button>
                </div>
            </div>
        </div>
    </div>
</template>
