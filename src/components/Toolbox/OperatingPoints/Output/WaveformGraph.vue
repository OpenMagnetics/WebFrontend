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
            dragUpdateTimeout: null, // For debouncing chart updates during drag
            data: {
                datasets: [
                    {
                        type: 'line',
                        label: 'Current',
                        yAxisID: 'current',
                        data:  this.convertMasToChartjs(this.modelValue.current.waveform),
                        showLine: true,
                        pointRadius: this.enableDrag ? 2.5 : 0,
                        pointHoverRadius: this.enableDrag ? 4 : 0,
                        pointHitRadius: this.enableDrag ? 6 : 0,
                        pointHoverBorderColor: '#ffffff',
                        pointHoverBorderWidth: 1,
                        pointHoverBackgroundColor: this.$styleStore.operatingPoints.currentGraph.color,
                        borderWidth: this.enableDrag ? 2.25 : 1.85,
                        tension: this.enableDrag ? 0 : 0.15,
                        cubicInterpolationMode: this.enableDrag ? 'default' : 'monotone',
                        spanGaps: true,
                        borderColor: this.$styleStore.operatingPoints.currentGraph.color,
                        backgroundColor: 'rgba(177, 138, 234, 0.12)',
                        fill: this.enableDrag ? false : 'origin',
                    },
                    {
                        type: 'line',
                        label: 'Voltage',
                        yAxisID: 'voltage',
                        data: this.convertMasToChartjs(this.modelValue.voltage.waveform),
                        showLine: true,
                        pointRadius: this.enableDrag ? 2.5 : 0,
                        pointHoverRadius: this.enableDrag ? 4 : 0,
                        pointHitRadius: this.enableDrag ? 6 : 0,
                        pointHoverBorderColor: '#ffffff',
                        pointHoverBorderWidth: 1,
                        pointHoverBackgroundColor: this.$styleStore.operatingPoints.voltageGraph.color,
                        borderWidth: this.enableDrag ? 2.25 : 1.85,
                        tension: this.enableDrag ? 0 : 0.05,
                        spanGaps: true,
                        borderColor: this.$styleStore.operatingPoints.voltageGraph.color,
                        backgroundColor: 'rgba(0, 182, 255, 0.1)',
                        fill: this.enableDrag ? false : 'origin',
                    },
                    {
                        type: 'line',
                        label: 'zeroLineCurrent',
                        yAxisID: 'zeroLineCurrent',
                        data: [{x: -1, y: 0}, {x: 1, y: 0}],
                        borderWidth: 1,
                        spanGaps: true,
                        pointRadius: 0,
                        borderColor: 'rgba(255, 255, 255, 0.18)',
                        backgroundColor: 'transparent',
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
            devicePixelRatio: 1.25, // Sharp on HiDPI without killing perf on huge datasets
            parsing: false, // Disable data parsing for raw number arrays (much faster)
            normalized: true, // Tell Chart.js data is already normalized
            animation: false, // Disable animations
            transitions: { active: { animation: { duration: 0 } } },
            resizeDelay: 100, // Coalesce resize observer events
            spanGaps: true,
            decimation: {
                enabled: true,
                algorithm: 'lttb', // Largest Triangle Three Bucket - best for line charts
                samples: 400, // Slightly tighter
                threshold: 800, // Decimate sooner
            },
            interaction: {
                mode: 'index',   // Hover hits ALL datasets at the same x
                intersect: false,
                axis: 'x',
            },
            elements: {
                line: {
                    borderJoinStyle: 'round',
                    borderCapStyle: 'round',
                },
                point: this.enableDrag
                    ? { hitRadius: 6, hoverRadius: 5 }
                    : { radius: 0, hoverRadius: 0, hitRadius: 0 },
            },
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
                            // Debounce chart updates for better performance with large datasets
                            if (this.dragUpdateTimeout) {
                                clearTimeout(this.dragUpdateTimeout);
                            }
                            this.dragUpdateTimeout = setTimeout(() => {
                                chart.update('none'); // 'none' = no animation
                            }, 16); // ~60fps
                        }
                    },
                    onDragEnd: (e, datasetIndex, index, value) => {
                        e.target.style.cursor = 'default'
                        // Clear any pending debounced updates
                        if (this.dragUpdateTimeout) {
                            clearTimeout(this.dragUpdateTimeout);
                            this.dragUpdateTimeout = null;
                        }
                        this.updateVerticalLimits(datasetIndex);
                        chart.options.plugins.dragData.dragX = this.enableDrag;
                        chart.options.plugins.dragData.dragY = this.enableDrag;
                        chart.update('none'); // 'none' = no animation for better performance
                        this.modelValue[this.getSignalDescriptor(datasetIndex)].waveform = this.convertChartjsToMas(chart.data.datasets[datasetIndex].data);
                        this.$emit("updatedWaveform", this.getSignalDescriptor(datasetIndex));
                    },
                },
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
                        filter: function(item, chart) {
                            return !item.text.includes('zeroLineCurrent');
                        }
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
                },
            },
            layout: {
                padding: { top: 8, right: 8, bottom: 4, left: 8 },
            },
            scales: {
                current: {
                    type: 'linear',
                    position: 'left',
                    ticks: {
                        beginAtZero: true,
                        color: this.$styleStore.operatingPoints.currentGraph.color,
                        font: { size: 11, weight: '500' },
                        padding: 4,
                        callback: function(value, index, values) {
                            value = removeTrailingZeroes(value)
                            return value + "A"
                        }
                    },
                    max: 15,
                    min: -15,
                    grid: {
                        color: 'rgba(177, 138, 234, 0.12)',
                        drawBorder: false,
                        lineWidth: 1,
                    },
                    border: { display: false },
                },
                voltage: {
                    type: 'linear',
                    position: 'right',
                    ticks: {
                        beginAtZero: true,
                        color: this.$styleStore.operatingPoints.voltageGraph.color,
                        font: { size: 11, weight: '500' },
                        padding: 4,
                        callback: function(value, index, values) {
                            value = removeTrailingZeroes(value)
                            return value + "V"
                        }
                    },
                    max: 100,
                    min: -100,
                    grid: {
                        display: false,
                    },
                    border: { display: false },
                },
                x:{
                    type: 'linear',
                    ticks: {
                        beginAtZero: true,
                        color: 'rgba(242, 242, 242, 0.7)',
                        font: { size: 10, weight: '500' },
                        padding: 4,
                        maxRotation: 0,
                        callback: function(value, index, values) {
                            const exp = Math.floor(Math.log10(modelValue.frequency))
                            const base = 10 ** exp
                            value = removeTrailingZeroes(value * base * 10)
                            return value + "e-" + (exp + 1) + "s";
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
    beforeUnmount() {
        // Clean up any pending debounced updates
        if (this.dragUpdateTimeout) {
            clearTimeout(this.dragUpdateTimeout);
            this.dragUpdateTimeout = null;
        }
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
            chart.update('none'); // 'none' = no animation for better performance
            this.setHorizontalLimits(1 / excitation.frequency / 10);
            this.updateVerticalLimits(this.getDatasetIndex(signalDescriptor));
            chart.update('none'); // 'none' = no animation for better performance
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
