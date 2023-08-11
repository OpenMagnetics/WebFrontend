<script setup>
import { useMasStore } from '/src/stores/mas'
import WaveformGraph from '/src/components/Synthesis/OperatingPoints/WaveformGraph.vue'
import WaveformFourier from '/src/components/Synthesis/OperatingPoints/WaveformFourier.vue'
import WaveformInputCustom from '/src/components/Synthesis/OperatingPoints/WaveformInputCustom.vue'
import WaveformInput from '/src/components/Synthesis/OperatingPoints/WaveformInput.vue'
import WaveformInputCommon from '/src/components/Synthesis/OperatingPoints/WaveformInputCommon.vue'
import WaveformOutput from '/src/components/Synthesis/OperatingPoints/WaveformOutput.vue'
import WaveformCombinedOutput from '/src/components/Synthesis/OperatingPoints/WaveformCombinedOutput.vue'
import { tryGuessType, roundWithDecimals } from '/src/assets/js/utils.js'

import { defaultOperatingPointExcitation, defaultPrecision, defaultSinusoidalNumberPoints } from '/src/assets/js/defaults.js'

</script>
<script>
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        console.log(defaultOperatingPointExcitation)
        const masStore = useMasStore();
        const currentOperatingPointIndex = 0;
        const currentWindingIndex = 0;

        console.log(masStore.mas.inputs)

        if (masStore.mas.inputs.operatingPoints.length == 0) {
            masStore.mas.inputs.operatingPoints.push({excitationsPerWinding: [defaultOperatingPointExcitation]});
        }

        return {
            masStore,
            currentOperatingPointIndex,
            currentWindingIndex,
        }
    },
    computed: {
    },
    watch: { 
    },
    mounted () {
        if (this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.processed == null || Object.keys(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.processed).length === 0){
            this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.processed = defaultOperatingPointExcitation.current.processed
        }
        if (this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.processed == null || Object.keys(this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.processed).length === 0){
            this.modelValue.voltage.processed = defaultOperatingPointExcitation.voltage.processed
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
        })
    },
    methods: {
        updatedWaveform(signalDescriptor) {
            this.convertFromWaveformToProcessed(this.currentOperatingPointIndex, this.currentWindingIndex, signalDescriptor);
        },
        convertFromProcessedToWaveform(operatingPointIndex, windingIndex, signalDescriptor) {
            var processed = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].processed;
            var waveform = {
                    data: [],
                    time: []
                }
            const period = 1.0 / this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].frequency;

            var max = 0;
            var min = 0;
            var dc = 0;
            switch (processed.label) {
                case "Triangular":
                    waveform = {
                        data: [-processed.peakToPeak / 2 + processed.offset, processed.peakToPeak / 2 + processed.offset, -processed.peakToPeak / 2 + processed.offset],
                        time: [0., processed.dutyCycle * period, period],
                    }
                    break;
                case "Rectangular":
                    max = processed.peakToPeak * (1 - processed.dutyCycle);
                    min = -processed.peakToPeak * processed.dutyCycle;
                    dc = processed.dutyCycle * period;
                    waveform = {
                        data: [max, max, min, min, max],
                        time: [0, dc, dc, period, period],
                    }
                    break;
                case "Bipolar Rectangular":
                    max = +processed.peakToPeak / 2;
                    min = -processed.peakToPeak / 2;
                    dc = Math.min(processed.dutyCycle, 0.5) * period;
                    waveform = {
                        data: [0, 0, max, max, 0, 0, min, min, 0, 0],
                        time: [0,
                               0.25 * period - dc / 2,
                               0.25 * period - dc / 2,
                               0.25 * period + dc / 2,
                               0.25 * period + dc / 2,
                               0.75 * period - dc / 2,
                               0.75 * period - dc / 2,
                               0.75 * period + dc / 2,
                               0.75 * period + dc / 2,
                               period]
                        }
                    break;
                case "Sinusoidal":
                    max = +processed.peakToPeak / 2;
                    min = -processed.peakToPeak / 2;
                    dc = Math.min(processed.dutyCycle, 0.5) * period;
                    waveform = {
                        data: [],
                        time: []
                    }
                    const aux = []
                    for(var i = 0; i <= defaultSinusoidalNumberPoints; i++) {
                        const x = i * 2 * Math.PI / defaultSinusoidalNumberPoints;
                        waveform.time.push(i * period / defaultSinusoidalNumberPoints);
                        waveform.data.push((Math.sin(x) * processed.peakToPeak / 2) + Number(processed.offset));
                    }
                    break;
                case "Custom":
                    waveform = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].waveform;
                    break;
            }
            this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].waveform = waveform;
            this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed(signalDescriptor);
        },
        convertFromWaveformToProcessed(operatingPointIndex, windingIndex, signalDescriptor) {
            var label = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].processed.label;
            var waveform = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].waveform;
            var processed = {label: label};
            switch (label) {
                case "Triangular":
                    processed.peakToPeak = roundWithDecimals(Math.abs(waveform.data[1] - waveform.data[0]), Math.pow(10, defaultPrecision));
                    processed.offset = roundWithDecimals((waveform.data[0] + waveform.data[1]) / 2, Math.pow(10, defaultPrecision));
                    processed.dutyCycle = roundWithDecimals((waveform.time[1] - waveform.time[0]) / (waveform.time[2] - waveform.time[0]), Math.pow(10, defaultPrecision)) ;
                    break;
                case "Rectangular":
                    processed.peakToPeak = roundWithDecimals(Math.max.apply(null, waveform.data) - Math.min.apply(null, waveform.data), Math.pow(10, defaultPrecision));
                    processed.offset = 0;
                    processed.dutyCycle = roundWithDecimals((waveform.time[1] - waveform.time[0]) / (waveform.time[4] - waveform.time[0]), Math.pow(10, defaultPrecision));
                    break;
                case "Bipolar Rectangular":
                    processed.peakToPeak = roundWithDecimals(Math.max.apply(null, waveform.data) - Math.min.apply(null, waveform.data), Math.pow(10, defaultPrecision));
                    processed.offset = 0;
                    processed.dutyCycle = roundWithDecimals((waveform.time[1] - waveform.time[0]) / (waveform.time[7] - waveform.time[0]), Math.pow(10, defaultPrecision));
                    break;
                case "Sinusoidal":
                    console.log("Sinusoidal")
                    processed.peakToPeak = roundWithDecimals(Math.max.apply(null, waveform.data) - Math.min.apply(null, waveform.data), Math.pow(10, defaultPrecision));
                    processed.offset = (Math.max.apply(null, waveform.data) + Math.min.apply(null, waveform.data)) / 2
                    processed.dutyCycle = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].processed.dutyCycle;
                    console.log(processed)
                    break;
                case "Custom":
                    console.log("Sinusoidal")
                    processed.peakToPeak = roundWithDecimals(Math.max.apply(null, waveform.data) - Math.min.apply(null, waveform.data), Math.pow(10, defaultPrecision));
                    processed.offset = (Math.max.apply(null, waveform.data) + Math.min.apply(null, waveform.data)) / 2
                    processed.dutyCycle = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].processed.dutyCycle;
                    console.log(processed)
                    break;
            }
            this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].processed = processed;
            this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].current.processed.dutyCycle = processed.dutyCycle;
            this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].voltage.processed.dutyCycle = processed.dutyCycle;
            if (signalDescriptor == 'voltage'){
                this.convertFromProcessedToWaveform(operatingPointIndex, windingIndex, "current");
            }
        },
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <div class="col-sm-12 col-md-2 text-start border border-primary" style="max-width: 360px; min-height: 700px;">

            </div>
            <div class="col-sm-12 col-md-10 text-start pe-0 ">
                <div class="container mx-auto">
                    <div class="row">
                        <div class="col-lg-4 col-md-12">
                            <WaveformInputCommon class="scrollable-column"
                                :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                                :defaultValue="defaultOperatingPointExcitation"
                                @updatedSwitchingFrequency="masStore.updatedInputExcitationProcessed()"
                                @updatedDutyCycle="masStore.updatedInputExcitationProcessed()"
                            />

                            <WaveformInput v-if="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].current.processed.label != 'Custom'" class="scrollable-column mt-3"
                                :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                                :defaultValue="defaultOperatingPointExcitation"
                                :signalDescriptor="'current'"
                                @peakToPeakChanged="masStore.updatedInputExcitationProcessed('current')"
                                @offsetChanged="masStore.updatedInputExcitationProcessed('current')"
                                @labelChanged="masStore.updatedInputExcitationProcessed('current')"
                            />
                            <WaveformInputCustom v-else class="scrollable-column mt-3"
                                :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                                :defaultValue="defaultOperatingPointExcitation"
                                :signalDescriptor="'current'"
                                @labelChanged="masStore.updatedInputExcitationProcessed('current')"
                                @updatedTime="masStore.updatedInputExcitationWaveformUpdatedFromProcessed('current')"
                                @updatedData="masStore.updatedInputExcitationWaveformUpdatedFromProcessed('current')"
                            />
                            <WaveformInput v-if="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex].voltage.processed.label != 'Custom'" class="scrollable-column mt-3"
                                :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                                :defaultValue="defaultOperatingPointExcitation"
                                :signalDescriptor="'voltage'"
                                @peakToPeakChanged="masStore.updatedInputExcitationProcessed('voltage')"
                                @offsetChanged="masStore.updatedInputExcitationProcessed('voltage')"
                                @labelChanged="masStore.updatedInputExcitationProcessed('voltage')"
                            />
                            <WaveformInputCustom v-else class="scrollable-column mt-3"
                                :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                                :defaultValue="defaultOperatingPointExcitation"
                                :signalDescriptor="'voltage'"
                                @labelChanged="masStore.updatedInputExcitationProcessed('voltage')"
                                @updatedTime="masStore.updatedInputExcitationWaveformUpdatedFromProcessed('voltage')"
                                @updatedData="masStore.updatedInputExcitationWaveformUpdatedFromProcessed('voltage')"
                            />
                        </div>

                        <div class="col-lg-8 col-md-12">
                            <WaveformGraph class="py-2" 
                                :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                                :dataTestLabel="'OperatingPoints-WaveformGraph'"
                                @updatedWaveform="updatedWaveform"
                            />
                            <WaveformFourier class="mt-3"
                                :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                                :dataTestLabel="'OperatingPoints-WaveformGraph'"
                            />
                        </div>

                        <button class="btn btn-danger col-1" @click="masStore.mas.inputs.operatingPoints = [{excitationsPerWinding: [defaultOperatingPointExcitation]}] && $router.go();">Reset </button>
                    </div>
                </div>

            </div>
        </div>
    </div>
</template>
