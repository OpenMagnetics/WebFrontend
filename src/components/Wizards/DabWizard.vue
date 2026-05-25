<script setup>
import { InsulationType, IsolationSide, Topologies } from 'WebSharedComponents/assets/ts/MAS.ts'
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import DimensionReadOnly from 'WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromList from 'WebSharedComponents/DataInput/ElementFromList.vue'
import DimensionWithTolerance from 'WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import PairOfDimensions from 'WebSharedComponents/DataInput/PairOfDimensions.vue'
import TripleOfDimensions from 'WebSharedComponents/DataInput/TripleOfDimensions.vue'
import { minimumMaximumScalePerParameter } from 'WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
import CompactVoltageInput from './CompactVoltageInput.vue'
import { tooltipsConverterWizards, dropdownLabelsConverterWizards } from 'WebSharedComponents/assets/js/texts'
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
    // Modulation naming follows the standard TPS convention
    // (Huang et al., Energies 11(9):2419, 2018 — also Rosano-Maniktala
    // "Power Supplies A to Z" 3rd ed.):
    //   D1 = primary-bridge intra-leg shift
    //   D2 = secondary-bridge intra-leg shift
    //   D3 = inter-bridge (outer) shift that drives power transfer
    // SPS uses D3 only, EPS uses D1+D3, DPS uses D1+D2+D3 (symmetric
    // D1=D2 is the Huang convention), TPS uses all three independently.
    const localData = {
      inputVoltage: { nominal: 400, tolerance: 0.1 },
      outputsParameters: [{ voltage: 400, current: 2.5, turnsRatio: 1.0 }],
      numberOutputs: 1,
      switchingFrequency: 100000,
      efficiency: 0.97,
      seriesInductance: 0,
      useLeakageInductance: true,
      magnetizingInductance: 1e-3,
      turnsRatio: 1.0,
      ambientTemperature: 25,
      insulationType: InsulationType.Basic,
      modulationType: 'SPS',
      innerPhaseShift1: 15,      // D1 — primary intra-leg shift
      innerPhaseShift2: 15,      // D2 — secondary intra-leg shift
      innerPhaseShift3: 30,      // D3 — outer inter-bridge shift
      designMode: 'Help me with the design',
    };
    const insulationTypes = ['no', 'basic', 'reinforced'];
    const modulationTypes = ['SPS', 'EPS', 'DPS', 'TPS'];
    const designLevelOptions = ['Help me with the design', 'I know the design I want'];
    return {
      masStore,
      taskQueueStore, dropdownLabelsConverterWizards,
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
      numberOfSteadyStatePeriods: 50,
      simulatedOperatingPoints: [],
      waveformViewMode: 'magnetic',
      forceWaveformUpdate: 0,
      dabDiagnostics: null,
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
      const outs = this.localData.outputsParameters || [];
      const desiredTurnsRatios = knowsDesign
        ? outs.map(o => o.turnsRatio || 1.0)
        : outs.map(o => vin / (o.voltage || 1));
      const params = {
        inputVoltage: this.localData.inputVoltage,
        switchingFrequency: this.localData.switchingFrequency,
        efficiency: this.localData.efficiency,
        useLeakageInductance: this.localData.useLeakageInductance,
        desiredTurnsRatios,
        desiredMagnetizingInductance: this.localData.magnetizingInductance,
        operatingPoints: [this.buildOperatingPoint()],
      };
      if (knowsDesign && this.localData.seriesInductance > 0) {
        params.seriesInductance = this.localData.seriesInductance;
      }
      return params;
    },
    // Build one DabOperatingPoint with the right subset of shifts per mode.
    // innerPhaseShift3 (D3, outer) is always sent. Inner shifts D1, D2 are
    // added only for the modes that actually use them (Huang 2018 convention).
    buildOperatingPoint() {
      const mode = this.localData.modulationType || 'SPS';
      const op = {
        outputVoltages: this.localData.outputsParameters.map(o => o.voltage),
        outputCurrents: this.localData.outputsParameters.map(o => o.current),
        innerPhaseShift3: this.localData.innerPhaseShift3,
        switchingFrequency: this.localData.switchingFrequency,
        ambientTemperature: this.localData.ambientTemperature,
        modulationType: mode,
      };
      // EPS, DPS, TPS all use D1 (primary intra-leg shift).
      if (mode !== 'SPS') op.innerPhaseShift1 = this.localData.innerPhaseShift1;
      // DPS and TPS both use D2 (secondary intra-leg shift). In DPS, standard
      // usage is D2 = D1 (symmetric); we still send D2 explicitly so the user's
      // value is respected.
      if (mode === 'DPS' || mode === 'TPS') op.innerPhaseShift2 = this.localData.innerPhaseShift2;
      return op;
    },
    getCalculateFn() { return (aux) => this.taskQueueStore.calculateDabInputs(aux); },
    getSimulateFn() { return (aux) => this.taskQueueStore.simulateDabIdealWaveforms(aux); },
    getDefaultFrequency() { return this.localData.switchingFrequency; },
    getTopology() { return Topologies.DualActiveBridgeConverter; },
    getIsolationSides() { return [IsolationSide.Primary, IsolationSide.Secondary]; },
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
          const last = this.localData.outputsParameters[this.localData.outputsParameters.length - 1] || { voltage: 400, current: 2.5, turnsRatio: 1.0 };
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
    titleIcon="bi bi-arrow-left-right"
    subtitle="Bidirectional DC-DC Converter"
    :col1Width="3"
    :col2Width="4"
    :col3Width="5"
    :magneticWaveforms="magneticWaveforms"
    :converterWaveforms="converterWaveforms"
    :simulatingWaveforms="simulatingWaveforms"
    :waveformSource="waveformSource"
    :waveformError="waveformError"
    :waveformViewMode="waveformViewMode"
    :waveformForceUpdate="forceWaveformUpdate"
    :errorMessage="errorMessage"
    :numberOfPeriods="numberOfPeriods"
    :numberOfSteadyStatePeriods="numberOfSteadyStatePeriods"
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
      <ElementFromList :name="'modulationType'" :tooltip="tooltipsConverterWizards['modulationType']" :replaceTitle="'Mode'" :options="modulationTypes" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-ModulationType'" />
      <!-- D1: primary intra-leg shift. EPS, DPS and TPS. -->
      <Dimension v-if="localData.modulationType !== 'SPS'" :name="'innerPhaseShift1'" :tooltip="tooltipsConverterWizards['innerPhaseShift1']" :replaceTitle="'Primary D1'" unit="°" :min="0" :max="90" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-InnerPhaseShift1'" />
      <!-- D2: secondary intra-leg shift. DPS (usually = D1, symmetric) and TPS. -->
      <Dimension v-if="localData.modulationType === 'DPS' || localData.modulationType === 'TPS'" :name="'innerPhaseShift2'" :tooltip="tooltipsConverterWizards['innerPhaseShift2']" :replaceTitle="'Secondary D2'" unit="°" :min="0" :max="90" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-InnerPhaseShift2'" />
      <!-- D3: outer inter-bridge shift — the main power-transfer knob, used in ALL modes. -->
      <Dimension :name="'innerPhaseShift3'" :tooltip="tooltipsConverterWizards['innerPhaseShift3']" :replaceTitle="'Outer D3'" unit="°" :min="-90" :max="90" :allowNegative="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-InnerPhaseShift3'" />
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
      <Dimension :name="'seriesInductance'" :tooltip="tooltipsConverterWizards['seriesInductance']" :replaceTitle="'Series Ind.'" unit="H" :min="0" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-SeriesInductance'" />
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.useLeakageInductance" id="useLeakageInductanceDab"><label class="form-check-label small" for="useLeakageInductanceDab" :style="{ color: $styleStore.wizard.inputTextColor }">Use Leakage L</label></div>
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
        <TripleOfDimensions v-if="localData.designMode === 'I know the design I want'"
          :names="['voltage', 'current', 'turnsRatio']"
          :dataTestLabel="dataTestLabel + '-OutputsParameters-' + index"
          :replaceTitle="['V', 'I', 'n']"
          :units="['V', 'A', null]"
          :mins="[minimumMaximumScalePerParameter['voltage']['min'], minimumMaximumScalePerParameter['current']['min'], 0.01]"
          :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['current']['max'], 100]"
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

    <template v-if="dabDiagnostics" #diagnostics>
      <!-- Single-design computed quantities always flat. -->
      <DimensionReadOnly name="dabSeriesInductance" :tooltip="tooltipsConverterWizards['dabSeriesInductance']" :replaceTitle="'L series'" :value="dabDiagnostics.computedSeriesInductance" unit="H" :numberDecimals="9" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-DabSeriesInductance'" />

      <!-- Per-OP table for the last_* fields that vary across V_in. -->
      <table
        v-if="Array.isArray(dabDiagnostics.perOp) && dabDiagnostics.perOp.length > 1"
        class="diagnostics-perop-table"
        :data-cy="dataTestLabel + '-Dab-perOp-table'"
        :style="{ color: $styleStore.wizard.inputTextColor, fontSize: $styleStore.wizard.inputFontSize, width: '100%', borderCollapse: 'collapse', marginTop: '4px' }"
      >
        <thead>
          <tr>
            <th :style="{ textAlign: 'left', padding: '2px 4px', fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }"></th>
            <th v-for="(op, i) in dabDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px', fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }">
              {{ op.operatingPointName || ('OP ' + i) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Modulation</td><td v-for="(op, i) in dabDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ dabModLabel(op.modulationType) }}</td></tr>
          <tr><td>D3 (°)</td><td v-for="(op, i) in dabDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.computedD3Deg).toFixed(1) }}</td></tr>
          <tr><td>d = N·V₂/V₁</td><td v-for="(op, i) in dabDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.voltageConversionRatio).toFixed(3) }}</td></tr>
          <tr><td>ZVS primary (°)</td><td v-for="(op, i) in dabDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px', color: op.zvsMarginPrimaryDeg <= 0 ? '#e0b020' : 'inherit' }">{{ Number(op.zvsMarginPrimaryDeg).toFixed(1) }}</td></tr>
          <tr><td>ZVS secondary (°)</td><td v-for="(op, i) in dabDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px', color: op.zvsMarginSecondaryDeg <= 0 ? '#e0b020' : 'inherit' }">{{ Number(op.zvsMarginSecondaryDeg).toFixed(1) }}</td></tr>
        </tbody>
      </table>
      <template v-else>
        <DimensionReadOnly name="dabModulation" :tooltip="tooltipsConverterWizards['dabModulation']" :replaceTitle="'Modulation'" :value="dabModLabel(dabDiagnostics.modulationType)" :unit="null" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-DabModulation'" />
        <DimensionReadOnly name="dabD3" :tooltip="tooltipsConverterWizards['dabD3']" :replaceTitle="'D3 computed'" :value="dabDiagnostics.computedD3Deg" unit="°" :numberDecimals="1" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-DabD3'" />
        <DimensionReadOnly name="dabVoltageRatio" :tooltip="tooltipsConverterWizards['dabVoltageRatio']" :replaceTitle="'d = N·V₂/V₁'" :value="dabDiagnostics.voltageConversionRatio" :unit="null" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-DabVoltageRatio'" />
        <DimensionReadOnly name="dabZvsPrimary" :tooltip="tooltipsConverterWizards['dabZvsPrimary']" :replaceTitle="'ZVS primary'" :value="dabDiagnostics.zvsMarginPrimaryDeg" unit="°" :numberDecimals="1" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="dabDiagnostics.zvsMarginPrimaryDeg <= 0 ? 'text-warning' : $styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-DabZvsPrimary'" />
        <DimensionReadOnly name="dabZvsSecondary" :tooltip="tooltipsConverterWizards['dabZvsSecondary']" :replaceTitle="'ZVS secondary'" :value="dabDiagnostics.zvsMarginSecondaryDeg" unit="°" :numberDecimals="1" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="dabDiagnostics.zvsMarginSecondaryDeg <= 0 ? 'text-warning' : $styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-DabZvsSecondary'" />
      </template>
    </template>
  </ConverterWizardBase>
</template>
