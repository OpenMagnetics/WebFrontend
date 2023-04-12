<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import { useDataCacheStore } from '/src/stores/dataCache'
import * as Utils from '/src/assets/js/utils.js'
import * as Defaults from '/src/assets/js/defaults.js'

</script>

<script>
const schema = Yup.object().shape({
    temperatureField: Yup.number().required('Please, introduce a temperature').min(-273.15).label("Temperature"),
    targetInductanceField: Yup.number().typeError('Target Inductance cannot be empty').required('Please, introduce a target inductance').min(0.01).label("Target Inductance"),
    numberTurnsField: Yup.number().required('Please, introduce a number of turns').min(1).label("Target Inductance"),
    simpleGapField: Yup.number().required('Please, introduce a gap').min(0.01).label("Gap"),
    simpleShapeField: Yup.string().required('Please, introduce a shape'),
    simpleMaterialField: Yup.string().required('Please, introduce a material'),
});

export default {
    data() {
        const temperatureSelected = 42;
        const targetInductanceSelected = 1000;
        const numberTurnsSelected = 23;
        const simpleGapSelected = 1;
        const simpleShapeSelected = 42;
        const simpleMaterialSelected = 42;
        const commercialShapesNames = [];
        const dataCacheStore = useDataCacheStore()
        return {
            temperatureSelected,
            targetInductanceSelected,
            numberTurnsSelected,
            simpleGapSelected,
            simpleShapeSelected,
            simpleMaterialSelected,
            dataCacheStore,
            commercialShapesNames,
        }
    },
    created() {
        this.dataCacheStore.$onAction((action) => {
            if (action.name == "commercialShapesLoaded") {
                const shapeData = this.dataCacheStore.commercialShapes
                this.commercialShapesNames = []
                shapeData.forEach((item) => {
                    this.commercialShapesNames.push(item['name'])
                })
                console.log(this.commercialShapesNames)
            }
        })
        this.$userStore.$onAction((action) => {
            if (action.name == "setGlobalCoreAlt") {
                const coreData = action.args[0]
                console.log("action.args[0]")
                console.log(coreData['functionalDescription']['shape']['name'])
                this.simpleShapeSelected = coreData['functionalDescription']['shape']['name']
                console.log(this.simpleShapeSelected)
            }
        })
    },
    methods: {
        onShapeChange () {
            console.log("onShapeChange")
            console.log(this.simpleShapeSelected)
            var shapeDataSelected = {}
            this.dataCacheStore.commercialShapes.forEach((item) => {
                if (item['name'] == this.simpleShapeSelected) {
                    shapeDataSelected = Utils.deepCopy(item)
                }
            })
            this.$userStore.setGlobalCoreShape(shapeDataSelected)
            console.log(shapeDataSelected)
            console.log(this.$userStore.globalCore)
        },
        onMaterialChange () {
            console.log("onMaterialChange")
            console.log(this.simpleMaterialSelected)
            var materialDataSelected = {}
            this.dataCacheStore.commercialMaterials.forEach((item) => {
                if (item['name'] == this.simpleMaterialSelected) {
                    materialDataSelected = Utils.deepCopy(item)
                }
            })
            this.$userStore.setGlobalCoreMaterial(materialDataSelected)
            console.log(materialDataSelected)
            console.log(this.$userStore.globalCore)
        },
        handleSubmit(params) {
        },
    },
}
</script>


