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
import InfoTip from '../../InfoTip.vue'
import { roundWithDecimals, deepCopy, combinedStyle } from 'WebSharedComponents/assets/js/utils.js'

import { defaultOperatingPointExcitation, defaultPrecision, defaultSinusoidalNumberPoints } from 'WebSharedComponents/assets/js/defaults.js'
import { tooltipsMagneticSynthesisOperatingPoints } from 'WebSharedComponents/assets/js/texts.js'

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
            // Which signal the user drives for an inductor; the other is derived.
            inductorDrivenBy: 'current',
            // What MKF says of the voltage as it stands (e.g. not volt-second balanced); '' when it takes it.
            voltageIssue: '',
            masStore,
            taskQueueStore,
        }
    },
    computed: {
        currentWindingName() {
            return this.masStore.mas.magnetic.coil.functionalDescription[this.currentWindingIndex].name;
        },
        isInductor() {
            return this.masStore.mas.inputs.designRequirements.turnsRatios.length === 0;
        },
        // Web bug report #169: "can't edit the voltage waveform at OP point".
        //
        // For an inductor the two signals are not independent (v = L di/dt), so ONE of them
        // has to be the driven one. That part was right. What was wrong is that the choice
        // was hardcoded to current: the voltage card was dimmed with pointer-events:none and
        // no explanation, so a user who wanted to specify voltage and get current had no way
        // to say so and nothing telling them why. The engine has supported that direction all
        // along -- induce('voltage') calls calculateInducedCurrent, and this component already
        // wires it up.
        voltageIsDerived() {
            return this.isInductor && this.inductorDrivenBy == 'current';
        },
        currentIsDerived() {
            return this.isInductor && this.inductorDrivenBy == 'voltage';
        },
        // For an inductor the induce buttons would only repeat what the chosen signal already
        // derives, so they are disabled with this reason; '' (enabled) for a transformer.
        induceDisabledReason() {
            if (!this.isInductor) return '';
            return this.inductorDrivenBy == 'current'
                ? 'The voltage of an inductor is derived from its current (v = L di/dt). Choose "Define the voltage" above to set it instead.'
                : 'The current of an inductor is derived from its voltage (v = L di/dt). Choose "Define the current" above to set it instead.';
        },
        hasInductance() {
            const ind = this.masStore.mas.inputs.designRequirements.magnetizingInductance;
            return ind && (ind.nominal > 0 || ind.minimum > 0);
        },
    },
    watch: {
        currentOperatingPointIndex() { this.checkVoltageSoon(); },
        currentWindingIndex() { this.checkVoltageSoon(); },
    },
    created () {

    },
    mounted () {
        this.masStore.$onAction((action) => {
            if (action.name == "updatedInputExcitationProcessed") {
                this.$emit('updatedSignal');
            }
            if (action.name == "updatedInputExcitationProcessed" || action.name == "updatedInputExcitationWaveformUpdatedFromProcessed") {
                this.checkVoltageSoon();
            }
            // The driven signal's waveform has just been rebuilt from its edited parameters
            // (OperatingPoints.vue does that on updatedInputExcitationProcessed), so the
            // derived signal can now be derived from it.
            if (action.name == "updatedInputExcitationWaveformUpdatedFromProcessed"
                && this._deriveAfterRebuild && action.args[0] == this.inductorDrivenBy) {
                this._deriveAfterRebuild = false;
                this.refreshDerivedSoon();
            }
        })
        this.checkVoltageSoon();
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
        if (this._checkVoltageTimer) clearTimeout(this._checkVoltageTimer);
    },
    methods: {
        // Debounced: the voltage's waveform is rebuilt from its processed data after each edit.
        checkVoltageSoon() {
            if (this._checkVoltageTimer) clearTimeout(this._checkVoltageTimer);
            this._checkVoltageTimer = setTimeout(() => {
                this._checkVoltageTimer = null;
                this.checkVoltage();
            }, 500);
        },
        // MKF is the judge of a voltage: it is asked for the magnetizing current the voltage
        // imposes (Faraday), and what it refuses is shown next to the voltage. The current it
        // returns is not stored: this only checks.
        async checkVoltage() {
            const excitation = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex]?.excitationsPerWinding[this.currentWindingIndex];
            if (excitation?.voltage?.waveform == null || !this.hasInductance) {
                this.voltageIssue = '';
                return;
            }
            const checked = JSON.stringify(excitation.voltage.waveform) + excitation.frequency;
            let issue = '';
            try {
                const magnetizingInductance = await this.taskQueueStore.resolveDimensionWithTolerance(this.masStore.mas.inputs.designRequirements.magnetizingInductance, 'the magnetizing inductance in Design Requirements');
                await this.taskQueueStore.calculateInducedCurrent(deepCopy(excitation), magnetizingInductance);
            } catch (error) {
                issue = String(error?.message ?? error).replace(/^Exception:\s*/, '');
            }
            const current = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex]?.excitationsPerWinding[this.currentWindingIndex];
            if (current?.voltage?.waveform != null && JSON.stringify(current.voltage.waveform) + current.frequency === checked) {
                this.voltageIssue = issue;
            }
        },
        // Web bug report #169. Flip which signal the user drives, and immediately derive the
        // other one so the pair never sits inconsistent.
        setInductorDrivenBy(signalDescriptor) {
            if (this.inductorDrivenBy == signalDescriptor) return;
            this.inductorDrivenBy = signalDescriptor;
            this.induce(signalDescriptor);
        },

        updatedWaveform(signalDescriptor) {
            this.$emit('updatedWaveform', signalDescriptor);
            this.$emit('updatedSignal');
        },
        // For an inductor the derived signal follows the driven one: after any edit of the
        // driven signal or of the common parameters it is derived again through induce(), the
        // same MKF call the induce buttons make for a transformer. Those buttons are disabled
        // for an inductor, so this is the only way the derived signal is refreshed.
        //
        // The edit only marks the derived signal stale; it is derived once the driven signal's
        // waveform has been rebuilt for the edited parameters (see mounted). Deriving earlier
        // reads a waveform whose time axis still spans the old period. An edit reported by the
        // DERIVED signal's own inputs (they echo every value induce() writes into them) is not
        // an edit of the driven signal and must not derive again, or the two re-derive forever.
        deriveAfterRebuild(editedSignalDescriptor) {
            if (!this.isInductor || !this.hasInductance) return;
            if (editedSignalDescriptor != null && editedSignalDescriptor != this.inductorDrivenBy) return;
            this._deriveAfterRebuild = true;
        },
        refreshDerivedSoon() {
            if (!this.isInductor || !this.hasInductance) return;
            // Debounce: wait for the edited waveform's processing to complete
            // before deriving the other one (WASM needs fully processed harmonics).
            if (this._autoInduceTimer) clearTimeout(this._autoInduceTimer);
            this._autoInduceTimer = setTimeout(async () => {
                this._autoInduceTimer = null;
                const drivenBy = this.inductorDrivenBy;
                try {
                    await this.induce(drivenBy);
                } catch (e) {
                    console.warn(`Deriving the inductor's ${drivenBy == 'current' ? 'voltage' : 'current'} from its ${drivenBy} failed:`, e.message);
                }
            }, 500);
        },
        commonUpdated() {
            this.deriveAfterRebuild(null);
            this.masStore.updatedInputExcitationProcessed();
        },
        currentUpdated() {
            this.deriveAfterRebuild('current');
            this.masStore.updatedInputExcitationProcessed('current');
        },
        currentWaveformUpdated() {
            this.deriveAfterRebuild('current');
            this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed('current');
        },
        voltageUpdated() {
            this.deriveAfterRebuild('voltage');
            this.masStore.updatedInputExcitationProcessed('voltage');
        },
        voltageWaveformUpdated() {
            this.deriveAfterRebuild('voltage');
            this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed('voltage');
        },
        async induce(sourceSignalDescriptor){
            const excitation = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex]?.excitationsPerWinding[this.currentWindingIndex];
            if (excitation?.[sourceSignalDescriptor]?.processed == null) {
                // A desynced/new operating point without processed source data
                // used to die here with a bare TypeError on .dutyCycle,
                // leaving the builder stuck (ABT #345). Say what is missing.
                console.error(`[induce] Operating point ${this.currentOperatingPointIndex}, winding ${this.currentWindingIndex}: ${sourceSignalDescriptor} has no processed data — define its waveform before inducing the counterpart signal.`);
                return;
            }
            if (sourceSignalDescriptor == 'current'){

                try {
                    var magnetizingInductance = await this.taskQueueStore.resolveDimensionWithTolerance(this.masStore.mas.inputs.designRequirements.magnetizingInductance, 'the magnetizing inductance in Design Requirements');
                    // Capture user preferences before WASM overwrites them.
                    // WASM discretizes waveforms into N points causing dutyCycle = k/N rounding
                    // (e.g. 94.37% → 95% with N=20). WASM also returns label="custom" which
                    // would trigger WaveformOutput to re-overwrite dutyCycle from the discretized waveform.
                    const userDutyCycle = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.processed.dutyCycle;
                    const originalVoltageLabel = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.processed?.label;
                    var voltage = await this.taskQueueStore.calculateInducedVoltage(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex], magnetizingInductance);
                    // Never store a null/absent field: consumers read
                    // voltage.processed.rms unconditionally, so a stored null
                    // poisons every later render. Fail loudly instead.
                    if (voltage?.waveform == null || voltage?.harmonics == null || voltage?.processed == null) {
                        throw new Error(`calculateInducedVoltage returned an incomplete signal `
                            + `(waveform=${voltage?.waveform == null ? 'null' : 'ok'}, `
                            + `harmonics=${voltage?.harmonics == null ? 'null' : 'ok'}, `
                            + `processed=${voltage?.processed == null ? 'null' : 'ok'}) — store left untouched`);
                    }
                    if (userDutyCycle != null) voltage.processed.dutyCycle = userDutyCycle;
                    if (originalVoltageLabel && originalVoltageLabel.toLowerCase() !== 'custom') voltage.processed.label = originalVoltageLabel;
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
                    var magnetizingInductance = await this.taskQueueStore.resolveDimensionWithTolerance(this.masStore.mas.inputs.designRequirements.magnetizingInductance, 'the magnetizing inductance in Design Requirements');
                    var current = await this.taskQueueStore.calculateInducedCurrent(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex], magnetizingInductance);

                    if (current?.waveform == null || current?.harmonics == null || current?.processed == null) {
                        throw new Error(`calculateInducedCurrent returned an incomplete signal `
                            + `(waveform=${current?.waveform == null ? 'null' : 'ok'}, `
                            + `harmonics=${current?.harmonics == null ? 'null' : 'ok'}, `
                            + `processed=${current?.processed == null ? 'null' : 'ok'}) — store left untouched`);
                    }
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
        <div v-if="masStore.mas.inputs.operatingPoints.length > currentOperatingPointIndex" class="op-editor-head" data-op-col="head">
            <h2 class="op-editor-title" data-op-title data-cy="dataTestLabel + '-current-title'">{{masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].name}}
                <InfoTip
                    label="About this editor"
                    :text="'Waveforms of ' + masStore.mas.magnetic.coil.functionalDescription[currentWindingIndex].name + ' in this operating point: set each signal\'s shape and values, or drag the chart.'"
                    :data-cy="dataTestLabel + '-editor-info'"
                />
            </h2>
        </div>
        <div class="op-editor-grid">
            <div v-if="masStore.mas.inputs.operatingPoints.length > currentOperatingPointIndex" class="opm-col op-editor-inputs" data-op-col="inputs">

                <section v-if="isInductor" class="opm-drive op-cell">
                    <h3 class="op-cell-title opm-visually-hidden" :id="dataTestLabel + '-drive-title'">What you define</h3>
                    <div class="opm-drive-row">
                    <div class="opm-drive-options" role="group" :aria-labelledby="dataTestLabel + '-drive-title'">
                        <button type="button" class="opm-drive-option opm-drive-current" :data-cy="dataTestLabel + '-drive-with-current'"
                            :aria-pressed="inductorDrivenBy == 'current' ? 'true' : 'false'"
                            @click="setInductorDrivenBy('current')">Define the current</button>
                        <button type="button" class="opm-drive-option opm-drive-voltage" :data-cy="dataTestLabel + '-drive-with-voltage'"
                            :aria-pressed="inductorDrivenBy == 'voltage' ? 'true' : 'false'"
                            @click="setInductorDrivenBy('voltage')">Define the voltage</button>
                    </div>
                    <InfoTip
                        label="Why only one signal"
                        :text="'An inductor\'s current and voltage are tied by v = L·di/dt, so the ' + (inductorDrivenBy == 'current' ? 'voltage' : 'current') + ' is derived from the ' + inductorDrivenBy + ' you set.'"
                        :data-cy="dataTestLabel + '-drive-info'"
                    />
                    </div>
                </section>

                <section class="opm-card op-cell">
                    <h3 class="opm-card-header op-cell-title" data-op-title>Common parameters</h3>
                    <div class="opm-card-body op-cell-body">
                        <WaveformInputCommon
                            :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                            :defaultValue="defaultOperatingPointExcitation"
                            :dataTestLabel="dataTestLabel + '-selected'"
                            @updatedSwitchingFrequency="commonUpdated"
                            @updatedDutyCycle="commonUpdated"
                        />
                    </div>
                </section>

                <section class="opm-card opm-card-current op-cell op-cell-current" :class="{ 'op-cell-derived': currentIsDerived }">
                    <h3 class="opm-card-header op-cell-title" data-op-title>
                        <span :data-cy="dataTestLabel + '-current-card-title'">Current through {{ currentWindingName }}</span>
                        <InfoTip v-if="currentIsDerived" class="opm-derived-badge" label="Derived" text="Derived from the voltage you set.">Derived</InfoTip>
                    </h3>
                    <div class="opm-card-body op-cell-body">
                        <WaveformInput
                            v-if="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current != null && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.processed && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.processed.label != 'custom'"
                            :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                            :defaultValue="defaultOperatingPointExcitation"
                            :dataTestLabel="dataTestLabel + '-selected-current'"
                            :signalDescriptor="'current'"
                            :induceDisabledReason="induceDisabledReason"
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
                            :induceDisabledReason="induceDisabledReason"
                            @labelChanged="currentUpdated"
                            @updatedTime="currentWaveformUpdated"
                            @updatedData="currentWaveformUpdated"
                            @induce="induce('voltage')"
                        />
                    </div>
                </section>

                <section class="opm-card opm-card-voltage op-cell op-cell-voltage" :class="{ 'op-cell-derived': voltageIsDerived }">
                    <h3 class="opm-card-header op-cell-title" data-op-title>
                        <span :data-cy="dataTestLabel + '-voltage-card-title'">Voltage across {{ currentWindingName }}'s terminals</span>
                        <InfoTip v-if="voltageIsDerived" class="opm-derived-badge" label="Derived" text="Derived from the current you set.">Derived</InfoTip>
                    </h3>
                    <p v-if="!voltageIsDerived && isInductor" class="opm-derived-note op-cell-note">
                        <span class="opm-link-wrap" v-tooltip.top="'You are setting the voltage; the current is derived from it.'">
                            <button type="button" class="opm-link-btn op-cell-link"
                                v-tooltip.top.focus="'You are setting the voltage; the current is derived from it.'"
                                @click="setInductorDrivenBy('current')">Go back to setting the current</button>
                        </span>
                    </p>
                    <div class="opm-card-body op-cell-body">
                        <WaveformInput
                            v-if="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].voltage.processed && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].voltage.processed.label != 'custom'"
                            :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                            :defaultValue="defaultOperatingPointExcitation"
                            :dataTestLabel="dataTestLabel + '-selected-voltage'"
                            :signalDescriptor="'voltage'"
                            :disabled="voltageIsDerived"
                            :induceDisabledReason="induceDisabledReason"
                            @peakToPeakChanged="voltageUpdated"
                            @offsetChanged="voltageUpdated"
                            @labelChanged="voltageUpdated"
                            @induce="induce('current')"
                        />
                        <WaveformInputCustom
                            v-else
                            :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                            :defaultValue="defaultOperatingPointExcitation"
                            :dataTestLabel="dataTestLabel + '-selected-voltage'"
                            :signalDescriptor="'voltage'"
                            :disabled="voltageIsDerived"
                            :induceDisabledReason="induceDisabledReason"
                            @labelChanged="voltageUpdated"
                            @updatedTime="voltageWaveformUpdated"
                            @updatedData="voltageWaveformUpdated"
                            @induce="induce('current')"
                        />
                    </div>
                    <div v-if="voltageIssue != ''" class="opm-issue op-cell-issue" role="alert" :data-cy="dataTestLabel + '-voltage-issue'">
                        <i class="pi pi-exclamation-triangle"></i>
                        <span>{{ voltageIssue }}</span>
                    </div>
                </section>

                <div class="opm-actions op-editor-actions">
                    <button
                        :data-cy="dataTestLabel + '-import-button'"
                        type="button"
                        class="op-action"
                        @click="clearMode"
                    >
                        <i class="pi pi-arrow-left"></i>
                        <span>Go back to selecting mode</span>
                    </button>
                    <button
                        :data-cy="dataTestLabel + '-switch-to-harmonics-button'"
                        type="button"
                        class="op-action op-action-main"
                        @click="$emit('switchToHarmonics')"
                    >
                        <span>Switch to Harmonics view</span>
                    </button>
                </div>
            </div>
            <div class="op-editor-results" data-op-col="results">
                <WaveformGraph class="op-chart"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformGraph'"
                    @updatedWaveform="updatedWaveform"
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
                    :style="$styleStore.operatingPoints.main"
                    :dataTestLabel="dataTestLabel + '-WaveformCombinedOutput'"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Layout, cells, fields and actions come from the shared editor styles in
   OperatingPoint.vue (.op-editor-*, .op-cell-*, .op-action). */
