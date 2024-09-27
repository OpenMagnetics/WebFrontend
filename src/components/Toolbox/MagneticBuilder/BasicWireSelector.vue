<script setup>
import { useMasStore } from '/src/stores/mas'
import ElementFromList from '/src/components/DataInput/ElementFromList.vue'
import Dimension from '/src/components/DataInput/Dimension.vue'
import BasicWireSubmenu from '/src/components/Toolbox/MagneticBuilder/BasicWireSubmenu.vue'
import BasicWireInfo from '/src/components/Toolbox/MagneticBuilder/BasicWireInfo.vue'
import Module from '/src/assets/js/libAdvisers.wasm.js'
import { useDataCacheStore } from '/src/stores/dataCache'
import { toTitleCase, checkAndFixMas } from '/src/assets/js/utils.js'
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
        windingIndex: {
            type: Number,
            default: 0,
        },
        loadingGif: {
            type: String,
            default: "/images/loading.gif",
        },
    },
    data() {
        const dataCacheStore = useDataCacheStore();
        const masStore = useMasStore();
        const historyStore = useHistoryStore();
        const loading = false; 
        const forceUpdate = 0; 
        const wireTypes = {};
        const wireConductingDiameters = [];
        const wireHeights = [];
        const wireWidths = [];
        const wireStandards = []; 
        const wireCoatings = []; 
        const errorMessages = ""; 
        var localData = {
            type: null,
            standard: "IEC 60317",
            roundConductingDiameter: null,
            litzStrandConductingDiameter: null,
            coating: null,
            numberConductors: 13,
            rectangularConductingHeight: 0.001,
            rectangularConductingWidth: 0.002,
            foilConductingHeight: 0.005,
            foilConductingWidth: 0.0001,
        };
        if (typeof(masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire) == 'string' && masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire != "") {
            this.$mkf.ready.then(_ => {

                masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire = JSON.parse(this.$mkf.get_wire_data(JSON.stringify(masStore.mas.magnetic.coil.functionalDescription[this.windingIndex])));

            });
        }

        return {
            dataCacheStore,
            masStore,
            historyStore,
            localData,
            wireTypes,
            wireConductingDiameters,
            wireHeights,
            wireWidths,
            wireStandards,
            wireCoatings,
            forceUpdate,
            loading,
            errorMessages,
        }
    },
    computed: {
        styleTooltip() {
            var relative_placement;
            relative_placement = 'top'
            return {
                theme: {
                    placement: relative_placement,
                    width: '200px',
                    "text-align": "start",
                },
            }
        },
    },
    watch: {
    },
    mounted () {
        if (this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire != null) {
            this.assignLocalData(this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire);
        }
        this.historyStore.$onAction((action) => {
            if (action.name == "historyPointerUpdated") {
                this.assignLocalData(this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire);
            }
        })
    },
    methods: {
        cleanCoil() {
            console.log("cleanCoil Wire")
            this.masStore.mas.magnetic.coil.turnsDescription = null;
            this.masStore.mas.magnetic.coil.layersDescription = null;
            this.masStore.mas.magnetic.coil.sectionsDescription = null;
        },
        assignLocalData(wire) {
            this.errorMessages = "";
            this.$mkf.ready.then(_ => {
                if (wire != "" && wire.type != null) {

                    this.localData["type"] = wire.type;
                    if (wire.standard != null) {
                        this.localData["standard"] = wire.standard;
                    }

                    if (wire.type == "round") {
                        this.localData["roundConductingDiameter"] = wire.standardName;
                        this.localData["coating"] = this.$mkf.get_coating_label(JSON.stringify(wire));
                    }
                    else if (wire.type == "litz") {
                        if (typeof(wire.strand) == 'string') {
                            this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire.strand = JSON.parse(this.$mkf.get_wire_data_by_name(wire.strand));
                        }
                        this.localData["litzStrandConductingDiameter"] = wire.strand.standardName;
                        this.localData["numberConductors"] = wire.numberConductors;
                    }
                    else if (wire.type == "rectangular") {
                        this.localData["rectangularConductingHeight"] = this.$mkf.resolve_dimension_with_tolerance(JSON.stringify(wire.conductingHeight));
                        this.localData["rectangularConductingWidth"] = this.$mkf.resolve_dimension_with_tolerance(JSON.stringify(wire.conductingWidth));
                    }
                    else if (wire.type == "foil") {
                        if (this.masStore.mas.magnetic.coil.bobbin != "Dummy"){
                            this.localData["foilConductingHeight"] = this.masStore.mas.magnetic.coil.bobbin.processedDescription.windingWindows[0].height * 0.9 // hardcoded;
                        }
                        this.localData["foilConductingWidth"] = this.$mkf.resolve_dimension_with_tolerance(JSON.stringify(wire.conductingWidth));
                    }
                    this.localData["coating"] = this.$mkf.get_coating_label(JSON.stringify(wire));
                    this.forceUpdate += 1;
                }
                this.getWireTypes();
                this.getWireStandards();
                this.getWireDiameters();
                this.getWireCoatings();
            });
        },
        assignWire() {
            this.errorMessages = "";
            this.$mkf.ready.then(_ => {

                var wire = {};

                if (this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire != "") {
                    wire = this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire;
                }
                var coating = null;
                if (this.localData["coating"] != null) {
                    coating = JSON.parse(this.$mkf.get_wire_coating_by_label(this.localData["coating"]));
                }

                wire.standard = "IEC 60317";

                if (this.localData["type"] == "round") {

                    if (this.localData["standard"] != null) {
                        wire.standard = this.localData["standard"];
                    }
                    wire = JSON.parse(this.$mkf.get_wire_data_by_standard_name(this.localData["roundConductingDiameter"]));
                }
                else if (this.localData["type"] == "litz") {
                    if (this.localData["standard"] != null) {
                        wire.standard = this.localData["standard"];
                    }
                    wire.type = "litz";
                    wire.strand = JSON.parse(this.$mkf.get_wire_data_by_standard_name(this.localData["litzStrandConductingDiameter"]));
                    wire.numberConductors = this.localData["numberConductors"];
                    if (coating != null) {
                        if (wire.outerDiameter == null) {
                            wire.outerDiameter = {};
                        }

                        var strandConductingDiameter = this.$mkf.resolve_dimension_with_tolerance(JSON.stringify(wire.strand.conductingDiameter));  
                        if (coating.type == "bare") {
                            wire.outerDiameter.nominal = this.$mkf.get_wire_outer_diameter_bare_litz(strandConductingDiameter, wire.numberConductors, wire.strand.coating.grade, wire.standard);
                        }
                        if (coating.type == "served") {
                            wire.outerDiameter.nominal = this.$mkf.get_wire_outer_diameter_served_litz(strandConductingDiameter, wire.numberConductors, wire.strand.coating.grade, coating.numberLayers, wire.standard);
                        }
                        if (coating.type == "insulated") {
                            wire.outerDiameter.nominal = this.$mkf.get_wire_outer_diameter_insulated_litz(strandConductingDiameter, wire.numberConductors, coating.numberLayers, coating.thicknessLayers, wire.strand.coating.grade, wire.standard);
                        }
                    }
                }
                else if (this.localData["type"] == "rectangular") {
                    wire.type = "rectangular";
                    if (wire.conductingHeight == null) {
                        wire.conductingHeight = {};
                    }
                    if (wire.conductingWidth == null) {
                        wire.conductingWidth = {};
                    }
                    wire.conductingHeight.nominal = this.localData["rectangularConductingHeight"];
                    wire.conductingWidth.nominal = this.localData["rectangularConductingWidth"];
                    if (coating != null) {
                        if (wire.outerHeight == null) {
                            wire.outerHeight = {};
                        }
                        if (wire.outerWidth == null) {
                            wire.outerWidth = {};
                        }
                        wire.outerHeight.nominal = this.$mkf.get_wire_outer_height_rectangular(this.localData["rectangularConductingHeight"], coating.grade, wire.standard);
                        wire.outerWidth.nominal = this.$mkf.get_wire_outer_width_rectangular(this.localData["rectangularConductingWidth"], coating.grade, wire.standard);
                    }
                }
                else if (this.localData["type"] == "foil") {
                    wire.type = "foil";
                    if (wire.conductingHeight == null) {
                        wire.conductingHeight = {};
                    }
                    if (wire.conductingWidth == null) {
                        wire.conductingWidth = {};
                    }
                    wire.conductingHeight.nominal = this.localData["foilConductingHeight"];
                    wire.conductingWidth.nominal = this.localData["foilConductingWidth"];
                    if (coating != null) {
                        if (wire.outerHeight == null) {
                            wire.outerHeight = {};
                        }
                        if (wire.outerWidth == null) {
                            wire.outerWidth = {};
                        }
                        wire.outerHeight.nominal = wire.conductingHeight.nominal;
                        wire.outerWidth.nominal = wire.conductingWidth.nominal;
                    }
                }

                wire.coating = coating;

                this.$userStore.wire2DVisualizerPlotCurrentViews[this.windingIndex] = null;
                this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire = wire;
                this.cleanCoil();
                // this.historyStore.addToHistory(this.masStore.mas);
            });
        },
        getWireTypes() {
            this.$mkf.ready.then(_ => {
                const wireTypesHandle = this.$mkf.get_available_wire_types();
                for (var i = wireTypesHandle.size() - 1; i >= 0; i--) {
                    const type = wireTypesHandle.get(i);
                    this.wireTypes[type] = toTitleCase(type);
                }

            });
        },
        getWireStandards() {
            this.$mkf.ready.then(_ => {
                const wireStandardsHandle = this.$mkf.get_available_wire_standards();
                this.wireStandards = [];
                for (var i = wireStandardsHandle.size() - 1; i >= 0; i--) {
                    const standard = wireStandardsHandle.get(i);
                    this.wireStandards.push(standard);
                }

            });
        },
        getWireDiameters() {
            if (this.dataCacheStore.wireData.wireConductingDiametersPerStandard[this.localData.standard] != null && this.dataCacheStore.isWireDataValid()) {
                this.wireConductingDiameters = this.dataCacheStore.wireData.wireConductingDiametersPerStandard[this.localData.standard];
            }
            else {
                this.$mkf.ready.then(_ => {
                    const aux = {};
                    const wireConductingDiametersHandle = this.$mkf.get_unique_wire_diameters(JSON.stringify(this.localData.standard));
                    for (var i = wireConductingDiametersHandle.size() - 1; i >= 0; i--) {
                        const wireDiameter = wireConductingDiametersHandle.get(i);
                        const key = Number(wireDiameter.split(" ")[0]);
                        aux[key] = wireDiameter;
                    }
                    let orderedKeys = Object.keys(aux).sort(function(a, b) {
                        return a - b;
                    })
                    this.wireConductingDiameters = [];
                    orderedKeys.forEach((key) => {
                        this.wireConductingDiameters.push(aux[key]);
                    });
                    this.dataCacheStore.wireData.wireConductingDiametersPerStandard[this.localData.standard] = this.wireConductingDiameters;
                    this.dataCacheStore.setWireDataTimestamp();
                });
            }
        },
        getWireCoatings() {
            if (this.dataCacheStore.wireData.wireCoatingsPerWireType[this.localData.type] != null &&
                this.dataCacheStore.isWireDataValid()) {
                this.wireCoatings = this.dataCacheStore.wireData.wireCoatingsPerWireType[this.localData.type];
                if (this.wireCoatings.length > 0 && !this.wireCoatings.includes(this.localData["coating"])) {
                    this.localData["coating"] = this.wireCoatings[0];
                }
            }
            else {
                if (this.localData.type != null) {

                    this.$mkf.ready.then(_ => {
                        const aux = {};
                        const wireCoatingsHandle = this.$mkf.get_coating_labels_by_type(JSON.stringify(this.localData.type));

                        this.wireCoatings = [];
                        for (var i = wireCoatingsHandle.size() - 1; i >= 0; i--) {
                            const wireCoating = wireCoatingsHandle.get(i);
                            this.wireCoatings.push(wireCoating);
                        }
                        this.dataCacheStore.wireData.wireCoatingsPerWireType[this.localData.type] = this.wireCoatings;

                        if (this.wireCoatings.length > 0 && !this.wireCoatings.includes(this.localData["coating"])) {
                            this.localData["coating"] = this.wireCoatings[0];
                        }

                    });
                }
            }
        },
        wireStandardUpdated() {
            this.getWireDiameters();
            this.assignWire();
        },
        wireCoatingUpdated() {
            this.assignWire();
            // this.$mkf.ready.then(_ => {
            //     this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire.coating = JSON.parse(this.$mkf.get_wire_coating_by_label(this.localData.coating));
            // });
        },
        wireUpdated() {
            this.assignWire();
            // this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire.numberConductors = this.localData.numberConductors;

            // this.$mkf.ready.then(_ => {
            //     this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire = JSON.parse(this.$mkf.get_wire_data(JSON.stringify(this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex])));
            // });
        },
        isAnyLitzLoaded() {
            return this.localData["litzStrandConductingDiameter"] != null
        },
        isAnyRoundLoaded() {
            return this.localData["roundConductingDiameter"] != null
        },
        isAnyRectangularLoaded() {
            return this.localData["rectangularConductingWidth"] != null
        },
        isAnyFoilLoaded() {
            return this.localData["foilConductingWidth"] != null
        },
        wireTypeUpdated() {
            console.log("Mierda 0")
            this.getWireCoatings();

            const newType = this.localData.type;
            if (this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire != "" &&
                this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire.type != null) {
                const oldType = this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire.type;
                const effectiveFrequency = this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0].current.processed.effectiveFrequency;
                console.log("Mierda 1")

                this.$mkf.ready.then(_ => {
                    console.log("Mierda 0")

                    if ((newType == "litz" && !this.isAnyLitzLoaded()) ||
                        (newType == "round" && !this.isAnyRoundLoaded()) ||
                        (newType == "rectangular" && !this.isAnyRectangularLoaded()) ||
                        (newType == "foil" && !this.isAnyFoilLoaded())) {
                        const wireString = this.$mkf.get_equivalent_wire(JSON.stringify(this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire), JSON.stringify(newType), effectiveFrequency);

                        if (wireString.startsWith("Exception")) {
                            console.error(wireString);
                            return;
                        }
                        const wire = JSON.parse(wireString);
                        this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire = wire;
                        this.assignLocalData(wire);
                    }
                    // this.assignWire();
                });
            }
        },
        adviseWireRequested() {
            this.loading = true;
            setTimeout(() => this.adviseWire(), 100);
        },
        adviseAllWiresRequested() {
            this.loading = true;
            setTimeout(() => this.adviseAllWires(), 100);
        },
        adviseAllWires() {
            advisers.ready.then(_ => {
                if (this.masStore.mas.inputs.operatingPoints.length > 0) {

                    checkAndFixMas(this.masStore.mas, this.$mkf).then(response => {
                        this.masStore.mas = response;

                        const resultMasWithCoil = advisers.calculate_advised_coil(JSON.stringify(this.masStore.mas));
                        if (resultMasWithCoil.startsWith("Exception")) {
                            this.errorMessages = "Our advisers could not find a wire. Sorry, you are on your own!";
                            this.loading = false;
                            console.error(resultMasWithCoil);
                            return;
                        }
                        this.errorMessages = "";
                        const masWithCoil = JSON.parse(resultMasWithCoil);

                        this.masStore.mas.magnetic.coil.functionalDescription = masWithCoil.magnetic.coil.functionalDescription;

                        this.assignLocalData(this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire);
                        this.cleanCoil();

                        this.$userStore.wire2DVisualizerPlotCurrentViews = {};
                        setTimeout(() => this.loading = false, 100);
                    })
                }
                else {
                    console.error("No operating points found")
                    this.loading = false;
                }
            });
        },
        adviseWire() {
            advisers.ready.then(_ => {
                if (this.masStore.mas.inputs.operatingPoints.length > 0) {

                    checkAndFixMas(this.masStore.mas, this.$mkf).then(response => {
                        this.masStore.mas = response;

                        const resultMasWithCoil = advisers.calculate_advised_coil(JSON.stringify(this.masStore.mas));
                        if (resultMasWithCoil.startsWith("Exception")) {
                            this.errorMessages = "Our advisers could not find a wire. Sorry, you are on your own!";
                            this.loading = false;
                            console.error(resultMasWithCoil);
                            return;
                        }
                        this.errorMessages = "";
                        const masWithCoil = JSON.parse(resultMasWithCoil);

                        this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex] = masWithCoil.magnetic.coil.functionalDescription[this.windingIndex];


                        this.$userStore.wire2DVisualizerPlotCurrentViews[this.windingIndex] = null;
                        this.assignLocalData(this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire);
                        this.cleanCoil();

                        setTimeout(() => this.loading = false, 100);
                    })
                }
                else {
                    console.error("No operating points found")
                    this.loading = false;
                }
            });
        },
        customizeWire() {
            console.log("customizeWire");
        },
        loadWire() {
            console.log("loadWire");
        },
    }
}
</script>

