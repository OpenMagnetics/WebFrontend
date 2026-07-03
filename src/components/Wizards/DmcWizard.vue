<script setup>
import { Topology } from 'WebSharedComponents/assets/ts/MAS.ts'
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import DimensionReadOnly from 'WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromListRadio from 'WebSharedComponents/DataInput/ElementFromListRadio.vue'
import { minimumMaximumScalePerParameter, isolationSideOrdered } from 'WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
import CompactVoltageInput from './CompactVoltageInput.vue'
import EmiSpectrumView from './EmiSpectrumView.vue'
import { tooltipsConverterWizards } from 'WebSharedComponents/assets/js/texts'
</script>

<script>
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: 'DmcWizard',
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        const configurationOptions = [
            '1 — Single line (asymmetric)',
            '2 — Single phase (Line + Neutral, balanced)',
            '3 — Three phase',
            '4 — Three phase + neutral',
        ];
        const errorMessage = "";
        const localData = {
            // Defaults aligned with Richtek AN008 / ASUW-1G reference
            // benchmark: 230 V EU mains, 3 A line current, 100 kHz SMPS,
            // 20 dB attenuation @ 150 kHz → L ≈ 530 μH (≈ ASUW-1G's 600 μH).
            // Keeps the default in the realistic residential range
            // (143–670 μH per ASU-1200 series) instead of CMC-class 5 mH.
            inputVoltage:        { nominal: 230, tolerance: 0.1 },
            operatingCurrent:    3,
            lineFrequency:       50,
            switchingFrequency:  100000,
            ambientTemperature:  25,
            configuration:       configurationOptions[1],
            designLevel:         designLevelOptions[0],
            // "I know" mode
            desiredInductance:   600e-6,
            // "Help me" mode
            filterCapacitance:   1e-6,
            attenuationPoints:   [{ _id: 0, frequency: 150000, attenuation: 20 }],
            _uidCounter:         1,
            // EMI spectrum view: ripple-current amplitude (DM noise source)
            // and the converter's switching fundamental (the spectrum's
            // f_sw selector starts here; user can edit inline).
            ripplePeakToPeak:    0.3,
            switchingFrequencyEmi: 100000,
            dutyCycleEmi:        0.5,
            lineImpedance:       50,
            regulatoryStandard:  'CISPR 32 Class B',
        };
        return {
            dmcDiagnostics: null,
            masStore,
            taskQueueStore,
            designLevelOptions,
            configurationOptions,
            localData,
            errorMessage,
            simulatingWaveforms: false,
            magneticWaveforms: [],
            converterWaveforms: [],
            waveformViewMode: 'magnetic',
            forceWaveformUpdate: 0,
            waveformError: "",
            waveformSource: null,
            simulatedOperatingPoints: [],
            simulatedInductance: null,
            designRequirements: null,
            numberOfPeriods: 2,
            numberOfSteadyStatePeriods: 50,
        }
    },
    computed: {
        numWindings() {
            return parseInt(this.localData.configuration.charAt(0));
        },
        configurationEnum() {
            // Schema enum strings (camelCase) that match
            // schemas/inputs/topologies/differentialModeChoke.json::configuration
            switch (this.numWindings) {
                case 1: return 'singlePhase';
                case 2: return 'singlePhaseBalanced';
                case 3: return 'threePhase';
                case 4: return 'threePhaseWithNeutral';
                default: throw new Error(`DmcWizard: invalid numWindings ${this.numWindings}`);
            }
        },
        previewInductanceFormatted() {
            const L = this.emiInductance;
            if (!L || L <= 0) return 'pending';
            if (L >= 1)    return L.toFixed(3) + ' H';
            if (L >= 1e-3) return (L * 1e3).toFixed(3) + ' mH';
            if (L >= 1e-6) return (L * 1e6).toFixed(2) + ' μH';
            return (L * 1e9).toFixed(1) + ' nH';
        },
        // The L value the spectrum view should plot against. Help mode uses
        // the engine-sized value (after Analytical/Simulated runs); "I know"
        // mode uses the user's input directly.
        emiInductance() {
            if (this.localData.designLevel === 'I know the design I want') {
                return this.localData.desiredInductance;
            }
            return this.simulatedInductance
                ?? this.designRequirements?.magnetizingInductance?.nominal
                ?? this.designRequirements?.magnetizingInductance?.minimum
                ?? null;
        },
    },
    watch: {
        waveformViewMode() {
            this.$nextTick(() => { this.forceWaveformUpdate += 1; });
        },
        // Debounced auto-refresh on any edit — same UX as CmcWizard.
        localData: {
            deep: true,
            handler() {
                clearTimeout(this._analyticalDebounceTimer);
                this._analyticalDebounceTimer = setTimeout(() => {
                    this.updateErrorMessage();
                    if (!this.errorMessage) this.getAnalyticalWaveforms?.();
                }, 800);
            }
        },
    },
    mounted() {
        this._analyticalDebounceTimer = null;
        this.updateErrorMessage();
        this.$nextTick(() => {
            if (this._autoRunDone) return;
            this._autoRunDone = true;
            if (!this.errorMessage) this.getAnalyticalWaveforms?.();
        });
    },
    beforeUnmount() {
        clearTimeout(this._analyticalDebounceTimer);
    },
    methods: {

        // ===== WIZARD CONTRACT =====
        buildParams(mode) {
            const aux = {
                configuration:       this.configurationEnum,
                inputVoltage:        this.localData.inputVoltage,
                operatingCurrent:    this.localData.operatingCurrent,
                lineFrequency:       this.localData.lineFrequency,
                switchingFrequency:  this.localData.switchingFrequency,
                ambientTemperature:  this.localData.ambientTemperature,
                filterCapacitance:   this.localData.filterCapacitance,
            };
            if (this.localData.designLevel === 'I know the design I want') {
                aux.minimumInductance = this.localData.desiredInductance;
            } else {
                aux.minimumImpedance = this.localData.attenuationPoints
                    .filter(p => p.frequency > 0 && p.attenuation > 0)
                    .map(p => ({
                        frequency: p.frequency,
                        // Attenuation (dB) → required series impedance over the LISN
                        // reference: Z = Z_line·(10^(A/20) − 1), the exact insertion-loss
                        // inverse (same formula as Kirchhoff's
                        // cmc_insertion_loss_to_impedance — the earlier 50·10^(A/20)
                        // hardcoded the LISN Z and overstated Z by up to ~10%).
                        // Kirchhoff SPEC §6.2 takes impedance as a bare number.
                        impedance: this.localData.lineImpedance
                                   * (Math.pow(10, p.attenuation / 20) - 1),
                    }));
            }
            return aux;
        },
        getCalculateFn() {
            const isAdvanced = this.localData.designLevel === 'I know the design I want';
            return async (aux) => {
                let result;
                if (isAdvanced) {
                    result = await this.taskQueueStore.calculateDmcInputs(aux);
                } else {
                    // Help mode: MKF's calculate_dmc_inputs requires
                    // minimumInductance to size the magnetizing-inductance
                    // requirement (it parses minimumImpedance but doesn't
                    // synthesise L from it). Run propose_dmc_design first to
                    // size L from the attenuation requirements + filter C,
                    // then calculate inputs with that L.
                    const proposal = await this.taskQueueStore.proposeDmcDesign(aux);
                    const proposedL = proposal?.inductance ?? proposal?.minimumInductance;
                    const auxWithL = proposedL ? { ...aux, minimumInductance: proposedL } : aux;
                    result = await this.taskQueueStore.calculateDmcInputs(auxWithL);
                }
                // numberOfPeriods is honored by MKF (calculate_dmc_inputs
                // calls repeat_operating_points_waveforms), so the result is
                // already expanded — no JS-side tiling needed.
                return result;
            };
        },
        getSimulateFn() {
            // mkf.simulate_dmc_waveforms returns one SPICE simulation per EMI
            // test frequency as a flat per-frequency array. Reshape the
            // lowest-frequency entry into a single MAS operating point so
            // ConverterWaveformVisualizer can render it. The full sweep's
            // attenuation numbers are available for a future DM spectrum view.
            return async (aux) => {
                const isAdvanced = this.localData.designLevel === 'I know the design I want';
                let inductance = isAdvanced ? this.localData.desiredInductance : null;
                let calc;
                if (isAdvanced) {
                    calc = await this.taskQueueStore.calculateDmcInputs(aux);
                } else {
                    const proposal = await this.taskQueueStore.proposeDmcDesign(aux);
                    inductance = proposal?.inductance ?? proposal?.minimumInductance ?? this.localData.desiredInductance;
                    const auxWithL = { ...aux, minimumInductance: inductance };
                    calc = await this.taskQueueStore.calculateDmcInputs(auxWithL);
                }
                let sweep;
                try {
                    sweep = await this.taskQueueStore.simulateDmcWaveforms(
                        aux, inductance, this.localData.filterCapacitance);
                } catch (e) {
                    console.warn('DMC simulation failed, falling back to analytical:', e);
                    sweep = null;
                }
                // Kirchhoff returns {success, converterWaveforms:[...], failedFrequencies?}
                // (an envelope, not a bare array). Failed frequencies are surfaced, not hidden.
                const rows = sweep?.converterWaveforms;
                if (sweep?.failedFrequencies?.length) {
                    console.warn('DMC simulation skipped frequencies:', sweep.failedFrequencies);
                }
                let result;
                if (sweep?.success !== true || !Array.isArray(rows) || rows.length === 0) {
                    if (sweep && sweep.success !== true && sweep.error) {
                        console.warn('DMC simulation unavailable, using analytical:', sweep.error);
                    }
                    result = calc;
                } else {
                    const s = rows[0];
                    // simulate_dmc_waveforms now honors numberOfPeriods server
                    // side (ngspice extracts exactly N cycles), so use the
                    // returned waveforms directly.
                    const numWindings = this.numWindings;
                    const operatingPoint = {
                        name: s.operatingPointName || `Simulated @ ${s.frequency} Hz`,
                        conditions: { ambientTemperature: this.localData.ambientTemperature },
                        excitationsPerWinding: Array.from({ length: numWindings }, (_, i) => ({
                            name: this.windingName(i),
                            frequency: s.frequency,
                            current: { waveform: { time: s.time, data: s.inductorCurrent } },
                            voltage: { waveform: { time: s.time, data: s.inputVoltage } },
                        })),
                    };
                    result = { designRequirements: calc.designRequirements, operatingPoints: [operatingPoint], dmcDiagnostics: calc?.dmcDiagnostics ?? null };
                }
                // numberOfSteadyStatePeriods is not yet wired into MKF's DMC
                // simulation path — pending future MKF change.
                return result;
            };
        },
        getDefaultFrequency() { return this.localData.lineFrequency; },
        getTopology() { return Topology.DifferentialModeChoke; },
        getIsolationSides() {
            // DMC: every winding sits on the same line side (no isolation
            // between L/N or between phases). Returning ['primary', 'secondary',
            // ...] would make downstream code treat the choke as an isolated
            // multi-winding transformer. Mirror DifferentialModeChoke::
            // process_design_requirements() which sets every IsolationSide to
            // PRIMARY.
            return Array(this.numWindings).fill('primary');
        },
        getInsulationType() { return null; },
        postProcessResults(result, mode) {
            this.dmcDiagnostics = result?.dmcDiagnostics ?? null;
            const dr = result?.designRequirements ?? this.designRequirements;
            if (dr) {
                this.designRequirements = dr;
                this.simulatedInductance = dr.magnetizingInductance?.nominal
                    ?? dr.magnetizingInductance?.minimum
                    ?? null;
                // DMC configuration is implied to MKF by:
                //   · designRequirements.topology == "differentialModeChoke"
                //   · operatingPoints[*].excitationsPerWinding.length
                //     (1 = singlePhase, 2 = singlePhaseBalanced, 3 = threePhase,
                //      4 = threePhaseWithNeutral)
                // MAS DesignRequirements has no `differentialModeChoke` field,
                // so we don't try to stamp the configuration enum here — MKF
                // dispatches DMC routing from topology + winding count alone.
            }
        },
        windingName(i) {
            const names = {
                1: ['L'],
                2: ['L', 'N'],
                3: ['L1', 'L2', 'L3'],
                4: ['L1', 'L2', 'L3', 'N'],
            };
            return (names[this.numWindings] || names[1])[i] || `Winding ${i + 1}`;
        },

        updateErrorMessage() {
            this.errorMessage = "";
            if (this.localData.lineFrequency <= 0) { this.errorMessage = "Line frequency must be > 0"; return; }
            // Kirchhoff models the ripple spectrum at the switching frequency and
            // (since the no-silent-fallback pass) throws without it — catch it here.
            if (this.localData.switchingFrequency <= 0) { this.errorMessage = "Switching frequency must be > 0"; return; }
            if (this.localData.operatingCurrent <= 0) { this.errorMessage = "Operating current must be > 0"; return; }
            // filterCapacitance is sent in BOTH modes (it defines the LC filter the
            // sims verify), so validate it in both.
            if (this.localData.filterCapacitance <= 0) { this.errorMessage = "Filter capacitance must be > 0"; return; }
            if (this.localData.designLevel === 'I know the design I want') {
                if (this.localData.desiredInductance <= 0) { this.errorMessage = "Inductance must be > 0"; return; }
            } else {
                const valid = this.localData.attenuationPoints.filter(p => p.frequency > 0 && p.attenuation > 0);
                if (valid.length === 0) { this.errorMessage = "Add at least one attenuation requirement"; return; }
            }
        },

        // ===== ATTENUATION-POINT TABLE =====
        addAttenuationRow() {
            const last = this.localData.attenuationPoints[this.localData.attenuationPoints.length - 1];
            const seedFreq = last ? last.frequency * 2 : 150000;
            this.localData.attenuationPoints.push({
                _id: this.localData._uidCounter++,
                frequency: seedFreq,
                attenuation: last ? last.attenuation : 20,
            });
            this.updateErrorMessage();
        },
        removeAttenuationRow(idx) {
            if (this.localData.attenuationPoints.length > 1) {
                this.localData.attenuationPoints.splice(idx, 1);
            } else {
                this.localData.attenuationPoints.splice(0, 1, {
                    _id: this.localData._uidCounter++, frequency: 150000, attenuation: 20,
                });
            }
            this.updateErrorMessage();
        },
        updateAttenuationRow(idx, newVal) {
            this.localData.attenuationPoints.splice(idx, 1, { ...this.localData.attenuationPoints[idx], ...newVal });
            this.updateErrorMessage();
        },

        // ===== NAVIGATION =====
        async process() {
            this.masStore.resetMas("dmc");
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
                await this.$refs.base.navigateToReview(this.$stateStore, this.masStore, "Filter");
                if (this.errorMessage == "") {
                    setTimeout(() => { this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`); }, 100);
                } else {
                    setTimeout(() => { this.errorMessage = "" }, 5000);
                }
            }
        },
        async processAndAdvise() {
            await this.process();
            if (this.errorMessage == "") {
                await this.$refs.base.navigateToAdvise(this.$stateStore, this.masStore, "Filter");
                if (this.errorMessage == "") {
                    setTimeout(() => { this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`); }, 100);
                } else {
                    setTimeout(() => { this.errorMessage = "" }, 5000);
                }
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
    }
}
</script>

