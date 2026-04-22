<script setup>
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import DimensionReadOnly from 'WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromList from 'WebSharedComponents/DataInput/ElementFromList.vue'
import DimensionWithTolerance from 'WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import PairOfDimensions from 'WebSharedComponents/DataInput/PairOfDimensions.vue'
import { minimumMaximumScalePerParameter, defaultDesignRequirements } from 'WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
</script>

<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: 'LlcWizard',
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        const localData = {
            inputVoltage: { nominal: 400, tolerance: 0.1 },
            bridgeType: 'Full Bridge',  // Full bridge gives k=1.0, so Vi_min = 360V > Vo = 200V (with n=4.17)
            numberOutputs: 1,
            outputsParameters: [{ voltage: 48, power: 500 }],
            minSwitchingFrequency: 80000,
            maxSwitchingFrequency: 120000,
            resonantFrequency: 100000,
            operatingSwitchingFrequency: 100000,
            qualityFactor: 0.4,
            inductanceRatio: 5,
            integratedResonantInductor: true,
            magnetizingInductance: 825e-6,
            turnsRatio: 8.33,
            ambientTemperature: 25,
            efficiency: 0.97,
            insulationType: 'Basic',
            designMode: designLevelOptions[0],  // Default to "Help me with the design"
            overrideSeriesInductance: false,
            seriesInductance: 40e-6,
            overrideResonantCapacitance: false,
            resonantCapacitance: 63e-9,
        };
        const insulationTypes = ['No', 'Basic', 'Reinforced'];
        return {
            masStore,
            taskQueueStore,
            designLevelOptions,
            localData,
            insulationTypes,
            errorMessage: "",
            simulatingWaveforms: false,
            waveformSource: '',
            waveformError: "",
            magneticWaveforms: [],
            converterWaveforms: [],
            designRequirements: null,
            simulatedTurnsRatios: null,
            simulatedMagnetizingInductance: null,
            simulatedOperatingPoints: [],
            numberOfPeriods: 2,
            numberOfSteadyStatePeriods: 50,
            waveformViewMode: 'magnetic',
            forceWaveformUpdate: 0,
            llcDiagnostics: null,
        }
    },
    computed: {
        wizardSubtitle() {
            return "Resonant DC-DC Converter";
        },
    },
    watch: {
        waveformViewMode() {
            this.$nextTick(() => {
                this.forceWaveformUpdate += 1;
            });
        },
    },
    methods: {

    // ===== WIZARD CONTRACT =====
    buildParams(mode) {
      const opFreq = this.localData.operatingSwitchingFrequency || this.localData.resonantFrequency;
      const outs = this.localData.outputsParameters || [];
      const aux = {
        inputVoltage: this.localData.inputVoltage,
        bridgeType: this.localData.bridgeType || 'Half Bridge',
        minSwitchingFrequency: this.localData.minSwitchingFrequency,
        maxSwitchingFrequency: this.localData.maxSwitchingFrequency,
        resonantFrequency: this.localData.resonantFrequency,
        qualityFactor: this.localData.qualityFactor,
        inductanceRatio: this.localData.inductanceRatio,
        integratedResonantInductor: this.localData.integratedResonantInductor,
        operatingPoints: [{
          outputVoltages: outs.map(o => o.voltage),
          outputCurrents: outs.map(o => (o.voltage > 0 ? o.power / o.voltage : 0)),
          switchingFrequency: opFreq,
          ambientTemperature: this.localData.ambientTemperature,
        }],
      };
      if (this.localData.designMode === 'I know the design I want') {
        aux.desiredInductance = this.localData.magnetizingInductance;
        aux.desiredTurnsRatios = [this.localData.turnsRatio];
      }
      if (this.localData.overrideSeriesInductance && this.localData.seriesInductance > 0) {
        aux.desiredResonantInductance = this.localData.seriesInductance;
      }
      if (this.localData.overrideResonantCapacitance && this.localData.resonantCapacitance > 0) {
        aux.desiredResonantCapacitance = this.localData.resonantCapacitance;
      }
      if (mode === 'simulation') { aux.magnetizingInductance = this.localData.magnetizingInductance; aux.turnsRatio = this.localData.turnsRatio; }
      return aux;
    },
    getCalculateFn() { return (aux) => this.taskQueueStore.calculateLlcInputs(aux); },
    getSimulateFn() { return (aux) => this.taskQueueStore.simulateLlcIdealWaveforms(aux); },
    getDefaultFrequency() { return this.localData.resonantFrequency; },
    postProcessResults(result, mode) {
      this.llcDiagnostics = result?.llcDiagnostics || null;
      const computedLs = this.llcDiagnostics?.computedResonantInductance;
      if (computedLs && computedLs > 0) {
        this.simulatedMagnetizingInductance = computedLs;
      } else {
        this.simulatedMagnetizingInductance = result.computedResonantInductance || this.localData.magnetizingInductance;
      }
      if (this.designRequirements) this.simulatedTurnsRatios = this.designRequirements.turnsRatios?.map(tr => tr.nominal) || [this.localData.turnsRatio];
    },

        updateErrorMessage() { this.errorMessage = ""; },

        updateNumberOutputs(newNumber) {
            const n = Number(newNumber);
            if (n > this.localData.outputsParameters.length) {
                const diff = n - this.localData.outputsParameters.length;
                for (let i = 0; i < diff; i++) {
                    const last = this.localData.outputsParameters[this.localData.outputsParameters.length - 1] || { voltage: 48, power: 500 };
                    this.localData.outputsParameters.push({ voltage: last.voltage, power: last.power });
                }
            } else if (n < this.localData.outputsParameters.length) {
                const diff = this.localData.outputsParameters.length - n;
                this.localData.outputsParameters.splice(-diff, diff);
            }
            this.updateErrorMessage();
        },
        
            
        // Wizard-specific methods for base class
        buildInputs() {
            return this.buildParams('analytical');
        },
        
        getCalculateFn() {
            return (inputs) => this.taskQueueStore.calculateLlcInputs(inputs);
        },
        
        getSimulateFn() {
            return (inputs) => this.taskQueueStore.simulateLlcIdealWaveforms(inputs);
        },
        
        hasSimulatedData() {
            return this.simulatedOperatingPoints && this.simulatedOperatingPoints.length > 0;
        },
        
        getFrequency() {
            return this.localData.resonantFrequency;
        },
        
        getTopology() {
            return 'LLC Resonant Converter';
        },
        
        getIsolationSides() {
            // LLC has 1 primary + N center-tapped secondaries = 1 + 2*N windings.
            // Each output's two halves share the same isolation side so the
            // coil virtualization can wind them together on a single section.
            // Side labels: primary, secondary (output 0), tertiary (output 1), ...
            const sideAt = (i) => ['primary','secondary','tertiary','quaternary','quinary','senary','septenary','octonary','nonary','denary'][i] || ('winding' + i);
            const sides = ['primary'];
            const numOutputs = (this.localData.outputsParameters || []).length || 1;
            for (let i = 0; i < numOutputs; i++) {
                sides.push(sideAt(i + 1));
                sides.push(sideAt(i + 1));
            }
            return sides;
        },
        
        getInsulationType() {
            return this.localData.insulationType;
        },
        
        async process() {
            this.masStore.resetMas("power");
            this.$stateStore.closeCoilAdvancedInfo();
            
            const result = await this.$refs.base.processWizardData(this, this.taskQueueStore);
            
            if (!result.success) {
                this.errorMessage = result.error;
                return false;
            }
            
            // Update local state with results
            this.designRequirements = this.masStore.mas.inputs.designRequirements;
            
            return true;
        },

        async processAndReview() {
            const success = await this.process();
            if (!success) {
                setTimeout(() => {this.errorMessage = ""}, 5000);
                return;
            }
            await this.$refs.base.navigateToReview(this.$stateStore, this.masStore, "Power");
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
        },

        async processAndAdvise() {
            const success = await this.process();
            if (!success) {
                setTimeout(() => {this.errorMessage = ""}, 5000);
                return;
            }
            await this.$refs.base.navigateToAdvise(this.$stateStore, this.masStore, "Power");
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
        },

        async getAnalyticalWaveforms() {
      await this.$refs.base.executeWaveformAction(this, 'analytical');
    },

        async simulateIdealWaveforms() {
      await this.$refs.base.executeWaveformAction(this, 'simulation');
    },

        async getSpiceCode() {
      await this.$refs.base.generateSpiceCode(this);
    },

        // Helper to resolve dimension value (nominal/min/max) to a scalar
        resolveDimensionValue(dimObj) {
            if (!dimObj) return null;
            if (dimObj.nominal !== undefined && dimObj.nominal !== null) return dimObj.nominal;
            if (dimObj.minimum !== undefined && dimObj.minimum !== null) return dimObj.minimum;
            if (dimObj.maximum !== undefined && dimObj.maximum !== null) return dimObj.maximum;
            return null;
        },

        // Returns the computed magnetizing inductance value from designRequirements (in H)
        getComputedMagnetizingInductance() {
            if (!this.designRequirements?.magnetizingInductance) return null;
            return this.resolveDimensionValue(this.designRequirements.magnetizingInductance);
        },

        // Returns the computed turns ratio value from designRequirements
        getComputedTurnsRatio() {
            if (!this.designRequirements?.turnsRatios?.length) return null;
            const tr = this.designRequirements.turnsRatios[0];
            return this.resolveDimensionValue(tr);
        },

        // Check if computed tank values are available
        hasComputedTankValues() {
            return this.designRequirements != null;
        },

        // === LLC diagnostics helpers ===
        // Human-readable Nielsen TDA mode labels (get_last_mode() returns 1..6, 0 = unknown)
        llcModeLabel(mode) {
            const labels = {
                0: 'Unknown',
                1: 'Mode 1 — Above resonance (CCM)',
                2: 'Mode 2 — At resonance',
                3: 'Mode 3 — Below resonance (DCMAB)',
                4: 'Mode 4 — Below resonance (DCMA)',
                5: 'Mode 5 — Deep below resonance',
                6: 'Mode 6 — Discontinuous',
            };
            return labels[mode] ?? `Mode ${mode}`;
        },
        formatSi(value, unit, decimals = 3) {
            if (value == null || !isFinite(value)) return '—';
            const abs = Math.abs(value);
            const steps = [
                { t: 1e9,  s: 'G' }, { t: 1e6,  s: 'M' }, { t: 1e3,  s: 'k' },
                { t: 1,    s: ''  },
                { t: 1e-3, s: 'm' }, { t: 1e-6, s: 'µ' }, { t: 1e-9, s: 'n' }, { t: 1e-12, s: 'p' },
            ];
            for (const { t, s } of steps) {
                if (abs >= t || t === 1e-12) {
                    return `${(value / t).toFixed(decimals)} ${s}${unit}`;
                }
            }
            return `${value.toExponential(decimals)} ${unit}`;
        },
        formatDiagNumber(value) {
            if (value == null || !isFinite(value)) return '—';
            if (Math.abs(value) < 1e-3 || Math.abs(value) >= 1e6) return value.toExponential(3);
            return value.toFixed(6);
        },

                                        },
}

