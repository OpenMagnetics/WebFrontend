<script setup>
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import OperatingPoint from './OperatingPoints/OperatingPoint.vue'
import InfoTip from '../InfoTip.vue'
import { roundWithDecimals, deepCopy, combinedStyle } from 'WebSharedComponents/assets/js/utils.js'

import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import { defaultOperatingPointExcitation, defaultPrecision, defaultSinusoidalNumberPoints, minimumMaximumScalePerParameter } from 'WebSharedComponents/assets/js/defaults.js'
import { tooltipsMagneticSynthesisOperatingPoints } from 'WebSharedComponents/assets/js/texts.js'

import Text from 'WebSharedComponents/DataInput/Text.vue'
import ElementFromList from 'WebSharedComponents/DataInput/ElementFromList.vue'


</script>
<script>

export default {
    components: { ElementFromList },
    emits: ["canContinue", "changeTool"],
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        enableManual: {
            type: Boolean,
            default: true,
        },
        enableCircuitSimulatorImport: {
            type: Boolean,
            default: true,
        },
        enableHarmonicsList: {
            type: Boolean,
            default: true,
        },
        defaultMode: {
            type: String,
            default: null,
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const currentOperatingPointIndex = 0;
        const currentWindingIndex = 0;
        const errorMessages = "";
        const blockingRebounds = false;
        const localData = {
            ambientTemperature: 25
        };
        // Per-operating-point view model for the cooling control (web bug report #170).
        const coolingUi = [];

        this.$stateStore.initializeOperatingPoints();


// masStore.mas.inputs.operatingPoints[operatingPointIndex].conditions
        return {
            masStore,
            taskQueueStore,
            currentOperatingPointIndex,
            currentWindingIndex,
            errorMessages,
            blockingRebounds,
            localData,
            coolingUi,
        }
    },
    computed: {
        operatingPointsCountText() {
            const points = this.masStore.mas.inputs.operatingPoints.length;
            const windings = this.masStore.mas.magnetic.coil.functionalDescription.length;
            return (points == 1 ? '1 operating point' : points + ' operating points') + ', ' + (windings == 1 ? '1 winding' : windings + ' windings');
        },
        // The reasons canContinue writes into errorMessages, one per line.
        errorLines() {
            return this.errorMessages.split('\n').map(line => line.trim()).filter(line => line != '');
        },
        excitationSelectorDisabled() {
            return this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] !== this.$stateStore.OperatingPointsMode.Manual && this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] !== this.$stateStore.OperatingPointsMode.CircuitSimulatorImport && this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] !== this.$stateStore.OperatingPointsMode.HarmonicsList;
        },
        canContinue() {
            var allSet = true;

            if (this.masStore.hasMirroredWindings) {
                for (var operatingPointIndex = 0; operatingPointIndex < this.masStore.mas.inputs.operatingPoints.length; operatingPointIndex++) {
                    for (var windingIndex = 0; windingIndex < this.masStore.mas.magnetic.coil.functionalDescription.length; windingIndex++) {
                        this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex] = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex];
                    }
                }
            }

            this.errorMessages = "";
            for (var operatingPointIndex = 0; operatingPointIndex < this.masStore.mas.inputs.operatingPoints.length; operatingPointIndex++) {
                if (this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] !== this.$stateStore.OperatingPointsMode.Manual && this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] !== this.$stateStore.OperatingPointsMode.CircuitSimulatorImport && this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] !== this.$stateStore.OperatingPointsMode.HarmonicsList) {
                    allSet = false;
                }
                if (this.masStore.mas.inputs.operatingPoints[operatingPointIndex] == null) {
                    allSet = false;
                    this.errorMessages += "Operating point with index " + operatingPointIndex + " is totally empty.\n"
                }
                if (this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding == null) {
                    allSet = false;
                    this.errorMessages += "Operating point " + this.masStore.mas.inputs.operatingPoints[operatingPointIndex].name + " has no windings defined.\n"
                }

                for (var windingIndex = 0; windingIndex < this.masStore.mas.magnetic.coil.functionalDescription.length; windingIndex++) {
                    const exc = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex];
                    const hasHarmonics = exc?.current?.harmonics != null && exc?.voltage?.harmonics != null;
                    const hasWaveform = exc?.current?.waveform != null && exc?.current?.processed != null &&
                                        exc?.voltage?.waveform != null && exc?.voltage?.processed != null;
                    if (exc == null || exc.current == null || exc.voltage == null || (!hasHarmonics && !hasWaveform)) {
                        this.errorMessages += "Missing waveforms for winding " + this.masStore.mas.magnetic.coil.functionalDescription[windingIndex].name + " in operating point " + this.masStore.mas.inputs.operatingPoints[operatingPointIndex].name + ".\n"
                        allSet = false;
                    }
                    else if (exc.current.processed?.rms == null) {
                        // Every winding is SEEDED with a default excitation at
                        // initialization, so the structural checks above pass
                        // without the user ever looking at the winding. Actually
                        // opening a winding's editor runs the MKF processing that
                        // fills processed.rms — the same signal the winding
                        // buttons use for their processed/unprocessed color.
                        // Without it, Continue would silently design against a
                        // default waveform nobody entered.
                        this.errorMessages += "Waveforms for winding " + this.masStore.mas.magnetic.coil.functionalDescription[windingIndex].name + " in operating point " + this.masStore.mas.inputs.operatingPoints[operatingPointIndex].name + " have not been defined yet: open the winding to review or edit them.\n"
                        allSet = false;
                    }
                }
            }
            return allSet;
        }
    },
    created () {
        this.ensureCoolingUi();
    },
    watch: {
        // Operating points can be added or removed after mount; keep the cooling view
        // models aligned with them (web bug report #170).
        'masStore.mas.inputs.operatingPoints.length'() {
            this.ensureCoolingUi();
        },
        // The gate depends on fields (e.g. processed.rms) that are filled by
        // direct store mutations, not store actions — the $onAction re-emit in
        // mounted() never fires for those. Watching the computed keeps the
        // Continue button in sync the moment a winding becomes processed.
        canContinue(value) {
            this.emitCanContinue();
        },
    },
    mounted () {

        if (this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding.length > 0) {
            if (this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.processed == null || Object.keys(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.processed).length === 0){
                this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.processed = deepCopy(defaultOperatingPointExcitation.current.processed)
            }
            if (this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.processed == null || Object.keys(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.processed).length === 0){
                this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.processed = deepCopy(defaultOperatingPointExcitation.voltage.processed)
            }
        }
        this.emitCanContinue();

        // Only set default mode if no mode is currently selected
        // Don't reset user-selected modes when navigating back from magnetic builder
        if (this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] == null) {
            this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] = this.defaultMode
        }

        this.masStore.$onAction((action) => {
            if (action.name == "updatedInputExcitationProcessed") {
                const operatingPointIndex = this.currentOperatingPointIndex;
                const windingIndex = this.currentWindingIndex;
                const signalDescriptor = action.args[0];

                if (signalDescriptor != null) {
                    this.convertFromProcessedToWaveform(operatingPointIndex, windingIndex, signalDescriptor);
                }
                else {
                    // Both signals at once: a common parameter (frequency, duty cycle) changed,
                    // and the outputs may only see the pair once both are rebuilt for it.
                    this.convertFromProcessedToWaveform(operatingPointIndex, windingIndex, ["current", "voltage"]);
                }
            }
            if (action.name == "updatedInputExcitationWaveformUpdatedFromGraph") {
                const signalDescriptor = action.args[0];
            }

            this.emitCanContinue();
        })
    },
    methods: {
        // Web bug report #170: "How to add a forced air condition". The answer was: you
        // could not. MAS carries conditions.cooling and MKF's Temperature model reads it
        // (CoolingUtils::detectCoolingType -> FORCED_CONVECTION on velocity, HEATSINK on
        // thermalResistance, COLD_PLATE on maximumTemperature), but nothing in the app
        // ever wrote it -- MagneticSummary only DISPLAYED it, so the field could only
        // arrive by hand-editing a MAS file.
        //
        // Natural convection deliberately stores null rather than an object: that is what
        // every existing design has, and writing {temperature: ...} for it would change
        // the thermal result for people who never asked for cooling.
        coolingModeOf(operatingPointIndex) {
            const cooling = this.masStore.mas.inputs.operatingPoints[operatingPointIndex]?.conditions?.cooling;
            if (cooling == null) return 'Natural convection';
            if (Array.isArray(cooling.velocity) && cooling.velocity.length > 0) return 'Forced air';
            if (cooling.thermalResistance != null) return 'Heatsink';
            return 'Natural convection';
        },
        // v-model needs a member expression, so the per-point view models live in the
        // coolingUi array and are (re)built whenever the operating points change, rather
        // than lazily from the template.
        ensureCoolingUi() {
            const operatingPoints = this.masStore.mas.inputs.operatingPoints ?? [];
            this.coolingUi.length = operatingPoints.length;
            operatingPoints.forEach((operatingPoint, operatingPointIndex) => {
                if (this.coolingUi[operatingPointIndex] != null) return;
                const cooling = operatingPoint?.conditions?.cooling;
                this.coolingUi[operatingPointIndex] = {
                    coolingMode: this.coolingModeOf(operatingPointIndex),
                    // MAS cooling velocity is a 2- or 3-component vector; MKF uses its magnitude.
                    airVelocity: (Array.isArray(cooling?.velocity) && cooling.velocity.length > 0) ? Math.hypot(...cooling.velocity) : 2,
                    thermalResistance: cooling?.thermalResistance != null ? cooling.thermalResistance : 10,
                };
            });
        },
        updateCooling(operatingPointIndex) {
            const ui = this.coolingUi[operatingPointIndex];
            if (ui == null) return;
            const conditions = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].conditions;
            if (ui.coolingMode == 'Forced air') {
                conditions.cooling = {
                    fluid: 'air',
                    temperature: conditions.ambientTemperature,
                    // The air speed as a vector (MAS: 2 or 3 components); MKF reads its magnitude,
                    // so [speed, 0] carries exactly the speed the user entered.
                    velocity: [ui.airVelocity, 0],
                };
            }
            else if (ui.coolingMode == 'Heatsink') {
                conditions.cooling = { thermalResistance: ui.thermalResistance };
            }
            else {
                conditions.cooling = null;
            }
            this.masStore.updatedInputExcitationProcessed();
        },

        // canContinue already builds errorMessages naming the exact operating
        // point and winding that is incomplete — that text was computed on
        // every evaluation and then dropped on the floor, which is why the
        // button could only say "Fix Errors". Ship the reasons with the
        // verdict so the sidebar can list them.
        emitCanContinue() {
            const canContinue = this.canContinue;
            const errors = canContinue
                ? []
                : this.errorMessages.split('\n').map(line => line.trim()).filter(line => line != '');
            this.$emit("canContinue", canContinue, errors);
        },
        async updatedSignal(signalDescriptor) {
            if (!this.blockingRebounds) {
                this.blockingRebounds = true;

                if (this.masStore.hasMirroredWindings) {
                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding.forEach((excitation, index) => {
                        if (index != this.currentWindingIndex) {
                            this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[index] = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex];
                        }
                    })
                }
                else {
                    for (const [index, excitation] of this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding.entries()) {
                        if (this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] === this.$stateStore.OperatingPointsMode.Manual && index != this.currentWindingIndex && this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].frequency != this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[index].frequency) {
                            this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[index] = await this.taskQueueStore.scaleExcitationTimeToFrequency(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[index], this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].frequency);
                        }
                    }
                }
                this.$stateStore.updatedSignals();
                setTimeout(() => this.blockingRebounds = false, 10);
            }
        },
        updatedWaveform(signalDescriptor) {
            this.convertFromWaveformToProcessed(this.currentOperatingPointIndex, this.currentWindingIndex, signalDescriptor);
        },
        // Rebuilds the waveform of one signal, or of several (["current", "voltage"]), from
        // its processed data and the excitation's frequency.
        //
        // The frequency and duty cycle inputs write into the operating point immediately, and
        // every output (graph, spectrum, quick stats, power) hands the excitation to MKF. So
        // the new waveforms are built off-store first, together with the harmonics MKF derives
        // from them, and only then written in one synchronous block: watchers and the
        // updatedInputExcitationWaveformUpdatedFromProcessed listeners never see a waveform,
        // its harmonics and the frequency from two different edits (MKF rejects that pair:
        // "Waveform time axis spans 1e-05 s ... but the excitation period is 5e-06 s").
        async convertFromProcessedToWaveform(operatingPointIndex, windingIndex, signalDescriptors) {
            const descriptors = Array.isArray(signalDescriptors) ? signalDescriptors : [signalDescriptors];
            const excitation = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex];
            const frequency = excitation.frequency;

            try {
                const rebuilt = await Promise.all(descriptors.map(async (signalDescriptor) => {
                    const signal = excitation[signalDescriptor];
                    if (signal.processed.label != "custom") {
                        const waveform = await this.taskQueueStore.createWaveform(signal.processed, frequency);
                        if (waveform.data.length == 0) {
                            return null;
                        }
                        const harmonics = await this.taskQueueStore.calculateHarmonics(waveform, frequency);
                        return { signalDescriptor, waveform, harmonics };
                    }
                    const scaledWaveform = await this.taskQueueStore.scaleWaveformTimeToFrequency(signal.waveform, frequency);
                    // A custom waveform at an unchanged frequency keeps its harmonics (in the
                    // harmonics view they are the ones the user typed); a rescaled time axis
                    // makes the stored ones describe another period, so MKF derives them again.
                    const sameTimeAxis = JSON.stringify(scaledWaveform.time) == JSON.stringify(signal.waveform?.time);
                    const harmonics = sameTimeAxis && signal.harmonics != null
                        ? signal.harmonics
                        : await this.taskQueueStore.calculateHarmonics(scaledWaveform, frequency);
                    return { signalDescriptor, waveform: scaledWaveform, harmonics };
                }));

                // Superseded: another edit changed the frequency, or replaced this excitation,
                // while MKF was building these. That edit starts its own rebuild, whose
                // result is the consistent one; writing this one would store a waveform for
                // a frequency the operating point no longer has.
                const current = this.masStore.mas.inputs.operatingPoints[operatingPointIndex]?.excitationsPerWinding[windingIndex];
                if (current !== excitation || current.frequency != frequency) {
                    return;
                }

                const written = rebuilt.filter((elem) => elem != null);
                written.forEach(({ signalDescriptor, waveform, harmonics }) => {
                    excitation[signalDescriptor].waveform = waveform;
                    excitation[signalDescriptor].harmonics = harmonics;
                });
                written.forEach(({ signalDescriptor }) => {
                    this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed(signalDescriptor);
                });
            } catch (error) {
                console.error(error);
            }

        },
        async convertFromWaveformToProcessed(operatingPointIndex, windingIndex, signalDescriptor) {
            var waveform = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].waveform;

            try {
                var processed = await this.taskQueueStore.calculateBasicProcessedData(waveform);

                this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].processed = processed;
                this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].current.processed.dutyCycle = processed.dutyCycle;
                this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].voltage.processed.dutyCycle = processed.dutyCycle;
                if (signalDescriptor == 'voltage'){
                    this.convertFromProcessedToWaveform(operatingPointIndex, windingIndex, "current");
                }
            } catch (error) {
                console.error(error);
            }
        },
        addNewOperatingPoint() {
            this.$stateStore.addNewOperatingPoint(this.currentOperatingPointIndex, this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex]);

            // The store PUSHES the new operating point at the END of the list;
            // `+= 1` only pointed at it when the current point was the last
            // one, otherwise the mode below clobbered a neighbour's mode and
            // the new point was left without one (ABT #345).
            this.currentOperatingPointIndex = this.masStore.mas.inputs.operatingPoints.length - 1;
            this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] = this.defaultMode;
            this.emitCanContinue();
        },
        removePoint(index) {
            if (index < this.currentOperatingPointIndex) {
                this.currentOperatingPointIndex -= 1;
            }
            this.$stateStore.removeOperatingPoint(index);
            this.emitCanContinue();
        },
        importedWaveform() {
            this.emitCanContinue();
        },
        selectedManualOrImported() {
            setTimeout(() => {
                this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed('current');
            }, 100);
            this.emitCanContinue();
        },
        selectOperatingPoint(operatingPointIndex) {
            // Switching operating point keeps the selected winding, so go through
            // changeWinding: it opens that winding in the new operating point the same
            // way clicking it does (user report #181 crashed rendering it).
            this.currentOperatingPointIndex = operatingPointIndex;
            this.changeWinding(this.currentWindingIndex);
        },
        changeWinding(windingIndex) {

            if (this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[windingIndex] == null) {
                this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[windingIndex] = deepCopy(defaultOperatingPointExcitation);
            }
            var tempExcitation = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[windingIndex];
            this.currentWindingIndex = windingIndex;
            this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[windingIndex] = tempExcitation;
            // this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed('current');
            setTimeout(() => {
                this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed('current');
            }, 100);
            this.emitCanContinue();
        },
        async reflectWinding(windingIndexToBeReflected){
            try {
                // Reflection only allowed with two windings
                var turnRatio = await this.taskQueueStore.resolveDimensionWithTolerance(this.masStore.mas.inputs.designRequirements.turnsRatios[0], 'the turns ratio in Design Requirements');  
                if (windingIndexToBeReflected == 0) {
                    var primaryExcitation = await this.taskQueueStore.calculateReflectedPrimary(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[1], turnRatio);
                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[0] = primaryExcitation;
                }
                else {
                    var secondaryExcitation = await this.taskQueueStore.calculateReflectedSecondary(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[0], turnRatio);
                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[1] = secondaryExcitation;
                }
                this.emitCanContinue();
            } catch (error) {
                console.error(error);
            }
        },
        resetCurrentExcitation() {
            this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex] = deepCopy(defaultOperatingPointExcitation);
        },
        isExcitationProcessed(operatingPointIndex, windingIndex) {
            if (this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex] == null) {
                return false;
            }
            else {
                if (this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].current == null) {
                    return false;
                }
                if (this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].current.processed == null) {
                    return false;
                }
                if (this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].current.processed.rms == null) {
                    return false;
                }
            }
            return true;
        },
        windingStatusText(operatingPointIndex, windingIndex) {
            const name = this.masStore.mas.magnetic.coil.functionalDescription[windingIndex].name;
            return this.isExcitationProcessed(operatingPointIndex, windingIndex)
                ? 'Waveforms for ' + name + ' are defined'
                : 'Waveforms for ' + name + ' have not been defined yet: open the winding to review or edit them';
        },
    }
}
</script>

