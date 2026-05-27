<script>
import DimensionUnit from 'WebSharedComponents/DataInput/DimensionUnit.vue'
import { getMultiplier } from 'WebSharedComponents/assets/js/utils.js'

/**
 * CompactVoltageInput - Inline min/nom/max voltage input for wizard compact cards.
 * All values on one row with dimension-type inputs and unit selectors.
 */
export default {
    name: 'CompactVoltageInput',
    components: { DimensionUnit },
    props: {
        modelValue: { type: Object, required: true },
        name: { type: String, default: 'voltage' },
        unit: { type: String, default: 'V' },
        min: { type: Number, default: 1e-12 },
        max: { type: Number, default: 1e+9 },
        dataTestLabel: { type: String, default: '' },
        tooltip: { type: String, default: null },
    },
    data() {
        return {
            localData: {
                minimum: { scaledValue: null, multiplier: 1 },
                nominal: { scaledValue: null, multiplier: 1 },
                maximum: { scaledValue: null, multiplier: 1 },
            }
        };
    },
    computed: {
        errorMessage() {
            if (this.modelValue.minimum == null && 
                this.modelValue.nominal == null && 
                this.modelValue.maximum == null) {
                return 'At least one voltage value must be set';
            }
            return '';
        }
    },
    watch: {
        modelValue: {
            deep: true,
            immediate: true,
            handler(newVal) {
                ['minimum', 'nominal', 'maximum'].forEach(field => {
                    if (newVal[field] != null) {
                        const aux = getMultiplier(newVal[field], 0.001, false);
                        this.localData[field].scaledValue = aux.scaledValue;
                        this.localData[field].multiplier = aux.multiplier;
                    } else {
                        this.localData[field].scaledValue = null;
                        this.localData[field].multiplier = 1;
                    }
                });
            }
        }
    },
    mounted() {
        // Initialize: if only minimum and maximum are set (no nominal), ensure they're displayed
        if (this.modelValue.minimum != null && this.modelValue.nominal == null && this.modelValue.maximum != null) {
            // This is the typical case - just make sure localData is synced
            const minAux = getMultiplier(this.modelValue.minimum, 0.001, false);
            this.localData.minimum.scaledValue = minAux.scaledValue;
            this.localData.minimum.multiplier = minAux.multiplier;
            
            const maxAux = getMultiplier(this.modelValue.maximum, 0.001, false);
            this.localData.maximum.scaledValue = maxAux.scaledValue;
            this.localData.maximum.multiplier = maxAux.multiplier;
        }
    },
    methods: {
        updateField(field) {
            const scaled = this.localData[field].scaledValue;
            const mult = this.localData[field].multiplier;
            
            if (scaled == null || isNaN(scaled)) {
                this.modelValue[field] = null;
            } else {
                this.modelValue[field] = scaled * mult;
            }
            this.$emit('update', field, this.modelValue[field]);
        },
        changeScaledValue(value, field) {
            if (value === '' || isNaN(value)) {
                this.localData[field].scaledValue = null;
            } else {
                this.localData[field].scaledValue = parseFloat(value);
            }
            this.updateField(field);
        },
        changeMultiplier(field) {
            this.updateField(field);
        },
        addField(field) {
            let newValue = 0;
            if (field === 'minimum') {
                if (this.modelValue.nominal != null) {
                    newValue = this.modelValue.nominal * 0.5;
                } else if (this.modelValue.maximum != null) {
                    newValue = this.modelValue.maximum * 0.5;
                } else {
                    newValue = 100;
                }
            } else if (field === 'nominal') {
                if (this.modelValue.minimum != null && this.modelValue.maximum != null) {
                    newValue = (this.modelValue.minimum + this.modelValue.maximum) / 2;
                } else if (this.modelValue.minimum != null) {
                    newValue = this.modelValue.minimum * 2;
                } else if (this.modelValue.maximum != null) {
                    newValue = this.modelValue.maximum * 0.5;
                } else {
                    newValue = 200;
                }
            } else if (field === 'maximum') {
                if (this.modelValue.nominal != null) {
                    newValue = this.modelValue.nominal * 2;
                } else if (this.modelValue.minimum != null) {
                    newValue = this.modelValue.minimum * 2;
                } else {
                    newValue = 400;
                }
            }
            
            const aux = getMultiplier(newValue, 0.001, false);
            this.localData[field].scaledValue = aux.scaledValue;
            this.localData[field].multiplier = aux.multiplier;
            this.modelValue[field] = newValue;
            this.$emit('update', field, this.modelValue[field]);
        },
        removeField(field) {
            this.localData[field].scaledValue = null;
            this.localData[field].multiplier = 1;
            this.modelValue[field] = null;
            this.$emit('update', field, null);
        },
    }
}
</script>

