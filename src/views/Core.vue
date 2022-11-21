<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import CoreHeader from '/src/components/Core/CoreHeader.vue'
import CoreToolMenu from '/src/components/Core/CoreToolMenu.vue'
import CoreVisualizer from '/src/components/Core/CoreVisualizer.vue'
import CoreShapeArtisanInput from '/src/components/Core/CoreShapeArtisanInput.vue'

import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'
import { useUserStore } from '/src/stores/user'
import { useCoreStore } from '/src/stores/core'
import * as Defaults from '/src/assets/js/defaults.js'
import * as Utils from '/src/assets/js/utils.js'

</script>
<script>
export default {
    data() {
        const currentStore = useCurrentStore()
        const voltageStore = useVoltageStore()
        const commonStore = useCommonStore()
        const userStore = useUserStore()
        const coreStore = useCoreStore()

        return {
            currentStore,
            voltageStore,
            commonStore,
            userStore,
            coreStore,
        }
    },
    methods: {
        onToolChange(newTool) {
            console.log(newTool)
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
                    <CoreHeader/>
                </div>
            </div>
            <div class="row">
                <div class="col-lg-2">
                    <CoreToolMenu @tool_change="onToolChange"/>
                </div>
                <div class="container col-lg-10">
                    <div class="row">
                        <div class="col-lg-2">
                            <CoreShapeArtisanInput/>
                        </div>
                        <div class="col-lg-6" style="height: 50vh">
                            <CoreVisualizer/>
                        </div>
                        <div class="col-lg-3">
                            <!-- <div v-for="(value, key) in waveformTypes"> -->
                                <!-- <WaveformOutput :electricalParameter="key"/> -->
                            <!-- </div> -->
                            <!-- <WaveformCombinedOutput/> -->
                        </div>
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