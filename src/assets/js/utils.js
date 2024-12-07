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

export function getMultiplier(value, precision=0.001, disabled=false, power=1) {
    var multiplier = 1;
    var scaledValue = value;
    if (disabled) {
        return {scaledValue, multiplier};
    }
    if (Math.abs(value) < Math.pow(1e-12, power) && Math.abs(value) != 0) {
        multiplier = 1e-15;
    }
    if (Math.abs(value) < Math.pow(1e-9, power) && Math.abs(value) != 0) {
        multiplier = 1e-12;
    }
    else if (Math.abs(value) < Math.pow(1e-6, power) && Math.abs(value) != 0) {
        multiplier = 1e-9;
    }
    else if (Math.abs(value) < Math.pow(1e-3, power) && Math.abs(value) != 0) {
        multiplier = 1e-6;
    }
    else if (Math.abs(value) < Math.pow(0.1, power) && Math.abs(value) != 0) {
        multiplier = 0.001;
    }
    else if (Math.abs(value) < Math.pow(1000, power)) {
        multiplier = 1;
    }
    else if (Math.abs(value) < Math.pow(1000000, power)) {
        multiplier = 1000;
    }
    else if (Math.abs(value) < Math.pow(1000000000, power)) {
        multiplier = 1000000;
    }
    else if (Math.abs(value) < Math.pow(1000000000000, power)) {
        multiplier = 1000000000;
    }
    else if (Math.abs(value) < Math.pow(1000000000000000, power)) {
        multiplier = 1000000000000;
    }
    else if (Math.abs(value) < Math.pow(1000000000000000000, power)) {
        multiplier = 1000000000000000;
    }
    scaledValue = roundWithDecimals(value / Math.pow(multiplier, power), precision);
    return {scaledValue, multiplier};
}

export function formatFrequency(frequency) {
    return formatUnit(frequency, "Hz")
}

export function formatInductance(inductance) {
    return formatUnit(inductance, "H")
}

