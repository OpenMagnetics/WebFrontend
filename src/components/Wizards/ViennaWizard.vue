<script setup>
import { IsolationSide, Topology } from 'WebSharedComponents/assets/ts/MAS.ts'
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
// Vienna rectifier (3-phase, 3-level, unidirectional boost-type PFC).
// Per VIENNA_PLAN.md: full 3-phase SPICE deferred; analytical path only.
// Phase-A inductor shown; Phase B/C are identical by 120-deg symmetry.
export default {
    props: { dataTestLabel: { type: String, default: 'ViennaWizard' } },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        // 400 Vac LL EU industrial → 800 Vdc bus (Vdc > sqrt(2)*VLL = 566 V required).
        // 20 kHz default (SiC-comfortable, audible-immune). 10 kW reference.
        const localData = {
            lineToLineVoltage: { minimum: 360, nominal: 400, maximum: 440 },
            lineFrequency: 50,
            outputDcVoltage: 800,
            outputPower: 10000,
            switchingFrequency: 20000,
            phaseCount: 3,
            powerFactor: 0.99,
            currentRippleRatio: 0.25,
            efficiency: 0.97,
            ambientTemperature: 40,
            viennaVariant: 'viennaI',
            switchType: 'tType',
            samplingStrategy: 'peakOfLineOnly',
            synchronousRectifier: false,
            designMode: designLevelOptions[0],
            overrideBoostInductance: false,
            desiredBoostInductance: 500e-6,
        };
        return {
            masStore,
            taskQueueStore,
            designLevelOptions,
            localData,
            variantOptions: ['viennaI', 'viennaII'],
            switchTypeOptions: ['tType', 'backToBackMosfet', 'singleMosfetIn4DiodeBridge'],
            samplingOptions: ['peakOfLineOnly', 'peakOfLinePlusSectors', 'fullLineCycle'],
            dropdownLabelsConverterWizards,
            errorMessage: "",
            simulatingWaveforms: false,
            waveformSource: '',
            waveformError: "",
            magneticWaveforms: [],
            converterWaveforms: [],
            designRequirements: null,
            simulatedInductance: null,
            simulatedOperatingPoints: [],
            numberOfPeriods: 2,
            numberOfSteadyStatePeriods: 50,
            waveformViewMode: 'magnetic',
            forceWaveformUpdate: 0,
        }
    },
    watch: {
        waveformViewMode() { this.$nextTick(() => { this.forceWaveformUpdate += 1; }); },
        // Re-validate and re-run on every input edit. Without this, the
        // wizard would silently keep showing the stale waveforms from
        // the initial mount run after the user changed V_LL / V_DC /
        // power / etc. Debounced like CmcWizard's pattern.
        localData: {
            deep: true,
            handler() {
                clearTimeout(this._analyticalDebounceTimer);
                this._analyticalDebounceTimer = setTimeout(() => {
                    this.updateErrorMessage();
                    if (!this.errorMessage) this.getAnalyticalWaveforms();
                }, 800);
            },
        },
    },
    mounted() {
        this.$nextTick(() => {
            if (this._autoRunDone) return;
            this._autoRunDone = true;
            this.updateErrorMessage();
            // Auto-run the fast analytical pass on load (matches CmcWizard and
            // the localData watcher below). Auto-running the slow SPICE
            // simulation here left both action buttons disabled — and the
            // Simulated button stuck in its spinner — for the whole run every
            // time the wizard opened.
            if (!this.errorMessage) this.getAnalyticalWaveforms();
        });
    },
    beforeUnmount() {
        clearTimeout(this._analyticalDebounceTimer);
    },
    methods: {
        buildParams(mode) {
            if (mode === 'spice') {
                // generate_boost_ngspice_circuit (single-phase emulation) needs
                // boost-style params. Per-leg input peak ≈ V_LL,RMS × √(2/3).
                // lineToLineVoltage is a DimensionWithTolerance object — pull
                // the nominal RMS value out before scaling (the original code
                // multiplied the object by a scalar and silently produced NaN).
                const vll = this.localData.lineToLineVoltage ?? {};
                const vllNominal = vll.nominal ?? ((vll.minimum != null && vll.maximum != null) ? (vll.minimum + vll.maximum) / 2 : (vll.maximum ?? vll.minimum));
                if (!(vllNominal > 0)) {
                    throw new Error('Vienna: lineToLineVoltage.nominal is required for SPICE export');
                }
                const k = Math.sqrt(2 / 3);
                // Phase peak voltage seen by each boost inductor in the
                // single-phase emulation = V_LL,RMS × √(2/3). Carry
                // min/max through so the boost SPICE generator has a
                // proper input-voltage range.
                const vMin = (vll.minimum ?? vllNominal * 0.9) * k;
                const vMax = (vll.maximum ?? vllNominal * 1.1) * k;
                const vNom = vllNominal * k;
                const outputCurrent = this.localData.outputPower / this.localData.outputDcVoltage;
                return {
                    inputVoltage: { minimum: vMin, nominal: vNom, maximum: vMax },
                    switchingFrequency: this.localData.switchingFrequency,
                    efficiency: this.localData.efficiency,
                    currentRippleRatio: this.localData.currentRippleRatio,
                    diodeVoltageDrop: 0,
                    operatingPoints: [{
                        outputVoltage: this.localData.outputDcVoltage,
                        outputCurrent,
                        switchingFrequency: this.localData.switchingFrequency,
                        ambientTemperature: this.localData.ambientTemperature,
                    }],
                };
            }
            const aux = {
                lineToLineVoltage: this.localData.lineToLineVoltage,
                lineFrequency: this.localData.lineFrequency,
                outputDcVoltage: this.localData.outputDcVoltage,
                switchingFrequency: this.localData.switchingFrequency,
                // phaseCount here is the *interleaving* count per leg (MKF
                // AdvancedVienna field), NOT the 3-phase grid count. The UI's
                // "Phases" display shows the grid phase count (always 3, by
                // definition for Vienna); MKF gates interleaving > 1 as
                // deferred. Hard-pin to 1 until Phase-3 interleaving lands.
                phaseCount: 1,
                powerFactor: this.localData.powerFactor,
                currentRippleRatio: this.localData.currentRippleRatio,
                efficiency: this.localData.efficiency,
                viennaVariant: this.localData.viennaVariant,
                switchType: this.localData.switchType,
                samplingStrategy: this.localData.samplingStrategy,
                synchronousRectifier: this.localData.synchronousRectifier,
                operatingPoints: [{
                    outputVoltages: [this.localData.outputDcVoltage],
                    outputCurrents: [this.localData.outputPower / this.localData.outputDcVoltage],
                    switchingFrequency: this.localData.switchingFrequency,
                    ambientTemperature: this.localData.ambientTemperature,
                }],
            };
            if (this.localData.designMode === 'I know the design I want'
                && this.localData.desiredBoostInductance > 0) {
                aux.desiredBoostInductance = this.localData.desiredBoostInductance;
            } else if (this.localData.overrideBoostInductance
                && this.localData.desiredBoostInductance > 0) {
                aux.desiredBoostInductance = this.localData.desiredBoostInductance;
            }
            return aux;
        },
        getCalculateFn() { return (aux) => this.taskQueueStore.calculateViennaInputs(aux); },
        getSimulateFn() {
            // MKF Phase-1 SPICE = single-phase boost emulation (one phase
            // at frozen peak-of-line, replicated to B/C by symmetry). The
            // returned payload carries `viennaDiagnostics.note` describing
            // this; surface it in postProcessResults if you want a UI badge.
            return (aux) => this.taskQueueStore.simulateViennaIdealWaveforms(aux);
        },
        getDefaultFrequency() { return this.localData.switchingFrequency; },
        postProcessResults(result, mode) {
            const L = result?.designRequirements?.magnetizingInductance;
            if (L && (L.nominal || L.minimum)) {
                this.simulatedInductance = L.nominal ?? L.minimum;
            }
        },
        updateErrorMessage() {
            this.errorMessage = "";
            const vll = this.localData.lineToLineVoltage?.nominal
                ?? this.localData.lineToLineVoltage?.maximum
                ?? this.localData.lineToLineVoltage?.minimum;
            // V_LL is required — the previous version short-circuited the
            // relation check when vll was undefined, silently accepting an
            // empty input field. Vienna's analytical solver needs V_LL to
            // compute the boost inductance and peak phase current, so
            // bail out loudly.
            if (!(vll > 0)) {
                this.errorMessage = "V_LL (AC line-to-line RMS) is required — enter the nominal value.";
                return;
            }
            if (!(this.localData.outputDcVoltage > 0)) {
                this.errorMessage = "DC bus voltage must be set and > 0.";
                return;
            }
            if (this.localData.outputDcVoltage <= vll * Math.SQRT2) {
                this.errorMessage = `DC bus voltage (${this.localData.outputDcVoltage} V) must exceed √2·V_LL (${(vll * Math.SQRT2).toFixed(0)} V) — Vienna is a boost-type PFC.`;
                return;
            }
            if (!(this.localData.outputPower > 0)) {
                this.errorMessage = "Output power must be > 0.";
                return;
            }
            if (!(this.localData.switchingFrequency > 0)) {
                this.errorMessage = "Switching frequency must be > 0.";
                return;
            }
            const lineF = this.localData.lineFrequency;
            if (!(lineF >= 40 && lineF <= 500)) {
                this.errorMessage = `Line frequency (${lineF} Hz) must be in 40–500 Hz.`;
                return;
            }
        },
        buildInputs() { return this.buildParams('analytical'); },
        hasSimulatedData() { return this.simulatedOperatingPoints && this.simulatedOperatingPoints.length > 0; },
        getFrequency() { return this.localData.switchingFrequency; },
        getTopology() { return Topology.ViennaRectifierConverter; },
        // Vienna boost inductor: 1 winding per phase. Per plan, the wizard
        // emits Phase A only (Phase B/C identical by symmetry).
        getIsolationSides() { return [IsolationSide.Primary]; },
        getInsulationType() { return null; },
        async process() {
            this.updateErrorMessage();
            if (this.errorMessage) return false;
            this.masStore.resetMas("power");
            this.$stateStore.closeCoilAdvancedInfo();
            const result = await this.$refs.base.processWizardData(this, this.taskQueueStore);
            if (!result.success) { this.errorMessage = result.error; return false; }
            this.designRequirements = this.masStore.mas.inputs.designRequirements;
            return true;
        },
        async processAndReview() {
            const ok = await this.process();
            if (!ok) { setTimeout(() => { this.errorMessage = ""; }, 5000); return; }
            await this.$refs.base.navigateToReview(this.$stateStore, this.masStore, "Power");
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
        },
        async processAndAdvise() {
            const ok = await this.process();
            if (!ok) { setTimeout(() => { this.errorMessage = ""; }, 5000); return; }
            await this.$refs.base.navigateToAdvise(this.$stateStore, this.masStore, "Power");
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
        },
        async getAnalyticalWaveforms() { await this.$refs.base.executeWaveformAction(this, 'analytical'); },
        async simulateIdealWaveforms() { await this.$refs.base.executeWaveformAction(this, 'simulation'); },
        async getSpiceCode() { await this.$refs.base.generateSpiceCode(this); },
        resolveDimensionValue(d) {
            if (!d) return null;
            if (d.nominal != null) return d.nominal;
            if (d.minimum != null) return d.minimum;
            if (d.maximum != null) return d.maximum;
            return null;
        },
        getComputedBoostInductance() {
            return this.resolveDimensionValue(this.designRequirements?.magnetizingInductance);
        },
        hasComputedValues() { return this.designRequirements != null; },
    },
}
</script>

