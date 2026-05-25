<script setup>
import { InsulationType, IsolationSide, Topologies } from 'WebSharedComponents/assets/ts/MAS.ts'
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import DimensionReadOnly from 'WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromList from 'WebSharedComponents/DataInput/ElementFromList.vue'
import { minimumMaximumScalePerParameter } from 'WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
import CompactVoltageInput from './CompactVoltageInput.vue'
import { tooltipsConverterWizards, dropdownLabelsConverterWizards } from 'WebSharedComponents/assets/js/texts'
</script>

<script>
// Asymmetric Half-Bridge (AHB) wizard. Mirrors PsfbWizard.vue structure.
// Backend: calculate_ahb_inputs (libMKF) -> AdvancedAsymmetricHalfBridge.
// AHB uses dutyCycle (not phase shift) and supports four rectifier
// variants (centerTapped / fullBridge / currentDoubler / ahbFlyback).
// AhbOperatingPoint requires dutyCycle as a hint; the analytical solver
// recomputes it from V_in / V_out internally.
export default {
  props: {
    dataTestLabel: { type: String, default: 'AhbWizard' },
  },
  data() {
    const masStore = useMasStore();
    const taskQueueStore = useTaskQueueStore();
    const localData = {
      inputVoltage: { nominal: 400, tolerance: 0.1 },
      outputVoltage: 12, outputPower: 200, switchingFrequency: 100000,
      dutyCycle: 0.4, maximumDutyCycle: 0.7, efficiency: 0.95,
      leakageInductance: 1e-6, useLeakageInductance: true,
      rectifierType: 'centerTapped',
      magnetizingInductance: 500e-6,
      outputInductance: 0,
      dcBlockingCapacitance: 1e-6,
      outputCapacitance: 100e-6,
      turnsRatio: 8.0, ambientTemperature: 25, insulationType: InsulationType.Basic,
      designMode: 'Help me with the design',
    };
    const insulationTypes = ['no', 'basic', 'reinforced'];
    // The MAS schema enum strings.
    const rectifierOptions = ['centerTapped', 'fullBridge', 'currentDoubler', 'ahbFlyback'];
    const designLevelOptions = ['Help me with the design', 'I know the design I want'];
    return {
      masStore, taskQueueStore, localData, insulationTypes, rectifierOptions, designLevelOptions, dropdownLabelsConverterWizards,
      errorMessage: "", simulatingWaveforms: false, waveformSource: '', waveformError: "",
      magneticWaveforms: [], converterWaveforms: [], designRequirements: null,
      simulatedTurnsRatios: null, simulatedOperatingPoints: [], numberOfPeriods: 2, numberOfSteadyStatePeriods: 50,
      waveformViewMode: 'magnetic',
      forceWaveformUpdate: 0,
      ahbDiagnostics: null,
    }
  },
  mounted() {
      this.$nextTick(() => {
          if (this._autoRunDone) return;
          this._autoRunDone = true;
          try { this.updateErrorMessage?.(); } catch (e) { return; }
          if (!this.errorMessage) this.getAnalyticalWaveforms?.();
      });
  },
  methods: {

    // ===== WIZARD CONTRACT =====
    buildParams(mode) {
      const vin = typeof this.localData.inputVoltage === 'object'
        ? (this.localData.inputVoltage?.nominal ?? this.localData.inputVoltage?.minimum ?? 400)
        : (this.localData.inputVoltage ?? 400);
      const knowsDesign = this.localData.designMode === 'I know the design I want';
      // In help-me mode, derive a starting turns ratio from Vin/Vout so
      // the solver still has a sensible seed; in I-know mode use the
      // user's value verbatim. Mirrors DAB / PSFB.
      const desiredTurnsRatios = knowsDesign
        ? [this.localData.turnsRatio]
        : [vin / Math.max(this.localData.outputVoltage, 1)];
      const params = {
        inputVoltage: this.localData.inputVoltage,
        switchingFrequency: this.localData.switchingFrequency,
        efficiency: this.localData.efficiency,
        magnetizingInductance: this.localData.magnetizingInductance,
        leakageInductance: this.localData.leakageInductance,
        useLeakageInductance: this.localData.useLeakageInductance,
        rectifierType: this.localData.rectifierType,
        maximumDutyCycle: this.localData.maximumDutyCycle,
        operatingPoints: [{
          outputVoltages: [this.localData.outputVoltage],
          outputCurrents: [this.localData.outputPower / this.localData.outputVoltage],
          dutyCycle: this.localData.dutyCycle,
          switchingFrequency: this.localData.switchingFrequency,
          ambientTemperature: this.localData.ambientTemperature
        }],
        // desiredTurnsRatios is always sent (seed in help-me, pin in I-know).
        desiredTurnsRatios,
        // desiredMagnetizingInductance is always sent — matches DAB/PSFB.
        desiredMagnetizingInductance: this.localData.magnetizingInductance,
      };
      // Pinning overrides — only when the user said "I know the design".
      if (knowsDesign) {
        if (this.localData.leakageInductance && this.localData.leakageInductance > 0) {
          params.desiredLeakageInductance = this.localData.leakageInductance;
        }
        if (this.localData.outputInductance && this.localData.outputInductance > 0) {
          params.outputInductance = this.localData.outputInductance;
          params.desiredOutputInductance = this.localData.outputInductance;
        }
        if (this.localData.dcBlockingCapacitance && this.localData.dcBlockingCapacitance > 0) {
          params.dcBlockingCapacitance = this.localData.dcBlockingCapacitance;
          params.desiredDcBlockingCapacitance = this.localData.dcBlockingCapacitance;
        }
        if (this.localData.outputCapacitance && this.localData.outputCapacitance > 0) {
          params.desiredOutputCapacitance = this.localData.outputCapacitance;
        }
      }
      return params;
    },
    getCalculateFn() { return (aux) => this.taskQueueStore.calculateAhbInputs(aux); },
    getSimulateFn() { return (aux) => this.taskQueueStore.simulateAhbIdealWaveforms(aux); },
    getDefaultFrequency() { return this.localData.switchingFrequency; },
    getTopology() { return Topologies.AsymmetricHalfBridgeConverter; },
    getIsolationSides() {
      // Center-tapped: two physical secondaries (Sec_a, Sec_b) on the
      // same isolation side, linked via wound_with so the section
      // algorithm treats them as a single secondary group.
      // FB / CD / AHB-Flyback: a single secondary winding.
      if (this.localData.rectifierType === 'centerTapped') {
        return [IsolationSide.Primary, IsolationSide.Secondary, IsolationSide.Secondary];
      }
      return [IsolationSide.Primary, IsolationSide.Secondary];
    },
    getCoilGroups() {
      // Windings (by name) that must share sections — applied as
      // functionalDescription[i].woundWith in setupMasStore. The names
      // here MUST match the excitation labels emitted by the C++
      // backend (process_operating_point_for_input_voltage):
      //   "Secondary 0a" / "Secondary 0b" for CT.
      if (this.localData.rectifierType === 'centerTapped') {
        return [['Secondary 0a', 'Secondary 0b']];
      }
      return [];
    },
    getInsulationType() { return this.localData.insulationType; },

    postProcessResults(result) {
      this.ahbDiagnostics = result?.ahbDiagnostics ?? null;
      if (result?.designRequirements) {
        this.simulatedTurnsRatios = result.designRequirements.turnsRatios?.map(tr => tr.nominal) ?? [this.localData.turnsRatio];
      }
    },
    isValid() {
      const vin = typeof this.localData.inputVoltage === 'object'
        ? this.localData.inputVoltage?.nominal
        : this.localData.inputVoltage;
      return vin > 0
        && this.localData.outputVoltage > 0
        && this.localData.outputPower > 0
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
        this.errorMessage = error.message || "Failed to process AHB inputs";
        return false;
      }
    },

    async processAndReview() {
      const success = await this.process();
      if (!success) { setTimeout(() => { this.errorMessage = "" }, 5000); return; }
      await this.$refs.base.navigateToReview(this.$stateStore, this.masStore, "Power");
      await this.$nextTick();
      await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
    },
    async processAndAdvise() {
      const success = await this.process();
      if (!success) { setTimeout(() => { this.errorMessage = "" }, 5000); return; }
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
    title="AHB Wizard" titleIcon="bi bi-chevron-double-right"
    subtitle="Asymmetric Half Bridge Converter"
    :col1Width="3" :col2Width="4" :col3Width="5"
    :magneticWaveforms="magneticWaveforms" :converterWaveforms="converterWaveforms"
    :simulatingWaveforms="simulatingWaveforms" :waveformSource="waveformSource"
    :waveformError="waveformError" :errorMessage="errorMessage"
    :numberOfPeriods="numberOfPeriods" :numberOfSteadyStatePeriods="numberOfSteadyStatePeriods"
    :waveformViewMode="waveformViewMode"
    :waveformForceUpdate="forceWaveformUpdate"
    :disableActions="errorMessage != '' || !isValid()"
    @update:numberOfPeriods="numberOfPeriods = $event"
    @update:numberOfSteadyStatePeriods="numberOfSteadyStatePeriods = $event"
    @update:waveformViewMode="waveformViewMode = $event"
    @get-analytical-waveforms="getAnalyticalWaveforms"
    @get-simulated-waveforms="simulateIdealWaveforms"
    @get-spice-code="getSpiceCode"
    @dismiss-error="dismissError"
  >
    <template #conditions>
      <Dimension :name="'switchingFrequency'" :tooltip="tooltipsConverterWizards['switchingFrequency']" :replaceTitle="'Sw. Freq'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-SwitchingFrequency'" />
      <Dimension :name="'dutyCycle'" :tooltip="tooltipsConverterWizards['dutyCycle']" :replaceTitle="'Duty'" :unit="null" :min="0.05" :max="0.95" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-DutyCycle'" />
      <Dimension :name="'maximumDutyCycle'" :tooltip="tooltipsConverterWizards['maximumDutyCycle']" :replaceTitle="'Max Duty'" :unit="null" :min="0.1" :max="0.95" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-MaximumDutyCycle'" />
      <Dimension :name="'ambientTemperature'" :tooltip="tooltipsConverterWizards['ambientTemperature']" :replaceTitle="'Temp'" unit=" C" :min="minimumMaximumScalePerParameter['temperature']['min']" :max="minimumMaximumScalePerParameter['temperature']['max']" :allowNegative="true" :allowZero="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-AmbientTemperature'" />
      <Dimension :name="'efficiency'" :tooltip="tooltipsConverterWizards['efficiency']" :replaceTitle="'Efficiency'" unit="%" :visualScale="100" :min="0.5" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-Efficiency'" />
      <ElementFromList :name="'insulationType'" :tooltip="tooltipsConverterWizards['insulationType']" :replaceTitle="'Insulation'" :options="insulationTypes" :optionLabels="dropdownLabelsConverterWizards.insulationType" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-InsulationType'" />
    </template>

    <template #design-mode>
      <div class="design-mode-selector">
        <label v-for="(option, index) in designLevelOptions" :key="index" class="design-mode-option">
          <input type="radio" v-model="localData.designMode" :value="option" @change="updateErrorMessage">
          <span class="design-mode-label">{{ option }}</span>
        </label>
      </div>
    </template>

    <template v-if="localData.designMode === 'I know the design I want'" #design-or-switch-parameters-title>
      <div class="compact-header"><i class="bi bi-gear-wide-connected me-1"></i>Transformer</div>
    </template>

    <template v-if="localData.designMode === 'I know the design I want'" #design-or-switch-parameters>
      <Dimension :name="'turnsRatio'" :tooltip="tooltipsConverterWizards['turnsRatio']" :replaceTitle="'Turns'" :unit="null" :min="0.1" :max="100" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-TurnsRatio'" />
      <Dimension :name="'magnetizingInductance'" :tooltip="tooltipsConverterWizards['magnetizingInductance']" :replaceTitle="'Mag. Ind.'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-MagnetizingInductance'" />
      <Dimension :name="'leakageInductance'" :tooltip="tooltipsConverterWizards['leakageInductance']" :replaceTitle="'Leakage Ind.'" unit="H" :min="0" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-LeakageInductance'" />
      <Dimension :name="'outputInductance'" :tooltip="tooltipsConverterWizards['outputInductance']" :replaceTitle="'Output Ind.'" unit="H" :min="0" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-OutputInductance'" />
      <Dimension :name="'dcBlockingCapacitance'" :tooltip="tooltipsConverterWizards['dcBlockingCapacitance']" :replaceTitle="'Clamp Cap.'" unit="F" :min="0" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-DcBlockingCapacitance'" />
      <Dimension :name="'outputCapacitance'" :tooltip="tooltipsConverterWizards['outputCapacitance']" :replaceTitle="'Output Cap.'" unit="F" :min="0" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-OutputCapacitance'" />
      <ElementFromList :name="'rectifierType'" :tooltip="tooltipsConverterWizards['rectifierType']" :replaceTitle="'Rectifier'" :options="rectifierOptions" :optionLabels="dropdownLabelsConverterWizards.rectifierType" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-RectifierType'" />
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.useLeakageInductance" id="useLeakageInductanceAhb"><label class="form-check-label small" for="useLeakageInductanceAhb" :style="{ color: $styleStore.wizard.inputTextColor }">Use Leakage L</label></div>
    </template>

    <template #col1-footer>
      <div class="d-flex align-items-center justify-content-between mt-2">
        <span v-if="errorMessage" class="error-text"><i class="bi bi-exclamation-triangle-fill me-1"></i>{{ errorMessage }}</span>
        <span v-else></span>
        <div class="action-btns">
          <button :disabled="errorMessage != '' || !isValid()" class="action-btn-sm secondary" @click="processAndReview"><i class="bi bi-search me-1"></i>Review Specs</button>
          <button :disabled="errorMessage != '' || !isValid()" class="action-btn-sm primary" @click="processAndAdvise"><i class="bi bi-magic me-1"></i>Design Magnetic</button>
        </div>
      </div>
    </template>

    <template #input-voltage>
      <CompactVoltageInput
        :name="'inputVoltage'"
        :tooltip="tooltipsConverterWizards['inputVoltage']"
        :dataTestLabel="dataTestLabel + '-InputVoltage'"
        unit="V"
        :modelValue="localData.inputVoltage"
        @update="updateErrorMessage"
      />
    </template>

    <template #outputs>
      <Dimension :name="'outputVoltage'" :tooltip="tooltipsConverterWizards['outputVoltage']" :replaceTitle="'Voltage'" unit="V" :min="minimumMaximumScalePerParameter['voltage']['min']" :max="minimumMaximumScalePerParameter['voltage']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-OutputVoltage'" />
      <Dimension :name="'outputPower'" :tooltip="tooltipsConverterWizards['outputPower']" :replaceTitle="'Power'" unit="W" :min="1" :max="minimumMaximumScalePerParameter['power']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-OutputPower'" />
    </template>

    <template v-if="ahbDiagnostics" #diagnostics>
      <!-- Single-design computed quantities always flat. -->
      <DimensionReadOnly name="ahbN" :tooltip="tooltipsConverterWizards['ahbN']" :replaceTitle="'Turns ratio'" :value="ahbDiagnostics.computedTurnsRatio" :unit="null" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-AhbN'" />
      <DimensionReadOnly name="ahbLo" :tooltip="tooltipsConverterWizards['ahbLo']" :replaceTitle="'Output Ind.'" :value="ahbDiagnostics.computedOutputInductance" unit="H" :numberDecimals="9" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-AhbLo'" />
      <DimensionReadOnly name="ahbLm" :tooltip="tooltipsConverterWizards['ahbLm']" :replaceTitle="'Mag. Ind.'" :value="ahbDiagnostics.computedMagnetizingInductance" unit="H" :numberDecimals="9" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-AhbLm'" />
      <DimensionReadOnly name="ahbLk" :tooltip="tooltipsConverterWizards['ahbLk']" :replaceTitle="'Leakage Ind.'" :value="ahbDiagnostics.computedLeakageInductance" unit="H" :numberDecimals="9" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-AhbLk'" />

      <!-- Per-OP table for the last_* fields that vary across V_in. -->
      <table
        v-if="Array.isArray(ahbDiagnostics.perOp) && ahbDiagnostics.perOp.length > 1"
        class="diagnostics-perop-table"
        :data-cy="dataTestLabel + '-Ahb-perOp-table'"
        :style="{ color: $styleStore.wizard.inputTextColor, fontSize: $styleStore.wizard.inputFontSize, width: '100%', borderCollapse: 'collapse', marginTop: '4px' }"
      >
        <thead>
          <tr>
            <th :style="{ textAlign: 'left', padding: '2px 4px', fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }"></th>
            <th v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px', fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }">
              {{ op.operatingPointName || ('OP ' + i) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Duty</td><td v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.dutyCycle).toFixed(3) }}</td></tr>
          <tr><td>Conv. Ratio M</td><td v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.conversionRatio).toFixed(4) }}</td></tr>
          <tr><td>Q1 Peak Vds (V)</td><td v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.switchPeakVoltageQ1).toFixed(2) }}</td></tr>
          <tr><td>Q2 Peak Vds (V)</td><td v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.switchPeakVoltageQ2).toFixed(2) }}</td></tr>
          <tr><td>Q1 RMS I (A)</td><td v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.switchRmsCurrentQ1).toFixed(3) }}</td></tr>
          <tr><td>Q2 RMS I (A)</td><td v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.switchRmsCurrentQ2).toFixed(3) }}</td></tr>
          <tr><td>ZVS margin</td><td v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px', color: op.zvsMargin <= 0 ? '#e0b020' : 'inherit' }">{{ Number(op.zvsMargin).toFixed(3) }}</td></tr>
          <tr><td>Cb V (V)</td><td v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.dcBlockingCapVoltage).toFixed(2) }}</td></tr>
          <tr><td>Cb ripple (V)</td><td v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.dcBlockingCapRipple).toFixed(3) }}</td></tr>
          <tr><td>V_pri+ (V)</td><td v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.primaryPeakVoltagePositive).toFixed(2) }}</td></tr>
          <tr><td>V_pri− (V)</td><td v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.primaryPeakVoltageNegative).toFixed(2) }}</td></tr>
          <tr><td>Res. Trans. (s)</td><td v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.resonantTransitionTime).toExponential(2) }}</td></tr>
          <tr><td>SS ΔB (T)</td><td v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.steadyStateFluxExcursion).toFixed(4) }}</td></tr>
          <tr><td>Trans. ΔB est. (T)</td><td v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.transientFluxExcursionEstimate).toFixed(4) }}</td></tr>
          <tr><td>I_mag ripple (A)</td><td v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.magnetizingCurrentRipple).toFixed(3) }}</td></tr>
          <tr><td>Lo ripple (A)</td><td v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.outputInductorRipple).toFixed(3) }}</td></tr>
          <tr><td>Op. Mode</td><td v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ op.operatingMode === 1 ? 'DCM' : 'CCM' }}</td></tr>
          <tr><td>Rectifier</td><td v-for="(op, i) in ahbDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ op.rectifierType }}</td></tr>
        </tbody>
      </table>
      <template v-else>
        <DimensionReadOnly name="ahbDuty" :tooltip="tooltipsConverterWizards['ahbDuty']" :replaceTitle="'Duty'" :value="ahbDiagnostics.dutyCycle" :unit="null" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-AhbDuty'" />
        <DimensionReadOnly name="ahbConvRatio" :tooltip="tooltipsConverterWizards['ahbConvRatio']" :replaceTitle="'Conv. Ratio M'" :value="ahbDiagnostics.conversionRatio" :unit="null" :numberDecimals="4" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-AhbConvRatio'" />
        <DimensionReadOnly name="ahbVQ1" :tooltip="tooltipsConverterWizards['ahbVQ1']" :replaceTitle="'Q1 Peak Vds'" :value="ahbDiagnostics.switchPeakVoltageQ1" unit="V" :numberDecimals="2" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-AhbVQ1'" />
        <DimensionReadOnly name="ahbVQ2" :tooltip="tooltipsConverterWizards['ahbVQ2']" :replaceTitle="'Q2 Peak Vds'" :value="ahbDiagnostics.switchPeakVoltageQ2" unit="V" :numberDecimals="2" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-AhbVQ2'" />
        <DimensionReadOnly name="ahbIQ1" :tooltip="tooltipsConverterWizards['ahbIQ1']" :replaceTitle="'Q1 RMS Current'" :value="ahbDiagnostics.switchRmsCurrentQ1" unit="A" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-AhbIQ1'" />
        <DimensionReadOnly name="ahbIQ2" :tooltip="tooltipsConverterWizards['ahbIQ2']" :replaceTitle="'Q2 RMS Current'" :value="ahbDiagnostics.switchRmsCurrentQ2" unit="A" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-AhbIQ2'" />
        <DimensionReadOnly name="ahbZvs" :tooltip="tooltipsConverterWizards['ahbZvs']" :replaceTitle="'ZVS margin'" :value="ahbDiagnostics.zvsMargin" :unit="null" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="ahbDiagnostics.zvsMargin <= 0 ? 'text-warning' : $styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-AhbZvs'" />
        <DimensionReadOnly name="ahbFluxSS" :tooltip="tooltipsConverterWizards['ahbFluxSS']" :replaceTitle="'Steady-State ΔB'" :value="ahbDiagnostics.steadyStateFluxExcursion" unit="T" :numberDecimals="4" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-AhbFluxSS'" />
        <DimensionReadOnly name="ahbIMag" :tooltip="tooltipsConverterWizards['ahbIMag']" :replaceTitle="'Mag. Current Ripple'" :value="ahbDiagnostics.magnetizingCurrentRipple" unit="A" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-AhbIMag'" />
      </template>
    </template>
  </ConverterWizardBase>
</template>
