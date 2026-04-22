<script setup>
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { RadarChart, BarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, RadarComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { markRaw } from 'vue'
import { toTitleCase, removeTrailingZeroes, formatPower, formatPowerDensity, formatInductance, formatTemperature } from 'WebSharedComponents/assets/js/utils.js'
import { useTaskQueueStore } from '../../../stores/taskQueue'

// Register ECharts components once at module level
use([CanvasRenderer, RadarChart, BarChart, TitleComponent, TooltipComponent, RadarComponent, GridComponent]);
</script>

<script>
export default {
    components: {
        VChart,
    },
    emits: ["adviseReady", "selectedMas", "showDetails"],
    props: {
        adviseIndex: {
            type: Number,
            required: true
        },
        masData: {
            type: Object,
            required: true
        },
        scoring: {
            type: Object,
            required: true
        },
        weightedTotalScoring: {
            type: Number,
            required: true
        },
        selected: {
            type: Boolean,
            default: false,
        },
        graphType: {
            type: String,
            default: 'radar',
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const style = getComputedStyle(document.body);
        const theme = {
            primary: style.getPropertyValue('--bs-primary'),
            secondary: style.getPropertyValue('--bs-secondary'),
            success: style.getPropertyValue('--bs-success'),
            info: style.getPropertyValue('--bs-info'),
            warning: style.getPropertyValue('--bs-warning'),
            danger: style.getPropertyValue('--bs-danger'),
            light: style.getPropertyValue('--bs-light'),
            dark: style.getPropertyValue('--bs-dark'),
            white: style.getPropertyValue('--bs-white'),
        };
        const localTexts = {
            losses: null,
            powerDensity: null,
            magnetizingInductance: null,
            coreTemperature: null,
        };
        return {
            chartOptions: null,
            theme,
            localTexts,
            processedScoring: {},
            taskQueueStore: useTaskQueueStore(),
        }
    },
    computed: {
        displayMagneticName() {
            const reference = this.masData.magnetic.manufacturerInfo.reference;
            if (reference.includes("Gapped ")) {
                const parts = reference.split("Gapped ");
                const afterGapped = parts[1];
                if (afterGapped.includes(" mm")) {
                    const mmParts = afterGapped.split(" mm");
                    const gapLength = removeTrailingZeroes(Number(mmParts[0]));
                    const extraForStacks = mmParts.length > 1 ? mmParts[1] : '';
                    return parts[0] + gapLength + " mm" + extraForStacks;
                }
            }
            return reference;
        },
        formattedLosses() {
            return this.localTexts.losses?.split('\n')[1] || '';
        },
        formattedPowerDensity() {
            return this.localTexts.powerDensity?.split('\n')[1] || '';
        },
        formattedMagnetizingInductance() {
            return this.localTexts.magnetizingInductance?.split('\n')[1] || '';
        },
        formattedCoreTemperature() {
            return this.localTexts.coreTemperature?.split('\n')[1] || '';
        },
        coreShapeName() {
            return this.masData?.magnetic?.core?.functionalDescription?.shape?.name
                || this.masData?.magnetic?.core?.functionalDescription?.shape?.family
                || '—';
        },
        coreMaterialName() {
            const mat = this.masData?.magnetic?.core?.functionalDescription?.material;
            if (mat == null) return '—';
            if (typeof mat === 'string') return mat;
            return mat.name || '—';
        },
        numberOfWindings() {
            return this.masData?.magnetic?.coil?.functionalDescription?.length || 0;
        },
        totalTurns() {
            const windings = this.masData?.magnetic?.coil?.functionalDescription;
            if (!Array.isArray(windings)) return 0;
            return windings.reduce((sum, w) => sum + (w.numberTurns || 0), 0);
        },
        formattedDimensions() {
            const pd = this.masData?.magnetic?.core?.processedDescription;
            if (pd == null || pd.width == null) return '';
            const w = removeTrailingZeroes(pd.width * 1000, 1);
            const d = removeTrailingZeroes(pd.depth * 1000, 1);
            const h = removeTrailingZeroes(pd.height * 1000, 1);
            return `${w}×${d}×${h} mm`;
        },
        formattedEfficiency() {
            try {
                const losses = (this.masData.outputs[0].coreLosses?.coreLosses || 0)
                             + (this.masData.outputs[0].windingLosses?.windingLosses || 0);
                const out = this.masData.outputs[0];
                const powerIn = out?.powerIn ?? out?.inputPower ?? null;
                if (powerIn != null && powerIn > 0) {
                    const eff = (1 - losses / powerIn) * 100;
                    return `${removeTrailingZeroes(eff, 2)}%`;
                }
            } catch (e) {}
            return null;
        },
    },
    mounted() {
        this.initializeChart();
        this.processLocalTexts();
        this.$emit("adviseReady");
    },
    methods: {
        initializeChart() {
            // Process scoring data
            this.processedScoring = { Losses: 0 };
            let efficiencyFilterCount = 0;
            
            Object.entries(this.scoring).forEach(([filter, value]) => {
                if (filter !== "Cost" && filter !== "Dimensions") {
                    efficiencyFilterCount++;
                    this.processedScoring.Losses += value;
                } else {
                    this.processedScoring[filter] = value;
                }
            });
            
            if (efficiencyFilterCount > 0) {
                this.processedScoring.Losses /= efficiencyFilterCount;
            }

            const labels = this.formatFilterLabels(this.processedScoring);
            const truncatedLabels = this.formatFilterLabels(this.processedScoring, true);
            const values = Object.values(this.processedScoring);

            if (this.graphType === 'radar') {
                this.chartOptions = this.createRadarOptions(labels, values);
            } else {
                this.chartOptions = this.createBarOptions(truncatedLabels, values);
            }
        },
        formatFilterLabels(scoring, truncate = false) {
            return Object.keys(scoring).map(key => {
                const label = toTitleCase(key.toLowerCase().replaceAll("_", " "));
                return truncate ? label.substring(0, 4) : label;
            });
        },
        createRadarOptions(labels, values) {
            const primary = (this.theme.primary || '#5a7fff').trim();
            const success = (this.theme.success || '#00c853').trim();
            const light = '#e8e8e8';
            return {
                radar: {
                    indicator: labels.map(label => ({ name: label, max: 1 })),
                    splitNumber: 3,
                    radius: '65%',
                    axisName: {
                        fontSize: 11,
                        color: light,
                        opacity: 0.75
                    },
                    splitLine: {
                        lineStyle: { color: light, opacity: 0.15 }
                    },
                    splitArea: {
                        show: true,
                        areaStyle: {
                            color: [
                                'rgba(255, 255, 255, 0.025)',
                                'rgba(255, 255, 255, 0.05)'
                            ]
                        }
                    },
                    axisLine: {
                        lineStyle: { color: light, opacity: 0.15 }
                    }
                },
                series: [{
                    type: 'radar',
                    symbol: 'circle',
                    symbolSize: 6,
                    data: [{
                        value: values,
                        areaStyle: { color: primary, opacity: 0.35 },
                        lineStyle: {
                            color: primary,
                            width: 2,
                            shadowColor: primary,
                            shadowBlur: 10
                        },
                        itemStyle: {
                            color: success,
                            borderColor: light,
                            borderWidth: 1
                        }
                    }]
                }]
            };
        },
        createBarOptions(labels, values) {
            const primary = (this.theme.primary || '#5a7fff').trim();
            const success = (this.theme.success || '#00c853').trim();
            const light = '#e8e8e8';
            return {
                grid: {
                    left: '8%',
                    right: '5%',
                    bottom: '28%',
                    top: '12%'
                },
                xAxis: {
                    type: 'category',
                    data: labels,
                    axisLabel: {
                        fontSize: 10,
                        rotate: 35,
                        color: light,
                        opacity: 0.75
                    },
                    axisLine: {
                        lineStyle: { color: light, opacity: 0.15 }
                    },
                    axisTick: { show: false }
                },
                yAxis: {
                    type: 'value',
                    min: 0,
                    max: 1,
                    splitNumber: 3,
                    axisLabel: {
                        fontSize: 10,
                        color: light,
                        opacity: 0.6
                    },
                    splitLine: {
                        lineStyle: { color: light, opacity: 0.1 }
                    },
                    axisLine: { show: false }
                },
                series: [{
                    type: 'bar',
                    data: values,
                    barWidth: '60%',
                    itemStyle: {
                        color: primary,
                        borderRadius: [4, 4, 0, 0]
                    },
                    emphasis: {
                        itemStyle: { color: success }
                    }
                }]
            };
        },
        async processLocalTexts() {
            {
                const aux = formatPower(this.masData.outputs[0].coreLosses.coreLosses + this.masData.outputs[0].windingLosses.windingLosses);
                this.localTexts.losses = `Losses:\n${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`
            }

            try {
                // hardcoded operation point
                const rmsPower = await this.taskQueueStore.calculateRmsPower(this.masData.inputs.operatingPoints[0].excitationsPerWinding[0]);
                const volume = this.masData.magnetic.core.processedDescription.width *
                               this.masData.magnetic.core.processedDescription.depth * 
                               this.masData.magnetic.core.processedDescription.height;
                const aux = formatPowerDensity(rmsPower / volume);
                this.localTexts.powerDensity = `Power dens.:\n${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`;
            } catch (error) {
                console.error('Error calculating power density:', error);
            }
            if (this.masData.outputs[0].magnetizingInductance?.magnetizingInductance?.nominal != null) {
                const aux = formatInductance(this.masData.outputs[0].magnetizingInductance.magnetizingInductance.nominal);
                this.localTexts.magnetizingInductance = `Mag. Ind.:\n${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`
            }
            const tempOut = this.masData.outputs[0]?.temperature;
            const maxTemp = tempOut?.maximumTemperature
                ?? tempOut?.averageTemperature
                ?? tempOut?.temperature
                ?? null;
            if (maxTemp != null) {
                const aux = formatTemperature(maxTemp);
                this.localTexts.coreTemperature = `Core Temp.:\n${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`;
            }
        }
    }
}
</script>

<template>
    <div class="advise-option h-100" :class="{ 'advise-option-selected': selected }">
        <!-- Header with title, subtitle and score badge -->
        <div class="advise-option-header">
            <div class="advise-option-titles">
                <span class="advise-option-title" :title="displayMagneticName">{{ displayMagneticName }}</span>
                <span class="advise-option-subtitle" :title="coreShapeName + ' · ' + coreMaterialName">
                    <i class="bi bi-box-fill me-1"></i>{{ coreShapeName }}
                    <span class="advise-option-subtitle-sep">·</span>
                    <i class="bi bi-stars me-1"></i>{{ coreMaterialName }}
                </span>
            </div>
            <div class="advise-option-score-wrapper">
                <span class="advise-option-score" :class="{ 'advise-option-score-selected': selected }">
                    {{ removeTrailingZeroes(weightedTotalScoring * 100, 0) }}
                    <small>pts</small>
                </span>
            </div>
        </div>

        <!-- Main content area -->
        <div class="advise-option-body">
            <div class="row g-2">
                <!-- Stats column -->
                <div class="col-12 col-lg-6">
                    <div class="advise-stat-grid">
                        <div class="advise-stat">
                            <i class="bi bi-lightning-fill advise-stat-icon advise-stat-icon-warning"></i>
                            <div class="advise-stat-content">
                                <small class="advise-stat-label">Losses</small>
                                <span class="advise-stat-value">{{ formattedLosses || '—' }}</span>
                            </div>
                        </div>
                        <div class="advise-stat">
                            <i class="bi bi-box advise-stat-icon advise-stat-icon-info"></i>
                            <div class="advise-stat-content">
                                <small class="advise-stat-label">Power Density</small>
                                <span class="advise-stat-value">{{ formattedPowerDensity || '—' }}</span>
                            </div>
                        </div>
                        <div v-if="formattedMagnetizingInductance" class="advise-stat">
                            <i class="bi bi-soundwave advise-stat-icon advise-stat-icon-primary"></i>
                            <div class="advise-stat-content">
                                <small class="advise-stat-label">Magnetizing Ind.</small>
                                <span class="advise-stat-value">{{ formattedMagnetizingInductance }}</span>
                            </div>
                        </div>
                        <div v-if="formattedCoreTemperature" class="advise-stat">
                            <i class="bi bi-thermometer-half advise-stat-icon advise-stat-icon-danger"></i>
                            <div class="advise-stat-content">
                                <small class="advise-stat-label">Core Temp.</small>
                                <span class="advise-stat-value">{{ formattedCoreTemperature }}</span>
                            </div>
                        </div>
                        <div v-if="totalTurns > 0" class="advise-stat">
                            <i class="bi bi-arrow-repeat fa-spin advise-stat-icon advise-stat-icon-success"></i>
                            <div class="advise-stat-content">
                                <small class="advise-stat-label">Turns · Windings</small>
                                <span class="advise-stat-value">{{ totalTurns }} · {{ numberOfWindings }}</span>
                            </div>
                        </div>
                        <div v-if="formattedDimensions" class="advise-stat">
                            <i class="bi bi-rulers advise-stat-icon advise-stat-icon-secondary"></i>
                            <div class="advise-stat-content">
                                <small class="advise-stat-label">Dimensions</small>
                                <span class="advise-stat-value">{{ formattedDimensions }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Chart -->
                <div class="col-12 col-lg-6">
                    <div class="advise-chart-wrapper">
                        <v-chart
                            v-if="chartOptions"
                            class="w-100"
                            :option="chartOptions"
                            autoresize
                        />
                    </div>
                </div>
            </div>
        </div>

        <!-- Action buttons -->
        <div class="advise-option-footer">
            <div class="d-flex gap-2">
                <button
                    :data-cy="dataTestLabel + '-advise-' + adviseIndex + '-details-button'"
                    class="advise-btn advise-btn-outline flex-fill"
                    @click="$emit('showDetails')"
                >
                    <i class="bi bi-search"></i>
                    <span>Details</span>
                </button>
                <button
                    :data-cy="dataTestLabel + '-advise-' + adviseIndex + '-select-button'"
                    class="advise-btn flex-fill"
                    :class="selected ? 'advise-btn-success' : 'advise-btn-primary'"
                    @click="$emit('selectedMas')"
                >
                    <i :class="selected ? 'bi bi-check-circle-fill' : 'bi bi-circle'"></i>
                    <span>{{ selected ? 'Selected' : 'Select' }}</span>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Theme shim: in this app --bs-light is actually dark (#2a2a2a) and --bs-white is #d4d4d4,
   so semantic "light text" tokens must be built from literal rgb white. */
.advise-option {
    --ao-panel-1: color-mix(in srgb, var(--bs-light) 92%, #ffffff 8%);
    --ao-panel-2: var(--bs-light);
    --ao-border: rgba(255, 255, 255, 0.1);
    --ao-border-strong: rgba(255, 255, 255, 0.2);
    --ao-text: #f2f2f2;
    --ao-text-muted: rgba(242, 242, 242, 0.7);
    --ao-text-dim: rgba(242, 242, 242, 0.5);
    --ao-stat-bg: color-mix(in srgb, var(--bs-light) 80%, var(--bs-dark) 20%);
    --ao-stat-border: rgba(255, 255, 255, 0.08);

    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, var(--ao-panel-1) 0%, var(--ao-panel-2) 100%);
    border: 1px solid var(--ao-border);
    border-left: 3px solid rgba(var(--bs-primary-rgb), 0.8);
    border-radius: 14px;
    box-shadow:
        0 6px 20px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);
    overflow: hidden;
    transition: border-color 0.2s, box-shadow 0.25s, transform 0.1s;
}

.advise-option:hover {
    transform: translateY(-1px);
    border-color: var(--ao-border-strong);
    box-shadow:
        0 8px 24px rgba(0, 0, 0, 0.55),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.advise-option-selected {
    border-color: rgba(var(--bs-primary-rgb), 0.65);
    background: linear-gradient(180deg,
        color-mix(in srgb, var(--bs-primary) 22%, var(--ao-panel-1)) 0%,
        var(--ao-panel-2) 100%);
    box-shadow:
        0 2px 16px rgba(var(--bs-primary-rgb), 0.35),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.advise-option-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 0.7rem 0.85rem 0.65rem 0.85rem;
    background: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid var(--ao-border);
    gap: 0.6rem;
}

.advise-option-titles {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
    flex: 1;
}

.advise-option-title {
    color: var(--ao-text);
    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.advise-option-subtitle {
    color: var(--ao-text-muted);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.advise-option-subtitle-sep {
    margin: 0 0.35rem;
    color: var(--ao-text-dim);
}

.advise-option-score-wrapper {
    flex-shrink: 0;
}

.advise-option-score {
    display: inline-flex;
    align-items: baseline;
    gap: 0.2rem;
    padding: 0.3rem 0.6rem;
    border-radius: 999px;
    font-size: 1rem;
    font-weight: 800;
    background: linear-gradient(135deg,
        rgba(var(--bs-primary-rgb), 0.35) 0%,
        rgba(var(--bs-primary-rgb), 0.18) 100%);
    color: var(--ao-text);
    border: 1px solid rgba(var(--bs-primary-rgb), 0.65);
    box-shadow:
        0 0 0 1px rgba(var(--bs-primary-rgb), 0.25),
        0 2px 10px rgba(var(--bs-primary-rgb), 0.3);
    line-height: 1;
}

.advise-option-score small {
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--ao-text-muted);
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.advise-option-score-selected {
    background: linear-gradient(135deg,
        rgba(var(--bs-primary-rgb), 0.55) 0%,
        rgba(var(--bs-primary-rgb), 0.3) 100%);
    border-color: rgba(var(--bs-primary-rgb), 0.85);
    box-shadow:
        0 0 0 1px rgba(var(--bs-primary-rgb), 0.5),
        0 2px 14px rgba(var(--bs-primary-rgb), 0.5);
}

.advise-option-body {
    padding: 0.6rem 0.8rem;
}

.advise-stat-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.35rem;
}

.advise-stat {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.4rem 0.55rem;
    background: var(--ao-stat-bg);
    border: 1px solid var(--ao-stat-border);
    border-radius: 9px;
    transition: background 0.2s, border-color 0.2s;
}

.advise-stat:hover {
    background: color-mix(in srgb, var(--ao-stat-bg) 85%, #ffffff 15%);
    border-color: rgba(255, 255, 255, 0.18);
}

.advise-stat-icon {
    font-size: 0.95rem;
    width: 1.3rem;
    text-align: center;
    flex-shrink: 0;
    opacity: 0.95;
}

.advise-stat-icon-warning { color: var(--bs-warning); }
.advise-stat-icon-info { color: var(--bs-info); }
.advise-stat-icon-primary { color: var(--bs-primary); }
.advise-stat-icon-danger { color: var(--bs-danger); }
.advise-stat-icon-success { color: var(--bs-success); }
.advise-stat-icon-secondary { color: var(--ao-text-muted); }

.advise-stat-content {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
    line-height: 1.2;
}

.advise-stat-label {
    color: var(--ao-text-muted);
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    line-height: 1.1;
}

.advise-stat-value {
    color: var(--ao-text);
    font-size: 0.88rem;
    font-weight: 700;
    line-height: 1.25;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.advise-chart-wrapper {
    height: 100%;
    min-height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--ao-stat-bg);
    border: 1px solid var(--ao-stat-border);
    border-radius: 9px;
    padding: 0.3rem;
}

.advise-chart-wrapper > * {
    height: 100% !important;
    min-height: 140px;
}

.advise-option-footer {
    padding: 0.6rem 0.8rem;
    border-top: 1px solid var(--ao-border);
    background: rgba(255, 255, 255, 0.03);
    margin-top: auto;
}

.advise-option-footer .advise-btn {
    padding: 0.45rem 0.7rem;
    font-size: 0.8rem;
}

.advise-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0.35rem 0.7rem;
    border-radius: 999px;
    font-size: 0.76rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    border: 1px solid transparent;
    cursor: pointer;
    transition: filter 0.15s, box-shadow 0.2s, transform 0.1s, background 0.15s, color 0.15s;
    white-space: nowrap;
}

.advise-btn:hover:not(:disabled) {
    filter: brightness(1.15);
    transform: translateY(-1px);
}

.advise-btn-primary {
    background: linear-gradient(135deg,
        color-mix(in srgb, var(--bs-primary) 115%, transparent 0%) 0%,
        var(--bs-primary) 55%,
        rgb(var(--bs-primary-rgb) / 0.85) 100%);
    color: #ffffff;
    border: 1px solid color-mix(in srgb, var(--bs-primary) 70%, #ffffff 30%);
    box-shadow:
        0 0 0 1px rgb(var(--bs-primary-rgb) / 0.35),
        0 2px 8px rgb(var(--bs-primary-rgb) / 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
}

.advise-btn-success {
    background: linear-gradient(135deg,
        color-mix(in srgb, var(--bs-success) 115%, transparent 0%) 0%,
        var(--bs-success) 55%,
        rgb(var(--bs-success-rgb) / 0.85) 100%);
    color: #ffffff;
    border: 1px solid color-mix(in srgb, var(--bs-success) 70%, #ffffff 30%);
    box-shadow:
        0 0 0 1px rgb(var(--bs-success-rgb) / 0.35),
        0 2px 8px rgb(var(--bs-success-rgb) / 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
}

.advise-btn-outline {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: var(--ao-text);
}

.advise-btn-outline:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.4);
    color: #ffffff;
}
</style>

