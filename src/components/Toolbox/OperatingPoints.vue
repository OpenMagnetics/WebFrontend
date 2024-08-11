<script setup>
import { useMasStore } from '/src/stores/mas'
import WaveformGraph from '/src/components/Toolbox/OperatingPoints/WaveformGraph.vue'
import WaveformFourier from '/src/components/Toolbox/OperatingPoints/WaveformFourier.vue'
import WaveformInputCustom from '/src/components/Toolbox/OperatingPoints/WaveformInputCustom.vue'
import WaveformInput from '/src/components/Toolbox/OperatingPoints/WaveformInput.vue'
import WaveformInputCommon from '/src/components/Toolbox/OperatingPoints/WaveformInputCommon.vue'
import WaveformOutput from '/src/components/Toolbox/OperatingPoints/WaveformOutput.vue'
import WaveformCombinedOutput from '/src/components/Toolbox/OperatingPoints/WaveformCombinedOutput.vue'
import OperatingPoint from '/src/components/Toolbox/OperatingPoints/OperatingPoint.vue'
import { tryGuessType, roundWithDecimals, deepCopy } from '/src/assets/js/utils.js'

import { defaultOperatingPointExcitation, defaultPrecision, defaultSinusoidalNumberPoints } from '/src/assets/js/defaults.js'
import { tooltipsMagneticSynthesisOperatingPoints } from '/src/assets/js/texts.js'

</script>
<script>

export default {
    emits: ["canContinue", "changeTool"],
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const masStore = useMasStore();
        const currentOperatingPointIndex = 0;
        const currentWindingIndex = 0;
        const errorMessages = "";


        masStore.initializeOperatingPoints();
        // if (masStore.mas.inputs.operatingPoints.length == 0) {
        //     masStore.mas.inputs.operatingPoints.push(
        //         {
        //             name: "Operating Point No. 1",
        //             conditions: {ambientTemperature: 42},
        //             excitationsPerWinding: [deepCopy(defaultOperatingPointExcitation)]
        //         }
        //     );
        // }

        return {
            masStore,
            currentOperatingPointIndex,
            currentWindingIndex,
            errorMessages,
        }
    },
    computed: {
        styleTooltip() {
            var relative_placement;
            relative_placement = 'right'
            return {
                theme: {
                    placement: relative_placement,
                    "text-align": "start",
                },
            }
        },
        canContinue() {
            var allSet = true;

            this.errorMessages = "";
            for (var operatingPointIndex = 0; operatingPointIndex < this.masStore.mas.inputs.operatingPoints.length; operatingPointIndex++) {
                if (!this.masStore.magneticManualOperatingPoints[operatingPointIndex] && !this.masStore.magneticCircuitSimulatorOperatingPoints[operatingPointIndex]) {
                    allSet = false;
                }
                console.log("this.masStore.magneticManualOperatingPoints[operatingPointIndex]")
                console.log(this.masStore.magneticManualOperatingPoints[operatingPointIndex])
                console.log("this.masStore.magneticCircuitSimulatorOperatingPoints[operatingPointIndex]")
                console.log(this.masStore.magneticCircuitSimulatorOperatingPoints[operatingPointIndex])
                if (this.masStore.mas.inputs.operatingPoints[operatingPointIndex] == null) {
                    allSet = false;
                    this.errorMessages += "Operating point with index " + operatingPointIndex + " is totally empty.\n"
                }
                if (this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding == null) {
                    allSet = false;
                    this.errorMessages += "Operating point " + this.masStore.mas.inputs.operatingPoints[operatingPointIndex].name + " has no windings defined.\n"
                }

                for (var windingIndex = 0; windingIndex < this.masStore.mas.magnetic.coil.functionalDescription.length; windingIndex++) {
                        if (this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex] == null) {
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
                this.modelValue.voltage.processed = deepCopy(defaultOperatingPointExcitation.voltage.processed)
            }
        }
        this.$emit("canContinue", this.canContinue);

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
            this.masStore.addNewOperatingPoint(this.currentOperatingPointIndex);
            this.currentOperatingPointIndex += 1;
            this.$emit("canContinue", this.canContinue);
        },
        removePoint(index) {
            if (index < this.currentOperatingPointIndex) {
                this.currentOperatingPointIndex -= 1;
            }
            this.masStore.removeOperatingPoint(index);
            this.$emit("canContinue", this.canContinue);
        },
        importedWaveform() {
            this.$emit("canContinue", this.canContinue);
        },
        selectedManualOrImported() {
            this.$emit("canContinue", this.canContinue);
        },
        changeWinding(windingIndex) {

            if (this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[windingIndex] == null) {
                this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[windingIndex] = deepCopy(defaultOperatingPointExcitation);
            }
            var tempExcitation = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[windingIndex];
            this.currentWindingIndex = windingIndex;
            this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[windingIndex] = tempExcitation;
            // this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed('current');
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
    }
}
</script>

