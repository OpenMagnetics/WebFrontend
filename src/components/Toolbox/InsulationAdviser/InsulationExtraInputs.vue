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
    watch: { 
    },
    mounted () {
    },
    methods: {
    }
}
</script>


<template>
    <div :data-cy="dataTestLabel + '-container'" class="container-flex">
        <div class="row ms-2">
            <Dimension class="border-1 col-md-4 col-sm-12"
                :name="'frequency'"
                :replaceTitle="'Switching Frequency'"
                :unit="'Hz'"
                :dataTestLabel="dataTestLabel + '-SwitchingFrequency'"
                :min="minimumMaximumScalePerParameter['frequency']['min']"
                :max="minimumMaximumScalePerParameter['frequency']['max']"
                :defaultValue="defaultValue.frequency"
                :allowNegative="false"
                :modelValue="modelValue"
                :labelFontSize='titleFontSize'
                :valueFontSize="valueFontSize"
                :labelBgColor="labelBgColor"
                :valueBgColor="valueBgColor"
                :textColor="textColor"
                :unitExtraStyleClass="unitExtraStyleClass"
                @input="modelValue.frequency = $event.target.value"
                @update="$emit('update')"
            />

            <Dimension class="border-1 col-md-4 col-sm-12"
                :name="'peak'"
                :replaceTitle="'Voltage Peak'"
                :unit="'V'"
                :dataTestLabel="dataTestLabel + '-VoltagePeak'"
                :min="minimumMaximumScalePerParameter['voltage']['min']"
                :max="minimumMaximumScalePerParameter['voltage']['max']"
                :defaultValue="defaultValue.voltage.processed.rms"
                :allowNegative="false"
                :modelValue="modelValue.voltage.processed"
                :labelFontSize='titleFontSize'
                :valueFontSize="valueFontSize"
                :labelBgColor="labelBgColor"
                :valueBgColor="valueBgColor"
                :textColor="textColor"
                :unitExtraStyleClass="unitExtraStyleClass"
                @input="modelValue.voltage.processed.peak = $event.target.value"
                @update="$emit('update')"
            />

            <Dimension class="border-1 col-md-4 col-sm-12"
                :name="'rms'"
                :replaceTitle="'Voltage RMS'"
                :unit="'V'"
                :dataTestLabel="dataTestLabel + '-VoltageRms'"
                :min="minimumMaximumScalePerParameter['voltage']['min']"
                :max="minimumMaximumScalePerParameter['voltage']['max']"
                :defaultValue="defaultValue.voltage.processed.peak"
                :allowNegative="false"
                :modelValue="modelValue.voltage.processed"
                :labelFontSize='titleFontSize'
                :valueFontSize="valueFontSize"
                :labelBgColor="labelBgColor"
                :valueBgColor="valueBgColor"
                :textColor="textColor"
                :unitExtraStyleClass="unitExtraStyleClass"
                @input="modelValue.voltage.processed.rms = $event.target.value"
                @update="$emit('update')"
            />

        </div>
    </div>
</template>


