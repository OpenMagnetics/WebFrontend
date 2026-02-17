<script>
import LineVisualizer from '/WebSharedComponents/Common/LineVisualizer.vue'
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
            return this.$styleStore?.theme?.light || 'transparent';
        },
        
        textColor() {
            return this.$styleStore?.wizard?.inputTextColor?.color || '#ffffff';
        },
    },
    
    methods: {
        getTimeAxisOptions() {
            return this._composable.getTimeAxisOptions();
        },
        
        getPairedWaveformDataForVisualizer(waveforms, opIndex, pairIndex) {
            const voltageColor = this.$styleStore?.operatingPoints?.voltageGraph?.color || '#b18aea';
            const currentColor = this.$styleStore?.operatingPoints?.currentGraph?.color || '#4CAF50';
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
            const primaryColor = this.$styleStore?.theme?.primary || '#b18aea';
            const isActive = this.viewMode === mode;
            
            if (isActive) {
                return {
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                    color: '#ffffff'
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
        <div v-if="magneticWaveforms?.length > 0 && converterWaveforms?.length > 0"
             class="view-toggle mb-2 d-flex justify-content-center">
            <div class="btn-group btn-group-sm">
                <button 
                    :class="['btn', viewMode === 'magnetic' ? 'btn-primary' : 'btn-outline-primary']"
                    @click="setViewMode('magnetic')"
                    :style="getButtonStyle('magnetic')"
                >
                    <i class="fa-solid fa-magnet me-1"></i>Magnetic
                </button>
                <button 
                    :class="['btn', viewMode === 'converter' ? 'btn-primary' : 'btn-outline-primary']"
                    @click="setViewMode('converter')"
                    :style="getButtonStyle('converter')"
                >
                    <i class="fa-solid fa-microchip me-1"></i>Converter
                </button>
            </div>
        </div>

        <!-- Waveforms -->
        <div v-if="hasWaveforms" class="waveforms-container">
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
                        :chartPaddings="{top: 35, left: 45, right: 45, bottom: 25}"
                        :bgColor="bgColor"
                        :lineColor="$styleStore?.theme?.primary || '#b18aea'"
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
                    />
                </div>
            </div>
        </div>
        
        <!-- Empty State -->
        <div v-else class="empty-state text-center py-4">
            <i class="fa-solid fa-wave-square empty-icon mb-2"></i>
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
    background-color: v-bind('$styleStore?.theme?.primary || "#b18aea"');
    border-color: v-bind('$styleStore?.theme?.primary || "#b18aea"');
}

.view-toggle .btn-outline-primary {
    transition: all 0.2s ease;
}

.view-toggle .btn-outline-primary:hover {
    background-color: v-bind('$styleStore?.theme?.primary || "#b18aea"') !important;
    border-color: v-bind('$styleStore?.theme?.primary || "#b18aea"') !important;
    color: #ffffff !important;
}

.operating-point-label {
    font-size: 0.85rem;
    font-weight: 500;
    color: v-bind('$styleStore?.theme?.primary || "#b18aea"');
    padding: 4px 8px;
    background: rgba(177, 138, 234, 0.1);
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
    color: #888;
}

.empty-icon {
    font-size: 2rem;
    opacity: 0.5;
}

.empty-text {
    font-size: 0.9rem;
}
</style>
