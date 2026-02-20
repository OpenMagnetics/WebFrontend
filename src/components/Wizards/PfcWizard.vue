<script setup>
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { combinedStyle, combinedClass, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromListRadio from '/WebSharedComponents/DataInput/ElementFromListRadio.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { defaultPfcWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from '/WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
import { waitForMkf } from '/WebSharedComponents/assets/js/mkfRuntime'
</script>

<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: 'PfcWizard',
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
        const modeOptions = ['Continuous Conduction Mode', 'Critical Conduction Mode', 'Discontinuous Conduction Mode'];
        const errorMessage = "";
        const localData = deepCopy(defaultPfcWizardInputs);
        return {
            masStore,
            taskQueueStore,
            designLevelOptions,
            modeOptions,
            localData,
            errorMessage,
            simulatingWaveforms: false,
            waveformError: "",
            simulatedOperatingPoints: [],
            designRequirements: null,
            simulatedInductance: null,
            simulatedInductance: null,
            magneticWaveforms: [],
            converterWaveforms: [],
            waveformViewMode: 'magnetic', // 'magnetic' or 'converter'
            waveformSource: 'analytical', // 'analytical' or 'simulation'
            forceWaveformUpdate: 0,
            numberOfPeriods: 2,
            numberOfSteadyStatePeriods: 10,
            converterName: 'Power Factor Correction (PFC)',
            detectedMode: null
        }
    },
    computed: {
        isCcmMode() {
            return this.localData.mode === 'Continuous Conduction Mode';
        }
    },
    watch: {
        'localData.inductance': {
            handler(newVal) {
                if (this.localData.designLevel === 'I know the design I want' && newVal > 0) {
                    this.detectActualMode();
                }
            },
            immediate: true
        },
        'localData.designLevel'(newVal) {
            if (newVal === 'I know the design I want' && this.localData.inductance > 0) {
                this.detectActualMode();
            } else {
                this.detectedMode = null;
            }
        },
        waveformViewMode() {
            this.$nextTick(() => {
                this.forceWaveformUpdate += 1;
            });
        },
    },
    mounted() {
        // Run detection on mount if already in "I know the design I want" mode
        if (this.localData.designLevel === 'I know the design I want' && this.localData.inductance > 0) {
            this.detectActualMode();
        }
    },
    methods: {

    // ===== WIZARD CONTRACT =====
    buildParams(mode) {
      const aux = {
        inputVoltage: this.localData.inputVoltage, outputVoltage: this.localData.outputVoltage,
        outputPower: this.localData.outputPower, switchingFrequency: this.localData.switchingFrequency,
        lineFrequency: this.localData.lineFrequency, currentRippleRatio: this.localData.currentRippleRatio,
        efficiency: this.localData.efficiency, mode: this.localData.mode,
        diodeVoltageDrop: this.localData.diodeVoltageDrop, ambientTemperature: this.localData.ambientTemperature,
      };
      if (this.localData.designLevel == 'I know the design I want') aux.inductance = this.localData.inductance;
      return aux;
    },
    getCalculateFn() {
      return async (aux) => {
        const Module = await waitForMkf(); await Module.ready;
        const result = JSON.parse(await Module.calculate_pfc_inputs(JSON.stringify(aux)));
        if (result.error) throw new Error(result.error);
        return result;
      };
    },
    getSimulateFn() {
      return async (aux) => {
        const Module = await waitForMkf(); await Module.ready;
        const result = JSON.parse(await Module.simulate_pfc_waveforms(JSON.stringify(aux)));
        if (result.error) throw new Error(result.error);
        return result;
      };
    },
    getDefaultFrequency() { return this.localData.switchingFrequency; },
    postProcessResults(result, mode) {
      if (result.inductance) this.simulatedInductance = result.inductance;
    },
    getTopology() { return 'PFC'; },
    getIsolationSides() { return ['primary']; },
    getInsulationType() { return null; },

        updateErrorMessage() {
            this.errorMessage = "";

            // Validation checks
            if (this.localData.outputVoltage <= 0) {
                this.errorMessage = "Output voltage must be positive";
                return;
            }
            if (this.localData.outputPower <= 0) {
                this.errorMessage = "Output power must be positive";
                return;
            }

            // Check that output voltage > peak input voltage
            const vinMax = this.localData.inputVoltage.maximum || this.localData.inputVoltage.nominal;
            const vinPeakMax = vinMax * Math.sqrt(2);
            if (this.localData.outputVoltage <= vinPeakMax) {
                this.errorMessage = `Output voltage (${this.localData.outputVoltage}V) must be greater than peak input (${vinPeakMax.toFixed(1)}V)`;
                return;
            }
        },

        async detectActualMode() {
            if (this.localData.designLevel !== 'I know the design I want' || this.localData.inductance <= 0) {
                this.detectedMode = null;
                return;
            }

            try {
                const Module = await waitForMkf();
                await Module.ready;

                const params = {
                    inputVoltage: this.localData.inputVoltage,
                    outputVoltage: this.localData.outputVoltage,
                    outputPower: this.localData.outputPower,
                    switchingFrequency: this.localData.switchingFrequency,
                    efficiency: this.localData.efficiency,
                    diodeVoltageDrop: this.localData.diodeVoltageDrop
                };

                const result = JSON.parse(await Module.determine_pfc_mode(JSON.stringify(params), this.localData.inductance));

                if (!result.error) {
                    this.detectedMode = result.actualMode;
                }
            } catch (error) {
                console.error('Error detecting PFC mode:', error);
            }
        },
        
        async getAnalyticalWaveforms() {
      await this.$refs.base.executeWaveformAction(this, 'analytical');
    },
        
        async getSimulatedWaveforms() {
      await this.$refs.base.executeWaveformAction(this, 'simulation');
    },
        
            
            
            
            
        getWaveformsForView() {
            return this.waveformViewMode === 'magnetic' ? this.magneticWaveforms : this.converterWaveforms;
        },
        
        getWaveformDataForVisualizer(waveforms, operatingPointIndex) {
            if (!waveforms || !waveforms[operatingPointIndex] || !waveforms[operatingPointIndex].waveforms) {
                return [];
            }
            return waveforms[operatingPointIndex].waveforms;
        },
        
            
            getSingleWaveformAxisLimits(waveforms, operatingPointIndex, waveformIndex) {
            if (!waveforms || !waveforms[operatingPointIndex] || !waveforms[operatingPointIndex].waveforms) {
                return { min: null, max: null };
            }
            
            const wf = waveforms[operatingPointIndex].waveforms[waveformIndex];
            if (!wf || !wf.y || wf.y.length === 0) return { min: null, max: null };
            
            // Use percentiles to avoid outliers affecting the scale
            const yData = [...wf.y].sort((a, b) => a - b);
            const p5 = yData[Math.floor(yData.length * 0.05)];
            const p95 = yData[Math.floor(yData.length * 0.95)];
            const range = p95 - p5;
            const margin = range * 0.1;
            
            return { min: p5 - margin, max: p95 + margin };
        },
        
        async process() {
            this.updateErrorMessage();
            if (this.errorMessage) return;
            
            this.masStore.resetMas("power");
            
            try {
                // Check if we have stored operating points with waveforms (from Analytical or Simulated)
                const hasStoredData = this.simulatedOperatingPoints && this.simulatedOperatingPoints.length > 0;
                
                let masInputs;
                
                if (hasStoredData) {
                    // Use stored data - extract single period from waveforms
                    const freq = this.getDefaultFrequency();
                    const ops = this.$refs.base.extractSinglePeriodFromOperatingPoints(this.simulatedOperatingPoints, freq);
                    
                    // Calculate harmonics and processed data if missing
                    const opsWithHarmonics = await this.$refs.base.processSimulatedOperatingPoints(ops, this.taskQueueStore);
                    
                    // Get designRequirements from stored data or compute basic ones
                    const dr = this.designRequirements || {
                        topology: 'PFC',
                        magnetizingInductance: this.simulatedInductance ? { nominal: this.simulatedInductance } : null
                    };
                    
                    // Setup masStore
                    await this.$refs.base.setupMasStore({
                        designRequirements: dr,
                        operatingPoints: opsWithHarmonics,
                        topology: this.getTopology(),
                        isolationSides: this.getIsolationSides(),
                        insulationType: this.getInsulationType(),
                        wizardInstance: this
                    });
                    
                    this.errorMessage = "";
                    return this.masStore.mas.inputs;
                } else {
                    // Fallback: run analytical calculation via MKF
                    const Module = await waitForMkf();
                    await Module.ready;
                    
                    const aux = {
                        inputVoltage: this.localData.inputVoltage,
                        outputVoltage: this.localData.outputVoltage,
                        outputPower: this.localData.outputPower,
                        switchingFrequency: this.localData.switchingFrequency,
                        lineFrequency: this.localData.lineFrequency,
                        currentRippleRatio: this.localData.currentRippleRatio,
                        efficiency: this.localData.efficiency,
                        mode: this.localData.mode,
                        diodeVoltageDrop: this.localData.diodeVoltageDrop,
                        ambientTemperature: this.localData.ambientTemperature
                    };
                    
                    if (this.localData.designLevel == 'I know the design I want') {
                        aux['inductance'] = this.localData.inductance;
                    }
                    
                    const result = JSON.parse(await Module.calculate_pfc_inputs(JSON.stringify(aux)));
                    
                    if (result.error) {
                        this.errorMessage = result.error;
                        return null;
                    }
                    
                    this.masStore.mas.inputs = result.masInputs;
                    this.errorMessage = "";
                    return result.masInputs;
                }
            } catch (error) {
                console.error('Error processing design:', error);
                this.errorMessage = error.message || String(error);
                return null;
            }
        },
        
        async processAndReview() {
            console.log('[PFC] processAndReview started');
            const masInputs = await this.process();

            if (this.errorMessage || !masInputs) {
                console.log('[PFC] processAndReview aborted - error or no masInputs');
                return;
            }

            console.log('[PFC] masInputs received:', JSON.stringify(masInputs, null, 2));

            console.log('[PFC] Calling resetMagneticTool...');
            await this.$refs.base.navigateToReview(this.$stateStore, this.masStore, "Power");
            console.log('[PFC] coil.functionalDescription:', this.masStore.mas.magnetic.coil.functionalDescription);

            console.log('[PFC] Calling $nextTick...');
            await this.$nextTick();
            console.log('[PFC] $nextTick done');

            console.log('[PFC] Navigating to magnetic_tool...');
            await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
            console.log('[PFC] Navigation done');
        },
        
        async processAndAdvise() {
            const masInputs = await this.process();

            if (this.errorMessage || !masInputs) return;

            await this.$refs.base.navigateToAdvise(this.$stateStore, this.masStore, "Power");

            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
        }
    }
}

