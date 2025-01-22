<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import Storyline from '/src/components/Storyline.vue'
import { toTitleCase } from '/WebSharedComponents/assets/js/utils.js'

import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
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
import MagneticSummary from '/WebSharedComponents/Common/MagneticSummary.vue'
import MagneticCoreSummary from '/src/components/Toolbox/MagneticCoreAdviser/MagneticCoreSummary.vue'
import MagneticSpecificationsSummary from '/src/components/Toolbox/MagneticSpecificationsReport/MagneticSpecificationsSummary.vue'
import MagneticBuilder from '/MagneticBuilder/src/components/MagneticBuilder.vue'
import ControlPanel from '/src/components/Toolbox/ControlPanel.vue'
import Welcome from '/src/components/Toolbox/Welcome.vue'
import ToolSelector from '/src/components/Toolbox/ToolSelector.vue'
import Settings from '/src/components/Toolbox/Settings.vue'

import { useMasStore } from '/src/stores/mas'

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
        const masStore = useMasStore();
        const localData = {
            operatingPoint: 0
        };

        if (masStore.mas.inputs.operatingPoints[masStore.currentOperatingPoint] != null)
            localData["operatingPoint"] = masStore.mas.inputs.operatingPoints[masStore.currentOperatingPoint].name
        return {
            masStore,
            localData,
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
        operatingPointUpdated(name, ea) {
            this.masStore.mas.inputs.operatingPoints.forEach((elem, index) => {
                if (name == elem.name) {
                    this.masStore.currentOperatingPoint = index;
                }
            })
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
        operatingPointNames() {
            const names = [];
            this.masStore.mas.inputs.operatingPoints.forEach((elem) => {
                names.push(elem.name);
            })
            return names;
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
        <Settings 
            :modalName="'StorylineSettingsModal'"
            @onSettingsUpdated="onSettingsUpdated"
        />
        <main role="main" class="main text-white">
            <div v-if="currentStoryline[$userStore[`${toolLabel}Subsection`]] != null && $userStore[`${toolLabel}CanContinue`] != null" class="container mx-auto">
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

                            <ElementFromList
                                v-if="operatingPointNames.length > 1"
                                class="col-3 mb-1 text-start"
                                :dataTestLabel="dataTestLabel + '-OperatingPointSelector'"
                                :name="'operatingPoint'"
                                :replaceTitle="'Op. Point'"
                                :titleSameRow="true"
                                :justifyContent="true"
                                v-model="localData"
                                :options="operatingPointNames"
                                :labelStyleClass="'col-4'"
                                :selectStyleClass="'col-8'"
                                :labelBgColor="$settingsStore.labelBgColor"
                                :inputBgColor="$settingsStore.inputBgColor"
                                :textColor="$settingsStore.textColor"
                                @update="operatingPointUpdated"
                            />
                            <div v-else data-cy="magnetic-synthesis-previous-tool-button-placeholder" class=" col-sm-12 col-md-2 mt-1"></div>
                            <h2 v-if="showTitle" data-cy="magnetic-synthesis-title-text" :class="showControlPanel? 'col-sm-12 col-md-3 col-lg-3' : 'col-sm-12 col-md-9'" class="" >
                                {{toTitleCase($userStore[`${toolLabel}Subsection`])}}
                            </h2>

                            <div v-if="showControlPanel" data-cy="magnetic-synthesis-title-control-panel" :class="showTitle? 'col-sm-12 col-md-6 col-lg-6 col-xl-6' : 'col-sm-12 col-md-9'">
                                <ControlPanel @toolSelected="toolSelected"/>
                            </div>
                        </div>
                            
                        <div class="row">
                            <Welcome
                                v-if="$userStore[`${toolLabel}Subsection`] == 'welcome'"
                                :dataTestLabel="`${dataTestLabel}-Welcome`"
                                @canContinue="updateCanContinue('welcome', $event)"
                            />
                            <ToolSelector
                                v-if="$userStore[`${toolLabel}Subsection`] == 'toolSelector'"
                                :dataTestLabel="`${dataTestLabel}-ToolSelector`"
                                :acSweepSelected="masStore.magneticAcSweepOperatingPoints"
                                @toolSelected="toolSelected"
                            />
                            <DesignRequirements
                                v-if="$userStore[`${toolLabel}Subsection`] == 'designRequirements'"
                                :dataTestLabel="`${dataTestLabel}-DesignRequirements`"
                                @canContinue="updateCanContinue('designRequirements', $event)"
                            />
                            <FilterDesignRequirements
                                v-if="$userStore[`${toolLabel}Subsection`] == 'filterDesignRequirements'"
                                :dataTestLabel="`${dataTestLabel}-FilterDesignRequirements`"
                                @canContinue="updateCanContinue('filterDesignRequirements', $event)"
                            />
                            <OperatingPoints
                                v-if="$userStore[`${toolLabel}Subsection`] == 'operatingPoints'"
                                :dataTestLabel="`${dataTestLabel}-OperatingPoints`"
                                @canContinue="updateCanContinue('operatingPoints', $event)" 
                                @changeTool="changeTool"
                            />
                            <MagneticCoreAdviser
                                v-if="$userStore[`${toolLabel}Subsection`] == 'magneticCoreAdviser'"
                                :dataTestLabel="`${dataTestLabel}-MagneticmagneticCoreAdviser`"
                                @canContinue="updateCanContinue('magneticCoreAdviser', $event)"
                            />
                            <MagneticAdviser
                                v-if="$userStore[`${toolLabel}Subsection`] == 'magneticAdviser'"
                                :dataTestLabel="`${dataTestLabel}-MagneticAdviser`"
                                @canContinue="updateCanContinue('magneticAdviser', $event)"
                            />
                            <CoreCustomizer
                                v-if="$userStore[`${toolLabel}Subsection`] == 'coreCustomizer'"
                                :dataTestLabel="`${dataTestLabel}-CoreCustomizer`"
                            />
                            <WireAdviser
                                v-if="$userStore[`${toolLabel}Subsection`] == 'wireAdviser'"
                                :dataTestLabel="`${dataTestLabel}-WireAdviser`"
                            />
                            <WireCustomizer
                                v-if="$userStore[`${toolLabel}Subsection`] == 'wireCustomizer'"
                                :dataTestLabel="`${dataTestLabel}-WireCustomizer`"
                            />
                            <InsulationAdviser
                                v-if="$userStore[`${toolLabel}Subsection`] == 'insulationRequirements'"
                                :dataTestLabel="`${dataTestLabel}-InsulationAdviser`"
                            />
                            <MagneticBuilder 
                                v-if="$userStore[`${toolLabel}Subsection`] == 'magneticBuilder'"
                                :masStore="masStore"
                                :readOnly="false"
                                :mkf="$mkf"
                                :mkfAdvisers="$mkfAdvisers"
                                :operatingPointIndex="masStore.currentOperatingPoint"
                                :dataTestLabel="`${dataTestLabel}-MagneticBuilder`"
                                :useVisualizers="true"
                                :enableCoil="true"
                                :enableGraphs="masStore.magneticAcSweepOperatingPoints"
                                :enableAdvisers="!masStore.magneticAcSweepOperatingPoints"
                                :enableSimulation="!masStore.magneticAcSweepOperatingPoints"
                                @canContinue="updateCanContinue('magneticBuilder', $event)"
                            />
                            <MagneticSummary
                                v-if="$userStore[`${toolLabel}Subsection`] == 'magneticSummary'"
                                :mas="masStore.mas"
                                :dataTestLabel="`${dataTestLabel}-MagneticSummary`"
                            />
                            <MagneticCoreSummary
                                v-if="$userStore[`${toolLabel}Subsection`] == 'magneticCoreSummary'"
                                :dataTestLabel="`${dataTestLabel}-MagneticFinalizer`"
                            />
                            <MagneticSpecificationsSummary
                                v-if="$userStore[`${toolLabel}Subsection`] == 'magneticSpecificationsSummary'"
                                :dataTestLabel="`${dataTestLabel}-MagneticSpecificationsSummary`"
                            />
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
