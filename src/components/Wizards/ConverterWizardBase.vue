<script setup>
import ConverterWaveformVisualizer from './ConverterWaveformVisualizer.vue'
</script>

<script>
/**
 * ConverterWizardBase - Base layout component for all power converter wizards
 * 
 * Provides a common 3-column responsive layout with consistent styling.
 * Wizard-specific content is injected through named slots.
 *
 * Layout:
 *   Column 1 (configurable width): Wizard-specific configuration cards
 *   Column 2 (configurable width): Wizard-specific input/output cards
 *   Column 3 (configurable width): Optional Schematic + Waveforms
 *
 * Required Slots:
 *   - col1: Cards for column 1 (design mode, parameters, conditions, etc.)
 *   - col2: Cards for column 2 (input voltage, output, dimensions, etc.)
 *
 * Optional Slots:
 *   - header: Override wizard title header
 *   - schematic: Content for schematic card in col3 (if not provided, card is hidden)
 *   - waveform-controls: Override waveform control buttons (Analytical/Simulated)
 *   - actions: Override action buttons area (shown below col1)
 *   - col1-footer: Content below col1 cards (e.g., error + action buttons inline)
 *   - col3-extra: Extra content in column 3 (below waveforms)
 *
 * CSS Classes provided for use in slots:
 *   - .compact-card: Card container
 *   - .compact-header: Card header with icon
 *   - .compact-body: Card body
 *   - .action-btns: Action button container
 *   - .action-btn-sm.primary / .action-btn-sm.secondary: Action buttons
 *   - .error-text: Error message text
 *   - .sim-btn / .sim-btn.analytical: Simulation buttons
 *   - .periods-selector / .periods-label / .periods-select: Period controls
 *   - .design-mode-selector / .design-mode-option / .design-mode-label: Design mode radio
 *   - .computed-value-row / .computed-label / .computed-value: Computed value display
 */
export default {
  name: 'ConverterWizardBase',
  components: {
    ConverterWaveformVisualizer,
  },
  props: {
    /** Wizard title displayed in the header */
    title: {
      type: String,
      required: true
    },
    /** FontAwesome icon class for the header */
    titleIcon: {
      type: String,
      default: 'fa-bolt'
    },
    /** Optional subtitle/description for the wizard */
    subtitle: {
      type: String,
      default: ''
    },
    /** Bootstrap xl column width for column 1 (1-12) */
    col1Width: {
      type: [String, Number],
      default: 3
    },
    /** Bootstrap xl column width for column 2 (1-12) */
    col2Width: {
      type: [String, Number],
      default: 4
    },
    /** Bootstrap xl column width for column 3 (1-12) */
    col3Width: {
      type: [String, Number],
      default: 5
    },
    // --- Waveform props ---
    magneticWaveforms: {
      type: Array,
      default: () => []
    },
    converterWaveforms: {
      type: Array,
      default: () => []
    },
    waveformViewMode: {
      type: String,
      default: 'magnetic'
    },
    waveformForceUpdate: {
      type: Number,
      default: 0
    },
    simulatingWaveforms: {
      type: Boolean,
      default: false
    },
    waveformError: {
      type: String,
      default: ''
    },
    waveformSource: {
      type: String,
      default: ''
    },
    /** Error message displayed at the top of the wizard */
    errorMessage: {
      type: String,
      default: ''
    },
    /** Number of periods selector value */
    numberOfPeriods: {
      type: Number,
      default: 2
    },
    /** Number of steady-state periods */
    numberOfSteadyStatePeriods: {
      type: Number,
      default: 1
    },
    /** Whether to show periods/steady-state selectors in waveform header */
    showPeriodsSelector: {
      type: Boolean,
      default: true
    },
    /** Whether to show steady-state selector */
    showSteadyStateSelector: {
      type: Boolean,
      default: true
    },
    /** Disable action buttons */
    disableActions: {
      type: Boolean,
      default: false
    },
  },
  emits: [
    'update:waveformViewMode',
    'update:numberOfPeriods',
    'update:numberOfSteadyStatePeriods',
    'get-analytical-waveforms',
    'get-simulated-waveforms',
    'dismiss-error',
  ],

  computed: {
    primaryColor() {
      return this.$styleStore?.theme?.primary || '#b18aea';
    },
    primaryRgb() {
      // Convert hex to rgb for rgba() usage
      const hex = this.primaryColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return { r, g, b };
    },
    headerBgStyle() {
      const { r, g, b } = this.primaryRgb;
      return {
        background: `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.15) 0%, rgba(${r}, ${g}, ${b}, 0.05) 50%, rgba(${r}, ${g}, ${b}, 0.1) 100%)`,
        borderBottom: `1px solid rgba(${r}, ${g}, ${b}, 0.25)`
      };
    },
    iconContainerStyle() {
      const { r, g, b } = this.primaryRgb;
      return {
        background: `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.3) 0%, rgba(${r}, ${g}, ${b}, 0.15) 100%)`,
        border: `1px solid rgba(${r}, ${g}, ${b}, 0.4)`,
        boxShadow: `0 4px 15px rgba(${r}, ${g}, ${b}, 0.2)`
      };
    },
    col1Class() {
      return `col-12 col-xl-${this.col1Width}`;
    },
    col2Class() {
      return `col-12 col-xl-${this.col2Width}`;
    },
    col3Class() {
      return `col-12 col-xl-${this.col3Width}`;
    }
  },

  methods: {
    setWaveformViewMode(mode) {
      this.$emit('update:waveformViewMode', mode);
    },
    onGetAnalyticalWaveforms() {
      this.$emit('get-analytical-waveforms');
    },
    onGetSimulatedWaveforms() {
      this.$emit('get-simulated-waveforms');
    },
    onDismissError() {
      this.$emit('dismiss-error');
    }
  }
}
</script>

