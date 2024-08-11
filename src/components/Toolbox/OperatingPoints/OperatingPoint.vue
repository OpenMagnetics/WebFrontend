<script setup>
import { useMasStore } from '/src/stores/mas'
import WaveformGraph from '/src/components/Toolbox/OperatingPoints/WaveformGraph.vue'
import WaveformFourier from '/src/components/Toolbox/OperatingPoints/WaveformFourier.vue'
import WaveformInputCustom from '/src/components/Toolbox/OperatingPoints/WaveformInputCustom.vue'
import WaveformInput from '/src/components/Toolbox/OperatingPoints/WaveformInput.vue'
import WaveformInputCommon from '/src/components/Toolbox/OperatingPoints/WaveformInputCommon.vue'
import WaveformOutput from '/src/components/Toolbox/OperatingPoints/WaveformOutput.vue'
import WaveformCombinedOutput from '/src/components/Toolbox/OperatingPoints/WaveformCombinedOutput.vue'
import OperatingPointManual from '/src/components/Toolbox/OperatingPoints/OperatingPointManual.vue'
import OperatingPointCircuitSimulator from '/src/components/Toolbox/OperatingPoints/OperatingPointCircuitSimulator.vue'
import { tryGuessType, roundWithDecimals, deepCopy, removeTrailingZeroes } from '/src/assets/js/utils.js'
import Dimension from '/src/components/DataInput/Dimension.vue'

import { defaultOperatingPointExcitation, defaultPrecision, defaultSinusoidalNumberPoints, minimumMaximumScalePerParameter } from '/src/assets/js/defaults.js'
import { tooltipsMagneticSynthesisOperatingPoints } from '/src/assets/js/texts.js'

</script>
<script>

export default {
    emits: ["canContinue", "changeTool", "updatedWaveform", "importedWaveform", "selectedManualOrImported"],
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
        if (masStore.mas.inputs.operatingPoints.length == 0) {
            masStore.mas.inputs.operatingPoints.push(
                {
                    name: "Operating Point No. 1",
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
                this.masStore.magneticCircuitSimulatorColumnNames[this.currentOperatingPointIndex] = JSON.parse(this.$mkf.extract_map_column_names(file, numberWindings, frequency));
            });
        },
        extractAllColumnNames(file) {
            this.$mkf.ready.then(_ => {
                this.masStore.magneticCircuitSimulatorAllLastReadColumnNames = JSON.parse(this.$mkf.extract_column_names(file));
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
                this.masStore.magneticCircuitSimulatorOperatingPoints[this.currentOperatingPointIndex] = true;
            }
            fr.readAsText(this.$refs["OperatingPoint-CircuitSimulator-upload-ref"].files.item(0));
        },
        onManualTypeSelected(event) {
            this.masStore.magneticManualOperatingPoints[this.currentOperatingPointIndex] = true;
            this.$emit("selectedManualOrImported")
        },
        setImportMode(event) {
            this.masStore.magneticManualOperatingPoints[this.currentOperatingPointIndex] = false;
            this.masStore.magneticCircuitSimulatorOperatingPoints[this.currentOperatingPointIndex] = false;
            this.$emit("selectedManualOrImported")
        },
    }
}
</script>

<template>
    <div class="container">
        <div class="row" v-tooltip="styleTooltip">
            <OperatingPointManual
                v-if="masStore.magneticManualOperatingPoints[currentOperatingPointIndex]"
                :currentOperatingPointIndex="currentOperatingPointIndex"
                :currentWindingIndex="currentWindingIndex"
                @updatedWaveform="updatedWaveform"
                @setImportMode="setImportMode"
            />
            <OperatingPointCircuitSimulator
                v-if="masStore.magneticCircuitSimulatorOperatingPoints[currentOperatingPointIndex]"
                :loadedFile="loadedFile"
                :currentOperatingPointIndex="currentOperatingPointIndex"
                :currentWindingIndex="currentWindingIndex"
                :allColumnNames="masStore.magneticCircuitSimulatorAllLastReadColumnNames"
                @setImportMode="setImportMode"
                @importedWaveform="importedWaveform"
            />
            <div v-if="!masStore.magneticCircuitSimulatorOperatingPoints[currentOperatingPointIndex] && !masStore.magneticManualOperatingPoints[currentOperatingPointIndex]" class="col-12">
                <label :data-cy="dataTestLabel + '-current-title'" class="row fs-4 text-primary mx-0 p-0 mb-4">{{masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].name}}</label>
                <div class="row mt-2">

                    <label class="fs-5 text-white mt-3 mb-2"> Where do you want to import your operating point from? </label>
                </div>
                <div class="row mt-2">
                    <label for="OperatingPoint-MAS-upload-input" class="col-lg-3 col-md-12">
                            <span :data-cy="dataTestLabel + '-MAS-upload-button'" type="button" class="btn btn-primary mt-1 rounded-3 fs-5 pt-2" style="min-height: 6em">Magnetic Agnostic Structure file (It will replace all Op. points)</span> 
                            <input type="file" id="OperatingPoint-MAS-upload-input" ref="OperatingPoint-MAS-upload-ref" @change="onMASFileTypeSelected"  style="display:none">
                    </label>
                    <label for="OperatingPoint-CircuitSimulator-upload-input" class="col-lg-3 col-md-12 offset-lg-1 ">
                        <span :data-cy="dataTestLabel + '-CircuitSimulator-upload-button'" type="button" class="btn btn-primary mt-1 rounded-3 fs-5 py-4" style="min-height: 6em">Circuit simulator export file</span> 
                        <input type="file" id="OperatingPoint-CircuitSimulator-upload-input" ref="OperatingPoint-CircuitSimulator-upload-ref" @change="onCircuitSimulatorFileTypeSelected" style="display:none">
                    </label>
                        <button data-cy="OperatingPointImport-source-Manual-button" type="button" @click="onManualTypeSelected" class="col-lg-3 col-md-12 offset-lg-1 btn btn-primary mt-1 rounded-3 fs-5" style="min-height: 6em">I will define it manually</button>
                </div>
            </div>
        </div>
    </div>
</template>
