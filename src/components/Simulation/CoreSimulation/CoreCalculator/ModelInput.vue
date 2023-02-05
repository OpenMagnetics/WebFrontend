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
        const coreLossesModelSelected = "ComingSoon";
        const coreLossesModelNames = ["ComingSoon"]
        const coreLossesModelDescriptions = []
        const coreLossesModelErrors = []
        const coreLossesModelInternalLink = []
        const coreLossesModelExternalLink = []
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
            if (this.coreLossesModelErrors[this.gapReluctanceModelSelected] != null) {
                return Utils.removeTrailingZeroes(this.coreLossesModelErrors[this.gapReluctanceModelSelected] * 100, 2) + ' %'
            }
            return 'NaN %'
        }
    },
    created () {
        const url = import.meta.env.VITE_API_ENDPOINT + '/get_gap_reluctance_models'

        this.$axios.post(url, {})
        .then(response => {
            console.log(response.data)
            this.gapReluctanceModelNames = Object.keys(response.data["information"]);
            this.gapReluctanceModelDescriptions = response.data["information"];
            this.gapReluctanceModelErrors = response.data["errors"];
            this.gapReluctanceModelInternalLink = response.data["internal_links"];
            this.gapReluctanceModelExternalLink = response.data["external_links"];
        })
        .catch(error => {
            console.error(error.data)
        });
    },
    methods: {
        handleSubmit() {
            console.log("handleSubmit")
        },
        onGapReluctanceModelsChange() {
            this.$userStore.setSelectedModels('gapReluctance', this.gapReluctanceModelSelected)
            this.simulationStore.calculateInductance()
        },
        onCoreLossesModelsChange() {
            // this.$userStore.setSelectedModels('gapReluctance', this.gapReluctanceModelSelected)
            // this.simulationStore.calculateInductance()
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
            <Field disabled name="coreLossesModels" as="select" :class="{ 'is-invalid': errors.coreLossesModels }" @change="onCoreLossesModelsChange" class= "small-text bg-light text-white rounded-2 mt-2 col-sm-8 col-md-7 col-lg-7 col-xl-7" v-model="coreLossesModelSelected">
                <option disabled value="">Please select one</option>
                <option v-for="model, index in coreLossesModelNames"
                    :key="index"
                    :value="model">{{model}}
                </option>
            </Field>
<!--             <p class="col-12 text-start">{{coreLossesModelDescriptions[coreLossesModelSelected]}}</p>
            <p class="col-12 text-start">This error has an average error of <span class="text-info">{{getCoreLossesRoundedError}}</span> achieved in our evaluation tests, which can be found <a href="https://github.com/OpenMagnetics/MKF/blob/main/tests/TestReluctance.cpp">here</a>.</p>
            <p class="col-12 text-start d-flex">                
            <a class="mx-1 me-auto" :href="coreLossesModelInternalLink[coreLossesModelSelected]">Original Source</a>
            <a class="mx-1 ms-auto" :href="coreLossesModelExternalLink[coreLossesModelSelected]">OM article</a>
            </p> -->
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