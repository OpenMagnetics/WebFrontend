<script setup>
import { ref, watch, computed, defineProps, onMounted } from 'vue'
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import { useCoreStore } from '/src/stores/core'
import * as Utils from '/src/assets/js/utils.js'
import * as Defaults from '/src/assets/js/defaults.js'

</script>

<script>
const schema = Yup.object().shape({
    quickGapLengthField: Yup.number().typeError('Gap Length cannot be empty').required('Please, introduce a gap').min(0.0001).label("Gap"),
    quickGapTypeField: Yup.string().required('Please, introduce a gap type'),
    quickShapeField: Yup.string().required('Please, introduce a shape'),
    quickMaterialField: Yup.string().required('Please, introduce a material'),
});

export default {
    data() {
        var quickGapTypeSelected = "Grinded";
        var quickGapLengthSelected = Defaults.engineConstants['minimumNonResidualGap'] * 1000;
        var quickShapeSelected = "ETD 39/20/13";
        var quickMaterialSelected = "3C97";
        const defaultUngappedGapping = [
            {
                "length": 0.000005,
                "type": "residual"
            },
            {
                "length": 0.000005,
                "type": "residual"
            },
            {
                "length": 0.000005,
                "type": "residual"
            }
        ]
        const defaultGrindedGapping = [
            {
                "length": 0.001,
                "type": "subtractive"
            },
            {
                "length": 0.000005,
                "type": "residual"
            },
            {
                "length": 0.000005,
                "type": "residual"
            }
        ]
        const defaultSpacerGapping = [
            {
                "length": 0.001,
                "type": "additive"
            },
            {
                "length": 0.001,
                "type": "additive"
            },
            {
                "length": 0.001,
                "type": "additive"
            }
        ]
        const defaultDistributedGapping = [
            {
                "length": 0.0001,
                "type": "subtractive"
            },
            {
                "length": 0.000005,
                "type": "residual"
            },
            {
                "length": 0.000005,

                "type": "residual"
            },
            {
                "length": 0.0001,
                "type": "subtractive"
            },
            {
                "length": 0.0001,
                "type": "subtractive"
            }
        ]
        const commercialShapesNames = [];
        const commercialMaterialNames = [];
        const coreStore = useCoreStore();

        if (this.$userStore.globalCore['functionalDescription'] != null && this.$userStore.globalCore['processedDescription'] != null) {
            quickShapeSelected = this.$userStore.globalCore['functionalDescription']['shape']['name'];
            quickMaterialSelected = this.$userStore.globalCore['functionalDescription']['material']['name'];
        }

        return {
            quickGapTypeSelected,
            quickGapLengthSelected,
            quickShapeSelected,
            quickMaterialSelected,
            coreStore,
            commercialShapesNames,
            commercialMaterialNames,
            defaultUngappedGapping,
            defaultGrindedGapping,
            defaultSpacerGapping,
            defaultDistributedGapping,
            recentChange: false,
            tryingToSend: false,
        }
    },
    mounted() {
        this.updateQuickGap()
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
        this.coreStore.$onAction((action) => {
            if (action.name == "requestingGappingTechnicalDrawing") {
                this.updateQuickGap()
            }
        })
        this.$userStore.$onAction((action) => {
            if (action.name == "setGlobalCoreAlt") {
                const coreData = action.args[0]
                this.quickShapeSelected = coreData['functionalDescription']['shape']['name']
                this.quickMaterialSelected = coreData['functionalDescription']['material']['name']
            }
        })

    },
    computed: {
        styleTooltip() {
            var relative_placement;
            relative_placement = 'top'
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
        tryToSend() {
            if (!this.tryingToSend) {
                this.recentChange = false
                this.tryingToSend = true
                setTimeout(() => {
                    if (!this.hasError) {
                        if (this.recentChange) {
                            this.tryingToSend = false
                            this.tryToSend()
                        }
                        else {
                            Utils.getCoreParameters(this.$userStore, () => {this.tryingToSend = false; this.coreStore.quickGappingChanged();}, () => {this.tryingToSend = false;})
                        }
                    }
                }
                , 100);
            }
        },
        updateQuickGap () {
            if (this.$userStore.globalCore['functionalDescription'] != null && this.$userStore.globalCore['processedDescription'] != null) {
                if (this.$userStore.globalCore['functionalDescription']['gapping'].length == this.$userStore.globalCore['processedDescription']['columns'].length &&
                    this.$userStore.globalCore['functionalDescription']['gapping'][0]['type'] == 'subtractive' &&
                    this.$userStore.globalCore['functionalDescription']['gapping'][1]['type'] == 'residual' &&
                    (this.$userStore.globalCore['processedDescription']['columns'].length == 2 || this.$userStore.globalCore['functionalDescription']['gapping'][2]['type'] == 'residual')) {
                    this.quickGapTypeSelected = "Grinded"
                }
                else if (this.$userStore.globalCore['functionalDescription']['gapping'].length == this.$userStore.globalCore['processedDescription']['columns'].length &&
                    this.$userStore.globalCore['functionalDescription']['gapping'][0]['type'] == 'additive' &&
                    this.$userStore.globalCore['functionalDescription']['gapping'][1]['type'] == 'additive' &&
                    (this.$userStore.globalCore['processedDescription']['columns'].length == 2 || this.$userStore.globalCore['functionalDescription']['gapping'][2]['type'] == 'additive')) {
                    this.quickGapTypeSelected = "Spacer"
                }
                else if (this.$userStore.globalCore['functionalDescription']['gapping'].length == this.$userStore.globalCore['processedDescription']['columns'].length &&
                    this.$userStore.globalCore['functionalDescription']['gapping'][0]['type'] == 'residual' &&
                    this.$userStore.globalCore['functionalDescription']['gapping'][1]['type'] == 'residual' &&
                    (this.$userStore.globalCore['processedDescription']['columns'].length == 2 || this.$userStore.globalCore['functionalDescription']['gapping'][2]['type'] == 'residual')) {
                    this.quickGapTypeSelected = "Ungapped"
                }
                else if (this.$userStore.globalCore['functionalDescription']['gapping'].length > this.$userStore.globalCore['processedDescription']['columns'].length &&
                    this.$userStore.globalCore['functionalDescription']['gapping'][0]['type'] == 'subtractive' &&
                    this.$userStore.globalCore['functionalDescription']['gapping'][1]['type'] == 'residual' &&
                    (
                        (this.$userStore.globalCore['processedDescription']['columns'].length == 2 && this.$userStore.globalCore['functionalDescription']['gapping'][2]['type'] == 'subtractive') ||
                        (this.$userStore.globalCore['processedDescription']['columns'].length == 3 && this.$userStore.globalCore['functionalDescription']['gapping'][2]['type'] == 'residual') && 
                        this.$userStore.globalCore['functionalDescription']['gapping'][3]['type'] == 'subtractive'
                    )) {
                    this.quickGapTypeSelected = "Distributed"
                    for (let i = 0; i < this.$userStore.globalCore['functionalDescription']['gapping'].length; i++) {
                        if (this.$userStore.globalCore['functionalDescription']['gapping'][i]['type'] == 'subtractive') {
                            if (this.$userStore.globalCore['functionalDescription']['gapping'][i]['length'] != this.$userStore.globalCore['functionalDescription']['gapping'][0]['length']) {
                                this.quickGapTypeSelected = "Custom"
                            }
                        }
                    }
                }
                else if (this.$userStore.globalCore['functionalDescription']['gapping'].length > this.$userStore.globalCore['processedDescription']['columns'].length &&
                    this.$userStore.globalCore['functionalDescription']['gapping'][0]['type'] == 'subtractive' &&
                    this.$userStore.globalCore['functionalDescription']['gapping'][1]['type'] == 'subtractive' &&
                    this.$userStore.globalCore['functionalDescription']['gapping'][2]['type'] == 'subtractive') {
                    this.quickGapTypeSelected = "Distributed"
                    for (let i = 0; i < this.$userStore.globalCore['functionalDescription']['gapping'].length; i++) {
                        if (this.$userStore.globalCore['functionalDescription']['gapping'][i]['type'] == 'subtractive') {
                            if (this.$userStore.globalCore['functionalDescription']['gapping'][i]['length'] != this.$userStore.globalCore['functionalDescription']['gapping'][0]['length']) {
                                this.quickGapTypeSelected = "Custom"
                            }
                        }
                    }
                }
                else {
                    this.quickGapTypeSelected = "Custom"
                }

                this.quickGapLengthSelected = this.$userStore.globalCore['functionalDescription']['gapping'][0]['length'] * 1000;
            }
        },
        onShapeChange () {
            var shapeDataSelected = {}
            this.$dataCacheStore.commercialShapes.forEach((item) => {
                if (item['name'] == this.quickShapeSelected) {
                    shapeDataSelected = Utils.deepCopy(item)
                }
            })
            this.$userStore.setGlobalCoreShape(shapeDataSelected)
        },
        onGapTypeChange () {
            if (this.quickGapTypeSelected == "Ungapped") {
                this.$userStore.globalCore['functionalDescription']['gapping'] = this.defaultUngappedGapping
                this.quickGapLengthSelected = Defaults.engineConstants['residualGap'] * 1000
            }
            else if (this.quickGapTypeSelected == "Grinded") {
                this.$userStore.globalCore['functionalDescription']['gapping'] = this.defaultGrindedGapping
                this.quickGapLengthSelected = Defaults.engineConstants['minimumNonResidualGap'] * 1000
            }
            else if (this.quickGapTypeSelected == "Spacer") {
                this.$userStore.globalCore['functionalDescription']['gapping'] = this.defaultSpacerGapping
                this.quickGapLengthSelected = Defaults.engineConstants['minimumNonResidualGap'] * 1000
            }
            else if (this.quickGapTypeSelected == "Distributed") {
                this.$userStore.globalCore['functionalDescription']['gapping'] = this.defaultDistributedGapping
                this.quickGapLengthSelected = Defaults.engineConstants['minimumNonResidualGap'] * 1000
            }
            this.recentChange = true
            this.tryToSend()
        },
        onGapLengthChange () {
            this.hasError = this.quickGapLengthSelected <= 0
            this.recentChange = true
            if (!this.hasError) {
                for (let i = 0; i < this.$userStore.globalCore['functionalDescription']['gapping'].length; i++) {
                    if (this.$userStore.globalCore['functionalDescription']['gapping'][i]['type'] != 'residual') {
                        this.$userStore.globalCore['functionalDescription']['gapping'][i]['length'] = Number(Utils.removeTrailingZeroes(Utils.roundWithDecimals(this.quickGapLengthSelected / 1000, 0.00001), 5))
                    }
                }
                this.tryToSend()
            }
        },
        onMaterialChange () {
            console.log("onMaterialChange")
            console.log(this.quickMaterialSelected)
            var materialDataSelected = {}
            this.$dataCacheStore.commercialMaterials.forEach((item) => {
                if (item['name'] == this.quickMaterialSelected) {
                    materialDataSelected = Utils.deepCopy(item)
                }
            })
            if (materialDataSelected != {})
                this.$userStore.setGlobalCoreMaterial(materialDataSelected)
            console.log(materialDataSelected)
            console.log(this.$userStore.globalCore)
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
            <div class="col-xl-2 col-sm-5">
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


            <label v-tooltip="'Basic gap length of the central column. Go to Gaping Artisan for advanced customization.'" class="rounded-2 fs-5 col-xl-1 col-lg-5 col-sm-5 text-xl-end pe-3 m-0 p-0 text-sm-center" >Gap</label>
            <Field :disabled="quickGapTypeSelected == 'Ungapped'" v-if="quickGapTypeSelected != 'Custom'" ref="quickGapLengthFieldRef" name="quickGapLengthField" type="number" v-model="quickGapLengthSelected" @change="onGapLengthChange" :class="{'is-invalid': errors.quickGapLengthField }" class="rounded-2 bg-light text-white col-xl-1 col-lg-3 col-sm-3 text-end"/>
            <label v-if="quickGapTypeSelected != 'Custom'" class="rounded-2 fs-5 text-start col-xl-1 col-lg-2 col-sm-2 p-0 m-0 ps-1" >{{"mm"}}</label>

            <label v-tooltip="'Type of gap. Go to Gaping Artisan for advanced customization.'" class="rounded-2 fs-5 col-xl-1 col-sm-5 p-0 m-0 text-sm-center">Type</label>
            <Field name="quickGapTypeField" ref="quickGapTypeFieldRef" as="select" :class="{'is-invalid': errors.quickGapTypeField }" @change="onGapTypeChange" class= "fs-6 bg-light text-white rounded-2 col-xl-2 col-sm-5" v-model="quickGapTypeSelected" >
                <option disabled value="">Please select one</option>
                <option value="Ungapped">Ungapped</option>
                <option value="Grinded">Grinded</option>
                <option value="Spacer">Spacer</option>
                <option value="Distributed">Distributed</option>
                <option disabled value="Custom">Custom</option>
            </Field>


            <div class="invalid-feedback">{{errors.quickMaterialField}}</div>
            <div class="invalid-feedback">{{errors.quickGapTypeField}}</div>
            <div v-if="quickGapTypeSelected != 'Custom'" class="invalid-feedback">{{errors.quickGapLengthField}}</div>

        </Form>
    </div>
</template>

