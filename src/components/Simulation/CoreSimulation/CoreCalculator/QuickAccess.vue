<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import { useSimulationStore } from '/src/stores/simulation'
import * as Utils from '/src/assets/js/utils.js'
import * as Defaults from '/src/assets/js/defaults.js'

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
            const shapeData = this.$dataCacheStore.commercialShapes
            this.commercialShapesNames = []
            shapeData.forEach((item) => {
                this.commercialShapesNames.push(item['name'])
            })
        },
        loadMaterialNames() {
            const materialData = this.$dataCacheStore.commercialMaterials
            this.commercialMaterialNames = []
            materialData.forEach((item) => {
                this.commercialMaterialNames.push(item['name'])
            })
        },
        onShapeChange() {
            var shapeDataSelected = {}
            this.$dataCacheStore.commercialShapes.forEach((item) => {
                if (item['name'] == this.quickShapeSelected) {
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
                this.$userStore.setGlobalSimulationCoreShape(shapeDataSelected)
                this.$userStore.setGlobalSimulationCoreNumberStacks(1)
                this.simulationStore.calculateInductance()
                this.simulationStore.calculateCoreLosses()
            }
        },
        onMaterialChange () {
            var materialDataSelected = {}
            this.$dataCacheStore.commercialMaterials.forEach((item) => {
                if (item['name'] == this.quickMaterialSelected) {
                    materialDataSelected = Utils.deepCopy(item)
                }
            })
            if (materialDataSelected != {}) {
                this.$userStore.setGlobalSimulationCoreMaterial(materialDataSelected)
                this.simulationStore.loadCoreLossesModels()
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


            <label v-tooltip="'Shape of the core, to be selected among all available commercial ones. Go to shape artisan for advanced customization.'" class="rounded-2 fs-5 col-xl-1 col-lg-5 col-sm-5 m-xl-0 p-0 m-0 text-sm-center">Shape</label>
            <div class="col-xl-3 col-sm-5">
                <div class="container-flex p-0 m-0">
                    <div class="row">
                        <Field name="quickShapeField" ref="quickShapeFieldRef" as="select" :class="{'is-invalid': errors.quickShapeField }" @change="onShapeChange" class= "fs-6 bg-light text-white rounded-2 col-8 m-0 p-0" v-model="quickShapeSelected">
                            <option disabled value="">Please select one</option>
                            <option disabled value="Custom">Custom</option>
                            <option v-for="model, index in commercialShapesNames"
                                :key="index"
                                :value="model">{{model}}
                            </option>
                        </Field>
                        <button v-tooltip="'Open information table for shapes'" class="btn btn-primary text-dark py-1 p-0 px-0 mx-1 offset-1 col-2" data-bs-toggle="modal" data-bs-target="#loadCommercialShapeModal" >
                            <i class="fa-solid fs-6 fa-table-list m-0 p-0"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="invalid-feedback">{{errors.quickShapeField}}</div>


            <label v-tooltip="'Material of the core, it can only be commercial for now'" class="rounded-2 fs-5 col-xl-1 col-sm-5 m-xl-0 p-0 m-0 text-sm-center">Material</label>
            <div class="col-xl-2 col-sm-5">
                <div class="container-flex p-0 m-0">
                    <div class="row">
                        <Field name="quickMaterialField" ref="quickMaterialFieldRef" as="select" :class="{ 'is-invalid': errors.quickMaterialField }" @change="onMaterialChange" class= "fs-6 bg-light text-white rounded-2 col-8 m-0 p-0" v-model="quickMaterialSelected">
                            <option disabled value="">Please select one</option>
                            <option disabled value="Custom">Custom</option>
                            <option v-for="model, index in commercialMaterialNames"
                                :key="index"
                                :value="model">{{model}}
                            </option>
                        </Field>
                        <button v-tooltip="'Open information table for materials'" class="btn btn-primary text-dark py-1 p-0 px-0 mx-1 offset-1 col-2" data-bs-toggle="modal" data-bs-target="#loadCommercialMaterialModal" >
                            <i class="fa-solid fs-6 fa-table-list m-0 p-0"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="invalid-feedback">{{errors.quickMaterialField}}</div>

            <label class="rounded-2 fs-5 text-start col-xl-1 col-lg-2 col-sm-2 p-0 m-0 ps-1" >Stacks</label>
            <Field :disabled="!stackable" name="quickStacksField" type="number" v-model="quickStacksSelected" @change="onStacksChange" 
            @keydown.enter.prevent :class="{'is-invalid': errors.quickStacksField }" class="rounded-2 bg-light text-white col-xl-1 col-lg-3 col-sm-3 text-end"/>
            <div class="invalid-feedback">{{errors.quickStacksField}}</div>

            <label class="rounded-2 fs-5 text-center col-xl-1 col-lg-2 col-sm-2 p-0 m-0 ps-1"> Temp.</label>
            <Field name="quickTemperatureField" type="number" v-model="quickTemperatureSelected" @change="onTemperatureChange" 
            @keydown.enter.prevent :class="{'is-invalid': errors.quickTemperatureField }" class="rounded-2 bg-light text-white col-xl-1 col-lg-3 col-sm-3 text-end"/>
            <label class="rounded-2 fs-5 text-start col-xl-1 col-lg-2 col-sm-2 p-0 m-0 ps-1" >{{"°C"}}</label>
            <div class="invalid-feedback">{{errors.quickTemperatureField}}</div>


        </Form>
    </div>
</template>

