<script setup >
import { Modal } from "bootstrap";
import { useMagneticBuilderSettingsStore } from '/MagneticBuilder/src/stores/magneticBuilderSettings'
</script>

<script>

export default {
    emits: ["onSettingsUpdated"],
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        modalName: {
            type: String,
            default: 'SettingsModal',
        },
        labelWidthProportionClass: {
            type: String,
            default: 'col-7'
        },
        valueWidthProportionClass: {
            type: String,
            default: 'col-5'
        },
    },
    data() {
        const magneticBuilderSettingsStore = useMagneticBuilderSettingsStore();
        const settingsChanged = false;
        const localData = {
            autoRedraw: this.$settingsStore.magneticBuilderSettings.autoRedraw,
            advancedMode: this.$settingsStore.magneticBuilderSettings.advancedMode,
            useOnlyCoresInStock: this.$settingsStore.magneticBuilderSettings.useOnlyCoresInStock,
            allowDistributedGaps: this.$settingsStore.magneticBuilderSettings.allowDistributedGaps,
            allowStacks: this.$settingsStore.magneticBuilderSettings.allowStacks,
            allowToroidalCores: this.$settingsStore.magneticBuilderSettings.allowToroidalCores,
            enableVisualizers: magneticBuilderSettingsStore.enableVisualizers,
            enableSimulation: this.$settingsStore.magneticBuilderSettings.enableSimulation,
            enableAutoSimulation: this.$settingsStore.magneticBuilderSettings.enableAutoSimulation,
            enableSubmenu: magneticBuilderSettingsStore.enableSubmenu,
            enableGraphs: magneticBuilderSettingsStore.enableGraphs,
        }
        return {
            magneticBuilderSettingsStore,
            settingsChanged,
            localData,
        }
    },
    methods: {
        onSettingChanged(setting) {
            this.localData[setting] = !this.localData[setting];
            this.$settingsStore.magneticBuilderSettings[setting] = this.localData[setting];
            this.settingsChanged = true;
        },
        onMagneticBuilderSettingChanged(setting) {
            this.localData[setting] = !this.localData[setting];
            this.magneticBuilderSettingsStore[setting] = this.localData[setting];
            // Also update global settings store for settings that are read from there
            if (setting === 'enableSimulation' || setting === 'enableAutoSimulation') {
                this.$settingsStore.magneticBuilderSettings[setting] = this.localData[setting];
            }
            this.settingsChanged = true;
        },
        onSettingsUpdated(event) {
            this.$refs.closeSettingsModalRef.click();
            this.$emit('onSettingsUpdated');
        },
    },
    computed: {
    },
    mounted() {
    },
    created() {
    }
}
</script>


