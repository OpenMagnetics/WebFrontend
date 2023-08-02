<script setup>
import { isNumber, toTitleCase, getMultiplier } from '/src/assets/js/utils.js'
import DimensionUnit from '/src/components/Synthesis/DesignRequirements/DimensionUnit.vue'
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
        defaultField:{
            type: String,
            default: "nominal"
        },
        defaultValue:{
            type: Object,
            default: 0
        },
        halfSize:{
            type: Boolean,
            default: false    
        },
    },
    data() {
        var localData = {
            minimum: {
                multiplier: null,
                scaledValue: null
            },
            nominal: {
                multiplier: null,
                scaledValue: null
            },
            maximum: {
                multiplier: null,
                scaledValue: null
            },
        };

        const buttonLabels = {
            minimum: "Add minimum",
            nominal: "Add nominal",
            maximum: "Add maximum",
        };

        const errorMessages = "";
        if (this.modelValue.minimum == null &&
            this.modelValue.nominal == null &&
            this.modelValue.maximum == null &&
            this.defaultField != null &&
            this.defaultValue != null) {
            const aux = getMultiplier(this.defaultValue[this.defaultField]);
            localData[this.defaultField].scaledValue = aux.scaledValue;
            localData[this.defaultField].multiplier = aux.multiplier;
        }

        if (this.modelValue.minimum != null) {
            const aux = getMultiplier(this.modelValue.minimum, 0.001);
            localData.minimum.scaledValue = aux.scaledValue;
            localData.minimum.multiplier = aux.multiplier;
        }
        if (this.modelValue.nominal != null) {
            const aux = getMultiplier(this.modelValue.nominal, 0.001);
            localData.nominal.scaledValue = aux.scaledValue;
            localData.nominal.multiplier = aux.multiplier;
        }
        if (this.modelValue.maximum != null) {
            const aux = getMultiplier(this.modelValue.maximum, 0.001);
            localData.maximum.scaledValue = aux.scaledValue;
            localData.maximum.multiplier = aux.multiplier;
        }
        return {
            localData,
            buttonLabels,
            errorMessages,
        }
    },
    computed: {
        shortenedButtonLabels() {
            const shortenedButtonLabels = {}
            for (let [key, value] of Object.entries(this.buttonLabels)) {
                var label = value;
                if (window.innerWidth > 768 && window.innerWidth < 1005 && !this.halfSize ||
                    window.innerWidth > 768 && window.innerWidth < 2000 && this.halfSize) {
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
        this.checkErrors();
    },
    methods: {
        checkErrors() {
            var hasError = false;
            this.errorMessages = "";
            if (this.localData.minimum.scaledValue == null && this.localData.nominal.scaledValue == null && this.localData.maximum.scaledValue == null) {
                hasError = true;
                this.errorMessages += "At least one value must be set. Set one or remove the requirement from the menu.\n"
            }
            if (this.localData.nominal.scaledValue != null) {
                const nominalActualValue = this.localData.nominal.scaledValue * this.localData.nominal.multiplier;
                if (nominalActualValue <= 0) {
                    hasError = true;
                    this.errorMessages += "Nominal value must be greater or equal than 0.\n"
                }
            }
            if (this.localData.minimum.scaledValue != null) {
                const minimumActualValue = this.localData.minimum.scaledValue * this.localData.minimum.multiplier;
                if (minimumActualValue <= 0) {
                    hasError = true;
                    this.errorMessages += "Minimum value must be greater or equal than 0.\n"
                }
            }
            if (this.localData.maximum.scaledValue != null) {
                const maximumActualValue = this.localData.maximum.scaledValue * this.localData.maximum.multiplier;
                if (maximumActualValue <= 0) {
                    hasError = true;
                    this.errorMessages += "Maximum value must be greater or equal than 0.\n"
                }
            }
            if (this.localData.maximum.scaledValue != null && this.localData.nominal.scaledValue != null) {
                const nominalActualValue = this.localData.nominal.scaledValue * this.localData.nominal.multiplier;
                const maximumActualValue = this.localData.maximum.scaledValue * this.localData.maximum.multiplier;
                if (nominalActualValue >= maximumActualValue) {
                    hasError = true;
                    this.errorMessages += "Nominal value must be smaller than maximum value. Change or delete one of the fields.\n"
                }
            }
            if (this.localData.minimum.scaledValue != null && this.localData.nominal.scaledValue != null) {
                const nominalActualValue = this.localData.nominal.scaledValue * this.localData.nominal.multiplier;
                const minimumActualValue = this.localData.minimum.scaledValue * this.localData.minimum.multiplier;
                if (nominalActualValue <= minimumActualValue) {
                    hasError = true;
                    this.errorMessages += "Nominal value must be greater than minimum value. Change or delete one of the fields.\n"
                }
            }
            if (this.localData.minimum.scaledValue != null && this.localData.maximum.scaledValue != null) {
                const maximumActualValue = this.localData.maximum.scaledValue * this.localData.maximum.multiplier;
                const minimumActualValue = this.localData.minimum.scaledValue * this.localData.minimum.multiplier;
                if (maximumActualValue <= minimumActualValue) {
                    hasError = true;
                    this.errorMessages += "Maximum value must be greater than minimum value. Change or delete one of the fields.\n"
                }
            }
            return hasError;
        },
        update(field, actualValue) {
            const aux = getMultiplier(actualValue, 0.001);
            console.log("actualValue");
            console.log(actualValue);
            console.log("aux");
            console.log(aux);
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
            var newValue = this.defaultValue[field];
            if (field == 'minimum') {
                if (this.localData.nominal.scaledValue != null) {
                    newValue = this.localData.nominal.scaledValue / 2;
                    newValue *= this.localData.nominal.multiplier;
                }
                else if (this.localData.maximum.scaledValue != null) {
                    newValue = this.localData.maximum.scaledValue / 2;
                    newValue *= this.localData.maximum.multiplier;
                }
            }
            if (field == 'nominal') {
                if (this.localData.minimum.scaledValue != null && this.localData.maximum.scaledValue != null) {
                    const maximumActualValue = this.localData.maximum.scaledValue * this.localData.maximum.multiplier;
                    const minimumActualValue = this.localData.minimum.scaledValue * this.localData.minimum.multiplier;
                    newValue = (minimumActualValue + maximumActualValue) / 2;
                }
                else if (this.localData.minimum.scaledValue != null) {
                    newValue = this.localData.minimum.scaledValue * 2;
                    newValue *= this.localData.minimum.multiplier;
                }
                else if (this.localData.maximum.scaledValue != null) {
                    newValue = this.localData.maximum.scaledValue / 2;
                    newValue *= this.localData.maximum.multiplier;
                }
            }
            if (field == 'maximum') {
                if (this.localData.nominal.scaledValue != null) {
                    newValue = this.localData.nominal.scaledValue * 2;
                    newValue *= this.localData.nominal.multiplier;
                }
                else if (this.localData.minimum.scaledValue != null) {
                    newValue = this.localData.minimum.scaledValue * 2;
                    newValue *= this.localData.minimum.multiplier;
                }
            }
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
    <div class="container-flex">
        <div class="row">
            <label class="rounded-2 fs-5 ms-3">{{toTitleCase(name)}}</label>
        <div class="row">
        </div>
            <div v-if="!halfSize" class=" col-sm-0 col-md-2"></div>
            <div v-if="localData.minimum.scaledValue != null" :class="halfSize? 'ms-sm-4 col-md-4' : 'col-md-3 '" class=" col-xs-12 row m-0 px-0">
                <button :for="name + 'nominal-input'" class="remove-button m-0 px-0 col-4 col-form-label text-center btn text-white" @click="removeField('minimum')" style="max-height: 2.3em;"> <span class="normal-text" >Min.</span> <i class="fa-solid fa-xmark icon" ></i>  </button>
                <input type="number" class="m-0 px-0 col-4 bg-light text-white" :id="name + 'minimum-input'" @change="changeScaledValue($event.target.value, 'minimum')" :value="localData.minimum.scaledValue">
                <DimensionUnit v-if="unit != null" :unit="unit" v-model="localData.minimum.multiplier" class="m-0 ms-1 px-0 col-4" @update:modelValue="changeMultiplier('minimum')"/>
            </div>
            <div v-if="localData.minimum.scaledValue == null" class="col-md-3 row m-0 px-xl-3 px-md-0">
                <button :class="halfSize? 'mx-0 px-0' : ''" class="btn btn-primary float-end" @click="add('minimum')">{{shortenedButtonLabels.minimum}}</button>
            </div>

            <div v-if="localData.nominal.scaledValue != null" :class="halfSize? 'col-md-4' : 'col-md-3 '" class="col-xs-12 row m-0 px-0">
                <button :for="name + 'nominal-input'" class="remove-button m-0 px-0 col-4 col-form-label text-center btn text-white" @click="removeField('nominal')" style="max-height: 2.3em;"> <span class="normal-text" >Nom.</span> <i class="fa-solid fa-xmark icon" ></i>  </button>
                <input type="number" class="m-0 px-0 col-4 bg-light text-white" :id="name + 'nominal-input'" @change="changeScaledValue($event.target.value, 'nominal')"  :value="localData.nominal.scaledValue">
                <DimensionUnit v-if="unit != null" :unit="unit" v-model="localData.nominal.multiplier" class="m-0 ms-1 px-0 col-4" @update:modelValue="changeMultiplier('nominal')"/>
            </div>
            <div v-if="localData.nominal.scaledValue == null" class="col-md-3 row m-0 px-xl-3 px-md-0">
                <button :class="halfSize? 'mx-0 px-0' : ''" class="btn btn-primary float-end" @click="add('nominal')">{{shortenedButtonLabels.nominal}}</button>
            </div>

            <div v-if="localData.maximum.scaledValue != null" :class="halfSize? 'col-md-4' : 'col-md-3 '" class="col-xs-12 row m-0 px-0">
                <button :for="name + 'nominal-input'" class="remove-button m-0 px-0 col-4 col-form-label text-center btn text-white" @click="removeField('maximum')" style="max-height: 2.3em;"> <span class="normal-text">Max.</span> <i class="fa-solid fa-xmark icon" ></i>  </button>
                <input type="number" class="m-0 px-0 col-4 bg-light text-white" :id="name + 'maximum-input'" @change="changeScaledValue($event.target.value, 'maximum')" :value="localData.maximum.scaledValue">
                <DimensionUnit v-if="unit != null" :unit="unit" v-model="localData.maximum.multiplier" class="m-0 ms-1 px-0 col-4" @update:modelValue="changeMultiplier('maximum')"/>
            </div>
            <div v-if="localData.maximum.scaledValue == null" class="col-md-3 row m-0 px-xl-3 px-md-0">
                <button :class="halfSize? 'mx-0 px-0' : ''" class="btn btn-primary float-end " @click="add('maximum')">{{shortenedButtonLabels.maximum}}</button>
            </div>
        </div>
        <div class="row">
            <label class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>
</template>

<style type="text/css">
.remove-button {
  display: block;
}

.remove-button:hover .normal-text {
  display: none;
}
.remove-button:hover {
  background-color: var(--bs-danger);
}

.remove-button .icon {opacity:0;}
.remove-button:hover .icon {opacity:1;}
</style>