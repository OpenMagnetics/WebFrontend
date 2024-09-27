<script setup>
import { useMasStore } from '/src/stores/mas'
import ElementFromList from '/src/components/DataInput/ElementFromList.vue'
import Dimension from '/src/components/DataInput/Dimension.vue'
import ListOfCharacters from '/src/components/DataInput/ListOfCharacters.vue'
import BasicCoilSubmenu from '/src/components/Toolbox/MagneticBuilder/BasicCoilSubmenu.vue'
import BasicCoilInfo from '/src/components/Toolbox/MagneticBuilder/BasicCoilInfo.vue'
import BasicCoilSectionMarginsSelector from '/src/components/Toolbox/MagneticBuilder/BasicCoilSectionMarginsSelector.vue'
import BasicCoilSectionAlignmentSelector from '/src/components/Toolbox/MagneticBuilder/BasicCoilSectionAlignmentSelector.vue'
import Module from '/src/assets/js/libAdvisers.wasm.js'
import { useDataCacheStore } from '/src/stores/dataCache'
import { toTitleCase, checkAndFixMas, deepCopy, range, getWindingIndex, roundWithDecimals } from '/src/assets/js/utils.js'
import { useHistoryStore } from '/src/stores/history'
import { tooltipsMagneticBuilder } from '/src/assets/js/texts.js'
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
        const historyStore = useHistoryStore();
        const showAlignmentOptions = false;
        const showMarginOptions = false;
        const loading = false;
        const blockingRebounds = false;
        const recentChange = false;
        const tryingToSend = false;
        const forceUpdate = 0; 
        var pattern = "";
        const proportionPerWinding = [];
        masStore.mas.magnetic.coil.functionalDescription.forEach((item, index) => {
            pattern += String(index + 1);
            proportionPerWinding.push(1.0 / masStore.mas.magnetic.coil.functionalDescription.length);
        })

        var localData = {
            sectionsOrientation: "overlapping",
            sectionsAlignment: "inner or top",
            dataPerSection: [{
                layersOrientation: "overlapping",
                turnsAlignment: "spread",
                topOrLeftMargin: 0,
                bottomOrRightMargin: 0,
            }],
            pattern: pattern,
            repetitions: 1,
            proportionPerWinding: proportionPerWinding,
        };

        return {
            blockingRebounds,
            masStore,
            historyStore,
            localData,
            forceUpdate,
            showAlignmentOptions,
            showMarginOptions,
            loading,
            recentChange,
            tryingToSend,
        }
    },
    computed: {
        styleTooltip() {
            var relative_placement;
            relative_placement = 'top'
            return {
                theme: {
                    placement: relative_placement,
                    'transition-delay': '1s',
                    width: '300px',
                    "text-align": "start",
                },
            }
        },
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
        windingIndexesCharacters() {
            var pattern = "";
            this.masStore.mas.magnetic.coil.functionalDescription.forEach((item, index) => {
                pattern += String(index + 1);
            })
            return pattern;
        },
        shortenedNames() {
            const shortenedNames = {}

            var width = 0;
            if (this.$refs.coilSelectorContainer != null) {
                width = this.$refs.coilSelectorContainer.clientWidth / this.localData.pattern.length;
            }

            this.conductiveSections.forEach((section, key) => {
                var label = toTitleCase(section.name.toLowerCase());
                var label = label.replace("section", "stn");
                if (width > 0) {
                    var slice = section.name.length
                    if (width < 200)
                        slice = 4;
                    if (width < 150)
                        slice = 3;
                    if (width < 100)
                        slice = 2;
                    label = label.split(' ')
                        .map(item => item.length <= slice? item + ' ' : item.slice(0, slice) + '. ')
                        .join('');
                }
                shortenedNames[key] = label;
            })

            return shortenedNames
        },
    },
    watch: {
        'masStore.mas.magnetic.core': {
            handler(newValue, oldValue) {
                if (!this.blockingRebounds && this.masStore.mas.magnetic.coil.turnsDescription == null && this.masStore.mas.magnetic.coil.bobbin != "Dummy") {
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
                if (!this.blockingRebounds && this.masStore.mas.magnetic.coil.turnsDescription == null && this.masStore.mas.magnetic.coil.bobbin != "Dummy") {
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
        this.assignLocalData(this.masStore.mas.magnetic);

        this.getProportionsAndPattern(this.masStore.mas.magnetic.coil);

        this.masStore.mas.magnetic.coil.functionalDescription.forEach((datum, sectionIndex) => {
            if (sectionIndex >= this.localData.dataPerSection.length) {
                this.localData.dataPerSection.push({
                    layersOrientation: this.localData.dataPerSection[sectionIndex - 1].layersOrientation,
                    turnsAlignment: this.localData.dataPerSection[sectionIndex - 1].turnsAlignment,
                    topOrLeftMargin: this.localData.dataPerSection[sectionIndex - 1].topOrLeftMargin,
                    bottomOrRightMargin: this.localData.dataPerSection[sectionIndex - 1].bottomOrRightMargin,
                });
            }
        })

        this.historyStore.$onAction((action) => {
            if (action.name == "historyPointerUpdated") {
                this.tryToWind();
                this.assignLocalData(this.masStore.mas.magnetic);
                this.getProportionsAndPattern(this.masStore.mas.magnetic.coil);

                this.masStore.mas.magnetic.coil.functionalDescription.forEach((datum, sectionIndex) => {
                    if (sectionIndex >= this.localData.dataPerSection.length) {
                        this.localData.dataPerSection.push({
                            layersOrientation: this.localData.dataPerSection[sectionIndex - 1].layersOrientation,
                            turnsAlignment: this.localData.dataPerSection[sectionIndex - 1].turnsAlignment,
                            topOrLeftMargin: this.localData.dataPerSection[sectionIndex - 1].topOrLeftMargin,
                            bottomOrRightMargin: this.localData.dataPerSection[sectionIndex - 1].bottomOrRightMargin,
                        });
                    }
                })
            }
        })

    },
    methods: {
        getProportionsAndPattern(coil) {
            if (coil.sectionsDescription != null) {
                const bobbinShape = coil.bobbin.processedDescription.windingWindows[0].shape;
                const sectionsOrientation = coil.bobbin.processedDescription.windingWindows[0].sectionsOrientation;

                var windingDimensions = [];
                coil.functionalDescription.forEach((winding, windingIndex) => {
                    windingDimensions.push(0);
                })

                var windingDimensionsTotal = 0;
                this.localData.pattern = "";
                coil.sectionsDescription.forEach((section) => {
                    if (section.type == "conduction") {
                        const windingIndex = getWindingIndex(coil, section.partialWindings[0].winding);
                        this.localData.pattern += String(windingIndex + 1)
                        if (bobbinShape == "round") {
                            if (sectionsOrientation == "contiguous") {
                                windingDimensions[windingIndex] += section.dimensions[1];
                                windingDimensionsTotal += section.dimensions[1];
                            }
                            else {
                                windingDimensions[windingIndex] += section.dimensions[0];
                                windingDimensionsTotal += section.dimensions[0];
                            }
                        }
                        else {
                            if (sectionsOrientation == "contiguous") {
                                windingDimensions[windingIndex] += section.dimensions[1];
                                windingDimensionsTotal += section.dimensions[1];
                            }
                            else {
                                windingDimensions[windingIndex] += section.dimensions[0];
                                windingDimensionsTotal += section.dimensions[0];
                            }
                        }
                    }
                })
                this.localData.proportionPerWinding = []
                windingDimensions.forEach((elem) => {
                    this.localData.proportionPerWinding.push(roundWithDecimals(elem / windingDimensionsTotal, 0.01));
                })
            }
        },
        wind() {
            this.$emit("fits", true);
            this.$mkf.ready.then(_ => {

                const inputCoil = deepCopy(this.masStore.mas.magnetic.coil);

                const margins = [];
                if (this.conductiveSections.length > 0) {
                    inputCoil["_turnsAlignment"] = {};
                    inputCoil["_layersOrientation"] = {};
                    this.localData.dataPerSection.forEach((datum, sectionIndex) => {
                        if (sectionIndex in this.conductiveSections) {
                            const sectionName = this.conductiveSections[sectionIndex].name
                            inputCoil["_turnsAlignment"][sectionName] = datum.turnsAlignment;
                            inputCoil["_layersOrientation"][sectionName] = datum.layersOrientation;
                        }
                        margins.push([datum.topOrLeftMargin, datum.bottomOrRightMargin])
                    })
                }
                else {
                    inputCoil["_turnsAlignment"] = [];
                    inputCoil["_layersOrientation"] = [];
                    this.localData.dataPerSection.forEach((datum, sectionIndex) => {
                        inputCoil["_turnsAlignment"].push(datum.turnsAlignment);
                        inputCoil["_layersOrientation"].push(datum.layersOrientation);
                        margins.push([datum.topOrLeftMargin, datum.bottomOrRightMargin])
                    })
                }

                console.warn(margins)

                const pattern = [];
                this.localData.pattern.split('').forEach((char) => {
                    pattern.push(Number(char) - 1);
                });

                const coilJson = this.$mkf.wind(JSON.stringify(inputCoil), this.localData.repetitions, JSON.stringify(this.localData.proportionPerWinding), JSON.stringify(pattern), JSON.stringify(margins));

                if (coilJson.startsWith("Exception")) {
                    this.tryingToSend = false;
                    console.error(coilJson);
                    return;
                }
                this.masStore.mas.magnetic.coil = JSON.parse(coilJson);
                const fits = this.$mkf.are_sections_and_layers_fitting(JSON.stringify(inputCoil));
                this.$emit("fits", fits);

                console.warn("addToHistory in wind")
                this.historyStore.addToHistory(this.masStore.mas);
                this.tryingToSend = false;
                this.historyStore.unblockAdditions();

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

                        if (section.margin != null) {
                            this.localData.dataPerSection[conductionSectionIndex].topOrLeftMargin = section.margin[0];
                            this.localData.dataPerSection[conductionSectionIndex].bottomOrRightMargin = section.margin[1];
                        }

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
        coilUpdated() {
            this.updateDataPerSection();
            this.assignCoilData();
            this.recentChange = true;
            this.tryToWind();
        },
        updateDataPerSection() {

            while (this.localData.dataPerSection.length > this.localData.pattern.length) {
                this.localData.dataPerSection.pop();
            }

            this.localData.pattern.split('').forEach((windingIndexPlusOne, newSectionIndex) => {
                if (newSectionIndex >= this.localData.dataPerSection.length) {
                    var newSection = null;
                    this.localData.dataPerSection.forEach((section, sectionIndex) => {
                        if (this.localData.pattern.split('')[sectionIndex] == windingIndexPlusOne) {
                            newSection = deepCopy(section);
                        }
                    })
                    this.localData.dataPerSection.push(newSection);
                }
            })

        },
        marginUpdated(sectionIndex) {
            this.coilUpdated();
        },
        swapShowAlignmentOptions(showAlignmentOptions) {
            this.showAlignmentOptions = showAlignmentOptions;
        },
        swapShowMarginOptions(showMarginOptions) {
            this.showMarginOptions = showMarginOptions;
        },
        customizeCoil() {
            console.log("customizeCoil");
        },
    }
}
</script>

<template>
    <div class="container" v-tooltip="styleTooltip">
        <div class="row"  ref="coilSelectorContainer">
            <img :data-cy="dataTestLabel + '-BasicCoilSelector-loading'" v-if="loading" class="mx-auto d-block col-12" alt="loading" style="width: 60%; height: auto;" :src="loadingGif">

            <ListOfCharacters
                v-tooltip="tooltipsMagneticBuilder.sectionsInterleaving"
                v-if="!loading"
                class="col-12 mb-1 text-start"
                :dataTestLabel="dataTestLabel + '-ProportionPerWinding'"
                :modelValue="localData.pattern" 
                @updateModelValue="localData.pattern = $event"
                :name="'pattern'"
                :replaceTitle="'Section Interleaving Order'"
                :allowedCharacters="windingIndexesCharacters"
                @update="coilUpdated"
            />
        </div>
               
        <div class="col-12">
            <BasicCoilSectionAlignmentSelector 
                :data="localData"
                :showAlignmentOptions="showAlignmentOptions"
                @coilUpdated="coilUpdated"
            />
        </div>

        <div class="row mb-4" v-show="masStore.mas.magnetic.coil.sectionsDescription != null">
            <BasicCoilSectionMarginsSelector
                :data="localData.dataPerSection"
                :showMarginOptions="showMarginOptions"
                @marginUpdated="marginUpdated"
            />
        </div>

        <div class="col-12">
            <BasicCoilInfo
                v-if="!loading"
                :dataTestLabel="dataTestLabel + '-BasicCoreInfo'"
                :core="masStore.mas.magnetic.core"
            />
        </div>

        <BasicCoilSubmenu class="col-12 mb-1 text-start"
            :dataTestLabel="dataTestLabel + '-BasicCoreSubmenu'"
            :enableAlignmentOptions="!loading"
            :enableCustomize="false"
            @showAlignmentOptions="swapShowAlignmentOptions"
            @showMarginOptions="swapShowMarginOptions"
            @customizeCore="customizeCoil"
        />
    </div>
</template>
