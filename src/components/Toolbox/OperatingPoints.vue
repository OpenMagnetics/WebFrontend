<script setup>
import { useMasStore } from '/src/stores/mas'
import OperatingPoint from '/src/components/Toolbox/OperatingPoints/OperatingPoint.vue'
import { roundWithDecimals, deepCopy, combinedStyle } from '/WebSharedComponents/assets/js/utils.js'

import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import { defaultOperatingPointExcitation, defaultPrecision, defaultSinusoidalNumberPoints, minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
import { tooltipsMagneticSynthesisOperatingPoints } from '/WebSharedComponents/assets/js/texts.js'

import Text from '/WebSharedComponents/DataInput/Text.vue'


</script>
<script>

export default {
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
        enableAcSweep: {
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
        const currentOperatingPointIndex = 0;
        const currentWindingIndex = 0;
        const errorMessages = "";
        const localData = {
            ambientTemperature: 25
        };

        this.$stateStore.initializeOperatingPoints();


// masStore.mas.inputs.operatingPoints[operatingPointIndex].conditions
        return {
            masStore,
            currentOperatingPointIndex,
            currentWindingIndex,
            errorMessages,
            localData,
        }
    },
    computed: {
        excitationSelectorDisabled() {
            return this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] !== this.$stateStore.OperatingPointsMode.Manual && this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] !== this.$stateStore.OperatingPointsMode.CircuitSimulatorImport && this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] !== this.$stateStore.OperatingPointsMode.HarmonicsList;
        },
        styleTooltip() {
            var relativePlacement;
            relativePlacement = 'right'
            return {
                theme: {
                    placement: relativePlacement,
                    "text-align": "start",
                },
            }
        },
        canContinue() {
            var allSet = true;

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
                    if (this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex] == null || 
                        this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].current == null || 
                        this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].current.waveform == null || 
                        this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].current.processed == null || 
                        this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].current.harmonics == null || 
                        this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].voltage == null || 
                        this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].voltage.waveform == null || 
                        this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].voltage.processed == null || 
                        this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].voltage.harmonics == null) {
                        this.errorMessages += "Missing waveforms for winding " + this.masStore.mas.magnetic.coil.functionalDescription[windingIndex].name + " in operating point " + this.masStore.mas.inputs.operatingPoints[operatingPointIndex].name + ".\n"
                        allSet = false;
                    }
                }
            }
            return allSet;
        }
    },
    watch: { 
    },
    created () {

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
        this.$emit("canContinue", this.canContinue);

        if (!this.canContinue) {
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
                    this.convertFromProcessedToWaveform(operatingPointIndex, windingIndex, "current");
                    this.convertFromProcessedToWaveform(operatingPointIndex, windingIndex, "voltage");
                }
            }
            if (action.name == "updatedInputExcitationWaveformUpdatedFromGraph") {
                const signalDescriptor = action.args[0];
            }

            this.$emit("canContinue", this.canContinue);
        })
    },
    methods: {
        updatedWaveform(signalDescriptor) {

            this.convertFromWaveformToProcessed(this.currentOperatingPointIndex, this.currentWindingIndex, signalDescriptor);
        },
        convertFromProcessedToWaveform(operatingPointIndex, windingIndex, signalDescriptor) {
            var processed = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].processed;
            var frequency = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].frequency;

            this.$mkf.ready.then(_ => {
                if (processed.label != "Custom") {
                    var waveform = JSON.parse(this.$mkf.create_waveform(JSON.stringify(processed), frequency));

                    if (waveform.data.length > 0) {
                        this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].waveform = waveform;
                        this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed(signalDescriptor);
                    }
                }
                else {
                    var waveform = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].waveform;
                    var scaledWaveform = JSON.parse(this.$mkf.scale_waveform_time_to_frequency(JSON.stringify(waveform), frequency));
                    this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].waveform = scaledWaveform;
                    this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed(signalDescriptor);
                }
            });

        },
        convertFromWaveformToProcessed(operatingPointIndex, windingIndex, signalDescriptor) {
            var waveform = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].waveform;

                        console.time('Execution Time');
            this.$mkf.ready.then(_ => {
                        console.timeEnd('Execution Time');
                var processed = JSON.parse(this.$mkf.calculate_basic_processed_data(JSON.stringify(waveform)));

                this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].processed = processed;
                this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].current.processed.dutyCycle = processed.dutyCycle;
                this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].voltage.processed.dutyCycle = processed.dutyCycle;
                if (signalDescriptor == 'voltage'){
                    this.convertFromProcessedToWaveform(operatingPointIndex, windingIndex, "current");
                }
            });
        },
        addNewOperatingPoint() {
            this.$stateStore.addNewOperatingPoint(this.currentOperatingPointIndex, this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex]);

            this.currentOperatingPointIndex += 1;
            this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] = this.defaultMode;
            this.$emit("canContinue", this.canContinue);
        },
        removePoint(index) {
            if (index < this.currentOperatingPointIndex) {
                this.currentOperatingPointIndex -= 1;
            }
            this.$stateStore.removeOperatingPoint(index);
            this.$emit("canContinue", this.canContinue);
        },
        importedWaveform() {
            this.$emit("canContinue", this.canContinue);
        },
        selectedManualOrImported() {
            setTimeout(() => {
                this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed('current');
            }, 100);
            this.$emit("canContinue", this.canContinue);
        },
        selectedAcSweepTypeSelected() {
            this.$emit("canContinue", true);
            this.$emit('changeTool', 'toolSelector')
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
            this.$emit("canContinue", this.canContinue);
        },
        reflectWinding(windingIndexToBeReflected){
            this.$mkf.ready.then(_ => {
                // Reflection only allowed with two windings
                var turnRatio = this.$mkf.resolve_dimension_with_tolerance(JSON.stringify(this.masStore.mas.inputs.designRequirements.turnsRatios[0]));  
                if (windingIndexToBeReflected == 0) {
                    var primaryExcitation = JSON.parse(this.$mkf.calculate_reflected_primary(JSON.stringify(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[1]), turnRatio));
                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[0] = primaryExcitation;
                }
                else {
                    var secondaryExcitation = JSON.parse(this.$mkf.calculate_reflected_secondary(JSON.stringify(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[0]), turnRatio));
                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[1] = secondaryExcitation;
                }
                this.$emit("canContinue", this.canContinue);
            });
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
    }
}
</script>

