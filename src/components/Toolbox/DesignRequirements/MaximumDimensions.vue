<script setup>
import { toTitleCase, getMultiplier, combinedStyle, combinedClass } from 'WebSharedComponents/assets/js/utils.js'
import DimensionUnit from 'WebSharedComponents/DataInput/DimensionUnit.vue'

</script>

<script>
export default {
    inheritAttrs: false,
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
            default: () => ({}),
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
                // Emit update event instead of directly mutating modelValue
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
                // Emit update event instead of directly mutating modelValue
                this.$emit("update", field, null);
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
    <div :data-cy="dataTestLabel + '-container'" class="container-flex p-0 m-0 text-left">
        <div class="m-0 p-0 mb-1">
            <label
                :style="combinedStyle([titleFontSize, labelBgColor, textColor])"
                :data-cy="dataTestLabel + '-title'"
                :class="combinedClass([titleFontSize, labelBgColor, textColor])"
                class="md-rounded p-0">
                {{replaceTitle == null? 'Maximum Dimensions' : replaceTitle}}
            </label>
        </div>
        <div class="row align-items-center justify-content-between m-0">
            <template v-for="field in ['width', 'height', 'depth']" :key="field">
                <div v-if="localData[field].scaledValue != null" class="col-md-3 col-12 grid m-0 px-0 align-items-center">
                    <button
                        :style="combinedStyle([valueFontSize, labelBgColor, textColor])"
                        :data-cy="dataTestLabel + '-' + field + '-remove-button'"
                        :class="combinedClass([valueFontSize, labelBgColor, textColor])"
                        class="md-remove-button m-0 px-0 col-4 col-form-label text-center btn"
                        @click="removeField(field)"
                        style="max-height: 2.3em;">
                            <span class="normal-text">{{ field.charAt(0).toUpperCase() + field.slice(1) }}</span> <i class="bi bi-x-lg icon"></i>
                    </button>
                    <input
                        :style="combinedStyle([disabled? labelBgColor : valueBgColor, localData[field].scaledValue <= 0 ? errorTextColor : textColor, valueFontSize])"
                        :data-cy="dataTestLabel + '-' + field + '-number-input'"
                        type="number"
                        class="m-0 px-0 col-4 text-right"
                        :class="combinedClass([disabled? labelBgColor : valueBgColor, localData[field].scaledValue <= 0 ? errorTextColor : textColor, valueFontSize, disabled? 'border-0' : ''])"
                        :value="localData[field].scaledValue"
                        @change="changeScaledValue($event.target.value, field)"
                    />
                    <DimensionUnit
                        :data-cy="dataTestLabel + '-' + field + '-DimensionUnit-input'"
                        :min="min"
                        :max="max"
                        v-if="unit != null"
                        :unit="unit"
                        v-model="localData[field].multiplier"
                        :extraStyleClass="unitExtraStyleClass"
                        :valueBgColor="valueBgColor"
                        :valueFontSize="valueFontSize"
                        :textColor="textColor"
                        class="m-0 col-4 pl-1"
                        @update:modelValue="changeMultiplier(field)"
                    />
                </div>
                <div v-else class="col-md-3 col-12 grid m-0">
                    <button
                        :data-cy="dataTestLabel + '-' + field + '-add-button'"
                        class="md-add-btn"
                        @click="add(field)">
                        <i class="bi bi-plus-lg"></i>
                        <span>Add {{ field.charAt(0).toUpperCase() + field.slice(1) }}</span>
                    </button>
                </div>
            </template>
        </div>
        <div class="row m-0">
            <label class="md-error text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>
</template>

<style scoped>
.md-rounded {
    font-weight: 600;
    letter-spacing: 0.01em;
    background: transparent !important;
}

.md-error {
    color: var(--p-red-400);
    font-size: 0.78rem !important;
}

.md-remove-button {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(var(--bs-primary-rgb), 0.45) !important;
    border-right: none !important;
    border-radius: 999px 0 0 999px !important;
    background: rgba(var(--bs-primary-rgb), 0.12) !important;
    color: var(--bs-primary) !important;
    font-weight: 600;
    letter-spacing: 0.01em;
    padding: 0 0.55rem !important;
    height: 1.75rem !important;
    line-height: 1.25rem;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.md-remove-button .icon {
    margin-left: 0.25rem;
    font-size: 0.7rem;
}

.md-add-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    width: 100%;
    border: 1px dashed rgba(var(--bs-primary-rgb), 0.4);
    background: rgba(var(--bs-primary-rgb), 0.08);
    color: var(--bs-primary);
    border-radius: 999px;
    padding: 0.25rem 0.75rem;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
}

.md-add-btn:hover {
    background: rgba(var(--bs-primary-rgb), 0.18);
}

.md-add-btn i {
    font-size: 0.7rem;
}
</style>


