<script setup>
import { useCurrentStore,
         useVoltageStore,
         useCommonStore } from '/src/stores/waveform'
import { Chart,
         registerables } from 'chart.js'
import { roundValue,
         updateVerticalLimits, 
         removeTrailingZeroes,
         setHorizontalLimits,
         checkHorizontalLimits,
         synchronizeExtremes,
         getMaxMinInPoints } from '/src/assets/js/utils.js'
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
                        label: 'Current',
                        yAxisID: 'current',
                        data:  [],
                        borderWidth: 5,
                        borderColor: theme['info'],
                        backgroundColor: theme['info'],
                    },
                    {
                        label: 'Voltage',
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
                        const originalValue = value
                        if (this.waveformTypes[this.getElectricalParameter(datasetIndex)] == "Sinusoidal") {
                            roundValue(chart,
                                             datasetIndex,
                                             index,
                                             value,
                                             commonStore.getXPrecision.value,
                                             datasetIndex == 0? currentStore.getYPrecision.value : voltageStore.getYPrecision.value);
                        }
                        this.processByType(datasetIndex, index, value)
                        if (originalValue != value) {
                            chart.update()
                        }

                    },
                    onDragEnd: (e, datasetIndex, index, value) => {
                        e.target.style.cursor = 'default    '
                        updateVerticalLimits(chart, datasetIndex);
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
                legend: {
                    labels: {
                        color: theme['white'], 
                        font: {
                            size: 12
                        },
                        filter: function(item, chart) {
                            return !item.text.includes('zeroLineCurrent');
                        }
                    }
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
                        callback: function(value, index, values) {
                            value = removeTrailingZeroes(value)
                            return value + "A"
                        }
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
                        callback: function(value, index, values) {
                            value = removeTrailingZeroes(value)
                            return value + "V"
                        }
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
                            value = removeTrailingZeroes(value * base * 10)
                            return value + "e-" + exp + "s";
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
        this.createChart('chartWaveforms', options)

    },
    created() {
        currentStore.$subscribe((mutation, state) => {
            chart.data.datasets[0].data = JSON.parse(JSON.stringify(currentStore.getDataPoints.value))
            chart.update()
            setHorizontalLimits(chart, 1 / commonStore.getSwitchingFrequency.value / 10)
            updateVerticalLimits(chart, 0);
            chart.update()
        })
        voltageStore.$subscribe((mutation, state) => {
            chart.data.datasets[1].data = JSON.parse(JSON.stringify(voltageStore.getDataPoints.value))
            chart.update()
            setHorizontalLimits(chart, 1 / commonStore.getSwitchingFrequency.value / 10)
            updateVerticalLimits(chart, 1);
            chart.update()
        })
        commonStore.$onAction((action) => {
            if (action.name == "setSwitchingFrequency") {
                var switchingFrequency = action.args[0]
                setHorizontalLimits(chart, 1 / switchingFrequency / 10)
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
                updateVerticalLimits(chart, datasetIndex);
            });
            setHorizontalLimits(chart)
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
                if (index == 0 || index == 9) {
                    chart.options.plugins.dragData.dragX = false
                }
                if (index == 0 || index == 1 || index == 4 || index == 5 || index == 8 || index == 9) {
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
                checkHorizontalLimits(chart.data.datasets[datasetIndex].data, index, value);
                synchronizeExtremes(chart, datasetIndex, index, value);
            }
            else if (this.waveformTypes[electricalParameter] == "Custom") {
                checkHorizontalLimits(chart.data.datasets[datasetIndex].data, index, value);
                synchronizeExtremes(chart, datasetIndex, index, value);
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
                var firstValue = data[2].y
                var secondValue = data[6].y
                const initialTime = data[0].x
                const period = data[9].x

                switch (index) {
                    case 1:
                    case 2:
                        value.x = Math.min(value.x, 0.25 * period)
                        value.x = Math.max(value.x, 0)
                    break;
                    case 3:
                    case 4:
                        value.x = Math.min(value.x, 0.5 * period)
                        value.x = Math.max(value.x, 0.25 * period)
                    break;
                    case 5:
                    case 6:
                        value.x = Math.min(value.x, 0.75 * period)
                        value.x = Math.max(value.x, 0.5 * period)
                    break;
                    case 7:
                    case 8:
                        value.x = Math.min(value.x, 1 * period)
                        value.x = Math.max(value.x, 0.75 * period)
                    break;

                }
                
                switch (index) {
                    case 1:
                        dc = (data[3].x - value.x) / (data[9].x - data[0].x)
                    break;
                    case 2:
                        firstValue = value.y
                        secondValue = -value.y
                        dc = (data[3].x - value.x) / (data[9].x - data[0].x)
                    break;
                    case 3:
                        firstValue = value.y
                        secondValue = -value.y
                        dc = (value.x - data[2].x) / (data[9].x - data[0].x)
                    break;
                    case 4:
                        dc = (value.x - data[1].x) / (data[9].x - data[0].x)
                    break;
                    case 5:
                        dc = (data[8].x - value.x) / (data[9].x - data[0].x)
                    break;
                    case 6:
                        firstValue = -value.y
                        secondValue = value.y
                        dc = (data[8].x - value.x) / (data[9].x - data[0].x)
                    break;
                    case 7:
                        firstValue = -value.y
                        secondValue = value.y
                        dc = (value.x - data[6].x) / (data[9].x - data[0].x)
                    break;
                    case 8 :
                        dc = (value.x - data[5].x) / (data[9].x - data[0].x)
                    break;

                }
                dc = Math.min(dc, 0.5)
                dc = Math.max(dc, 0)
                data = [{x: initialTime  , y: 0 },
                        {x: (0.25 - dc / 2) * period, y: 0 },
                        {x: (0.25 - dc / 2) * period, y: firstValue },
                        {x: (0.25 + dc / 2) * period, y: firstValue },
                        {x: (0.25 + dc / 2) * period, y: 0 },
                        {x: (0.75 - dc / 2) * period, y: 0 },
                        {x: (0.75 - dc / 2) * period, y: secondValue },
                        {x: (0.75 + dc / 2) * period, y: secondValue },
                        {x: (0.75 + dc / 2) * period, y: 0 },
                        {x: period, y: 0 }]
                chart.data.datasets[datasetIndex].data = data
            }
            else if (this.waveformTypes[electricalParameter] == "Sinusoidal") {
                const numberPoints = chart.data.datasets[datasetIndex].data.length - 1
                const indexAngle = index * 2 * Math.PI / numberPoints
                const maxMin = getMaxMinInPoints(chart.data.datasets[datasetIndex].data, 'y')
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

<template>
    <div>
        <canvas id="chartWaveforms"></canvas>
    </div>
</template>
