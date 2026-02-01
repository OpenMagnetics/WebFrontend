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
            default: 0.3,
        },
        harmonicPowerThresholdCurrent: {
            type: Number,
            default: 0.1,
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
        }
    },
    computed: {
    },
    watch: { 
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
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: this.$styleStore.operatingPoints.commonParameterTextColor.color,
                    }
                },
                tooltip: {
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
                    ticks: {
                        color: this.$styleStore.operatingPoints.currentGraph.color,
                        font: {
                            size: 12
                        },
                    },
                    grid: {
                        color: this.$styleStore.operatingPoints.currentGraph.color,
                        borderColor: this.$styleStore.operatingPoints.currentGraph.color,
                        borderWidth: 2,
                        lineWidth: 0.4
                    },
                },
                voltage: {
                    position: 'right',
                    ticks: {
                        color: this.$styleStore.operatingPoints.voltageGraph.color,
                        font: {
                            size: 12
                        },
                    },
                    grid: {
                        color: this.$styleStore.operatingPoints.voltageGraph.color,
                        borderColor: this.$styleStore.operatingPoints.voltageGraph.color,
                        borderWidth: 2,
                        lineWidth: 0.4
                    },
                },
                x:{
                    ticks: {
                        color: this.$styleStore.operatingPoints.commonParameterTextColor.color,
                        font: {
                            size: 12
                        },
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
                        color: this.$styleStore.operatingPoints.commonParameterTextColor.color,
                        borderColor: this.$styleStore.operatingPoints.commonParameterTextColor.color,
                        borderWidth: 2,
                        lineWidth: 0.4
                    },
                }
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
        updateChart() {
            if (chart != null && this.modelValue.current.harmonics != null && this.modelValue.voltage.harmonics != null) {
                const commonFrequencies = [];
                this.modelValue.current.harmonics.frequencies.forEach((frequency) => {
                    if (!commonFrequencies.includes(frequency)) {
                        commonFrequencies.push(frequency);
                    }
                })
                this.modelValue.voltage.harmonics.frequencies.forEach((frequency) => {
                    if (!commonFrequencies.includes(frequency)) {
                        commonFrequencies.push(frequency);
                    }
                })

                commonFrequencies.sort(function(a, b) {return a - b; });
                chart.data.labels = commonFrequencies;
                harmonicsFrequencies = commonFrequencies;
                chart.data.datasets[this.getDatasetIndex('current')].data = [];
                chart.data.datasets[this.getDatasetIndex('voltage')].data = [];
                commonFrequencies.forEach((frequency) => {
                    if (this.modelValue.current.harmonics.frequencies.includes(frequency)) {
                        const index = this.modelValue.current.harmonics.frequencies.findIndex((x) => x === frequency);
                        chart.data.datasets[this.getDatasetIndex('current')].data.push(this.modelValue.current.harmonics.amplitudes[index]);
                    }
                    else {
                        chart.data.datasets[this.getDatasetIndex('current')].data.push(0);
                    }
                    if (this.modelValue.voltage.harmonics.frequencies.includes(frequency)) {
                        const index = this.modelValue.voltage.harmonics.frequencies.findIndex((x) => x === frequency);
                        chart.data.datasets[this.getDatasetIndex('voltage')].data.push(this.modelValue.voltage.harmonics.amplitudes[index]);
                    }
                    else {
                        chart.data.datasets[this.getDatasetIndex('voltage')].data.push(0);
                    }
                })


                chart.update()
            }
        },
        async runFFT(signalDescriptor){
            try {
                const result = await this.taskQueueStore.calculateHarmonics(this.modelValue[signalDescriptor].waveform, this.modelValue.frequency);

                if (typeof result === 'string' && result.startsWith("Exception")) {
                    console.error(result);
                    return;
                }

                this.modelValue[signalDescriptor].harmonics = result;

                await this.chopHarmonics(signalDescriptor);

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
    <div>
        <canvas
            :style="$styleStore.operatingPoints.graphBgColor"
            id="chartFourier"
        ></canvas>
    </div>
</template>
