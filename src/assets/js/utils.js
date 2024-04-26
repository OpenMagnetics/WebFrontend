import * as Everpolate from 'everpolate'
import * as FFT from 'fft.js'
import * as Defaults from '/src/assets/js/defaults.js'
import axios from "axios"

var requesting = 0

export function downloadBase64asPDF(pdfBase64, fileName) {
    const linkSource = `data:application/pdf;base64,${pdfBase64}`;
    const downloadLink = document.createElement("a");
    downloadLink.href = linkSource;
    downloadLink.download = fileName;
    downloadLink.click();
}

export function calculateObjectSize(obj) {
    // This function takes an object as a parameter and returns the size of data in bytes
    // Initialize a variable to store the total size
    let totalSize = 0;
    // Get the keys of the object
    let keys = Object.keys(obj);
    // Loop through each key
    for (let key of keys) {
        // Get the value of the key
        let value = obj[key];
        // Check the type of the value
        if (typeof value === "string") {
            // If the value is a string, add its length to the total size
            totalSize += value.length;
        } else if (typeof value === "number") {
            // If the value is a number, add 8 bytes to the total size
            totalSize += 8;
        } else if (typeof value === "boolean") {
            // If the value is a boolean, add 4 bytes to the total size
            totalSize += 4;
        } else if (typeof value === "object" && value !== null) {
            // If the value is an object and not null, recursively call the function and add the result to the total size
            totalSize += calculateObjectSize(value);
        }
        // Ignore other types of values such as undefined, function, symbol, etc.
    }
    // Return the total size
    return totalSize;
}

export function findCoreMaterial(dataCacheStore, materialName) {
    var foundMaterial;
    dataCacheStore.masData.coreMaterials.forEach((material) => {
        if (material.name == materialName) {
            foundMaterial = material;
        }
    })
    return foundMaterial;
}
export function findCoreShape(dataCacheStore, shapeName) {
    var foundShape;
    dataCacheStore.masData.coreShapes.forEach((shape) => {
        if (shape.name == shapeName) {
            foundShape = shape;
        }
    })
    return foundShape;
}

export function removeEmpty(obj) {
    Object.entries(obj).forEach(([key, val])  =>
        (val && typeof val === 'object') && removeEmpty(val) ||
        (val === null || val === "") && delete obj[key]
    );
    return obj;
};

export function toCamelCase(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
}

export function toPascalCase(string) {
    var result = toCamelCase(string);
    const finalResult = result.charAt(0).toUpperCase() + result.slice(1);
    return finalResult;
}

export function toTitleCase(str) {
    if (typeof str === "string") {
        const result = str.replace(/([A-Z])/g, " $1");
        const finalResult = result.charAt(0).toUpperCase() + result.slice(1);
        return finalResult.trim();
    }
    else {
        return str;
    }
}

export function toDashCase(str) {
    return str.replace(/\s+/g, '-').toLowerCase();
}

export function isString(x) {
    return Object.prototype.toString.call(x) === "[object String]"
}

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

export function formatUnit(valueRaw, unitRaw) {
    var base
    var unit
    var label
    if (Math.abs(valueRaw) < 0.000000001 && Math.abs(valueRaw) != 0) {
        base = 0.000000000001
        unit = "p" + unitRaw
    }
    else if (Math.abs(valueRaw) < 0.000001 && Math.abs(valueRaw) != 0) {
        base = 0.000000001
        unit = "n" + unitRaw
    }
    else if (Math.abs(valueRaw) < 0.001 && Math.abs(valueRaw) != 0) {
        base = 0.000001
        unit = "μ" + unitRaw
    }
    else if (Math.abs(valueRaw) < 0.1 && Math.abs(valueRaw) != 0) {
        base = 0.001
        unit = "m" + unitRaw
    }
    else if (Math.abs(valueRaw) < 1000) {
        base = 1
        unit = unitRaw
    }
    else if (Math.abs(valueRaw) >= 1000 && Math.abs(valueRaw) < 1000000) {
        base = 1000
        unit = "k" + unitRaw
    }
    else if (Math.abs(valueRaw) >= 1000000 && Math.abs(valueRaw) < 1000000000) {
        base = 1000000
        unit = "M" + unitRaw
    }
    else if (Math.abs(valueRaw) >= 1000000000 && Math.abs(valueRaw) < 1000000000000) {
        base = 1000000000
        unit = "G" + unitRaw
    }
    else if (Math.abs(valueRaw) >= 1000000000000 && Math.abs(valueRaw) < 1000000000000000) {
        base = 1000000000000
        unit = "T" + unitRaw
    }
    else if (Math.abs(valueRaw) >= 1000000000000000 && Math.abs(valueRaw) < 1000000000000000000) {
        base = 1000000000000000
        unit = "P" + unitRaw
    }
    label = valueRaw / base
    return {label, unit}
}

