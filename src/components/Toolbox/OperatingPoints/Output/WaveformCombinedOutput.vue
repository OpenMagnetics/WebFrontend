<script setup>
import { useTaskQueueStore } from '../../../../stores/taskQueue'
import DimensionReadOnly from '/WebSharedComponents/DataInput/DimensionReadOnly.vue'
import { removeTrailingZeroes, combinedStyle } from '/WebSharedComponents/assets/js/utils.js'
import { minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
</script>

<script>
export default {
    props: {
        modelValue:{
            type: Object,
            required: true
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const taskQueueStore = useTaskQueueStore();
        const localData = {
            instantaneousPower: null,
            rmsPower: null,
        }
        return {
            taskQueueStore,
            localData,
        }
    },
    computed: {
    },
    watch: {
        'modelValue': {
          handler(newValue, oldValue) {
            this.process();
          },
          deep: true
        }
    },
    mounted () {
        this.process();
    },
    methods: {
        async process() {
            try {
                this.localData.instantaneousPower = await this.taskQueueStore.calculateInstantaneousPower(this.modelValue);
                this.localData.rmsPower = await this.taskQueueStore.calculateRmsPower(this.modelValue);
            } catch (error) {
                console.error(error);
            }
        }
    }
}
</script>

<template>
    <div class="container-flex">
        <div class="row">
            <DimensionReadOnly class="col-6"
                :name="'instantaneousPower'"
                :unit="'W'"
                :dataTestLabel="dataTestLabel + '-InstantaneousPower'"
                :value="localData.instantaneousPower"
                :min="minimumMaximumScalePerParameter.power.min"
                :max="minimumMaximumScalePerParameter.power.max"
                :disableShortenLabels="true"
                :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
            />
            <DimensionReadOnly class="col-6"
                :name="'rmsPower'"
                :unit="'W'"
                :dataTestLabel="dataTestLabel + '-rmsPower'"
                :value="localData.rmsPower"
                :min="minimumMaximumScalePerParameter.power.min"
                :max="minimumMaximumScalePerParameter.power.max"
                :disableShortenLabels="true"
                :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
            />
        </div>
    </div>
</template>

