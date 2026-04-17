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
        class="offcanvas offcanvas-size-xl ad-offcanvas"
        tabindex="-1"
        id="CoreAdviserDetailOffCanvas"
        aria-labelledby="CoreAdviserDetailOffCanvasLabel"
    >
        <div v-if="modelValue.magnetic.manufacturerInfo" class="ad-root">
            <!-- Top header -->
            <div class="ad-topbar">
                <div class="ad-topbar-text">
                    <div class="ad-title">{{ modelValue.magnetic.manufacturerInfo.reference }}</div>
                    <div class="ad-subtitle">{{ localTexts.coreDescription }}</div>
                </div>
                <button
                    data-cy="CoreAdviseDetail-corner-close-modal-button"
                    type="button"
                    class="ad-close"
                    data-bs-dismiss="offcanvas"
                    aria-label="Close"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="ad-body">
                <div class="row g-3">
                    <!-- Data Tables Section -->
                    <div class="col-12 col-lg-7 ad-tables">
                        <!-- Number of Turns Table -->
                        <div class="ad-card">
                            <div class="ad-card-header">
                                <i class="fa-solid fa-arrows-spin"></i>
                                <span>Windings</span>
                            </div>
                            <table class="ad-table">
                                <thead>
                                    <tr>
                                        <th>Winding</th>
                                        <th>Turns</th>
                                        <th>Parallels</th>
                                        <th>Turns ratio</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(winding, idx) in modelValue.magnetic.coil.functionalDescription" :key="'turns-' + idx">
                                        <td>{{ localTexts.numberTurnsTable?.[idx]?.text }}</td>
                                        <td>{{ localTexts.numberTurnsTable?.[idx]?.value }}</td>
                                        <td>{{ localTexts.numberParallelsTable?.[idx]?.value }}</td>
                                        <td>{{ localTexts.turnsRatioTable?.[idx]?.value || '—' }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Operating Points -->
                        <div v-for="(op, opIdx) in modelValue.outputs" :key="'output-' + opIdx" class="ad-op">
                            <div class="ad-op-title">
                                <i class="fa-solid fa-bullseye"></i>
                                <span>{{ modelValue.inputs.operatingPoints[opIdx].name }}</span>
                            </div>

                            <!-- Core Data -->
                            <div class="ad-card">
                                <div class="ad-card-header">
                                    <i class="fa-solid fa-cube"></i>
                                    <span>Core</span>
                                </div>
                                <table class="ad-table ad-table-kv">
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
                            </div>

                            <!-- Coil Data -->
                            <div class="ad-card">
                                <div class="ad-card-header">
                                    <i class="fa-solid fa-wave-square"></i>
                                    <span>Coil</span>
                                </div>
                                <table class="ad-table">
                                    <thead>
                                        <tr>
                                            <th>Winding</th>
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
                                            <td>{{ localTexts.leakageInductanceTable?.[wIdx]?.value || '—' }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- Winding Losses Breakdown -->
                            <div class="ad-card">
                                <div class="ad-card-header">
                                    <i class="fa-solid fa-bolt"></i>
                                    <span>Winding Losses Breakdown</span>
                                </div>
                                <table class="ad-table">
                                    <thead>
                                        <tr>
                                            <th>Winding</th>
                                            <th>Ohmic</th>
                                            <th>Skin</th>
                                            <th>Proximity</th>
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
                    </div>

                    <!-- Visualizer Section -->
                    <div class="col-12 col-lg-5 ad-viz-col">
                        <div class="ad-card ad-viz-card">
                            <div class="ad-card-header">
                                <i class="fa-solid fa-eye"></i>
                                <span>Core &amp; Coil</span>
                            </div>
                            <div class="ad-viz-body">
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
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Theme shim: --bs-light is #2a2a2a, --bs-white is #d4d4d4; use literal white for text. */
.ad-offcanvas {
    --ad-panel-1: color-mix(in srgb, var(--bs-light) 92%, #ffffff 8%);
    --ad-panel-2: var(--bs-light);
    --ad-sub-1: color-mix(in srgb, var(--bs-light) 80%, var(--bs-dark) 20%);
    --ad-sub-2: color-mix(in srgb, var(--bs-light) 88%, var(--bs-dark) 12%);
    --ad-border: rgba(255, 255, 255, 0.1);
    --ad-border-strong: rgba(255, 255, 255, 0.18);
    --ad-text: #f2f2f2;
    --ad-text-muted: rgba(242, 242, 242, 0.72);

    --bs-offcanvas-width: 68vw !important;
    --bs-offcanvas-height: 80vh !important;
    --bs-offcanvas-bg: transparent !important;
    --bs-offcanvas-color: var(--ad-text) !important;
    border: none !important;
    background: linear-gradient(180deg, var(--ad-panel-1) 0%, var(--ad-panel-2) 100%) !important;
    color: var(--ad-text) !important;
    box-shadow: -8px 0 30px rgba(0, 0, 0, 0.6) !important;
}

.ad-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

/* ============ Top bar ============ */
.ad-topbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.8rem;
    padding: 0.55rem 0.85rem;
    border-bottom: 1px solid var(--ad-border);
    background: rgba(255, 255, 255, 0.04);
    flex-shrink: 0;
}

.ad-topbar-text {
    min-width: 0;
    flex: 1;
}

.ad-title {
    color: var(--ad-text);
    font-size: 1.2rem;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ad-subtitle {
    color: var(--ad-text-muted);
    font-size: 0.85rem;
    font-weight: 500;
    margin-top: 0.15rem;
    line-height: 1.3;
}

.ad-close {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: var(--ad-text);
    font-size: 0.78rem;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, transform 0.1s;
}

.ad-close:hover {
    background: rgb(var(--bs-danger-rgb) / 0.3);
    border-color: rgb(var(--bs-danger-rgb) / 0.6);
    color: #ffffff;
    transform: rotate(90deg);
}

/* ============ Body ============ */
.ad-body {
    padding: 0.6rem 0.8rem;
    overflow-y: auto;
    flex: 1;
}

/* ============ Sub-card ============ */
.ad-card {
    background: linear-gradient(180deg, var(--ad-sub-1) 0%, var(--ad-sub-2) 100%);
    border: 1px solid var(--ad-border);
    border-left: 3px solid rgba(var(--bs-primary-rgb), 0.7);
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
    margin-bottom: 0.5rem;
}

.ad-card-header {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.4rem 0.7rem;
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid var(--ad-border);
    color: var(--bs-primary);
    font-weight: 600;
    font-size: 0.85rem;
    letter-spacing: 0.03em;
    text-transform: uppercase;
}

.ad-card-header i {
    font-size: 0.9rem;
    filter: drop-shadow(0 0 4px rgba(var(--bs-primary-rgb), 0.5));
}

/* ============ Tables ============ */
.ad-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0;
    font-size: 0.88rem;
    color: var(--ad-text);
}

.ad-table thead tr {
    background: rgba(255, 255, 255, 0.05);
}

.ad-table thead th {
    padding: 0.35rem 0.7rem;
    text-align: left;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ad-text-muted);
    border-bottom: 1px solid var(--ad-border);
    white-space: nowrap;
}

.ad-table tbody td {
    padding: 0.35rem 0.7rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-weight: 600;
}

.ad-table tbody tr:last-child td {
    border-bottom: 0;
}

.ad-table tbody tr:nth-child(even) td {
    background: rgba(var(--bs-primary-rgb), 0.08);
}

.ad-table tbody tr:hover td {
    background: rgba(255, 255, 255, 0.05);
}

.ad-table tbody td:first-child {
    color: var(--ad-text-muted);
    font-weight: 500;
}

.ad-table-kv tbody td:first-child {
    width: 45%;
}

.ad-table-kv tbody td:last-child {
    text-align: right;
    color: var(--ad-text);
    font-weight: 700;
}

/* ============ Operating point block ============ */
.ad-op {
    margin-top: 0.5rem;
}

.ad-op-title {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--ad-text);
    font-size: 0.95rem;
    font-weight: 700;
    margin: 0.35rem 0 0.4rem 0;
    padding-left: 0.1rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.ad-op-title i {
    color: var(--bs-primary);
    font-size: 0.9rem;
    filter: drop-shadow(0 0 4px rgba(var(--bs-primary-rgb), 0.5));
}

/* ============ Visualizer ============ */
.ad-viz-col {
    position: sticky;
    top: 0;
}

.ad-viz-card {
    margin-bottom: 0;
}

.ad-viz-body {
    padding: 0.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 260px;
}

.ad-viz-body > :deep(*) {
    max-width: 100%;
}
</style>