</script>

<template>
  <ConverterWizardBase
    ref="base"
    title="PFC Wizard"
    titleIcon="fa-leaf"
    subtitle="Power Factor Correction Rectifier"
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
    @get-simulated-waveforms="getSimulatedWaveforms"
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
      <div class="compact-header"><i class="fa-solid fa-cogs me-1"></i>{{localData.designLevel == 'I know the design I want' ? "Design Params" : "Operating Mode"}}</div>
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
        <div v-if="detectedMode" class="mt-2 p-2 rounded" :class="$styleStore.wizard.inputValueBgColor">
          <small class="text-muted">Detected Mode:</small><br>
          <strong :style="{ color: $styleStore.wizard.inputTextColor }">{{ detectedMode }}</strong>
        </div>
      </div>
      <div v-else>
        <ElementFromListRadio
          :name="'mode'" :dataTestLabel="dataTestLabel + '-Mode'"
          :replaceTitle="''" :options="modeOptions" :titleSameRow="false"
          v-model="localData"
          :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-12'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'" :valueBgColor="'transparent'"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />
        <Dimension v-if="isCcmMode" :name="'currentRippleRatio'" :replaceTitle="'Ripple'" unit="%" :visualScale="100"
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
      <Dimension :name="'lineFrequency'" :replaceTitle="'Line Freq'" unit="Hz"
        :dataTestLabel="dataTestLabel + '-LineFrequency'"
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
      <Dimension :name="'outputVoltage'" :replaceTitle="'Voltage'" unit="V"
        :dataTestLabel="dataTestLabel + '-OutputVoltage'"
        :min="minimumMaximumScalePerParameter['voltage']['min']"
        :max="minimumMaximumScalePerParameter['voltage']['max']"
        v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <Dimension :name="'outputPower'" :replaceTitle="'Power'" unit="W"
        :dataTestLabel="dataTestLabel + '-OutputPower'"
        :min="1" :max="minimumMaximumScalePerParameter['power']['max']"
        v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
    </template>
  </ConverterWizardBase>
</template>