<template>
    <div class="container">
        <div class="row" v-tooltip="styleTooltip">
            <img :data-cy="dataTestLabel + '-BasicWireSelector-loading'" v-if="loading" class="mx-auto d-block col-12" alt="loading" style="width: 60%; height: auto;" :src="loadingGif">
            <ElementFromList
                v-tooltip="tooltipsMagneticBuilder.wireType"
                v-if="!loading"
                class="col-12 mb-1 text-start"
                :dataTestLabel="dataTestLabel + '-WireType'"
                :name="'type'"
                :titleSameRow="true"
                :justifyContent="true"
                v-model="localData"
                :options="wireTypes"
                :labelStyleClass="'col-5'"
                :selectStyleClass="'col-7'"
                @update="wireTypeUpdated"
            />
            <h5 v-if="!loading && localData.type == null" class="text-danger my-2">Select a type for the wire</h5>

            <ElementFromList
                v-tooltip="tooltipsMagneticBuilder.wireStandard"
                v-if="!loading && localData.type == 'round' || localData.type == 'litz' && localData.standard != null"
                class="col-12 mb-1 text-start"
                :dataTestLabel="dataTestLabel + '-WireStandard'"
                :name="'standard'"
                :titleSameRow="true"
                :justifyContent="true"
                :labelStyleClass="'col-5'"
                :selectStyleClass="'col-7'"
                v-model="localData"
                :options="wireStandards"
                @update="wireStandardUpdated"
            />
            <ElementFromList
                v-tooltip="tooltipsMagneticBuilder.wireRoundConductingDiameter"
                v-if="!loading && localData.type == 'round'"
                class="col-12 mb-1 text-start"
                :dataTestLabel="dataTestLabel + '-WireConductingDiameter'"
                :replaceTitle="'Cond. diameter'"
                :name="'roundConductingDiameter'"
                :titleSameRow="true"
                :justifyContent="true"
                :labelStyleClass="'col-5'"
                :selectStyleClass="'col-7'"
                v-model="localData"
                :options="wireConductingDiameters"
                @update="wireUpdated"
            />
            <ElementFromList
                v-tooltip="tooltipsMagneticBuilder.wireLitzStrandConductingDiameter"
                v-if="!loading && localData.type == 'litz'"
                class="col-12 mb-1 text-start"
                :dataTestLabel="dataTestLabel + '-StrandConductingDiameter'"
                :replaceTitle="'Cond. diameter'"
                :name="'litzStrandConductingDiameter'"
                :labelStyleClass="'col-5'"
                :selectStyleClass="'col-7'"
                :titleSameRow="true"
                :justifyContent="true"
                v-model="localData"
                :options="wireConductingDiameters"
                @update="wireUpdated"
            />
            <ElementFromList
                v-tooltip="tooltipsMagneticBuilder.wireCoating"
                v-if="!loading && localData.type != null"
                class="col-12 mb-1 text-start"
                :dataTestLabel="dataTestLabel + '-WireCoating'"
                :name="'coating'"
                :titleSameRow="true"
                :justifyContent="true"
                :labelStyleClass="'col-4'"
                :selectStyleClass="'col-8'"
                v-model="localData"
                :options="wireCoatings"
                @update="wireCoatingUpdated"
            />
            <Dimension class="col-12 mb-1 text-start"
                v-tooltip="tooltipsMagneticBuilder.wireLitzNumberConductors"
                v-if="!loading && localData.type == 'litz'"
                :name="'numberConductors'"
                :replaceTitle="'No. Strands'"
                :unit="null"
                :dataTestLabel="dataTestLabel + '-NumberConductors'"
                :numberDecimals="0"
                :min="1"
                :max="1000000"
                :allowNegative="false"
                :modelValue="localData"
                :forceUpdate="forceUpdate"
                :styleClassInput="'offset-6 col-6'"
                @update="wireUpdated"
            />
            <Dimension class="col-12 mb-1 text-start"
                v-tooltip="tooltipsMagneticBuilder.wireRectangularConductingHeight"
                v-if="!loading && localData.type == 'rectangular'"
                :name="'rectangularConductingHeight'"
                :replaceTitle="'Cond. Height'"
                :unit="'m'"
                :dataTestLabel="dataTestLabel + '-WireConductingHeight'"
                :min="1e-9"
                :max="0.1"
                :allowNegative="false"
                :modelValue="localData"
                :forceUpdate="forceUpdate"
                :styleClassInput="'offset-3 col-6'"
                @update="wireUpdated"
            />
            <Dimension class="col-12 mb-1 text-start"
                v-tooltip="tooltipsMagneticBuilder.wireRectangularConductingWidth"
                v-if="!loading && localData.type == 'rectangular'"
                :name="'rectangularConductingWidth'"
                :replaceTitle="'Cond. Width'"
                :unit="'m'"
                :dataTestLabel="dataTestLabel + '-WireConductingWidth'"
                :min="1e-9"
                :max="0.1"
                :allowNegative="false"
                :modelValue="localData"
                :forceUpdate="forceUpdate"
                :styleClassInput="'offset-3 col-6'"
                @update="wireUpdated"
            />
            <Dimension class="col-12 mb-1 text-start"
                v-tooltip="tooltipsMagneticBuilder.wireFoilConductingHeight"
                v-if="!loading && localData.type == 'foil'"
                :name="'foilConductingHeight'"
                :replaceTitle="'Cond. Height'"
                :unit="'m'"
                :dataTestLabel="dataTestLabel + '-WireConductingHeight'"
                :min="1e-9"
                :max="0.1"
                :allowNegative="false"
                :modelValue="localData"
                :forceUpdate="forceUpdate"
                :styleClassInput="'offset-3 col-6'"
                @update="wireUpdated"
            />
            <Dimension class="col-12 mb-1 text-start"
                v-tooltip="tooltipsMagneticBuilder.wireFoilConductingWidth"
                v-if="!loading && localData.type == 'foil'"
                :name="'foilConductingWidth'"
                :replaceTitle="'Cond. Width'"
                :unit="'m'"
                :dataTestLabel="dataTestLabel + '-WireConductingWidth'"
                :min="1e-9"
                :max="0.1"
                :allowNegative="false"
                :modelValue="localData"
                :forceUpdate="forceUpdate"
                :styleClassInput="'offset-3 col-6'"
                @update="wireUpdated"
            />

            <div class="col-12">
                <BasicWireInfo 
                    v-if="!loading"
                    :dataTestLabel="dataTestLabel + '-BasicWireInfo'"
                    :wire="masStore.mas.magnetic.coil.functionalDescription[windingIndex].wire"
                    :windingIndex="windingIndex"
                />
            </div>

            <BasicWireSubmenu class="col-12 mb-1 text-start"
                :dataTestLabel="dataTestLabel + '-BasicWireSubmenu'"
                :enableCustomize="false"
                :severalWires="masStore.mas.magnetic.coil.functionalDescription.length > 1"
                @adviseWire="adviseWireRequested"
                @adviseAllWires="adviseAllWiresRequested"
                @customizeCore="customizeWire"
                @loadCore="loadWire"
            />

            <label class="text-danger col-12 pt-1" style="font-size: 1em">{{errorMessages}}</label>

        </div>
    </div>
</template>
