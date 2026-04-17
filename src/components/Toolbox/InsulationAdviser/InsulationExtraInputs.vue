<script setup>
import { minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
import { toTitleCase, getMultiplier } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import * as Utils from '/WebSharedComponents/assets/js/utils.js'
</script>

<script>
export default {
    props: {
        modelValue:{
            type: Object,
            required: true
        },
        defaultValue:{
            type: Object,
            required: true
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
        labelBgColor: {
            type: [String, Object],
            default: "bg-transparent",
        },
        valueBgColor: {
            type: [String, Object],
            default: "bg-light",
        },
        textColor: {
            type: [String, Object],
            default: "text-white",
        },
        unitExtraStyleClass:{
            type: String,
            default: ''
        },
    },
    data() {
        return {
        }
    },
    computed: {
    },
    methods: {
    }
}
</script>


<template>
    <div :data-cy="dataTestLabel + '-container'" class="iei-grid">
        <div class="iei-cell">
            <Dimension
                :name="'frequency'"
                :replaceTitle="'Switching Frequency'"
                :unit="'Hz'"
                :dataTestLabel="dataTestLabel + '-SwitchingFrequency'"
                :min="minimumMaximumScalePerParameter['frequency']['min']"
                :max="minimumMaximumScalePerParameter['frequency']['max']"
                :defaultValue="defaultValue.frequency"
                :allowNegative="false"
                :modelValue="modelValue"
                :titleSameRow="false"
                :labelFontSize='titleFontSize'
                :valueFontSize="valueFontSize"
                :labelBgColor="labelBgColor"
                :valueBgColor="valueBgColor"
                :textColor="textColor"
                :unitExtraStyleClass="unitExtraStyleClass"
                :labelWidthProportionClass="'col-12'"
                :valueWidthProportionClass="'col-12'"
                @input="modelValue.frequency = $event.target.value"
                @update="$emit('update')"
            />
        </div>

        <div class="iei-cell">
            <Dimension
                :name="'peak'"
                :replaceTitle="'Voltage Peak'"
                :unit="'V'"
                :dataTestLabel="dataTestLabel + '-VoltagePeak'"
                :min="minimumMaximumScalePerParameter['voltage']['min']"
                :max="minimumMaximumScalePerParameter['voltage']['max']"
                :defaultValue="defaultValue.voltage.processed.rms"
                :allowNegative="false"
                :modelValue="modelValue.voltage.processed"
                :titleSameRow="false"
                :labelFontSize='titleFontSize'
                :valueFontSize="valueFontSize"
                :labelBgColor="labelBgColor"
                :valueBgColor="valueBgColor"
                :textColor="textColor"
                :unitExtraStyleClass="unitExtraStyleClass"
                :labelWidthProportionClass="'col-12'"
                :valueWidthProportionClass="'col-12'"
                @input="modelValue.voltage.processed.peak = $event.target.value"
                @update="$emit('update')"
            />
        </div>

        <div class="iei-cell">
            <Dimension
                :name="'rms'"
                :replaceTitle="'Voltage RMS'"
                :unit="'V'"
                :dataTestLabel="dataTestLabel + '-VoltageRms'"
                :min="minimumMaximumScalePerParameter['voltage']['min']"
                :max="minimumMaximumScalePerParameter['voltage']['max']"
                :defaultValue="defaultValue.voltage.processed.peak"
                :allowNegative="false"
                :modelValue="modelValue.voltage.processed"
                :titleSameRow="false"
                :labelFontSize='titleFontSize'
                :valueFontSize="valueFontSize"
                :labelBgColor="labelBgColor"
                :valueBgColor="valueBgColor"
                :textColor="textColor"
                :unitExtraStyleClass="unitExtraStyleClass"
                :labelWidthProportionClass="'col-12'"
                :valueWidthProportionClass="'col-12'"
                @input="modelValue.voltage.processed.rms = $event.target.value"
                @update="$emit('update')"
            />
        </div>
    </div>
</template>

<style scoped>
.iei-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.4rem 0.85rem;
    width: 100%;
}

@media (max-width: 768px) {
    .iei-grid {
        grid-template-columns: 1fr;
    }
}

.iei-cell {
    min-width: 0;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 9px;
    padding: 0.5rem 0.65rem 0.55rem 0.65rem;
    transition: background 0.15s, border-color 0.15s;
}

.iei-cell:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(var(--bs-primary-rgb), 0.25);
}

.iei-cell :deep(.row) {
    margin-left: 0 !important;
    margin-right: 0 !important;
}

/* Make the label inside each cell read like an uppercase pill caption */
.iei-cell :deep(.dim-label) {
    color: rgba(242, 242, 242, 0.65) !important;
    font-size: 0.66rem !important;
    font-weight: 700 !important;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 0.25rem;
    line-height: 1.1;
    background: transparent !important;
}

/* Make the input value read like a primary stat */
.iei-cell :deep(.dim-input),
.iei-cell :deep(input[type="number"]) {
    font-size: 0.95rem !important;
    font-weight: 600;
    height: 1.85rem;
}
</style>
