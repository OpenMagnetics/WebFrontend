<script setup>
import { useMasStore } from '../../../../stores/mas'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import { minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
import { removeTrailingZeroes, combinedStyle } from '/WebSharedComponents/assets/js/utils.js'

</script>

<script>
export default {
    emits: ["updatedColumnName", "updatedSwitchingFrequency"],
    props: {
        modelValue:{
            type: Object,
            required: true
        },
        defaultValue:{
            type: Object,
            default: () => ({})
        },
        currentOperatingPointIndex: {
            type: Number,
            default: 0,
        },
        currentWindingIndex: {
            type: Number,
            default: 0,
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
        allColumnNames: {
            type: Array,
        },
    },
    data() {
        const masStore = useMasStore();
        const localData = {"frequency": this.modelValue['frequency']};
        var errorMessages = '';
        if (!this.$stateStore.operatingPointsCircuitSimulator.confirmedColumns[this.currentOperatingPointIndex][this.currentWindingIndex]) {
            localData["frequency"] = 1;
            errorMessages = 'Please, introduce the frequency of your imported signal';
        }
        const forceUpdateFrequency = 0;
        return {
            masStore,
            localData,
            errorMessages,
            forceUpdateFrequency,
        }
    },
    computed: {
    },
    watch: {
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
        columnNameChanged(value) {
            this.$emit("updatedColumnName");
        },
        frequencyChanged(value) {
            this.modelValue.frequency = value;
            if (this.modelValue.frequency < 2) {
                this.errorMessages = 'Please, introduce the frequency of your imported signal';
            }
            else {
                this.errorMessages = '';
            }
            this.$emit("updatedSwitchingFrequency", value);
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
                {{'Common parameters'}}
            </label>
        </div>
        <div class="row">

            <Dimension class="border-bottom pb-2 mb-1"
                :name="'frequency'"
                :unit="'Hz'"
                :dataTestLabel="dataTestLabel + '-Frequency'"
                :min="minimumMaximumScalePerParameter['frequency']['min']"
                :max="minimumMaximumScalePerParameter['frequency']['max']"
                :defaultValue="0"
                :forceUpdate="forceUpdateFrequency"
                v-model="localData"
                :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
                @update="frequencyChanged"
            />
            <label class="text-danger col-12 pt-1" style="font-size: 0.8em">{{errorMessages}}</label>
            <ElementFromList class="border-bottom pb-2 mb-1"
                :name="'time'"
                :dataTestLabel="dataTestLabel + '-Current-Name'"
                :options="allColumnNames"
                :titleSameRow="true"
                :replaceTitle="'Cur. Time'"
                v-model="$stateStore.operatingPointsCircuitSimulator.columnNames[currentOperatingPointIndex][currentWindingIndex]"
                :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
                @update="columnNameChanged"
            />
            <ElementFromList class="border-bottom pb-2 mb-1"
                :name="'current'"
                :dataTestLabel="dataTestLabel + '-Current-Name'"
                :options="allColumnNames"
                :titleSameRow="true"
                :replaceTitle="'Current'"
                v-model="$stateStore.operatingPointsCircuitSimulator.columnNames[currentOperatingPointIndex][currentWindingIndex]"
                :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
                @update="columnNameChanged"
            />
            <ElementFromList class="pb-2 mb-1"
                :name="'voltage'"
                :dataTestLabel="dataTestLabel + '-Current-Name'"
                :options="allColumnNames"
                :titleSameRow="true"
                :replaceTitle="'Voltage'"
                v-model="$stateStore.operatingPointsCircuitSimulator.columnNames[currentOperatingPointIndex][currentWindingIndex]"
                :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
                @update="columnNameChanged"
            />
        </div>
    </div>
</template>

