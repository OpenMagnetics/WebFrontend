export const coreAdviserWeights = {
    "EFFICIENCY": 40,
    "DIMENSIONS": 30,
    "COST": 30,
}

export const magneticAdviserWeights = {
    "EFFICIENCY": 40,
    "DIMENSIONS": 30,
    "COST": 30,
}


export const coreCrossReferencerPossibleLabels = [
    "Core Losses",
    "Enveloping Volume",
    "Permeance",
    "Effective Area",
    "Saturation",
    "Winding Window Area"
];


export const coreCrossReferencerPossibleCoreTypes = [
    "Toroidal",
    "Two-Piece Set",
    "Only Cores In Stock",
];


export const coreMaterialCrossReferencerPossibleLabels = [
    "Initial Permeability",
    "Remanence", 
    "Coercive Force", 
    "Saturation",
    "Curie Temperature",
    "Volumetric Losses",
    "Resistivity",
    "Density"
];


export const coreMaterialCrossReferencerPossibleCoreTypes = [
];


export const powerMas = {
    "inputs": {
        "designRequirements": {
            "name": "My Design Requirements",
            "magnetizingInductance": {
                "nominal": 100e-6
            },
            "turnsRatios": [],
        },
        "operatingPoints": [],
    },
    "magnetic": {
        "coil": {
            "bobbin": "Dummy",
            "functionalDescription": [
                {
                    "name": "Primary",
                    "numberTurns": 0,
                    "numberParallels": 0,
                    "isolationSide": "primary",
                    "wire": ""
                }
            ],
        },
        "core": {
            "name": "DummyCore",
            "functionalDescription": {
                "type": "two-piece set",
                "material": "",
                "shape": "",
                "gapping": [],
                "numberStacks": 1
            }
        },
    },
    "outputs": []
}

export const filterMas = {
    "inputs": {
        "designRequirements": {
            "name": "My Design Requirements",
            "magnetizingInductance": {
                "nominal": 100e-6
            },
            "turnsRatios": [],
        },
        "operatingPoints": [],
    },
    "magnetic": {
        "coil": {
            "bobbin": "Dummy",
            "functionalDescription": [
                {
                    "name": "Primary",
                    "numberTurns": 0,
                    "numberParallels": 0,
                    "isolationSide": "primary",
                    "wire": ""
                }
            ],
        },
        "core": {
            "name": "DummyCore",
            "functionalDescription": {
                "type": "two-piece set",
                "material": "",
                "shape": "",
                "gapping": [],
                "numberStacks": 1
            }
        },
    },
    "outputs": []
}

export const isolationSideOrdered = [
    "Primary",
    "Secondary",
    "Tertiary",
    "Quaternary",
    "Quinary",
    "Senary",
    "Septenary",
    "Octonary",
    "Nonary",
    "Denary",
    "Undenary",
    "Duodenary",
]

export const designRequirementsOrdered = [
    "numberWindings",
    "magnetizingInductance",
    "turnsRatios",
    "insulation",
    "leakageInductance",
    "strayCapacitance",
    "operatingTemperature",
    "maximumWeight",
    "maximumDimensions",
    "terminalType",
    "topology",
    "market",
]

export const defaultDesignRequirements = {
    "name": "My Design Requirements",
    "magnetizingInductance": {
        "minimum": 42e-6
    },
    "turnsRatios": [],
    "leakageInductance": [
        {"maximum": 3e-6}
    ],
    "strayCapacitance": [
        {"maximum": 50e-12}
    ],
    "operatingTemperature": {
        "maximum": 85
    },
    "insulation": {
        "altitude": {
            "maximum": 2000,
        },
        "cti": "Group IIIB",
        "pollutionDegree": "P2",
        "overvoltageCategory": "OVC-III",
        "insulationType": "Double",
        "mainSupplyVoltage": {
            "maximum": 400
        },
        "standards": ["IEC 60664-1"]
    },
    "market": "Industrial",
    "topology": "Buck Converter",
    "maximumWeight": 300,
    "maximumDimensions": {"width": null, "height": 0.05, "depth": null},
    "terminalType": ["Flying Lead"],
    "wiringTechnology": "Wound"
}

export const defaultOperatingPointExcitationForInsulation = {  
    "frequency": 100000,
    "voltage": {
        "processed": {
            "dutyCycle" : 0.5,
            "peak" : 800,
            "peakToPeak" : 1600,
            "rms" : 400,
            "offset" : 0,
            "label": "Rectangular"
        }
    }
}

export const defaultOperatingPointExcitation = {  
    "name": "Primary winding excitation",
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
                0.000005,
                0.00001
            ]
        },
        "processed": {
            "dutyCycle" : 0.5,
            "peakToPeak" : 10,
            "offset" : 0,
            "label": "Triangular"
        }
    },
    "voltage": {
        "waveform": {
            "data": [
                -20.5,
                70.5,
                70.5,
                -20.5,
                -20.5
            ],
            "time": [
                0,
                0,
                0.000005,
                0.000005,
                0.00001
            ]
        },
        "processed": {
            "dutyCycle" : 0.5,
            "peakToPeak" : 100,
            "offset" : 0,
            "label": "Rectangular"
        }
    }
}

export const minimumMaximumScalePerParameter = {
    "dimension": {"min": 0.001, "max":1},
    "weight": {"min": 0.001, "max": 1e6},
    "altitude": {"min": 1, "max": 10000},
    "inductance": {"min": 1e-9, "max": 1},
    "leakageInductance": {"min": 1e-9, "max": 1e-6},
    "strayCapacitance": {"min": 1e-12, "max": 1e-6},
    "voltage": {"min": 1e-6, "max": 1e5},
    "current": {"min": 1e-6, "max": 1e3},
    "power": {"min": 1e-3, "max": 1e9},
    "temperature": {"min": 1, "max": 300},
    "frequency": {"min": 1, "max": 1e9},
    "percentage": {"min": 0.0001, "max": 0.9999},
}


export const gapTypes = [
    "Ungapped",
    "Ground",
    "Spacer",
    "Distributed",
]

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
export const defaultGroundGapping = [
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
    "name": "My Operating Point",
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

export const defaultOperatingConditions = {
    "ambientTemperature": 25,
}

export const defaultOperatingPoint = {
    "conditions": defaultOperatingConditions,
    "excitationsPerWinding": [defaultOperationPointExcitation],
}

export const defaultInputs = {
    "designRequirements": defaultDesignRequirements,
    "operatingPoints": [defaultOperatingPoint],
}

export const defaultCoil = {
    "bobbin": "Dummy",
    "functionalDescription": [{
        "isolationSide": "primary",
        "name": "Primary",
        "numberParallels": 1,
        "numberTurns": 23,
        "wire": "Dummy"
    }],
}

export const defaultMagnetic = {
    "core": defaultCore,
    "coil": defaultCoil,
}

export const defaultSimulation = {
    "inputs": defaultInputs,
    "magnetic": defaultMagnetic,
    "outputs": [],
}

export const defaultVoltageType = "Square"
export const defaultCurrentType = "Triangular"
export const defaultPrecision = -2
export const defaultMinimumNumberForms = 0.01

export const defaultOperationName = "My Operating Point"
export const defaultOperationNamePlaceHolder = "Operating Point Identifier"

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

export const defaultGapType = "Ungapped";
export const defaultGapLength = 5e-6;
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

export const coreLossesModelDefault = 'iGSE';
export const coreTemperatureModelDefault = 'Maniktala';
export const reluctanceModelDefault = 'Zhang';

export const wireMaterialDefault = "copper";
