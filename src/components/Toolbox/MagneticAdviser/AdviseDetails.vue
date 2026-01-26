<script setup>
import { useTaskQueueStore } from '../../../stores/taskQueue'
import { useStyleStore } from '../../../stores/style'
import { toTitleCase, removeTrailingZeroes, formatInductance, formatPower, formatTemperature, formatResistance } from '/WebSharedComponents/assets/js/utils.js'
import Magnetic2DVisualizer from '/WebSharedComponents/Common/Magnetic2DVisualizer.vue'
</script>

<script>
export default {
    props: {
        modelValue: {
            type: Object,
            required: true
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        return {
            localTexts: {},
            taskQueueStore: useTaskQueueStore(),
            styleStore: useStyleStore(),
        }
    },
    watch: {
        modelValue: {
            handler() {
                this.processLocalTexts();
                this.$nextTick(() => this.calculateLeakageInductance());
            },
            deep: true
        },
    },
    methods: {
        async calculateLeakageInductance() {
            if (this.modelValue.magnetic.coil.functionalDescription.length <= 1) {
                return;
            }
            
            try {
                const leakageInductanceOutput = await this.taskQueueStore.calculateLeakageInductance(
                    this.modelValue.magnetic,
                    this.modelValue.inputs.operatingPoints[0].excitationsPerWinding[0].frequency,
                    0
                );

                for (let windingIndex = 1; windingIndex < this.modelValue.magnetic.coil.functionalDescription.length; windingIndex++) {
                    const aux = formatInductance(leakageInductanceOutput.leakageInductancePerWinding[windingIndex].nominal);
                    this.localTexts.leakageInductanceTable[windingIndex].value = `${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`;
                }
            } catch (error) {
                console.error('Error calculating leakage inductance:', error);
            }
        },
        processMagneticTexts(data) {
            if (!data.magnetic.manufacturerInfo) {
                return null;
            }

            const localTexts = {
                coreDescription: null,
                coreMaterial: null,
                coreGapping: null,
                effectiveParametersTable: null,
                numberTurns: null,
                numberEstimatedLayers: null,
                magnetizingInductanceTable: [],
                coreLossesTable: [],
                coreTemperatureTable: [],
                dcResistanceTable: [],
                windingLossesTable: [],
                windingOhmicLossesTable: [],
                windingSkinLossesTable: [],
                windingProximityLossesTable: [],
                numberTurnsTable: [],
                numberParallelsTable: [],
                turnsRatioTable: [],
                leakageInductanceTable: [],
                manufacturer: null,
            };

            // Core description
            const materialName = typeof data.magnetic.core.functionalDescription.material === 'string' 
                ? data.magnetic.core.functionalDescription.material 
                : data.magnetic.core.functionalDescription.material.name;
            
            localTexts.coreDescription = `Magnetic with a ${data.magnetic.core.functionalDescription.shape.name} material ${materialName} core`;
            localTexts.coreDescription += this.getGappingDescription(data.magnetic.core);

            // Number of turns description
            localTexts.numberTurns = `Using ${removeTrailingZeroes(data.magnetic.coil.functionalDescription[0].numberTurns)} turns will produce a magnetic with the following estimated output per operating point:`;

            // Build winding tables
            this.buildWindingTables(data, localTexts);

            // Build operating point tables
            this.buildOperatingPointTables(data, localTexts);

            return localTexts;
        },
        getGappingDescription(core) {
            const gapping = core.functionalDescription.gapping;
            const columns = core.processedDescription.columns;
            
            if (gapping.length === 0) {
                return ', ungapped.';
            }
            if (gapping.length === columns.length) {
                if (gapping[0].type === 'residual') {
                    return ', ungapped.';
                }
                return `, with a ground gap of ${removeTrailingZeroes(gapping[0].length * 1000, 5)} mm.`;
            }
            if (gapping.length > columns.length) {
                return `, with a distributed gap of ${removeTrailingZeroes(gapping[0].length * 1000, 5)} mm.`;
            }
            return '';
        },
        buildWindingTables(data, localTexts) {
            const windings = data.magnetic.coil.functionalDescription;
            const primaryTurns = windings[0].numberTurns;

            for (let i = 0; i < windings.length; i++) {
                const winding = windings[i];
                localTexts.numberTurnsTable.push({ text: winding.name, value: winding.numberTurns });
                localTexts.numberParallelsTable.push({ text: winding.name, value: winding.numberParallels });
                localTexts.turnsRatioTable.push({ 
                    text: winding.name, 
                    value: i !== 0 ? removeTrailingZeroes(primaryTurns / winding.numberTurns) : '' 
                });
                localTexts.leakageInductanceTable.push({ text: winding.name, value: '' });
            }
        },
        buildOperatingPointTables(data, localTexts) {
            const windings = data.magnetic.coil.functionalDescription;

            for (let opIndex = 0; opIndex < data.outputs.length; opIndex++) {
                const output = data.outputs[opIndex];
                
                // Initialize tables for this operating point
                localTexts.magnetizingInductanceTable.push({ text: null, value: null });
                localTexts.coreLossesTable.push({ text: null, value: null });
                localTexts.coreTemperatureTable.push({ text: null, value: null });
                
                const dcResistancePerWinding = [];
                const windingLossesPerWinding = [];
                const ohmicLossesPerWinding = [];
                const skinLossesPerWinding = [];
                const proximityLossesPerWinding = [];

                for (let w = 0; w < windings.length; w++) {
                    dcResistancePerWinding.push({ text: null, value: null });
                    windingLossesPerWinding.push({ text: null, value: null });
                    ohmicLossesPerWinding.push({ text: null, value: null });
                    skinLossesPerWinding.push({ text: null, value: null });
                    proximityLossesPerWinding.push({ text: null, value: null });
                }

                localTexts.dcResistanceTable.push(dcResistancePerWinding);
                localTexts.windingLossesTable.push(windingLossesPerWinding);
                localTexts.windingOhmicLossesTable.push(ohmicLossesPerWinding);
                localTexts.windingSkinLossesTable.push(skinLossesPerWinding);
                localTexts.windingProximityLossesTable.push(proximityLossesPerWinding);

                // Fill in values
                this.fillMagnetizingInductance(output, localTexts, opIndex);
                this.fillCoreLosses(output, localTexts, opIndex);
                this.fillWindingData(output, windings, localTexts, opIndex);
            }
        },
        fillMagnetizingInductance(output, localTexts, opIndex) {
            if (output.magnetizingInductance) {
                const aux = formatInductance(output.magnetizingInductance.magnetizingInductance.nominal);
                localTexts.magnetizingInductanceTable[opIndex].text = 'Mag. Ind.';
                localTexts.magnetizingInductanceTable[opIndex].value = `${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`;
            }
        },
        fillCoreLosses(output, localTexts, opIndex) {
            if (output.coreLosses) {
                const lossAux = formatPower(output.coreLosses.coreLosses);
                localTexts.coreLossesTable[opIndex].text = 'Core losses';
                localTexts.coreLossesTable[opIndex].value = `${removeTrailingZeroes(lossAux.label, 2)} ${lossAux.unit}`;

                const tempAux = formatTemperature(output.coreLosses.temperature);
                localTexts.coreTemperatureTable[opIndex].text = 'Core temp.';
                localTexts.coreTemperatureTable[opIndex].value = `${removeTrailingZeroes(tempAux.label, 2)} ${tempAux.unit}`;
            }
        },
        fillWindingData(output, windings, localTexts, opIndex) {
            if (!output.windingLosses) return;

            for (let w = 0; w < windings.length; w++) {
                const windingName = windings[w].name;

                // DC Resistance
                if (output.windingLosses.dcResistancePerWinding) {
                    const aux = formatResistance(output.windingLosses.dcResistancePerWinding[w]);
                    localTexts.dcResistanceTable[opIndex][w].text = windingName;
                    localTexts.dcResistanceTable[opIndex][w].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                }

                // Winding losses breakdown
                const lossesData = output.windingLosses.windingLossesPerWinding[w];
                const ohmicLosses = lossesData.ohmicLosses.losses;
                const skinLosses = lossesData.skinEffectLosses.lossesPerHarmonic.reduce((sum, a) => sum + a, 0);
                const proximityLosses = lossesData.proximityEffectLosses.lossesPerHarmonic.reduce((sum, a) => sum + a, 0);

                const totalAux = formatPower(ohmicLosses + skinLosses + proximityLosses);
                const ohmicAux = formatPower(ohmicLosses);
                const skinAux = formatPower(skinLosses);
                const proximityAux = formatPower(proximityLosses);

                localTexts.windingLossesTable[opIndex][w].text = windingName;
                localTexts.windingLossesTable[opIndex][w].value = `${removeTrailingZeroes(totalAux.label, 2)} ${totalAux.unit}`;
                localTexts.windingOhmicLossesTable[opIndex][w].text = windingName;
                localTexts.windingOhmicLossesTable[opIndex][w].value = `${removeTrailingZeroes(ohmicAux.label, 2)} ${ohmicAux.unit}`;
                localTexts.windingSkinLossesTable[opIndex][w].text = windingName;
                localTexts.windingSkinLossesTable[opIndex][w].value = `${removeTrailingZeroes(skinAux.label, 2)} ${skinAux.unit}`;
                localTexts.windingProximityLossesTable[opIndex][w].text = windingName;
                localTexts.windingProximityLossesTable[opIndex][w].value = `${removeTrailingZeroes(proximityAux.label, 2)} ${proximityAux.unit}`;
            }
        },
        processLocalTexts() {
            this.localTexts = this.processMagneticTexts(this.modelValue);
        },
    },
    computed: {
        offcanvasPosition() {
            return window.innerWidth < 600 ? 'offcanvas-bottom' : 'offcanvas-end';
        }
    },
    mounted() {
        this.processLocalTexts();
    },
}

</script>

<template>
    <div 
        :class="offcanvasPosition" 
        class="offcanvas offcanvas-size-xl" 
        :style="styleStore.main"
        tabindex="-1" 
        id="CoreAdviserDetailOffCanvas" 
        aria-labelledby="CoreAdviserDetailOffCanvasLabel"
    >
        <div class="offcanvas-header">
            <button 
                data-cy="CoreAdviseDetail-corner-close-modal-button" 
                type="button" 
                class="btn-close btn-close-white" 
                data-bs-dismiss="offcanvas" 
                aria-label="Close"
            />
        </div>

        <div class="offcanvas-body">
            <div v-if="modelValue.magnetic.manufacturerInfo" class="row mx-1">
                <h3 class="col-12 p-0 m-0">{{ modelValue.magnetic.manufacturerInfo.reference }}</h3>
                <p class="col-12 fs-5 p-0 m-0 mt-2 text-start">{{ localTexts.coreDescription }}</p>
                
                <!-- Data Tables Section -->
                <div class="col-7 data-tables" style="max-width: 450px;">
                    <!-- Number of Turns Table -->
                    <h5 class="col-12 p-0 m-0 mt-2 text-center">Number turns</h5>
                    <table class="table table-bordered table-sm table-dark">
                        <thead>
                            <tr>
                                <th>Windings</th>
                                <th>No. turns</th>
                                <th>No. parallels</th>
                                <th>Turns ratio</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(winding, idx) in modelValue.magnetic.coil.functionalDescription" :key="'turns-' + idx">
                                <td>{{ localTexts.numberTurnsTable?.[idx]?.text }}</td>
                                <td>{{ localTexts.numberTurnsTable?.[idx]?.value }}</td>
                                <td>{{ localTexts.numberParallelsTable?.[idx]?.value }}</td>
                                <td>{{ localTexts.turnsRatioTable?.[idx]?.value }}</td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- Operating Points -->
                    <div v-for="(op, opIdx) in modelValue.outputs" :key="'output-' + opIdx" class="mb-3">
                        <h5 class="mt-3">{{ modelValue.inputs.operatingPoints[opIdx].name }}</h5>
                        
                        <!-- Core Data -->
                        <h6 class="text-center">Core</h6>
                        <table class="table table-bordered table-sm table-dark">
                            <tbody>
                                <tr v-if="localTexts.magnetizingInductanceTable?.[opIdx]?.text">
                                    <td>{{ localTexts.magnetizingInductanceTable[opIdx].text }}</td>
                                    <td>{{ localTexts.magnetizingInductanceTable[opIdx].value }}</td>
                                </tr>
                                <tr v-if="localTexts.coreLossesTable?.[opIdx]?.text">
                                    <td>{{ localTexts.coreLossesTable[opIdx].text }}</td>
                                    <td>{{ localTexts.coreLossesTable[opIdx].value }}</td>
                                </tr>
                                <tr v-if="localTexts.coreTemperatureTable?.[opIdx]?.text">
                                    <td>{{ localTexts.coreTemperatureTable[opIdx].text }}</td>
                                    <td>{{ localTexts.coreTemperatureTable[opIdx].value }}</td>
                                </tr>
                            </tbody>
                        </table>

                        <!-- Coil Data -->
                        <h6 class="text-center">Coil</h6>
                        <table class="table table-bordered table-sm table-dark">
                            <thead>
                                <tr>
                                    <th>Windings</th>
                                    <th>DC Res.</th>
                                    <th>Wind. Loss</th>
                                    <th>Leak. Ind.</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(winding, wIdx) in modelValue.magnetic.coil.functionalDescription" :key="'coil-' + wIdx">
                                    <td>{{ toTitleCase(localTexts.windingLossesTable?.[opIdx]?.[wIdx]?.text?.toLowerCase() || '') }}</td>
                                    <td>{{ localTexts.dcResistanceTable?.[opIdx]?.[wIdx]?.value }}</td>
                                    <td>{{ localTexts.windingLossesTable?.[opIdx]?.[wIdx]?.value }}</td>
                                    <td>{{ localTexts.leakageInductanceTable?.[wIdx]?.value }}</td>
                                </tr>
                            </tbody>
                        </table>

                        <!-- Winding Losses Breakdown -->
                        <h6 class="text-center">Windings Losses Breakdown</h6>
                        <table class="table table-bordered table-sm table-dark">
                            <thead>
                                <tr>
                                    <th>Windings</th>
                                    <th>Ohmic Loss</th>
                                    <th>Skin Loss</th>
                                    <th>Prox. Loss</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(winding, wIdx) in modelValue.magnetic.coil.functionalDescription" :key="'breakdown-' + wIdx">
                                    <td>{{ toTitleCase(localTexts.windingOhmicLossesTable?.[opIdx]?.[wIdx]?.text?.toLowerCase() || '') }}</td>
                                    <td>{{ localTexts.windingOhmicLossesTable?.[opIdx]?.[wIdx]?.value }}</td>
                                    <td>{{ localTexts.windingSkinLossesTable?.[opIdx]?.[wIdx]?.value }}</td>
                                    <td>{{ localTexts.windingProximityLossesTable?.[opIdx]?.[wIdx]?.value }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                    
                <!-- Visualizer Section -->
                <div class="col-5">
                    <h5 class="col-12 p-0 m-0 mt-2 text-center">Core Coil</h5>
                    <Magnetic2DVisualizer 
                        :key="modelValue.magnetic.manufacturerInfo?.reference" 
                        :modelValue="modelValue" 
                        :enableZoom="false" 
                        :enableOptions="false"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.offcanvas-size-xl {
    --bs-offcanvas-width: 65vw !important;
    --bs-offcanvas-height: 60vh !important;
}

.data-tables {
    overflow-y: auto;
    max-height: 60vh;
}

.table {
    font-size: 0.85em;
}

.table th,
.table td {
    padding: 0.25rem 0.5rem;
}

h5, h6 {
    margin-bottom: 0.5rem;
}
</style>
