<!--
We can create two-way bindings between state and form inputs using the v-model directive.
-->

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'
import * as Utils from '/src/assets/js/waveformUtils.js'
import * as Defaults from '/src/assets/js/waveformDefaults.js'

const emit = defineEmits(['time-change', 'value-change', 'add-point-below', 'remove-point'])
const timeExponent = ref(Defaults.defaultTimeExponent)
const schema = ref(null)
const formRef = ref(null)
const props = defineProps({
    index: {
        type: Number,
        required: true,
    },
    electricalParameter: {
        type: String,
        required: false,
        default: "current",
    },
    time: {
        type: Number,
        required: true,
    },
    value: {
        type: Number,
        required: true,
    },
})
schema.value = Yup.object().shape({
    timeValidator: Yup.number().required().typeError("The value for peak to peak must be a number").min(0).max(10).label("Point time"),
    valueValidator: Yup.number().required().typeError("The value for peak to peak must be a number").label("Point value"),
});

const valueVar = ref(props.value)
const timeVar = ref(props.time * Math.pow(10, timeExponent.value + 1))

var store
var commonStore = useCommonStore()
if (props.electricalParameter == "current") {
    store = useCurrentStore()
} else {
    store = useVoltageStore()
}

function onTimeChange(event) {
    timeVar.value = event.target.value
    const newPoint = {x: timeVar.value / Math.pow(10, timeExponent.value + 1), y: Number(valueVar.value)}
    store.setDataPoint(newPoint, props.index)
    emit("time-change", {x: newPoint.x, index: props.index})
}
function onValueChange(event) {
    valueVar.value = event.target.value
    const newPoint = {x: timeVar.value / Math.pow(10, timeExponent.value + 1), y: Number(valueVar.value)}
    store.setDataPoint(newPoint, props.index)
    emit("value-change", {y: event.target.value, index: props.index})
}

function onAddPointBelow(event) {
    emit("add-point-below", props.index)
}
function onRemovePoint(event) {
    emit("remove-point", props.index)
}

commonStore.$onAction((action) => {
    if (action.name == "setSwitchingFrequency") {
        const switchingFrequency = action.args[0]
        schema.value = Yup.object().shape({
            timeValidator: Yup.number().required().typeError("The value for peak to peak must be a number").min(0).max(Utils.roundWithDecimals(1 / switchingFrequency * Math.pow(10, timeExponent.value + 1), 0.01).toFixed(2)).label("Point time"),
            valueValidator: Yup.number().required().typeError("The value for peak to peak must be a number").label("Point value"),
        });
        timeExponent.value = Math.floor(Math.log10(switchingFrequency))
    }
})

store.$onAction((action) => {
    if (action.name == "setChartReady") {
        // store.setDataPoints(Utils.deepCopy(Utils.scaleData(data.value, switchingFrequency.value)));
    }
    else if (action.name == "setDataPointsFromDragging" || action.name == "setDataPoints") {
        const dataPoints = action.args[0]
        if (props.index < dataPoints.length) {
            const dataPoint = action.args[0][props.index]
            timeVar.value = dataPoint.x * Math.pow(10, timeExponent.value + 1)
            valueVar.value = dataPoint.y
            if (formRef.value != null) {
                formRef.value.setFieldValue("timeValidator", timeVar.value);
                formRef.value.setFieldValue("valueValidator", valueVar.value);
            }
        }
    }
    else if (action.name == "setDataPoint") {
        const dataPoint = action.args[0]
        const modifiedIndex = action.args[1]
        if ((modifiedIndex == 0 || modifiedIndex == (store.getDataPoints.value.length - 1)) &&
            (props.index == 0 || props.index == (store.getDataPoints.value.length - 1) &&
             dataPoint.x != timeVar.value && dataPoint.y != valueVar.value)) {

            valueVar.value = dataPoint.y
            if (formRef.value != null) {
                formRef.value.setFieldValue("valueValidator", valueVar.value);
            }
        }
    }
})

const getExponentLabel = computed(() => {
    return 'e-' + timeExponent.value
})
</script>

<template>
    <div class="container-flex text-white mt-2 mb-1">
        <Form ref="formRef" :validation-schema="schema" v-slot="{ errors }" class="form-inline">
            <label class="fs-5 ms-3 me-1">x: </label>
            <Field name="timeValidator" type="number" :disabled="index == 0 || index == (store.getDataPoints.value.length - 1)" :value="timeVar" @change="onTimeChange" :class="{ 'is-invalid': errors.timeValidator }" class="rounded-2 bg-light text-white" style="width: 100%; max-width: 50px;"/>
            <input class="fs-6 ms-1 bg-light text-white bg-dark border-0" style="width: 30px;" :value="getExponentLabel" disabled/>
            <label class="fs-5 me-2" style="width: 10px;">{{'s'}}</label>

            <label class="fs-5 ms-1 me-1">y: </label>
            <Field name="valueValidator" type="number" :value="valueVar" @change="onValueChange" :class="{ 'is-invalid': errors.valueValidator }" class=" rounded-2 bg-light text-white" style="width: 100%; max-width: 60px;"/>
            <label class="fs-5 mx-1" style="width: 10px;">{{electricalParameter == "current"? 'A' : 'V'}}</label>
            <span class="ms-2">
                <button v-if="index != (store.getDataPoints.value.length - 1)" type="button" class="btn btn-default btn-circle bg-dark mb-1 me-1" @click="onAddPointBelow"><i class="fa-solid fa-circle-plus text-secondary"></i> </button>
                <button v-if="index != 0 && index != (store.getDataPoints.value.length - 1)" type="button" class="btn btn-default btn-circle bg-dark mb-1" @click="onRemovePoint"><i class="fa-solid fa-circle-minus text-danger"></i> </button>
            </span>
            <div class="invalid-feedback">{{errors.timeValidator}}</div>
            <div class="invalid-feedback">{{errors.valueValidator}}</div>
        </Form>
    </div>
</template>


<style type="text/css">
    
.btn-circle {
    width: 1.2vw;
    height: 1.2vw;
    padding: 0px 0px;
    border-radius: 12.5px;
    text-align: center;
    font-size: 1.2vw;
    line-height: 0
}

</style>
