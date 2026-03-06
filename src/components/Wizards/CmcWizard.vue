<script setup>
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { combinedStyle, combinedClass, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromListRadio from '/WebSharedComponents/DataInput/ElementFromListRadio.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { defaultDesignRequirements, minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
import { waitForMkf } from '/WebSharedComponents/assets/js/mkfRuntime'
</script>

<script>
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: 'CmcWizard',
        },
        labelWidthProportionClass: {
            type: String,
            default: 'col-xs-12 col-md-9'
        },
        valueWidthProportionClass: {
            type: String,
            default: 'col-xs-12 col-md-3'
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        const specModeOptions = ['Impedance specification', 'Insertion loss (dB)', 'Estimate from noise'];
        const windingOptions = ['2 — Single phase / DC', '3 — Three phase (delta)', '4 — Three phase + neutral (wye)'];
        const errorMessage = "";
        const localData = {
            operatingVoltage:      { nominal: 230, tolerance: 0.1 },
            operatingCurrent:      5.0,
            lineFrequency:         50,
            lineImpedance:         50,
            ambientTemperature:    25,
            designLevel:           designLevelOptions[0],
            specMode:              specModeOptions[0],
            windingOption:         windingOptions[0],
            impedancePoints:       [{ _id: 0, frequency: 150000, impedance: 1000 }],
            insertionLossPoints:   [{ _id: 0, frequency: 150000, insertionLoss: 30 }],
            _uidCounter: 1,
            parasiticCap_pF:       10,
            dvdt_V_ns:             50,
            safetyMargin_dB:       6,
            desiredInductance:     1e-3,
        };
        return {
            masStore,
            taskQueueStore,
            designLevelOptions,
            specModeOptions,
            windingOptions,
            localData,
            errorMessage,
            simulatingWaveforms: false,
            waveformSource: null,
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
        // Parse number of windings from the option string — display only, no physics.
        numWindings() {
            return parseInt(this.localData.windingOption.charAt(0));
        },
        // Format the required inductance returned by the backend (designRequirements).
        // NO calculation here — value comes entirely from the WASM result.
        previewInductanceFormatted() {
            const dr = this.designRequirements;
            if (!dr || !dr.magnetizingInductance) return '—';
            const lm = dr.magnetizingInductance;
            const L = lm.nominal ?? lm.minimum ?? lm.maximum ?? null;
            if (!L || L <= 0) return '—';
            if (L >= 1)    return L.toFixed(3) + ' H';
            if (L >= 1e-3) return (L * 1e3).toFixed(3) + ' mH';
            if (L >= 1e-6) return (L * 1e6).toFixed(2) + ' μH';
            return (L * 1e9).toFixed(1) + ' nH';
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
        this.updateErrorMessage();
    },
    methods: {

        // ===== WIZARD CONTRACT =====
        buildParams(mode) {
            // ── Pure data pass-through — NO calculations here. ──────────
            // All physics (L = Z/2πf, insertion-loss conversion, noise
            // estimation) is handled entirely in the C++ backend (Cmc.cpp).
            const aux = {
                operatingVoltage:    this.localData.operatingVoltage,
                operatingCurrent:    this.localData.operatingCurrent,
                lineFrequency:       this.localData.lineFrequency,
                lineImpedance:       this.localData.lineImpedance,
                ambientTemperature:  this.localData.ambientTemperature,
                numberOfWindings:    this.numWindings,
            };

            if (this.localData.designLevel === 'I know the design I want') {
                // AdvancedCmc path: user specifies desired inductance directly.
                aux.desiredInductance = this.localData.desiredInductance;

            } else if (this.localData.specMode === 'Impedance specification') {
                // Pass (frequency, impedance) pairs as-is — backend computes L.
                aux.minimumImpedance = this.localData.impedancePoints
                    .filter(p => p.frequency > 0 && p.impedance > 0)
                    .map(p => ({ frequency: p.frequency, impedance: p.impedance }));

            } else if (this.localData.specMode === 'Insertion loss (dB)') {
                // Pass (frequency, insertionLoss) pairs — backend converts to Z then L.
                aux.targetInsertionLoss = this.localData.insertionLossPoints
                    .filter(p => p.frequency > 0 && p.insertionLoss > 0)
                    .map(p => ({ frequency: p.frequency, insertionLoss: p.insertionLoss }));

            } else {
                // Noise-estimation mode: pass raw physical params — backend does ALL math.
                // Cmc::noiseParamsToImpedance() computes Icm → Vnoise → attenuation → Zcm.
                aux.parasiticCap_pF = this.localData.parasiticCap_pF;
                aux.dvdt_V_ns       = this.localData.dvdt_V_ns;
                aux.safetyMargin_dB = this.localData.safetyMargin_dB;
            }

            return aux;
        },
        getCalculateFn() {
            const isAdvanced = this.localData.designLevel === 'I know the design I want';
            return async (aux) => {
                const Module = await waitForMkf();
                await Module.ready;
                const fn = isAdvanced ? 'calculate_advanced_cmc_inputs' : 'calculate_cmc_inputs';
                const raw = Module[fn](JSON.stringify(aux));
                if (typeof raw === 'string' && raw.startsWith('Exception:'))
                    throw new Error(raw);
                const result = typeof raw === 'string' ? JSON.parse(raw) : raw;
                return result;
            };
        },
        getSimulateFn() {
            return async (aux) => {
                // Get the inductance from design requirements or use a default
                const inductance = this.designRequirements?.magnetizingInductance?.nominal ||
                                  this.designRequirements?.magnetizingInductance?.minimum ||
                                  1e-3; // 1mH default

                // Get noise parameters for simulation
                // Use noise estimation params if available, otherwise use defaults
                const parasiticCap_pF = aux.parasiticCap_pF || 100; // Default 100pF
                const dvdt_V_ns = aux.dvdt_V_ns || 1; // Default 1V/ns

                // Run CMC simulation with line + switching noise
                const result = await this.taskQueueStore.simulateCmcIdealWaveforms(
                    aux, inductance, parasiticCap_pF, dvdt_V_ns
                );

                // Return in format expected by ConverterWizardBase
                return result;
            };
        },
        getDefaultFrequency() { return this.localData.lineFrequency; },
        postProcessResults(result, mode) {
            if (this.designRequirements) {
                this.simulatedInductance = this.designRequirements.magnetizingInductance?.nominal || null;
            }
        },
        getTopology() { return 'CommonModeChoke'; },
        getIsolationSides() { return Array(this.numWindings).fill('primary'); },
        getInsulationType() { return null; },

        updateErrorMessage() {
            this.errorMessage = "";
            if (this.localData.operatingCurrent <= 0) {
                this.errorMessage = "Operating current must be > 0";
                return;
            }
            if (this.localData.lineFrequency <= 0) {
                this.errorMessage = "Line frequency must be > 0";
                return;
            }
            if (this.localData.designLevel === 'Help me with the design') {
                if (this.localData.specMode === 'Impedance specification') {
                    const valid = this.localData.impedancePoints.filter(p => p.frequency > 0 && p.impedance > 0);
                    if (valid.length === 0) {
                        this.errorMessage = "Add at least one impedance requirement";
                    }
                } else if (this.localData.specMode === 'Insertion loss (dB)') {
                    const valid = this.localData.insertionLossPoints.filter(p => p.frequency > 0 && p.insertionLoss > 0);
                    if (valid.length === 0) {
                        this.errorMessage = "Add at least one insertion-loss requirement";
                    }
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
                    setTimeout(() => { this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`); }, 100);
                } else {
                    setTimeout(() => { this.errorMessage = "" }, 5000);
                }
            }
        },
        async processAndAdvise() {
            await this.process();
            if (this.errorMessage == "") {
                await this.$refs.base.navigateToAdvise(this.$stateStore, this.masStore, "Power");
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
        async simulateWaveforms() {
            await this.$refs.base.executeWaveformAction(this, 'simulation');
        },
        async getSpiceCode() {
            await this.$refs.base.generateSpiceCode(this);
        },

        // ── Impedance / insertion-loss table row management ──────────
        addImpedanceRow() {
            this.localData.impedancePoints.push({ _id: this.localData._uidCounter++, frequency: 1e6, impedance: 300 });
            this.updateErrorMessage();
        },
        removeImpedanceRow(idx) {
            if (this.localData.impedancePoints.length > 1) {
                this.localData.impedancePoints.splice(idx, 1);
            } else {
                // Reset to a blank row rather than leaving an empty list
                this.localData.impedancePoints.splice(0, 1, { _id: this.localData._uidCounter++, frequency: 150000, impedance: 1000 });
            }
            this.updateErrorMessage();
        },
        updateImpedanceRow(idx, newVal) {
            this.localData.impedancePoints.splice(idx, 1, { ...this.localData.impedancePoints[idx], ...newVal });
            this.updateErrorMessage();
        },
        addInsertionLossRow() {
            this.localData.insertionLossPoints.push({ _id: this.localData._uidCounter++, frequency: 1e6, insertionLoss: 20 });
            this.updateErrorMessage();
        },
        removeInsertionLossRow(idx) {
            if (this.localData.insertionLossPoints.length > 1) {
                this.localData.insertionLossPoints.splice(idx, 1);
            } else {
                this.localData.insertionLossPoints.splice(0, 1, { _id: this.localData._uidCounter++, frequency: 150000, insertionLoss: 30 });
            }
            this.updateErrorMessage();
        },
        updateInsertionLossRow(idx, newVal) {
            this.localData.insertionLossPoints.splice(idx, 1, { ...this.localData.insertionLossPoints[idx], ...newVal });
            this.updateErrorMessage();
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
    }
}
</script>

<template>
  <ConverterWizardBase
    ref="base"
    title="CMC Wizard"
    titleIcon="fa-shield-halved"
    subtitle="Common Mode Choke — EMI Filter"
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
    @get-simulated-waveforms="simulateWaveforms"
    @get-spice-code="getSpiceCode"
    @dismiss-error="errorMessage = ''; waveformError = ''"
  >

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SLOT: #design-mode — design level radio (same as Buck)    -->
    <!-- ══════════════════════════════════════════════════════════ -->
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

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SLOT: #design-or-switch-parameters-title                  -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <template #design-or-switch-parameters-title>
      <div class="compact-header">
        <i class="fa-solid fa-shield-halved me-1"></i>
        {{ localData.designLevel == 'I know the design I want' ? 'Design Params' : 'Impedance Requirements' }}
      </div>
    </template>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SLOT: #design-or-switch-parameters                        -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <template #design-or-switch-parameters>

      <!-- Winding count -->
      <ElementFromListRadio
        :name="'windingOption'"
        :dataTestLabel="dataTestLabel + '-Windings'"
        :replaceTitle="''"
        :options="windingOptions"
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

      <!-- ── "I know the design I want" ── -->
      <div v-if="localData.designLevel == 'I know the design I want'">
        <Dimension
          :name="'desiredInductance'" :replaceTitle="'CM Inductance'" unit="H"
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
        <div class="mt-2 p-2 rounded" :class="$styleStore.wizard.inputValueBgColor">
          <small class="text-muted">|Z| at line freq</small><br>
          <strong :style="{ color: $styleStore.wizard.inputTextColor }">{{ previewInductanceFormatted }}</strong>
        </div>
      </div>

      <!-- ── "Help me with the design" ── -->
      <div v-else>
        <!-- Spec mode selector -->
        <ElementFromList
          :name="'specMode'"
          :replaceTitle="'Input type'"
          :options="specModeOptions"
          :titleSameRow="true"
          v-model="localData"
          :labelWidthProportionClass="'col-5'"
          :valueWidthProportionClass="'col-7'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'"
          :valueBgColor="$styleStore.wizard.inputValueBgColor"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />

        <!-- Impedance table -->
        <template v-if="localData.specMode === 'Impedance specification'">
          <div class="cmc-table-header" :style="{ color: $styleStore.wizard.inputTextColor }">
            <span>Frequency (Hz)</span><span>Min. |Z| (Ω)</span><span></span>
          </div>
          <div
            v-for="(pt, idx) in localData.impedancePoints"
            :key="'imp-' + pt._id"
            class="cmc-table-row"
          >
            <Dimension
              :name="'frequency'" :replaceTitle="''" unit="Hz"
              :min="1" :max="1e10"
              v-model="localData.impedancePoints[idx]"
              :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-12'"
              :valueFontSize="$styleStore.wizard.inputFontSize"
              :labelFontSize="$styleStore.wizard.inputLabelFontSize"
              :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
              :textColor="$styleStore.wizard.inputTextColor"
              @update="(v) => updateImpedanceRow(idx, v)"
            />
            <Dimension
              :name="'impedance'" :replaceTitle="''" unit="Ω"
              :min="1" :max="1e7"
              v-model="localData.impedancePoints[idx]"
              :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-12'"
              :valueFontSize="$styleStore.wizard.inputFontSize"
              :labelFontSize="$styleStore.wizard.inputLabelFontSize"
              :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
              :textColor="$styleStore.wizard.inputTextColor"
              @update="(v) => updateImpedanceRow(idx, v)"
            />
            <button
              class="cmc-remove-btn"
              :style="{ background: $styleStore.wizard.removeButton['background-color'] }"
              @click="removeImpedanceRow(idx)"
            ><i class="fa-solid fa-xmark"></i></button>
          </div>
          <button class="cmc-add-btn" :style="$styleStore.wizard.addButton" @click="addImpedanceRow">
            <i class="fa-solid fa-plus me-1"></i>Add point
          </button>
        </template>

        <!-- Insertion-loss table -->
        <template v-if="localData.specMode === 'Insertion loss (dB)'">
          <div class="cmc-table-header" :style="{ color: $styleStore.wizard.inputTextColor }">
            <span>Frequency (Hz)</span><span>Loss (dB)</span><span></span>
          </div>
          <div
            v-for="(pt, idx) in localData.insertionLossPoints"
            :key="'il-' + pt._id"
            class="cmc-table-row"
          >
            <Dimension
              :name="'frequency'" :replaceTitle="''" unit="Hz"
              :min="1" :max="1e10"
              v-model="localData.insertionLossPoints[idx]"
              :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-12'"
              :valueFontSize="$styleStore.wizard.inputFontSize"
              :labelFontSize="$styleStore.wizard.inputLabelFontSize"
              :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
              :textColor="$styleStore.wizard.inputTextColor"
              @update="(v) => updateInsertionLossRow(idx, v)"
            />
            <Dimension
              :name="'insertionLoss'" :replaceTitle="''" unit="dB"
              :min="0" :max="120"
              v-model="localData.insertionLossPoints[idx]"
              :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-12'"
              :valueFontSize="$styleStore.wizard.inputFontSize"
              :labelFontSize="$styleStore.wizard.inputLabelFontSize"
              :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
              :textColor="$styleStore.wizard.inputTextColor"
              @update="(v) => updateInsertionLossRow(idx, v)"
            />
            <button
              class="cmc-remove-btn"
              :style="{ background: $styleStore.wizard.removeButton['background-color'] }"
              @click="removeInsertionLossRow(idx)"
            ><i class="fa-solid fa-xmark"></i></button>
          </div>
          <button class="cmc-add-btn" :style="$styleStore.wizard.addButton" @click="addInsertionLossRow">
            <i class="fa-solid fa-plus me-1"></i>Add point
          </button>
        </template>

        <!-- Noise estimation -->
        <template v-if="localData.specMode === 'Estimate from noise'">
          <Dimension
            :name="'parasiticCap_pF'" :replaceTitle="'C parasitic'" unit="pF"
            :min="0.01" :max="10000"
            v-model="localData"
            :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
            :valueFontSize="$styleStore.wizard.inputFontSize"
            :labelFontSize="$styleStore.wizard.inputLabelFontSize"
            :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
            :textColor="$styleStore.wizard.inputTextColor"
            @update="updateErrorMessage"
          />
          <Dimension
            :name="'dvdt_V_ns'" :replaceTitle="'dV/dt'" unit="V/ns"
            :min="0.1" :max="1000"
            v-model="localData"
            :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
            :valueFontSize="$styleStore.wizard.inputFontSize"
            :labelFontSize="$styleStore.wizard.inputLabelFontSize"
            :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
            :textColor="$styleStore.wizard.inputTextColor"
            @update="updateErrorMessage"
          />
          <Dimension
            :name="'safetyMargin_dB'" :replaceTitle="'Safety margin'" unit="dB"
            :min="0" :max="20"
            v-model="localData"
            :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
            :valueFontSize="$styleStore.wizard.inputFontSize"
            :labelFontSize="$styleStore.wizard.inputLabelFontSize"
            :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
            :textColor="$styleStore.wizard.inputTextColor"
            @update="updateErrorMessage"
          />
        </template>

        <!-- Live inductance preview (all help-mode variants) -->
        <div class="mt-2 p-2 rounded" :class="$styleStore.wizard.inputValueBgColor">
          <small class="text-muted">Required L<sub>CM</sub></small><br>
          <strong :style="{ color: $styleStore.wizard.inputTextColor }">{{ previewInductanceFormatted }}</strong>
        </div>
      </div>

    </template>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SLOT: #conditions                                         -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <template #conditions>
      <Dimension :name="'lineFrequency'" :replaceTitle="'Line Freq'" unit="Hz"
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
      <Dimension :name="'lineImpedance'" :replaceTitle="'Line Z (LISN)'" unit="Ω"
        :dataTestLabel="dataTestLabel + '-LineImpedance'"
        :min="1" :max="1000"
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
    </template>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SLOT: #col1-footer — action buttons (identical to Buck)   -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <template #col1-footer>
      <div class="d-flex align-items-center justify-content-between mt-2">
        <span v-if="errorMessage" class="error-text">
          <i class="fa-solid fa-exclamation-triangle me-1"></i>{{ errorMessage }}
        </span>
        <span v-else></span>
        <div class="action-btns">
          <button :disabled="errorMessage != ''" class="action-btn-sm secondary" @click="processAndReview">
            <i class="fa-solid fa-magnifying-glass me-1"></i>Review Specs
          </button>
          <button :disabled="errorMessage != ''" class="action-btn-sm primary" @click="processAndAdvise">
            <i class="fa-solid fa-wand-magic-sparkles me-1"></i>Design Magnetic
          </button>
        </div>
      </div>
    </template>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SLOT: #input-voltage — line voltage with tolerance        -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <template #input-voltage>
      <DimensionWithTolerance
        :name="'operatingVoltage'" :replaceTitle="''" unit="V"
        :dataTestLabel="dataTestLabel + '-OperatingVoltage'"
        :min="minimumMaximumScalePerParameter['voltage']['min']"
        :max="minimumMaximumScalePerParameter['voltage']['max']"
        :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-4'"
        v-model="localData.operatingVoltage"
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

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SLOT: #outputs — line current (the "load" of a CMC)       -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <template #outputs>
      <Dimension
        :name="'operatingCurrent'" :replaceTitle="'Line current'" unit="A"
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

  </ConverterWizardBase>
</template>

<style scoped>
/* ── Impedance / insertion-loss table ─────────────────────────────── */
.cmc-table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 28px;
  gap: 4px;
  font-size: 0.72rem;
  opacity: 0.65;
  margin-top: 6px;
  padding: 0 2px;
}
.cmc-table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 28px;
  gap: 4px;
  align-items: center;
  margin-bottom: 4px;
}
.cmc-remove-btn {
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
.cmc-remove-btn:hover { opacity: 1; }
.cmc-add-btn {
  border: none;
  border-radius: 4px;
  padding: 3px 8px;
  cursor: pointer;
  font-size: 0.75rem;
  margin-top: 2px;
  width: 100%;
}
</style>
