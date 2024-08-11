<script setup>
import { useMasStore } from '/src/stores/mas'
import ElementFromList from '/src/components/DataInput/ElementFromList.vue'
import Dimension from '/src/components/DataInput/Dimension.vue'
import CoreGappingSelector from '/src/components/Common/CoreGappingSelector.vue'
import Submenu from '/src/components/Toolbox/MagneticBuilder/Submenu.vue'
import { useDataCacheStore } from '/src/stores/dataCache'
import { toTitleCase } from '/src/assets/js/utils.js'
</script>

<script>
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
    },
    data() {
        const dataCacheStore = useDataCacheStore();
        const masStore = useMasStore();
        const forceUpdate = 0; 
        const wireTypes = {};
        const wireConductingDiameters = [];
        const wireHeights = [];
        const wireWidths = [];
        const wireStandards = []; 
        const wireCoatings = []; 
        var localData = {
            type: null,
            standard: null,
            roundConductingDiameter: null,
            litzStrandConductingDiameter: null,
            coating: null,
            numberConductors: null,
            rectangularConductingHeight: null,
            rectangularConductingWidth: null,
            foilConductingHeight: null,
            foilConductingWidth: null,
        };
        if (typeof(masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire) == 'string') {
            this.$mkf.ready.then(_ => {
                masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire = JSON.parse(this.$mkf.get_wire_data(JSON.stringify(masStore.mas.magnetic.coil.functionalDescription[this.windingIndex])));

            });
        }

        return {
            dataCacheStore,
            masStore,
            localData,
            wireTypes,
            wireConductingDiameters,
            wireHeights,
            wireWidths,
            wireStandards,
            wireCoatings,
            forceUpdate,
        }
    },
    computed: {
    },
    watch: { 
    },
    mounted () {
        this.assignLocalData(this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire);
    },
    methods: {
        assignLocalData(wire) {
            this.$mkf.ready.then(_ => {
                        console.log("assignLocalData")
                this.localData["type"] = wire.type;
                if (wire.type == "round") {
                    this.localData["standard"] = wire.standard;
                    this.localData["roundConductingDiameter"] = wire.standardName;
                    this.localData["coating"] = this.$mkf.get_coating_label(JSON.stringify(wire));
                }
                else if (wire.type == "litz") {
                    if (typeof(wire.strand) == 'string') {
                        this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire.strand = JSON.parse(this.$mkf.get_wire_data_by_name(wire.strand));
                    }
                    console.log(wire.strand)
                    this.localData["litzStrandConductingDiameter"] = wire.strand.standardName;
                    this.localData["numberConductors"] = wire.numberConductors;
                }
                else if (wire.type == "rectangular") {
                    this.localData["rectangularConductingHeight"] = this.$mkf.resolve_dimension_with_tolerance(JSON.stringify(wire.conductingHeight));
                    this.localData["rectangularConductingWidth"] = this.$mkf.resolve_dimension_with_tolerance(JSON.stringify(wire.conductingWidth));
                }
                else if (wire.type == "foil") {
                    this.localData["foilConductingHeight"] = this.masStore.mas.magnetic.coil.bobbin.processedDescription.windingWindows[0].height * 0.9 // hardcoded;
                    this.localData["foilConductingWidth"] = this.$mkf.resolve_dimension_with_tolerance(JSON.stringify(wire.conductingWidth));
                }
                this.localData["coating"] = this.$mkf.get_coating_label(JSON.stringify(wire));
                this.forceUpdate += 1;
                this.getWireTypes();
                this.getWireStandards();
                this.getWireDiameters();
                this.getWireCoatings();
            });
        },
        assignWire() {
            // this.$mkf.ready.then(_ => {
            //     if (this.localData["type"] == "round") {
            //         this.localData["standard"] = wire.standard;
            //         this.localData["roundConductingDiameter"] = wire.standardName;
            //         this.localData["coating"] = this.$mkf.get_coating_label(JSON.stringify(wire));
            //     }
            //     else if (wire.type == "litz") {
            //         if (typeof(wire.strand) == 'string') {
            //             masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire.strand = JSON.parse(this.$mkf.get_wire_data_by_name(wire.strand));
            //         }
            //         this.localData["litzStrandConductingDiameter"] = wire.strand.standardName;
            //         this.localData["numberConductors"] = wire.numberConductors;
            //     }
            //     else if (wire.type == "rectangular") {
            //         this.localData["rectangularConductingHeight"] = wire.conductingHeight;
            //         this.localData["rectangularConductingWidth"] = wire.conductingWidth;
            //     }
            //     else if (wire.type == "foil") {
            //         this.localData["foilConductingHeight"] = wire.conductingHeight;
            //         this.localData["foilConductingWidth"] = wire.conductingWidth;
            //     }
            //     this.localData["coating"] = this.$mkf.get_coating_label(JSON.stringify(wire));
            //     this.forceUpdate += 1;
            // });
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
                for (var i = wireStandardsHandle.size() - 1; i >= 0; i--) {
                    const standard = wireStandardsHandle.get(i);
                    this.wireStandards.push(standard);
                }

            });
        },
        getWireDiameters() {
            console.log("Starting getWireDiameters")
            if (this.dataCacheStore.wireData.wireConductingDiametersPerStandard[this.localData.standard] != null && this.dataCacheStore.isWireDataValid()) {
                this.wireConductingDiameters = this.dataCacheStore.wireData.wireConductingDiametersPerStandard[this.localData.standard];
            console.log("Finished getWireDiameters")
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
            console.log("Finished getWireDiameters")
                });
            }
        },
        getWireCoatings() {
            console.log("Starting getWireCoatings")
            if (this.dataCacheStore.wireData.wireCoatingsPerWireType[this.localData.type] != null &&
                this.dataCacheStore.isWireDataValid()) {
                this.wireCoatings = this.dataCacheStore.wireData.wireCoatingsPerWireType[this.localData.type];
            console.log("Finished getWireCoatings")
            }
            else {
                this.$mkf.ready.then(_ => {
                    const aux = {};
                    const wireCoatingsHandle = this.$mkf.get_coating_labels_by_type(JSON.stringify(this.localData.type));

                    this.wireCoatings = [];
                    for (var i = wireCoatingsHandle.size() - 1; i >= 0; i--) {
                        const wireCoating = wireCoatingsHandle.get(i);
                        this.wireCoatings.push(wireCoating);
                    }
                    this.dataCacheStore.wireData.wireCoatingsPerWireType[this.localData.type] = this.wireCoatings;
            console.log("Finished getWireCoatings")
                });
            }
        },
        wireStandardUpdated() {
            this.getWireDiameters();
        },
        wireCoatingUpdated() {
            this.$mkf.ready.then(_ => {
                this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire.coating = JSON.parse(this.$mkf.get_wire_coating_by_label(this.localData.coating));
            });
        },
        conductingDiameterUpdated() {
            // this.$mkf.ready.then(_ => {
            //     this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire.conductingDiameter = this.$mkf.get_wire_conducting_diameter_by_standard_name(this.localData.conductingDiameter);
            //     console.log(this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire.conductingDiameter)
            // });
        },
        wireUpdated() {
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
            const newType = this.localData.type;
            const oldType = this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire.type;
            const effectiveFrequency = this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0].current.processed.effectiveFrequency;

            this.$mkf.ready.then(_ => {
                if ((newType == "litz" && !this.isAnyLitzLoaded()) ||
                    (newType == "round" && !this.isAnyRoundLoaded()) ||
                    (newType == "rectangular" && !this.isAnyRectangularLoaded()) ||
                    (newType == "foil" && !this.isAnyFoilLoaded())) {
                    const wire = JSON.parse(this.$mkf.get_equivalent_wire(JSON.stringify(this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire), JSON.stringify(newType), effectiveFrequency));
                    this.assignLocalData(wire);
                }
            });
        },
        strandUpdated() {
        },
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            {{localData}}
            <ElementFromList
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
            <ElementFromList
                v-if="localData.type == 'round' || localData.type == 'litz' && localData.standard != null"
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
                v-if="localData.type == 'round' && localData.roundConductingDiameter != null"
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
                @update="conductingDiameterUpdated"
            />
            <ElementFromList
                v-if="localData.type == 'litz' && localData.litzStrandConductingDiameter != null"
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
                @update="strandUpdated"
            />
            <ElementFromList
                v-if="localData.coating != null"
                class="col-12 mb-1 text-start"
                :dataTestLabel="dataTestLabel + '-WireCoating'"
                :name="'coating'"
                :titleSameRow="true"
                :justifyContent="true"
                :labelStyleClass="'col-5'"
                :selectStyleClass="'col-7'"
                v-model="localData"
                :options="wireCoatings"
                @update="wireCoatingUpdated"
            />
            <Dimension class="col-12 mb-1 text-start"
                v-if="localData.type == 'litz' && localData.numberConductors != null"
                :name="'numberConductors'"
                :replaceTitle="'No. Strands'"
                :unit="null"
                :dataTestLabel="dataTestLabel + '-NumberConductors'"
                :min="1"
                :max="1000000"
                :allowNegative="false"
                :modelValue="localData"
                :forceUpdate="forceUpdate"
                :styleClassInput="'offset-6'"
                @update="wireUpdated"
            />
            <Dimension class="col-12 mb-1 text-start"
                v-if="localData.type == 'rectangular' && localData.rectangularConductingHeight != null"
                :name="'rectangularConductingHeight'"
                :replaceTitle="'Cond. Height'"
                :unit="'m'"
                :dataTestLabel="dataTestLabel + '-WireConductingHeight'"
                :min="1e-9"
                :max="0.1"
                :allowNegative="false"
                :modelValue="localData"
                :forceUpdate="forceUpdate"
                :styleClassInput="'offset-3'"
                @update="wireUpdated"
            />
            <Dimension class="col-12 mb-1 text-start"
                v-if="localData.type == 'rectangular' && localData.rectangularConductingWidth != null"
                :name="'rectangularConductingWidth'"
                :replaceTitle="'Cond. Width'"
                :unit="'m'"
                :dataTestLabel="dataTestLabel + '-WireConductingWidth'"
                :min="1e-9"
                :max="0.1"
                :allowNegative="false"
                :modelValue="localData"
                :forceUpdate="forceUpdate"
                :styleClassInput="'offset-3'"
                @update="wireUpdated"
            />
            <Dimension class="col-12 mb-1 text-start"
                v-if="localData.type == 'foil' && localData.foilConductingHeight != null"
                :name="'foilConductingHeight'"
                :replaceTitle="'Cond. Height'"
                :unit="'m'"
                :dataTestLabel="dataTestLabel + '-WireConductingHeight'"
                :min="1e-9"
                :max="0.1"
                :allowNegative="false"
                :modelValue="localData"
                :forceUpdate="forceUpdate"
                :styleClassInput="'offset-3'"
                @update="wireUpdated"
            />
            <Dimension class="col-12 mb-1 text-start"
                v-if="localData.type == 'foil' && localData.foilConductingWidth != null"
                :name="'foilConductingWidth'"
                :replaceTitle="'Cond. Width'"
                :unit="'m'"
                :dataTestLabel="dataTestLabel + '-WireConductingWidth'"
                :min="1e-9"
                :max="0.1"
                :allowNegative="false"
                :modelValue="localData"
                :forceUpdate="forceUpdate"
                :styleClassInput="'offset-3'"
                @update="wireUpdated"
            />

            <Submenu class="col-12 mb-1 text-start"
                :dataTestLabel="dataTestLabel + '-Submenu'"
                :name="'wire'"
            />


        </div>
    </div>
</template>
