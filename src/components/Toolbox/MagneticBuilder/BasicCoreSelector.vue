<script setup>
import { useMasStore } from '/src/stores/mas'
import ElementFromList from '/src/components/DataInput/ElementFromList.vue'
import Dimension from '/src/components/DataInput/Dimension.vue'
import CoreGappingSelector from '/src/components/Common/CoreGappingSelector.vue'
import BasicCoreSubmenu from '/src/components/Toolbox/MagneticBuilder/BasicCoreSubmenu.vue'
import Module from '/src/assets/js/libAdvisers.wasm.js'
import { coreAdviserWeights } from '/src/assets/js/defaults.js'
import BasicCoreInfo from '/src/components/Toolbox/MagneticBuilder/BasicCoreInfo.vue'

</script>

<script>
var advisers = {
    ready: new Promise(resolve => {
        Module({
            onRuntimeInitialized () {
                advisers = Object.assign(this, {
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
        loadingGif: {
            type: String,
            default: "/images/loading.gif",
        },
    },
    data() {
        const masStore = useMasStore();
        const coreShapeNames = []; 
        const coreShapeFamilies = []; 
        const coreMaterialNames = []; 
        const coreMaterialManufacturers = [];
        const localData = {};

        if (masStore.coreAdviserWeights == null) {
            masStore.coreAdviserWeights = coreAdviserWeights;
        }

        const errorMessage = "";
        const loading = false;

        return {
            masStore,
            localData,
            coreShapeNames,
            coreShapeFamilies,
            coreMaterialNames,
            coreMaterialManufacturers,
            errorMessage,
            loading,
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
        this.assignLocalData(this.masStore.mas.magnetic.core);
    },
    methods: {
        assignLocalData(core) {
            if (typeof(core.functionalDescription.shape) == 'string') {
                this.localData["shape"] = core.functionalDescription.shape;
            }
            else {
                this.localData["shape"] = core.functionalDescription.shape.name
            }
            if (typeof(core.functionalDescription.material) == 'string') {
                this.localData["material"] = core.functionalDescription.material;
            }
            else {
                this.localData["material"] = core.functionalDescription.material.name
            }
            this.localData["numberStacks"] = core.functionalDescription.numberStacks
            this.localData["gapping"] = core.functionalDescription.gapping
        },
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
            this.masStore.mas.magnetic.core.name = "Custom";
            this.masStore.mas.magnetic.core.manufacturerInfo = null;
            this.masStore.mas.magnetic.core.processedDescription = null;
            this.masStore.mas.magnetic.core.geometricalDescription = null;

            this.$mkf.ready.then(_ => {
                const aux = this.masStore.mas.magnetic.core;
                aux['geometricalDescription'] = null;
                aux['processedDescription'] = null;
                this.masStore.mas.magnetic.core = JSON.parse(this.$mkf.calculate_core_data(JSON.stringify(aux), false));
                this.masStore.mas.magnetic.coil.bobbin = "Dummy";
                this.masStore.mas.magnetic.coil.turnsDescription = null;
                this.masStore.mas.magnetic.coil.layersDescription = null;
                this.masStore.mas.magnetic.coil.sectionsDescription = null;
                console.warn(this.masStore.mas.magnetic.coil.bobbin)
                console.warn(this.masStore.mas.magnetic.core)
                const bobbinResult = this.$mkf.calculate_bobbin_data(JSON.stringify(this.masStore.mas.magnetic));
                if (bobbinResult.startsWith("Exception")) {
                    console.error(bobbinResult);
                }
                else {
                    this.masStore.mas.magnetic.coil.bobbin = JSON.parse(bobbinResult);
                }
                console.warn(this.masStore.mas.magnetic.coil.bobbin)


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
        adviseCoreRequested() {
            this.loading = true;
            setTimeout(() => this.adviseCore(), 100);
        },
        adviseCore() {
            advisers.ready.then(_ => {
                if (this.masStore.mas.inputs.operatingPoints.length > 0) {
                    const settings = JSON.parse(advisers.get_settings());
                    settings["coreIncludeDistributedGaps"] = this.$settingsStore.adviserAllowDistributedGaps == "1";
                    settings["coreIncludeMargin"] = true;
                    settings["coreIncludeStacks"] = this.$settingsStore.adviserAllowStacks == "1";
                    settings["useToroidalCores"] = this.$settingsStore.adviserToroidalCores == "1";
                    advisers.set_settings(JSON.stringify(settings));

                    const result = advisers.calculate_advised_cores(JSON.stringify(this.masStore.mas.inputs), JSON.stringify(this.masStore.coreAdviserWeights), 1, false);
                    if (result.startsWith("Exception")) {
                        console.error(result);
                        return;
                    }

                    const aux = JSON.parse(result);

                    var log = aux["log"];
                    var data = aux["data"];
                    if (data.length > 0) {
                        this.masStore.mas.magnetic.core = data[0].mas.magnetic.core;

                        this.$mkf.ready.then(_ => {

                            this.masStore.mas.magnetic.coil.bobbin = "Dummy";
                            this.masStore.mas.magnetic.coil.turnsDescription = null;
                            this.masStore.mas.magnetic.coil.layersDescription = null;
                            this.masStore.mas.magnetic.coil.sectionsDescription = null;
                            const bobbinResult = this.$mkf.calculate_bobbin_data(JSON.stringify(this.masStore.mas.magnetic));
                            if (bobbinResult.startsWith("Exception")) {
                                console.error(bobbinResult);
                            }
                            else {
                                this.masStore.mas.magnetic.coil.bobbin = JSON.parse(bobbinResult);
                            }

                            const numberTurns = [];
                            const numberTurnsHandle = this.$mkf.calculate_number_turns(data[0].mas.magnetic.coil.functionalDescription[0].numberTurns, JSON.stringify(this.masStore.mas.inputs.designRequirements));

                            const windings = this.masStore.mas.magnetic.coil.functionalDescription;
                            console.log(numberTurnsHandle)
                            for (var i = 0; i < numberTurnsHandle.size(); i++) {
                                windings[i].numberTurns = numberTurnsHandle.get(i);
                            }
                            this.masStore.mas.magnetic.coil.functionalDescription = windings;
                        });

                        this.errorMessage = "";
                    }
                    else{
                        this.errorMessage = "No core can be advised. You are on your own."
                    }
                    this.assignLocalData(this.masStore.mas.magnetic.core);
                    this.loading = false;
                }
                else {
                    console.error("No operating points found")
                    this.loading = false;
                }
            });
        },
        customizeCore() {
            console.log("customizeCore");
        },
        loadCore() {
            console.log("loadCore");
        },
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <img :data-cy="dataTestLabel + '-BasicCoreSelector-loading'" v-if="loading" class="mx-auto d-block col-12" alt="loading" style="width: 60%; height: auto;" :src="loadingGif">
            <ElementFromList
                v-if="!loading"
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
                v-if="localData.shape != '' && !loading"
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
            <h5 v-else v-if="!loading" class="text-danger my-2">Select a shape for the core</h5>


            <Dimension class="col-12 mb-1 text-start"
                v-if="isStackable && localData.shape != '' && !loading"
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
                v-if="localData.shape != '' && !loading"
                :title="'Gap Info: '"
                :dataTestLabel="dataTestLabel + '-Gap'"
                :autoupdate="false"
                :core="masStore.mas.magnetic.core"
                @update="gappingUpdated"
            />

            <div class="col-12">
                <BasicCoreInfo 
                    v-if="!loading"
                    :dataTestLabel="dataTestLabel + '-BasicCoreInfo'"
                    :core="masStore.mas.magnetic.core"
                />
            </div>

            <BasicCoreSubmenu class="col-12 mb-1 text-start"
                :dataTestLabel="dataTestLabel + '-BasicCoreSubmenu'"
                :enableAdvise="!loading"
                :enableCustomize="false"
                @adviseCore="adviseCoreRequested"
                @customizeCore="customizeCore"
                @loadCore="loadCore"
            />
            <label class="text-danger col-12 pt-1" style="font-size: 0.7em">{{errorMessage}}</label>


        </div>
    </div>
</template>
