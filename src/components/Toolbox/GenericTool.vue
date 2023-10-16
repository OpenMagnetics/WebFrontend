<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import Storyline from '/src/components/Storyline.vue'
import { toTitleCase } from '/src/assets/js/utils.js'

import DesignRequirements from '/src/components/Toolbox/DesignRequirements.vue'
import OperatingPoints from '/src/components/Toolbox/OperatingPoints.vue'
import CoreAdviser from '/src/components/Toolbox/CoreAdviser.vue'
import CoreCustomizer from '/src/components/Toolbox/CoreCustomizer.vue'
import WireAdviser from '/src/components/Toolbox/WireAdviser.vue'
import WireCustomizer from '/src/components/Toolbox/WireCustomizer.vue'
import CoilAdviser from '/src/components/Toolbox/CoilAdviser.vue'
import MagneticSynthesisFinalizer from '/src/components/Toolbox/MagneticSynthesisFinalizer.vue'
import MagneticCoreFinalizer from '/src/components/Toolbox/MagneticCoreFinalizer.vue'
import MagneticSpecificationFinalizer from '/src/components/Toolbox/MagneticSpecificationFinalizer.vue'

</script>

<script>
export default {
    props: {
        toolLabel: {
            type: String,
            default: 'magneticCoreAdviser',
        },
        currentStoryline: {
            type: Object,
            required: true,
        },
        dataTestLabel: {
            type: String,
            default: 'MagneticCoreAdviser',
        },
    },
    data() {
        return {
            updateStoryline: 0,
        }
    },
    methods: {
        prevTool(event) {
            if (this.currentStoryline[this.$userStore[`${this.toolLabel}Subsection`]].prevTool != null) {
                this.$userStore[`${this.toolLabel}Subsection`] = this.currentStoryline[this.$userStore[`${this.toolLabel}Subsection`]].prevTool;
            }
        },
        nextTool(event) {
            if (this.currentStoryline[this.$userStore[`${this.toolLabel}Subsection`]].nextTool != null) {
                this.$userStore[`${this.toolLabel}Subsection`] = this.currentStoryline[this.$userStore[`${this.toolLabel}Subsection`]].nextTool;
            }
        },
        advancedTool(event) {
            if (this.currentStoryline[this.$userStore[`${this.toolLabel}Subsection`]].advancedTool != null) {
                this.$userStore[`${this.toolLabel}Subsection`] = this.currentStoryline[this.$userStore[`${this.toolLabel}Subsection`]].advancedTool;
            }
        },
        basicTool(event) {
            if (this.currentStoryline[this.$userStore[`${this.toolLabel}Subsection`]].basicTool != null) {
                this.$userStore[`${this.toolLabel}Subsection`] = this.currentStoryline[this.$userStore[`${this.toolLabel}Subsection`]].basicTool;
            }
        },
        traversableRight() {
            return this.currentStoryline[this.$userStore[`${this.toolLabel}Subsection`]].advancedTool != null;
        },
        traversableLeft() {
            return this.currentStoryline[this.$userStore[`${this.toolLabel}Subsection`]].basicTool != null;
        },
        updateCanContinue(tool, value) {
            this.$userStore[`${this.toolLabel}CanContinue`][tool] = value;
            this.updateStoryline += 1;
        },
        changeTool(tool) {
            this.$userStore[`${this.toolLabel}Subsection`] = tool;
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
                        <Storyline :selectedTool="$userStore[`${toolLabel}Subsection`]" :storyline="currentStoryline" :canContinue="$userStore[`${toolLabel}CanContinue`]" @changeTool="changeTool" :forceUpdate="updateStoryline"/>
                    </div>
                    <div class="tool text-white bg-dark text-center offset-1 col-11 bg-light px-3 container" >
                        <div class="mb-2 row" >
                            <button data-cy="magnetic-synthesis-previous-tool-button" class="btn btn-outline-primary col-sm-12 col-md-2 mt-1"  @click="prevTool"> Previous tool</button>
                            <h2 data-cy="magnetic-synthesis-title-text" class="col-sm-12 col-md-9" >
                                {{toTitleCase($userStore[`${toolLabel}Subsection`])}}
                            </h2>
                        </div>
                            
                        <div class="row">
                            <DesignRequirements @canContinue="updateCanContinue('designRequirements', $event)" :dataTestLabel="`${dataTestLabel}-DesignRequirements`" v-if="$userStore[`${toolLabel}Subsection`] == 'designRequirements'"/>
                            <OperatingPoints @canContinue="updateCanContinue('operatingPoints', $event)" @changeTool="changeTool" :dataTestLabel="`${dataTestLabel}-OperatingPoints`" v-if="$userStore[`${toolLabel}Subsection`] == 'operatingPoints'"/>
                            <CoreAdviser @canContinue="updateCanContinue('coreAdviser', $event)" :dataTestLabel="`${dataTestLabel}-CoreAdviser`" v-if="$userStore[`${toolLabel}Subsection`] == 'coreAdviser'"/>
                            <CoreCustomizer :dataTestLabel="`${dataTestLabel}-CoreCustomizer`" v-if="$userStore[`${toolLabel}Subsection`] == 'coreCustomizer'"/>
                            <WireAdviser :dataTestLabel="`${dataTestLabel}-WireAdviser`" v-if="$userStore[`${toolLabel}Subsection`] == 'wireAdviser'"/>
                            <WireCustomizer :dataTestLabel="`${dataTestLabel}-WireCustomizer`" v-if="$userStore[`${toolLabel}Subsection`] == 'wireCustomizer'"/>
                            <CoilAdviser :dataTestLabel="`${dataTestLabel}-CoilAdviser`" v-if="$userStore[`${toolLabel}Subsection`] == 'coilAdviser'"/>
                            <MagneticSynthesisFinalizer :dataTestLabel="`${dataTestLabel}-MagneticFinalizer`" v-if="$userStore[`${toolLabel}Subsection`] == 'magneticSynthesisFinalizer'"/>
                            <MagneticCoreFinalizer :dataTestLabel="`${dataTestLabel}-MagneticFinalizer`" v-if="$userStore[`${toolLabel}Subsection`] == 'magneticCoreAdviserFinalizer'"/>
                            <MagneticSpecificationFinalizer :dataTestLabel="`${dataTestLabel}-MagneticFinalizer`" v-if="$userStore[`${toolLabel}Subsection`] == 'magneticSpecificationFinalizer'"/>
                        </div>
                        <div class="row">
                            <button v-if="!$userStore[`${toolLabel}Subsection`].includes('Finalizer')"  :disabled="!$userStore[`${toolLabel}CanContinue`][$userStore[`${toolLabel}Subsection`]]" data-cy="magnetic-synthesis-next-tool-button" class="btn btn-outline-primary  mt-2 col-sm-12 col-md-2 " @click="nextTool">{{$userStore[`${toolLabel}CanContinue`][$userStore[`${toolLabel}Subsection`]]? 'Next tool' : 'Errors must be fixed'}}</button>
                            <button  data-cy="magnetic-synthesis-main-tool-button" v-if="traversableLeft()" class="btn btn-outline-primary mt-2 offset-6 col-2" @click="basicTool"> Back to main tool</button>
                            <button  data-cy="magnetic-synthesis-customize-tool-button" v-if="traversableRight()" class="btn btn-outline-primary mt-2 col-2" :class="traversableLeft()? '' : 'offset-8'" @click="advancedTool"> Customize tool</button>
                        </div>
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
