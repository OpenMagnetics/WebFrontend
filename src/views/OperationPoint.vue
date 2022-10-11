<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import Waveform from '/src/components/Waveform.vue'
import WaveformInputCustom from '/src/components/WaveformInputCustom.vue'
import WaveformInputTriangular from '/src/components/WaveformInputTriangular.vue'
import WaveformInputSquare from '/src/components/WaveformInputSquare.vue'
import WaveformInputSinusoidal from '/src/components/WaveformInputSinusoidal.vue'
import WaveformInputSquareWithDeadtime from '/src/components/WaveformInputSquareWithDeadtime.vue'
import OperationPointHeader from '/src/components/OperationPointHeader.vue'
import WaveformInputCommon from '/src/components/WaveformInputCommon.vue'

import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'

</script>
<script>
const currentStore = useCurrentStore()
const voltageStore = useVoltageStore()
const commonStore = useCommonStore()

export default {
    components: {
        Waveform,
        WaveformInputCustom,
        WaveformInputTriangular,
        WaveformInputSquare,
        WaveformInputSinusoidal,
        WaveformInputSquareWithDeadtime,
        OperationPointHeader,
        WaveformInputCommon,
    },
    data() {
        return {
            switchingFrequency: 10000,
            isChartReady: false,
            waveformTypes: {
                current: "Triangular",
                voltage: "Square"
            }
        }
    },
    methods: {
        onVoltageChange(newValue) {
            console.log(newValue)
            this.waveformTypes['voltage'] = newValue
        },
        onCurrentChange(newValue) {
            console.log(newValue)
            this.waveformTypes['current'] = newValue
        },
        onChartReady() {
            this.isChartReady = true
        },
        onSwitchingFrequencyChange(newValue) {
            console.log(newValue)
            commonStore.setSwitchingFrequency(newValue * 1000)
        },
        onDutyCycleChange(newValue) {
            commonStore.setDutyCycle(newValue / 100)
            console.log(newValue)
        },
    },
    mounted() {
    },
    created() {
        // currentStore.$subscribe((mutation, state) => {
        //     // console.log("whaaaaaaat")
        //     // console.log(mutation)
        //     // console.log(state)
        // })
        // voltageStore.$subscribe((mutation, state) => {
        //     // console.log("whaaaaaaat")
        //     // console.log(mutation)
        //     // console.log(state)
        // })
    },
}
</script>

<template>
    <Header />
    <main role="main">
        <div class="container-flex">
            <div class="row">
                <div class="col-lg-12">
                    <OperationPointHeader @voltage-type-change="onVoltageChange" @current-type-change="onCurrentChange"/>
                </div>
            </div>
            <div class="row">
                <div class="col-lg-3">
                    <WaveformInputCommon @switching-frequency-change="onSwitchingFrequencyChange" @duty-cycle-change="onDutyCycleChange"/>
                    <div v-for="(value, key) in waveformTypes">
                        <WaveformInputTriangular :electricalParameter="key" :isChartReady="isChartReady" v-if="value === 'Triangular'"/>
                        <WaveformInputCustom :electricalParameter="key" :isChartReady="isChartReady" v-if="value === 'Custom'"/>
                        <WaveformInputSquare :electricalParameter="key" :isChartReady="isChartReady" v-else-if="value === 'Square'"/>
                        <WaveformInputSinusoidal :electricalParameter="key" :isChartReady="isChartReady" v-else-if="value === 'Sinusoidal'"/>
                        <WaveformInputSquareWithDeadtime :electricalParameter="key" :isChartReady="isChartReady" v-else-if="value === 'Square with Dead-Time'"/>
                    </div>
                </div>
                <div class="col-lg-6">
                    <Waveform :waveformTypes="waveformTypes" @chart-ready="onChartReady" />
                </div>
                <div class="col-lg-3">
                </div>
            </div>
        </div>
    </main>
    <Footer />
</template>