export function formatPermeance(permeance) {
    return formatUnit(permeance, "H/tu²")
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

export function formatDensity(density) {
    return formatUnit(density, "g/m³")
}

export function formatMagneticFluxDensity(magneticFluxDensity) {
    return formatUnit(magneticFluxDensity, "T")
}

export function formatMagneticFieldStrength(magneticFieldStrength) {
    return formatUnit(magneticFieldStrength, "A/m")
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

export function formatResistivity(resistivity) {
    return formatUnit(resistivity, "Ωm")
}

export function formatPercentage(percentage) {
    return formatUnit(percentage * 100, "%")
}

export function formatAdimensional(percentage) {
    return formatUnit(percentage, "")
}

export function deepCopy(data) {
    return JSON.parse(JSON.stringify(data))
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

export function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
 
export function guessBasicGappingParameters(core, scale=1) {
    var gapType = Defaults.defaultGapType;
    var gapLength = Defaults.defaultGapLength * scale;
    var numberGaps = Defaults.defaultNumberGaps;
    if (core['functionalDescription'] != null && core['processedDescription'] != null) {
        if (core['functionalDescription']['gapping'].length == 0) {
            gapType = "Ungapped"
            gapLength = 0;
            numberGaps = 1;
        }
        else if (core['functionalDescription']['gapping'].length == core['processedDescription']['columns'].length &&
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
        {
            localTexts.coreMaterialManufacturerMaterialDatasheetTable = {};
            localTexts.coreMaterialManufacturerMaterialDatasheetTable.text = 'Material Datasheet';
            localTexts.coreMaterialManufacturerMaterialDatasheetTable.value = data.magnetic.core.functionalDescription.material.manufacturerInfo.datasheetUrl;
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

export function processCoreMaterialTexts(data) {
    const localTexts = {

    };
    if ('temp' in data) {
        {
            localTexts.coreMaterialInitialPermeabilityTable = {};
            localTexts.coreMaterialInitialPermeabilityTable.text = 'Initial Permeability (µᵢ)';
            localTexts.coreMaterialInitialPermeabilityTable.value = {};
            Object.entries(data.temp).forEach(([key, val])  => {
                localTexts.coreMaterialInitialPermeabilityTable.value[key] = `${removeTrailingZeroes(val.initialPermeability, 0)}`;
            });
        }
        {
            var aux = formatTemperature(data.curieTemperature);

            localTexts.coreMaterialCurieTemperatureTable = {};
            localTexts.coreMaterialCurieTemperatureTable.text = 'Curie Temperature';
            localTexts.coreMaterialCurieTemperatureTable.value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
        }
        {
            localTexts.coreMaterialResistivityTable = {};
            localTexts.coreMaterialResistivityTable.text = 'Resistivity';
            localTexts.coreMaterialResistivityTable.value = {};
            Object.entries(data.temp).forEach(([key, val])  => {
                var aux = formatUnit(val.resistivity, "Ωm");
                localTexts.coreMaterialResistivityTable.value[key] = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
            });
        }
        {
            localTexts.coreMaterialRemanenceTable = {};
            localTexts.coreMaterialRemanenceTable.text = 'Remanence';
            localTexts.coreMaterialRemanenceTable.value = {};
            Object.entries(data.temp).forEach(([key, val])  => {
                var aux = formatUnit(val.remanence, "T");
                localTexts.coreMaterialRemanenceTable.value[key] = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
            });
        }
        {
            localTexts.coreMaterialCoerciveForceTable = {};
            localTexts.coreMaterialCoerciveForceTable.text = 'Coercive Force';
            localTexts.coreMaterialCoerciveForceTable.value = {};
            Object.entries(data.temp).forEach(([key, val])  => {
                var aux = formatUnit(val.coerciveForce, "A/m");
                localTexts.coreMaterialCoerciveForceTable.value[key] = `${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`;
            });
        }
        {
            var aux = formatUnit(data.temp["25"].magneticFluxDensitySaturation, "T");
            localTexts.magneticFluxDensitySaturationTable = {};
            localTexts.magneticFluxDensitySaturationTable.text = 'Saturation B Field';
            localTexts.magneticFluxDensitySaturationTable.value = {};
            Object.entries(data.temp).forEach(([key, val])  => {
                var aux = formatUnit(val.magneticFluxDensitySaturation, "T");
                localTexts.magneticFluxDensitySaturationTable.value[key] = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
            });
        }
        {
            localTexts.coreMaterialManufacturerNameTable = {};
            localTexts.coreMaterialManufacturerNameTable.text = 'Manufacturer';
            localTexts.coreMaterialManufacturerNameTable.value = data.manufacturerInfo.name;
        }
        {
            localTexts.coreMaterialManufacturerReferenceTable = {};
            localTexts.coreMaterialManufacturerReferenceTable.text = 'Manufacturer Ref.';
            localTexts.coreMaterialManufacturerReferenceTable.value = data.name;
        }
        {
            localTexts.coreMaterialManufacturerDatasheetTable = {};
            localTexts.coreMaterialManufacturerDatasheetTable.text = 'Manufacturer Datasheet';
            localTexts.coreMaterialManufacturerDatasheetTable.value = data.manufacturerInfo.datasheetUrl;
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

export async function checkAndFixMas(mas, mkf=null) {
    var numberWindings = 0;
    if (mas.inputs != null) {
        numberWindings = mas.inputs.designRequirements.turnsRatios.length + 1;
        if (mas.inputs.designRequirements.isolationSides != null) {
            for (let i = 0; i < numberWindings; i++) {
                if (mas.inputs.designRequirements.isolationSides.length <= i) {
                    mas.inputs.designRequirements.isolationSides.push(Defaults.isolationSideOrdered[i].toLowerCase());
                }
            }
        }
    }

    if (mas.magnetic.core != null) {
        if (mas.magnetic.core.functionalDescription.shape != null && typeof(mas.magnetic.core.functionalDescription.shape) !== "string") {
            if (mas.magnetic.core.functionalDescription.shape.family == 't') {
                mas.magnetic.core.functionalDescription.type = "toroidal";
                mas.magnetic.core.functionalDescription.magneticCircuit = "closed";
                mas.magnetic.core.functionalDescription.gapping = [];
            }
            else {
                mas.magnetic.core.functionalDescription.type = "two-piece set";
                mas.magnetic.core.functionalDescription.magneticCircuit = "open";
            }
        }
    }

    if (mas.magnetic.coil != null) {
        for (let i = 0; i < numberWindings; i++) {
            if (mas.magnetic.coil.functionalDescription.length <= i) {
                const dummyWinding = {
                    name: toTitleCase(Defaults.isolationSideOrdered[i]),
                    numberTurns: 1,
                    numberParallels: 1,
                    isolationSide: Defaults.isolationSideOrdered[i].toLowerCase(),
                    wire: "Dummy",
                }
                mas.magnetic.coil.functionalDescription.push(dummyWinding);
            }
            else {
                if (mas.magnetic.coil.functionalDescription[i].name == null) {
                    mas.magnetic.coil.functionalDescription[i].name = toTitleCase(Defaults.isolationSideOrdered[i]);
                }
                if (mas.magnetic.coil.functionalDescription[i].numberTurns == null || 
                    mas.magnetic.coil.functionalDescription[i].numberTurns == 0) {
                    mas.magnetic.coil.functionalDescription[i].numberTurns = 1;
                }
                if (mas.magnetic.coil.functionalDescription[i].numberParallels == null || 
                    mas.magnetic.coil.functionalDescription[i].numberParallels == 0) {
                    mas.magnetic.coil.functionalDescription[i].numberParallels = 1;
                }
                if (mas.magnetic.coil.functionalDescription[i].isolationSide == null) {
                    mas.magnetic.coil.functionalDescription[i].isolationSide = Defaults.isolationSideOrdered[i].toLowerCase();
                }
                if (mas.magnetic.coil.functionalDescription[i].wire == null ||
                    mas.magnetic.coil.functionalDescription[i].wire == "") {
                    mas.magnetic.coil.functionalDescription[i].wire = "Dummy";
                }
            }
        }

    }

    if (mkf != null && (mas.magnetic.coil.bobbin == null || mas.magnetic.coil.bobbin == "Dummy" || mas.magnetic.core.processedDescription == null)) {
        await mkf.ready.then(_ => {
            mas.magnetic.coil.bobbin = "Dummy";
            const result = mkf.calculate_bobbin_data(JSON.stringify(mas.magnetic));
            if (result.startsWith("Exception")) {
                console.error(result);
                return mas;
            }
            mas.magnetic.coil.bobbin = JSON.parse(result);

            const aux = deepCopy(mas.magnetic.core);
            aux['geometricalDescription'] = null;
            aux['processedDescription'] = null;
            const coreJson = mkf.calculate_core_data(JSON.stringify(aux), false);
            if (coreJson.startsWith("Exception")) {
                console.error(coreJson);
                return mas;
            }
            else {
                mas.magnetic.core = JSON.parse(coreJson);
            }

            return mas;
        })
        .catch(error => {
            console.error(error)
            return mas;
        });
    }
    else {
        return mas;
    }
    return mas;
}

export function range(start, stop, step=1) {
    const length = Math.ceil((stop - start) / step);
    return Array.from({length}, (_, i) => (i * step) + start);
}

export function download(data, strFileName, strMimeType) {
    //download.js v4.2, by dandavis; 2008-2016. [MIT] see http://danml.com/download.html for tests/usage
    // v1 landed a FF+Chrome compat way of downloading strings to local un-named files, upgraded to use a hidden frame and optional mime
    // v2 added named files via a[download], msSaveBlob, IE (10+) support, and window.URL support for larger+faster saves than dataURLs
    // v3 added dataURL and Blob Input, bind-toggle arity, and legacy dataURL fallback was improved with force-download mime and base64 support. 3.1 improved safari handling.
    // v4 adds AMD/UMD, commonJS, and plain browser support
    // v4.1 adds url download capability via solo URL argument (same domain/CORS only)
    // v4.2 adds semantic variable names, long (over 2MB) dataURL support, and hidden by default temp anchors
    // https://github.com/rndme/download

    var self = window, // this script is only for browsers anyway...
        defaultMime = "application/octet-stream", // this default mime also triggers iframe downloads
        mimeType = strMimeType || defaultMime,
        payload = data,
        url = !strFileName && !strMimeType && payload,
        anchor = document.createElement("a"),
        toString = function(a){return String(a);},
        myBlob = (self.Blob || self.MozBlob || self.WebKitBlob || toString),
        fileName = strFileName || "download",
        blob,
        reader;
        myBlob= myBlob.call ? myBlob.bind(self) : Blob ;
  
    if(String(this)==="true"){ //reverse arguments, allowing download.bind(true, "text/xml", "export.xml") to act as a callback
        payload=[payload, mimeType];
        mimeType=payload[0];
        payload=payload[1];
    }


    if(url && url.length< 2048){ // if no filename and no mime, assume a url was passed as the only argument
        fileName = url.split("/").pop().split("?")[0];
        anchor.href = url; // assign href prop to temp anchor
        if(anchor.href.indexOf(url) !== -1){ // if the browser determines that it's a potentially valid url path:
            var ajax=new XMLHttpRequest();
            ajax.open( "GET", url, true);
            ajax.responseType = 'blob';
            ajax.onload= function(e){ 
              download(e.target.response, fileName, defaultMime);
            };
            setTimeout(function(){ ajax.send();}, 0); // allows setting custom ajax headers using the return:
            return ajax;
        } // end if valid url?
    } // end if url?


    //go ahead and download dataURLs right away
    if(/^data:([\w+-]+\/[\w+.-]+)?[,;]/.test(payload)){
    
        if(payload.length > (1024*1024*1.999) && myBlob !== toString ){
            payload=dataUrlToBlob(payload);
            mimeType=payload.type || defaultMime;
        }else{          
            return navigator.msSaveBlob ?  // IE10 can't do a[download], only Blobs:
                navigator.msSaveBlob(dataUrlToBlob(payload), fileName) :
                saver(payload) ; // everyone else can save dataURLs un-processed
        }
        
    }else{//not data url, is it a string with special needs?
        if(/([\x80-\xff])/.test(payload)){            
            var i=0, tempUiArr= new Uint8Array(payload.length), mx=tempUiArr.length;
            for(i;i<mx;++i) tempUiArr[i]= payload.charCodeAt(i);
            payload=new myBlob([tempUiArr], {type: mimeType});
        }         
    }
    blob = payload instanceof myBlob ?
        payload :
        new myBlob([payload], {type: mimeType}) ;


    function dataUrlToBlob(strUrl) {
        var parts= strUrl.split(/[:;,]/),
        type= parts[1],
        decoder= parts[2] == "base64" ? atob : decodeURIComponent,
        binData= decoder( parts.pop() ),
        mx= binData.length,
        i= 0,
        uiArr= new Uint8Array(mx);

        for(i;i<mx;++i) uiArr[i]= binData.charCodeAt(i);

        return new myBlob([uiArr], {type: type});
     }

    function saver(url, winMode){

        if ('download' in anchor) { //html5 A[download]
            anchor.href = url;
            anchor.setAttribute("download", fileName);
            anchor.className = "download-js-link";
            anchor.innerHTML = "downloading...";
            anchor.style.display = "none";
            document.body.appendChild(anchor);
            setTimeout(function() {
                anchor.click();
                document.body.removeChild(anchor);
                if(winMode===true){setTimeout(function(){ self.URL.revokeObjectURL(anchor.href);}, 250 );}
            }, 66);
            return true;
        }

        // handle non-a[download] safari as best we can:
        if(/(Version)\/(\d+)\.(\d+)(?:\.(\d+))?.*Safari\//.test(navigator.userAgent)) {
            if(/^data:/.test(url))  url="data:"+url.replace(/^data:([\w\/\-\+]+)/, defaultMime);
            if(!window.open(url)){ // popup blocked, offer direct download:
                if(confirm("Displaying New Document\n\nUse Save As... to download, then click back to return to this page.")){ location.href=url; }
            }
            return true;
        }

        //do iframe dataURL download (old ch+FF):
        var f = document.createElement("iframe");
        document.body.appendChild(f);

        if(!winMode && /^data:/.test(url)){ // force a mime that will download:
            url="data:"+url.replace(/^data:([\w\/\-\+]+)/, defaultMime);
        }
        f.src=url;
        setTimeout(function(){ document.body.removeChild(f); }, 333);

    }//end saver




    if (navigator.msSaveBlob) { // IE10+ : (has Blob, but not a[download] or URL)
        return navigator.msSaveBlob(blob, fileName);
    }

    if(self.URL){ // simple fast and modern way using Blob and URL:
        saver(self.URL.createObjectURL(blob), true);
    }else{
        // handle non-Blob()+non-URL browsers:
        if(typeof blob === "string" || blob.constructor===toString ){
            try{
                return saver( "data:" +  mimeType   + ";base64,"  +  self.btoa(blob)  );
            }catch(y){
                return saver( "data:" +  mimeType   + "," + encodeURIComponent(blob)  );
            }
        }

        // Blob but not URL support:
        reader=new FileReader();
        reader.onload=function(e){
            saver(this.result);
        };
        reader.readAsDataURL(blob);
    }
    return true;
};

export function isMobile() {
    if( screen.width <= 760 ) {
        return true;
    }
    else {
        return false;
    }
}