<template>
    <div class="op-container">
        <div class="op-layout">
            <aside class="op-panel" data-op-col="list">
                <div class="op-header">
                    <h2 class="op-header-title" data-op-title>Operating points</h2>
                    <InfoTip
                        label="About operating points"
                        :text="'The load conditions the magnetic must work in, with the current and voltage of each winding. A dot per winding shows whether its waveforms are defined. Now: ' + operatingPointsCountText + '.'"
                        :data-cy="dataTestLabel + '-operating-points-info'"
                    />
                </div>
                <div class="op-card" :class="{ 'op-card-active': operatingPointIndex == currentOperatingPointIndex }" v-for="(operatingPoint, operatingPointIndex) in masStore.mas.inputs.operatingPoints" :key="operatingPointIndex">

                    <span v-if="$stateStore.operatingPoints.modePerPoint[operatingPointIndex] == null" class="op-card-pending"> Choose a mode for this operating point first <i class="pi pi-arrow-right op-card-pending-arrow"></i> </span>
                    <div v-else class="op-card-body">
                        <Text
                            class="op-name"
                            :name="'name'"
                            v-model="masStore.mas.inputs.operatingPoints[operatingPointIndex]"
                            :defaultValue="'My operating point'"
                            :dataTestLabel="dataTestLabel + '-operating-point-' + operatingPointIndex + '-name-input'"
                            :canBeEmpty="false"
                            :labelWidthProportionClass="'col-0'"
                            :valueWidthProportionClass="'col-12'"
                            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                            :titleFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                            :labelBgColor="$styleStore.operatingPoints.titleLabelBgColor"
                            :valueBgColor="$styleStore.operatingPoints.titleLabelBgColor"
                            :textColor="$styleStore.operatingPoints.titleTextColor"
                        />
                        <Dimension class="op-temp op-field"
                            :name="'ambientTemperature'"
                            :replaceTitle="'Temperature'"
                            unit="°C"
                            :dataTestLabel="dataTestLabel + '-ConditionsAmbientTemperature'"
                            :min="minimumMaximumScalePerParameter['temperature']['min']"
                            :max="minimumMaximumScalePerParameter['temperature']['max']"
                            :defaultValue="25"
                            v-model="masStore.mas.inputs.operatingPoints[operatingPointIndex].conditions"
                            :labelWidthProportionClass="'col-12 md:col-3'"
                            :valueWidthProportionClass="'col-12 md:col-9'"
                            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                            :labelFontSize="$styleStore.operatingPoints.inputFontSize"
                            :labelBgColor="$styleStore.operatingPoints.operatingPointBgColor"
                            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                            :textColor="$styleStore.operatingPoints.inputTextColor"
                        />
                        <!-- Web bug report #170: "How to add a forced air condition".
                             MAS and MKF have supported cooling all along; the app just had
                             no way to set it. Natural convection leaves conditions.cooling
                             null so nothing changes for designs that never touch this. -->
                        <ElementFromList class="op-cooling op-field"
                            v-if="coolingUi[operatingPointIndex]"
                            :name="'coolingMode'"
                            :tooltip="tooltipsMagneticSynthesisOperatingPoints['coolingMode']"
                            :replaceTitle="'Cooling'"
                            :options="['Natural convection', 'Forced air', 'Heatsink']"
                            :dataTestLabel="dataTestLabel + '-ConditionsCooling'"
                            v-model="coolingUi[operatingPointIndex]"
                            @update="updateCooling(operatingPointIndex)"
                            :labelWidthProportionClass="'col-12 md:col-3'"
                            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                            :labelFontSize="$styleStore.operatingPoints.inputFontSize"
                            :labelBgColor="$styleStore.operatingPoints.operatingPointBgColor"
                            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                            :textColor="$styleStore.operatingPoints.inputTextColor"
                        />
                        <Dimension class="op-cooling op-field"
                            v-if="coolingUi[operatingPointIndex] && coolingUi[operatingPointIndex].coolingMode == 'Forced air'"
                            :name="'airVelocity'"
                            :tooltip="tooltipsMagneticSynthesisOperatingPoints['airVelocity']"
                            :replaceTitle="'Air speed'"
                            unit="m/s"
                            :dataTestLabel="dataTestLabel + '-ConditionsAirVelocity'"
                            :min="0.1"
                            :max="50"
                            :defaultValue="2"
                            v-model="coolingUi[operatingPointIndex]"
                            @update="updateCooling(operatingPointIndex)"
                            :labelWidthProportionClass="'col-12 md:col-3'"
                            :valueWidthProportionClass="'col-12 md:col-9'"
                            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                            :labelFontSize="$styleStore.operatingPoints.inputFontSize"
                            :labelBgColor="$styleStore.operatingPoints.operatingPointBgColor"
                            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                            :textColor="$styleStore.operatingPoints.inputTextColor"
                        />
                        <Dimension class="op-cooling op-field"
                            v-if="coolingUi[operatingPointIndex] && coolingUi[operatingPointIndex].coolingMode == 'Heatsink'"
                            :name="'thermalResistance'"
                            :tooltip="tooltipsMagneticSynthesisOperatingPoints['thermalResistance']"
                            :replaceTitle="'Heatsink thermal resistance'"
                            unit="K/W"
                            :dataTestLabel="dataTestLabel + '-ConditionsHeatsinkRth'"
                            :min="0.01"
                            :max="1000"
                            :defaultValue="10"
                            v-model="coolingUi[operatingPointIndex]"
                            @update="updateCooling(operatingPointIndex)"
                            :labelWidthProportionClass="'col-12 md:col-3'"
                            :valueWidthProportionClass="'col-12 md:col-9'"
                            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                            :labelFontSize="$styleStore.operatingPoints.inputFontSize"
                            :labelBgColor="$styleStore.operatingPoints.operatingPointBgColor"
                            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                            :textColor="$styleStore.operatingPoints.inputTextColor"
                        />
                        <div v-if="!masStore.hasMirroredWindings && currentOperatingPointIndex == operatingPointIndex" class="op-windings-title">Windings</div>
                        <div
                            v-if="masStore.hasMirroredWindings"
                            class="grid m-0 p-0 py-1 align-items-center flex-nowrap"
                            >
                        </div>
                        <div
                            v-if="!masStore.hasMirroredWindings && currentOperatingPointIndex == operatingPointIndex"
                            class="op-winding-row"
                            :class="{
                                'op-winding-row-current': currentWindingIndex == windingIndex,
                                'op-winding-row-pending': !isExcitationProcessed(operatingPointIndex, windingIndex),
                            }"
                            v-for="(winding, windingIndex) in masStore.mas.magnetic.coil.functionalDescription"
                            :key="'winding-' + windingIndex"
                            >
                            <span
                                class="op-winding-status"
                                v-tooltip="windingStatusText(operatingPointIndex, windingIndex)"
                                role="img"
                                :aria-label="windingStatusText(operatingPointIndex, windingIndex)"
                            ></span>
                            <Text
                                :disabled="excitationSelectorDisabled"
                                class="op-winding-name"
                                :name="'name'"
                                v-model="masStore.mas.magnetic.coil.functionalDescription[windingIndex]"
                                :dataTestLabel="dataTestLabel + '-operating-point-' + operatingPointIndex + '-winding-' + windingIndex + '-name-input'"
                                :canBeEmpty="false"
                                :labelWidthProportionClass="'col-0'"
                                :valueWidthProportionClass="'col-12'"
                                :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                                :titleFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                                :labelBgColor="$styleStore.operatingPoints.windingBgColor"
                                :valueBgColor="$styleStore.operatingPoints.windingBgColor"
                                :textColor="$styleStore.operatingPoints.titleTextColor"
                                :extraStyleClass="'border-0'"
                            />
                            <button
                                v-tooltip="tooltipsMagneticSynthesisOperatingPoints[(windingIndex == 0? 'reflectPrimary' : 'reflectSecondaries')]"
                                class="op-winding-btn"
                                :disabled="excitationSelectorDisabled"
                                :data-cy="dataTestLabel + '-operating-point-' + operatingPointIndex + '-winding-' + windingIndex + '-reflect-button'"
                                v-if="masStore.mas.magnetic.coil.functionalDescription.length == 2 && masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[(windingIndex + 1) % 2] != null"
                                @click="reflectWinding(windingIndex)"
                            >
                                <i class="pi pi-arrow-right-arrow-left"></i>
                            </button>
                            <button
                                v-tooltip="tooltipsMagneticSynthesisOperatingPoints['editWindingWaveform']"
                                :disabled="excitationSelectorDisabled"
                                :data-cy="dataTestLabel + '-operating-point-' + operatingPointIndex + '-winding-' + windingIndex + '-select-button'"
                                class="op-winding-btn op-winding-open"
                                :class="currentWindingIndex == windingIndex? 'disabled' : ''"
                                @click="changeWinding(windingIndex)"
                            >
                                <i :class="currentWindingIndex == windingIndex ? 'pi pi-eye' : 'pi pi-file-plus'"></i>
                            </button>
                        </div>
                        <div v-else class="op-card-actions">
                            <button
                                :data-cy="dataTestLabel + '-remove-operating-point-' + operatingPointIndex + '-button'"
                                class="op-btn op-btn-danger"
                                @click="removePoint(operatingPointIndex)"
                            >
                                <i class="pi pi-trash"></i>
                                <span>Remove</span>
                            </button>
                            <button
                                :data-cy="dataTestLabel + '-select-operating-point-' + operatingPointIndex + '-button'"
                                class="op-btn op-btn-primary"
                                @click="selectOperatingPoint(operatingPointIndex)"
                            >
                                <i class="pi pi-pencil"></i>
                                <span>Select</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="op-panel-actions">
                    <button
                        :data-cy="dataTestLabel + '-add-operating-point-button'"
                        class="op-btn op-btn-add"
                        @click="addNewOperatingPoint"
                    >
                        <i class="pi pi-plus"></i>
                        <span>Add New OP</span>
                    </button>
                    <button
                        :data-cy="dataTestLabel + '-modify-number-windings-button'"
                        class="op-btn op-btn-quiet"
                        @click="$emit('changeTool', 'designRequirements')"
                    >
                        <i class="pi pi-sliders-h"></i>
                        <span>Change the number of windings</span>
                    </button>
                </div>

                <!-- Why Continue is blocked. The same reasons go to the Engine log
                     (canContinue's reasons array); here they fold under a one-line
                     summary so they do not push the list down. -->
                <details class="op-issues" v-show="errorLines.length > 0">
                    <summary class="op-issues-summary">
                        <i class="pi pi-exclamation-circle"></i>
                        <span>{{ errorLines.length == 1 ? '1 thing to finish before you continue' : errorLines.length + ' things to finish before you continue' }}</span>
                        <i class="pi pi-chevron-down op-issues-chevron"></i>
                    </summary>
                    <label :data-cy="dataTestLabel + '-error-text'" class="op-issues-text">{{errorMessages}}</label>
                </details>

            </aside>
            <div v-if="masStore.mas.inputs.operatingPoints.length > 0" class="op-detail-column" data-op-col="detail">
                <OperatingPoint
                    v-if="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding.length > 0"
                    :currentOperatingPointIndex="currentOperatingPointIndex"
                    :currentWindingIndex="currentWindingIndex"
                    :enableManual="enableManual"
                    :enableCircuitSimulatorImport="enableCircuitSimulatorImport"
                    :enableHarmonicsList="enableHarmonicsList"
                    @updatedSignal="updatedSignal"
                    @updatedWaveform="updatedWaveform"
                    @importedWaveform="importedWaveform"
                    @selectedManualOrImported="selectedManualOrImported"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
/* ============ Tokens: the Design Requirements panel language ============
   Defined here, on the step's root, so every editor and output below it
   (they are children of this component) draws from the same values. */
.op-container {
    --op-panel-1: color-mix(in srgb, var(--p-light) 45%, var(--p-dark) 55%);
    --op-panel-2: var(--p-dark);
    --op-border: rgba(var(--p-white-rgb), 0.1);
    --op-rule: rgba(var(--p-white-rgb), 0.08);
    --op-text: var(--p-white);
    --op-muted: rgba(var(--p-white-rgb), 0.76);
    --op-faint: rgba(var(--p-white-rgb), 0.64);
    --op-accent-text: color-mix(in srgb, var(--p-primary) 70%, var(--p-white) 30%);
    --op-field-border: color-mix(in srgb, var(--p-white) 45%, var(--p-light));
    --op-field-h: 1.75rem;
    --op-gutter: 1rem;

    padding: 0.5rem 0.75rem 1.5rem;
    max-width: 100%;
    width: 100%;
    color: var(--op-text);
    text-align: left;
}

.op-layout {
    display: grid;
    grid-template-columns: 16.5rem minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
}

.op-detail-column {
    min-width: 0;
}

/* ============ Operating point list ============ */
.op-panel {
    min-width: 0;
    padding: 1rem 0.75rem 0.75rem 0.85rem;
    background: linear-gradient(180deg, var(--op-panel-1) 0%, var(--op-panel-2) 100%);
    border: 1px solid var(--op-border);
    border-left: 3px solid rgba(var(--p-primary-rgb), 0.8);
    border-radius: 14px;
    box-shadow:
        0 6px 20px rgba(var(--p-black-rgb), 0.5),
        inset 0 1px 0 rgba(var(--p-white-rgb), 0.06);
}

.op-header {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0 0.25rem 0.85rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid var(--op-rule);
}

.op-header-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 650;
    letter-spacing: -0.01em;
    line-height: 1.3;
    color: var(--p-primary);
}

