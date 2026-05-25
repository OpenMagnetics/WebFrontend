<script setup>
import { InsulationType, IsolationSide, Topologies } from 'WebSharedComponents/assets/ts/MAS.ts'
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import DimensionReadOnly from 'WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromList from 'WebSharedComponents/DataInput/ElementFromList.vue'
import ElementFromListRadio from 'WebSharedComponents/DataInput/ElementFromListRadio.vue'
import PairOfDimensions from 'WebSharedComponents/DataInput/PairOfDimensions.vue'
import { defaultClllcWizardInputs, minimumMaximumScalePerParameter } from 'WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
import CompactVoltageInput from './CompactVoltageInput.vue'
import { tooltipsConverterWizards, dropdownLabelsConverterWizards } from 'WebSharedComponents/assets/js/texts'
</script>

<script>
// CLLLC wizard — bidirectional 5-element symmetric resonant converter
// (Lr_p / Cr_p / Lm / Cr_s / Lr_s). Help-me-design flow drives the
// solver from Q + primaryResonantFrequency; advanced flow takes
// desiredTurnsRatios + desiredMagnetizingInductance (+ optional Lr_p
// and Cr_p) and calls calculate_advanced_clllc_inputs via embind.
// Single output (backend enforces).
//
// KNOWN GAP: AdvancedClllc::process is a stub in
// MKF/src/converter_models/Clllc.cpp and throws
// "not yet implemented. Depends on Clllc::process_operating_points".
// The designLevel toggle is kept exposed so the UI stays consistent with
// the other 4 new wizards (WIZARDS_GUIDE §0 Rule 1); the advanced branch
// will start working once the MKF algorithm lands. The dual-mode smoke
// test (tests/new-wizards-smoke.spec.js) intentionally skips the advanced
// click for CLLLC until then.
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: 'ClllcWizard',
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const insulationTypes = ['no', 'basic', 'reinforced'];
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        const localData = deepCopy(defaultClllcWizardInputs);
        return {
            clllcDiagnostics: null,
            masStore,
            taskQueueStore, dropdownLabelsConverterWizards,
            insulationTypes,
            designLevelOptions,
            localData,
            errorMessage: "",
            simulatingWaveforms: false,
            waveformSource: null,
            waveformError: "",
            simulatedOperatingPoints: [],
            simulatedMagnetizingInductance: null,
            simulatedTurnsRatios: null,
            designRequirements: null,
            magneticWaveforms: [],
            converterWaveforms: [],
            waveformViewMode: 'magnetic',
            forceWaveformUpdate: 0,
            numberOfPeriods: 2,
            numberOfSteadyStatePeriods: 50,
        }
    },
    watch: {
        waveformViewMode() {
            this.$nextTick(() => { this.forceWaveformUpdate += 1; });
        },
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
        buildParams(mode) {
            const aux = {
                highVoltageBusVoltage: this.localData.inputVoltage,
                lowVoltageBusVoltage: { nominal: this.localData.outputsParameters.voltage },
                efficiency: this.localData.efficiency,
                minSwitchingFrequency: this.localData.minSwitchingFrequency,
                maxSwitchingFrequency: this.localData.maxSwitchingFrequency,
                operatingPoints: [{
                    outputVoltages: [this.localData.outputsParameters.voltage],
                    outputCurrents: [this.localData.outputsParameters.current],
                    switchingFrequency: this.localData.nominalSwitchingFrequency,
                    ambientTemperature: this.localData.ambientTemperature,
                }],
            };
            if (this.localData.designLevel === 'I know the design I want') {
                aux['desiredTurnsRatios'] = [this.localData.turnsRatio];
                aux['desiredMagnetizingInductance'] = this.localData.magnetizingInductance;
                if (this.localData.primarySeriesInductance != null) {
                    aux['desiredPrimarySeriesInductance'] = this.localData.primarySeriesInductance;
                }
                if (this.localData.primaryResonantCapacitance != null) {
                    aux['desiredPrimaryResonantCapacitance'] = this.localData.primaryResonantCapacitance;
                }
            } else {
                aux['primaryResonantFrequency'] = this.localData.nominalSwitchingFrequency;
                aux['qualityFactor'] = this.localData.qualityFactor;
            }
            return aux;
        },
        getCalculateFn() {
            if (this.localData.designLevel === 'I know the design I want') {
                return (aux) => this.taskQueueStore.calculateAdvancedClllcInputs(aux);
            }
            return (aux) => this.taskQueueStore.calculateClllcInputs(aux);
        },
        getSimulateFn() { return (aux) => this.taskQueueStore.simulateClllcIdealWaveforms(aux); },
        getDefaultFrequency() { return this.localData.nominalSwitchingFrequency; },
        postProcessResults(result, mode) {
            this.clllcDiagnostics = result?.clllcDiagnostics ?? null;
            if (this.designRequirements) {
                this.simulatedMagnetizingInductance = this.designRequirements.magnetizingInductance?.nominal || null;
                this.simulatedTurnsRatios = this.designRequirements.turnsRatios?.map(tr => tr.nominal) || null;
            }
        },
        getTopology() { return Topologies.ClllcResonantConverter; },
        getIsolationSides() { return [IsolationSide.Primary, IsolationSide.Secondary]; },
        getInsulationType() {
            const it = (this.localData.insulationType || '').toLowerCase();
            if (it === 'reinforced') return InsulationType.Reinforced;
            if (it === 'basic') return InsulationType.Basic;
            return InsulationType.Functional;
        },

        updateErrorMessage() {
            this.errorMessage = "";
            const vinMin = this.localData.inputVoltage.minimum;
            const vinMax = this.localData.inputVoltage.maximum;
            if (vinMin != null && vinMax != null && vinMin > vinMax) {
                this.errorMessage = "Minimum input voltage cannot be larger than maximum input voltage";
                return;
            }
            if (this.localData.minSwitchingFrequency != null && this.localData.maxSwitchingFrequency != null
                && this.localData.minSwitchingFrequency > this.localData.maxSwitchingFrequency) {
                this.errorMessage = "Min switching frequency cannot exceed max switching frequency";
            }
        },
        async process() {
            this.masStore.resetMas("power");
            this.$stateStore.closeCoilAdvancedInfo();
            try {
                const result = await this.$refs.base.processWizardData(this, this.taskQueueStore);
                if (!result.success) { this.errorMessage = result.error; return; }
                this.designRequirements = result.designRequirements;
                this.errorMessage = "";
            } catch (error) {
                console.error(error);
                this.errorMessage = error.message || error;
            }
        },
        async processAndReview() {
            await this.process();
            if (this.errorMessage == "") {
                await this.$refs.base.navigateToReview(this.$stateStore, this.masStore, "Power");
                if (this.errorMessage == "") {
                    setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);}, 100);
                } else {
                    setTimeout(() => {this.errorMessage = ""}, 5000);
                }
            }
        },
        async processAndAdvise() {
            await this.process();
            if (this.errorMessage == "") {
                await this.$refs.base.navigateToAdvise(this.$stateStore, this.masStore, "Power");
                if (this.errorMessage == "") {
                    setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);}, 100);
                } else {
                    setTimeout(() => {this.errorMessage = ""}, 5000);
                }
            }
        },
        async simulateIdealWaveforms() { await this.$refs.base.executeWaveformAction(this, 'simulation'); },
        async getAnalyticalWaveforms() { await this.$refs.base.executeWaveformAction(this, 'analytical'); },
        async getSpiceCode() { await this.$refs.base.generateSpiceCode(this); },
    }
}
</script>

