<script setup>
import { ref } from 'vue'
import { useMasStore } from '/src/stores/mas'
import { toTitleCase, toPascalCase } from '/WebSharedComponents/assets/js/utils.js'
import { defaultDesignRequirements, defaultOperatingPointExcitationForInsulation, defaultOperatingPoint, defaultOperatingConditions } from '/WebSharedComponents/assets/js/defaults.js'
import InsulationSimple from '/src/components/Toolbox/InsulationAdviser/InsulationSimple.vue'
import ElementFromListRadio from '/WebSharedComponents/DataInput/ElementFromListRadio.vue'
import DimensionReadOnly from '/WebSharedComponents/DataInput/DimensionReadOnly.vue'
import InsulationExtraInputs from '/src/components/Toolbox/InsulationAdviser/InsulationExtraInputs.vue'
import Module from '/src/assets/js/libInsulationCoordinator.wasm.js'
</script>

<script>

var insulationCoordinator = {
    ready: new Promise(resolve => {
        Module({
            onRuntimeInitialized () {
                insulationCoordinator = Object.assign(this, {
                    ready: Promise.resolve()
                });
                resolve();
            }
        });
    })
};
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

        const standardsToDisable = []


        const insulation = {}

        return {
            masStore,
            standardsToDisable,
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
        this.calculateInsulation();
    },
    methods: {
        calculateInsulation() {
            insulationCoordinator.ready.then(_ => {
                this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0].voltage.processed.peakToPeak = 2 * this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0].voltage.processed.peak;

                console.log(this.masStore.mas.inputs.operatingPoints)

                this.insulation = JSON.parse(insulationCoordinator.calculate_insulation(JSON.stringify(this.masStore.mas.inputs)));
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
                <InsulationExtraInputs class="border-bottom pb-2 mt-3"
                    :dataTestLabel="dataTestLabel + '-Insulation'"
                    :defaultValue="defaultOperatingPointExcitationForInsulation"
                    v-model="masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0]"
                    @update="onChange"
                />
                <InsulationSimple class="border-bottom py-2 mt-2"
                    :dataTestLabel="dataTestLabel + '-Insulation'"
                    :defaultValue="defaultDesignRequirements.insulation"
                    :showTitle="false"
                    :standardsToDisable="standardsToDisable"
                    v-model="masStore.mas.inputs.designRequirements"
                    @update="onChange"
                />
            </div>
            <div class="col-xl-12 col-md-12 col-sm-12 mt-3">
                <label class="fs-4 my-3 bg-success text-dark py-2 px-3 rounded-2 w-50" >Insulation Coordination Result</label>
                <DimensionReadOnly class="col-sm-12 col-md-6 offset-md-3"
                    :name="'clearance'"
                    :unit="'m'"
                    :dataTestLabel="dataTestLabel + '-Clearance'"
                    :value="insulation.clearance"
                    :disableShortenLabels="true"
                    :styleClass="'fs-4 text-primary text-start'"
                    :inputStyleClass="'col-7 fs-4'"
                    :labelStyleClass="'col-8'"
                    :dimensionStyleClass="'col-4'"
                    :dimensionUnitStyleClass="'bg-dark border-0 my-0 py-0 fs-4'"
                    :labelBgColor="'bg-transparent'"
                    :inputBgColor="'bg-transparent'"
                    :textColor="$settingsStore.textColor"
                />
                <DimensionReadOnly class="col-sm-12 col-md-6 offset-md-3"
                    :name="'creepageDistance'"
                    :unit="'m'"
                    :dataTestLabel="dataTestLabel + '-CreepageDistance'"
                    :value="insulation.creepageDistance"
                    :disableShortenLabels="true"
                    :styleClass="'fs-4 text-primary text-start'"
                    :inputStyleClass="'col-7 fs-4'"
                    :labelStyleClass="'col-8'"
                    :dimensionStyleClass="'col-4'"
                    :dimensionUnitStyleClass="'bg-dark border-0 my-0 py-0 fs-4'"
                    :labelBgColor="'bg-transparent'"
                    :inputBgColor="'bg-transparent'"
                    :textColor="$settingsStore.textColor"
                />
                <DimensionReadOnly class="col-sm-12 col-md-6 offset-md-3"
                    :name="'withstandVoltage'"
                    :unit="'V'"
                    :dataTestLabel="dataTestLabel + '-WithstandVoltage'"
                    :value="insulation.withstandVoltage"
                    :disableShortenLabels="true"
                    :styleClass="'fs-4 text-primary text-start'"
                    :inputStyleClass="'col-7 fs-4'"
                    :labelStyleClass="'col-8'"
                    :dimensionStyleClass="'col-4'"
                    :dimensionUnitStyleClass="'bg-dark border-0 my-0 py-0 fs-4'"
                    :labelBgColor="'bg-transparent'"
                    :inputBgColor="'bg-transparent'"
                    :textColor="$settingsStore.textColor"
                />
                <DimensionReadOnly class="col-sm-12 col-md-6 offset-md-3"
                    :name="'distanceThroughInsulation'"
                    :unit="'m'"
                    :dataTestLabel="dataTestLabel + '-DistanceThroughInsulation'"
                    :value="insulation.distanceThroughInsulation"
                    :disableShortenLabels="true"
                    :styleClass="'fs-4 text-primary text-start'"
                    :inputStyleClass="'col-7 fs-4'"
                    :labelStyleClass="'col-8'"
                    :dimensionStyleClass="'col-4'"
                    :dimensionUnitStyleClass="'bg-dark border-0 my-0 py-0 fs-4'"
                    :labelBgColor="'bg-transparent'"
                    :inputBgColor="'bg-transparent'"
                    :textColor="$settingsStore.textColor"
                />
                <label :data-cy="dataTestLabel + '-ErrorMessage'" class="text-danger m-0" style="font-size: 0.9em"> {{insulation.errorMessage}}</label>
            </div>
        </div>
    </div>
</template>


