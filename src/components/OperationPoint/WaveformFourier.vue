<script setup>
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'
import { Chart, registerables } from 'chart.js'
import * as Utils from '/src/assets/js/utils.js'
import * as Defaults from '/src/assets/js/defaults.js'
</script>

<script>
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
const currentStore = useCurrentStore()
const voltageStore = useVoltageStore()
const commonStore = useCommonStore()

var options = {};
var chart = null;
var harmonicsFrequencies = [0]
var currentSampledSignal = [-Infinity]
var voltageSampledSignal = [-Infinity]

export default {
    data() {
        return {
            data: {
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
            },
        }
    },
    mounted() {
        options = {
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: theme['white'],
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
                                var peakAux = Utils.formatCurrent(val.raw)
                                peakLabel = Utils.removeTrailingZeroes(peakAux.label, 3)
                                peakUnit = peakAux.unit

                                var rmsAux = Utils.formatCurrent(val.raw / Math.sqrt(2))
                                rmsLabel = Utils.removeTrailingZeroes(rmsAux.label, 3)
                                rmsUnit = rmsAux.unit
                            }
                            else {
                                var peakAux = Utils.formatVoltage(val.raw)
                                peakLabel = Utils.removeTrailingZeroes(peakAux.label, 3)
                                peakUnit = peakAux.unit

                                var rmsAux = Utils.formatVoltage(val.raw / Math.sqrt(2))
                                rmsLabel = Utils.removeTrailingZeroes(rmsAux.label, 3)
                                rmsUnit = rmsAux.unit
                            }
                            const multistringText = ["Peak: " + peakLabel + " " + peakUnit]
                            multistringText.push("RMS: " + rmsLabel + " " + rmsUnit);
                            return multistringText
                        },
                        title: (val) => {
                            const aux = Utils.formatFrequency(val[0].label)
                            const label = Utils.removeTrailingZeroes(aux.label)
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
                        color: theme['info'],
                        font: {
                            size: 12
                        },
                    },
                    grid: {
                        color: theme['info'],
                        borderColor: theme['info'],
                        borderWidth: 2,
                        lineWidth: 0.4
                    },
                },
                voltage: {
                    position: 'right',
                    ticks: {
                        color: theme['primary'],
                        font: {
                            size: 12
                        },
                    },
                    grid: {
                        color: theme['primary'],
                        borderColor: theme['primary'],
                        borderWidth: 2,
                        lineWidth: 0.4
                    },
                },
                x:{
                    ticks: {
                        color: theme['white'],
                        font: {
                            size: 12
                        },
                        callback: function(value, index, values) {
                            var label
                            var unit
                            if (index < harmonicsFrequencies.length) {
                                const aux = Utils.formatFrequency(harmonicsFrequencies[index])
                                label = Utils.removeTrailingZeroes(aux.label)
                                unit = aux.unit
                            }
                            else {
                                label = value
                            }
                            
                            return label + unit;
                        }
                    },
                    grid: {
                        color: theme['white'],
                        borderColor: theme['white'],
                        borderWidth: 2,
                        lineWidth: 0.4
                    },
                }
            },
        }

        Chart.register(...registerables)
        this.createChart('chartFourier', options)

    },
    created() {
        currentStore.$subscribe((mutation, state) => {
            const aux = JSON.parse(JSON.stringify(currentStore.getDataPoints.value))
            
            const {sampledTime,
                   sampledWaveform,
                   harmonicsAmplitude,
                   harmonicsFrequencies} = Utils.fourierTransform(aux,
                                                                  commonStore.getSwitchingFrequency.value,
                                                                  Defaults.defaultSamplingNumberPoints)

            if (currentSampledSignal.slice(0, currentSampledSignal.length / 2).reduce((a, b) => a + b, 0) != sampledWaveform.slice(0, sampledWaveform.length / 2).reduce((a, b) => a + b, 0) || currentSampledSignal[1] != sampledWaveform[1] || currentSampledSignal.length == 0) {
                currentSampledSignal = sampledWaveform
                commonStore.setHarmonicsFrequencies(harmonicsFrequencies)
                currentStore.setHarmonicsAmplitude(harmonicsAmplitude)
                commonStore.setSampledTimePoints(sampledTime)
                currentStore.setSampledDataPoints(sampledWaveform)
            }
            chart.data.datasets[0].data = harmonicsAmplitude.slice(0, Defaults.defaultMaximumNumberHarmonicsShown)
            chart.data.labels = harmonicsFrequencies.slice(0, Defaults.defaultMaximumNumberHarmonicsShown)
            chart.update()
        })
        voltageStore.$subscribe((mutation, state) => {
            const aux = JSON.parse(JSON.stringify(voltageStore.getDataPoints.value))
            const {sampledTime,
                   sampledWaveform,
                   harmonicsAmplitude,
                   harmonicsFrequencies} = Utils.fourierTransform(aux,
                                                                  commonStore.getSwitchingFrequency.value,
                                                                  Defaults.defaultSamplingNumberPoints)
            if (voltageSampledSignal.slice(0, voltageSampledSignal.length / 2).reduce((a, b) => a + b, 0) != sampledWaveform.slice(0, sampledWaveform.length / 2).reduce((a, b) => a + b, 0) || voltageSampledSignal[1] != sampledWaveform[1] || voltageSampledSignal.length == 0) {
                voltageSampledSignal = sampledWaveform
                commonStore.setHarmonicsFrequencies(harmonicsFrequencies)
                voltageStore.setHarmonicsAmplitude(harmonicsAmplitude)
                commonStore.setSampledTimePoints(sampledTime)
                voltageStore.setSampledDataPoints(sampledWaveform)
            }
            chart.data.datasets[1].data = harmonicsAmplitude.slice(0, Defaults.defaultMaximumNumberHarmonicsShown)
            chart.data.labels = harmonicsFrequencies.slice(0, Defaults.defaultMaximumNumberHarmonicsShown)
            chart.update()
        })
        commonStore.$onAction((action) => {
            if (action.name == "setSwitchingFrequency") {
                const switchingFrequency = action.args[0]
                harmonicsFrequencies = []
                for(var i = 0; i < Defaults.defaultSamplingNumberPoints / 2; i++) {
                    harmonicsFrequencies.push(switchingFrequency * i)
                }
                chart.update()
            }
        })
    },
    methods: {
        createChart(chartId, options) {
            const ctx = document.getElementById(chartId)
            chart = new Chart(ctx, {
                type: 'bar',
                data: this.data,
                options: options,
            })

            harmonicsFrequencies = []
            for(var i = 0; i < Defaults.defaultSamplingNumberPoints / 2; i++) {
                harmonicsFrequencies.push(commonStore.getSwitchingFrequency.value * i)
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
