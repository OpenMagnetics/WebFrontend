<script setup>
import { ref, watch, computed, defineProps, onMounted } from 'vue'
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import * as Utils from '/src/assets/js/waveformUtils.js'
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { Vue3ToggleButton } from 'vue3-toggle-button'
import '/node_modules/vue3-toggle-button/dist/style.css'
import { useCommonStore } from '/src/stores/waveform'

const commonStore = useCommonStore()
const emit = defineEmits(['switching-frequency-change', 'duty-cycle-change'])

const style = getComputedStyle(document.body);
const theme = {
  primary: style.getPropertyValue('--bs-primary'),
  secondary: style.getPropertyValue('--bs-secondary'),
  success: style.getPropertyValue('--bs-success'),
  info: style.getPropertyValue('--bs-info'),
  warning: style.getPropertyValue('--bs-warning'),
  danger: style.getPropertyValue('--bs-danger'),
  light: style.getPropertyValue('--bs-light'),
  dark: style.getPropertyValue('--bs-dark'),
  white: style.getPropertyValue('--bs-white'),
}
const props = defineProps({
    switchingFrequency: {
        type: Number,
        required: false,
        default: 100,
    },
    precision: {
        type: Number,
        required: false,
        default: 0,
    }
})

const schema = Yup.object().shape({
    switchingFrequencyValidator: Yup.number().required().typeError("The value for frequency must be a number").label("Switching Frequency").test(
        'Is positive?', 
        'Switching Frequency must be greater than 0!', 
        (value) => value > 0
    ),
    dutyCycleValidator: Yup.number().required().typeError("The value for duty cycle must be a number").min(0).max(100),
});

var switchingFrequencyPlaceHolder = ref(100)
var dutyCyclePlaceHolder = ref(50)
const formRef = ref(null);
const dutyCycle = ref(50);

const titleColor = computed(() => {
    return "text-white"
})
const toggleColor = computed(() => {
    return theme['primary']
})

commonStore.$onAction((action) => {
    if (action.name == "setDutyCycleFromPoints") {
        const dutyCycleValue = action.args[0]
        formRef.value.setFieldValue("dutyCycleValidator", dutyCycleValue * 100);
        if (dutyCycle.value != dutyCycleValue) {
            dutyCycle.value = dutyCycleValue
            commonStore.setDutyCycle(dutyCycleValue);
        }

    }
})

</script>


<template>
    <div class="container-flex text-white mt-2 mb-3 pb-3 border-bottom">
        <Form ref="formRef" :validation-schema="schema" v-slot="{ errors }" class="form-inline" @keydown.enter="$event.preventDefault()">
            <label class="fs-4 mx-3 mb-3" :class="titleColor"> Common parameters</label>
            <div></div>
            <label class="fs-5 mx-3">Switching Frequency:</label>
            <label class="fs-5 mx-1 float-end" style="width: 10px;">{{"kHz"}}</label>
            <Field ref="switchingFrequencyRef" name="switchingFrequencyValidator" type="number" :placeholder="switchingFrequencyPlaceHolder" :value="switchingFrequency" @change="$emit('switching-frequency-change', $event.target.value)" :class="{ 'is-invalid': errors.switchingFrequencyValidator }" class= "bg-light text-white float-end" style="width: 100%; max-width: 70px;"/>

<!--             <div></div>
            <div class="row my-2">

            <label class="col-md-6 fs-5 ms-3">Share Duty Cycle?</label>
            <label class="col-md-1 fs-5 me-2">No</label>
            <Vue3ToggleButton class="col-md-2 mt-1" @on-change="$emit('share-duty-cycle-toggle')" :handleColor="theme['light']" :trackColor="theme['primary']" :trackActiveColor="theme['primary']" trackWidth="50px" handleDistance="23px" trackHeight="25px" handleDiameter="25px"> </Vue3ToggleButton>
            <label class="col-md-1 fs-5">Yes</label>
            </div>
 -->
            <div></div>

            <label class="fs-5 mx-3">Duty Cycle:</label>
            <label class="fs-5 mx-1 float-end" style="width: 10px;">{{'%'}}</label>
            <Field name="dutyCycleValidator" type="number" :placeholder="dutyCyclePlaceHolder" :value="dutyCycle" @change="$emit('duty-cycle-change', $event.target.value)" :class="{ 'is-invalid': errors.dutyCycleValidator }" class="bg-light text-white float-end" style="width: 100%; max-width: 70px;"/>

            <div class="invalid-feedback">{{errors.switchingFrequencyValidator}}</div>
            <div class="invalid-feedback">{{errors.dutyCycleValidator}}</div>

        </Form>
    </div>
</template>

