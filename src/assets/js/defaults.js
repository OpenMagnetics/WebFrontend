export const defaultUngappedGapping = [
    {
        "length": 0.000005,
        "type": "residual"
    },
    {
        "length": 0.000005,
        "type": "residual"
    },
    {
        "length": 0.000005,
        "type": "residual"
    }
]
export const defaultGrindedGapping = [
    {
        "length": 0.001,
        "type": "subtractive"
    },
    {
        "length": 0.000005,
        "type": "residual"
    },
    {
        "length": 0.000005,
        "type": "residual"
    }
]
export const defaultSpacerGapping = [
    {
        "length": 0.001,
        "type": "additive"
    },
    {
        "length": 0.001,
        "type": "additive"
    },
    {
        "length": 0.001,
        "type": "additive"
    }
]
export const defaultDistributedGapping = [
    {
        "length": 0.0003,
        "type": "subtractive"
    },
    {
        "length": 0.000005,
        "type": "residual"
    },
    {
        "length": 0.000005,

        "type": "residual"
    },
    {
        "length": 0.0003,
        "type": "subtractive"
    },
    {
        "length": 0.0003,
        "type": "subtractive"
    }
]

export const defaultOperationPointExcitation = {  
    "name": "My Operation Point",
    "frequency": 100000,
    "current": {
        "waveform": {
            "data": [
                -5,
                5,
                -5
            ],
            "time": [
                0,
                0.0000025,
                0.00001
            ]
        },
        "type": "Triangular"
    },
    "voltage": {
        "waveform": {
            "data": [
                7.5,
                7.5,
                -2.5,
                -2.5,
                7.5
            ],
            "time": [
                0,
                0.0000025,
                0.0000025,
                0.00001,
                0.00001
            ]
        },
        "type": "Square"
    }
}

export const defaultCore = {
    "name": "My Core",
    "functionalDescription": {
        "type": "two-piece set",
        "material": "3C97",
        "shape":  {'aliases': [],
                   'dimensions': {'A': 0.0391,
                                  'B': 0.0198,
                                  'C': 0.0125,
                                  'D': 0.0146,
                                  'E': 0.030100000000000002,
                                  'F': 0.0125,
                                  'G': 0.0,
                                  'H': 0.0},
                   'family': 'etd',
                   'familySubtype': '1',
                   'name': 'ETD 39/20/13',
                   'type': 'standard'},
        "gapping": [{
            "type": "subtractive",
            "length": 0.001
        },{
            "type": "residual",
            "length": 0.00001
        },{
            "type": "residual",
            "length": 0.00001
        }],
        "numberStacks": 1
    },
    "geometricalDescription": null,
    "processedDescription": null,
}

export const defaultOperationConditions = {
    "ambientTemperature": 25,
}

export const defaultDesignRequirements = {
    "magnetizingInductance": {"nominal": 1e-6},
    "turnsRatios": [],
}

export const defaultOperationPoint = {
    "conditions": defaultOperationConditions,
    "excitationsPerWinding": [defaultOperationPointExcitation],
}

export const defaultInputs = {
    "designRequirements": defaultDesignRequirements,
    "operationPoints": [defaultOperationPoint],
}

export const defaultWinding = {
    "functionalDescription": [{
        "isolationSide": "primary",
        "name": "Primary",
        "numberParallels": 1,
        "numberTurns": 42,
        "wire": "Dummy"
    }],
}

export const defaultMagnetic = {
    "core": defaultCore,
    "winding": defaultWinding,
}

export const defaultSimulation = {
    "inputs": defaultInputs,
    "magnetic": defaultMagnetic,
}

export const defaultVoltageType = "Square"
export const defaultCurrentType = "Triangular"
export const defaultPrecision = -2
export const defaultMinimumNumberForms = 0.01

export const defaultOperationNamePlaceHolder = "Operation Point Identifier"
export const defaultOperationName = "My Operation Point"

export const defaultCoreNamePlaceHolder = "Core Identifier"
export const defaultCoreName = "My Core"

export const defaultSimulationNamePlaceHolder = "Core Identifier"
export const defaultSimulationName = "My Simulation"

export const defaultOffset = 0
export const defaultPeakToPeak = 10
export const defaultDutyCycle = 0.25
export const defaultSwitchingFrequency = 100000
export const defaultTimeExponent = 5
export const defaultSinusoidalNumberPoints = 120

export const defaultSamplingNumberPoints = 128
export const defaultMaximumNumberHarmonicsShown = 16
export const defaultOperationPointExcitationSaveConfiguration = {
    numberPoints: 128,
    exportEquidistant: false,
    includeProcessed: false,
    includeHarmonics: false,
}

export const defaultCoreSaveConfiguration = {
    includeEffectiveParameters: false,
    includeShapeDimensionsData: false,
    includeMaterialData: false,
    includeGeometricalData: false,
    includeMaximumDimensions: false,
    includeAdvancedGapData: false,
    includeAdvancedColumnData: false,
    includeAdvancedWindingWindowData: false,
    downloadOnlyPiece: false,
}

export const defaultGapType = "Grinded";
export const defaultGapLength = 1;
export const defaultNumberGaps = 1;


export function titleColor(electricalParameter){
    if (electricalParameter == "current") {
        return "text-info"
    }
    else if (electricalParameter == "power") {
        return "text-white"
    }
    else {
        return "text-primary"
    }
}

export var engineConstants = {}


// import axios from "axios";
// (function () {
//     axios.post(import.meta.env.VITE_API_ENDPOINT + '/get_constants', {})
//     .then(response => {
//         engineConstants = response.data
//     })
//     .catch(error => {
//         console.error("Could not load constants from MKF")
//     });
// })();