<script setup>
import { IsolationSide, Topologies, WaveformLabel } from 'WebSharedComponents/assets/ts/MAS.ts'
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import ElementFromList from 'WebSharedComponents/DataInput/ElementFromList.vue'
import { minimumMaximumScalePerParameter } from 'WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
import { tooltipsConverterWizards, dropdownLabelsConverterWizards } from 'WebSharedComponents/assets/js/texts'
</script>

<script>
// Current Transformer wizard (Measurement category).
// Passive transformer: primary = current to measure (typically 1 turn),
// secondary = N turns into a burden resistor. No PWM / no SPICE — process()
// just builds the operating-point waveforms from primary current and reflects
// to secondary via turnsRatio. Min magnetizing inductance fixed at 1 µH.
export default {
    props: { dataTestLabel: { type: String, default: 'CurrentTransformerWizard' } },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        // Typical Pearson-style CT: 100 A primary peak, 100:1 ratio
        // (so 1 A secondary peak), 50 Ω burden → 50 V output at full scale,
        // 50/60 Hz line current monitoring or 100 kHz switching current.
        const localData = {
            turnsRatio: 0.01,            // primary/secondary (1:100 step-up)
            burdenResistor: 50,
            diodeVoltageDrop: 0,
            secondaryDcResistance: 0.5,
            frequency: 100000,
            maximumPrimaryCurrentPeak: 100,
            maximumDutyCycle: 0.5,
            waveformLabel: 'Sinusoidal',
            ambientTemperature: 25,
        };
        return {
            masStore,
            taskQueueStore,
            localData,
            waveformOptions: ['Sinusoidal'],
            // NOTE: MAS WaveformLabel enum also defines unipolarRectangular
            // and unipolarTriangular, but MKF's process_current_transformer
            // crashes on those today with "Data vector size is not a power
            // of 2: 5" (FFT step requires N pow2; the rectangular/triangular
            // analytical builders emit a 5-sample waveform). Re-add them
            // once MKF either zero-pads to pow2 or the builders emit pow2
            // sample counts directly. Tracked by CT-UI-4 (deep testbench).
            dropdownLabelsConverterWizards,
            errorMessage: "",
            simulatingWaveforms: false,
            waveformSource: '',
            waveformError: "",
            magneticWaveforms: [],
            converterWaveforms: [],
            designRequirements: null,
            simulatedInductance: null,
            simulatedOperatingPoints: [],
            numberOfPeriods: 2,
            numberOfSteadyStatePeriods: 50,
            waveformViewMode: 'magnetic',
            forceWaveformUpdate: 0,
        }
    },
    watch: {
        waveformViewMode() { this.$nextTick(() => { this.forceWaveformUpdate += 1; }); },
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
        // CT process() in MKF takes the JSON directly. WaveformLabel string
        // expected by MAS enum is camelCase (sinusoidal / unipolarRectangular
        // / unipolarTriangular).
        waveformEnum() {
            const label = (this.localData.waveformLabel || '').toLowerCase().replace(/\s+/g, '');
            switch (label) {
                case 'sinusoidal': return 'sinusoidal';
                case 'unipolarrectangular': return 'unipolarRectangular';
                case 'unipolartriangular': return 'unipolarTriangular';
                default: return 'sinusoidal';
            }
        },
        buildParams(mode) {
            return {
                turnsRatio: this.localData.turnsRatio,
                secondaryDcResistance: this.localData.secondaryDcResistance,
                ambientTemperature: this.localData.ambientTemperature,
                burdenResistor: this.localData.burdenResistor,
                diodeVoltageDrop: this.localData.diodeVoltageDrop,
                frequency: this.localData.frequency,
                maximumDutyCycle: this.localData.maximumDutyCycle,
                maximumPrimaryCurrentPeak: this.localData.maximumPrimaryCurrentPeak,
                waveformLabel: this.waveformEnum(),
            };
        },
        getCalculateFn() { return (aux) => this.taskQueueStore.processCurrentTransformer(aux); },
        getSimulateFn() { return (aux) => this.taskQueueStore.processCurrentTransformer(aux); },
        getDefaultFrequency() { return this.localData.frequency; },
        postProcessResults(result, mode) {
            const L = this.designRequirements?.magnetizingInductance;
            if (L && (L.nominal || L.minimum)) {
                this.simulatedInductance = L.nominal ?? L.minimum;
            }
        },
        updateErrorMessage() {
            this.errorMessage = "";
            if (this.localData.turnsRatio <= 0) {
                this.errorMessage = "Turns ratio must be positive";
                return;
            }
            if (this.localData.maximumPrimaryCurrentPeak <= 0) {
                this.errorMessage = "Primary current peak must be positive";
                return;
            }
            if (this.localData.frequency <= 0) {
                this.errorMessage = "Frequency must be positive";
                return;
            }
        },
        buildInputs() { return this.buildParams('analytical'); },
        hasSimulatedData() { return this.simulatedOperatingPoints && this.simulatedOperatingPoints.length > 0; },
        getFrequency() { return this.localData.frequency; },
        getTopology() { return Topologies.CurrentTransformer; },
        getIsolationSides() { return [IsolationSide.Primary, IsolationSide.Secondary]; },
        getInsulationType() { return null; },
        async process() {
            this.updateErrorMessage();
            if (this.errorMessage) return false;
            this.masStore.resetMas("power");
            this.$stateStore.closeCoilAdvancedInfo();
            const result = await this.$refs.base.processWizardData(this, this.taskQueueStore);
            if (!result.success) { this.errorMessage = result.error; return false; }
            this.designRequirements = this.masStore.mas.inputs.designRequirements;
            return true;
        },
        async processAndReview() {
            const ok = await this.process();
            if (!ok) { setTimeout(() => { this.errorMessage = ""; }, 5000); return; }
            await this.$refs.base.navigateToReview(this.$stateStore, this.masStore, "Power");
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
        },
        async processAndAdvise() {
            const ok = await this.process();
            if (!ok) { setTimeout(() => { this.errorMessage = ""; }, 5000); return; }
            await this.$refs.base.navigateToAdvise(this.$stateStore, this.masStore, "Power");
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
        },
        async getAnalyticalWaveforms() { await this.$refs.base.executeWaveformAction(this, 'analytical'); },
        async simulateIdealWaveforms() { await this.$refs.base.executeWaveformAction(this, 'simulation'); },
        async getSpiceCode() { await this.$refs.base.generateSpiceCode(this); },
    },
}
</script>

