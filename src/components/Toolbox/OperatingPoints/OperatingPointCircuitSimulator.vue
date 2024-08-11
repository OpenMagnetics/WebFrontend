<script setup>
import { useMasStore } from '/src/stores/mas'
import WaveformGraph from '/src/components/Toolbox/OperatingPoints/WaveformGraph.vue'
import WaveformFourier from '/src/components/Toolbox/OperatingPoints/WaveformFourier.vue'
import WaveformInputCustom from '/src/components/Toolbox/OperatingPoints/WaveformInputCustom.vue'
import WaveformInput from '/src/components/Toolbox/OperatingPoints/WaveformInput.vue'
import WaveformInputCommon from '/src/components/Toolbox/OperatingPoints/WaveformInputCommon.vue'
import WaveformOutput from '/src/components/Toolbox/OperatingPoints/WaveformOutput.vue'
import WaveformCombinedOutput from '/src/components/Toolbox/OperatingPoints/WaveformCombinedOutput.vue'
import WaveformInputColumnNames from '/src/components/Toolbox/OperatingPoints/WaveformInputColumnNames.vue'
import { tryGuessType, roundWithDecimals, deepCopy } from '/src/assets/js/utils.js'

import { defaultOperatingPointExcitation, defaultPrecision, defaultSinusoidalNumberPoints } from '/src/assets/js/defaults.js'
import { tooltipsMagneticSynthesisOperatingPoints } from '/src/assets/js/texts.js'

</script>
<script>

export default {
    emits: ["canContinue", "changeTool", "importedWaveform", "setImportMode"],
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
        setImportMode() {
            this.$emit("setImportMode");
        },
        extractOperatingPoint(file) {
            this.$mkf.ready.then(_ => {
                const numberWindings = this.masStore.mas.inputs.designRequirements.turnsRatios.length + 1;
                const frequency = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].frequency;
                const desiredMagnetizingInductance = this.$mkf.resolve_dimension_with_tolerance(JSON.stringify(this.masStore.mas.inputs.designRequirements.magnetizingInductance));
                const mapColumnNamesString = JSON.stringify(this.masStore.magneticCircuitSimulatorColumnNames[this.currentOperatingPointIndex]);

                var operatingPointString = this.$mkf.extract_operating_point(file, numberWindings, frequency, desiredMagnetizingInductance, mapColumnNamesString);
                if (operatingPointString.startsWith("Error")) {
                    this.errorMessages = operatingPointString;
                    this.masStore.magneticCircuitSimulatorConfirmedColumns[this.currentOperatingPointIndex][this.currentWindingIndex] = true;
                }
                else {
                    var operatingPoint = JSON.parse(operatingPointString);
                    this.errorMessages = "";
                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex] = operatingPoint.excitationsPerWinding[this.currentWindingIndex]
                    this.masStore.magneticCircuitSimulatorConfirmedColumns[this.currentOperatingPointIndex][this.currentWindingIndex] = true;
                }
                this.$emit("importedWaveform");

            });
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

                <label :data-cy="dataTestLabel + '-current-title'" class="fs-4 text-primary mx-0 p-0 mb-4">{{masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].name + ' - ' + masStore.mas.magnetic.coil.functionalDescription[currentWindingIndex].name}}</label>

                <WaveformInputColumnNames class="scrollable-column border-bottom border-top rounded-4 border-2"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-selected'"
                    :allColumnNames="allColumnNames"
                    :currentOperatingPointIndex="currentOperatingPointIndex"
                    :currentWindingIndex="currentWindingIndex"
                    @updatedSwitchingFrequency="updatedColumnNames"
                    @updatedColumnName="updatedColumnNames"
                />

                <button :disabled='loadedFile==""' :data-cy="dataTestLabel + '-import-button'" class="btn btn-success fs-5 col-sm-12 col-md-12 mt-3 p-0" style="max-height: 2em" @click="confirmColumns">{{masStore.magneticCircuitSimulatorConfirmedColumns[currentOperatingPointIndex][currentWindingIndex]? 'Update columns' : 'Confirm columns'}}
                </button>
                <div v-if='loadedFile=="" && !masStore.magneticCircuitSimulatorConfirmedColumns[currentOperatingPointIndex][currentWindingIndex]' class="col-12">
                    <label :data-cy="dataTestLabel + '-error-text'" class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">Please reload file</label>
                </div>
                <div v-if='errorMessages != ""' class="col-12">
                    <label :data-cy="dataTestLabel + '-error-text'" class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
                </div>
                <button :data-cy="dataTestLabel + '-import-button'" class="btn btn-success fs-5 col-sm-12 col-md-12 mt-3 p-0" style="max-height: 2em" @click="setImportMode">Go back to importing files
                </button>
            </div>
            <div v-if="masStore.magneticCircuitSimulatorConfirmedColumns[currentOperatingPointIndex][currentWindingIndex]" class="col-lg-8 col-md-12 row m-0 p-0" style="max-width: 800px;">
                <WaveformGraph class=" col-12 py-2"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformGraph'"
                    :enableDrag="false"
                />
                <WaveformFourier class="col-12 mt-1" style="max-height: 150px;"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformFourier'"
                />

                <WaveformOutput class="col-lg-6 col-md-6 m-0 px-2"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformOutput-current'"
                    :signalDescriptor="'current'"
                />
                <WaveformOutput class="col-lg-6 col-md-6 m-0 px-2"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformOutput-voltage'"
                    :signalDescriptor="'voltage'"
                />
                <WaveformCombinedOutput class="col-12 m-0 px-2 border-top"
                    :dataTestLabel="dataTestLabel + '-WaveformCombinedOutput'"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                />
                <button :data-cy="dataTestLabel + '-reset-button'" class="btn btn-danger fs-6 offset-md-10 col-sm-12 col-md-2  mt-2 p-0" style="max-height: 2em" @click="resetCurrentExcitation"> Reset Point
                </button>
            </div>
        </div>
    </div>
</template>
