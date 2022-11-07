import * as Everpolate from 'everpolate'
import * as FFT from 'fft.js'

export function roundWithDecimals(value, precision, trunc=false) {
    if (trunc)
        return Math.trunc(value / precision) * precision;
    else
        return Math.round(value / precision) * precision;
}

export function roundValue(chart, datasetIndex, index, value, xPrecision, yPrecision) {
    value.x = roundWithDecimals(value.x, xPrecision)
    value.y = roundWithDecimals(value.y, yPrecision)

    chart.data.datasets[datasetIndex].data[index] = value
}

export function checkHorizontalLimits(data, index, value) {
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
}

export function synchronizeExtremes(chart, datasetIndex, index, value, force=false) {
    if ((index == chart.data.datasets[datasetIndex].data.length - 1) | (index == 0) | force) {
        chart.data.datasets[datasetIndex].data.at(-1).y = value.y
        chart.data.datasets[datasetIndex].data.at(0).y = value.y
    }
}

export function getMaxMinInPoints(points, elem=null) {
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

export function formatFrequency(frequency) {
    var base
    var unit
    var label
    if (frequency < 1000) {
        base = 1
        unit = "Hz"
    }
    else if (frequency >= 1000 && frequency < 1000000) {
        base = 1000
        unit = "kHz"
    }
    else if (frequency >= 1000000 && frequency < 1000000000) {
        base = 1000000
        unit = "MHz"
    }
    label = frequency / base
    return {label, unit}
}
export function deepCopy(data) {
    return JSON.parse(JSON.stringify(data))
}

export function sampleWaveform(data, switchingFrequency, samplingNumberPoints) {
        // Interpolation
        const x = []
        const y = []
        data.forEach((item, index) => {
            x.push(item.x)
            y.push(item.y)
        })

        const sampledTime = []
        for(var i = 0; i < samplingNumberPoints; i++) {
            sampledTime.push(i / switchingFrequency / (samplingNumberPoints));
        }
        var linear = Everpolate.linear
        var sampledWaveform = linear(sampledTime, x, y)

        return {sampledTime, sampledWaveform}
}


export function fourierTransform(data, switchingFrequency, samplingNumberPoints) {
        const {sampledTime, sampledWaveform} = sampleWaveform(data, switchingFrequency, samplingNumberPoints)

        // Fourier Transform
        const fft = new FFT(samplingNumberPoints);
        const fourier = fft.createComplexArray();
        fft.realTransform(fourier, sampledWaveform);            
        fft.completeSpectrum(fourier);

        // Harmonic extraction
        const harmonicsAmplitude = []
        const harmonicsFrequencies = []
        for(var i = 0; i < fourier.length / 2; i+=2) {
            harmonicsAmplitude.push(2 * Math.sqrt(Math.pow(fourier[i], 2) + Math.pow(fourier[i + 1], 2)) / samplingNumberPoints)
        }
        for(var i = 0; i < samplingNumberPoints / 2; i++) {
            harmonicsFrequencies.push(switchingFrequency * i)
        }
        return {sampledTime, sampledWaveform, harmonicsAmplitude, harmonicsFrequencies}
}

export function getRootMeanSquare(data) {
    var sumOfSquares = data.reduce(function(s,x) {return (s + x*x)}, 0);
    return Math.sqrt(sumOfSquares / data.length);
}

export function getEffectiveFrequency(data, time) {
    const dividend = []
    const divisor = []
    data.forEach((item, index) => {
        const dataSquared = Math.pow(item, 2)
        const timeSquared = Math.pow(time[index], 2)
        dividend.push(dataSquared * timeSquared)
        divisor.push(dataSquared)
    })
    const sumDivisor = divisor.reduce((a, b) => a + b, 0);
    if (sumDivisor > 0)
        return Math.sqrt(dividend.reduce((a, b) => a + b, 0) / sumDivisor);
    else
        return 0
}

export function getTotalHarmonicDistorsion(data) {
    const dividend = []
    const divisor = data[1]
    data.slice([2]).forEach((item, index) => {
        dividend.push(Math.pow(item, 2))
    })
    if (divisor > 0)
        return Math.sqrt(dividend.reduce((a, b) => a + b, 0)) / divisor;
    else
        return 0;
}

export function removeTrailingZeroes(value, maximumNumberDecimals=4) {
    const split = value.toFixed(4).split(".")
    const decimals = split[1]
    if (decimals[3] != 0 && maximumNumberDecimals > 3)
        value = value.toFixed(4)
    else if (decimals[2] != 0 && maximumNumberDecimals > 2)
        value = value.toFixed(3)
    else if (decimals[1] != 0 && maximumNumberDecimals > 1)
        value = value.toFixed(2)
    else if (decimals[0] != 0 && maximumNumberDecimals > 0)
        value = value.toFixed(1)
    else
        value = value.toFixed(0)
    return value
}

export function unpackDataPoints(dataPoints) {
    const values = []
    const times = []
    dataPoints.forEach((item, index) => {
        values.push(item.y)
        times.push(item.x)
    })
    return {values, times}
}

export function packDataPoints(waveform, frequency, compress) {
    const dataPoints = []
    var compressedData = []
    var compressedTime = []
    var previousSlope = 0

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
        dataPoints.push({x: compressedTime[i], y: compressedData[i]})
    }

    return dataPoints
}

export function tryGuessType(dataPoints, frequency) {
    if (dataPoints.length == 3) {
        if (roundWithDecimals(1 / (dataPoints[2].x - dataPoints[0].x), 0.001) == frequency)
        if (dataPoints[0].y == dataPoints[2].y)
            return "Triangular"
    }
    else if (dataPoints.length == 5) {
        if (roundWithDecimals(1 / (dataPoints[4].x - dataPoints[0].x), 0.001) == frequency)
        if (dataPoints[0].y == dataPoints[1].y)
        if (dataPoints[1].x == dataPoints[2].x)
        if (dataPoints[2].y == dataPoints[3].y)
        if (dataPoints[0].y == dataPoints[4].y)
            return "Square"
    }
    else if (dataPoints.length == 10) {
        if (roundWithDecimals(1 / (dataPoints[9].x - dataPoints[0].x), 0.001) == frequency)
        if (dataPoints[0].y == dataPoints[1].y)
        if (dataPoints[1].x == dataPoints[2].x)
        if (dataPoints[2].y == dataPoints[3].y)
        if (dataPoints[3].x == dataPoints[4].x)
        if (dataPoints[4].y == dataPoints[5].y)
        if (dataPoints[5].x == dataPoints[6].x)
        if (dataPoints[6].y == dataPoints[7].y)
        if (dataPoints[7].x == dataPoints[8].x)
        if (dataPoints[8].y == dataPoints[9].y)
        if (dataPoints[0].y == dataPoints[9].y)
            return "Square with Dead-Time"
    }
    return "Custom"
}
