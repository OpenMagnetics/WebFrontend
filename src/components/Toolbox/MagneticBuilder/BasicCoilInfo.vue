<script setup>
import { useMasStore } from '/src/stores/mas'
import { removeTrailingZeroes, deepCopy, isMobile } from '/src/assets/js/utils.js'
import DimensionReadOnly from '/src/components/DataInput/DimensionReadOnly.vue'
import WindingSelector from '/src/components/Toolbox/MagneticBuilder/WindingSelector.vue'
import { tooltipsMagneticBuilder } from '/src/assets/js/texts.js'
</script>

<script>

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
        core: {
            type: Object,
            required: true,
        },
    },
    data() {
        const masStore = useMasStore();
        const outputsData = {};
        const selectedWindingIndex = 0;
        const loading = false;
        const recentChange = false;
        const tryingToSend = false;
        const lastSimulatedInputs = "";
        const lastSimulatedMagnetics = "";
        const lastSimulatedModels = "";

        return {
            masStore,
            outputsData,
            selectedWindingIndex,
            recentChange,
            tryingToSend,
            loading,
            lastSimulatedInputs,
            lastSimulatedMagnetics,
            lastSimulatedModels,
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
        'core': {
            handler(newValue, oldValue) {
                this.tryToSimulate();
                this.recentChange = true;
                this.loading = true;
            },
          deep: true
        },
        'masStore.mas.magnetic.coil.functionalDescription': {
            handler(newValue, oldValue) {
                this.tryToSimulate();
                this.recentChange = true;
                this.loading = true;
            },
          deep: true
        },
    },
    mounted () {
        this.loading = true;
        this.recentChange = true;
        this.tryToSimulate();
    },
    methods: {
        tryToSimulate() {
            if (!this.tryingToSend) {
                this.recentChange = false
                this.tryingToSend = true
                setTimeout(() => {
                    if (this.recentChange) {
                        this.tryingToSend = false
                        this.tryToSimulate()
                    }
                    else {
                        this.simulate();
                    }
                }
                , 100);
            }
        },
        simulate() {
            if (this.core['functionalDescription']['shape'] != "" && this.core['functionalDescription']['material'] != "") {
                this.$mkf.ready.then(_ => {

                    if (!('gapReluctance' in this.$userStore.selectedModels)) {
                        this.$userStore.selectedModels['gapReluctance'] = Defaults.reluctanceModelDefault
                    }
                    if (!('coreLosses' in this.$userStore.selectedModels)) {
                        this.$userStore.selectedModels['coreLosses'] = Defaults.coreLossesModelDefault
                    }
                    if (!('coreTemperature' in this.$userStore.selectedModels)) {
                        this.$userStore.selectedModels['coreTemperature'] = Defaults.coreTemperatureModelDefault
                    }
                    const modelsData = {coreLosses: this.$userStore.selectedModels['coreLosses'].toUpperCase(),
                                  coreTemperature: this.$userStore.selectedModels['coreTemperature'].toUpperCase(),
                                  gapReluctance: this.$userStore.selectedModels['gapReluctance'].toUpperCase().replace(" ", "_")};

                    const inputsString = JSON.stringify(this.masStore.mas.inputs);
                    const magneticsString = JSON.stringify(this.masStore.mas.magnetic);
                    const modelsString = JSON.stringify(modelsData);

                    if (inputsString != this.lastSimulatedInputs || magneticsString != this.lastSimulatedMagnetics || modelsString != this.lastSimulatedModels) {
                        const result = this.$mkf.simulate(inputsString,
                                                      magneticsString,
                                                      modelsString);

                        this.lastSimulatedInputs = inputsString;
                        this.lastSimulatedMagnetics = magneticsString;
                        this.lastSimulatedModels = modelsString;

                        if (result.startsWith("Exception")) {
                            this.tryingToSend = false;
                            this.loading = false;
                            console.error(result);
                            return;
                        }
                        else {
                            const mas = JSON.parse(result);
                            this.outputsData.proximityLosses = 0;
                            this.outputsData.ohmicLosses = 0;
                            this.outputsData.acLosses = 0;
                            this.outputsData.skinLosses = 0;
                            this.outputsData.dcResistancePerWinding = [];
                            this.outputsData.effectiveResistancePerWinding = [];
                            this.outputsData.proximityLossesPerWinding = [];
                            this.outputsData.ohmicLossesPerWinding = [];
                            this.outputsData.skinLossesPerWinding = [];
                            this.outputsData.windingLossesPerWinding = [];
                            this.outputsData.leakageInductancePerWinding = [0];
                            for (var windingIndex = 0; windingIndex < this.masStore.mas.magnetic.coil.functionalDescription.length; windingIndex++) {
                                var proximityLosses = mas.outputs[0].windingLosses.windingLossesPerWinding[windingIndex].proximityEffectLosses.lossesPerHarmonic.reduce((a, c) => {return a + c}, 0);
                                this.outputsData.proximityLossesPerWinding.push(proximityLosses);
                                var skinLosses = mas.outputs[0].windingLosses.windingLossesPerWinding[windingIndex].skinEffectLosses.lossesPerHarmonic.reduce((a, c) => {return a + c}, 0);
                                var ohmicLosses = mas.outputs[0].windingLosses.windingLossesPerWinding[windingIndex].ohmicLosses.losses;
                                this.outputsData.proximityLosses += proximityLosses;
                                this.outputsData.ohmicLosses += ohmicLosses;
                                this.outputsData.skinLosses += skinLosses;
                                this.outputsData.acLosses += skinLosses + proximityLosses;
                                this.outputsData.ohmicLossesPerWinding.push(ohmicLosses);
                                this.outputsData.skinLossesPerWinding.push(skinLosses);
                                this.outputsData.windingLossesPerWinding.push(proximityLosses + skinLosses + ohmicLosses);
                                this.outputsData.dcResistancePerWinding.push(mas.outputs[0].windingLosses.dcResistancePerWinding[windingIndex]);
                            }

                            console.warn()

                            for (var windingIndex = 0; windingIndex < this.masStore.mas.magnetic.coil.functionalDescription.length - 1; windingIndex++) {
                                var leakageInductance = mas.outputs[0].leakageInductance.leakageInductancePerWinding[windingIndex].nominal;
                                this.outputsData.leakageInductancePerWinding.push(leakageInductance);
                                this.outputsData.effectiveResistancePerWinding.push(this.outputsData.windingLossesPerWinding[windingIndex] / Math.pow(this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[windingIndex].current.processed.rms));
                            }

                            // this.outputsData.proximityLossesPerWinding = mas.outputs[0].windingLosses.windingLossesPerWinding[];
                            this.outputsData.windingLosses = mas.outputs[0].windingLosses.windingLosses;
                            this.outputsData.totalLosses = mas.outputs[0].windingLosses.windingLosses + mas.outputs[0].coreLosses.coreLosses;
                            this.masStore.mas.outputs = deepCopy(mas.outputs);
                            this.tryingToSend = false;
                            this.loading = false;
                        }
                    }
                    else {
                        this.tryingToSend = false;
                        this.loading = false;
                    }
                })
            }
        },
        windingIndexChanged(windingIndex) {
            this.selectedWindingIndex = windingIndex;
        },
    }
}
</script>