<template>
    <div class="compact-voltage-input" v-tooltip="tooltip">
        <div class="cv-row">
            <!-- Min (left) -->
            <div class="cv-section cv-left">
                <div v-if="localData.minimum.scaledValue != null" class="cv-field">
                    <span class="cv-label">Min</span>
                    <input
                        :data-cy="dataTestLabel + '-minimum-number-input'"
                        type="number"
                        class="cv-input"
                        :value="localData.minimum.scaledValue"
                        @change="changeScaledValue($event.target.value, 'minimum')"
                    />
                    <DimensionUnit
                        :data-cy="dataTestLabel + '-minimum-DimensionUnit-input'"
                        :min="min"
                        :max="max"
                        :unit="unit"
                        v-model="localData.minimum.multiplier"
                        class="cv-unit-select"
                        @update:modelValue="changeMultiplier('minimum')"
                    />
                    <button class="cv-remove" @click="removeField('minimum')" title="Remove minimum">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
                <button v-else class="cv-add" @click="addField('minimum')">
                    <i class="bi bi-plus"></i> Min
                </button>
            </div>

            <!-- Divider -->
            <span class="cv-divider">—</span>

            <!-- Nom (center) -->
            <div class="cv-section cv-center">
                <div v-if="localData.nominal.scaledValue != null" class="cv-field">
                    <span class="cv-label">Nom</span>
                    <input
                        :data-cy="dataTestLabel + '-nominal-number-input'"
                        type="number"
                        class="cv-input"
                        :value="localData.nominal.scaledValue"
                        @change="changeScaledValue($event.target.value, 'nominal')"
                    />
                    <DimensionUnit
                        :data-cy="dataTestLabel + '-nominal-DimensionUnit-input'"
                        :min="min"
                        :max="max"
                        :unit="unit"
                        v-model="localData.nominal.multiplier"
                        class="cv-unit-select"
                        @update:modelValue="changeMultiplier('nominal')"
                    />
                    <button class="cv-remove" @click="removeField('nominal')" title="Remove nominal">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
                <button v-else class="cv-add" @click="addField('nominal')">
                    <i class="bi bi-plus"></i> Nom
                </button>
            </div>

            <!-- Divider -->
            <span class="cv-divider">—</span>

            <!-- Max (right) -->
            <div class="cv-section cv-right">
                <div v-if="localData.maximum.scaledValue != null" class="cv-field">
                    <span class="cv-label">Max</span>
                    <input
                        :data-cy="dataTestLabel + '-maximum-number-input'"
                        type="number"
                        class="cv-input"
                        :value="localData.maximum.scaledValue"
                        @change="changeScaledValue($event.target.value, 'maximum')"
                    />
                    <DimensionUnit
                        :data-cy="dataTestLabel + '-maximum-DimensionUnit-input'"
                        :min="min"
                        :max="max"
                        :unit="unit"
                        v-model="localData.maximum.multiplier"
                        class="cv-unit-select"
                        @update:modelValue="changeMultiplier('maximum')"
                    />
                    <button class="cv-remove" @click="removeField('maximum')" title="Remove maximum">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
                <button v-else class="cv-add" @click="addField('maximum')">
                    <i class="bi bi-plus"></i> Max
                </button>
            </div>
        </div>
        
        <!-- Error message -->
        <div v-if="errorMessage" class="cv-error">
            <i class="bi bi-exclamation-triangle-fill me-1"></i>{{ errorMessage }}
        </div>
    </div>
</template>

<style scoped>
.compact-voltage-input {
    width: 100%;
}

.cv-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-wrap: nowrap;
    justify-content: space-between;
}

.cv-section {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
}

.cv-left {
    justify-content: flex-start;
}

.cv-center {
    justify-content: center;
}

.cv-right {
    justify-content: flex-end;
}

.cv-field {
    display: flex;
    align-items: center;
    gap: 0.1rem;
}

.cv-label {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--bs-primary);
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
    margin-right: 0.15rem;
}

.cv-input {
    width: 3rem;
    height: 1.6rem;
    padding: 0 0.2rem;
    font-size: 0.8rem;
    text-align: center;
    background: rgba(var(--bs-white-rgb), 0.05);
    border: 1px solid rgba(var(--bs-primary-rgb), 0.3);
    border-radius: 4px 0 0 4px;
    border-right: none;
    color: inherit;
    outline: none;
    transition: border-color 0.2s;
}

.cv-input:focus {
    border-color: var(--bs-primary);
}

.cv-unit-select {
    height: 1.6rem !important;
    min-height: 1.6rem !important;
    font-size: 0.7rem;
}

.cv-unit-select :deep(select) {
    height: 1.6rem !important;
    min-height: 1.6rem !important;
    padding: 0 1rem 0 0.25rem !important;
    font-size: 0.7rem;
    border-radius: 0 4px 4px 0;
    border: 1px solid rgba(var(--bs-primary-rgb), 0.3);
    border-left: none;
    background: rgba(var(--bs-white-rgb), 0.05);
}

.cv-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    padding: 0;
    margin-left: 0.1rem;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--bs-danger);
    font-size: 0.6rem;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 0.15s;
    flex-shrink: 0;
}

.cv-remove:hover {
    opacity: 1;
    background: rgba(var(--bs-danger-rgb), 0.15);
}

.cv-add {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    padding: 0.15rem 0.4rem;
    border: 1px dashed rgba(var(--bs-primary-rgb), 0.4);
    border-radius: 999px;
    background: transparent;
    color: var(--bs-primary);
    font-size: 0.7rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
}

.cv-add:hover {
    background: rgba(var(--bs-primary-rgb), 0.1);
    border-color: var(--bs-primary);
}

.cv-divider {
    color: var(--bs-primary);
    opacity: 0.3;
    font-size: 0.75rem;
    font-weight: 300;
    flex-shrink: 0;
}

.cv-error {
    font-size: 0.75rem;
    color: var(--bs-danger);
    text-align: center;
    margin-top: 0.25rem;
    font-weight: 500;
}

/* Hide number spinners */
.cv-input::-webkit-outer-spin-button,
.cv-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}
.cv-input[type=number] {
    -moz-appearance: textfield;
}
</style>
