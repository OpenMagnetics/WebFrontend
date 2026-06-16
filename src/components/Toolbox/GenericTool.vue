<script setup>
import Storyline from './Storyline.vue'
import ContextMenu from './ContextMenu.vue'

import ElementFromList from 'WebSharedComponents/DataInput/ElementFromList.vue'
import DesignRequirements from './DesignRequirements.vue'
import OperatingPoints from './OperatingPoints.vue'
import MagneticCoreAdviser from './MagneticCoreAdviser.vue'
import CoreCustomizer from './CoreCustomizer.vue'
import WireAdviser from './WireAdviser.vue'
import MagneticAdviser from './MagneticAdviser.vue'
import CatalogAdviser from './CatalogAdviser.vue'
import WireCustomizer from './WireCustomizer.vue'
import CoilAdviser from './CoilAdviser.vue'
import InsulationAdviser from './InsulationAdviser.vue'
import MagneticSummary from './MagneticSummary.vue'
import MagneticCoreSummary from './MagneticCoreAdviser/MagneticCoreSummary.vue'
import MagneticSpecificationsSummary from './MagneticSpecificationsReport/MagneticSpecificationsSummary.vue'
import MagneticBuilder from '/MagneticBuilder/src/components/MagneticBuilder.vue'
import ControlPanel from './ControlPanel.vue'
import ToolSelector from './ToolSelector.vue'

import { useMasStore } from '../../stores/mas'
import { useMagneticBuilderSettingsStore } from '/MagneticBuilder/src/stores/magneticBuilderSettings'

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
        showAnsysButtons: {
            type: Boolean,
            default: true,
        },
        showStoryline: {
            type: Boolean,
            default: true,
        },
    },
    data() {
        const magneticBuilderSettingsStore = useMagneticBuilderSettingsStore();
        magneticBuilderSettingsStore.enableContextMenu = false;
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
            // Handle switching between tools
            if (tool === 'magneticAdviser' || tool === 'magneticBuilder' || tool === 'magneticCoreAdviser') {
                this.$stateStore.getCurrentToolState().subsection = tool;
            } else {
                this.$emit('toolSelected', tool);
            }
        },
        operatingPointUpdated(name, ea) {
            this.masStore.mas.inputs.operatingPoints.forEach((elem, index) => {
                if (name.includes(elem.name)) {
                    this.$stateStore.currentOperatingPoint = index;
                }
            })
        },
        isMobile($windowWidth) {
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
            }
        },
        enableInsertIntermediateMas() {
            if (this.$stateStore.selectedTool == 'magneticCatalogAndBuilder') {
                return false;
            }
            else{
                return true;
            }
        },
        showControlPanelAndTitle() {
            if (this.$stateStore.magneticBuilder.mode.core == this.$stateStore.MagneticBuilderModes.Advanced)  {
                return false;
            }

            return true;
        },
        showOperatingPointSelector() {
            return this.showControlPanelAndTitle
                && this.operatingPointNames.length > 1
                && (this.$stateStore.getCurrentToolState().subsection == 'magneticBuilder'
                    || this.$stateStore.getCurrentToolState().subsection == 'magneticViewer');
        }
    },
    mounted() {
    },
    created() {
    },
}
</script>

<template>
    <div
        :style="$styleStore.storyline.main"
        v-if="$stateStore.getCurrentToolState() != null && $stateStore.getCurrentToolState().canContinue != null"
        class="container mx-auto"
    >
        <div class="row">
            <div v-if="showStoryline" class=" text-center col-12 col-12 md:col-1 bg-transparent m-0 p-0" style="height: fit-content">
                <!-- Constant top spacer so the Steps card sits at the same vertical
                     position across every tool (matching the builder column padding),
                     instead of jumping up in Design Requirements / Operating Points /
                     Summary. -->
                <div class="sidebar-top-spacer"></div>
                <Storyline
                    :selectedTool="$stateStore.getCurrentToolState().subsection"
                    :storyline="currentStoryline"
                    :canContinue="$stateStore.getCurrentToolState().canContinue"
                    :forceUpdate="updateStoryline"
                    @changeTool="changeTool"
                    @nextTool="nextTool"
                />
                <ContextMenu
                    @editMagnetic="$emit('editMagnetic')"
                    @viewMagnetic="$emit('viewMagnetic')"
                    @toolSelected="toolSelected"
                />
                <div v-if="showOperatingPointSelector" class="sidebar-op-selector">
                    <div class="sidebar-op-selector-header">
                        <i class="pi pi-bullseye"></i>
                        <span>Operating point</span>
                    </div>
                    <ElementFromList
                        class="text-left"
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
                </div>
                <div
                    v-if="showControlPanel && showControlPanelAndTitle"
                    data-cy="magnetic-synthesis-title-control-panel"
                    class="sidebar-control-panel"
                >
                    <div class="scp-header">
                        <i class="pi pi-sliders-h"></i>
                        <span>Actions</span>
                    </div>
                    <ControlPanel
                        :showExportButtons="$stateStore.getCurrentToolState().subsection == 'magneticBuilder' ||
                                            $stateStore.getCurrentToolState().subsection == 'magneticViewer'"
                        :showResetButton="$stateStore.getCurrentToolState().subsection == 'magneticBuilder'"
                        :showAnsysButtons="showAnsysButtons"
                        @toolSelected="toolSelected"
                    />
                </div>
            </div>
            <div class="text-center col-12 col-12 md:col-11 bg-transparent px container pt-0" >
                <div class="row">
                    <ToolSelector
                        v-if="$stateStore.getCurrentToolState().subsection == 'toolSelector'"
                        :dataTestLabel="`${dataTestLabel}-ToolSelector`"
                        @toolSelected="toolSelected"
                    />
                    <DesignRequirements
                        v-if="$stateStore.getCurrentToolState().subsection == 'designRequirements' && ($stateStore.selectedWorkflow == 'design' || $stateStore.selectedWorkflow == 'catalog')"
                        :dataTestLabel="`${dataTestLabel}-DesignRequirements`"
                        @canContinue="updateCanContinue('designRequirements', $event)"
                    />
                    <OperatingPoints
                        v-if="$stateStore.getCurrentToolState().subsection == 'operatingPoints'"
                        :dataTestLabel="`${dataTestLabel}-OperatingPoints`"
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
                        :enableAdvisers="true"
                        :enableSimulation="true"
                        :enableInsertIntermediateMas="enableInsertIntermediateMas"
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
</template>


