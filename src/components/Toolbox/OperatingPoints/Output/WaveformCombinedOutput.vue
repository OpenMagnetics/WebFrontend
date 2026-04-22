<script setup>
import { useTaskQueueStore } from '../../../../stores/taskQueue'
import DimensionReadOnly from 'WebSharedComponents/DataInput/DimensionReadOnly.vue'
import { removeTrailingZeroes, combinedStyle } from 'WebSharedComponents/assets/js/utils.js'
import { minimumMaximumScalePerParameter } from 'WebSharedComponents/assets/js/defaults.js'
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
    <div class="wco-card">
        <div class="wco-header">
            <i class="bi bi-plug-fill"></i>
            <span>Power</span>
        </div>
        <div class="wco-body">
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

<style scoped>
.wco-card {
    background:
        linear-gradient(180deg,
            rgba(var(--bs-success-rgb), 0.06) 0%,
            rgba(var(--bs-success-rgb), 0.02) 100%),
        var(--bs-dark);
    border: 1px solid rgba(var(--bs-success-rgb), 0.18);
    border-left: 3px solid rgba(var(--bs-success-rgb), 0.7);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
    margin: 0.4rem 0 0.25rem 0;
}

.wco-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.7rem;
    background: rgba(var(--bs-success-rgb), 0.1);
    border-bottom: 1px solid rgba(var(--bs-success-rgb), 0.18);
    color: var(--bs-success);
    font-weight: 600;
    font-size: 0.72rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
}

.wco-header i {
    font-size: 0.85rem;
    filter: drop-shadow(0 0 4px rgba(var(--bs-success-rgb), 0.5));
}

.wco-body {
    display: flex;
    padding: 0.45rem 0.6rem;
    gap: 0.4rem;
}

.wco-body :deep(.col-6) {
    flex: 1;
    max-width: 50%;
    padding: 0.25rem 0.4rem !important;
    border-radius: 6px;
    transition: background 0.15s;
}

.wco-body :deep(.col-6:hover) {
    background: rgba(255, 255, 255, 0.03);
}
</style>

