<script setup>
import { ref } from 'vue'
import { useMasStore } from '/src/stores/mas'
import { toTitleCase, toPascalCase } from '/src/assets/js/utils.js'
import { defaultDesignRequirements, defaultOperatingPointExcitationForInsulation, defaultOperatingPoint, defaultOperatingConditions } from '/src/assets/js/defaults.js'
import Insulation from '/src/components/Toolbox/DesignRequirements/Insulation.vue'
import ElementFromListRadio from '/src/components/DataInput/ElementFromListRadio.vue'
import DimensionReadOnly from '/src/components/DataInput/DimensionReadOnly.vue'
import InsulationExtraInputs from '/src/components/Toolbox/InsulationAdviser/InsulationExtraInputs.vue'
import { WiringTechnology } from '/src/assets/ts/MAS.ts'
</script>
<script>
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const masStore = useMasStore();
        if (masStore.mas.inputs.designRequirements['insulation'] == null) {
            masStore.mas.inputs.designRequirements['insulation'] = defaultDesignRequirements['insulation'];
        }
        if (masStore.mas.inputs.designRequirements['wiringTechnology'] == null) {
            masStore.mas.inputs.designRequirements['wiringTechnology'] = defaultDesignRequirements['wiringTechnology'];
        }
        if (masStore.mas.inputs.operatingPoints == null || masStore.mas.inputs.operatingPoints.length == 0) {
            masStore.mas.inputs.operatingPoints = [
                {
                    "conditions": defaultOperatingConditions,
                    "excitationsPerWinding": [defaultOperatingPointExcitationForInsulation],
                }
            ];
        }

        if (masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0] == null) {
            masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0] = defaultOperatingPointExcitationForInsulation;
        }

        const standardsToDisable = ["IEC 60335-1",
                                    "IEC 60664-5",
                                    "IEC 61558-1",
                                    "IEC 62368-1"]


        const wiringTechnologyToDisable = ["Deposition"]
        const insulation = {}

        return {
            masStore,
            standardsToDisable,
            wiringTechnologyToDisable,
            insulation
        }
    },
    computed: {
        styleTooltip() {
            var relative_placement;
            relative_placement = 'right'
            return {
                theme: {
                    placement: relative_placement,
                    width: '400px',
                    "text-align": "start",
                },
            }
        },
    },
    watch: { 
    },
    created () {
    },
    mounted () {
        this.masStore.resetCache();

        const url = import.meta.env.VITE_API_ENDPOINT + '/read_insulation_standards'

        this.$axios.post(url, {})
        .then(response => {
            this.$dataCacheStore.standards = response.data;
            this.calculateInsulation();
        })
        .catch(error => {
            console.error("Error loading standards")
            console.error(error)
        });
    },
    methods: {
        calculateInsulation() {
            this.$mkf.ready.then(_ => {
                this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0].voltage.processed.peakToPeak = 2 * this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0].voltage.processed.peak;
                this.insulation = JSON.parse(this.$mkf.calculate_insulation(JSON.stringify(this.masStore.mas.inputs), JSON.stringify(this.$dataCacheStore.standards), JSON.stringify(this.$dataCacheStore.masData['wireMaterials'])));
                console.log(this.insulation);

            });
        },
        onChange() {
            this.calculateInsulation();
        },
    }
}
</script>


<template>
    <div class="container">
        <div v-tooltip="styleTooltip" class="row">
            <div class="col-xl-12 col-md-12 col-sm-12 text-start pe-0">
                <InsulationExtraInputs class="border-bottom py-2"
                    :dataTestLabel="dataTestLabel + '-Insulation'"
                    :defaultValue="defaultOperatingPointExcitationForInsulation"
                    v-model="masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0]"
                    @update="onChange"
                />
                <ElementFromListRadio class="border-bottom py-2"
                    :name="'wiringTechnology'"
                    :dataTestLabel="dataTestLabel + '-WiringTechnology'"
                    :options="WiringTechnology"
                    :titleSameRow="false"
                    :optionsToDisable="wiringTechnologyToDisable"
                    v-model="masStore.mas.inputs.designRequirements"
                    @update="onChange"
                />
                <Insulation class="border-bottom py-2 mt-2"
                    :dataTestLabel="dataTestLabel + '-Insulation'"
                    :defaultValue="defaultDesignRequirements.insulation"
                    :showTitle="false"
                    :standardsToDisable="standardsToDisable"
                    v-model="masStore.mas.inputs.designRequirements"
                    @update="onChange"
                />
            </div>
            <div class="col-xl-12 col-md-12 col-sm-12 mt-3">
                <label class="fs-4 my-3 bg-success text-dark py-2 px-3 rounded-2" >Insulation Coordination Result</label>
                <DimensionReadOnly class="col-sm-12 col-md-4 offset-md-4"
                    :name="'clearance'"
                    :unit="'m'"
                    :dataTestLabel="dataTestLabel + '-Clearance'"
                    :value="insulation.clearance"
                    :disableShortenLabels="true"
                    :styleClass="'fs-5 text-primary'"
                />
                <DimensionReadOnly class="col-sm-12 col-md-4 offset-md-4"
                    :name="'creepageDistance'"
                    :unit="'m'"
                    :dataTestLabel="dataTestLabel + '-CreepageDistance'"
                    :value="insulation.creepageDistance"
                    :disableShortenLabels="true"
                    :styleClass="'fs-5 text-primary'"
                />
                <DimensionReadOnly class="col-sm-12 col-md-4 offset-md-4"
                    :name="'solidInsulation'"
                    :unit="'V'"
                    :dataTestLabel="dataTestLabel + '-SolidInsulation'"
                    :value="insulation.solidInsulation"
                    :disableShortenLabels="true"
                    :styleClass="'fs-5 text-primary'"
                />
                <label :data-cy="dataTestLabel + '-ErrorMessage'" class="text-danger m-0" style="font-size: 0.9em"> {{insulation.errorMessage}}</label>
            </div>
        </div>
    </div>
</template>


