<script setup>
import { useMasStore } from '../../../stores/mas'
import { useTaskQueueStore } from '../../../stores/taskQueue'
import WaveformGraph from './Output/WaveformGraph.vue'
import WaveformFourier from './Output/WaveformFourier.vue'
import WaveformOutput from './Output/WaveformOutput.vue'
import WaveformSimpleOutput from './Output/WaveformSimpleOutput.vue'
import WaveformCombinedOutput from './Output/WaveformCombinedOutput.vue'
import WaveformInputColumnNames from './Input/WaveformInputColumnNames.vue'
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
        }
    },
    computed: {
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
            } finally {
                this.loading = false;
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
            this.loading = true;
            this.extractOperatingPoint(this.loadedFile);
        },
    }
}
</script>

<template>
    <div class="opc-container">
        <div class="row g-2 m-0">
            <div class="col-lg-5 col-md-12 opc-col">

                <div class="opc-title" :data-cy="dataTestLabel + '-current-title'">
                    <i class="bi bi-file-earmark-arrow-down"></i>
                    <span>{{masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].name + ' — ' + masStore.mas.magnetic.coil.functionalDescription[currentWindingIndex].name}}</span>
                </div>

                <div class="opc-card">
                    <div class="opc-card-header">
                        <i class="bi bi-layout-three-columns"></i>
                        <span>Imported file columns</span>
                    </div>
                    <div class="opc-card-body">
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
                </div>

                <div v-if='loadedFile=="" && !$stateStore.operatingPointsCircuitSimulator.confirmedColumns[currentOperatingPointIndex][currentWindingIndex]' class="opc-error">
                    <i class="bi bi-exclamation-triangle-fill"></i>
                    <span>Please reload file</span>
                </div>
                <div v-if='errorMessages != ""' class="opc-error">
                    <i class="bi bi-x-circle-fill"></i>
                    <span>{{errorMessages}}</span>
                </div>

                <div class="opc-actions">
                    <button
                        :disabled='loadedFile=="" || loading'
                        :data-cy="dataTestLabel + '-import-button'"
                        class="opc-btn opc-btn-primary"
                        @click="confirmColumns"
                    >
                        <img v-if="loading" alt="loading" class="opc-loading" :src="$settingsStore.loadingGif">
                        <template v-else>
                            <i class="bi bi-check-lg"></i>
                            <span>{{$stateStore.operatingPointsCircuitSimulator.confirmedColumns[currentOperatingPointIndex][currentWindingIndex]? 'Update columns' : 'Confirm columns'}}</span>
                        </template>
                    </button>
                    <button
                        :data-cy="dataTestLabel + '-import-button'"
                        class="opc-btn opc-btn-outline"
                        @click="clearMode"
                    >
                        <i class="bi bi-arrow-left"></i>
                        <span>Go back to selecting mode</span>
                    </button>
                </div>
            </div>
            <div v-if="$stateStore.operatingPointsCircuitSimulator.confirmedColumns[currentOperatingPointIndex][currentWindingIndex]" class="col-lg-7 col-md-12 row m-0 p-0" style="max-width: 800px;">
                <div>
                    <WaveformGraph class=" col-12 py-2"
                        :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                        :dataTestLabel="dataTestLabel + '-WaveformGraph'"
                        :enableDrag="false"
                    />
                    <WaveformFourier class="col-12 mt-1 mb-3" style="max-height: 150px;"
                        :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                        :dataTestLabel="dataTestLabel + '-WaveformFourier'"
                    />

                    <WaveformSimpleOutput class="col-lg-12 col-md-12 m-0 px-2"
                        v-if="!$settingsStore.operatingPointSettings.advancedMode"
                        :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                        :dataTestLabel="dataTestLabel + '-WaveformOutput-current'"
                    />

                    <div v-if="$settingsStore.operatingPointSettings.advancedMode" class="row m-0 p-0">
                        <WaveformOutput class="col-lg-6 col-md-6 col-12 m-0 px-2"
                            :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                            :dataTestLabel="dataTestLabel + '-WaveformOutput-current'"
                            :signalDescriptor="'current'"
                        />
                        <WaveformOutput class="col-lg-6 col-md-6 col-12 m-0 px-2"
                            :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                            :dataTestLabel="dataTestLabel + '-WaveformOutput-voltage'"
                            :signalDescriptor="'voltage'"
                        />
                    </div>
                    <WaveformCombinedOutput class="col-12 m-0 px-2 border-top"
                        v-if="$settingsStore.operatingPointSettings.advancedMode"
                        :dataTestLabel="dataTestLabel + '-WaveformCombinedOutput'"
                        :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.opc-container {
    width: 100%;
    margin: 0;
    padding: 0;
}

