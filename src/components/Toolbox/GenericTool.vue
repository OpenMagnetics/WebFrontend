<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import Storyline from '/src/components/Storyline.vue'
import { toTitleCase } from '/src/assets/js/utils.js'

import DesignRequirements from '/src/components/Toolbox/PowerDesignRequirements.vue'
import FilterDesignRequirements from '/src/components/Toolbox/FilterDesignRequirements.vue'
import OperatingPoints from '/src/components/Toolbox/OperatingPoints.vue'
import MagneticCoreAdviser from '/src/components/Toolbox/MagneticCoreAdviser.vue'
import CoreCustomizer from '/src/components/Toolbox/CoreCustomizer.vue'
import WireAdviser from '/src/components/Toolbox/WireAdviser.vue'
import MagneticAdviser from '/src/components/Toolbox/MagneticAdviser.vue'
import WireCustomizer from '/src/components/Toolbox/WireCustomizer.vue'
import CoilAdviser from '/src/components/Toolbox/CoilAdviser.vue'
import InsulationAdviser from '/src/components/Toolbox/InsulationAdviser.vue'
import MagneticSummary from '/src/components/Common/MagneticSummary.vue'
import MagneticCoreSummary from '/src/components/Toolbox/MagneticCoreAdviser/MagneticCoreSummary.vue'
import MagneticSpecificationsSummary from '/src/components/Toolbox/MagneticSpecificationsReport/MagneticSpecificationsSummary.vue'
import MagneticBuilder from '/src/components/Toolbox/MagneticBuilder.vue'
import ControlPanel from '/src/components/Toolbox/ControlPanel.vue'
import Welcome from '/src/components/Toolbox/Welcome.vue'
import ToolSelector from '/src/components/Toolbox/ToolSelector.vue'
import Settings from '/src/components/Toolbox/Settings.vue'

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
        showTitle: {
            type: Boolean,
            default: true,
        },
        showControlPanel: {
            type: Boolean,
            default: false,
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
            console.log(`${this.toolLabel}Subsection`)

            return this.currentStoryline[this.$userStore[`${this.toolLabel}Subsection`]].basicTool != null;
        },
        updateCanContinue(tool, value) {
            this.$userStore[`${this.toolLabel}CanContinue`][tool] = value;
            this.updateStoryline += 1;
        },
        changeTool(tool) {
            this.$userStore[`${this.toolLabel}Subsection`] = tool;
        },
        toolSelected(tool) {
            this.$emit('toolSelected', tool);
        },
        onSettingsUpdated(event) {
        },
        isMobile() {
            if( window.innerWidth <= 760 ) {
                return true;
            }
            else {
                return false;
            }
        },
    },
    computed: {
    },
    mounted() {
    },
    created() {
        console.log(this.currentStoryline)
        console.log(`${this.toolLabel}Subsection`)
        console.log(this.$userStore[`${this.toolLabel}Subsection`])
    },
}
</script>

