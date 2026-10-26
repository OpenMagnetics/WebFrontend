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
    <!-- One signal's figures as an instrument readout: label | value | unit, one row per
         figure. Current and voltage list the same figures in the same order, so side by side
         (.op-outputs-pair) their rows line up for comparison. -->
    <section class="wo-card" :class="signalDescriptor === 'current' ? 'wo-card-current' : 'wo-card-voltage'">
        <h3 class="wo-header" data-op-title>
            <span class="wo-swatch" aria-hidden="true"></span>{{ signalDescriptor === 'current' ? 'Current' : 'Voltage' }}
        </h3>
        <div v-if="!isDataReady" class="wo-loading">
            <i class="pi pi-refresh fa-spin fa-spin"></i>
            <span>Calculating…</span>
        </div>
        <div v-else class="wo-body">
            <DimensionReadOnly
                :name="'dutyCycle'"
                :replaceTitle="'Duty cycle'"
                :unit="null"
                :altUnit="'%'"
                :visualScale="100"
                :dataTestLabel="dataTestLabel + '-DutyCycle'"
                :value="removeTrailingZeroes(modelValue[signalDescriptor].processed.dutyCycle)"
                :min="minimumMaximumScalePerParameter.percentage.min"
                :max="minimumMaximumScalePerParameter.percentage.max"
                :disableShortenLabels="true"
                :useTitleCase="false"
            />
            <DimensionReadOnly
                :name="'peakToPeak'"
                :replaceTitle="'Peak to peak'"
                :unit="signalDescriptor == 'current'? 'A' : 'V'"
                :unitMin="0.001"
                :unitMax="1000"
                :dataTestLabel="dataTestLabel + '-PeakToPeak'"
                :value="modelValue[signalDescriptor].processed.peakToPeak"
                :min="minimumMaximumScalePerParameter[signalDescriptor].min"
                :max="minimumMaximumScalePerParameter[signalDescriptor].max"
                :disableShortenLabels="true"
                :useTitleCase="false"
            />
            <DimensionReadOnly
                :name="'offset'"
                :replaceTitle="'Offset'"
                :unit="signalDescriptor == 'current'? 'A' : 'V'"
                :unitMin="0.001"
                :unitMax="1000"
                :dataTestLabel="dataTestLabel + '-Offset'"
                :value="modelValue[signalDescriptor].processed.offset"
                :min="minimumMaximumScalePerParameter[signalDescriptor].min"
                :max="minimumMaximumScalePerParameter[signalDescriptor].max"
                :disableShortenLabels="true"
                :useTitleCase="false"
            />
            <DimensionReadOnly
                :name="'effectiveFrequency'"
                :replaceTitle="'Effective frequency'"
                :unit="'Hz'"
                :dataTestLabel="dataTestLabel + '-EffectiveFrequency'"
                :value="modelValue[signalDescriptor].processed.effectiveFrequency"
                :min="minimumMaximumScalePerParameter.frequency.min"
                :max="minimumMaximumScalePerParameter.frequency.max"
                :disableShortenLabels="true"
                :useTitleCase="false"
            />
            <DimensionReadOnly
                :name="'peak'"
                :replaceTitle="'Peak'"
                :unit="signalDescriptor == 'current'? 'A' : 'V'"
                :unitMin="0.001"
                :unitMax="1000"
                :dataTestLabel="dataTestLabel + '-Peak'"
                :value="modelValue[signalDescriptor].processed.peak"
                :min="minimumMaximumScalePerParameter[signalDescriptor].min"
                :max="minimumMaximumScalePerParameter[signalDescriptor].max"
                :disableShortenLabels="true"
                :useTitleCase="false"
            />
            <DimensionReadOnly
                :name="'rms'"
                :replaceTitle="'RMS'"
                :unit="signalDescriptor == 'current'? 'A' : 'V'"
                :unitMin="0.001"
                :unitMax="1000"
                :dataTestLabel="dataTestLabel + '-Rms'"
                :value="modelValue[signalDescriptor].processed.rms"
                :min="minimumMaximumScalePerParameter[signalDescriptor].min"
                :max="minimumMaximumScalePerParameter[signalDescriptor].max"
                :disableShortenLabels="true"
                :useTitleCase="false"
            />
            <DimensionReadOnly
                :name="'thd'"
                :replaceTitle="'THD'"
                :unit="null"
                :altUnit="'%'"
                :visualScale="100"
                :dataTestLabel="dataTestLabel + '-Thd'"
                :value="modelValue[signalDescriptor].processed.thd"
                :min="minimumMaximumScalePerParameter.percentage.min"
                :max="minimumMaximumScalePerParameter.percentage.max"
                :disableShortenLabels="true"
                :useTitleCase="false"
            />
        </div>
    </section>
</template>

<style scoped>
/* A readout panel: a quiet surface, the signal's colour as a slim top edge and a swatch
   matching the chart legend. */
.wo-card {
    --op-cell-colour: var(--p-primary);
    min-width: 0;
    margin: 0.5rem 0 0;
    padding: 0.5rem 0.75rem 0.35rem;
    background: rgba(var(--p-white-rgb), 0.05);
    border: 1px solid var(--op-rule);
    border-top: 2px solid var(--op-cell-colour);
    border-radius: 8px;
}
.wo-card-current {
    --op-cell-colour: var(--p-warning);
}
.wo-card-voltage {
    --op-cell-colour: var(--p-info);
}
.wo-header {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0 0 0.2rem;
    font-size: 0.86rem;
    font-weight: 650;
    line-height: 1.3;
    color: var(--op-text);
}
.wo-swatch {
    flex: 0 0 auto;
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
    background: var(--op-cell-colour);
}

/* Rows: label | value (right-aligned, tabular figures) | unit (fixed column), so every
   value ends on the same line whatever its unit. The shared component sets sizes and
   colours inline, hence !important. */
.wo-body :deep(.dim-ro-container) {
    padding: 0 !important;
    margin: 0 !important;
}
.wo-body :deep(.dim-ro-container + .dim-ro-container) {
    border-top: 1px solid var(--op-rule);
}
.wo-body :deep(.dim-ro-row) {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto 2.3rem;
    align-items: baseline;
    column-gap: 0.4rem;
    padding: 0.28rem 0;
}
.wo-body :deep(.dim-ro-value-wrap),
.wo-body :deep(.dim-ro-value-row) {
    display: contents;
}
.wo-body :deep(.dim-ro-label) {
    min-width: 0;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 0.82rem !important;
    font-weight: 500 !important;
    color: var(--op-muted) !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.wo-body :deep(.dim-ro-value) {
    font-size: 0.92rem !important;
    font-weight: 600;
    line-height: 1.25rem !important;
    color: var(--op-text) !important;
    text-align: right;
    font-variant-numeric: tabular-nums;
}
.wo-body :deep(.dim-ro-alt-unit),
.wo-body :deep(.dim-ro-unit),
.wo-body :deep(.dim-ro-unit .p-select-label) {
    justify-self: start;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 0.78rem !important;
    line-height: 1.25rem !important;
    color: var(--op-muted) !important;
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
