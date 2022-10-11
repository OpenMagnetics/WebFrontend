export function roundWithDecimals(value, precision) {
    return Math.round(value / precision) * precision;
}

export function roundValue(chart, datasetIndex, index, value, xPrecision, yPrecision) {
    value.x = roundWithDecimals(value.x, xPrecision)
    value.y = roundWithDecimals(value.y, yPrecision)

    chart.data.datasets[datasetIndex].data[index] = value
}

export function checkHorizontalLimits(chart, datasetIndex, index, value) {
    if (index < chart.data.datasets[datasetIndex].data.length - 1) {
        if (value.x > chart.data.datasets[datasetIndex].data[index + 1].x) {
            chart.data.datasets[datasetIndex].data[index].x = chart.data.datasets[datasetIndex].data[index + 1].x
        }
    }

    if (index > 0) {
        if (value.x < chart.data.datasets[datasetIndex].data[index - 1].x) {
            chart.data.datasets[datasetIndex].data[index].x = chart.data.datasets[datasetIndex].data[index - 1].x
        }
    }
}

export function synchronizeExtremes(chart, datasetIndex, index, value, force=false) {
    if ((index == chart.data.datasets[datasetIndex].data.length - 1) | (index == 0) | force) {
        chart.data.datasets[datasetIndex].data.at(-1).y = value.y
        chart.data.datasets[datasetIndex].data.at(0).y = value.y
    }
}

export function getMaxMinInPoints(points, elem) {
    var max = -Infinity
    var min = Infinity
    points.forEach((item, index) => {
        if (item[elem] > max) {
            max = item[elem];
        }
        if (item[elem] < min) {
            min = item[elem];
        }
    });
    return {max, min}
}

export function updateVerticalLimits(chart, datasetIndex) {
    var aux = getMaxMinInPoints(chart.data.datasets[datasetIndex].data, 'y')
    var yMax = aux['max']
    var yMin = aux['min']

    const newPadding = Math.max(Math.abs(yMax + (yMax - yMin) * 0.2), Math.abs(yMin - (yMax - yMin) * 0.2))

    chart.options.scales[chart.data.datasets[datasetIndex].yAxisID].max = newPadding
    chart.options.scales[chart.data.datasets[datasetIndex].yAxisID].min = -newPadding

}
export function setHorizontalLimits(chart, step) {
    var aux = getMaxMinInPoints(chart.data.datasets[0].data, 'x')
    chart.options.scales.x.max = aux['max']
    chart.options.scales.x.min = aux['min']
    chart.options.scales.x.stepSize = step
}

export function scaleData(points, switchingFrequency) {
    var xMax = points[points.length - 1].x
    var xMin = points[0].x
    points.forEach((item, index) => {
        item.x = (item.x - xMin) / switchingFrequency / (xMax - xMin)
    })
    return points
}

export function deepCopy(data) {
    return JSON.parse(JSON.stringify(data))
}