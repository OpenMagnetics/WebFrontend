<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import { useSimulationStore } from '/src/stores/simulation'
import * as Utils from '/src/assets/js/utils.js'
import * as Defaults from '/src/assets/js/defaults.js'
import CoreMaterialSelector from '/src/components/Common/CoreMaterialSelector.vue'
import CoreShapeSelector from '/src/components/Common/CoreShapeSelector.vue'

</script>

<script>
const schema = Yup.object().shape({
    quickShapeField: Yup.string().required('Please, introduce a shape'),
    quickMaterialField: Yup.string().required('Please, introduce a material'),
    quickTemperatureField: Yup.string().required('Please, introduce a temperature'),
    quickStacksField: Yup.string().required('Please, introduce a number of stacks'),
});

export default {
    data() {
        var quickShapeSelected = "ETD 39/20/13";
        var quickMaterialSelected = "3C97";
        var quickTemperatureSelected = 42;
        var quickStacksSelected = 1;
        var stackable = false;
        const commercialShapesNames = [];
        const commercialMaterialNames = [];
        const simulationStore = useSimulationStore();
        const materialManufacturers = []

        if (this.$userStore.globalSimulation['inputs']['operationPoints'] != null) {
            if (this.$userStore.globalSimulation['inputs']['operationPoints'][0]['conditions'] != null) {
                quickTemperatureSelected = this.$userStore.globalSimulation['inputs']['operationPoints'][0]['conditions']['ambientTemperature']
            }
        }
        if (this.$userStore.globalSimulation['magnetic']['core']['functionalDescription'] != null) {
            if (typeof(this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['shape']) == 'string') {
                quickShapeSelected = this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['shape'];
                if (quickShapeSelected.startsWith('E ') | quickShapeSelected.startsWith('U ') | quickShapeSelected.startsWith('T ')) {
                    stackable = true
                    quickStacksSelected = this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['numberStacks']
                }
                else {
                    stackable = false
                    quickStacksSelected = 1
                }
            }
            else {
                const shapeData = this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['shape']
                quickShapeSelected = shapeData['name'];
                if (shapeData['family'] == 'e' | shapeData['family'] == 'u' | shapeData['family'] == 't') {
                    stackable = true
                    quickStacksSelected = this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['numberStacks']
                }
                else {
                    stackable = false
                    quickStacksSelected = 1
                }
            }

            if (typeof(this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['material']) == 'string') {
                quickMaterialSelected = this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['material'];
            }
            else {
                quickMaterialSelected = this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['material']['name'];
            }
        }

        return {
            quickShapeSelected,
            quickMaterialSelected,
            quickTemperatureSelected,
            quickStacksSelected,
            simulationStore,
            commercialShapesNames,
            commercialMaterialNames,
            stackable,
            materialManufacturers,
            recentChange: false,
            tryingToSend: false,
        }
    },
    mounted() {
        this.loadShapesNames()
        this.loadMaterialNames()
    },
    created() {
        this.$dataCacheStore.$onAction((action) => {
            if (action.name == "commercialShapesLoaded") {
                this.loadShapesNames()
            }
            else if (action.name == "commercialMaterialsLoaded") {
                this.loadMaterialNames()
            }
        })
    },
    computed: {
        styleTooltip() {
            var relative_placement;
            relative_placement = 'bottom'
            return {
                theme: {
                    placement: relative_placement,
                    width: '400px',
                    "text-align": "center",
                },
            }
        },
    },
    methods: {
        loadShapesNames() {
            const shapeData = this.$dataCacheStore.masData['coreShapes']
            this.commercialShapesNames = []
            shapeData.forEach((item) => {
                this.commercialShapesNames.push(item['name'])
            })
        },
        loadMaterialNames() {
            const materialData = this.$dataCacheStore.masData['coreMaterials']
            this.commercialMaterialNames = []
            this.materialManufacturers = ["Magnetics"]
            materialData.forEach((item) => {
                if (!this.materialManufacturers.includes(item['manufacturerInfo']['name'])) {
                    this.materialManufacturers.push(item['manufacturerInfo']['name'])
                }
            })
            console.log(this.materialManufacturers)
            this.materialManufacturers.forEach((itemManufacturer) => {
                this.commercialMaterialNames.push(itemManufacturer)
                materialData.forEach((item) => {
                    if (item['manufacturerInfo']['name'] == itemManufacturer) {
                        this.commercialMaterialNames.push(item['name'])
                    }
                })
            })
        },
        onShapeChange(newValue) {
            var shapeDataSelected = {}
            this.$dataCacheStore.masData['coreShapes'].forEach((item) => {
                if (item['name'] == newValue) {
                    shapeDataSelected = Utils.deepCopy(item)
                }
            })
            if (shapeDataSelected != {}) {
                if (shapeDataSelected['family'] == 'e' | shapeDataSelected['family'] == 'u' | shapeDataSelected['family'] == 't') {
                    this.stackable = true
                }
                else {
                    this.stackable = false
                    this.quickStacksSelected = 1
                }

                if ('familySubtype' in shapeDataSelected) {
                    shapeDataSelected['familySubtype'] = shapeDataSelected['familySubtype'].toString();
                }

                this.$userStore.setGlobalSimulationCoreShape(shapeDataSelected)
                this.$userStore.setGlobalSimulationCoreNumberStacks(1)
                this.simulationStore.calculateInductance()
                this.simulationStore.calculateCoreLosses()
            }
        },
        onMaterialChange (newValue) {
            var materialDataSelected = {}
            this.$dataCacheStore.masData['coreMaterials'].forEach((item) => {
                if (item['name'] == newValue) {
                    materialDataSelected = Utils.deepCopy(item)
                }
            })
            if (materialDataSelected != {}) {
                this.$userStore.setGlobalSimulationCoreMaterial(materialDataSelected)
                this.simulationStore.loadCoreLossesModels()
                // this.simulationStore.calculateInductance()
                // this.simulationStore.calculateCoreLosses()
            }
        },
        onTemperatureChange () {
            const operationPoint = this.$userStore.globalSimulation['inputs']['operationPoints'][0]
            operationPoint['conditions']['ambientTemperature'] = this.quickTemperatureSelected

            this.$userStore.setGlobalSimulationOperationPointByIndex(0, operationPoint)
            this.simulationStore.calculateInductance()
            this.simulationStore.calculateCoreLosses()

        },
        onStacksChange() {
            if (this.stackable & this.quickStacksSelected > 0) {
                this.$userStore.setGlobalSimulationCoreNumberStacks(this.quickStacksSelected)
                this.simulationStore.calculateInductance()
                this.simulationStore.calculateCoreLosses()
            }

        },
        handleSubmit(params) {
        },
    },
}
</script>


