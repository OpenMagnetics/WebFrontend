<script setup>
import { IsolationSide, Topologies } from 'WebSharedComponents/assets/ts/MAS.ts'
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { combinedStyle, combinedClass, deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import DimensionReadOnly from 'WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromListRadio from 'WebSharedComponents/DataInput/ElementFromListRadio.vue'
import ElementFromList from 'WebSharedComponents/DataInput/ElementFromList.vue'
import PairOfDimensions from 'WebSharedComponents/DataInput/PairOfDimensions.vue'
import TripleOfDimensions from 'WebSharedComponents/DataInput/TripleOfDimensions.vue'
import DimensionWithTolerance from 'WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { defaultPushPullWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from 'WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
import CompactVoltageInput from './CompactVoltageInput.vue'
import { tooltipsConverterWizards, dropdownLabelsConverterWizards } from 'WebSharedComponents/assets/js/texts'
</script>

<script>

export default {
    props: {
        converterName: {
            type: String,
            default: 'Push-Pull',
        },
        dataTestLabel: {
            type: String,
            default: 'PushPullWizard',
        },
        labelWidthProportionClass:{
            type: String,
            default: 'col-xs-12 col-md-9'
        },
        valueWidthProportionClass:{
            type: String,
            default: 'col-xs-12 col-md-3'
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        const insulationTypes = ['no', 'basic', 'reinforced'];
        const errorMessage = "";
        var localData = deepCopy(defaultPushPullWizardInputs);
        return {
            pushPullDiagnostics: null,
            masStore,
            taskQueueStore, dropdownLabelsConverterWizards,
            designLevelOptions,
            insulationTypes,
            localData,
            errorMessage,
            simulatingWaveforms: false,
            waveformError: "",
            waveformSource: "", // 'simulation' or 'analytical'
            simulatedOperatingPoints: [],
            designRequirements: null,
            simulatedMagnetizingInductance: null,
            simulatedTurnsRatios: null,
            magneticWaveforms: [],
            converterWaveforms: [],
            waveformViewMode: 'magnetic',
            forceWaveformUpdate: 0,
            numberOfPeriods: 2,
            numberOfSteadyStatePeriods: 50,
        }
    },
    computed: {
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
      const aux = {};
      aux['inputVoltage'] = this.localData.inputVoltage;
      aux['switchingFrequency'] = this.localData.switchingFrequency;
      aux['diodeVoltageDrop'] = this.localData.diodeVoltageDrop;
      aux['efficiency'] = this.localData.efficiency;
      // AdvancedPushPull::from_json reads currentRippleRatio with j.at(),
      // so it's required even in I-know mode. Always pass localData's value.
      aux['currentRippleRatio'] = this.localData.currentRippleRatio;
      if (this.localData.designLevel == 'I know the design I want') {
        aux['desiredInductance'] = this.localData.inductance;
        const auxDesiredDutyCycle = [];
        if (this.localData.inputVoltage.minimum != null && this.localData.dutyCycle.minimum != null) auxDesiredDutyCycle.push(this.localData.dutyCycle.minimum);
        if (this.localData.inputVoltage.nominal != null && this.localData.dutyCycle.nominal != null) auxDesiredDutyCycle.push(this.localData.dutyCycle.nominal);
        if (this.localData.inputVoltage.maximum != null && this.localData.dutyCycle.maximum != null) auxDesiredDutyCycle.push(this.localData.dutyCycle.maximum);
        aux['desiredDutyCycle'] = [auxDesiredDutyCycle];
        aux['desiredTurnsRatios'] = this.localData.outputsParameters.map(e => e.turnsRatio);
      } else {
        aux['maximumDutyCycle'] = this.localData.maximumDutyCycle;
      }
      const auxOp = { outputVoltages: [], outputCurrents: [] };
      this.localData.outputsParameters.forEach(e => { auxOp.outputVoltages.push(e.voltage); auxOp.outputCurrents.push(e.current); });
      auxOp['switchingFrequency'] = this.localData.switchingFrequency;
      auxOp['ambientTemperature'] = this.localData.ambientTemperature;
      aux['operatingPoints'] = [auxOp];
      return aux;
    },
    getCalculateFn() {
      if (this.localData.designLevel == 'I know the design I want') return (aux) => this.taskQueueStore.calculateAdvancedPushPullInputs(aux);
      return (aux) => this.taskQueueStore.calculatePushPullInputs(aux);
    },
    getSimulateFn() { return (aux) => this.taskQueueStore.simulatePushPullIdealWaveforms(aux); },
    getDefaultFrequency() { return this.localData.switchingFrequency; },
    postProcessResults(result, mode) {
            this.pushPullDiagnostics = result?.pushPullDiagnostics ?? null;
      if (this.designRequirements) {
        this.simulatedMagnetizingInductance = this.designRequirements.magnetizingInductance?.nominal || null;
        this.simulatedTurnsRatios = this.designRequirements.turnsRatios?.map(tr => tr.nominal) || null;
      }
    },
    getTopology() { return Topologies.PushPullConverter; },
    getIsolationSides() {
      // Push-Pull is center-tapped on BOTH primary and secondary, so MKF
      // models it as 2 primary halves + 2 secondary halves per output. The
      // isolation-sides array MUST match that physical winding count or
      // CoreAdviser fails with "Windings wound together must have the same
      // isolation side" (see MKF PushPull.cpp:957-965 for the canonical
      // ordering MKF generates internally).
      const sides = [IsolationSide.Primary, IsolationSide.Primary];
      for (let i = 0; i < this.localData.outputsParameters.length; i++) {
        sides.push(IsolationSide.Secondary, IsolationSide.Secondary);
      }
      return sides;
    },
    getInsulationType() { return this.localData.insulationType; },
    getCoilGroups() {
      // Push-Pull is center-tapped on BOTH primary and secondary: the two
      // primary halves share one section and each output's two secondary
      // halves share another. Without this, the post-adviser
      // BasicCoilSelector.wind() builds a pattern that omits the "Half 2"
      // windings and trips "Number of slots cannot be less than 1".
      // Names MUST match what MKF emits (see PushPull.cpp:957-965):
      // "Primary Half 1" / "Primary Half 2" and "Secondary N Half 1" /
      // "Secondary N Half 2".
      const groups = [['Primary Half 1', 'Primary Half 2']];
      for (let i = 0; i < this.localData.outputsParameters.length; i++) {
        groups.push([`Secondary ${i} Half 1`, `Secondary ${i} Half 2`]);
      }
      return groups;
    },

            updateErrorMessage() {
            this.errorMessage = "";
        },
        updateNumberOutputs(newNumber) {
            if (newNumber > this.localData.outputsParameters.length) {
                const diff = newNumber - this.localData.outputsParameters.length;
                for (let i = 0; i < diff; i++) {
                    var newOutput;
                    if (this.localData.outputsParameters.length == 0) {
                        newOutput = {
                            voltage: defaultPushPullWizardInputs.outputsParameters[0].voltage,
                            current: defaultPushPullWizardInputs.outputsParameters[0].current,
                            turnsRatio: defaultPushPullWizardInputs.outputsParameters[0].turnsRatio,
                        }
                    }
                    else {
                        newOutput = {
                            voltage: this.localData.outputsParameters[this.localData.outputsParameters.length - 1].voltage,
                            current: this.localData.outputsParameters[this.localData.outputsParameters.length - 1].current,
                            turnsRatio: this.localData.outputsParameters[this.localData.outputsParameters.length - 1].turnsRatio,
                        }
                    }

                    this.localData.outputsParameters.push(newOutput);
                }
            }
            else if (newNumber < this.localData.outputsParameters.length) {
                const diff = this.localData.outputsParameters.length - newNumber;
                this.localData.outputsParameters.splice(-diff, diff);
            }
            this.updateErrorMessage();
        },

        async process() {
            this.masStore.resetMas("power");
            this.$stateStore.closeCoilAdvancedInfo();
            
            try {
                const result = await this.$refs.base.processWizardData(this, this.taskQueueStore);
                if (!result.success) {
                    this.errorMessage = result.error;
                    return;
                }
                
                this.designRequirements = result.designRequirements;
                this.errorMessage = "";
            } catch (error) {
                console.error(error);
                this.errorMessage = error.message || error;
            }
        },
        async processAndReview() {
            await this.process();

            await this.$refs.base.navigateToReview(this.$stateStore, this.masStore, "Power");
            if (this.errorMessage == "") {
                await this.$nextTick();
                await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
            }
            else {
                setTimeout(() => {this.errorMessage = ""}, 5000);
            }
        },
        async processAndAdvise() {
            await this.process();
            await this.$refs.base.navigateToAdvise(this.$stateStore, this.masStore, "Power");
            if (this.errorMessage == "") {
                await this.$nextTick();
                await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
            }
            else {
                setTimeout(() => {this.errorMessage = ""}, 5000);
            }
        },
        async simulateIdealWaveforms() {
      await this.$refs.base.executeWaveformAction(this, 'simulation');
    },
        async getAnalyticalWaveforms() {
      await this.$refs.base.executeWaveformAction(this, 'analytical');
    },
        async getSpiceCode() {
      await this.$refs.base.generateSpiceCode(this);
    },
    }
}

</script>

<template>
  <ConverterWizardBase
    ref="base"
    title="Push-Pull Wizard"
    titleIcon="bi bi-arrow-left-right"
    subtitle="Center-Tapped Transformer Converter"
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
        :name="'designLevel'" :tooltip="tooltipsConverterWizards['designLevel']" :dataTestLabel="dataTestLabel + '-DesignLevel'"
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
      <div class="compact-header"><i class="bi bi-gear-wide-connected me-1"></i>{{localData.designLevel == 'I know the design I want' ? "Design Params" : "Current Requirement"}}</div>
    </template>

    <template #design-or-switch-parameters>
      <div v-if="localData.designLevel == 'I know the design I want'">
        <Dimension :name="'inductance'" :tooltip="tooltipsConverterWizards['inductance']" :replaceTitle="'Inductance'" unit="H"
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
        <Dimension :name="'dutyCycle'" :tooltip="tooltipsConverterWizards['dutyCycle']" :replaceTitle="'Duty Cycle'" :unit="null"
          :dataTestLabel="dataTestLabel + '-DutyCycle'"
          :min="0.01" :max="0.49"
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
        <Dimension :name="'currentRippleRatio'" :tooltip="tooltipsConverterWizards['currentRippleRatio']" :replaceTitle="'Ripple'" unit="%" :visualScale="100"
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
      <Dimension :name="'switchingFrequency'" :tooltip="tooltipsConverterWizards['switchingFrequency']" :replaceTitle="'Sw. Freq'" unit="Hz"
        :dataTestLabel="dataTestLabel + '-SwitchingFrequency'"
        :min="minimumMaximumScalePerParameter['frequency']['min']"
        :max="minimumMaximumScalePerParameter['frequency']['max']"
        v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <Dimension :name="'ambientTemperature'" :tooltip="tooltipsConverterWizards['ambientTemperature']" :replaceTitle="'Temp'" unit=" C"
        :dataTestLabel="dataTestLabel + '-AmbientTemperature'"
        :min="minimumMaximumScalePerParameter['temperature']['min']"
        :max="minimumMaximumScalePerParameter['temperature']['max']"
        :allowNegative="true" :allowZero="true"
        v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <Dimension :name="'diodeVoltageDrop'" :tooltip="tooltipsConverterWizards['diodeVoltageDrop']" :replaceTitle="'Diode Vd'" unit="V"
        :dataTestLabel="dataTestLabel + '-DiodeVoltageDrop'" :min="0" :max="10"
        v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <Dimension :name="'efficiency'" :tooltip="tooltipsConverterWizards['efficiency']" :replaceTitle="'Efficiency'" unit="%" :visualScale="100"
        :dataTestLabel="dataTestLabel + '-Efficiency'" :min="0.5" :max="1"
        v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <ElementFromList :name="'insulationType'" :tooltip="tooltipsConverterWizards['insulationType']" :replaceTitle="'Insulation'" :options="insulationTypes" :optionLabels="dropdownLabelsConverterWizards.insulationType"
        :titleSameRow="true" v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
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
        <TripleOfDimensions v-if="localData.designLevel == 'I know the design I want'"
          :names="['voltage', 'current', 'turnsRatio']"
          :replaceTitle="['V', 'I', 'n']"
          :units="['V', 'A', null]"
          :mins="[minimumMaximumScalePerParameter['voltage']['min'], minimumMaximumScalePerParameter['current']['min'], 0.01]"
          :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['current']['max'], 100]"
          v-model="localData.outputsParameters[index]"
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
        <PairOfDimensions v-else
          :names="['voltage', 'current']"
          :replaceTitle="['V', 'I']"
          :units="['V', 'A']"
          :mins="[minimumMaximumScalePerParameter['voltage']['min'], minimumMaximumScalePerParameter['current']['min']]"
          :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['current']['max']]"
          v-model="localData.outputsParameters[index]"
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
      </div>
    </template>
      <template v-if="pushPullDiagnostics" #diagnostics>
      <table
        v-if="Array.isArray(pushPullDiagnostics.perOp) && pushPullDiagnostics.perOp.length > 1"
        class="diagnostics-perop-table"
        :data-cy="dataTestLabel + '-PushPull-perOp-table'"
        :style="{ color: $styleStore.wizard.inputTextColor, fontSize: $styleStore.wizard.inputFontSize, width: '100%', borderCollapse: 'collapse' }"
      >
        <thead>
          <tr>
            <th :style="{ textAlign: 'left', padding: '2px 4px', fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }"></th>
            <th v-for="(op, i) in pushPullDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px', fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }">
              {{ op.operatingPointName || ('OP ' + i) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Duty</td><td v-for="(op, i) in pushPullDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.dutyCycle).toFixed(3) }}</td></tr>
          <tr><td>Sw. Freq (Hz)</td><td v-for="(op, i) in pushPullDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.switchingFrequency).toFixed(3) }}</td></tr>
          <tr><td>Mode</td><td v-for="(op, i) in pushPullDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ op.isCcm ? 'CCM' : 'DCM' }}</td></tr>
          <tr><td>I_pri avg (A)</td><td v-for="(op, i) in pushPullDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.primaryAverageCurrent).toFixed(3) }}</td></tr>
          <tr><td>I_pri peak (A)</td><td v-for="(op, i) in pushPullDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.primaryPeakCurrent).toFixed(3) }}</td></tr>
          <tr><td>I_mag peak (A)</td><td v-for="(op, i) in pushPullDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.magnetizingPeakCurrent).toFixed(3) }}</td></tr>
        </tbody>
      </table>
      <template v-else>
      <DimensionReadOnly name="ppDuty" :tooltip="tooltipsConverterWizards['ppDuty']" :replaceTitle="'Duty'" :value="pushPullDiagnostics.dutyCycle" :unit="null" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-PpDuty'" />
      <DimensionReadOnly name="ppFsw" :tooltip="tooltipsConverterWizards['ppFsw']" :replaceTitle="'Sw. Freq'" :value="pushPullDiagnostics.switchingFrequency" unit="Hz" :numberDecimals="0":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-PpFsw'" />
      <DimensionReadOnly name="ppMode" :tooltip="tooltipsConverterWizards['ppMode']" :replaceTitle="'Mode'" :value="pushPullDiagnostics.isCcm ? 'CCM' : 'DCM'" :unit="null" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-PpMode'" />
      <DimensionReadOnly name="ppIprimAvg" :tooltip="tooltipsConverterWizards['ppIprimAvg']" :replaceTitle="'I_pri avg'" :value="pushPullDiagnostics.primaryAverageCurrent" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-PpIprimAvg'" />
      <DimensionReadOnly name="ppIprimPk" :tooltip="tooltipsConverterWizards['ppIprimPk']" :replaceTitle="'I_pri peak'" :value="pushPullDiagnostics.primaryPeakCurrent" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-PpIprimPk'" />
      <DimensionReadOnly name="ppImagPk" :tooltip="tooltipsConverterWizards['ppImagPk']" :replaceTitle="'I_mag peak'" :value="pushPullDiagnostics.magnetizingPeakCurrent" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-PpImagPk'" />
    </template>
    </template>
  </ConverterWizardBase>
</template>
