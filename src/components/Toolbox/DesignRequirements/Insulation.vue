<script setup>
import { toTitleCase, getMultiplier, combinedStyle, combinedClass } from '/WebSharedComponents/assets/js/utils.js'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import SeveralElementsFromList from '/WebSharedComponents/DataInput/SeveralElementsFromList.vue'
import { minimumMaximumScalePerParameter} from '/WebSharedComponents/assets/js/defaults.js'
import { Cti, InsulationType, OvervoltageCategory, PollutionDegree, InsulationStandards } from '/WebSharedComponents/assets/ts/MAS.ts'
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
        showTitle:{
            type: Boolean,
            default: true
        },
        standardsToDisable: {
            type: Array,
            default: [],
        },
        addButtonStyle: {
            type: Object,
            default: {},
        },
        removeButtonBgColor: {
            type: String,
            default: "bg-danger",
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
        <div class="row m-0 ps-3">
            <label
                :style="combinedStyle([titleFontSize, textColor, labelBgColor])"
                v-if="showTitle"
                :data-cy="dataTestLabel + '-title'"
                :class="combinedClass([titleFontSize, textColor, labelBgColor])"
                class="rounded-2 col-12 p-0"
            >
                Insulation
            </label>
        </div>
        <div class="row ms-2">
            <DimensionWithTolerance
                class="col-6 border-end"
                :dataTestLabel="dataTestLabel + '-Altitude'"
                :allowNegative="true"
                :min="minimumMaximumScalePerParameter['altitude']['min']"
                :max="minimumMaximumScalePerParameter['altitude']['max']"
                :defaultValue="Utils.deepCopy(defaultValue['altitude'])"
                :halfSize="true"
                :name="'altitude'"
                :unit="'m'"
                v-model="modelValue['insulation']['altitude']"
                :addButtonStyle="addButtonStyle"
                :removeButtonBgColor="removeButtonBgColor"
                :titleFontSize='valueFontSize'
                :valueFontSize="valueFontSize"
                :labelBgColor="labelBgColor"
                :valueBgColor="valueBgColor"
                :textColor="textColor"
                :unitExtraStyleClass="unitExtraStyleClass"
                @update="$emit('update')"
                />
            <DimensionWithTolerance
                class="col-6"
                :dataTestLabel="dataTestLabel + '-MainSupplyVoltage'"
                :min="minimumMaximumScalePerParameter['voltage']['min']"
                :max="minimumMaximumScalePerParameter['voltage']['max']"
                :defaultValue="Utils.deepCopy(defaultValue['mainSupplyVoltage'])"
                :halfSize="true"
                :name="'mainSupplyVoltage'"
                :unit="'V'"
                v-model="modelValue['insulation']['mainSupplyVoltage']"
                :addButtonStyle="addButtonStyle"
                :removeButtonBgColor="removeButtonBgColor"
                :titleFontSize='valueFontSize'
                :valueFontSize="valueFontSize"
                :labelBgColor="labelBgColor"
                :valueBgColor="valueBgColor"
                :textColor="textColor"
                :unitExtraStyleClass="unitExtraStyleClass"
                @update="$emit('update')"
                />

            <ElementFromList
                class="col-lg-6 col-xl-2"
                :dataTestLabel="dataTestLabel + '-Cti'"
                :name="'cti'"
                v-model="modelValue['insulation']"
                :options="Object.values(Cti)"
                :labelFontSize='valueFontSize'
                :valueFontSize="valueFontSize"
                :labelBgColor="labelBgColor"
                :valueBgColor="valueBgColor"
                :textColor="textColor"
                @update="$emit('update')"
            />
            <ElementFromList
                class="col-lg-6 col-xl-3"
                :dataTestLabel="dataTestLabel + '-InsulationType'"
                :name="'insulationType'"
                v-model="modelValue['insulation']"
                :options="Object.values(InsulationType)"
                :labelFontSize='valueFontSize'
                :valueFontSize="valueFontSize"
                :labelBgColor="labelBgColor"
                :valueBgColor="valueBgColor"
                :textColor="textColor"
                @update="$emit('update')"
            />
            <ElementFromList
                class="col-lg-6 col-xl-4"
                :dataTestLabel="dataTestLabel + '-OvervoltageCategory'"
                :name="'overvoltageCategory'"
                v-model="modelValue['insulation']"
                :options="Object.values(OvervoltageCategory)"
                :labelFontSize='valueFontSize'
                :valueFontSize="valueFontSize"
                :labelBgColor="labelBgColor"
                :valueBgColor="valueBgColor"
                :textColor="textColor"
                @update="$emit('update')"
            />
            <ElementFromList
                class="col-lg-6 col-xl-3"
                :dataTestLabel="dataTestLabel + '-PollutionDegree'"
                :name="'pollutionDegree'"
                v-model="modelValue['insulation']"
                :options="Object.values(PollutionDegree)"
                :labelFontSize='valueFontSize'
                :valueFontSize="valueFontSize"
                :labelBgColor="labelBgColor"
                :valueBgColor="valueBgColor"
                :textColor="textColor"
                @update="$emit('update')"
            />
            <SeveralElementsFromList
                class="col-12"
                :name="'standards'"
                v-model="modelValue['insulation']"
                :options="Object.values(InsulationStandards)"
                :optionsToDisable="standardsToDisable"
                :labelFontSize='valueFontSize'
                :valueFontSize="valueFontSize"
                :labelBgColor="labelBgColor"
                :valueBgColor="valueBgColor"
                :textColor="textColor"
                @update="$emit('update')"
            />
        </div>
    </div>
</template>


