<script setup>
import { useMasStore } from '../../stores/mas'
import { useCrossReferencerStore } from '../../stores/crossReferencer'
import { defaultCore, defaultInputs, coreCrossReferencerPossibleLabels } from '/WebSharedComponents/assets/js/defaults.js'
import { toCamelCase, formatUnit, removeTrailingZeroes, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import Module from '../../assets/js/libCrossReferencers.wasm.js'
import CoreCrossReferencerInputs from './CoreCrossReferencer/CoreCrossReferencerInputs.vue'
import CoreCrossReferencerTable from './CoreCrossReferencer/CoreCrossReferencerTable.vue'
import ScatterChartComparator from '/WebSharedComponents/Common/ScatterChartComparator.vue'
import CoreCrossReferencerOutput from './CoreCrossReferencer/CoreCrossReferencerOutput.vue'
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
        keepMaterialConstant: {
            type: Boolean,
            default: false,
        },
    },
    data() {
        const masStore = useMasStore();
        const crossReferencerStore = useCrossReferencerStore();
        const tryingToSend = false;
        const hideOutputs = true;
        const loading = false;
        const recentChange = false;
        const errorMessage = "";
        const hasError = false;
        var scatterChartComparatorForceUpdate = 0; 
        return {
            masStore,
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
        masCore() {
            const magnetic = {
                coil: {
                    functionalDescription: [{
                        numberTurns: this.crossReferencerStore.coreReferenceInputs.numberTurns
                    }]
                },
                core: this.crossReferencerStore.coreResults.crossReferencedCores[this.crossReferencerStore.selectedCoreIndex],
                manufacturerInfo: {
                    reference: this.crossReferencerStore.coreResults.crossReferencedCores[this.crossReferencerStore.selectedCoreIndex].name
                }
            }

            const mas = {
                inputs: this.masStore.mas.inputs,
                magnetic: magnetic,
            }

            return mas;
        }
    },
    created () {
        this.masStore.$onAction((action) => {
            if (action.name == "updatedInputExcitationProcessed") {
                this.hideOutputs = true;
                this.checkError();
                this.tryToSend();
            }
        })
    },
    mounted () {
        this.hideOutputs = true;
        this.checkError();
        this.tryToSend();
    },
    methods: {
        calculateCrossReferencedCoresValues() {
            crossReferencers.ready.then(_ => {
                const coreAux = deepCopy(this.crossReferencerStore.coreReferenceInputs.core);
                coreAux['geometricalDescription'] = null;
                coreAux['processedDescription'] = null;

                var coreString = this.$mkf.calculate_core_data(JSON.stringify(coreAux), false);
                var core = JSON.parse(coreString);
                core['functionalDescription']['shape'] = core['functionalDescription']['shape']['name'];

                const inputs = this.masStore.mas.inputs;
                inputs.designRequirements.maximumDimensions = this.crossReferencerStore.coreReferenceInputs.maximumDimensions;
                const auxString = crossReferencers.calculate_cross_referenced_core(JSON.stringify(core),
                                                                                        this.crossReferencerStore.coreReferenceInputs.numberTurns,
                                                                                        JSON.stringify(inputs),
                                                                                        this.crossReferencerStore.coreReferenceInputs.numberMaximumResults,
                                                                                        this.onlyManufacturer,
                                                                                        this.crossReferencerStore.coreReferenceInputs.enabledCoreTypes.includes("Toroidal"),
                                                                                        this.crossReferencerStore.coreReferenceInputs.enabledCoreTypes.includes("Two-Piece Set"),
                                                                                        this.crossReferencerStore.coreReferenceInputs.enabledCoreTypes.includes("Only Cores In Stock"),
                                                                                        this.keepMaterialConstant);

                const aux = JSON.parse(auxString);
                const auxCrossReferencedCoresValues = [];
                aux.cores.forEach((elem, index) => {
                    const auxElem = {
                        label: elem.name,
                        coreLosses: aux.data[index].scoredValuePerFilter.CORE_LOSSES,
                        envelopingVolume: aux.data[index].scoredValuePerFilter.ENVELOPING_VOLUME,
                        permeance: aux.data[index].scoredValuePerFilter.PERMEANCE,
                        saturation: aux.data[index].scoredValuePerFilter.SATURATION,
                        effectiveArea: aux.data[index].scoredValuePerFilter.EFFECTIVE_AREA,
                        windingWindowArea: aux.data[index].scoredValuePerFilter.WINDING_WINDOW_AREA,
                    }
                    auxCrossReferencedCoresValues.push(auxElem);
                })
                this.crossReferencerStore.selectedCoreIndex = -1;
                this.crossReferencerStore.coreReferenceInputs.core = core;
                this.crossReferencerStore.coreResults.crossReferencedCores = aux.cores;
                this.crossReferencerStore.coreResults.crossReferencedCoresValues = auxCrossReferencedCoresValues;
                this.crossReferencerStore.coreResults.referenceScoredValues = {
                    coreLosses: aux.referenceScoredValues.CORE_LOSSES,
                    envelopingVolume: aux.referenceScoredValues.ENVELOPING_VOLUME,
                    permeance: aux.referenceScoredValues.PERMEANCE,
                    saturation: aux.referenceScoredValues.SATURATION,
                    effectiveArea: aux.referenceScoredValues.EFFECTIVE_AREA,
                    windingWindowArea: aux.referenceScoredValues.WINDING_WINDOW_AREA,
                };

                this.hideOutputs = false;
                this.loading = false;

                setTimeout(() => {this.scatterChartComparatorForceUpdate += 1}, 5);

            }).catch(error => {
                console.error(error);
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
                        setTimeout(() => {this.loading = true; setTimeout(() => {this.calculateCrossReferencedCoresValues()}, 100);}, 5);
                    }
                }
                , 500);
            }
        },
        checkError() {
            if (!(this.crossReferencerStore.coreReferenceInputs.enabledCoreTypes.includes("Toroidal") ||
                  this.crossReferencerStore.coreReferenceInputs.enabledCoreTypes.includes("Two-Piece Set"))) {
                this.errorMessage = "Either Toroidal or Two-Piece Set cores must be selected";
                this.hasError = true;
            }
            else {
                this.errorMessage = "";
                this.hasError = false;
            }
        },
        inputsUpdated() {
            this.recentChange = true;
            this.hideOutputs = true;
            this.checkError();
            this.tryToSend();
        },
        onPointClick(event) {
            if (event.componentIndex == 1) {
            }
            else {
                this.crossReferencerStore.selectedCoreIndex = event.dataIndex;
            }
        },
        onTableClick(index) {
            this.crossReferencerStore.selectedCoreIndex = index;
        },
        labelsUpdated(event) {
            setTimeout(() => {this.scatterChartComparatorForceUpdate += 1}, 5);
        },
        axisFormatter(value, axisLabel) {
            var unit;
            if (axisLabel == "Core Losses") {
                unit = "W";
            }
            else if (axisLabel == "Enveloping Volume") {
                unit = "m³";
            }
            else if (axisLabel == "Effective Area") {
                unit = "m²";
            }
            else if (axisLabel == "Permeance") {
                unit = "H/tu.";
            }
            else if (axisLabel == "Saturation") {
                unit = "%";
            }
            else if (axisLabel == "Winding Window Area") {
                unit = "m²";
            }

            const aux = formatUnit(axisLabel == "Saturation"? value * 100 : value, unit);

            return `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
        },
        labelFormatter(label) {
            if (label == "Core Losses") {
                return "Core Loss";
            }
            else if (label == "Enveloping Volume") {
                return "Enveloping Volume";
            }
            else if (label == "Permeance") {
                return "AL value (Permeance)";
            }
            else if (label == "Saturation") {
                return "% to Saturation";
            }
            else if (label == "Winding Window Area") {
                return "Winding Window Area";
            }
            else if (label == "Effective Area") {
                return "Effective Area";
            }

            return "";
        },
        async onCoreMaterialCrossReferencer() {
            await this.$router.push('/core_material_cross_referencer' + this.suffix);
        },
        async onCoreShapeCrossReferencer() {
            await this.$router.push('/core_shape_cross_referencer' + this.suffix);
        },
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <h1 v-if="!keepMaterialConstant" class="col-lg-12 text-center text-white">Fair-Rite Core Cross Referencer</h1>
            <h1 v-else class="col-lg-12 text-center text-white">Fair-Rite Core Shape Cross Referencer</h1>
        </div>
        <div class="row">
            <h6 class="col-lg-12 text-center text-white">Powered by OpenMagnetics</h6>
        </div>
        <div class="row">
            <div class="col-lg-3 text-center text-white bg-dark m-0 p-0">
                <label class="rounded-2 fs-5 col-12 mb-1 text-success"> 1<sup>st</sup> Step: What is your Current Core?</label>
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
                {{(keepMaterialConstant)? onlyManufacturer : ''}}
                <CoreCrossReferencerInputs 
                @inputsUpdated="inputsUpdated"
                :hasError="hasError"
                :disabled="loading"
                :onlyManufacturer="(keepMaterialConstant)? onlyManufacturer : ''"
                />
                <label :data-cy="dataTestLabel + '-ErrorMessage'" class="text-danger m-0" style="font-size: 0.9em"> {{errorMessage}}</label>
                <div class="container">
                    <div class="row">
                        <button :disabled="loading" :data-cy="dataTestLabel + '-changeTool'" @click="onCoreMaterialCrossReferencer" class="btn btn-secondary mb-2">I want to cross-reference just the material instead, keeping the shape constant</button>
                    </div>
                </div>
                <div v-if="keepMaterialConstant" class="container">
                    <div class="row">
                        <button :disabled="loading" :data-cy="dataTestLabel + '-changeTool'" @click="onCoreMaterialCrossReferencer" class="btn btn-secondary">I want to cross-reference the full core instead</button>
                    </div>
                </div>
                <div v-if="!keepMaterialConstant" class="container">
                    <div class="row">
                        <button :disabled="loading" :data-cy="dataTestLabel + '-changeTool'" @click="onCoreShapeCrossReferencer" class="btn btn-secondary">I want to cross-reference just the shape instead, keeping the material constant</button>
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
                        :reference="crossReferencerStore.coreResults.referenceScoredValues"
                        :data="crossReferencerStore.coreResults.crossReferencedCoresValues"
                        :forceUpdate="scatterChartComparatorForceUpdate"
                        :xLabel="crossReferencerStore.coreResults.xLabel"
                        :yLabel="crossReferencerStore.coreResults.yLabel"
                        :dataTestLabel="dataTestLabel + '-Offcanvas'"
                        :axisFormatter="axisFormatter"
                        :labelFormatter="labelFormatter"
                        :highlightIndex="crossReferencerStore.selectedCoreIndex"
                        @click="onPointClick"
                     />

                    <ElementFromList
                        class="col-6 my-3 text-start"
                        :dataTestLabel="dataTestLabel + '-XLabelSelector'"
                        :name="'xLabel'"
                        :titleSameRow="true"
                        :justifyContent="false"
                        v-model="crossReferencerStore.coreResults"
                        :options="coreCrossReferencerPossibleLabels"
                        @update="labelsUpdated"
                    />

                    <ElementFromList
                        class="col-6 my-3 text-start"
                        :dataTestLabel="dataTestLabel + '-YLabelSelector'"
                        :name="'yLabel'"
                        :titleSameRow="true"
                        :justifyContent="false"
                        v-model="crossReferencerStore.coreResults"
                        :options="coreCrossReferencerPossibleLabels"
                        @update="labelsUpdated"
                    />

                    <CoreCrossReferencerTable
                        :dataTestLabel="dataTestLabel + '-YLabelSelector'"
                        :data="crossReferencerStore.coreResults.crossReferencedCoresValues"
                        :reference="null"
                        :onlyCoresInStock="crossReferencerStore.coreReferenceInputs.enabledCoreTypes.includes(`Only Cores In Stock`)"
                        @click="onTableClick"
                    />

                </div>
            </div>
            <div v-if="!hideOutputs" class="col-lg-3 text-center text-white" style="height: 45vh">
                <CoreCrossReferencerOutput
                    v-if="crossReferencerStore.selectedCoreIndex != -1"
                    :dataTestLabel="`${dataTestLabel}-CoreCrossReferencerFinalizer`"
                    :mas="masCore"
                    :loadingGif="loadingGif"
                />
                <h2 v-else class="text-center text-white">
                    Select a core to view details, either by clicking on the graph point or in the name in the table
                </h2>
            </div>
            <div v-else class="col-lg-3">
                <img data-cy="CoreAdviser-loading" class="mx-auto d-block col-12" alt="loading" style="width: 50%; height: auto;" :src="loadingGif">
            </div>
        </div>
    </div>
</template>

