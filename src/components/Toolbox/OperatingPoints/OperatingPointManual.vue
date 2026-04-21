<script setup>
import { useMasStore } from '../../../stores/mas'
import { useTaskQueueStore } from '../../../stores/taskQueue'
import WaveformGraph from './Output/WaveformGraph.vue'
import WaveformFourier from './Output/WaveformFourier.vue'
import WaveformInputCustom from './Input/WaveformInputCustom.vue'
import WaveformInput from './Input/WaveformInput.vue'
import WaveformInputCommon from './Input/WaveformInputCommon.vue'
import WaveformSimpleOutput from './Output/WaveformSimpleOutput.vue'
import WaveformOutput from './Output/WaveformOutput.vue'
import WaveformCombinedOutput from './Output/WaveformCombinedOutput.vue'
import { roundWithDecimals, deepCopy, combinedStyle } from '/WebSharedComponents/assets/js/utils.js'

import { defaultOperatingPointExcitation, defaultPrecision, defaultSinusoidalNumberPoints } from '/WebSharedComponents/assets/js/defaults.js'
import { tooltipsMagneticSynthesisOperatingPoints } from '/WebSharedComponents/assets/js/texts.js'

</script>
<script>

export default {
    emits: ["updatedSignal", "updatedWaveform", "clearMode", "switchToHarmonics"],
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
        }
    },
    computed: {
        isInductor() {
            return this.masStore.mas.inputs.designRequirements.turnsRatios.length === 0;
        },
        hasInductance() {
            const ind = this.masStore.mas.inputs.designRequirements.magnetizingInductance;
            return ind && (ind.nominal > 0 || ind.minimum > 0);
        },
    },
    watch: {
    },
    created () {

    },
    mounted () {
        this.masStore.$onAction((action) => {
            if (action.name == "updatedInputExcitationProcessed") {
                this.$emit('updatedSignal');
            }
        })
        // For inductors, ensure voltage is consistent with current on mount.
        // Use a longer delay on mount to let WASM initialize and process existing data.
        if (this.isInductor && this.hasInductance) {
            this._autoInduceTimer = setTimeout(async () => {
                this._autoInduceTimer = null;
                try {
                    await this.induce('current');
                } catch (e) {
                    console.warn('Auto-induce voltage on mount failed:', e.message);
                }
            }, 1000);
        }
    },
    beforeUnmount() {
        if (this._autoInduceTimer) clearTimeout(this._autoInduceTimer);
    },
    methods: {
        updatedWaveform(signalDescriptor) {
            this.$emit('updatedWaveform', signalDescriptor);
            this.$emit('updatedSignal');
        },
        autoInduceVoltageFromCurrent() {
            if (!this.isInductor || !this.hasInductance) return;
            // Debounce: wait for current waveform processing to complete
            // before deriving voltage (WASM needs fully processed harmonics).
            if (this._autoInduceTimer) clearTimeout(this._autoInduceTimer);
            this._autoInduceTimer = setTimeout(async () => {
                this._autoInduceTimer = null;
                try {
                    await this.induce('current');
                } catch (e) {
                    console.warn('Auto-induce voltage from current failed:', e.message);
                }
            }, 500);
        },
        currentUpdated() {
            this.masStore.updatedInputExcitationProcessed('current');
            this.autoInduceVoltageFromCurrent();
        },
        currentWaveformUpdated() {
            this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed('current');
            this.autoInduceVoltageFromCurrent();
        },
        async induce(sourceSignalDescriptor){
            if (sourceSignalDescriptor == 'current'){

                try {
                    var magnetizingInductance = await this.taskQueueStore.resolveDimensionWithTolerance(this.masStore.mas.inputs.designRequirements.magnetizingInductance);
                    // Capture user preferences before WASM overwrites them.
                    // WASM discretizes waveforms into N points causing dutyCycle = k/N rounding
                    // (e.g. 94.37% → 95% with N=20). WASM also returns label="Custom" which
                    // would trigger WaveformOutput to re-overwrite dutyCycle from the discretized waveform.
                    const userDutyCycle = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.processed.dutyCycle;
                    const originalVoltageLabel = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.processed?.label;
                    var voltage = await this.taskQueueStore.calculateInducedVoltage(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex], magnetizingInductance);
                    if (userDutyCycle != null) voltage.processed.dutyCycle = userDutyCycle;
                    if (originalVoltageLabel && originalVoltageLabel !== 'Custom') voltage.processed.label = originalVoltageLabel;
                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.waveform = voltage.waveform;
                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.harmonics = voltage.harmonics;
                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.processed = voltage.processed;
                    this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed('voltage');
                    this.masStore.updatedInputExcitationProcessed('voltage');
                } catch (error) {
                    console.error(error);
                }
            }
            else if (sourceSignalDescriptor == 'voltage'){

                try {
                    var magnetizingInductance = await this.taskQueueStore.resolveDimensionWithTolerance(this.masStore.mas.inputs.designRequirements.magnetizingInductance);
                    var current = await this.taskQueueStore.calculateInducedCurrent(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex], magnetizingInductance);

                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.waveform = current.waveform;
                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.harmonics = current.harmonics;
                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.processed = current.processed;
                    this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed('current');
                    this.masStore.updatedInputExcitationProcessed('current');
                } catch (error) {
                    console.error(error);
                }
            }
        },
        resetCurrentExcitation() {
            this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex] = deepCopy(defaultOperatingPointExcitation);
        },
        clearMode() {
            this.$emit("clearMode");
        },
    }
}
</script>

