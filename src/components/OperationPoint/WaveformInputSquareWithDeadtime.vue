<script setup>
import { ref, watch, computed, defineProps, onMounted } from 'vue'
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import * as Utils from '/src/assets/js/waveformUtils.js'
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'

import { loadBase } from '/src/assets/js/WaveformInputBase.js'
import * as Defaults from '/src/assets/js/waveformDefaults.js'

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

function createWaveform(peakToPeak, dutyCycle) {
    const dc = Number(Math.abs(dutyCycle) % 0.5001)
    const max = +Number(peakToPeak / 2)
    const min = -Number(peakToPeak / 2)
    const data = [{x: 0  , y: 0 },
                  {x: 0.25 - dc / 2, y: 0 },
                  {x: 0.25 - dc / 2, y: max },
                  {x: 0.25 + dc / 2, y: max },
                  {x: 0.25 + dc / 2, y: 0 },
                  {x: 0.75 - dc / 2, y: 0 },
                  {x: 0.75 - dc / 2, y: min },
                  {x: 0.75 + dc / 2, y: min },
                  {x: 0.75 + dc / 2, y: 0 },
                  {x: 1, y: 0 }]
    return data
}

const defaultData = createWaveform(Defaults.defaultPeakToPeak, Defaults.defaultDutyCycle)

const {offset,
       peakToPeak,
       dutyCycle,
       data,
       store,
       peakToPeakChange,
       dutyCycleChange,
       offsetChange,
       schema,
       formRef,
       } = loadBase(props.electricalParameter, props.isChartReady, defaultData, getParamsFromDataPoints, getDataPointsFromParams)

function getParamsFromDataPoints(dataPoints, precision) {
    const maxMin = Utils.getMaxMinInPoints(dataPoints, 'y')
    var peakToPeakValue = Utils.roundWithDecimals(Math.abs(maxMin['max'] - maxMin['min']), Math.pow(10, precision))
    var offsetValue = 0
    var dutyCycleValue = Utils.roundWithDecimals((dataPoints[1].x - dataPoints[0].x) / (dataPoints[7].x - dataPoints[0].x), Math.pow(10, precision))
    formRef.value.setFieldValue("peakToPeakValidator", peakToPeakValue);
    formRef.value.setFieldValue("offsetValidator", offsetValue);
    return {peakToPeakValue, offsetValue, dutyCycleValue}
}

function getDataPointsFromParams(params) {
    return createWaveform(params['peakToPeak'], params['dutyCycle'])
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

            <div class="invalid-feedback">{{errors.peakToPeakValidator}}</div>
            <div class="invalid-feedback">{{errors.dutyCycleValidator}}</div>

        </Form>
    </div>
</template>

