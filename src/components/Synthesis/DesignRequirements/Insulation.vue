<script setup>
import { isNumber, toTitleCase, getMultiplier } from '/src/assets/js/utils.js'
import DimensionWithTolerance from '/src/components/Synthesis/DesignRequirements/DimensionWithTolerance.vue'
import ElementFromList from '/src/components/Synthesis/DesignRequirements/ElementFromList.vue'
import SeveralElementsFromList from '/src/components/Synthesis/DesignRequirements/SeveralElementsFromList.vue'
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
        }
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
    <div class="container-flex">
        <div class="row ms-2">
            <DimensionWithTolerance :allowNegative="true" :min="minimumMaximumScalePerParameter['altitude']['min']" :max="minimumMaximumScalePerParameter['altitude']['max']" :defaultValue="Utils.deepCopy(defaultValue['altitude'])" :halfSize="true" :name="'altitude'" :unit="'m'" v-model="modelValue['insulation']" class="col-6 border-end"/>
            <DimensionWithTolerance :min="minimumMaximumScalePerParameter['voltage']['min']" :max="minimumMaximumScalePerParameter['voltage']['max']" :defaultValue="Utils.deepCopy(defaultValue['mainSupplyVoltage'])" :halfSize="true" :name="'mainSupplyVoltage'" :unit="'V'" v-model="modelValue['insulation']" class="col-6"/>

            <ElementFromList :name="'cti'" v-model="modelValue['insulation']" :options="Cti" class="col-lg-6 col-xl-2"/>
            <ElementFromList :name="'insulationType'" v-model="modelValue['insulation']" :options="InsulationType" class="col-lg-6 col-xl-3"/>
            <ElementFromList :name="'overvoltageCategory'" v-model="modelValue['insulation']" :options="OvervoltageCategory" class="col-lg-6 col-xl-4"/>
            <ElementFromList :name="'pollutionDegree'" v-model="modelValue['insulation']" :options="PollutionDegree" class="col-lg-6 col-xl-3"/>
            <SeveralElementsFromList :name="'standards'" v-model="modelValue['insulation']" :options="Standard" class="col-12"/>
        </div>
    </div>
</template>


