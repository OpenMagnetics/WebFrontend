<script setup>
import { Topologies } from 'WebSharedComponents/assets/ts/MAS.ts'
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { combinedStyle, combinedClass, deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import DimensionReadOnly from 'WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromListRadio from 'WebSharedComponents/DataInput/ElementFromListRadio.vue'
import ElementFromList from 'WebSharedComponents/DataInput/ElementFromList.vue'
import DimensionWithTolerance from 'WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { defaultDesignRequirements, minimumMaximumScalePerParameter, isolationSideOrdered } from 'WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
import EmiSpectrumView from './EmiSpectrumView.vue'
import { waitForMkf } from 'WebSharedComponents/assets/js/mkfRuntime'
import CompactVoltageInput from './CompactVoltageInput.vue'
import { tooltipsConverterWizards } from 'WebSharedComponents/assets/js/texts'
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
            default: 'col-12 md:col-9'
        },
        valueWidthProportionClass: {
            type: String,
            default: 'col-12 md:col-3'
        },
        /**
         * Catalog-input mode. When true, "Review Specs" is hidden and the
         * primary action button reads "Find Magnetic" instead of
         * "Design Magnetic". Forwarded to ConverterWizardBase.
         */
        catalogMode: {
            type: Boolean,
            default: false,
        },
        /**
         * Show the wizard topology header. Default true. Set false when
         * the host already provides its own header (e.g. el-choker).
         * Forwarded to ConverterWizardBase.
         */
        showHeader: {
            type: Boolean,
            default: true,
        },
        /**
         * Show the Help-me / I-know design-mode toggle. Default true so the
         * standalone OpenMagnetics wizard exposes both paths. Branded
         * consumers that want to lock the wizard to "Help me with the
         * design" (e.g. el-choker, which only ships the help-me path) pass
         * :showDesignModeToggle="false".
         */
        showDesignModeToggle: {
            type: Boolean,
            default: true,
        },
    },
    emits: ['reviewSpecs', 'findMagnetic'],
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        const specModeOptions = ['Impedance specification', 'Insertion loss (dB)', 'Estimate from noise'];
        const windingOptions = ['2 — Single phase / DC', '3 — Three phase (delta)', '4 — Three phase + neutral (wye)'];
        const regulatoryStandardOptions = [
            'CISPR 32 Class B',
            'CISPR 32 Class A',
            'FCC Part 15 Class B',
            'FCC Part 15 Class A',
        ];
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
            regulatoryStandard:    regulatoryStandardOptions[0],
            impedancePoints:       [{ _id: 0, frequency: 150000, impedance: 1000 }],
            insertionLossPoints:   [{ _id: 0, frequency: 150000, insertionLoss: 30 }],
            _uidCounter: 1,
            parasiticCap_pF:       10,
            dvdt_V_ns:             50,
            safetyMargin_dB:       6,
            desiredInductance:     1e-3,
            designFrequency:       150000,
            // EMI-spectrum view: the SMPS switching fundamental frequency.
            // Used only by the closed-form spectrum plot (not by the time-domain
            // waveforms, which run at dominantFrequency). Default is typical
            // for mid-power SMPS; user can edit inline on the spectrum pane.
            switchingFrequencyEmi: 100000,
        };
        return {
            cmcDiagnostics: null,
            masStore,
            taskQueueStore,
            designLevelOptions,
            specModeOptions,
            windingOptions,
            regulatoryStandardOptions,
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
            numberOfSteadyStatePeriods: 50,
        }
    },
    computed: {
        // Parse number of windings from the option string — display only, no physics.
        numWindings() {
            return parseInt(this.localData.windingOption.charAt(0));
        },
        previewInductanceFormatted() {
            let L = null;
            if (this.localData.designLevel === 'I know the design I want') {
                L = this.localData.desiredInductance;
            } else {
                const lm = this.designRequirements?.magnetizingInductance;
                L = lm?.nominal ?? lm?.minimum ?? lm?.maximum ?? null;
            }
            if (!L || L <= 0) return 'pending';
            if (L >= 1)    return L.toFixed(3) + ' H';
            if (L >= 1e-3) return (L * 1e3).toFixed(3) + ' mH';
            if (L >= 1e-6) return (L * 1e6).toFixed(2) + ' μH';
            return (L * 1e9).toFixed(1) + ' nH';
        },
        // Inductance the EMI spectrum view should plot against. Prefer the
        // advanced-mode user-set value, otherwise the analytical design point.
        emiInductance() {
            if (this.localData.designLevel === 'I know the design I want') {
                return this.localData.desiredInductance;
            }
            const lm = this.designRequirements?.magnetizingInductance;
            return lm?.nominal ?? lm?.minimum ?? null;
        },
        // Voltage swing at the switching node. For a direct-off-line EUT this
        // is roughly the peak mains voltage; the user can refine later.
        emiVoltageSwing() {
            const v = this.localData?.operatingVoltage?.nominal ?? 230;
            return v * Math.SQRT2;
        },
    },
    watch: {
        waveformViewMode() {
            this.$nextTick(() => {
                this.forceWaveformUpdate += 1;
            });
        },
        localData: {
            deep: true,
            handler() {
                clearTimeout(this._analyticalDebounceTimer);
                this._analyticalDebounceTimer = setTimeout(() => {
                    this.runAutoWaveforms();
                }, 800);
            }
        },
    },
    mounted() {
        this._analyticalDebounceTimer = null;
        this.runAutoWaveforms();
    },
    methods: {

        // Shared by mounted() (immediate) and the localData watcher (debounced).
        runAutoWaveforms() {
            this.updateErrorMessage();
            if (!this.errorMessage) {
                this.simulateIdealWaveforms();
            }
        },

        // ===== WIZARD CONTRACT =====
        buildParams(mode) {
            // ── Pure data pass-through — NO calculations here. ──────────
            // All physics (L = Z/2πf, insertion-loss conversion, noise
            // estimation) is handled entirely in the C++ backend (Cmc.cpp).
            //
            // parasiticCap_pF / dvdt_V_ns are ALWAYS forwarded — the
            // backend uses them for the operating-point CM current
            // (I_cm = C·dV/dt) in every spec mode, so analytical and
            // simulated always see the same excitation. They only
            // influence the L spec when the user hasn't provided an
            // explicit impedance or insertion-loss requirement.
            const aux = {
                operatingVoltage:    this.localData.operatingVoltage,
                operatingCurrent:    this.localData.operatingCurrent,
                lineFrequency:       this.localData.lineFrequency,
                lineImpedance:       this.localData.lineImpedance,
                ambientTemperature:  this.localData.ambientTemperature,
                numberOfWindings:    this.numWindings,
                parasiticCap_pF:     this.localData.parasiticCap_pF,
                dvdt_V_ns:           this.localData.dvdt_V_ns,
                safetyMargin_dB:     this.localData.safetyMargin_dB,
                regulatoryStandard:  this.localData.regulatoryStandard,
            };

            if (this.localData.designLevel === 'I know the design I want') {
                aux.desiredInductance = this.localData.desiredInductance;
                aux.designFrequency   = this.localData.designFrequency;

            } else if (this.localData.specMode === 'Impedance specification') {
                aux.minimumImpedance = this.localData.impedancePoints
                    .filter(p => p.frequency > 0 && p.impedance > 0)
                    .map(p => ({ frequency: p.frequency, impedance: p.impedance }));

            } else if (this.localData.specMode === 'Insertion loss (dB)') {
                aux.targetInsertionLoss = this.localData.insertionLossPoints
                    .filter(p => p.frequency > 0 && p.insertionLoss > 0)
                    .map(p => ({ frequency: p.frequency, insertionLoss: p.insertionLoss }));
            }
            // else: noise-estimation only — noise params already in aux drive
            // both the L synthesis and the operating-point excitation.

            return aux;
        },
        getCalculateFn() {
            const isAdvanced = this.localData.designLevel === 'I know the design I want';
            return async (aux) => {
                const Module = await waitForMkf();
                await Module.ready;
                const fn = isAdvanced ? 'calculate_advanced_cmc_inputs' : 'calculate_cmc_inputs';
                const raw = await Module[fn](JSON.stringify(aux));
                if (typeof raw === 'string' && raw.startsWith('Exception:'))
                    throw new Error(raw);
                return typeof raw === 'string' ? JSON.parse(raw) : raw;
            };
        },
        getSimulateFn() {
            return async (aux) => {
                const lm = this.designRequirements?.magnetizingInductance;
                const inductance = lm?.nominal ?? lm?.minimum ?? this.localData.desiredInductance;

                return await this.taskQueueStore.simulateCmcIdealWaveforms(
                    aux, inductance, this.localData.parasiticCap_pF, this.localData.dvdt_V_ns
                );
            };
        },
        getDefaultFrequency() { return this.localData.lineFrequency; },
        postProcessResults(result, mode) {
            this.cmcDiagnostics = result?.cmcDiagnostics ?? null;
            const dr = result?.designRequirements ?? this.designRequirements;
            if (dr) {
                this.designRequirements = dr;
                this.simulatedInductance = dr.magnetizingInductance?.nominal ?? null;
            }
        },
        getTopology() { return Topologies.CommonModeChoke; },
        getIsolationSides() {
            return isolationSideOrdered.slice(0, this.numWindings).map(s => s.toLowerCase());
        },
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
                await this.$refs.base.navigateToReview(this.$stateStore, this.masStore, "CommonModeChoke");
                if (this.errorMessage == "") {
                    this.$emit('reviewSpecs');
                    setTimeout(() => { this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`); }, 100);
                } else {
                    setTimeout(() => { this.errorMessage = "" }, 5000);
                }
            }
        },
        async processAndAdvise() {
            await this.process();
            if (this.errorMessage == "") {
                await this.$refs.base.navigateToAdvise(this.$stateStore, this.masStore, "CommonModeChoke");
                if (this.errorMessage == "") {
                    this.$emit('findMagnetic');
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
    }
}
</script>

<template>
  <ConverterWizardBase
    ref="base"
    title="CMC Wizard"
    titleIcon="pi pi-shield"
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
    :catalogMode="catalogMode"
    :showHeader="showHeader"
    @update:waveformViewMode="waveformViewMode = $event"
    @update:numberOfPeriods="numberOfPeriods = $event"
    @update:numberOfSteadyStatePeriods="numberOfSteadyStatePeriods = $event"
    @get-analytical-waveforms="getAnalyticalWaveforms"
    @get-simulated-waveforms="simulateIdealWaveforms"
    @get-spice-code="getSpiceCode"
    @dismiss-error="errorMessage = ''; waveformError = ''"
   >

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SLOT: #design-mode — Help-me / I-know toggle               -->
    <!-- Standalone OpenMagnetics exposes both. Branded consumers   -->
    <!-- can hide via :showDesignModeToggle="false" prop (e.g.      -->
    <!-- el-choker, which ships only the help-me path).             -->
    <!-- The slot is conditionally emitted so the base's $slots     -->
    <!-- check auto-hides the Design Mode card when the prop is off.-->
    <!-- ══════════════════════════════════════════════════════════ -->
    <template v-if="showDesignModeToggle" #design-mode>
      <div class="design-mode-selector">
        <label v-for="(option, index) in designLevelOptions" :key="index" class="design-mode-option">
          <input type="radio" v-model="localData.designLevel" :value="option" :data-cy="dataTestLabel + '-DesignLevel-' + index" @change="updateErrorMessage">
          <span class="design-mode-label">{{ option }}</span>
        </label>
      </div>
    </template>


    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SLOT: #design-or-switch-parameters-title                  -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <template #design-or-switch-parameters-title>
      <div class="compact-header">
        <i class="pi pi-shield mr-1"></i>
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
        :tooltip="tooltipsConverterWizards['windingOption']"
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
          :name="'desiredInductance'" :tooltip="tooltipsConverterWizards['desiredInductance']" :replaceTitle="'CM Inductance'" unit="H"
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
        <Dimension
          :name="'designFrequency'" :tooltip="tooltipsConverterWizards['designFrequency']" :replaceTitle="'Design freq'" unit="Hz"
          :dataTestLabel="dataTestLabel + '-DesignFrequency'"
          :min="1" :max="1e10"
          v-model="localData"
          :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />
        <div class="mt-2 p-2 rounded" :class="$styleStore.wizard.inputValueBgColor">
          <small :style="{ color: $styleStore.wizard.inputTextColor }">CM Inductance</small><br>
          <strong :style="{ color: $styleStore.wizard.inputTextColor }">{{ previewInductanceFormatted }}</strong>
        </div>
      </div>

      <!-- ── "Help me with the design" ── -->
      <div v-else>
        <!-- Spec mode selector -->
        <ElementFromList
          class="mt-3 mb-3"
          :name="'specMode'"
          :tooltip="tooltipsConverterWizards['specMode']"
          :replaceTitle="'Input type'"
          :options="specModeOptions"
          :titleSameRow="true"
          v-model="localData"
          :labelWidthProportionClass="'col-6'"
          :selectStyleClass="'col-6'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="{ ...$styleStore.wizard.inputLabelFontSize, 'font-weight': '600' }"
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
              :name="'frequency'" :tooltip="tooltipsConverterWizards['frequency']" :replaceTitle="''" unit="Hz"
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
              :name="'impedance'" :tooltip="tooltipsConverterWizards['impedance']" :replaceTitle="''" unit="Ω"
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
            ><i class="pi pi-times"></i></button>
          </div>
          <button class="cmc-add-btn" :style="$styleStore.wizard.addButton" @click="addImpedanceRow">
            <i class="pi pi-plus mr-1"></i>Add point
          </button>
        </template>

        <!-- Insertion-loss table -->
        <template v-else-if="localData.specMode === 'Insertion loss (dB)'">
          <div class="cmc-table-header" :style="{ color: $styleStore.wizard.inputTextColor }">
            <span>Frequency (Hz)</span><span>Loss (dB)</span><span></span>
          </div>
          <div
            v-for="(pt, idx) in localData.insertionLossPoints"
            :key="'il-' + pt._id"
            class="cmc-table-row"
          >
            <Dimension
              :name="'frequency'" :tooltip="tooltipsConverterWizards['frequency']" :replaceTitle="''" unit="Hz"
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
              :name="'insertionLoss'" :tooltip="tooltipsConverterWizards['insertionLoss']" :replaceTitle="''" unit="dB"
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
            ><i class="pi pi-times"></i></button>
          </div>
          <button class="cmc-add-btn" :style="$styleStore.wizard.addButton" @click="addInsertionLossRow">
            <i class="pi pi-plus mr-1"></i>Add point
          </button>
        </template>

        <!-- Noise estimation -->
        <template v-else-if="localData.specMode === 'Estimate from noise'">
          <div class="mt-1">
          <ElementFromList
            :name="'regulatoryStandard'"
            :tooltip="tooltipsConverterWizards['regulatoryStandard']"
            :replaceTitle="'Standard'"
            :options="regulatoryStandardOptions"
            :titleSameRow="true"
            v-model="localData"
            :labelWidthProportionClass="'col-6'"
            :selectStyleClass="'col-6'"
            :valueFontSize="$styleStore.wizard.inputFontSize"
            :labelFontSize="$styleStore.wizard.inputLabelFontSize"
            :labelBgColor="'transparent'"
            :valueBgColor="$styleStore.wizard.inputValueBgColor"
            :textColor="$styleStore.wizard.inputTextColor"
            @update="updateErrorMessage"
          />
          </div>
          <div class="mt-1">
          <Dimension
            :name="'parasiticCap_pF'" :tooltip="tooltipsConverterWizards['parasiticCap_pF']" :replaceTitle="'C parasitic'" unit="pF"
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
            :name="'dvdt_V_ns'" :tooltip="tooltipsConverterWizards['dvdt_V_ns']" :replaceTitle="'dV/dt'" unit="V/ns"
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
            :name="'safetyMargin_dB'" :tooltip="tooltipsConverterWizards['safetyMargin_dB']" :replaceTitle="'Safety margin'" unit="dB"
            :min="0" :max="20"
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

        <!-- Live inductance preview (all help-mode variants) -->
        <div class="mt-2 p-2 rounded" :class="$styleStore.wizard.inputValueBgColor">
          <small :style="{ color: $styleStore.wizard.inputTextColor }">Required L<sub>CM</sub></small><br>
          <strong :style="{ color: $styleStore.wizard.inputTextColor }">{{ previewInductanceFormatted }}</strong>
        </div>
      </div>

    </template>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SLOT: #conditions                                         -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <template #conditions>
      <Dimension :name="'lineFrequency'" :tooltip="tooltipsConverterWizards['lineFrequency']" :replaceTitle="'Line Frequency'" unit="Hz"
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
      <Dimension :name="'lineImpedance'" :tooltip="tooltipsConverterWizards['lineImpedance']" :replaceTitle="'Line Z (LISN)'" unit="Ω"
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

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SLOT: #col1-footer — action buttons (identical to Buck)   -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <template #col1-footer>
      <div class="d-flex align-items-center justify-content-between mt-2">
        <span v-if="errorMessage" class="error-text">
          <i class="pi pi-exclamation-triangle mr-1"></i>{{ errorMessage }}
        </span>
        <span v-else></span>
        <div class="action-btns">
          <button
            v-if="!catalogMode"
            :disabled="errorMessage != ''"
            class="action-btn-sm secondary"
            @click="processAndReview"
          >
            <i class="pi pi-search mr-1"></i>Review Specs
          </button>
          <button :disabled="errorMessage != ''" class="action-btn-sm primary" @click="processAndAdvise">
            <i class="pi pi-sparkles mr-1"></i>{{ catalogMode ? 'Find Magnetic' : 'Design Magnetic' }}
          </button>
        </div>
      </div>
    </template>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SLOT: #input-voltage — line voltage with tolerance        -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <template #input-voltage>
      <CompactVoltageInput
        :name="'operatingVoltage'"
        :tooltip="tooltipsConverterWizards['operatingVoltage']"
        :dataTestLabel="dataTestLabel + '-OperatingVoltage'"
        unit="V"
        :modelValue="localData.operatingVoltage"
        @update="updateErrorMessage"
      />
    </template>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SLOT: #outputs — line current (the "load" of a CMC)       -->
    <!-- ══════════════════════════════════════════════════════════ -->
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

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SLOT: #col3-extra — EMI conducted-emissions spectrum view -->
    <!-- Appears below the time-domain waveforms once an inductance -->
    <!-- is known (analytical run or I-know mode). Provides the     -->
    <!-- frequency-domain sanity check that complements the time    -->
    <!-- sinusoid above.                                            -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <template #col3-extra>
      <div v-if="emiInductance && emiInductance > 0" class="cmc-emi-wrapper mt-2">
        <EmiSpectrumView
          mode="cm"
          :switchingFrequency="localData.switchingFrequencyEmi"
          :voltageSwing="emiVoltageSwing"
          :parasiticCap_pF="localData.parasiticCap_pF"
          :dvdt_V_ns="localData.dvdt_V_ns"
          :inductance="emiInductance"
          :lineImpedance="localData.lineImpedance"
          :regulatoryStandard="localData.regulatoryStandard"
          :forceUpdate="forceWaveformUpdate"
          @update:switchingFrequency="localData.switchingFrequencyEmi = $event"
        />
      </div>
    </template>

      <template v-if="cmcDiagnostics" #diagnostics>
      <DimensionReadOnly name="cmcInd" :tooltip="tooltipsConverterWizards['cmcInd']" :replaceTitle="'Computed L'" :value="cmcDiagnostics.computedInductance" unit="H" :numberDecimals="9":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-CmcInd'" />
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

/* ── EMI spectrum wrapper ──────────────────────────────────────────── */
.cmc-emi-wrapper {
  border-top: 1px solid rgba(var(--p-white-rgb), 0.08);
  padding-top: 10px;
}
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
