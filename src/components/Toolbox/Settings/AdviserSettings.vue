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
        visible: { type: Boolean, default: false },
    },
    data() {
        const settingsChanged = false;
        const localData = {
            useOnlyCoresInStock: this.$settingsStore.adviserSettings.useOnlyCoresInStock,
            allowDistributedGaps: this.$settingsStore.adviserSettings.allowDistributedGaps,
            allowStacks: this.$settingsStore.adviserSettings.allowStacks,
            allowToroidalCores: this.$settingsStore.adviserSettings.allowToroidalCores,
        }
        return {
            settingsChanged,
            localData,
        }
    },
    methods: {
        onSettingChanged(setting) {
            this.localData[setting] = !this.localData[setting];
            this.$settingsStore.adviserSettings[setting] = this.localData[setting];
            this.settingsChanged = true;
        },
        onSettingsUpdated(event) {
            this.$emit('update:visible', false);
            this.$emit('onSettingsUpdated');
        },
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
        :style="{ width: 'min(90vw, 560px)' }"
        :pt="{ root: { class: 'settings' } }">
        <template #header>
            <div class="d-flex align-items-center">
                <i class="pi pi-cog text-primary mr-2 text-xl"></i>
                <h5 data-cy="settingsModal-notification-text" class="modal-title text-white mb-0">Adviser Settings</h5>
            </div>
        </template>
        <div class="px-2 py-2">
            <div class="mb-2">
                <h6 class="text-secondary text-uppercase small font-bold mb-3">Core Selection</h6>

                <div class="setting-item d-flex justify-content-between align-items-center py-2 border-bottom border-secondary">
                    <div><span class="text-white">Only cores in stock</span></div>
                    <div class="form-check form-switch">
                        <input
                            data-cy="Settings-Modal-with-without-stock-button"
                            class="form-check-input custom-switch"
                            type="checkbox"
                            role="switch"
                            :checked="localData.useOnlyCoresInStock"
                            @change="onSettingChanged('useOnlyCoresInStock')">
                    </div>
                </div>

                <div class="setting-item d-flex justify-content-between align-items-center py-2 border-bottom border-secondary">
                    <div><span class="text-white">Allow distributed gaps</span></div>
                    <div class="form-check form-switch">
                        <input
                            class="form-check-input custom-switch"
                            type="checkbox"
                            role="switch"
                            :checked="localData.allowDistributedGaps"
                            @change="onSettingChanged('allowDistributedGaps')">
                    </div>
                </div>

                <div class="setting-item d-flex justify-content-between align-items-center py-2 border-bottom border-secondary">
                    <div><span class="text-white">Allow core stacking</span></div>
                    <div class="form-check form-switch">
                        <input
                            class="form-check-input custom-switch"
                            type="checkbox"
                            role="switch"
                            :checked="localData.allowStacks"
                            @change="onSettingChanged('allowStacks')">
                    </div>
                </div>

                <div class="setting-item d-flex justify-content-between align-items-center py-2">
                    <div><span class="text-white">Allow toroidal cores</span></div>
                    <div class="form-check form-switch">
                        <input
                            class="form-check-input custom-switch"
                            type="checkbox"
                            role="switch"
                            :checked="localData.allowToroidalCores"
                            @change="onSettingChanged('allowToroidalCores')">
                    </div>
                </div>
            </div>
        </div>
        <template #footer>
            <button
                data-cy="Settings-Modal-update-settings-button"
                class="p-button p-button-primary px-4"
                @click="onSettingsUpdated">
                Done
            </button>
        </template>
    </Dialog>
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
    background-color: var(--p-primary);
    border-color: var(--p-primary);
}

.custom-switch:focus {
    box-shadow: 0 0 0 0.25rem rgba(var(--p-primary-rgb), 0.25);
}

.setting-item:hover {
    background-color: rgba(var(--p-white-rgb), 0.03);
    margin-left: -0.5rem;
    margin-right: -0.5rem;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    border-radius: 0.375rem;
}
</style>
