<script setup>
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { combinedStyle, combinedClass, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromListRadio from '/WebSharedComponents/DataInput/ElementFromListRadio.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import PairOfDimensions from '/WebSharedComponents/DataInput/PairOfDimensions.vue'
import TripleOfDimensions from '/WebSharedComponents/DataInput/TripleOfDimensions.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { defaultForwardWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from '/WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
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
        const insulationTypes = ['No', 'Basic', 'Reinforced'];
        const errorMessage = "";
        var localData = deepCopy(defaultForwardWizardInputs);
        return {
            masStore,
            taskQueueStore,
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
            numberOfSteadyStatePeriods: 20,
        }
    },
    computed: {
        wizardIcon() {
            switch (this.converterName) {
                case 'Single-Switch Forward': return 'fa-toggle-off';
                case 'Two-Switch Forward': return 'fa-toggle-on';
                case 'Active Clamp Forward': return 'fa-compress';
                default: return 'fa-arrow-right';
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
    methods: {

    // ===== WIZARD CONTRACT =====
    buildParams(mode) {
      const aux = {};
      aux['inputVoltage'] = this.localData.inputVoltage;
      aux['diodeVoltageDrop'] = this.localData.diodeVoltageDrop;
      aux['efficiency'] = this.localData.efficiency;
      aux['converterType'] = this.converterName;
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
        aux['currentRippleRatio'] = this.localData.currentRippleRatio;
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
      if (this.designRequirements) {
        this.simulatedMagnetizingInductance = this.designRequirements.magnetizingInductance?.nominal || null;
        this.simulatedTurnsRatios = this.designRequirements.turnsRatios?.map(tr => tr.nominal) || null;
      }
    },
    getTopology() { return this.converterName; },
    getIsolationSides() {
      const sides = ['primary'];
      for (let i = 0; i < this.localData.outputsParameters.length; i++) sides.push('secondary');
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

        buildConverterWaveformsFromInputs(operatingPoints) {
            const converterWaveforms = [];
            
            console.log('[buildConverterWaveformsFromInputs] Building converter waveforms from', operatingPoints.length, 'operating points');
            console.log('[buildConverterWaveformsFromInputs] Converter type:', this.converterName);
            
            for (let opIdx = 0; opIdx < operatingPoints.length; opIdx++) {
                const op = operatingPoints[opIdx];
                console.log(`[buildConverterWaveformsFromInputs] OP ${opIdx}:`, {
                    outputVoltages: op.outputVoltages?.length || 0,
                    outputCurrents: op.outputCurrents?.length || 0,
                    excitations: op.excitationsPerWinding?.length || 0
                });
                
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
                            console.log(`[buildConverterWaveformsFromInputs] Adding voltage: ${label}`);
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
                
                console.log(`[buildConverterWaveformsFromInputs] Looking for currents starting at index ${firstOutputIndex} (isSingleSwitch=${isSingleSwitch})`);
                
                let outputCurrentIdx = 0;
                for (let windingIdx = firstOutputIndex; windingIdx < excitations.length; windingIdx++) {
                    const excitation = excitations[windingIdx];
                    console.log(`[buildConverterWaveformsFromInputs] Checking excitation at index ${windingIdx}:`, {
                        hasCurrent: !!excitation.current?.waveform,
                        hasTime: !!excitation.current?.waveform?.time,
                        hasData: !!excitation.current?.waveform?.data
                    });
                    if (excitation.current?.waveform?.time && excitation.current?.waveform?.data) {
                        // Label as Output Current to match Output Voltage for pairing
                        const numOutputs = excitations.length - firstOutputIndex;
                        const label = numOutputs === 1 ? 'Output Current' : `Output ${outputCurrentIdx + 1} Current`;
                        console.log(`[buildConverterWaveformsFromInputs] Adding current: ${label}`);
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
                console.log(`[buildConverterWaveformsFromInputs] OP ${opIdx} final waveforms count:`, opWaveforms.waveforms.length);
                console.log(`[buildConverterWaveformsFromInputs] OP ${opIdx} waveform labels:`, opWaveforms.waveforms.map(w => w.label));
            }
            
            console.log('[buildConverterWaveformsFromInputs] Final converter waveforms:', converterWaveforms);
            return converterWaveforms;
        },
                                                }
}

</script>

<template>
  <ConverterWizardBase
    ref="base"
    :title="converterName + ' Wizard'"
    titleIcon="fa-bolt"
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
    @dismiss-error="errorMessage = ''; waveformError = ''"
  >
    <template #design-mode>
      <ElementFromListRadio
        :name="'designLevel'" :dataTestLabel="dataTestLabel + '-DesignLevel'"
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
      <div v-if="localData.designLevel == 'I know the design I want'" class="compact-header"><i class="fa-solid fa-cogs me-1"></i>Design Params</div>
    </template>

    <template #design-or-switch-parameters>
      <div v-if="localData.designLevel == 'I know the design I want'">
        <Dimension :name="'inductance'" :replaceTitle="'Inductance'" unit="H"
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
        <DimensionWithTolerance :name="'dutyCycle'" :replaceTitle="'Duty Cycle'" :unit="null"
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
      <Dimension :name="'switchingFrequency'" :replaceTitle="'Sw. Freq'" unit="Hz"
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
      <Dimension :name="'ambientTemperature'" :replaceTitle="'Temp'" unit=" C"
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
      <Dimension :name="'diodeVoltageDrop'" :replaceTitle="'Diode Vd'" unit="V"
        :dataTestLabel="dataTestLabel + '-DiodeVoltageDrop'" :min="0" :max="10"
        v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <Dimension :name="'efficiency'" :replaceTitle="'Eff'" unit="%" :visualScale="100"
        :dataTestLabel="dataTestLabel + '-Efficiency'" :min="0.5" :max="1"
        v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <ElementFromList :name="'insulationType'" :replaceTitle="'Insul'" :options="insulationTypes"
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
        <span v-if="errorMessage" class="error-text"><i class="fa-solid fa-exclamation-triangle me-1"></i>{{ errorMessage }}</span>
        <span v-else></span>
        <div class="action-btns">
          <button :disabled="errorMessage != ''" class="action-btn-sm secondary" @click="processAndReview"><i class="fa-solid fa-magnifying-glass me-1"></i>Review Specs</button>
          <button :disabled="errorMessage != ''" class="action-btn-sm primary" @click="processAndAdvise"><i class="fa-solid fa-wand-magic-sparkles me-1"></i>Design Magnetic</button>
        </div>
      </div>
    </template>

    <template #input-voltage>
      <DimensionWithTolerance :name="'inputVoltage'" :replaceTitle="''" unit="V"
        :dataTestLabel="dataTestLabel + '-InputVoltage'"
        :min="minimumMaximumScalePerParameter['voltage']['min']"
        :max="minimumMaximumScalePerParameter['voltage']['max']"
        :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-4'"
        v-model="localData.inputVoltage" :severalRows="true"
        :addButtonStyle="$styleStore.wizard.addButton"
        :removeButtonBgColor="$styleStore.wizard.removeButton['background-color']"
        :titleFontSize="$styleStore.wizard.inputLabelFontSize"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
    </template>

    <template #outputs>
      <div class="mb-3">
        <ElementFromList :name="'numberOutputs'" :replaceTitle="'Number of Outputs'"
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
  </ConverterWizardBase>
</template>
