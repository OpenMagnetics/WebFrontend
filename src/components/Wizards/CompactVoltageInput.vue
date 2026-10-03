<script>
import DimensionWithTolerance from 'WebSharedComponents/DataInput/DimensionWithTolerance.vue'

/**
 * CompactVoltageInput - thin wrapper around DimensionWithTolerance for the
 * wizard "Input Voltage" slot. Hides the duplicate title (the wizard card
 * already has an "Input Voltage" header) so the visual matches the
 * DesignRequirements DimensionWithTolerance rows.
 */
export default {
    name: 'CompactVoltageInput',
    components: { DimensionWithTolerance },
    emits: ['update', 'hasError'],
    // Provided by ConverterWizardBase: a rejected value blocks the wizard's actions
    // and shows why (user report #188). Absent when used outside a wizard.
    inject: { reportWizardInputValidity: { default: null } },
    props: {
        modelValue: { type: Object, required: true },
        name: { type: String, default: 'inputVoltage' },
        unit: { type: String, default: 'V' },
        min: { type: Number, default: 1e-12 },
        max: { type: Number, default: 1e+9 },
        dataTestLabel: { type: String, default: '' },
        tooltip: { type: String, default: null },
    },
    methods: {
        forwardUpdate(...args) {
            this.reportWizardInputValidity?.(this.name, null);
            this.$emit('update', ...args);
        },
        forwardError(message) {
            this.reportWizardInputValidity?.(this.name, message);
            this.$emit('hasError', message);
        },
    }
}
</script>

<template>
    <div class="compact-voltage-input" v-tooltip="tooltip">
        <DimensionWithTolerance
            :name="name"
            :unit="unit"
            :min="min"
            :max="max"
            :dataTestLabel="dataTestLabel"
            :modelValue="modelValue"
            :allowAllNull="false"
            @update="forwardUpdate"
            @hasError="forwardError"
            @accepted="reportWizardInputValidity?.(name, null)"
        />
    </div>
</template>

<style scoped>
.compact-voltage-input {
    width: 100%;
}
/* Suppress the inner title — the wizard card header already says "Input Voltage". */
.compact-voltage-input :deep(.dwt-title-row) {
    display: none;
}
</style>
