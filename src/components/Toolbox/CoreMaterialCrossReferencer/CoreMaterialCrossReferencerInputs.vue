<script setup>
import { useCrossReferencerStore } from '../../../stores/crossReferencer'
import { defaultCore, defaultInputs, coreMaterialCrossReferencerPossibleCoreTypes } from '/WebSharedComponents/assets/js/defaults.js'
import { deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import SeveralElementsFromList from '/WebSharedComponents/DataInput/SeveralElementsFromList.vue'
import Module from '../../../assets/js/libCrossReferencers.wasm.js'

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
        const coreMaterialNames = []; 
        const coreMaterialManufacturers = [];
        return {
            crossReferencerStore,
            coreMaterialNames,
            coreMaterialManufacturers,
        }
    },
    computed: {
    },
    watch: { 
    },
    created () {
    },
    mounted () {
        this.getMaterialNames();
    },
    methods: {
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
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <ElementFromList
                class="col-12 my-2 text-start"
                :dataTestLabel="dataTestLabel + '-MaterialNames'"
                :name="'material'"
                :titleSameRow="true"
                :justifyContent="true"
                :disabled="disabled"
                v-model="crossReferencerStore.coreMaterialReferenceInputs"
                :optionsToDisable="coreMaterialManufacturers"
                :options="coreMaterialNames"
                @update="inputsUpdated"
            />

            <Dimension class="col-12 my-2 text-start"
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
                :modelValue="crossReferencerStore.coreMaterialReferenceInputs"
                @update="inputsUpdated"
            />

            <SeveralElementsFromList
                class="col-12 my-2 text-start"
                :classInput="'col-12'"
                :name="'enabledCoreTypes'"
                :disabled="disabled"
                :justifyContent="true"
                v-model="crossReferencerStore.coreMaterialReferenceInputs"
                :options="coreMaterialCrossReferencerPossibleCoreTypes"
                @update="inputsUpdated"
            />

            <Dimension class="col-12 my-2 text-start"
                :name="'numberMaximumResults'"
                :replaceTitle="'Number of Maximum Results'"
                :unit="null"
                :dataTestLabel="dataTestLabel + '-NumberMaximumResults'"
                :disabled="disabled"
                :justifyContent="true"
                :min="1"
                :defaultValue="10"
                :allowNegative="false"
                :modelValue="crossReferencerStore.coreMaterialReferenceInputs"
                @update="inputsUpdated"
            />

            <button :disabled="disabled" v-if="!hasError" :data-cy="dataTestLabel + '-calculate'" class="btn btn-success" @click="inputsUpdated">Get Alternative Cores</button>

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