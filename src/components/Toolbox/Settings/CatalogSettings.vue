<script setup>
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
</script>

<script>
export default {
    components: { Dialog, Button },
    emits: ['onSettingsUpdated', 'update:visible'],
    props: {
        modalName: { type: String, default: 'SettingsModal' },
        labelWidthProportionClass: { type: String, default: 'col-7' },
        valueWidthProportionClass: { type: String, default: 'col-5' },
        visible: { type: Boolean, default: false },
    },
    data() {
        return {
            settingsChanged: false,
            localData: {
                advancedMode: this.$settingsStore.catalogAdviserSettings.advancedMode ? '1' : '0',
                useAllParts: this.$settingsStore.catalogAdviserSettings.useAllParts ? '1' : '0',
            },
        }
    },
    methods: {
        onSettingChanged(event, setting) {
            this.$settingsStore.catalogAdviserSettings[setting] = event.target.value == '1'
            if (setting === 'advancedMode') {
                this.$settingsStore.magneticBuilderSettings[setting] = event.target.value == '1'
            }
            this.settingsChanged = true
        },
        onSettingsUpdated() {
            this.$emit('update:visible', false)
            this.$emit('onSettingsUpdated')
        },
    },
}
</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="(v) => $emit('update:visible', v)"
        :header="'Settings'"
        :modal="true"
        :draggable="false"
        :style="{ width: 'min(90vw, 720px)' }"
        :data-cy="modalName">
        <div class="catalog-settings-body">
            <div class="catalog-settings-row" :style="$styleStore.contextMenu.setting">
                <h5 class="text-right" :class="labelWidthProportionClass">Show advanced outputs</h5>
                <div :class="valueWidthProportionClass" class="catalog-settings-range">
                    <label v-tooltip="'Choose between basic or advanced output'" class="text-base pl-3 pr-3 text-right col-4">No</label>
                    <input :data-cy="'Settings-Modal-bar-spider-button'" v-model="localData.advancedMode" @change="onSettingChanged($event, 'advancedMode')" type="range" class="catalog-settings-slider col-1" min="0" max="1" step="1">
                    <label v-tooltip="'Choose between basic or advanced output'" class="text-base pl-3 col-6 text-left">Yes</label>
                </div>
            </div>
            <div class="catalog-settings-row" :style="$styleStore.contextMenu.setting">
                <h5 class="text-right" :class="labelWidthProportionClass">Use all parts when editing</h5>
                <div :class="valueWidthProportionClass" class="catalog-settings-range">
                    <label v-tooltip="'Use the full catalog when editing'" class="text-base pl-3 pr-3 text-right col-4">No</label>
                    <input :data-cy="'Settings-Modal-bar-spider-button'" v-model="localData.useAllParts" @change="onSettingChanged($event, 'useAllParts')" type="range" class="catalog-settings-slider col-1" min="0" max="1" step="1">
                    <label v-tooltip="'Use the full catalog when editing'" class="text-base pl-3 col-6 text-left">Yes</label>
                </div>
            </div>
            <div class="catalog-settings-actions">
                <Button
                    :style="$styleStore.contextMenu.closeButton"
                    :disabled="!settingsChanged"
                    :data-cy="'Settings-Modal-update-settings-button'"
                    severity="success"
                    label="Update settings"
                    @click="onSettingsUpdated"
                />
            </div>
        </div>
    </Dialog>
</template>

<style scoped>
.catalog-settings-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.catalog-settings-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}
.catalog-settings-range {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.catalog-settings-slider { width: 30px; }
.catalog-settings-actions {
    display: flex;
    justify-content: center;
    margin-top: 0.5rem;
}
</style>
