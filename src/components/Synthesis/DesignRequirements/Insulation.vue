<script setup>
import { isNumber, toTitleCase, getMultiplier } from '/src/assets/js/utils.js'
import DimensionWithTolerance from '/src/components/DataInput/DimensionWithTolerance.vue'
import ElementFromList from '/src/components/DataInput/ElementFromList.vue'
import SeveralElementsFromList from '/src/components/DataInput/SeveralElementsFromList.vue'
import { minimumMaximumScalePerParameter} from '/src/assets/js/defaults.js'
import { Cti, InsulationType, OvervoltageCategory, PollutionDegree, Standard } from '/src/assets/ts/MAS.ts'
import * as Utils from '/src/assets/js/utils.js'
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
            <label :data-cy="dataTestLabel + '-title'"  class="rounded-2 fs-5 ms-3 col-12">Insulation</label>
        </div>
        <div class="row ms-2">
            <DimensionWithTolerance :dataTestLabel="dataTestLabel + '-Altitude'" :allowNegative="true" :min="minimumMaximumScalePerParameter['altitude']['min']" :max="minimumMaximumScalePerParameter['altitude']['max']" :defaultValue="Utils.deepCopy(defaultValue['altitude'])" :halfSize="true" :name="'altitude'" :unit="'m'" v-model="modelValue['insulation']" class="col-6 border-end"/>
            <DimensionWithTolerance :dataTestLabel="dataTestLabel + '-MainSupplyVoltage'" :min="minimumMaximumScalePerParameter['voltage']['min']" :max="minimumMaximumScalePerParameter['voltage']['max']" :defaultValue="Utils.deepCopy(defaultValue['mainSupplyVoltage'])" :halfSize="true" :name="'mainSupplyVoltage'" :unit="'V'" v-model="modelValue['insulation']" class="col-6"/>

            <ElementFromList :dataTestLabel="dataTestLabel + '-Cti'" :name="'cti'" v-model="modelValue['insulation']" :options="Cti" class="col-lg-6 col-xl-2"/>
            <ElementFromList :dataTestLabel="dataTestLabel + '-InsulationType'" :name="'insulationType'" v-model="modelValue['insulation']" :options="InsulationType" class="col-lg-6 col-xl-3"/>
            <ElementFromList :dataTestLabel="dataTestLabel + '-OvervoltageCategory'" :name="'overvoltageCategory'" v-model="modelValue['insulation']" :options="OvervoltageCategory" class="col-lg-6 col-xl-4"/>
            <ElementFromList :dataTestLabel="dataTestLabel + '-PollutionDegree'" :name="'pollutionDegree'" v-model="modelValue['insulation']" :options="PollutionDegree" class="col-lg-6 col-xl-3"/>
            <SeveralElementsFromList :name="'standards'" v-model="modelValue['insulation']" :options="Standard" class="col-12"/>
        </div>
    </div>
</template>