<template>
  <ConverterWizardBase
    ref="base"
    title="DMC Wizard"
    titleIcon="pi pi-filter"
    subtitle="Differential Mode Choke — EMI Filter"
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

    <template #header>
      <div class="wizard-header">
        <div class="wizard-header-content">
          <div class="wizard-icon-container">
            <i class="pi pi-filter wizard-icon"></i>
          </div>
          <div class="wizard-title-section">
            <h4 class="wizard-title" :data-cy="dataTestLabel + '-title'">DMC Wizard</h4>
            <p class="wizard-subtitle">Differential Mode Choke — EMI Filter</p>
          </div>
        </div>
      </div>
    </template>

    <template #design-mode>
      <ElementFromListRadio
        :name="'designLevel'"
        :tooltip="tooltipsConverterWizards['designLevel']"
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
      <div class="compact-header">
        <i class="pi pi-filter mr-1"></i>
        {{ localData.designLevel === 'I know the design I want' ? 'Design Params' : 'Filter Requirements' }}
      </div>
    </template>

    <template #design-or-switch-parameters>

      <!-- Configuration -->
      <ElementFromListRadio
        :name="'configuration'"
        :tooltip="tooltipsConverterWizards['configuration']"
        :dataTestLabel="dataTestLabel + '-Configuration'"
        :replaceTitle="''"
        :options="configurationOptions"
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

      <!-- "I know the design I want" -->
      <div v-if="localData.designLevel === 'I know the design I want'">
        <Dimension
          :name="'desiredInductance'" :tooltip="tooltipsConverterWizards['desiredInductance']" :replaceTitle="'Inductance'" unit="H"
          :dataTestLabel="dataTestLabel + '-DesiredInductance'"
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
        <!-- No "design frequency" here on purpose: unlike the CMC, the DMC backend
             (Kirchhoff design_dmc) sizes the excitation from lineFrequency +
             switchingFrequency only — a design-frequency field would be dead input. -->
        <Dimension
          :name="'filterCapacitance'" :tooltip="tooltipsConverterWizards['filterCapacitance']" :replaceTitle="'Filter C'" unit="F"
          :dataTestLabel="dataTestLabel + '-FilterCapacitance'"
          :min="minimumMaximumScalePerParameter['capacitance']['min']"
          :max="minimumMaximumScalePerParameter['capacitance']['max']"
          v-model="localData"
          :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />
      </div>

      <!-- "Help me with the design" -->
      <div v-else>
        <Dimension
          :name="'filterCapacitance'" :tooltip="tooltipsConverterWizards['filterCapacitance']" :replaceTitle="'Filter C'" unit="F"
          :dataTestLabel="dataTestLabel + '-FilterCapacitance'"
          :min="minimumMaximumScalePerParameter['capacitance']['min']"
          :max="minimumMaximumScalePerParameter['capacitance']['max']"
          v-model="localData"
          :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />

        <div class="dmc-table-header" :style="{ color: $styleStore.wizard.inputTextColor }">
          <span>Frequency (Hz)</span><span>Attenuation (dB)</span><span></span>
        </div>
        <div
          v-for="(pt, idx) in localData.attenuationPoints"
          :key="'att-' + pt._id"
          class="dmc-table-row"
        >
          <Dimension
            :name="'frequency'" :tooltip="tooltipsConverterWizards['frequency']" :replaceTitle="''" unit="Hz"
            :min="1" :max="1e10"
            v-model="localData.attenuationPoints[idx]"
            :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-12'"
            :valueFontSize="$styleStore.wizard.inputFontSize"
            :labelFontSize="$styleStore.wizard.inputLabelFontSize"
            :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
            :textColor="$styleStore.wizard.inputTextColor"
            @update="(v) => updateAttenuationRow(idx, v)"
          />
          <Dimension
            :name="'attenuation'" :tooltip="tooltipsConverterWizards['attenuation']" :replaceTitle="''" unit="dB"
            :min="0" :max="120"
            v-model="localData.attenuationPoints[idx]"
            :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-12'"
            :valueFontSize="$styleStore.wizard.inputFontSize"
            :labelFontSize="$styleStore.wizard.inputLabelFontSize"
            :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
            :textColor="$styleStore.wizard.inputTextColor"
            @update="(v) => updateAttenuationRow(idx, v)"
          />
          <button
            class="dmc-remove-btn"
            :style="{ background: $styleStore.wizard.removeButton['background-color'] }"
            @click="removeAttenuationRow(idx)"
          ><i class="pi pi-times"></i></button>
        </div>
        <button class="dmc-add-btn" :style="$styleStore.wizard.addButton" @click="addAttenuationRow">
          <i class="pi pi-plus mr-1"></i>Add point
        </button>
      </div>

      <!-- Ripple current (DM noise source amplitude for the EMI spectrum) -->
      <Dimension
        :name="'ripplePeakToPeak'" :tooltip="tooltipsConverterWizards['ripplePeakToPeak']" :replaceTitle="'Ripple ΔIpp'" unit="A"
        :dataTestLabel="dataTestLabel + '-RipplePeakToPeak'"
        :min="1e-6" :max="1e3"
        v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />

      <!-- Live inductance preview -->
      <div class="mt-2 p-2 rounded" :class="$styleStore.wizard.inputValueBgColor">
        <small :style="{ color: $styleStore.wizard.inputTextColor }">Required L</small><br>
        <strong :style="{ color: $styleStore.wizard.inputTextColor }">{{ previewInductanceFormatted }}</strong>
      </div>
    </template>

    <template #conditions>
      <Dimension :name="'lineFrequency'" :tooltip="tooltipsConverterWizards['lineFrequency']" :replaceTitle="'Line Freq'" unit="Hz"
        :dataTestLabel="dataTestLabel + '-LineFrequency'"
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
      <Dimension :name="'switchingFrequency'" :tooltip="tooltipsConverterWizards['switchingFrequency']" :replaceTitle="'Switching Freq'" unit="Hz"
        :dataTestLabel="dataTestLabel + '-SwitchingFrequency'"
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
      <Dimension :name="'ambientTemperature'" :tooltip="tooltipsConverterWizards['ambientTemperature']" :replaceTitle="'Temperature'" unit=" ºC"
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
    </template>

    <template #col1-footer>
      <div class="d-flex align-items-center justify-content-between mt-2">
        <span v-if="errorMessage" class="error-text">
          <i class="pi pi-exclamation-triangle mr-1"></i>{{ errorMessage }}
        </span>
        <span v-else></span>
        <div class="action-btns">
          <button :disabled="errorMessage != ''" class="action-btn-sm secondary" @click="processAndReview">
            <i class="pi pi-search mr-1"></i>Review Specs
          </button>
          <button :disabled="errorMessage != ''" class="action-btn-sm primary" @click="processAndAdvise">
            <i class="pi pi-sparkles mr-1"></i>Design Magnetic
          </button>
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
      <Dimension
        :name="'operatingCurrent'" :tooltip="tooltipsConverterWizards['operatingCurrent']" :replaceTitle="'Line current'" unit="A"
        :dataTestLabel="dataTestLabel + '-OperatingCurrent'"
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
    </template>

    <!-- DM conducted-emissions spectrum view, mirroring CMC's #col3-extra. -->
    <template #col3-extra>
      <div v-if="emiInductance && emiInductance > 0 && localData.filterCapacitance > 0" class="dmc-emi-wrapper mt-2">
        <EmiSpectrumView
          mode="dm"
          :switchingFrequency="localData.switchingFrequencyEmi"
          :ripplePeakToPeak="localData.ripplePeakToPeak"
          :dutyCycle="localData.dutyCycleEmi"
          :inductance="emiInductance"
          :capacitance="localData.filterCapacitance"
          :lineImpedance="localData.lineImpedance"
          :regulatoryStandard="localData.regulatoryStandard"
          :forceUpdate="forceWaveformUpdate"
          @update:switchingFrequency="localData.switchingFrequencyEmi = $event"
        />
      </div>
    </template>

      <template v-if="dmcDiagnostics" #diagnostics>
      <DimensionReadOnly name="dmcInd" :tooltip="tooltipsConverterWizards['dmcInd']" :replaceTitle="'Computed L'" :value="dmcDiagnostics.computedInductance" unit="H" :numberDecimals="9" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-DmcInd'" />
      <DimensionReadOnly name="dmcFmin" :tooltip="tooltipsConverterWizards['dmcFmin']" :replaceTitle="'Min freq'" :value="dmcDiagnostics.computedMinFrequency" unit="Hz" :numberDecimals="0" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-DmcFmin'" />
      <DimensionReadOnly name="dmcFmax" :tooltip="tooltipsConverterWizards['dmcFmax']" :replaceTitle="'Max freq'" :value="dmcDiagnostics.computedMaxFrequency" unit="Hz" :numberDecimals="0" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-DmcFmax'" />
      <DimensionReadOnly name="dmcZmin" :tooltip="tooltipsConverterWizards['dmcZmin']" :replaceTitle="'Z at min freq'" :value="dmcDiagnostics.impedanceAtMinFrequency" unit="Ω" :numberDecimals="2" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-DmcZmin'" />
      <DimensionReadOnly name="dmcNwind" :tooltip="tooltipsConverterWizards['dmcNwind']" :replaceTitle="'Windings'" :value="dmcDiagnostics.numberWindings" :unit="null" :numberDecimals="0" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-DmcNwind'" />
    </template>
  </ConverterWizardBase>
</template>

<style scoped>
.dmc-table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 28px;
  gap: 4px;
  font-size: 0.72rem;
  opacity: 0.65;
  margin-top: 6px;
  padding: 0 2px;
}
.dmc-table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 28px;
  gap: 4px;
  align-items: center;
  margin-bottom: 4px;
}
.dmc-remove-btn {
  border: none;
  border-radius: 4px;
  width: 26px;
  height: 26px;
  cursor: pointer;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.85;
}
.dmc-remove-btn:hover { opacity: 1; }
.dmc-add-btn {
  border: none;
  border-radius: 4px;
  padding: 3px 8px;
  cursor: pointer;
  font-size: 0.75rem;
  margin-top: 2px;
  width: 100%;
}
.dmc-emi-wrapper {
  border-top: 1px solid rgba(var(--p-white-rgb), 0.08);
  padding-top: 10px;
}
</style>
