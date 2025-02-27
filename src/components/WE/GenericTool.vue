<script setup>
import Header from './Header.vue'
import Storyline from '../Toolbox/Storyline.vue'
import ContextMenu from '../Toolbox/ContextMenu.vue'
import { toTitleCase } from '/WebSharedComponents/assets/js/utils.js'

import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import DesignRequirements from '../Toolbox/DesignRequirements.vue'
import OperatingPoints from '../Toolbox/OperatingPoints.vue'
import MagneticCoreAdviser from '../Toolbox/MagneticCoreAdviser.vue'
import CoreCustomizer from '../Toolbox/CoreCustomizer.vue'
import WireAdviser from '../Toolbox/WireAdviser.vue'
import MagneticAdviser from '../Toolbox/MagneticAdviser.vue'
import CatalogAdviser from '../Toolbox/CatalogAdviser.vue'
import WireCustomizer from '../Toolbox/WireCustomizer.vue'
import CoilAdviser from '../Toolbox/CoilAdviser.vue'
import InsulationAdviser from '../Toolbox/InsulationAdviser.vue'
import MagneticSummary from '../Toolbox/MagneticSummary.vue'
import MagneticCoreSummary from '../Toolbox/MagneticCoreAdviser/MagneticCoreSummary.vue'
import MagneticSpecificationsSummary from '../Toolbox/MagneticSpecificationsReport/MagneticSpecificationsSummary.vue'
import MagneticBuilder from '/MagneticBuilder/src/components/MagneticBuilder.vue'
import ControlPanel from '/MagneticBuilder/src/components/ControlPanel.vue'
import Welcome from '../Toolbox/Welcome.vue'
import ToolSelector from '../Toolbox/ToolSelector.vue'

