<script setup >
import { Modal } from "bootstrap";
</script>

<script>

export default {
    emits: ["onSettingsUpdated"],
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
    },
    data() {
        const settingsChanged = false;
        const localData = {
            operatingPointAdvancedMode: this.$settingsStore.operatingPointSettings.advancedMode? '1' : '0',
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
        onSettingsUpdated(event) {
            this.$refs.closeSettingsModalRef.click();
            this.$emit('onSettingsUpdated');
        }

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
    <div class="modal fade" :id="modalName" tabindex="-1" aria-labelledby="operatingPointSettingsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-scrollable settings">
            <div class="modal-content" :style="$styleStore.contextMenu.main">
                <div class="modal-header">
                    <p data-cy="settingsModal-notification-text" class="modal-title fs-5" id="operatingPointSettingsModalLabel">Settings</p>
                    <button ref="closeSettingsModalRef" type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="settingsModalClose"></button>
                </div>
                <div class="modal-body container">
                    <div class="row" :style="$styleStore.contextMenu.setting">
                        <h5 class="offset-0 text-end" :class="labelWidthProportionClass">Show advanced outputs</h5>
                        <div :class="valueWidthProportionClass">
                            <label v-tooltip="'Choose between basic or advanced output'" class="fs-6 p-0 ps-3 pe-3 text-end col-4 ">No</label>
                            <input :data-cy="'Settings-Modal-bar-spider-button'" v-model="localData.operatingPointAdvancedMode"  @change="onSettingChanged($event, 'advancedMode')" type="range" class="form-range col-1 pt-2" min="0" max="1" step="1" style="width: 30px">
                            <label v-tooltip="'Choose between basic or advanced output'" class="fs-6 p-0 ps-3 col-6 text-start">Yes</label>
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