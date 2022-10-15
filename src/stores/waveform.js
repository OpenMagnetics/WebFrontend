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
    const params = ref({offset: Defaults.defaultOffset, peakToPeak: Defaults.defaultPeakToPeak, dutyCycle: Defaults.defaultDutyCycle, })
    const getParams = computed(() => {
        return params
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

    function setParam(param, value) {
        this.params[param] = value
    }
    function setChartReady(param, value) {
        this.chartReady = true
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
        setDataPointsFromDragging,
        setParam,
        setSampledDataPoints,
        setHarmonicsAmplitude,
        isChartReady,
        setChartReady,
    }
}
export const useCurrentStore = defineStore("current", commonPart)
export const useVoltageStore = defineStore("voltage", commonPart)
export const useCommonStore = defineStore("common", () => {
    const sampledTimePoints = ref([])
    const harmonicsFrequencies = ref([])
    const switchingFrequency = ref(Defaults.defaultSwitchingFrequency)
    const dutyCycle = ref(Defaults.defaultDutyCycle)
    const timePrecision = ref(1 / Defaults.defaultSwitchingFrequency / 100)
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
    return {
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
    }
})
