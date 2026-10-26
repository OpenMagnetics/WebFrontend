<script setup>

import DimensionReadOnly from 'WebSharedComponents/DataInput/DimensionReadOnly.vue'
import { removeTrailingZeroes } from 'WebSharedComponents/assets/js/utils.js'
import { minimumMaximumScalePerParameter } from 'WebSharedComponents/assets/js/defaults.js'
import { toTitleCase, combinedStyle } from 'WebSharedComponents/assets/js/utils.js'
import { useTaskQueueStore } from '../../../../stores/taskQueue'
</script>

<script>
export default {
    props: {
        modelValue:{
            type: Object,
            required: true
        },
        signalDescriptor: {
            type: String,
            required: false,
            default: "current",
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const blockingRebounds = false;
        const taskQueueStore = useTaskQueueStore();

        return {
            blockingRebounds,
            taskQueueStore,
        }
    },
    computed: {
        isDataReady() {
            return this.modelValue?.[this.signalDescriptor]?.processed != null;
        }
    },
    watch: {
        'modelValue.current.waveform': {
            handler(newValue, oldValue) {
                if (this.signalDescriptor == 'current')
                    this.process();
            },
            deep: true
        },
        'modelValue.current.processed': {
            handler(newValue, oldValue) {
                if (this.signalDescriptor == 'current')
                    this.process();
            },
            deep: true
        },
        'modelValue.voltage.waveform': {
            handler(newValue, oldValue) {
                if (this.signalDescriptor == 'voltage')
                    this.process();
            },
            deep: true
        },
        'modelValue.voltage.processed': {
            handler(newValue, oldValue) {
                if (this.signalDescriptor == 'voltage')
                    this.process();
            },
            deep: true
        },
    },
    mounted () {
        this.process();
    },
    methods: {
        async process() {
            try {
                // Guard against missing data structure
                if (!this.modelValue?.[this.signalDescriptor]) {
                    console.warn(`[WaveformOutput] Missing data for ${this.signalDescriptor}`);
                    return;
                }
                if (this.modelValue[this.signalDescriptor].harmonics == null) {
                    this.modelValue[this.signalDescriptor].harmonics = await this.taskQueueStore.calculateHarmonics(this.modelValue[this.signalDescriptor].waveform, this.modelValue.frequency);
                }
                // Guard against null harmonics or waveform before calling calculateProcessed
                if (!this.modelValue[this.signalDescriptor].harmonics || !this.modelValue[this.signalDescriptor].waveform) {
                    console.warn(`[WaveformOutput] Cannot calculate processed: missing harmonics or waveform for ${this.signalDescriptor}`);
                    return;
                }
                var processed = await this.taskQueueStore.calculateProcessed(this.modelValue[this.signalDescriptor].harmonics, this.modelValue[this.signalDescriptor].waveform);
                // Ensure processed object exists
                if (!this.modelValue[this.signalDescriptor].processed) {
                    this.modelValue[this.signalDescriptor].processed = {};
                }
                this.modelValue[this.signalDescriptor].processed.acEffectiveFrequency = processed.acEffectiveFrequency;
                this.modelValue[this.signalDescriptor].processed.effectiveFrequency = processed.effectiveFrequency;
                this.modelValue[this.signalDescriptor].processed.peak = processed.peak;
                this.modelValue[this.signalDescriptor].processed.rms = processed.rms;
                this.modelValue[this.signalDescriptor].processed.thd = processed.thd;
                const label = this.modelValue[this.signalDescriptor].processed.label;
                if (!label || label == 'custom') {
                    this.modelValue[this.signalDescriptor].processed.dutyCycle = processed.dutyCycle;
                    this.modelValue[this.signalDescriptor].processed.peakToPeak = processed.peakToPeak;
                    this.modelValue[this.signalDescriptor].processed.offset = processed.offset;
                    this.modelValue[this.signalDescriptor].processed.label = 'custom';
                }
            } catch (error) {
                console.error('Error in process:', error);
            }
        }
    }
}
</script>

<template>
    <div class="wo-card" :class="signalDescriptor === 'current' ? 'wo-card-current' : 'wo-card-voltage'">
        <h3 class="wo-header" data-op-title>{{ signalDescriptor === 'current' ? 'Current' : 'Voltage' }} outputs</h3>
        <div v-if="!isDataReady" class="wo-loading">
            <i class="pi pi-refresh fa-spin fa-spin"></i>
            <span>Calculating…</span>
        </div>
        <div v-else class="wo-body">
        <DimensionReadOnly 
            :name="'dutyCycle'"
            :unit="null"
            :altUnit="'%'"
            :visualScale="100"
            :dataTestLabel="dataTestLabel + '-DutyCycle'"
            :value="removeTrailingZeroes(modelValue[signalDescriptor].processed.dutyCycle)"
            :min="minimumMaximumScalePerParameter.percentage.min"
            :max="minimumMaximumScalePerParameter.percentage.max"
            :disableShortenLabels="true"
            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
            :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
            :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
            :textColor="$styleStore.operatingPoints.inputTextColor"
        />
        <DimensionReadOnly 
            :name="'peakToPeak'"
            :unit="signalDescriptor == 'current'? 'A' : 'V'"
            :unitMin="0.001"
            :unitMax="1000"
            :dataTestLabel="dataTestLabel + '-PeakToPeak'"
            :value="modelValue[signalDescriptor].processed.peakToPeak"
            :min="minimumMaximumScalePerParameter[signalDescriptor].min"
            :max="minimumMaximumScalePerParameter[signalDescriptor].max"
            :disableShortenLabels="true"
            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
            :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
            :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
            :textColor="$styleStore.operatingPoints.inputTextColor"
        />
        <DimensionReadOnly 
            :name="'offset'"
            :unit="signalDescriptor == 'current'? 'A' : 'V'"
            :unitMin="0.001"
            :unitMax="1000"
            :dataTestLabel="dataTestLabel + '-Offset'"
            :value="modelValue[signalDescriptor].processed.offset"
            :min="minimumMaximumScalePerParameter[signalDescriptor].min"
            :max="minimumMaximumScalePerParameter[signalDescriptor].max"
            :disableShortenLabels="true"
            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
            :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
            :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
            :textColor="$styleStore.operatingPoints.inputTextColor"
        />
        <DimensionReadOnly 
            :name="'effectiveFrequency'"
            :unit="'Hz'"
            :dataTestLabel="dataTestLabel + '-EffectiveFrequency'"
            :value="modelValue[signalDescriptor].processed.effectiveFrequency"
            :min="minimumMaximumScalePerParameter.frequency.min"
            :max="minimumMaximumScalePerParameter.frequency.max"
            :disableShortenLabels="true"
            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
            :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
            :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
            :textColor="$styleStore.operatingPoints.inputTextColor"
        />
        <DimensionReadOnly 
            :name="'peak'"
            :unit="signalDescriptor == 'current'? 'A' : 'V'"
            :unitMin="0.001"
            :unitMax="1000"
            :dataTestLabel="dataTestLabel + '-Peak'"
            :value="modelValue[signalDescriptor].processed.peak"
            :min="minimumMaximumScalePerParameter[signalDescriptor].min"
            :max="minimumMaximumScalePerParameter[signalDescriptor].max"
            :disableShortenLabels="true"
            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
            :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
            :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
            :textColor="$styleStore.operatingPoints.inputTextColor"
        />
        <DimensionReadOnly 
            :name="'rms'"
            :unit="signalDescriptor == 'current'? 'A' : 'V'"
            :unitMin="0.001"
            :unitMax="1000"
            :dataTestLabel="dataTestLabel + '-Rms'"
            :value="modelValue[signalDescriptor].processed.rms"
            :min="minimumMaximumScalePerParameter[signalDescriptor].min"
            :max="minimumMaximumScalePerParameter[signalDescriptor].max"
            :disableShortenLabels="true"
            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
            :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
            :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
            :textColor="$styleStore.operatingPoints.inputTextColor"
        />
        <DimensionReadOnly 
            :name="'thd'"
            :unit="null"
            :altUnit="'%'"
            :visualScale="100"
            :dataTestLabel="dataTestLabel + '-Thd'"
            :value="modelValue[signalDescriptor].processed.thd"
            :min="minimumMaximumScalePerParameter.percentage.min"
            :max="minimumMaximumScalePerParameter.percentage.max"
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
.wo-card {
    --op-cell-colour: var(--p-primary);
    margin: 0.5rem 0 0;
    padding: 0.6rem 0 0.4rem;
    border-top: 1px solid var(--op-rule);
}
.wo-header {
    margin: 0 0 0.3rem;
    font-size: 0.98rem;
    font-weight: 650;
    line-height: 1.3;
    color: var(--op-cell-colour);
}
.wo-card-current {
    --op-cell-colour: var(--p-warning);
}
.wo-card-voltage {
    --op-cell-colour: var(--p-info);
}

/* Read-only rows: label left in the muted label colour, value right. The
   shared component sets sizes and colours inline, hence !important. */
.wo-body :deep(.dim-ro-container) {
    padding: 0.28rem 0 !important;
    margin: 0 !important;
}
.wo-body :deep(.dim-ro-row) {
    display: flex !important;
    align-items: baseline !important;
    gap: 0.75rem;
}
.wo-body :deep(.dim-ro-label) {
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
.wo-body :deep(.dim-ro-value-wrap) {
    flex: 0 0 auto !important;
    width: auto !important;
    max-width: none !important;
    padding: 0 !important;
}
.wo-body :deep(.dim-ro-value),
.wo-body :deep(.dim-ro-alt-unit),
.wo-body :deep(.dim-ro-unit),
.wo-body :deep(.dim-ro-unit *) {
    font-size: 0.9rem !important;
    color: var(--op-text) !important;
    font-variant-numeric: tabular-nums;
}

.wo-loading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0;
    color: var(--op-muted);
    font-size: 0.86rem;
}
.wo-loading i {
    color: var(--p-primary);
}
</style>
