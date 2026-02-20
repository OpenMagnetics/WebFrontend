<script setup>
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
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
      outputVoltage: 48, outputPower: 1000, switchingFrequency: 100000,
      phaseShift: 0.1, maxPhaseShift: 0.8, efficiency: 0.97,
      seriesInductance: 0, useLeakageInductance: true,
      rectifierType: 'Full Bridge', magnetizingInductance: 1e-3,
      turnsRatio: 4.0, ambientTemperature: 25, insulationType: 'Basic',
    };
    const insulationTypes = ['No', 'Basic', 'Reinforced'];
    const rectifierOptions = ['Full Bridge', 'Center Tapped', 'Current Doubler'];
    return {
      masStore, taskQueueStore, localData, insulationTypes, rectifierOptions,
      errorMessage: "", simulatingWaveforms: false, waveformSource: '', waveformError: "",
      magneticWaveforms: [], converterWaveforms: [], designRequirements: null,
      simulatedTurnsRatios: null, simulatedOperatingPoints: [], numberOfPeriods: 2, numberOfSteadyStatePeriods: 1,
      waveformViewMode: 'magnetic',
      forceWaveformUpdate: 0,
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
        desiredInductance: this.localData.magnetizingInductance, desiredTurnsRatios: [this.localData.turnsRatio],
        operatingPoints: [{ outputVoltages: [this.localData.outputVoltage], outputCurrents: [this.localData.outputPower / this.localData.outputVoltage], phaseShift: this.localData.phaseShift, switchingFrequency: this.localData.switchingFrequency, ambientTemperature: this.localData.ambientTemperature }],
      };
    },
    getCalculateFn() { return (aux) => this.taskQueueStore.calculatePsfbInputs(aux); },
    getSimulateFn() { return (aux) => this.taskQueueStore.calculatePsfbInputs(aux); },
    getDefaultFrequency() { return this.localData.switchingFrequency; },
    getTopology() { return 'PSFB'; },
    getIsolationSides() { return ['primary', 'secondary']; },
    getInsulationType() { return this.localData.insulationType; },

    updateErrorMessage() { this.errorMessage = ""; },
    dismissError() { this.errorMessage = ""; this.waveformError = ""; },

    _buildAux() {
      return {
        inputVoltage: this.localData.inputVoltage,
        switchingFrequency: this.localData.switchingFrequency,
        phaseShift: this.localData.phaseShift,
        efficiency: this.localData.efficiency,
        seriesInductance: this.localData.seriesInductance,
        useLeakageInductance: this.localData.useLeakageInductance,
        rectifierType: this.localData.rectifierType,
        maximumPhaseShift: this.localData.maxPhaseShift,
        desiredInductance: this.localData.magnetizingInductance,
        desiredTurnsRatios: [this.localData.turnsRatio],
        operatingPoints: [{
          outputVoltages: [this.localData.outputVoltage],
          outputCurrents: [this.localData.outputPower / this.localData.outputVoltage],
          phaseShift: this.localData.phaseShift,
          switchingFrequency: this.localData.switchingFrequency,
          ambientTemperature: this.localData.ambientTemperature,
        }]
      };
      aux['numberOfPeriods'] = parseInt(this.numberOfPeriods, 10);
      aux['numberOfSteadyStatePeriods'] = parseInt(this.numberOfSteadyStatePeriods, 10);
      return aux;
    },

    _buildAuxAnalytical() {
      const aux = {
        inputVoltage: this.localData.inputVoltage,
        switchingFrequency: this.localData.switchingFrequency,
        phaseShift: this.localData.phaseShift,
        efficiency: this.localData.efficiency,
        seriesInductance: this.localData.seriesInductance,
        useLeakageInductance: this.localData.useLeakageInductance,
        rectifierType: this.localData.rectifierType,
        maximumPhaseShift: this.localData.maxPhaseShift,
        desiredInductance: this.localData.magnetizingInductance,
        desiredTurnsRatios: [this.localData.turnsRatio],
        operatingPoints: [{
          outputVoltages: [this.localData.outputVoltage],
          outputCurrents: [this.localData.outputPower / this.localData.outputVoltage],
          phaseShift: this.localData.phaseShift,
          switchingFrequency: this.localData.switchingFrequency,
          ambientTemperature: this.localData.ambientTemperature,
        }]
      };
      aux['numberOfPeriods'] = parseInt(this.numberOfPeriods, 10);
      return aux;
    },

    async process() {
      this.masStore.resetMas("power");
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
  },
}
</script>

