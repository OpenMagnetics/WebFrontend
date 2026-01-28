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
            // Validate that excitation has required waveform data with actual values
            const excitation = this.modelValue;
            const currentData = excitation?.current?.waveform?.data;
            const voltageData = excitation?.voltage?.waveform?.data;
            
            // Check that both waveforms exist and have actual data points
            if (!currentData || !voltageData || 
                !Array.isArray(currentData) || !Array.isArray(voltageData) ||
                currentData.length === 0 || voltageData.length === 0) {
                this.localData.instantaneousPower = null;
                this.localData.rmsPower = null;
                return;
            }
            
            try {
                this.localData.instantaneousPower = await this.taskQueueStore.calculateInstantaneousPower(excitation);
                this.localData.rmsPower = await this.taskQueueStore.calculateRmsPower(excitation);
            } catch (error) {
                // Silently fail - waveform data may be incomplete during editing
                this.localData.instantaneousPower = null;
                this.localData.rmsPower = null;
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

