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

const defaultData = [{x: 0, y: -10 }, {x: 0.5, y: 10 }, {x: 1, y: -10 }]

const {offset,
       peakToPeak,
       dutyCycle,
       data,
       store,
       getDataPoints,
       titleColor,
       offsetValue,
       peakToPeakChange,
       offsetChange,
       schema,
       formRef,
       } = loadBase(props.electricalParameter, props.precision, props.isChartReady, defaultData, getParamsFromDataPoints, getDataPointsFromParams)

function getParamsFromDataPoints(dataPoints, precision) {
    var peakToPeakValue = Utils.roundWithDecimals(Math.abs(dataPoints[1].y - dataPoints[0].y), Math.pow(10, precision))
    var offsetValue = Utils.roundWithDecimals((dataPoints[0].y + dataPoints[1].y) / 2, Math.pow(10, precision))
    var dutyCycleValue = Utils.roundWithDecimals((dataPoints[1].x - dataPoints[0].x) / (dataPoints[2].x - dataPoints[0].x), Math.pow(10, precision)) 
    formRef.value.setFieldValue("peakToPeakValidator", peakToPeakValue);
    formRef.value.setFieldValue("offsetValidator", offsetValue);         
    return {peakToPeakValue, offsetValue, dutyCycleValue}
}

function getDataPointsFromParams(params) {
    const aux = [{x: 0, y: Number(params['offset']) - Number(params['peakToPeak']) / 2 }, {x: Number(Math.abs(params['dutyCycle']) % 1), y: Number(params['offset']) + Number(params['peakToPeak']) / 2 }, {x: 1, y: Number(params['offset']) - Number(params['peakToPeak']) / 2 } ]
    return aux
}
</script>


<template>
    <div class="container-flex text-white mt-2 mb-3 pb-3 border-bottom">
        <Form ref="formRef" :validation-schema="schema" v-slot="{ errors }" class="form-inline">
            <label class="fs-4 mx-3 mb-3" :class="titleColor"> Waveform for {{electricalParameter}}</label>
            <div></div>
            <label class="fs-5 mx-3">Left peak:</label>
            <label class="fs-5 mx-1 float-end" style="width: 10px;">{{electricalParameter == "current"? 'A' : 'V'}}</label>
            <Field name="leftPeakValidator" type="number" :value="leftPeak" @change="leftPeakChange" :class="{ 'is-invalid': errors.leftPeakValidator }" class= "bg-light text-white float-end" style="width: 100%; max-width: 70px;"/>

            <div></div>
            <div></div>
            <label class="fs-5 mx-3">Central peak:</label>
            <label class="fs-5 mx-1 float-end" style="width: 10px;">{{electricalParameter == "current"? 'A' : 'V'}}</label>
            <Field name="centralPeakValidator" type="number" :value="centralPeak" @change="centralPeakChange" :class="{ 'is-invalid': errors.centralPeakValidator }" class= "bg-light text-white float-end" style="width: 100%; max-width: 70px;"/>

            <div></div>
            <div></div>
            <label class="fs-5 mx-3">Right peak:</label>
            <label class="fs-5 mx-1 float-end" style="width: 10px;">{{electricalParameter == "current"? 'A' : 'V'}}</label>
            <Field name="rightPeakValidator" type="number" :value="rightPeak" @change="rightPeakChange" :class="{ 'is-invalid': errors.rightPeakValidator }" class= "bg-light text-white float-end" style="width: 100%; max-width: 70px;"/>

            <div></div>

            <div class="invalid-feedback">{{errors.leftPeakValidator}}</div>
            <div class="invalid-feedback">{{errors.centralPeakValidator}}</div>
            <div class="invalid-feedback">{{errors.rightPeakValidator}}</div>

        </Form>
    </div>
</template>

