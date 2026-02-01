<script setup>
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import { minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
import { removeTrailingZeroes, combinedStyle } from '/WebSharedComponents/assets/js/utils.js'

</script>

<script>
export default {
    emits: ["updatedSwitchingFrequency", "updatedDutyCycle"],
    props: {
        modelValue:{
            type: Object,
            required: true
        },
        defaultValue:{
            type: Object,
            default: () => ({})
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const localData = {"frequency": this.modelValue['frequency'], "dutyCycle": this.modelValue.current.processed.dutyCycle};
        const errorMessages = '';
        const forceUpdateDutyCycle = 0;
        const forceUpdateFrequency = 0;
        const blockingReboundsDutyCycle = false;
        const blockingReboundsFrequency = false;
        return {
            localData,
            forceUpdateDutyCycle,
            forceUpdateFrequency,
            errorMessages,
            blockingReboundsDutyCycle,
            blockingReboundsFrequency,
        }
    },
    computed: {
        enableDutyCycle() {
            if (this.modelValue.current == null)
                return false;
            if (this.modelValue.voltage == null)
                return false;
            if ((this.modelValue.current.processed && this.modelValue.current.processed.label != 'Custom') || (this.modelValue.voltage.processed && this.modelValue.voltage.processed.label != 'Custom'))
                return true;
            return false;
        }
    },
    watch: {
        'modelValue.current.processed.dutyCycle'(newValue, oldValue) {
            var aux = this.localData;
            aux.dutyCycle = newValue;
            this.localData = aux;
            if (!this.blockingReboundsDutyCycle) {
                this.blockingReboundsDutyCycle = true;
                this.forceUpdateDutyCycle += 1;
                setTimeout(() => this.blockingReboundsDutyCycle = false, 10);
            }
        },
        'modelValue.voltage.processed.dutyCycle'(newValue, oldValue) {
            // this.localData.dutyCycle = newValue;
            const aux = this.localData;
            aux.dutyCycle = newValue;
            this.localData = aux;
            if (!this.blockingReboundsDutyCycle) {
                this.blockingReboundsDutyCycle = true;
                this.forceUpdateDutyCycle += 1;
                setTimeout(() => this.blockingReboundsDutyCycle = false, 10);
            }
        },
        'modelValue'(newValue, oldValue) {
            if (!this.blockingReboundsFrequency) {
                var aux = this.localData;
                aux.frequency = newValue.frequency;
                this.localData = aux;
                this.blockingReboundsFrequency = true;
                this.forceUpdateFrequency += 1;
                setTimeout(() => this.blockingReboundsFrequency = false, 10);
            }
        },
    },
    methods: {
        frequencyChanged(value) {
            this.modelValue.frequency = value;
            this.$emit("updatedSwitchingFrequency");
        },
        dutyCycleChanged(value) {
            if (!isNaN(value)) {
                this.modelValue.current.processed.dutyCycle = value;
                this.modelValue.voltage.processed.dutyCycle = value;
                this.$emit("updatedDutyCycle");
            }
        },
    }
}
</script>

<template>
    <div class="container-flex">
        <div class="row text-center">
            <label
                :style="combinedStyle([$styleStore.operatingPoints.inputTitleFontSize, $styleStore.operatingPoints.commonParameterTextColor])"
                class=""
            >
                Common parameters
            </label>
        </div>
        <div class="row">

            <Dimension class="border-bottom border-1 py-2 col-12"
                :name="'frequency'"
                :unit="'Hz'"
                :dataTestLabel="dataTestLabel + '-Frequency'"
                :min="minimumMaximumScalePerParameter['frequency']['min']"
                :max="minimumMaximumScalePerParameter['frequency']['max']"
                :defaultValue="defaultValue.frequency"
                :forceUpdate="forceUpdateFrequency"
                v-model="localData"
                @update="frequencyChanged"
                :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
            />

            <Dimension class="py-2 col-12"
                v-if="enableDutyCycle"
                :name="'dutyCycle'"
                :unit="null"
                :altUnit="'%'"
                :visualScale="100"
                :dataTestLabel="dataTestLabel + '-DutyCycle'"
                :min="minimumMaximumScalePerParameter['percentage']['min']"
                :max="minimumMaximumScalePerParameter['percentage']['max']"
                :defaultValue="defaultValue.current.processed.dutyCycle"
                :forceUpdate="forceUpdateDutyCycle"
                v-model="localData"
                @update="dutyCycleChanged"
                :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
            />
        </div>
        <div data-cy="`${dataTestLabel}-error-text`" class="invalid-feedback">{{errorMessages}}</div>
    </div>
</template>

