<script setup>
import { useMasStore } from '/src/stores/mas'
import ElementFromList from '/src/components/DataInput/ElementFromList.vue'
import Dimension from '/src/components/DataInput/Dimension.vue'
import BasicWireSubmenu from '/src/components/Toolbox/MagneticBuilder/BasicWireSubmenu.vue'
import BasicWireInfo from '/src/components/Toolbox/MagneticBuilder/BasicWireInfo.vue'
import BasicCoilSectionSelector from '/src/components/Toolbox/MagneticBuilder/BasicCoilSectionSelector.vue'
import Module from '/src/assets/js/libAdvisers.wasm.js'
import { useDataCacheStore } from '/src/stores/dataCache'
import { toTitleCase, checkAndFixMas, deepCopy, range } from '/src/assets/js/utils.js'
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
        const loading = false;
        const blockingRebounds = false;
        const recentChange = false;
        const tryingToSend = false;
        const forceUpdate = 0; 
        const sectionsOrientations = {};
        const CoilAlignments = {};
        const pattern = [];
        const proportionPerWinding = [];
        masStore.mas.magnetic.coil.functionalDescription.forEach((item, index) => {
            pattern.push(index);
            proportionPerWinding.push(1.0 / masStore.mas.magnetic.coil.functionalDescription.length);
        })
        const selectedSectionIndex = 0;

        var localData = {
            sectionsOrientation: "overlapping",
            sectionsAlignment: "inner or top",
            dataPerSection: [{
                layersOrientation: "overlapping",
                turnsAlignment: "spread",
            }],
            pattern: pattern,
            repetitions: 1,
            proportionPerWinding: proportionPerWinding,
        };

        return {
            blockingRebounds,
            masStore,
            localData,
            sectionsOrientations,
            CoilAlignments,
            forceUpdate,
            loading,
            recentChange,
            tryingToSend,
            selectedSectionIndex,
        }
    },
    computed: {
        conductiveSections() {
            const sections = [];

            if (this.masStore.mas.magnetic.coil.sectionsDescription != null) {
                this.masStore.mas.magnetic.coil.sectionsDescription.forEach((section) => {
                    if (section.type == "conduction") {
                        sections.push(section);
                    }
                })
            }
            return sections;
        },
        numberSections() {
            if (this.masStore.mas.magnetic.coil.sectionsDescription != null) {
                return this.conductiveSections.length;
            }
            else {
                return this.masStore.mas.magnetic.coil.functionalDescription.length;
            }
        },
    },
    watch: {
        'masStore.mas.magnetic.core': {
            handler(newValue, oldValue) {
                if (!this.blockingRebounds && this.masStore.mas.magnetic.coil.turnsDescription == null) {
                    this.recentChange = true;
                    this.blockingRebounds = true;
                    setTimeout(() => {this.tryToWind();}, 10);
                    setTimeout(() => this.blockingRebounds = false, 10);
                }
            },
            deep: true
        },
        'masStore.mas.magnetic.coil.functionalDescription': {
            handler(newValue, oldValue) {
                if (!this.blockingRebounds && this.masStore.mas.magnetic.coil.turnsDescription == null) {
                    this.recentChange = true;
                    this.blockingRebounds = true;
                    setTimeout(() => {this.tryToWind();}, 10);
                    setTimeout(() => this.blockingRebounds = false, 10);
                }
            },
            deep: true
        },
    },
    mounted () {
        this.tryToWind();
        this.getSectionOrientations();
        this.getCoilAlignments();
        this.assignLocalData(this.masStore.mas.magnetic);

        this.masStore.mas.magnetic.coil.functionalDescription.forEach((datum, sectionIndex) => {
            if (sectionIndex >= this.localData.dataPerSection.length) {
                this.localData.dataPerSection.push({
                    layersOrientation: this.localData.dataPerSection[sectionIndex - 1].layersOrientation,
                    turnsAlignment: this.localData.dataPerSection[sectionIndex - 1].turnsAlignment,
                });
            }
        })

    },
    methods: {
        wind() {
            this.$mkf.ready.then(_ => {
                this.assignCoilData();

                const inputCoil = deepCopy(this.masStore.mas.magnetic.coil);

                if (this.conductiveSections.length > 0) {
                    inputCoil["_turnsAlignment"] = {};
                    inputCoil["_layersOrientation"] = {};
                    this.localData.dataPerSection.forEach((datum, sectionIndex) => {
                        if (sectionIndex in this.conductiveSections) {
                            const sectionName = this.conductiveSections[sectionIndex].name
                            inputCoil["_turnsAlignment"][sectionName] = datum.turnsAlignment;
                            inputCoil["_layersOrientation"][sectionName] = datum.layersOrientation;
                        }
                    })
                }
                else {
                    inputCoil["_turnsAlignment"] = [];
                    inputCoil["_layersOrientation"] = [];
                    this.localData.dataPerSection.forEach((datum, sectionIndex) => {
                        inputCoil["_turnsAlignment"].push(datum.turnsAlignment);
                        inputCoil["_layersOrientation"].push(datum.layersOrientation);
                    })
                }


                    console.log(inputCoil);
                const coilJson = this.$mkf.wind(JSON.stringify(inputCoil), this.localData.repetitions, JSON.stringify(this.localData.proportionPerWinding), JSON.stringify(this.localData.pattern));

                if (coilJson.startsWith("Exception")) {
                    console.error(coilJson);
                    return;
                }
                this.masStore.mas.magnetic.coil = JSON.parse(coilJson);

                this.tryingToSend = false;

            });
        },
        tryToWind() {
            if (!this.tryingToSend) {
                this.recentChange = false
                this.tryingToSend = true
                setTimeout(() => {
                    if (this.recentChange) {
                        this.tryingToSend = false
                        this.tryToWind()
                    }
                    else {
                        this.wind();
                    }
                }
                , 100);
            }
        },
        assignLocalData(magnetic) {
            if (magnetic.coil.bobbin != "" && magnetic.coil.bobbin != "Dummy") {
                if (magnetic.coil.bobbin.processedDescription != null) {
                    if (magnetic.coil.bobbin.processedDescription.windingWindows != null) {
                        if (magnetic.coil.bobbin.processedDescription.windingWindows[0].sectionsAlignment != null) {
                            this.localData.sectionsAlignment = magnetic.coil.bobbin.processedDescription.windingWindows[0].sectionsAlignment;
                        }
                        if (magnetic.coil.bobbin.processedDescription.windingWindows[0].sectionsOrientation != null) {
                            this.localData.sectionsOrientation = magnetic.coil.bobbin.processedDescription.windingWindows[0].sectionsOrientation;
                        }
                    }
                }
            }
            if (magnetic.coil.sectionsDescription != null && magnetic.coil.layersDescription != null) {
                var conductionSectionIndex = 0;
                magnetic.coil.sectionsDescription.forEach((section) => {
                    if (section.type == "conduction") {
                        if (this.localData.dataPerSection.length <= conductionSectionIndex) {
                            this.localData.dataPerSection.push({
                                layersOrientation: "overlapping",
                                turnsAlignment: "spread",
                            });
                        }
                        this.localData.dataPerSection[conductionSectionIndex].layersOrientation = section.layersOrientation;

                        magnetic.coil.layersDescription.forEach((layer, layerIndex) => {
                            if (layer.section == section.name) {
                                this.localData.dataPerSection[conductionSectionIndex].turnsAlignment = layer.turnsAlignment;
                            }
                        })

                        conductionSectionIndex += 1;
                    }
                })
            }
        },
        assignCoilData() {
            if (this.masStore.mas.magnetic.coil.bobbin.processedDescription == null) {
                this.masStore.mas.magnetic.coil.bobbin.processedDescription = {};
            }
            if (this.masStore.mas.magnetic.coil.bobbin.processedDescription.windingWindows == null) {
                this.masStore.mas.magnetic.coil.bobbin.processedDescription.windingWindows = [];
                this.masStore.mas.magnetic.coil.bobbin.processedDescription.windingWindows.push({});
            }

            this.masStore.mas.magnetic.coil.bobbin.processedDescription.windingWindows[0].sectionsAlignment = this.localData.sectionsAlignment;
            this.masStore.mas.magnetic.coil.bobbin.processedDescription.windingWindows[0].sectionsOrientation = this.localData.sectionsOrientation;
        },
        getSectionOrientations() {
            this.$mkf.ready.then(_ => {
                const handle = this.$mkf.get_available_winding_orientations();
                for (var i = handle.size() - 1; i >= 0; i--) {
                    const type = handle.get(i);
                    this.sectionsOrientations[type] = toTitleCase(type);
                }
            });
        },
        getCoilAlignments() {
            this.$mkf.ready.then(_ => {
                const handle = this.$mkf.get_available_coil_alignments();
                for (var i = handle.size() - 1; i >= 0; i--) {
                    const type = handle.get(i);
                    this.CoilAlignments[type] = toTitleCase(type);
                }
            });
        },
        coilUpdated() {
            console.log("coilUpdated");
            this.recentChange = true;
            this.tryToWind();
        },
        customizeCoil() {
            console.log("customizeCoil");
        },
        sectionIndexChanged(sectionIndex) {
            this.selectedSectionIndex = sectionIndex;
        },
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <img :data-cy="dataTestLabel + '-BasicCoilSelector-loading'" v-if="loading" class="mx-auto d-block col-12" alt="loading" style="width: 60%; height: auto;" :src="loadingGif">
            <ElementFromList
                v-if="!loading"
                class="col-12 mb-1 text-start"
                :dataTestLabel="dataTestLabel + '-sectionsOrientation'"
                :name="'sectionsOrientation'"
                :replaceTitle="'Windings Orientation'"
                :titleSameRow="true"
                :justifyContent="true"
                v-model="localData"
                :options="sectionsOrientations"
                :labelStyleClass="'col-7'"
                :selectStyleClass="'col-5'"
                @update="coilUpdated"
            />

            <ElementFromList
                v-if="!loading"
                class="col-12 mb-1 text-start"
                :dataTestLabel="dataTestLabel + '-SectionsAlignment'"
                :name="'sectionsAlignment'"
                :replaceTitle="'Section Alignment'"
                :titleSameRow="true"
                :justifyContent="true"
                v-model="localData"
                :options="CoilAlignments"
                :labelStyleClass="'col-7'"
                :selectStyleClass="'col-5'"
                @update="coilUpdated"
            />
        </div>
        <div v-if="numberSections > 1" class="row">
            <img :data-cy="dataTestLabel + '-BasicCoilBuilder-loading'" v-if="masStore.mas.magnetic.coil.sectionsDescription == null" class="mx-auto d-block col-12" alt="loading" style="width: 60%; height: auto;" :src="loadingGif">
            <div v-else class="accordion row m-0 p-0" id="coilBuilderAccordion bg-dark">
                <div :class="'col-lg-' + Number(12 / numberSections)" class="accordion-item border-0 m-0 p-0 bg-dark" v-for="key in range(0, numberSections)">
                    <h2 class="accordion-header" :id="'coreCalculatorheading-' + key">
                        <button :class="selectedSectionIndex == key? 'text-info' : 'text-white collapsed'" class="fs-6 accordion-button bg-light" type="button" data-bs-toggle="collapse" aria-expanded="false" :aria-controls="'coilBuilderAccordionHeading' + key" @click="sectionIndexChanged(key)">
                            {{conductiveSections[key].name}}
                        </button>
                    </h2>
                </div>
            </div>
        </div>
        <div class="row" v-show="masStore.mas.magnetic.coil.sectionsDescription != null">
            <BasicCoilSectionSelector
            :sectionIndex="selectedSectionIndex"
            :data="localData.dataPerSection"
            @coilUpdated="coilUpdated"
            />
        </div>
    </div>
</template>
