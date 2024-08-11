<script setup>
import { useMasStore } from '/src/stores/mas'
import ElementFromList from '/src/components/DataInput/ElementFromList.vue'
import Dimension from '/src/components/DataInput/Dimension.vue'
import CoreGappingSelector from '/src/components/Common/CoreGappingSelector.vue'
import Submenu from '/src/components/Toolbox/MagneticBuilder/Submenu.vue'
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
        const coreShapeNames = []; 
        const coreShapeFamilies = []; 
        const coreMaterialNames = []; 
        const coreMaterialManufacturers = [];
        const localData = {};
        if (typeof(masStore.mas.magnetic.core.functionalDescription.shape) == 'string') {
            localData["shape"] = masStore.mas.magnetic.core.functionalDescription.shape;
        }
        else {
            localData["shape"] = masStore.mas.magnetic.core.functionalDescription.shape.name
        }
        if (typeof(masStore.mas.magnetic.core.functionalDescription.material) == 'string') {
            localData["material"] = masStore.mas.magnetic.core.functionalDescription.material;
        }
        else {
            localData["material"] = masStore.mas.magnetic.core.functionalDescription.material.name
        }
        localData["numberStacks"] = masStore.mas.magnetic.core.functionalDescription.numberStacks
        localData["gapping"] = {}
        return {
            masStore,
            localData,
            coreShapeNames,
            coreShapeFamilies,
            coreMaterialNames,
            coreMaterialManufacturers,
        }
    },
    computed: {
        isStackable() {
            var shapeName = this.masStore.mas.magnetic.core.functionalDescription.shape;
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
    watch: { 
    },
    mounted () {
        this.getShapeNames()
        this.getMaterialNames()
    },
    methods: {
        getShapeNames() {
            this.$mkf.ready.then(_ => {
                const coreShapeFamiliesHandle = this.$mkf.get_available_core_shape_families();
                for (var i = coreShapeFamiliesHandle.size() - 1; i >= 0; i--) {
                    this.coreShapeFamilies.push(coreShapeFamiliesHandle.get(i));
                }

                this.coreShapeFamilies = this.coreShapeFamilies.sort();

                var coreShapeNamesHandle;
                if (this.onlyManufacturer != '' && this.onlyManufacturer != null) {
                    coreShapeNamesHandle = this.$mkf.get_available_core_shapes_by_manufacturer(this.onlyManufacturer);
                }
                else {
                    coreShapeNamesHandle = this.$mkf.get_available_core_shapes();
                }

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
                this.coreShapeNames = this.coreShapeNames.sort();
            });
        },
        getMaterialNames() {
            this.$mkf.ready.then(_ => {
                const coreMaterialManufacturersHandle = this.$mkf.get_available_core_manufacturers();
                for (var i = coreMaterialManufacturersHandle.size() - 1; i >= 0; i--) {
                    this.coreMaterialManufacturers.push(coreMaterialManufacturersHandle.get(i));
                }

                this.coreMaterialManufacturers = this.coreMaterialManufacturers.sort();

                this.coreMaterialManufacturers.forEach((manufacturer) => {
                    if (!(this.onlyManufacturer != '' && this.onlyManufacturer != null && manufacturer != this.onlyManufacturer)) {
                        const coreMaterialNamesHandle = this.$mkf.get_available_core_materials(manufacturer);
                        this.coreMaterialNames.push(manufacturer);
                        for (var i = coreMaterialNamesHandle.size() - 1; i >= 0; i--) {
                            this.coreMaterialNames.push(coreMaterialNamesHandle.get(i));
                        }
                    }
                })
                this.coreMaterialNames = this.coreMaterialNames.sort();
            });
        },
        shapeUpdated(value) {
            this.masStore.mas.magnetic.core.functionalDescription.shape = value;

            this.$mkf.ready.then(_ => {
                const aux = this.masStore.mas.magnetic.core;
                aux['geometricalDescription'] = null;
                aux['processedDescription'] = null;
                this.masStore.mas.magnetic.core = JSON.parse(this.$mkf.calculate_core_data(JSON.stringify(aux), false));

            });
            if (!this.isStackable) {
                this.masStore.mas.magnetic.core.functionalDescription.numberStacks = 1;
            }
        },
        materialUpdated(value) {
            const aux = this.masStore.mas.magnetic.core;
            aux.functionalDescription.material = value
            this.masStore.mas.magnetic.core = aux;
        },
        numberStacksUpdated(value) {
            this.masStore.mas.magnetic.core.functionalDescription.numberStacks = value;
        },
        gappingUpdated(value) {
            this.masStore.mas.magnetic.core.functionalDescription.gapping = value;
        },
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <ElementFromList
                class="col-12 mb-1 text-start"
                :dataTestLabel="dataTestLabel + '-ShapeNames'"
                :name="'shape'"
                :titleSameRow="true"
                :justifyContent="true"
                v-model="localData"
                :optionsToDisable="coreShapeFamilies"
                :options="coreShapeNames"
                @update="shapeUpdated"
            />

            <ElementFromList
                class="col-12 mb-1 text-start"
                :dataTestLabel="dataTestLabel + '-MaterialNames'"
                :name="'material'"
                :titleSameRow="true"
                :justifyContent="true"
                v-model="localData"
                :optionsToDisable="coreMaterialManufacturers"
                :options="coreMaterialNames"
                @update="materialUpdated"
            />

            <Dimension class="col-12 mb-1 text-start"
                v-if="isStackable"
                :name="'numberStacks'"
                :replaceTitle="'Number of Stacks'"
                :unit="null"
                :dataTestLabel="dataTestLabel + '-NumberStacks'"
                :min="1"
                :justifyContent="true"
                :defaultValue="1"
                :allowNegative="false"
                :modelValue="localData"
                @update="numberStacksUpdated"
            />

            <CoreGappingSelector class="col-12 mb-1 text-start"
                :title="'Gap Info: '"
                :dataTestLabel="dataTestLabel + '-Gap'"
                :autoupdate="false"
                :core="masStore.mas.magnetic.core"
                @update="gappingUpdated"
            />

            <Submenu class="col-12 mb-1 text-start"
                :dataTestLabel="dataTestLabel + '-Submenu'"
                :name="'core'"
            />


        </div>
    </div>
</template>