<template>
  <ConverterWizardBase
    ref="base"
    title="Vienna Wizard"
    titleIcon="pi pi-sitemap"
    subtitle="3-Phase 3-Level Boost PFC (Phase A shown — identical by symmetry)"

    :col1Width="3" :col2Width="4" :col3Width="5"
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
      <div class="compact-header"><i class="pi pi-cog-wide-connected mr-1"></i>Topology</div>
    </template>

    <template #design-or-switch-parameters>
      <ElementFromList :name="'viennaVariant'" :tooltip="tooltipsConverterWizards['viennaVariant']" :replaceTitle="'Variant'" :options="variantOptions" :optionLabels="dropdownLabelsConverterWizards.viennaVariant" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-ViennaVariant'" />
      <ElementFromList :name="'switchType'" :tooltip="tooltipsConverterWizards['switchType']" :replaceTitle="'Switch'" :options="switchTypeOptions" :optionLabels="dropdownLabelsConverterWizards.viennaSwitchType" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-SwitchType'" />
      <ElementFromList :name="'samplingStrategy'" :tooltip="tooltipsConverterWizards['samplingStrategy']" :replaceTitle="'Sampling'" :options="samplingOptions" :optionLabels="dropdownLabelsConverterWizards.viennaSamplingStrategy" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-SamplingStrategy'" />
      <Dimension :name="'currentRippleRatio'" :tooltip="tooltipsConverterWizards['currentRippleRatio']" :replaceTitle="'Ripple'" unit="%" :visualScale="100" :min="0.05" :max="0.5" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-CurrentRippleRatio'" />
      <template v-if="localData.designMode === 'I know the design I want'">
        <Dimension :name="'desiredBoostInductance'" :tooltip="tooltipsConverterWizards['desiredBoostInductance']" :replaceTitle="'Boost Ind.'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-DesiredBoostInductance'" />
      </template>
      <template v-else-if="hasComputedValues()">
        <DimensionReadOnly :name="'boostInductance'" :tooltip="tooltipsConverterWizards['boostInductance']" :replaceTitle="'Boost Ind.'" unit="H" :value="getComputedBoostInductance()" :numberDecimals="6" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-BoostInductance'" />
      </template>
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.synchronousRectifier" id="syncRectVienna"><label class="form-check-label small" for="syncRectVienna" :style="{ color: $styleStore.wizard.inputTextColor }">Sync. Rect.</label></div>
    </template>

    <template #conditions>
      <Dimension :name="'switchingFrequency'" :tooltip="tooltipsConverterWizards['switchingFrequency']" :replaceTitle="'Sw. Freq.'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-SwitchingFrequency'" />
      <Dimension :name="'lineFrequency'" :tooltip="tooltipsConverterWizards['lineFrequency']" :replaceTitle="'Line Freq.'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-LineFrequency'" />
      <Dimension :name="'powerFactor'" :tooltip="tooltipsConverterWizards['powerFactor']" :replaceTitle="'PF'" :unit="null" :min="0.5" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-PowerFactor'" />
      <Dimension :name="'ambientTemperature'" :tooltip="tooltipsConverterWizards['ambientTemperature']" :replaceTitle="'Temp.'" unit=" C" :min="minimumMaximumScalePerParameter['temperature']['min']" :max="minimumMaximumScalePerParameter['temperature']['max']" :allowNegative="true" :allowZero="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-AmbientTemperature'" />
      <Dimension :name="'efficiency'" :tooltip="tooltipsConverterWizards['efficiency']" :replaceTitle="'Efficiency'" unit="%" :visualScale="100" :min="0.5" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-Efficiency'" />
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
        :name="'lineToLineVoltage'"
        :tooltip="tooltipsConverterWizards['lineToLineVoltage']"
        :dataTestLabel="dataTestLabel + '-LineToLineVoltage'"
        unit="V"
        :modelValue="localData.lineToLineVoltage"
        @update="updateErrorMessage"
      />
    </template>

    <template #outputs>
      <Dimension :name="'outputDcVoltage'" :tooltip="tooltipsConverterWizards['outputDcVoltage']" :replaceTitle="'DC Bus V.'" unit="V" :min="minimumMaximumScalePerParameter['voltage']['min']" :max="minimumMaximumScalePerParameter['voltage']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-OutputDcVoltage'" />
      <Dimension :name="'outputPower'" :tooltip="tooltipsConverterWizards['outputPower']" :replaceTitle="'Power'" unit="W" :min="1" :max="minimumMaximumScalePerParameter['power']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-OutputPower'" />
    </template>
  </ConverterWizardBase>
</template>