<template>
  <ConverterWizardBase
    ref="base"
    title="Current Transformer Wizard"
    titleIcon="pi pi-wifi"
    subtitle="Passive Current Sensing Transformer"
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
    <template #design-or-switch-parameters-title>
      <div class="compact-header"><i class="pi pi-cog-wide-connected mr-1"></i>Sensor</div>
    </template>

    <template #design-or-switch-parameters>
      <Dimension :name="'turnsRatio'" :tooltip="tooltipsConverterWizards['turnsRatio']" :replaceTitle="'Turns Ratio'" :unit="null" :min="1e-4" :max="100" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-TurnsRatio'" />
      <Dimension :name="'burdenResistor'" :tooltip="tooltipsConverterWizards['burdenResistor']" :replaceTitle="'Burden R'" unit="Ω" :min="0.01" :max="10000" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-BurdenResistor'" />
      <Dimension :name="'secondaryDcResistance'" :tooltip="tooltipsConverterWizards['secondaryDcResistance']" :replaceTitle="'Sec. Rdc'" unit="Ω" :min="0" :max="1000" :allowZero="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-SecondaryDcResistance'" />
      <Dimension :name="'diodeVoltageDrop'" :tooltip="tooltipsConverterWizards['diodeVoltageDrop']" :replaceTitle="'Diode Vd'" unit="V" :min="0" :max="5" :allowZero="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-DiodeVoltageDrop'" />
    </template>

    <template #conditions>
      <Dimension :name="'frequency'" :tooltip="tooltipsConverterWizards['switchingFrequency']" :replaceTitle="'Freq.'" unit="Hz" :min="1" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-Frequency'" />
      <Dimension :name="'maximumDutyCycle'" :tooltip="tooltipsConverterWizards['maximumDutyCycle']" :replaceTitle="'Max. D'" :unit="null" :min="0.01" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-MaximumDutyCycle'" />
      <Dimension :name="'ambientTemperature'" :tooltip="tooltipsConverterWizards['ambientTemperature']" :replaceTitle="'Temp.'" unit=" C" :min="minimumMaximumScalePerParameter['temperature']['min']" :max="minimumMaximumScalePerParameter['temperature']['max']" :allowNegative="true" :allowZero="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-AmbientTemperature'" />
      <ElementFromList :name="'waveformLabel'" :tooltip="tooltipsConverterWizards['waveformLabel']" :replaceTitle="'Waveform'" :options="waveformOptions" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-WaveformLabel'" />
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
      <Dimension :name="'maximumPrimaryCurrentPeak'" :tooltip="tooltipsConverterWizards['maximumPrimaryCurrentPeak']" :replaceTitle="'Primary Peak I'" unit="A" :min="0.001" :max="100000" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-MaximumPrimaryCurrentPeak'" />
    </template>

    <template #outputs>
      <div class="text-color-secondary small p-2">
        Secondary peak = I_pk / N = {{ (localData.maximumPrimaryCurrentPeak * localData.turnsRatio).toFixed(3) }} A<br>
        Burden voltage ≈ {{ (localData.maximumPrimaryCurrentPeak * localData.turnsRatio * localData.burdenResistor).toFixed(2) }} V
      </div>
    </template>
  </ConverterWizardBase>
</template>