<template>
    <div class="container-flex text-primary mt-2 mb-3 pb-3 border-bottom">
        <label class="fs-4 mx-3 mb-3 text-primary text-center">Core inputs</label>
        <Form ref="formRef" :validation-schema="schema" v-slot="{ handleSubmit, errors }" class="form-inline" @submit="handleSubmit($event, onSubmit)">
            <div></div>
            <label class="rounded-2 fs-5 col-5">Temp</label>
            <Field ref="temperatureFieldRef" name="temperatureField" type="number" v-model="temperatureSelected" @change="$emit('switching-frequency-change', $event.target.value)" :class="{ 'is-invalid': errors.temperatureField }" class="rounded-2 bg-light text-white offset-1 col-4 text-end"/>
            <label class="rounded-2 fs-6 text-end col-2">{{"°C"}}</label>
            <div class="invalid-feedback">{{errors.temperatureField}}</div>

            <div class="mt-1"></div>
            <label class="rounded-2 fs-5 col-5">Target L </label>
            <Field ref="targetInductanceFieldRef" name="targetInductanceField" type="number" v-model="targetInductanceSelected" @change="$emit('switching-frequency-change', $event.target.value)" :class="{ 'is-invalid': errors.targetInductanceField }" class="rounded-2 bg-light text-white offset-1 col-4 text-end"/>
            <label class="rounded-2 fs-6 text-end col-2">{{"μH"}}</label>
            <div class="invalid-feedback">{{errors.targetInductanceField}}</div>

            <div class="mt-1"></div>
            <label class="rounded-2 fs-5 col-5">No. turns</label>
            <Field ref="numberTurnsFieldRef" name="numberTurnsField" type="number" v-model="numberTurnsSelected" @change="$emit('switching-frequency-change', $event.target.value)" :class="{ 'is-invalid': errors.numberTurnsField }" class="rounded-2 bg-light text-white offset-1 col-4 text-end"/>
            <label class="rounded-2 fs-6 text-end col-2">{{""}}</label>
            <div class="invalid-feedback">{{errors.numberTurnsField}}</div>

            <div class="mt-1"></div>
            <label class="rounded-2 fs-5 col-5">Gap</label>
            <Field ref="simpleGapFieldRef" name="simpleGapField" type="number" v-model="simpleGapSelected" @change="$emit('switching-frequency-change', $event.target.value)" :class="{'is-invalid': errors.simpleGapField }" class="rounded-2 bg-light text-white offset-1 col-4 text-end"/>
            <label class="rounded-2 fs-6 text-end col-2">{{"mm"}}</label>
            <div class="invalid-feedback">{{errors.simpleGapField}}</div>

            <div class="mt-1"></div>
            <label class="rounded-2 fs-5 col-5">Shape</label>
            <Field name="simpleShapeField" ref="simpleShapeFieldRef" as="select" :class="{'is-invalid': errors.simpleShapeField }" @change="onShapeChange" class= "fs-6 bg-light text-white rounded-2 col-5" v-model="simpleShapeSelected">
                <option disabled value="">Please select one</option>
                <option disabled value="Custom">Custom</option>
                <option v-for="model, index in commercialShapesNames"
                    :key="index"
                    :value="model">{{model}}
                </option>
            </Field>
            <button v-tooltip="'Open information table for shapes'" class="btn btn-primary text-dark ms-2 p-0 col-1 submit-btn" data-bs-toggle="modal" data-bs-target="#loadCommercialShapeModal">
                <i class="fa-solid fs-6 fa-table-list m-0 p-0"></i>
            </button>
            <div class="invalid-feedback">{{errors.simpleShapeField}}</div>

            <div class="mt-1"></div>
            <label class="rounded-2 fs-5 col-5">Material</label>
            <Field name="simpleMaterialField" ref="simpleMaterialFieldRef" as="select" :class="{ 'is-invalid': errors.simpleMaterialField }" @change="onMaterialChange" class= "fs-6 bg-light text-white rounded-2 offset 1 col-5" v-model="simpleMaterialSelected">
                <option disabled value="">Please select one</option>
                <option value="3C97">3C97</option>
                <option value="3C92">3C92</option>
            </Field>
            <button v-tooltip="'Open information table for materials'" class="btn btn-primary text-dark ms-2 p-0 col-1">
                <i class="fa-solid fs-6 fa-table-list m-0 p-0"></i>
            </button>
            <div class="invalid-feedback">{{errors.simpleMaterialField}}</div>

        </Form>
    </div>
</template>

