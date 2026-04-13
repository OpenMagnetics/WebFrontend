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
    <div class="container">
        <div class="row">
            <div class="col-lg-4 col-md-12" style="max-width: 360px;">

                <label
                    :style="combinedStyle([$styleStore.operatingPoints.inputTitleFontSize, $styleStore.operatingPoints.commonParameterTextColor])"
                    :data-cy="dataTestLabel + '-current-title'"
                    class="mx-0 p-0 mb-4"
                >
                    {{masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].name + ' - ' + masStore.mas.magnetic.coil.functionalDescription[currentWindingIndex].name}}
                </label>

                <label
                    :style="combinedStyle([$styleStore.operatingPoints.inputTitleFontSize, $styleStore.operatingPoints.commonParameterTextColor])"
                    :data-cy="dataTestLabel + '-current-title'"
                    class="mx-0 p-0 mb-4"
                >
                    {{'Current harmonics'}}
                </label>

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
                <div v-if='errorMessages.current != ""' class="col-12">
                    <label :data-cy="dataTestLabel + '-error-text'" class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages.current}}</label>
                </div>
                <label
                    :style="combinedStyle([$styleStore.operatingPoints.inputTitleFontSize, $styleStore.operatingPoints.commonParameterTextColor])"
                    :data-cy="dataTestLabel + '-current-title'"
                    class="mx-0 p-0 mb-4"
                >
                    {{'Voltage harmonics'}}
                </label>
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
                <div v-if='errorMessages.voltage != ""' class="col-12">
                    <label :data-cy="dataTestLabel + '-error-text'" class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages.voltage}}</label>
                </div>
                <button
                    :style="$styleStore.operatingPoints.goBackSelectingButton"
                    :data-cy="dataTestLabel + '-import-button'"
                    class="btn btn-success fs-5 col-sm-12 col-md-12 mt-3 p-0"
                    style="max-height: 2em"
                    @click="$emit('clearMode')">
                    {{'Go back to selecting mode'}}
                </button>
                <button
                    :style="$styleStore.operatingPoints.goBackSelectingButton"
                    :data-cy="dataTestLabel + '-switch-to-manual-button'"
                    class="btn btn-outline-primary fs-5 col-sm-12 col-md-12 mt-2 p-0"
                    style="max-height: 2em"
                    @click="$emit('switchToManual')">
                    {{'Switch to Waveform view'}}
                </button>
            </div> 
            <div v-if="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex] !=null && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.waveform != null && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.processed != null && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].voltage.waveform != null && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].voltage.processed != null" class="col-lg-8 col-md-12 row m-0 p-0 align-items-start" style="max-width: 800px;">
                <div>
                    <WaveformGraph class=" col-12 py-2"
                        :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                        :dataTestLabel="dataTestLabel + '-WaveformGraph'"
                        :enableDrag="false"
                    />
                    <WaveformFourier class="col-12 mt-1" style="max-height: 150px;"
                        :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                        :updateHarmonics="false"
                        :dataTestLabel="dataTestLabel + '-WaveformFourier'"
                        :harmonicPowerThresholdVoltage="0.05"
                        :harmonicPowerThresholdCurrent="0.05"
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
                    <!-- <button :data-cy="dataTestLabel + '-reset-button'" class="btn btn-danger fs-6 offset-md-10 col-sm-12 col-md-2  mt-2 p-0" style="max-height: 2em" @click="resetCurrentExcitation"> Reset Point -->
                    <!-- </button> -->
                </div>
            </div>
        </div>
    </div>
</template>