<template>
  <ConverterWizardBase
    ref="base"
    title="CLLLC Wizard"
    titleIcon="bi bi-arrow-left-right"
    subtitle="Bidirectional 5-Element Symmetric Resonant Converter"
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
      <ElementFromListRadio
        :name="'designLevel'" :tooltip="tooltipsConverterWizards['designLevel']"
        :dataTestLabel="dataTestLabel + '-DesignLevel'"
        :replaceTitle="''" :options="designLevelOptions" :titleSameRow="false"
        v-model="localData"
        :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-12'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="'transparent'"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
    </template>

    <template #design-or-switch-parameters-title>
      <div class="compact-header"><i class="bi bi-gear-wide-connected me-1"></i>{{ localData.designLevel == 'I know the design I want' ? 'Design Params' : 'Tank' }}</div>
    </template>

    <template #design-or-switch-parameters>
      <div v-if="localData.designLevel == 'I know the design I want'">
        <Dimension :name="'magnetizingInductance'" :tooltip="tooltipsConverterWizards['magnetizingInductance']" :replaceTitle="'Lm'" unit="H"
          :dataTestLabel="dataTestLabel + '-MagnetizingInductance'"
          :min="minimumMaximumScalePerParameter['inductance']['min']"
          :max="minimumMaximumScalePerParameter['inductance']['max']"
          v-model="localData"
          :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />
        <Dimension :name="'turnsRatio'" :tooltip="tooltipsConverterWizards['turnsRatio']" :replaceTitle="'Turns ratio'" :unit="null"
          :dataTestLabel="dataTestLabel + '-TurnsRatio'"
          :min="0.01" :max="100"
          v-model="localData"
          :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />
        <Dimension :name="'primarySeriesInductance'" :tooltip="tooltipsConverterWizards['primarySeriesInductance']" :replaceTitle="'Lr_p'" unit="H"
          :dataTestLabel="dataTestLabel + '-PrimarySeriesInductance'"
          :min="minimumMaximumScalePerParameter['inductance']['min']"
          :max="minimumMaximumScalePerParameter['inductance']['max']"
          v-model="localData"
          :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />
        <Dimension :name="'primaryResonantCapacitance'" :tooltip="tooltipsConverterWizards['primaryResonantCapacitance']" :replaceTitle="'Cr_p'" unit="F"
          :dataTestLabel="dataTestLabel + '-PrimaryResonantCapacitance'"
          :min="1e-12" :max="1e-3"
          v-model="localData"
          :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />
      </div>
      <Dimension v-else :name="'qualityFactor'" :tooltip="tooltipsConverterWizards['qualityFactor']" :replaceTitle="'Q Factor'" :unit="null"
        :dataTestLabel="dataTestLabel + '-QualityFactor'"
        :min="0.1" :max="2"
        v-model="localData"
        :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
    </template>

    <template #conditions>
      <Dimension :name="'minSwitchingFrequency'" :tooltip="tooltipsConverterWizards['minSwitchingFrequency']" :replaceTitle="'Min. Frequency'" unit="Hz"
        :dataTestLabel="dataTestLabel + '-MinSwitchingFrequency'"
        :min="minimumMaximumScalePerParameter['frequency']['min']"
        :max="minimumMaximumScalePerParameter['frequency']['max']"
        v-model="localData"
        :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <Dimension :name="'maxSwitchingFrequency'" :tooltip="tooltipsConverterWizards['maxSwitchingFrequency']" :replaceTitle="'Max. Frequency'" unit="Hz"
        :dataTestLabel="dataTestLabel + '-MaxSwitchingFrequency'"
        :min="minimumMaximumScalePerParameter['frequency']['min']"
        :max="minimumMaximumScalePerParameter['frequency']['max']"
        v-model="localData"
        :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <Dimension :name="'nominalSwitchingFrequency'" :tooltip="tooltipsConverterWizards['nominalSwitchingFrequency']" :replaceTitle="'Nom. Frequency'" unit="Hz"
        :dataTestLabel="dataTestLabel + '-NominalSwitchingFrequency'"
        :min="minimumMaximumScalePerParameter['frequency']['min']"
        :max="minimumMaximumScalePerParameter['frequency']['max']"
        v-model="localData"
        :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <Dimension :name="'ambientTemperature'" :tooltip="tooltipsConverterWizards['ambientTemperature']" :replaceTitle="'Temperature'" unit=" C"
        :dataTestLabel="dataTestLabel + '-AmbientTemperature'"
        :min="minimumMaximumScalePerParameter['temperature']['min']"
        :max="minimumMaximumScalePerParameter['temperature']['max']"
        :allowNegative="true" :allowZero="true"
        v-model="localData"
        :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <Dimension :name="'diodeVoltageDrop'" :tooltip="tooltipsConverterWizards['diodeVoltageDrop']" :replaceTitle="'Diode Vd'" unit="V"
        :dataTestLabel="dataTestLabel + '-DiodeVoltageDrop'"
        :min="0" :max="10"
        v-model="localData"
        :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <Dimension :name="'efficiency'" :tooltip="tooltipsConverterWizards['efficiency']" :replaceTitle="'Efficiency'" unit="%" :visualScale="100"
        :dataTestLabel="dataTestLabel + '-Efficiency'"
        :min="0.5" :max="1"
        v-model="localData"
        :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <ElementFromList :name="'insulationType'" :tooltip="tooltipsConverterWizards['insulationType']" :replaceTitle="'Insulation'" :options="insulationTypes" :optionLabels="dropdownLabelsConverterWizards.insulationType"
        :dataTestLabel="dataTestLabel + '-InsulationType'"
        :titleSameRow="true" v-model="localData"
        :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
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
      <CompactVoltageInput
        :name="'inputVoltage'" :tooltip="tooltipsConverterWizards['inputVoltage']"
        :dataTestLabel="dataTestLabel + '-InputVoltage'"
        unit="V" :modelValue="localData.inputVoltage" @update="updateErrorMessage"
      />
    </template>

    <template #outputs>
      <PairOfDimensions
        :names="['voltage', 'current']"
        :replaceTitle="['Vout', 'Iout']"
        :units="['V', 'A']"
        :mins="[minimumMaximumScalePerParameter['voltage']['min'], minimumMaximumScalePerParameter['current']['min']]"
        :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['current']['max']]"
        v-model="localData.outputsParameters"
        :dataTestLabel="dataTestLabel + '-OutputsParameters'"
        :labelWidthProportionClass="'col-2'"
        :valueWidthProportionClass="'col-10'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'"
        :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
    </template>
      <template v-if="clllcDiagnostics" #diagnostics>
      <DimensionReadOnly name="clllcLrPri" :tooltip="tooltipsConverterWizards['clllcLrPri']" :replaceTitle="'L_r pri'" :value="clllcDiagnostics.computedPrimarySeriesInductance" unit="H" :numberDecimals="9":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-ClllcLrPri'" />
      <DimensionReadOnly name="clllcLrSec" :tooltip="tooltipsConverterWizards['clllcLrSec']" :replaceTitle="'L_r sec'" :value="clllcDiagnostics.computedSecondarySeriesInductance" unit="H" :numberDecimals="9":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-ClllcLrSec'" />
      <DimensionReadOnly name="clllcCrPri" :tooltip="tooltipsConverterWizards['clllcCrPri']" :replaceTitle="'C_r pri'" :value="clllcDiagnostics.computedPrimaryResonantCapacitance" unit="F" :numberDecimals="12":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-ClllcCrPri'" />
      <DimensionReadOnly name="clllcCrSec" :tooltip="tooltipsConverterWizards['clllcCrSec']" :replaceTitle="'C_r sec'" :value="clllcDiagnostics.computedSecondaryResonantCapacitance" unit="F" :numberDecimals="12":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-ClllcCrSec'" />
      <DimensionReadOnly name="clllcLm" :tooltip="tooltipsConverterWizards['clllcLm']" :replaceTitle="'L_m'" :value="clllcDiagnostics.computedMagnetizingInductance" unit="H" :numberDecimals="9":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-ClllcLm'" />
      <DimensionReadOnly name="clllcN" :tooltip="tooltipsConverterWizards['clllcN']" :replaceTitle="'Turns ratio'" :value="clllcDiagnostics.computedTurnsRatio" :unit="null" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-ClllcN'" />
      <DimensionReadOnly name="clllcDeadTime" :tooltip="tooltipsConverterWizards['clllcDeadTime']" :replaceTitle="'Dead time'" :value="clllcDiagnostics.computedDeadTime" unit="s" :numberDecimals="9":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-ClllcDeadTime'" />
      <DimensionReadOnly name="clllcK" :tooltip="tooltipsConverterWizards['clllcK']" :replaceTitle="'L_m / L_r ratio'" :value="clllcDiagnostics.computedInductanceRatioK" :unit="null" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-ClllcK'" />
      <DimensionReadOnly name="clllcQ" :tooltip="tooltipsConverterWizards['clllcQ']" :replaceTitle="'Quality factor'" :value="clllcDiagnostics.computedQualityFactor" :unit="null" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-ClllcQ'" />
      <DimensionReadOnly name="clllcFres" :tooltip="tooltipsConverterWizards['clllcFres']" :replaceTitle="'Res. freq'" :value="clllcDiagnostics.computedPrimaryResonantFrequency" unit="Hz" :numberDecimals="0":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-ClllcFres'" />

      <!-- Per-OP table for the last_* fields that vary across V_in. -->
      <table
        v-if="Array.isArray(clllcDiagnostics.perOp) && clllcDiagnostics.perOp.length > 1"
        class="diagnostics-perop-table"
        :data-cy="dataTestLabel + '-Clllc-perOp-table'"
        :style="{ color: $styleStore.wizard.inputTextColor, fontSize: $styleStore.wizard.inputFontSize, width: '100%', borderCollapse: 'collapse', marginTop: '4px' }"
      >
        <thead>
          <tr>
            <th :style="{ textAlign: 'left', padding: '2px 4px', fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }"></th>
            <th v-for="(op, i) in clllcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px', fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }">
              {{ op.operatingPointName || ('OP ' + i) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Mode fwd</td><td v-for="(op, i) in clllcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ op.modeForward }}</td></tr>
          <tr><td>Mode rev</td><td v-for="(op, i) in clllcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ op.modeReverse }}</td></tr>
          <tr><td>ZVS pri lag</td><td v-for="(op, i) in clllcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px', color: op.zvsMarginPrimaryLagging <= 0 ? '#e0b020' : 'inherit' }">{{ Number(op.zvsMarginPrimaryLagging).toFixed(3) }}</td></tr>
          <tr><td>ZVS sec lag</td><td v-for="(op, i) in clllcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px', color: op.zvsMarginSecondaryLagging <= 0 ? '#e0b020' : 'inherit' }">{{ Number(op.zvsMarginSecondaryLagging).toFixed(3) }}</td></tr>
          <tr><td>ZVS load thr pri (A)</td><td v-for="(op, i) in clllcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.zvsLoadThresholdPrimary).toFixed(3) }}</td></tr>
          <tr><td>ZVS load thr sec (A)</td><td v-for="(op, i) in clllcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.zvsLoadThresholdSecondary).toFixed(3) }}</td></tr>
          <tr><td>Res. Trans. (s)</td><td v-for="(op, i) in clllcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.resonantTransitionTime).toExponential(2) }}</td></tr>
          <tr><td>I_pri peak (A)</td><td v-for="(op, i) in clllcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.primaryPeakCurrent).toFixed(3) }}</td></tr>
          <tr><td>I_sec peak (A)</td><td v-for="(op, i) in clllcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.secondaryPeakCurrent).toFixed(3) }}</td></tr>
          <tr><td>I_pri rms (A)</td><td v-for="(op, i) in clllcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.primaryRmsCurrent).toFixed(3) }}</td></tr>
          <tr><td>I_sec rms (A)</td><td v-for="(op, i) in clllcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.secondaryRmsCurrent).toFixed(3) }}</td></tr>
          <tr><td>I_mag peak (A)</td><td v-for="(op, i) in clllcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.magnetizingPeakCurrent).toFixed(3) }}</td></tr>
          <tr><td>V_Cr1 peak (V)</td><td v-for="(op, i) in clllcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.cr1PeakVoltage).toFixed(2) }}</td></tr>
          <tr><td>V_Cr2 peak (V)</td><td v-for="(op, i) in clllcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.cr2PeakVoltage).toFixed(2) }}</td></tr>
          <tr><td>Sharing ratio</td><td v-for="(op, i) in clllcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.currentSharingRatio).toFixed(3) }}</td></tr>
          <tr><td>Residual</td><td v-for="(op, i) in clllcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px', color: op.steadyStateResidual > 1e-4 ? '#e0b020' : 'inherit' }">{{ Number(op.steadyStateResidual).toExponential(2) }}</td></tr>
        </tbody>
      </table>
      <template v-else>
        <DimensionReadOnly name="clllcIprimPk" :tooltip="tooltipsConverterWizards['clllcIprimPk']" :replaceTitle="'I_pri peak'" :value="clllcDiagnostics.lastPrimaryPeakCurrent" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-ClllcIprimPk'" />
        <DimensionReadOnly name="clllcZvsMargin" :tooltip="tooltipsConverterWizards['clllcZvsMargin']" :replaceTitle="'ZVS margin (lag)'" :value="clllcDiagnostics.lastZvsMarginPrimaryLagging" :unit="null" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-ClllcZvsMargin'" />
      </template>
    </template>
  </ConverterWizardBase>
</template>
