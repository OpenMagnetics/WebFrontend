<script setup>
import { toTitleCase, getMultiplier, combinedStyle, combinedClass } from 'WebSharedComponents/assets/js/utils.js'
import DimensionUnit from 'WebSharedComponents/DataInput/DimensionUnit.vue'
import InputNumber from 'primevue/inputnumber'
import InputGroup from 'primevue/inputgroup'
import InputGroupAddon from 'primevue/inputgroupaddon'
import Button from 'primevue/button'
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
            default: ''
        },
        titleFontSize: {
            type: [String, Object],
            default: ''
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
            default: "text-red-500",
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
    <div :data-cy="dataTestLabel + '-container'" class="container-flex text-left">
        <div class="mb-1">
            <label
                :style="combinedStyle([titleFontSize, labelBgColor, textColor])"
                :data-cy="dataTestLabel + '-title'"
                :class="combinedClass([titleFontSize, labelBgColor, textColor])"
                class="md-rounded p-0">
                {{replaceTitle == null? 'Maximum Dimensions' : replaceTitle}}
            </label>
        </div>
        <div class="md-fields-row">
            <template v-for="field in ['width', 'height', 'depth']" :key="field">
                <div class="md-field">
                    <InputGroup v-if="localData[field].scaledValue != null" class="md-group">
                        <InputGroupAddon
                            :data-cy="dataTestLabel + '-' + field + '-remove-button'"
                            class="md-remove-addon"
                            @click="removeField(field)">
                            <span class="md-remove-label">{{ field.charAt(0).toUpperCase() + field.slice(1) }}</span>
                            <i class="pi pi-times md-remove-icon"></i>
                        </InputGroupAddon>
                        <InputNumber
                            :data-cy="dataTestLabel + '-' + field + '-number-input'"
                            class="md-input"
                            :model-value="localData[field].scaledValue"
                            @update:model-value="changeScaledValue($event, field)"
                            :max-fraction-digits="6"
                            :allow-empty="false"
                            :disabled="disabled"
                        />
                        <InputGroupAddon v-if="unit != null" class="md-unit-addon">
                            <DimensionUnit
                                :data-cy="dataTestLabel + '-' + field + '-DimensionUnit-input'"
                                :min="min"
                                :max="max"
                                :unit="unit"
                                v-model="localData[field].multiplier"
                                :extraStyleClass="unitExtraStyleClass"
                                :valueBgColor="valueBgColor"
                                :valueFontSize="valueFontSize"
                                :textColor="textColor"
                                class="md-unit"
                                @update:modelValue="changeMultiplier(field)"
                            />
                        </InputGroupAddon>
                    </InputGroup>
                    <Button
                        v-else
                        :data-cy="dataTestLabel + '-' + field + '-add-button'"
                        class="md-add-btn"
                        severity="secondary"
                        outlined
                        @click="add(field)">
                        <i class="pi pi-plus"></i>
                        <span>Add {{ field.charAt(0).toUpperCase() + field.slice(1) }}</span>
                    </Button>
                </div>
            </template>
        </div>
        <div class="grid m-0">
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
.md-fields-row {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.5rem;
    width: 100%;
}
.md-field {
    flex: 1 1 0;
    min-width: 0;
}
.md-group {
    width: 100%;
    height: 2.25rem;
    align-items: stretch;
}
.md-group :deep(.p-inputgroupaddon) {
    height: 2.25rem;
    line-height: 1.25rem;
}
.md-group :deep(.p-inputnumber) {
    height: 2.25rem;
}
.md-remove-addon {
    cursor: pointer;
    user-select: none;
    transition: background 0.15s, color 0.15s;
    padding: 0 0.5rem !important;
    min-width: auto;
    gap: 0.25rem;
    display: flex !important;
    align-items: center !important;
    height: 2.25rem;
}
.md-remove-addon:hover {
    background: rgba(var(--p-danger-rgb), 0.15) !important;
    color: var(--p-danger);
}
.md-remove-label {
    font-size: 0.75rem;
}
.md-remove-icon {
    font-size: 0.65rem;
    color: var(--p-danger);
}
.md-input {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: stretch;
}
.md-input :deep(.p-inputnumber-input) {
    text-align: end;
    height: 2.25rem;
    padding: 0.25rem 1.75rem 0.25rem 0.5rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    width: 100%;
    border-radius: 0;
}
.md-input :deep(.p-inputnumber-button) {
    height: 1.125rem;
    width: 1.25rem;
    padding: 0;
    font-size: 0.5rem;
    border-radius: 0;
}
.md-unit-addon {
    padding: 0 !important;
    border-left: 0 !important;
    display: flex !important;
    align-items: stretch !important;
    height: 2.25rem !important;
}
.md-unit {
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
}
.md-add-btn {
    width: 100%;
    font-size: 0.75rem;
}
</style>


