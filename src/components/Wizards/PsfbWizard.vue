<script setup>
import { IsolationClass, IsolationSide, Topology } from 'WebSharedComponents/assets/ts/MAS.ts'
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import DimensionReadOnly from 'WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromList from 'WebSharedComponents/DataInput/ElementFromList.vue'
import DimensionWithTolerance from 'WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import PairOfDimensions from 'WebSharedComponents/DataInput/PairOfDimensions.vue'
import { outputTurnsRatioTitle as turnsRatioTitleFor } from './turnsRatioLabels.js'
import { minimumMaximumScalePerParameter } from 'WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
import KhDiagnosticsPanel from './KhDiagnosticsPanel.vue'
import CompactVoltageInput from './CompactVoltageInput.vue'
import { tooltipsConverterWizards, dropdownLabelsConverterWizards } from 'WebSharedComponents/assets/js/texts'
</script>

<script>
export default {
  props: {
    dataTestLabel: { type: String, default: 'PsfbWizard' },
  },
  data() {
    const masStore = useMasStore();
    const taskQueueStore = useTaskQueueStore();
    const localData = {
      inputVoltage: { nominal: 400, tolerance: 0.1 },
      outputsParameters: [{ voltage: 48, current: 20.83, turnsRatio: 4.0 }],
      numberOutputs: 1,
      switchingFrequency: 100000,
      phaseShift: 90,
      maxPhaseShift: 144,
      efficiency: 0.97,
      seriesInductance: 0,
      useLeakageInductance: true,
      rectifierType: 'fullBridge',
      magnetizingInductance: 1e-3,
      ambientTemperature: 25,
      insulationType: IsolationClass.Basic,
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
      psfbDiagnostics: null,
    };
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
    outputTurnsRatioTitle(index) {
      return turnsRatioTitleFor(index, this.localData.outputsParameters.length);
    },

    // ===== WIZARD CONTRACT =====
    buildParams(mode) {
      const vin = typeof this.localData.inputVoltage === 'object'
        ? (this.localData.inputVoltage?.nominal ?? this.localData.inputVoltage?.minimum ?? 400)
        : (this.localData.inputVoltage ?? 400);
      const knowsDesign = this.localData.designMode === 'I know the design I want';
      const outs = this.localData.outputsParameters || [];
      const desiredTurnsRatios = knowsDesign
        ? outs.map(o => o.turnsRatio || 1.0)
        : outs.map(o => vin / (o.voltage || 1));
      const params = {
        inputVoltage: this.localData.inputVoltage,
        switchingFrequency: this.localData.switchingFrequency,
        phaseShift: this.localData.phaseShift,
        efficiency: this.localData.efficiency,
        useLeakageInductance: this.localData.useLeakageInductance,
        rectifierType: this.localData.rectifierType,
        maximumPhaseShift: this.localData.maxPhaseShift,
        desiredTurnsRatios,
        desiredMagnetizingInductance: this.localData.magnetizingInductance,
        operatingPoints: [this.buildOperatingPoint()],
      };
      if (knowsDesign && this.localData.seriesInductance > 0) {
        params.seriesInductance = this.localData.seriesInductance;
      }
      return params;
    },
    buildOperatingPoint() {
      return {
        outputVoltages: this.localData.outputsParameters.map(o => o.voltage),
        outputCurrents: this.localData.outputsParameters.map(o => o.current),
        phaseShift: this.localData.phaseShift,
        switchingFrequency: this.localData.switchingFrequency,
        ambientTemperature: this.localData.ambientTemperature,
      };
    },
    getCalculateFn() { return (aux) => this.taskQueueStore.calculatePsfbInputs(aux); },
    getSimulateFn() { return (aux) => this.taskQueueStore.simulatePsfbIdealWaveforms(aux); },
    getDefaultFrequency() { return this.localData.switchingFrequency; },
    getTopology() { return Topology.PhaseShiftedFullBridgeConverter; },
    getIsolationSides() { return [IsolationSide.Primary, IsolationSide.Secondary]; },
    getInsulationType() { return this.localData.insulationType; },

    // The engine's designRequirements.turnsRatios (Np/Ns, one per output) are the ratios the run used.
    // No fallback: a run that comes back without them is an engine fault and must say so.
    turnsRatiosFromDesignRequirements(designRequirements) {
      const trs = designRequirements?.turnsRatios;
      if (!Array.isArray(trs) || trs.length === 0) {
        throw new Error('PSFB: the engine returned no designRequirements.turnsRatios');
      }
      return trs.map((tr, i) => {
        if (!Number.isFinite(tr?.nominal)) {
          throw new Error(`PSFB: the engine's designRequirements.turnsRatios[${i}] has no nominal value`);
        }
        return tr.nominal;
      });
    },
    postProcessResults(result) {
      this.psfbDiagnostics = result?.psfbDiagnostics ?? null;
      if (result?.designRequirements) {
        this.simulatedTurnsRatios = this.turnsRatiosFromDesignRequirements(result.designRequirements);
      }
    },
    isValid() {
      const vin = typeof this.localData.inputVoltage === 'object'
        ? this.localData.inputVoltage?.nominal
        : this.localData.inputVoltage;
      const outs = this.localData.outputsParameters || [];
      const outputsValid = outs.length > 0 && outs.every(o => o.voltage > 0 && o.current > 0);
      return outputsValid
        && vin > 0
        && this.localData.switchingFrequency > 0;
    },
    updateNumberOutputs(newNumber) {
      const n = parseInt(newNumber, 10);
      if (n > this.localData.outputsParameters.length) {
        const diff = n - this.localData.outputsParameters.length;
        for (let i = 0; i < diff; i++) {
          const last = this.localData.outputsParameters[this.localData.outputsParameters.length - 1] || { voltage: 48, current: 20.83, turnsRatio: 4.0 };
          const newOutput = { voltage: last.voltage, current: last.current };
          if (last.turnsRatio != null) {
            newOutput.turnsRatio = last.turnsRatio;
          } else if (this.localData.designMode === 'I know the design I want') {
            newOutput.turnsRatio = 1.0;
          }
          this.localData.outputsParameters.push(newOutput);
        }
      } else if (n < this.localData.outputsParameters.length) {
        const diff = this.localData.outputsParameters.length - n;
        this.localData.outputsParameters.splice(-diff, diff);
      }
      this.updateErrorMessage();
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
        this.simulatedTurnsRatios = this.turnsRatiosFromDesignRequirements(result.designRequirements);
        return true;
      } catch (error) {
        this.errorMessage = error.message || "Failed to process PSFB inputs";
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
    title="PSFB Wizard" titleIcon="pi pi-angle-double-right"
    subtitle="Phase-Shifted Full Bridge Converter"
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
      <Dimension :name="'switchingFrequency'" :tooltip="tooltipsConverterWizards['switchingFrequency']" :replaceTitle="'Sw. Freq.'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-SwitchingFrequency'" />
      <Dimension :name="'phaseShift'" :tooltip="tooltipsConverterWizards['phaseShift']" :replaceTitle="'Phase Shift'" unit="°" :min="0" :max="180" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-PhaseShift'" />
      <Dimension :name="'maxPhaseShift'" :tooltip="tooltipsConverterWizards['maxPhaseShift']" :replaceTitle="'Max Phase Shift'" unit="°" :min="0" :max="180" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-MaxPhaseShift'" />
      <Dimension :name="'ambientTemperature'" :tooltip="tooltipsConverterWizards['ambientTemperature']" :replaceTitle="'Ambient Temp.'" unit=" C" :min="minimumMaximumScalePerParameter['temperature']['min']" :max="minimumMaximumScalePerParameter['temperature']['max']" :allowNegative="true" :allowZero="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-AmbientTemperature'" />
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
      <Dimension :name="'magnetizingInductance'" :tooltip="tooltipsConverterWizards['magnetizingInductance']" :replaceTitle="'Mag. Ind.'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-MagnetizingInductance'" />
      <Dimension :name="'seriesInductance'" :tooltip="tooltipsConverterWizards['seriesInductance']" :replaceTitle="'Series Ind.'" unit="H" :min="0" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-SeriesInductance'" />
      <ElementFromList :name="'rectifierType'" :tooltip="tooltipsConverterWizards['rectifierType']" :replaceTitle="'Rectifier'" :options="rectifierOptions" :optionLabels="dropdownLabelsConverterWizards.rectifierType" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-RectifierType'" />
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.useLeakageInductance" id="useLeakageInductancePsfb"><label class="form-check-label small" for="useLeakageInductancePsfb" :style="{ color: $styleStore.wizard.inputTextColor }">Use Leakage L</label></div>
    </template>

    <template #col1-footer="{ resultsStale }">
      <div class="d-flex align-items-center justify-content-between mt-2">
        <span v-if="errorMessage" class="error-text"><i class="pi pi-exclamation-triangle mr-1"></i>{{ errorMessage }}</span>
        <span v-else></span>
        <div class="action-btns">
          <button :disabled="errorMessage != '' || !isValid()" class="action-btn-sm secondary" @click="processAndReview"><i class="pi pi-search mr-1"></i>Review Specs</button>
          <button data-cy="wizard-design-magnetic-button" :title="resultsStale ? 'These results are out of date: run again before designing the magnetic' : undefined" :disabled="errorMessage != '' || !isValid() || resultsStale" class="action-btn-sm primary" @click="processAndAdvise"><i class="pi pi-sparkles mr-1"></i>Design Magnetic</button>
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
      <div class="mb-3">
        <ElementFromList :name="'numberOutputs'" :tooltip="tooltipsConverterWizards['numberOutputs']" :replaceTitle="'Number of Outputs'"
        :dataTestLabel="dataTestLabel + '-NumberOutputs'"
          :options="Array.from({length: 10}, (_, i) => i + 1)"
          :titleSameRow="true" v-model="localData"
          :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateNumberOutputs"
        />
      </div>
      <div v-for="(datum, index) in localData.outputsParameters" :key="'output-' + index" class="mb-2">
        <template v-if="localData.designMode === 'I know the design I want'">
          <PairOfDimensions
            :names="['voltage', 'current']"
            :dataTestLabel="dataTestLabel + '-OutputsParameters-' + index"
            :replaceTitle="['Volt.', 'Curr.']"
            :units="['V', 'A']"
            :mins="[minimumMaximumScalePerParameter['voltage']['min'], minimumMaximumScalePerParameter['current']['min']]"
            :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['current']['max']]"
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
          <Dimension :name="'turnsRatio'" :tooltip="tooltipsConverterWizards['turnsRatio']"
            :replaceTitle="outputTurnsRatioTitle(index)" :unit="null" :min="0.01" :max="100"
            v-model="localData.outputsParameters[index]"
            :dataTestLabel="dataTestLabel + '-OutputsParameters-' + index + ' turnsRatio'"
            :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
            :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize"
            :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor"
            @update="updateErrorMessage"
          />
        </template>
        <PairOfDimensions v-else
          :names="['voltage', 'current']"
          :dataTestLabel="dataTestLabel + '-OutputsParameters-' + index"
          :replaceTitle="['Volt.', 'Curr.']"
          :units="['V', 'A']"
          :mins="[minimumMaximumScalePerParameter['voltage']['min'], minimumMaximumScalePerParameter['current']['min']]"
          :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['current']['max']]"
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

    <template v-if="psfbDiagnostics" #diagnostics>
      <!-- KH is the master of diagnostics: render its universal envelope directly. -->
      <KhDiagnosticsPanel :diagnostics="psfbDiagnostics" :dataTestLabel="dataTestLabel + '-KhDiagnostics'" />
    </template>
  </ConverterWizardBase>
</template>