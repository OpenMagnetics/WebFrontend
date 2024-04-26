<script setup>
import { useCrossReferencerStore } from '/src/stores/crossReferencer'
import { defaultCore, defaultInputs } from '/src/assets/js/defaults.js'
import { deepCopy } from '/src/assets/js/utils.js'
import Dimension from '/src/components/DataInput/Dimension.vue'
import ElementFromList from '/src/components/DataInput/ElementFromList.vue'
import Module from '/src/assets/js/libCrossReferencers.wasm.js'
import CoreGappingSelector from '/src/components/Common/CoreGappingSelector.vue'
import OperatingPointOffcanvas from '/src/components/Common/OperatingPointOffcanvas.vue'

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
        }
    },
    computed: {
    },
    watch: { 
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

                const coreShapeNamesHandle = crossReferencers.get_available_core_shapes();
                this.coreShapeFamilies.forEach((shapeFamily) => {
                    if (!shapeFamily.includes("PQI") && !shapeFamily.includes("UT") &&
                        !shapeFamily.includes("UI") && !shapeFamily.includes("H") && !shapeFamily.includes("DRUM")) {
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
                    const coreMaterialNamesHandle = crossReferencers.get_available_core_materials(manufacturer);
                    this.coreMaterialNames.push(manufacturer);
                    for (var i = coreMaterialNamesHandle.size() - 1; i >= 0; i--) {
                        this.coreMaterialNames.push(coreMaterialNamesHandle.get(i));
                    }
                })
            });
        },
        inputsUpdated() {
            this.$emit('inputsUpdated');
        },
        gappingUpdated(gapping) {
            this.crossReferencerStore.referenceInputs.core.functionalDescription.gapping = gapping;
            this.$emit('inputsUpdated');
        },
    }
}
</script>

<template>
    <OperatingPointOffcanvas
        :name="offcanvasName"
        :dataTestLabel="dataTestLabel + '-Offcanvas'"
    />

    <div class="container">
        <div class="row">
            <ElementFromList
                class="col-12 my-2 text-start"
                :dataTestLabel="dataTestLabel + '-ShapeNames'"
                :name="'shape'"
                :titleSameRow="true"
                :justifyContent="true"
                v-model="crossReferencerStore.referenceInputs.core.functionalDescription"
                :optionsToDisable="coreShapeFamilies"
                :options="coreShapeNames"
                @update="inputsUpdated"
            />

            <ElementFromList
                class="col-12 my-2 text-start"
                :dataTestLabel="dataTestLabel + '-MaterialNames'"
                :name="'material'"
                :titleSameRow="true"
                :justifyContent="true"
                v-model="crossReferencerStore.referenceInputs.core.functionalDescription"
                :optionsToDisable="coreMaterialManufacturers"
                :options="coreMaterialNames"
                @update="inputsUpdated"
            />

            <Dimension class="col-12 my-2 text-start"
                :name="'numberStacks'"
                :replaceTitle="'Number of Stacks'"
                :unit="null"
                :dataTestLabel="dataTestLabel + '-NumberStacks'"
                :min="1"
                :justifyContent="true"
                :defaultValue="1"
                :allowNegative="false"
                :modelValue="crossReferencerStore.referenceInputs.core.functionalDescription"
                @update="inputsUpdated"
            />

            <CoreGappingSelector class="col-12 my-2 text-start"
                :title="'Gap Info: '"
                :dataTestLabel="dataTestLabel + '-Gap'"
                :core="crossReferencerStore.referenceInputs.core"
                @update="gappingUpdated"
            />

            <Dimension class="col-12 my-2 text-start"
                :name="'numberTurns'"
                :replaceTitle="'Number of Turns'"
                :unit="null"
                :dataTestLabel="dataTestLabel + '-NumberTurns'"
                :justifyContent="true"
                :min="1"
                :defaultValue="10"
                :allowNegative="false"
                :modelValue="crossReferencerStore.referenceInputs"
                @update="inputsUpdated"
            />

            <Dimension class="col-12 my-2 text-start"
                :name="'temperature'"
                :replaceTitle="'Temperature'"
                :unit="'°C'"
                :dataTestLabel="dataTestLabel + '-Temperature'"
                :justifyContent="true"
                :min="1"
                :max="100"
                :defaultValue="25"
                :allowNegative="true"
                :modelValue="crossReferencerStore.referenceInputs"
                @update="inputsUpdated"
            />

            <button :data-cy="dataTestLabel + '-view-edit-excitation-modal-button'" class="btn btn-primary" data-bs-toggle="offcanvas" :data-bs-target="'#' + offcanvasName" ::aria-controls="offcanvasName + 'OperationPointOffCanvas'">View/Edit excitation</button>
            <button :data-cy="dataTestLabel + '-calculate'" class="btn btn-success" @click="inputsUpdated">Get Alternative Cores</button>

        </div>
    </div>
