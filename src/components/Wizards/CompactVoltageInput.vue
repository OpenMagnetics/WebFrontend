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
    emits: ['update'],
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
        forwardUpdate(...args) { this.$emit('update', ...args); }
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
