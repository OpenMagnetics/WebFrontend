<script setup>
import { isNumber, toTitleCase, getMultiplier, removeTrailingZeroes } from '/src/assets/js/utils.js'
import DimensionUnit from '/src/components/DataInput/DimensionUnit.vue'
</script>
<script>
export default {
    props: {
        name:{
            type: String,
            required: true
        },
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
        dataTestLabel: {
            type: String,
            default: '',
        },
        allowNegative:{
            type: Boolean,
            default: false
        },
        altUnit:{
            type: String,
            default: ''
        },
        visualScale:{
            type: Number,
            default: 1
        },
    },
    data() {
        const localData = {
            multiplier: null,
            scaledValue: null
        };

        const errorMessages = "";
        if (this.modelValue[this.name] == null &&
            this.defaultValue != null) {
            const aux = getMultiplier(this.defaultValue, 0.001);
            localData.scaledValue = removeTrailingZeroes(aux.scaledValue);
            localData.multiplier = aux.multiplier;
        }

        if (this.modelValue[this.name] != null) {
            const aux = getMultiplier(this.modelValue[this.name], 0.001);
            localData.scaledValue = removeTrailingZeroes(aux.scaledValue);
            localData.multiplier = aux.multiplier;
        }

        var shortenedName = this.name;

        return {
            localData,
            errorMessages,
            shortenedName,
        }
    },
    computed: {
    },
    watch: {
        modelValue(newValue, oldValue) {
            if (newValue[this.name] != null)
                this.update(newValue[this.name]);
        },
        'modelValue.dutyCycle'(newValue, oldValue) {
            if (this.name == 'dutyCycle'){
                if (newValue != null)
                    if (newValue[this.name] != null)
                        this.update(newValue);
            }
        },
    },
    mounted () {    
        this.shortenedName = this.shortenName();
    },
    methods: {
        shortenName() {
            if (this.$refs.container == undefined)
                return this.name

            var shortenName = toTitleCase(this.name);
            if (this.$refs.container.clientWidth < 400 && this.name.length > 10) {
                var slice = 7;
                if (this.$refs.container.clientWidth < 310)
                    slice = 6;
                if (this.$refs.container.clientWidth < 250)
                    slice = 4;

                shortenName = shortenName.split(' ')
                    .map(item => item.length < slice? item + ' ' : item.slice(0, slice) + '. ')
                    .join('')
            }
            return shortenName
        },
        checkErrors() {
            var hasError = false;
            this.errorMessages = "";
            if (this.localData.scaledValue == null) {
                hasError = true;
                this.errorMessages += "Value must be set. Set it or remove the requirement from the menu.\n"
            }

            if (isNaN(this.localData.scaledValue)) {
                this.errorMessages += "Value cannot be empty.\n"
            }
            if (this.localData.scaledValue != null) {
                const nominalActualValue = this.localData.scaledValue * this.localData.multiplier;
                if (nominalActualValue <= 0 && !this.allowNegative) {
                    hasError = true;
                    this.errorMessages += "Value must be greater or equal than 0.\n"
                }
            }
            return hasError;
        },
        update(actualValue) {
            if (this.max != null) {
                if (this.allowNegative){
                    if (Math.abs(actualValue) > this.max)
                        actualValue = this.max * Math.sign(actualValue);
                }
                else {
                    if (actualValue > this.max)
                        actualValue = this.max;
                }
            }
            if (this.min != null) {
                if (this.allowNegative) {
                    if (Math.abs(actualValue) < this.min)
                        actualValue = this.min * Math.sign(actualValue);
                }
                else{
                    if (actualValue < this.min)
                        actualValue = this.min;
                }
            }

            if (this.unit != null) {
                const aux = getMultiplier(actualValue, 0.001);
                this.$refs.inputRef.value = removeTrailingZeroes(aux.scaledValue)
                this.localData.scaledValue = aux.scaledValue;
                this.localData.multiplier = aux.multiplier;
            }
            else {
                this.$refs.inputRef.value = removeTrailingZeroes(actualValue)
                this.localData.scaledValue = removeTrailingZeroes(actualValue);
                this.localData.multiplier = 1;
            }

            const hasError = this.checkErrors();
            if (!hasError) {
                this.modelValue[this.name] = actualValue;
                this.$emit("update", actualValue);
            }
        },
        changeMultiplier() {
            const actualValue = this.localData.scaledValue * this.localData.multiplier;
            this.update(actualValue);
        },
        changeScaledValue(value) {
            const actualValue = value * this.localData.multiplier / this.visualScale;
            this.update(actualValue);
        },
    }
}
</script>


<template>
    <div :data-cy="dataTestLabel + '-container'" class="container-flex" ref="container">
        <div class="row">
            <label :data-cy="dataTestLabel + '-title'" class="rounded-2 fs-5 col-xs-12 col-md-7 ">{{shortenedName}}</label>
            <div v-if="localData.scaledValue != null" class="col-xs-8 col-md-5 row m-0 px-0">
                <input :data-cy="dataTestLabel + '-number-input'" type="number" class="m-0 px-0 col-6 bg-light text-white" @change="changeScaledValue($event.target.value)" :value="localData.scaledValue * visualScale" ref="inputRef">
                <DimensionUnit :data-cy="dataTestLabel + '-DimensionUnit-input'" :min="min" :max="max" v-if="unit != null" :unit="unit" v-model="localData.multiplier" class="m-0 px-0 col-3" @update:modelValue="changeMultiplier"/>
                <label :data-cy="dataTestLabel + '-DimensionUnit-text'" v-if="unit == null" class="ms-2 pt-1 px-0 col-3" >{{altUnit}}</label>
            </div>
        </div>
        <div class="row">
            <label :data-cy="dataTestLabel + '-error-text'" class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>
</template>


