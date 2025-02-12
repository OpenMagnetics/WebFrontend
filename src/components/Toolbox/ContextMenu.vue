<script setup>
import { useCatalogStore } from '/src/stores/catalog'
import { useMasStore } from '/src/stores/mas'
import { toDashCase, toPascalCase, toTitleCase } from '/WebSharedComponents/assets/js/utils.js'
import MagneticBuilderSettings from '/src/components/Toolbox/Settings/MagneticBuilderSettings.vue'
import AdviserSettings from '/src/components/Toolbox/Settings/AdviserSettings.vue'
import CatalogSettings from '/src/components/Toolbox/Settings/CatalogSettings.vue'
import OperatingPointSettings from '/src/components/Toolbox/Settings/OperatingPointSettings.vue'

</script>

<script>
export default {
    emits: ["editMagnetic", "viewMagnetic", "toolSelected"],
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        showMagneticBuilderSettingsOption: {
            type: Boolean,
            default: false
        },
        showAdviserSettingsOption: {
            type: Boolean,
            default: false
        },
        showCatalogAdviserSettingsOption: {
            type: Boolean,
            default: false
        },
        showOperatingPointSettingsOption: {
            type: Boolean,
            default: false
        },
        showEditOption: {
            type: Boolean,
            default: false
        },
        showOrderOption: {
            type: Boolean,
            default: false
        },
        showConfirmOption: {
            type: Boolean,
            default: false
        },
        showChangeToolOption: {
            type: Boolean,
            default: false
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
        styleTooltip() {
            var relative_placement;
            relative_placement = 'right'
            return {
                theme: {
                    placement: relative_placement,
                    width: '150px',
                    "text-align": "end",
                },
            }
        },
        modalTarget() {
            if (this.showAdviserSettingsOption) {
                return '#AdviserSettingsModal'
            }
            else if (this.showMagneticBuilderSettingsOption) {
                return '#MagneticBuilderSettingsModal'
            }
            else if (this.showAdviserSettingsOption) {
                return '#CatalogAdviserSettingsModal'
            }
            else if (this.showOperatingPointSettingsOption) {
                return '#OperatingPointSettingsModal'
            }
        },
    },
    watch: {
    },
    mounted () {
    },
    methods: {
        onAdviserSettingsUpdated() {
        },
        onCatalogSettingsUpdated() {
            setTimeout(() => {this.$router.go();}, 100);
        },
        onOperatingPointSettingsUpdated() {
        },
        onMagneticBuilderSettingsUpdated() {
        },
    }
}
</script>

<template>
    <div class="pb-2 p-0 container" v-tooltip="styleTooltip" :style="$styleStore.contextMenu.main">
        <h4 class="text-center pt-2 fs-5">Tool menu</h4>
        <MagneticBuilderSettings 
            v-if="showMagneticBuilderSettingsOption"
            :modalName="'MagneticBuilderSettingsModal'"
            @onSettingsUpdated="onMagneticBuilderSettingsUpdated"
        />
        <AdviserSettings 
            v-if="showAdviserSettingsOption"
            :modalName="'AdviserSettingsModal'"
            @onSettingsUpdated="onAdviserSettingsUpdated"
        />
        <CatalogSettings 
            v-if="showCatalogAdviserSettingsOption"
            :modalName="'CatalogAdviserSettingsModal'"
            @onSettingsUpdated="onCatalogSettingsUpdated"
        />
        <OperatingPointSettings 
            v-if="showOperatingPointSettingsOption"
            :modalName="'OperatingPointSettingsModal'"
            @onSettingsUpdated="onOperatingPointSettingsUpdated"
        />
        <div class="row px-3">
            <button
                :style="$styleStore.contextMenu.settingsButton"
                v-if="showAdviserSettingsOption || showCatalogAdviserSettingsOption || showOperatingPointSettingsOption || showMagneticBuilderSettingsOption"  
                :data-cy="dataTestLabel + 'settings-modal-button'"
                class="btn mx-auto d-block mt-4 col-6 col-sm-6 col-md-12"
                data-bs-toggle="modal"
                :data-bs-target="modalTarget"
            >
                {{'Settings'}}
            </button>
            <button
                :style="$styleStore.contextMenu.editButton"
                v-if="showEditOption"  
                :data-cy="dataTestLabel + 'edit-from-viewer-button'"
                class="btn mx-auto d-block mt-4 col-6 col-sm-6 col-md-12"
                @click="$emit('editMagnetic')"
            >
                {{'Edit'}}
            </button>
            <button
                :style="$styleStore.contextMenu.confirmButton"
                v-if="showConfirmOption"  
                :data-cy="dataTestLabel + 'edit-from-viewer-button'"
                class="btn mx-auto d-block mt-4 col-6 col-sm-6 col-md-12"
                @click="$emit('viewMagnetic')"
            >
                {{'Confirm'}}
            </button>
            <button
                :style="$styleStore.contextMenu.orderButton"
                v-if="showOrderOption"  
                :data-cy="dataTestLabel + '-order-button'"
                class="btn mx-auto d-block mt-4 col-6 col-sm-6 col-md-12"
                @click="catalogStore.orderSample(masStore.mas)"
            >
                {{'Order a sample'}}
            </button>
            <button
                :style="$styleStore.contextMenu.changeToolButton"
                v-if="showChangeToolOption"  
                :data-cy="dataTestLabel + '-change-tool-button'"
                class="btn mx-auto d-block mt-4 col-6 col-sm-6 col-md-12"
                @click="$emit('toolSelected', 'agnosticTool')"
            >
                {{'Change tool'}}
            </button>
        </div>
    </div>
</template>

