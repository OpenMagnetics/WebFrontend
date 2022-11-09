
export const defaultVoltageType = "Square"
export const defaultCurrentType = "Triangular"
export const defaultPrecision = -2
export const defaultMinimumNumberForms = 0.01

export const defaultOperationNamePlaceHolder = "Operation Point Identifier"
export const defaultOperationName = "My Operation Point"

export const defaultOffset = 0
export const defaultPeakToPeak = 10
export const defaultDutyCycle = 0.25
export const defaultSwitchingFrequency = 100000
export const defaultTimeExponent = 5
export const defaultSinusoidalNumberPoints = 120

export const defaultSamplingNumberPoints = 32
export const defaultOperationPointSaveConfiguration = {
    numberPoints: 128,
    exportEquidistant: false,
    includeProcessed: false,
    includeHarmonics: false,
}

export function titleColor(electricalParameter){
    if (electricalParameter == "current") {
        return "text-info"
    }
    else {
        return "text-primary"
    }
}