<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import WaveformGraph from '/src/components/WaveformGraph.vue'
import WaveformFourier from '/src/components/WaveformFourier.vue'
import WaveformInputCustom from '/src/components/WaveformInputCustom.vue'
import WaveformInputTriangular from '/src/components/WaveformInputTriangular.vue'
import WaveformInputSquare from '/src/components/WaveformInputSquare.vue'
import WaveformInputSinusoidal from '/src/components/WaveformInputSinusoidal.vue'
import WaveformInputSquareWithDeadtime from '/src/components/WaveformInputSquareWithDeadtime.vue'
import OperationPointHeader from '/src/components/OperationPointHeader.vue'
import WaveformInputCommon from '/src/components/WaveformInputCommon.vue'
import WaveformOutput from '/src/components/WaveformOutput.vue'

import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'
import * as Defaults from '/src/assets/js/waveformDefaults.js'

</script>
<script>
const currentStore = useCurrentStore()
const voltageStore = useVoltageStore()
const commonStore = useCommonStore()

export default {
    data() {
        return {
            switchingFrequency: Defaults.defaultSwitchingFrequency,
            isChartReady: false,
            waveformTypes: {
                current: Defaults.defaultCurrentType,
                voltage: Defaults.defaultVoltageType,
            }
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
    },
    mounted() {
    },
    created() {
    },
}
</script>

<template>
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
                    <WaveformGraph class="" :waveformTypes="waveformTypes" @chart-ready="onChartReady" style="height: 66%"/>
                    <WaveformFourier class="mt-3" style="height: 30%"/>
                </div>
                <div class="col-lg-3 col-md-4">
                    <div v-for="(value, key) in waveformTypes">
                        <WaveformOutput :electricalParameter="key"/>
                    </div>
                </div>
            </div>
        </div>
        <Footer />
    </main>
</template>

<style type="text/css">
.scrollable-column {
  max-height: 27vh;
  overflow: hidden;
  overflow-y: auto; 
}
</style>