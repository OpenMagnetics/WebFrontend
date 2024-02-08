<script setup>
import { useMasStore } from '/src/stores/mas'
import { toTitleCase, removeTrailingZeroes, formatInductance, formatPower, formatTemperature, formatResistance} from '/src/assets/js/utils.js'
import Module from '/src/assets/js/libAdvisers.wasm.js'
</script>

<script>

var magneticAdviser = {
    ready: new Promise(resolve => {
        Module({
            onRuntimeInitialized () {
                magneticAdviser = Object.assign(this, {
                    ready: Promise.resolve()
                });
                resolve();
            }
        });
    })
};

export default {
    components: {
    },
    props: {
        modelValue:{
            type: Object,
            required: true
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const localTexts = {};
        const masStore = useMasStore();


        return {
            localTexts,
            masStore,
            posting: false,
            zoomingPlot: false,
            showFieldPlot: false,
        }
    },
    watch: {
        modelValue(newValue, oldValue) {
            this.posting = true;
            this.processLocalTexts()
            setTimeout(() => {this.calculaLeakageInductance();}, 10);
            setTimeout(() => {this.calculaCorePlot();}, 10);

        },
    },
    methods: {
        calculaLeakageInductance() {
            if (this.modelValue.magnetic.coil.functionalDescription.length > 1) {
                magneticAdviser.ready.then(_ => {

                    const leakageInductaceOutput = JSON.parse(magneticAdviser.calculate_leakage_inductance(JSON.stringify(this.modelValue.inputs.operatingPoints[0]), JSON.stringify(this.modelValue.magnetic)));

                    const aux = formatInductance(leakageInductaceOutput.leakageInductancePerWinding[0].nominal);
                    this.localTexts.leakageInductaceTable[1].value = `${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`;
                })
            }   
        },
        calculaCoreAndFieldPlot() {
            this.posting = true;
            const url = import.meta.env.VITE_API_ENDPOINT + '/plot_core_and_fields'

            this.$refs.plotView.innerHTML = ""
            this.$refs.zoomPlotView.innerHTML = ""
            this.$axios.post(url, {magnetic: this.modelValue.magnetic, operatingPoint: this.modelValue.inputs.operatingPoints[0]})
            .then(response => {
                this.$refs.plotView.innerHTML = response.data
                this.$refs.zoomPlotView.innerHTML = response.data
                this.$refs.zoomPlotView.innerHTML = this.$refs.zoomPlotView.innerHTML.replace(`<svg`, `<svg class="h-75 w-100"`);
                this.posting = false;
            })
            .catch(error => {
                this.posting = false;
                console.error("Error loading inventory")
                console.error(error)
            });
        },
        calculaCorePlot() {
            this.posting = true;
            const url = import.meta.env.VITE_API_ENDPOINT + '/plot_core'

            this.$refs.plotView.innerHTML = ""
            this.$refs.zoomPlotView.innerHTML = ""
            this.$axios.post(url, {magnetic: this.modelValue.magnetic, operatingPoint: this.modelValue.inputs.operatingPoints[0]})
            .then(response => {
                this.$refs.plotView.innerHTML = response.data
                this.$refs.zoomPlotView.innerHTML = response.data
                this.$refs.zoomPlotView.innerHTML = this.$refs.zoomPlotView.innerHTML.replace(`<svg`, `<svg class="h-75 w-100"`);
                this.posting = false;
            })
            .catch(error => {
                this.posting = false;
                console.error("Error loading inventory")
                console.error(error)
            });
        },

        processMagneticTexts(data) {
            const localTexts = {
                coreDescription: null,
                coreMaterial: null,

                coreGapping: null,
                effectiveParametersTable: null,

                numberTurns: null,
                numberEstimatedLayers: null,

                coreLossesTable: [
                    {
                        text: null,
                        value: null,
                    }
                ],
                dcResistanceTable: [
                    {
                        text: null,
                        value: null,
                    }
                ],
                magnetizingInductanceTable: [
                    {
                        text: null,
                        value: null,
                    }
                ],
                windingLossesTable: [
                    {
                        text: null,
                        value: null,
                    }
                ],
                coreTemperatureTable: [
                    {
                        text: null,
                        value: null,
                    }
                ],

                manufacturer: null,
            };
            if (data.magnetic.manufacturerInfo == null) {
                return null;
            }
            const numberTurnsPrimary = data.magnetic.coil.functionalDescription[0].numberTurns;
            {
                var materialName;
                if (typeof data.magnetic.core.functionalDescription.material === 'string' || data.magnetic.core.functionalDescription.material instanceof String) {
                    materialName = data.magnetic.core.functionalDescription.material;
                }
                else {
                    materialName = data.magnetic.core.functionalDescription.material.name;
                }
                localTexts.coreDescription = `Magnetic with a ${data.magnetic.core.functionalDescription.shape.name} material ${materialName} core`
                if (data.magnetic.core.functionalDescription.gapping.length == 0) {
                    localTexts.coreDescription += ', ungapped.'
                }
                else if (data.magnetic.core.functionalDescription.gapping.length == data.magnetic.core.processedDescription.columns.length) {
                    if (data.magnetic.core.functionalDescription.gapping[0].type == 'residual') {
                        localTexts.coreDescription += ', ungapped.'
                    }
                    else {
                        localTexts.coreDescription += `, with a grinded gap of ${removeTrailingZeroes(data.magnetic.core.functionalDescription.gapping[0].length * 1000, 5)} mm.`
                    }
                }
                else if (data.magnetic.core.functionalDescription.gapping.length > data.magnetic.core.processedDescription.columns.length) {
                    localTexts.coreDescription += `, with a distributed gap of ${removeTrailingZeroes(data.magnetic.core.functionalDescription.gapping[0].length * 1000, 5)} mm.`
                }
            }

            {
                localTexts.numberTurns = `Using ${removeTrailingZeroes(data.magnetic.coil.functionalDescription[0].numberTurns)} turns will produce a magnetic with the following estimated output per operating point:`
            }

            localTexts.magnetizingInductanceTable = [];
            localTexts.coreLossesTable = [];
            localTexts.coreTemperatureTable = [];
            localTexts.dcResistanceTable = [];
            localTexts.windingLossesTable = [];
            localTexts.windingOhmicLossesTable = [];
            localTexts.windingSkinLossesTable = [];
            localTexts.windingProximityLossesTable = [];
            localTexts.numberTurnsTable = [];
            localTexts.numberParallelsTable = [];
            localTexts.turnsRatioTable = [];
            localTexts.leakageInductaceTable = [];

            for (var windingIndex = 0; windingIndex < data.magnetic.coil.functionalDescription.length; windingIndex++) {
                localTexts.numberTurnsTable.push({text: data.magnetic.coil.functionalDescription[windingIndex].name,
                                                  value: data.magnetic.coil.functionalDescription[windingIndex].numberTurns});
                localTexts.numberParallelsTable.push({text: data.magnetic.coil.functionalDescription[windingIndex].name,
                                                  value: data.magnetic.coil.functionalDescription[windingIndex].numberParallels});
                if (windingIndex != 0) {
                    localTexts.turnsRatioTable.push({text: data.magnetic.coil.functionalDescription[windingIndex].name,
                                                     value: data.magnetic.coil.functionalDescription[0].numberTurns / data.magnetic.coil.functionalDescription[windingIndex].numberTurns});
                }
                else {
                    localTexts.turnsRatioTable.push({text: data.magnetic.coil.functionalDescription[windingIndex].name,
                                                     value: ""});
                }                
                if (windingIndex != 0) {
                    localTexts.leakageInductaceTable.push({text: data.magnetic.coil.functionalDescription[windingIndex].name,
                                                     value: ""});
                }
                else {
                    localTexts.leakageInductaceTable.push({text: data.magnetic.coil.functionalDescription[windingIndex].name,
                                                     value: ""});
                }

            }


            for (var operatingPointIndex = 0; operatingPointIndex < data.inputs.operatingPoints.length; operatingPointIndex++) {
                localTexts.magnetizingInductanceTable.push({text: null, value: null});
                localTexts.coreLossesTable.push({text: null, value: null});
                localTexts.coreTemperatureTable.push({text: null, value: null});
                const dcResistanceTablePerWinding = []
                const windingLossesTablePerWinding = []
                const windingOhmicLossesTablePerWinding = []
                const windingSkinLossesTablePerWinding = []
                const windingProximityLossesTablePerWinding = []
                for (var windingIndex = 0; windingIndex < data.magnetic.coil.functionalDescription.length; windingIndex++) {
                    dcResistanceTablePerWinding.push({text: null, value: null});
                    windingLossesTablePerWinding.push({text: null, value: null});
                    windingOhmicLossesTablePerWinding.push({text: null, value: null});
                    windingSkinLossesTablePerWinding.push({text: null, value: null});
                    windingProximityLossesTablePerWinding.push({text: null, value: null});
                }
                localTexts.dcResistanceTable.push(dcResistanceTablePerWinding);
                localTexts.windingLossesTable.push(windingLossesTablePerWinding);
                localTexts.windingOhmicLossesTable.push(windingOhmicLossesTablePerWinding);
                localTexts.windingSkinLossesTable.push(windingSkinLossesTablePerWinding);
                localTexts.windingProximityLossesTable.push(windingProximityLossesTablePerWinding);

                if (operatingPointIndex < data.outputs.length) {

                    if (data.outputs[operatingPointIndex].magnetizingInductance != null)
                    {
                        const aux = formatInductance(data.outputs[operatingPointIndex].magnetizingInductance.magnetizingInductance.nominal);
                        localTexts.magnetizingInductanceTable[operatingPointIndex].text = 'Mag. Ind.';
                        localTexts.magnetizingInductanceTable[operatingPointIndex].value = `${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`;
                    }
                    if (data.outputs[operatingPointIndex].coreLosses != null)
                    {
                        const aux = formatPower(data.outputs[operatingPointIndex].coreLosses.coreLosses);
                        localTexts.coreLossesTable[operatingPointIndex].text = 'Core losses';
                        localTexts.coreLossesTable[operatingPointIndex].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                    }
                    if (data.outputs[operatingPointIndex].coreLosses != null)
                    {
                        const aux = formatTemperature(data.outputs[operatingPointIndex].coreLosses.temperature);
                        localTexts.coreTemperatureTable[operatingPointIndex].text = 'Core temp.';
                        localTexts.coreTemperatureTable[operatingPointIndex].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                    }
                    if (data.outputs[operatingPointIndex].windingLosses != null & data.outputs[operatingPointIndex].windingLosses.dcResistancePerWinding != null)
                    {
                        for (var windingIndex = 0; windingIndex < data.magnetic.coil.functionalDescription.length; windingIndex++) {
                            const aux = formatResistance(data.outputs[operatingPointIndex].windingLosses.dcResistancePerWinding[windingIndex]);
                            localTexts.dcResistanceTable[operatingPointIndex][windingIndex].text = data.magnetic.coil.functionalDescription[windingIndex].name;
                            localTexts.dcResistanceTable[operatingPointIndex][windingIndex].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                        }
                    }
                    if (data.outputs[operatingPointIndex].windingLosses != null)
                    {
                        for (var windingIndex = 0; windingIndex < data.magnetic.coil.functionalDescription.length; windingIndex++) {
                            const lossesThisWinding = data.outputs[operatingPointIndex].windingLosses.windingLossesPerWinding[windingIndex];
                            const ohmicLossesThisWinding = lossesThisWinding.ohmicLosses.losses;
                            var skinLossesThisWinding = lossesThisWinding.skinEffectLosses.lossesPerHarmonic.reduce((partialSum, a) => partialSum + a, 0);
                            var proximityLossesThisWinding = lossesThisWinding.proximityEffectLosses.lossesPerHarmonic.reduce((partialSum, a) => partialSum + a, 0);
                            const aux = formatPower(ohmicLossesThisWinding + skinLossesThisWinding + proximityLossesThisWinding);
                            const auxOhmicLosses = formatPower(ohmicLossesThisWinding);
                            const auxSkinLosses = formatPower(skinLossesThisWinding);
                            const auxProximityLosses = formatPower(proximityLossesThisWinding);
                            localTexts.windingLossesTable[operatingPointIndex][windingIndex].text = data.magnetic.coil.functionalDescription[windingIndex].name;
                            localTexts.windingLossesTable[operatingPointIndex][windingIndex].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                            localTexts.windingOhmicLossesTable[operatingPointIndex][windingIndex].text = data.magnetic.coil.functionalDescription[windingIndex].name;
                            localTexts.windingOhmicLossesTable[operatingPointIndex][windingIndex].value = `${removeTrailingZeroes(auxOhmicLosses.label, 2)} ${auxOhmicLosses.unit}`;
                            localTexts.windingSkinLossesTable[operatingPointIndex][windingIndex].text = data.magnetic.coil.functionalDescription[windingIndex].name;
                            localTexts.windingSkinLossesTable[operatingPointIndex][windingIndex].value = `${removeTrailingZeroes(auxSkinLosses.label, 2)} ${auxSkinLosses.unit}`;
                            localTexts.windingProximityLossesTable[operatingPointIndex][windingIndex].text = data.magnetic.coil.functionalDescription[windingIndex].name;
                            localTexts.windingProximityLossesTable[operatingPointIndex][windingIndex].value = `${removeTrailingZeroes(auxProximityLosses.label, 2)} ${auxProximityLosses.unit}`;
                        }
                    }
                }
            }


            return localTexts;
        },
        processLocalTexts() {
            this.localTexts = this.processMagneticTexts(this.modelValue);
        },
        zoomIn() {
            this.zoomingPlot = true;
        },
        zoomOut() {
            this.zoomingPlot = false;
        },
        swapFieldPlot() {
            this.showFieldPlot = !this.showFieldPlot;
            if (this.showFieldPlot) {
                this.calculaCoreAndFieldPlot();
            }
            else {
                this.calculaCorePlot();
            }
        },
    },
    computed: {
        offcanvasPosition() {
            if (window.innerWidth < 600) {
                return "offcanvas-bottom"
            }
            else {
                return "offcanvas-end"
            }
        }
    },
    mounted() {
        this.processLocalTexts();
    },
}

</script>

<template>

    <div :class="offcanvasPosition" class="offcanvas  bg-light offcanvas-size-xl" tabindex="-1" id="CoreAdviserDetailOffCanvas" aria-labelledby="CoreAdviserDetailOffCanvasLabel">
    <div class="offcanvas-header">
        <button data-cy="CoreAdviseDetail-corner-close-modal-button" type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="CoreAdviserDetailOffCanvasCanvasClose"></button>
    </div>

    <div class="offcanvas-body">
        <div v-show="zoomingPlot" class="row mx-1" style="height: 100%;">
            <button class="btn" @click="zoomOut()">
                <label class="col-12 text-info fw-lighter" >(Click on image to go back)</label>
                <div data-cy="MagneticAdvise-core-field-plot-zoom-image" ref="zoomPlotView" class="mt-2" style="width: 100%; height: 100%" />
            </button>
        </div>

        <div v-show="!zoomingPlot" v-if="modelValue.magnetic.manufacturerInfo != null" class="row mx-1">
            <h3 class="col-12 p-0 m-0">{{modelValue.magnetic.manufacturerInfo.reference}}</h3>
            <div class="col-12 fs-5 p-0 m-0 mt-2 text-start">{{localTexts.coreDescription}}</div>
            <div class="col-12 fs-5 p-0 m-0 mt-2 text-start">{{localTexts.coreMaterial}}</div>
            <div class="col-7">

                <div class="col-12 fs-5 p-0 m-0 mt-2 text-center">Number turns</div>

                <div class="row" v-for="winding, windingIndex in modelValue.magnetic.coil.functionalDescription">

                    <div v-if="windingIndex == 0" class="col-3 p-0 m-0 border">Windings</div>
                    <div v-if="windingIndex == 0" class="col-3 p-0 m-0 border">No. turns</div>
                    <div v-if="windingIndex == 0" class="col-3 p-0 m-0 border">No. parallels</div>
                    <div v-if="windingIndex == 0" class="col-3 p-0 m-0 border">Turns ratio</div>

                    <div v-if="'numberTurnsTable' in localTexts" class="col-3 p-0 m-0 border">{{localTexts.numberTurnsTable[windingIndex].text}}</div>
                    <div v-if="'numberTurnsTable' in localTexts" class="col-3 p-0 m-0 border">{{localTexts.numberTurnsTable[windingIndex].value}}</div>
                    <div v-if="'numberParallelsTable' in localTexts" class="col-3 p-0 m-0 border">{{localTexts.numberParallelsTable[windingIndex].value}}</div>
                    <div v-if="'turnsRatioTable' in localTexts" class="col-3 p-0 m-0 border">{{localTexts.turnsRatioTable[windingIndex].value}}</div>
                </div>

                <div class="row mt-F mb-2" v-for="operationPoint, operationPointIndex in modelValue.inputs.operatingPoints">
                    <div class="col-12 fs-5 p-0 m-0 my-1">{{operationPoint.name}}</div>
                    <div class="col-12 fs-5 p-0 m-0 mt-2 text-center">Core</div>
                    <div v-if="'magnetizingInductanceTable' in localTexts" class="col-6 p-0 m-0 border">{{localTexts.magnetizingInductanceTable[operationPointIndex].text}}</div>
                    <div v-if="'magnetizingInductanceTable' in localTexts" class="col-6 p-0 m-0 border">{{localTexts.magnetizingInductanceTable[operationPointIndex].value}}</div>
                    <div v-if="'coreLossesTable' in localTexts" class="col-6 p-0 m-0 border">{{localTexts.coreLossesTable[operationPointIndex].text}}</div>
                    <div v-if="'coreLossesTable' in localTexts" class="col-6 p-0 m-0 border">{{localTexts.coreLossesTable[operationPointIndex].value}}</div>
                    <div v-if="'coreTemperatureTable' in localTexts" class="col-6 p-0 m-0 border">{{localTexts.coreTemperatureTable[operationPointIndex].text}}</div>
                    <div v-if="'coreTemperatureTable' in localTexts" class="col-6 p-0 m-0 border">{{localTexts.coreTemperatureTable[operationPointIndex].value}}</div>
                    <div class="col-12 fs-5 p-0 m-0 mt-2 text-center">Coil</div>
                    <div class="row" v-for="winding, windingIndex in modelValue.magnetic.coil.functionalDescription">

                        <div v-if="windingIndex == 0" class="col-3 p-0 m-0 border">Windings</div>
                        <div v-if="windingIndex == 0" class="col-3 p-0 m-0 border">DC Res.</div>
                        <div v-if="windingIndex == 0" class="col-3 p-0 m-0 border">Wind. Loss</div>
                        <div v-if="windingIndex == 0" class="col-3 p-0 m-0 border">Leak. Ind.</div>

                        <div v-if="'windingLossesTable' in localTexts" class="col-3 p-0 m-0 border">{{localTexts.windingLossesTable[operationPointIndex][windingIndex].text}}</div>
                        <div v-if="'dcResistanceTable' in localTexts" class="col-3 p-0 m-0 border">{{localTexts.dcResistanceTable[operationPointIndex][windingIndex].value}}</div>
                        <div v-if="'windingLossesTable' in localTexts" class="col-3 p-0 m-0 border">{{localTexts.windingLossesTable[operationPointIndex][windingIndex].value}}</div>
                        <div v-if="'leakageInductaceTable' in localTexts" class="col-3 p-0 m-0 border">{{localTexts.leakageInductaceTable[windingIndex].value}}</div>
                    </div>
                    <div class="col-12 fs-5 p-0 m-0 mt-2 text-center">Windings Losses Breakdown</div>
                    <div class="row" v-for="winding, windingIndex in modelValue.magnetic.coil.functionalDescription">

                        <div v-if="windingIndex == 0" class="col-3 p-0 m-0 border">Windings</div>
                        <div v-if="windingIndex == 0" class="col-3 p-0 m-0 border">Ohmic Loss</div>
                        <div v-if="windingIndex == 0" class="col-3 p-0 m-0 border">Skin Loss</div>
                        <div v-if="windingIndex == 0" class="col-3 p-0 m-0 border">Prox. Loss</div>

                        <div v-if="'windingOhmicLossesTable' in localTexts" class="col-3 p-0 m-0 border">{{localTexts.windingOhmicLossesTable[operationPointIndex][windingIndex].text}}</div>
                        <div v-if="'windingOhmicLossesTable' in localTexts" class="col-3 p-0 m-0 border">{{localTexts.windingOhmicLossesTable[operationPointIndex][windingIndex].value}}</div>
                        <div v-if="'windingSkinLossesTable' in localTexts" class="col-3 p-0 m-0 border">{{localTexts.windingSkinLossesTable[operationPointIndex][windingIndex].value}}</div>
                        <div v-if="'windingProximityLossesTable' in localTexts" class="col-3 p-0 m-0 border">{{localTexts.windingProximityLossesTable[operationPointIndex][windingIndex].value}}</div>
                    </div>
                </div>
            </div>
                
            <div class="col-5">
                <img data-cy="CorePublish-loading" v-if="posting" class="mx-auto d-block" alt="loading" style="width: 150px; height: auto;" src="/images/loading.gif">

                <div v-show="!posting">
                    <div class="col-12 fs-5 p-0 m-0 mt-2 text-center">Core Coil and H Field</div>
                    <button class="btn" @click="zoomIn()">
                        <label class="col-12 text-info fw-lighter">(Click on image to zoom out)</label>
                        <div data-cy="MagneticAdvise-core-field-plot-image" ref="plotView" class="col-12 mt-2" style="height: 100%;" />
                    </button>
                    <button class="btn btn-primary" @click="swapFieldPlot()">{{showFieldPlot? 'Hide H field' : 'Show H field'}}</button>
                </div>
            </div>
        </div>
    </div>
</div>

</template>

<style>
.offcanvas-size-xxl {
    --bs-offcanvas-width: 50vw !important;
}
.offcanvas-size-xl {
    --bs-offcanvas-width: 50vw !important;
    --bs-offcanvas-height: 60vh !important;
}
.offcanvas-size-lg {
    --bs-offcanvas-width: 50vw !important;
    --bs-offcanvas-height: 60vh !important;
}
.offcanvas-size-md { /* add Responsivenes to default offcanvas */
    --bs-offcanvas-width: 50vw !important;
    --bs-offcanvas-height: 60vh !important;
}
.offcanvas-size-sm {
    --bs-offcanvas-width: 50vw !important;
    --bs-offcanvas-height: 60vh !important;
}
.offcanvas-size-xs {
    --bs-offcanvas-width: 50vw !important;
    --bs-offcanvas-height: 60vh !important;
}
.offcanvas-size-xxs {
    --bs-offcanvas-width: 50vw !important;
    --bs-offcanvas-height: 60vh !important;
}
</style>
