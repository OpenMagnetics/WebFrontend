<script setup>
import { useMasStore } from '../../../../stores/mas'
import { useTaskQueueStore } from '../../../../stores/taskQueue'
import { Chart, registerables } from 'chart.js'
import { formatCurrent, removeTrailingZeroes, formatFrequency, formatVoltage } from '/WebSharedComponents/assets/js/utils.js'
import { defaultSamplingNumberPoints, defaultMaximumNumberHarmonicsShown } from '/WebSharedComponents/assets/js/defaults.js'
import { deepCopy } from '/WebSharedComponents/assets/js/utils.js'
</script>

<script>

var options = {};
var chart = null;
var harmonicsFrequencies = [];

export default {
    props: {
        modelValue:{
            type: Object,
            required: true
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
        updateHarmonics: {
            type: Boolean,
            default: true,
        },
        harmonicPowerThresholdVoltage: {
            type: Number,
            default: 0.05,
        },
        harmonicPowerThresholdCurrent: {
            type: Number,
            default: 0.05,
        },
        maxHarmonicsToPlot: {
            type: Number,
            default: 20,
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const data = {
                labels: [],
                datasets: [
                    {
                        label: 'Current',
                        yAxisID: 'current',
                        fillColor: this.$styleStore.operatingPoints.currentGraph["background-color"],
                        borderColor: this.$styleStore.operatingPoints.currentGraph.color,
                        backgroundColor: this.$styleStore.operatingPoints.currentGraph["background-color"],
                        data: []
                    },
                    {
                        label: 'Voltage',
                        yAxisID: 'voltage',
                        fillColor: this.$styleStore.operatingPoints.voltageGraph["background-color"],
                        borderColor: this.$styleStore.operatingPoints.voltageGraph.color,
                        backgroundColor: this.$styleStore.operatingPoints.voltageGraph["background-color"],
                        data: []
                    }
                ],
            };
        return {
            data,
            masStore,
            taskQueueStore,
            hiddenHarmonicsCount: 0,
        }
    },
    computed: {
    },
    watch: {
        '$settingsStore.operatingPointSettings.maxHarmonicsToPlot'(newValue, oldValue) {
            // Re-render the spectrum when the user changes the cap in settings.
            if (chart != null) this.updateChart();
        },
    },
    created () {
        this.masStore.$onAction((action) => {
            if (action.name == "updatedInputExcitationWaveformUpdatedFromProcessed") {
                if (this.updateHarmonics) {
                    this.runFFT('current');
                    this.runFFT('voltage');
                }
                else {
                    this.updateChart();
                }
            }
            if (action.name == "updatedInputExcitationWaveformUpdatedFromGraph") {
                if (this.updateHarmonics) {
                    this.runFFT('current');
                    this.runFFT('voltage');
                }
                else {
                    this.updateChart();
                }
            }
        })
    },
    mounted () {
        options = {
            maintainAspectRatio: false,
            responsive: true,
            layout: {
                padding: { top: 8, right: 8, bottom: 4, left: 8 },
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: this.$styleStore.operatingPoints.commonParameterTextColor.color,
                        boxWidth: 8,
                        boxHeight: 8,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { size: 11, weight: '600' },
                        padding: 12,
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(20, 20, 20, 0.92)',
                    titleColor: '#f2f2f2',
                    bodyColor: '#f2f2f2',
                    borderColor: 'rgba(var(--bs-primary-rgb), 0.6)',
                    borderWidth: 1,
                    padding: 8,
                    cornerRadius: 6,
                    titleFont: { size: 11, weight: '600' },
                    bodyFont: { size: 11 },
                    callbacks: {
                        label: (val) => {
                            var peakLabel;
                            var peakUnit;
                            var rmsLabel;
                            var rmsUnit;
                            if (val.datasetIndex == 0) {
                                var peakAux = formatCurrent(val.raw)
                                peakLabel = removeTrailingZeroes(peakAux.label, 3)
                                peakUnit = peakAux.unit

                                var rmsAux = formatCurrent(val.raw / Math.sqrt(2))
                                rmsLabel = removeTrailingZeroes(rmsAux.label, 3)
                                rmsUnit = rmsAux.unit
                            }
                            else {
                                var peakAux = formatVoltage(val.raw)
                                peakLabel = removeTrailingZeroes(peakAux.label, 3)
                                peakUnit = peakAux.unit

                                var rmsAux = formatVoltage(val.raw / Math.sqrt(2))
                                rmsLabel = removeTrailingZeroes(rmsAux.label, 3)
                                rmsUnit = rmsAux.unit
                            }
                            const multistringText = ["Peak: " + peakLabel + " " + peakUnit]
                            if (val.label != "0"){
                                multistringText.push("RMS: " + rmsLabel + " " + rmsUnit);
                            }
                            return multistringText
                        },
                        title: (val) => {
                            const aux = formatFrequency(val[0].label)
                            const label = removeTrailingZeroes(aux.label)
                            const unit = aux.unit
                            return "Freq: " + label + " " + unit
                        },
                    }
                },
            },
            scales: {
                current: {
                    position: 'left',
                    beginAtZero: true,
                    ticks: {
                        color: this.$styleStore.operatingPoints.currentGraph.color,
                        font: { size: 11, weight: '500' },
                        padding: 4,
                    },
                    grid: {
                        color: 'rgba(177, 138, 234, 0.12)',
                        drawBorder: false,
                        lineWidth: 1,
                    },
                    border: { display: false },
                },
                voltage: {
                    position: 'right',
                    beginAtZero: true,
                    ticks: {
                        color: this.$styleStore.operatingPoints.voltageGraph.color,
                        font: { size: 11, weight: '500' },
                        padding: 4,
                    },
                    grid: {
                        display: false,
                    },
                    border: { display: false },
                },
                x: {
                    ticks: {
                        color: 'rgba(242, 242, 242, 0.7)',
                        font: { size: 10, weight: '500' },
                        padding: 4,
                        maxRotation: 0,
                        callback: function(value, index, values) {
                            var label
                            var unit
                            if (index < harmonicsFrequencies.length) {
                                const aux = formatFrequency(harmonicsFrequencies[index])
                                label = removeTrailingZeroes(aux.label)
                                unit = aux.unit
                            }
                            else {
                                label = value
                            }

                            return label + unit;
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false,
                        lineWidth: 1,
                    },
                    border: {
                        color: 'rgba(255, 255, 255, 0.15)',
                    },
                }
            },
            elements: {
                bar: {
                    borderRadius: 4,
                    borderSkipped: false,
                },
            },
        }


        Chart.register(...registerables)
        this.createChart('chartFourier', options)

        if (this.updateHarmonics) {
            this.runFFT('current');
            this.runFFT('voltage');
        }
        else {
            this.updateChart();
        }
    },
    methods: {
        getDatasetIndex(signalDescriptor) {
            var datasetIndex = null;
            if (signalDescriptor == 'current') {
                datasetIndex = 0;
            } 
            else {
                datasetIndex = 1;
            }
            return datasetIndex
        },
        effectiveMaxHarmonics() {
            // Per-instance prop wins; otherwise read from the operating point settings.
            const fromSettings = this.$settingsStore?.operatingPointSettings?.maxHarmonicsToPlot;
            if (typeof fromSettings === 'number' && fromSettings > 0) {
                return fromSettings;
            }
            return this.maxHarmonicsToPlot;
        },
        async filterRelevantHarmonics(harmonics, threshold) {
            // Always keep DC (index 0). Use MKF Utils to decide which AC harmonics
            // are above the power threshold; additionally apply a JS-side cap to
            // maxHarmonicsToPlot so the bar chart stays readable for waveforms
            // with many small harmonics (e.g. PLECS imports). Returns a
            // non-mutating filtered copy.
            if (harmonics == null || harmonics.frequencies == null) return harmonics;
            try {
                const cap = this.effectiveMaxHarmonics();
                // Pass -1 to MKF so the threshold alone decides which harmonics
                // are "main"; we cap on the JS side from the largest amplitudes.
                const indexes = await this.taskQueueStore.getMainHarmonicIndexes(harmonics, threshold, -1);
                let idxArr = Array.from(indexes ?? []);
                let hidden = 0;

                if (cap > 0 && idxArr.length > cap) {
                    hidden = idxArr.length - cap;
                    idxArr = idxArr
                        .map(i => ({ i, amp: Math.abs(harmonics.amplitudes[i] ?? 0) }))
                        .sort((a, b) => b.amp - a.amp)
                        .slice(0, cap)
                        .map(x => x.i)
                        .sort((a, b) => a - b);
                }

                const filtered = {
                    amplitudes: [harmonics.amplitudes[0]],
                    frequencies: [harmonics.frequencies[0]],
                };
                for (let i = 0; i < idxArr.length; i++) {
                    filtered.amplitudes.push(harmonics.amplitudes[idxArr[i]]);
                    filtered.frequencies.push(harmonics.frequencies[idxArr[i]]);
                }
                return { filtered, hidden };
            } catch (e) {
                // If MKF unavailable, fall back to the raw harmonics rather than crashing.
                return { filtered: harmonics, hidden: 0 };
            }
        },
        async updateChart() {
            if (chart == null || this.modelValue.current.harmonics == null || this.modelValue.voltage.harmonics == null) {
                return;
            }

            // Render-time filter: only the harmonics that actually carry meaningful
            // power (per MKF Utils + per-signal threshold) are plotted, even when
            // updateHarmonics=false (e.g. harmonics-input view).
            const [curRes, volRes] = await Promise.all([
                this.filterRelevantHarmonics(this.modelValue.current.harmonics, this.harmonicPowerThresholdCurrent),
                this.filterRelevantHarmonics(this.modelValue.voltage.harmonics, this.harmonicPowerThresholdVoltage),
            ]);
            const currentHarmonics = curRes.filtered;
            const voltageHarmonics = volRes.filtered;
            this.hiddenHarmonicsCount = (curRes.hidden || 0) + (volRes.hidden || 0);

            const commonFrequencies = [];
            currentHarmonics.frequencies.forEach((frequency) => {
                if (frequency != null && !commonFrequencies.includes(frequency)) {
                    commonFrequencies.push(frequency);
                }
            })
            voltageHarmonics.frequencies.forEach((frequency) => {
                if (frequency != null && !commonFrequencies.includes(frequency)) {
                    commonFrequencies.push(frequency);
                }
            })

            commonFrequencies.sort(function(a, b) {return a - b; });
            chart.data.labels = commonFrequencies;
            harmonicsFrequencies = commonFrequencies;
            chart.data.datasets[this.getDatasetIndex('current')].data = [];
            chart.data.datasets[this.getDatasetIndex('voltage')].data = [];
            commonFrequencies.forEach((frequency) => {
                if (currentHarmonics.frequencies.includes(frequency)) {
                    const index = currentHarmonics.frequencies.findIndex((x) => x === frequency);
                    const amp = currentHarmonics.amplitudes[index];
                    chart.data.datasets[this.getDatasetIndex('current')].data.push(amp ?? 0);
                }
                else {
                    chart.data.datasets[this.getDatasetIndex('current')].data.push(0);
                }
                if (voltageHarmonics.frequencies.includes(frequency)) {
                    const index = voltageHarmonics.frequencies.findIndex((x) => x === frequency);
                    const amp = voltageHarmonics.amplitudes[index];
                    chart.data.datasets[this.getDatasetIndex('voltage')].data.push(amp ?? 0);
                }
                else {
                    chart.data.datasets[this.getDatasetIndex('voltage')].data.push(0);
                }
            })

            chart.update()
        },
        async runFFT(signalDescriptor){
            try {
                const result = await this.taskQueueStore.calculateHarmonics(this.modelValue[signalDescriptor].waveform, this.modelValue.frequency);

                if (typeof result === 'string' && result.startsWith("Exception")) {
                    console.error(result);
                    return;
                }

                this.modelValue[signalDescriptor].harmonics = result;

                if (chart != null) {
                    this.updateChart();
                }
            } catch (error) {
                console.error('Error in runFFT:', error);
            }
        },
        async chopHarmonics(signalDescriptor){
            try {
                const aux = await this.taskQueueStore.getMainHarmonicIndexes(
                    this.modelValue[signalDescriptor].harmonics,
                    (signalDescriptor == "current"? this.harmonicPowerThresholdCurrent : this.harmonicPowerThresholdVoltage),
                    (this.updateHarmonics? -1 : 1)
                );

                const filteredHarmonics = {
                    amplitudes: [this.modelValue[signalDescriptor].harmonics.amplitudes[0]],
                    frequencies: [this.modelValue[signalDescriptor].harmonics.frequencies[0]]
                }
                // aux is now an array (converted from Embind vector in worker mode)
                for (var i = 0; i < aux.length; i++) {
                    filteredHarmonics.amplitudes.push(this.modelValue[signalDescriptor].harmonics.amplitudes[aux[i]]);
                    filteredHarmonics.frequencies.push(this.modelValue[signalDescriptor].harmonics.frequencies[aux[i]]);
                }

                this.modelValue[signalDescriptor].harmonics = filteredHarmonics;

                if (chart != null) {
                    this.updateChart();
                }
            } catch (error) {
                console.error('Error in chopHarmonics:', error);
            }
        },
        createChart(chartId, options) {
            const ctx = document.getElementById(chartId)
            if (ctx != null) {
                chart = new Chart(ctx, {
                    type: 'bar',
                    data: this.data,
                    options: options,
                })


                // harmonicsFrequencies = []
                // for(var i = 0; i < defaultSamplingNumberPoints / 2; i++) {
                //     harmonicsFrequencies.push(this.modelValue.frequency * i)
                // }
                chart.update()
            }
        },
    }
}
</script>


<template>
    <div class="wf-wrap">
        <canvas
            :style="$styleStore.operatingPoints.graphBgColor"
            id="chartFourier"
        ></canvas>
        <div v-if="hiddenHarmonicsCount > 0"
             class="wf-hint"
             v-tooltip="`${hiddenHarmonicsCount} more harmonic${hiddenHarmonicsCount === 1 ? '' : 's'} above threshold not shown — raise the &quot;Max harmonics to plot&quot; limit in Operating point settings`">
            <i class="bi bi-info-circle-fill"></i>
            <span>+{{ hiddenHarmonicsCount }}</span>
        </div>
    </div>
</template>

<style scoped>
.wf-wrap {
    position: relative;
}

/* Small unobtrusive pill anchored to the top-left of the chart, far from
   the Chart.js legend in the top-right and from the bottom axis labels.
   Hover for the full explanation. */
.wf-hint {
    position: absolute;
    left: 0.5rem;
    top: 0.4rem;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.68rem;
    font-weight: 600;
    line-height: 1;
    color: var(--bs-primary);
    padding: 0.18rem 0.5rem;
    background: rgba(var(--bs-primary-rgb), 0.18);
    border: 1px solid rgba(var(--bs-primary-rgb), 0.45);
    border-radius: 999px;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    cursor: help;
    z-index: 5;
    pointer-events: auto;
}

.wf-hint i {
    font-size: 0.65rem;
}
</style>
