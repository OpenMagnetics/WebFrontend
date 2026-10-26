<script setup>

import DimensionReadOnly from 'WebSharedComponents/DataInput/DimensionReadOnly.vue'
import { removeTrailingZeroes } from 'WebSharedComponents/assets/js/utils.js'
import { minimumMaximumScalePerParameter } from 'WebSharedComponents/assets/js/defaults.js'
import { toTitleCase, combinedStyle, deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import { useTaskQueueStore } from '../../../../stores/taskQueue'
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
        const blockingRebounds = false;
        const taskQueueStore = useTaskQueueStore();

        const localData = {
            rmsPower: null,
        }
        return {
            blockingRebounds,
            localData,
            taskQueueStore,
            processingCurrent: false,
            processingVoltage: false,
            pendingProcess: { current: false, voltage: false },
        }
    },
    computed: {
    },
    watch: {
        'modelValue.current.waveform': {
            handler(newValue, oldValue) {
                this.scheduleProcess("current");
                this.scheduleProcess("voltage");
            },
            deep: true
        },
        'modelValue.current.processed': {
            handler(newValue, oldValue) {
                this.scheduleProcess("current");
                this.scheduleProcess("voltage");
            },
            deep: true
        },
        'modelValue.voltage.waveform': {
            handler(newValue, oldValue) {
                this.scheduleProcess("current");
                this.scheduleProcess("voltage");
            },
            deep: true
        },
        'modelValue.voltage.processed': {
            handler(newValue, oldValue) {
                this.scheduleProcess("current");
                this.scheduleProcess("voltage");
            },
            deep: true
        },
    },
    mounted () {
        this.process("current");
        this.process("voltage");
    },
    methods: {
        scheduleProcess(signalDescriptor) {
            // Debounce rapid calls to prevent overlapping worker requests
            if (signalDescriptor === "current") {
                if (this.processingCurrent) {
                    this.pendingProcess.current = true;
                    return;
                }
            } else {
                if (this.processingVoltage) {
                    this.pendingProcess.voltage = true;
                    return;
                }
            }
            this.process(signalDescriptor);
        },
        async process(signalDescriptor) {
            if (signalDescriptor === "current") {
                this.processingCurrent = true;
            } else {
                this.processingVoltage = true;
            }
            
            try {
                // Use deepCopy to avoid Vue reactive proxy serialization issues
                const waveform = deepCopy(this.modelValue[signalDescriptor].waveform);
                const frequency = this.modelValue.frequency;
                
                if (!waveform || !frequency) {
                    return;
                }
                
                if (this.modelValue[signalDescriptor].harmonics == null) {
                    this.modelValue[signalDescriptor].harmonics = await this.taskQueueStore.calculateHarmonics(waveform, frequency);
                }
                
                const harmonics = deepCopy(this.modelValue[signalDescriptor].harmonics);
                // Filter out null values from harmonics arrays
                if (harmonics.amplitudes) {
                    harmonics.amplitudes = harmonics.amplitudes.filter(v => v !== null);
                }
                if (harmonics.frequencies) {
                    harmonics.frequencies = harmonics.frequencies.filter(v => v !== null);
                }
                var result = await this.taskQueueStore.calculateProcessed(harmonics, waveform);
                
                if (typeof result === 'string' && result.startsWith("Exception")) {
                    console.error(result);
                }
                else {
                    // Ensure processed object exists
                    if (!this.modelValue[signalDescriptor].processed) {
                        this.modelValue[signalDescriptor].processed = {};
                    }
                    this.modelValue[signalDescriptor].processed.acEffectiveFrequency = result.acEffectiveFrequency;
                    this.modelValue[signalDescriptor].processed.effectiveFrequency = result.effectiveFrequency;
                    this.modelValue[signalDescriptor].processed.peak = result.peak;
                    this.modelValue[signalDescriptor].processed.rms = result.rms;
                    this.modelValue[signalDescriptor].processed.thd = result.thd;
                    const label = this.modelValue[signalDescriptor].processed.label;
                    if (!label || label == 'custom') {
                        this.modelValue[signalDescriptor].processed.dutyCycle = result.dutyCycle;
                        this.modelValue[signalDescriptor].processed.peakToPeak = result.peakToPeak;
                        this.modelValue[signalDescriptor].processed.offset = result.offset;
                        this.modelValue[signalDescriptor].processed.label = 'custom';
                    }
                    // Create a clean plain object copy for power calculation
                    const excitationCopy = JSON.parse(JSON.stringify(this.modelValue));
                    // Filter out null values from harmonics arrays in excitation copy
                    if (excitationCopy.current?.harmonics?.amplitudes) {
                        excitationCopy.current.harmonics.amplitudes = excitationCopy.current.harmonics.amplitudes.filter(v => v !== null);
                    }
                    if (excitationCopy.current?.harmonics?.frequencies) {
                        excitationCopy.current.harmonics.frequencies = excitationCopy.current.harmonics.frequencies.filter(v => v !== null);
                    }
                    if (excitationCopy.voltage?.harmonics?.amplitudes) {
                        excitationCopy.voltage.harmonics.amplitudes = excitationCopy.voltage.harmonics.amplitudes.filter(v => v !== null);
                    }
                    if (excitationCopy.voltage?.harmonics?.frequencies) {
                        excitationCopy.voltage.harmonics.frequencies = excitationCopy.voltage.harmonics.frequencies.filter(v => v !== null);
                    }
                    this.localData.rmsPower = await this.taskQueueStore.calculateRmsPower(excitationCopy);
                }
            } catch (error) {
                console.error('Error in process:', error);
            } finally {
                if (signalDescriptor === "current") {
                    this.processingCurrent = false;
                    if (this.pendingProcess.current) {
                        this.pendingProcess.current = false;
                        this.$nextTick(() => this.process("current"));
                    }
                } else {
                    this.processingVoltage = false;
                    if (this.pendingProcess.voltage) {
                        this.pendingProcess.voltage = false;
                        this.$nextTick(() => this.process("voltage"));
                    }
                }
            }
        }
    }
}
</script>

