<script>
import LineVisualizer from 'WebSharedComponents/Common/LineVisualizer.vue'
import { useConverterWaveforms } from '../../composables/useConverterWaveforms.js'

export default {
    name: 'ConverterWaveformVisualizer',
    components: { LineVisualizer },
    props: {
        magneticWaveforms: {
            type: Array,
            default: () => []
        },
        converterWaveforms: {
            type: Array,
            default: () => []
        },
        viewMode: {
            type: String,
            default: 'magnetic',
            validator: (v) => ['magnetic', 'converter'].includes(v)
        },
        forceUpdate: {
            type: Number,
            default: 0
        },
        chartStyle: {
            type: String,
            default: 'height: 140px'
        },
        showGrid: {
            type: Boolean,
            default: false
        },
        showAxisLines: {
            type: Boolean,
            default: false
        },
        showAxisUnitLabels: {
            type: Boolean,
            default: false
        },
        showPoints: {
            type: Boolean,
            default: false
        },
        toolbox: {
            type: Boolean,
            default: false
        },
        clipVoltage: {
            type: Boolean,
            default: true
        },
        /**
         * True when converter-node overlays EXIST but have not been fetched yet (KH ABT #905): the
         * simulation carried a TAS and `component_waveforms` can still be run on demand. Without this
         * the toggle was gated purely on `converterWaveforms.length`, which the simulate path always
         * left empty — so the Converter view was unreachable for every topology.
         */
        converterAvailable: {
            type: Boolean,
            default: false
        },
        converterLoading: {
            type: Boolean,
            default: false
        },
        converterError: {
            type: String,
            default: ''
        }
    },
    emits: ['update:viewMode'],
    
    data() {
        return {
            // Composable methods will be bound here
        };
    },
    
    created() {
        // Get composable methods
        const styleStore = this.$styleStore || {};
        const composable = useConverterWaveforms(styleStore);
        
        // Store composable methods in data so they're available in template and methods
        this._composable = composable;
    },
    

    
    computed: {
        currentWaveforms() {
            return this.viewMode === 'magnetic' 
                ? this.magneticWaveforms 
                : this.converterWaveforms;
        },
        
        hasWaveforms() {
            return this.currentWaveforms?.length > 0;
        },
        
        bgColor() {
            return this.$styleStore?.operatingPoints?.graphBgColor?.['background-color'] || 'transparent';
        },
        
        textColor() {
            return this.$styleStore?.wizard?.inputTextColor?.color || 'var(--p-white)';
        },
    },
    
    methods: {
        getTimeAxisOptions() {
            return this._composable.getTimeAxisOptions();
        },
        
        getPairedWaveformDataForVisualizer(waveforms, opIndex, pairIndex) {
            const voltageColor = this.$styleStore?.operatingPoints?.voltageGraph?.color;
            const currentColor = this.$styleStore?.operatingPoints?.currentGraph?.color;
            return this._composable.getPairedWaveformDataForVisualizer(
                waveforms, 
                opIndex, 
                pairIndex,
                { 
                    clipVoltage: this.clipVoltage,
                    voltageColor: voltageColor,
                    currentColor: currentColor
                }
            );
        },
        
        getPairedWaveformAxisLimits(waveforms, opIndex, pairIndex) {
            return this._composable.getPairedWaveformAxisLimits(waveforms, opIndex, pairIndex);
        },
        
        getPairedWaveformTitle(waveforms, opIndex, pairIndex) {
            return this._composable.getPairedWaveformTitle(waveforms, opIndex, pairIndex);
        },
        
        getPairedWaveformsList(waveforms, opIndex) {
            return this._composable.getPairedWaveformsList(waveforms, opIndex);
        },
        
        getOperatingPointName(opIndex) {
            const op = this.currentWaveforms[opIndex];
            return op?.operatingPointName || `Operating Point ${opIndex + 1}`;
        },
        
        getWaveformDataForPair(opIndex, pairIndex) {
            return this.getPairedWaveformDataForVisualizer(
                this.currentWaveforms, 
                opIndex, 
                pairIndex
            );
        },
        
        getAxisLimitsForPair(opIndex, pairIndex) {
            return this.getPairedWaveformAxisLimits(this.currentWaveforms, opIndex, pairIndex);
        },
        
        getTitleForPair(opIndex, pairIndex) {
            return this.getPairedWaveformTitle(this.currentWaveforms, opIndex, pairIndex);
        },
        
        hasWaveformData(opIndex, pairIndex) {
            return this.getWaveformDataForPair(opIndex, pairIndex).length > 0;
        },
        
        getPairIndices(opIndex) {
            const pairs = this.getPairedWaveformsList(this.currentWaveforms, opIndex);
            const count = pairs.length;
            return Array.from({ length: count }, (_, i) => i);
        },
        
        setViewMode(mode) {
            this.$emit('update:viewMode', mode);
        },
        
        getButtonStyle(mode) {
            const primaryColor = this.$styleStore?.theme?.primary;
            const isActive = this.viewMode === mode;
            
            if (isActive) {
                return {
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                    color: 'var(--p-white)'
                };
            } else {
                return {
                    color: primaryColor,
                    borderColor: primaryColor,
                    backgroundColor: 'transparent'
                };
            }
        }
    }
}
</script>