.opc-col {
    max-width: 460px;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding-left: 0.25rem;
    padding-right: 0.25rem;
}

.opc-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--bs-primary);
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    padding: 0.2rem 0.2rem 0.4rem 0.2rem;
}

.opc-title i {
    filter: drop-shadow(0 0 4px rgba(var(--bs-primary-rgb), 0.5));
}

.opc-card {
    background:
        linear-gradient(180deg,
            rgba(var(--bs-primary-rgb), 0.06) 0%,
            rgba(var(--bs-primary-rgb), 0.02) 100%),
        var(--bs-dark);
    border: 1px solid rgba(var(--bs-primary-rgb), 0.18);
    border-left: 3px solid rgba(var(--bs-primary-rgb), 0.7);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
}

.opc-card-header {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.5rem 0.75rem;
    background: rgba(var(--bs-primary-rgb), 0.08);
    border-bottom: 1px solid rgba(var(--bs-primary-rgb), 0.12);
    color: var(--bs-primary);
    font-weight: 600;
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.opc-card-header i {
    font-size: 0.85rem;
    filter: drop-shadow(0 0 4px rgba(var(--bs-primary-rgb), 0.5));
}

.opc-card-body {
    padding: 0.7rem 1rem 0.85rem 1rem;
}

.opc-card-body :deep(.row) {
    margin-left: 0 !important;
    margin-right: 0 !important;
}

.opc-error {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.5rem 0.75rem;
    background: rgb(var(--bs-danger-rgb) / 0.12);
    border: 1px solid rgb(var(--bs-danger-rgb) / 0.4);
    border-radius: 10px;
    color: var(--bs-danger);
    font-size: 0.8rem;
    line-height: 1.3;
    white-space: pre-wrap;
}

.opc-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.4rem;
}

button.opc-btn {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    padding: 0.55rem 1rem !important;
    border-radius: 10px !important;
    font-size: 0.85rem !important;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: filter 0.15s, transform 0.1s, box-shadow 0.2s, background 0.15s;
    width: 100%;
    line-height: 1.2;
    outline: none;
}

button.opc-btn:hover:not(:disabled) {
    filter: brightness(1.15);
    transform: translateY(-1px);
}

button.opc-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

button.opc-btn-primary {
    border: 1px solid rgba(var(--bs-primary-rgb), 0.85) !important;
    background-color: var(--bs-primary) !important;
    background-image: linear-gradient(135deg,
        rgba(var(--bs-primary-rgb), 1) 0%,
        rgba(var(--bs-primary-rgb), 0.8) 100%) !important;
    color: #ffffff !important;
    box-shadow:
        0 0 0 1px rgba(var(--bs-primary-rgb), 0.3),
        0 2px 8px rgba(var(--bs-primary-rgb), 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.25);
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
}

button.opc-btn-outline {
    background: rgba(255, 255, 255, 0.08) !important;
    border: 1px solid rgba(var(--bs-primary-rgb), 0.55) !important;
    color: var(--bs-primary) !important;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

button.opc-btn-outline:hover:not(:disabled) {
    background: rgba(var(--bs-primary-rgb), 0.2) !important;
    border-color: rgba(var(--bs-primary-rgb), 0.85) !important;
    color: #ffffff !important;
}

.opc-loading {
    height: 1.4rem;
    width: auto;
}
</style>
