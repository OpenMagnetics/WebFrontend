<script setup>
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import DimensionReadOnly from '/WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { minimumMaximumScalePerParameter, defaultDesignRequirements } from '/WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
</script>

<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: 'LlcWizard',
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        const localData = {
            inputVoltage: { nominal: 400, tolerance: 0.1 },
            bridgeType: 'Full Bridge',  // Full bridge gives k=1.0, so Vi_min = 360V > Vo = 200V (with n=4.17)
            outputVoltage: 48,
            outputPower: 500,
            minSwitchingFrequency: 80000,
            maxSwitchingFrequency: 120000,
            resonantFrequency: 100000,
            qualityFactor: 0.4,
            inductanceRatio: 5,
            integratedResonantInductor: true,
            magnetizingInductance: 825e-6,
            turnsRatio: 8.33,
            ambientTemperature: 25,
            efficiency: 0.97,
            insulationType: 'Basic',
            designMode: designLevelOptions[0],  // Default to "Help me with the design"
        };
        const insulationTypes = ['No', 'Basic', 'Reinforced'];
        return {
            masStore,
            taskQueueStore,
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
        }
    },
    computed: {
        wizardSubtitle() {
            return "Resonant DC-DC Converter";
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
      const aux = {
        inputVoltage: this.localData.inputVoltage,
        bridgeType: this.localData.bridgeType || 'Half Bridge',
        minSwitchingFrequency: this.localData.minSwitchingFrequency,
        maxSwitchingFrequency: this.localData.maxSwitchingFrequency,
        resonantFrequency: this.localData.resonantFrequency,
        qualityFactor: this.localData.qualityFactor,
        inductanceRatio: this.localData.inductanceRatio,
        integratedResonantInductor: this.localData.integratedResonantInductor,
        operatingPoints: [{ outputVoltages: [this.localData.outputVoltage], outputCurrents: [this.localData.outputPower / this.localData.outputVoltage], switchingFrequency: this.localData.resonantFrequency, ambientTemperature: this.localData.ambientTemperature }],
      };
      if (this.localData.designMode === 'I know the design I want') {
        aux.desiredInductance = this.localData.magnetizingInductance;
        aux.desiredTurnsRatios = [this.localData.turnsRatio];
      }
      if (mode === 'simulation') { aux.magnetizingInductance = this.localData.magnetizingInductance; aux.turnsRatio = this.localData.turnsRatio; }
      return aux;
    },
    getCalculateFn() { return (aux) => this.taskQueueStore.calculateLlcInputs(aux); },
    getSimulateFn() { return (aux) => this.taskQueueStore.simulateLlcIdealWaveforms(aux); },
    getDefaultFrequency() { return this.localData.resonantFrequency; },
    postProcessResults(result, mode) {
      this.simulatedMagnetizingInductance = result.computedResonantInductance || this.localData.magnetizingInductance;
      if (this.designRequirements) this.simulatedTurnsRatios = this.designRequirements.turnsRatios?.map(tr => tr.nominal) || [this.localData.turnsRatio];
    },

        updateErrorMessage() { this.errorMessage = ""; },
        
            
        // Wizard-specific methods for base class
        buildInputs() {
            const aux = {
                inputVoltage: this.localData.inputVoltage,
                bridgeType: this.localData.bridgeType || 'Half Bridge',
                minSwitchingFrequency: this.localData.minSwitchingFrequency,
                maxSwitchingFrequency: this.localData.maxSwitchingFrequency,
                resonantFrequency: this.localData.resonantFrequency,
                qualityFactor: this.localData.qualityFactor,
                inductanceRatio: this.localData.inductanceRatio,
                integratedResonantInductor: this.localData.integratedResonantInductor,
                operatingPoints: [{
                    outputVoltages: [this.localData.outputVoltage],
                    outputCurrents: [this.localData.outputPower / this.localData.outputVoltage],
                    switchingFrequency: this.localData.resonantFrequency,
                    ambientTemperature: this.localData.ambientTemperature,
                }]
            };
            
            if (this.localData.designMode === 'I know the design I want') {
                aux.desiredInductance = this.localData.magnetizingInductance;
                aux.desiredTurnsRatios = [this.localData.turnsRatio];
            }
            
            return aux;
        },
        
        getCalculateFn() {
            return (inputs) => this.taskQueueStore.calculateLlcInputs(inputs);
        },
        
        getSimulateFn() {
            return (inputs) => this.taskQueueStore.simulateLlcIdealWaveforms(inputs);
        },
        
        hasSimulatedData() {
            return this.simulatedOperatingPoints && this.simulatedOperatingPoints.length > 0;
        },
        
        getFrequency() {
            return this.localData.resonantFrequency;
        },
        
        getTopology() {
            return 'LLC Converter';
        },
        
        getIsolationSides() {
            return ['primary', 'secondary'];
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
            
            // Update local state with results
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

        // Helper to resolve dimension value (nominal/min/max) to a scalar
        resolveDimensionValue(dimObj) {
            if (!dimObj) return null;
            if (dimObj.nominal !== undefined && dimObj.nominal !== null) return dimObj.nominal;
            if (dimObj.minimum !== undefined && dimObj.minimum !== null) return dimObj.minimum;
            if (dimObj.maximum !== undefined && dimObj.maximum !== null) return dimObj.maximum;
            return null;
        },

        // Returns the computed magnetizing inductance value from designRequirements (in H)
        getComputedMagnetizingInductance() {
            if (!this.designRequirements?.magnetizingInductance) return null;
            return this.resolveDimensionValue(this.designRequirements.magnetizingInductance);
        },

        // Returns the computed turns ratio value from designRequirements
        getComputedTurnsRatio() {
            if (!this.designRequirements?.turnsRatios?.length) return null;
            const tr = this.designRequirements.turnsRatios[0];
            return this.resolveDimensionValue(tr);
        },

        // Check if computed tank values are available
        hasComputedTankValues() {
            return this.designRequirements != null;
        },

                                        },
}