<template>
    <div class="container">
        <div class="row" v-tooltip="styleTooltip">
            <div class="col-sm-12 col-md-2 text-start border border-primary m-0 px-1">
                <div class="col-12 row m-0 p-0 border-bottom border-top rounded-4 border-4 mb-5 pb-2 pt-2 mt-2 bg-light" :style="operatingPointIndex == currentOperatingPointIndex? 'opacity: 1;' : 'opacity: 0.65;'"  v-for="operatingPoint, operatingPointIndex in masStore.mas.inputs.operatingPoints">
                    <input :data-cy="dataTestLabel + '-operating-point-' + operatingPointIndex + '-name-input'" type="text" class="m-0 px-0 col-12 bg-dark text-white" 
                        v-model="masStore.mas.inputs.operatingPoints[operatingPointIndex].name"
                        placeholder="My operating point"/>
                    <div v-if="currentOperatingPointIndex == operatingPointIndex" class="col-12 row m-0 p-0" v-for="winding, windingIndex in masStore.mas.magnetic.coil.functionalDescription">
                        <input :data-cy="dataTestLabel + '-operating-point-' + operatingPointIndex + '-winding-' + windingIndex + '-name-input'" class="rounded-2 fs-5 ms-2 bg-light text-white col-7 p-0 mb-2 border-0" v-model="winding.name">
                        <button :data-cy="dataTestLabel + '-operating-point-' + operatingPointIndex + '-winding-' + windingIndex + '-reflect-button'" v-if="masStore.mas.magnetic.coil.functionalDescription.length == 2 && masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[(windingIndex + 1) % 2] != null" v-tooltip="tooltipsMagneticSynthesisOperatingPoints[(windingIndex == 0? 'reflectPrimary' : 'reflectSecondaries')]" class="btn btn-secondary fs-6 col-2 mt-2 p-0" style="max-height: 1.7em" @click="reflectWinding(windingIndex)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-symmetry-vertical" viewBox="0 0 16 16">
                                <path d="M7 2.5a.5.5 0 0 0-.939-.24l-6 11A.5.5 0 0 0 .5 14h6a.5.5 0 0 0 .5-.5v-11zm2.376-.484a.5.5 0 0 1 .563.245l6 11A.5.5 0 0 1 15.5 14h-6a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .376-.484zM10 4.46V13h4.658L10 4.46z"/>
                            </svg>
                        </button>
                        <div v-if="!(masStore.mas.magnetic.coil.functionalDescription.length == 2 && masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[(windingIndex + 1) % 2] != null)" class="fs-6 col-2 mt-2 p-0" style="max-height: 1.7em">
                        </div>
                        <button :data-cy="dataTestLabel + '-operating-point-' + operatingPointIndex + '-winding-' + windingIndex + '-select-button'" v-tooltip="tooltipsMagneticSynthesisOperatingPoints['editWindingWaveform']" class="btn fs-6 col-2 mt-2 p-0 ms-1" :class="currentWindingIndex == windingIndex? 'btn-success disabled' : masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex] != null? 'btn-primary' : 'btn-danger'" @click="changeWinding(windingIndex)" style="max-height: 1.7em;">
                            <svg v-if="currentWindingIndex == windingIndex" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill" viewBox="0 0 16 16">
                                <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                                <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                            </svg>
                            <svg v-else v-if="masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex] != null" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
                                <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                                <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
                            </svg>
                            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-earmark-plus-fill" viewBox="0 0 16 16">
                                <path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0zM9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1zM8.5 7v1.5H10a.5.5 0 0 1 0 1H8.5V11a.5.5 0 0 1-1 0V9.5H6a.5.5 0 0 1 0-1h1.5V7a.5.5 0 0 1 1 0z"/>
                            </svg>
                        </button>
                    </div>
                    <div v-else class="col-12 row m-0 p-0">
                        <button :data-cy="dataTestLabel + '-remove-operating-point-' + operatingPointIndex + '-button'" class="btn btn-danger fs-6 col-6 mt-2" @click="removePoint(operatingPointIndex)">Remove </button>
                        <button :data-cy="dataTestLabel + '-select-operating-point-' + operatingPointIndex + '-button'" class="btn btn-primary fs-6 col-6 mt-2" @click="currentOperatingPointIndex = operatingPointIndex">Select </button>
                    </div>
                </div>
                <button :data-cy="dataTestLabel + '-add-operating-point-button'" class="btn btn-secondary col-12 mt-2" @click="addNewOperatingPoint">Add New OP </button>
                <button :data-cy="dataTestLabel + '-modify-number-windings-button'" class="btn btn-secondary col-12 mt-2" @click="$emit('changeTool', 'designRequirements')">Modify No. Windings</button>

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
                            @updatedWaveform="updatedWaveform"
                            @importedWaveform="importedWaveform"
                            @selectedManualOrImported="selectedManualOrImported"
                        />
                    </div>
                </div>

            </div>
        </div>
    </div>
</template>
