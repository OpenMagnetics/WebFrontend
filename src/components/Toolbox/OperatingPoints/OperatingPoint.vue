<script setup>
import { useMasStore } from '../../../stores/mas'
import { useTaskQueueStore } from '../../../stores/taskQueue'
import OperatingPointManual from './OperatingPointManual.vue'
import OperatingPointHarmonics from './OperatingPointHarmonics.vue'
import OperatingPointCircuitSimulator from './OperatingPointCircuitSimulator.vue'
import { roundWithDecimals, deepCopy, removeTrailingZeroes, combinedStyle } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'

import { defaultOperatingPointExcitation, defaultPrecision, defaultSinusoidalNumberPoints, minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
import { tooltipsMagneticSynthesisOperatingPoints } from '/WebSharedComponents/assets/js/texts.js'

</script>
<script>

export default {
    emits: ["updatedSignal", "updatedWaveform", "importedWaveform", "selectedManualOrImported", "selectedAcSweepTypeSelected"],
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
            loadedFile: "",
        }
    },
    computed: {
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
        async extractMapColumnNames(file) {
            try {
                const numberWindings = this.masStore.mas.inputs.designRequirements.turnsRatios.length + 1;
                const frequency = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].frequency;
                const result = await this.taskQueueStore.extractMapColumnNames(file, numberWindings, frequency);
                this.$stateStore.operatingPointsCircuitSimulator.columnNames[this.currentOperatingPointIndex] = result;
            }
            catch (error) {
                console.error(error)
            }
        },
        async extractAllColumnNames(file) {
            try {
                const result = await this.taskQueueStore.extractColumnNames(file);
                this.$stateStore.operatingPointsCircuitSimulator.allLastReadColumnNames = result;
            }
            catch (error) {
                console.error(error)
            }
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

            fr.onload = async e => {
                this.loadedFile = e.target.result;
                // Wait for both async operations to complete before setting the mode
                await Promise.all([
                    this.extractAllColumnNames(this.loadedFile),
                    this.extractMapColumnNames(this.loadedFile)
                ]);
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
        onCircuitSimulatorTypeSelected(event) {
            this.$refs['OperatingPoint-CircuitSimulator-upload-ref'].click()
        },
        clearMode(event) {
            this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] = null
        },
        switchToHarmonics() {
            this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] = this.$stateStore.OperatingPointsMode.HarmonicsList;
        },
        switchToManual() {
            this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] = this.$stateStore.OperatingPointsMode.Manual;
        },
    }
}
</script>
<template>
    <div class="op-detail-panel">
        <div class="op-detail-header">
            <i class="bi bi-soundwave"></i>
            <span>Operating Point</span>
        </div>
        <div class="op-detail-body">
            <OperatingPointManual
                v-if="$stateStore.operatingPoints.modePerPoint[currentOperatingPointIndex] === $stateStore.OperatingPointsMode.Manual"
                :currentOperatingPointIndex="currentOperatingPointIndex"
                :currentWindingIndex="currentWindingIndex"
                @updatedWaveform="updatedWaveform"
                @updatedSignal="$emit('updatedSignal')"
                @clearMode="clearMode"
                @switchToHarmonics="switchToHarmonics"
            />
            <OperatingPointCircuitSimulator
                v-if="$stateStore.operatingPoints.modePerPoint[currentOperatingPointIndex] === $stateStore.OperatingPointsMode.CircuitSimulatorImport"
                :loadedFile="loadedFile"
                :currentOperatingPointIndex="currentOperatingPointIndex"
                :currentWindingIndex="currentWindingIndex"
                :allColumnNames="$stateStore.operatingPointsCircuitSimulator.allLastReadColumnNames"
                @updatedSignal="$emit('updatedSignal')"
                @clearMode="clearMode"
                @importedWaveform="importedWaveform"
            />
            <OperatingPointHarmonics
                v-if="$stateStore.operatingPoints.modePerPoint[currentOperatingPointIndex] === $stateStore.OperatingPointsMode.HarmonicsList"
                :currentOperatingPointIndex="currentOperatingPointIndex"
                :currentWindingIndex="currentWindingIndex"
                @updatedSignal="$emit('updatedSignal')"
                @clearMode="clearMode"
                @switchToManual="switchToManual"
            />
            <div v-if="$stateStore.operatingPoints.modePerPoint[currentOperatingPointIndex] == null" class="op-mode-select">
                <div class="op-mode-title" :data-cy="dataTestLabel + '-current-title'">
                    {{masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].name}}
                </div>
                <div class="op-mode-prompt">
                    Where do you want to import your operating point from?
                </div>
                <div class="op-mode-buttons">
                    <input type="file" id="OperatingPoint-CircuitSimulator-upload-input" ref="OperatingPoint-CircuitSimulator-upload-ref" @change="onCircuitSimulatorFileTypeSelected" style="display:none" hidden/>
                    <button
                        v-if="enableManual"
                        data-cy="OperatingPoint-source-Manual-button"
                        type="button"
                        @click="onCircuitSimulatorTypeSelected"
                        class="op-mode-btn"
                    >
                        <i class="bi bi-file-earmark-arrow-down"></i>
                        <span>Circuit simulator export file or CSV</span>
                    </button>
                    <button
                        v-if="enableCircuitSimulatorImport"
                        data-cy="OperatingPoint-source-Manual-button"
                        type="button"
                        @click="onManualTypeSelected"
                        class="op-mode-btn"
                    >
                        <i class="bi bi-pencil-square"></i>
                        <span>I will define it manually</span>
                    </button>
                    <button
                        v-if="enableHarmonicsList"
                        data-cy="OperatingPoint-source-Manual-button"
                        type="button"
                        @click="onHarmoncsTypeSelected"
                        class="op-mode-btn"
                    >
                        <i class="bi bi-graph-up-arrow"></i>
                        <span>I want to introduce a list of harmonics</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.op-detail-panel {
    display: flex;
    flex-direction: column;
    background:
        linear-gradient(145deg,
            rgba(var(--bs-primary-rgb), 0.06) 0%,
            rgba(var(--bs-primary-rgb), 0.02) 100%),
        var(--bs-dark);
    border: 1px solid rgba(var(--bs-primary-rgb), 0.15);
    border-radius: 14px;
    box-shadow:
        0 4px 20px rgba(0, 0, 0, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.04);
    overflow: hidden;
    min-height: 60vh;
}