.op-card {
    margin: 0.15rem 0;
    padding: 0.45rem 0.5rem;
    border: 1px solid transparent;
    border-radius: 10px;
    transition: background 0.15s, border-color 0.15s;
}

.op-card.op-card-active {
    background: rgba(var(--p-primary-rgb), 0.08);
    border-color: rgba(var(--p-primary-rgb), 0.3);
}

.op-card + .op-card:not(.op-card-active) {
    border-top-color: var(--op-rule);
}

.op-card-pending {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.86rem;
    line-height: 1.35;
    color: var(--op-muted);
}

.op-card-pending-arrow {
    flex: 0 0 auto;
    font-size: 0.8rem;
    color: var(--op-accent-text);
}

.op-card-body {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

/* The operating point's name is its title: an editable field that reads
   as a heading until it is touched. */
.op-name :deep(.text-container),
.op-name :deep(.row),
.op-name :deep(.grid) {
    margin: 0 !important;
    padding: 0 !important;
}
.op-name :deep([class*="col-"]) {
    padding: 0 !important;
    margin: 0 !important;
}
.op-name :deep(input) {
    width: 100% !important;
    height: 2rem !important;
    padding: 0 0.35rem !important;
    font-size: 1rem !important;
    font-weight: 600 !important;
    color: var(--op-text) !important;
    background: transparent !important;
    border: 1px solid transparent !important;
    border-bottom: 1px dashed rgba(var(--p-white-rgb), 0.22) !important;
    border-radius: 4px 4px 0 0 !important;
    box-shadow: none !important;
}
.op-name :deep(input:hover),
.op-name :deep(input:focus) {
    border-color: rgba(var(--p-primary-rgb), 0.55) !important;
}
.op-card:not(.op-card-active) .op-name :deep(input) {
    font-weight: 500 !important;
    color: var(--op-muted) !important;
}

/* Temperature and cooling: label on the left, field on the right, one
   field height. The shared editors centre and indent; flatten them. */
.op-field {
    margin: 0 !important;
    padding: 0 !important;
}
.op-field :deep(.dim-row),
.op-field :deep(.efl-row) {
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 0.5rem !important;
    margin: 0 !important;
    padding: 0 !important;
}
.op-field :deep(.dim-label),
.op-field :deep(.efl-label) {
    flex: 0 0 5.6rem !important;
    width: 5.6rem !important;
    max-width: 5.6rem !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 0.84rem !important;
    font-weight: 500 !important;
    line-height: 1.2 !important;
    color: var(--op-muted) !important;
    text-align: left !important;
    background: transparent !important;
}
.op-field :deep(.dim-value-row),
.op-field :deep(.efl-select) {
    flex: 1 1 auto !important;
    min-width: 0 !important;
    width: auto !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
}

.op-windings-title {
    margin: 0.4rem 0 0.05rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--op-muted);
}