<template>
    <div class="opm-container">
        <div class="row g-2 m-0">
            <div v-if="masStore.mas.inputs.operatingPoints.length > currentOperatingPointIndex" class="col-lg-5 col-md-12 opm-col">

                <div class="opm-title" data-cy="dataTestLabel + '-current-title'">
                    <i class="bi bi-bullseye"></i>
                    <span>{{masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].name + ' — ' + masStore.mas.magnetic.coil.functionalDescription[currentWindingIndex].name}}</span>
                </div>

                <div class="opm-card">
                    <div class="opm-card-header">
                        <i class="bi bi-sliders"></i>
                        <span>Common parameters</span>
                    </div>
                    <div class="opm-card-body">
                        <WaveformInputCommon
                            :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                            :defaultValue="defaultOperatingPointExcitation"
                            :dataTestLabel="dataTestLabel + '-selected'"
                            @updatedSwitchingFrequency="masStore.updatedInputExcitationProcessed()"
                            @updatedDutyCycle="masStore.updatedInputExcitationProcessed()"
                        />
                    </div>
                </div>

                <div class="opm-card opm-card-current">
                    <div class="opm-card-header">
                        <i class="bi bi-soundwave"></i>
                        <span>Current waveform</span>
                    </div>
                    <div class="opm-card-body">
                        <WaveformInput
                            v-if="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current != null && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.processed && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.processed.label != 'Custom'"
                            :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                            :defaultValue="defaultOperatingPointExcitation"
                            :dataTestLabel="dataTestLabel + '-selected-current'"
                            :signalDescriptor="'current'"
                            @peakToPeakChanged="currentUpdated"
                            @offsetChanged="currentUpdated"
                            @labelChanged="currentUpdated"
                            @induce="induce('voltage')"
                        />
                        <WaveformInputCustom
                            v-else
                            :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                            :defaultValue="defaultOperatingPointExcitation"
                            :dataTestLabel="dataTestLabel + '-selected-current'"
                            :signalDescriptor="'current'"
                            @labelChanged="currentUpdated"
                            @updatedTime="currentWaveformUpdated"
                            @updatedData="currentWaveformUpdated"
                            @induce="induce('voltage')"
                        />
                    </div>
                </div>

                <div class="opm-card opm-card-voltage" :class="{ 'opm-disabled': isInductor }">
                    <div class="opm-card-header">
                        <i class="bi bi-lightning-fill"></i>
                        <span>Voltage waveform</span>
                    </div>
                    <div class="opm-card-body">
                        <WaveformInput
                            v-if="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].voltage.processed && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].voltage.processed.label != 'Custom'"
                            :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                            :defaultValue="defaultOperatingPointExcitation"
                            :dataTestLabel="dataTestLabel + '-selected-voltage'"
                            :signalDescriptor="'voltage'"
                            :disabled="isInductor"
                            @peakToPeakChanged="masStore.updatedInputExcitationProcessed('voltage')"
                            @offsetChanged="masStore.updatedInputExcitationProcessed('voltage')"
                            @labelChanged="masStore.updatedInputExcitationProcessed('voltage')"
                            @induce="induce('current')"
                        />
                        <WaveformInputCustom
                            v-else
                            :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                            :defaultValue="defaultOperatingPointExcitation"
                            :dataTestLabel="dataTestLabel + '-selected-voltage'"
                            :signalDescriptor="'voltage'"
                            :disabled="isInductor"
                            @labelChanged="masStore.updatedInputExcitationProcessed('voltage')"
                            @updatedTime="masStore.updatedInputExcitationWaveformUpdatedFromProcessed('voltage')"
                            @updatedData="masStore.updatedInputExcitationWaveformUpdatedFromProcessed('voltage')"
                            @induce="induce('current')"
                        />
                    </div>
                </div>

                <div class="opm-actions">
                    <button
                        :data-cy="dataTestLabel + '-import-button'"
                        class="opm-btn opm-btn-outline"
                        @click="clearMode"
                    >
                        <i class="bi bi-arrow-left"></i>
                        <span>Go back to selecting mode</span>
                    </button>
                    <button
                        :data-cy="dataTestLabel + '-switch-to-harmonics-button'"
                        class="opm-btn opm-btn-primary"
                        @click="$emit('switchToHarmonics')"
                    >
                        <i class="bi bi-graph-up-arrow"></i>
                        <span>Switch to Harmonics view</span>
                    </button>
                </div>
            </div>
            <div class="col-lg-7 col-md-12 row m-0 p-0" style="max-width: 800px;">
                <div>
                    <WaveformGraph class=" col-12 py-2"
                        :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                        :dataTestLabel="dataTestLabel + '-WaveformGraph'"
                        @updatedWaveform="updatedWaveform"
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
                    <WaveformCombinedOutput
                        v-if="$settingsStore.operatingPointSettings.advancedMode"
                        :style="$styleStore.operatingPoints.main"
                        class="col-12 m-0 px-2 border-top"
                        :dataTestLabel="dataTestLabel + '-WaveformCombinedOutput'"
                        :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    />
                    <!-- <button :data-cy="dataTestLabel + '-reset-button'" class="btn btn-danger fs-6 offset-md-10 col-sm-12 col-md-2  mt-2 p-0" style="max-height: 2em" @click="resetCurrentExcitation"> Reset Point -->
                    <!-- </button> -->
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.opm-container {
    width: 100%;
    margin: 0;
    padding: 0;
}