</template>


<style>
    .offcanvas-size-xxl {
        --bs-offcanvas-width: 65vw !important;
    }
    .offcanvas-size-xl {
        --bs-offcanvas-width: 65vw !important;
        --bs-offcanvas-height: 60vh !important;
    }
    .offcanvas-size-lg {
        --bs-offcanvas-width: 65vw !important;
        --bs-offcanvas-height: 60vh !important;
    }
    .offcanvas-size-md { /* add Responsivenes to default offcanvas */
        --bs-offcanvas-width: 65vw !important;
        --bs-offcanvas-height: 60vh !important;
    }
    .offcanvas-size-sm {
        --bs-offcanvas-width: 65vw !important;
        --bs-offcanvas-height: 60vh !important;
    }
    .offcanvas-size-xs {
        --bs-offcanvas-width: 65vw !important;
        --bs-offcanvas-height: 60vh !important;
    }
    .offcanvas-size-xxs {
        --bs-offcanvas-width: 65vw !important;
        --bs-offcanvas-height: 60vh !important;
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
        background-color: var(--bs-dark) !important;
    }
    .border-dark {
        border-color: var(--bs-dark) !important;
    }
    .input-group-text{
        background-color: var(--bs-light) !important;
        color: var(--bs-white) !important;
        border-color: var(--bs-dark) !important;
    }
    .custom-select,
    .form-control {
        background-color: var(--bs-dark) !important;
        color: var(--bs-white) !important;
        border-color: var(--bs-dark) !important;
    }
    .jumbotron{
        border-radius: 1em;
        box-shadow: 0 5px 10px rgba(0,0,0,.2);
    }
    .card{
        padding: 1.5em .5em .5em;
        background-color: var(--bs-light);
        border-radius: 1em;
        text-align: center;
        box-shadow: 0 5px 10px rgba(0,0,0,.2);
    }
    .form-control:disabled {
        background-color: var(--bs-dark) !important;
        color: var(--bs-white) !important;
        border-color: var(--bs-dark) !important;
    }
    .form-control:-webkit-autofill,
    .form-control:-webkit-autofill:focus,
    .form-control:-webkit-autofill{
        -webkit-text-fill-color: var(--bs-white) !important;
        background-color: transparent !important;
        -webkit-box-shadow: 0 0 0 50px var(--bs-dark) inset;
    }

    .container {
        max-width: 100vw;
        align-items: center;
    }

    .main {
      margin-top: 60px;
    }
    ::-webkit-scrollbar { height: 3px;}
    ::-webkit-scrollbar-button {  background-color: var(--bs-light); }
    ::-webkit-scrollbar-track {  background-color: var(--bs-light);}
    ::-webkit-scrollbar-track-piece { background-color: var(--bs-dark);}
    ::-webkit-scrollbar-thumb {  background-color: var(--bs-light); border-radius: 3px;}
    ::-webkit-scrollbar-corner { background-color: var(--bs-light);}

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
        border-color: var(--bs-primary) !important;
        outline: 0  !important;
        box-shadow: none  !important;
    }

</style>