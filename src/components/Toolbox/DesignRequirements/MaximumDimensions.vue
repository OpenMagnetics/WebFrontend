<script setup>
import { toTitleCase, getMultiplier, combinedStyle, combinedClass } from '/WebSharedComponents/assets/js/utils.js'
import DimensionUnit from '/WebSharedComponents/DataInput/DimensionUnit.vue'

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
        replaceTitle:{
            type: String
        },
        min:{
            type: Number,
            default: 1e-12
        },
        max:{
            type: Number,
            default: 1e+9
        },
        disabled: {
            type: Boolean,
            default: false,
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
        valueFontSize: {
            type: [String, Object],
            default: 'fs-6'
        },
        titleFontSize: {
            type: [String, Object],
            default: 'fs-6'
        },
        addButtonStyle: {
            type: Object,
            default: {},
        },
        removeButtonBgColor: {
            type: String,
            default: "bg-danger",
        },
        labelBgColor: {
            type: [String, Object],
            default: "bg-dark",
        },
        valueBgColor: {
            type: [String, Object],
            default: "bg-light",
        },
        textColor: {
            type: [String, Object],
            default: "text-white",
        },
        errorTextColor: {
            type: [String, Object],
            default: "text-danger",
        },
        unitExtraStyleClass:{
            type: String,
            default: ''
        },
    },
    data() {
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
    <div :data-cy="dataTestLabel + '-container'" class="container-flex p-0 m-0">
        <div class="row">
            <label
                :style="combinedStyle([titleFontSize, labelBgColor, textColor])"
                :data-cy="dataTestLabel + '-title'"
                class="rounded-2 col-sm-6 col-md-5 p-0"
                :class="combinedClass([titleFontSize, labelBgColor, textColor])"
            >
                {{replaceTitle == null? 'Maximum Dimensions' : replaceTitle}}
            </label>
        </div>
        <div class="row align-items-center">
            <label
                :style="combinedStyle([valueFontSize, labelBgColor, textColor])"
                v-if="localData.width.scaledValue != null"
                for="design-requirements-width-input"
                :class="combinedClass([valueFontSize, labelBgColor, textColor])"
                class="m-0 px-0 col-2 text-center"
            >
                Width
            </label>
            <input
                :style="combinedStyle([disabled? labelBgColor : valueBgColor, localData.width.scaledValue <= 0? errorTextColor : textColor, valueFontSize ])"
                v-if="localData.width.scaledValue != null"
                type="number"
                class="m-0 px-0 col-1"
                :class="combinedClass([disabled? labelBgColor : valueBgColor, localData.width.scaledValue <= 0? errorTextColor : textColor, valueFontSize, disabled? 'border-0' : ''])"
                id="design-requirements-width-input'"
                :value="localData.width.scaledValue"
                @change="changeScaledValue($event.target.value, 'width')"
            />
            <DimensionUnit
                :min="min"
                :max="max"
                v-if="unit != null && localData.width.scaledValue != null"
                :unit="unit"
                :extraStyleClass="unitExtraStyleClass"
                :valueBgColor="valueBgColor"
                :valueFontSize="valueFontSize"
                :textColor="textColor"
                v-model="localData.width.multiplier"
                class="m-0 col-1"
                @update:modelValue="changeMultiplier('width')"
            />
            <button
                v-if="localData.width.scaledValue == null"
                :style="addButtonStyle"
                :class="valueFontSize"
                class="col-3 m-0 px-xl-3 px-md-0 btn mx-4"
                @click="add('width')"
            >
            {{'Add Width'}}
            </button>

            <label
                :style="combinedStyle([valueFontSize, labelBgColor, textColor])"
                v-if="localData.height.scaledValue != null"
                for="design-requirements-width-input"
                :class="combinedClass([valueFontSize, labelBgColor, textColor])"
                class="m-0 px-0 col-2 text-center"
            >
                Height
            </label>
            <input
                :style="combinedStyle([disabled? labelBgColor : valueBgColor, localData.height.scaledValue <= 0? errorTextColor : textColor, valueFontSize ])"
                v-if="localData.height.scaledValue != null"
                type="number"
                class="m-0 px-0 col-1"
                :class="combinedClass([disabled? labelBgColor : valueBgColor, localData.height.scaledValue <= 0? errorTextColor : textColor, valueFontSize, disabled? 'border-0' : ''])"
                id="design-requirements-width-input'"
                @change="changeScaledValue($event.target.value, 'height')"
                :value="localData.height.scaledValue"
            />
            <DimensionUnit
                :min="min"
                :max="max"
                v-if="unit != null && localData.height.scaledValue != null"
                :unit="unit"
                :extraStyleClass="unitExtraStyleClass"
                :valueBgColor="valueBgColor"
                :valueFontSize="valueFontSize"
                :textColor="textColor"
                v-model="localData.height.multiplier"
                class="m-0 col-1"
                @update:modelValue="changeMultiplier('height')"
            />
            <button
                v-if="localData.height.scaledValue == null"
                :style="addButtonStyle"
                :class="valueFontSize"
                class="col-3 m-0 px-xl-3 px-md-0 btn mx-4"
                @click="add('height')"
            >
            {{'Add Height'}}
            </button>

            <label
                :style="combinedStyle([valueFontSize, labelBgColor, textColor])"
                v-if="localData.depth.scaledValue != null"
                for="design-requirements-width-input"
                :class="combinedClass([valueFontSize, labelBgColor, textColor])"
                class="m-0 px-0 col-2 text-center"
            >
                Depth
            </label>
            <input
                :style="combinedStyle([disabled? labelBgColor : valueBgColor, localData.depth.scaledValue <= 0? errorTextColor : textColor, valueFontSize ])"
                v-if="localData.depth.scaledValue != null"
                type="number"
                class="m-0 px-0 col-1"
                :class="combinedClass([disabled? labelBgColor : valueBgColor, localData.depth.scaledValue <= 0? errorTextColor : textColor, valueFontSize, disabled? 'border-0' : ''])"
                id="design-requirements-width-input'"
                @change="changeScaledValue($event.target.value, 'depth')"
                :value="localData.depth.scaledValue"
            />
            <DimensionUnit
                :min="min"
                :max="max"
                v-if="unit != null && localData.depth.scaledValue != null"
                :unit="unit"
                :extraStyleClass="unitExtraStyleClass"
                :valueBgColor="valueBgColor"
                :valueFontSize="valueFontSize"
                :textColor="textColor"
                v-model="localData.depth.multiplier"
                class="m-0 col-1"
                @update:modelValue="changeMultiplier('depth')"
            />
            <button
                v-if="localData.depth.scaledValue == null"
                :style="addButtonStyle"
                :class="valueFontSize"
                class="col-3 m-0 px-xl-3 px-md-0 btn mx-4"
                @click="add('depth')"
            >
            {{'Add Depth'}}
            </button>
        </div>
        <div class="row">
            <label class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>
</template>