<template>
    <div class="waveform-visualizer">
        <!-- View Mode Toggle -->
        <div v-if="magneticWaveforms?.length > 0 && (converterWaveforms?.length > 0 || converterAvailable)"
             class="view-toggle mb-2 d-flex justify-content-center">
            <div class="btn-group btn-group-sm">
                <button 
                    :class="['btn', viewMode === 'magnetic' ? 'btn-primary' : 'btn-outline-primary']"
                    @click="setViewMode('magnetic')"
                    :style="getButtonStyle('magnetic')"
                >
                    <i class="pi pi-cog mr-1"></i>Magnetic
                </button>
                <button 
                    :class="['btn', viewMode === 'converter' ? 'btn-primary' : 'btn-outline-primary']"
                    @click="setViewMode('converter')"
                    :style="getButtonStyle('converter')"
                >
                    <i class="pi pi-microchip mr-1"></i>Converter
                </button>
            </div>
        </div>

        <!-- Converter-node overlays are fetched on demand; show progress / failure, never a blank panel -->
        <div v-if="viewMode === 'converter' && converterLoading" class="converter-state">
            <i class="pi pi-refresh fa-spin mr-1"></i>Simulating converter nodes…
        </div>
        <div v-else-if="viewMode === 'converter' && converterError" class="converter-state converter-state-error">
            <i class="pi pi-exclamation-circle mr-1"></i>{{ converterError }}
        </div>

        <!-- Waveforms -->
        <div v-else-if="hasWaveforms" class="waveforms-container">
            <div v-for="(op, opIndex) in currentWaveforms" :key="`op-${opIndex}-${forceUpdate}`">
                <div class="operating-point-label">{{ getOperatingPointName(opIndex) }}</div>
                
                <div v-for="pairIndex in getPairIndices(opIndex)" :key="`pair-${opIndex}-${pairIndex}-${forceUpdate}`" 
                     class="waveform-item">
                    <LineVisualizer
                        v-if="hasWaveformData(opIndex, pairIndex)"
                        :data="getWaveformDataForPair(opIndex, pairIndex)"
                        :xAxisOptions="getTimeAxisOptions()"
                        :title="getTitleForPair(opIndex, pairIndex)"
                        :titleFontSize="14"
                        :axisLabelFontSize="10"
                        :chartPaddings="{top: 50, left: 45, right: 45, bottom: 25}"
                        :bgColor="bgColor"
                        :lineColor="$styleStore?.theme?.primary"
                        :textColor="textColor"
                        :chartStyle="chartStyle"
                        :toolbox="toolbox"
                        :showPoints="showPoints"
                        :showGrid="showGrid"
                        :showAxisLines="showAxisLines"
                        :showAxisUnitLabels="showAxisUnitLabels"
                        :forceAxisMin="getAxisLimitsForPair(opIndex, pairIndex).min"
                        :forceAxisMax="getAxisLimitsForPair(opIndex, pairIndex).max"
                        :forceAxisIndependentLimits="true"
                        :forceUpdate="forceUpdate"
                        :showArea="false"
                    />
                </div>
            </div>
        </div>
        
        <!-- Empty State -->
        <div v-else class="empty-state text-center py-4">
            <i class="pi pi-volume-up empty-icon mb-2"></i>
            <p class="empty-text mb-0">
                Click <strong>Analytical</strong> or <strong>Simulated</strong> to generate waveforms
            </p>
        </div>
    </div>
</template>

<style scoped>
.waveform-visualizer {
    width: 100%;
}

.view-toggle .btn-primary {
    background-color: var(--om-primary);
    border-color: var(--om-primary);
}

.view-toggle .btn-outline-primary {
    transition: all 0.2s ease;
}

.view-toggle .btn-outline-primary:hover {
    background-color: var(--om-primary) !important;
    border-color: var(--om-primary) !important;
    color: var(--p-white) !important;
}

.operating-point-label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--om-primary);
    padding: 4px 8px;
    background: rgb(from var(--om-primary) r g b / 0.1);
    border-radius: 4px;
    margin-bottom: 8px;
}

.waveform-item {
    margin-bottom: 12px;
}

.waveform-item:last-child {
    margin-bottom: 0;
}

.empty-state {
    color: var(--p-secondary);
}

.empty-icon {
    font-size: 2rem;
    opacity: 0.5;
}

.empty-text {
    font-size: 0.9rem;
}

.converter-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 0.75rem;
    font-size: 0.875rem;
    color: var(--p-secondary);
    text-align: center;
}

.converter-state-error {
    color: var(--p-red-500, var(--p-danger));
}
</style>
