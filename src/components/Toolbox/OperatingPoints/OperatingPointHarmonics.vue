<script setup>
import { useMasStore } from '../../../stores/mas'
import { useTaskQueueStore } from '../../../stores/taskQueue'
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
    emits: ['clearMode', 'updatedSignal', 'switchToManual'],
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
        const taskQueueStore = useTaskQueueStore();
        return {
            masStore,
            taskQueueStore,
            forceUpdateCurrent,
            forceUpdateVoltage,
            blockingRebounds,
            processingHarmonics: false,
            errorMessages: {
                current: "",
                voltage: "",
            },
        }
    },
    computed: {
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
        // Only process harmonics if waveform doesn't exist (initial setup)
        // Don't regenerate waveform when returning from other tools.
        // Process for ALL windings, not just the currently selected one,
        // so switching windings later still finds populated waveform/processed data.
        const op = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex];
        const windingCount = op?.excitationsPerWinding?.length || 0;
        for (let w = 0; w < windingCount; w++) {
            const exc = op.excitationsPerWinding[w];
            if (exc == null) continue;
            const needsCurrent = exc.current?.waveform == null && exc.current?.harmonics?.frequencies?.length >= 2;
            const needsVoltage = exc.voltage?.waveform == null && exc.voltage?.harmonics?.frequencies?.length >= 2;
            if (needsCurrent) this.processHarmonics("current", w);
            if (needsVoltage) this.processHarmonics("voltage", w);
        }
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
            const frequencies = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics.frequencies;
            for (let index = 2; index < frequencies.length; index++) {
                if (frequencies[index] % frequencies[1] != 0) {
                    const frequencyAux = formatFrequency(frequencies[index], 0.001);
                    const mainFrequencyAux = formatFrequency(frequencies[1], 0.001);
                    this.errorMessages[signalDescriptor] = `Frequency ${removeTrailingZeroes(frequencyAux.label, 5)} ${frequencyAux.unit} must be a multiple of ${removeTrailingZeroes(mainFrequencyAux.label, 5)} ${mainFrequencyAux.unit}`
                    return false;
                }
            }
            return true;
        },
        async processHarmonics(signalDescriptor, windingIndexOverride = null) {
            if (this.processingHarmonics) {
                console.log(`[processHarmonics] SKIPPED (already processing)`);
                return;
            }
            this.processingHarmonics = true;

            this.masStore.mas.inputs.operatingPoints.forEach((operatingPoint, operatingPointIndex) => {
                this.masStore.mas.inputs.operatingPoints[operatingPointIndex] = this.checkAndFixOperatingPoint(operatingPoint);
            })

            const windingIndex = windingIndexOverride != null ? windingIndexOverride : this.currentWindingIndex;

            try {
                // Guard against missing data
                const excitation = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex]?.excitationsPerWinding?.[windingIndex]?.[signalDescriptor];
                if (!excitation?.harmonics?.frequencies || excitation.harmonics.frequencies.length < 2) {
                    console.warn(`[processHarmonics] Missing harmonics data for ${signalDescriptor}`);
                    return;
                }
                const frequency = excitation.harmonics.frequencies[1];
                console.log(`[processHarmonics] START signal=${signalDescriptor} winding=${windingIndex} frequency=${frequency}`);
                console.log(`[processHarmonics] input harmonics:`, JSON.parse(JSON.stringify(excitation.harmonics)));
                console.log(`[processHarmonics] has waveform:`, !!excitation.waveform, 'has processed:', !!excitation.processed);

                // Save the user-entered harmonics and current state before clearing
                const userHarmonics = JSON.parse(JSON.stringify(excitation.harmonics));
                const signalBackup = JSON.parse(JSON.stringify(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor]));

                // Clear waveform/processed so standardize reconstructs from harmonics
                this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].waveform = null;
                this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].processed = null;

                console.log(`[processHarmonics] calling standardizeSignalDescriptor with frequency=${frequency}`);
                let parsedResult;
                try {
                    parsedResult = await this.taskQueueStore.standardizeSignalDescriptor(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor], frequency);
                } catch (e) {
                    // WASM failed — restore the signal to its previous state
                    console.error('[processHarmonics] standardize FAILED, restoring signal:', e);
                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor] = signalBackup;
                    return;
                }

                console.log(`[processHarmonics] standardize OK, result has waveform:`, !!parsedResult?.waveform, 'waveform size:', parsedResult?.waveform?.data?.length);
                console.log(`[processHarmonics] result harmonics:`, parsedResult?.harmonics ? {freqs: parsedResult.harmonics.frequencies?.slice(0,5), amps: parsedResult.harmonics.amplitudes?.slice(0,5), len: parsedResult.harmonics.frequencies?.length} : 'null');
                console.log(`[processHarmonics] result processed rms:`, parsedResult?.processed?.rms);

                // Restore the user-entered harmonics directly. The round-trip through
                // reconstruct_signal + FFT can introduce spectral leakage artifacts
                // when harmonics have non-standard frequency spacing. The user's
                // harmonics are already the "main" ones — no filtering needed.
                parsedResult.harmonics = userHarmonics;
                this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor] = parsedResult;

                console.log(`[processHarmonics] DONE, stored signal has waveform:`, !!this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor]?.waveform);

                // Only emit reactivity action when processing for the visible winding,
                // otherwise it would re-trigger Fourier/Graph for the wrong winding.
                if (windingIndex === this.currentWindingIndex) {
                    console.log(`[processHarmonics] emitting updatedInputExcitationWaveformUpdatedFromProcessed`);
                    this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed(signalDescriptor);
                } else {
                    console.log(`[processHarmonics] skipping emit, windingIndex=${windingIndex} != currentWindingIndex=${this.currentWindingIndex}`);
                }
            } catch (error) {
                console.error('[processHarmonics] OUTER CATCH:', error);
            } finally {
                // Release after a delay so the WaveformFourier chopHarmonics
                // writeback doesn't re-trigger processHarmonics
                setTimeout(() => { this.processingHarmonics = false; }, 500);
            }
        },
        onFrequencyChanged(signalDescriptor) {
            // Guard against missing data
            const excitations = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex]?.excitationsPerWinding?.[this.currentWindingIndex];
            if (!excitations?.current?.harmonics?.frequencies || !excitations?.voltage?.harmonics?.frequencies) {
                return;
            }

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
            // Guard against missing data
            const excitations = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex]?.excitationsPerWinding?.[this.currentWindingIndex];
            if (!excitations?.[signalDescriptor]?.harmonics?.frequencies) {
                return;
            }

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
    <div class="oph-container">
        <div class="row g-2 m-0">
            <div class="col-lg-5 col-md-12 oph-col">

                <div class="oph-title" :data-cy="dataTestLabel + '-current-title'">
                    <i class="fa-solid fa-bullseye"></i>
                    <span>{{masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].name + ' — ' + masStore.mas.magnetic.coil.functionalDescription[currentWindingIndex].name}}</span>
                </div>

                <div class="oph-card oph-card-current">
                    <div class="oph-card-header">
                        <i class="fa-solid fa-wave-square"></i>
                        <span>Current harmonics</span>
                    </div>
                    <div class="oph-card-body">
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
                        <div v-if='errorMessages.current != ""' class="oph-error">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            <span>{{errorMessages.current}}</span>
                        </div>
                    </div>
                </div>

                <div class="oph-card oph-card-voltage">
                    <div class="oph-card-header">
                        <i class="fa-solid fa-bolt"></i>
                        <span>Voltage harmonics</span>
                    </div>
                    <div class="oph-card-body">
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
                        <div v-if='errorMessages.voltage != ""' class="oph-error">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            <span>{{errorMessages.voltage}}</span>
                        </div>
                    </div>
                </div>

                <div class="oph-actions">
                    <button
                        :data-cy="dataTestLabel + '-import-button'"
                        class="oph-btn oph-btn-outline"
                        @click="$emit('clearMode')">
                        <i class="fa-solid fa-arrow-left"></i>
                        <span>Go back to selecting mode</span>
                    </button>
                    <button
                        :data-cy="dataTestLabel + '-switch-to-manual-button'"
                        class="oph-btn oph-btn-primary"
                        @click="$emit('switchToManual')">
                        <i class="fa-solid fa-wave-square"></i>
                        <span>Switch to Waveform view</span>
                    </button>
                </div>
            </div>
            <div v-if="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex] != null && (masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.waveform != null || masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].voltage.waveform != null)" class="col-lg-7 col-md-12 row m-0 p-0 align-items-start" style="max-width: 800px;">
                <div>
                    <WaveformGraph class=" col-12 py-2"
                        :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                        :dataTestLabel="dataTestLabel + '-WaveformGraph'"
                        :enableDrag="false"
                    />
                    <WaveformFourier class="col-12 mt-1 mb-3" style="max-height: 150px;"
                        :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                        :updateHarmonics="false"
                        :dataTestLabel="dataTestLabel + '-WaveformFourier'"
                        :harmonicPowerThresholdVoltage="0.05"
                        :harmonicPowerThresholdCurrent="0.05"
                        :maxHarmonicsToPlot="30"
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
.oph-container {
    width: 100%;
    margin: 0;
    padding: 0;
}

