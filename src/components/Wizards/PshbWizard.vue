<script setup>
import { IsolationClass, IsolationSide, Topology } from 'WebSharedComponents/assets/ts/MAS.ts'
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import DimensionReadOnly from 'WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromList from 'WebSharedComponents/DataInput/ElementFromList.vue'
import { minimumMaximumScalePerParameter } from 'WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
import KhDiagnosticsPanel from './KhDiagnosticsPanel.vue'
import CompactVoltageInput from './CompactVoltageInput.vue'
import { tooltipsConverterWizards, dropdownLabelsConverterWizards } from 'WebSharedComponents/assets/js/texts'
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
      turnsRatio: 8.0, ambientTemperature: 25, insulationType: IsolationClass.Basic,
      designMode: 'Help me with the design',
    };
    const insulationTypes = ['no', 'basic', 'reinforced'];
    const rectifierOptions = ['fullBridge', 'centerTapped', 'currentDoubler'];
    const designLevelOptions = ['Help me with the design', 'I know the design I want'];
    return {
      masStore, taskQueueStore, localData, insulationTypes, rectifierOptions, designLevelOptions, dropdownLabelsConverterWizards,
      errorMessage: "", simulatingWaveforms: false, waveformSource: '', waveformError: "",
      magneticWaveforms: [], converterWaveforms: [], designRequirements: null,
      simulatedTurnsRatios: null, simulatedOperatingPoints: [], numberOfPeriods: 2, numberOfSteadyStatePeriods: 5,
      waveformViewMode: 'magnetic',
      forceWaveformUpdate: 0,
      pshbDiagnostics: null,
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
      const knowsDesign = this.localData.designMode === 'I know the design I want';
      const vin = typeof this.localData.inputVoltage === 'object'
        ? (this.localData.inputVoltage?.nominal ?? this.localData.inputVoltage?.minimum ?? 400)
        : (this.localData.inputVoltage ?? 400);
      // PSHB primary sees ±Vin/2 (DC-blocking cap mid-point sits at Vin/2),
      // not ±Vin like a full bridge. Naive Vin/Vout puts the reflected
      // secondary peak BELOW Vout, so the rectifier diodes never forward
      // bias and the simulated waveforms collapse to zero. Use the half-
      // bridge formula with conservative duty-cycle headroom:
      //   n ≈ (Vin/2) · 0.5 / Vout = Vin / (4 · Vout)
      // For Vin=400, Vout=12 → n ≈ 8.3, matching the known-design default
      // and producing physically meaningful simulated waveforms.
      const desiredTurnsRatios = knowsDesign
        ? [this.localData.turnsRatio]
        : [vin / (4 * Math.max(this.localData.outputVoltage, 1))];
      const params = {
        inputVoltage: this.localData.inputVoltage, switchingFrequency: this.localData.switchingFrequency,
        phaseShift: this.localData.phaseShift, efficiency: this.localData.efficiency,
        useLeakageInductance: this.localData.useLeakageInductance,
        rectifierType: this.localData.rectifierType, maximumPhaseShift: this.localData.maxPhaseShift,
        desiredMagnetizingInductance: this.localData.magnetizingInductance,
        desiredTurnsRatios,
        operatingPoints: [{
          outputVoltages: [this.localData.outputVoltage],
          outputCurrents: [this.localData.outputPower / this.localData.outputVoltage],
          phaseShift: this.localData.phaseShift,
          switchingFrequency: this.localData.switchingFrequency,
          ambientTemperature: this.localData.ambientTemperature
        }],
      };
      if (knowsDesign && this.localData.seriesInductance > 0) {
        params.seriesInductance = this.localData.seriesInductance;
      }
      return params;
    },
    getCalculateFn() { return (aux) => this.taskQueueStore.calculatePshbInputs(aux); },
    getSimulateFn() { return (aux) => this.taskQueueStore.simulatePshbIdealWaveforms(aux); },
    getDefaultFrequency() { return this.localData.switchingFrequency; },
    getTopology() { return Topology.PhaseShiftedHalfBridgeConverter; },
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
    title="PSHB Wizard" titleIcon="pi pi-angle-double-right"
    subtitle="Phase-Shifted Half Bridge Converter"
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
      <Dimension :name="'phaseShift'" :tooltip="tooltipsConverterWizards['phaseShift']" :replaceTitle="'Ph. Shift'" unit="°" :min="0" :max="180" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-PhaseShift'" />
      <Dimension :name="'maxPhaseShift'" :tooltip="tooltipsConverterWizards['maxPhaseShift']" :replaceTitle="'Max Phase'" unit="°" :min="0" :max="180" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-MaxPhaseShift'" />
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
      <div class="compact-header"><i class="pi pi-cog-wide-connected mr-1"></i>Transformer</div>
    </template>

    <template v-if="localData.designMode === 'I know the design I want'" #design-or-switch-parameters>
      <Dimension :name="'turnsRatio'" :tooltip="tooltipsConverterWizards['turnsRatio']" :replaceTitle="'Turns'" :unit="null" :min="0.1" :max="100" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-TurnsRatio'" />
      <Dimension :name="'magnetizingInductance'" :tooltip="tooltipsConverterWizards['magnetizingInductance']" :replaceTitle="'Mag. Ind.'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-MagnetizingInductance'" />
      <Dimension :name="'seriesInductance'" :tooltip="tooltipsConverterWizards['seriesInductance']" :replaceTitle="'Series Ind.'" unit="H" :min="0" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-SeriesInductance'" />
      <ElementFromList :name="'rectifierType'" :tooltip="tooltipsConverterWizards['rectifierType']" :replaceTitle="'Rectifier'" :options="rectifierOptions" :optionLabels="dropdownLabelsConverterWizards.rectifierType" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-RectifierType'" />
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.useLeakageInductance" id="useLeakageInductancePshb"><label class="form-check-label small" for="useLeakageInductancePshb" :style="{ color: $styleStore.wizard.inputTextColor }">Use Leakage L</label></div>
    </template>

    <template #col1-footer>
      <div class="d-flex align-items-center justify-content-between mt-2">
        <span v-if="errorMessage" class="error-text"><i class="pi pi-exclamation-triangle mr-1"></i>{{ errorMessage }}</span>
        <span v-else></span>
        <div class="action-btns">
          <button :disabled="errorMessage != '' || !isValid()" class="action-btn-sm secondary" @click="processAndReview"><i class="pi pi-search mr-1"></i>Review Specs</button>
          <button :disabled="errorMessage != '' || !isValid()" class="action-btn-sm primary" @click="processAndAdvise"><i class="pi pi-sparkles mr-1"></i>Design Magnetic</button>
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

    <template v-if="pshbDiagnostics" #diagnostics>
      <!-- KH is the master of diagnostics: render its universal envelope directly. -->
      <KhDiagnosticsPanel :diagnostics="pshbDiagnostics" :dataTestLabel="dataTestLabel + '-KhDiagnostics'" />
    </template>
  </ConverterWizardBase>
</template>
