<script setup>
import { Chart, registerables } from 'chart.js'
import { toTitleCase, removeTrailingZeroes, formatPower, formatPowerDensity, formatInductance, formatTemperature } from 'WebSharedComponents/assets/js/utils.js'
import { useTaskQueueStore } from '../../../stores/taskQueue'
</script>

<script>
var options = {};
var chart = null;
export default {
    emits: ["adviseReady"],
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
        const data = {};
        const taskQueueStore = useTaskQueueStore();
        const localTexts = {
            coreLosses: null,
            powerDensity: null,
            magnetizingInductance: null,
            coreTemperature: null,
        };
        return {
            data,
            theme,
            localTexts,
            masScore: null,
            taskQueueStore,
        }
    },
    computed: {
        brokenLinedFilters() {
            const titledFilters = [];
            for (let [key, _] of Object.entries(this.scoring)) {
                var aux = toTitleCase(key.toLowerCase().replaceAll("_", " "));
                // titledFilters.push(aux.split(' ').map(item => item.length <= 8? item + ' ' : item.slice(0, 6) + '. ').map(item => toTitleCase(item)).join());
                // titledFilters.push(aux.split(' ').map(item => item.length <= 8? item + ' ' : item.slice(0, 6) + '. ').map(item => toTitleCase(item)));
                titledFilters.push(aux);
            }
            return titledFilters;
        },
        fixedMagneticName() {
            if (this.masData.magnetic.manufacturerInfo.reference.split("Gapped ").length > 1) {
                var gapLength = null;
                var extraForStacks = '';
                if (this.masData.magnetic.manufacturerInfo.reference.split("Gapped ")[1].split(" mm").length > 0) {
                    gapLength =  removeTrailingZeroes(Number(this.masData.magnetic.manufacturerInfo.reference.split("Gapped ")[1].split(" mm")[0]));
                    if (this.masData.magnetic.manufacturerInfo.reference.split("Gapped ")[1].split(" mm").length > 1) {
                        extraForStacks = this.masData.magnetic.manufacturerInfo.reference.split("Gapped ")[1].split(" mm")[1];
                    }
                }
                this.masData.magnetic.manufacturerInfo.reference = this.masData.magnetic.manufacturerInfo.reference.split("Gapped ")[0] + gapLength + " mm" + extraForStacks;
            }
            else {
                // this.masData.magnetic.manufacturerInfo.reference = this.masData.magnetic.manufacturerInfo.reference.replaceAll("Ungapped", "Ung.");
            }
            return this.masData.magnetic.manufacturerInfo.reference;
        },
    },
    mounted () {
        options = {
            scales: {
                r: {
                    pointLabels: {
                        display: true,
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        display: false
                    },
                    grid: {
                        color: "#636363",
                        display: true
                    },
                    max: 1,
                    min: 0,
                },
                y: {
                    beginAtZero: true,
                    display: this.graphType == "bar",
                }
            },
            plugins:{
                legend:{
                    display: false,
                }
            },
            elements: {
                line: {
                    borderWidth: 3
                }
            }
        }

        this.data = {
            labels: this.brokenLinedFilters,
            datasets: [{
                label: '',
                data: Object.values(this.scoring),
                fill: true,
                backgroundColor: this.theme.primary,
                borderColor: this.theme.primary,
                pointBackgroundColor: this.theme.success,
                pointBorderColor: this.theme.success,
                pointHoverBackgroundColor: this.theme.info,
                pointHoverBorderColor: this.theme.info
            }]
        }

        this.processLocalTexts();

        Chart.register(...registerables)
        this.createChart('chartSpiderAdvise-' + this.adviseIndex, options)
        this.$emit("adviseReady")
    },
    methods: {
        createChart(chartId, options) {
            const ctx = document.getElementById(chartId)
            if (ctx != null) {
                chart = new Chart(ctx, {
                    type: this.graphType,
                    data: this.data,
                    options: options,
                })
                chart.update()
            }
        },
        async processLocalTexts() {
            if (this.masData.outputs[0].coreLosses == null) {
                this.localTexts = {}
                return
            }

            {
                const aux = formatPower(this.masData.outputs[0].coreLosses.coreLosses);
                this.localTexts.coreLosses = `Core losses: ${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`
            }

            try {
                // hardcoded operation point
                const rmsPower = await this.taskQueueStore.calculateRmsPower(this.masData.inputs.operatingPoints[0].excitationsPerWinding[0]);
                const volume = this.masData.magnetic.core.processedDescription.width *
                               this.masData.magnetic.core.processedDescription.depth * 
                               this.masData.magnetic.core.processedDescription.height;
                const aux = formatPowerDensity(rmsPower / volume);
                this.localTexts.powerDensity = `P. dens.: ${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`;
            } catch (error) {
                console.error('Error calculating power density:', error);
            }
            {
                var masScore = 0;
                for (let [key, value] of Object.entries(this.scoring)) {
                    masScore += value;
                }
                masScore /= 3;
                masScore *= 100;
                this.masScore = `${removeTrailingZeroes(masScore, 1)}`
            }   
            {
                const aux = formatInductance(this.masData.outputs[0].magnetizingInductance.magnetizingInductance.nominal);
                this.localTexts.magnetizingInductance = `Mag. Ind.: ${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`
            }  
            {
                const aux = formatTemperature(this.masData.outputs[0].coreLosses.temperature);
                this.localTexts.coreTemperature = `Core Temp.: ${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`
            }
        }
    }
}
</script>

