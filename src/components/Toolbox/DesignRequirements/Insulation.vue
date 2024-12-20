<script setup>
import { toTitleCase, getMultiplier } from '/WebSharedComponents/assets/js/utils.js'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import SeveralElementsFromList from '/WebSharedComponents/DataInput/SeveralElementsFromList.vue'
import { minimumMaximumScalePerParameter} from '/WebSharedComponents/assets/js/defaults.js'
import { Cti, InsulationType, OvervoltageCategory, PollutionDegree, InsulationStandards } from '/src/assets/ts/MAS.ts'
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
        <div class="row">
            <label v-if="showTitle" :data-cy="dataTestLabel + '-title'"  class="rounded-2 fs-5 ms-3 col-12">Insulation</label>
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
                @update="$emit('update')"
                />

            <ElementFromList
                class="col-lg-6 col-xl-2"
                :dataTestLabel="dataTestLabel + '-Cti'"
                :name="'cti'"
                v-model="modelValue['insulation']"
                :options="Object.values(Cti)"
                @update="$emit('update')"
            />
            <ElementFromList
                class="col-lg-6 col-xl-3"
                :dataTestLabel="dataTestLabel + '-InsulationType'"
                :name="'insulationType'"
                v-model="modelValue['insulation']"
                :options="Object.values(InsulationType)"
                @update="$emit('update')"
            />
            <ElementFromList
                class="col-lg-6 col-xl-4"
                :dataTestLabel="dataTestLabel + '-OvervoltageCategory'"
                :name="'overvoltageCategory'"
                v-model="modelValue['insulation']"
                :options="Object.values(OvervoltageCategory)"
                @update="$emit('update')"
            />
            <ElementFromList
                class="col-lg-6 col-xl-3"
                :dataTestLabel="dataTestLabel + '-PollutionDegree'"
                :name="'pollutionDegree'"
                v-model="modelValue['insulation']"
                :options="Object.values(PollutionDegree)"
                @update="$emit('update')"
            />
            <SeveralElementsFromList
                class="col-12"
                :name="'standards'"
                v-model="modelValue['insulation']"
                :options="Object.values(InsulationStandards)"
                :optionsToDisable="standardsToDisable"
                @update="$emit('update')"
            />
        </div>
    </div>
</template>


