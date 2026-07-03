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
import { minimumMaximumScalePerParameter, defaultDesignRequirements } from 'WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
import KhDiagnosticsPanel from './KhDiagnosticsPanel.vue'
import CompactVoltageInput from './CompactVoltageInput.vue'
import { tooltipsConverterWizards, dropdownLabelsConverterWizards } from 'WebSharedComponents/assets/js/texts'
</script>

<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: 'CllcWizard',
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        // Defaults: HV-DC bidirectional charger reference design (CLLC Telecom-500W class).
        // Single output (backend enforces this — libMKF.cpp:8348).
        const localData = {
            inputVoltage: { nominal: 400, tolerance: 0.1 },
            bridgeType: 'fullBridge',  // CLLC requires camelCase enum (strict MAS schema validation).
            outputsParameters: [{ voltage: 400, power: 3300 }],
            minSwitchingFrequency: 80000,
            maxSwitchingFrequency: 200000,
            resonantFrequency: 120000,
            operatingSwitchingFrequency: 120000,
            qualityFactor: 0.4,
            inductanceRatio: 5,
            integratedResonantInductor1: true,   // primary leakage as Lr1
            integratedResonantInductor2: false,  // discrete Lr2 by default
            magnetizingInductance: 200e-6,
            turnsRatio: 1.0,
            bidirectional: false,
            resonantInductorRatio: 1.0,          // a = n^2 * Lr2 / Lr1, symmetric tank
            resonantCapacitorRatio: 1.0,         // b = Cr2 / (n^2 * Cr1), symmetric tank
            powerFlow: 'forward',
            ambientTemperature: 25,
            efficiency: 0.97,
            insulationType: IsolationClass.Basic,
            designMode: designLevelOptions[0],
            overridePrimaryResonantInductance: false,
            primaryResonantInductance: 40e-6,
            overrideSecondaryResonantInductance: false,
            secondaryResonantInductance: 40e-6,
            overrideResonantCapacitance: false,
            resonantCapacitance: 44e-9,
        };
        const insulationTypes = ['no', 'basic', 'reinforced'];
        return {
            masStore,
            taskQueueStore, dropdownLabelsConverterWizards,
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
            cllcDiagnostics: null,
        }
    },
    computed: {
        wizardSubtitle() {
            return "Bidirectional Resonant DC-DC Converter";
        },
    },
    watch: {
        waveformViewMode() {
            this.$nextTick(() => {
                this.forceWaveformUpdate += 1;
            });
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

    // ===== WIZARD CONTRACT =====
    buildParams(mode) {
      const opFreq = this.localData.operatingSwitchingFrequency || this.localData.resonantFrequency;
      const outs = this.localData.outputsParameters || [];
      const out0 = outs[0] || { voltage: 400, power: 3300 };
      const aux = {
        inputVoltage: this.localData.inputVoltage,
        bridgeType: this.localData.bridgeType || 'fullBridge',
        minSwitchingFrequency: this.localData.minSwitchingFrequency,
        maxSwitchingFrequency: this.localData.maxSwitchingFrequency,
        resonantFrequency: this.localData.resonantFrequency,
        qualityFactor: this.localData.qualityFactor,
        inductanceRatio: this.localData.inductanceRatio,
        integratedResonantInductor1: this.localData.integratedResonantInductor1,
        integratedResonantInductor2: this.localData.integratedResonantInductor2,
        bidirectional: this.localData.bidirectional,
        resonantInductorRatio: this.localData.resonantInductorRatio,
        resonantCapacitorRatio: this.localData.resonantCapacitorRatio,
        // CLLC is single-output (backend enforces this).
        operatingPoints: [{
          outputVoltages: [out0.voltage],
          outputCurrents: [out0.voltage > 0 ? out0.power / out0.voltage : 0],
          switchingFrequency: opFreq,
          ambientTemperature: this.localData.ambientTemperature,
          powerFlow: this.localData.powerFlow,
        }],
      };
      // desiredTurnsRatios + desiredMagnetizingInductance are required by
      // AdvancedCllc::from_json (j.at(...) — throws if missing). Always send
      // them: seed values in help-me, pinned values in I-know.
      aux.desiredTurnsRatios = [this.localData.turnsRatio];
      aux.desiredMagnetizingInductance = this.localData.magnetizingInductance;
      // Backend keys are desiredResonant{Inductance,Capacitance}{Primary,Secondary}
      // — not the legacy `desiredPrimary*` form. Field order matters: noun
      // before primary/secondary suffix.
      if (this.localData.overridePrimaryResonantInductance && this.localData.primaryResonantInductance > 0) {
        aux.desiredResonantInductancePrimary = this.localData.primaryResonantInductance;
      }
      if (this.localData.overrideSecondaryResonantInductance && this.localData.secondaryResonantInductance > 0) {
        aux.desiredResonantInductanceSecondary = this.localData.secondaryResonantInductance;
      }
      if (this.localData.overrideResonantCapacitance && this.localData.resonantCapacitance > 0) {
        // Wizard exposes a single Cr; MKF derives secondary from
        // resonantCapacitorRatio. Pin only the primary here.
        aux.desiredResonantCapacitancePrimary = this.localData.resonantCapacitance;
      }
      if (mode === 'simulation') {
        aux.magnetizingInductance = this.localData.magnetizingInductance;
        aux.turnsRatio = this.localData.turnsRatio;
      }
      return aux;
    },
    getCalculateFn() { return (aux) => this.taskQueueStore.calculateCllcInputs(aux); },
    getSimulateFn() { return (aux) => this.taskQueueStore.simulateCllcIdealWaveforms(aux); },
    getDefaultFrequency() { return this.localData.resonantFrequency; },
    postProcessResults(result, mode) {
      this.cllcDiagnostics = result?.cllcDiagnostics || null;
      // CLLC does not export computedResonantInductance the same way LLC does;
      // simulated values come from the backend's process_operating_points.
      this.simulatedMagnetizingInductance = result?.computedMagnetizingInductance || this.localData.magnetizingInductance;
      if (this.designRequirements) {
        this.simulatedTurnsRatios = this.designRequirements.turnsRatios?.map(tr => tr.nominal) || [this.localData.turnsRatio];
      }
    },

        updateErrorMessage() { this.errorMessage = ""; },

        // Wizard-specific methods for base class
        buildInputs() {
            return this.buildParams('analytical');
        },

        hasSimulatedData() {
            return this.simulatedOperatingPoints && this.simulatedOperatingPoints.length > 0;
        },

        getFrequency() {
            return this.localData.resonantFrequency;
        },

        getTopology() {
            return Topology.CllcResonantConverter;
        },

        getIsolationSides() {
            // CLLC: 1 primary + 1 secondary winding (no center-tap — secondary is also a bridge).
            return [IsolationSide.Primary, IsolationSide.Secondary];
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

        resolveDimensionValue(dimObj) {
            if (!dimObj) return null;
            if (dimObj.nominal !== undefined && dimObj.nominal !== null) return dimObj.nominal;
            if (dimObj.minimum !== undefined && dimObj.minimum !== null) return dimObj.minimum;
            if (dimObj.maximum !== undefined && dimObj.maximum !== null) return dimObj.maximum;
            return null;
        },

        getComputedMagnetizingInductance() {
            if (!this.designRequirements?.magnetizingInductance) return null;
            return this.resolveDimensionValue(this.designRequirements.magnetizingInductance);
        },

        getComputedTurnsRatio() {
            if (!this.designRequirements?.turnsRatios?.length) return null;
            const tr = this.designRequirements.turnsRatios[0];
            return this.resolveDimensionValue(tr);
        },

        hasComputedTankValues() {
            return this.designRequirements != null;
        },

        // === CLLC diagnostics helpers ===
        // Backend get_last_mode() returns 1..3 (mode 1 = above resonance / Mode 1,
        // mode 2 = at/near resonance, mode 3 = below resonance / DCMA), 0 = unknown.
        cllcModeLabel(mode) {
            const labels = {
                0: 'Unknown',
                1: 'Mode 1 - Contains F segment (with F)',
                2: 'Mode 2 - Above resonance (P-only, ratio >= 0.9)',
                3: 'Mode 3 - Below resonance (P-only, ratio < 0.9)',
            };
            return labels[mode] ?? `Mode ${mode}`;
        },
        formatSi(value, unit, decimals = 3) {
            if (value == null || !isFinite(value)) return '-';
            const abs = Math.abs(value);
            const steps = [
                { t: 1e9,  s: 'G' }, { t: 1e6,  s: 'M' }, { t: 1e3,  s: 'k' },
                { t: 1,    s: ''  },
                { t: 1e-3, s: 'm' }, { t: 1e-6, s: 'u' }, { t: 1e-9, s: 'n' }, { t: 1e-12, s: 'p' },
            ];
            for (const { t, s } of steps) {
                if (abs >= t || t === 1e-12) {
                    return `${(value / t).toFixed(decimals)} ${s}${unit}`;
                }
            }
            return `${value.toExponential(decimals)} ${unit}`;
        },
        formatDiagNumber(value) {
            if (value == null || !isFinite(value)) return '-';
            if (Math.abs(value) < 1e-3 || Math.abs(value) >= 1e6) return value.toExponential(3);
            return value.toFixed(6);
        },

                                        },
}

</script>

<template>
  <ConverterWizardBase
    ref="base"
    title="CLLC Wizard"
    titleIcon="pi pi-arrow-right-arrow-left"
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
      <div class="compact-header"><i class="pi pi-cog-wide-connected mr-1"></i>Tank</div>
    </template>

    <template #design-or-switch-parameters>
      <Dimension :name="'qualityFactor'" :tooltip="tooltipsConverterWizards['qualityFactor']" :replaceTitle="'Q Factor'" :unit="null" :min="0.1" :max="2" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-QualityFactor'" />
      <Dimension :name="'inductanceRatio'" :tooltip="tooltipsConverterWizards['inductanceRatio']" :replaceTitle="'Ln Ratio'" :unit="null" :min="2" :max="20" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-InductanceRatio'" />
      <Dimension :name="'resonantInductorRatio'" :tooltip="tooltipsConverterWizards['resonantInductorRatio']" :replaceTitle="'Inductor Ratio (a)'" :unit="null" :min="0.5" :max="2.0" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-ResonantInductorRatio'" />
      <Dimension :name="'resonantCapacitorRatio'" :tooltip="tooltipsConverterWizards['resonantCapacitorRatio']" :replaceTitle="'Capacitor Ratio (b)'" :unit="null" :min="0.5" :max="2.0" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-ResonantCapacitorRatio'" />
      <template v-if="localData.designMode === 'I know the design I want'">
        <Dimension :name="'turnsRatio'" :tooltip="tooltipsConverterWizards['turnsRatio']" :replaceTitle="'Turns'" :unit="null" :min="0.1" :max="100" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-TurnsRatio'" />
        <Dimension :name="'magnetizingInductance'" :tooltip="tooltipsConverterWizards['magnetizingInductance']" :replaceTitle="'Mag. Inductance'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-MagnetizingInductance'" />
      </template>
      <template v-else-if="hasComputedTankValues()">
        <DimensionReadOnly :name="'turnsRatio'" :tooltip="tooltipsConverterWizards['turnsRatio']" :replaceTitle="'Number Turns'" :unit="null" :value="getComputedTurnsRatio()" :numberDecimals="2" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-TurnsRatio'" />
        <DimensionReadOnly :name="'magnetizingInductance'" :tooltip="tooltipsConverterWizards['magnetizingInductance']" :replaceTitle="'Mag. Inductance'" unit="H" :value="getComputedMagnetizingInductance()" :numberDecimals="6" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-MagnetizingInductance'" />
      </template>
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.bidirectional" id="bidirectionalCllc"><label class="form-check-label small" for="bidirectionalCllc" :style="{ color: $styleStore.wizard.inputTextColor }">Bidirectional</label></div>
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.integratedResonantInductor1" id="integratedResonantInductor1Cllc"><label class="form-check-label small" for="integratedResonantInductor1Cllc" :style="{ color: $styleStore.wizard.inputTextColor }">Integrated Lr1 (pri. leakage)</label></div>
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.integratedResonantInductor2" id="integratedResonantInductor2Cllc"><label class="form-check-label small" for="integratedResonantInductor2Cllc" :style="{ color: $styleStore.wizard.inputTextColor }">Integrated Lr2 (sec. leakage)</label></div>

      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.overridePrimaryResonantInductance" id="overridePrimaryResonantInductanceCllc" @change="updateErrorMessage"><label class="form-check-label small" for="overridePrimaryResonantInductanceCllc" :style="{ color: $styleStore.wizard.inputTextColor }">Override Pri. Res. Ind.</label></div>
      <Dimension v-if="localData.overridePrimaryResonantInductance" :name="'primaryResonantInductance'" :tooltip="tooltipsConverterWizards['primaryResonantInductance']" :replaceTitle="'Pri. Res. Ind.'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-PrimaryResonantInductance'" />
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.overrideSecondaryResonantInductance" id="overrideSecondaryResonantInductanceCllc" @change="updateErrorMessage"><label class="form-check-label small" for="overrideSecondaryResonantInductanceCllc" :style="{ color: $styleStore.wizard.inputTextColor }">Override Sec. Res. Ind.</label></div>
      <Dimension v-if="localData.overrideSecondaryResonantInductance" :name="'secondaryResonantInductance'" :tooltip="tooltipsConverterWizards['secondaryResonantInductance']" :replaceTitle="'Sec. Res. Ind.'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-SecondaryResonantInductance'" />
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.overrideResonantCapacitance" id="overrideResonantCapacitanceCllc" @change="updateErrorMessage"><label class="form-check-label small" for="overrideResonantCapacitanceCllc" :style="{ color: $styleStore.wizard.inputTextColor }">Override Pri. Res. Cap.</label></div>
      <Dimension v-if="localData.overrideResonantCapacitance" :name="'resonantCapacitance'" :tooltip="tooltipsConverterWizards['resonantCapacitance']" :replaceTitle="'Pri. Res. Cap.'" unit="F" :min="1e-12" :max="1e-3" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-ResonantCapacitance'" />
    </template>

    <!-- Diagnostics slot: rendered by ConverterWizardBase as a generic .compact-card. -->
    <template v-if="cllcDiagnostics" #diagnostics>
      <!-- KH is the master of diagnostics: render its universal envelope directly. -->
      <KhDiagnosticsPanel :diagnostics="cllcDiagnostics" :dataTestLabel="dataTestLabel + '-KhDiagnostics'" />
    </template>

    <template #conditions>
      <Dimension :name="'minSwitchingFrequency'" :tooltip="tooltipsConverterWizards['minSwitchingFrequency']" :replaceTitle="'Min. Frequency'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-MinSwitchingFrequency'" />
      <Dimension :name="'maxSwitchingFrequency'" :tooltip="tooltipsConverterWizards['maxSwitchingFrequency']" :replaceTitle="'Max. Frequency'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-MaxSwitchingFrequency'" />
      <Dimension :name="'resonantFrequency'" :tooltip="tooltipsConverterWizards['resonantFrequency']" :replaceTitle="'Res. Frequency'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-ResonantFrequency'" />
      <Dimension :name="'operatingSwitchingFrequency'" :tooltip="tooltipsConverterWizards['operatingSwitchingFrequency']" :replaceTitle="'Op. Frequency'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-OperatingSwitchingFrequency'" />
      <Dimension :name="'ambientTemperature'" :tooltip="tooltipsConverterWizards['ambientTemperature']" :replaceTitle="'Temperature'" unit=" C" :min="minimumMaximumScalePerParameter['temperature']['min']" :max="minimumMaximumScalePerParameter['temperature']['max']" :allowNegative="true" :allowZero="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-AmbientTemperature'" />
      <Dimension :name="'efficiency'" :tooltip="tooltipsConverterWizards['efficiency']" :replaceTitle="'Efficiency'" unit="%" :visualScale="100" :min="0.5" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-Efficiency'" />
      <ElementFromList :name="'insulationType'" :tooltip="tooltipsConverterWizards['insulationType']" :replaceTitle="'Insulation'" :options="insulationTypes" :optionLabels="dropdownLabelsConverterWizards.insulationType" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-InsulationType'" />
      <!-- Bridge Type (camelCase enum per CLLC strict MAS schema) -->
      <ElementFromList :name="'bridgeType'" :tooltip="tooltipsConverterWizards['bridgeType']" :replaceTitle="'Bridge Type'" :options="['halfBridge', 'fullBridge']" :optionLabels="dropdownLabelsConverterWizards.bridgeType" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-BridgeType'" />
      <!-- Power Flow direction (per OP) -->
      <ElementFromList :name="'powerFlow'" :tooltip="tooltipsConverterWizards['powerFlow']" :replaceTitle="'Power Flow'" :options="['forward', 'reverse']" :optionLabels="dropdownLabelsConverterWizards.powerFlow" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-PowerFlow'" />
    </template>

    <template #col1-footer>
      <div class="d-flex align-items-center justify-content-between mt-2">
        <span v-if="errorMessage" class="error-text"><i class="pi pi-exclamation-triangle mr-1"></i>{{ errorMessage }}</span>
        <span v-else></span>
        <div class="action-btns">
          <button :disabled="errorMessage != ''" class="action-btn-sm secondary" @click="processAndReview"><i class="pi pi-search mr-1"></i>Review Specs</button>
          <button :disabled="errorMessage != ''" class="action-btn-sm primary" @click="processAndAdvise"><i class="pi pi-sparkles mr-1"></i>Design Magnetic</button>
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
      <!-- CLLC is single-output (backend enforces this). No numberOutputs selector. -->
      <div class="mb-2">
        <PairOfDimensions
          :names="['voltage', 'power']"
          :dataTestLabel="dataTestLabel + '-OutputsParameters'"
          :replaceTitle="['Vout', 'Pout']"
          :units="['V', 'W']"
          :mins="[minimumMaximumScalePerParameter['voltage']['min'], 1]"
          :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['power']['max']]"
          v-model="localData.outputsParameters[0]"
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
