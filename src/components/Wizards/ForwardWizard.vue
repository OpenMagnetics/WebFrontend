<script setup>
import { IsolationSide } from 'WebSharedComponents/assets/ts/MAS.ts'
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
import { defaultForwardWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from 'WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
import CompactVoltageInput from './CompactVoltageInput.vue'
import { tooltipsConverterWizards, dropdownLabelsConverterWizards } from 'WebSharedComponents/assets/js/texts'
</script>

<script>

export default {
    props: {
        converterName: {
            type: String,
            default: 'Single-Switch Forward',
        },
        dataTestLabel: {
            type: String,
            default: 'CmcWizard',
        },
        labelWidthProportionClass:{
            type: String,
            default: 'col-12 md:col-9'
        },
        valueWidthProportionClass:{
            type: String,
            default: 'col-12 md:col-3'
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        const insulationTypes = ['no', 'basic', 'reinforced'];
        const errorMessage = "";
        var localData = deepCopy(defaultForwardWizardInputs);
        return {
            forwardDiagnostics: null,
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
        wizardIcon() {
            switch (this.converterName) {
                case 'Single-Switch Forward': return 'pi pi-circle-off';
                case 'Two-Switch Forward': return 'pi pi-circle-on';
                case 'Active Clamp Forward': return 'pi pi-arrows-h-angle-contract';
                default: return 'pi pi-arrow-right';
            }
        },
        wizardSubtitle() {
            switch (this.converterName) {
                case 'Single-Switch Forward': return 'Isolated DC-DC with Reset Winding';
                case 'Two-Switch Forward': return 'Isolated DC-DC with Dual Switches';
                case 'Active Clamp Forward': return 'Isolated DC-DC with Active Clamp Reset';
                default: return 'Isolated DC-DC Converter';
            }
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
            if (!this.errorMessage) this.simulateIdealWaveforms?.();
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
      aux['converterType'] = this.converterName;
      // currentRippleRatio is required by both regular and Advanced from_json
      // (used for output current ripple even when desiredInductance is given)
      aux['currentRippleRatio'] = this.localData.currentRippleRatio;
      // maximumSwitchCurrent is an optional cap — send only when explicitly
      // set (>0). Backend treats it as an additional constraint alongside
      // the ripple-derived inductor design.
      if (this.localData.maximumSwitchCurrent > 0) {
        aux['maximumSwitchCurrent'] = this.localData.maximumSwitchCurrent;
      }
      if (this.localData.designLevel == 'I know the design I want') {
        aux['desiredInductance'] = this.localData.inductance;
        const auxDesiredDutyCycle = [];
        if (this.localData.inputVoltage.minimum != null && this.localData.dutyCycle.minimum != null) auxDesiredDutyCycle.push(this.localData.dutyCycle.minimum);
        if (this.localData.inputVoltage.nominal != null && this.localData.dutyCycle.nominal != null) auxDesiredDutyCycle.push(this.localData.dutyCycle.nominal);
        if (this.localData.inputVoltage.maximum != null && this.localData.dutyCycle.maximum != null) auxDesiredDutyCycle.push(this.localData.dutyCycle.maximum);
        aux['desiredDutyCycle'] = [auxDesiredDutyCycle];
        const secondaryTurnsRatios = this.localData.outputsParameters.map(e => e.turnsRatio);
        // Single-Switch Forward requires an extra leading turns ratio for the
        // demagnetization winding (1:1 with primary is the standard choice).
        // Two-Switch Forward and Active Clamp Forward use one ratio per output.
        if (this.converterName === 'Single-Switch Forward') {
          aux['desiredTurnsRatios'] = [1.0, ...secondaryTurnsRatios];
        } else {
          aux['desiredTurnsRatios'] = secondaryTurnsRatios;
        }
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
    _getForwardApiPrefix() {
      if (this.converterName === 'Single-Switch Forward') return 'SingleSwitchForward';
      if (this.converterName === 'Two-Switch Forward') return 'TwoSwitchForward';
      return 'ActiveClampForward';
    },
    getCalculateFn() {
      const p = this._getForwardApiPrefix();
      if (this.localData.designLevel == 'I know the design I want') return (aux) => this.taskQueueStore[`calculateAdvanced${p}Inputs`](aux);
      return (aux) => this.taskQueueStore[`calculate${p}Inputs`](aux);
    },
    getSimulateFn() { return (aux) => this.taskQueueStore.simulateForwardIdealWaveforms(aux); },
    getDefaultFrequency() { return this.localData.switchingFrequency; },
    postProcessResults(result, mode) {
            this.forwardDiagnostics = result?.singleSwitchForwardDiagnostics ?? result?.twoSwitchForwardDiagnostics ?? result?.activeClampForwardDiagnostics ?? null;
      if (this.designRequirements) {
        this.simulatedMagnetizingInductance = this.designRequirements.magnetizingInductance?.nominal || null;
        this.simulatedTurnsRatios = this.designRequirements.turnsRatios?.map(tr => tr.nominal) || null;
      }
    },
    getTopology() {
      const topologyMap = {
        'Single-Switch Forward': 'singleSwitchForwardConverter',
        'Two-Switch Forward':    'twoSwitchForwardConverter',
        'Active Clamp Forward':  'activeClampForwardConverter',
      };
      if (!topologyMap[this.converterName]) {
        throw new Error(`ForwardWizard: unknown converterName '${this.converterName}'`);
      }
      return topologyMap[this.converterName];
    },
    getIsolationSides() {
      const sides = [IsolationSide.Primary];
      for (let i = 0; i < this.localData.outputsParameters.length; i++) sides.push(IsolationSide.Secondary);
      return sides;
    },
    getInsulationType() { return this.localData.insulationType; },

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
                            voltage: defaultForwardWizardInputs.outputsParameters[0].voltage,
                            current: defaultForwardWizardInputs.outputsParameters[0].current,
                            turnsRatio: defaultForwardWizardInputs.outputsParameters[0].turnsRatio,
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

        buildConverterWaveformsFromInputs(operatingPoints) {
            const converterWaveforms = [];
            
            for (let opIdx = 0; opIdx < operatingPoints.length; opIdx++) {
                const op = operatingPoints[opIdx];
                
                const opWaveforms = {
                    frequency: op.excitationsPerWinding?.[0]?.frequency || this.localData.switchingFrequency,
                    operatingPointName: op.name || `Operating Point ${opIdx + 1}`,
                    waveforms: []
                };
                
                // Add output voltages/currents from backend data
                if (op.outputVoltages && op.outputVoltages.length > 0) {
                    for (let outIdx = 0; outIdx < op.outputVoltages.length; outIdx++) {
                        if (op.outputVoltages[outIdx].waveform) {
                            const label = op.outputVoltages.length === 1 ? 'Output Voltage' : `Output ${outIdx + 1} Voltage`;
                            opWaveforms.waveforms.push({
                                label: label,
                                x: op.outputVoltages[outIdx].waveform.time,
                                y: op.outputVoltages[outIdx].waveform.data,
                                type: 'voltage',
                                unit: 'V'
                            });
                        }
                    }
                }
                
                // Get secondary currents from excitationsPerWinding
                // For Single-Switch Forward: index 0=Primary, 1=Demagnetization, 2+=Output secondaries
                // For Two-Switch/Active Clamp: index 0=Primary, 1+=Output secondaries
                const excitations = op.excitationsPerWinding || [];
                const isSingleSwitch = this.converterName === "Single-Switch Forward";
                const firstOutputIndex = isSingleSwitch ? 2 : 1; // Skip demagnetization winding for Single-Switch
                
                let outputCurrentIdx = 0;
                for (let windingIdx = firstOutputIndex; windingIdx < excitations.length; windingIdx++) {
                    const excitation = excitations[windingIdx];
                    if (excitation.current?.waveform?.time && excitation.current?.waveform?.data) {
                        // Label as Output Current to match Output Voltage for pairing
                        const numOutputs = excitations.length - firstOutputIndex;
                        const label = numOutputs === 1 ? 'Output Current' : `Output ${outputCurrentIdx + 1} Current`;
                        opWaveforms.waveforms.push({
                            label: label,
                            x: excitation.current.waveform.time,
                            y: excitation.current.waveform.data,
                            type: 'current',
                            unit: 'A'
                        });
                        outputCurrentIdx++;
                    }
                }
                
                // Fallback: if no secondary currents found in excitations, use outputCurrents
                if (op.outputCurrents && op.outputCurrents.length > 0) {
                    const hasSecondaryCurrent = opWaveforms.waveforms.some(wf => wf.type === 'current');
                    if (!hasSecondaryCurrent) {
                        for (let outIdx = 0; outIdx < op.outputCurrents.length; outIdx++) {
                            if (op.outputCurrents[outIdx].waveform) {
                                const label = op.outputCurrents.length === 1 ? 'Output Current' : `Output ${outIdx + 1} Current`;
                                opWaveforms.waveforms.push({
                                    label: label,
                                    x: op.outputCurrents[outIdx].waveform.time,
                                    y: op.outputCurrents[outIdx].waveform.data,
                                    type: 'current',
                                    unit: 'A'
                                });
                            }
                        }
                    }
                }
                
                converterWaveforms.push(opWaveforms);
            }
            return converterWaveforms;
        },
                                                }
}

</script>

<template>
  <ConverterWizardBase
    ref="base"
    :title="converterName + ' Wizard'"
    titleIcon="pi pi-bolt"
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
      <div v-if="localData.designLevel == 'I know the design I want'" class="compact-header"><i class="pi pi-cog-wide-connected mr-1"></i>Design Params</div>
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
        <DimensionWithTolerance :name="'dutyCycle'" :tooltip="tooltipsConverterWizards['dutyCycle']" :replaceTitle="'Duty Cycle'" :unit="null"
          :dataTestLabel="dataTestLabel + '-DutyCycle'"
          :min="0.01" :max="0.99"
          :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
          v-model="localData.dutyCycle" :severalRows="true"
          :addButtonStyle="$styleStore.wizard.addButton"
          :removeButtonBgColor="$styleStore.wizard.removeButton['background-color']"
          :titleFontSize="$styleStore.wizard.inputLabelFontSize"
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
    <template v-if="forwardDiagnostics" #diagnostics>
      <table
        v-if="Array.isArray(forwardDiagnostics.perOp) && forwardDiagnostics.perOp.length > 1"
        class="diagnostics-perop-table"
        :data-cy="dataTestLabel + '-Forward-perOp-table'"
        :style="{ color: $styleStore.wizard.inputTextColor, fontSize: $styleStore.wizard.inputFontSize, width: '100%', borderCollapse: 'collapse' }"
      >
        <thead>
          <tr>
            <th :style="{ textAlign: 'left', padding: '2px 4px', fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }"></th>
            <th v-for="(op, i) in forwardDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px', fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }">
              {{ op.operatingPointName || ('OP ' + i) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Duty max</td><td v-for="(op, i) in forwardDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.maximumDutyCycle).toFixed(3) }}</td></tr>
          <tr><td>Mag. Ind. (H)</td><td v-for="(op, i) in forwardDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.magnetizingInductance).toFixed(3) }}</td></tr>
          <tr><td>Turns ratio</td><td v-for="(op, i) in forwardDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.secondaryTurnsRatio).toFixed(3) }}</td></tr>
          <tr><td>Mode</td><td v-for="(op, i) in forwardDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ op.isCcm ? 'CCM' : 'DCM' }}</td></tr>
          <tr><td>I_pri peak (A)</td><td v-for="(op, i) in forwardDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.primaryPeakCurrent).toFixed(3) }}</td></tr>
          <tr><td>I_sec peak (A)</td><td v-for="(op, i) in forwardDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.secondaryPeakCurrent).toFixed(3) }}</td></tr>
          <tr><td>I_mag peak (A)</td><td v-for="(op, i) in forwardDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.magnetizingPeakCurrent).toFixed(3) }}</td></tr>
          <tr v-if="forwardDiagnostics.perOp[0] && forwardDiagnostics.perOp[0].resetVoltage !== undefined"><td>Reset V (V)</td><td v-for="(op, i) in forwardDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.resetVoltage).toFixed(3) }}</td></tr>
          <tr v-if="forwardDiagnostics.perOp[0] && forwardDiagnostics.perOp[0].clampCapVoltage !== undefined"><td>Clamp Cap. V (V)</td><td v-for="(op, i) in forwardDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.clampCapVoltage).toFixed(3) }}</td></tr>
        </tbody>
      </table>
      <template v-else>
      <DimensionReadOnly name="fwdDuty"          :tooltip="tooltipsConverterWizards['fwdDuty']"          :replaceTitle="'Duty max'"        :value="forwardDiagnostics.maximumDutyCycle"            :unit="null" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-FwdDuty'" />
      <DimensionReadOnly name="fwdLm"            :tooltip="tooltipsConverterWizards['fwdLm']"            :replaceTitle="'Mag. Ind.'"       :value="forwardDiagnostics.magnetizingInductance"       unit="H" :numberDecimals="9" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-FwdLm'" />
      <DimensionReadOnly name="fwdN"             :tooltip="tooltipsConverterWizards['fwdN']"             :replaceTitle="'Turns ratio'"     :value="forwardDiagnostics.secondaryTurnsRatio"         :unit="null" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-FwdN'" />
      <DimensionReadOnly name="fwdMode"          :tooltip="tooltipsConverterWizards['fwdMode']"          :replaceTitle="'Mode'"            :value="forwardDiagnostics.isCcm ? 'CCM' : 'DCM'"       :unit="null" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-FwdMode'" />
      <DimensionReadOnly name="fwdIprimPk"       :tooltip="tooltipsConverterWizards['fwdIprimPk']"       :replaceTitle="'I_pri peak'"      :value="forwardDiagnostics.primaryPeakCurrent"          unit="A" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-FwdIprimPk'" />
      <DimensionReadOnly name="fwdIsecPk"        :tooltip="tooltipsConverterWizards['fwdIsecPk']"        :replaceTitle="'I_sec peak'"      :value="forwardDiagnostics.secondaryPeakCurrent"        unit="A" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-FwdIsecPk'" />
      <DimensionReadOnly name="fwdImagPk"        :tooltip="tooltipsConverterWizards['fwdImagPk']"        :replaceTitle="'I_mag peak'"      :value="forwardDiagnostics.magnetizingPeakCurrent"      unit="A" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-FwdImagPk'" />
      <!-- SSF-only: reset voltage on demag winding -->
      <DimensionReadOnly v-if="forwardDiagnostics.resetVoltage !== undefined" name="fwdReset" :tooltip="tooltipsConverterWizards['fwdReset']" :replaceTitle="'Reset V'" :value="forwardDiagnostics.resetVoltage" unit="V" :numberDecimals="2" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-FwdReset'" />
      <!-- ACF-only: clamp-cap steady-state voltage -->
      <DimensionReadOnly v-if="forwardDiagnostics.clampCapVoltage !== undefined" name="fwdClamp" :tooltip="tooltipsConverterWizards['fwdClamp']" :replaceTitle="'Clamp Cap. V'" :value="forwardDiagnostics.clampCapVoltage" unit="V" :numberDecimals="2" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-FwdClamp'" />
    </template>
    </template>
  </ConverterWizardBase>
</template>
