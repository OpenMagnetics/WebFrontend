<script setup>

import DimensionReadOnly from '/WebSharedComponents/DataInput/DimensionReadOnly.vue'
import { removeTrailingZeroes } from '/WebSharedComponents/assets/js/utils.js'
import { minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
import { toTitleCase, combinedStyle } from '/WebSharedComponents/assets/js/utils.js'
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
                if (!label || label == 'Custom') {
                    this.modelValue[this.signalDescriptor].processed.dutyCycle = processed.dutyCycle;
                    this.modelValue[this.signalDescriptor].processed.peakToPeak = processed.peakToPeak;
                    this.modelValue[this.signalDescriptor].processed.offset = processed.offset;
                    this.modelValue[this.signalDescriptor].processed.label = 'Custom';
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
        <div class="wo-header">
            <i :class="signalDescriptor === 'current' ? 'fa-solid fa-wave-square' : 'fa-solid fa-bolt'"></i>
            <span>Outputs · {{ signalDescriptor === 'current' ? 'Current' : 'Voltage' }}</span>
        </div>
        <div v-if="!isDataReady" class="wo-loading">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
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
.wo-card {
    background:
        linear-gradient(180deg,
            rgba(var(--bs-primary-rgb), 0.05) 0%,
            rgba(var(--bs-primary-rgb), 0.015) 100%),
        var(--bs-dark);
    border: 1px solid rgba(var(--bs-primary-rgb), 0.18);
    border-left: 3px solid rgba(var(--bs-primary-rgb), 0.7);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
    margin: 0.25rem 0;
}

.wo-card-current {
    border-left-color: rgba(177, 138, 234, 0.7);
}

.wo-card-voltage {
    border-left-color: rgba(0, 182, 255, 0.7);
}

.wo-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.7rem;
    background: rgba(var(--bs-primary-rgb), 0.08);
    border-bottom: 1px solid rgba(var(--bs-primary-rgb), 0.12);
    color: var(--bs-primary);
    font-weight: 600;
    font-size: 0.72rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
}

.wo-card-current .wo-header {
    color: #b18aea;
    background: rgba(177, 138, 234, 0.1);
    border-bottom-color: rgba(177, 138, 234, 0.18);
}

.wo-card-current .wo-header i {
    filter: drop-shadow(0 0 4px rgba(177, 138, 234, 0.5));
}

.wo-card-voltage .wo-header {
    color: #00b6ff;
    background: rgba(0, 182, 255, 0.1);
    border-bottom-color: rgba(0, 182, 255, 0.18);
}

.wo-card-voltage .wo-header i {
    filter: drop-shadow(0 0 4px rgba(0, 182, 255, 0.5));
}

.wo-header i {
    font-size: 0.78rem;
}

.wo-body {
    padding: 0.4rem 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
}

.wo-body :deep(> *) {
    padding: 0.25rem 0.4rem !important;
    border-radius: 6px;
    transition: background 0.15s;
}

.wo-body :deep(> *:hover) {
    background: rgba(255, 255, 255, 0.03);
}

.wo-body :deep(> * + *) {
    border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.wo-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1.2rem;
    color: rgba(242, 242, 242, 0.6);
    font-size: 0.85rem;
}

.wo-loading i {
    color: var(--bs-primary);
}
</style>