<template>
    <div class="d-flex flex-column min-vh-100">
        <Header />
        <Settings 
            :modalName="'StorylineSettingsModal'"
            @onSettingsUpdated="onSettingsUpdated"
        />
        <main role="main" class="main">
            <div v-if="currentStoryline[$userStore[`${toolLabel}Subsection`]] != null" class="container mx-auto">
                <div class="row">
                    <div class="text-white text-center col-xs-12 col-sm-12 col-md-1 bg-transparent border border-primary m-0 pb-2" style="height: fit-content">
                        <h4 class="text-center">Storyline</h4>
                        <Storyline
                            :selectedTool="$userStore[`${toolLabel}Subsection`]"
                            :storyline="currentStoryline"
                            :canContinue="$userStore[`${toolLabel}CanContinue`]"
                            :forceUpdate="updateStoryline"
                            :showAvoidOption="currentStoryline[$userStore[`${toolLabel}Subsection`]].title=='Welcome'"
                            @changeTool="changeTool"
                            @nextTool="nextTool"
                        />
                    </div>
                    <div class="text-white bg-dark text-center col-xs-12 col-sm-12 col-md-11 bg-transparent px container" >
                        <div class="mb-2 row px-3" >

                            <div data-cy="magnetic-synthesis-previous-tool-button-placeholder" class=" col-sm-12 col-md-2 mt-1"></div>
                            <h2 v-if="showTitle" data-cy="magnetic-synthesis-title-text" :class="showControlPanel? 'col-sm-12 col-md-4 col-lg-4' : 'col-sm-12 col-md-9'" class="" >
                                {{toTitleCase($userStore[`${toolLabel}Subsection`])}}
                            </h2>
                            <div v-if="showControlPanel" data-cy="magnetic-synthesis-title-control-panel" :class="showTitle? 'col-sm-12 col-md-6 col-lg-6 col-xl-6' : 'col-sm-12 col-md-9'">
                                <ControlPanel @toolSelected="toolSelected"/>
                            </div>
                        </div>
                            
                        <div class="row">
                            <Welcome @canContinue="updateCanContinue('welcome', $event)" :dataTestLabel="`${dataTestLabel}-Welcome`" v-if="$userStore[`${toolLabel}Subsection`] == 'welcome'"/>
                            <ToolSelector @toolSelected="toolSelected" :dataTestLabel="`${dataTestLabel}-ToolSelector`" v-if="$userStore[`${toolLabel}Subsection`] == 'toolSelector'"/>
                            <DesignRequirements @canContinue="updateCanContinue('designRequirements', $event)" :dataTestLabel="`${dataTestLabel}-DesignRequirements`" v-if="$userStore[`${toolLabel}Subsection`] == 'designRequirements'"/>
                            <FilterDesignRequirements @canContinue="updateCanContinue('filterDesignRequirements', $event)" :dataTestLabel="`${dataTestLabel}-FilterDesignRequirements`" v-if="$userStore[`${toolLabel}Subsection`] == 'filterDesignRequirements'"/>
                            <OperatingPoints @canContinue="updateCanContinue('operatingPoints', $event)" @changeTool="changeTool" :dataTestLabel="`${dataTestLabel}-OperatingPoints`" v-if="$userStore[`${toolLabel}Subsection`] == 'operatingPoints'"/>
                            <MagneticCoreAdviser @canContinue="updateCanContinue('magneticCoreAdviser', $event)" :dataTestLabel="`${dataTestLabel}-MagneticmagneticCoreAdviser`" v-if="$userStore[`${toolLabel}Subsection`] == 'magneticCoreAdviser'"/>
                            <MagneticAdviser @canContinue="updateCanContinue('magneticAdviser', $event)" :dataTestLabel="`${dataTestLabel}-MagneticAdviser`" v-if="$userStore[`${toolLabel}Subsection`] == 'magneticAdviser'"/>
                            <CoreCustomizer :dataTestLabel="`${dataTestLabel}-CoreCustomizer`" v-if="$userStore[`${toolLabel}Subsection`] == 'coreCustomizer'"/>
                            <WireAdviser :dataTestLabel="`${dataTestLabel}-WireAdviser`" v-if="$userStore[`${toolLabel}Subsection`] == 'wireAdviser'"/>
                            <WireCustomizer :dataTestLabel="`${dataTestLabel}-WireCustomizer`" v-if="$userStore[`${toolLabel}Subsection`] == 'wireCustomizer'"/>
                            <InsulationAdviser :dataTestLabel="`${dataTestLabel}-InsulationAdviser`" v-if="$userStore[`${toolLabel}Subsection`] == 'insulationRequirements'"/>
                            <MagneticBuilder @canContinue="updateCanContinue('magneticBuilder', $event)" :dataTestLabel="`${dataTestLabel}-MagneticBuilder`" v-if="$userStore[`${toolLabel}Subsection`] == 'magneticBuilder'"/>
                            <MagneticSummary :dataTestLabel="`${dataTestLabel}-MagneticSummary`" v-if="$userStore[`${toolLabel}Subsection`] == 'magneticSummary'"/>
                            <MagneticCoreSummary :dataTestLabel="`${dataTestLabel}-MagneticFinalizer`" v-if="$userStore[`${toolLabel}Subsection`] == 'magneticCoreSummary'"/>
                            <MagneticSpecificationsSummary :dataTestLabel="`${dataTestLabel}-MagneticSpecificationsSummary`" v-if="$userStore[`${toolLabel}Subsection`] == 'magneticSpecificationsSummary'"/>
                        </div>
                    </div>
                </div>
            </div>
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>


<style lang="css">


</style>