<template>
    <div v-tooltip="styleTooltip" class="container-flex text-primary pt-2">
        <Form ref="formRef" :validation-schema="schema" v-slot="{ handleSubmit, errors }" class="form-inline row" @submit="handleSubmit($event, onSubmit)">
            <div class="mt-1"></div>

            <CoreShapeSelector class="col-xl-4 col-sm-4" :dataTestLabel="'SimulationCoreCalculatorQuickAccess'" :initialShapeSelected="quickShapeSelected" @onShapeChange="onShapeChange"/>
            <CoreMaterialSelector class="col-xl-3 col-sm-3" :dataTestLabel="'SimulationCoreCalculatorQuickAccess'" :initialMaterialSelected="quickMaterialSelected" @onMaterialChange="onMaterialChange"/>

            <label class="rounded-2 fs-5 text-center col-xl-1 col-lg-1 col-sm-3 col-xs-12 col-6 p-0 m-0 ps-1" >Stacks</label>
            <Field data-cy="SimulationCoreCalculatorQuickAccess-number-stacks-input" :disabled="!stackable" name="quickStacksField" type="number" v-model="quickStacksSelected" @change="onStacksChange" 
            @keydown.enter.prevent :class="{'is-invalid': errors.quickStacksField }" class="rounded-2 bg-light text-white col-xl-1 col-lg-1  col-sm-3 col-xs-12 col-6 text-end"/>
            <div class="invalid-feedback">{{errors.quickStacksField}}</div>

            <label class="rounded-2 fs-5 text-center col-xl-1 col-lg-1 col-sm-3 col-xs-6 col-6 p-0 m-0 ps-1"> Temp.</label>
            <Field data-cy="SimulationCoreCalculatorQuickAccess-temperature-input" name="quickTemperatureField" type="number" v-model="quickTemperatureSelected" @change="onTemperatureChange" 
            @keydown.enter.prevent :class="{'is-invalid': errors.quickTemperatureField }" class="rounded-2 bg-light text-white col-xl-1 col-lg-1  col-sm-2 col-xs-9 col-5 text-end"/>
            <label class="rounded-2 fs-5 text-start col-1 p-0 m-0 ps-1" >{{"°C"}}</label>
            <div class="invalid-feedback">{{errors.quickTemperatureField}}</div>


        </Form>
    </div>
</template>

