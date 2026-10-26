<script setup>
import { useMasStore } from '../../../stores/mas'
import { useTaskQueueStore } from '../../../stores/taskQueue'
import WaveformGraph from './Output/WaveformGraph.vue'
import WaveformFourier from './Output/WaveformFourier.vue'
import WaveformOutput from './Output/WaveformOutput.vue'
import WaveformSimpleOutput from './Output/WaveformSimpleOutput.vue'
import WaveformCombinedOutput from './Output/WaveformCombinedOutput.vue'
import WaveformInputColumnNames from './Input/WaveformInputColumnNames.vue'
import InfoTip from '../../InfoTip.vue'
import { roundWithDecimals, deepCopy, combinedStyle } from 'WebSharedComponents/assets/js/utils.js'

import { defaultOperatingPointExcitation, defaultPrecision, defaultSinusoidalNumberPoints } from 'WebSharedComponents/assets/js/defaults.js'
import { tooltipsMagneticSynthesisOperatingPoints } from 'WebSharedComponents/assets/js/texts.js'

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
            loading: false,
            // The last refused import: { operatingPointIndex, windingIndex, missingSignals }, the
            // signals it left that winding without; null once an import gives both.
            refusedImport: null,
            // The frequency typed for the imported signal. Kept here, and written into the
            // operating point only together with a complete imported excitation (Alf,
            // 2026-10-26): leaving the view without importing leaves the operating point as it was.
            importFrequency: masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].frequency,
        }
    },
    computed: {
        // The signals of this winding the import left without a waveform. MKF returns an
        // excitation with only the signals whose columns were mapped to the winding (with
        // two windings it can put V(p1,p2) on the second one), and the outputs draw and
        // compute both signals, so they are only shown once both exist; until then the
        // missing ones are named here. An import that leaves the winding without one of them is
        // not stored (Alf, 2026-10-26): the operating point keeps what it had, and the signals
        // that import lacked are the ones named.
        missingSignals() {
            if (this.refusedImport != null
                && this.refusedImport.operatingPointIndex == this.currentOperatingPointIndex
                && this.refusedImport.windingIndex == this.currentWindingIndex) {
                return this.refusedImport.missingSignals;
            }
            const excitation = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex]?.excitationsPerWinding[this.currentWindingIndex];
            return ['current', 'voltage'].filter((signalDescriptor) => excitation?.[signalDescriptor]?.waveform == null);
        },
        importedSignalsReady() {
            return this.$stateStore.operatingPointsCircuitSimulator.confirmedColumns[this.currentOperatingPointIndex][this.currentWindingIndex]
                && this.missingSignals.length == 0;
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
                const frequency = this.importFrequency;

                const mapColumnNames = this.$stateStore.operatingPointsCircuitSimulator.columnNames[this.currentOperatingPointIndex];
                if (!Array.isArray(mapColumnNames) || mapColumnNames.length === 0) {
                    throw new Error("Please pick the time / current / voltage columns before confirming.");
                }
                const windingPicks = mapColumnNames[this.currentWindingIndex];
                if (!windingPicks || !windingPicks.time) {
                    throw new Error("Please pick a time column for this winding.");
                }
                if (!windingPicks.current && !windingPicks.voltage) {
                    throw new Error("Please pick at least one of a current or a voltage column for this winding.");
                }
                if (!Number.isFinite(frequency) || frequency <= 0) {
                    throw new Error("Please enter a positive switching frequency for this operating point before importing.");
                }

                const desiredMagnetizingInductance = await this.taskQueueStore.resolveDimensionWithTolerance(this.masStore.mas.inputs.designRequirements.magnetizingInductance, 'the magnetizing inductance in Design Requirements');

                var operatingPoint = await this.taskQueueStore.extractOperatingPoint(file, numberWindings, frequency, desiredMagnetizingInductance, mapColumnNames);
                this.errorMessages = "";
                const importedExcitation = operatingPoint.excitationsPerWinding[this.currentWindingIndex];
                const importMissingSignals = ['current', 'voltage'].filter((signalDescriptor) => importedExcitation?.[signalDescriptor]?.waveform == null);
                if (importMissingSignals.length > 0) {
                    // Partial: nothing is written, so the operating point keeps its signals and
                    // the manual editor never opens on a winding with a null one.
                    this.refusedImport = {
                        operatingPointIndex: this.currentOperatingPointIndex,
                        windingIndex: this.currentWindingIndex,
                        missingSignals: importMissingSignals,
                    };
                    this.$stateStore.operatingPointsCircuitSimulator.confirmedColumns[this.currentOperatingPointIndex][this.currentWindingIndex] = true;
                    return;
                }
                this.refusedImport = null;
                this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding.forEach((elem) => {
                    elem.frequency = frequency;
                })
                this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex] = operatingPoint.excitationsPerWinding[this.currentWindingIndex]
                this.$stateStore.operatingPointsCircuitSimulator.confirmedColumns[this.currentOperatingPointIndex][this.currentWindingIndex] = true;
                this.$emit("importedWaveform");
                this.$emit("updatedSignal");

            } catch (error) {
                this.errorMessages = error?.message || String(error);
                this.$stateStore.operatingPointsCircuitSimulator.confirmedColumns[this.currentOperatingPointIndex][this.currentWindingIndex] = true;
                this.$emit("importedWaveform");
                this.$emit("updatedSignal");
            } finally {
                this.loading = false;
            }
        },
        updatedSwitchingFrequency(frequency) {
            this.importFrequency = frequency;
        },
        updatedColumnNames() {
            // this.extractOperatingPoint(this.loadedFile);
        },
        confirmColumns() {
            this.loading = true;
            this.extractOperatingPoint(this.loadedFile);
        },
    }
}
</script>

