<script setup>
import { useMasStore } from '../../../../stores/mas'
import { Chart,
         registerables } from 'chart.js'
import { removeTrailingZeroes,
         roundWithDecimals } from '/WebSharedComponents/assets/js/utils.js'
import 'chartjs-plugin-dragdata'
</script>

<script>
var options = {};
var chart = null;

export default {
    props: {
        enableDrag:{
            type: Boolean,
            default: true
        },
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
        const masStore = useMasStore();
        return {
            data: {
                datasets: [
                    {
                        label: 'Current',
                        yAxisID: 'current',
                        data:  this.convertMasToChartjs(this.modelValue.current.waveform),
                        pointRadius: this.enableDrag? 2 : 1,
                        borderWidth: 5,
                        borderColor: this.$styleStore.operatingPoints.currentGraph.color,
                        backgroundColor: this.$styleStore.operatingPoints.currentGraph["background-color"],
                    },
                    {
                        label: 'Voltage',
                        yAxisID: 'voltage',
                        data: this.convertMasToChartjs(this.modelValue.voltage.waveform),
                        pointRadius: this.enableDrag? 2 : 1,
                        borderWidth: 5,
                        borderColor: this.$styleStore.operatingPoints.voltageGraph.color,
                        backgroundColor: this.$styleStore.operatingPoints.voltageGraph["background-color"],
                    },
                    {
                        label: 'zeroLineCurrent',
                        yAxisID: 'zeroLineCurrent',
                        data: [{x: -1, y: 0}, {x: 1, y: 0}],
                        borderWidth: 2,
                        borderColor: this.$styleStore.operatingPoints.commonParameterTextColor.color,
                        backgroundColor: this.$styleStore.operatingPoints.commonParameterBgColor.background,
                    }
                ]
            },
            masStore,
        }
    }, 
    watch: { 
        modelValue(newValue, oldValue) {
            this.updateSignal('current', newValue);
            this.updateSignal('voltage', newValue);
        },
    },
    mounted() {
        const modelValue = this.modelValue;
        options = {
            responsive: true,
            onHover: (event, chartElement) => {
                const target = event.native ? event.native.target : event.target;
                target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            },
            plugins:{
                dragData: {
                    round: 100,
                    dragX: this.enableDrag,
                    dragY: this.enableDrag,
                    showTooltip: true,
                    onDragStart:(e, datasetIndex, index, value) => {
                        e.target.style.cursor = 'grabbing';
                        this.disableDragXByType(datasetIndex, index);
                    },
                    onDrag: (e, datasetIndex, index, value) => {

                        e.target.style.cursor = 'grabbing';
                        const originalValue = value;
                        const label = this.modelValue[this.getSignalDescriptor(datasetIndex)]?.processed?.label;
                        if (label == "Sinusoidal") {
                            this.roundValue(datasetIndex, index, value, 1 / modelValue.frequency / 100, this.getYPrecision(datasetIndex));
                        }
                        this.processByType(datasetIndex, index, value)
                        if (originalValue != value) {
                            chart.update()
                        }

                    },
                    onDragEnd: (e, datasetIndex, index, value) => {
                        e.target.style.cursor = 'default'
                        this.updateVerticalLimits(datasetIndex);
                        chart.options.plugins.dragData.dragX = this.enableDrag;
                        chart.options.plugins.dragData.dragY = this.enableDrag;
                        chart.update();
                        this.modelValue[this.getSignalDescriptor(datasetIndex)].waveform = this.convertChartjsToMas(chart.data.datasets[datasetIndex].data);
                        this.$emit("updatedWaveform", this.getSignalDescriptor(datasetIndex));
                    },
                },
                legend: {
                    labels: {
                        color: this.$styleStore.operatingPoints.commonParameterTextColor.color, 
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
                        color: this.$styleStore.operatingPoints.currentGraph.color,
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
                        color: this.$styleStore.operatingPoints.currentGraph.color,
                        borderColor: this.$styleStore.operatingPoints.currentGraph.color,
                        borderWidth: 2,
                        lineWidth: 0.4
                    },
                },
                voltage: {
                    type: 'linear',
                    position: 'right',
                    ticks: {
                        beginAtZero: true,
                        color: this.$styleStore.operatingPoints.voltageGraph.color,
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
                        color: this.$styleStore.operatingPoints.voltageGraph.color,
                        borderColor: this.$styleStore.operatingPoints.voltageGraph.color,
                        borderWidth: 2,
                        lineWidth: 0.4
                    },
                },
                x:{
                    type: 'linear',
                    ticks: {
                        beginAtZero: true,
                        color: this.$styleStore.operatingPoints.commonParameterTextColor.color,
                        font: {
                            size: 12
                        },
                        callback: function(value, index, values) {
                            const exp = Math.floor(Math.log10(modelValue.frequency))
                            const base = 10 ** exp
                            value = removeTrailingZeroes(value * base * 10)
                            return value + "e-" + (exp + 1) + "s";
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
        this.createChart('chartWaveforms', options)

    },
    created() {
        this.masStore.$onAction((action) => {
            if (action.name == "updatedInputExcitationWaveformUpdatedFromProcessed") {
                var signalDescriptor = action.args[0];
                this.updateSignal(signalDescriptor, this.modelValue);
            }
        })
    },
    methods: {
        getMaxMinInPoints(points, elem=null) {
            var max = -Infinity
            var min = Infinity
            points.forEach((item, index) => {
                var value
                if (elem == null)
                    value = item
                else 
                    value = item[elem]

                if (value > max) {
                    max = value;
                }
                if (value < min) {
                    min = value;
                }
            });
            return {max, min}
        },
        roundValue(datasetIndex, index, value, xPrecision, yPrecision) {
            value.x = roundWithDecimals(value.x, xPrecision)
            value.y = roundWithDecimals(value.y, yPrecision)
        
            chart.data.datasets[datasetIndex].data[index] = value
        },
        synchronizeExtremes(datasetIndex, index, value, force=false) {
            if ((index == chart.data.datasets[datasetIndex].data.length - 1) | (index == 0) | force) {
                chart.data.datasets[datasetIndex].data.at(-1).y = value.y
                chart.data.datasets[datasetIndex].data.at(0).y = value.y
            }
        },
        checkHorizontalLimits(data, index, value) {
            if (index < data.length - 1) {
                if (value.x > data[index + 1].x) {
                    data[index].x = data[index + 1].x
                }
            }

            if (index > 0) {
                if (value.x < data[index - 1].x) {
                    data[index].x = data[index - 1].x
                }
            }
            return data[index]
        },
        convertMasToChartjs(waveform, frequency, compress=false){
            const dataset = []
            var compressedData = []
            var compressedTime = []
            var previousSlope = 0

            if (waveform == null)
                return
            if (waveform["data"] == null)
                return

            if (!("time" in waveform)) {
                waveform["time"] = []
                for (let i = 0; i < waveform["data"].length; i++) {
                    waveform["time"].push(i / frequency / waveform["data"].length)
                }
            }

            if (compress) {
                for (let i = 0; i < waveform["data"].length; i++) {
                    var slope
                    if (i < waveform["data"].length - 1) {
                        slope = (waveform["data"][i + 1] - waveform["data"][i]) / (waveform["time"][i + 1] - waveform["time"][i])
                    }
                    else {
                        slope = 0
                    }
                    if ((Math.abs(slope - previousSlope) > 1e-6) || (i == 0) || (i == (waveform["data"].length - 1))) {
                        compressedData.push(waveform["data"][i])
                        compressedTime.push(waveform["time"][i])
                    }
                    previousSlope = slope
                }
            }
            else {
                compressedData = waveform["data"]
                compressedTime = waveform["time"]
            }

            for (let i = 0; i < compressedData.length; i++) {
                dataset.push({x: compressedTime[i], y: compressedData[i]})
            }
            return dataset;
        },
        convertChartjsToMas(dataset){
            var waveform = {
                data: [],
                time: []
            };
            for(var i = 0; i < dataset.length; i++) {
                waveform.time.push(dataset[i].x);
                waveform.data.push(dataset[i].y);
            }
            return waveform;
        },
        getYPrecision(datasetIndex) {
            var aux = this.getMaxMinInPoints(chart.data.datasets[datasetIndex].data, 'y')
            if (aux['max'] != aux['min']) {
                return Math.abs(aux['max'] - aux['min']) / 100;
            }
        },
        setHorizontalLimits(step) {
            var aux = this.getMaxMinInPoints(chart.data.datasets[0].data, 'x')
            chart.options.scales.x.max = aux['max']
            chart.options.scales.x.min = aux['min']
            chart.options.scales.x.stepSize = step
        },
        updateVerticalLimits(datasetIndex) {
            var aux = this.getMaxMinInPoints(chart.data.datasets[datasetIndex].data, 'y')
            var yMax = aux['max']
            var yMin = aux['min']

            const newPadding = Math.max(Math.abs(yMax + (yMax - yMin) * 0.2), Math.abs(yMin - (yMax - yMin) * 0.2))

            chart.options.scales[chart.data.datasets[datasetIndex].yAxisID].max = newPadding
            chart.options.scales[chart.data.datasets[datasetIndex].yAxisID].min = -newPadding
        },
        createChart(chartId, options) {
            const ctx = document.getElementById(chartId)
            if (ctx != null) {
                chart = new Chart(ctx, {
                    type: 'line',
                    data: this.data,
                    options: options,
                })


                chart.data.datasets.forEach((item, datasetIndex) => {
                    this.updateVerticalLimits(datasetIndex);
                });
                this.setHorizontalLimits()
                chart.update()
            }
        },
        getSignalDescriptor(datasetIndex) {
            var signalDescriptor = null
            if (datasetIndex == 0) {
                signalDescriptor = 'current'
            } 
            else {
                signalDescriptor = 'voltage'
            }
            return signalDescriptor
        },
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
        disableDragXByType(datasetIndex, index) {
            const signalDescriptor = this.getSignalDescriptor(datasetIndex)
            const label = this.modelValue[signalDescriptor]?.processed?.label;
            if (label == "Triangular") {
                if (index == 0 || index == 2) {
                    chart.options.plugins.dragData.dragX = false;
                }
            }
            else if (label == "Rectangular" ) {
                if (index == 0 || index == 1 || index == 4) {
                    chart.options.plugins.dragData.dragX = false;
                }
            }
            else if (label == "Unipolar Triangular") {
                if (index == 0 || index == 4) {
                    chart.options.plugins.dragData.dragX = false;
                }
            }
            else if (label == "Unipolar Rectangular" || label == "Flyback Primary") {
                if (index == 0 || index == 1 || index == 4) {
                    chart.options.plugins.dragData.dragX = false;
                }
            }
            else if (label == "Flyback Secondary") {
                if (index == 0 || index == 3 || index == 4) {
                    chart.options.plugins.dragData.dragX = false;
                }
            }
            else if (label == "Bipolar Rectangular") {
                if (index == 0 || index == 9) {
                    chart.options.plugins.dragData.dragX = false;
                }
                if (index == 0 || index == 1 || index == 4 || index == 5 || index == 8 || index == 9) {
                    chart.options.plugins.dragData.dragY = false;
                }
            }
            else if (label == "Sinusoidal") {
                 chart.options.plugins.dragData.dragX = false;
            }
            else if (!label || label == "Custom") {
                if (index == 0 || index == (chart.data.datasets[datasetIndex].data.length - 1)) {
                    chart.options.plugins.dragData.dragX = false;
                }
            }
        },
        processByType(datasetIndex, index, value) {
            const signalDescriptor = this.getSignalDescriptor(datasetIndex)
            const label = this.modelValue[signalDescriptor]?.processed?.label;
            if (label == "Triangular") {
                this.checkHorizontalLimits(chart.data.datasets[datasetIndex].data, index, value);
                this.synchronizeExtremes(datasetIndex, index, value);
            }
            else if (!label || label == "Custom") {
                this.checkHorizontalLimits(chart.data.datasets[datasetIndex].data, index, value);
                this.synchronizeExtremes(datasetIndex, index, value);
            }
            else if (label == "Rectangular") {
                const data = chart.data.datasets[datasetIndex].data
                switch (index) {
                    case 0:
                        data[1].x = data[0].x
                        data[4].y = data[0].y
                    break;
                    case 1:
                        data[0].x = data[1].x
                        data[2].y = data[1].y
                    break;
                    case 2:
                        data[1].y = data[2].y
                        data[3].x = data[2].x
                    break;
                    case 3:
                        data[2].x = data[3].x
                        data[0].y = data[3].y
                        data[4].y = data[3].y
                    break;
                    case 4:
                        data[0].y = data[4].y
                    break;
                }

                const peakToPeakValue = data[2].y - data[3].y
                const offsetValue = 0
                const dc = (data[2].x - data[1].x) / (data[4].x - data[0].x)
                const max = Number(offsetValue) + Number(peakToPeakValue * dc)
                const min = Number(offsetValue) - Number(peakToPeakValue * (1 - dc))
                switch (index) {
                    case 0:
                    case 1:
                    case 4:
                        data[1].y = max
                        data[2].y = max
                    break;
                    case 2:
                    case 3:
                        data[0].y = min
                        data[4].y = min
                        data[3].y = min
                    break;
                }
            }
            else if (label == "Unipolar Rectangular") {
                const data = chart.data.datasets[datasetIndex].data
                switch (index) {
                    case 0:
                        data[1].x = data[0].x;
                        data[3].y = data[0].y;
                        data[4].y = data[0].y;
                    break;
                    case 1:
                        data[2].y = data[1].y;
                    break;
                    case 2:
                        data[3].x = data[2].x;
                        data[1].y = data[2].y;
                    break;
                    case 3:
                        data[2].x = data[3].x;
                        data[0].y = data[3].y;
                        data[4].y = data[3].y;
                    break;
                    case 4:
                        data[0].y = data[4].y;
                        data[3].y = data[4].y;
                    break;
                }
            }
            else if (label == "Flyback Primary") {
                const data = chart.data.datasets[datasetIndex].data
                switch (index) {
                    case 0:
                        data[1].x = data[0].x;
                        data[3].y = data[0].y;
                        data[4].y = data[0].y;
                    break;
                    case 2:
                        data[3].x = data[2].x;
                    break;
                    case 3:
                        data[2].x = data[3].x;
                        data[0].y = data[3].y;
                        data[4].y = data[3].y;
                    break;
                    case 4:
                        data[0].y = data[4].y;
                        data[3].y = data[4].y;
                    break;
                }
            }
            else if (label == "Flyback Secondary") {
                const data = chart.data.datasets[datasetIndex].data
                switch (index) {
                    case 0:
                        data[1].y = data[0].y;
                        data[4].y = data[0].y;
                    break;
                    case 1:
                        data[2].x = data[1].x;
                        data[0].y = data[1].y;
                        data[4].y = data[1].y;
                    break;
                    case 2:
                        data[1].x = data[2].x;
                    break;
                    case 4:
                        data[0].y = data[4].y;
                        data[3].y = data[4].y;
                    break;
                }
            }
            else if (label == "Unipolar Triangular") {
                const data = chart.data.datasets[datasetIndex].data
                switch (index) {
                    case 0:
                        data[2].y = data[0].y;
                        data[3].y = data[0].y;
                    break;
                    case 1:
                        data[2].x = data[1].x;
                    break;
                    case 2:
                        data[0].y = data[2].y;
                        data[3].y = data[2].y;
                        data[1].x = data[2].x;
                    break;
                    case 3:
                        data[2].y = data[3].y;
                        data[0].y = data[3].y;
                    break;
                }
            }
            else if (label == "Bipolar Rectangular") {
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
            else if (label == "Sinusoidal") {
                const numberPoints = chart.data.datasets[datasetIndex].data.length - 1
                const indexAngle = index * 2 * Math.PI / numberPoints
                const maxMin = this.getMaxMinInPoints(chart.data.datasets[datasetIndex].data, 'y')
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
        },
        updateSignal(signalDescriptor, excitation){
            chart.data.datasets[this.getDatasetIndex(signalDescriptor)].data = this.convertMasToChartjs(excitation[signalDescriptor].waveform, excitation.frequency);
            chart.update();
            this.setHorizontalLimits(1 / excitation.frequency / 10);
            this.updateVerticalLimits(this.getDatasetIndex(signalDescriptor));
            chart.update();
        },
    }
}
</script>

<template>
    <div>
        <canvas
            :style="$styleStore.operatingPoints.graphBgColor"
            id="chartWaveforms"
        ></canvas>
    </div>
</template>