<style lang="css">

/* Keeps the Steps card at a constant top position across all tools. */
.sidebar-top-spacer {
    height: 8px;
}

/* Operating-point selector relocated into the left sidebar (between the Tool
   menu and Actions), styled as a card matching the other sidebar panels. */
.sidebar-op-selector {
    background: rgba(var(--p-dark-rgb), 0.55);
    border: 1px solid rgba(var(--p-white-rgb), 0.08);
    border-top: 3px solid rgba(var(--p-primary-rgb), 0.8);
    border-radius: 14px;
    margin: 0.15rem 0 0.5rem 0;
    padding: 0 0.5rem 0.5rem 0.5rem;
    overflow: hidden;
    box-shadow: 0 6px 24px rgba(var(--p-dark-rgb), 0.45), inset 0 1px 0 rgba(var(--p-white-rgb), 0.04);
}

.sidebar-op-selector .sidebar-op-selector-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 -0.5rem 0.5rem -0.5rem;
    padding: 0.6rem 0.9rem;
    background: rgba(var(--p-white-rgb), 0.04);
    border-bottom: 1px solid rgba(var(--p-white-rgb), 0.08);
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--p-primary);
    letter-spacing: 0.02em;
}

.sidebar-op-selector .sidebar-op-selector-header i {
    font-size: 0.95rem;
    filter: drop-shadow(0 0 4px rgba(var(--p-primary-rgb), 0.45));
}

/* Control panel relocated into the narrow left sidebar (below the tool menu).
   Styled as a card matching .toolmenu-panel, with the buttons laid out in a
   tidy centered grid so the export toolbar never overflows the column. */
.sidebar-control-panel {
    background: rgba(var(--p-dark-rgb), 0.55);
    border: 1px solid rgba(var(--p-white-rgb), 0.08);
    border-top: 3px solid rgba(var(--p-primary-rgb), 0.8);
    border-radius: 14px;
    margin: 0.15rem 0 0.5rem 0;
    overflow: hidden;
    box-shadow: 0 6px 24px rgba(var(--p-dark-rgb), 0.45), inset 0 1px 0 rgba(var(--p-white-rgb), 0.04);
}

.sidebar-control-panel .scp-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.9rem;
    background: rgba(var(--p-white-rgb), 0.04);
    border-bottom: 1px solid rgba(var(--p-white-rgb), 0.08);
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--p-primary);
    letter-spacing: 0.02em;
}

.sidebar-control-panel .scp-header i {
    font-size: 0.95rem;
    filter: drop-shadow(0 0 4px rgba(var(--p-primary-rgb), 0.45));
}

/* Reset the shared cp-toolbar so its two halves flow into one wrapping grid. */
.sidebar-control-panel .cp-toolbar {
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 10px;
    padding: 0.6rem 0.35rem;
    border-radius: 0;
}

.sidebar-control-panel .cp-left,
.sidebar-control-panel .cp-right {
    display: flex;
    flex-flow: row wrap;
    align-items: center;
    justify-content: center;
    gap: 7px;
    width: 100%;
}

/* Let every button flow individually into the grid instead of being boxed
   inside its (sometimes 2-button) group. */
.sidebar-control-panel .cp-group {
    display: contents;
}

.sidebar-control-panel .cp-btn {
    width: 40px;
    height: 40px;
}

.sidebar-control-panel .cp-btn img,
.sidebar-control-panel .cp-btn .pi {
    width: 22px;
    height: 22px;
    font-size: 1.1rem;
}

.sidebar-control-panel .cp-divider {
    width: 100%;
    height: 1px;
    margin: 2px 0;
}

.sidebar-control-panel .cp-incomplete {
    text-align: center;
    width: 100%;
}

</style>
