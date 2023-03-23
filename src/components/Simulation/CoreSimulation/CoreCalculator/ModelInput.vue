<script setup>
import { ref, onMounted, computed, inject } from 'vue'
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';
import { useSimulationStore } from '/src/stores/simulation'
import * as Defaults from '/src/assets/js/defaults.js'
import * as Utils from '/src/assets/js/utils.js'

</script>
<script>
const schema = Yup.object().shape({
    gapReluctanceModels: Yup.string().required('Please, choose a type of gap'),
});

export default {
    props: {
    },
    data() {
        const simulationStore = useSimulationStore();
        const gapReluctanceModelSelected = this.$userStore.selectedModels['gapReluctance'];
        const gapReluctanceModelNames = []
        const gapReluctanceModelDescriptions = []
        const gapReluctanceModelErrors = []
        const gapReluctanceModelInternalLink = []
        const gapReluctanceModelExternalLink = []
        const coreLossesModelSelected = this.$userStore.selectedModels['coreLosses'];
        const coreLossesModelNames = []
        const coreLossesModelDescriptions = []
        const coreLossesModelErrors = []
        const coreLossesModelInternalLink = []
        const coreLossesModelExternalLink = []
        const coreTemperatureModelSelected = this.$userStore.selectedModels['coreTemperature'];
        const coreTemperatureModelNames = []
        const coreTemperatureModelDescriptions = []
        const coreTemperatureModelErrors = []
        const coreTemperatureModelInternalLink = []
        const coreTemperatureModelExternalLink = []
        return {
            simulationStore,
            gapReluctanceModelNames,
            gapReluctanceModelDescriptions,
            gapReluctanceModelErrors,
            gapReluctanceModelInternalLink,
            gapReluctanceModelExternalLink,
            gapReluctanceModelSelected,
            coreLossesModelNames,
            coreLossesModelDescriptions,
            coreLossesModelErrors,
            coreLossesModelInternalLink,
            coreLossesModelExternalLink,
            coreLossesModelSelected,
            coreTemperatureModelSelected,
            coreTemperatureModelNames,
            coreTemperatureModelDescriptions,
            coreTemperatureModelErrors,
            coreTemperatureModelInternalLink,
            coreTemperatureModelExternalLink,
            recentChange: false,
            tryingToSend: false,
            hasError: false,
        }
    },
    watch: {},
    computed: {
        getGapReluctanceRoundedError() {
            if (this.gapReluctanceModelErrors[this.gapReluctanceModelSelected] != null) {
                return Utils.removeTrailingZeroes(this.gapReluctanceModelErrors[this.gapReluctanceModelSelected] * 100, 2) + ' %'
            }
            return 'NaN %'
        },
        getCoreLossesRoundedError() {
            if (this.coreLossesModelErrors[this.coreLossesModelSelected] != null) {
                return Utils.removeTrailingZeroes(this.coreLossesModelErrors[this.coreLossesModelSelected] * 100, 2) + ' %'
            }
            return 'NaN %'
        },
        getCoreTemperatureRoundedError() {
            if (this.coreTemperatureModelErrors[this.coreTemperatureModelSelected] != null) {
                return Utils.removeTrailingZeroes(this.coreTemperatureModelErrors[this.coreTemperatureModelSelected] * 100, 2) + ' %'
            }
            return 'NaN %'
        },
    },
    created () {
        this.tryToSend();
        this.simulationStore.$onAction((action) => {
            if (action.name == "loadCoreLossesModels") {
                this.tryToSend();
            }
            if (action.name == "loadCoreTemperatureModels") {
                this.tryToSend();
            }
        })

    },
    methods: {
        getModels() {
            var url = import.meta.env.VITE_API_ENDPOINT + '/get_gap_reluctance_models'

            this.$axios.post(url, {})
            .then(response => {
                this.gapReluctanceModelNames = Object.keys(response.data["information"]);
                this.gapReluctanceModelDescriptions = response.data["information"];
                this.gapReluctanceModelErrors = response.data["errors"];
                this.gapReluctanceModelInternalLink = response.data["internal_links"];
                this.gapReluctanceModelExternalLink = response.data["external_links"];
            })
            .catch(error => {
                console.error(error.data)
            });

            url = import.meta.env.VITE_API_ENDPOINT + '/get_core_losses_models'

            var materialSelected;
            if (typeof(this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['material']) == 'string') {
                materialSelected = this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['material'];
            }
            else {
                materialSelected = this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['material']['name'];
            }

            this.$axios.post(url, {materialName: materialSelected })
            .then(response => {
                this.tryingToSend = false
                this.coreLossesModelNames = response.data["available_models"];
                this.coreLossesModelDescriptions = response.data["information"];
                this.coreLossesModelErrors = response.data["errors"];
                this.coreLossesModelInternalLink = response.data["internal_links"];
                this.coreLossesModelExternalLink = response.data["external_links"];

                if (!this.coreLossesModelNames.includes(this.coreLossesModelSelected)) {
                    this.coreLossesModelSelected = this.coreLossesModelNames[0]
                    this.$userStore.setSelectedModels('coreLosses', this.coreLossesModelSelected)
                }
                this.simulationStore.calculateCoreLosses()
            })
            .catch(error => {
                this.tryingToSend = false
                console.error(error.data)
            });

            url = import.meta.env.VITE_API_ENDPOINT + '/get_core_temperature_models'
            this.$axios.post(url, {})
            .then(response => {
                console.log("response.data")
                console.log(response.data)
                this.tryingToSend = false
                this.coreTemperatureModelNames = Object.keys(response.data["information"]);
                this.coreTemperatureModelDescriptions = response.data["information"];
                this.coreTemperatureModelErrors = response.data["errors"];
                this.coreTemperatureModelInternalLink = response.data["internal_links"];
                this.coreTemperatureModelExternalLink = response.data["external_links"];
            })
            .catch(error => {
                this.tryingToSend = false
                console.error(error.data)
            });
        },
        tryToSend() {
            if (!this.tryingToSend) {
                this.recentChange = false
                this.tryingToSend = true
                setTimeout(() => {
                    if (!this.hasError) {
                        if (this.recentChange) {
                            this.tryingToSend = false
                            this.tryToSend()
                        }
                        else {
                            this.getModels()
                        }
                    }
                }
                , 500);
            }
        },
        handleSubmit() {
            console.log("handleSubmit")
        },
        onGapReluctanceModelsChange() {
            this.$userStore.setSelectedModels('gapReluctance', this.gapReluctanceModelSelected)
            this.simulationStore.calculateInductance()
            this.simulationStore.calculateCoreLosses()
        },
        onCoreLossesModelsChange() {
            this.$userStore.setSelectedModels('coreLosses', this.coreLossesModelSelected)
            this.simulationStore.calculateInductance()
            this.simulationStore.calculateCoreLosses()
        },
        onCoreTemperatureModelsChange() {
            this.$userStore.setSelectedModels('coreTemperature', this.coreTemperatureModelSelected)
            this.simulationStore.calculateInductance()
            this.simulationStore.calculateCoreLosses()
        },
    }
}
</script>

