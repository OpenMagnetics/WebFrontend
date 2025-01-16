<script setup>
import { toTitleCase, getMultiplier } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromListRadio from '/WebSharedComponents/DataInput/ElementFromListRadio.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import SeveralElementsFromList from '/WebSharedComponents/DataInput/SeveralElementsFromList.vue'
import { minimumMaximumScalePerParameter} from '/WebSharedComponents/assets/js/defaults.js'
import { Cti, InsulationType, OvervoltageCategory, PollutionDegree, InsulationStandards } from '/WebSharedComponents/assets/ts/MAS.ts'
import * as Utils from '/WebSharedComponents/assets/js/utils.js'
import { WiringTechnology } from '/WebSharedComponents/assets/ts/MAS.ts'
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
        const wiringTechnologyToDisable = ["Deposition"]

        return {
            wiringTechnologyToDisable,
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
        <div class="row ms-2 border-bottom my-2 pb-3 pt-0">
            <ElementFromListRadio class="col-md-5 col-xm-12 border-end"
                :name="'wiringTechnology'"
                :dataTestLabel="dataTestLabel + '-WiringTechnology'"
                :options="WiringTechnology"
                :titleSameRow="false"
                :optionsToDisable="wiringTechnologyToDisable"
                :modelValue="modelValue"
                @input="modelValue['wiringTechnology'] = $event.target.value"
                @update="$emit('update')"
            />
            <Dimension class="col-md-3 col-xm-12"
                :name="'maximum'"
                :replaceTitle="'Altitude'"
                :unit="'m'"
                :dataTestLabel="dataTestLabel + '-Altitude'"
                :min="minimumMaximumScalePerParameter['altitude']['min']"
                :max="minimumMaximumScalePerParameter['altitude']['max']"
                :defaultValue="Utils.deepCopy(defaultValue['altitude']['maximum'])"
                :allowNegative="false"
                :modelValue="modelValue['insulation']['altitude']"
                @input="modelValue['insulation']['altitude']['maximum'] = $event.target.value"
                @update="$emit('update')"
            />
            <Dimension class="col-md-4 col-xm-12"
                :name="'maximum'"
                :replaceTitle="'Main Supply Voltage'"
                :unit="'V'"
                :dataTestLabel="dataTestLabel + '-MainSupplyVoltage'"
                :min="minimumMaximumScalePerParameter['voltage']['min']"
                :max="minimumMaximumScalePerParameter['voltage']['max']"
                :defaultValue="Utils.deepCopy(defaultValue['mainSupplyVoltage']['maximum'])"
                :allowNegative="false"
                :modelValue="modelValue['insulation']['mainSupplyVoltage']"
                @input="modelValue['insulation']['mainSupplyVoltage']['maximum'] = $event.target.value"
                @update="$emit('update')"
            />
        </div>
        <div class="row ms-2">

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