<template>
  <ConverterWizardBase
    ref="base"
    title="PSFB Wizard" titleIcon="fa-angles-right"
    subtitle="Phase-Shifted Full Bridge Converter"
    :col1Width="3" :col2Width="4" :col3Width="5"
    :magneticWaveforms="magneticWaveforms" :converterWaveforms="converterWaveforms"
    :simulatingWaveforms="simulatingWaveforms" :waveformSource="waveformSource"
    :waveformError="waveformError" :errorMessage="errorMessage"
    :numberOfPeriods="numberOfPeriods" :numberOfSteadyStatePeriods="numberOfSteadyStatePeriods"
    :disableActions="errorMessage != ''"
    @update:numberOfPeriods="numberOfPeriods = $event"
    @update:numberOfSteadyStatePeriods="numberOfSteadyStatePeriods = $event"
    @get-analytical-waveforms="getAnalyticalWaveforms"
    @get-simulated-waveforms="simulateIdealWaveforms"
    @dismiss-error="dismissError"
  >
    <template #conditions>
      <Dimension :name="'switchingFrequency'" :replaceTitle="'Sw. Freq'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'phaseShift'" :replaceTitle="'Ph. Shift'" :unit="null" :min="0" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'maxPhaseShift'" :replaceTitle="'Max Ph'" :unit="null" :min="0" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'ambientTemperature'" :replaceTitle="'Temp'" unit=" C" :min="minimumMaximumScalePerParameter['temperature']['min']" :max="minimumMaximumScalePerParameter['temperature']['max']" :allowNegative="true" :allowZero="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'efficiency'" :replaceTitle="'Eff'" unit="%" :visualScale="100" :min="0.5" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <ElementFromList :name="'insulationType'" :replaceTitle="'Insul'" :options="insulationTypes" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
    </template>

    <template #design-or-switch-parameters-title>
      <div class="compact-header"><i class="fa-solid fa-cogs me-1"></i>Transformer</div>
    </template>

    <template #design-or-switch-parameters>
      <Dimension :name="'turnsRatio'" :replaceTitle="'Turns'" :unit="null" :min="0.1" :max="100" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'magnetizingInductance'" :replaceTitle="'Mag L'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'seriesInductance'" :replaceTitle="'Ser L'" unit="H" :min="0" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <ElementFromList :name="'rectifierType'" :replaceTitle="'Rectifier'" :options="rectifierOptions" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.useLeakageInductance" id="useLeakageInductance"><label class="form-check-label small" for="useLeakageInductance" :style="{ color: $styleStore.wizard.inputTextColor }">Use Leakage L</label></div>
    </template>

    <template #col1-footer>
      <div class="d-flex align-items-center justify-content-between mt-2">
        <span v-if="errorMessage" class="error-text"><i class="fa-solid fa-exclamation-triangle me-1"></i>{{ errorMessage }}</span>
        <span v-else></span>
        <div class="action-btns">
          <button :disabled="errorMessage != ''" class="action-btn-sm secondary" @click="processAndReview"><i class="fa-solid fa-magnifying-glass me-1"></i>Review Specs</button>
          <button :disabled="errorMessage != ''" class="action-btn-sm primary" @click="processAndAdvise"><i class="fa-solid fa-wand-magic-sparkles me-1"></i>Design Magnetic</button>
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
  </ConverterWizardBase>
</template>
