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
import { defaultFlybackWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from '/WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
</script>

<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: 'FlybackWizard'},
        labelWidthProportionClass:{
            type: String,
            default: 'col-xs-12 col-md-9'
        },
        valueWidthProportionClass:{
            type: String,
            default: 'col-xs-12 col-md-3'
        }},
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        const mosfetOptions = ['Its maximum duty cycle', 'Its maximum drain-source voltage'];
        const insulationTypes = ['No', 'Basic', 'Reinforced'];
        const errorMessage = "";
        const localData = deepCopy(defaultFlybackWizardInputs);
        localData["mosfetInputType"] = mosfetOptions[0];
        return {
            masStore,
            taskQueueStore,
            designLevelOptions,
            mosfetOptions,
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
            waveformViewMode: 'magnetic', // 'magnetic' or 'converter'
            forceWaveformUpdate: 0,
            numberOfPeriods: 2,
            numberOfSteadyStatePeriods: 10}
    },
    computed: {
    },
    watch: {
        waveformViewMode() {
            // Trigger update when switching between magnetic/converter view
            this.$nextTick(() => {
                this.forceWaveformUpdate += 1;
            });
        }},
    methods: {

    // ===== WIZARD CONTRACT (used by ConverterWizardBase.executeWaveformAction) =====
    buildParams(mode) {
      const aux = {};
      aux['inputVoltage'] = this.localData.inputVoltage;
      aux['diodeVoltageDrop'] = this.localData.diodeVoltageDrop;
      aux['efficiency'] = this.localData.efficiency;
      if (this.localData.designLevel == 'I know the design I want') {
        aux['desiredInductance'] = this.localData.inductance;
        const auxDesiredDutyCycle = [];
        if (this.localData.inputVoltage.minimum != null && this.localData.dutyCycle.minimum != null) auxDesiredDutyCycle.push(this.localData.dutyCycle.minimum);
        if (this.localData.inputVoltage.nominal != null && this.localData.dutyCycle.nominal != null) auxDesiredDutyCycle.push(this.localData.dutyCycle.nominal);
        if (this.localData.inputVoltage.maximum != null && this.localData.dutyCycle.maximum != null) auxDesiredDutyCycle.push(this.localData.dutyCycle.maximum);
        aux['desiredDutyCycle'] = [auxDesiredDutyCycle];
        aux['desiredDeadTime'] = [this.localData.deadTime];
        aux['desiredTurnsRatios'] = this.localData.outputsParameters.map(e => e.turnsRatio);
      } else {
        if (this.localData.mosfetInputType == 'Its maximum duty cycle') { aux['maximumDutyCycle'] = this.localData.maximumDutyCycle; }
        else { aux['maximumDrainSourceVoltage'] = this.localData.maximumDrainSourceVoltage; }
        aux['currentRippleRatio'] = this.localData.currentRippleRatio;
      }
      const auxOp = { outputVoltages: [], outputCurrents: [] };
      this.localData.outputsParameters.forEach(e => { auxOp.outputVoltages.push(e.voltage); auxOp.outputCurrents.push(e.current); });
      auxOp['switchingFrequency'] = this.localData.switchingFrequency;
      auxOp['ambientTemperature'] = this.localData.ambientTemperature;
      aux['operatingPoints'] = [auxOp];
      return aux;
    },
    getCalculateFn() {
      if (this.localData.designLevel == 'I know the design I want') return (aux) => this.taskQueueStore.calculateAdvancedFlybackInputs(aux);
      return (aux) => this.taskQueueStore.calculateFlybackInputs(aux);
    },
    getSimulateFn() { return (aux) => this.taskQueueStore.simulateFlybackIdealWaveforms(aux); },
    getDefaultFrequency() { return this.localData.switchingFrequency; },
    postProcessResults(result, mode) {
      if (this.designRequirements) {
        this.simulatedMagnetizingInductance = this.designRequirements.magnetizingInductance?.nominal || null;
        this.simulatedTurnsRatios = this.designRequirements.turnsRatios?.map(tr => tr.nominal) || null;
      }
    },
    getTopology() { return 'Flyback'; },
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
                            voltage: defaultFlybackWizardInputs.outputsParameters[0].voltage,
                            current: defaultFlybackWizardInputs.outputsParameters[0].current,
                            turnsRatio: defaultFlybackWizardInputs.outputsParameters[0].turnsRatio}
                    }
                    else {
                        newOutput = {
                            voltage: this.localData.outputsParameters[this.localData.outputsParameters.length - 1].voltage,
                            current: this.localData.outputsParameters[this.localData.outputsParameters.length - 1].current,
                            turnsRatio: this.localData.outputsParameters[this.localData.outputsParameters.length - 1].turnsRatio}
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
    }
}

</script>

<template>
  <ConverterWizardBase
    ref="base"
    title="Flyback Wizard"
    titleIcon="fa-bolt"
      subtitle="Isolated DC-DC Converter with Energy Storage"
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
      <!-- Design Mode -->
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
        <div class="compact-header"><i class="fa-solid fa-cogs me-1"></i>{{localData.designLevel == 'I know the design I want'? "Design Parameters" : "Switch Parameters"}}</div>
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
            :allowUnsorted="true"
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
          <Dimension :name="'deadTime'" :replaceTitle="'Dead Time'" unit="s"
            :dataTestLabel="dataTestLabel + '-DeadTime'"
            :min="0" :max="1e-3"
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
            :name="'mosfetInputType'" :dataTestLabel="dataTestLabel + '-MosfetInputType'"
            :replaceTitle="''" :options="mosfetOptions" :titleSameRow="false"
            v-model="localData"
            :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-12'"
            :valueFontSize="$styleStore.wizard.inputFontSize"
            :labelFontSize="$styleStore.wizard.inputLabelFontSize"
            :labelBgColor="'transparent'" :valueBgColor="'transparent'"
            :textColor="$styleStore.wizard.inputTextColor"
            @update="updateErrorMessage"
          />
          <Dimension v-if="localData.mosfetInputType == 'Its maximum duty cycle'"
          :name="'maximumDutyCycle'" :replaceTitle="'Max Duty Cycle'" :unit="null"
          :dataTestLabel="dataTestLabel + '-MaximumDutyCycle'"
          :min="0.01" :max="0.99"
          v-model="localData"
          :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />
        <Dimension v-else-if="localData.mosfetInputType == 'Its maximum drain-source voltage'"
          :name="'maximumDrainSourceVoltage'" :replaceTitle="'Max Vds'" unit="V"
            :dataTestLabel="dataTestLabel + '-MaximumSwitchCurrent'"
            :min="minimumMaximumScalePerParameter['current']['min']"
            :max="minimumMaximumScalePerParameter['current']['max']"
            v-model="localData"
            :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
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
        :dataTestLabel="dataTestLabel + '-DiodeVoltageDrop'"
        :min="0" :max="10"
        v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <Dimension :name="'efficiency'" :replaceTitle="'Eff'" unit="%" :visualScale="100"
        :dataTestLabel="dataTestLabel + '-Efficiency'"
        :min="0.5" :max="1"
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
          :replaceTitle="['Volt.', 'Curr.']"
          :units="['V', 'A']"
          :mins="[minimumMaximumScalePerParameter['voltage']['min'], minimumMaximumScalePerParameter['current']['min']]"
          :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['current']['max']]"
          v-model="localData.outputsParameters[index]"
          :dataTestLabel="dataTestLabel + '-OutputsParameters'"
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
