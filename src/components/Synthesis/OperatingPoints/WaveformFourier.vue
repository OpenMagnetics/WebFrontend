<script setup>
import { Chart, registerables } from 'chart.js'
import { formatCurrent, removeTrailingZeroes, formatFrequency, formatVoltage } from '/src/assets/js/utils.js'
import { defaultSamplingNumberPoints, defaultMaximumNumberHarmonicsShown } from '/src/assets/js/defaults.js'
import Module from '/src/assets/js/libMKF.wasm.js';
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
        const data = {
                labels: [],
                datasets: [
                    {
                        label: 'Current',
                        yAxisID: 'current',
                        fillColor: theme["info"],
                        borderColor: theme['info'],
                        backgroundColor: theme['info'],
                        data: []
                    },
                    {
                        label: 'Voltage',
                        yAxisID: 'voltage',
                        fillColor: "red",
                        borderColor: theme['primary'],
                        backgroundColor: theme['primary'],
                        data: []
                    }
                ],
            };
        return {
            theme,
            data,
        }
    },
    computed: {
    },
    watch: { 
        'modelValue.current.waveform'(newValue, oldValue) {
            this.runFFT('current');
            this.runFFT('voltage');
        },
        'modelValue.voltage.waveform'(newValue, oldValue) {
            this.runFFT('current');
            this.runFFT('voltage');
        },
    },
    mounted () {
        options = {
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: this.theme['white'],
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
                        color: this.theme['info'],
                        font: {
                            size: 12
                        },
                    },
                    grid: {
                        color: this.theme['info'],
                        borderColor: this.theme['info'],
                        borderWidth: 2,
                        lineWidth: 0.4
                    },
                },
                voltage: {
                    position: 'right',
                    ticks: {
                        color: this.theme['primary'],
                        font: {
                            size: 12
                        },
                    },
                    grid: {
                        color: this.theme['primary'],
                        borderColor: this.theme['primary'],
                        borderWidth: 2,
                        lineWidth: 0.4
                    },
                },
                x:{
                    ticks: {
                        color: this.theme['white'],
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
                        color: this.theme['white'],
                        borderColor: this.theme['white'],
                        borderWidth: 2,
                        lineWidth: 0.4
                    },
                }
            },
        }


        Chart.register(...registerables)
        this.createChart('chartFourier', options)

        this.runFFT('current');
        this.runFFT('voltage');
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
        runFFT(signalDescriptor){
            this.$mkf.ready.then(_ => {
                this.modelValue[signalDescriptor].harmonics = JSON.parse(this.$mkf.calculate_harmonics(JSON.stringify(this.modelValue[signalDescriptor].waveform), this.modelValue.frequency));
                if (chart != null) {
                    chart.data.datasets[this.getDatasetIndex(signalDescriptor)].data = this.modelValue[signalDescriptor].harmonics.amplitudes.slice(0, defaultMaximumNumberHarmonicsShown);
                    chart.data.labels = this.modelValue[signalDescriptor].harmonics.frequencies.slice(0, defaultMaximumNumberHarmonicsShown);
                    chart.update();
                }
            });
        },
        createChart(chartId, options) {
            const ctx = document.getElementById(chartId)
            chart = new Chart(ctx, {
                type: 'bar',
                data: this.data,
                options: options,
            })

            harmonicsFrequencies = []
            for(var i = 0; i < defaultSamplingNumberPoints / 2; i++) {
                harmonicsFrequencies.push(this.modelValue.frequency * i)
            }
            chart.update()
        },
    }
}
</script>

<style>
canvas {
    background-color : var(--bs-light);
}
</style>

<template>
    <div>
        <canvas id="chartFourier"></canvas>
    </div>
</template>
