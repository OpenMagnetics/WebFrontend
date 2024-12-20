<script setup>
import { useCrossReferencerStore } from '/src/stores/crossReferencer'
import { defaultCore, defaultInputs, coreMaterialCrossReferencerPossibleLabels } from '/WebSharedComponents/assets/js/defaults.js'
import { deepCopy,  formatUnit, removeTrailingZeroes } from '/WebSharedComponents/assets/js/utils.js'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import Module from '/src/assets/js/libCrossReferencers.wasm.js'
import CoreMaterialCrossReferencerInputs from '/src/components/Toolbox/CoreMaterialCrossReferencer/CoreMaterialCrossReferencerInputs.vue'
import CoreMaterialCrossReferencerTable from '/src/components/Toolbox/CoreMaterialCrossReferencer/CoreMaterialCrossReferencerTable.vue'
import ScatterChartComparator from '/WebSharedComponents/Common/ScatterChartComparator.vue'
import CoreMaterialCrossReferencerOutput from '/src/components/Toolbox/CoreMaterialCrossReferencer/CoreMaterialCrossReferencerOutput.vue'
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
            default: "",
        },
        loadingGif: {
            type: String,
            default: "/images/loading.gif",
        },
        suffix: {
            type: String,
            default: "",
        },
    },
    data() {
        const crossReferencerStore = useCrossReferencerStore();
        const tryingToSend = false;
        const hideOutputs = true;
        const loading = false;
        const recentChange = false;
        const errorMessage = "";
        const hasError = false;
        var scatterChartComparatorForceUpdate = 0; 
        return {
            crossReferencerStore,
            tryingToSend,
            hideOutputs,
            loading,
            recentChange,
            scatterChartComparatorForceUpdate,
            errorMessage,
            hasError,
        }
    },
    computed: {
    },
    watch: { 
    },
    created () {
    },
    mounted () {
        this.hideOutputs = true;
        this.checkError();
        this.tryToSend();
    },
    methods: {
        calculateCrossReferencedCoreMaterialsValues() {
            crossReferencers.ready.then(_ => {
                const aux = JSON.parse(crossReferencers.calculate_cross_referenced_core_material(this.crossReferencerStore.coreMaterialReferenceInputs.material,
                                                                                                 this.crossReferencerStore.coreMaterialReferenceInputs.temperature,
                                                                                                 this.crossReferencerStore.coreMaterialReferenceInputs.numberMaximumResults,
                                                                                                 this.onlyManufacturer,
                                                                                                 this.crossReferencerStore.coreMaterialReferenceInputs.enabledCoreTypes.includes("Only Cores In Stock")));

                console.log(aux)
                const auxCrossReferencedCoreMaterialsValues = [];
                aux.coreMaterials.forEach((elem, index) => {
                    const auxElem = {
                        label: elem.name,
                        initialPermeability: aux.data[index].scoredValuePerFilter.INITIAL_PERMEABILITY,
                        remanence: aux.data[index].scoredValuePerFilter.REMANENCE,
                        coerciveForce: aux.data[index].scoredValuePerFilter.COERCIVE_FORCE,
                        saturation: aux.data[index].scoredValuePerFilter.SATURATION,
                        curieTemperature: aux.data[index].scoredValuePerFilter.CURIE_TEMPERATURE,
                        volumetricLosses: aux.data[index].scoredValuePerFilter.VOLUMETRIC_LOSSES,
                        resistivity: aux.data[index].scoredValuePerFilter.RESISTIVITY,
                    }
                    auxCrossReferencedCoreMaterialsValues.push(auxElem);
                })
                this.crossReferencerStore.selectedCoreMaterialIndex = -1;
                this.crossReferencerStore.coreMaterialResults.crossReferencedCoreMaterials = aux.coreMaterials;
                this.crossReferencerStore.coreMaterialResults.crossReferencedCoreMaterialsValues = auxCrossReferencedCoreMaterialsValues;
                this.crossReferencerStore.coreMaterialResults.referenceScoredValues = {
                    initialPermeability: aux.referenceScoredValues.INITIAL_PERMEABILITY,
                    remanence: aux.referenceScoredValues.REMANENCE,
                    coerciveForce: aux.referenceScoredValues.COERCIVE_FORCE,
                    saturation: aux.referenceScoredValues.SATURATION,
                    curieTemperature: aux.referenceScoredValues.CURIE_TEMPERATURE,
                    volumetricLosses: aux.referenceScoredValues.VOLUMETRIC_LOSSES,
                    resistivity: aux.referenceScoredValues.RESISTIVITY,
                };

                this.hideOutputs = false;
                this.loading = false;

                setTimeout(() => {this.scatterChartComparatorForceUpdate += 1}, 5);

            }).catch(error => {
                console.log(error);
                this.hideOutputs = false;
                this.loading = false;
            });
        },
        tryToSend() {
            if (!this.tryingToSend && !this.loading && !this.hasError) {
                this.recentChange = false
                this.tryingToSend = true                
                setTimeout(() => {
                    if (this.recentChange) {
                        this.tryingToSend = false
                        this.tryToSend()
                    }
                    else {
                        this.tryingToSend = false
                        setTimeout(() => {this.loading = true; setTimeout(() => {this.calculateCrossReferencedCoreMaterialsValues()}, 100);}, 5);
                    }
                }
                , 500);
            }
        },
        checkError() {
            this.errorMessage = "";
            this.hasError = false;
        },
        inputsUpdated() {
            this.recentChange = true;
            this.hideOutputs = true;
            this.checkError();
            this.tryToSend();
        },
        onPointClick(event) {
            if (event.componentIndex == 1) {
                console.log("Click on reference");
            }
            else {
                this.crossReferencerStore.selectedCoreMaterialIndex = event.dataIndex;
            }
        },
        onTableClick(index) {
            this.crossReferencerStore.selectedCoreMaterialIndex = index;
        },
        labelsUpdated(event) {
            setTimeout(() => {this.scatterChartComparatorForceUpdate += 1}, 5);
        },
        axisFormatter(value, axisLabel) {
            var unit;
            if (axisLabel == "Initial Permeability") {
                unit = "";
            }
            else if (axisLabel == "Remanence") {
                unit = "T";
            }
            else if (axisLabel == "Coercive Force") {
                unit = "A/m";
            }
            else if (axisLabel == "Saturation") {
                unit = "T";
            }
            else if (axisLabel == "Curie Temperature") {
                unit = "°C";
            }
            else if (axisLabel == "Volumetric Losses") {
                unit = "W/m³";
            }
            else if (axisLabel == "Resistivity") {
                unit = "Ωm";
            }

            const aux = formatUnit(value, unit);

            return `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
        },
        labelFormatter(label) {
            if (label == "Initial Permeability") {
                return "Initial Permeability";
            }
            else if (label == "Remanence") {
                return "Remanence";
            }
            else if (label == "Coercive Force") {
                return "Coercive Force";
            }
            else if (label == "Saturation") {
                return "Saturation Magnetic Flux Density";
            }
            else if (label == "Curie Temperature") {
                return "Curie Temperature";
            }
            else if (label == "Volumetric Losses") {
                return "Volumetric Losses";
            }
            else if (label == "Resistivity") {
                return "Resistivity";
            }

            return "";
        },
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <h1 class="col-lg-12 text-center text-white">
                Core Material Cross Referencer
            </h1>
        </div>
        <div class="row">
            <div class="col-lg-3 text-center text-white bg-dark m-0 p-0">
                <label class="rounded-2 fs-5 col-12 mb-1 text-success"> 1<sup>st</sup> Step: What is your Current Core Material?</label>
            </div>
            <div class="col-lg-6 text-center text-white m-0 p-0">
                <label class="rounded-2 fs-5 col-12 mb-1 text-success"> 2<sup>nd</sup> Step: Select an Alternative</label>
            </div>
            <div class="col-lg-3 text-center text-white m-0 p-0">
                <label class="rounded-2 fs-5 col-12 mb-1 text-success"> 3<sup>rd</sup> Step: Analyze your Alternative</label>
            </div>
        </div>
        <div class="row">
            <div class="col-lg-3 text-center text-white bg-dark p-3">
                <CoreMaterialCrossReferencerInputs 
                @inputsUpdated="inputsUpdated"
                :hasError="hasError"
                :disabled="loading"
                />
                <label :data-cy="dataTestLabel + '-ErrorMessage'" class="text-danger m-0" style="font-size: 0.9em"> {{errorMessage}}</label>
                <div class="container">
                    <div class="row">
                        <a :disabled="loading" :data-cy="dataTestLabel + '-changeTool'" :href="'/core_cross_referencer' + (suffix == ''? '' : suffix)" class="btn btn-secondary mb-2">I want to cross-reference the full core instead</a>
                    </div>
                </div>
                <div class="container">
                    <div class="row">
                        <a :disabled="loading" :data-cy="dataTestLabel + '-changeTool'" :href="'/core_shape_cross_referencer' + (suffix == ''? '' : suffix)" class="btn btn-secondary">I want to cross-reference just the shape instead, keeping the material constant</a>
                    </div>
                </div>

            </div>
            <div class="col-lg-6 text-center text-white">
                <div class="row" v-if="hideOutputs" >
                    <img data-cy="CoreAdviser-loading" class="mx-auto d-block col-12" alt="loading" style="width: 50%; height: auto;" :src="loadingGif">
                </div>
                <div class="row " v-else >
                    <ScatterChartComparator
                        class="col-12"
                        :reference="crossReferencerStore.coreMaterialResults.referenceScoredValues"
                        :data="crossReferencerStore.coreMaterialResults.crossReferencedCoreMaterialsValues"
                        :forceUpdate="scatterChartComparatorForceUpdate"
                        :xLabel="crossReferencerStore.coreMaterialResults.xLabel"
                        :yLabel="crossReferencerStore.coreMaterialResults.yLabel"
                        :dataTestLabel="dataTestLabel + '-Offcanvas'"
                        :axisFormatter="axisFormatter"
                        :labelFormatter="labelFormatter"
                        :highlightIndex="crossReferencerStore.selectedCoreMaterialIndex"
                        @click="onPointClick"
                     />

                    <ElementFromList
                        class="col-6 my-3 text-start"
                        :dataTestLabel="dataTestLabel + '-XLabelSelector'"
                        :name="'xLabel'"
                        :titleSameRow="true"
                        :justifyContent="false"
                        v-model="crossReferencerStore.coreMaterialResults"
                        :options="coreMaterialCrossReferencerPossibleLabels"
                        @update="labelsUpdated"
                    />

                    <ElementFromList
                        class="col-6 my-3 text-start"
                        :dataTestLabel="dataTestLabel + '-YLabelSelector'"
                        :name="'yLabel'"
                        :titleSameRow="true"
                        :justifyContent="false"
                        v-model="crossReferencerStore.coreMaterialResults"
                        :options="coreMaterialCrossReferencerPossibleLabels"
                        @update="labelsUpdated"
                    />

                    <CoreMaterialCrossReferencerTable
                        :dataTestLabel="dataTestLabel + '-YLabelSelector'"
                        :data="crossReferencerStore.coreMaterialResults.crossReferencedCoreMaterialsValues"
                        :reference="null"
                        :onlyCoresInStock="crossReferencerStore.coreMaterialReferenceInputs.enabledCoreTypes.includes(`Only Cores In Stock`)"
                        @click="onTableClick"
                    />

                </div>
            </div>
            <div v-if="!hideOutputs" class="col-lg-3 text-center text-white" style="height: 45vh">
                <CoreMaterialCrossReferencerOutput
                    v-if="crossReferencerStore.selectedCoreMaterialIndex != -1"
                    :dataTestLabel="`${dataTestLabel}-CoreMaterialCrossReferencerFinalizer`"
                    :coreMaterial="crossReferencerStore.coreMaterialResults.crossReferencedCoreMaterials[crossReferencerStore.selectedCoreMaterialIndex]"
                    :temperature="crossReferencerStore.coreMaterialReferenceInputs.temperature"
                    :loadingGif="loadingGif"
                />
                <h2 v-else class="text-center text-white">
                    Select a core material to view details, either by clicking on the graph point or in the name in the table
                </h2>
            </div>
            <div v-else class="col-lg-3">
                <img data-cy="CoreAdviser-loading" class="mx-auto d-block col-12" alt="loading" style="width: 50%; height: auto;" :src="loadingGif">
            </div>
        </div>
    </div>
</template>