<template>
    <div class="opc-container">
        <div class="op-editor-head" data-op-col="head">
            <h2 class="op-editor-title" data-op-title :data-cy="dataTestLabel + '-current-title'">{{masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].name}}
                <InfoTip
                    label="About this editor"
                    :text="'Imported waveforms of ' + masStore.mas.magnetic.coil.functionalDescription[currentWindingIndex].name + ' in this operating point, read from the circuit simulator file.'"
                    :data-cy="dataTestLabel + '-editor-info'"
                />
            </h2>
        </div>
        <div class="op-editor-grid">
            <div class="opc-col op-editor-inputs" data-op-col="inputs">

                <section class="opc-card op-cell">
                    <h3 class="opc-card-header op-cell-title" data-op-title>Imported file columns
                        <InfoTip
                            label="About the file columns"
                            text="Pick the columns of the file that hold this winding's time, current and voltage."
                            :data-cy="dataTestLabel + '-columns-info'"
                        />
                    </h3>
                    <div class="opc-card-body op-cell-body">
                        <WaveformInputColumnNames
                            :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                            :dataTestLabel="dataTestLabel + '-selected'"
                            :allColumnNames="allColumnNames"
                            :currentOperatingPointIndex="currentOperatingPointIndex"
                            :currentWindingIndex="currentWindingIndex"
                            @updatedSwitchingFrequency="updatedSwitchingFrequency"
                            @updatedColumnName="updatedColumnNames"
                        />
                    </div>
                    <div v-if='loadedFile=="" && !$stateStore.operatingPointsCircuitSimulator.confirmedColumns[currentOperatingPointIndex][currentWindingIndex]' class="opc-error op-cell-error">
                        <i class="pi pi-exclamation-triangle"></i>
                        <span>Please reload file</span>
                    </div>
                    <div v-if='errorMessages != ""' class="opc-error op-cell-error">
                        <i class="pi pi-times-circle-fill"></i>
                        <span>{{errorMessages}}</span>
                    </div>
                    <div v-if='errorMessages == "" && $stateStore.operatingPointsCircuitSimulator.confirmedColumns[currentOperatingPointIndex][currentWindingIndex] && missingSignals.length > 0' class="opc-error op-cell-error" role="alert" :data-cy="dataTestLabel + '-missing-signals'">
                        <i class="pi pi-exclamation-triangle"></i>
                        <span>The imported columns give {{ masStore.mas.magnetic.coil.functionalDescription[currentWindingIndex].name }} no {{ missingSignals.join(' and no ') }} waveform. Pick the column that holds it above and update the columns.</span>
                    </div>
                </section>

                <div class="opc-actions op-editor-actions">
                    <button
                        :disabled='loadedFile=="" || loading'
                        :data-cy="dataTestLabel + '-import-button'"
                        type="button"
                        class="op-action op-action-filled"
                        @click="confirmColumns"
                    >
                        <img v-if="loading" alt="loading" class="opc-loading" :src="$settingsStore.loadingGif">
                        <template v-else>
                            <i class="pi pi-check"></i>
                            <span>{{$stateStore.operatingPointsCircuitSimulator.confirmedColumns[currentOperatingPointIndex][currentWindingIndex]? 'Update columns' : 'Confirm columns'}}</span>
                        </template>
                    </button>
                    <button
                        :data-cy="dataTestLabel + '-import-button'"
                        type="button"
                        class="op-action"
                        @click="clearMode"
                    >
                        <i class="pi pi-arrow-left"></i>
                        <span>Go back to selecting mode</span>
                    </button>
                </div>
            </div>
            <div v-if="importedSignalsReady" class="op-editor-results" data-op-col="results">
                <WaveformGraph class="op-chart"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformGraph'"
                    :enableDrag="false"
                />
                <WaveformFourier class="op-chart" style="max-height: 150px;"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformFourier'"
                />

                <WaveformSimpleOutput
                    v-if="!$settingsStore.operatingPointSettings.advancedMode"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformOutput-current'"
                />

                <div v-if="$settingsStore.operatingPointSettings.advancedMode" class="op-outputs-pair">
                    <WaveformOutput
                        :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                        :dataTestLabel="dataTestLabel + '-WaveformOutput-current'"
                        :signalDescriptor="'current'"
                    />
                    <WaveformOutput
                        data-op-col="results-second"
                        :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                        :dataTestLabel="dataTestLabel + '-WaveformOutput-voltage'"
                        :signalDescriptor="'voltage'"
                    />
                </div>
                <WaveformCombinedOutput
                    v-if="$settingsStore.operatingPointSettings.advancedMode"
                    :dataTestLabel="dataTestLabel + '-WaveformCombinedOutput'"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Layout, cells, actions and results come from the shared editor styles in
   OperatingPoint.vue (.op-editor-*, .op-cell-*, .op-action). */
.opc-container {
    width: 100%;
    margin: 0;
    padding: 0;
}

.opc-loading {
    height: 1.4rem;
    width: auto;
}
</style>
