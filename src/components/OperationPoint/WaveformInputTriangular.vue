<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import * as Utils from '/src/assets/js/utils.js'
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'

import { loadBase } from '/src/assets/js/WaveformInputBase.js'
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

function createWaveform(offset, peakToPeak, dutyCycle) {
    const aux = [{x: 0, y: Number(offset) - Number(peakToPeak) / 2 }, {x: Number(Math.abs(dutyCycle) % 1), y: Number(offset) + Number(peakToPeak) / 2 }, {x: 1, y: Number(offset) - Number(peakToPeak) / 2 } ]
    return aux
}
const defaultData = createWaveform(Defaults.defaultOffset, Defaults.defaultPeakToPeak, Defaults.defaultDutyCycle)

const {offset,
       peakToPeak,
       dutyCycle,
       data,
       store,
       peakToPeakChange,
       offsetChange,
       schema,
       formRef,
       } = loadBase(props.electricalParameter, props.isChartReady, defaultData, getParamsFromDataPoints, getDataPointsFromParams)

function getParamsFromDataPoints(dataPoints, precision) {
    var peakToPeakValue = Utils.roundWithDecimals(Math.abs(dataPoints[1].y - dataPoints[0].y), Math.pow(10, precision))
    var offsetValue = Utils.roundWithDecimals((dataPoints[0].y + dataPoints[1].y) / 2, Math.pow(10, precision))
    var dutyCycleValue = Utils.roundWithDecimals((dataPoints[1].x - dataPoints[0].x) / (dataPoints[2].x - dataPoints[0].x), Math.pow(10, precision)) 
    formRef.value.setFieldValue("peakToPeakValidator", peakToPeakValue);
    formRef.value.setFieldValue("offsetValidator", offsetValue);         
    return {peakToPeakValue, offsetValue, dutyCycleValue}
}

function getDataPointsFromParams(params) {
    return createWaveform(params['offset'], params['peakToPeak'], params['dutyCycle'])
}

function handleSubmit(params) {
}
</script>


<template>
    <div class="container-flex text-white mt-2 mb-3 pb-3 border-bottom">
        <Form ref="formRef" :validation-schema="schema" v-slot="{ handleSubmit, errors }" class="form-inline" @submit="handleSubmit($event, onSubmit)">
            <label class="fs-4 mx-3 mb-3" :class="Defaults.titleColor(electricalParameter)"> Waveform for {{electricalParameter}}</label>
            <div></div>
            <label class="fs-5 mx-3">Peak to peak:</label>
            <label class="fs-5 mx-1 float-end" style="width: 10px;">{{electricalParameter == "current"? 'A' : 'V'}}</label>
            <Field name="peakToPeakValidator" type="number" :value="peakToPeak" @change="peakToPeakChange" :class="{ 'is-invalid': errors.peakToPeakValidator }" class="rounded-2 bg-light text-white float-end" style="width: 100%; max-width: 70px;"/>

            <div></div>

            <label class="fs-5 mx-3">DC Bias/Offset:</label>
            <label class="fs-5 mx-1 float-end" style="width: 10px;">{{electricalParameter == "current"? 'A' : 'V'}}</label>
            <Field name="offsetValidator" type="number" :value="offset" @change="offsetChange" :class="{ 'is-invalid': errors.offsetValidator }" class="rounded-2 bg-light text-white float-end" style="width: 100%; max-width: 70px;"/>


            <div class="invalid-feedback">{{errors.peakToPeakValidator}}</div>
            <div class="invalid-feedback">{{errors.dutyCycleValidator}}</div>
            <div class="invalid-feedback">{{errors.offsetValidator}}</div>

        </Form>
    </div>
</template>

