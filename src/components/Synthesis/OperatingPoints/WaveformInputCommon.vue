<script setup>
import Dimension from '/src/components/DataInput/Dimension.vue'
import { minimumMaximumScalePerParameter } from '/src/assets/js/defaults.js'

</script>

<script>
export default {
    props: {
        modelValue:{
            type: Object,
            required: true
        },
        defaultValue:{
            type: Object,
            default: {}
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const errorMessages = ''
        return {
            errorMessages
        }
    },
    computed: {
    },
    watch: { 
    },
    mounted () {
    },
    methods: {
        frequencyChanged(value) {
            this.$emit("updatedSwitchingFrequency");
        },
        dutyCycleChanged(value) {
            this.modelValue.voltage.processed.dutyCycle = this.modelValue.current.processed.dutyCycle;
            this.$emit("updatedDutyCycle");
        },
    }
}
</script>

<template>
    <div class="container-flex">
        <label class="fs-4 row text-white">Common parameters</label>
        <div class="row">

            <Dimension class="border-bottom py-2 col-12"
                :name="'frequency'"
                :unit="'Hz'"
                :dataTestLabel="dataTestLabel + '-Frequency'"
                :min="minimumMaximumScalePerParameter['frequency']['min']"
                :max="minimumMaximumScalePerParameter['frequency']['max']"
                :defaultValue="defaultValue.frequency"
                v-model="this.modelValue"
                @update="frequencyChanged"
            />

            <Dimension class="border-bottom py-2 col-12"
                :name="'dutyCycle'"
                :unit="null"
                :altUnit="'%'"
                :visualScale="100"
                :dataTestLabel="dataTestLabel + '-DutyCycle'"
                :min="minimumMaximumScalePerParameter['percentage']['min']"
                :max="minimumMaximumScalePerParameter['percentage']['max']"
                :defaultValue="defaultValue.current.processed.dutyCycle"
                v-model="this.modelValue.current.processed"
                @update="dutyCycleChanged"
            />
        </div>
        <div data-cy="`${dataTestLabel}-error-text`" class="invalid-feedback">{{errorMessages}}</div>
    </div>
</template>