<template>
  <div class="wizard-container container-fluid px-3">
    <!-- Header -->
    <slot name="header">
      <div class="wizard-header" :style="headerBgStyle">
        <div class="wizard-header-content">
          <div class="wizard-icon-container" :style="iconContainerStyle">
            <i :class="['fa-solid', titleIcon, 'wizard-icon']"></i>
          </div>
          <div class="wizard-title-section">
            <h4 class="wizard-title">{{ title }}</h4>
            <p v-if="subtitle" class="wizard-subtitle">{{ subtitle }}</p>
          </div>
        </div>
      </div>
    </slot>

    <!-- Top-level Error Message (dismissible) -->
    <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show py-2 mt-3" role="alert" style="font-size: 0.85rem;">
      <i class="fa-solid fa-exclamation-circle me-2"></i>{{ errorMessage }}
      <button type="button" class="btn-close btn-close-sm" @click="onDismissError"></button>
    </div>

    <div class="row g-2 mt-2">
      <!-- Column 1 -->
      <div :class="col1Class">
        <div class="d-flex flex-column gap-2">

          <!-- Design Mode -->
          <div class="compact-card">
            <div class="compact-header"><i class="fa-solid fa-sliders me-1"></i>Design Mode</div>
            <div class="compact-body ps-4">
              <slot name="design-mode">
              </slot>
            </div>
          </div>

          <!-- Conditional: Design Parameters OR Switch Params -->
          <div class="compact-card">
            <slot name="design-or-switch-parameters-title">
            </slot>
            <div class="compact-body ps-4 pe-3">
              <slot name="design-or-switch-parameters">
              </slot>
            </div>
          </div>

          <!-- Conditions -->
          <div class="compact-card">
            <div class="compact-header"><i class="fa-solid fa-gauge-high me-1"></i>Conditions</div>
            <div class="compact-body ps-4">
              <slot name="conditions">
              </slot>
          </div>
          </div>
        </div>
        <!-- Footer area below col1 (actions, inline error, etc.) -->
        <slot name="col1-footer">
          <!-- Wizard can place action buttons here -->
        </slot>
      </div>

      <!-- Column 2 -->
      <div :class="col2Class">
        <div class="d-flex flex-column gap-2">

          <!-- Input Voltage -->
          <div class="compact-card">
            <div class="compact-header"><i class="fa-solid fa-plug me-1"></i>Input Voltage</div>
            <div class="compact-body">
              <slot name="input-voltage">
              </slot>
            </div>
          </div>

          <!-- Number of Outputs -->
          <div class="compact-card">
            <div class="compact-header"><i class="fa-solid fa-list-ol me-1"></i>Number of Outputs</div>
            <div class="compact-body ps-4">
              <slot name="number-outputs">
              </slot>
            </div>
          </div>

          <!-- Outputs -->
          <div class="compact-card">
            <div class="compact-header"><i class="fa-solid fa-arrow-right-from-bracket me-1"></i>Outputs</div>
            <div class="compact-body pe-3">
              <slot name="outputs">
              </slot>
            </div>
          </div>

        </div>
      </div>

      <!-- Column 3: Visualization -->
      <div :class="col3Class">
        <div class="d-flex flex-column gap-2">

          <!-- Waveforms Card -->
          <div class="compact-card simulation-card" :class="'h-100'">
            <div class="compact-header d-flex justify-content-between align-items-center">
              <span><i class="fa-solid fa-wave-square me-1"></i>Waveforms</span>
              <div class="d-flex align-items-center gap-2">
                <!-- Periods Selector -->
                <div v-if="showPeriodsSelector" class="periods-selector">
                  <label class="periods-label">Periods:</label>
                  <select
                    :value="numberOfPeriods"
                    @change="$emit('update:numberOfPeriods', Number($event.target.value))"
                    class="periods-select"
                  >
                    <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
                  </select>
                </div>
                <!-- Steady State Selector -->
                <div v-if="showSteadyStateSelector" class="periods-selector">
                  <label class="periods-label">Steady:</label>
                  <input
                    type="number"
                    :value="numberOfSteadyStatePeriods"
                    @input="$emit('update:numberOfSteadyStatePeriods', Number($event.target.value))"
                    min="1"
                    max="20"
                    class="periods-select"
                    style="width: 50px;"
                  />
                </div>
                <!-- Waveform Control Buttons -->
                <div class="sim-btns">
                  <slot name="waveform-controls">
                    <button
                      class="sim-btn analytical"
                      :disabled="disableActions || simulatingWaveforms"
                      @click="onGetAnalyticalWaveforms"
                      title="Get analytical waveforms"
                    >
                      <span v-if="simulatingWaveforms && waveformSource === 'analytical'">
                        <i class="fa-solid fa-spinner fa-spin"></i>
                      </span>
                      <span v-else><i class="fa-solid fa-calculator"></i> Analytical</span>
                    </button>
                    <button
                      class="sim-btn"
                      :disabled="disableActions || simulatingWaveforms"
                      @click="onGetSimulatedWaveforms"
                      title="Simulate ideal waveforms"
                    >
                      <span v-if="simulatingWaveforms && waveformSource === 'simulation'">
                        <i class="fa-solid fa-spinner fa-spin"></i>
                      </span>
                      <span v-else><i class="fa-solid fa-play"></i> Simulated</span>
                    </button>
                  </slot>
                </div>
              </div>
            </div>
            <div class="compact-body simulation-body">
              <div v-if="waveformError" class="error-text mb-2">
                <i class="fa-solid fa-exclamation-circle me-1"></i>{{ waveformError }}
              </div>
              <slot name="waveforms">
                <ConverterWaveformVisualizer
                  :magneticWaveforms="magneticWaveforms"
                  :converterWaveforms="converterWaveforms"
                  :viewMode="waveformViewMode"
                  @update:viewMode="setWaveformViewMode"
                  :forceUpdate="waveformForceUpdate"
                />
              </slot>
            </div>
          </div>

          <!-- Extra content in col3 -->
          <slot name="col3-extra"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.wizard-container { max-width: 1800px; margin: 0 auto; }

