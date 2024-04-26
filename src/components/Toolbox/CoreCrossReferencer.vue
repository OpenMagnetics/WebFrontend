<script setup>
import { useMasStore } from '/src/stores/mas'
import { useCrossReferencerStore } from '/src/stores/crossReferencer'
import { defaultCore, defaultInputs } from '/src/assets/js/defaults.js'
import { deepCopy } from '/src/assets/js/utils.js'
import ElementFromList from '/src/components/DataInput/ElementFromList.vue'
import Module from '/src/assets/js/libCrossReferencers.wasm.js'
import CoreCrossReferencerInputs from '/src/components/Toolbox/CoreCrossReferencer/CoreCrossReferencerInputs.vue'
import CoreCrossReferencerTable from '/src/components/Toolbox/CoreCrossReferencer/CoreCrossReferencerTable.vue'
import ScatterChartComparator from '/src/components/Common/ScatterChartComparator.vue'
import Output from '/src/components/Toolbox/CoreCrossReferencer/Output.vue'
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
    data() {
        const masStore = useMasStore();
        const crossReferencerStore = useCrossReferencerStore();
        const tryingToSend = false;
        const loading = false;
        const recentChange = false;
        var scatterChartComparatorForceUpdate = 0; 
        return {
            masStore,
            crossReferencerStore,
            tryingToSend,
            loading,
            recentChange,
            scatterChartComparatorForceUpdate,
        }
    },
    computed: {
        masCore() {
            const magnetic = {
                coil: {
                    functionalDescription: [{
                        numberTurns: this.crossReferencerStore.referenceInputs.numberTurns
                    }]
                },
                core: this.crossReferencerStore.results.crossReferencedCores[this.crossReferencerStore.selectedCoreIndex],
                manufacturerInfo: {
                    reference: this.crossReferencerStore.results.crossReferencedCores[this.crossReferencerStore.selectedCoreIndex].name
                }
            }

            const mas = {
                inputs: this.masStore.mas.inputs,
                magnetic: magnetic,
            }

            return mas;
        }
    },
    watch: { 
    },
    created () {
        this.masStore.$onAction((action) => {
            if (action.name == "updatedInputExcitationProcessed") {
                this.tryToSend();
            }
        })
    },
    mounted () {
        if (this.crossReferencerStore.results.crossReferencedCores.length == 0) {
            this.tryToSend();
        }
    },
    methods: {
        calculateCrossReferencedCoresValues() {
            crossReferencers.ready.then(_ => {
                console.time('Execution Time');

                const coreAux = deepCopy(this.crossReferencerStore.referenceInputs.core);
                coreAux['geometricalDescription'] = null;
                coreAux['processedDescription'] = null;

                var core = JSON.parse(this.$mkf.calculate_core_data(JSON.stringify(coreAux), false));
                core['functionalDescription']['shape'] = core['functionalDescription']['shape']['name'];

                const inputs = this.masStore.mas.inputs;
                const aux = JSON.parse(crossReferencers.calculate_cross_referenced_core(JSON.stringify(core),
                                                                                        this.crossReferencerStore.referenceInputs.numberTurns,
                                                                                        JSON.stringify(inputs),
                                                                                        20));

                const auxCrossReferencedCoresValues = [];
                aux.cores.forEach((elem, index) => {
                    const auxElem = {
                        label: elem.name,
                        coreLosses: aux.data[index].scoredValuePerFilter.CORE_LOSSES,
                        dimensions: aux.data[index].scoredValuePerFilter.DIMENSIONS,
                        permeance: aux.data[index].scoredValuePerFilter.PERMEANCE,
                        saturation: aux.data[index].scoredValuePerFilter.SATURATION,
                        windingWindowArea: aux.data[index].scoredValuePerFilter.WINDING_WINDOW_AREA,
                    }
                    auxCrossReferencedCoresValues.push(auxElem);
                })
                this.crossReferencerStore.selectedCoreIndex = -1;
                this.crossReferencerStore.referenceInputs.core = core;
                this.crossReferencerStore.results.crossReferencedCores = aux.cores;
                this.crossReferencerStore.results.crossReferencedCoresValues = auxCrossReferencedCoresValues;
                this.crossReferencerStore.results.referenceScoredValues = {
                    coreLosses: aux.referenceScoredValues.CORE_LOSSES,
                    dimensions: aux.referenceScoredValues.DIMENSIONS,
                    permeance: aux.referenceScoredValues.PERMEANCE,
                    saturation: aux.referenceScoredValues.SATURATION,
                    windingWindowArea: aux.referenceScoredValues.WINDING_WINDOW_AREA,
                };

                this.loading = false;

                setTimeout(() => {this.scatterChartComparatorForceUpdate += 1}, 5);

            });
        },
        tryToSend() {
            if (!this.tryingToSend && !this.loading) {
                this.recentChange = false
                this.tryingToSend = true                
                setTimeout(() => {
                    if (this.recentChange) {
                        this.tryingToSend = false
                        this.tryToSend()
                    }
                    else {
                        this.tryingToSend = false
                        this.loading = true;
                        setTimeout(() => {this.calculateCrossReferencedCoresValues()}, 5);
                    }
                }
                , 500);
            }
        },
        inputsUpdated() {
            this.recentChange = true;
            this.tryToSend();
        },
        onPointClick(event) {
            if (event.componentIndex == 1) {
                console.log("Click on reference");
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
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <h1 class="col-lg-12 text-center text-white">
                Core Cross Referencer
            </h1>
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
            <div class="col-lg-3 text-center text-white border bg-dark p-3">
                <CoreCrossReferencerInputs 
                @inputsUpdated="inputsUpdated"
                />

            </div>
            <div class="col-lg-6 text-center text-white">
                <div class="row" v-if="loading" >
                    <img data-cy="CoreAdviser-loading" class="mx-auto d-block col-12" alt="loading" style="width: 50%; height: auto;" src="/images/loading.gif">
                </div>
                <div class="row " v-else >
                    <ScatterChartComparator
                        class="col-12"
                        :reference="crossReferencerStore.results.referenceScoredValues"
                        :data="crossReferencerStore.results.crossReferencedCoresValues"
                        :forceUpdate="scatterChartComparatorForceUpdate"
                        :xLabel="crossReferencerStore.results.xLabel"
                        :yLabel="crossReferencerStore.results.yLabel"
                        :dataTestLabel="dataTestLabel + '-Offcanvas'"
                        @click="onPointClick"
                     />

                    <ElementFromList
                        class="col-6 my-3 text-start"
                        :dataTestLabel="dataTestLabel + '-XLabelSelector'"
                        :name="'xLabel'"
                        :titleSameRow="true"
                        :justifyContent="false"
                        v-model="crossReferencerStore.results"
                        :options="crossReferencerStore.possibleLabels"
                        @update="labelsUpdated"
                    />

                    <ElementFromList
                        class="col-6 my-3 text-start"
                        :dataTestLabel="dataTestLabel + '-YLabelSelector'"
                        :name="'yLabel'"
                        :titleSameRow="true"
                        :justifyContent="false"
                        v-model="crossReferencerStore.results"
                        :options="crossReferencerStore.possibleLabels"
                        @update="labelsUpdated"
                    />

                    <CoreCrossReferencerTable
                        :dataTestLabel="dataTestLabel + '-YLabelSelector'"
                        :data="crossReferencerStore.results.crossReferencedCoresValues"
                        :reference="null"
                        @click="onTableClick"
                    />

                </div>
            </div>
            <div class="col-lg-3 text-center text-white" 
                     style="height: 45vh">
                <Output
                    v-if="crossReferencerStore.selectedCoreIndex != -1"
                    :dataTestLabel="`${dataTestLabel}-CoreCrossReferencerFinalizer`"
                    :mas="masCore"
                />
                <h2 v-else class="text-center text-white">
                    Select a core to view details, either by clicking on the graph point or in the name in the table
                </h2>
            </div>
        </div>
    </div>
</template>

