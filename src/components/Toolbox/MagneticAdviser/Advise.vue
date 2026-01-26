<script setup>
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { RadarChart, BarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, RadarComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { markRaw } from 'vue'
import { toTitleCase, removeTrailingZeroes, formatPower, formatPowerDensity, formatInductance, formatTemperature } from '/WebSharedComponents/assets/js/utils.js'
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
            return {
                radar: {
                    indicator: labels.map(label => ({ name: label, max: 1 })),
                    splitNumber: 3,
                    radius: '65%',
                    axisName: {
                        fontSize: 10,
                        color: 'rgba(255, 255, 255, 0.6)'
                    },
                    splitLine: {
                        lineStyle: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    splitArea: {
                        show: true,
                        areaStyle: {
                            color: ['rgba(255, 255, 255, 0.02)', 'rgba(255, 255, 255, 0.04)']
                        }
                    },
                    axisLine: {
                        lineStyle: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                series: [{
                    type: 'radar',
                    symbol: 'circle',
                    symbolSize: 6,
                    data: [{
                        value: values,
                        areaStyle: {
                            color: {
                                type: 'linear',
                                x: 0, y: 0, x2: 0, y2: 1,
                                colorStops: [
                                    { offset: 0, color: 'rgba(90, 127, 255, 0.6)' },
                                    { offset: 1, color: 'rgba(90, 127, 255, 0.1)' }
                                ]
                            }
                        },
                        lineStyle: {
                            color: '#5a7fff',
                            width: 2,
                            shadowColor: 'rgba(90, 127, 255, 0.5)',
                            shadowBlur: 10
                        },
                        itemStyle: {
                            color: '#00c853',
                            borderColor: '#fff',
                            borderWidth: 1
                        }
                    }]
                }]
            };
        },
        createBarOptions(labels, values) {
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
                        fontSize: 9,
                        rotate: 35,
                        color: 'rgba(255, 255, 255, 0.6)'
                    },
                    axisLine: {
                        lineStyle: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    axisTick: { show: false }
                },
                yAxis: {
                    type: 'value',
                    min: 0,
                    max: 1,
                    splitNumber: 3,
                    axisLabel: {
                        fontSize: 9,
                        color: 'rgba(255, 255, 255, 0.5)'
                    },
                    splitLine: {
                        lineStyle: { color: 'rgba(255, 255, 255, 0.06)' }
                    },
                    axisLine: { show: false }
                },
                series: [{
                    type: 'bar',
                    data: values,
                    barWidth: '60%',
                    itemStyle: {
                        color: {
                            type: 'linear',
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: '#5a7fff' },
                                { offset: 1, color: '#3d5afe' }
                            ]
                        },
                        borderRadius: [4, 4, 0, 0]
                    },
                    emphasis: {
                        itemStyle: {
                            color: '#00c853'
                        }
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
        }
    }
}
</script>

<template>
    <div class="card h-100" :class="{ 'border-success': selected, 'border-secondary': !selected }">
        <!-- Header with score badge -->
        <div class="card-header bg-dark border-secondary d-flex justify-content-between align-items-center py-2">
            <span class="text-white text-truncate fw-semibold" :title="displayMagneticName" style="max-width: 70%;">{{ displayMagneticName }}</span>
            <span class="badge rounded-pill text-dark" :class="selected ? 'bg-success' : 'bg-primary'">
                {{ removeTrailingZeroes(weightedTotalScoring * 100, 0) }} pts
            </span>
        </div>

        <!-- Main content area -->
        <div class="card-body bg-dark p-2">
            <div class="row g-2">
                <!-- Stats column -->
                <div class="col-5">
                    <div class="d-flex flex-column gap-2">
                        <div class="d-flex align-items-center gap-2 p-2 bg-black bg-opacity-25 rounded">
                            <span>⚡</span>
                            <div class="d-flex flex-column">
                                <small class="text-white-50" style="font-size: 0.65rem;">Losses</small>
                                <span class="text-white" style="font-size: 0.8rem;">{{ formattedLosses }}</span>
                            </div>
                        </div>
                        <div class="d-flex align-items-center gap-2 p-2 bg-black bg-opacity-25 rounded">
                            <span>📦</span>
                            <div class="d-flex flex-column">
                                <small class="text-white-50" style="font-size: 0.65rem;">Power Density</small>
                                <span class="text-white" style="font-size: 0.8rem;">{{ formattedPowerDensity }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Chart -->
                <div class="col-7">
                    <v-chart 
                        v-if="chartOptions"
                        class="w-100" 
                        style="height: 110px;"
                        :option="chartOptions"
                        autoresize
                    />
                </div>
            </div>
        </div>

        <!-- Action buttons -->
        <div class="card-footer bg-dark border-secondary p-2">
            <div class="d-flex gap-2">
                <button 
                    :data-cy="dataTestLabel + '-advise-' + adviseIndex + '-details-button'" 
                    class="btn btn-outline-secondary btn-sm flex-fill"
                    @click="$emit('showDetails')"
                >
                    🔍 Details
                </button>
                <button 
                    :data-cy="dataTestLabel + '-advise-' + adviseIndex + '-select-button'" 
                    class="btn btn-sm flex-fill"
                    :class="selected ? 'btn-success' : 'btn-primary'"
                    @click="$emit('selectedMas')"
                >
                    {{ selected ? '✓ Selected' : '○ Select' }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.card {
    transition: all 0.3s ease;
}

.card:hover {
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.border-success {
    box-shadow: 0 0 15px rgba(var(--bs-success-rgb), 0.25);
}
</style>