/* Header Styles */
.wizard-header { 
  border-radius: 12px; 
  padding: 16px 24px;
  margin-bottom: 16px;
}

.wizard-header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.wizard-icon-container {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wizard-icon {
  font-size: 1.75rem;
  color: v-bind('primaryColor');
}

.wizard-title-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wizard-title { 
  font-size: 1.4rem; 
  font-weight: 600; 
  color: v-bind('primaryColor');
  margin: 0;
  letter-spacing: -0.02em;
}

.wizard-subtitle {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  font-weight: 400;
}

/* Card styles - using primary color tones */
.compact-card { background: rgba(30, 30, 40, 0.6); border: 1px solid v-bind('"rgba(" + primaryRgb.r + ", " + primaryRgb.g + ", " + primaryRgb.b + ", 0.2)"'); border-radius: 8px; overflow: hidden; }
.compact-header { padding: 6px 10px; background: v-bind('"rgba(" + primaryRgb.r + ", " + primaryRgb.g + ", " + primaryRgb.b + ", 0.1)"'); border-bottom: 1px solid v-bind('"rgba(" + primaryRgb.r + ", " + primaryRgb.g + ", " + primaryRgb.b + ", 0.15)"'); font-size: 0.8rem; font-weight: 500; color: v-bind('primaryColor'); }
.compact-body { padding: 8px; }

/* Schematic */
.schematic-card { min-height: 200px; }
.schematic-body { min-height: 180px; }

/* Simulation / Waveforms */
.simulation-card { min-height: 300px; }
.simulation-body { min-height: 250px; display: flex; flex-direction: column; }

/* Action Buttons - using primary color tones */
.action-btns { display: flex; gap: 8px; }
.action-btn-sm { padding: 6px 14px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; cursor: pointer; border: none; }
.action-btn-sm.primary { background: linear-gradient(135deg, v-bind('primaryColor') 0%, v-bind('"rgba(" + primaryRgb.r + ", " + primaryRgb.g + ", " + primaryRgb.b + ", 0.7)"') 100%); color: white; }
.action-btn-sm.secondary { background: v-bind('"rgba(" + primaryRgb.r + ", " + primaryRgb.g + ", " + primaryRgb.b + ", 0.15)"'); border: 1px solid v-bind('"rgba(" + primaryRgb.r + ", " + primaryRgb.g + ", " + primaryRgb.b + ", 0.3)"'); color: v-bind('primaryColor'); }
.action-btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }

