<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import { useCoreStore } from '/src/stores/core'
import * as Utils from '/src/assets/js/utils.js'
import * as Defaults from '/src/assets/js/defaults.js'
import CoreMaterialSelector from '/src/components/Common/CoreMaterialSelector.vue'
import CoreShapeSelector from '/src/components/Common/CoreShapeSelector.vue'

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
        var quickGapTypeSelected = "Ground";
        var quickGapLengthSelected = 0;
        var quickShapeSelected = "ETD 39/20/13";
        var quickMaterialSelected = "3C97";
        const coreStore = useCoreStore();

        if (this.$userStore.globalCore['functionalDescription'] != null && this.$userStore.globalCore['processedDescription'] != null) {
            if (typeof(this.$userStore.globalCore['functionalDescription']['shape']) == 'string') {
                quickShapeSelected = this.$userStore.globalCore['functionalDescription']['shape'];
            }
            else {
                quickShapeSelected = this.$userStore.globalCore['functionalDescription']['shape']['name'];
            }

            if (typeof(this.$userStore.globalCore['functionalDescription']['material']) == 'string') {
                quickMaterialSelected = this.$userStore.globalCore['functionalDescription']['material'];
            }
            else {
                quickMaterialSelected = this.$userStore.globalCore['functionalDescription']['material']['name'];
            }
        }

        return {
            quickGapTypeSelected,
            quickGapLengthSelected,
            quickShapeSelected,
            quickMaterialSelected,
            coreStore,
            recentChange: false,
            tryingToSend: false,
        }
    },
    mounted() {
        this.updateQuickGap()
    },
    created() {
        this.coreStore.$onAction((action) => {
            if (action.name == "requestingGappingTechnicalDrawing") {
                this.updateQuickGap()
            }
        })
        this.$userStore.$onAction((action) => {
            if (action.name == "setGlobalCoreAlt") {
                const coreData = action.args[0]

                if (typeof(coreData['functionalDescription']['shape']) == 'string') {
                    this.quickShapeSelected = coreData['functionalDescription']['shape'];
                }
                else {
                    this.quickShapeSelected = coreData['functionalDescription']['shape']['name'];
                }

                if (typeof(coreData['functionalDescription']['material']) == 'string') {
                    this.quickMaterialSelected = coreData['functionalDescription']['material'];
                }
                else {
                    this.quickMaterialSelected = coreData['functionalDescription']['material']['name'];
                }
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
        async loadResidualGap() {
            await this.$mkf.ready.then(_ => {
                this.quickGapLengthSelected = this.$mkf.get_constants().get('residualGap') * 1000;
            });
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
                            this.$mkf.ready.then(_ => {
                                const aux = Utils.deepCopy(this.$userStore.globalCore);
                                aux['geometricalDescription'] = null;
                                aux['processedDescription'] = null;

                                var core = JSON.parse(this.$mkf.calculate_core_data(JSON.stringify(aux), false));

                                this.$userStore.globalCore = core;
                                this.$userStore.setGlobalCore(core)
                                this.tryingToSend = false;
                                this.coreStore.quickGappingChanged();
                            }).catch(error => { 
                                this.tryingToSend = false;
                            });
                        }
                    }
                }
                , 100);
            }
        },
        updateQuickGap () {
            const aux = Utils.guessBasicGappingParameters(this.$userStore.globalCore)
            if (aux['gapType'] != null) {
                this.quickGapTypeSelected = aux['gapType']
            }
            if (aux['gapLength'] != null) {
                this.quickGapLengthSelected = aux['gapLength']
            }
        },
        onShapeChange(newValue) {
            var shapeDataSelected = {}
            console.log("On shape change")
            this.$dataCacheStore.masData['coreShapes'].forEach((item) => {
                if (item['name'] == newValue) {
                    shapeDataSelected = Utils.deepCopy(item)
                }
            })
            this.$userStore.setGlobalCoreShape(shapeDataSelected)
            this.coreStore.quickShapeChanged()
        },
        onGapTypeChange () {
            if (this.quickGapTypeSelected == "Ungapped") {
                this.$userStore.globalCore['functionalDescription']['gapping'] = Defaults.defaultUngappedGapping
            }
            else if (this.quickGapTypeSelected == "Ground") {
                this.$userStore.globalCore['functionalDescription']['gapping'] = Defaults.defaultGroundGapping
            }
            else if (this.quickGapTypeSelected == "Spacer") {
                this.$userStore.globalCore['functionalDescription']['gapping'] = Defaults.defaultSpacerGapping
            }
            else if (this.quickGapTypeSelected == "Distributed") {
                this.$userStore.globalCore['functionalDescription']['gapping'] = Defaults.defaultDistributedGapping
            }
            this.updateQuickGap();
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
        onMaterialChange (newValue) {
            var materialDataSelected = {}
            this.$dataCacheStore.masData['coreMaterials'].forEach((item) => {
                if (item['name'] == newValue) {
                    materialDataSelected = Utils.deepCopy(item)
                }
            })
            if (materialDataSelected != {})
                this.$userStore.setGlobalCoreMaterial(materialDataSelected)
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

            <CoreShapeSelector class="col-xl-3 col-sm-3" :dataTestLabel="'SimulationCoreCalculatorQuickAccess'" :initialShapeSelected="quickShapeSelected" @onShapeChange="onShapeChange"/>
            <CoreMaterialSelector class="col-xl-3 col-sm-3" :dataTestLabel="'SimulationCoreCalculatorQuickAccess'" :initialMaterialSelected="quickMaterialSelected" @onMaterialChange="onMaterialChange"/>

            <label v-if="$userStore.globalCore['functionalDescription']['shape']['family'] != 't'" v-tooltip="'Basic gap length of the central column. Go to Gaping Artisan for advanced customization.'" class="rounded-2 fs-5 col-xl-1 col-lg-5 col-sm-5 text-xl-end pe-3 m-0 p-0 text-sm-center" >Gap</label>
            <Field data-cy="CoreQuickAccess-gap-length-input" v-if="$userStore.globalCore['functionalDescription']['shape']['family'] != 't'" @keydown.enter.prevent :disabled="quickGapTypeSelected == 'Ungapped' && quickGapTypeSelected != 'Custom'" ref="quickGapLengthFieldRef" name="quickGapLengthField" type="number" v-model="quickGapLengthSelected" @change="onGapLengthChange" :class="{'is-invalid': errors.quickGapLengthField }" class="rounded-2 bg-light text-white col-xl-1 col-lg-3 col-sm-3 text-end"/>
            <label v-if="$userStore.globalCore['functionalDescription']['shape']['family'] != 't' && quickGapTypeSelected != 'Custom'" class="rounded-2 fs-5 text-start col-xl-1 col-lg-2 col-sm-2 p-0 m-0 ps-1" >{{"mm"}}</label>

            <label v-if="$userStore.globalCore['functionalDescription']['shape']['family'] != 't'" v-tooltip="'Type of gap. Go to Gaping Artisan for advanced customization.'" class="rounded-2 fs-5 col-xl-1 col-sm-5 p-0 m-0 text-sm-center">Type</label>
            <Field data-cy="CoreQuickAccess-gap-type-select-input" v-if="$userStore.globalCore['functionalDescription']['shape']['family'] != 't'" @keydown.enter.prevent name="quickGapTypeField" ref="quickGapTypeFieldRef" as="select" :class="{'is-invalid': errors.quickGapTypeField }" @change="onGapTypeChange" class= "fs-6 bg-light text-white rounded-2 col-xl-2 col-sm-5" v-model="quickGapTypeSelected" >
                <option data-cy="CoreQuickAccess-gap-type-NA-option-input" disabled value="">Please select one</option>
                <option data-cy="CoreQuickAccess-gap-type-ungapped-option-input" value="Ungapped">Ungapped</option>
                <option data-cy="CoreQuickAccess-gap-type-ground-option-input" value="Ground">Ground</option>
                <option data-cy="CoreQuickAccess-gap-type-spacer-option-input" value="Spacer">Spacer</option>
                <option data-cy="CoreQuickAccess-gap-type-distributed-option-input" value="Distributed">Distributed</option>
                <option data-cy="CoreQuickAccess-gap-type-custom-option-input" disabled value="Custom">Custom</option>
            </Field>


            <div class="invalid-feedback">{{errors.quickMaterialField}}</div>
            <div class="invalid-feedback">{{errors.quickGapTypeField}}</div>
            <div v-if="quickGapTypeSelected != 'Custom'" class="invalid-feedback">{{errors.quickGapLengthField}}</div>

        </Form>
    </div>
</template>

