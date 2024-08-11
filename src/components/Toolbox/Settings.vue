<script setup >
import { Modal } from "bootstrap";
</script>

<script>

export default {
    emits: ["onSettingsUpdated"],
    data() {
        const settingsChanged = false;
        return {
            settingsChanged,
        }
    },
    methods: {
        onSettingChanged(event) {
            this.settingsChanged = true;
        },
        onSettingsUpdated(event) {
            console.log("onSettingsUpdated");
            console.log(this.$refs.closeSettingsModalRef);
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
    <div class="modal fade" id="settingsModal" tabindex="-1" aria-labelledby="settingsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-scrollable settings">
            <div class="modal-content bg-dark text-white">
                <div class="modal-header">
                    <p data-cy="settingsModal-notification-text" class="modal-title fs-5" id="settingsModalLabel">Settings</p>
                    <button ref="closeSettingsModalRef" type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="settingsModalClose"></button>
                </div>
                <div class="modal-body container">
                    <div class="row">
                        <h5 class="offset-0 col-6 text-end">Graph style</h5>
                        <div class="col-4">
                            <label v-tooltip="'Choose between spider or bar charts'" class="fs-6 p-0 ps-3 pe-3 text-end text-white col-4 ">Bar</label>
                            <input :data-cy="'Settings-Modal-bar-spider-button'" v-model="$settingsStore.adviserSpiderBarChartNotBar" @change="onSettingChanged" type="range" class="form-range col-1 pt-2" min="0" max="1" step="1" style="width: 30px">
                            <label v-tooltip="'Choose between spider or bar charts'" class="fs-6 p-0 ps-3 text-white col-6 text-start">Spider</label>
                        </div>
                    </div>
                    <div class="row">
                        <h5 class="offset-0 col-6 text-end">Use only cores in stock</h5>
                        <div class="col-4">
                            <label v-tooltip="'Choose between using all available cores or only those in stock'" class="fs-6 p-0 ps-3 pe-3 text-end text-white col-4 ">All</label>
                            <input :data-cy="'Settings-Modal-with-without-stock-button'" v-model="$settingsStore.adviserUseOnlyCoresInStock" @change="onSettingChanged" type="range" class="form-range col-1 pt-2" min="0" max="1" step="1" style="width: 30px">
                            <label v-tooltip="'Choose between using all available cores or only those in stock'" class="fs-6 p-0 ps-3 text-white col-6  text-start">Only in stock</label>
                        </div>
                    </div>
                    <div class="row">
                        <h5 class="offset-0 col-6 text-end">Allow cores with distributed gaps</h5>
                        <div class="col-4">
                            <label v-tooltip="'Allow the usage of cores with distributed gaps'" class="fs-6 p-0 ps-3 pe-3 text-end text-white col-4 ">Avoid</label>
                            <input :data-cy="'Settings-Modal-with-without-stock-button'" v-model="$settingsStore.adviserAllowDistributedGaps" @change="onSettingChanged" type="range" class="form-range col-1 pt-2" min="0" max="1" step="1" style="width: 30px">
                            <label v-tooltip="'Choose between using all available cores or only those in stock'" class="fs-6 p-0 ps-3 text-white col-6  text-start">Allow</label>
                        </div>
                    </div>
                    <div class="row">
                        <h5 class="offset-0 col-6 text-end">Allow core stacking</h5>
                        <div class="col-4">
                            <label v-tooltip="'Allow magnetics with more than one core stacked'" class="fs-6 p-0 ps-3 pe-3 text-end text-white col-4 ">Avoid</label>
                            <input :data-cy="'Settings-Modal-with-without-stock-button'" v-model="$settingsStore.adviserAllowStacks" @change="onSettingChanged" type="range" class="form-range col-1 pt-2" min="0" max="1" step="1" style="width: 30px">
                            <label v-tooltip="'Choose between using all available cores or only those in stock'" class="fs-6 p-0 ps-3 text-white col-6  text-start">Allow</label>
                        </div>
                    </div>
                    <div class="row">
                        <h5 class="offset-0 col-6 text-end">Allow toroidal cores</h5>
                        <div class="col-4">
                            <label v-tooltip="'Allow toroidal cores'" class="fs-6 p-0 ps-3 pe-3 text-end text-white col-4 ">Avoid</label>
                            <input :data-cy="'Settings-Modal-with-without-stock-button'" v-model="$settingsStore.adviserToroidalCores" @change="onSettingChanged" type="range" class="form-range col-1 pt-2" min="0" max="1" step="1" style="width: 30px">
                            <label v-tooltip="'Select whether toroidal cores will be considered for the designs'" class="fs-6 p-0 ps-3 text-white col-6  text-start">Allow</label>
                        </div>
                    </div>
                    <button :disabled="!settingsChanged" :data-cy="'Settings-Modal-update-settings-button'" class="btn btn-success mx-auto d-block mt-4" data-bs-dismiss="modal" @click="onSettingsUpdated" >Update settings</button>
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