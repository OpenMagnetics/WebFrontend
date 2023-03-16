<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import WaveformGraph from '/src/components/OperationPoint/WaveformGraph.vue'
import WaveformFourier from '/src/components/OperationPoint/WaveformFourier.vue'
import WaveformInputCustom from '/src/components/OperationPoint/WaveformInputCustom.vue'
import WaveformInputTriangular from '/src/components/OperationPoint/WaveformInputTriangular.vue'
import WaveformInputSquare from '/src/components/OperationPoint/WaveformInputSquare.vue'
import WaveformInputSinusoidal from '/src/components/OperationPoint/WaveformInputSinusoidal.vue'
import WaveformInputSquareWithDeadtime from '/src/components/OperationPoint/WaveformInputSquareWithDeadtime.vue'
import OperationPointHeader from '/src/components/OperationPoint/OperationPointHeader.vue'
import WaveformInputCommon from '/src/components/OperationPoint/WaveformInputCommon.vue'
import WaveformOutput from '/src/components/OperationPoint/WaveformOutput.vue'
import WaveformCombinedOutput from '/src/components/OperationPoint/WaveformCombinedOutput.vue'

import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'
import { useSimulationStore } from '/src/stores/simulation'
import * as Defaults from '/src/assets/js/defaults.js'
import * as Utils from '/src/assets/js/utils.js'

</script>
<script>
const currentStore = useCurrentStore()
const voltageStore = useVoltageStore()
const commonStore = useCommonStore()
const simulationStore = useSimulationStore()

export default {
    props: {
        key: {
            type: Number,
            required: false,
            default: 0
        },
    },
    data() {
        var switchingFrequency
        var waveformTypes


        const operationPoint = this.$userStore.globalSimulation['inputs']['operationPoints'][0]['excitationsPerWinding'][0]
        if ('voltage' in operationPoint) {
            delete operationPoint['voltage'];
        }
        if (operationPoint == null) {
            switchingFrequency = commonStore.getSwitchingFrequency.value
            waveformTypes = {
                current: currentStore.getType.value == null? Defaults.defaultCurrentType : currentStore.getType.value,
                // voltage: voltageStore.getType.value == null? Defaults.defaultVoltageType : voltageStore.getType.value,
            }
        }
        else {
            const data = operationPoint
            const aux = this.loadOperationPoint(data)
            switchingFrequency = aux["switchingFrequency"]
            waveformTypes = aux["waveformTypes"]
        }

        return {
            switchingFrequency,
            isChartReady: false,
            waveformTypes,
        }
    },
    methods: {
        onChartReady() {
            this.isChartReady = true
        },
        onSwitchingFrequencyChange(newValue) {
            commonStore.setSwitchingFrequency(newValue * 1000)
        },
        onDutyCycleChange(newValue) {
            commonStore.setDutyCycle(newValue / 100)
        },
        loadOperationPoint(data) {
            const compressedCurrentData = Utils.packDataPoints(data["current"]["waveform"], data["frequency"])
            // const compressedVoltageData = Utils.packDataPoints(data["voltage"]["waveform"], data["frequency"])

            const switchingFrequency = data["frequency"]
            const waveformTypes = {
                current: Utils.tryGuessType(compressedCurrentData, data["frequency"]),
                // voltage: Utils.tryGuessType(compressedVoltageData, data["frequency"]),
            }
            currentStore.setType(waveformTypes["current"])
            // voltageStore.setType(waveformTypes["voltage"])

            setTimeout(() => {
                currentStore.setDataPointsFromFile(compressedCurrentData)
                // voltageStore.setDataPointsFromFile(compressedVoltageData)
                commonStore.setOperationPointName(data["name"])
                commonStore.setSwitchingFrequency(switchingFrequency)
                // commonStore.setDutyCycle(Utils.tryGuessDutyCycle(waveformTypes["current"] != "Custom"? compressedCurrentData : compressedVoltageData, data["frequency"]))
                commonStore.setDutyCycle(Utils.tryGuessDutyCycle(compressedCurrentData, data["frequency"]))
            }, 1000);

            return {switchingFrequency, waveformTypes}
        }
    },
    mounted() {

        currentStore.$subscribe((mutation, state) => {
            const data = []
            const time = []
            currentStore.dataPoints.forEach((item) => {
                time.push(item['x'])
                data.push(item['y'])
            })
            const operationPoint = this.$userStore.globalSimulation['inputs']['operationPoints'][0]
            operationPoint['excitationsPerWinding'][0]['current']['type'] = currentStore.type
            operationPoint['excitationsPerWinding'][0]['current']['waveform']['data'] = data
            operationPoint['excitationsPerWinding'][0]['current']['waveform']['time'] = time
            this.$userStore.setGlobalSimulationOperationPointByIndex(0, operationPoint)
            simulationStore.calculateInductance()
        })

        // voltageStore.$subscribe((mutation, state) => {
        //     const data = []
        //     const time = []
        //     voltageStore.dataPoints.forEach((item) => {
        //         time.push(item['x'])
        //         data.push(item['y'])
        //     })
        //     const operationPoint = this.$userStore.globalSimulation['inputs']['operationPoints'][0]
        //     operationPoint['excitationsPerWinding'][0]['voltage']['type'] = voltageStore.type
        //     operationPoint['excitationsPerWinding'][0]['voltage']['waveform']['data'] = data
        //     operationPoint['excitationsPerWinding'][0]['voltage']['waveform']['time'] = time
        //     this.$userStore.setGlobalSimulationOperationPointByIndex(0, operationPoint)
        //     simulationStore.calculateInductance()
        // })

        commonStore.$subscribe((mutation, state) => {
            const operationPoint = this.$userStore.globalSimulation['inputs']['operationPoints'][0]
            operationPoint['excitationsPerWinding'][0]['frequency'] = commonStore.switchingFrequency
            this.$userStore.setGlobalSimulationOperationPointByIndex(0, operationPoint)
            simulationStore.calculateInductance()
        })
    },
    created() {
    },
}
</script>