.opm-container {
    width: 100%;
    margin: 0;
    padding: 0;
}

/* An inductor's choice of the signal the user sets: two options, one pressed. */
.opm-drive-options {
    display: inline-flex;
    max-width: 100%;
    margin: 0 0 0.5rem;
    border: 1px solid var(--op-field-border);
    border-radius: 8px;
    overflow: hidden;
}
button.opm-drive-option {
    flex: 1 1 auto;
    min-height: 2rem;
    margin: 0;
    padding: 0 0.85rem;
    background: transparent;
    border: 0;
    color: var(--op-muted);
    font: inherit;
    font-size: 0.86rem;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
}
button.opm-drive-option + button.opm-drive-option {
    border-left: 1px solid var(--op-field-border);
}
button.opm-drive-option:hover {
    color: var(--op-text);
    background: rgba(var(--p-white-rgb), 0.05);
}
button.opm-drive-option.opm-drive-current[aria-pressed="true"] {
    color: var(--p-dark);
    background: var(--p-warning);
}
button.opm-drive-option.opm-drive-voltage[aria-pressed="true"] {
    color: var(--p-dark);
    background: var(--p-info);
}
button.opm-drive-option:focus-visible {
    outline: 2px solid var(--p-primary);
    outline-offset: -2px;
}
.opm-drive-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;
}
.opm-drive-row .opm-drive-options {
    margin: 0;
}
/* The derived signal's status, next to its card title; its tooltip says from what. */
.opm-derived-badge {
    margin-left: 0.4rem;
    vertical-align: 0.1em;
}
.opm-derived-note .op-cell-link {
    margin-left: 0;
}
/* Names the inductor's choice for screen readers (aria-labelledby); the two options say it on screen. */
.opm-visually-hidden {
    position: absolute !important;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px !important;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
</style>
