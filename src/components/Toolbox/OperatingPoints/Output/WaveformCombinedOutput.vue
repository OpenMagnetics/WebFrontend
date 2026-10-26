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
    // Power follows the waveforms, not every field of the excitation: a frequency edit is
    // written into the operating point before the waveforms are rebuilt for it, and MKF
    // rejects a waveform whose time axis spans another period. The waveforms are rebuilt
    // (and written together) after every frequency or duty cycle edit, so watching them
    // recomputes the power once the pair is consistent. Watching the excitation itself
    // covers a switch to another winding or operating point.
    watch: {
        'modelValue'() {
            this.process();
        },
        'modelValue.current.waveform': {
          handler(newValue, oldValue) {
            this.process();
          },
          deep: true
        },
        'modelValue.voltage.waveform': {
          handler(newValue, oldValue) {
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
    <!-- Power, from the current and voltage together: one strip under the two readouts. -->
    <section class="wco-card">
        <h3 class="wco-header" data-op-title>
            <span class="wco-swatch" aria-hidden="true"></span>Power
        </h3>
        <div class="wco-body">
            <DimensionReadOnly
                :name="'instantaneousPower'"
                :replaceTitle="'Instantaneous'"
                :unit="'W'"
                :dataTestLabel="dataTestLabel + '-InstantaneousPower'"
                :value="localData.instantaneousPower"
                :min="minimumMaximumScalePerParameter.power.min"
                :max="minimumMaximumScalePerParameter.power.max"
                :disableShortenLabels="true"
            />
            <DimensionReadOnly
                :name="'rmsPower'"
                :replaceTitle="'RMS'"
                :unit="'W'"
                :dataTestLabel="dataTestLabel + '-rmsPower'"
                :value="localData.rmsPower"
                :min="minimumMaximumScalePerParameter.power.min"
                :max="minimumMaximumScalePerParameter.power.max"
                :disableShortenLabels="true"
            />
        </div>
    </section>
</template>

<style scoped>
/* A strip: the title, then the two power figures inline, each label | value | unit. */
.wco-card {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.25rem 1.25rem;
    margin: 0.5rem 0 0;
    padding: 0.45rem 0.75rem;
    background: rgba(var(--p-white-rgb), 0.05);
    border: 1px solid var(--op-rule);
    border-left: 2px solid var(--p-primary);
    border-radius: 8px;
}
.wco-header {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0;
    font-size: 0.86rem;
    font-weight: 650;
    line-height: 1.3;
    color: var(--op-text);
}
.wco-swatch {
    flex: 0 0 auto;
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
    background: var(--p-primary);
}
.wco-body {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    gap: 0.1rem 1.5rem;
    min-width: 0;
}

/* The shared component sets sizes and colours inline, hence !important. */
.wco-body :deep(.dim-ro-container) {
    width: auto !important;
    margin: 0 !important;
    padding: 0 !important;
}
.wco-body :deep(.dim-ro-row) {
    display: flex !important;
    align-items: baseline;
    gap: 0.4rem;
}
.wco-body :deep(.dim-ro-value-wrap),
.wco-body :deep(.dim-ro-value-row) {
    display: contents;
}
.wco-body :deep(.dim-ro-label) {
    flex: 0 0 auto !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 0.82rem !important;
    font-weight: 500 !important;
    color: var(--op-muted) !important;
    white-space: nowrap;
}
.wco-body :deep(.dim-ro-value) {
    font-size: 0.92rem !important;
    font-weight: 600;
    line-height: 1.25rem !important;
    color: var(--op-text) !important;
    font-variant-numeric: tabular-nums;
}
.wco-body :deep(.dim-ro-unit),
.wco-body :deep(.dim-ro-unit .p-select-label) {
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 0.78rem !important;
    line-height: 1.25rem !important;
    color: var(--op-muted) !important;
}
</style>
