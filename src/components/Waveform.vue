<template>
    <div>
        <canvas id="chart"></canvas>
    </div>
</template>

<script setup>
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'
import { Chart, registerables } from 'chart.js'
import * as Utils from '/src/assets/js/waveformUtils.js'
import 'chartjs-plugin-dragdata'
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

export default {
    props: {
        waveformTypes: {
            type: Object,
            required: true,
        }
    },
    data() {
        return {
            data: {
                datasets: [
                    {
                        label: 'current',
                        yAxisID: 'current',
                        data:  [],
                        borderWidth: 5,
                        borderColor: theme['info'],
                        backgroundColor: theme['info'],
                    },
                    {
                        label: 'voltage',
                        yAxisID: 'voltage',
                        data: [],
                        borderWidth: 5,
                        borderColor: theme['primary'],
                        backgroundColor: theme['primary'],
                    },
                    {
                        label: 'zeroLineCurrent',
                        yAxisID: 'current',
                        data: [{x: -1, y: 0}, {x: 1, y: 0}],
                        borderWidth: 2,
                        borderColor: theme['white'],
                        backgroundColor: theme['white'],
                    }
                ]
            }
        }
    },
    mounted() {
        options = {
            responsive: true,
            onHover: (event, chartElement) => {
                const target = event.native ? event.native.target : event.target;
                target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            },
            plugins:{
                dragData: {
                    round: 100,
                    dragX: true,
                    showTooltip: true,
                    onDragStart:(e, datasetIndex, index, value) => {
                        e.target.style.cursor = 'grabbing'
                        this.disableDragXByType(datasetIndex, index)
                    },
                    onDrag: (e, datasetIndex, index, value) => {
                        e.target.style.cursor = 'grabbing'
                        Utils.roundValue(chart,
                                         datasetIndex,
                                         index,
                                         value,
                                         commonStore.getXPrecision.value,
                                         datasetIndex == 0? currentStore.getYPrecision.value : voltageStore.getYPrecision.value);
                        this.processByType(datasetIndex, index, value)
                        chart.update()
                    },
                    onDragEnd: (e, datasetIndex, index, value) => {
                        e.target.style.cursor = 'default    '
                        Utils.updateVerticalLimits(chart, datasetIndex);
                        chart.options.plugins.dragData.dragX = true
                        chart.options.plugins.dragData.dragY = true
                        chart.update()
                        if (datasetIndex == 0) {
                            currentStore.setDataPointsFromDragging(chart.data.datasets[0].data);
                        }
                        else {
                            voltageStore.setDataPointsFromDragging(chart.data.datasets[1].data);
                        }
                    },
                },
            },
            scales: {
                current: {
                    type: 'linear',
                    position: 'left',
                    ticks: {
                        beginAtZero: true,
                        color: theme['info'],
                        font: {
                            size: 12
                        },
                    },
                    max: 15,
                    min: -15,
                    grid: {
                        color: theme['info'],
                        borderColor: theme['info'],
                        borderWidth: 2,
                        lineWidth: 0.4
                    },
                },
                voltage: {
                    type: 'linear',
                    position: 'right',
                    ticks: {
                        beginAtZero: true,
                        color: theme['primary'],
                        font: {
                            size: 12
                        },
                    },
                    max: 100,
                    min: -100,
                    grid: {
                        color: theme['primary'],
                        borderColor: theme['primary'],
                        borderWidth: 2,
                        lineWidth: 0.4
                    },
                },
                x:{
                    type: 'linear',
                    ticks: {
                        beginAtZero: true,
                        color: theme['white'],
                        font: {
                            size: 12
                        },
                        callback: function(value, index, values) {
                            const exp = Math.floor(Math.log10(commonStore.getSwitchingFrequency.value))
                            const base = 10 ** exp
                            return Utils.roundWithDecimals(value * base * 10, 0.01).toFixed(2) + "e-" + exp;
                        }
                    },
                    grid: {
                        color: theme['white'],
                        borderColor: theme['white'],
                        borderWidth: 2,
                        lineWidth: 0.4
                    },
                }
            }
        }

        Chart.register(...registerables)
        this.createChart('chart', options)

    },
    created() {
        currentStore.$onAction((action) => {
            if (action.name == "setDataPoint") {
                chart.data.datasets[0].data = JSON.parse(JSON.stringify(currentStore.getDataPoints.value))
            }
        })
        currentStore.$subscribe((mutation, state) => {
            chart.data.datasets[0].data = JSON.parse(JSON.stringify(currentStore.getDataPoints.value))
            chart.update()
            Utils.setHorizontalLimits(chart, 1 / commonStore.getSwitchingFrequency.value / 10)
            Utils.updateVerticalLimits(chart, 0);
            chart.update()
        })
        voltageStore.$subscribe((mutation, state) => {
            chart.data.datasets[1].data = JSON.parse(JSON.stringify(voltageStore.getDataPoints.value))
            chart.update()
            Utils.setHorizontalLimits(chart, 1 / commonStore.getSwitchingFrequency.value / 10)
            Utils.updateVerticalLimits(chart, 1);
            chart.update()
        })
        commonStore.$onAction((action) => {
            if (action.name == "setSwitchingFrequency") {
                var switchingFrequency = action.args[0]
                Utils.setHorizontalLimits(chart, 1 / switchingFrequency / 10)
            }
        })
    },
    methods: {
        createChart(chartId, options) {
            const ctx = document.getElementById(chartId)
            chart = new Chart(ctx, {
                type: 'line',
                data: this.data,
                options: options,
            })

            chart.data.datasets[0].data = [{x: 0, y: 0}]
            chart.data.datasets[1].data = [{x: 0, y: 0}]

            chart.data.datasets.forEach((item, datasetIndex) => {
                Utils.updateVerticalLimits(chart, datasetIndex);
            });
            Utils.setHorizontalLimits(chart)
            chart.update()
            currentStore.setChartReady()
            voltageStore.setChartReady()
            this.$emit('chart-ready')
        },
        getElectricalParameter(datasetIndex) {
            var electricalParameter = null
            if (datasetIndex == 0) {
                electricalParameter = 'current'
            } 
            else {
                electricalParameter = 'voltage'
            }
            return electricalParameter
        },
        disableDragXByType(datasetIndex, index) {
            const electricalParameter = this.getElectricalParameter(datasetIndex)
            if (this.waveformTypes[electricalParameter] == "Triangular") {
                if (index == 0 || index == 2) {
                    chart.options.plugins.dragData.dragX = false
                }
            }
            else if (this.waveformTypes[electricalParameter] == "Square") {
                if (index == 0 || index == 3 || index == 4) {
                    chart.options.plugins.dragData.dragX = false
                }
            }
            else if (this.waveformTypes[electricalParameter] == "Square with Dead-Time") {
                if (index == 0 || index == 3 || index == 4 || index == 7 || index == 8) {
                    chart.options.plugins.dragData.dragX = false
                }
                if (index == 2 || index == 3 || index == 6 || index == 7) {
                    chart.options.plugins.dragData.dragY = false
                }
            }
            else if (this.waveformTypes[electricalParameter] == "Sinusoidal") {
                 chart.options.plugins.dragData.dragX = false
            }
            else if (this.waveformTypes[electricalParameter] == "Custom") {
                if (index == 0 || index == (chart.data.datasets[datasetIndex].data.length - 1)) {
                    chart.options.plugins.dragData.dragX = false
                }
            }
        },
        processByType(datasetIndex, index, value) {
            const electricalParameter = this.getElectricalParameter(datasetIndex)
            if (this.waveformTypes[electricalParameter] == "Triangular") {
                Utils.checkHorizontalLimits(chart, datasetIndex, index, value);
                Utils.synchronizeExtremes(chart, datasetIndex, index, value);
            }
            else if (this.waveformTypes[electricalParameter] == "Custom") {
                Utils.checkHorizontalLimits(chart, datasetIndex, index, value);
                Utils.synchronizeExtremes(chart, datasetIndex, index, value);
            }
            else if (this.waveformTypes[electricalParameter] == "Square") {
                const data = chart.data.datasets[datasetIndex].data
                switch (index) {
                    case 0:
                        data[1].y = data[0].y
                        data[4].y = data[0].y
                    break;
                    case 1:
                        data[0].y = data[1].y
                        data[4].y = data[1].y
                        data[2].x = data[1].x
                    break;
                    case 2:
                        data[3].y = data[2].y
                        data[1].x = data[2].x
                    break;
                    case 3:
                        data[2].y = data[3].y
                    break;
                    case 4:
                        data[0].y = data[4].y
                        data[1].y = data[4].y
                    break;
                }

                const peakToPeakValue = data[2].y - data[1].y
                const offsetValue = 0
                const dc = (data[1].x - data[0].x) / (data[4].x - data[0].x)
                const max = Number(offsetValue) + Number(peakToPeakValue * dc)
                const min = Number(offsetValue) - Number(peakToPeakValue * (1 - dc))
                switch (index) {
                    case 0:
                    case 1:
                    case 4:
                        data[2].y = max
                        data[3].y = max
                    break;
                    case 2:
                    case 3:
                        data[0].y = min
                        data[4].y = min
                        data[1].y = min
                    break;
                }
            }
            else if (this.waveformTypes[electricalParameter] == "Square with Dead-Time") {
                var data = chart.data.datasets[datasetIndex].data
                var dc
                var firstValue = data[1].y
                var secondValue = data[4].y
                switch (index) {
                    case 0:
                    case 1:
                    case 8:
                        firstValue = value.y
                        secondValue = -value.y
                        dc = (data[1].x - data[0].x) / (data[7].x - data[0].x)
                    break;
                    case 2:
                        dc = (data[2].x - data[0].x) / (data[7].x - data[0].x)
                    break;
                    case 5:
                        if (data[5].x < data[4].x) {
                            data[5].x = data[4].x
                        }
                    case 4:
                        firstValue = -value.y
                        secondValue = value.y 
                        dc = (data[5].x - data[4].x) / (data[7].x - data[0].x)
                    break;
                    case 6:
                        dc = (data[6].x - data[4].x) / (data[7].x - data[0].x)
                    break;
                    default:
                        dc = (data[1].x - data[0].x) / (data[7].x - data[0].x)
                    break;
                }
                const initialTime = data[0].x
                const period = data[7].x
                const semiPeriod = data[3].x
                data = [{x: initialTime, y: firstValue },
                        {x: dc * period, y: firstValue },
                        {x: dc * period, y: 0 },
                        {x: semiPeriod, y: 0 },
                        {x: semiPeriod, y: secondValue },
                        {x: semiPeriod + dc * period, y: secondValue },
                        {x: semiPeriod + dc * period, y: 0 },
                        {x: period, y: 0 },
                        {x: period, y: firstValue }]
                chart.data.datasets[datasetIndex].data = data
            }
            else if (this.waveformTypes[electricalParameter] == "Sinusoidal") {
                const numberPoints = chart.data.datasets[datasetIndex].data.length - 1
                const indexAngle = index * 2 * Math.PI / numberPoints
                const maxMin = Utils.getMaxMinInPoints(chart.data.datasets[datasetIndex].data, 'y')
                const offset = chart.data.datasets[datasetIndex].data[0].y
                const newAmplitude = (value.y - offset) / Math.sin(indexAngle) 
                const data = []
                for(var i = 0; i <= numberPoints; i++) {
                    var x = i * 2 * Math.PI / numberPoints
                    var y = (Math.sin(x) * newAmplitude) + Number(offset) 
                    data.push({ x: chart.data.datasets[datasetIndex].data[i].x, y: y });
                }
                chart.data.datasets[datasetIndex].data = data
            }

        }
    }
}
</script>
<style>
canvas {
    background-color : var(--bs-light);
}
</style>