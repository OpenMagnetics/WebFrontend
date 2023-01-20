<script setup>
import { ref, watch, computed, defineProps, onMounted } from 'vue'
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import * as Utils from '/src/assets/js/utils.js'
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'
import { loadBase } from '/src/assets/js/WaveformInputBase.js'
import WaveformInputCustomPoint from '/src/components/OperationPoint/WaveformInputCustomPoint.vue'
import * as Defaults from '/src/assets/js/defaults.js'

const props = defineProps({
    electricalParameter: {
        type: String,
        required: false,
        default: "current",
    },
    isChartReady: {
        type: Boolean,
        required: false,
        default: false,
    },
})
const precision = Defaults.defaultPrecision

var store
var commonStore = useCommonStore()
if (props.electricalParameter == "current") {
    store = useCurrentStore()
} else {
    store = useVoltageStore()
}
const defaultData = [{x: 0, y: -Defaults.defaultPeakToPeak / 2 },
                     {x: Defaults.defaultDutyCycle, y: Defaults.defaultPeakToPeak / 2 },
                     {x: 1, y: -Defaults.defaultPeakToPeak / 2 }]
const data = props.isChartReady? ref(Utils.deepCopy(store.getDataPoints.value)) : ref(defaultData)

if (store.isDataImported.value) {
    data.value = store.getDataPoints.value
    store.setDataImported(false)
}
var switchingFrequency = ref(commonStore.getSwitchingFrequency.value)

function getParamsFromDataPoints(dataPoints, precision) {
    if (dataPoints == null){
        dataPoints = Utils.deepCopy(defaultData)
    }
    var peakToPeakValue = Utils.roundWithDecimals(Math.abs(dataPoints[1].y - dataPoints[0].y), Math.pow(10, precision))
    var offsetValue = Utils.roundWithDecimals((dataPoints[0].y + dataPoints[1].y) / 2, Math.pow(10, precision))
    var dutyCycleValue = Utils.roundWithDecimals((dataPoints[1].x - dataPoints[0].x) / (dataPoints[2].x - dataPoints[0].x), Math.pow(10, precision))
    return {peakToPeakValue, offsetValue, dutyCycleValue}
}

function getDataPointsFromParams(params) {
    const aux = [{x: 0, y: Number(params['offset']) - Number(params['peakToPeak']) / 2 }, {x: Number(Math.abs(params['dutyCycle']) % 1), y: Number(params['offset']) + Number(params['peakToPeak']) / 2 }, {x: 1, y: Number(params['offset']) - Number(params['peakToPeak']) / 2 } ]
    return aux
}

function onTimeChange(newValue) {
    data.value[newValue.index].x = Number(newValue.x)
}
function onValueChange(newValue) {
    data.value[newValue.index].y = Number(newValue.y)
    if (newValue.index == 0 || newValue.index == (data.value.length - 1)){
        data.value[0].y = Number(newValue.y)
        data.value[data.value.length - 1].y = Number(newValue.y)
        store.setDataPoint(data.value[0], 0);
        store.setDataPoint(data.value[data.value.length - 1], data.value.length - 1);
    }
}

function onAddPointBelow(index) {
    var newItem = Utils.deepCopy(data.value[index])
    newItem.x = (data.value[index].x + data.value[index + 1].x) / 2
    newItem.y = (data.value[index].y + data.value[index + 1].y) / 2
    data.value.splice(index + 1, 0, newItem);
    store.setDataPoints(Utils.deepCopy(Utils.scaleData(data.value, switchingFrequency.value)));
}
function onRemovePoint(index) {
    data.value.splice(index, 1)
    store.setDataPoints(Utils.deepCopy(Utils.scaleData(data.value, switchingFrequency.value)));
}

onMounted(() => {
    if (props.isChartReady) {
        switchingFrequency = commonStore.getSwitchingFrequency;
        data.value = Utils.deepCopy(store.getDataPoints.value)
    }

    store.$onAction((action) => {
        if (action.name == "setChartReady") {
            store.setDataPoints(Utils.deepCopy(Utils.scaleData(data.value, switchingFrequency.value)));
        }
        else if (action.name == "setDataPointsFromDragging" || action.name == "setDataPointsFromFile") {
            const dataPoints = action.args[0]
            data.value = Utils.deepCopy(dataPoints)
        }
    })
    commonStore.$onAction((action) => {
        if (action.name == "setSwitchingFrequency") {
            switchingFrequency.value = action.args[0]
            store.setDataPoints(Utils.deepCopy(Utils.scaleData(data.value, switchingFrequency.value)));
        }
    })
    store.setNewWaveformType()
})

const orderedData = computed(() => {
    return Utils.scaleData(data.value, switchingFrequency.value)
})


</script>


<template>
    <div class="container-flex text-white mt-2 mb-3 pb-3 border-bottom">
        <label class="fs-4 mx-3 mb-3" :class="Defaults.titleColor(electricalParameter)"> Waveform for {{electricalParameter}}</label>
        <div></div>
        <div v-for="(value, key) in data">
            <WaveformInputCustomPoint :index="key" :electricalParameter="electricalParameter" :time="value.x" :value="value.y" @time-change="onTimeChange" @value-change="onValueChange" @add-point-below="onAddPointBelow" @remove-point="onRemovePoint"/>
        </div>
    </div>
</template>