/* Winding rows: status marker, name, reflect, open. */
.op-winding-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    width: 100%;
    min-width: 0;
    padding: 0.1rem 0.25rem 0.1rem 0.15rem;
    border-radius: 7px;
}
.op-winding-row-current {
    background: rgba(var(--p-primary-rgb), 0.12);
}

/* Filled teal: waveforms reviewed. Orange ring: not reviewed yet (what
   blocks Continue). The text is the tooltip and the accessible name. */
.op-winding-status {
    flex: 0 0 auto;
    width: 0.62rem;
    height: 0.62rem;
    margin: 0 0.15rem;
    border-radius: 50%;
    background: var(--p-primary);
}
.op-winding-row-pending .op-winding-status {
    background: transparent;
    border: 2px solid var(--p-danger);
}

.op-winding-name {
    flex: 1 1 auto;
    min-width: 0;
}
.op-winding-name :deep(.row),
.op-winding-name :deep(.grid),
.op-winding-name :deep([class*="col-"]) {
    margin: 0 !important;
    padding: 0 !important;
}
.op-winding-name :deep(input) {
    width: 100% !important;
    height: var(--op-field-h) !important;
    padding: 0 0.35rem !important;
    font-size: 0.9rem !important;
    color: var(--op-text) !important;
    background: transparent !important;
    border: 1px solid transparent !important;
    border-radius: 5px !important;
    box-shadow: none !important;
}
.op-winding-name :deep(input:hover:not(:disabled)),
.op-winding-name :deep(input:focus) {
    border-color: rgba(var(--p-primary-rgb), 0.55) !important;
}

