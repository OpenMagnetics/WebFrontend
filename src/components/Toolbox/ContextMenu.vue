<script setup>
import { useCatalogStore } from '../../stores/catalog'
import { useMasStore } from '../../stores/mas'
import { toDashCase, toPascalCase, toTitleCase } from 'WebSharedComponents/assets/js/utils.js'
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
        class="toolmenu-panel"
    >
        <div class="toolmenu-header">
            <div class="toolmenu-header-left">
                <i class="bi bi-briefcase-fill"></i>
                <span>Tool menu</span>
            </div>
        </div>

        <div class="toolmenu-body">
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

            <div class="toolmenu-actions">
                <button
                    v-if="($stateStore.getCurrentToolState().subsection == 'magneticAdviser' || $stateStore.getCurrentToolState().subsection == 'magneticCoreAdviser') || $stateStore.selectedWorkflow == 'catalog' || $stateStore.getCurrentToolState().subsection == 'operatingPoints' || $stateStore.getCurrentToolState().subsection == 'magneticBuilder'"
                    :data-cy="dataTestLabel + 'settings-modal-button'"
                    class="toolmenu-btn toolmenu-btn-ghost"
                    data-bs-toggle="modal"
                    :data-bs-target="modalTarget"
                >
                    <i class="bi bi-gear-fill"></i>
                    <span>Settings</span>
                </button>
                <button
                    v-if="$stateStore.getCurrentToolState().subsection == 'magneticBuilder' && !$settingsStore.magneticBuilderSettings.autoRedraw"
                    :data-cy="dataTestLabel + 'redraw-button'"
                    class="toolmenu-btn toolmenu-btn-outline"
                    @click="$stateStore.redraw()"
                >
                    <i class="bi bi-pencil-square"></i>
                    <span>Redraw</span>
                </button>
                <button
                    v-if="$stateStore.getCurrentToolState().subsection == 'magneticBuilder' && $settingsStore.magneticBuilderSettings.enableSimulation && !$settingsStore.magneticBuilderSettings.enableAutoSimulation"
                    :data-cy="dataTestLabel + 'resimulate-button'"
                    class="toolmenu-btn toolmenu-btn-outline"
                    @click="$stateStore.resimulate()"
                >
                    <i class="bi bi-arrow-clockwise"></i>
                    <span>Resimulate</span>
                </button>
                <button
                    v-if="$stateStore.getCurrentToolState().subsection == 'magneticViewer'"
                    :data-cy="dataTestLabel + 'edit-from-viewer-button'"
                    class="toolmenu-btn toolmenu-btn-primary"
                    @click="$emit('editMagnetic')"
                >
                    <i class="bi bi-pencil-square"></i>
                    <span>Edit</span>
                </button>
                <button
                    v-if="$stateStore.selectedWorkflow == 'catalog' && $stateStore.getCurrentToolState().subsection == 'magneticBuilder'"
                    :data-cy="dataTestLabel + 'edit-from-viewer-button'"
                    class="toolmenu-btn toolmenu-btn-primary"
                    @click="$emit('viewMagnetic')"
                >
                    <i class="bi bi-check-lg"></i>
                    <span>Confirm</span>
                </button>
                <button
                    v-if="$stateStore.selectedWorkflow == 'catalog' && $stateStore.getCurrentToolState().subsection == 'magneticViewer'"
                    :data-cy="dataTestLabel + '-order-button'"
                    class="toolmenu-btn toolmenu-btn-primary"
                    @click="catalogStore.orderSample(masStore.mas)"
                >
                    <i class="bi bi-cart"></i>
                    <span>Order a sample</span>
                </button>
                <button
                    v-if="$stateStore.magneticBuilder.mode.coil == $stateStore.MagneticBuilderModes.Basic && $stateStore.magneticBuilder.mode.core == $stateStore.MagneticBuilderModes.Basic && $stateStore.getCurrentToolState().subsection == 'magneticBuilder'"
                    :data-cy="dataTestLabel + '-magnetics-adviser-button'"
                    class="toolmenu-btn toolmenu-btn-secondary"
                    @click="$emit('toolSelected', 'magneticAdviser')"
                >
                    <i class="bi bi-magic"></i>
                    <span>Magnetic Adviser</span>
                </button>
                <button
                    v-if="$stateStore.magneticBuilder.mode.core == $stateStore.MagneticBuilderModes.Advanced && $stateStore.getCurrentToolState().subsection == 'magneticBuilder' && $stateStore.magneticBuilder.submode.core != $stateStore.MagneticBuilderCoreSubmodes.Shape"
                    :data-cy="dataTestLabel + '-change-tool-button'"
                    class="toolmenu-btn toolmenu-btn-outline"
                    @click="coreSubmodeShape"
                >
                    <span>Edit shape</span>
                </button>
                <button
                    v-if="$stateStore.magneticBuilder.mode.core == $stateStore.MagneticBuilderModes.Advanced && $stateStore.getCurrentToolState().subsection == 'magneticBuilder' && $stateStore.magneticBuilder.submode.core != $stateStore.MagneticBuilderCoreSubmodes.Gapping"
                    :data-cy="dataTestLabel + '-change-tool-button'"
                    class="toolmenu-btn toolmenu-btn-outline"
                    @click="coreSubmodeGapping"
                >
                    <span>Edit gapping</span>
                </button>
                <button
                    v-if="$stateStore.magneticBuilder.mode.core == $stateStore.MagneticBuilderModes.Advanced && $stateStore.getCurrentToolState().subsection == 'magneticBuilder' && $stateStore.magneticBuilder.submode.core != $stateStore.MagneticBuilderCoreSubmodes.Material"
                    :data-cy="dataTestLabel + '-change-tool-button'"
                    class="toolmenu-btn toolmenu-btn-outline"
                    @click="coreSubmodeMaterial"
                >
                    <span>Edit material</span>
                </button>
                <button
                    v-if="$stateStore.magneticBuilder.mode.core == $stateStore.MagneticBuilderModes.Advanced && $stateStore.getCurrentToolState().subsection == 'magneticBuilder'"
                    class="toolmenu-btn toolmenu-btn-primary"
                    @click="coreAdvancedModeConfirmChanges"
                >
                    <i class="bi bi-check-lg"></i>
                    <span>Apply changes</span>
                </button>
                <button
                    v-if="$stateStore.magneticBuilder.mode.core == $stateStore.MagneticBuilderModes.Advanced && $stateStore.getCurrentToolState().subsection == 'magneticBuilder'"
                    class="toolmenu-btn toolmenu-btn-danger"
                    @click="coreAdvancedModeCancelChanges"
                >
                    <i class="bi bi-x-lg"></i>
                    <span>Cancel</span>
                </button>
                <button
                    v-if="$stateStore.magneticBuilder.mode.coil == $stateStore.MagneticBuilderModes.Advanced"
                    class="toolmenu-btn toolmenu-btn-danger"
                    @click="coilAdvancedModeClose"
                >
                    <i class="bi bi-x-lg"></i>
                    <span>Close</span>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.toolmenu-panel {
    background: rgba(var(--bs-dark-rgb), 0.55);
    border: 1px solid rgba(var(--bs-light-rgb), 0.08);
    border-top: 3px solid rgba(var(--bs-primary-rgb), 0.8);
    border-radius: 14px;
    padding: 0;
    margin: 0.15rem 0 0.5rem 0;
    box-shadow: 0 6px 24px rgba(var(--bs-dark-rgb), 0.45), inset 0 1px 0 rgba(var(--bs-light-rgb), 0.04);
    overflow: hidden;
}

