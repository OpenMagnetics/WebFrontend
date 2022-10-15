<!--
We can create two-way bindings between state and form inputs using the v-model directive.
-->

<script setup>
import { ref } from 'vue'
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';
import * as Defaults from '/src/assets/js/waveformDefaults.js'

const selected = ref()
const emit = defineEmits(['voltage-type-change', 'current-type-change'])
const voltageSelected = ref(Defaults.defaultVoltageType)
const currentSelected = ref(Defaults.defaultCurrentType)
const voltageRef = ref(null)
const currentRef = ref(null)

const schema = Yup.object().shape({
    voltageType: Yup.string()
        .required('Please, choose a Voltage waveform type'),
    currentType: Yup.string()
        .required('Please, choose a Current waveform type'),
    operationPointName: Yup.string()
        .required('Name cannot be empty').min(4),
});

const voltageCompatibilities = {
    "Custom": {
        "totally": ["Custom"],
        "none": [],
    },
    "Square": {
        "totally": ["Triangular"],
        "none": ["Triangular with Dead-Time"],
    },
    "Square with Dead-Time": {
        "totally": ["Triangular with Dead-Time"],
        "none": ["Triangular"],
    },
    "Sinusoidal": {
        "totally": ["Sinusoidal"],
        "none": ["Triangular with Dead-Time"],
    },
}

const currentCompatibilities = {
    "Custom": {
        "totally": ["Custom"],
        "none": [],
    },
    "Triangular": {
        "totally": ["Square"],
        "none": ["Square with Dead-Time"],
    },
    "Triangular with Dead-Time": {
        "totally": ["Square with Dead-Time"],
        "none": ["Square"],
    },
    "Sinusoidal": {
        "totally": ["Sinusoidal"],
        "none": ["Square with Dead-Time"],
    },
    "Square": {
        "totally": ["Triangular"],
        "none": ["Triangular with Dead-Time"],
    },
}

function onVoltageChange(event) {
    emit("voltage-type-change", event.target.value)
    voltageSelected.value = event.target.value
    if (voltageCompatibilities[event.target.value]['none'].includes(currentSelected.value)) {
        const found = voltageCompatibilities[event.target.value]['none'].find(element => element == currentSelected.value);
        currentRef.value.setErrors(["Voltage of type '" + found +"' is not recommended with current of type '" + currentSelected.value + "'. We recommend change the current to '" + voltageCompatibilities[event.target.value]['totally'][0] + "' instead."])
    }
    else {
        currentRef.value.setErrors([])

    }
}
function onCurrentChange(event) {
    emit("current-type-change", event.target.value)
    currentSelected.value = event.target.value
    if (currentCompatibilities[event.target.value]['none'].includes(voltageSelected.value)) {
        const found = currentCompatibilities[event.target.value]['none'].find(element => element == voltageSelected.value);
        voltageRef.value.setErrors(["Current of type '" + found +"' is not recommended with voltage of type '" + voltageSelected.value + "'. We recommend change the current to '" + currentCompatibilities[event.target.value]['totally'][0] + "' instead."])
    }
    else {
        voltageRef.value.setErrors([])
    }
}

</script>

<template>
    <div class="container-flex text-white mt-3 mb-3 pb-3 border-bottom">
        <Form :validation-schema="schema" v-slot="{ errors }" class="form-inline">
            <label class="fs-5 mx-3">Operation Point Name:</label>
            <Field name="operationPointName" type="text"  :class="{ 'is-invalid': errors.operationPointName }" :placeholder="Defaults.defaultOperationNamePlaceHolder" :value="Defaults.defaultOperationName" class= "bg-light text-white rounded-2"/>

            <label class="fs-5 ms-5 me-3">Voltage waveform:</label>
            <Field name="voltageType" ref="voltageRef" as="select" :class="{ 'is-invalid': errors.voltageType }" @change="onVoltageChange" :value="voltageSelected" class= "bg-light text-white rounded-2">
                <option disabled value="">Please select one</option>
                <option value="Custom">Custom</option>
                <option value="Square">Square</option>
                <option value="Square with Dead-Time">Square with Dead-Time</option>
                <option value="Sinusoidal">Sinusoidal</option>
            </Field>

            <label class="fs-5 ms-5 me-3">Current waveform:</label>
            <Field name="currentType" ref="currentRef" as="select" :class="{ 'is-invalid': errors.currentType }" @change="onCurrentChange" :value="currentSelected" class= "bg-light text-white rounded-2">
                <option disabled value="">Please select one</option>
                <option value="Custom">Custom</option>
                <option value="Triangular">Triangular</option>
                <option value="Sinusoidal">Sinusoidal</option>
                <option disabled value="Sinusoidal">Flyback (coming soon)</option>
                <option disabled value="Sinusoidal">PS Full Bridge (coming soon)</option>
            </Field>

            <div class="invalid-feedback">{{errors.operationPointName}}</div>
            <div class="invalid-feedback">{{errors.voltageType}}</div>
            <div class="invalid-feedback">{{errors.currentType}}</div>
        </Form>
    </div>
</template>

