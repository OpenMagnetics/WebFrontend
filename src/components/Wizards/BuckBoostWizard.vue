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
import { defaultBuckWizardInputs, defaultBoostWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from '/WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
</script>

<script>

export default {
    props: {
        converterName: {
            type: String,
            default: 'Buck',
        },
        dataTestLabel: {
            type: String,
            default: 'BuckWizard',
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
        const currentOptions = ['The output current ratio', 'The maximum switch current'];
        const errorMessage = "";
        var localData = {};
        if (this.converterName == "Buck") {
            localData = deepCopy(defaultBuckWizardInputs);
        }
        else {
            localData = deepCopy(defaultBoostWizardInputs);
        }

        localData["currentOptions"] = currentOptions[0];
        return {
            masStore,
            taskQueueStore,
            designLevelOptions,
            currentOptions,
            localData,
            errorMessage,
            simulatingWaveforms: false,
            waveformSource: null, // 'simulation' or 'analytical'
            waveformError: "",
            simulatedOperatingPoints: [],
            simulatedInductance: null,
            designRequirements: null,
            magneticWaveforms: [],
            converterWaveforms: [],
            waveformViewMode: 'magnetic',
            forceWaveformUpdate: 0,
            numberOfPeriods: 2,
            numberOfSteadyStatePeriods: 10,
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
    mounted () {
        this.updateErrorMessage();
    },
    methods: {

    // ===== WIZARD CONTRACT =====
    buildParams(mode) {
      const aux = {};
      aux['inputVoltage'] = this.localData.inputVoltage;
      aux['diodeVoltageDrop'] = this.localData.diodeVoltageDrop;
      aux['efficiency'] = this.localData.efficiency;
      if (this.localData.designLevel == 'I know the design I want') {
        aux['desiredInductance'] = this.localData.inductance;
      } else {
        if (this.localData.currentOptions == 'The output current ratio') { aux['currentRippleRatio'] = this.localData.currentRippleRatio; }
        else { aux['maximumSwitchCurrent'] = this.localData.maximumSwitchCurrent; }
      }
      const auxOp = {};
      auxOp['outputVoltage'] = this.localData.outputsParameters.voltage;
      auxOp['outputCurrent'] = this.localData.outputsParameters.current;
      auxOp['switchingFrequency'] = this.localData.switchingFrequency;
      auxOp['ambientTemperature'] = this.localData.ambientTemperature;
      aux['operatingPoints'] = [auxOp];
      return aux;
    },
    getCalculateFn() {
      const n = this.converterName;
      if (this.localData.designLevel == 'I know the design I want') return (aux) => this.taskQueueStore[`calculateAdvanced${n}Inputs`](aux);
      return (aux) => this.taskQueueStore[`calculate${n}Inputs`](aux);
    },
    getSimulateFn() { const n = this.converterName; return (aux) => this.taskQueueStore[`simulate${n}IdealWaveforms`](aux); },
    getDefaultFrequency() { return this.localData.switchingFrequency; },
    postProcessResults(result, mode) {
      if (this.designRequirements) this.simulatedInductance = this.designRequirements.magnetizingInductance?.nominal || null;
    },
    getTopology() { return this.converterName; },
    getIsolationSides() { return ['primary']; },

            updateErrorMessage() {
            this.errorMessage = "";
            if (this.converterName == "Buck") {
                if (this.localData.inputVoltage.minimum < this.localData.outputsParameters.voltage) {
                    this.errorMessage = "Minimum input voltage cannot be smaller than output voltage";
                }
                if (this.localData.inputVoltage.maximum < this.localData.outputsParameters.voltage) {
                    this.errorMessage = "Maximum input voltage cannot be smaller than output voltage";
                }
            }
            else {
                if (this.localData.inputVoltage.minimum > this.localData.outputsParameters.voltage) {
                    this.errorMessage = "Minimum input voltage cannot be larger than output voltage";
                }
                if (this.localData.inputVoltage.maximum > this.localData.outputsParameters.voltage) {
                    this.errorMessage = "Maximum input voltage cannot be larger than output voltage";
                }
            }
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

            if (this.errorMessage == "") {
                await this.$refs.base.navigateToReview(this.$stateStore, this.masStore, "Power");
                if (this.errorMessage == "") {
                    setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);}, 100);
                }
                else {
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
                }
                else {
                    setTimeout(() => {this.errorMessage = ""}, 5000);
                }
            }
        },
        async simulateIdealWaveforms() {
      await this.$refs.base.executeWaveformAction(this, 'simulation');
    },
        async getAnalyticalWaveforms() {
      await this.$refs.base.executeWaveformAction(this, 'analytical');
    },
        getInductanceDisplay() {
            let inductance = this.simulatedInductance;
            if (!inductance && this.designRequirements?.magnetizingInductance) {
                inductance = this.designRequirements.magnetizingInductance;
            }
            if (!inductance) return 'N/A';
            
            const value = inductance.nominal || inductance.minimum;
            if (!value) return 'N/A';
            
            if (value >= 1e-3) return (value * 1e3).toFixed(2) + ' mH';
            if (value >= 1e-6) return (value * 1e6).toFixed(2) + ' µH';
            return (value * 1e9).toFixed(2) + ' nH';
        },
        getDutyCycleDisplay() {
            if (this.simulatedOperatingPoints.length > 0 && this.simulatedOperatingPoints[0].dutyCycle) {
                return (this.simulatedOperatingPoints[0].dutyCycle * 100).toFixed(1) + '%';
            }
            return 'N/A';
        },
        // Synthesize time-domain waveform from harmonics (Fourier synthesis)
        synthesizeWaveformFromHarmonics(harmonics, frequency, numPoints = 200) {
            if (!harmonics?.amplitudes || !harmonics?.frequencies || harmonics.amplitudes.length === 0) {
                return null;
            }
            
            const period = 1 / frequency;
            const xData = [];
            const yData = [];
            
            for (let i = 0; i < numPoints; i++) {
                const t = (i / numPoints) * period * this.numberOfPeriods;
                xData.push(t);
                
                let value = 0;
                for (let h = 0; h < harmonics.amplitudes.length; h++) {
                    const amplitude = harmonics.amplitudes[h];
                    const freq = harmonics.frequencies[h];
                    const phase = harmonics.phases ? harmonics.phases[h] : 0;
                    
                    if (freq === 0) {
                        // DC component
                        value += amplitude;
                    } else {
                        // AC component
                        value += amplitude * Math.cos(2 * Math.PI * freq * t + phase);
                    }
                }
                yData.push(value);
            }
            
            return { x: xData, y: yData };
        },
                        getPairedWaveformsList(waveforms, operatingPointIndex, isMagnetic = false) {
            if (!waveforms || !waveforms[operatingPointIndex] || !waveforms[operatingPointIndex].waveforms) {
                return [];
            }
            
            let allWaveforms = waveforms[operatingPointIndex].waveforms;
            
            // For magnetic view, filter to only show winding/inductor waveforms (not switch node)
            if (isMagnetic) {
                allWaveforms = allWaveforms.filter(wf => 
                    wf.label.toLowerCase().includes('winding') || 
                    wf.label.toLowerCase().includes('inductor') ||
                    wf.label.toLowerCase().includes('magnetizing') ||
                    wf.label.toLowerCase().includes('primary') ||
                    wf.label.toLowerCase().includes('secondary')
                );
                
                const pairs = [];
                const used = new Set();
                
                // Standard V/I pairing for magnetic view
                for (let i = 0; i < allWaveforms.length; i++) {
                    if (used.has(i)) continue;
                    
                    const wf = allWaveforms[i];
                    const isVoltage = wf.unit === 'V';
                    const isCurrent = wf.unit === 'A';
                    
                    // Find matching pair
                    let pairIndex = -1;
                    const labelPrefix = wf.label.replace(/(Voltage|Current)/i, '').trim();
                    
                    for (let j = 0; j < allWaveforms.length; j++) {
                        if (i === j || used.has(j)) continue;
                        const otherWf = allWaveforms[j];
                        const otherPrefix = otherWf.label.replace(/(Voltage|Current)/i, '').trim();
                        
                        if (labelPrefix === otherPrefix) {
                            if ((isVoltage && otherWf.unit === 'A') || (isCurrent && otherWf.unit === 'V')) {
                                pairIndex = j;
                                break;
                            }
                        }
                    }
                    
                    if (pairIndex >= 0) {
                        used.add(i);
                        used.add(pairIndex);
                        pairs.push({ 
                            voltageWf: isVoltage ? allWaveforms[i] : allWaveforms[pairIndex], 
                            currentWf: isCurrent ? allWaveforms[i] : allWaveforms[pairIndex] 
                        });
                    } else {
                        used.add(i);
                        pairs.push({ 
                            voltageWf: isVoltage ? allWaveforms[i] : null, 
                            currentWf: isCurrent ? allWaveforms[i] : null 
                        });
                    }
                }
                
                return pairs;
            }
            
            // For converter view, create specific groupings:
            // 1. Switch Node Voltage + Inductor Current
            // 2. Input Voltage + Output Voltage (both on same graph)
            const pairs = [];
            
            // Find specific waveforms by label
            const switchNodeVoltage = allWaveforms.find(wf => wf.label.toLowerCase().includes('switch node'));
            const inductorCurrent = allWaveforms.find(wf => 
                (wf.label.toLowerCase().includes('inductor') || wf.label.toLowerCase().includes('primary')) && 
                wf.unit === 'A'
            );
            const inputVoltage = allWaveforms.find(wf => wf.label.toLowerCase().includes('input') && wf.unit === 'V');
            const outputVoltage = allWaveforms.find(wf => wf.label.toLowerCase().includes('output') && wf.unit === 'V');
            
            // Pair 1: Switch Node Voltage + Inductor Current
            if (switchNodeVoltage || inductorCurrent) {
                pairs.push({
                    voltageWf: switchNodeVoltage || null,
                    currentWf: inductorCurrent || null
                });
            }
            
            // Pair 2: Input Voltage + Output Voltage (special pair - both are voltages)
            if (inputVoltage || outputVoltage) {
                pairs.push({
                    leftWf: inputVoltage || null,
                    rightWf: outputVoltage || null,
                    isVoltagePair: true
                });
            }
            
            return pairs;
        },
                isVoltagePairAtIndex(waveforms, operatingPointIndex, pairIndex, isMagnetic) {
            const pairs = this.getPairedWaveformsList(waveforms, operatingPointIndex, isMagnetic);
            if (!pairs || pairIndex >= pairs.length) return false;
            return pairs[pairIndex].isVoltagePair === true;
        },
        getVoltagePairAxisLimits(waveforms, operatingPointIndex, pairIndex, isMagnetic) {
            // Returns { forceAxisMin: [min, min], forceAxisMax: [max, max] } for voltage pair
            // or null if not a voltage pair
            if (!this.isVoltagePairAtIndex(waveforms, operatingPointIndex, pairIndex, isMagnetic)) {
                return { forceAxisMin: null, forceAxisMax: null };
            }
            
            const data = this.getPairedWaveformDataForVisualizer(waveforms, operatingPointIndex, pairIndex, isMagnetic);
            if (!data || data.length < 2) {
                return { forceAxisMin: [0, 0], forceAxisMax: null };
            }
            
            // Get max of both voltage series
            const maxLeft = Math.max(...data[0].data.y);
            const maxRight = Math.max(...data[1].data.y);
            const sharedMax = Math.max(maxLeft, maxRight) * 1.1; // Add 10% margin
            
            return {
                forceAxisMin: [0, 0],
                forceAxisMax: [sharedMax, sharedMax]
            };
        },

                }
}

</script>

<template>
  <ConverterWizardBase
    ref="base"
    :title="converterName + ' Wizard'"
    titleIcon="fa-battery-half"
    subtitle="DC-DC Step Down/Up Converter"
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
        :name="'designLevel'"
        :dataTestLabel="dataTestLabel + '-DesignLevel'"
        :replaceTitle="''"
        :options="designLevelOptions"
        :titleSameRow="false"
        v-model="localData"
        :labelWidthProportionClass="'d-none'"
        :valueWidthProportionClass="'col-12'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'"
        :valueBgColor="'transparent'"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
    </template>

    <template #design-or-switch-parameters-title>
      <div class="compact-header"><i class="fa-solid fa-cogs me-1"></i>{{ localData.designLevel == 'I know the design I want' ? 'Design Params' : 'Current Requirement' }}</div>
    </template>

    <template #design-or-switch-parameters>
      <div v-if="localData.designLevel == 'I know the design I want'">
        <Dimension
          :name="'inductance'" :replaceTitle="'Inductance'" unit="H"
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
          :name="'currentOptions'"
          :dataTestLabel="dataTestLabel + '-CurrentOptions'"
          :replaceTitle="''"
          :options="currentOptions"
          :titleSameRow="false"
          v-model="localData"
          :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-12'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'" :valueBgColor="'transparent'"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />
        <Dimension v-if="localData.currentOptions == 'The maximum switch current'"
          :name="'maximumSwitchCurrent'" :replaceTitle="'Max Isw'" unit="A"
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
          :name="'currentRippleRatio'" :replaceTitle="'Ripple'" unit="%" :visualScale="100"
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
      <Dimension :name="'switchingFrequency'" :replaceTitle="'Sw. Frequency'" unit="Hz"
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
      <Dimension :name="'ambientTemperature'" :replaceTitle="'Temperature'" unit=" C"
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
      <Dimension :name="'diodeVoltageDrop'" :replaceTitle="'Diode Vd'" unit="V"
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
      <Dimension :name="'efficiency'" :replaceTitle="'Efficiency'" unit="%" :visualScale="100"
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
        <span v-if="errorMessage" class="error-text"><i class="fa-solid fa-exclamation-triangle me-1"></i>{{ errorMessage }}</span>
        <span v-else></span>
        <div class="action-btns">
          <button :disabled="errorMessage != ''" class="action-btn-sm secondary" @click="processAndReview"><i class="fa-solid fa-magnifying-glass me-1"></i>Review Specs</button>
          <button :disabled="errorMessage != ''" class="action-btn-sm primary" @click="processAndAdvise"><i class="fa-solid fa-wand-magic-sparkles me-1"></i>Design Magnetic</button>
        </div>
      </div>
    </template>

    <template #input-voltage>
      <DimensionWithTolerance
        :name="'inputVoltage'" :replaceTitle="''" unit="V"
        :dataTestLabel="dataTestLabel + '-InputVoltage'"
        :min="minimumMaximumScalePerParameter['voltage']['min']"
        :max="minimumMaximumScalePerParameter['voltage']['max']"
        :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-4'"
        v-model="localData.inputVoltage"
        :severalRows="true"
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
      <Dimension
        :name="'voltage'" :replaceTitle="'Voltage'" unit="V"
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
        :name="'current'" :replaceTitle="'Current'" unit="A"
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
  </ConverterWizardBase>
</template>
