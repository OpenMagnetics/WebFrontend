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
import MagneticSpecificationFinalizer from '/src/components/Synthesis/MagneticSpecificationFinalizer.vue'

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
                nextTool: "magneticFinalizer",
            },
            "magneticFinalizer": {
                title: "Magnetic Finalizer",
                prevTool: "operatingPoints",
            },
        };

        return {
            currentStoryline,
            updateStoryline: 0,
        }
    },
    methods: {
        prevTool(event) {
            if (this.currentStoryline[this.$userStore.magneticSpecificationSubsection].prevTool != null) {
                this.$userStore.magneticSpecificationSubsection = this.currentStoryline[this.$userStore.magneticSpecificationSubsection].prevTool;
            }
        },
        nextTool(event) {
            if (this.currentStoryline[this.$userStore.magneticSpecificationSubsection].nextTool != null) {
                this.$userStore.magneticSpecificationSubsection = this.currentStoryline[this.$userStore.magneticSpecificationSubsection].nextTool;
            }
        },
        advancedTool(event) {
            if (this.currentStoryline[this.$userStore.magneticSpecificationSubsection].advancedTool != null) {
                this.$userStore.magneticSpecificationSubsection = this.currentStoryline[this.$userStore.magneticSpecificationSubsection].advancedTool;
            }
        },
        basicTool(event) {
            if (this.currentStoryline[this.$userStore.magneticSpecificationSubsection].basicTool != null) {
                this.$userStore.magneticSpecificationSubsection = this.currentStoryline[this.$userStore.magneticSpecificationSubsection].basicTool;
            }
        },
        traversableRight() {
            return this.currentStoryline[this.$userStore.magneticSpecificationSubsection].advancedTool != null;
        },
        traversableLeft() {
            return this.currentStoryline[this.$userStore.magneticSpecificationSubsection].basicTool != null;
        },
        updateCanContinue(tool, value) {
            this.$userStore.magneticSpecificationCanContinue[tool] = value;
            this.updateStoryline += 1;
        },
        changeTool(tool) {
            this.$userStore.magneticSpecificationSubsection = tool;
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
            <div class="container mx-auto">
                <div class="row">
                    <div class="storyline text-white text-center col-1 bg-light border border-primary m-0 p-1">
                        <h4 class="text-center">Storyline</h4>
                        <Storyline :selectedTool="$userStore.magneticSpecificationSubsection" :storyline="currentStoryline" :canContinue="$userStore.magneticSpecificationCanContinue" @changeTool="changeTool" :forceUpdate="updateStoryline"/>
                    </div>
                    <div class="tool text-white bg-dark text-center offset-1 col-11 bg-light row " >
                        <div class="mb-2 row" style="max-height: 50px;">
                            <button data-cy="magnetic-synthesis-previous-tool-button" class="btn btn-outline-primary col-sm-12 col-md-2 mt-1" style="max-height: 50px;" @click="prevTool"> Previous tool</button>
                            <h2 data-cy="magnetic-synthesis-title-text" class="col-sm-12 col-md-9" style="max-height: 50px;">
                                {{toTitleCase($userStore.magneticSpecificationSubsection)}}
                            </h2>
                        </div>
                            
                        <div class="row">
                            <DesignRequirements @canContinue="updateCanContinue('designRequirements', $event)" :dataTestLabel="'MagneticSpecification-DesignRequirements'" v-if="$userStore.magneticSpecificationSubsection == 'designRequirements'"/>
                            <OperatingPoints @canContinue="updateCanContinue('operatingPoints', $event)" @changeTool="changeTool" :dataTestLabel="'MagneticSpecification-OperatingPoints'" v-if="$userStore.magneticSpecificationSubsection == 'operatingPoints'"/>
                            <MagneticSpecificationFinalizer :dataTestLabel="'MagneticSpecification-MagneticFinalizer'" v-if="$userStore.magneticSpecificationSubsection == 'magneticFinalizer'"/>
                        </div>
                        <button v-if="$userStore.magneticSpecificationSubsection != 'magneticFinalizer'" style="max-height: 50px;" :disabled="!$userStore.magneticSpecificationCanContinue[$userStore.magneticSpecificationSubsection]" data-cy="magnetic-synthesis-next-tool-button" class="btn btn-outline-primary  mt-2 col-sm-12 col-md-2 " @click="nextTool">{{$userStore.magneticSpecificationCanContinue[$userStore.magneticSpecificationSubsection]? 'Next tool' : 'Errors must be fixed'}}</button>
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