<template>
    <div class="container">
        <label class="text-white fs-4 text-center ">Reluctance model</label>

        <Form ref="formRef" :validation-schema="schema" v-slot="{ errors }" class="form-inline row text-white" @submit="handleSubmit($event, onSubmit)">
            <label class="small-text mt-2 col-sm-4 col-md-5 col-lg-5 col-xl-5 text-start">Model:</label>
            <Field name="gapReluctanceModels" as="select" :class="{ 'is-invalid': errors.gapReluctanceModels }" @change="onGapReluctanceModelsChange" class= "small-text bg-light text-white rounded-2 mt-2 col-sm-8 col-md-7 col-lg-7 col-xl-7" v-model="gapReluctanceModelSelected">
                <option disabled value="">Please select one</option>
                <option v-for="model, index in gapReluctanceModelNames"
                    :key="index"
                    :value="model">{{model}}
                </option>
            </Field>
            <p class="col-12 text-start">{{gapReluctanceModelDescriptions[gapReluctanceModelSelected]}}</p>
            <p class="col-12 text-start">This error has an average error of <span class="text-info">{{getGapReluctanceRoundedError}}</span> achieved in our evaluation tests, which can be found <a href="https://github.com/OpenMagnetics/MKF/blob/main/tests/TestReluctance.cpp" target="_blank" rel="noopener noreferrer">here</a>.</p>
            <p class="col-12 text-start d-flex">                
            <a class="mx-1 me-auto" :href="gapReluctanceModelExternalLink[gapReluctanceModelSelected]" target="_blank" rel="noopener noreferrer">Original Source</a>
            <a class="mx-1 ms-auto" :href="gapReluctanceModelInternalLink[gapReluctanceModelSelected]" target="_blank" rel="noopener noreferrer">OM article</a>
            </p>
        </Form>
    </div>
    <div class="container">
        <label class="text-white fs-4 text-center ">Core losses model</label>

        <Form ref="formRef" :validation-schema="schema" v-slot="{ errors }" class="form-inline row text-white" @submit="handleSubmit($event, onSubmit)">
            <label class="small-text mt-2 col-sm-4 col-md-5 col-lg-5 col-xl-5 text-start">Model:</label>
            <Field name="coreLossesModels" as="select" :class="{ 'is-invalid': errors.coreLossesModels }" @change="onCoreLossesModelsChange" class= "small-text bg-light text-white rounded-2 mt-2 col-sm-8 col-md-7 col-lg-7 col-xl-7" v-model="coreLossesModelSelected">
                <option disabled value="">Please select one</option>
                <option v-for="model, index in coreLossesModelNames"
                    :key="index"
                    :value="model">{{model}}
                </option>
            </Field>
            <p class="col-12 text-start">{{coreLossesModelDescriptions[coreLossesModelSelected]}}</p>
            <p class="col-12 text-start">This error has an average error of <span class="text-info">{{getCoreLossesRoundedError}}</span> achieved in our evaluation tests, which can be found <a href="https://github.com/OpenMagnetics/MKF/blob/main/tests/TestCoreLosses.cpp">here</a>.</p>
            <p class="col-12 text-start d-flex">                
            <a class="mx-1 me-auto" :href="coreLossesModelInternalLink[coreLossesModelSelected]">Original Source</a>
            <a class="mx-1 ms-auto" :href="coreLossesModelExternalLink[coreLossesModelSelected]">OM article</a>
            </p>
        </Form>
    </div>
    <div class="container">
        <label class="text-white fs-4 text-center ">Core temperature model</label>

        <Form ref="formRef" :validation-schema="schema" v-slot="{ errors }" class="form-inline row text-white" @submit="handleSubmit($event, onSubmit)">
            <label class="small-text mt-2 col-sm-4 col-md-5 col-lg-5 col-xl-5 text-start">Model:</label>
            <Field name="coreTemperatureModels" as="select" :class="{ 'is-invalid': errors.coreTemperatureModels }" @change="onCoreTemperatureModelsChange" class= "small-text bg-light text-white rounded-2 mt-2 col-sm-8 col-md-7 col-lg-7 col-xl-7" v-model="coreTemperatureModelSelected">
                <option disabled value="">Please select one</option>
                <option v-for="model, index in coreTemperatureModelNames"
                    :key="index"
                    :value="model">{{model}}
                </option>
            </Field>
            <p class="col-12 text-start">{{coreTemperatureModelDescriptions[coreTemperatureModelSelected]}}</p>
            <p class="col-12 text-start">This error has an average error of <span class="text-info">{{getCoreTemperatureRoundedError}}</span> achieved in our evaluation tests, which can be found <a href="https://github.com/OpenMagnetics/MKF/blob/main/tests/TestCoreTemperature.cpp">here</a>.</p>
            <p class="col-12 text-start d-flex">                
            <a class="mx-1 me-auto" :href="coreTemperatureModelInternalLink[coreTemperatureModelSelected]">Original Source</a>
            <a class="mx-1 ms-auto" :href="coreTemperatureModelExternalLink[coreTemperatureModelSelected]">OM article</a>
            </p>
        </Form>
    </div>
</template>

<style>
@media (min-width: 1200px) {
    .column-container {
        background-size: 100%; 
        background-repeat: no-repeat;
        background-position: center top;
        height: auto;
        min-height: 52vh;
    }
}
.custom-tooltip {
    --bs-tooltip-bg: var(--bs-primary);
}
</style>