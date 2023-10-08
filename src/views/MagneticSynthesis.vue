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
                // advancedTool: "coreSimulation",
            },
            // "coreSimulation": {
            //     title: "Core Simulation",
            //     prevTool: "operatingPoints",
            //     nextTool: "wireAdviser",
            //     basicTool: "coreAdviser",
            //     advancedTool: "coreCustomization",
            // },
            // "coreCustomization": {
            //     title: "Core Customization",
            //     prevTool: "operatingPoints",
            //     nextTool: "wireAdviser",
            //     basicTool: "coreSimulation",
            // },
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

        return {
            currentStoryline,
        }
    },
    methods: {
        prevTool(event) {
            if (this.currentStoryline[this.$userStore.magneticSynthesisSubsection].prevTool != null) {
                this.$userStore.magneticSynthesisSubsection = this.currentStoryline[this.$userStore.magneticSynthesisSubsection].prevTool;
            }
        },
        nextTool(event) {
            if (this.currentStoryline[this.$userStore.magneticSynthesisSubsection].nextTool != null) {
                this.$userStore.magneticSynthesisSubsection = this.currentStoryline[this.$userStore.magneticSynthesisSubsection].nextTool;
            }
        },
        advancedTool(event) {
            if (this.currentStoryline[this.$userStore.magneticSynthesisSubsection].advancedTool != null) {
                this.$userStore.magneticSynthesisSubsection = this.currentStoryline[this.$userStore.magneticSynthesisSubsection].advancedTool;
            }
        },
        basicTool(event) {
            if (this.currentStoryline[this.$userStore.magneticSynthesisSubsection].basicTool != null) {
                this.$userStore.magneticSynthesisSubsection = this.currentStoryline[this.$userStore.magneticSynthesisSubsection].basicTool;
            }
        },
        traversableRight() {
            return this.currentStoryline[this.$userStore.magneticSynthesisSubsection].advancedTool != null;
        },
        traversableLeft() {
            console.log(this.currentStoryline)
            console.log(this.$userStore.magneticSynthesisSubsection)
            return this.currentStoryline[this.$userStore.magneticSynthesisSubsection].basicTool != null;
        },
        updateCanContinue(tool, value) {
            this.$userStore.magneticSynthesisCanContinue[tool] = value;
        },
        changeTool(tool) {
            this.$userStore.magneticSynthesisSubsection = tool;
        }
    },
    mounted() {
    },
    created() {
        console.warn(this.$userStore.magneticSynthesisSubsection)
    },
}
</script>

<template>
    <div class="d-flex flex-column min-vh-100">
        <Header />
        <main role="main" class="main">
            <div class="container mx-auto ">
                <div class="row ">
                    <div class="storyline text-white text-center col-1 bg-light border border-primary m-0 p-1">
                        <h4 class="text-center">Storyline</h4>
                        <Storyline :selectedTool="$userStore.magneticSynthesisSubsection" :storyline="currentStoryline" :canContinue="$userStore.magneticSynthesisCanContinue" @changeTool="changeTool"/>
                    </div>
                    <div class="tool text-white bg-dark text-center offset-1 col-11 bg-light row " >
                        <div class="mb-2 row" >
                            <button data-cy="magnetic-synthesis-previous-tool-button" class="btn btn-outline-primary col-sm-12 col-md-2 mt-1" style="max-height: 50px;" @click="prevTool"> Previous tool</button>
                            <h2 data-cy="magnetic-synthesis-title-text" class="col-sm-12 col-md-9">
                                {{toTitleCase($userStore.magneticSynthesisSubsection)}}
                            </h2>
                        </div>
                            
                        <DesignRequirements @canContinue="updateCanContinue('designRequirements', $event)" :dataTestLabel="'MagneticSynthesis-DesignRequirements'" v-if="$userStore.magneticSynthesisSubsection == 'designRequirements'"/>
                        <OperatingPoints @canContinue="updateCanContinue('operatingPoints', $event)" @changeTool="changeTool" :dataTestLabel="'MagneticSynthesis-OperatingPoints'" v-if="$userStore.magneticSynthesisSubsection == 'operatingPoints'"/>
                        <CoreAdviser @canContinue="updateCanContinue('coreAdviser', $event)" :dataTestLabel="'MagneticSynthesis-CoreAdviser'" v-if="$userStore.magneticSynthesisSubsection == 'coreAdviser'"/>
                        <CoreCustomizer :dataTestLabel="'MagneticSynthesis-CoreCustomizer'" v-if="$userStore.magneticSynthesisSubsection == 'coreCustomizer'"/>
                        <WireAdviser :dataTestLabel="'MagneticSynthesis-WireAdviser'" v-if="$userStore.magneticSynthesisSubsection == 'wireAdviser'"/>
                        <WireCustomizer :dataTestLabel="'MagneticSynthesis-WireCustomizer'" v-if="$userStore.magneticSynthesisSubsection == 'wireCustomizer'"/>
                        <CoilAdviser :dataTestLabel="'MagneticSynthesis-CoilAdviser'" v-if="$userStore.magneticSynthesisSubsection == 'coilAdviser'"/>
                        <MagneticFinalizer :dataTestLabel="'MagneticSynthesis-MagneticFinalizer'" v-if="$userStore.magneticSynthesisSubsection == 'magneticFinalizer'"/>
                        <button style="max-height: 50px;" :disabled="!$userStore.magneticSynthesisCanContinue[$userStore.magneticSynthesisSubsection]" data-cy="magnetic-synthesis-next-tool-button" class="btn btn-outline-primary  mt-2 col-sm-12 col-md-2 " @click="nextTool">{{$userStore.magneticSynthesisCanContinue[$userStore.magneticSynthesisSubsection]? 'Next tool' : 'Errors must be fixed'}}</button>
                        <button style="max-height: 50px;" data-cy="magnetic-synthesis-main-tool-button" v-if="traversableLeft()" class="btn btn-outline-primary mt-2 offset-6 col-2" @click="basicTool"> Back to main tool</button>
                        <button style="max-height: 50px;" data-cy="magnetic-synthesis-customize-tool-button" v-if="traversableRight()" class="btn btn-outline-primary mt-2 col-2" :class="traversableLeft()? '' : 'offset-8'" @click="advancedTool"> Customize tool</button>
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
