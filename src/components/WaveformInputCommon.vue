<script setup>
import { ref, watch, computed, defineProps, onMounted } from 'vue'
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import * as Utils from '/src/assets/js/waveformUtils.js'
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'
import * as Defaults from '/src/assets/js/waveformDefaults.js'

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
})

const schema = Yup.object().shape({
    switchingFrequencyValidator: Yup.number().required().typeError("The value for frequency must be a number").label("Switching Frequency").test(
        'Is positive?', 
        'Switching Frequency must be greater than 0!', 
        (value) => value > 0
    ),
    dutyCycleValidator: Yup.number().required().typeError("The value for duty cycle must be a number").min(0.01).max(99.99),
});

const formRef = ref(null);
const switchingFrequency = ref(commonStore.getSwitchingFrequency.value / 1000);
const dutyCycle = ref(commonStore.getDutyCycle.value * 100);

const titleColor = computed(() => {
    return "text-white"
})
commonStore.$onAction((action) => {
    if (action.name == "setDutyCycleFromPoints") {
        const dutyCycleValue = action.args[0]
        formRef.value.setFieldValue("dutyCycleValidator", dutyCycleValue * 100);
        if (dutyCycle.value != dutyCycleValue) {
            dutyCycle.value = dutyCycleValue
            console.log("Setting setDutyCycleFromPoints")
            commonStore.setDutyCycle(dutyCycleValue);
        }

    }
})

</script>


<template>
    <div class="container-flex text-white mt-2 mb-3 pb-3 border-bottom">
        <Form ref="formRef" :validation-schema="schema" v-slot="{ errors }" class="form-inline">
            <label class="fs-4 mx-3 mb-3 row" :class="titleColor"> Common parameters</label>
            <div></div>
            <label class="rounded-2 fs-5 ms-3">Switching Freq.:</label>
            <label class="rounded-2 fs-6 mx-1 float-end" style="width: 10px;">{{"kHz"}}</label>
            <Field ref="switchingFrequencyRef" name="switchingFrequencyValidator" type="number" :value="switchingFrequency" @change="$emit('switching-frequency-change', $event.target.value)" :class="{ 'is-invalid': errors.switchingFrequencyValidator }" class="rounded-2 bg-light text-white float-end" style="width: 100%; max-width: 70px;"/>

            <div></div>

            <label class="rounded-2 fs-5 ms-3">Duty Cycle:</label>
            <label class="rounded-2 fs-5 mx-1 float-end" style="width: 10px;">{{'%'}}</label>
            <Field name="dutyCycleValidator" type="number" :value="dutyCycle" @change="$emit('duty-cycle-change', $event.target.value)" :class="{ 'is-invalid': errors.dutyCycleValidator }" class="rounded-2 bg-light text-white float-end" style="width: 100%; max-width: 70px;"/>

            <div class="invalid-feedback">{{errors.switchingFrequencyValidator}}</div>
            <div class="invalid-feedback">{{errors.dutyCycleValidator}}</div>

        </Form>
    </div>
</template>

