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
import * as Defaults from '/src/assets/js/defaults.js'
import * as Utils from '/src/assets/js/utils.js'

</script>
<script>
const currentStore = useCurrentStore()
const voltageStore = useVoltageStore()
const commonStore = useCommonStore()

export default {
    data() {
        var switchingFrequency
        var waveformTypes

        const data = this.$userStore.getGlobalOperationPoint.value
        console.log(data)
        const aux = this.loadOperationPoint(data)
        switchingFrequency = aux["switchingFrequency"]
        waveformTypes = aux["waveformTypes"]

        return {
            switchingFrequency,
            isChartReady: false,
            waveformTypes,
        }
    },
    methods: {
        onVoltageChange(newValue) {
            this.waveformTypes['voltage'] = newValue
        },
        onCurrentChange(newValue) {
            this.waveformTypes['current'] = newValue 
        },
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
            const compressedVoltageData = Utils.packDataPoints(data["voltage"]["waveform"], data["frequency"])

            const switchingFrequency = data["frequency"]
            const waveformTypes = {
                current: data["current"]["type"] != null? data["current"]["type"] : Utils.tryGuessType(compressedCurrentData, data["frequency"]),
                voltage: data["voltage"]["type"] != null? data["voltage"]["type"] : Utils.tryGuessType(compressedVoltageData, data["frequency"]),
            }
            currentStore.setType(waveformTypes["current"])
            voltageStore.setType(waveformTypes["voltage"])

            currentStore.setDataPointsFromFile(compressedCurrentData)
            voltageStore.setDataPointsFromFile(compressedVoltageData)
            currentStore.setDataImported(true)
            voltageStore.setDataImported(true)
            commonStore.setDataImported(true)
            commonStore.setOperationPointName(data["name"])
            commonStore.setSwitchingFrequency(switchingFrequency)
            commonStore.setDutyCycle(Utils.tryGuessDutyCycle(waveformTypes["current"] != "Custom"? compressedCurrentData : compressedVoltageData, data["frequency"]))
            return {switchingFrequency, waveformTypes}
        }
    },
    mounted() {
    },
    created() {
    },
}
</script>

<template>
    <div class="d-flex flex-column min-vh-100">
        <main role="main">
            <Header />
            <div class="container mx-auto">
                <div class="row">
                    <div class="col-lg-12">
                        <OperationPointHeader @voltage-type-change="onVoltageChange" @current-type-change="onCurrentChange"/>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-3 col-md-12">
                        <WaveformInputCommon @switching-frequency-change="onSwitchingFrequencyChange" @duty-cycle-change="onDutyCycleChange"/>
                        <div v-for="(value, key) in waveformTypes">
                            <WaveformInputTriangular :electricalParameter="key" :isChartReady="isChartReady" v-if="value === 'Triangular'" class="scrollable-column"/>
                            <WaveformInputCustom :electricalParameter="key" :isChartReady="isChartReady" v-if="value === 'Custom'" class="scrollable-column"/>
                            <WaveformInputSquare :electricalParameter="key" :isChartReady="isChartReady" v-else-if="value === 'Square'" class="scrollable-column"/>
                            <WaveformInputSinusoidal :electricalParameter="key" :isChartReady="isChartReady" v-else-if="value === 'Sinusoidal'" class="scrollable-column"/>
                            <WaveformInputSquareWithDeadtime :electricalParameter="key" :isChartReady="isChartReady" v-else-if="value === 'Square with Dead-Time'" class="scrollable-column"/>
                        </div>
                    </div>
                    <div class="col-lg-6 col-md-8">
                        <WaveformGraph class="py-2" :waveformTypes="waveformTypes" @chart-ready="onChartReady"/>
                        <WaveformFourier class="mt-3"/>
                    </div>
                    <div class="col-lg-3 col-md-4">
                        <div v-for="(value, key) in waveformTypes">
                            <WaveformOutput :electricalParameter="key"/>
                        </div>
                        <WaveformCombinedOutput/>
                    </div>
                </div>
            </div>
        </main>
    <Footer class="mt-auto"/>
</div>
</template>

<style type="text/css" scoped>
.scrollable-column {
  max-height: 27vh;
  overflow: hidden;
  overflow-y: auto; 
}
</style>