<script setup>
import Dialog from 'primevue/dialog'
</script>

<script>

export default {
    components: { Dialog },
    emits: ["onSettingsUpdated", "update:visible"],
    props: {
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
        visible: { type: Boolean, default: false },
    },
    data() {
        const settingsChanged = false;
        if (this.$settingsStore.operatingPointSettings.maxHarmonicsToPlot == null) {
            this.$settingsStore.operatingPointSettings.maxHarmonicsToPlot = 20;
        }
        const localData = {
            operatingPointAdvancedMode: this.$settingsStore.operatingPointSettings.advancedMode? '1' : '0',
            maxHarmonicsToPlot: this.$settingsStore.operatingPointSettings.maxHarmonicsToPlot,
        }

        return {
            localData,
            settingsChanged,
        }
    },
    methods: {
        onSettingChanged(event, setting) {
            this.$settingsStore.operatingPointSettings[setting] = event.target.value == '1';
            this.settingsChanged = true;
        },
        onMaxHarmonicsChanged(value) {
            const n = Math.max(1, Math.min(100, parseInt(value, 10) || 20));
            this.localData.maxHarmonicsToPlot = n;
            this.$settingsStore.operatingPointSettings.maxHarmonicsToPlot = n;
            this.settingsChanged = true;
        },
        onSettingsUpdated(event) {
            this.$emit('update:visible', false);
            this.$emit('onSettingsUpdated');
        }
    },
}
</script>


<template>
    <Dialog
        :visible="visible"
        @update:visible="(v) => $emit('update:visible', v)"
        :modal="true"
        :draggable="false"
        :data-cy="modalName"
        header="Settings"
        :style="{ width: 'min(90vw, 720px)' }">
        <div class="container">
            <div class="row" :style="$styleStore.contextMenu.setting">
                <h5 class="col-offset-0 text-right" :class="labelWidthProportionClass">Show advanced outputs</h5>
                <div :class="valueWidthProportionClass">
                    <label v-tooltip="'Choose between basic or advanced output'" class="text-base p-0 pl-3 pr-3 text-right col-4 ">No</label>
                    <input :data-cy="'Settings-Modal-bar-spider-button'" v-model="localData.operatingPointAdvancedMode"  @change="onSettingChanged($event, 'advancedMode')" type="range" class="form-range col-1 pt-2" min="0" max="1" step="1" style="width: 30px">
                    <label v-tooltip="'Choose between basic or advanced output'" class="text-base p-0 pl-3 col-6 text-left">Yes</label>
                </div>
            </div>
            <div class="row mt-3" :style="$styleStore.contextMenu.setting">
                <h5 class="col-offset-0 text-right" :class="labelWidthProportionClass">Max harmonics to plot</h5>
                <div :class="valueWidthProportionClass">
                    <input
                        v-tooltip="'Maximum number of harmonics shown in the Fourier spectrum'"
                        :data-cy="'Settings-Modal-max-harmonics-input'"
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        class="form-control form-control-sm text-base"
                        style="width: 90px;"
                        :value="localData.maxHarmonicsToPlot"
                        @change="onMaxHarmonicsChanged($event.target.value)">
                </div>
            </div>
            <button
                :style="$styleStore.contextMenu.closeButton"
                :disabled="!settingsChanged"
                :data-cy="'Settings-Modal-update-settings-button'"
                class="p-button p-button-success mx-auto d-block mt-4"
                @click="onSettingsUpdated">
                Update settings
            </button>
        </div>
    </Dialog>
</template>

<style>
    .settings { z-index: 9999; }
</style>