</script>

<template>
  <ConverterWizardBase
    ref="base"
    title="LLC Wizard"
    titleIcon="bi bi-soundwave"
    :subtitle="wizardSubtitle"
    :col1Width="3" :col2Width="4" :col3Width="5"
    :showNumberOutputs="false"
    :magneticWaveforms="magneticWaveforms"
    :converterWaveforms="converterWaveforms"
    :waveformViewMode="waveformViewMode"
    :waveformForceUpdate="forceWaveformUpdate"
    :simulatingWaveforms="simulatingWaveforms"
    :waveformSource="waveformSource"
    :waveformError="waveformError"
    :errorMessage="errorMessage"
    :numberOfPeriods="numberOfPeriods"
    :numberOfSteadyStatePeriods="numberOfSteadyStatePeriods"
    :disableActions="errorMessage != ''"
    @update:waveformViewMode="waveformViewMode = $event"
    @update:numberOfPeriods="numberOfPeriods = $event"
    @update:numberOfSteadyStatePeriods="numberOfSteadyStatePeriods = $event"
    @get-analytical-waveforms="getAnalyticalWaveforms"
    @get-simulated-waveforms="simulateIdealWaveforms"
    @get-spice-code="getSpiceCode"
    @dismiss-error="errorMessage = ''; waveformError = ''"
  >
    <template #design-mode>
      <div class="design-mode-selector">
        <label v-for="(option, index) in designLevelOptions" :key="index" class="design-mode-option">
          <input type="radio" v-model="localData.designMode" :value="option" @change="updateErrorMessage">
          <span class="design-mode-label">{{ option }}</span>
        </label>
      </div>
    </template>

    <template #design-or-switch-parameters-title>
      <div class="compact-header"><i class="bi bi-gear-wide-connected me-1"></i>Tank</div>
    </template>

    <template #design-or-switch-parameters>
      <Dimension :name="'qualityFactor'" :replaceTitle="'Q Factor'" :unit="null" :min="0.1" :max="2" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'inductanceRatio'" :replaceTitle="'Ln Ratio'" :unit="null" :min="2" :max="20" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <!-- Only show turns ratio and magnetizing inductance inputs in "I know the design I want" mode -->
      <template v-if="localData.designMode === 'I know the design I want'">
        <Dimension :name="'turnsRatio'" :replaceTitle="'Turns'" :unit="null" :min="0.1" :max="100" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
        <Dimension :name="'magnetizingInductance'" :replaceTitle="'Mag. Inductance'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      </template>
      <!-- Show computed values using DimensionReadOnly (shows only when data available) -->
      <template v-else-if="hasComputedTankValues()">
        <DimensionReadOnly :name="'turnsRatio'" :replaceTitle="'Number Turns'" :unit="null" :value="getComputedTurnsRatio()" :numberDecimals="2" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
        <DimensionReadOnly :name="'magnetizingInductance'" :replaceTitle="'Mag. Inductance'" unit="H" :value="getComputedMagnetizingInductance()" :numberDecimals="6" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      </template>
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.integratedResonantInductor" id="integratedResonantInductor"><label class="form-check-label small" for="integratedResonantInductor" :style="{ color: $styleStore.wizard.inputTextColor }">Integrated Res L</label></div>

      <!-- Ls / Cr overrides: bypass the automatic Q-based tank design. -->
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.overrideSeriesInductance" id="overrideSeriesInductance" @change="updateErrorMessage"><label class="form-check-label small" for="overrideSeriesInductance" :style="{ color: $styleStore.wizard.inputTextColor }">Override Ls</label></div>
      <Dimension v-if="localData.overrideSeriesInductance" :name="'seriesInductance'" :replaceTitle="'Ls'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.overrideResonantCapacitance" id="overrideResonantCapacitance" @change="updateErrorMessage"><label class="form-check-label small" for="overrideResonantCapacitance" :style="{ color: $styleStore.wizard.inputTextColor }">Override Cr</label></div>
      <Dimension v-if="localData.overrideResonantCapacitance" :name="'resonantCapacitance'" :replaceTitle="'Cr'" unit="F" :min="1e-12" :max="1e-3" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
    </template>

    <!-- Diagnostics slot: rendered by ConverterWizardBase as a generic .compact-card. -->
    <template v-if="llcDiagnostics" #diagnostics>
      <DimensionReadOnly :name="'llcMode'" :replaceTitle="'Mode'" :unit="null" :value="llcModeLabel(llcDiagnostics.lastMode)" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly :name="'llcLs'" :replaceTitle="'Ls'" unit="H" :value="llcDiagnostics.computedResonantInductance" :numberDecimals="6" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly :name="'llcCr'" :replaceTitle="'Cr'" unit="F" :value="llcDiagnostics.computedResonantCapacitance" :numberDecimals="9" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly :name="'llcLn'" :replaceTitle="'Ln'" :unit="null" :value="llcDiagnostics.computedInductanceRatio" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly :name="'llcLipFreq'" :replaceTitle="'LIP freq'" unit="Hz" :value="llcDiagnostics.lipFrequency" :numberDecimals="0" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly :name="'llcLipVin'" :replaceTitle="'LIP Vin'" unit="V" :value="llcDiagnostics.lipInputVoltage" :numberDecimals="1" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly :name="'llcResidual'" :replaceTitle="'Residual'" :unit="null" :value="llcDiagnostics.lastSteadyStateResidual" :numberDecimals="6" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="llcDiagnostics.lastSteadyStateResidual > 1e-4 ? 'text-warning' : $styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly v-if="llcDiagnostics.lastSubStateSequence && llcDiagnostics.lastSubStateSequence.length" :name="'llcSubStates'" :replaceTitle="'Sub-states'" :unit="null" :value="llcDiagnostics.lastSubStateSequence.join(' → ')" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
    </template>

    <template #conditions>
      <!-- Freq Range -->
      <Dimension :name="'minSwitchingFrequency'" :replaceTitle="'Min. Frequency'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'maxSwitchingFrequency'" :replaceTitle="'Max. Frequency'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'resonantFrequency'" :replaceTitle="'Res. Frequency'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'operatingSwitchingFrequency'" :replaceTitle="'Op. Frequency'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'ambientTemperature'" :replaceTitle="'Temperature'" unit=" C" :min="minimumMaximumScalePerParameter['temperature']['min']" :max="minimumMaximumScalePerParameter['temperature']['max']" :allowNegative="true" :allowZero="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'efficiency'" :replaceTitle="'Efficiency'" unit="%" :visualScale="100" :min="0.5" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <ElementFromList :name="'insulationType'" :replaceTitle="'Insulation'" :options="insulationTypes" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <!-- Bridge Type -->
      <ElementFromList :name="'bridgeType'" :replaceTitle="'Bridge Type'" :options="['Half Bridge', 'Full Bridge']" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
    </template>

    <template #col1-footer>
      <div class="d-flex align-items-center justify-content-between mt-2">
        <span v-if="errorMessage" class="error-text"><i class="bi bi-exclamation-triangle-fill me-1"></i>{{ errorMessage }}</span>
        <span v-else></span>
        <div class="action-btns">
          <button :disabled="errorMessage != ''" class="action-btn-sm secondary" @click="processAndReview"><i class="bi bi-search me-1"></i>Review Specs</button>
          <button :disabled="errorMessage != ''" class="action-btn-sm primary" @click="processAndAdvise"><i class="bi bi-magic me-1"></i>Design Magnetic</button>
        </div>
      </div>
    </template>

    <template #input-voltage>
      <DimensionWithTolerance :name="'inputVoltage'" :replaceTitle="''" unit="V" :min="minimumMaximumScalePerParameter['voltage']['min']" :max="minimumMaximumScalePerParameter['voltage']['max']" :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-4'" v-model="localData.inputVoltage" :severalRows="true" :addButtonStyle="$styleStore.wizard.addButton" :removeButtonBgColor="$styleStore.wizard.removeButton['background-color']" :titleFontSize="$styleStore.wizard.inputLabelFontSize" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
    </template>

    <template #outputs>
      <div class="mb-2">
        <ElementFromList :name="'numberOutputs'" :replaceTitle="'Number of Outputs'" :options="Array.from({length: 10}, (_, i) => i + 1)" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateNumberOutputs"/>
      </div>
      <div v-for="(datum, index) in localData.outputsParameters" :key="'llc-output-' + index" class="mb-2">
        <PairOfDimensions
          :names="['voltage', 'power']"
          :replaceTitle="['V' + (index + 1), 'P' + (index + 1)]"
          :units="['V', 'W']"
          :mins="[minimumMaximumScalePerParameter['voltage']['min'], 1]"
          :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['power']['max']]"
          v-model="localData.outputsParameters[index]"
          :labelWidthProportionClass="'col-4'"
          :valueWidthProportionClass="'col-7'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'"
          :valueBgColor="$styleStore.wizard.inputValueBgColor"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />
      </div>
    </template>
  </ConverterWizardBase>
</template>