<template>
    <div class="container">
        <div class="advise-option" :class="{ 'advise-option-selected': selected }">
            <div class="advise-option-header">
                <span class="advise-option-title col-10 px-1">{{fixedMagneticName}}</span>
                <span class="advise-option-score col-2">{{masScore}}</span>
            </div>
            <div class="advise-option-body">
                <canvas :id="'chartSpiderAdvise-' + adviseIndex" style="max-height: 50%"></canvas>
                <div class="row mx-1 advise-option-metrics">
                    <div class="col-6 p-0 m-0">{{localTexts.coreLosses}}</div>
                    <div class="col-6 p-0 m-0">{{localTexts.coreTemperature}}</div>
                    <div class="col-6 p-0 m-0">{{localTexts.powerDensity}}</div>
                    <div class="col-6 p-0 m-0">{{localTexts.magnetizingInductance}}</div>
                </div>
                <div class="row g-2 mt-2">
                    <div class="col-6">
                        <button
                            :data-cy="dataTestLabel + '-advise-' + adviseIndex + '-details-button'"
                            class="advise-btn advise-btn-outline w-100"
                            data-bs-toggle="offcanvas"
                            data-bs-target="#CoreAdviserDetailOffCanvas"
                            @click="$emit('selectedMas')"
                        >
                            Details
                        </button>
                    </div>
                    <div class="col-6">
                        <button
                            :data-cy="dataTestLabel + '-advise-' + adviseIndex + '-select-button'"
                            class="advise-btn w-100"
                            :class="selected ? 'advise-btn-success' : 'advise-btn-primary'"
                            @click="$emit('selectedMas')"
                        >
                            {{selected ? 'Selected' : 'Select'}}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.advise-option {
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg,
        rgba(var(--bs-dark-rgb), 0.75) 0%,
        rgba(var(--bs-dark-rgb), 0.55) 100%);
    border: 1px solid rgba(var(--bs-light-rgb), 0.08);
    border-left: 3px solid rgba(var(--bs-primary-rgb), 0.8);
    border-radius: 14px;
    box-shadow:
        0 6px 24px rgba(var(--bs-dark-rgb), 0.45),
        inset 0 1px 0 rgba(var(--bs-light-rgb), 0.04);
    overflow: hidden;
    transition: all 0.25s ease;
}

.advise-option-selected {
    border-color: rgba(var(--bs-primary-rgb), 0.55);
    background: linear-gradient(180deg,
        rgba(var(--bs-primary-rgb), 0.1) 0%,
        rgba(var(--bs-dark-rgb), 0.55) 100%);
    box-shadow:
        0 2px 12px rgba(var(--bs-primary-rgb), 0.2),
        inset 0 1px 0 rgba(var(--bs-light-rgb), 0.05);
}

.advise-option-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0.9rem;
    background: rgba(var(--bs-light-rgb), 0.04);
    border-bottom: 1px solid rgba(var(--bs-light-rgb), 0.08);
    color: var(--bs-primary);
    font-weight: 600;
}

.advise-option-title {
    color: var(--bs-white);
    font-size: 1rem;
    font-weight: 600;
}

.advise-option-score {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 700;
    background: rgba(var(--bs-primary-rgb), 0.2);
    color: var(--bs-primary);
    border: 1px solid rgba(var(--bs-primary-rgb), 0.45);
}

.advise-option-body {
    padding: 0.6rem 0.75rem;
}

.advise-option-metrics {
    color: rgba(var(--bs-light-rgb), 0.85);
    font-size: 0.82rem;
}

.advise-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    border: 1px solid transparent;
    cursor: pointer;
    transition: filter 0.15s, box-shadow 0.2s, transform 0.1s, background 0.15s, color 0.15s;
    white-space: nowrap;
}

.advise-btn:hover:not(:disabled) {
    filter: brightness(1.12);
    transform: translateY(-1px);
}

.advise-btn-primary {
    background: linear-gradient(135deg,
        color-mix(in srgb, var(--bs-primary) 115%, transparent 0%) 0%,
        var(--bs-primary) 55%,
        rgb(var(--bs-primary-rgb) / 0.85) 100%);
    color: var(--bs-white);
    border: 1px solid color-mix(in srgb, var(--bs-primary) 70%, var(--bs-white) 30%);
    box-shadow:
        0 0 0 1px rgb(var(--bs-primary-rgb) / 0.35),
        0 2px 8px rgb(var(--bs-primary-rgb) / 0.4),
        inset 0 1px 0 rgba(var(--bs-light-rgb), 0.3);
    text-shadow: 0 1px 1px rgba(var(--bs-dark-rgb), 0.25);
}

.advise-btn-success {
    background: linear-gradient(135deg,
        color-mix(in srgb, var(--bs-success) 115%, transparent 0%) 0%,
        var(--bs-success) 55%,
        rgb(var(--bs-success-rgb) / 0.85) 100%);
    color: var(--bs-white);
    border: 1px solid color-mix(in srgb, var(--bs-success) 70%, var(--bs-white) 30%);
    box-shadow:
        0 0 0 1px rgb(var(--bs-success-rgb) / 0.35),
        0 2px 8px rgb(var(--bs-success-rgb) / 0.4),
        inset 0 1px 0 rgba(var(--bs-light-rgb), 0.3);
    text-shadow: 0 1px 1px rgba(var(--bs-dark-rgb), 0.25);
}

.advise-btn-outline {
    background: rgba(var(--bs-light-rgb), 0.08);
    border: 1px solid rgba(var(--bs-light-rgb), 0.22);
    color: var(--bs-light);
}

.advise-btn-outline:hover:not(:disabled) {
    background: rgba(var(--bs-light-rgb), 0.14);
    border-color: rgba(var(--bs-light-rgb), 0.35);
    color: var(--bs-white);
}
</style>

