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
    <!-- Three headline figures as small tiles: label on top, value and unit below, each
         tile edged in its signal's colour (current, voltage, power). -->
    <section class="wso-card">
        <h3 class="wso-header" data-op-title>Quick stats</h3>
        <div class="wso-body">
            <!-- processed.rms only exists once MKF has standardized the signal.
                 Render nothing until then — never a placeholder number. -->
            <DimensionReadOnly
                v-if="modelValue.current?.processed?.rms != null"
                class="wso-tile wso-tile-current"
                :name="'rms'"
                :replaceTitle="'Current RMS'"
                :unit="'A'"
                :unitMin="0.001"
                :unitMax="1000"
                :dataTestLabel="dataTestLabel + '-Rms'"
                :value="modelValue.current.processed.rms"
                :min="minimumMaximumScalePerParameter.current.min"
                :max="minimumMaximumScalePerParameter.current.max"
                :disableShortenLabels="true"
            />
            <DimensionReadOnly
                v-if="modelValue.voltage?.processed?.rms != null"
                class="wso-tile wso-tile-voltage"
                :name="'rms'"
                :replaceTitle="'Voltage RMS'"
                :unit="'V'"
                :unitMin="0.001"
                :unitMax="1000"
                :dataTestLabel="dataTestLabel + '-Rms'"
                :value="modelValue.voltage.processed.rms"
                :min="minimumMaximumScalePerParameter.voltage.min"
                :max="minimumMaximumScalePerParameter.voltage.max"
                :disableShortenLabels="true"
            />
            <DimensionReadOnly
                class="wso-tile wso-tile-power"
                :name="'rms'"
                :replaceTitle="'Power'"
                :unit="'W'"
                :dataTestLabel="dataTestLabel + '-Rms'"
                :value="localData.rmsPower"
                :min="minimumMaximumScalePerParameter.power.min"
                :max="minimumMaximumScalePerParameter.power.max"
                :disableShortenLabels="true"
            />
        </div>
    </section>
</template>

<style scoped>
.wso-card {
    margin: 0.5rem 0 0;
    padding: 0;
}
.wso-header {
    margin: 0 0 0.35rem;
    font-size: 0.86rem;
    font-weight: 650;
    line-height: 1.3;
    color: var(--op-text);
}
.wso-body {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
    gap: 0.5rem;
}

/* A tile: label on top, the value large in tabular figures with its unit beside it.
   The shared component sets sizes and colours inline, hence !important. */
.wso-body :deep(.wso-tile) {
    --wso-colour: var(--p-primary);
    min-width: 0;
    margin: 0 !important;
    padding: 0.45rem 0.7rem 0.5rem !important;
    background: rgba(var(--p-white-rgb), 0.05);
    border: 1px solid var(--op-rule);
    border-left: 2px solid var(--wso-colour);
    border-radius: 8px;
}
.wso-body :deep(.wso-tile-current) {
    --wso-colour: var(--p-warning);
}
.wso-body :deep(.wso-tile-voltage) {
    --wso-colour: var(--p-info);
}
.wso-body :deep(.dim-ro-row) {
    display: grid !important;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-areas: "label label" "value unit";
    align-items: baseline;
    column-gap: 0.3rem;
    row-gap: 0.1rem;
}
.wso-body :deep(.dim-ro-value-wrap),
.wso-body :deep(.dim-ro-value-row) {
    display: contents;
}
.wso-body :deep(.dim-ro-label) {
    grid-area: label;
    min-width: 0;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 0.78rem !important;
    font-weight: 500 !important;
    color: var(--op-muted) !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.wso-body :deep(.dim-ro-value) {
    grid-area: value;
    font-size: 1.15rem !important;
    font-weight: 650;
    line-height: 1.5rem !important;
    color: var(--op-text) !important;
    font-variant-numeric: tabular-nums;
}
.wso-body :deep(.dim-ro-unit),
.wso-body :deep(.dim-ro-unit .p-select-label) {
    grid-area: unit;
    justify-self: start;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 0.8rem !important;
    line-height: 1.5rem !important;
    color: var(--op-muted) !important;
}
</style>