export function getMultiplier(value, precision=0.001) {
    var multiplier;
    var scaledValue;
    if (Math.abs(value) < 1e-12 && Math.abs(value) != 0) {
        multiplier = 1e-15;
    }
    if (Math.abs(value) < 1e-9 && Math.abs(value) != 0) {
        multiplier = 1e-12;
    }
    else if (Math.abs(value) < 1e-6 && Math.abs(value) != 0) {
        multiplier = 1e-9;
    }
    else if (Math.abs(value) < 1e-3 && Math.abs(value) != 0) {
        multiplier = 1e-6;
    }
    else if (Math.abs(value) < 0.1 && Math.abs(value) != 0) {
        multiplier = 0.001;
    }
    else if (Math.abs(value) < 1000) {
        multiplier = 1;
    }
    else if (Math.abs(value) >= 1000 && Math.abs(value) < 1000000) {
        multiplier = 1000;
    }
    else if (Math.abs(value) >= 1000000 && Math.abs(value) < 1000000000) {
        multiplier = 1000000;
    }
    else if (Math.abs(value) >= 1000000000 && Math.abs(value) < 1000000000000) {
        multiplier = 1000000000;
    }
    else if (Math.abs(value) >= 1000000000000 && Math.abs(value) < 1000000000000000) {
        multiplier = 1000000000000;
    }
    else if (Math.abs(value) >= 1000000000000000 && Math.abs(value) < 1000000000000000000) {
        multiplier = 1000000000000000;
    }
    scaledValue = roundWithDecimals(value / multiplier, precision);
    return {scaledValue, multiplier};
}

export function formatFrequency(frequency) {
    return formatUnit(frequency, "Hz")
}

export function formatInductance(inductance) {
    return formatUnit(inductance, "H")
}

export function formatPermeance(permeance) {
    return formatUnit(permeance, "H/tu.")
}

export function formatReluctance(reluctance) {
    return formatUnit(reluctance, "H⁻¹")
}

export function formatEnergy(energy) {
    return formatUnit(energy, "J")
}

export function formatPower(power) {
    return formatUnit(power, "W")
}

export function formatApparentPower(power) {
    return formatUnit(power, "VA")
}

export function formatPowerDensity(powerDensity) {
    return formatUnit(powerDensity, "W/m³")
}

export function formatMagneticFluxDensity(magneticFluxDensity) {
    return formatUnit(magneticFluxDensity, "T")
}

export function formatDimension(dimension) {
    return formatUnit(dimension, "m")
}

export function formatArea(dimension) {
    return formatUnit(dimension, "m²")
}

export function formatVolume(dimension) {
    return formatUnit(dimension, "m³")
}

export function formatCurrent(current) {
    return formatUnit(current, "A")
}

export function formatVoltage(voltage) {
    return formatUnit(voltage, "V")
}

export function formatTemperature(temperature) {
    return formatUnit(temperature, "°C")
}

export function formatResistance(resistance) {
    return formatUnit(resistance, "Ω")
}