.opm-col {
    max-width: 460px;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding-left: 0.25rem;
    padding-right: 0.25rem;
}

.opm-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--bs-primary);
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    padding: 0.2rem 0.2rem 0.4rem 0.2rem;
}

.opm-title i {
    font-size: 1rem;
    filter: drop-shadow(0 0 4px rgba(var(--bs-primary-rgb), 0.5));
}

/* ============ Sub-card ============ */
.opm-card {
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

.opm-card-current {
    border-left-color: rgba(177, 138, 234, 0.7);
}

.opm-card-voltage {
    border-left-color: rgba(0, 182, 255, 0.7);
}

.opm-disabled {
    opacity: 0.5;
    pointer-events: none;
}

.opm-card-header {
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

.opm-card-current .opm-card-header {
    color: #b18aea;
    background: rgba(177, 138, 234, 0.1);
    border-bottom-color: rgba(177, 138, 234, 0.18);
}

.opm-card-current .opm-card-header i {
    filter: drop-shadow(0 0 4px rgba(177, 138, 234, 0.5));
}

.opm-card-voltage .opm-card-header {
    color: #00b6ff;
    background: rgba(0, 182, 255, 0.1);
    border-bottom-color: rgba(0, 182, 255, 0.18);
}

.opm-card-voltage .opm-card-header i {
    filter: drop-shadow(0 0 4px rgba(0, 182, 255, 0.5));
}

.opm-card-header i {
    font-size: 0.85rem;
    filter: drop-shadow(0 0 4px rgba(var(--bs-primary-rgb), 0.5));
}

.opm-card-body {
    padding: 0.7rem 1rem 0.85rem 1rem;
}

/* Breathing room: only neutralize the outer Bootstrap row negative margins,
   inner inputs/selects keep their original sizing. */
.opm-card-body :deep(> .row),
.opm-card-body :deep(> .container-flex > .row) {
    margin-left: 0 !important;
    margin-right: 0 !important;
}

/* ============ Action buttons ============ */
.opm-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.4rem;
}

button.opm-btn {
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

button.opm-btn:hover {
    filter: brightness(1.15);
    transform: translateY(-1px);
}

button.opm-btn-primary {
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

button.opm-btn-outline {
    background: rgba(255, 255, 255, 0.08) !important;
    border: 1px solid rgba(var(--bs-primary-rgb), 0.55) !important;
    color: var(--bs-primary) !important;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

button.opm-btn-outline:hover {
    background: rgba(var(--bs-primary-rgb), 0.2) !important;
    border-color: rgba(var(--bs-primary-rgb), 0.85) !important;
    color: #ffffff !important;
}
</style>
