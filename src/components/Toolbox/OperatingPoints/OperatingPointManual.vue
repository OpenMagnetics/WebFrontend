<script setup>
import { useMasStore } from '../../../stores/mas'
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
    emits: ["updatedSignal", "updatedWaveform", "clearMode"],
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
    },
    methods: {
        updatedWaveform(signalDescriptor) {
            this.$emit('updatedWaveform', signalDescriptor);
            this.$emit('updatedSignal');
        },
        induce(sourceSignalDescriptor){
            if (sourceSignalDescriptor == 'current'){

                this.$mkf.ready.then(_ => {
                    var magnetizingInductance = this.$mkf.resolve_dimension_with_tolerance(JSON.stringify(this.masStore.mas.inputs.designRequirements.magnetizingInductance));
                    var voltage = JSON.parse(this.$mkf.calculate_induced_voltage(JSON.stringify(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex]), magnetizingInductance));

                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.waveform = voltage.waveform;
                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.harmonics = voltage.harmonics;
                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.processed = voltage.processed;
                    this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed('voltage');
                    this.masStore.updatedInputExcitationProcessed('voltage');
                });
            }
            else if (sourceSignalDescriptor == 'voltage'){

                this.$mkf.ready.then(_ => {
                    var magnetizingInductance = this.$mkf.resolve_dimension_with_tolerance(JSON.stringify(this.masStore.mas.inputs.designRequirements.magnetizingInductance));
                    var current = JSON.parse(this.$mkf.calculate_induced_current(JSON.stringify(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex]), magnetizingInductance));

                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.waveform = current.waveform;
                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.harmonics = current.harmonics;
                    this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.processed = current.processed;
                    this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed('current');
                    this.masStore.updatedInputExcitationProcessed('current');
                });
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
    <div class="container">
        <div class="row" v-tooltip="styleTooltip">
            <div v-if="masStore.mas.inputs.operatingPoints.length > currentOperatingPointIndex" class="col-lg-4 col-md-12" style="max-width: 360px;">

                <label
                    :style="combinedStyle([$styleStore.operatingPoints.inputTitleFontSize, $styleStore.operatingPoints.commonParameterTextColor])"
                    data-cy="dataTestLabel + '-current-title'"
                    class="fs-4 mx-0 p-0 mb-4"
                >
                    {{masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].name + ' - ' + masStore.mas.magnetic.coil.functionalDescription[currentWindingIndex].name}}
                </label>
                {{masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[2].voltage.processed.label}}
                <WaveformInputCommon
                    :style="$styleStore.operatingPoints.main"
                    class="scrollable-column border-bottom border-top rounded-4 border-2"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :defaultValue="defaultOperatingPointExcitation"
                    :dataTestLabel="dataTestLabel + '-selected'"
                    @updatedSwitchingFrequency="masStore.updatedInputExcitationProcessed()"
                    @updatedDutyCycle="masStore.updatedInputExcitationProcessed()"
                />

                <WaveformInput 
                    :style="$styleStore.operatingPoints.main"

                    v-if="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current != null && masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.processed.label != 'Custom'" class="scrollable-column mt-5 border-bottom border-top rounded-4 border-2"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :defaultValue="defaultOperatingPointExcitation"
                    :dataTestLabel="dataTestLabel + '-selected-current'"
                    :signalDescriptor="'current'"
                    @peakToPeakChanged="masStore.updatedInputExcitationProcessed('current')"
                    @offsetChanged="masStore.updatedInputExcitationProcessed('current')"
                    @labelChanged="masStore.updatedInputExcitationProcessed('current')"
                    @induce="induce('voltage')"
                />
                <WaveformInputCustom
                    v-else class="scrollable-column mt-5 border-bottom border-top rounded-4 border-2"
                    :style="$styleStore.operatingPoints.main"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :defaultValue="defaultOperatingPointExcitation"
                    :dataTestLabel="dataTestLabel + '-selected-current'"
                    :signalDescriptor="'current'"
                    @labelChanged="masStore.updatedInputExcitationProcessed('current')"
                    @updatedTime="masStore.updatedInputExcitationWaveformUpdatedFromProcessed('current')"
                    @updatedData="masStore.updatedInputExcitationWaveformUpdatedFromProcessed('current')"
                    @induce="induce('voltage')"
                />
                <WaveformInput
                    v-if="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].voltage.processed.label != 'Custom'" 
                    class="scrollable-column mt-5 border-bottom border-top rounded-4 border-2"
                    :style="$styleStore.operatingPoints.main"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :defaultValue="defaultOperatingPointExcitation"
                    :dataTestLabel="dataTestLabel + '-selected-voltage'"
                    :signalDescriptor="'voltage'"
                    @peakToPeakChanged="masStore.updatedInputExcitationProcessed('voltage')"
                    @offsetChanged="masStore.updatedInputExcitationProcessed('voltage')"
                    @labelChanged="masStore.updatedInputExcitationProcessed('voltage')"
                    @induce="induce('current')"
                />
                <WaveformInputCustom
                    v-else
                    class="scrollable-column mt-5 border-bottom border-top rounded-4 border-2"
                    :style="$styleStore.operatingPoints.main"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :defaultValue="defaultOperatingPointExcitation"
                    :dataTestLabel="dataTestLabel + '-selected-voltage'"
                    :signalDescriptor="'voltage'"
                    @labelChanged="masStore.updatedInputExcitationProcessed('voltage')"
                    @updatedTime="masStore.updatedInputExcitationWaveformUpdatedFromProcessed('voltage')"
                    @updatedData="masStore.updatedInputExcitationWaveformUpdatedFromProcessed('voltage')"
                    @induce="induce('current')"
                />
                <button
                    :style="$styleStore.operatingPoints.goBackSelectingButton"
                    :data-cy="dataTestLabel + '-import-button'"
                    class="btn btn-success fs-5 col-sm-12 col-md-12 mt-5 p-0"
                    style="max-height: 2em"
                    @click="clearMode"
                >
                    {{'Go back to selecting mode'}}
                </button>
            </div>
            <div class="col-lg-8 col-md-12 row m-0 p-0" style="max-width: 800px;">
                <WaveformGraph class=" col-12 py-2"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformGraph'"
                    @updatedWaveform="updatedWaveform"
                />
                <WaveformFourier class="col-12 mt-1" style="max-height: 150px;"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformFourier'"
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
</template>
