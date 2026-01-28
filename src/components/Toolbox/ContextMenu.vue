<script setup>
import { useCatalogStore } from '../../stores/catalog'
import { useMasStore } from '../../stores/mas'
import { toDashCase, toPascalCase, toTitleCase } from '/WebSharedComponents/assets/js/utils.js'
import MagneticBuilderSettings from './Settings/MagneticBuilderSettings.vue'
import AdviserSettings from './Settings/AdviserSettings.vue'
import CatalogSettings from './Settings/CatalogSettings.vue'
import OperatingPointSettings from './Settings/OperatingPointSettings.vue'

</script>

<script>
export default {
    emits: ["editMagnetic", "viewMagnetic", "toolSelected"],
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const catalogStore = useCatalogStore();
        const masStore = useMasStore();
        return {
            catalogStore,
            masStore,
        }
    },
    computed: {
        modalTarget() {
            if ((this.$stateStore.getCurrentToolState().subsection == 'magneticAdviser' || this.$stateStore.getCurrentToolState().subsection == 'magneticCoreAdviser')) {
                return '#AdviserSettingsModal'
            }
            else if (this.$stateStore.getCurrentToolState().subsection == 'magneticBuilder') {
                return '#MagneticBuilderSettingsModal'
            }
            else if (this.$stateStore.selectedWorkflow == 'catalog') {
                return '#CatalogAdviserSettingsModal'
            }
            else if (this.$stateStore.getCurrentToolState().subsection == 'operatingPoints') {
                return '#OperatingPointSettingsModal'
            }
        },
    },
    watch: {
    },
    methods: {
        onAdviserSettingsUpdated() {
        },
        async onCatalogSettingsUpdated() {
            await this.$router.go();
        },
        onOperatingPointSettingsUpdated() {
        },
        onMagneticBuilderSettingsUpdated() {
        },
        coreSubmodeShape() {
            this.$stateStore.magneticBuilder.submode.core = this.$stateStore.MagneticBuilderCoreSubmodes.Shape;
        },
        coreSubmodeGapping() {
            this.$stateStore.magneticBuilder.submode.core = this.$stateStore.MagneticBuilderCoreSubmodes.Gapping;
        },
        coreSubmodeMaterial() {
            this.$stateStore.magneticBuilder.submode.core = this.$stateStore.MagneticBuilderCoreSubmodes.Material;
        },
        coreAdvancedModeConfirmChanges() {
            this.$stateStore.applyChanges();
        },
        coreAdvancedModeCancelChanges() {
            this.$stateStore.cancelChanges();
        },
        coilAdvancedModeClose() {
            this.$stateStore.closeCoilAdvancedInfo();
        },
    }
}
</script>

