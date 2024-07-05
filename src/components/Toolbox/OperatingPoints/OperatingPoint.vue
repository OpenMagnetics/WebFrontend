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
    emits: ["canContinue", "changeTool", "updatedWaveform"],
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
        const localData = {"frequency": defaultOperatingPointExcitation['frequency']};

        return {
            masStore,
            localData,
            columnNames: [],
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
        extractOperationPoint(file) {
            this.$mkf.ready.then(_ => {
                const numberWindings = this.masStore.mas.inputs.designRequirements.turnsRatios.length + 1;
                const frequency = this.localData.frequency;
                const desiredMagnetizingInductance = this.$mkf.resolve_dimension_with_tolerance(JSON.stringify(this.masStore.mas.inputs.designRequirements.magnetizingInductance));
                var operatingPoint = JSON.parse(this.$mkf.extract_operating_point(file, numberWindings, frequency, desiredMagnetizingInductance));
                console.log(operatingPoint);
            });
        },
        extractMapColumnNames(file) {
            this.$mkf.ready.then(_ => {
                const numberWindings = this.masStore.mas.inputs.designRequirements.turnsRatios.length + 1;
                const frequency = this.localData.frequency;
                var mapColumnNames = JSON.parse(this.$mkf.extract_map_column_names(file, numberWindings, frequency));
                this.columnNames = mapColumnNames;
                console.log(mapColumnNames);
            });
        },
        onMASFileTypeSelected(event) {
            const fr = new FileReader();

            fr.onload = e => {
                const data = e.target.result;
            }
            fr.readAsText(this.$refs["OperationPoint-MAS-upload-ref"].files.item(0));
        },
        onCircuitSimulatorFileTypeSelected(event) {
            const fr = new FileReader();

            fr.onload = e => {
                const data = e.target.result;
                // this.extractOperationPoint(data);
                this.extractMapColumnNames(data);
                this.masStore.magneticCircuitSimulatorOperationPoints[this.currentOperatingPointIndex] = true;
                // console.log(data);
            }
            fr.readAsText(this.$refs["OperationPoint-CircuitSimulator-upload-ref"].files.item(0));
        },
        onManualTypeSelected(event) {
            console.log("Manual!");
            this.masStore.magneticManualOperationPoints[this.currentOperatingPointIndex] = true;
        },
        setImportMode(event) {
            console.log("Import mode!");
            this.masStore.magneticManualOperationPoints[this.currentOperatingPointIndex] = false;
            this.masStore.magneticCircuitSimulatorOperationPoints[this.currentOperatingPointIndex] = false;
        },
    }
}
</script>

<template>
    <div class="container">
        <div class="row" v-tooltip="styleTooltip">
            <OperatingPointManual
                v-if="masStore.magneticManualOperationPoints[currentOperatingPointIndex]"
                :currentOperatingPointIndex="currentOperatingPointIndex"
                :currentWindingIndex="currentWindingIndex"
                @updatedWaveform="updatedWaveform"
                @setImportMode="setImportMode"
            />
            <OperatingPointCircuitSimulator
                v-if="masStore.magneticCircuitSimulatorOperationPoints[currentOperatingPointIndex]"
                :currentOperatingPointIndex="currentOperatingPointIndex"
                :currentWindingIndex="currentWindingIndex"
                @updatedWaveform="updatedWaveform"
                @setImportMode="setImportMode"
            />
            <div v-if="!masStore.magneticCircuitSimulatorOperationPoints[currentOperatingPointIndex] && !masStore.magneticManualOperationPoints[currentOperatingPointIndex]" class="col-12">
                <label :data-cy="dataTestLabel + '-current-title'" class="row fs-4 text-primary mx-0 p-0 mb-4">{{masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].name}}</label>
                <div class="row mt-2">

                    <label class="fs-5 text-white mt-3 mb-2"> Where do you want to import your operating point from? </label>
                </div>
                <div class="row mt-2">
                    <label for="OperationPoint-MAS-upload-input" class="col-lg-3 col-md-12">
                            <span :data-cy="dataTestLabel + '-MAS-upload-button'" type="button" class="btn btn-primary mt-1 rounded-3 fs-5 pt-2" style="min-height: 6em">Magnetic Agnostic Structure file (It will replace all Op. points)</span> 
                            <input type="file" id="OperationPoint-MAS-upload-input" ref="OperationPoint-MAS-upload-ref" @change="onMASFileTypeSelected"  style="display:none">
                    </label>
                    <label for="OperationPoint-CircuitSimulator-upload-input" class="col-lg-3 col-md-12 offset-lg-1 ">

<!--                         <Dimension class="border-bottom  col-12"
                            :name="'frequency'"
                            :unit="'Hz'"
                            :dataTestLabel="dataTestLabel + '-Frequency'"
                            :min="minimumMaximumScalePerParameter['frequency']['min']"
                            :max="minimumMaximumScalePerParameter['frequency']['max']"
                            :defaultValue="defaultOperatingPointExcitation.frequency"
                            v-model="localData"
                        /> -->
                            <span :data-cy="dataTestLabel + '-CircuitSimulator-upload-button'" type="button" class="btn btn-primary mt-1 rounded-3 fs-5 py-4" style="min-height: 6em">Circuit simulator export file</span> 
                            <input type="file" id="OperationPoint-CircuitSimulator-upload-input" ref="OperationPoint-CircuitSimulator-upload-ref" @change="onCircuitSimulatorFileTypeSelected" style="display:none">
                    </label>
                        <button data-cy="OperatingPointImport-source-Manual-button" type="button" @click="onManualTypeSelected" class="col-lg-3 col-md-12 offset-lg-1 btn btn-primary mt-1 rounded-3 fs-5" style="min-height: 6em">I will define it manually</button>
                </div>
            </div>
        </div>
    </div>
</template>
