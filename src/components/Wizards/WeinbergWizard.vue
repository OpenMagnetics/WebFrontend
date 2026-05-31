<script setup>
import { InsulationType, IsolationSide } from 'WebSharedComponents/assets/ts/MAS.ts'
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import DimensionReadOnly from 'WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromList from 'WebSharedComponents/DataInput/ElementFromList.vue'
import ElementFromListRadio from 'WebSharedComponents/DataInput/ElementFromListRadio.vue'
import { defaultWeinbergWizardInputs, minimumMaximumScalePerParameter } from 'WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
import CompactVoltageInput from './CompactVoltageInput.vue'
import { tooltipsConverterWizards, dropdownLabelsConverterWizards } from 'WebSharedComponents/assets/js/texts'
</script>

<script>
// Weinberg wizard — isolated push-pull-derived, non-inverting Vo positive.
// Two primary windings + center-tapped secondary, single output inductor.
// MKF Weinberg simulate uses a SCALAR turnsRatio (not vector), so the
// wizard exposes a single secondary output. The advanced ("desiredInductance"
// + "desiredTurnsRatio" singular) variant is exposed via embind through
// calculate_advanced_weinberg_inputs so the designLevel toggle drives both
// flows.
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: 'WeinbergWizard',
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const currentOptions = ['The output current ratio', 'The maximum switch current'];
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        const insulationTypes = ['no', 'basic', 'reinforced'];
        const variantOptions = ['classic', 'bridge'];
        const localData = deepCopy(defaultWeinbergWizardInputs);
        localData["currentOptions"] = currentOptions[0];
        return {
            weinbergDiagnostics: null,
            masStore,
            taskQueueStore, dropdownLabelsConverterWizards,
            currentOptions,
            designLevelOptions,
            insulationTypes,
            variantOptions,
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
        buildParams(mode) {
            const aux = {};
            aux['inputVoltage'] = this.localData.inputVoltage;
            aux['diodeVoltageDrop'] = this.localData.diodeVoltageDrop;
            aux['efficiency'] = this.localData.efficiency;
            aux['variant'] = this.localData.variant;
            aux['synchronousRectifier'] = this.localData.synchronousRectifier;
            if (this.localData.couplingCoefficientInput > 0) {
                aux['couplingCoefficientInput'] = this.localData.couplingCoefficientInput;
            }
            if (this.localData.couplingCoefficientMain > 0) {
                aux['couplingCoefficientMain'] = this.localData.couplingCoefficientMain;
            }
            if (this.localData.designLevel === 'I know the design I want') {
                aux['desiredInductance'] = this.localData.inductance;
                aux['desiredTurnsRatio'] = this.localData.turnsRatio;
            } else {
                aux['desiredTurnsRatios'] = [this.localData.turnsRatio];
                if (this.localData.currentOptions == 'The output current ratio') {
                    aux['currentRippleRatio'] = this.localData.currentRippleRatio;
                } else {
                    aux['maximumSwitchCurrent'] = this.localData.maximumSwitchCurrent;
                }
            }
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
                return (aux) => this.taskQueueStore.calculateAdvancedWeinbergInputs(aux);
            }
            return (aux) => this.taskQueueStore.calculateWeinbergInputs(aux);
        },
        getSimulateFn() { return (aux) => this.taskQueueStore.simulateWeinbergIdealWaveforms(aux); },
        getDefaultFrequency() { return this.localData.switchingFrequency; },
        postProcessResults(result, mode) {
            this.weinbergDiagnostics = result?.weinbergDiagnostics ?? null;
            if (this.designRequirements) {
                this.simulatedMagnetizingInductance = this.designRequirements.magnetizingInductance?.nominal || null;
                this.simulatedTurnsRatios = this.designRequirements.turnsRatios?.map(tr => tr.nominal) || null;
            }
        },
        getTopology() { return 'weinbergConverter'; },
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
    title="Weinberg Wizard"
    titleIcon="pi pi-arrow-right-arrow-left"
    subtitle="Isolated Push-Pull with Output Inductor"
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
          :name="'inductance'" :tooltip="tooltipsConverterWizards['inductance']" :replaceTitle="'L Inductance'" unit="H"
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
      <Dimension
        :name="'turnsRatio'" :tooltip="tooltipsConverterWizards['turnsRatio']" :replaceTitle="'Turns ratio (Np/Ns)'" :unit="null"
        :dataTestLabel="dataTestLabel + '-TurnsRatio'"
        :min="0.01" :max="100"
        v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <ElementFromList
        :name="'variant'" :tooltip="tooltipsConverterWizards['weinbergVariant']"
        :dataTestLabel="dataTestLabel + '-Variant'"
        :replaceTitle="'Primary'" :options="variantOptions" :titleSameRow="true"
        v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <Dimension
        :name="'couplingCoefficientInput'" :tooltip="tooltipsConverterWizards['couplingCoefficientInput']" :replaceTitle="'Input k'" :unit="null"
        :dataTestLabel="dataTestLabel + '-CouplingCoefficientInput'"
        :min="0.9" :max="1"
        v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <Dimension
        :name="'couplingCoefficientMain'" :tooltip="tooltipsConverterWizards['couplingCoefficientMain']" :replaceTitle="'Main k'" :unit="null"
        :dataTestLabel="dataTestLabel + '-CouplingCoefficientMain'"
        :min="0.9" :max="1"
        v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <div class="form-check mt-2">
        <input class="form-check-input" type="checkbox" v-model="localData.synchronousRectifier" id="syncRectWeinberg" :data-cy="dataTestLabel + '-SynchronousRectifier'">
        <label class="form-check-label small" for="syncRectWeinberg" :style="{ color: $styleStore.wizard.inputTextColor }">Sync. Rect.</label>
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
      <template v-if="weinbergDiagnostics" #diagnostics>
      <table
        v-if="Array.isArray(weinbergDiagnostics.perOp) && weinbergDiagnostics.perOp.length > 1"
        class="diagnostics-perop-table"
        :data-cy="dataTestLabel + '-Weinberg-perOp-table'"
        :style="{ color: $styleStore.wizard.inputTextColor, fontSize: $styleStore.wizard.inputFontSize, width: '100%', borderCollapse: 'collapse' }"
      >
        <thead>
          <tr>
            <th :style="{ textAlign: 'left', padding: '2px 4px', fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }"></th>
            <th v-for="(op, i) in weinbergDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px', fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }">
              {{ op.operatingPointName || ('OP ' + i) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Duty</td><td v-for="(op, i) in weinbergDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.dutyCycle).toFixed(3) }}</td></tr>
          <tr><td>Conv. Ratio M</td><td v-for="(op, i) in weinbergDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.conversionRatio).toFixed(3) }}</td></tr>
          <tr><td>Mode</td><td v-for="(op, i) in weinbergDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ op.isCcm ? 'CCM' : 'DCM' }}</td></tr>
          <tr><td>Overlap fraction</td><td v-for="(op, i) in weinbergDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.overlapFraction).toFixed(3) }}</td></tr>
          <tr><td>Input I avg (A)</td><td v-for="(op, i) in weinbergDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.inputInductorAverage).toFixed(3) }}</td></tr>
          <tr><td>Input I ripple (A)</td><td v-for="(op, i) in weinbergDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.inputInductorRipple).toFixed(3) }}</td></tr>
          <tr><td>Mag. I ripple (A)</td><td v-for="(op, i) in weinbergDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.magnetizingRipple).toFixed(3) }}</td></tr>
          <tr><td>Recovery I avg (A)</td><td v-for="(op, i) in weinbergDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.energyRecoveryAvgCurrent).toFixed(3) }}</td></tr>
          <tr><td>Flux margin</td><td v-for="(op, i) in weinbergDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.fluxImbalanceMargin).toFixed(3) }}</td></tr>
          <tr><td>Sw. Peak V (V)</td><td v-for="(op, i) in weinbergDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.switchPeakVoltage).toFixed(3) }}</td></tr>
          <tr><td>Sw. Peak I (A)</td><td v-for="(op, i) in weinbergDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.switchPeakCurrent).toFixed(3) }}</td></tr>
          <tr><td>Diode Peak V (V)</td><td v-for="(op, i) in weinbergDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.diodePeakReverseVoltage).toFixed(3) }}</td></tr>
          <tr><td>Vout ripple (V)</td><td v-for="(op, i) in weinbergDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.outputVoltageRipple).toFixed(3) }}</td></tr>
        </tbody>
      </table>
      <template v-else>
      <DimensionReadOnly name="weinDuty" :tooltip="tooltipsConverterWizards['weinDuty']" :replaceTitle="'Duty'" :value="weinbergDiagnostics.dutyCycle" :unit="null" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-WeinDuty'" />
      <DimensionReadOnly name="weinConvRatio" :tooltip="tooltipsConverterWizards['weinConvRatio']" :replaceTitle="'Conv. Ratio M'" :value="weinbergDiagnostics.conversionRatio" :unit="null" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-WeinConvRatio'" />
      <DimensionReadOnly name="weinMode" :tooltip="tooltipsConverterWizards['weinMode']" :replaceTitle="'Mode'" :value="weinbergDiagnostics.isCcm ? 'CCM' : 'DCM'" :unit="null" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-WeinMode'" />
      <DimensionReadOnly name="weinOverlap" :tooltip="tooltipsConverterWizards['weinOverlap']" :replaceTitle="'Overlap fraction'" :value="weinbergDiagnostics.overlapFraction" :unit="null" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-WeinOverlap'" />
      <DimensionReadOnly name="weinIL1Avg" :tooltip="tooltipsConverterWizards['weinIL1Avg']" :replaceTitle="'Input I avg'" :value="weinbergDiagnostics.inputInductorAverage" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-WeinIL1Avg'" />
      <DimensionReadOnly name="weinIL1Ripple" :tooltip="tooltipsConverterWizards['weinIL1Ripple']" :replaceTitle="'Input I ripple'" :value="weinbergDiagnostics.inputInductorRipple" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-WeinIL1Ripple'" />
      <DimensionReadOnly name="weinImagRipple" :tooltip="tooltipsConverterWizards['weinImagRipple']" :replaceTitle="'Mag. I ripple'" :value="weinbergDiagnostics.magnetizingRipple" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-WeinImagRipple'" />
      <DimensionReadOnly name="weinIer" :tooltip="tooltipsConverterWizards['weinIer']" :replaceTitle="'Recovery I avg'" :value="weinbergDiagnostics.energyRecoveryAvgCurrent" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-WeinIer'" />
      <DimensionReadOnly name="weinFlux" :tooltip="tooltipsConverterWizards['weinFlux']" :replaceTitle="'Flux margin'" :value="weinbergDiagnostics.fluxImbalanceMargin" :unit="null" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-WeinFlux'" />
      <DimensionReadOnly name="weinVsw" :tooltip="tooltipsConverterWizards['weinVsw']" :replaceTitle="'Sw. Peak V'" :value="weinbergDiagnostics.switchPeakVoltage" unit="V" :numberDecimals="2":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-WeinVsw'" />
      <DimensionReadOnly name="weinIsw" :tooltip="tooltipsConverterWizards['weinIsw']" :replaceTitle="'Sw. Peak I'" :value="weinbergDiagnostics.switchPeakCurrent" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-WeinIsw'" />
      <DimensionReadOnly name="weinVd" :tooltip="tooltipsConverterWizards['weinVd']" :replaceTitle="'Diode Peak V'" :value="weinbergDiagnostics.diodePeakReverseVoltage" unit="V" :numberDecimals="2":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-WeinVd'" />
      <DimensionReadOnly name="weinVo" :tooltip="tooltipsConverterWizards['weinVo']" :replaceTitle="'Vout ripple'" :value="weinbergDiagnostics.outputVoltageRipple" unit="V" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-WeinVo'" />
    </template>
    </template>
  </ConverterWizardBase>
</template>