<template>
    <div class="modal fade" :id="modalName" tabindex="-1" aria-labelledby="settingsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-md modal-dialog-centered settings">
            <div class="modal-content bg-dark border-0 shadow-lg">
                <div class="modal-header border-bottom border-secondary px-4 py-3">
                    <div class="d-flex align-items-center">
                        <i class="fa-solid fa-gear text-primary me-2 fs-5"></i>
                        <h5 data-cy="settingsModal-notification-text" class="modal-title text-white mb-0" id="settingsModalLabel">Settings</h5>
                    </div>
                    <button ref="closeSettingsModalRef" type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="settingsModalClose"></button>
                </div>
                <div class="modal-body px-4 py-3">
                    <!-- Core Selection Section -->
                    <div class="mb-3">
                        <h6 class="text-secondary text-uppercase small fw-bold mb-3">Core Selection</h6>
                        
                        <div class="setting-item d-flex justify-content-between align-items-center py-2 border-bottom border-secondary">
                            <div>
                                <span class="text-white">Only cores in stock</span>
                            </div>
                            <div class="form-check form-switch">
                                <input 
                                    data-cy="Settings-Modal-with-without-stock-button"
                                    class="form-check-input custom-switch" 
                                    type="checkbox" 
                                    role="switch"
                                    :checked="localData.useOnlyCoresInStock"
                                    @change="onSettingChanged('useOnlyCoresInStock')"
                                >
                            </div>
                        </div>

                        <div class="setting-item d-flex justify-content-between align-items-center py-2 border-bottom border-secondary">
                            <div>
                                <span class="text-white">Allow distributed gaps</span>
                            </div>
                            <div class="form-check form-switch">
                                <input 
                                    class="form-check-input custom-switch" 
                                    type="checkbox" 
                                    role="switch"
                                    :checked="localData.allowDistributedGaps"
                                    @change="onSettingChanged('allowDistributedGaps')"
                                >
                            </div>
                        </div>

                        <div class="setting-item d-flex justify-content-between align-items-center py-2 border-bottom border-secondary">
                            <div>
                                <span class="text-white">Allow core stacking</span>
                            </div>
                            <div class="form-check form-switch">
                                <input 
                                    class="form-check-input custom-switch" 
                                    type="checkbox" 
                                    role="switch"
                                    :checked="localData.allowStacks"
                                    @change="onSettingChanged('allowStacks')"
                                >
                            </div>
                        </div>

                        <div class="setting-item d-flex justify-content-between align-items-center py-2">
                            <div>
                                <span class="text-white">Allow toroidal cores</span>
                            </div>
                            <div class="form-check form-switch">
                                <input 
                                    class="form-check-input custom-switch" 
                                    type="checkbox" 
                                    role="switch"
                                    :checked="localData.allowToroidalCores"
                                    @change="onSettingChanged('allowToroidalCores')"
                                >
                            </div>
                        </div>
                    </div>

                    <!-- Display Section -->
                    <div class="mb-3">
                        <h6 class="text-secondary text-uppercase small fw-bold mb-3">Display</h6>
                        
                        <div class="setting-item d-flex justify-content-between align-items-center py-2 border-bottom border-secondary">
                            <div>
                                <span class="text-white">Advanced mode</span>
                            </div>
                            <div class="form-check form-switch">
                                <input 
                                    data-cy="Settings-Modal-bar-spider-button"
                                    class="form-check-input custom-switch" 
                                    type="checkbox" 
                                    role="switch"
                                    :checked="localData.advancedMode"
                                    @change="onSettingChanged('advancedMode')"
                                >
                            </div>
                        </div>

                        <div class="setting-item d-flex justify-content-between align-items-center py-2 border-bottom border-secondary">
                            <div>
                                <span class="text-white">Auto re-draw</span>
                            </div>
                            <div class="form-check form-switch">
                                <input 
                                    class="form-check-input custom-switch" 
                                    type="checkbox" 
                                    role="switch"
                                    :checked="localData.autoRedraw"
                                    @change="onSettingChanged('autoRedraw')"
                                >
                            </div>
                        </div>

                        <div class="setting-item d-flex justify-content-between align-items-center py-2 border-bottom border-secondary">
                            <div>
                                <span class="text-white">3D Visualization</span>
                            </div>
                            <div class="form-check form-switch">
                                <input 
                                    :data-cy="dataTestLabel + '-Settings-Modal-enable-visualization-button'"
                                    class="form-check-input custom-switch" 
                                    type="checkbox" 
                                    role="switch"
                                    :checked="localData.enableVisualizers"
                                    @change="onMagneticBuilderSettingChanged('enableVisualizers')"
                                >
                            </div>
                        </div>

                        <div class="setting-item d-flex justify-content-between align-items-center py-2 border-bottom border-secondary">
                            <div>
                                <span class="text-white">Interactive graphs</span>
                            </div>
                            <div class="form-check form-switch">
                                <input 
                                    class="form-check-input custom-switch" 
                                    type="checkbox" 
                                    role="switch"
                                    :checked="localData.enableGraphs"
                                    @change="onMagneticBuilderSettingChanged('enableGraphs')"
                                >
                            </div>
                        </div>

                        <div class="setting-item d-flex justify-content-between align-items-center py-2">
                            <div>
                                <span class="text-white">Sidebar menu</span>
                            </div>
                            <div class="form-check form-switch">
                                <input 
                                    class="form-check-input custom-switch" 
                                    type="checkbox" 
                                    role="switch"
                                    :checked="localData.enableSubmenu"
                                    @change="onMagneticBuilderSettingChanged('enableSubmenu')"
                                >
                            </div>
                        </div>
                    </div>

                    <!-- Simulation Section -->
                    <div class="mb-2">
                        <h6 class="text-secondary text-uppercase small fw-bold mb-3">Simulation</h6>
                        
                        <div class="setting-item d-flex justify-content-between align-items-center py-2 border-bottom border-secondary">
                            <div>
                                <span class="text-white">Enable simulation</span>
                            </div>
                            <div class="form-check form-switch">
                                <input 
                                    class="form-check-input custom-switch" 
                                    type="checkbox" 
                                    role="switch"
                                    :checked="localData.enableSimulation"
                                    @change="onMagneticBuilderSettingChanged('enableSimulation')"
                                >
                            </div>
                        </div>

                        <div v-if="localData.enableSimulation" class="setting-item d-flex justify-content-between align-items-center py-2">
                            <div>
                                <span class="text-white">Auto simulation</span>
                            </div>
                            <div class="form-check form-switch">
                                <input 
                                    class="form-check-input custom-switch" 
                                    type="checkbox" 
                                    role="switch"
                                    :checked="localData.enableAutoSimulation"
                                    @change="onMagneticBuilderSettingChanged('enableAutoSimulation')"
                                >
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer border-top border-secondary px-4 py-3">
                    <button
                        data-cy="Settings-Modal-update-settings-button"
                        class="btn btn-primary px-4"
                        data-bs-dismiss="modal"
                        @click="onSettingsUpdated"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.settings {
    z-index: 9999;
}

.custom-switch {
    width: 2.5em;
    height: 1.25em;
    cursor: pointer;
}

.custom-switch:checked {
    background-color: #0d6efd;
    border-color: #0d6efd;
}

.custom-switch:focus {
    box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}

.setting-item:hover {
    background-color: rgba(255, 255, 255, 0.03);
    margin-left: -0.5rem;
    margin-right: -0.5rem;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    border-radius: 0.375rem;
}
</style>