<script setup>
import { ref, watch, computed, defineProps, onMounted } from 'vue'
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import * as Utils from '/src/assets/js/waveformUtils.js'
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'

import { loadBase } from '/src/assets/js/WaveformInputBase.js'

const props = defineProps({
    electricalParameter: {
        type: String,
        required: false,
        default: "current",
    },
    precision: {
        type: Number,
        required: false,
        default: -2,
    },
    isChartReady: {
        type: Boolean,
        required: false,
        default: false,
    },
})

const defaultData = [{x: 0, y: 10 }, {x: 0.5, y: 10 }, {x: 0.5, y: -10 }, {x: 1, y: -10 }, {x: 1, y: 10 }]

const {offset,
       peakToPeak,
       dutyCycle,
       data,
       store,
       getDataPoints,
       titleColor,
       offsetValue,
       peakToPeakChange,
       dutyCycleChange,
       offsetChange,
       schema,
       formRef,
       } = loadBase(props.electricalParameter, props.precision, props.isChartReady, defaultData, getParamsFromDataPoints, getDataPointsFromParams)

function getParamsFromDataPoints(dataPoints, precision) {
    const maxMin = Utils.getMaxMinInPoints(dataPoints, 'y')
    var peakToPeakValue = Utils.roundWithDecimals(Math.abs(maxMin['max'] - maxMin['min']), Math.pow(10, precision))
    var offsetValue = 0
    var dutyCycleValue = Utils.roundWithDecimals((dataPoints[1].x - dataPoints[0].x) / (dataPoints[4].x - dataPoints[0].x), Math.pow(10, precision))  
    formRef.value.setFieldValue("peakToPeakValidator", peakToPeakValue);
    formRef.value.setFieldValue("offsetValidator", offsetValue);        
    return {peakToPeakValue, offsetValue, dutyCycleValue}
}

function getDataPointsFromParams(params) {
    const dc = Number(Math.abs(params['dutyCycle']) % 1)
    const max = Number(params['offset']) + Number(params['peakToPeak'] * dc)
    const min = Number(params['offset']) - Number(params['peakToPeak'] * (1 - dc))
    const aux = [{x: 0, y: max }, {x: dc, y: max }, {x: dc, y: min }, {x: 1, y: min }, {x: 1, y: max }]
    return aux
}
</script>


<template>
    <div class="container-flex text-white mt-2 mb-3 pb-3 border-bottom">
        <Form ref="formRef" :validation-schema="schema" v-slot="{ errors }" class="form-inline">
            <label class="fs-4 mx-3 mb-3" :class="titleColor"> Waveform for {{electricalParameter}}</label>
            <div></div>
            <label class="fs-5 mx-3">Peak to peak:</label>
            <label class="fs-5 mx-1 float-end" style="width: 10px;">{{electricalParameter == "current"? 'A' : 'V'}}</label>
            <Field name="peakToPeakValidator" type="number" :value="peakToPeak" @change="peakToPeakChange" :class="{ 'is-invalid': errors.peakToPeakValidator }" class= "bg-light text-white float-end" style="width: 100%; max-width: 70px;"/>

            <div></div>

            <div class="invalid-feedback">{{errors.peakToPeakValidator}}</div>
            <div class="invalid-feedback">{{errors.dutyCycleValidator}}</div>
        </Form>
    </div>
</template>

