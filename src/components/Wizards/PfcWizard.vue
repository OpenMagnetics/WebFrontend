<script setup>
import { IsolationSide, Topologies } from 'WebSharedComponents/assets/ts/MAS.ts'
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { combinedStyle, combinedClass, deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import DimensionReadOnly from 'WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromListRadio from 'WebSharedComponents/DataInput/ElementFromListRadio.vue'
import ElementFromList from 'WebSharedComponents/DataInput/ElementFromList.vue'
import DimensionWithTolerance from 'WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { defaultPfcWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from 'WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
import { waitForMkf } from 'WebSharedComponents/assets/js/mkfRuntime'
import CompactVoltageInput from './CompactVoltageInput.vue'
import { tooltipsConverterWizards, dropdownLabelsConverterWizards } from 'WebSharedComponents/assets/js/texts'
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
        const modeOptions = ['continuousConductionMode', 'criticalConductionMode', 'discontinuousConductionMode'];
        // Supported PFC power-stage variants (buck/buckBoost throw in MKF; Vienna
        // has its own wizard, so they are intentionally not offered here).
        const variantOptions = ['boost', 'bridgeless', 'semiBridgeless', 'interleavedBoost', 'totemPole', 'sepic', 'cuk'];
        const phaseOptions = [2, 3];
        const errorMessage = "";
        const localData = deepCopy(defaultPfcWizardInputs);
        return {
            pfcDiagnostics: null,
            masStore,
            taskQueueStore,
            designLevelOptions,
            modeOptions,
            variantOptions,
            phaseOptions,
            dropdownLabelsConverterWizards,
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
            numberOfSteadyStatePeriods: 50,
            converterName: 'Power Factor Correction (PFC)',
            detectedMode: null
        }
    },
    computed: {
        isCcmMode() {
            return this.localData.mode === 'continuousConductionMode';
        },
        isInterleaved() {
            return this.localData.topologyVariant === 'interleavedBoost';
        },
        isTotemPole() {
            return this.localData.topologyVariant === 'totemPole';
        },
        // SEPIC / Ćuk are buck-boost class: the output may sit below the line
        // peak, so the "Vout > Vpk" boost constraint does not apply to them.
        isBuckBoostClass() {
            return this.localData.topologyVariant === 'sepic' || this.localData.topologyVariant === 'cuk';
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
        this.$nextTick(() => {
            if (this._autoRunDone) return;
            this._autoRunDone = true;
            try { this.updateErrorMessage?.(); } catch (e) { return; }
            if (!this.errorMessage) this.simulateIdealWaveforms?.();
        });
    },
    methods: {

    // Topology-variant params shared by every MKF call. The MAS schema parses
    // these directly (PowerFactorCorrection(json)), so no extra backend wiring
    // is needed. numberOfPhases only matters for interleavedBoost;
    // wideBandgapSwitch only for totemPole CCM — both are harmless otherwise.
    variantParams() {
      return {
        topologyVariant: this.localData.topologyVariant,
        numberOfPhases: Number(this.localData.numberOfPhases) || 2,
        wideBandgapSwitch: this.localData.wideBandgapSwitch !== false,
      };
    },

    // ===== WIZARD CONTRACT =====
    buildParams(mode) {
      const aux = {
        inputVoltage: this.localData.inputVoltage, outputVoltage: this.localData.outputVoltage,
        outputPower: this.localData.outputPower, switchingFrequency: this.localData.switchingFrequency,
        lineFrequency: this.localData.lineFrequency, currentRippleRatio: this.localData.currentRippleRatio,
        efficiency: this.localData.efficiency, mode: this.localData.mode,
        diodeVoltageDrop: this.localData.diodeVoltageDrop, ambientTemperature: this.localData.ambientTemperature,
        ...this.variantParams(),
      };
      if (this.localData.designLevel == 'I know the design I want') aux.inductance = this.localData.inductance;
      if (mode === 'spice') {
        const outputCurrent = this.localData.outputPower / this.localData.outputVoltage;
        aux.operatingPoints = [{
          outputVoltage: this.localData.outputVoltage,
          outputCurrent,
          switchingFrequency: this.localData.switchingFrequency,
          ambientTemperature: this.localData.ambientTemperature,
        }];
      }
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
            this.pfcDiagnostics = result?.pfcDiagnostics ?? null;
      if (result.inductance) this.simulatedInductance = result.inductance;
      // calculate_pfc_inputs returns { masInputs: {designRequirements,
      // operatingPoints}, inductance, ... }. Capture DR so the Adviser path
      // (process()) doesn't fall through to its skeleton-DR fallback, which
      // omits required keys like turnsRatios.
      const dr = result?.masInputs?.designRequirements ?? result?.designRequirements;
      if (dr) this.designRequirements = dr;
    },
    getTopology() { return Topologies.PowerFactorCorrection; },
    getIsolationSides() { return [IsolationSide.Primary]; },
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

            // Boost-family PFC can only step up, so Vout must exceed the peak
            // input. SEPIC / Ćuk are buck-boost class and may regulate a bus
            // below the line peak, so this constraint does not apply to them.
            if (!this.isBuckBoostClass) {
                const vinMax = this.localData.inputVoltage.maximum || this.localData.inputVoltage.nominal;
                const vinPeakMax = vinMax * Math.sqrt(2);
                if (this.localData.outputVoltage <= vinPeakMax) {
                    this.errorMessage = `Output voltage (${this.localData.outputVoltage}V) must be greater than peak input (${vinPeakMax.toFixed(1)}V)`;
                    return;
                }
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

                // Reuse buildParams() — the single param source — so the variant
                // fields can never drift from the analytical/simulation/spice
                // paths. determine_pfc_mode takes inductance as an explicit arg
                // and ignores the (harmless) extra keys.
                const params = this.buildParams('analytical');

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
        
        async simulateIdealWaveforms() {
      await this.$refs.base.executeWaveformAction(this, 'simulation');
    },
    async getSpiceCode() {
      await this.$refs.base.generateSpiceCode(this);
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
            if (this.errorMessage) return null;

            this.masStore.resetMas("power");
            this.$stateStore.closeCoilAdvancedInfo();

            // Delegate to the shared base contract, exactly like every other
            // converter wizard (SepicWizard, BuckBoostWizard, …). The base reads
            // the single source of truth — buildParams() — for the analytical
            // fallback and the stored simulatedOperatingPoints for the common
            // path, so topologyVariant flows through one place only.
            try {
                const result = await this.$refs.base.processWizardData(this, this.taskQueueStore);
                if (!result.success) {
                    this.errorMessage = result.error;
                    return null;
                }
                this.designRequirements = result.designRequirements;
                this.errorMessage = "";
                return this.masStore.mas.inputs;
            } catch (error) {
                console.error('Error processing design:', error);
                this.errorMessage = error.message || String(error);
                return null;
            }
        },
        
        async processAndReview() {
            const masInputs = await this.process();

            if (this.errorMessage || !masInputs) {
                return;
            }

            await this.$refs.base.navigateToReview(this.$stateStore, this.masStore, "Power");
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
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
    titleIcon="pi pi-sitemap"
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
      <ElementFromList class="mt-2"
        :name="'topologyVariant'" :tooltip="tooltipsConverterWizards['topologyVariant']" :replaceTitle="'Topology'"
        :options="variantOptions" :optionLabels="dropdownLabelsConverterWizards.pfcVariant" :titleSameRow="true"
        :dataTestLabel="dataTestLabel + '-TopologyVariant'"
        v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <ElementFromList v-if="isInterleaved"
        :name="'numberOfPhases'" :tooltip="tooltipsConverterWizards['numberOfPhases']" :replaceTitle="'Phases'"
        :options="phaseOptions" :titleSameRow="true"
        :dataTestLabel="dataTestLabel + '-NumberOfPhases'"
        v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <div v-if="isTotemPole" class="mt-1 px-1" :data-cy="dataTestLabel + '-TotemPoleHint'">
        <small class="text-color-secondary"><i class="pi pi-info-circle mr-1"></i>Totem-pole CCM uses wide-bandgap (GaN/SiC) switches.</small>
      </div>
    </template>

    <template #design-or-switch-parameters-title>
      <div class="compact-header"><i class="pi pi-cog-wide-connected mr-1"></i>{{localData.designLevel == 'I know the design I want' ? "Design Params" : "Operating Mode"}}</div>
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
        <div v-if="detectedMode" class="mt-2 p-2 rounded" :class="$styleStore.wizard.inputValueBgColor">
          <small class="text-color-secondary">Detected Mode:</small><br>
          <strong :style="{ color: $styleStore.wizard.inputTextColor }">{{ detectedMode }}</strong>
        </div>
      </div>
      <div v-else>
        <ElementFromListRadio
          :name="'mode'" :tooltip="tooltipsConverterWizards['mode']" :dataTestLabel="dataTestLabel + '-Mode'"
          :replaceTitle="''" :options="modeOptions" :titleSameRow="false"
          :optionLabels="dropdownLabelsConverterWizards.pfcMode"
          v-model="localData"
          :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-12'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'" :valueBgColor="'transparent'"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />
        <Dimension v-if="isCcmMode" :name="'currentRippleRatio'" :tooltip="tooltipsConverterWizards['currentRippleRatio']" :replaceTitle="'Ripple'" unit="%" :visualScale="100"
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
      <Dimension :name="'lineFrequency'" :tooltip="tooltipsConverterWizards['lineFrequency']" :replaceTitle="'Line Freq'" unit="Hz"
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
      <Dimension :name="'outputVoltage'" :tooltip="tooltipsConverterWizards['outputVoltage']" :replaceTitle="'Voltage'" unit="V"
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
      <Dimension :name="'outputPower'" :tooltip="tooltipsConverterWizards['outputPower']" :replaceTitle="'Power'" unit="W"
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
      <template v-if="pfcDiagnostics" #diagnostics>
      <DimensionReadOnly name="pfcInd" :tooltip="tooltipsConverterWizards['pfcInd']" :replaceTitle="'Computed L'" :value="pfcDiagnostics.computedInductance" unit="H" :numberDecimals="9":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-PfcInd'" />
      <DimensionReadOnly name="pfcMode" :tooltip="tooltipsConverterWizards['pfcMode']" :replaceTitle="'Actual mode'" :value="pfcDiagnostics.actualMode" :unit="null" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-PfcMode'" />
      <DimensionReadOnly name="pfcDuty" :tooltip="tooltipsConverterWizards['pfcDuty']" :replaceTitle="'Duty @ peak'" :value="pfcDiagnostics.dutyCyclePeak" :unit="null" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-PfcDuty'" />
      <DimensionReadOnly name="pfcIlPk" :tooltip="tooltipsConverterWizards['pfcIlPk']" :replaceTitle="'I_L peak'" :value="pfcDiagnostics.peakInductorCurrent" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-PfcIlPk'" />
      <DimensionReadOnly name="pfcIlRipple" :tooltip="tooltipsConverterWizards['pfcIlRipple']" :replaceTitle="'I_L ripple'" :value="pfcDiagnostics.inductorRipple" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-PfcIlRipple'" />
      <DimensionReadOnly name="pfcIline" :tooltip="tooltipsConverterWizards['pfcIline']" :replaceTitle="'I_line rms'" :value="pfcDiagnostics.lineRmsCurrent" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-PfcIline'" />
      <DimensionReadOnly name="pfcPin" :tooltip="tooltipsConverterWizards['pfcPin']" :replaceTitle="'P_in'" :value="pfcDiagnostics.inputPower" unit="W" :numberDecimals="1":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-PfcPin'" />
    </template>
  </ConverterWizardBase>
</template>
