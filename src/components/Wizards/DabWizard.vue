<script setup>
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import DimensionReadOnly from '/WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
</script>

<script>
export default {
  props: {
    dataTestLabel: {
      type: String,
      default: 'DabWizard',
    },
  },
  data() {
    const masStore = useMasStore();
    const taskQueueStore = useTaskQueueStore();
    const localData = {
      inputVoltage: { nominal: 400, tolerance: 0.1 },
      outputVoltage: 400,
      outputPower: 1000,
      switchingFrequency: 100000,
      phaseShift: 30,
      efficiency: 0.97,
      seriesInductance: 0,
      useLeakageInductance: true,
      magnetizingInductance: 1e-3,
      turnsRatio: 1.0,
      ambientTemperature: 25,
      insulationType: 'Basic',
      modulationType: 'SPS',
      innerPhaseShift1: 15,
      innerPhaseShift2: 15,
      designMode: 'Help me with the design',
    };
    const insulationTypes = ['No', 'Basic', 'Reinforced'];
    const modulationTypes = ['SPS', 'EPS', 'DPS', 'TPS'];
    const designLevelOptions = ['Help me with the design', 'I know the design I want'];
    return {
      masStore,
      taskQueueStore,
      localData,
      errorMessage: "",
      insulationTypes,
      modulationTypes,
      designLevelOptions,
      simulatingWaveforms: false,
      waveformSource: '',
      waveformError: "",
      magneticWaveforms: [],
      converterWaveforms: [],
      designRequirements: null,
      simulatedTurnsRatios: null,
      numberOfPeriods: 2,
      numberOfSteadyStatePeriods: 1,
      simulatedOperatingPoints: [],
      waveformViewMode: 'magnetic',
      forceWaveformUpdate: 0,
      dabDiagnostics: null,
}
  },
  methods: {

    // ===== WIZARD CONTRACT =====
    buildParams(mode) {
      const vin = typeof this.localData.inputVoltage === 'object'
        ? (this.localData.inputVoltage?.nominal ?? this.localData.inputVoltage?.minimum ?? 400)
        : (this.localData.inputVoltage ?? 400);
      const knowsDesign = this.localData.designMode === 'I know the design I want';
      // AdvancedDab always requires desiredTurnsRatios + desiredMagnetizingInductance.
      // In "Help me" mode, derive a sensible default turns ratio from V_in/V_out.
      const turnsRatio = knowsDesign ? this.localData.turnsRatio : vin / (this.localData.outputVoltage || 1);
      const params = {
        inputVoltage: this.localData.inputVoltage, switchingFrequency: this.localData.switchingFrequency,
        phaseShift: this.localData.phaseShift, efficiency: this.localData.efficiency,
        useLeakageInductance: this.localData.useLeakageInductance,
        desiredTurnsRatios: [turnsRatio],
        desiredMagnetizingInductance: this.localData.magnetizingInductance,
        operatingPoints: [this.buildOperatingPoint()],
      };
      if (knowsDesign && this.localData.seriesInductance > 0) {
        params.seriesInductance = this.localData.seriesInductance;
      }
      return params;
    },
    buildOperatingPoint() {
      const mode = this.localData.modulationType || 'SPS';
      const op = {
        outputVoltages: [this.localData.outputVoltage],
        outputCurrents: [this.localData.outputPower / this.localData.outputVoltage],
        phaseShift: this.localData.phaseShift,
        switchingFrequency: this.localData.switchingFrequency,
        ambientTemperature: this.localData.ambientTemperature,
        modulationType: mode,
      };
      if (mode !== 'SPS') op.innerPhaseShift1 = this.localData.innerPhaseShift1;
      if (mode === 'TPS') op.innerPhaseShift2 = this.localData.innerPhaseShift2;
      return op;
    },
    getCalculateFn() { return (aux) => this.taskQueueStore.calculateDabInputs(aux); },
    getSimulateFn() { return (aux) => this.taskQueueStore.simulateDabIdealWaveforms(aux); },
    getDefaultFrequency() { return this.localData.switchingFrequency; },
    getTopology() { return 'Dual Active Bridge Converter'; },
    getIsolationSides() { return ['primary', 'secondary']; },
    getInsulationType() { return this.localData.insulationType; },

    postProcessResults(result) {
      this.dabDiagnostics = result?.dabDiagnostics ?? null;
      if (result?.designRequirements) {
        this.simulatedTurnsRatios = result.designRequirements.turnsRatios?.map(tr => tr.nominal) ?? [this.localData.turnsRatio];
      }
    },
    dabModLabel(n) {
      return {0: 'SPS', 1: 'EPS', 2: 'DPS', 3: 'TPS'}[n] ?? 'Unknown';
    },
    isValid() {
      const vin = typeof this.localData.inputVoltage === 'object'
        ? this.localData.inputVoltage?.nominal
        : this.localData.inputVoltage;
      return this.localData.outputPower > 0
        && this.localData.outputVoltage > 0
        && vin > 0
        && this.localData.switchingFrequency > 0;
    },
    updateErrorMessage() { this.errorMessage = ""; },
    dismissError() { this.errorMessage = ""; this.waveformError = ""; },

    async process() {
      this.masStore.resetMas("power");
      this.$stateStore.closeCoilAdvancedInfo();
      try {
        const result = await this.$refs.base.processWizardData(this, this.taskQueueStore);
        if (!result.success) {
          this.errorMessage = result.error;
          return false;
        }
        this.designRequirements = result.designRequirements;
        this.simulatedTurnsRatios = result.designRequirements?.turnsRatios?.map(tr => tr.nominal) || [this.localData.turnsRatio];
        return true;
      } catch (error) {
        this.errorMessage = error.message || "Failed to process DAB inputs";
        return false;
      }
    },

    async processAndReview() {
      const success = await this.process();
      if (!success) {
        setTimeout(() => { this.errorMessage = "" }, 5000);
        return;
      }
      await this.$refs.base.navigateToReview(this.$stateStore, this.masStore, "Power");
      await this.$nextTick();
      await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
    },

    async processAndAdvise() {
      const success = await this.process();
      if (!success) {
        setTimeout(() => { this.errorMessage = "" }, 5000);
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
  },
}
</script>

<template>
  <ConverterWizardBase
    ref="base"
    title="DAB Wizard"
    titleIcon="fa-right-left"
    subtitle="Bidirectional DC-DC Converter"
    :col1Width="3"
    :col2Width="4"
    :col3Width="5"
    :magneticWaveforms="magneticWaveforms"
    :converterWaveforms="converterWaveforms"
    :simulatingWaveforms="simulatingWaveforms"
    :waveformSource="waveformSource"
    :waveformError="waveformError"
    :errorMessage="errorMessage"
    :numberOfPeriods="numberOfPeriods"
    :numberOfSteadyStatePeriods="numberOfSteadyStatePeriods"
    :disableActions="errorMessage != '' || !isValid()"
    @update:numberOfPeriods="numberOfPeriods = $event"
    @update:numberOfSteadyStatePeriods="numberOfSteadyStatePeriods = $event"
    @get-analytical-waveforms="getAnalyticalWaveforms"
    @get-simulated-waveforms="simulateIdealWaveforms"
    @get-spice-code="getSpiceCode"
    @dismiss-error="dismissError"
  >
    <template #conditions>
      <Dimension :name="'switchingFrequency'" :replaceTitle="'Sw. Freq'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <ElementFromList :name="'modulationType'" :replaceTitle="'Mode'" :options="modulationTypes" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'phaseShift'" :replaceTitle="'Ph. Shift φ'" unit="°" :min="0" :max="90" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension v-if="localData.modulationType !== 'SPS'" :name="'innerPhaseShift1'" :replaceTitle="'Inner Shift D1'" unit="°" :min="0" :max="90" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension v-if="localData.modulationType === 'TPS'" :name="'innerPhaseShift2'" :replaceTitle="'Inner Shift D2'" unit="°" :min="0" :max="90" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'ambientTemperature'" :replaceTitle="'Temp'" unit=" C" :min="minimumMaximumScalePerParameter['temperature']['min']" :max="minimumMaximumScalePerParameter['temperature']['max']" :allowNegative="true" :allowZero="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'efficiency'" :replaceTitle="'Eff'" unit="%" :visualScale="100" :min="0.5" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <ElementFromList :name="'insulationType'" :replaceTitle="'Insul'" :options="insulationTypes" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
    </template>

    <template #design-mode>
      <div class="design-mode-selector">
        <label v-for="(option, index) in designLevelOptions" :key="index" class="design-mode-option">
          <input type="radio" v-model="localData.designMode" :value="option" @change="updateErrorMessage">
          <span class="design-mode-label">{{ option }}</span>
        </label>
      </div>
    </template>

    <template #design-or-switch-parameters-title>
      <div v-if="localData.designMode === 'I know the design I want'" class="compact-header"><i class="fa-solid fa-cogs me-1"></i>Transformer</div>
    </template>

    <template v-if="localData.designMode === 'I know the design I want'" #design-or-switch-parameters>
      <Dimension :name="'turnsRatio'" :replaceTitle="'Turns'" :unit="null" :min="0.1" :max="100" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'magnetizingInductance'" :replaceTitle="'Mag L'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'seriesInductance'" :replaceTitle="'Ser L'" unit="H" :min="0" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.useLeakageInductance" id="useLeakageInductance"><label class="form-check-label small" for="useLeakageInductance" :style="{ color: $styleStore.wizard.inputTextColor }">Use Leakage L</label></div>
    </template>

    <template #col1-footer>
      <div class="d-flex align-items-center justify-content-between mt-2">
        <span v-if="errorMessage" class="error-text"><i class="fa-solid fa-exclamation-triangle me-1"></i>{{ errorMessage }}</span>
        <span v-else></span>
        <div class="action-btns">
          <button :disabled="errorMessage != '' || !isValid()" class="action-btn-sm secondary" @click="processAndReview"><i class="fa-solid fa-magnifying-glass me-1"></i>Review Specs</button>
          <button :disabled="errorMessage != '' || !isValid()" class="action-btn-sm primary" @click="processAndAdvise"><i class="fa-solid fa-wand-magic-sparkles me-1"></i>Design Magnetic</button>
        </div>
      </div>
    </template>

    <template #input-voltage>
      <DimensionWithTolerance :name="'inputVoltage'" :replaceTitle="''" unit="V" :min="minimumMaximumScalePerParameter['voltage']['min']" :max="minimumMaximumScalePerParameter['voltage']['max']" :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-4'" v-model="localData.inputVoltage" :severalRows="true" :addButtonStyle="$styleStore.wizard.addButton" :removeButtonBgColor="$styleStore.wizard.removeButton['background-color']" :titleFontSize="$styleStore.wizard.inputLabelFontSize" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
    </template>

    <template #outputs>
      <Dimension :name="'outputVoltage'" :replaceTitle="'Voltage'" unit="V" :min="minimumMaximumScalePerParameter['voltage']['min']" :max="minimumMaximumScalePerParameter['voltage']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'outputPower'" :replaceTitle="'Power'" unit="W" :min="1" :max="minimumMaximumScalePerParameter['power']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
    </template>

    <template v-if="dabDiagnostics" #diagnostics>
      <DimensionReadOnly name="dabModulation" :replaceTitle="'Modulation'" :value="dabModLabel(dabDiagnostics.modulationType)" :unit="null" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly name="dabPhaseShift" :replaceTitle="'φ computed'" :value="dabDiagnostics.computedPhaseShiftDeg" unit="°" :numberDecimals="1" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly name="dabSeriesInductance" :replaceTitle="'L series'" :value="dabDiagnostics.computedSeriesInductance" unit="H" :numberDecimals="9" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly name="dabVoltageRatio" :replaceTitle="'d = N·V₂/V₁'" :value="dabDiagnostics.voltageConversionRatio" :unit="null" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly name="dabZvsPrimary" :replaceTitle="'ZVS primary'" :value="dabDiagnostics.zvsMarginPrimaryDeg" unit="°" :numberDecimals="1" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="dabDiagnostics.zvsMarginPrimaryDeg <= 0 ? 'text-warning' : $styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly name="dabZvsSecondary" :replaceTitle="'ZVS secondary'" :value="dabDiagnostics.zvsMarginSecondaryDeg" unit="°" :numberDecimals="1" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="dabDiagnostics.zvsMarginSecondaryDeg <= 0 ? 'text-warning' : $styleStore.wizard.inputTextColor"/>
    </template>
  </ConverterWizardBase>
</template>