.op-detail-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.9rem;
    background: rgba(var(--bs-primary-rgb), 0.1);
    border-bottom: 1px solid rgba(var(--bs-primary-rgb), 0.12);
    color: var(--bs-primary);
    font-weight: 600;
    font-size: 0.95rem;
    letter-spacing: 0.02em;
    flex-shrink: 0;
}

.op-detail-header i {
    font-size: 1rem;
    filter: drop-shadow(0 0 4px rgba(var(--bs-primary-rgb), 0.45));
}

.op-detail-body {
    padding: 0.5rem 0.5rem 0.6rem 0.5rem;
    flex: 1;
    overflow-y: auto;
}

/* ============ Mode selector view ============ */
.op-mode-select {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    padding: 1rem 0 2rem 0;
    max-width: 560px;
    margin: 0 auto;
}

.op-mode-title {
    color: var(--bs-primary);
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    text-align: center;
    margin-bottom: 0.5rem;
}

.op-mode-prompt {
    color: #f2f2f2;
    font-size: 0.95rem;
    font-weight: 500;
    text-align: center;
    opacity: 0.8;
    margin-bottom: 0.75rem;
}

.op-mode-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

button.op-mode-btn {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    padding: 0.85rem 1.25rem !important;
    border-radius: 12px !important;
    font-size: 0.95rem !important;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    border: 1px solid rgba(var(--bs-primary-rgb), 0.5) !important;
    background-color: var(--bs-primary) !important;
    background-image: linear-gradient(135deg,
        rgba(var(--bs-primary-rgb), 1) 0%,
        rgba(var(--bs-primary-rgb), 0.8) 100%) !important;
    color: #ffffff !important;
    box-shadow:
        0 0 0 1px rgba(var(--bs-primary-rgb), 0.3),
        0 3px 10px rgba(var(--bs-primary-rgb), 0.35),
        inset 0 1px 0 rgba(255, 255, 255, 0.25);
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
    transition: filter 0.15s, transform 0.1s, box-shadow 0.2s;
    width: 100%;
    outline: none;
    line-height: 1.2;
}

button.op-mode-btn:hover {
    filter: brightness(1.15);
    transform: translateY(-1px);
    box-shadow:
        0 0 0 1px rgba(var(--bs-primary-rgb), 0.4),
        0 4px 14px rgba(var(--bs-primary-rgb), 0.45),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

button.op-mode-btn i {
    font-size: 1.05rem;
}
</style>
