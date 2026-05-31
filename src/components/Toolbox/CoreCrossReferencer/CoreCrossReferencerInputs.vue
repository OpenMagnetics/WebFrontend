<script setup>
import { useCrossReferencerStore } from '../../../stores/crossReferencer'
import { defaultCore, defaultInputs, coreCrossReferencerPossibleCoreTypes, minimumMaximumScalePerParameter, defaultDesignRequirements } from 'WebSharedComponents/assets/js/defaults.js'
import { deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import ElementFromList from 'WebSharedComponents/DataInput/ElementFromList.vue'
import SeveralElementsFromList from 'WebSharedComponents/DataInput/SeveralElementsFromList.vue'
import Module from '../../../assets/js/libCrossReferencers.wasm.js'
import CoreGappingSelector from 'WebSharedComponents/Common/CoreGappingSelector.vue'
import OperatingPointOffcanvas from './OperatingPointOffcanvas.vue'
import MaximumDimensions from 'WebSharedComponents/Common/MaximumDimensions.vue'

</script>

<script>

var crossReferencers = {
    ready: new Promise(resolve => {
        Module({
            onRuntimeInitialized () {
                crossReferencers = Object.assign(this, {
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
        onlyManufacturer: {
            type: String,
            default: '',
        },
        hasError: {
            type: Boolean,
            default: false,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    emits: [
        'inputsUpdated',
    ],
    data() {
        const crossReferencerStore = useCrossReferencerStore();
        const coreShapeNames = []; 
        const coreShapeFamilies = []; 
        const coreMaterialNames = []; 
        const coreMaterialManufacturers = [];
        const offcanvasName = "CoreCrossReferencerOperatingPoint";
        return {
            crossReferencerStore,
            coreShapeNames,
            coreShapeFamilies,
            coreMaterialNames,
            coreMaterialManufacturers,
            offcanvasName,
            operatingPointOffcanvasVisible: false,
        }
    },
    computed: {
        isStackable() {
            var shapeName = this.crossReferencerStore.coreReferenceInputs.core.functionalDescription.shape;
            if (! (typeof shapeName === 'string' || shapeName instanceof String)) {
                shapeName = shapeName.name;
            }

            if (shapeName.startsWith("E ") || shapeName.startsWith("U ") || shapeName.startsWith("T ")) {
                return true;
            }
            else {
                return false;
            }
        }
    },
    created () {
    },
    mounted () {
        this.getShapeNames();
        this.getMaterialNames();
    },
    methods: {
        getShapeNames() {
            crossReferencers.ready.then(_ => {
                const coreShapeFamiliesHandle = crossReferencers.get_available_core_shape_families();
                for (var i = coreShapeFamiliesHandle.size() - 1; i >= 0; i--) {
                    this.coreShapeFamilies.push(coreShapeFamiliesHandle.get(i));
                }

                this.coreShapeFamilies = this.coreShapeFamilies.sort();

                var coreShapeNamesHandle;
                if (this.onlyManufacturer != '' && this.onlyManufacturer != null) {
                    coreShapeNamesHandle = crossReferencers.get_available_core_shapes_by_manufacturer(this.onlyManufacturer);
                }
                else {
                    coreShapeNamesHandle = crossReferencers.get_available_core_shapes();
                }

                this.coreShapeFamilies.forEach((shapeFamily) => {
                    const sf = shapeFamily.toLowerCase();
                    if (!sf.includes("pqi") && !sf.includes("ut") &&
                        !sf.includes("ui") && !sf.includes("h") && !sf.includes("drum")) {
                        this.coreShapeNames.push(shapeFamily);
                        var numberShapes = 0;
                        for (var i = coreShapeNamesHandle.size() - 1; i >= 0; i--) {
                            const aux = coreShapeNamesHandle.get(i);
                            if (aux.startsWith(shapeFamily + " ")) {
                                numberShapes += 1;
                                this.coreShapeNames.push(aux);
                            }
                        }
                        if (numberShapes == 0) {
                            this.coreShapeNames.pop();
                        }

                    }
                })
                this.coreShapeNames = this.coreShapeNames.sort();

                if (!this.coreShapeNames.includes(this.crossReferencerStore.coreReferenceInputs.core.functionalDescription.shape)) {
                    this.crossReferencerStore.coreReferenceInputs.core.functionalDescription.shape = this.coreShapeNames[1];
                }
            });
        },
        getMaterialNames() {
            crossReferencers.ready.then(_ => {
                const coreMaterialManufacturersHandle = crossReferencers.get_available_core_manufacturers();
                for (var i = coreMaterialManufacturersHandle.size() - 1; i >= 0; i--) {
                    this.coreMaterialManufacturers.push(coreMaterialManufacturersHandle.get(i));
                }

                this.coreMaterialManufacturers = this.coreMaterialManufacturers.sort();


                this.coreMaterialManufacturers.forEach((manufacturer) => {
                    if (!(this.onlyManufacturer != '' && this.onlyManufacturer != null && manufacturer != this.onlyManufacturer)) {
                        const coreMaterialNamesHandle = crossReferencers.get_available_core_materials(manufacturer);
                        this.coreMaterialNames.push(manufacturer);
                        for (var i = coreMaterialNamesHandle.size() - 1; i >= 0; i--) {
                            this.coreMaterialNames.push(coreMaterialNamesHandle.get(i));
                        }
                    }
                })
                this.coreMaterialNames = this.coreMaterialNames.sort();


                if (!this.coreMaterialNames.includes(this.crossReferencerStore.coreReferenceInputs.core.functionalDescription.material)) {
                    this.crossReferencerStore.coreReferenceInputs.core.functionalDescription.material = this.coreMaterialNames[1];
                }
            });
        },
        inputsUpdated() {
            // Reset numberStacks when the new shape isn't stackable, so toggling
            // T → PQ doesn't carry the previous stack count into a non-stackable
            // family (the input is hidden by v-if but the value would persist).
            if (!this.isStackable) {
                this.crossReferencerStore.coreReferenceInputs.core.functionalDescription.numberStacks = 1;
            }
            this.$emit('inputsUpdated');
        },
        gappingUpdated(gapping) {
            this.crossReferencerStore.coreReferenceInputs.core.functionalDescription.gapping = gapping;
            this.$emit('inputsUpdated');
        },
    }
}
</script>

<template>
    <OperatingPointOffcanvas
        v-model:visible="operatingPointOffcanvasVisible"
        :name="offcanvasName"
        :dataTestLabel="dataTestLabel + '-Offcanvas'"
    />

    <div class="container">
        <div class="row">
            <ElementFromList
                class="col-12 my-2 text-left"
                :dataTestLabel="dataTestLabel + '-ShapeNames'"
                :name="'shape'"
                :titleSameRow="true"
                :justifyContent="true"
                :disabled="disabled"
                v-model="crossReferencerStore.coreReferenceInputs.core.functionalDescription"
                :optionsToDisable="coreShapeFamilies"
                :options="coreShapeNames"
                @update="inputsUpdated"
                :labelWidthProportionClass="'col-12 md:col-5'"
                :valueWidthProportionClass="'col-12 md:col-7'"
                :valueFontSize="$styleStore.crossReferencer.inputFontSize"
                :labelFontSize="$styleStore.crossReferencer.inputTitleFontSize"
                :labelBgColor="$styleStore.crossReferencer.inputLabelBgColor"
                :valueBgColor="$styleStore.crossReferencer.inputValueBgColor"
                :textColor="$styleStore.crossReferencer.inputTextColor"
            />

            <ElementFromList
                class="col-12 my-2 text-left"
                :dataTestLabel="dataTestLabel + '-MaterialNames'"
                :name="'material'"
                :titleSameRow="true"
                :justifyContent="true"
                :disabled="disabled"
                v-model="crossReferencerStore.coreReferenceInputs.core.functionalDescription"
                :optionsToDisable="coreMaterialManufacturers"
                :options="coreMaterialNames"
                @update="inputsUpdated"
                :labelWidthProportionClass="'col-12 md:col-5'"
                :valueWidthProportionClass="'col-12 md:col-7'"
                :valueFontSize="$styleStore.crossReferencer.inputFontSize"
                :labelFontSize="$styleStore.crossReferencer.inputTitleFontSize"
                :labelBgColor="$styleStore.crossReferencer.inputLabelBgColor"
                :valueBgColor="$styleStore.crossReferencer.inputValueBgColor"
                :textColor="$styleStore.crossReferencer.inputTextColor"
            />

            <Dimension class="col-12 my-2 text-left"
                v-if="isStackable"
                :name="'numberStacks'"
                :replaceTitle="'Number of Stacks'"
                :unit="null"
                :dataTestLabel="dataTestLabel + '-NumberStacks'"
                :min="1"
                :justifyContent="true"
                :disabled="disabled"
                :defaultValue="1"
                :allowNegative="false"
                :modelValue="crossReferencerStore.coreReferenceInputs.core.functionalDescription"
                @update="inputsUpdated"
                :labelWidthProportionClass="'col-12 md:col-5'"
                :valueWidthProportionClass="'col-12 md:col-7'"
                :valueFontSize="$styleStore.crossReferencer.inputFontSize"
                :labelFontSize="$styleStore.crossReferencer.inputTitleFontSize"
                :labelBgColor="$styleStore.crossReferencer.inputLabelBgColor"
                :valueBgColor="$styleStore.crossReferencer.inputValueBgColor"
                :textColor="$styleStore.crossReferencer.inputTextColor"
            />

            <CoreGappingSelector class="col-12 my-2 text-left"
                :title="'Gap Info: '"
                :dataTestLabel="dataTestLabel + '-Gap'"
                :disabled="disabled"
                :core="crossReferencerStore.coreReferenceInputs.core"
                :scale="1"
                @update="gappingUpdated"
                :labelWidthProportionClass="'col-12 md:col-5'"
                :valueWidthProportionClass="'col-12 md:col-7'"
                :valueFontSize="$styleStore.crossReferencer.inputFontSize"
                :labelFontSize="$styleStore.crossReferencer.inputTitleFontSize"
                :labelBgColor="$styleStore.crossReferencer.inputLabelBgColor"
                :valueBgColor="$styleStore.crossReferencer.inputValueBgColor"
                :textColor="$styleStore.crossReferencer.inputTextColor"
            />

            <Dimension class="col-12 my-2 text-left"
                :name="'numberTurns'"
                :replaceTitle="'Number of Turns'"
                :unit="null"
                :dataTestLabel="dataTestLabel + '-NumberTurns'"
                :disabled="disabled"
                :justifyContent="true"
                :min="1"
                :defaultValue="10"
                :allowNegative="false"
                :modelValue="crossReferencerStore.coreReferenceInputs"
                @update="inputsUpdated"
                :labelWidthProportionClass="'col-12 md:col-5'"
                :valueWidthProportionClass="'col-12 md:col-7'"
                :valueFontSize="$styleStore.crossReferencer.inputFontSize"
                :labelFontSize="$styleStore.crossReferencer.inputTitleFontSize"
                :labelBgColor="$styleStore.crossReferencer.inputLabelBgColor"
                :valueBgColor="$styleStore.crossReferencer.inputValueBgColor"
                :textColor="$styleStore.crossReferencer.inputTextColor"
            />

            <Dimension class="col-12 my-2 text-left"
                :name="'temperature'"
                :replaceTitle="'Temperature'"
                :unit="'°C'"
                :dataTestLabel="dataTestLabel + '-Temperature'"
                :disabled="disabled"
                :justifyContent="true"
                :min="1"
                :max="400"
                :defaultValue="25"
                :allowNegative="true"
                :modelValue="crossReferencerStore.coreReferenceInputs"
                @update="inputsUpdated"
                :labelWidthProportionClass="'col-12 md:col-5'"
                :valueWidthProportionClass="'col-12 md:col-7'"
                :valueFontSize="$styleStore.crossReferencer.inputFontSize"
                :labelFontSize="$styleStore.crossReferencer.inputTitleFontSize"
                :labelBgColor="$styleStore.crossReferencer.inputLabelBgColor"
                :valueBgColor="$styleStore.crossReferencer.inputValueBgColor"
                :textColor="$styleStore.crossReferencer.inputTextColor"
            />

            <MaximumDimensions class="border-bottom py-2"
                unit="m"
                :dataTestLabel="dataTestLabel + '-MaximumDimensions'"
                :min="minimumMaximumScalePerParameter['dimension']['min']"
                :max="minimumMaximumScalePerParameter['dimension']['max']"
                :defaultValue="defaultDesignRequirements.maximumDimensions"
                v-model="crossReferencerStore.coreReferenceInputs.maximumDimensions"
                :addButtonStyle="$styleStore.crossReferencer.requirementButton"
                :valueFontSize="$styleStore.crossReferencer.inputFontSize"
                :titleFontSize="$styleStore.crossReferencer.inputTitleFontSize"
                :labelBgColor="$styleStore.crossReferencer.inputLabelBgColor"
                :valueBgColor="$styleStore.crossReferencer.inputValueBgColor"
                :textColor="$styleStore.crossReferencer.inputTextColor"
            />

            <SeveralElementsFromList
                class="col-12 my-2 text-left"
                :classInput="'col-12'"
                :name="'enabledCoreTypes'"
                :disabled="disabled"
                :justifyContent="true"
                v-model="crossReferencerStore.coreReferenceInputs"
                :options="coreCrossReferencerPossibleCoreTypes"
                @update="inputsUpdated"
                :labelWidthProportionClass="'col-12 md:col-5'"
                :valueWidthProportionClass="'col-12 md:col-7'"
                :valueFontSize="$styleStore.crossReferencer.inputFontSize"
                :labelFontSize="$styleStore.crossReferencer.inputTitleFontSize"
                :labelBgColor="$styleStore.crossReferencer.inputLabelBgColor"
                :valueBgColor="$styleStore.crossReferencer.inputValueBgColor"
                :textColor="$styleStore.crossReferencer.inputTextColor"
            />

            <Dimension class="col-12 my-2 text-left"
                :name="'numberMaximumResults'"
                :replaceTitle="'Number of Maximum Results'"
                :unit="null"
                :dataTestLabel="dataTestLabel + '-NumberMaximumResults'"
                :disabled="disabled"
                :justifyContent="true"
                :min="1"
                :defaultValue="10"
                :allowNegative="false"
                :modelValue="crossReferencerStore.coreReferenceInputs"
                @update="inputsUpdated"
                :labelWidthProportionClass="'col-12 md:col-5'"
                :valueWidthProportionClass="'col-12 md:col-7'"
                :valueFontSize="$styleStore.crossReferencer.inputFontSize"
                :labelFontSize="$styleStore.crossReferencer.inputTitleFontSize"
                :labelBgColor="$styleStore.crossReferencer.inputLabelBgColor"
                :valueBgColor="$styleStore.crossReferencer.inputValueBgColor"
                :textColor="$styleStore.crossReferencer.inputTextColor"
            />

            <button :disabled="disabled" :data-cy="dataTestLabel + '-view-edit-excitation-modal-button'" class="p-button p-button-primary" @click="operatingPointOffcanvasVisible = true">View/Edit excitation</button>
            <button :disabled="disabled" v-if="!hasError" :data-cy="dataTestLabel + '-calculate'" class="p-button p-button-success" @click="inputsUpdated">Get Alternative Cores</button>

        </div>
    </div>
</template>


<style>
    .offcanvas-size-xxl {
        --p-offcanvas-width: 65vw !important;
    }
    .offcanvas-size-xl {
        --p-offcanvas-width: 65vw !important;
        --p-offcanvas-height: 60vh !important;
    }
    .offcanvas-size-lg {
        --p-offcanvas-width: 65vw !important;
        --p-offcanvas-height: 60vh !important;
    }
    .offcanvas-size-md { /* add Responsivenes to default offcanvas */
        --p-offcanvas-width: 65vw !important;
        --p-offcanvas-height: 60vh !important;
    }
    .offcanvas-size-sm {
        --p-offcanvas-width: 65vw !important;
        --p-offcanvas-height: 60vh !important;
    }
    .offcanvas-size-xs {
        --p-offcanvas-width: 65vw !important;
        --p-offcanvas-height: 60vh !important;
    }
    .offcanvas-size-xxs {
        --p-offcanvas-width: 65vw !important;
        --p-offcanvas-height: 60vh !important;
    }


    html {
      position: relative;
      min-height: 100%;
      padding-bottom:160px;
    }

    .om-header {
        min-width: 100%;
        position: fixed;
        z-index: 999;
    }


    @media (max-width: 340px) {
        #title {
            display : none;
        }
    }

    body {
        background-color: var(--p-dark) !important;
    }
    .border-dark {
        border-color: var(--p-dark) !important;
    }
    .input-group-text{
        background-color: var(--p-light) !important;
        color: var(--p-white) !important;
        border-color: var(--p-dark) !important;
    }
    .custom-select,
    .form-control {
        background-color: var(--p-dark) !important;
        color: var(--p-white) !important;
        border-color: var(--p-dark) !important;
    }
    .jumbotron{
        border-radius: 1em;
        box-shadow: 0 5px 10px rgba(var(--p-black-rgb), .2);
    }
    .card{
        padding: 1.5em .5em .5em;
        background-color: var(--p-light);
        border-radius: 1em;
        text-align: center;
        box-shadow: 0 5px 10px rgba(var(--p-black-rgb), .2);
    }
    .form-control:disabled {
        background-color: var(--p-dark) !important;
        color: var(--p-white) !important;
        border-color: var(--p-dark) !important;
    }
    .form-control:-webkit-autofill,
    .form-control:-webkit-autofill:focus,
    .form-control:-webkit-autofill{
        -webkit-text-fill-color: var(--p-white) !important;
        background-color: transparent !important;
        -webkit-box-shadow: 0 0 0 50px var(--p-dark) inset;
    }

    .container {
        max-width: 100vw;
        align-items: center;
    }

    .main {
      margin-top: 60px;
    }
    ::-webkit-scrollbar { height: 3px;}
    ::-webkit-scrollbar-button {  background-color: var(--p-light); }
    ::-webkit-scrollbar-track {  background-color: var(--p-light);}
    ::-webkit-scrollbar-track-piece { background-color: var(--p-dark);}
    ::-webkit-scrollbar-thumb {  background-color: var(--p-light); border-radius: 3px;}
    ::-webkit-scrollbar-corner { background-color: var(--p-light);}

    .small-text {
       font-size: calc(1rem + 0.1vw);
    }
    .medium-text {
       font-size: calc(0.8rem + 0.4vw);
    }
    .large-text {
       font-size: calc(1rem + 0.5vw);
    }

    .accordion-button:focus {
        border-color: var(--p-primary) !important;
        outline: 0  !important;
        box-shadow: none  !important;
    }

</style>