<script setup>
import { useMasStore } from '../../../stores/mas'
import { useTaskQueueStore } from '../../../stores/taskQueue'
import WaveformInputHarmonic from './Input/WaveformInputHarmonic.vue'
import WaveformGraph from './Output/WaveformGraph.vue'
import WaveformFourier from './Output/WaveformFourier.vue'
import WaveformOutput from './Output/WaveformOutput.vue'
import WaveformSimpleOutput from './Output/WaveformSimpleOutput.vue'
import WaveformCombinedOutput from './Output/WaveformCombinedOutput.vue'
import InfoTip from '../../InfoTip.vue'
import { formatFrequency, removeTrailingZeroes, roundWithDecimals, deepCopy, ordinalSuffixOf } from 'WebSharedComponents/assets/js/utils.js'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import { combinedStyle, combinedClass } from 'WebSharedComponents/assets/js/utils.js'

import { defaultOperatingPointExcitationWithHarmonics, defaultPrecision, defaultSinusoidalNumberPoints } from 'WebSharedComponents/assets/js/defaults.js'
import { tooltipsMagneticSynthesisOperatingPoints } from 'WebSharedComponents/assets/js/texts.js'

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
            blockingReboundsFrequency: false,
            processingHarmonics: false,
            errorMessages: {
                current: "",
                voltage: "",
            },
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
    async mounted () {
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
            if (needsCurrent) await this.processHarmonicsSequentially("current", w);
            // Inductor mode: voltage harmonics inputs are disabled and the
            // voltage is derived from the current via the magnetizing
            // inductance — standardizing it from its default harmonics
            // would produce a wrong waveform.
            if (needsVoltage && !this.isInductor) await this.processHarmonicsSequentially("voltage", w);
        }
        if (this.isInductor && this.hasInductance) {
            // Induce the voltage from the reconstructed current waveform.
            this.induceVoltageFromCurrent();
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
        async induceVoltageFromCurrent() {
            // Inductor (single-winding) mode: voltage is derived from current via
            // magnetizing inductance. Mirror OperatingPointManual.induce('current').
            if (!this.isInductor || !this.hasInductance) return;
            try {
                const magnetizingInductance = await this.taskQueueStore.resolveDimensionWithTolerance(this.masStore.mas.inputs.designRequirements.magnetizingInductance, 'the magnetizing inductance in Design Requirements');
                const excitation = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex];
                const voltage = await this.taskQueueStore.calculateInducedVoltage(excitation, magnetizingInductance);
                // Never write a null/absent field into the store: consumers read
                // voltage.processed.rms unconditionally and a stored null poisons
                // every subsequent render. Fail loudly on a bad MKF result instead.
                if (voltage?.waveform == null || voltage?.harmonics == null || voltage?.processed == null) {
                    throw new Error(`calculateInducedVoltage returned an incomplete signal `
                        + `(waveform=${voltage?.waveform == null ? 'null' : 'ok'}, `
                        + `harmonics=${voltage?.harmonics == null ? 'null' : 'ok'}, `
                        + `processed=${voltage?.processed == null ? 'null' : 'ok'}) — store left untouched`);
                }
                excitation.voltage.waveform = voltage.waveform;
                excitation.voltage.harmonics = voltage.harmonics;
                excitation.voltage.processed = voltage.processed;
                this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed('voltage');
                this.masStore.updatedInputExcitationProcessed('voltage');
                this.forceUpdateVoltage += 1;
            } catch (error) {
                console.error('[induceVoltageFromCurrent] failed:', error);
            }
        },
        async processHarmonicsSequentially(signalDescriptor, windingIndex) {
            // Run one pass and then wait out the 500 ms cooldown so the NEXT
            // pass isn't dropped by the busy guard (mounted() needs a current
            // pass AND a voltage pass back-to-back).
            await this.processHarmonics(signalDescriptor, windingIndex);
            await new Promise((resolve) => setTimeout(resolve, 600));
        },
        async processHarmonics(signalDescriptor, windingIndexOverride = null) {
            if (this.processingHarmonics) {
                // Skip, do NOT defer-and-retry: the store-object replacement at
                // the end of each pass re-triggers this via the Dimension
                // @update handlers, and a retry turns that self-trigger into
                // an endless reprocessing loop. The 500 ms cooldown in
                // finally{} is what breaks the cycle. Callers that legitimately
                // need back-to-back passes (mounted) must serialize through
                // processHarmonicsSequentially instead.
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

                // Save the user-entered harmonics before standardizing
                const userHarmonics = JSON.parse(JSON.stringify(excitation.harmonics));

                // Standardize on a DETACHED copy. Nulling waveform/processed on the
                // live store object publishes a half-erased signal to every consumer
                // for the whole duration of the await below, and they re-render
                // inside that window — WaveformSimpleOutput reads
                // voltage.processed.rms and throws, once per re-render, forever.
                // Build the input off-store and swap the result in atomically.
                const signalForStandardize = JSON.parse(JSON.stringify(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor]));
                signalForStandardize.waveform = null;
                signalForStandardize.processed = null;

                console.log(`[processHarmonics] calling standardizeSignalDescriptor with frequency=${frequency}`);
                let parsedResult;
                try {
                    parsedResult = await this.taskQueueStore.standardizeSignalDescriptor(signalForStandardize, frequency);
                } catch (e) {
                    // WASM failed — the store was never mutated, nothing to restore.
                    console.error('[processHarmonics] standardize FAILED:', e);
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

            // Rebound guard — the same one onAmplitudeChanged has, and for the same
            // reason. The cross-signal write below bumps forceUpdateCurrent/Voltage,
            // Dimension's forceUpdate watcher answers with an 'update' emit, and
            // WaveformInputHarmonic turns that back into onFrequencyChanged. That
            // ricochet is supposed to stop once both fundamentals are equal, but the
            // value round-trips through Dimension's scale/rounding, so the raw !=
            // below can stay true forever and current<->voltage ping-pong without
            // end (console flood + the UI stuck "thinking").
            if (this.blockingReboundsFrequency) return;
            this.blockingReboundsFrequency = true;
            setTimeout(() => this.blockingReboundsFrequency = false, 20);

            if (this.checkFrequencies(signalDescriptor)) {
                this.processHarmonics(signalDescriptor);
                if (signalDescriptor == "current" && this.isInductor) {
                    setTimeout(() => this.induceVoltageFromCurrent(), 600);
                }
                this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].frequency = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.harmonics.frequencies[1]

                if (this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.harmonics.frequencies[1] != this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.harmonics.frequencies[1]) {

                    let mirroredSignal;
                    if (signalDescriptor == "current") {
                        this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.harmonics.frequencies[1] = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.harmonics.frequencies[1];
                        this.forceUpdateVoltage += 1;
                        mirroredSignal = "voltage";
                    }
                    else {
                        this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.harmonics.frequencies[1] = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.harmonics.frequencies[1];
                        this.forceUpdateCurrent += 1;
                        mirroredSignal = "current";
                    }

                    // The mirrored signal's fundamental just changed, so it has to
                    // be re-standardized too. That used to happen by accident, via
                    // the Dimension forceUpdate -> 'update' -> onFrequencyChanged
                    // ricochet that caused the infinite loop; do it explicitly and
                    // serialized instead. Inductor mode derives the voltage from
                    // the current (see induceVoltageFromCurrent), so it is exempt.
                    if (!(mirroredSignal == "voltage" && this.isInductor)) {
                        this.processHarmonicsSequentially(mirroredSignal, this.currentWindingIndex);
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
                        if (this.isInductor) {
                            // Voltage is locked to current via L; recompute after WASM
                            // reconstructs the standardized current signal.
                            setTimeout(() => this.induceVoltageFromCurrent(), 600);
                        }
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
            this.processHarmonics(signalDescriptor);
            if (signalDescriptor == "current") {
                this.forceUpdateCurrent += 1;
                if (this.isInductor) {
                    setTimeout(() => this.induceVoltageFromCurrent(), 600);
                }
            }
            else {
                this.forceUpdateVoltage += 1;
            }
        },
        onRemovePoint(index, signalDescriptor) {
            this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics.frequencies.splice(index, 1);
            this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex][signalDescriptor].harmonics.amplitudes.splice(index, 1);
            this.processHarmonics(signalDescriptor);
            if (signalDescriptor == "current") {
                this.forceUpdateCurrent += 1;
                if (this.isInductor) {
                    setTimeout(() => this.induceVoltageFromCurrent(), 600);
                }
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
        <div class="op-editor-head" data-op-col="head">
            <h2 class="op-editor-title" data-op-title :data-cy="dataTestLabel + '-current-title'">{{masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].name}}
                <InfoTip
                    label="About this editor"
                    :text="'Harmonics of ' + masStore.mas.magnetic.coil.functionalDescription[currentWindingIndex].name + ' in this operating point: the frequency and amplitude of each harmonic of the current and the voltage.'"
                    :data-cy="dataTestLabel + '-editor-info'"
                />
            </h2>
        </div>
        <div class="op-editor-grid">
            <div class="oph-col op-editor-inputs" data-op-col="inputs">

                <section class="oph-card oph-card-current op-cell op-cell-current">
                    <h3 class="oph-card-header op-cell-title" data-op-title>Current harmonics</h3>
                    <div class="oph-list-head" aria-hidden="true"><span>Order</span><span>Frequency</span><span>Amplitude</span></div>
                    <div class="oph-card-body op-cell-body">
                        <div
                            v-if="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex] != null && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.harmonics"
                            v-for="index in masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.harmonics.amplitudes.length" :key="index">
                            <WaveformInputHarmonic class="col-12 mb-1 text-left"
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
                    </div>
                    <div v-if='errorMessages.current != ""' class="oph-error op-cell-error">
                        <i class="pi pi-exclamation-triangle"></i>
                        <span>{{errorMessages.current}}</span>
                    </div>
                </section>

                <section class="oph-card oph-card-voltage op-cell op-cell-voltage" :class="{ 'op-cell-derived': isInductor }">
                    <h3 class="oph-card-header op-cell-title" data-op-title>Voltage harmonics</h3>
                    <div class="oph-list-head" aria-hidden="true"><span>Order</span><span>Frequency</span><span>Amplitude</span></div>
                    <div class="oph-card-body op-cell-body">
                        <div
                            v-if="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex] != null && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].voltage.harmonics"
                            v-for="index in masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].voltage.harmonics.amplitudes.length" :key="index">

                            <WaveformInputHarmonic class="col-12 mb-1 text-left"
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
                    </div>
                    <div v-if='errorMessages.voltage != ""' class="oph-error op-cell-error">
                        <i class="pi pi-exclamation-triangle"></i>
                        <span>{{errorMessages.voltage}}</span>
                    </div>
                </section>

                <div class="oph-actions op-editor-actions">
                    <button
                        :data-cy="dataTestLabel + '-import-button'"
                        type="button"
                        class="op-action"
                        @click="$emit('clearMode')">
                        <i class="pi pi-arrow-left"></i>
                        <span>Go back to selecting mode</span>
                    </button>
                    <button
                        :data-cy="dataTestLabel + '-switch-to-manual-button'"
                        type="button"
                        class="op-action op-action-main"
                        @click="$emit('switchToManual')">
                        <span>Switch to Waveform view</span>
                    </button>
                </div>
            </div>
            <div v-if="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex] != null && (masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.waveform != null || masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].voltage.waveform != null)" class="op-editor-results" data-op-col="results">
                <WaveformGraph class="op-chart"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformGraph'"
                    :enableDrag="false"
                />
                <WaveformFourier class="op-chart" style="max-height: 150px;"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :updateHarmonics="false"
                    :dataTestLabel="dataTestLabel + '-WaveformFourier'"
                    :harmonicPowerThresholdVoltage="0.05"
                    :harmonicPowerThresholdCurrent="0.05"
                    :maxHarmonicsToPlot="30"
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
   OperatingPoint.vue (.op-editor-*, .op-cell-*, .op-action). This file only
   lays out the harmonic rows: order | frequency | amplitude | add/remove. */
.oph-container {
    width: 100%;
    margin: 0;
    padding: 0;
}

.oph-list-head,
.oph-card-body :deep(.container > .row) {
    display: grid !important;
    grid-template-columns: 2.6rem minmax(0, 1fr) minmax(0, 1fr) 3.4rem;
    column-gap: 0.5rem;
    align-items: center;
}
.oph-list-head {
    margin: 0 0 0.3rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--op-muted);
}
.oph-list-head > span:first-child {
    grid-column: 1;
}

/* The list scrolls inside its cell rather than stretching the page. */
.oph-card-body {
    max-height: 28vh;
    overflow-y: auto;
    overflow-x: hidden;
}

.oph-card-body :deep(.container) {
    margin: 0 !important;
    padding: 0 !important;
    max-width: none !important;
    width: 100% !important;
}
.oph-card-body :deep(.container > .row > *) {
    width: auto !important;
    max-width: none !important;
    flex: none !important;
    margin: 0 !important;
    padding: 0.15rem 0 !important;
}
.oph-card-body :deep(.harmonic-title) {
    font-size: 0.86rem;
    font-weight: 600;
    color: var(--op-text);
}
/* Each value has its column heading; the per-field label is empty. */
.oph-card-body :deep(.dim-label) {
    display: none !important;
}
.oph-card-body :deep(.dim-row) {
    gap: 0 !important;
}
.oph-card-body :deep(.dim-value-row) {
    max-width: none !important;
    width: 100% !important;
}
.oph-card-body :deep(.harmonic-btn-group) {
    justify-content: flex-end;
}
/* Phone width: a narrower order column and unit selects so the numbers
   keep room to show in full. */
@container op-editor (max-width: 30rem) {
    .oph-list-head,
    .oph-card-body :deep(.container > .row) {
        grid-template-columns: 2.1rem minmax(0, 1fr) minmax(0, 1fr) 2.9rem;
        column-gap: 0.35rem;
    }
    .oph-card-body :deep(.dim-unit) {
        flex: 0 0 3.1rem !important;
        width: 3.1rem !important;
        min-width: 0 !important;
    }
    .oph-card-body :deep(.dim-unit .p-select-label) {
        padding-left: 0.3rem !important;
        padding-right: 0 !important;
    }
    .oph-card-body :deep(.dim-unit .p-select-dropdown) {
        width: 1rem !important;
    }
    .oph-card-body :deep(.p-inputnumber-input) {
        padding-left: 0.3rem !important;
    }
}
</style>
