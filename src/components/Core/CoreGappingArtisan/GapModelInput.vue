<script setup>
import { ref, onMounted, computed, inject } from 'vue'
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';
import { useCoreStore } from '/src/stores/core'
import * as Defaults from '/src/assets/js/defaults.js'
import * as Utils from '/src/assets/js/utils.js'

</script>
<script>
const schema = Yup.object().shape({
    gapModels: Yup.string().required('Please, choose a type of gap'),
});

export default {
    props: {
    },
    data() {
        const coreStore = useCoreStore();
        const gapModelSelected = this.$userStore.selectedModels['gapReluctance'];
        const modelNames = []
        const modelDescriptions = []
        const modelErrors = []
        const modelInternalLink = []
        const modelExternalLink = []
        return {
            coreStore,
            modelNames,
            modelDescriptions,
            modelErrors,
            modelInternalLink,
            modelExternalLink,
            gapModelSelected,
        }
    },
    watch: {},
    computed: {
        getRoundedError() {
            if (this.modelErrors[this.gapModelSelected] != null) {
                return Utils.removeTrailingZeroes(this.modelErrors[this.gapModelSelected] * 100, 2) + ' %'
            }
            return 'NaN %'
        }
    },
    created () {
        this.$mkf.ready.then(_ => {
            var aux = JSON.parse(this.$mkf.get_gap_reluctance_model_information());
            this.modelNames = Object.keys(aux["information"]);
            this.modelDescriptions = aux["information"];
            this.modelErrors = aux["errors"];
            this.modelInternalLink = aux["internal_links"];
            this.modelExternalLink = aux["external_links"];

        }).catch(error => { 
            console.error(error.data)
        });
    },
    methods: {
        handleSubmit() {
            console.log("handleSubmit")
        },
        onGapModelsChange() {
            this.$userStore.setSelectedModels('gapReluctance', this.gapModelSelected)
            this.coreStore.gapReluctanceModelChanged()
        },
    }
}
</script>

<template>
    <div class="container">
        <label class="text-white fs-4 text-center ">Reluctance model</label>

        <Form ref="formRef" :validation-schema="schema" v-slot="{ errors }" class="form-inline row text-white" @submit="handleSubmit($event, onSubmit)">
            <label class="small-text mt-2 col-sm-4 col-md-5 col-lg-5 col-xl-5 text-start">Model:</label>
            <Field dataTestLabel="CoreGappingArtisanGapModelInput-model-select-input" name="gapModels" as="select" :class="{ 'is-invalid': errors.gapModels }" @change="onGapModelsChange" class= "small-text bg-light text-white rounded-2 mt-2 col-sm-8 col-md-7 col-lg-7 col-xl-7" v-model="gapModelSelected">
                <option dataTestLabel="CoreGappingArtisanGapModelInput-model-NA-option-input" disabled value="">Please select one</option>
                <option v-for="model, index in modelNames"
                    :dataTestLabel="'CoreGappingArtisanGapModelInput-model-' + model + '-option-input'"
                    :key="index"
                    :value="model">{{model}}
                </option>
            </Field>
            <p dataTestLabel="CoreGappingArtisanGapModelInput-model-text" class="col-12 text-start">{{modelDescriptions[gapModelSelected]}}</p>
            <p dataTestLabel="CoreGappingArtisanGapModelInput-average-error-text" class="col-12 text-start">This error has an average error of <span class="text-info">{{getRoundedError}}</span> achieved in our evaluation tests, which can be found <a href="https://github.com/OpenMagnetics/MKF/blob/main/tests/TestReluctance.cpp">here</a>.</p>
            <p class="col-12 text-start d-flex">                
            <a dataTestLabel="CoreGappingArtisanGapModelInput-external-source-link" class="mx-1 me-auto" :href="modelExternalLink[gapModelSelected]">Original Source</a>
            <a dataTestLabel="CoreGappingArtisanGapModelInput-internal-source-link" class="mx-1 ms-auto" :href="modelInternalLink[gapModelSelected]">OM article</a>
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