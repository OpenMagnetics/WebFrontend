<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import Storyline from '/src/components/Storyline.vue'
import { toTitleCase } from '/src/assets/js/utils.js'

import DesignRequirements from '/src/components/Synthesis/DesignRequirements.vue'
import OperatingPoints from '/src/components/Synthesis/OperatingPoints.vue'
import CoreAdviser from '/src/components/Synthesis/CoreAdviser.vue'
import CoreCustomizer from '/src/components/Synthesis/CoreCustomizer.vue'
import WireAdviser from '/src/components/Synthesis/WireAdviser.vue'
import WireCustomizer from '/src/components/Synthesis/WireCustomizer.vue'
import CoilAdviser from '/src/components/Synthesis/CoilAdviser.vue'
import MagneticFinalizer from '/src/components/Synthesis/MagneticFinalizer.vue'

</script>

<script>
export default {
    data() {
        const currentStoryline = {
            "designRequirements": {
                title: "Design Requirements",
                nextTool: "operatingPoints"
            },
            "operatingPoints": {
                title: "Operating Points",
                prevTool: "designRequirements",
                nextTool: "coreAdviser",
            },
            "coreAdviser": {
                title: "Core Adviser",
                prevTool: "operatingPoints",
                nextTool: "wireAdviser",
                advancedTool: "coreSimulation",
            },
            "coreSimulation": {
                title: "Core Simulation",
                prevTool: "operatingPoints",
                nextTool: "wireAdviser",
                basicTool: "coreAdviser",
                advancedTool: "coreCustomization",
            },
            "coreCustomization": {
                title: "Core Customization",
                prevTool: "operatingPoints",
                nextTool: "wireAdviser",
                basicTool: "coreSimulation",
            },
            "wireAdviser": {
                title: "Wire Adviser",
                prevTool: "coreAdviser",
                nextTool: "coilAdviser",
            },
            "wireCustomization": {
                title: "Wire Customization",
                prevTool: "coreAdviser",
                nextTool: "coilAdviser",
                basicTool: "wireAdviser",
            },
            "coilAdviser": {
                title: "Coil Adviser",
                prevTool: "wireAdviser",
                nextTool: "magneticFinalizer",
                advancedTool: "coilCustomizer",
            },
            "coilCustomizer": {
                title: "Coil Adviser",
                prevTool: "wireAdviser",
                nextTool: "magneticFinalizer",
                basicTool: "coilAdviser",
            },
            "magneticFinalizer": {
                title: "Magnetic Finalizer",
                prevTool: "coilAdviser",
            },
        };
        // var selectedTool = "designRequirements";
        var selectedTool = "operatingPoints";

        const canContinue = {
            'designRequirements': true,
            'operatingPoints': true,
            'coreAdviser': true,
            'coreSimulation': true,
            'coreCustomization': true,
            'wireAdviser': true,
            'wireCustomization': true,
            'coilAdviser': true,
            'magneticFinalizer': true,
        }
        return {
            currentStoryline,
            canContinue,
            selectedTool,
        }
    },
    methods: {
        prevTool(event) {
            if (this.currentStoryline[this.selectedTool].prevTool != null) {
                this.selectedTool = this.currentStoryline[this.selectedTool].prevTool;
            }
        },
        nextTool(event) {
            if (this.currentStoryline[this.selectedTool].nextTool != null) {
                this.selectedTool = this.currentStoryline[this.selectedTool].nextTool;
            }
        },
        advancedTool(event) {
            if (this.currentStoryline[this.selectedTool].advancedTool != null) {
                this.selectedTool = this.currentStoryline[this.selectedTool].advancedTool;
            }
        },
        basicTool(event) {
            if (this.currentStoryline[this.selectedTool].basicTool != null) {
                this.selectedTool = this.currentStoryline[this.selectedTool].basicTool;
            }
        },
        traversableRight() {
            return this.currentStoryline[this.selectedTool].advancedTool != null;
        },
        traversableLeft() {
            return this.currentStoryline[this.selectedTool].basicTool != null;
        },
        updateCanContinue(tool, value) {
            this.canContinue[tool] = value;
        },
        changeTool(tool) {
            this.selectedTool = tool;
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
        <Header />
        <main role="main" class="main">
            <div class="container mx-auto ">
                <div class="row">
                    <div class="storyline text-white text-center col-1 bg-light border border-primary m-0 p-1">
                        <h4 class="text-center">Storyline</h4>
                        <Storyline :selectedTool="selectedTool" :storyline="currentStoryline" :canContinue="canContinue" @changeTool="changeTool"/>
                    </div>
                    <div class="tool text-white bg-dark text-center offset-1 col-11 bg-light" >
                        <div>
                            <button data-cy="magnetic-synthesis-previous-tool-button" class="btn btn-outline-primary float-start mb-2" @click="prevTool"> Previous tool</button>
                            <h2 data-cy="magnetic-synthesis-title-text" class="">
                                {{toTitleCase(selectedTool)}}
                            </h2>
                        </div>
                            
                        <DesignRequirements @canContinue="updateCanContinue('designRequirements', $event)" :dataTestLabel="'MagneticSynthesis-DesignRequirements'" v-if="selectedTool == 'designRequirements'"/>
                        <OperatingPoints :dataTestLabel="'MagneticSynthesis-OperatingPoints'" v-if="selectedTool == 'operatingPoints'"/>
                        <CoreAdviser :dataTestLabel="'MagneticSynthesis-CoreAdviser'" v-if="selectedTool == 'coreAdviser'"/>
                        <CoreCustomizer :dataTestLabel="'MagneticSynthesis-CoreCustomizer'" v-if="selectedTool == 'coreCustomizer'"/>
                        <WireAdviser :dataTestLabel="'MagneticSynthesis-WireAdviser'" v-if="selectedTool == 'wireAdviser'"/>
                        <WireCustomizer :dataTestLabel="'MagneticSynthesis-WireCustomizer'" v-if="selectedTool == 'wireCustomizer'"/>
                        <CoilAdviser :dataTestLabel="'MagneticSynthesis-CoilAdviser'" v-if="selectedTool == 'coilAdviser'"/>
                        <MagneticFinalizer :dataTestLabel="'MagneticSynthesis-MagneticFinalizer'" v-if="selectedTool == 'magneticFinalizer'"/>
                        <button :disabled="!canContinue[selectedTool]" data-cy="magnetic-synthesis-next-tool-button" class="btn btn-outline-primary float-start mt-2" @click="nextTool">{{canContinue[selectedTool]? 'Next tool' : 'Errors must be fixed'}}</button>
                        <button data-cy="magnetic-synthesis-customize-tool-button" v-if="traversableRight()" class="btn btn-outline-primary float-end mt-2" @click="advancedTool"> Customize tool</button>
                        <button data-cy="magnetic-synthesis-main-tool-button" v-if="traversableLeft()" class="btn btn-outline-primary float-end mt-2" @click="basicTool"> Back to main tool</button>
                    </div>
                </div>
            </div>
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>


<style lang="css">

.tool {
    min-height: 84vh;
    overflow: hidden;
}
.storyline {
    max-height: auto;
    position: fixed;
    overflow: hidden;
}

</style>
