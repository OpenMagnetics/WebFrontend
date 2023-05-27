<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import CoreHeader from '/src/components/Core/CoreHeader.vue'
import CoreToolMenu from '/src/components/Core/CoreToolMenu.vue'
import CoreProviders from '/src/components/Core/CoreProviders.vue'
import CoreShapeArtisan from '/src/components/Core/CoreShapeArtisan.vue'
import CoreGappingArtisan from '/src/components/Core/CoreGappingArtisan.vue'
import CoreMaterialArtisan from '/src/components/Core/CoreMaterialArtisan.vue'

import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'
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
        const coreStore = useCoreStore()
        var chosenTool = this.$userStore.getCoreSubsection

        return {
            currentStore,
            voltageStore,
            commonStore,
            coreStore,
            chosenTool,
        }
    },
    methods: {
        onToolChange(newTool) {
            console.log(newTool)
            this.$userStore.setCoreSubsection(newTool)
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
    <div class="d-flex flex-column min-vh-100">
        <main role="main">
            <Header />
            <div class="container mx-auto ">
                <div class="row">
                    <div class="col-lg-12">
                        <CoreHeader/>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-2">
                        <CoreToolMenu @tool_change="onToolChange"/>
                        <CoreProviders />
                    </div>
                    <div class="col-lg-10">
                        <CoreShapeArtisan class="scrollable-column" v-if="chosenTool == 'shapeArtisan'"/>
                        <CoreGappingArtisan class="scrollable-column" v-if="chosenTool == 'gappingArtisan'"/>
                        <CoreMaterialArtisan class="scrollable-column" v-if="chosenTool == 'materialArtisan'"/>
                    </div>
                </div>
            </div>
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>

<style type="text/css" scoped>
.scrollable-column {
  overflow: hidden;
  overflow-y: auto; 
}
</style>