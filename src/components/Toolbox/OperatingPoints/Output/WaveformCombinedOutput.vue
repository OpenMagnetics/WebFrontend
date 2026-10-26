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
                console.error('Power calculation failed:', error);
                this.localData.instantaneousPower = null;
                this.localData.rmsPower = null;
            }
        }
    }
}
</script>

<template>
    <div class="wco-card">
        <h3 class="wco-header" data-op-title>Power</h3>
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
/* A results cell on the sheet: a top rule and a title in the signal's colour. */
.wco-card {
    --op-cell-colour: var(--p-primary);
    margin: 0.5rem 0 0;
    padding: 0.6rem 0 0.4rem;
    border-top: 1px solid var(--op-rule);
}
.wco-header {
    margin: 0 0 0.3rem;
    font-size: 0.98rem;
    font-weight: 650;
    line-height: 1.3;
    color: var(--op-cell-colour);
}
.wco-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 1.5rem;
}
.wco-body :deep(.col-6) {
    width: auto !important;
    max-width: none !important;
    flex: none !important;
}
@container op-editor (max-width: 40rem) {
    .wco-body {
        grid-template-columns: minmax(0, 1fr);
    }
}

/* Read-only rows: label left in the muted label colour, value right. The
   shared component sets sizes and colours inline, hence !important. */
.wco-body :deep(.dim-ro-container) {
    padding: 0.28rem 0 !important;
    margin: 0 !important;
}
.wco-body :deep(.dim-ro-row) {
    display: flex !important;
    align-items: baseline !important;
    gap: 0.75rem;
}
.wco-body :deep(.dim-ro-label) {
    flex: 1 1 auto !important;
    min-width: 0;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 0.86rem !important;
    font-weight: 500 !important;
    color: var(--op-muted) !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.wco-body :deep(.dim-ro-value-wrap) {
    flex: 0 0 auto !important;
    width: auto !important;
    max-width: none !important;
    padding: 0 !important;
}
.wco-body :deep(.dim-ro-value),
.wco-body :deep(.dim-ro-alt-unit),
.wco-body :deep(.dim-ro-unit),
.wco-body :deep(.dim-ro-unit *) {
    font-size: 0.9rem !important;
    color: var(--op-text) !important;
    font-variant-numeric: tabular-nums;
}
</style>
