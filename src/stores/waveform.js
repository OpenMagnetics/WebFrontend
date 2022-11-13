import { defineStore } from 'pinia'
import * as Utils from '/src/assets/js/waveformUtils.js'
import { ref, watch, computed  } from 'vue'
import * as Defaults from '/src/assets/js/waveformDefaults.js'


const commonPart = () => {
    const dataPoints = ref([])
    const sampledDataPoints = ref([])
    const harmonicsAmplitude = ref([])
    const valuePrecision = ref(null)
    const chartReady = ref(false)
    const dataImported = ref(false)
    const type = ref(null)
    const params = ref({offset: Defaults.defaultOffset, peakToPeak: Defaults.defaultPeakToPeak})
    const outputs = ref({label: null, 
                         peakToPeak: null, 
                         dcOffset: null,
                         rms: null,
                         effectiveSwitchingFrequency: null,
                         thd: null})
    const getParams = computed(() => {
        return params
    })
    const getOutputs = computed(() => {
        return outputs
    })
    const getDataPoints = computed(() => {
        return dataPoints
    })
    const getSampledDataPoints = computed(() => {
        return sampledDataPoints
    })
    const getHarmonicsAmplitude = computed(() => {
        return harmonicsAmplitude
    })
    const getDataPoint = computed((index) => {
        return dataPoints[index]
    })
    const getYPrecision = computed(() => {
        return valuePrecision
    })
    const isChartReady = computed(() => {
        return chartReady
    })
    const getType = computed(() => {
        return type
    })
    const isDataImported = computed(() => {
        return dataImported
    })

    function setHarmonicsAmplitude(harmonicsAmplitude) {
        this.harmonicsAmplitude = Utils.deepCopy(harmonicsAmplitude)
    }
    function setSampledDataPoints(points) {
        this.sampledDataPoints = Utils.deepCopy(points)
    }
    function setDataPoint(point, index) {
        this.dataPoints[index] = Utils.deepCopy(point)
        var aux = Utils.getMaxMinInPoints(this.dataPoints, 'y')
        if (aux['max'] != aux['min']) {
            this.valuePrecision = Math.abs(aux['max'] - aux['min']) / 100
        }
    }
    function setDataPoints(points) {
        this.dataPoints = Utils.deepCopy(points)
        var aux = Utils.getMaxMinInPoints(points, 'y')
        if (aux['max'] != aux['min']) {
            this.valuePrecision = Math.abs(aux['max'] - aux['min']) / 100
        }
    }
    function setDataPointsFromDragging(points) {
        this.dataPoints = Utils.deepCopy(points)
        var aux = Utils.getMaxMinInPoints(points, 'y')
        if (aux['max'] != aux['min']) {
            this.valuePrecision = Math.abs(aux['max'] - aux['min']) / 100
        }
    }
    function setDataPointsFromFile(points) {
        this.dataPoints = Utils.deepCopy(points)
        var aux = Utils.getMaxMinInPoints(points, 'y')
        if (aux['max'] != aux['min']) {
            this.valuePrecision = Math.abs(aux['max'] - aux['min']) / 100
        }
    }
    function setParam(param, value) {
        this.params[param] = value
    }
    function setOutput(output, value) {
        this.outputs[output] = value
    }
    function setOutputs(outputs) {
        this.outputs = outputs
    }
    function setChartReady(param, value) {
        this.chartReady = true
    }
    function setType(type) {
        this.type = type
    }
    function setNewWaveformType() {
    }
    function setDataImported(dataImported) {
        this.dataImported = dataImported
    }
    return {
        dataPoints,
        valuePrecision,
        params,
        sampledDataPoints,
        harmonicsAmplitude,
        getParams,
        getDataPoint,
        getDataPoints,
        getYPrecision,
        getSampledDataPoints,
        getHarmonicsAmplitude,
        setDataPoint,
        setDataPoints,
        setDataPointsFromFile,
        setDataPointsFromDragging,
        setParam,
        setSampledDataPoints,
        setNewWaveformType,
        setHarmonicsAmplitude,
        isChartReady,
        setChartReady,
        outputs,
        getOutputs,
        setOutput,
        setOutputs,
        type,
        getType,
        setType,
        dataImported,
        isDataImported,
        setDataImported,
    }
}
export const useCurrentStore = defineStore("current", commonPart)
export const useVoltageStore = defineStore("voltage", commonPart)
export const useCommonStore = defineStore("common", () => {
    const operationPointName = ref(Defaults.defaultOperationName)
    const sampledTimePoints = ref([])
    const harmonicsFrequencies = ref([])
    const switchingFrequency = ref(Defaults.defaultSwitchingFrequency)
    const dutyCycle = ref(Defaults.defaultDutyCycle)
    const timePrecision = ref(1 / Defaults.defaultSwitchingFrequency / 100)
    const dataImported = ref(false)
    const dataReadOnly = ref(false)

    const getSwitchingFrequency = computed(() => {
        return switchingFrequency
    })
    const getXPrecision = computed(() => {
        return timePrecision
    })
    const getDutyCycle = computed(() => {
        return dutyCycle
    })
    const getSampledTimePoints = computed(() => {
        return sampledTimePoints
    })
    const getHarmonicsFrequencies = computed(() => {
        return harmonicsFrequencies
    })
    const getOperationPointName = computed(() => {
        return operationPointName
    })
    const isDataImported = computed(() => {
        return dataImported
    })
    const isDataReadOnly = computed(() => {
        return dataReadOnly
    })

    function setSwitchingFrequency(switchingFrequency) {
        this.switchingFrequency = switchingFrequency
        this.timePrecision = 1 / switchingFrequency / 100
    }
    function setDutyCycle(dutyCycle) {
        this.dutyCycle = dutyCycle
    }
    function setDutyCycleFromPoints(dutyCycle) {
        this.dutyCycle = dutyCycle
    }
    function setSampledTimePoints(sampledTimePoints) {
        this.sampledTimePoints = sampledTimePoints
    }
    function setHarmonicsFrequencies(harmonicsFrequencies) {
        this.harmonicsFrequencies = harmonicsFrequencies
    }
    function setOperationPointName(operationPointName) {
        this.operationPointName = operationPointName
    }
    function setDataImported(dataImported) {
        this.dataImported = dataImported
    }
    function setDataReadOnly(dataReadOnly) {
        this.dataReadOnly = dataReadOnly
    }

    return {
        dutyCycle,
        switchingFrequency,
        sampledTimePoints,
        timePrecision,
        harmonicsFrequencies,
        getSwitchingFrequency,
        getXPrecision,
        getSampledTimePoints,
        getDutyCycle,
        setHarmonicsFrequencies,
        setSwitchingFrequency,
        setDutyCycle,
        setDutyCycleFromPoints,
        setSampledTimePoints,
        getHarmonicsFrequencies,
        operationPointName,
        getOperationPointName,
        setOperationPointName,
        dataImported,
        isDataImported,
        setDataImported,
        isDataReadOnly,
        dataReadOnly,
        setDataReadOnly,
    }
})