.toolmenu-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0.9rem;
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--bs-primary);
    letter-spacing: 0.02em;
}

.toolmenu-header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.toolmenu-header-left i {
    font-size: 0.95rem;
    filter: drop-shadow(0 0 4px rgba(var(--bs-primary-rgb), 0.45));
}

.toolmenu-body {
    padding: 0.6rem 0.5rem;
}

.toolmenu-actions {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.toolmenu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    width: 100%;
    padding: 0.45rem 0.7rem;
    border-radius: 10px;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    border: 1px solid transparent;
    transition: filter 0.15s, box-shadow 0.2s, transform 0.1s, background 0.15s, color 0.15s;
    white-space: normal;
    overflow-wrap: break-word;
    line-height: 1.15;
    min-width: 0;
}

.toolmenu-btn:hover:not(:disabled) {
    filter: brightness(1.12);
    transform: translateY(-1px);
}

.toolmenu-btn-primary {
    background: linear-gradient(135deg,
        color-mix(in srgb, var(--bs-primary) 115%, transparent 0%) 0%,
        var(--bs-primary) 55%,
        rgb(var(--bs-primary-rgb) / 0.85) 100%);
    color: var(--bs-white);
    border: 1px solid color-mix(in srgb, var(--bs-primary) 70%, var(--bs-white) 30%);
    box-shadow:
        0 0 0 1px rgb(var(--bs-primary-rgb) / 0.35),
        0 2px 8px rgb(var(--bs-primary-rgb) / 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
}

.toolmenu-btn-secondary {
    background: linear-gradient(135deg,
        color-mix(in srgb, var(--bs-success) 115%, transparent 0%) 0%,
        var(--bs-success) 55%,
        rgb(var(--bs-success-rgb) / 0.85) 100%);
    color: var(--bs-white);
    border: 1px solid color-mix(in srgb, var(--bs-success) 70%, var(--bs-white) 30%);
    box-shadow:
        0 0 0 1px rgb(var(--bs-success-rgb) / 0.35),
        0 2px 8px rgb(var(--bs-success-rgb) / 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
}

.toolmenu-btn-danger {
    background: rgb(var(--bs-danger-rgb) / 0.2);
    border: 1px solid rgb(var(--bs-danger-rgb) / 0.55);
    color: var(--bs-danger);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.toolmenu-btn-danger:hover:not(:disabled) {
    background: rgb(var(--bs-danger-rgb) / 0.3);
    border-color: rgb(var(--bs-danger-rgb) / 0.75);
    box-shadow: 0 2px 6px rgb(var(--bs-danger-rgb) / 0.25);
}

.toolmenu-btn-outline {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.toolmenu-btn-outline:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.45);
    color: var(--bs-white);
}

.toolmenu-btn-ghost {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.75);
    box-shadow: none;
}

.toolmenu-btn-ghost:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.3);
    color: rgba(255, 255, 255, 0.95);
}
</style>

