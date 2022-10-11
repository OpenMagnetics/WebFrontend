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


var defaultData = []
var numberPoints = 120;
for(var i = 0; i <= numberPoints; i++) {
    var x = i * 2 * Math.PI / numberPoints
    var y = Math.sin(x) * 2.5;
    defaultData.push({ x: x, y: y });
}

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
    const maxMin = Utils.getMaxMinInPoints(dataPoints, 'y')
    var peakToPeakValue = Utils.roundWithDecimals(Math.abs(maxMin['max'] - maxMin['min']), Math.pow(10, precision))
    var offsetValue = (maxMin['max'] + maxMin['min']) / 2
    var dutyCycleValue = 0.5
    formRef.value.setFieldValue("peakToPeakValidator", peakToPeakValue);
    formRef.value.setFieldValue("offsetValidator", offsetValue);
    return {peakToPeakValue, offsetValue, dutyCycleValue}
}

function getDataPointsFromParams(params) {
    const aux = []
    for(var i = 0; i <= numberPoints; i++) {
        var x = i * 2 * Math.PI / numberPoints
        var y = (Math.sin(x) * params['peakToPeak'] / 2) + Number(params['offset']);
        aux.push({ x: x, y: y });
    }
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

            <label class="fs-5 mx-3">Offset:</label>
            <label class="fs-5 mx-1 float-end" style="width: 10px;">{{electricalParameter == "current"? 'A' : 'V'}}</label>
            <Field name="offsetValidator" type="number" :value="offset" @change="offsetChange" :class="{ 'is-invalid': errors.offsetValidator }" class="bg-light text-white float-end" style="width: 100%; max-width: 70px;"/>


            <div class="invalid-feedback">{{errors.peakToPeakValidator}}</div>
            <div class="invalid-feedback">{{errors.dutyCycleValidator}}</div>
            <div class="invalid-feedback">{{errors.offsetValidator}}</div>

        </Form>
    </div>
</template>