import { useMasStore } from '../../stores/mas'

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
            localData["operatingPoint"] = masStore.mas.inputs.operatingPoints[this.$stateStore.currentOperatingPoint].name  + ' - ' + masStore.mas.inputs.operatingPoints[this.$stateStore.currentOperatingPoint].conditions.ambientTemperature + '°C';
        return {
            masStore,
            localData,
            updateStoryline: 0,
        }
    },
    methods: {
        prevTool(event) {
            if (this.currentStoryline[this.$stateStore.getCurrentToolState().subsection].prevTool != null) {
                this.$stateStore.getCurrentToolState().subsection = this.currentStoryline[this.$stateStore.getCurrentToolState().subsection].prevTool;
            }
        },
        nextTool(event) {
            if (this.currentStoryline[this.$stateStore.getCurrentToolState().subsection].nextTool != null) {
                this.$stateStore.getCurrentToolState().subsection = this.currentStoryline[this.$stateStore.getCurrentToolState().subsection].nextTool;
            }
        },
        advancedTool(event) {
            if (this.currentStoryline[this.$stateStore.getCurrentToolState().subsection].advancedTool != null) {
                this.$stateStore.getCurrentToolState().subsection = this.currentStoryline[this.$stateStore.getCurrentToolState().subsection].advancedTool;
            }
        },
        basicTool(event) {
            if (this.currentStoryline[this.$stateStore.getCurrentToolState().subsection].basicTool != null) {
                this.$stateStore.getCurrentToolState().subsection = this.currentStoryline[this.$stateStore.getCurrentToolState().subsection].basicTool;
            }
        },
        traversableRight() {
            return this.currentStoryline[this.$stateStore.getCurrentToolState().subsection].advancedTool != null;
        },
        traversableLeft() {
            return this.currentStoryline[this.$stateStore.getCurrentToolState().subsection].basicTool != null;
        },
        updateCanContinue(tool, value) {
            this.$stateStore.getCurrentToolState().canContinue[tool] = value;
            this.updateStoryline += 1;
        },
        changeTool(tool) {
            this.$stateStore.getCurrentToolState().subsection = tool;
        },
        toolSelected(tool) {
            this.$emit('toolSelected', tool); 
        },
        operatingPointUpdated(name, ea) {
            this.masStore.mas.inputs.operatingPoints.forEach((elem, index) => {
                if (name.includes(elem.name)) {
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
                names.push(elem.name + ' - ' + elem.conditions.ambientTemperature + '°C');
            })
            return names;
        },
        enableGraphs() {
            if (this.$stateStore.selectedTool == 'catalogAdviser') {
                if (this.$stateStore.getCurrentToolState().subsection == 'magneticViewer')
                    return true;
                if (this.$stateStore.getCurrentToolState().subsection == 'magneticBuilder')
                    return true;
                return false;
            }
            else{
                return true;
                // return this.$stateStore.operatingPoints.modePerPoint[this.$stateStore.currentOperatingPoint] === this.$stateStore.OperatingPointsMode.AcSweep;
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
    <div class="d-flex flex-column min-vh-100" :style="$styleStore.main">
        <Header />
        <main role="main" class="main" :style="$styleStore.main">
            <div v-if="currentStoryline[$stateStore.getCurrentToolState().subsection] != null && $stateStore.getCurrentToolState().canContinue != null" class="container mx-auto">
                <div class="row">
                    <div v-if="showStoryline" class=" text-center col-xs-12 col-sm-12 col-md-1 bg-transparent m-0 p-0" style="height: fit-content">
                        <div class="border" style="height: fit-content"  :style="$styleStore.storyline.main">
                            <Storyline
                                class="p-3"
                                :selectedTool="$stateStore.getCurrentToolState().subsection"
                                :storyline="currentStoryline"
                                :canContinue="$stateStore.getCurrentToolState().canContinue"
                                :forceUpdate="updateStoryline"
                                :showAvoidOption="currentStoryline[$stateStore.getCurrentToolState().subsection].title=='Welcome'"
                                @changeTool="changeTool"
                                @nextTool="nextTool"
                            />
                        </div>
                        <div class="border mt-2" style="height: fit-content" :style="$styleStore.contextMenu.main">
                            <ContextMenu
                                :showMagneticBuilderSettingsOption="$stateStore.getCurrentToolState().subsection == 'magneticBuilder'"
                                :showAdviserSettingsOption="$stateStore.getCurrentToolState().subsection == 'magneticAdviser' || $stateStore.getCurrentToolState().subsection == 'magneticCoreAdviser'"
                                :showCatalogAdviserSettingsOption="$stateStore.selectedWorkflow == 'catalog'"
                                :showOperatingPointSettingsOption="$stateStore.getCurrentToolState().subsection == 'operatingPoints'"
                                :showEditOption="$stateStore.getCurrentToolState().subsection == 'magneticViewer'"
                                :showOrderOption="$stateStore.selectedWorkflow == 'catalog' && ($stateStore.getCurrentToolState().subsection == 'magneticViewer')"
                                :showChangeToolOption="$stateStore.getCurrentToolState().subsection == 'magneticCoreAdviser' || $stateStore.getCurrentToolState().subsection == 'magneticAdviser' || $stateStore.getCurrentToolState().subsection == 'magneticBuilder' || $stateStore.getCurrentToolState().subsection == 'magneticSpecificationsSummary'"
                                :showConfirmOption="$stateStore.selectedWorkflow == 'catalog' && $stateStore.getCurrentToolState().subsection == 'magneticBuilder'"
                                @editMagnetic="$emit('editMagnetic')"
                                @viewMagnetic="$emit('viewMagnetic')"
                                @toolSelected="toolSelected"
                            />
                        </div>
                    </div>
                    <div class="text-center col-xs-12 col-sm-12 col-md-11 bg-transparent px container" >
                        <div class="mb-2 row px-3" >

                            <ElementFromList
                                v-if="operatingPointNames.length > 1 && ($stateStore.getCurrentToolState().subsection == 'magneticBuilder' || $stateStore.getCurrentToolState().subsection == 'magneticViewer') "
                                class="col-2 mb-1 text-start"
                                :dataTestLabel="dataTestLabel + '-OperatingPointSelector'"
                                :name="'operatingPoint'"
                                :replaceTitle="''"
                                :titleSameRow="true"
                                :justifyContent="true"
                                v-model="localData"
                                :options="operatingPointNames"
                                :labelWidthProportionClass="'col-0'"
                                :selectStyleClass="'col-12'"
                                :valueFontSize="$styleStore.magneticBuilder.inputFontSize"
                                :labelFontSize="$styleStore.magneticBuilder.inputFontSize"
                                :labelBgColor="$styleStore.magneticBuilder.inputLabelBgColor"
                                :valueBgColor="$styleStore.magneticBuilder.inputValueBgColor"
                                :textColor="$styleStore.magneticBuilder.inputTextColor"
                                @update="operatingPointUpdated"
                            />
                            <div v-else data-cy="magnetic-synthesis-previous-tool-button-placeholder" class=" col-sm-12 col-md-2 mt-1"></div>
                            <h2 v-if="showTitle" data-cy="magnetic-synthesis-title-text" :class="showControlPanel? 'col-sm-12 col-md-4 col-lg-4' : 'col-sm-12 col-md-9'" class="" >
                                {{toTitleCase($stateStore.getCurrentToolState().subsection)}}
                            </h2>

                            <div v-if="showControlPanel" data-cy="magnetic-synthesis-title-control-panel" :class="(showTitle || showReference)? 'col-sm-12 col-md-6 col-lg-6 col-xl-6' : 'col-sm-12 col-md-9'">
                                <ControlPanel @toolSelected="toolSelected"/>
                            </div>
                        </div>
                            
                        <div class="row">
                            <Welcome
                                v-if="$stateStore.getCurrentToolState().subsection == 'welcome'"
                                :dataTestLabel="`${dataTestLabel}-Welcome`"
                                @canContinue="updateCanContinue('welcome', $event)"
                            />
                            <ToolSelector
                                v-if="$stateStore.getCurrentToolState().subsection == 'toolSelector'"
                                :dataTestLabel="`${dataTestLabel}-ToolSelector`"
                                :acSweepSelected="$stateStore.operatingPoints.modePerPoint[$stateStore.currentOperatingPoint] === $stateStore.OperatingPointsMode.AcSweep"
                                @toolSelected="toolSelected"
                            />
                            <DesignRequirements
                                v-if="$stateStore.getCurrentToolState().subsection == 'designRequirements'"
                                :dataTestLabel="`${dataTestLabel}-DesignRequirements`"
                                @canContinue="updateCanContinue('designRequirements', $event)"
                            />
                            <OperatingPoints
                                v-if="$stateStore.getCurrentToolState().subsection == 'operatingPoints'"
                                :dataTestLabel="`${dataTestLabel}-OperatingPoints`"
                                    :enableManual="false"
                                    :enableCircuitSimulatorImport="false"
                                    :enableAcSweep="false"
                                    :enableHarmonicsList="true"
                                    :defaultMode="'HarmonicsList'"
                                @canContinue="updateCanContinue('operatingPoints', $event)" 
                                @changeTool="changeTool"
                            />
                            <MagneticCoreAdviser
                                v-if="$stateStore.getCurrentToolState().subsection == 'magneticCoreAdviser'"
                                :dataTestLabel="`${dataTestLabel}-MagneticmagneticCoreAdviser`"
                                @canContinue="updateCanContinue('magneticCoreAdviser', $event)"
                            />
                            <MagneticAdviser
                                v-if="$stateStore.getCurrentToolState().subsection == 'magneticAdviser'"
                                :dataTestLabel="`${dataTestLabel}-MagneticAdviser`"
                                @canContinue="updateCanContinue('magneticAdviser', $event)"
                            />
                            <CatalogAdviser
                                v-if="$stateStore.getCurrentToolState().subsection == 'catalogAdviser'"
                                :dataTestLabel="`${dataTestLabel}-CatalogAdviser`"
                                @canContinue="updateCanContinue('catalogAdviser', $event)"
                            />
                            <CoreCustomizer
                                v-if="$stateStore.getCurrentToolState().subsection == 'coreCustomizer'"
                                :dataTestLabel="`${dataTestLabel}-CoreCustomizer`"
                            />
                            <WireAdviser
                                v-if="$stateStore.getCurrentToolState().subsection == 'wireAdviser'"
                                :dataTestLabel="`${dataTestLabel}-WireAdviser`"
                            />
                            <WireCustomizer
                                v-if="$stateStore.getCurrentToolState().subsection == 'wireCustomizer'"
                                :dataTestLabel="`${dataTestLabel}-WireCustomizer`"
                            />
                            <InsulationAdviser
                                v-if="$stateStore.getCurrentToolState().subsection == 'insulationRequirements'"
                                :dataTestLabel="`${dataTestLabel}-InsulationAdviser`"
                            />
                            <MagneticBuilder 
                                v-if="$stateStore.getCurrentToolState().subsection == 'magneticBuilder' || 
                                      $stateStore.getCurrentToolState().subsection == 'magneticViewer'"
                                :masStore="masStore"
                                :operatingPointIndex="$stateStore.currentOperatingPoint"
                                :dataTestLabel="`${dataTestLabel}-MagneticBuilder`"
                                :useVisualizers="true"
                                :enableCoil="true"
                                :readOnly="$stateStore.getCurrentToolState().subsection == 'magneticViewer'"
                                :enableGraphs="enableGraphs"
                                :enableAdvisers="$stateStore.operatingPoints.modePerPoint[$stateStore.currentOperatingPoint] !== $stateStore.OperatingPointsMode.AcSweep"
                                :enableSimulation="$stateStore.operatingPoints.modePerPoint[$stateStore.currentOperatingPoint] !== $stateStore.OperatingPointsMode.AcSweep"
                                @canContinue="updateCanContinue('magneticBuilder', $event)"
                            />
                            <MagneticSummary
                                v-if="$stateStore.getCurrentToolState().subsection == 'magneticSummary'"
                                :mas="masStore.mas"
                                :dataTestLabel="`${dataTestLabel}-MagneticSummary`"
                            />
                            <MagneticCoreSummary
                                v-if="$stateStore.getCurrentToolState().subsection == 'magneticCoreSummary'"
                                :dataTestLabel="`${dataTestLabel}-MagneticFinalizer`"
                            />
                            <MagneticSpecificationsSummary
                                v-if="$stateStore.getCurrentToolState().subsection == 'magneticSpecificationsSummary'"
                                :dataTestLabel="`${dataTestLabel}-MagneticSpecificationsSummary`"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>


<style lang="css">


</style>
