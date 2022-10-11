import { defineStore } from 'pinia'
import * as Utils from '/src/assets/js/waveformUtils.js'
import { ref, watch, computed  } from 'vue'


const commonPart = () => {
    const dataPoints = ref([])
    const switchingFrequency = ref(0)
    const valuePrecision = ref(null)
    const chartReady = ref(false)
    const params = ref({offset: null, peakToPeak: null, dutyCycle: null, })
    const getParams = computed(() => {
        return params
    })
    const getDataPoints = computed(() => {
        return dataPoints
    })
    const getDataPoint = computed((index) => {
        return dataPoints[index]
    })
    const getSwitchingFrequency = computed(() => {
        return switchingFrequency
    })
    const getYPrecision = computed(() => {
        return valuePrecision
    })
    const isChartReady = computed(() => {
        return chartReady
    })

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
    function setSwitchingFrequency(switchingFrequency) {
        this.switchingFrequency = switchingFrequency
        this.timePrecision = 1 / switchingFrequency / 100
    }
    function setParam(param, value) {
        this.params[param] = value
    }
    function setChartReady(param, value) {
        this.chartReady = true
    }
    return {
        dataPoints,
        switchingFrequency,
        valuePrecision,
        params,
        getParams,
        getDataPoint,
        getDataPoints,
        getSwitchingFrequency,
        getYPrecision,
        setDataPoint,
        setDataPoints,
        setDataPointsFromDragging,
        setSwitchingFrequency,
        setParam,
        isChartReady,
        setChartReady,
    }
}
export const useCurrentStore = defineStore("current", commonPart)
export const useVoltageStore = defineStore("voltage", commonPart)
export const useCommonStore = defineStore("common", () => {
    const switchingFrequency = ref(100000)
    const dutyCycle = ref(0.5)
    const timePrecision = ref(1 / 10000000)
    const getSwitchingFrequency = computed(() => {
        return switchingFrequency
    })
    const getXPrecision = computed(() => {
        return timePrecision
    })
    const getDutyCycle = computed(() => {
        return dutyCycle
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
    return {
        switchingFrequency,
        timePrecision,
        getSwitchingFrequency,
        getXPrecision,
        setSwitchingFrequency,
        getDutyCycle,
        setDutyCycle,
        setDutyCycleFromPoints,
    }
})

// export const useCurrentStore = defineStore("current", {...waveformStoreOptions})
// export const useVoltageStore = defineStore("voltage", {...waveformStoreOptions})