</script>

<template>
  <ConverterWizardBase
    ref="base"
    title="LLC Wizard"
    titleIcon="fa-wave-square"
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
      <div class="compact-header"><i class="fa-solid fa-cogs me-1"></i>Tank</div>
    </template>

    <template #design-or-switch-parameters>
      <Dimension :name="'qualityFactor'" :replaceTitle="'Q Factor'" :unit="null" :min="0.1" :max="2" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'inductanceRatio'" :replaceTitle="'Ln Ratio'" :unit="null" :min="2" :max="20" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <!-- Only show turns ratio and magnetizing inductance inputs in "I know the design I want" mode -->
      <template v-if="localData.designMode === 'I know the design I want'">
        <Dimension :name="'turnsRatio'" :replaceTitle="'Turns'" :unit="null" :min="0.1" :max="100" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
        <Dimension :name="'magnetizingInductance'" :replaceTitle="'Mag. Inductance'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      </template>
      <!-- Show computed values using DimensionReadOnly (shows only when data available) -->
      <template v-else-if="hasComputedTankValues()">
        <DimensionReadOnly :name="'turnsRatio'" :replaceTitle="'Number Turns'" :unit="null" :value="getComputedTurnsRatio()" :numberDecimals="2" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
        <DimensionReadOnly :name="'magnetizingInductance'" :replaceTitle="'Mag. Inductance'" unit="H" :value="getComputedMagnetizingInductance()" :numberDecimals="6" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      </template>
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.integratedResonantInductor" id="integratedResonantInductor"><label class="form-check-label small" for="integratedResonantInductor" :style="{ color: $styleStore.wizard.inputTextColor }">Integrated Res L</label></div>
    </template>

    <template #conditions>
      <!-- Freq Range -->
      <Dimension :name="'minSwitchingFrequency'" :replaceTitle="'Min. Frequency'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'maxSwitchingFrequency'" :replaceTitle="'Max. Frequency'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'resonantFrequency'" :replaceTitle="'Res. Frequency'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'ambientTemperature'" :replaceTitle="'Temperature'" unit=" C" :min="minimumMaximumScalePerParameter['temperature']['min']" :max="minimumMaximumScalePerParameter['temperature']['max']" :allowNegative="true" :allowZero="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'efficiency'" :replaceTitle="'Efficiency'" unit="%" :visualScale="100" :min="0.5" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <ElementFromList :name="'insulationType'" :replaceTitle="'Insulation'" :options="insulationTypes" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <!-- Bridge Type -->
      <ElementFromList :name="'bridgeType'" :replaceTitle="'Bridge Type'" :options="['Half Bridge', 'Full Bridge']" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
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