<template>
    <div class="container">
        <div class="row" v-tooltip="styleTooltip" :style="$styleStore.operatingPoints.main">
            <div class="col-sm-12 col-md-2 text-start border m-0 px-1" :style="$styleStore.operatingPoints.main">
                <div class="col-12 row m-0 p-0 px-1 border-bottom border-top rounded-4 border-4 mb-5 pb-2 pt-2 mt-2" :style="combinedStyle([$styleStore.operatingPoints.operatingPointBgColor, operatingPointIndex == currentOperatingPointIndex? 'opacity: 1;' : 'opacity: 0.65;'])"  v-for="operatingPoint, operatingPointIndex in masStore.mas.inputs.operatingPoints">
                    <Text
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
                    <Dimension class="ps-3"
                        :name="'ambientTemperature'"
                        :replaceTitle="'Temp.'"
                        unit="°C"
                        :dataTestLabel="dataTestLabel + '-ConditionsAmbientTemperature'"
                        :min="minimumMaximumScalePerParameter['temperature']['min']"
                        :max="minimumMaximumScalePerParameter['temperature']['max']"
                        :defaultValue="25"
                        v-model="masStore.mas.inputs.operatingPoints[operatingPointIndex].conditions"
                        :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                        :labelFontSize="$styleStore.operatingPoints.inputFontSize"
                        :labelBgColor="$styleStore.operatingPoints.inputValueBgColor"
                        :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                        :textColor="$styleStore.operatingPoints.inputTextColor"
                    />
                    <div
                        v-if="currentOperatingPointIndex == operatingPointIndex"
                        class="col-12 row m-0 p-0 py-1 border-top"
                        v-for="winding, windingIndex in masStore.mas.magnetic.coil.functionalDescription"
                        >
                        <Text
                            :disabled="excitationSelectorDisabled"
                            class="rounded-2 col-7 p-0 px-3 "
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
                            :style="$styleStore.operatingPoints.reflectWindingButton"
                            class="btn col-2 p-0"
                            :disabled="excitationSelectorDisabled"
                            :data-cy="dataTestLabel + '-operating-point-' + operatingPointIndex + '-winding-' + windingIndex + '-reflect-button'"
                            v-if="masStore.mas.magnetic.coil.functionalDescription.length == 2 && masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[(windingIndex + 1) % 2] != null"
                            style="max-height: 1.7em"
                            @click="reflectWinding(windingIndex)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-symmetry-vertical" viewBox="0 0 16 16">
                                <path d="M7 2.5a.5.5 0 0 0-.939-.24l-6 11A.5.5 0 0 0 .5 14h6a.5.5 0 0 0 .5-.5v-11zm2.376-.484a.5.5 0 0 1 .563.245l6 11A.5.5 0 0 1 15.5 14h-6a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .376-.484zM10 4.46V13h4.658L10 4.46z"/>
                            </svg>
                        </button>
                        <div v-if="!(masStore.mas.magnetic.coil.functionalDescription.length == 2 && masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[(windingIndex + 1) % 2] != null)" class="fs-6 col-2 p-0" style="max-height: 1.7em">
                        </div>
                        <button
                            v-tooltip="tooltipsMagneticSynthesisOperatingPoints['editWindingWaveform']"
                            :disabled="excitationSelectorDisabled"
                            :data-cy="dataTestLabel + '-operating-point-' + operatingPointIndex + '-winding-' + windingIndex + '-select-button'"
                            :style="currentWindingIndex == windingIndex? $styleStore.operatingPoints.selectedWindingButton : isExcitationProcessed(operatingPointIndex, windingIndex)? $styleStore.operatingPoints.unselectedProcessedWindingButton : $styleStore.operatingPoints.unselectedUnprocessedWindingButton"
                            class="btn col-2 p-0 ms-1"
                            :class="currentWindingIndex == windingIndex? 'disabled' : ''"
                            @click="changeWinding(windingIndex)"
                            style="max-height: 1.7em;"
                        >
                            <svg v-if="currentWindingIndex == windingIndex" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill" viewBox="0 0 16 16">
                                <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                                <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                            </svg>
                            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-earmark-plus-fill" viewBox="0 0 16 16">
                                <path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0zM9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1zM8.5 7v1.5H10a.5.5 0 0 1 0 1H8.5V11a.5.5 0 0 1-1 0V9.5H6a.5.5 0 0 1 0-1h1.5V7a.5.5 0 0 1 1 0z"/>
                            </svg>
                        </button>
                    </div>
                    <div v-else class="col-12 row m-0 p-0">
                        <button
                            :data-cy="dataTestLabel + '-remove-operating-point-' + operatingPointIndex + '-button'"
                            :style="$styleStore.operatingPoints.removeOperatingPointButton"
                            class="btn col-6 mt-2"
                            @click="removePoint(operatingPointIndex)"
                        >
                            Remove
                        </button>
                        <button
                            :data-cy="dataTestLabel + '-select-operating-point-' + operatingPointIndex + '-button'"
                            :style="$styleStore.operatingPoints.selectOperatingPointButton"
                            class="btn col-6 mt-2"
                            @click="currentOperatingPointIndex = operatingPointIndex"
                        >
                            Select
                        </button>
                    </div>
                </div>
                <button
                    :data-cy="dataTestLabel + '-add-operating-point-button'"
                    :style="$styleStore.operatingPoints.addOperatingPointButton"
                    class="btn col-12 mt-2"
                    @click="addNewOperatingPoint"
                >
                    Add New OP 
                </button>
                <button
                    :data-cy="dataTestLabel + '-modify-number-windings-button'"
                    :style="$styleStore.operatingPoints.modifyNumberWindingsButton"
                    class="btn col-12 mt-2"
                    @click="$emit('changeTool', 'designRequirements')"
                >
                    Modify No. Windings
                </button>

                <div class="col-12">
                    <label :data-cy="dataTestLabel + '-error-text'" class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
                </div>

            </div>
            <div v-if="masStore.mas.inputs.operatingPoints.length > 0" class="col-sm-12 col-md-10 text-start pe-0 ">
                <div v-if="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding.length > 0" class="container mx-auto">
                    <div class="row">
                        <OperatingPoint 
                            :currentOperatingPointIndex="currentOperatingPointIndex"
                            :currentWindingIndex="currentWindingIndex"
                            :enableManual="enableManual"
                            :enableCircuitSimulatorImport="enableCircuitSimulatorImport"
                            :enableAcSweep="enableAcSweep"
                            :enableHarmonicsList="enableHarmonicsList"
                            @updatedWaveform="updatedWaveform"
                            @importedWaveform="importedWaveform"
                            @selectedManualOrImported="selectedManualOrImported"
                            @selectedAcSweepTypeSelected="selectedAcSweepTypeSelected"
                        />
                    </div>
                </div>

            </div>
        </div>
    </div>
</template>