.op-winding-btn {
    flex: 0 0 auto;
    width: var(--op-field-h);
    height: var(--op-field-h);
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid rgba(var(--p-white-rgb), 0.2);
    border-radius: 6px;
    color: var(--op-muted);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.op-winding-btn i {
    font-size: 0.8rem;
}
.op-winding-btn:hover:not(:disabled) {
    color: var(--op-accent-text);
    border-color: rgba(var(--p-primary-rgb), 0.6);
    background: rgba(var(--p-primary-rgb), 0.1);
}
.op-winding-btn:focus-visible {
    outline: 2px solid var(--p-primary);
    outline-offset: 1px;
}
.op-winding-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}
/* The winding being edited: its open button is the "you are here" mark. */
.op-winding-row-current .op-winding-open {
    color: var(--p-dark);
    background: var(--p-primary);
    border-color: var(--p-primary);
}
.op-winding-row-pending:not(.op-winding-row-current) .op-winding-open {
    color: var(--p-danger);
    border-color: rgb(var(--p-danger-rgb) / 0.6);
}

.op-card-actions {
    display: flex;
    gap: 0.4rem;
    justify-content: flex-end;
}

/* ============ Buttons: quiet by default ============ */
.op-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    min-height: var(--op-field-h);
    padding: 0 0.6rem;
    border-radius: 7px;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    line-height: 1.15;
    cursor: pointer;
    background: transparent;
    border: 1px solid rgba(var(--p-white-rgb), 0.2);
    color: var(--op-muted);
    transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.op-btn i {
    font-size: 0.72rem;
}
.op-btn:focus-visible {
    outline: 2px solid var(--p-primary);
    outline-offset: 1px;
}
.op-btn-primary {
    color: var(--op-accent-text);
    border-color: rgba(var(--p-primary-rgb), 0.55);
}
.op-btn-primary:hover {
    background: rgba(var(--p-primary-rgb), 0.14);
}
.op-btn-danger:hover {
    color: var(--p-danger);
    border-color: rgb(var(--p-danger-rgb) / 0.6);
    background: rgb(var(--p-danger-rgb) / 0.1);
}