<template>
    <h5 v-if="core['functionalDescription']['material'] == null" class="text-danger my-2">Select core material</h5>

    <img :data-cy="dataTestLabel + '-BasicCoilInfo-loading'" v-if="loading" class="mx-auto d-block col-12" alt="loading" style="width: 60%; height: auto;" :src="loadingGif">

    <div v-else class="container-flex text-white mt-2 mb-3 pb-3 border-bottom border-top pt-2">
        <div class="row" v-tooltip="styleTooltip">
            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.windingLosses"
                v-if="outputsData.windingLosses != null"
                class="col-xl-6 col-lg-12 text-start"
                :name="'P'"
                :subscriptName="'winding'"
                :unit="'W'"
                :power="1"
                :dataTestLabel="dataTestLabel + '-WindingLosses'"
                :numberDecimals="2"
                :value="outputsData.windingLosses"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />
            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.totalLosses"
                v-if="outputsData.totalLosses != null"
                :class="isMobile()? '' : 'border-start'"
                class="col-xl-6 col-lg-12 text-start"
                :name="'P'"
                :subscriptName="'total'"
                :unit="'W'"
                :power="1"
                :dataTestLabel="dataTestLabel + '-TotalLosses'"
                :numberDecimals="2"
                :value="outputsData.totalLosses"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />
            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.ohmicLosses"
                v-if="outputsData.ohmicLosses != null"
                class="col-xl-6 col-lg-12 text-start"
                :name="'P'"
                :subscriptName="'DC'"
                :unit="'W'"
                :power="1"
                :dataTestLabel="dataTestLabel + '-OhmicLosses'"
                :numberDecimals="2"
                :value="outputsData.ohmicLosses"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />
            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.acLosses"
                v-if="outputsData.acLosses != null"
                :class="isMobile()? '' : 'border-start'"
                class="col-xl-6 col-lg-12 text-start"
                :name="'P'"
                :subscriptName="'AC'"
                :unit="'W'"
                :power="1"
                :dataTestLabel="dataTestLabel + '-AcLosses'"
                :numberDecimals="2"
                :value="outputsData.acLosses"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />
            <div class="col-12 mt-3 mb-2 p-0">
                <WindingSelector
                    :dataTestLabel="`${dataTestLabel}-WindingSelector`"
                    :coil="masStore.mas.magnetic.coil"
                    @windingIndexChanged="windingIndexChanged"
                />
            </div>
            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.ohmicLossesPerWinding"
                v-if="outputsData.ohmicLossesPerWinding != null"
                class="col-xl-6 col-lg-12 text-start"
                :name="'P'"
                :subscriptName="'DC'"
                :unit="'W'"
                :power="1"
                :dataTestLabel="dataTestLabel + '-OhmicLossesPerWinding'"
                :numberDecimals="2"
                :value="outputsData.ohmicLossesPerWinding[selectedWindingIndex]"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />
            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.skinLossesPerWinding"
                v-if="outputsData.skinLossesPerWinding != null"
                :class="isMobile()? '' : 'border-start'"
                class="col-xl-6 col-lg-12 text-start"
                :name="'P'"
                :subscriptName="'skin'"
                :unit="'W'"
                :power="1"
                :dataTestLabel="dataTestLabel + '-SkinLossesPerWinding'"
                :numberDecimals="2"
                :value="outputsData.skinLossesPerWinding[selectedWindingIndex]"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />
            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.proximityLossesPerWinding"
                v-if="outputsData.proximityLossesPerWinding != null"
                class="col-xl-6 col-lg-12 text-start"
                :name="'P'"
                :subscriptName="'prox.'"
                :unit="'W'"
                :power="1"
                :dataTestLabel="dataTestLabel + '-ProximityLossesPerWinding'"
                :numberDecimals="2"
                :value="outputsData.proximityLossesPerWinding[selectedWindingIndex]"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />

            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.windingLossesPerWinding"
                v-if="outputsData.windingLossesPerWinding != null"
                :class="isMobile()? '' : 'border-start'"
                class="col-xl-6 col-lg-12 text-start"
                :name="'P'"
                :subscriptName="'winding'"
                :unit="'W'"
                :power="1"
                :dataTestLabel="dataTestLabel + '-WindingLossesPerWinding'"
                :numberDecimals="2"
                :value="outputsData.windingLossesPerWinding[selectedWindingIndex]"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />

            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.dcResistancePerWinding"
                v-if="outputsData.dcResistancePerWinding != null"
                class="col-xl-6 col-lg-12 text-start"
                :name="'R'"
                :subscriptName="'DC'"
                :unit="'Ω'"
                :power="1"
                :dataTestLabel="dataTestLabel + '-DcResistancePerWinding'"
                :numberDecimals="2"
                :value="outputsData.dcResistancePerWinding[selectedWindingIndex]"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />
            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.effectiveResistancePerWinding"
                v-if="outputsData.effectiveResistancePerWinding != null"
                :class="isMobile()? '' : 'border-start'"
                class="col-xl-6 col-lg-12 text-start"
                :name="'R'"
                :subscriptName="'eff'"
                :unit="'H'"
                :power="1"
                :dataTestLabel="dataTestLabel + '-EffectiveResistancePerWinding'"
                :numberDecimals="2"
                :value="outputsData.effectiveResistancePerWinding[selectedWindingIndex]"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />
            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.leakageInductanceReflectedToPrimary"
                v-if="outputsData.leakageInductancePerWinding != null && selectedWindingIndex > 0"
                class="col-xl-6 col-lg-12 text-start"
                :name="'L'"
                :subscriptName="'lk'"
                :unit="'H'"
                :power="1"
                :dataTestLabel="dataTestLabel + '-LeakageInductancePerWinding'"
                :numberDecimals="2"
                :value="outputsData.leakageInductancePerWinding[selectedWindingIndex]"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />

        </div>
    </div>
</template>