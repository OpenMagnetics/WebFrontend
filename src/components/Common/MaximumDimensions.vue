<script setup>
import { useMasStore } from '/src/stores/mas'
import { toTitleCase, getMultiplier } from '/src/assets/js/utils.js'
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
            type: Object
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
            'width': {
                multiplier: null,
                scaledValue: null
            },
            'height': {
                multiplier: null,
                scaledValue: null
            },
            'depth': {
                multiplier: null,
                scaledValue: null
            },
        };

        if (this.modelValue.width != null) {
            const aux = getMultiplier(this.modelValue.width, 0.001);
            localData.width.scaledValue = aux.scaledValue;
            localData.width.multiplier = aux.multiplier;
        }

        if (this.modelValue.height != null) {
            const aux = getMultiplier(this.modelValue.height, 0.001);
            localData.height.scaledValue = aux.scaledValue;
            localData.height.multiplier = aux.multiplier;
        }

        if (this.modelValue.depth != null) {
            const aux = getMultiplier(this.modelValue.depth, 0.001);
            localData.depth.scaledValue = aux.scaledValue;
            localData.depth.multiplier = aux.multiplier;
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
            <label :data-cy="dataTestLabel + '-title'" class="rounded-2 fs-5 text-start" :class="'col-sm-12 col-md-12'">{{'Maximum Dimensions'}}</label>
        </div>
        <div class="row">
            <div class="fs-6 offset-1 col-11 row d-flex justify-content-between">
                <div class="col-4">
                    <label v-if="localData.width.scaledValue != null" for="design-requirements-width-input" class="px-0 col-form-label text-center">Width</label>
                </div>
                <div class="fs-6 col-8 row justify-content-end">
                    <input v-if="localData.width.scaledValue != null" type="number" class="px-0 col-4 bg-light text-white" id="design-requirements-width-input'" @change="changeScaledValue($event.target.value, 'width')" :value="localData.width.scaledValue">
                    <DimensionUnit :min="min" :max="max" v-if="unit != null && localData.width.scaledValue != null" :unit="unit" v-model="localData.width.multiplier" class="px-0 col-2" @update:modelValue="changeMultiplier('width')"/>
                </div>
                <button v-if="localData.width.scaledValue == null" class="col-12 px-xl-3 px-md-0 btn btn-primary" @click="add('width')">{{'Add Width'}}</button>
            </div>
        </div>
        <div class="row">
            <div class="fs-6 offset-1 col-11 row d-flex justify-content-between">
                <div class="col-4">
                    <label v-if="localData.height.scaledValue != null" for="design-requirements-height-input" class="px-0 col-form-label text-center">Height</label>
                </div>
                <div class="fs-6 col-8 row justify-content-end">
                    <input v-if="localData.height.scaledValue != null" type="number" class="px-0 col-4 bg-light text-white" id="design-requirements-height-input'" @change="changeScaledValue($event.target.value, 'height')" :value="localData.height.scaledValue">
                    <DimensionUnit :min="min" :max="max" v-if="unit != null && localData.height.scaledValue != null" :unit="unit" v-model="localData.height.multiplier" class="px-0 col-2" @update:modelValue="changeMultiplier('height')"/>
                </div>
                <button v-if="localData.height.scaledValue == null" class="col-12 px-xl-3 px-md-0 btn btn-primary" @click="add('height')">{{'Add Height'}}</button>
            </div>
        </div>
        <div class="row">
            <div class="fs-6 offset-1 col-11 row d-flex justify-content-between">
                <div class="col-4">
                    <label v-if="localData.depth.scaledValue != null" for="design-requirements-depth-input" class="px-0 col-form-label text-center">Depth</label>
                </div>
                <div class="fs-6 col-8 row justify-content-end">
                    <input v-if="localData.depth.scaledValue != null" type="number" class="px-0 col-4 bg-light text-white" id="design-requirements-depth-input'" @change="changeScaledValue($event.target.value, 'depth')" :value="localData.depth.scaledValue">
                    <DimensionUnit :min="min" :max="max" v-if="unit != null && localData.depth.scaledValue != null" :unit="unit" v-model="localData.depth.multiplier" class="px-0 col-2" @update:modelValue="changeMultiplier('depth')"/>
                </div>
                <button v-if="localData.depth.scaledValue == null" class="col-12 px-xl-3 px-md-0 btn btn-primary" @click="add('depth')">{{'Add Depth'}}</button>
            </div>
        </div>
        <div class="row">
            <label class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>
</template>