<template>
    <div class="wso-card">
        <h3 class="wso-header" data-op-title>Quick stats</h3>
        <div class="wso-body">
            <!-- processed.rms only exists once MKF has standardized the signal.
                 Render nothing until then — never a placeholder number. -->
            <DimensionReadOnly
                v-if="modelValue.current?.processed?.rms != null"
                :name="'rms'"
                :replaceTitle="'Current RMS:'"
                :unit="'A'"
                :unitMin="0.001"
                :unitMax="1000"
                :dataTestLabel="dataTestLabel + '-Rms'"
                :value="modelValue.current.processed.rms"
                :min="minimumMaximumScalePerParameter.current.min"
                :max="minimumMaximumScalePerParameter.current.max"
                :disableShortenLabels="true"
                :valueFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
            />
            <DimensionReadOnly
                v-if="modelValue.voltage?.processed?.rms != null"
                :name="'rms'"
                :replaceTitle="'Voltage RMS:'"
                :unit="'V'"
                :unitMin="0.001"
                :unitMax="1000"
                :dataTestLabel="dataTestLabel + '-Rms'"
                :value="modelValue.voltage.processed.rms"
                :min="minimumMaximumScalePerParameter.voltage.min"
                :max="minimumMaximumScalePerParameter.voltage.max"
                :disableShortenLabels="true"
                :valueFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
            />
            <DimensionReadOnly
                :name="'rms'"
                :replaceTitle="'Power:'"
                :unit="'W'"
                :dataTestLabel="dataTestLabel + '-Rms'"
                :value="localData.rmsPower"
                :min="minimumMaximumScalePerParameter.power.min"
                :max="minimumMaximumScalePerParameter.power.max"
                :disableShortenLabels="true"
                :valueFontSize="$styleStore.operatingPoints.inputTitleFontSize"
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
.wso-card {
    --op-cell-colour: var(--p-primary);
    margin: 0.5rem 0 0;
    padding: 0.6rem 0 0.4rem;
    border-top: 1px solid var(--op-rule);
}
.wso-header {
    margin: 0 0 0.3rem;
    font-size: 0.98rem;
    font-weight: 650;
    line-height: 1.3;
    color: var(--op-cell-colour);
}

/* Read-only rows: label left in the muted label colour, value right. The
   shared component sets sizes and colours inline, hence !important. */
.wso-body :deep(.dim-ro-container) {
    padding: 0.28rem 0 !important;
    margin: 0 !important;
}
.wso-body :deep(.dim-ro-row) {
    display: flex !important;
    align-items: baseline !important;
    gap: 0.75rem;
}
.wso-body :deep(.dim-ro-label) {
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
.wso-body :deep(.dim-ro-value-wrap) {
    flex: 0 0 auto !important;
    width: auto !important;
    max-width: none !important;
    padding: 0 !important;
}
.wso-body :deep(.dim-ro-value),
.wso-body :deep(.dim-ro-alt-unit),
.wso-body :deep(.dim-ro-unit),
.wso-body :deep(.dim-ro-unit *) {
    font-size: 0.9rem !important;
    color: var(--op-text) !important;
    font-variant-numeric: tabular-nums;
}
.wso-body {
    max-width: 24rem;
}
</style>
