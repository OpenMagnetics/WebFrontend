<script setup>
import { useMasStore } from '/src/stores/mas'
import WaveformInputHarmonic from '/src/components/Toolbox/OperatingPoints/Input/WaveformInputHarmonic.vue'
import WaveformGraph from '/src/components/Toolbox/OperatingPoints/Output/WaveformGraph.vue'
import WaveformFourier from '/src/components/Toolbox/OperatingPoints/Output/WaveformFourier.vue'
import WaveformOutput from '/src/components/Toolbox/OperatingPoints/Output/WaveformOutput.vue'
import WaveformCombinedOutput from '/src/components/Toolbox/OperatingPoints/Output/WaveformCombinedOutput.vue'
import { roundWithDecimals, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'


import { defaultOperatingPointExcitation, defaultPrecision, defaultSinusoidalNumberPoints } from '/WebSharedComponents/assets/js/defaults.js'
import { tooltipsMagneticSynthesisOperatingPoints } from '/WebSharedComponents/assets/js/texts.js'

</script>
<script>

export default {
    emits: [],
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

        masStore.mas.inputs.operatingPoints.forEach((_, operatingPointIndex) => {
            masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding.forEach((elem, windingIndex) => {
                if (elem.current.harmonics == null) {
                    masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].current.harmonics = {
                        amplitudes: [42, 69],
                        frequencies: [420000, 690000],
                    }
                } 
            })
        })


        return {
            masStore,
            errorMessages: "",
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
    },
    methods: {
        onFrequencyChanged() {
            console.log(onFrequencyChanged)
        },
        onAmplitudeChanged() {
            console.log(onAmplitudeChanged)
        },
    }
}
</script>

<template>
    <div class="container">
        <div class="row" v-tooltip="styleTooltip">
            <div class="col-lg-4 col-md-12" style="max-width: 360px;">

                <label :data-cy="dataTestLabel + '-current-title'" class="fs-4 text-primary mx-0 p-0 mb-4">{{masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].name + ' - ' + masStore.mas.magnetic.coil.functionalDescription[currentWindingIndex].name}}</label>


                <label :data-cy="dataTestLabel + '-current-title'" class="fs-5 text-white mx-0 p-0 mb-4">Current harmonics</label>
                <div v-for="index in masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.harmonics.amplitudes.length" :key="index">

                    <WaveformInputHarmonic class="col-7 mb-1 text-start"
                        :dataTestLabel="dataTestLabel + '-Harmonic-' + (index - 1)"
                        :index="index - 1"
                        :unit="'A'"
                        :title="'Current'"
                        :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.harmonics"
                        @onFrequencyChanged="onFrequencyChanged"
                        @onAmplitudeChanged="onAmplitudeChanged"
                    />
                </div>
                <div v-if='errorMessages != ""' class="col-12">
                    <label :data-cy="dataTestLabel + '-error-text'" class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
                </div>
                <button :data-cy="dataTestLabel + '-import-button'" class="btn btn-success fs-5 col-sm-12 col-md-12 mt-3 p-0" style="max-height: 2em" @click="setImportMode">Go back to importing files
                </button>
            </div>
            <div v-if="$stateStore.operatingPointsCircuitSimulator.confirmedColumns[currentOperatingPointIndex][currentWindingIndex]" class="col-lg-8 col-md-12 row m-0 p-0" style="max-width: 800px;">
                <WaveformGraph class=" col-12 py-2"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformGraph'"
                    :enableDrag="false"
                />
                <WaveformFourier class="col-12 mt-1" style="max-height: 150px;"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformFourier'"
                />

                <WaveformOutput class="col-lg-6 col-md-6 m-0 px-2"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformOutput-current'"
                    :signalDescriptor="'current'"
                />
                <WaveformOutput class="col-lg-6 col-md-6 m-0 px-2"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                    :dataTestLabel="dataTestLabel + '-WaveformOutput-voltage'"
                    :signalDescriptor="'voltage'"
                />
                <WaveformCombinedOutput class="col-12 m-0 px-2 border-top"
                    :dataTestLabel="dataTestLabel + '-WaveformCombinedOutput'"
                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                />
                <button :data-cy="dataTestLabel + '-reset-button'" class="btn btn-danger fs-6 offset-md-10 col-sm-12 col-md-2  mt-2 p-0" style="max-height: 2em" @click="resetCurrentExcitation"> Reset Point
                </button>
            </div>
        </div>
    </div>
</template>