.oph-col {
    max-width: 460px;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding-left: 0.25rem;
    padding-right: 0.25rem;
}

.oph-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--bs-primary);
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    padding: 0.2rem 0.2rem 0.4rem 0.2rem;
}

.oph-title i {
    filter: drop-shadow(0 0 4px rgba(var(--bs-primary-rgb), 0.5));
}

.oph-card {
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

.oph-card-current {
    border-left-color: rgba(177, 138, 234, 0.7);
}

.oph-card-voltage {
    border-left-color: rgba(0, 182, 255, 0.7);
}

.oph-card-header {
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

.oph-card-current .oph-card-header {
    color: #b18aea;
    background: rgba(177, 138, 234, 0.1);
    border-bottom-color: rgba(177, 138, 234, 0.18);
}

.oph-card-current .oph-card-header i {
    filter: drop-shadow(0 0 4px rgba(177, 138, 234, 0.5));
}

.oph-card-voltage .oph-card-header {
    color: #00b6ff;
    background: rgba(0, 182, 255, 0.1);
    border-bottom-color: rgba(0, 182, 255, 0.18);
}

.oph-card-voltage .oph-card-header i {
    filter: drop-shadow(0 0 4px rgba(0, 182, 255, 0.5));
}

.oph-card-header i {
    font-size: 0.85rem;
    filter: drop-shadow(0 0 4px rgba(var(--bs-primary-rgb), 0.5));
}

.oph-card-body {
    padding: 0.6rem 0.7rem 0.7rem 0.7rem;
    max-height: 28vh;
    overflow-y: auto;
}

.oph-card-body :deep(.row) {
    margin-left: 0 !important;
    margin-right: 0 !important;
}

.oph-error {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.5rem;
    padding: 0.4rem 0.6rem;
    background: rgb(var(--bs-danger-rgb) / 0.12);
    border: 1px solid rgb(var(--bs-danger-rgb) / 0.4);
    border-radius: 8px;
    color: var(--bs-danger);
    font-size: 0.78rem;
    line-height: 1.3;
    white-space: pre-wrap;
}

.oph-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.4rem;
}

button.oph-btn {
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

button.oph-btn:hover {
    filter: brightness(1.15);
    transform: translateY(-1px);
}

button.oph-btn-primary {
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

button.oph-btn-outline {
    background: rgba(255, 255, 255, 0.08) !important;
    border: 1px solid rgba(var(--bs-primary-rgb), 0.55) !important;
    color: var(--bs-primary) !important;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

button.oph-btn-outline:hover {
    background: rgba(var(--bs-primary-rgb), 0.2) !important;
    border-color: rgba(var(--bs-primary-rgb), 0.85) !important;
    color: #ffffff !important;
}
</style>