<template>
    <div class="offcanvas offcanvas-start bg-dark" tabindex="-1" id="OperationPointOffCanvas" aria-labelledby="OperationPointOffCanvasLabel">
    <div class="offcanvas-header">
        <h5 class="offcanvas-title text-white fs-3" id="OperationPointOffCanvasLabel">Edit Operation Point</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="OperationPointOffCanvasClose"></button>
    </div>
    <div class="offcanvas-body">
        <div class="container mx-auto">
            <div class="row">
                <div class="col-12">
                    <WaveformInputCommon @switching-frequency-change="onSwitchingFrequencyChange" @duty-cycle-change="onDutyCycleChange"/>
                    <div v-for="(value, electricalParameter) in waveformTypes">
                        <WaveformInputTriangular :electricalParameter="electricalParameter" :isChartReady="isChartReady" v-if="value === 'Triangular'" class="scrollable-column"/>
                        <WaveformInputCustom :electricalParameter="electricalParameter" :isChartReady="isChartReady" v-if="value === 'Custom'" class="scrollable-column"/>
                        <WaveformInputSquare :electricalParameter="electricalParameter" :isChartReady="isChartReady" v-else-if="value === 'Square'" class="scrollable-column"/>
                        <WaveformInputSinusoidal :electricalParameter="electricalParameter" :isChartReady="isChartReady" v-else-if="value === 'Sinusoidal'" class="scrollable-column"/>
                        <WaveformInputSquareWithDeadtime :electricalParameter="electricalParameter" :isChartReady="isChartReady" v-else-if="value === 'Square with Dead-Time'" class="scrollable-column"/>

                        <WaveformOutput :electricalParameter="electricalParameter"/>
                    </div>
                </div>
                <div class="col-12">
                    <WaveformCombinedOutput/>
                </div>
                <div v-show="true" class="col-12">
                    <WaveformGraph class="mt-3 " :waveformTypes="waveformTypes" @chart-ready="onChartReady" style="height: 66%"/>
                    <WaveformFourier class="" style="height: 50%"/>
                </div>
            </div>
        </div>
    </div>
</div>

</template>