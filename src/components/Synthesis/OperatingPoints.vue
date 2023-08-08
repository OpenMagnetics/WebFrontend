<script setup>
import { useMasStore } from '/src/stores/mas'
import WaveformGraph from '/src/components/Synthesis/OperatingPoints/WaveformGraph.vue'
import WaveformFourier from '/src/components/Synthesis/OperatingPoints/WaveformFourier.vue'
import WaveformInputCustom from '/src/components/Synthesis/OperatingPoints/WaveformInputCustom.vue'
import WaveformInput from '/src/components/Synthesis/OperatingPoints/WaveformInput.vue'
import WaveformInputSquare from '/src/components/Synthesis/OperatingPoints/WaveformInputSquare.vue'
import WaveformInputSinusoidal from '/src/components/Synthesis/OperatingPoints/WaveformInputSinusoidal.vue'
import WaveformInputSquareWithDeadtime from '/src/components/Synthesis/OperatingPoints/WaveformInputSquareWithDeadtime.vue'
import WaveformInputCommon from '/src/components/Synthesis/OperatingPoints/WaveformInputCommon.vue'
import WaveformOutput from '/src/components/Synthesis/OperatingPoints/WaveformOutput.vue'
import WaveformCombinedOutput from '/src/components/Synthesis/OperatingPoints/WaveformCombinedOutput.vue'
import { packDataPoints, tryGuessType } from '/src/assets/js/utils.js'

import { defaultOperatingPointExcitation } from '/src/assets/js/defaults.js'

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

        var defaultData;
        if (masStore.mas.inputs.operatingPoints.length == 0) {
            defaultData = defaultOperatingPointExcitation;
            masStore.mas.inputs.operatingPoints.push({excitationsPerWinding: [defaultData]});
        }
        else {
            defaultData = masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex];
        }

        const compressedCurrentData = packDataPoints(defaultData["current"]["waveform"], defaultData["frequency"])
        const compressedVoltageData = packDataPoints(defaultData["voltage"]["waveform"], defaultData["frequency"])
        const waveformTypes = {
            current: defaultData["current"]["type"] != null? defaultData["current"]["type"] : tryGuessType(compressedCurrentData, defaultData["frequency"]),
            voltage: defaultData["voltage"]["type"] != null? defaultData["voltage"]["type"] : tryGuessType(compressedVoltageData, defaultData["frequency"]),
        }
        return {
            masStore,
            currentOperatingPointIndex,
            currentWindingIndex,
            waveformTypes,
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
            if (action.name == "updatedInputExcitationSwitchingFrequency") {
                const operatingPointIndex = action.args[0];
                console.log("frequencyChanged");
                console.log(operatingPointIndex);
                console.log(this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[this.currentWindingIndex].frequency);
            }
            if (action.name == "updatedInputExcitationDutyCycle") {
                const operatingPointIndex = action.args[0];
                console.log("dutyCycleChanged");
                console.log(operatingPointIndex);
                console.log(this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[this.currentWindingIndex].current.processed.dutyCycle);
                console.log(this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[this.currentWindingIndex].voltage.processed.dutyCycle);
            }
            if (action.name == "updatedInputExcitationPeakToPeak") {
                const operatingPointIndex = action.args[0];
                const windingIndex = action.args[1];
                const signalDescriptor = action.args[2];
                console.log("peakToPeakChanged");
                console.log(operatingPointIndex);
                console.log(windingIndex);
                console.log(signalDescriptor);
                console.log(this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].processed.peakToPeak);
            }
            if (action.name == "updatedInputExcitationOffset") {
                const operatingPointIndex = action.args[0];
                const windingIndex = action.args[1];
                const signalDescriptor = action.args[2];
                console.log("offset");
                console.log(operatingPointIndex);
                console.log(windingIndex);
                console.log(signalDescriptor);
                console.log(this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].processed.offset);
            }
        })
    },
    methods: {
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <div class="col-sm-12 col-md-2 text-start border border-primary" style="max-width: 360px; min-height: 760px;">

            </div>
            <div class="col-sm-12 col-md-10 text-start pe-0">

                <div class="container mx-auto">
                    <div class="row">
                        <div class="col-lg-4 col-md-12">
                            <WaveformInputCommon 
                                :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                                :defaultValue="defaultOperatingPointExcitation"
                                @updatedSwitchingFrequency="masStore.updatedInputExcitationSwitchingFrequency(currentOperatingPointIndex)"
                                @updatedDutyCycle="masStore.updatedInputExcitationDutyCycle(currentOperatingPointIndex)"
                            />
                            <div v-for="(value, key) in waveformTypes">
                                <WaveformInput class="scrollable-column"
                                    :modelValue="masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].excitationsPerWinding[currentWindingIndex]"
                                    :defaultValue="defaultOperatingPointExcitation"
                                    :signalDescriptor="key"
                                    :disableOffset="key == 'Rectangular'"
                                    @peakToPeakChanged="masStore.updatedInputExcitationPeakToPeak(currentOperatingPointIndex, currentWindingIndex, key)"
                                    @offsetChanged="masStore.updatedInputExcitationOffset(currentOperatingPointIndex, currentWindingIndex, key)"
                                />
<!--                                 <WaveformInputCustom :electricalParameter="key" :isChartReady="isChartReady" v-if="value === 'Custom'" class="scrollable-column"/>
                                <WaveformInputSquare :electricalParameter="key" :isChartReady="isChartReady" v-else-if="value === 'Square'" class="scrollable-column"/>
                                <WaveformInputSinusoidal :electricalParameter="key" :isChartReady="isChartReady" v-else-if="value === 'Sinusoidal'" class="scrollable-column"/>
                                <WaveformInputSquareWithDeadtime :electricalParameter="key" :isChartReady="isChartReady" v-else-if="value === 'Square with Dead-Time'" class="scrollable-column"/> -->
                            </div>
                        </div>
<!--                         <div class="col-lg-9 col-md-8">
                            <WaveformGraph class="py-2" :waveformTypes="waveformTypes" @chart-ready="onChartReady"/>
                            <WaveformFourier class="mt-3"/>
                        </div> -->
<!--                         <div class="col-lg-3 col-md-4">
                            <div v-for="(value, key) in waveformTypes">
                                <WaveformOutput :electricalParameter="key"/>
                            </div>
                            <WaveformCombinedOutput/>
                        </div> -->
                    </div>
                </div>

            </div>
        </div>
    </div>
</template>