/* Sim Buttons - using primary color tones */
.sim-btns { display: flex; gap: 4px; }
.sim-btn { background: linear-gradient(135deg, v-bind('primaryColor') 0%, v-bind('"rgba(" + primaryRgb.r + ", " + primaryRgb.g + ", " + primaryRgb.b + ", 0.7)"') 100%); border: none; border-radius: 4px; padding: 4px 10px; color: white; font-size: 0.7rem; font-weight: 500; cursor: pointer; }
.sim-btn.analytical { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }
.sim-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Periods selector - using primary color tones */
.periods-selector { display: flex; align-items: center; gap: 4px; }
.periods-label { font-size: 0.75rem; color: #888; }
.periods-select { background: v-bind('headerBgStyle["background-color"] || "#1a1a2e"'); border: 1px solid v-bind('"rgba(" + primaryRgb.r + ", " + primaryRgb.g + ", " + primaryRgb.b + ", 0.3)"'); border-radius: 4px; padding: 2px 6px; font-size: 0.75rem; color: inherit; }

/* Design mode radio buttons */
.design-mode-selector { display: flex; flex-direction: column; gap: 4px; }
.design-mode-option { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.8rem; color: v-bind('$styleStore?.wizard?.inputTextColor?.color || $styleStore?.wizard?.inputTextColor || "#ccc"'); }
.design-mode-option input[type="radio"] { accent-color: v-bind('primaryColor'); }
.design-mode-label { font-size: 0.8rem; }

/* Computed value display */
.computed-value-row { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; font-size: 0.8rem; }
.computed-label { color: v-bind('$styleStore?.wizard?.inputTextColor?.color || $styleStore?.wizard?.inputTextColor || "#aaa"'); }
.computed-value { color: v-bind('primaryColor'); font-weight: 500; }

/* Waveform items */
.waveform-item { margin-bottom: 8px; }

/* Empty state */
.empty-state-compact { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: rgba(255, 255, 255, 0.3); font-size: 0.9rem; gap: 8px; }
.empty-state-compact i { font-size: 2rem; }

/* Error text */
.error-text { color: #ff6b6b; font-size: 0.8rem; }

/* Form check */
.form-check-label.small { font-size: 0.75rem; }

/* Responsive */
@media (max-width: 1199px) {
  .schematic-card { min-height: 250px; }
  .schematic-body { min-height: 230px; }
  
  .wizard-header { padding: 12px 16px; }
  .wizard-icon-container { width: 48px; height: 48px; }
  .wizard-icon { font-size: 1.5rem; }
  .wizard-title { font-size: 1.2rem; }
}
</style>
