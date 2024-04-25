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
                class="col-12 my-3 text-start"
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
                class="col-12 my-3 text-start"
                :dataTestLabel="dataTestLabel + '-MaterialNames'"
                :name="'material'"
                :titleSameRow="true"
                :justifyContent="true"
                v-model="crossReferencerStore.referenceInputs.core.functionalDescription"
                :optionsToDisable="coreMaterialManufacturers"
                :options="coreMaterialNames"
                @update="inputsUpdated"
            />

            <Dimension class="col-12 my-3 text-start"
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

            <CoreGappingSelector class="col-12 my-3 text-start"
                :title="'Gap Info: '"
                :dataTestLabel="dataTestLabel + '-Gap'"
                :core="crossReferencerStore.referenceInputs.core"
                @update="gappingUpdated"
            />

            <Dimension class="col-12 my-3 text-start"
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

            <Dimension class="col-12 my-3 text-start"
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
</style>