.op-panel-actions {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-top: 0.6rem;
    padding-top: 0.6rem;
    border-top: 1px solid var(--op-rule);
}
.op-btn-add {
    width: 100%;
    justify-content: flex-start;
    border-style: dashed;
    color: var(--op-accent-text);
    border-color: rgba(var(--p-primary-rgb), 0.5);
}
.op-btn-add:hover {
    background: rgba(var(--p-primary-rgb), 0.12);
    border-style: solid;
}
.op-btn-quiet {
    width: 100%;
    justify-content: flex-start;
    border-color: transparent;
    font-weight: 500;
}
.op-btn-quiet:hover {
    color: var(--op-text);
    background: rgba(var(--p-white-rgb), 0.05);
}

/* ============ Why Continue is blocked ============ */
.op-issues {
    margin-top: 0.6rem;
    border-radius: 8px;
    background: rgb(var(--p-danger-rgb) / 0.08);
    border: 1px solid rgb(var(--p-danger-rgb) / 0.3);
}
.op-issues-summary {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.45rem 0.6rem;
    list-style: none;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    line-height: 1.3;
    color: var(--p-danger);
}
.op-issues-summary::-webkit-details-marker {
    display: none;
}
.op-issues-summary:focus-visible {
    outline: 2px solid var(--p-danger);
    outline-offset: 1px;
    border-radius: 8px;
}
.op-issues-summary i {
    font-size: 0.8rem;
}
.op-issues-chevron {
    margin-left: auto;
    font-size: 0.65rem !important;
    transition: transform 0.15s;
}
.op-issues[open] .op-issues-chevron {
    transform: rotate(180deg);
}
.op-issues-text {
    display: block;
    margin: 0;
    padding: 0 0.6rem 0.55rem 1.85rem;
    font-size: 0.8rem;
    line-height: 1.45;
    color: var(--op-text);
    white-space: pre-line;
}

@media (prefers-reduced-motion: reduce) {
    .op-card, .op-btn, .op-winding-btn, .op-issues-chevron { transition: none; }
}

/* ============ Narrow screens: the list sits above the editor ============ */
@media (max-width: 900px) {
    .op-layout {
        grid-template-columns: minmax(0, 1fr);
    }
    .op-card-pending-arrow {
        transform: rotate(90deg);
    }
}
@media (max-width: 600px) {
    .op-container {
        padding: 0.5rem 0 1.25rem;
    }
}
</style>
