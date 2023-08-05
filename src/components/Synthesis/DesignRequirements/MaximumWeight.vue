<script setup>
import { isNumber, toTitleCase, getMultiplier } from '/src/assets/js/utils.js'
import DimensionUnit from '/src/components/Synthesis/DesignRequirements/DimensionUnit.vue'
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
            type: Number
        },
        min:{
            type: Number,
            default: 1e-12
        },
        max:{
            type: Number,
            default: 1e+9
        },
    },
    data() {
        var localData = {
            multiplier: null,
            scaledValue: null
        };

        const errorMessages = "";
        if (this.modelValue['maximumWeight'] == null &&
            this.defaultValue != null) {
            console.log(this.defaultValue);
            localData.scaledValue = aux.scaledValue;
            localData.multiplier = aux.multiplier;
        }

        if (this.modelValue['maximumWeight'] != null) {
            const aux = getMultiplier(this.modelValue['maximumWeight'], 0.001);
            localData.scaledValue = aux.scaledValue;
            localData.multiplier = aux.multiplier;
        }

        return {
            localData,
            errorMessages,
        }
    },
    computed: {
        shortenedButtonLabels() {
            const shortenedButtonLabels = {}
            for (let [key, value] of Object.entries(this.buttonLabels)) {
                var label = value;
                if (window.innerWidth > 768 && window.innerWidth < 1005) {
                    var slice = 3;

                    label = label.split(' ')
                        .map(item => item.length < slice? item + ' ' : item.slice(0, slice) + '. ')
                        .join('')
                    // label = label.slice(0, slice) + '.'
                }
                shortenedButtonLabels[key] = label;
            }
            return shortenedButtonLabels
        }
    },
    watch: { 
    },
    mounted () {
    },
    methods: {
        checkErrors() {
            var hasError = false;
            this.errorMessages = "";
            if (this.localData.scaledValue == null) {
                hasError = true;
                this.errorMessages += "Value must be set. Set it or remove the requirement from the menu.\n"
            }
            if (this.localData.scaledValue != null) {
                const nominalActualValue = this.localData.scaledValue * this.localData.multiplier;
                if (nominalActualValue <= 0) {
                    hasError = true;
                    this.errorMessages += "Value must be greater or equal than 0.\n"
                }
            }
            return hasError;
        },
        update(actualValue) {
            const aux = getMultiplier(actualValue, 0.001);
            this.localData.scaledValue = aux.scaledValue;
            this.localData.multiplier = aux.multiplier;
            const hasError = this.checkErrors();
            if (!hasError) {
                this.modelValue['maximumWeight'] = actualValue;
                this.$emit("update", actualValue);
            }
        },
        changeMultiplier() {
            const actualValue = this.localData.scaledValue * this.localData.multiplier;
            this.update(actualValue);
        },
        changeScaledValue(value) {
            const actualValue = value * this.localData.multiplier;
            this.update(actualValue);
        },
    }
}
</script>


<template>
    <div class="container-flex">
        <div class="row">
            <label class="rounded-2 fs-5 ms-3 col-xs-4 col-md-4 ">{{'Maximum Weight'}}</label>
            <div v-if="localData.scaledValue != null" class="col-xs-5 col-md-5 row m-0 px-0">
                <input type="number" class="m-0 px-0 col-4 bg-light text-white" :id="'design-requirements-maximum-weight-input'" @change="changeScaledValue($event.target.value)" :value="localData.scaledValue">
                <DimensionUnit :min="min" :max="max" v-if="unit != null" :unit="unit" v-model="localData.multiplier" class="m-0 ms-1 px-0 col-4" @update:modelValue="changeMultiplier"/>
            </div>
        </div>
        <div class="row">
            <label class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>
</template>