<template>
    <div
        v-if="$stateStore.getCurrentToolState().subsection != 'designRequirements'"
        :style="$styleStore.contextMenu.main"
        class="pb-2 p-0 container"
    >
        <h4 class="text-center py-2 fs-5" :style="$styleStore.contextMenu.title">Tool menu</h4>
        <MagneticBuilderSettings 
            v-if="$stateStore.getCurrentToolState().subsection == 'magneticBuilder'"
            :dataTestLabel="dataTestLabel"
            :modalName="'MagneticBuilderSettingsModal'"
            @onSettingsUpdated="onMagneticBuilderSettingsUpdated"
        />
        <AdviserSettings 
            v-if="($stateStore.getCurrentToolState().subsection == 'magneticAdviser' || $stateStore.getCurrentToolState().subsection == 'magneticCoreAdviser')"
            :modalName="'AdviserSettingsModal'"
            @onSettingsUpdated="onAdviserSettingsUpdated"
        />
        <CatalogSettings 
            v-if="$stateStore.selectedWorkflow == 'catalog'"
            :modalName="'CatalogAdviserSettingsModal'"
            @onSettingsUpdated="onCatalogSettingsUpdated"
        />
        <OperatingPointSettings 
            v-if="$stateStore.getCurrentToolState().subsection == 'operatingPoints'"
            :modalName="'OperatingPointSettingsModal'"
            @onSettingsUpdated="onOperatingPointSettingsUpdated"
        />
        <div class="row px-3">
            <button
                :style="$styleStore.contextMenu.settingsButton"
                v-if="($stateStore.getCurrentToolState().subsection == 'magneticAdviser' || $stateStore.getCurrentToolState().subsection == 'magneticCoreAdviser') || $stateStore.selectedWorkflow == 'catalog' || $stateStore.getCurrentToolState().subsection == 'operatingPoints' || $stateStore.getCurrentToolState().subsection == 'magneticBuilder'"  
                :data-cy="dataTestLabel + 'settings-modal-button'"
                class="btn mx-auto d-block mt-4 col-6 col-sm-6 col-md-12"
                data-bs-toggle="modal"
                :data-bs-target="modalTarget"
            >
                {{'Settings'}}
            </button>
            <button
                :style="$styleStore.contextMenu.redrawButton"
                v-if="$stateStore.getCurrentToolState().subsection == 'magneticBuilder' && !$settingsStore.magneticBuilderSettings.autoRedraw"  
                :data-cy="dataTestLabel + 'redraw-button'"
                class="btn mx-auto d-block mt-4 col-6 col-sm-6 col-md-12"
                @click="$stateStore.redraw()"
            >
                {{'Redraw'}}
            </button>
            <button
                :style="$styleStore.contextMenu.resimulateButton"
                v-if="$stateStore.getCurrentToolState().subsection == 'magneticBuilder' && $settingsStore.magneticBuilderSettings.enableSimulation && !$settingsStore.magneticBuilderSettings.enableAutoSimulation"  
                :data-cy="dataTestLabel + 'resimulate-button'"
                class="btn mx-auto d-block mt-4 col-6 col-sm-6 col-md-12"
                @click="$stateStore.resimulate()"
            >
                {{'Resimulate'}}
            </button>
            <button
                :style="$styleStore.contextMenu.editButton"
                v-if="$stateStore.getCurrentToolState().subsection == 'magneticViewer'"  
                :data-cy="dataTestLabel + 'edit-from-viewer-button'"
                class="btn mx-auto d-block mt-4 col-6 col-sm-6 col-md-12"
                @click="$emit('editMagnetic')"
            >
                {{'Edit'}}
            </button>
            <button
                :style="$styleStore.contextMenu.confirmButton"
                v-if="$stateStore.selectedWorkflow == 'catalog' && $stateStore.getCurrentToolState().subsection == 'magneticBuilder'"  
                :data-cy="dataTestLabel + 'edit-from-viewer-button'"
                class="btn mx-auto d-block mt-4 col-6 col-sm-6 col-md-12"
                @click="$emit('viewMagnetic')"
            >
                {{'Confirm'}}
            </button>
            <button
                :style="$styleStore.contextMenu.orderButton"
                v-if="$stateStore.selectedWorkflow == 'catalog' && $stateStore.getCurrentToolState().subsection == 'magneticViewer'"  
                :data-cy="dataTestLabel + '-order-button'"
                class="btn mx-auto d-block mt-4 col-6 col-sm-6 col-md-12"
                @click="catalogStore.orderSample(masStore.mas)"
            >
                {{'Order a sample'}}
            </button>
            <button
                :style="$styleStore.contextMenu.changeToolButton"
                v-if="$stateStore.magneticBuilder.mode.coil == $stateStore.MagneticBuilderModes.Basic && $stateStore.magneticBuilder.mode.core == $stateStore.MagneticBuilderModes.Basic && $stateStore.getCurrentToolState().subsection == 'magneticBuilder'"
                :data-cy="dataTestLabel + '-magnetics-adviser-button'"
                class="btn mx-auto d-block mt-4 col-6 col-sm-6 col-md-12"
                @click="$emit('toolSelected', 'magneticAdviser')"
            >
                {{'Magnetic Adviser'}}
            </button>
            <button
                :style="$styleStore.contextMenu.customizeCoreSectionButton"
                v-if="$stateStore.magneticBuilder.mode.core == $stateStore.MagneticBuilderModes.Advanced && $stateStore.getCurrentToolState().subsection == 'magneticBuilder' && $stateStore.magneticBuilder.submode.core != $stateStore.MagneticBuilderCoreSubmodes.Shape"  
                :data-cy="dataTestLabel + '-change-tool-button'"
                class="btn mx-auto d-block mt-1 col-6 col-sm-6 col-md-12"
                @click="coreSubmodeShape"
            >
                {{'Edit shape'}}
            </button>
            <button
                :style="$styleStore.contextMenu.customizeCoreSectionButton"
                v-if="$stateStore.magneticBuilder.mode.core == $stateStore.MagneticBuilderModes.Advanced && $stateStore.getCurrentToolState().subsection == 'magneticBuilder' && $stateStore.magneticBuilder.submode.core != $stateStore.MagneticBuilderCoreSubmodes.Gapping"  
                :data-cy="dataTestLabel + '-change-tool-button'"
                class="btn mx-auto d-block mt-1 col-6 col-sm-6 col-md-12"
                @click="coreSubmodeGapping"
            >
                {{'Edit gapping'}}
            </button>
            <button
                :style="$styleStore.contextMenu.customizeCoreSectionButton"
                v-if="$stateStore.magneticBuilder.mode.core == $stateStore.MagneticBuilderModes.Advanced && $stateStore.getCurrentToolState().subsection == 'magneticBuilder' && $stateStore.magneticBuilder.submode.core != $stateStore.MagneticBuilderCoreSubmodes.Material"  
                :data-cy="dataTestLabel + '-change-tool-button'"
                class="btn mx-auto d-block mt-1 col-6 col-sm-6 col-md-12"
                @click="coreSubmodeMaterial"
            >
                {{'Edit material'}}
            </button>
            <button
                :style="$styleStore.contextMenu.confirmButton"
                v-if="$stateStore.magneticBuilder.mode.core == $stateStore.MagneticBuilderModes.Advanced && $stateStore.getCurrentToolState().subsection == 'magneticBuilder'"  
                class="btn mx-auto d-block mt-1 col-6 col-sm-6 col-md-12"
                @click="coreAdvancedModeConfirmChanges"
            >
                {{'Apply changes'}}
            </button>
            <button
                :style="$styleStore.contextMenu.cancelButton"
                v-if="$stateStore.magneticBuilder.mode.core == $stateStore.MagneticBuilderModes.Advanced && $stateStore.getCurrentToolState().subsection == 'magneticBuilder'"  
                class="btn mx-auto d-block mt-1 col-6 col-sm-6 col-md-12"
                @click="coreAdvancedModeCancelChanges"
            >
                {{'Cancel'}}
            </button>
            <button
                :style="$styleStore.contextMenu.cancelButton"
                v-if="$stateStore.magneticBuilder.mode.coil == $stateStore.MagneticBuilderModes.Advanced"  
                class="btn mx-auto d-block mt-2 col-6 col-sm-6 col-md-12"
                @click="coilAdvancedModeClose"
            >
                {{'Close'}}
            </button>
        </div>
    </div>
</template>

