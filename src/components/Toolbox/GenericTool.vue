<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import Storyline from '/src/components/Storyline.vue'
import ContextMenu from '/src/components/ContextMenu.vue'
import { toTitleCase } from '/WebSharedComponents/assets/js/utils.js'

import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import DesignRequirements from '/src/components/Toolbox/PowerDesignRequirements.vue'
import FilterDesignRequirements from '/src/components/Toolbox/FilterDesignRequirements.vue'
import CatalogDesignRequirements from '/src/components/Toolbox/CatalogDesignRequirements.vue'
import OperatingPoints from '/src/components/Toolbox/OperatingPoints.vue'
import MagneticCoreAdviser from '/src/components/Toolbox/MagneticCoreAdviser.vue'
import CoreCustomizer from '/src/components/Toolbox/CoreCustomizer.vue'
import WireAdviser from '/src/components/Toolbox/WireAdviser.vue'
import MagneticAdviser from '/src/components/Toolbox/MagneticAdviser.vue'
import CatalogAdviser from '/src/components/Toolbox/CatalogAdviser.vue'
import WireCustomizer from '/src/components/Toolbox/WireCustomizer.vue'
import CoilAdviser from '/src/components/Toolbox/CoilAdviser.vue'
import InsulationAdviser from '/src/components/Toolbox/InsulationAdviser.vue'
import MagneticSummary from '/WebSharedComponents/Common/MagneticSummary.vue'
import MagneticCoreSummary from '/src/components/Toolbox/MagneticCoreAdviser/MagneticCoreSummary.vue'
import MagneticSpecificationsSummary from '/src/components/Toolbox/MagneticSpecificationsReport/MagneticSpecificationsSummary.vue'
import MagneticBuilder from '/MagneticBuilder/src/components/MagneticBuilder.vue'
import ControlPanel from '/MagneticBuilder/src/components/ControlPanel.vue'
import Welcome from '/src/components/Toolbox/Welcome.vue'
import ToolSelector from '/src/components/Toolbox/ToolSelector.vue'

import { useMasStore } from '/src/stores/mas'

</script>

