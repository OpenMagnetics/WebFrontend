<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import CoreHeader from '/src/components/Core/CoreHeader.vue'
import CoreToolMenu from '/src/components/Core/CoreToolMenu.vue'
import CoreShapeArtisan from '/src/components/Core/CoreShapeArtisan.vue'
import CoreCalculator from '/src/components/Core/CoreCalculator.vue'
import CoreGappingArtisan from '/src/components/Core/CoreGappingArtisan.vue'
import CoreMaterialArtisan from '/src/components/Core/CoreMaterialArtisan.vue'

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
        var chosenTool = userStore.getCoreSubsection

        return {
            currentStore,
            voltageStore,
            commonStore,
            userStore,
            coreStore,
            chosenTool,
        }
    },
    methods: {
        onToolChange(newTool) {
            console.log(newTool)
            this.userStore.setCoreSubsection(newTool)
            this.chosenTool = newTool
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
                <div class="col-lg-10">
                    <CoreShapeArtisan v-if="chosenTool == 'shapeArtisan'"/>
                    <CoreCalculator v-if="chosenTool == 'calculator'"/>
                    <CoreGappingArtisan v-if="chosenTool == 'gappingArtisan'"/>
                    <CoreMaterialArtisan v-if="chosenTool == 'materialArtisan'"/>
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