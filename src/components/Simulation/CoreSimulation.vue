<script setup>
import ToolMenu from '/src/components/Simulation/CoreSimulation/ToolMenu.vue'
import CoreCalculator from '/src/components/Simulation/CoreSimulation/CoreCalculator.vue'
import CoreAdviser from '/src/components/Simulation/CoreSimulation/CoreAdviser.vue'
import { useCoreStore } from '/src/stores/core'
import * as Defaults from '/src/assets/js/defaults.js'
import * as Utils from '/src/assets/js/utils.js'

</script>
<script>
export default {
    data() {
        const coreStore = useCoreStore()
        var chosenTool = this.$userStore.getCoreSimulationSubsection

        return {
            coreStore,
            chosenTool,
        }
    },
    methods: {
        onToolChange(newTool) {
            console.log(newTool)
            this.$userStore.setCoreSimulationSubsection(newTool)
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
    <div class="container mx-auto ">
        <div class="row">
            <div class="col-lg-2">
                <ToolMenu @tool_change="onToolChange"/>
            </div>
            <div class="col-lg-10">
                <CoreCalculator class="scrollable-column" v-if="chosenTool == 'coreCalculator'"/>
                <CoreAdviser class="scrollable-column" v-if="chosenTool == 'coreAdviser'"/>
            </div>
        </div>
    </div>
</template>

<style type="text/css" scoped>
.scrollable-column {
  overflow: hidden;
  overflow-y: auto; 
}
</style>