<script>
export default {
    emits: ["toolSelected"],
    props: {
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
        showReference: {
            type: Boolean,
            default: false,
        },
        showControlPanel: {
            type: Boolean,
            default: false,
        },
        showStoryline: {
            type: Boolean,
            default: true,
        },
    },
    data() {
        const masStore = useMasStore();
        const localData = {
            operatingPoint: 0
        };

        if (masStore.mas.inputs.operatingPoints[this.$stateStore.currentOperatingPoint] != null)
            localData["operatingPoint"] = masStore.mas.inputs.operatingPoints[this.$stateStore.currentOperatingPoint].name
        return {
            masStore,
            localData,
            updateStoryline: 0,
        }
    },
    methods: {
        prevTool(event) {
            if (this.currentStoryline[this.$userStore.getCurrentToolState().subsection].prevTool != null) {
                this.$userStore.getCurrentToolState().subsection = this.currentStoryline[this.$userStore.getCurrentToolState().subsection].prevTool;
            }
        },
        nextTool(event) {
            if (this.currentStoryline[this.$userStore.getCurrentToolState().subsection].nextTool != null) {
                this.$userStore.getCurrentToolState().subsection = this.currentStoryline[this.$userStore.getCurrentToolState().subsection].nextTool;
            }
        },
        advancedTool(event) {
            if (this.currentStoryline[this.$userStore.getCurrentToolState().subsection].advancedTool != null) {
                this.$userStore.getCurrentToolState().subsection = this.currentStoryline[this.$userStore.getCurrentToolState().subsection].advancedTool;
            }
        },
        basicTool(event) {
            if (this.currentStoryline[this.$userStore.getCurrentToolState().subsection].basicTool != null) {
                this.$userStore.getCurrentToolState().subsection = this.currentStoryline[this.$userStore.getCurrentToolState().subsection].basicTool;
            }
        },
        traversableRight() {
            return this.currentStoryline[this.$userStore.getCurrentToolState().subsection].advancedTool != null;
        },
        traversableLeft() {
            console.log(this.$userStore.getCurrentToolState().subsection)

            return this.currentStoryline[this.$userStore.getCurrentToolState().subsection].basicTool != null;
        },
        updateCanContinue(tool, value) {
            this.$userStore.getCurrentToolState().canContinue[tool] = value;
            this.updateStoryline += 1;
        },
        changeTool(tool) {
            this.$userStore.getCurrentToolState().subsection = tool;
        },
        toolSelected(tool) {
            this.$emit('toolSelected', tool); 
        },
        operatingPointUpdated(name, ea) {
            this.masStore.mas.inputs.operatingPoints.forEach((elem, index) => {
                if (name == elem.name) {
                    this.$stateStore.currentOperatingPoint = index;
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
        },
        enableGraphs() {
            if (this.$userStore.selectedTool == 'catalogAdviser') {
                if (this.$userStore.getCurrentToolState().subsection == 'magneticViewer')
                    return true;
                if (this.$userStore.getCurrentToolState().subsection == 'magneticBuilder')
                    return true;
                return false;
            }
            else{
                return this.$stateStore.operatingPoints.modePerPoint[this.$stateStore.currentOperatingPoint] === this.$stateStore.OperatingPointsMode.AcSweep;
            }
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
        <main role="main" class="main text-white">
            <div v-if="currentStoryline[$userStore.getCurrentToolState().subsection] != null && $userStore.getCurrentToolState().canContinue != null" class="container mx-auto">
                <div class="row">
                    <div v-if="showStoryline" class="text-white text-center col-xs-12 col-sm-12 col-md-1 bg-transparent m-0 p-0" style="height: fit-content">
                        <div class="border border-primary " style="height: fit-content">
                            <Storyline
                                class="p-3"
                                :selectedTool="$userStore.getCurrentToolState().subsection"
                                :storyline="currentStoryline"
                                :canContinue="$userStore.getCurrentToolState().canContinue"
                                :forceUpdate="updateStoryline"
                                :showAvoidOption="currentStoryline[$userStore.getCurrentToolState().subsection].title=='Welcome'"
                                @changeTool="changeTool"
                                @nextTool="nextTool"
                            />
                        </div>
                        <div class="border border-primary mt-2" style="height: fit-content">
                            <h4 class="text-center pt-2 fs-5">Tool menu</h4>
                            <ContextMenu
                                :showAdviserSettingsOption="$userStore.getCurrentToolState().subsection == 'magneticAdviser' || $userStore.getCurrentToolState().subsection == 'magneticCoreAdviser' || $userStore.getCurrentToolState().subsection == 'magneticBuilder'"
                                :showCatalogAdviserSettingsOption="$userStore.selectedApplication == 'catalog'"
                                :showOperatingPointSettingsOption="$userStore.getCurrentToolState().subsection == 'operatingPoints'"
                                :showEditOption="$userStore.getCurrentToolState().subsection == 'magneticViewer'"
                                :showOrderOption="$userStore.selectedApplication == 'catalog' && ($userStore.getCurrentToolState().subsection == 'magneticViewer')"
                                :showConfirmOption="$userStore.selectedApplication == 'catalog' && $userStore.getCurrentToolState().subsection == 'magneticBuilder'"
                                @editMagnetic="$emit('editMagnetic')"
                                @viewMagnetic="$emit('viewMagnetic')"
                            />
                        </div>
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
                                :labelWidthProportionClass="'col-4'"
                                :selectStyleClass="'col-8'"
                                :labelBgColor="$settingsStore.labelBgColor"
                                :valueBgColor="$settingsStore.valueBgColor"
                                :textColor="$settingsStore.textColor"
                                @update="operatingPointUpdated"
                            />
                            <div v-else data-cy="magnetic-synthesis-previous-tool-button-placeholder" class=" col-sm-12 col-md-2 mt-1"></div>
                            <h2 v-if="showTitle" data-cy="magnetic-synthesis-title-text" :class="showControlPanel? 'col-sm-12 col-md-4 col-lg-4' : 'col-sm-12 col-md-9'" class="" >
                                {{toTitleCase($userStore.getCurrentToolState().subsection)}}
                            </h2>

                            <div v-if="showControlPanel" data-cy="magnetic-synthesis-title-control-panel" :class="(showTitle || showReference)? 'col-sm-12 col-md-6 col-lg-6 col-xl-6' : 'col-sm-12 col-md-9'">
                                <ControlPanel @toolSelected="toolSelected"/>
                            </div>
                        </div>
                            
                        <div class="row">
                            <Welcome
                                v-if="$userStore.getCurrentToolState().subsection == 'welcome'"
                                :dataTestLabel="`${dataTestLabel}-Welcome`"
                                @canContinue="updateCanContinue('welcome', $event)"
                            />
                            <ToolSelector
                                v-if="$userStore.getCurrentToolState().subsection == 'toolSelector'"
                                :dataTestLabel="`${dataTestLabel}-ToolSelector`"
                                :acSweepSelected="$stateStore.operatingPoints.modePerPoint[$stateStore.currentOperatingPoint] === $stateStore.OperatingPointsMode.AcSweep"
                                @toolSelected="toolSelected"
                            />
                            <DesignRequirements
                                v-if="$userStore.getCurrentToolState().subsection == 'designRequirements' && $userStore.selectedApplication == 'power'"
                                :dataTestLabel="`${dataTestLabel}-DesignRequirements`"
                                @canContinue="updateCanContinue('designRequirements', $event)"
                            />
                            <FilterDesignRequirements
                                v-if="$userStore.getCurrentToolState().subsection == 'designRequirements' && $userStore.selectedApplication == 'filter'"
                                :dataTestLabel="`${dataTestLabel}-FilterDesignRequirements`"
                                @canContinue="updateCanContinue('designRequirements', $event)"
                            />
                            <CatalogDesignRequirements
                                v-if="$userStore.getCurrentToolState().subsection == 'designRequirements' && $userStore.selectedApplication == 'catalog'"
                                :dataTestLabel="`${dataTestLabel}-CatalogDesignRequirements`"
                                @canContinue="updateCanContinue('designRequirements', $event)"
                            />
                            <OperatingPoints
                                v-if="$userStore.getCurrentToolState().subsection == 'operatingPoints'"
                                :dataTestLabel="`${dataTestLabel}-OperatingPoints`"
                                @canContinue="updateCanContinue('operatingPoints', $event)" 
                                @changeTool="changeTool"
                            />
                            <MagneticCoreAdviser
                                v-if="$userStore.getCurrentToolState().subsection == 'magneticCoreAdviser'"
                                :dataTestLabel="`${dataTestLabel}-MagneticmagneticCoreAdviser`"
                                @canContinue="updateCanContinue('magneticCoreAdviser', $event)"
                            />
                            <MagneticAdviser
                                v-if="$userStore.getCurrentToolState().subsection == 'magneticAdviser'"
                                :dataTestLabel="`${dataTestLabel}-MagneticAdviser`"
                                @canContinue="updateCanContinue('magneticAdviser', $event)"
                            />
                            <CatalogAdviser
                                v-if="$userStore.getCurrentToolState().subsection == 'catalogAdviser'"
                                :dataTestLabel="`${dataTestLabel}-CatalogAdviser`"
                                @canContinue="updateCanContinue('catalogAdviser', $event)"
                            />
                            <CoreCustomizer
                                v-if="$userStore.getCurrentToolState().subsection == 'coreCustomizer'"
                                :dataTestLabel="`${dataTestLabel}-CoreCustomizer`"
                            />
                            <WireAdviser
                                v-if="$userStore.getCurrentToolState().subsection == 'wireAdviser'"
                                :dataTestLabel="`${dataTestLabel}-WireAdviser`"
                            />
                            <WireCustomizer
                                v-if="$userStore.getCurrentToolState().subsection == 'wireCustomizer'"
                                :dataTestLabel="`${dataTestLabel}-WireCustomizer`"
                            />
                            <InsulationAdviser
                                v-if="$userStore.getCurrentToolState().subsection == 'insulationRequirements'"
                                :dataTestLabel="`${dataTestLabel}-InsulationAdviser`"
                            />
                            <MagneticBuilder 
                                v-if="$userStore.getCurrentToolState().subsection == 'magneticBuilder' || 
                                      $userStore.getCurrentToolState().subsection == 'magneticViewer'"
                                :masStore="masStore"
                                :operatingPointIndex="$stateStore.currentOperatingPoint"
                                :dataTestLabel="`${dataTestLabel}-MagneticBuilder`"
                                :useVisualizers="true"
                                :enableCoil="true"
                                :readOnly="$userStore.getCurrentToolState().subsection == 'magneticViewer'"
                                :enableGraphs="enableGraphs"
                                :enableAdvisers="$stateStore.operatingPoints.modePerPoint[$stateStore.currentOperatingPoint] !== $stateStore.OperatingPointsMode.AcSweep"
                                :enableSimulation="$stateStore.operatingPoints.modePerPoint[$stateStore.currentOperatingPoint] !== $stateStore.OperatingPointsMode.AcSweep"
                                @canContinue="updateCanContinue('magneticBuilder', $event)"
                            />
                            <MagneticSummary
                                v-if="$userStore.getCurrentToolState().subsection == 'magneticSummary'"
                                :mas="masStore.mas"
                                :dataTestLabel="`${dataTestLabel}-MagneticSummary`"
                            />
                            <MagneticCoreSummary
                                v-if="$userStore.getCurrentToolState().subsection == 'magneticCoreSummary'"
                                :dataTestLabel="`${dataTestLabel}-MagneticFinalizer`"
                            />
                            <MagneticSpecificationsSummary
                                v-if="$userStore.getCurrentToolState().subsection == 'magneticSpecificationsSummary'"
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
