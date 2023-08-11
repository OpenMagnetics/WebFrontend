<script setup>
import { useMasStore } from '/src/stores/mas'
import { isNumber, toTitleCase, getMultiplier } from '/src/assets/js/utils.js'
import DimensionUnit from '/src/components/DataInput/DimensionUnit.vue'

</script>

<script>
export default {
    props: {
        unit:{
            type: String,
            required: false
        },
        modelValue:{
            type: Object,
            required: true
        },
        defaultValue:{
            type: Array
        },
        min:{
            type: Number,
            default: 1e-12
        },
        max:{
            type: Number,
            default: 1e+9
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const masStore = useMasStore();
        var localData = {
            0: {
                multiplier: null,
                scaledValue: null
            },
            1: {
                multiplier: null,
                scaledValue: null
            },
            2: {
                multiplier: null,
                scaledValue: null
            },
        };

        if (this.modelValue[0] != null) {
            const aux = getMultiplier(this.modelValue[0], 0.001);
            localData[0].scaledValue = aux.scaledValue;
            localData[0].multiplier = aux.multiplier;
        }

        if (this.modelValue[1] != null) {
            const aux = getMultiplier(this.modelValue[1], 0.001);
            localData[1].scaledValue = aux.scaledValue;
            localData[1].multiplier = aux.multiplier;
        }

        if (this.modelValue[2] != null) {
            const aux = getMultiplier(this.modelValue[2], 0.001);
            localData[2].scaledValue = aux.scaledValue;
            localData[2].multiplier = aux.multiplier;
        }

        const errorMessages = "";

        return {
            masStore,
            errorMessages,
            localData,
        }
    },
    computed: {    },
    watch: { 
    },
    mounted () {
    },
    methods: {
        checkErrors() {
            var hasError = false;
            this.errorMessages = "";
            return hasError;
        },
        update(field, actualValue) {
            const aux = getMultiplier(actualValue, 0.001);
            this.localData[field].scaledValue = aux.scaledValue;
            this.localData[field].multiplier = aux.multiplier;
            const hasError = this.checkErrors();
            if (!hasError) {
                this.modelValue[field] = actualValue;
                this.$emit("update", field, actualValue);
            }
        },
        changeMultiplier(field) {
            const actualValue = this.localData[field].scaledValue * this.localData[field].multiplier;
            this.update(field, actualValue);
        },
        add(field) {
            const newValue = this.defaultValue[field];
            this.update(field, newValue);
        },
        removeField(field) {
            this.localData[field].scaledValue = null;
            this.localData[field].multiplier = null;
            const hasError = this.checkErrors();
            if (!hasError) {
                this.modelValue[field] = null;
            }
        },
        changeScaledValue(value, field) {
            if (value == '' || value < 0) {
                this.removeField(field);
            }
            else {
                const actualValue = value * this.localData[field].multiplier;
                this.update(field, actualValue);
            }
        },
    }
}
</script>


<template>
    <div :data-cy="dataTestLabel + '-container'" class="container-flex border-bottom">
        <div class="row">
            <label :data-cy="dataTestLabel + '-title'" class="rounded-2 fs-5 ms-3" :class="'col-sm-6 col-md-5'">{{'Maximum Dimensions'}}</label>
        </div>
        <div class="row">
            <label v-if="localData[0].scaledValue != null" for="design-requirements-width-input" class="m-0 px-0 col-2 col-form-label text-center">Width</label>
            <input v-if="localData[0].scaledValue != null" type="number" class="m-0 px-0 col-1 bg-light text-white" id="design-requirements-width-input'" @change="changeScaledValue($event.target.value, 0)" :value="localData[0].scaledValue">
            <DimensionUnit :min="min" :max="max" v-if="unit != null && localData[0].scaledValue != null" :unit="unit" v-model="localData[0].multiplier" class="m-0 ms-1 px-0 col-1" @update:modelValue="changeMultiplier(0)"/>
            <button v-if="localData[0].scaledValue == null" class="col-3 m-0 px-xl-3 px-md-0 btn btn-primary mx-4" @click="add(0)">{{'Add Width'}}</button>

            <label v-if="localData[1].scaledValue != null" for="design-requirements-width-input" class="m-0 px-0 col-2 col-form-label text-center">Height</label>
            <input v-if="localData[1].scaledValue != null" type="number" class="m-0 px-0 col-1 bg-light text-white" id="design-requirements-width-input'" @change="changeScaledValue($event.target.value, 1)" :value="localData[1].scaledValue">
            <DimensionUnit :min="min" :max="max" v-if="unit != null && localData[1].scaledValue != null" :unit="unit" v-model="localData[1].multiplier" class="m-0 ms-1 px-0 col-1" @update:modelValue="changeMultiplier(1)"/>
            <button v-if="localData[1].scaledValue == null" class="col-3 m-0 px-xl-3 px-md-0 btn btn-primary mx-4" @click="add(1)">{{'Add Heigth'}}</button>

            <label v-if="localData[2].scaledValue != null" for="design-requirements-width-input" class="m-0 px-0 col-2 col-form-label text-center">Depth</label>
            <input v-if="localData[2].scaledValue != null" type="number" class="m-0 px-0 col-1 bg-light text-white" id="design-requirements-width-input'" @change="changeScaledValue($event.target.value, 2)" :value="localData[2].scaledValue">
            <DimensionUnit :min="min" :max="max" v-if="unit != null && localData[2].scaledValue != null" :unit="unit" v-model="localData[2].multiplier" class="m-0 ms-1 px-0 col-1" @update:modelValue="changeMultiplier(2)"/>
            <button v-if="localData[2].scaledValue == null" class="col-3 m-0 px-xl-3 px-md-0 btn btn-primary mx-4" @click="add(2)">{{'Add Depth'}}</button>
        </div>
        <div class="row">
            <label class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>
</template>


