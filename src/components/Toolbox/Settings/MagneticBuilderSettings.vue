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
            autoRedraw: this.$settingsStore.magneticBuilderSettings.autoRedraw? '1' : '0',
            advancedMode: this.$settingsStore.magneticBuilderSettings.advancedMode? '1' : '0',
            useOnlyCoresInStock: this.$settingsStore.magneticBuilderSettings.useOnlyCoresInStock? '1' : '0',
            allowDistributedGaps: this.$settingsStore.magneticBuilderSettings.allowDistributedGaps? '1' : '0',
            allowStacks: this.$settingsStore.magneticBuilderSettings.allowStacks? '1' : '0',
            allowToroidalCores: this.$settingsStore.magneticBuilderSettings.allowToroidalCores? '1' : '0',
            enableVisualizers: magneticBuilderSettingsStore.enableVisualizers? '1' : '0',
            enableSimulation: magneticBuilderSettingsStore.enableSimulation? '1' : '0',
            enableSubmenu: magneticBuilderSettingsStore.enableSubmenu? '1' : '0',
            enableGraphs: magneticBuilderSettingsStore.enableGraphs? '1' : '0',

        }
        return {
            magneticBuilderSettingsStore,
            settingsChanged,
            localData,
        }
    },
    methods: {
        onSettingChanged(event, setting) {
            this.$settingsStore.magneticBuilderSettings[setting] = event.target.value == '1';
            this.settingsChanged = true;
        },
        onMagneticBuilderSettingChanged(event, setting) {
            this.magneticBuilderSettingsStore[setting] = event.target.value == '1';
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
        <div class="modal-dialog modal-lg modal-dialog-scrollable settings">
            <div class="modal-content" :style="$styleStore.contextMenu.main">
                <div class="modal-header">
                    <p data-cy="settingsModal-notification-text" class="modal-title fs-5" id="settingsModalLabel">Settings</p>
                    <button ref="closeSettingsModalRef" type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="settingsModalClose"></button>
                </div>
                <div class="modal-body container">
                    <div class="row" :style="$styleStore.contextMenu.setting">
                        <h5 class="offset-0 text-end" :class="labelWidthProportionClass">Use only cores in stock</h5>
                        <div :class="valueWidthProportionClass">
                            <label v-tooltip="'Choose between using all available cores or only those in stock'" class="fs-6 p-0 ps-3 pe-3 text-end col-4 ">All</label>
                            <input :data-cy="'Settings-Modal-with-without-stock-button'" v-model="localData.useOnlyCoresInStock" @change="onSettingChanged($event, 'useOnlyCoresInStock')" type="range" class="form-range col-1 pt-2" min="0" max="1" step="1" style="width: 30px">
                            <label v-tooltip="'Choose between using all available cores or only those in stock'" class="fs-6 p-0 ps-3 col-6  text-start">Only in stock</label>
                        </div>
                    </div>
                    <div class="row" :style="$styleStore.contextMenu.setting">
                        <h5 class="offset-0 text-end" :class="labelWidthProportionClass">Allow cores with distributed gaps in advises</h5>
                        <div :class="valueWidthProportionClass">
                            <label v-tooltip="'Allow the usage of cores with distributed gaps'" class="fs-6 p-0 ps-3 pe-3 text-end col-4 ">Avoid</label>
                            <input :data-cy="'Settings-Modal-with-without-stock-button'" v-model="localData.allowDistributedGaps" @change="onSettingChanged($event, 'allowDistributedGaps')" type="range" class="form-range col-1 pt-2" min="0" max="1" step="1" style="width: 30px">
                            <label v-tooltip="'Choose between using all available cores or only those in stock'" class="fs-6 p-0 ps-3 col-6  text-start">Allow</label>
                        </div>
                    </div>
                    <div class="row" :style="$styleStore.contextMenu.setting">
                        <h5 class="offset-0 text-end" :class="labelWidthProportionClass">Allow core stacking in advises</h5>
                        <div :class="valueWidthProportionClass">
                            <label v-tooltip="'Allow magnetics with more than one core stacked'" class="fs-6 p-0 ps-3 pe-3 text-end col-4 ">Avoid</label>
                            <input :data-cy="'Settings-Modal-with-without-stock-button'" v-model="localData.allowStacks" @change="onSettingChanged($event, 'allowStacks')" type="range" class="form-range col-1 pt-2" min="0" max="1" step="1" style="width: 30px">
                            <label v-tooltip="'Choose between using all available cores or only those in stock'" class="fs-6 p-0 ps-3 col-6  text-start">Allow</label>
                        </div>
                    </div>
                    <div class="row" :style="$styleStore.contextMenu.setting">
                        <h5 class="offset-0 text-end" :class="labelWidthProportionClass">Allow toroidal cores in advises</h5>
                        <div :class="valueWidthProportionClass">
                            <label v-tooltip="'Allow toroidal cores'" class="fs-6 p-0 ps-3 pe-3 text-end col-4 ">Avoid</label>
                            <input :data-cy="'Settings-Modal-with-without-stock-button'" v-model="localData.allowToroidalCores" @change="onSettingChanged($event, 'allowToroidalCores')" type="range" class="form-range col-1 pt-2" min="0" max="1" step="1" style="width: 30px">
                            <label v-tooltip="'Select whether toroidal cores will be considered for the designs'" class="fs-6 p-0 ps-3 col-6  text-start">Allow</label>
                        </div>
                    </div>
                    <div class="row" :style="$styleStore.contextMenu.setting">
                        <h5 class="offset-0 text-end" :class="labelWidthProportionClass">Show advanced outputs</h5>
                        <div :class="valueWidthProportionClass">
                            <label v-tooltip="'Choose between basic or advanced output'" class="fs-6 p-0 ps-3 pe-3 text-end col-4 ">No</label>
                            <input :data-cy="'Settings-Modal-bar-spider-button'" v-model="localData.advancedMode"  @change="onSettingChanged($event, 'advancedMode')" type="range" class="form-range col-1 pt-2" min="0" max="1" step="1" style="width: 30px">
                            <label v-tooltip="'Choose between basic or advanced output'" class="fs-6 p-0 ps-3 col-6 text-start">Yes</label>
                        </div>
                    </div>
                    <div class="row" :style="$styleStore.contextMenu.setting">
                        <h5 class="offset-0 text-end" :class="labelWidthProportionClass">Auto re-draw</h5>
                        <div :class="valueWidthProportionClass">
                            <label v-tooltip="'Choose between basic or advanced output'" class="fs-6 p-0 ps-3 pe-3 text-end col-4 ">No</label>
                            <input :data-cy="'Settings-Modal-bar-spider-button'" v-model="localData.autoRedraw"  @change="onSettingChanged($event, 'autoRedraw')" type="range" class="form-range col-1 pt-2" min="0" max="1" step="1" style="width: 30px">
                            <label v-tooltip="'Choose between basic or advanced output'" class="fs-6 p-0 ps-3 col-6 text-start">Yes</label>
                        </div>
                    </div>


                    <div class="row" :style="$styleStore.controlPanel.setting">
                        <h5 class="offset-0 text-end" :class="labelWidthProportionClass">Enable Visualization</h5>
                        <div :class="valueWidthProportionClass">
                            <label class="fs-6 p-0 ps-3 pe-3 text-end col-4 ">No</label>
                            <input :data-cy="dataTestLabel + '-Settings-Modal-enable-visualization-button'" v-model="localData.enableVisualizers" @change="onMagneticBuilderSettingChanged($event, 'enableVisualizers')" type="range" class="form-range col-1 pt-2" min="0" max="1" step="1" style="width: 30px">
                            <label class="fs-6 p-0 ps-3 col-6 text-start">Yes</label>
                        </div>
                    </div>
                    <div class="row" :style="$styleStore.controlPanel.setting">
                        <h5 class="offset-0 text-end" :class="labelWidthProportionClass">Enable Simulation</h5>
                        <div :class="valueWidthProportionClass">
                            <label class="fs-6 p-0 ps-3 pe-3 text-end col-4 ">No</label>
                            <input :data-cy="dataTestLabel + '-Settings-Modal-enable-visualization-button'" v-model="localData.enableSimulation" @change="onMagneticBuilderSettingChanged($event, 'enableSimulation')" type="range" class="form-range col-1 pt-2" min="0" max="1" step="1" style="width: 30px">
                            <label class="fs-6 p-0 ps-3 col-6 text-start">Yes</label>
                        </div>
                    </div>
                    <div class="row" :style="$styleStore.controlPanel.setting">
                        <h5 class="offset-0 text-end" :class="labelWidthProportionClass">Enable Submenu</h5>
                        <div :class="valueWidthProportionClass">
                            <label class="fs-6 p-0 ps-3 pe-3 text-end col-4 ">No</label>
                            <input :data-cy="dataTestLabel + '-Settings-Modal-enable-visualization-button'" v-model="localData.enableSubmenu" @change="onMagneticBuilderSettingChanged($event, 'enableSubmenu')" type="range" class="form-range col-1 pt-2" min="0" max="1" step="1" style="width: 30px">
                            <label class="fs-6 p-0 ps-3 col-6 text-start">Yes</label>
                        </div>
                    </div>
                    <div class="row" :style="$styleStore.controlPanel.setting">
                        <h5 class="offset-0 text-end" :class="labelWidthProportionClass">Enable Graphs</h5>
                        <div :class="valueWidthProportionClass">
                            <label class="fs-6 p-0 ps-3 pe-3 text-end col-4 ">No</label>
                            <input :data-cy="dataTestLabel + '-Settings-Modal-enable-visualization-button'" v-model="localData.enableGraphs" @change="onMagneticBuilderSettingChanged($event, 'enableGraphs')" type="range" class="form-range col-1 pt-2" min="0" max="1" step="1" style="width: 30px">
                            <label class="fs-6 p-0 ps-3 col-6 text-start">Yes</label>
                        </div>
                    </div>
                    <button
                        :style="$styleStore.contextMenu.closeButton"
                        :disabled="!settingsChanged"
                        :data-cy="'Settings-Modal-update-settings-button'"
                        class="btn btn-success mx-auto d-block mt-4"
                        data-bs-dismiss="modal"
                        @click="onSettingsUpdated"
                    >
                        Update settings
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style>

    .settings {
        z-index: 9999;
    }
</style>