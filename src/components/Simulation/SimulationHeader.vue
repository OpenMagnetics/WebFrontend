<script setup>
import { ref, onMounted, computed, inject } from 'vue'
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';
import * as Defaults from '/src/assets/js/defaults.js'
import * as Utils from '/src/assets/js/utils.js'
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'
import { useSimulationStore } from '/src/stores/simulation'
import OperationPointTool from '/src/components/Simulation/OperationPointTool.vue'
import SimulationNew from '/src/components/Simulation/SimulationNew.vue'
import OperationPointLoaderModal from '/src/components/Simulation/OperationPointLoaderModal.vue'
</script>


<script>
export default {
    data() {
        const simulationStore = useSimulationStore();
        const simulationNameSelected = this.$userStore.globalSimulation == null? Defaults.defaultSimulationName : this.$userStore.globalSimulation['name'];
        const isLoggedIn = false
        const schema = Yup.object().shape({
            simulationName: Yup.string()
                .required('Name cannot be empty').min(1),
        });
        var publishedSlug = null
        var currentSimulationId = null
        var updateOperationPointToolKey = 0
        var saveMessage = currentSimulationId == null? "Create and add to library" : "Save changes"

        if (this.$userStore.globalCore != null) {
            if ("slug" in this.$userStore.globalCore) {
                publishedSlug = this.$userStore.globalCore["slug"]
            }
            if (!simulationStore.isDataReadOnly.value && "_id" in this.$userStore.globalCore) {
                currentSimulationId = this.$userStore.globalCore["_id"]
            }
        }

        return {
            simulationStore,
            simulationNameSelected,
            isLoggedIn,
            schema,
            publishedSlug,
            currentSimulationId,
            updateOperationPointToolKey,
            saveMessage,
        }
    },
    computed: {
        colorSaveButton() {
            if (this.saveMessage == "Error, try against later")
                return "bg-danger"
            else
                return "bg-secondary"
        }
    },
    mounted() {
        this.isLoggedIn = this.$userStore.isLoggedIn

        this.$userStore.$subscribe((mutation, state) => {
            this.isLoggedIn = this.$userStore.isLoggedIn
        })
    },
    methods: {
        onLoadOperationPoint() {
            this.updateOperationPointToolKey += 1
        },
        handleSubmit(params) {
        },
        onSimulationName(event) {
        },
        onSaveToDB(event) {
            const result = saveToDB(false)
            this.saveMessage = result
            console.log(this.saveMessage)
        },
        onExport(event) {
            saveToDB(true)
        },
        onPublish(slug) {
            this.publishedSlug = slug
            saveToDB(false)
        },
        onNewSimulation() {
            this.currentSimulationId = null
            this.$userStore.resetGlobalSimulation()
            this.$userStore.setSimulationCoreCalculatorSubsection('inductanceCalculator')
            this.$router.go();
        },
        saveToDB(anonymousUser=false) {
            return "Saving"
        },
    }
}
</script>

<template>
    <div class="container text-white mt-2 mb-2 pb-3 border-bottom navbar navbar-expand-md">
        <button class="navbar-toggler text-primary bg-primary" type="button" data-bs-toggle="collapse" data-bs-target="#simulationHeader" aria-controls="simulationHeader" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon text-white"></span>
        </button>
        <div class="row gx-1 collapse navbar-collapse" id="simulationHeader">
            <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2 ">
                <div class="row gx-2">
                    <button data-test="SimulationHeader-new-modal-button" v-tooltip="'Create new simulation. All current unsaved changes will be lost'" class="btn text-white bg-secondary py-1 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5" data-bs-toggle="modal" data-bs-target="#newSimulationModal">New</button>
                    <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2"> </div>
                    <button data-test="SimulationHeader-import-modal-button" class="btn text-white bg-secondary py-1 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5 disabled">Import</button>

                </div>
            </div>
            <div class="col-11 col-sm-8 col-md-8 col-lg-8 col-xl-8 pe-5 ps-3">
                <Form :validation-schema="schema" v-slot="{ handleSubmit, errors }" class="form-inline row" @submit="handleSubmit($event, onSubmit)">
                    <label class="medium-text col-sm-4 col-md-4 col-lg-3 col-xl-3 text-md-end">Simulation Name:</label>
                    <Field data-test="SimulationHeader-simulation-name-input" name="simulationName" type="text" :class="{ 'is-invalid': errors.simulationName }" :placeholder="Defaults.defaultSimulationNamePlaceHolder"  @change="onSimulationName" :value="Defaults.defaultSimulationName" class= "small-text bg-light text-white rounded-2 col-sm-8 col-md-8 col-lg-9 col-xl-9" v-model="simulationNameSelected"/>

                    <div class="invalid-feedback">{{errors.simulationName}}</div>
                </Form>
                <button data-test="SimulationHeader-view-edit-excitation-modal-button" class="btn text-white bg-secondary xt mt-2 col-sm-4 col-md-4 col-lg-3 col-xl-3 offset-lg-1" data-bs-toggle="offcanvas" data-bs-target="#OperationPointOffCanvas" aria-controls="OperationPointOffCanvas">View/Edit excitation</button>

                <button data-test="SimulationHeader-load-excitation-modal-button" :disabled="!isLoggedIn" class="btn text-white bg-secondary xt mt-2 col-sm-4 col-md-4 col-lg-3 col-xl-3 offset-lg-1" data-bs-toggle="modal" data-bs-target="#loadOperationPointModal">Load new excitation</button>

            </div>
            <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2 container">
                <div class="row">
                    <button data-test="SimulationHeader-create-save-button" disabled :class="colorSaveButton" class="btn text-white py-1 px-2 my-1 col-10 col-sm-12 col-md-12 col-lg-12 col-xl-12" :disabled="!isLoggedIn || (saveMessage != 'Save changes' && saveMessage != 'Create and add to library')" @click="onSaveToDB">{{saveMessage}}</button>
                    <button data-test="SimulationHeader-publish-modal-button" disabled class="btn text-white bg-secondary py-1 px-2 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5" data-bs-toggle="modal" data-bs-target="#publishSimujlationModal">Publish</button>
                    <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2"> </div>
                    <button data-test="SimulationHeader-export-modal-button" class="btn text-white bg-secondary py-1 px-2 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5 disabled" data-bs-toggle="offcanvas" data-bs-target="#ExportOffCanvas" aria-controls="ExportOffCanvas">Export</button>

                </div>
            </div>
        </div>
    </div>
    <SimulationNew @onNewSimulation="onNewSimulation"/>
    <OperationPointTool :key="updateOperationPointToolKey"/>
    <OperationPointLoaderModal @onLoadOperationPoint="onLoadOperationPoint"/>
    <!-- <CorePublish :isLoggedIn="isLoggedIn" @published="onPublish"/> -->

</template>