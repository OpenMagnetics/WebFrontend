<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import SimulationHeader from '/src/components/Simulation/SimulationHeader.vue'
import CoreSimulation from '/src/components/Simulation/CoreSimulation.vue'
import { useCoreStore } from '/src/stores/core'
import * as Defaults from '/src/assets/js/defaults.js'
import * as Utils from '/src/assets/js/utils.js'

</script>
<script>
export default {
    data() {
        const coreStore = useCoreStore()

        return {
            coreStore,
        }
    },
    methods: {
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
                        <SimulationHeader/>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12">
                        <CoreSimulation/>
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