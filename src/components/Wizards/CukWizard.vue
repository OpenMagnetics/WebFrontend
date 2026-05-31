<script setup>
import { IsolationSide } from 'WebSharedComponents/assets/ts/MAS.ts'
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import DimensionReadOnly from 'WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromListRadio from 'WebSharedComponents/DataInput/ElementFromListRadio.vue'
import { defaultCukWizardInputs, minimumMaximumScalePerParameter } from 'WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
import CompactVoltageInput from './CompactVoltageInput.vue'
import { tooltipsConverterWizards } from 'WebSharedComponents/assets/js/texts'
</script>

<script>
// Cuk wizard — non-isolated inverting Cuk converter. Backend topology id
// 'cukConverter'. MKF Cuk model sizes L1 (primary inductor) only; L2 and
// the coupling capacitor are produced as extra-component outputs of
// process_extra_components_inputs. The advanced ("desiredInductance")
// variant is not exposed via embind yet, so the wizard only offers the
// help-me-design flow (single ripple radio with output-ratio or max-Isw).
// Cuk Vo is signed negative internally per polarity convention; user types
// positive Vo here and the C++ side applies the sign.
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: 'CukWizard',
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const currentOptions = ['The output current ratio', 'The maximum switch current'];
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        const localData = deepCopy(defaultCukWizardInputs);
        localData["currentOptions"] = currentOptions[0];
        return {
            cukDiagnostics: null,
            masStore,
            taskQueueStore,
            currentOptions,
            designLevelOptions,
            localData,
            errorMessage: "",
            simulatingWaveforms: false,
            waveformSource: null,
            waveformError: "",
            simulatedOperatingPoints: [],
            simulatedInductance: null,
            designRequirements: null,
            magneticWaveforms: [],
            converterWaveforms: [],
            waveformViewMode: 'magnetic',
            forceWaveformUpdate: 0,
            numberOfPeriods: 2,
            numberOfSteadyStatePeriods: 5,
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
            if (!this.errorMessage) this.simulateIdealWaveforms?.();
        });
    },
    methods: {
        // ===== WIZARD CONTRACT =====
        buildParams(mode) {
            const aux = {};
            aux['inputVoltage'] = this.localData.inputVoltage;
            aux['diodeVoltageDrop'] = this.localData.diodeVoltageDrop;
            aux['efficiency'] = this.localData.efficiency;
            if (this.localData.designLevel === 'I know the design I want') {
                aux['desiredInductance'] = this.localData.inductance;
            } else if (this.localData.currentOptions == 'The output current ratio') {
                aux['currentRippleRatio'] = this.localData.currentRippleRatio;
            } else {
                aux['maximumSwitchCurrent'] = this.localData.maximumSwitchCurrent;
            }
            // Cuk uses array form per MAS schema; the Topology.h migration
            // helper would coerce singular form too, but explicit arrays
            // are clearer for a multi-output-capable model.
            const auxOp = {
                outputVoltages: [this.localData.outputsParameters.voltage],
                outputCurrents: [this.localData.outputsParameters.current],
                switchingFrequency: this.localData.switchingFrequency,
                ambientTemperature: this.localData.ambientTemperature,
            };
            aux['operatingPoints'] = [auxOp];
            return aux;
        },
        getCalculateFn() {
            if (this.localData.designLevel === 'I know the design I want') {
                return (aux) => this.taskQueueStore.calculateAdvancedCukInputs(aux);
            }
            return (aux) => this.taskQueueStore.calculateCukInputs(aux);
        },
        getSimulateFn() { return (aux) => this.taskQueueStore.simulateCukIdealWaveforms(aux); },
        getDefaultFrequency() { return this.localData.switchingFrequency; },
        postProcessResults(result, mode) {
            this.cukDiagnostics = result?.cukDiagnostics ?? null;
            if (this.designRequirements) {
                this.simulatedInductance = this.designRequirements.magnetizingInductance?.nominal || null;
            }
        },
        getTopology() { return 'cukConverter'; },
        getIsolationSides() { return [IsolationSide.Primary]; },

        updateErrorMessage() {
            this.errorMessage = "";
            const vinMin = this.localData.inputVoltage.minimum;
            const vinMax = this.localData.inputVoltage.maximum;
            if (vinMin != null && vinMax != null && vinMin > vinMax) {
                this.errorMessage = "Minimum input voltage cannot be larger than maximum input voltage";
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
    title="Cuk Wizard"
    titleIcon="pi pi-arrows-v"
    subtitle="Inverting Buck-Boost via Coupling Capacitor"
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
      <div class="compact-header"><i class="pi pi-cog-wide-connected mr-1"></i>{{ localData.designLevel == 'I know the design I want' ? 'Design Params' : 'Current Requirement' }}</div>
    </template>

    <template #design-or-switch-parameters>
      <div v-if="localData.designLevel == 'I know the design I want'">
        <Dimension
          :name="'inductance'" :tooltip="tooltipsConverterWizards['inductance']" :replaceTitle="'L1 Inductance'" unit="H"
          :dataTestLabel="dataTestLabel + '-Inductance'"
          :min="minimumMaximumScalePerParameter['inductance']['min']"
          :max="minimumMaximumScalePerParameter['inductance']['max']"
          v-model="localData"
          :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />
      </div>
      <div v-else>
        <ElementFromListRadio
          :name="'currentOptions'" :tooltip="tooltipsConverterWizards['currentOptions']"
          :dataTestLabel="dataTestLabel + '-CurrentOptions'"
          :replaceTitle="''" :options="currentOptions" :titleSameRow="false"
          v-model="localData"
          :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-12'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'" :valueBgColor="'transparent'"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />
        <Dimension v-if="localData.currentOptions == 'The maximum switch current'"
          :name="'maximumSwitchCurrent'" :tooltip="tooltipsConverterWizards['maximumSwitchCurrent']" :replaceTitle="'Max Isw'" unit="A"
          :dataTestLabel="dataTestLabel + '-MaximumSwitchCurrent'"
          :min="minimumMaximumScalePerParameter['current']['min']"
          :max="minimumMaximumScalePerParameter['current']['max']"
          v-model="localData"
          :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />
        <Dimension v-if="localData.currentOptions == 'The output current ratio'"
          :name="'currentRippleRatio'" :tooltip="tooltipsConverterWizards['currentRippleRatio']" :replaceTitle="'Ripple'" unit="%" :visualScale="100"
          :dataTestLabel="dataTestLabel + '-CurrentRippleRatio'"
          :min="0.01" :max="1"
          v-model="localData"
          :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />
      </div>
    </template>

    <template #conditions>
      <Dimension :name="'switchingFrequency'" :tooltip="tooltipsConverterWizards['switchingFrequency']" :replaceTitle="'Sw. Frequency'" unit="Hz"
        :dataTestLabel="dataTestLabel + '-switchingFrequency'"
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
        :name="'inputVoltage'" :tooltip="tooltipsConverterWizards['inputVoltage']"
        :dataTestLabel="dataTestLabel + '-InputVoltage'"
        unit="V" :modelValue="localData.inputVoltage" @update="updateErrorMessage"
      />
    </template>

    <template #outputs>
      <Dimension
        :name="'voltage'" :tooltip="tooltipsConverterWizards['voltage']" :replaceTitle="'Voltage'" unit="V"
        :dataTestLabel="dataTestLabel + '-OutputVoltage'"
        :min="minimumMaximumScalePerParameter['voltage']['min']"
        :max="minimumMaximumScalePerParameter['voltage']['max']"
        v-model="localData.outputsParameters"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <Dimension
        :name="'current'" :tooltip="tooltipsConverterWizards['current']" :replaceTitle="'Current'" unit="A"
        :dataTestLabel="dataTestLabel + '-OutputCurrent'"
        :min="minimumMaximumScalePerParameter['current']['min']"
        :max="minimumMaximumScalePerParameter['current']['max']"
        v-model="localData.outputsParameters"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
    </template>
      <template v-if="cukDiagnostics" #diagnostics>
      <table
        v-if="Array.isArray(cukDiagnostics.perOp) && cukDiagnostics.perOp.length > 1"
        class="diagnostics-perop-table"
        :data-cy="dataTestLabel + '-Cuk-perOp-table'"
        :style="{ color: $styleStore.wizard.inputTextColor, fontSize: $styleStore.wizard.inputFontSize, width: '100%', borderCollapse: 'collapse' }"
      >
        <thead>
          <tr>
            <th :style="{ textAlign: 'left', padding: '2px 4px', fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }"></th>
            <th v-for="(op, i) in cukDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px', fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }">
              {{ op.operatingPointName || ('OP ' + i) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Duty</td><td v-for="(op, i) in cukDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.dutyCycle).toFixed(3) }}</td></tr>
          <tr><td>Conv. Ratio M</td><td v-for="(op, i) in cukDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.conversionRatio).toFixed(3) }}</td></tr>
          <tr><td>Mode</td><td v-for="(op, i) in cukDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ op.isCcm ? 'CCM' : 'DCM' }}</td></tr>
          <tr><td>Coupling Cap. V (V)</td><td v-for="(op, i) in cukDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.couplingCapVoltage).toFixed(3) }}</td></tr>
          <tr><td>L1 I avg (A)</td><td v-for="(op, i) in cukDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.inputInductorAverage).toFixed(3) }}</td></tr>
          <tr><td>L2 I avg (A)</td><td v-for="(op, i) in cukDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.outputInductorAverage).toFixed(3) }}</td></tr>
          <tr><td>L1 I ripple (A)</td><td v-for="(op, i) in cukDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.inputInductorRipple).toFixed(3) }}</td></tr>
          <tr><td>L2 I ripple (A)</td><td v-for="(op, i) in cukDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.outputInductorRipple).toFixed(3) }}</td></tr>
          <tr><td>Sw. Peak V (V)</td><td v-for="(op, i) in cukDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.switchPeakVoltage).toFixed(3) }}</td></tr>
          <tr><td>Sw. Peak I (A)</td><td v-for="(op, i) in cukDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.switchPeakCurrent).toFixed(3) }}</td></tr>
          <tr><td>Diode Peak V (V)</td><td v-for="(op, i) in cukDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.diodePeakReverseVoltage).toFixed(3) }}</td></tr>
          <tr><td>Diode Peak I (A)</td><td v-for="(op, i) in cukDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.diodePeakCurrent).toFixed(3) }}</td></tr>
        </tbody>
      </table>
      <template v-else>
      <DimensionReadOnly name="cukDuty" :tooltip="tooltipsConverterWizards['cukDuty']" :replaceTitle="'Duty'" :value="cukDiagnostics.dutyCycle" :unit="null" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-CukDuty'" />
      <DimensionReadOnly name="cukConvRatio" :tooltip="tooltipsConverterWizards['cukConvRatio']" :replaceTitle="'Conv. Ratio M'" :value="cukDiagnostics.conversionRatio" :unit="null" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-CukConvRatio'" />
      <DimensionReadOnly name="cukMode" :tooltip="tooltipsConverterWizards['cukMode']" :replaceTitle="'Mode'" :value="cukDiagnostics.isCcm ? 'CCM' : 'DCM'" :unit="null" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-CukMode'" />
      <DimensionReadOnly name="cukVcc" :tooltip="tooltipsConverterWizards['cukVcc']" :replaceTitle="'Coupling Cap. V'" :value="cukDiagnostics.couplingCapVoltage" unit="V" :numberDecimals="2":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-CukVcc'" />
      <DimensionReadOnly name="cukIL1Avg" :tooltip="tooltipsConverterWizards['cukIL1Avg']" :replaceTitle="'L1 I avg'" :value="cukDiagnostics.inputInductorAverage" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-CukIL1Avg'" />
      <DimensionReadOnly name="cukIL2Avg" :tooltip="tooltipsConverterWizards['cukIL2Avg']" :replaceTitle="'L2 I avg'" :value="cukDiagnostics.outputInductorAverage" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-CukIL2Avg'" />
      <DimensionReadOnly name="cukIL1Ripple" :tooltip="tooltipsConverterWizards['cukIL1Ripple']" :replaceTitle="'L1 I ripple'" :value="cukDiagnostics.inputInductorRipple" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-CukIL1Ripple'" />
      <DimensionReadOnly name="cukIL2Ripple" :tooltip="tooltipsConverterWizards['cukIL2Ripple']" :replaceTitle="'L2 I ripple'" :value="cukDiagnostics.outputInductorRipple" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-CukIL2Ripple'" />
      <DimensionReadOnly name="cukVsw" :tooltip="tooltipsConverterWizards['cukVsw']" :replaceTitle="'Sw. Peak V'" :value="cukDiagnostics.switchPeakVoltage" unit="V" :numberDecimals="2":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-CukVsw'" />
      <DimensionReadOnly name="cukIsw" :tooltip="tooltipsConverterWizards['cukIsw']" :replaceTitle="'Sw. Peak I'" :value="cukDiagnostics.switchPeakCurrent" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-CukIsw'" />
      <DimensionReadOnly name="cukVd" :tooltip="tooltipsConverterWizards['cukVd']" :replaceTitle="'Diode Peak V'" :value="cukDiagnostics.diodePeakReverseVoltage" unit="V" :numberDecimals="2":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-CukVd'" />
      <DimensionReadOnly name="cukId" :tooltip="tooltipsConverterWizards['cukId']" :replaceTitle="'Diode Peak I'" :value="cukDiagnostics.diodePeakCurrent" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-CukId'" />
    </template>
    </template>
  </ConverterWizardBase>
</template>
