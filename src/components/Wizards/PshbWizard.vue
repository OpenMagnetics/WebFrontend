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
</script>

<script>
// Phase-Shifted Half-Bridge (PSHB) wizard. Mirrors PsfbWizard.vue: same
// fields and JSON shape; backend uses calculate_pshb_inputs (libMKF) which
// internally instantiates AdvancedPshb so user-pinned turnsRatios /
// magnetizingInductance / seriesInductance / outputInductance are honoured.
export default {
  props: {
    dataTestLabel: { type: String, default: 'PshbWizard' },
  },
  data() {
    const masStore = useMasStore();
    const taskQueueStore = useTaskQueueStore();
    const localData = {
      inputVoltage: { nominal: 400, tolerance: 0.1 },
      outputVoltage: 12, outputPower: 200, switchingFrequency: 100000,
      phaseShift: 72, maxPhaseShift: 144, efficiency: 0.95,
      seriesInductance: 0, useLeakageInductance: true,
      rectifierType: 'fullBridge', magnetizingInductance: 1e-3,
      turnsRatio: 8.0, ambientTemperature: 25, insulationType: InsulationType.Basic,
    };
    const insulationTypes = ['No', 'Basic', 'Reinforced'];
    const rectifierOptions = ['fullBridge', 'centerTapped', 'currentDoubler'];
    return {
      masStore, taskQueueStore, localData, insulationTypes, rectifierOptions,
      errorMessage: "", simulatingWaveforms: false, waveformSource: '', waveformError: "",
      magneticWaveforms: [], converterWaveforms: [], designRequirements: null,
      simulatedTurnsRatios: null, simulatedOperatingPoints: [], numberOfPeriods: 2, numberOfSteadyStatePeriods: 1,
      waveformViewMode: 'magnetic',
      forceWaveformUpdate: 0,
      pshbDiagnostics: null,
    }
  },
  methods: {

    // ===== WIZARD CONTRACT =====
    buildParams(mode) {
      return {
        inputVoltage: this.localData.inputVoltage, switchingFrequency: this.localData.switchingFrequency,
        phaseShift: this.localData.phaseShift, efficiency: this.localData.efficiency,
        seriesInductance: this.localData.seriesInductance, useLeakageInductance: this.localData.useLeakageInductance,
        rectifierType: this.localData.rectifierType, maximumPhaseShift: this.localData.maxPhaseShift,
        desiredMagnetizingInductance: this.localData.magnetizingInductance,
        desiredTurnsRatios: [this.localData.turnsRatio],
        operatingPoints: [{
          outputVoltages: [this.localData.outputVoltage],
          outputCurrents: [this.localData.outputPower / this.localData.outputVoltage],
          phaseShift: this.localData.phaseShift,
          switchingFrequency: this.localData.switchingFrequency,
          ambientTemperature: this.localData.ambientTemperature
        }],
      };
    },
    getCalculateFn() { return (aux) => this.taskQueueStore.calculatePshbInputs(aux); },
    getSimulateFn() { return (aux) => this.taskQueueStore.simulatePshbIdealWaveforms(aux); },
    getDefaultFrequency() { return this.localData.switchingFrequency; },
    getTopology() { return Topologies.PhaseShiftedHalfBridgeConverter; },
    getIsolationSides() { return [IsolationSide.Primary, IsolationSide.Secondary]; },
    getInsulationType() { return this.localData.insulationType; },

    postProcessResults(result) {
      this.pshbDiagnostics = result?.pshbDiagnostics ?? null;
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
        this.errorMessage = error.message || "Failed to process PSHB inputs";
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
    title="PSHB Wizard" titleIcon="bi bi-chevron-double-right"
    subtitle="Phase-Shifted Half Bridge Converter"
    :col1Width="3" :col2Width="4" :col3Width="5"
    :magneticWaveforms="magneticWaveforms" :converterWaveforms="converterWaveforms"
    :simulatingWaveforms="simulatingWaveforms" :waveformSource="waveformSource"
    :waveformError="waveformError" :errorMessage="errorMessage"
    :numberOfPeriods="numberOfPeriods" :numberOfSteadyStatePeriods="numberOfSteadyStatePeriods"
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
      <Dimension :name="'phaseShift'" :replaceTitle="'Ph. Shift'" unit="°" :min="0" :max="180" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'maxPhaseShift'" :replaceTitle="'Max Ph'" unit="°" :min="0" :max="180" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'ambientTemperature'" :replaceTitle="'Temp'" unit=" C" :min="minimumMaximumScalePerParameter['temperature']['min']" :max="minimumMaximumScalePerParameter['temperature']['max']" :allowNegative="true" :allowZero="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'efficiency'" :replaceTitle="'Eff'" unit="%" :visualScale="100" :min="0.5" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <ElementFromList :name="'insulationType'" :replaceTitle="'Insul'" :options="insulationTypes" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
    </template>

    <template #design-or-switch-parameters-title>
      <div class="compact-header"><i class="bi bi-gear-wide-connected me-1"></i>Transformer</div>
    </template>

    <template #design-or-switch-parameters>
      <Dimension :name="'turnsRatio'" :replaceTitle="'Turns'" :unit="null" :min="0.1" :max="100" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'magnetizingInductance'" :replaceTitle="'Mag L'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'seriesInductance'" :replaceTitle="'Ser L'" unit="H" :min="0" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <ElementFromList :name="'rectifierType'" :replaceTitle="'Rectifier'" :options="rectifierOptions" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.useLeakageInductance" id="useLeakageInductancePshb"><label class="form-check-label small" for="useLeakageInductancePshb" :style="{ color: $styleStore.wizard.inputTextColor }">Use Leakage L</label></div>
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
        :dataTestLabel="dataTestLabel + '-InputVoltage'"
        unit="V"
        :modelValue="localData.inputVoltage"
        @update="updateErrorMessage"
      />
    </template>

    <template #outputs>
      <Dimension :name="'outputVoltage'" :replaceTitle="'Voltage'" unit="V" :min="minimumMaximumScalePerParameter['voltage']['min']" :max="minimumMaximumScalePerParameter['voltage']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'outputPower'" :replaceTitle="'Power'" unit="W" :min="1" :max="minimumMaximumScalePerParameter['power']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
    </template>

    <template v-if="pshbDiagnostics" #diagnostics>
      <DimensionReadOnly name="pshbEffectiveDuty" :replaceTitle="'D effective'" :value="pshbDiagnostics.effectiveDutyCycle" :unit="null" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly name="pshbDutyLoss" :replaceTitle="'D loss'" :value="pshbDiagnostics.dutyCycleLoss" :unit="null" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly name="pshbZvsLagging" :replaceTitle="'ZVS lagging'" :value="pshbDiagnostics.zvsMarginLagging" :unit="null" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="pshbDiagnostics.zvsMarginLagging <= 0 ? 'text-warning' : $styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly name="pshbZvsLoadThr" :replaceTitle="'ZVS load thr'" :value="pshbDiagnostics.zvsLoadThreshold" unit="A" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly name="pshbResTrans" :replaceTitle="'t resonant'" :value="pshbDiagnostics.resonantTransitionTime" unit="s" :numberDecimals="9" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly name="pshbPriPeak" :replaceTitle="'I pri peak'" :value="pshbDiagnostics.primaryPeakCurrent" unit="A" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly name="pshbLseries" :replaceTitle="'L series'" :value="pshbDiagnostics.computedSeriesInductance" unit="H" :numberDecimals="9" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly name="pshbLout" :replaceTitle="'L output'" :value="pshbDiagnostics.computedOutputInductance" unit="H" :numberDecimals="9" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly name="pshbLmag" :replaceTitle="'L mag'" :value="pshbDiagnostics.computedMagnetizingInductance" unit="H" :numberDecimals="9" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      <DimensionReadOnly name="pshbDeadTime" :replaceTitle="'Dead time'" :value="pshbDiagnostics.computedDeadTime" unit="s" :numberDecimals="9" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
    </template>
  </ConverterWizardBase>
</template>