export function formatPercentage(percentage) {
    return formatUnit(percentage * 100, "%")
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
        harmonicsAmplitude.push(Math.sqrt(Math.pow(fourier[0], 2) + Math.pow(fourier[0 + 1], 2)) / samplingNumberPoints)
        for(var i = 2; i < fourier.length / 2; i+=2) {
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

export function getInstantaneousPower(currentDataPoints, voltageDataPoints) {
    const timeSlot = 1 / currentDataPoints.length
    var instantaneousPower = 0
    for (let i = 0; i < currentDataPoints.length; i++) {
        instantaneousPower += Math.abs(currentDataPoints[i] * voltageDataPoints[i]) * timeSlot
    }
    return instantaneousPower
}

export function removeTrailingZeroes(value, maximumNumberDecimals=4) {
    if (isNaN(value) || !isFinite(value)) {
        return value;
    }
    const split = value.toFixed(5).split(".")
    const decimals = split[1]
    if (decimals[4] != 0 && maximumNumberDecimals > 4)
        value = value.toFixed(5)
    else if (decimals[3] != 0 && maximumNumberDecimals > 3)
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
    else if (dataPoints.length == 4) {
        if (roundWithDecimals(1 / (dataPoints[3].x - dataPoints[0].x), 0.001) == frequency)
        if (dataPoints[0].y == dataPoints[1].y)
        if (dataPoints[1].x == dataPoints[2].x)
        if (dataPoints[2].y == dataPoints[3].y)
        if (dataPoints[0].y == dataPoints[4].y)
            return "Rectangular"
    }
    else if (dataPoints.length == 5) {
        if (roundWithDecimals(1 / (dataPoints[4].x - dataPoints[0].x), 0.001) == frequency)
        if (dataPoints[0].y == dataPoints[1].y)
        if (dataPoints[1].x == dataPoints[2].x)
        if (dataPoints[2].y == dataPoints[3].y)
        if (dataPoints[0].y == dataPoints[4].y)
            return "Rectangular"
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
            return "Rectangular with Dead-Time"
    }
    return "Custom"
}
export function tryGuessTypeOld(dataPoints, frequency) {
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

export function tryGuessDutyCycle(dataPoints, frequency) {
    if (dataPoints.length == 3) {
        if (roundWithDecimals(1 / (dataPoints[2].x - dataPoints[0].x), 0.001) == frequency)
        if (dataPoints[0].y == dataPoints[2].y)
            return roundWithDecimals((dataPoints[1].x - dataPoints[0].x) / (dataPoints[2].x - dataPoints[0].x), Math.pow(10, Defaults.defaultPrecision - 2)) 
    }
    else if (dataPoints.length == 5) {
        if (roundWithDecimals(1 / (dataPoints[4].x - dataPoints[0].x), 0.001) == frequency)
        if (dataPoints[0].y == dataPoints[1].y)
        if (dataPoints[1].x == dataPoints[2].x)
        if (dataPoints[2].y == dataPoints[3].y)
        if (dataPoints[0].y == dataPoints[4].y) {
            return roundWithDecimals((dataPoints[1].x - dataPoints[0].x) / (dataPoints[4].x - dataPoints[0].x), Math.pow(10, Defaults.defaultPrecision - 2))
        }
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
            return roundWithDecimals((dataPoints[1].x - dataPoints[0].x) / (dataPoints[7].x - dataPoints[0].x), Math.pow(10, Defaults.defaultPrecision - 2))
    }
    return Defaults.defaultDutyCycle
}

export function tryLoadElements(userStore, username) {
    if (username == null)
        return false
    if (requesting == 0) {

        const data = {"username": username}
        var url
        if (userStore.operationPoints == null) {
            url = import.meta.env.VITE_API_ENDPOINT + '/operation_point_load'
            requesting += 1
            axios.post(url, data)
            .then(response => {
                userStore.setOperationPoints(response.data["elements"])
                requesting -= 1
            })
            .catch(error => {
                requesting -= 1
            });
        }

        if (userStore.cores == null) {
            url = import.meta.env.VITE_API_ENDPOINT + '/core_load'
            requesting += 1
            axios.post(url, data)
            .then(response => {
                userStore.setCores(response.data["elements"])
                requesting -= 1
            })
            .catch(error => {
                requesting -= 1
            });
        }
            
        if (userStore.bobbins == null) {
            url = import.meta.env.VITE_API_ENDPOINT + '/bobbin_load'
            requesting += 1
            axios.post(url, data)
            .then(response => {
                userStore.setBobbins(response.data["elements"])
                requesting -= 1
            })
            .catch(error => {
                requesting -= 1
            });
        }
            
        if (userStore.wires == null) {
            url = import.meta.env.VITE_API_ENDPOINT + '/wire_load'
            requesting += 1
            axios.post(url, data)
            .then(response => {
                userStore.setWires(response.data["elements"])
                requesting -= 1
            })
            .catch(error => {
                requesting -= 1
            });
        }
            
        if (userStore.magnetics == null) {
            url = import.meta.env.VITE_API_ENDPOINT + '/magnetic_load'
            requesting += 1
            axios.post(url, data)
            .then(response => {
                userStore.setMagnetics(response.data["elements"])
                requesting -= 1
            })
            .catch(error => {
                requesting -= 1
            });
        }
        return true
    }
    else {
        return true
    }
}

export function getOperationPointData(commonStore, currentStore, voltageStore, configuration) {
    const exportedData = {};
    exportedData["frequency"] = commonStore.getSwitchingFrequency.value;
    exportedData["name"] = commonStore.getOperationPointName.value
    exportedData["current"] = {};
    exportedData["voltage"] = {};
    exportedData["current"]["waveform"] = {}
    exportedData["voltage"]["waveform"] = {}
    const currentData = JSON.parse(JSON.stringify(currentStore.getDataPoints.value))
    const voltageData = JSON.parse(JSON.stringify(voltageStore.getDataPoints.value))

    var currentsampledWaveform
    var voltagesampledWaveform

    if (configuration["exportEquidistant"] || configuration["includeProcessed"]) {

        currentsampledWaveform = sampleWaveform(currentData,
                                                        commonStore.getSwitchingFrequency.value,
                                                        configuration["numberPoints"] - 1)
        voltagesampledWaveform = sampleWaveform(voltageData,
                                                        commonStore.getSwitchingFrequency.value,
                                                        configuration["numberPoints"] - 1)
    }
    if (configuration["exportEquidistant"]) {

        exportedData["current"]["waveform"]["data"] = currentsampledWaveform["sampledWaveform"];
        exportedData["current"]["waveform"]["data"].push(exportedData["current"]["waveform"]["data"][0])
        exportedData["voltage"]["waveform"]["data"] = voltagesampledWaveform["sampledWaveform"];
        exportedData["voltage"]["waveform"]["data"].push(exportedData["voltage"]["waveform"]["data"][0])
    }
    else {
        const unpackedCurrentData = unpackDataPoints(currentData)
        const unpackedVoltageData = unpackDataPoints(voltageData)

        exportedData["current"]["waveform"]["data"] = unpackedCurrentData["values"]
        exportedData["current"]["waveform"]["time"] = unpackedCurrentData["times"]
        exportedData["current"]["waveform"]["ancillaryLabel"] = currentStore.getOutputs.value["label"]
        exportedData["voltage"]["waveform"]["data"] = unpackedVoltageData["values"]
        exportedData["voltage"]["waveform"]["time"] = unpackedVoltageData["times"]
        exportedData["voltage"]["waveform"]["ancillaryLabel"] = voltageStore.getOutputs.value["label"]
    }

    if (configuration["includeProcessed"]) {
        exportedData["current"]["processed"] = {
            label: currentStore.getOutputs.value["label"],
            dutyCycle: commonStore.getDutyCycle.value,
            peakToPeak: currentStore.getOutputs.value["peakToPeak"],
            offset: currentStore.getOutputs.value["offset"],
            rms: currentStore.getOutputs.value["rms"],
            effectiveFrequency: currentStore.getOutputs.value["effectiveFrequency"],
            thd: currentStore.getOutputs.value["thd"],
        }

        exportedData["voltage"]["processed"] = {
            label: voltageStore.getOutputs.value["label"],
            dutyCycle: commonStore.getDutyCycle.value,
            peakToPeak: voltageStore.getOutputs.value["peakToPeak"],
            offset: voltageStore.getOutputs.value["offset"],
            rms: voltageStore.getOutputs.value["rms"],
            effectiveFrequency: voltageStore.getOutputs.value["effectiveFrequency"],
            thd: voltageStore.getOutputs.value["thd"],
        }

        exportedData["electricalPower"] = {}
        exportedData["electricalPower"]["processed"] = {
            rms: exportedData["voltage"]["processed"]["rms"] * exportedData["current"]["processed"]["rms"],
            instantaneous: getInstantaneousPower(currentsampledWaveform["sampledWaveform"], voltagesampledWaveform["sampledWaveform"]),
        }
    }

    if (configuration["includeHarmonics"]) {
        const currentFourierData = fourierTransform(currentData,
                                                    commonStore.getSwitchingFrequency.value,
                                                    configuration["numberPoints"])
        const voltageFourierData = fourierTransform(voltageData,
                                                    commonStore.getSwitchingFrequency.value,
                                                    configuration["numberPoints"])
        exportedData["current"]["harmonics"] = {
            amplitudes: currentFourierData["harmonicsAmplitude"],
            frequencies: currentFourierData["harmonicsFrequencies"]
        }
        exportedData["voltage"]["harmonics"] = {
            amplitudes: voltageFourierData["harmonicsAmplitude"],
            frequencies: voltageFourierData["harmonicsFrequencies"]
        }
    }
    return exportedData
}

export function getCoreData(userStore, configuration) {
    const exportedData = {};
    exportedData['functionalDescription'] = {};
    exportedData['name'] = userStore.globalCore['name']
    exportedData['functionalDescription']['type'] = userStore.globalCore['functionalDescription']['type']

    if (typeof(userStore.globalCore['functionalDescription']['material']) == 'string') {
        exportedData['functionalDescription']['material'] = userStore.globalCore['functionalDescription']['material']
    }
    else {
        if (userStore.globalCore['functionalDescription']['material']['type'] == 'custom') {
            exportedData['functionalDescription']['material'] = userStore.globalCore['functionalDescription']['material']
        }
        else {
            exportedData['functionalDescription']['material'] = userStore.globalCore['functionalDescription']['material']['name']
        }
    }

    if (userStore.globalCore['functionalDescription']['shape']['type'] == 'custom') {
        exportedData['functionalDescription']['shape'] = userStore.globalCore['functionalDescription']['shape']
    }
    else {
        exportedData['functionalDescription']['shape'] = userStore.globalCore['functionalDescription']['shape']['name']
    }

    exportedData['functionalDescription']['gapping'] = []
    userStore.globalCore['functionalDescription']['gapping'].forEach((item) => {
        const aux = {}
        aux['length'] = item['length']
        aux['type'] = item['type']
        aux['coordinates'] = item['coordinates']
        exportedData['functionalDescription']['gapping'].push(aux)
    })
    exportedData['functionalDescription']['numberStacks'] = userStore.globalCore['functionalDescription']['numberStacks']

    if (configuration["includeEffectiveParameters"]){
        if (!("processedDescription" in exportedData)) {
            exportedData['processedDescription'] = {}
        }
        exportedData['processedDescription']['effectiveParameters'] = userStore.globalCore['processedDescription']['effectiveParameters']
    }
    if (configuration["includeShapeDimensionsData"]){
        exportedData['functionalDescription']['shape'] = userStore.globalCore['functionalDescription']['shape']
    }
    if (configuration["includeMaterialData"]){
        exportedData['functionalDescription']['material'] = userStore.globalCore['functionalDescription']['material']
    }
    if (configuration["includeGeometricalData"]){
        exportedData['geometricalDescription'] = userStore.globalCore['geometricalDescription']
    }
    if (configuration["includeMaximumDimensions"]){
        if (!("processedDescription" in exportedData)) {
            exportedData['processedDescription'] = {}
        }
        exportedData['processedDescription']['width'] = userStore.globalCore['processedDescription']['width']
        exportedData['processedDescription']['depth'] = userStore.globalCore['processedDescription']['depth']
        exportedData['processedDescription']['height'] = userStore.globalCore['processedDescription']['height']
    }
    if (configuration["includeAdvancedGapData"]){
        exportedData['functionalDescription']['gapping'] = userStore.globalCore['functionalDescription']['gapping']
    }
    if (configuration["includeAdvancedColumnData"]){
        if (!("processedDescription" in exportedData)) {
            exportedData['processedDescription'] = {}
        }
        exportedData['processedDescription']['columns'] = userStore.globalCore['processedDescription']['columns']
    }
    if (configuration["includeAdvancedWindingWindowData"]){
        if (!("processedDescription" in exportedData)) {
            exportedData['processedDescription'] = {}
        }
        exportedData['processedDescription']['windingWindows'] = userStore.globalCore['processedDescription']['windingWindows']
    }
    return exportedData
}

export function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// export function getCoreParameters(userStore, callback, errorCallback) {
//     const url = import.meta.env.VITE_API_ENDPOINT + '/core_compute_core_parameters'

//     const aux = deepCopy(userStore.globalCore)
//     aux['geometricalDescription'] = null
//     aux['processedDescription'] = null
//     axios.post(url, aux)
//     .then(response => {
//         const globalCore = userStore.globalCore
//         globalCore['functionalDescription'] = response.data['functionalDescription']
//         globalCore['geometricalDescription'] = response.data['geometricalDescription']
//         globalCore['processedDescription'] = response.data['processedDescription']
//         userStore.setGlobalCore(globalCore)
//         callback();
//     })
//     .catch(error => { 
//         console.error("Error getting core parameters")
//         console.error(error.data)
//         errorCallback()
//     });
// }

// export function getSimulationParameters(userStore, callback, errorCallback) {
//     const url = import.meta.env.VITE_API_ENDPOINT + '/core_compute_core_parameters'

//     const aux = deepCopy(userStore.globalSimulation['magnetic']['core'])
//     aux['geometricalDescription'] = null
//     aux['processedDescription'] = null
//     axios.post(url, aux)
//     .then(response => {
//         const globalSimulation = userStore.globalSimulation
//         globalSimulation['magnetic']['core']['functionalDescription'] = response.data['functionalDescription']
//         globalSimulation['magnetic']['core']['geometricalDescription'] = response.data['geometricalDescription']
//         globalSimulation['magnetic']['core']['processedDescription'] = response.data['processedDescription']
//         userStore.setGlobalSimulation(globalSimulation)
//         callback();
//     })
//     .catch(error => { 
//         console.error("Error getting simulation core parameters")
//         console.error(error.data)
//         errorCallback()
//     });
// }
 
export function guessBasicGappingParameters(core, scale=1000) {
    var gapType = Defaults.defaultGapType;
    var gapLength = Defaults.defaultGapLength / 1000 * scale;
    var numberGaps = Defaults.defaultNumberGaps;
    if (core['functionalDescription'] != null && core['processedDescription'] != null) {
        if (core['functionalDescription']['gapping'].length == core['processedDescription']['columns'].length &&
            core['functionalDescription']['gapping'][0]['type'] == 'subtractive' &&
            core['functionalDescription']['gapping'][1]['type'] == 'residual' &&
            (core['processedDescription']['columns'].length == 2 || core['functionalDescription']['gapping'][2]['type'] == 'residual')) {
            gapType = "Ground"
            gapLength = core['functionalDescription']['gapping'][0]['length'] * scale;
            numberGaps = 1;
        }
        else if (core['functionalDescription']['gapping'].length == core['processedDescription']['columns'].length &&
            core['functionalDescription']['gapping'][0]['type'] == 'additive' &&
            core['functionalDescription']['gapping'][1]['type'] == 'additive' &&
            (core['processedDescription']['columns'].length == 2 || core['functionalDescription']['gapping'][2]['type'] == 'additive')) {
            gapType = "Spacer"
            gapLength = core['functionalDescription']['gapping'][0]['length'] * scale;
            numberGaps = 1;
        }
        else if (core['functionalDescription']['gapping'].length == core['processedDescription']['columns'].length &&
            core['functionalDescription']['gapping'][0]['type'] == 'residual' &&
            core['functionalDescription']['gapping'][1]['type'] == 'residual' &&
            (core['processedDescription']['columns'].length == 2 || core['functionalDescription']['gapping'][2]['type'] == 'residual')) {
            gapType = "Ungapped"
            gapLength = core['functionalDescription']['gapping'][0]['length'] * scale;
            numberGaps = 1;
        }
        else if (core['functionalDescription']['gapping'].length > core['processedDescription']['columns'].length &&
            core['functionalDescription']['gapping'][0]['type'] == 'subtractive' &&
            core['functionalDescription']['gapping'][1]['type'] == 'residual' &&
            (
                (core['processedDescription']['columns'].length == 2 && core['functionalDescription']['gapping'][2]['type'] == 'subtractive') ||
                (core['processedDescription']['columns'].length == 3 && core['functionalDescription']['gapping'][2]['type'] == 'residual') && 
                core['functionalDescription']['gapping'][3]['type'] == 'subtractive'
            )) {
            gapType = "Distributed"
            gapLength = core['functionalDescription']['gapping'][0]['length'] * scale;
            numberGaps = core['functionalDescription']['gapping'].length - core['processedDescription']['columns'].length + 1;
            for (let i = 0; i < core['functionalDescription']['gapping'].length; i++) {
                if (core['functionalDescription']['gapping'][i]['type'] == 'subtractive') {
                    if (core['functionalDescription']['gapping'][i]['length'] != core['functionalDescription']['gapping'][0]['length']) {
                        gapType = "Custom"
                    }
                }
            }
        }
        else if (core['functionalDescription']['gapping'].length > core['processedDescription']['columns'].length &&
            core['functionalDescription']['gapping'][0]['type'] == 'subtractive' &&
            core['functionalDescription']['gapping'][1]['type'] == 'subtractive' &&
            core['functionalDescription']['gapping'][2]['type'] == 'subtractive') {
            gapType = "Distributed"
            gapLength = core['functionalDescription']['gapping'][0]['length'] * scale;
            numberGaps = core['functionalDescription']['gapping'].length - core['processedDescription']['columns'].length + 1;
            for (let i = 0; i < core['functionalDescription']['gapping'].length; i++) {
                if (core['functionalDescription']['gapping'][i]['type'] == 'subtractive') {
                    if (core['functionalDescription']['gapping'][i]['length'] != core['functionalDescription']['gapping'][0]['length']) {
                        gapType = "Custom"
                    }
                }
            }
        }
        else {
            gapType = "Custom"
        }
    }
    return {gapType, gapLength, numberGaps}
}

export function isNumber(n) { 
    return !isNaN(parseFloat(n)) && !isNaN(n - 0)
}

export function resolveDimensionalValues(dimensionValue, preferredValue='nominal'){
    var doubleValue = 0;
    if (!isNumber(dimensionValue)) {
        switch (preferredValue) {
            case "maximum":
                if ('maximum' in dimensionValue && dimensionValue['maximum'] != null)
                    doubleValue = dimensionValue['maximum'];
                else if ('nominal' in dimensionValue && dimensionValue['nominal'] != null)
                    doubleValue = dimensionValue['nominal'];
                else if ('minimum' in dimensionValue && dimensionValue['minimum'] != null)
                    doubleValue = dimensionValue['minimum'];
                break;
            case 'nominal':
                if ('nominal' in dimensionValue && dimensionValue['nominal'] != null)
                    doubleValue = dimensionValue['nominal'];
                else if ('maximum' in dimensionValue && dimensionValue['maximum'] != null && 'minimum' in dimensionValue && dimensionValue['minimum'] != null)
                    doubleValue = (dimensionValue['maximum'] + dimensionValue['minimum']) / 2;
                else if ('maximum' in dimensionValue && dimensionValue['maximum'] != null)
                    doubleValue = dimensionValue['maximum'];
                else if ('minimum' in dimensionValue && dimensionValue['minimum'] != null)
                    doubleValue = dimensionValue['minimum'];
                break;
            case 'minimum':
                if ('minimum' in dimensionValue && dimensionValue['minimum'] != null)
                    doubleValue = dimensionValue['minimum'];
                else if ('nominal' in dimensionValue && dimensionValue['nominal'] != null)
                    doubleValue = dimensionValue['nominal'];
                else if ('maximum' in dimensionValue && dimensionValue['maximum'] != null)
                    doubleValue = dimensionValue['maximum'];
                break;
        }
    }
    else {
        doubleValue = dimensionValue;
    }
    return doubleValue;
}

export function cleanSimulation(data, cleanGap=false, removeVoltage=true) {

    if (typeof(data['magnetic']['core']['functionalDescription']['material']) != 'string') {
        data['magnetic']['core']['functionalDescription']['material'] = data['magnetic']['core']['functionalDescription']['material']['name']
    }
    data['magnetic']['core']['geometricalDescription'] = null
    data['magnetic']['core']['processedDescription'] = null

    if (cleanGap) {
        const cleanGapping = []
        data['magnetic']['core']['functionalDescription']['gapping'].forEach((item) => {
            cleanGapping.push({length: item['length'], type: item['type']})
        })
        data['magnetic']['core']['functionalDescription']['gapping'] = cleanGapping
    }



    const operationPoint = data['inputs']['operatingPoints'][0]['excitationsPerWinding'][0]
    if ('voltage' in operationPoint && removeVoltage) {
        delete operationPoint['voltage'];
    }

    if ('current' in operationPoint && !removeVoltage) {
        delete operationPoint['current'];
    }


    return data
}

export function processCoreTexts(data) {
    const localTexts = {
        coreDescription: null,
        coreMaterial: null,

        coreGapping: null,
        effectiveParametersTable: null,

        numberTurns: null,
        numberEstimatedLayers: null,

        coreLossesTable: [
            {
                text: null,
                value: null,
            }
        ],
        dcResistanceTable: [
            {
                text: null,
                value: null,
            }
        ],
        magnetizingInductanceTable: [
            {
                text: null,
                value: null,
            }
        ],
        windingLossesTable: [
            {
                text: null,
                value: null,
            }
        ],
        coreTemperatureTable: [
            {
                text: null,
                value: null,
            }
        ],

        manufacturer: null,
        Distributor: null,
    };
    if (data.magnetic.manufacturerInfo == null) {
        return null;
    }
    const numberTurnsPrimary = data.magnetic.coil.functionalDescription[0].numberTurns;
    {
        var materialName;
        if (typeof data.magnetic.core.functionalDescription.material === 'string' || data.magnetic.core.functionalDescription.material instanceof String) {
            materialName = data.magnetic.core.functionalDescription.material;
        }
        else {
            materialName = data.magnetic.core.functionalDescription.material.name;
        }
        localTexts.coreDescription = `Core with shape ${data.magnetic.core.functionalDescription.shape.name} and material ${materialName}`
        if (data.magnetic.core.functionalDescription.gapping.length == 0) {
            localTexts.coreDescription += ', ungapped.'
        }
        else if (data.magnetic.core.functionalDescription.gapping.length == data.magnetic.core.processedDescription.columns.length) {
            if (data.magnetic.core.functionalDescription.gapping[0].type == 'residual') {
                localTexts.coreDescription += ', ungapped.'
            }
            else {
                localTexts.coreDescription += `, with a ground gap of ${removeTrailingZeroes(data.magnetic.core.functionalDescription.gapping[0].length * 1000, 5)} mm.`
            }
        }
        else if (data.magnetic.core.functionalDescription.gapping.length > data.magnetic.core.processedDescription.columns.length) {
            localTexts.coreDescription += `, with a distributed gap of ${removeTrailingZeroes(data.magnetic.core.functionalDescription.gapping[0].length * 1000, 5)} mm.`
        }
    }
    if (data.outputs != null)
    {
        const aux = formatUnit(1 / data.outputs[0].magnetizingInductance.coreReluctance / numberTurnsPrimary, "H/turn");
        localTexts.coreMaterial = `It has a permeance (AL value) of ${removeTrailingZeroes(aux.label, 1)} ${aux.unit}.`
    }
    if ('temp' in data.magnetic.core) {
        {
            var aux = formatUnit(1 / data.magnetic.core.temp["25"].reluctance, "H/tu.");
            localTexts.coreMaterialPermeanceTable = {};
            localTexts.coreMaterialPermeanceTable.text = 'Permeance (AL value)';
            localTexts.coreMaterialPermeanceTable.value_25 = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
            aux = formatUnit(1 / data.magnetic.core.temp["100"].reluctance, "H/tu.");
            localTexts.coreMaterialPermeanceTable.value_100 = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
        }
        {
            localTexts.coreMaterialInitialPermeabilityTable = {};
            localTexts.coreMaterialInitialPermeabilityTable.text = 'Initial Permeability (µᵢ)';
            localTexts.coreMaterialInitialPermeabilityTable.value_25 = `${removeTrailingZeroes(data.magnetic.core.temp["25"].initialPermeability, 0)}`;
            localTexts.coreMaterialInitialPermeabilityTable.value_100 = `${removeTrailingZeroes(data.magnetic.core.temp["100"].initialPermeability, 0)}`;
        }
        {
            localTexts.coreMaterialEffectivePermeabilityTable = {};
            localTexts.coreMaterialEffectivePermeabilityTable.text = 'Eff. Permeability (µₑ)';
            localTexts.coreMaterialEffectivePermeabilityTable.value_25 = `${removeTrailingZeroes(data.magnetic.core.temp["25"].effectivePermeability, 0)}`;
            localTexts.coreMaterialEffectivePermeabilityTable.value_100 = `${removeTrailingZeroes(data.magnetic.core.temp["100"].effectivePermeability, 0)}`;
        }
        {
            var aux = formatTemperature(data.magnetic.core.functionalDescription.material.curieTemperature);

            localTexts.coreMaterialCurieTemperatureTable = {};
            localTexts.coreMaterialCurieTemperatureTable.text = 'Curie Temperature';
            localTexts.coreMaterialCurieTemperatureTable.value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
        }
        {
            var aux = formatUnit(data.magnetic.core.temp["25"].resistivity, "Ωm");
            localTexts.coreMaterialResistivityTable = {};
            localTexts.coreMaterialResistivityTable.text = 'Resistivity';
            localTexts.coreMaterialResistivityTable.value_25 = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
            aux = formatUnit(data.magnetic.core.temp["100"].resistivity, "Ωm");
            localTexts.coreMaterialResistivityTable.value_100 = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
        }
        {
            var aux = formatUnit(data.magnetic.core.temp["25"].magneticFluxDensitySaturation, "T");
            localTexts.magneticFluxDensitySaturationTable = {};
            localTexts.magneticFluxDensitySaturationTable.text = 'Saturation B Field';
            localTexts.magneticFluxDensitySaturationTable.value_25 = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
            aux = formatUnit(data.magnetic.core.temp["100"].magneticFluxDensitySaturation, "T");
            localTexts.magneticFluxDensitySaturationTable.value_100 = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
        }
        {
            var aux = formatUnit(data.magnetic.core.functionalDescription.material.density * 1000, "g/m³");  // Because the unit is kg
            localTexts.coreMaterialDensityTable = {};
            localTexts.coreMaterialDensityTable.text = 'Density';
            localTexts.coreMaterialDensityTable.value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
        }
        {
            localTexts.coreMaterialManufacturerNameTable = {};
            localTexts.coreMaterialManufacturerNameTable.text = 'Manufacturer';
            localTexts.coreMaterialManufacturerNameTable.value = data.magnetic.core.manufacturerInfo.name;
        }
        {
            localTexts.coreMaterialManufacturerReferenceTable = {};
            localTexts.coreMaterialManufacturerReferenceTable.text = 'Manufacturer Ref.';
            localTexts.coreMaterialManufacturerReferenceTable.value = data.magnetic.core.manufacturerInfo.reference;
        }
        {
            localTexts.coreMaterialManufacturerDatasheetTable = {};
            localTexts.coreMaterialManufacturerDatasheetTable.text = 'Manufacturer Datasheet';
            localTexts.coreMaterialManufacturerDatasheetTable.value = data.magnetic.core.manufacturerInfo.datasheetUrl;
        }
    }
    if (data.outputs != null) {
        localTexts.numberTurns = `Using ${removeTrailingZeroes(data.magnetic.coil.functionalDescription[0].numberTurns)} turns will produce a magnetic with the following estimated output per operating point:`
    }
    {
        localTexts.effectiveParametersTable = {}
        {
            const aux = formatUnit(data.magnetic.core.processedDescription.effectiveParameters.effectiveLength, 'm');
            localTexts.effectiveParametersTable['effectiveLength'] = {}
            localTexts.effectiveParametersTable['effectiveLength'].text = 'Effective length';
            localTexts.effectiveParametersTable['effectiveLength'].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
        }
        {
            const aux = formatUnit(data.magnetic.core.processedDescription.effectiveParameters.effectiveArea, 'm²');
            localTexts.effectiveParametersTable['effectiveArea'] = {}
            localTexts.effectiveParametersTable['effectiveArea'].text = 'Effective area';
            localTexts.effectiveParametersTable['effectiveArea'].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
        }
        {
            const aux = formatUnit(data.magnetic.core.processedDescription.effectiveParameters.effectiveVolume, 'm³');
            localTexts.effectiveParametersTable['effectiveVolume'] = {}
            localTexts.effectiveParametersTable['effectiveVolume'].text = 'Effective volume';
            localTexts.effectiveParametersTable['effectiveVolume'].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
        }
        {
            const aux = formatUnit(data.magnetic.core.processedDescription.effectiveParameters.minimumArea, 'm²');
            localTexts.effectiveParametersTable['minimumArea'] = {}
            localTexts.effectiveParametersTable['minimumArea'].text = 'Minimum Area';
            localTexts.effectiveParametersTable['minimumArea'].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
        }
    }

    localTexts.magnetizingInductanceTable = [];
    localTexts.coreLossesTable = [];
    localTexts.coreTemperatureTable = [];
    localTexts.dcResistanceTable = [];
    localTexts.windingLossesTable = [];


    for (var operatingPointIndex = 0; operatingPointIndex < data.inputs.operatingPoints.length; operatingPointIndex++) {
        localTexts.magnetizingInductanceTable.push({text: null, value: null});
        localTexts.coreLossesTable.push({text: null, value: null});
        localTexts.coreTemperatureTable.push({text: null, value: null});
        localTexts.dcResistanceTable.push({text: null, value: null});
        localTexts.windingLossesTable.push({text: null, value: null});
        if (data.outputs != null && operatingPointIndex < data.outputs.length) {

            if (data.outputs[operatingPointIndex].magnetizingInductance != null)
            {
                const aux = formatInductance(data.outputs[operatingPointIndex].magnetizingInductance.magnetizingInductance.nominal);
                localTexts.magnetizingInductanceTable[operatingPointIndex].text = 'Mag. Ind.';
                localTexts.magnetizingInductanceTable[operatingPointIndex].value = `${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`;
            }
            if (data.outputs[operatingPointIndex].coreLosses != null)
            {
                const aux = formatPower(data.outputs[operatingPointIndex].coreLosses.coreLosses);
                localTexts.coreLossesTable[operatingPointIndex].text = 'Core losses';
                localTexts.coreLossesTable[operatingPointIndex].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
            }
            if (data.outputs[operatingPointIndex].coreLosses != null)
            {
                const aux = formatTemperature(data.outputs[operatingPointIndex].coreLosses.temperature);
                localTexts.coreTemperatureTable[operatingPointIndex].text = 'Core temp.';
                localTexts.coreTemperatureTable[operatingPointIndex].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
            }

            if (data.outputs[operatingPointIndex].windingLosses != null) {
                if (data.outputs[operatingPointIndex].windingLosses.dcResistancePerWinding != null) {
                    const aux = formatResistance(data.outputs[operatingPointIndex].windingLosses.dcResistancePerWinding[0]);
                    localTexts.dcResistanceTable[operatingPointIndex].text = 'Pri. DC Resis.';
                    localTexts.dcResistanceTable[operatingPointIndex].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                }
                const aux = formatPower(data.outputs[operatingPointIndex].windingLosses.windingLosses);
                localTexts.windingLossesTable[operatingPointIndex].text = 'Wind. losses';
                localTexts.windingLossesTable[operatingPointIndex].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
            }
        }
    }


    return localTexts;
}

export function clean(object) {
    Object
        .entries(object)
        .forEach(([k, v]) => {
            if (v && typeof v === 'object') {
                clean(v);
            }
            if (v && typeof v === 'object' && !Object.keys(v).length || v === null || v === "null" || v === undefined) {
                if (Array.isArray(object)) {
                    object.splice(k, 1);
                } else {
                    delete object[k];
                }
            }
        });
    return object;
}

export const cyrb53 = (str, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for(let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};
