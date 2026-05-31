<script setup>
import { InsulationType, IsolationSide, Topologies } from 'WebSharedComponents/assets/ts/MAS.ts'
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import DimensionReadOnly from 'WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromList from 'WebSharedComponents/DataInput/ElementFromList.vue'
import PairOfDimensions from 'WebSharedComponents/DataInput/PairOfDimensions.vue'
import { minimumMaximumScalePerParameter } from 'WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
import CompactVoltageInput from './CompactVoltageInput.vue'
import { tooltipsConverterWizards, dropdownLabelsConverterWizards } from 'WebSharedComponents/assets/js/texts'
</script>

<script>
export default {
    props: {
        dataTestLabel: { type: String, default: 'SrcWizard' },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        // SRC: Series-Resonant Converter — Ls + Cr only (no Lm tank component).
        // Output regulation by frequency modulation. Gain M = Vo/(n*Vin) <= 1
        // for full-bridge primary (HB halves it). Default Q chosen for moderate
        // selectivity (Q~1-2 typical). n picked so M_max ~ 0.9 at min Vin.
        const localData = {
            inputVoltage: { nominal: 400, tolerance: 0.1 },
            bridgeType: 'fullBridge',
            numberOutputs: 1,
            outputsParameters: [{ voltage: 48, power: 500 }],
            minSwitchingFrequency: 80000,
            maxSwitchingFrequency: 150000,
            resonantFrequency: 100000,
            operatingSwitchingFrequency: 100000,
            qualityFactor: 1.0,
            rectifierType: 'fullBridgeDiode',
            useSynchronousRectifier: false,
            isolated: true,
            turnsRatio: 8.33,
            magnetizingInductance: 1e-3,
            ambientTemperature: 25,
            efficiency: 0.96,
            insulationType: InsulationType.Basic,
            designMode: designLevelOptions[0],
            overrideSeriesInductance: false,
            seriesInductance: 50e-6,
            overrideResonantCapacitance: false,
            resonantCapacitance: 47e-9,
        };
        return {
            masStore,
            taskQueueStore,
            designLevelOptions,
            localData,
            insulationTypes: ['no', 'basic', 'reinforced'],
            bridgeOptions: ['halfBridge', 'fullBridge', 'fullBridgePhaseShift'],
            rectifierOptions: ['fullBridgeDiode', 'centerTappedDiode', 'currentDoubler'],
            dropdownLabelsConverterWizards,
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
            srcDiagnostics: null,
        }
    },
    computed: {
        wizardSubtitle() { return "Series Resonant DC-DC Converter"; },
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
        buildParams(mode) {
            const opFreq = this.localData.operatingSwitchingFrequency || this.localData.resonantFrequency;
            const outs = this.localData.outputsParameters || [];
            const aux = {
                inputVoltage: this.localData.inputVoltage,
                bridgeType: this.localData.bridgeType,
                minSwitchingFrequency: this.localData.minSwitchingFrequency,
                maxSwitchingFrequency: this.localData.maxSwitchingFrequency,
                resonantFrequency: this.localData.resonantFrequency,
                qualityFactor: this.localData.qualityFactor,
                rectifierType: this.localData.rectifierType,
                useSynchronousRectifier: this.localData.useSynchronousRectifier,
                isolated: this.localData.isolated,
                efficiency: this.localData.efficiency,
                operatingPoints: [{
                    outputVoltages: outs.map(o => o.voltage),
                    outputCurrents: outs.map(o => (o.voltage > 0 ? o.power / o.voltage : 0)),
                    switchingFrequency: opFreq,
                    ambientTemperature: this.localData.ambientTemperature,
                }],
            };
            if (this.localData.designMode === 'I know the design I want') {
                aux.desiredTurnsRatios = [this.localData.turnsRatio];
            }
            if (this.localData.overrideSeriesInductance && this.localData.seriesInductance > 0) {
                aux.desiredResonantInductance = this.localData.seriesInductance;
            }
            if (this.localData.overrideResonantCapacitance && this.localData.resonantCapacitance > 0) {
                aux.desiredResonantCapacitance = this.localData.resonantCapacitance;
            }
            if (mode === 'simulation') {
                aux.turnsRatio = this.localData.turnsRatio;
                aux.magnetizingInductance = this.localData.magnetizingInductance;
            }
            return aux;
        },
        getCalculateFn() { return (aux) => this.taskQueueStore.calculateSrcInputs(aux); },
        getSimulateFn() { return (aux) => this.taskQueueStore.simulateSrcIdealWaveforms(aux); },
        getDefaultFrequency() { return this.localData.resonantFrequency; },
        postProcessResults(result, mode) {
            this.srcDiagnostics = result?.srcDiagnostics || null;
            const Ls = this.srcDiagnostics?.computedResonantInductance;
            if (Ls && Ls > 0) this.simulatedMagnetizingInductance = Ls;
            if (this.designRequirements) {
                this.simulatedTurnsRatios = this.designRequirements.turnsRatios?.map(tr => tr.nominal) || [this.localData.turnsRatio];
            }
        },
        updateErrorMessage() { this.errorMessage = ""; },
        updateNumberOutputs(newNumber) {
            const n = Number(newNumber);
            if (n > this.localData.outputsParameters.length) {
                const diff = n - this.localData.outputsParameters.length;
                for (let i = 0; i < diff; i++) {
                    const last = this.localData.outputsParameters[this.localData.outputsParameters.length - 1] || { voltage: 48, power: 500 };
                    this.localData.outputsParameters.push({ voltage: last.voltage, power: last.power });
                }
            } else if (n < this.localData.outputsParameters.length) {
                const diff = this.localData.outputsParameters.length - n;
                this.localData.outputsParameters.splice(-diff, diff);
            }
            this.updateErrorMessage();
        },
        buildInputs() { return this.buildParams('analytical'); },
        hasSimulatedData() { return this.simulatedOperatingPoints && this.simulatedOperatingPoints.length > 0; },
        getFrequency() { return this.localData.resonantFrequency; },
        getTopology() { return Topologies.SeriesResonantConverter; },
        getIsolationSides() {
            // Same pattern as LLC: 1 primary + 2 windings per output (center-tap style coil virtualization).
            // For non-isolated SRC the topology degenerates but transformer-design path still expects sides.
            const sideAt = (i) => [IsolationSide.Primary, IsolationSide.Secondary, IsolationSide.Tertiary, IsolationSide.Quaternary, IsolationSide.Quinary, IsolationSide.Senary, IsolationSide.Septenary, IsolationSide.Octonary, IsolationSide.Nonary, IsolationSide.Denary][i] || ('winding' + i);
            const sides = [IsolationSide.Primary];
            const numOutputs = (this.localData.outputsParameters || []).length || 1;
            for (let i = 0; i < numOutputs; i++) {
                sides.push(sideAt(i + 1));
                if (this.localData.rectifierType === 'centerTappedDiode') sides.push(sideAt(i + 1));
            }
            return sides;
        },
        getInsulationType() { return this.localData.insulationType; },
        async process() {
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
        resolveDimensionValue(d) {
            if (!d) return null;
            if (d.nominal != null) return d.nominal;
            if (d.minimum != null) return d.minimum;
            if (d.maximum != null) return d.maximum;
            return null;
        },
        getComputedTurnsRatio() {
            if (!this.designRequirements?.turnsRatios?.length) return null;
            return this.resolveDimensionValue(this.designRequirements.turnsRatios[0]);
        },
        getComputedMagnetizingInductance() {
            return this.resolveDimensionValue(this.designRequirements?.magnetizingInductance);
        },
        hasComputedTankValues() { return this.designRequirements != null; },
    },
}
</script>

<template>
  <ConverterWizardBase
    ref="base"
    title="SRC Wizard"
    titleIcon="pi pi-volume-up"
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
    @get-spice-code="getSpiceCode"
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
      <div class="compact-header"><i class="pi pi-cog-wide-connected mr-1"></i>Tank</div>
    </template>

    <template #design-or-switch-parameters>
      <Dimension :name="'qualityFactor'" :tooltip="tooltipsConverterWizards['qualityFactor']" :replaceTitle="'Q Factor'" :unit="null" :min="0.1" :max="5" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-QualityFactor'" />
      <template v-if="localData.designMode === 'I know the design I want'">
        <Dimension :name="'turnsRatio'" :tooltip="tooltipsConverterWizards['turnsRatio']" :replaceTitle="'Turns'" :unit="null" :min="0.1" :max="100" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-TurnsRatio'" />
        <Dimension :name="'magnetizingInductance'" :tooltip="tooltipsConverterWizards['magnetizingInductance']" :replaceTitle="'Mag. Ind.'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-MagnetizingInductance'" />
      </template>
      <template v-else-if="hasComputedTankValues()">
        <DimensionReadOnly :name="'turnsRatio'" :tooltip="tooltipsConverterWizards['turnsRatio']" :replaceTitle="'Number Turns'" :unit="null" :value="getComputedTurnsRatio()" :numberDecimals="2" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-TurnsRatio'" />
        <DimensionReadOnly :name="'magnetizingInductance'" :tooltip="tooltipsConverterWizards['magnetizingInductance']" :replaceTitle="'Mag. Ind.'" unit="H" :value="getComputedMagnetizingInductance()" :numberDecimals="6" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-MagnetizingInductance'" />
      </template>
      <ElementFromList :name="'rectifierType'" :tooltip="tooltipsConverterWizards['rectifierType']" :replaceTitle="'Rectifier'" :options="rectifierOptions" :optionLabels="dropdownLabelsConverterWizards.srcRectifierType" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-RectifierType'" />
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.useSynchronousRectifier" id="useSynchronousRectifierSrc"><label class="form-check-label small" for="useSynchronousRectifierSrc" :style="{ color: $styleStore.wizard.inputTextColor }">Sync. Rect.</label></div>
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.isolated" id="isolatedSrc"><label class="form-check-label small" for="isolatedSrc" :style="{ color: $styleStore.wizard.inputTextColor }">Isolated</label></div>

      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.overrideSeriesInductance" id="overrideLsSrc" @change="updateErrorMessage"><label class="form-check-label small" for="overrideLsSrc" :style="{ color: $styleStore.wizard.inputTextColor }">Override Ls</label></div>
      <Dimension v-if="localData.overrideSeriesInductance" :name="'seriesInductance'" :tooltip="tooltipsConverterWizards['seriesInductance']" :replaceTitle="'Series Ind.'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-SeriesInductance'" />
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.overrideResonantCapacitance" id="overrideCrSrc" @change="updateErrorMessage"><label class="form-check-label small" for="overrideCrSrc" :style="{ color: $styleStore.wizard.inputTextColor }">Override Cr</label></div>
      <Dimension v-if="localData.overrideResonantCapacitance" :name="'resonantCapacitance'" :tooltip="tooltipsConverterWizards['resonantCapacitance']" :replaceTitle="'Resonant Cap.'" unit="F" :min="1e-12" :max="1e-3" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-ResonantCapacitance'" />
    </template>

    <template v-if="srcDiagnostics" #diagnostics>
      <!-- Single-design computed tank values always flat. -->
      <DimensionReadOnly :name="'srcLs'" :tooltip="tooltipsConverterWizards['srcLs']" :replaceTitle="'Series Ind.'" unit="H" :value="srcDiagnostics.computedResonantInductance" :numberDecimals="6" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-SrcLs'" />
      <DimensionReadOnly :name="'srcCr'" :tooltip="tooltipsConverterWizards['srcCr']" :replaceTitle="'Resonant Cap.'" unit="F" :value="srcDiagnostics.computedResonantCapacitance" :numberDecimals="9" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-SrcCr'" />
      <DimensionReadOnly :name="'srcFr'" :tooltip="tooltipsConverterWizards['srcFr']" :replaceTitle="'Res. Freq.'" unit="Hz" :value="srcDiagnostics.computedResonantFrequency" :numberDecimals="0" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-SrcFr'" />

      <!-- Per-OP table for the last_* fields that vary across V_in. -->
      <table
        v-if="Array.isArray(srcDiagnostics.perOp) && srcDiagnostics.perOp.length > 1"
        class="diagnostics-perop-table"
        :data-cy="dataTestLabel + '-Src-perOp-table'"
        :style="{ color: $styleStore.wizard.inputTextColor, fontSize: $styleStore.wizard.inputFontSize, width: '100%', borderCollapse: 'collapse', marginTop: '4px' }"
      >
        <thead>
          <tr>
            <th :style="{ textAlign: 'left', padding: '2px 4px', fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }"></th>
            <th v-for="(op, i) in srcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px', fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }">
              {{ op.operatingPointName || ('OP ' + i) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Gain M</td><td v-for="(op, i) in srcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.gainM).toFixed(3) }}</td></tr>
          <tr><td>Norm. Fsw Λ</td><td v-for="(op, i) in srcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.normalizedFsw).toFixed(3) }}</td></tr>
          <tr><td>I_r peak (A)</td><td v-for="(op, i) in srcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.irPeak).toFixed(3) }}</td></tr>
          <tr><td>V_cr peak (V)</td><td v-for="(op, i) in srcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ Number(op.vcrPeak).toFixed(2) }}</td></tr>
          <tr><td>Above resonance</td><td v-for="(op, i) in srcDiagnostics.perOp" :key="i" :style="{ textAlign: 'right', padding: '2px 4px' }">{{ op.isAboveResonance ? 'Yes' : 'No' }}</td></tr>
        </tbody>
      </table>
      <template v-else>
        <DimensionReadOnly :name="'srcM'" :tooltip="tooltipsConverterWizards['srcM']" :replaceTitle="'Converged Gain'" :unit="null" :value="srcDiagnostics.lastGainM" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-SrcM'" />
        <DimensionReadOnly :name="'srcFsw'" :tooltip="tooltipsConverterWizards['srcFsw']" :replaceTitle="'Normalized Freq.'" :unit="null" :value="srcDiagnostics.lastNormalizedFsw" :numberDecimals="3" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-SrcFsw'" />
      </template>
    </template>

    <template #conditions>
      <Dimension :name="'minSwitchingFrequency'" :tooltip="tooltipsConverterWizards['minSwitchingFrequency']" :replaceTitle="'Min. Freq.'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-MinSwitchingFrequency'" />
      <Dimension :name="'maxSwitchingFrequency'" :tooltip="tooltipsConverterWizards['maxSwitchingFrequency']" :replaceTitle="'Max. Freq.'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-MaxSwitchingFrequency'" />
      <Dimension :name="'resonantFrequency'" :tooltip="tooltipsConverterWizards['resonantFrequency']" :replaceTitle="'Res. Freq.'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-ResonantFrequency'" />
      <Dimension :name="'operatingSwitchingFrequency'" :tooltip="tooltipsConverterWizards['operatingSwitchingFrequency']" :replaceTitle="'Op. Freq.'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-OperatingSwitchingFrequency'" />
      <Dimension :name="'ambientTemperature'" :tooltip="tooltipsConverterWizards['ambientTemperature']" :replaceTitle="'Temp.'" unit=" C" :min="minimumMaximumScalePerParameter['temperature']['min']" :max="minimumMaximumScalePerParameter['temperature']['max']" :allowNegative="true" :allowZero="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-AmbientTemperature'" />
      <Dimension :name="'efficiency'" :tooltip="tooltipsConverterWizards['efficiency']" :replaceTitle="'Efficiency'" unit="%" :visualScale="100" :min="0.5" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-Efficiency'" />
      <ElementFromList :name="'insulationType'" :tooltip="tooltipsConverterWizards['insulationType']" :replaceTitle="'Insulation'" :options="insulationTypes" :optionLabels="dropdownLabelsConverterWizards.insulationType" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-InsulationType'" />
      <ElementFromList :name="'bridgeType'" :tooltip="tooltipsConverterWizards['bridgeType']" :replaceTitle="'Bridge'" :options="bridgeOptions" :optionLabels="dropdownLabelsConverterWizards.bridgeType" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage" :dataTestLabel="dataTestLabel + '-BridgeType'" />
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
      <div class="mb-2">
        <ElementFromList :name="'numberOutputs'" :tooltip="tooltipsConverterWizards['numberOutputs']" :replaceTitle="'Number of Outputs'" :options="Array.from({length: 10}, (_, i) => i + 1)" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateNumberOutputs" :dataTestLabel="dataTestLabel + '-NumberOutputs'" />
      </div>
      <div v-for="(datum, index) in localData.outputsParameters" :key="'src-output-' + index" class="mb-2">
        <PairOfDimensions
          :names="['voltage', 'power']"
          :dataTestLabel="dataTestLabel + '-OutputsParameters-' + index"
          :replaceTitle="['V' + (index + 1), 'P' + (index + 1)]"
          :units="['V', 'W']"
          :mins="[minimumMaximumScalePerParameter['voltage']['min'], 1]"
          :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['power']['max']]"
          v-model="localData.outputsParameters[index]"
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
