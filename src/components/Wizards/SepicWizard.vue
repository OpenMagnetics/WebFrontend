<script setup>
import { IsolationSide } from 'WebSharedComponents/assets/ts/MAS.ts'
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import DimensionReadOnly from 'WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromListRadio from 'WebSharedComponents/DataInput/ElementFromListRadio.vue'
import { defaultSepicWizardInputs, minimumMaximumScalePerParameter } from 'WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
import CompactVoltageInput from './CompactVoltageInput.vue'
import { tooltipsConverterWizards } from 'WebSharedComponents/assets/js/texts'
</script>

<script>
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: 'SepicWizard',
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        const currentOptions = ['The output current ratio', 'The maximum switch current'];
        const localData = deepCopy(defaultSepicWizardInputs);
        localData["currentOptions"] = currentOptions[0];
        return {
            sepicDiagnostics: null,
            masStore,
            taskQueueStore,
            designLevelOptions,
            currentOptions,
            localData,
            errorMessage: "",
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
            numberOfSteadyStatePeriods: 5,
        }
    },
    watch: {
        waveformViewMode() {
            this.$nextTick(() => {
                this.forceWaveformUpdate += 1;
            });
        },
    },
    mounted() {
        this.$nextTick(() => {
            if (this._autoRunDone) return;
            this._autoRunDone = true;
            try { this.updateErrorMessage?.(); } catch (e) { return; }
            if (!this.errorMessage) this.getAnalyticalWaveforms?.();
        });
    },
    methods: {
        // ===== WIZARD CONTRACT =====
        buildParams(mode) {
            const aux = {};
            aux['inputVoltage'] = this.localData.inputVoltage;
            aux['switchingFrequency'] = this.localData.switchingFrequency;
            aux['diodeVoltageDrop'] = this.localData.diodeVoltageDrop;
            aux['efficiency'] = this.localData.efficiency;
            aux['coupledInductor'] = this.localData.coupledInductor === true;
            if (aux['coupledInductor']) {
                aux['couplingCoefficient'] = this.localData.couplingCoefficient;
            }
            aux['synchronousRectifier'] = this.localData.synchronousRectifier === true;
            if (this.localData.designLevel == 'I know the design I want') {
                aux['desiredInductance'] = this.localData.inductance;
            } else {
                if (this.localData.currentOptions == 'The output current ratio') {
                    aux['currentRippleRatio'] = this.localData.currentRippleRatio;
                } else {
                    aux['maximumSwitchCurrent'] = this.localData.maximumSwitchCurrent;
                }
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
            if (this.localData.designLevel == 'I know the design I want') {
                return (aux) => this.taskQueueStore.calculateAdvancedSepicInputs(aux);
            }
            return (aux) => this.taskQueueStore.calculateSepicInputs(aux);
        },
        getSimulateFn() {
            return (aux) => this.taskQueueStore.simulateSepicIdealWaveforms(aux);
        },
        getDefaultFrequency() { return this.localData.switchingFrequency; },
        postProcessResults(result, mode) {
            this.sepicDiagnostics = result?.sepicDiagnostics ?? null;
            if (this.designRequirements) {
                this.simulatedInductance = this.designRequirements.magnetizingInductance?.nominal || null;
            }
        },
        getTopology() { return 'sepicConverter'; },
        getIsolationSides() { return [IsolationSide.Primary]; },

        updateErrorMessage() {
            this.errorMessage = "";
            const vinMin = this.localData.inputVoltage.minimum;
            const vinMax = this.localData.inputVoltage.maximum;
            const vout = this.localData.outputsParameters.voltage;
            const vd = this.localData.diodeVoltageDrop;
            const eta = this.localData.efficiency;
            // SEPIC duty cycle D = (Vo+Vd)/(Vin*eta + Vo+Vd); reject configs that
            // would push the worst-case duty cycle above the SEPIC backend cap of 0.95
            // (see Sepic.h: maximumDutyCycle). Worst case is at minimum Vin.
            if (vinMin > 0 && vout > 0) {
                const dWorst = (vout + vd) / (vinMin * eta + vout + vd);
                if (dWorst >= 0.95) {
                    this.errorMessage = `Operating duty cycle ${(dWorst * 100).toFixed(1)}% at minimum input voltage exceeds the SEPIC 95% cap. Increase Vin,min or lower Vout.`;
                    return;
                }
            }
            if (vinMin > vinMax) {
                this.errorMessage = "Minimum input voltage cannot be larger than maximum input voltage";
            }
            if (this.localData.coupledInductor && (this.localData.couplingCoefficient <= 0 || this.localData.couplingCoefficient >= 1)) {
                this.errorMessage = "Coupling coefficient must be strictly between 0 and 1";
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
                } else {
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
                } else {
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
        async getSpiceCode() {
            await this.$refs.base.generateSpiceCode(this);
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
        getPairedWaveformsList(waveforms, operatingPointIndex, isMagnetic = false) {
            if (!waveforms || !waveforms[operatingPointIndex] || !waveforms[operatingPointIndex].waveforms) {
                return [];
            }
            let allWaveforms = waveforms[operatingPointIndex].waveforms;

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
                for (let i = 0; i < allWaveforms.length; i++) {
                    if (used.has(i)) continue;
                    const wf = allWaveforms[i];
                    const isVoltage = wf.unit === 'V';
                    const isCurrent = wf.unit === 'A';
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
                        used.add(i); used.add(pairIndex);
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

            // Converter view: switch-node V + L1 current; Vin + Vout shared axis
            const pairs = [];
            const switchNodeVoltage = allWaveforms.find(wf => wf.label.toLowerCase().includes('switch node'));
            const inductorCurrent = allWaveforms.find(wf =>
                (wf.label.toLowerCase().includes('l1') || wf.label.toLowerCase().includes('inductor') || wf.label.toLowerCase().includes('primary')) &&
                wf.unit === 'A'
            );
            const inputVoltage = allWaveforms.find(wf => wf.label.toLowerCase().includes('input') && wf.unit === 'V');
            const outputVoltage = allWaveforms.find(wf => wf.label.toLowerCase().includes('output') && wf.unit === 'V');
            if (switchNodeVoltage || inductorCurrent) {
                pairs.push({ voltageWf: switchNodeVoltage || null, currentWf: inductorCurrent || null });
            }
            if (inputVoltage || outputVoltage) {
                pairs.push({ leftWf: inputVoltage || null, rightWf: outputVoltage || null, isVoltagePair: true });
            }
            return pairs;
        },
        isVoltagePairAtIndex(waveforms, operatingPointIndex, pairIndex, isMagnetic) {
            const pairs = this.getPairedWaveformsList(waveforms, operatingPointIndex, isMagnetic);
            if (!pairs || pairIndex >= pairs.length) return false;
            return pairs[pairIndex].isVoltagePair === true;
        },
        getVoltagePairAxisLimits(waveforms, operatingPointIndex, pairIndex, isMagnetic) {
            if (!this.isVoltagePairAtIndex(waveforms, operatingPointIndex, pairIndex, isMagnetic)) {
                return { forceAxisMin: null, forceAxisMax: null };
            }
            const data = this.getPairedWaveformDataForVisualizer(waveforms, operatingPointIndex, pairIndex, isMagnetic);
            if (!data || data.length < 2) {
                return { forceAxisMin: [0, 0], forceAxisMax: null };
            }
            const maxLeft = Math.max(...data[0].data.y);
            const maxRight = Math.max(...data[1].data.y);
            const sharedMax = Math.max(maxLeft, maxRight) * 1.1;
            return { forceAxisMin: [0, 0], forceAxisMax: [sharedMax, sharedMax] };
        },
    }
}
</script>

<template>
  <ConverterWizardBase
    ref="base"
    :title="'SEPIC Wizard'"
    titleIcon="bi bi-arrow-down-up"
    subtitle="Non-Inverting Buck-Boost via Coupling Capacitor"
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
      <div class="compact-header"><i class="bi bi-gear-wide-connected me-1"></i>{{ localData.designLevel == 'I know the design I want' ? 'Design Params' : 'Current Requirement' }}</div>
    </template>

    <template #design-or-switch-parameters>
      <div v-if="localData.designLevel == 'I know the design I want'">
        <Dimension
          :name="'inductance'" :tooltip="tooltipsConverterWizards['sepicInductanceL1']" :replaceTitle="'L1 Inductance'" unit="H"
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
          :tooltip="tooltipsConverterWizards['currentOptions']"
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
          :name="'maximumSwitchCurrent'" :tooltip="tooltipsConverterWizards['maximumSwitchCurrent']" :replaceTitle="'Max Isw'" unit="A"
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
          :name="'currentRippleRatio'" :tooltip="tooltipsConverterWizards['currentRippleRatio']" :replaceTitle="'Ripple'" unit="%" :visualScale="100"
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
      <Dimension :name="'switchingFrequency'" :tooltip="tooltipsConverterWizards['switchingFrequency']" :replaceTitle="'Sw. Frequency'" unit="Hz"
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
      <Dimension :name="'ambientTemperature'" :tooltip="tooltipsConverterWizards['ambientTemperature']" :replaceTitle="'Temperature'" unit=" C"
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
      <Dimension :name="'diodeVoltageDrop'" :tooltip="tooltipsConverterWizards['diodeVoltageDrop']" :replaceTitle="'Diode Vd'" unit="V"
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
      <Dimension :name="'efficiency'" :tooltip="tooltipsConverterWizards['efficiency']" :replaceTitle="'Efficiency'" unit="%" :visualScale="100"
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

      <!-- SEPIC-specific topology toggles -->
      <div class="form-check mt-1" :title="tooltipsConverterWizards['sepicCoupledInductor']">
        <input class="form-check-input" type="checkbox" id="sepicCoupledInductor" v-model="localData.coupledInductor" :data-cy="dataTestLabel + '-CoupledInductor'" @change="updateErrorMessage" />
        <label class="form-check-label" for="sepicCoupledInductor" :style="{color: $styleStore.wizard.inputTextColor, fontSize: $styleStore.wizard.inputLabelFontSize}">
          Coupled Inductor (L1+L2 on one core)
        </label>
      </div>
      <Dimension v-if="localData.coupledInductor"
        :name="'couplingCoefficient'" :tooltip="tooltipsConverterWizards['sepicCouplingCoefficient']" :replaceTitle="'k'" unit=""
        :dataTestLabel="dataTestLabel + '-CouplingCoefficient'"
        :min="0.5" :max="0.999"
        v-model="localData"
        :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <div class="form-check mt-1" :title="tooltipsConverterWizards['sepicSynchronousRectifier']">
        <input class="form-check-input" type="checkbox" id="sepicSyncRect" v-model="localData.synchronousRectifier" :data-cy="dataTestLabel + '-SynchronousRectifier'" @change="updateErrorMessage" />
        <label class="form-check-label" for="sepicSyncRect" :style="{color: $styleStore.wizard.inputTextColor, fontSize: $styleStore.wizard.inputLabelFontSize}">
          Synchronous Rectifier (replace diode with MOSFET)
        </label>
      </div>
    </template>

    <template #col1-footer>
      <div class="d-flex align-items-center justify-content-between mt-2">
        <span v-if="errorMessage" class="error-text"><i class="bi bi-exclamation-triangle-fill me-1"></i>{{ errorMessage }}</span>
        <span v-else></span>
        <div class="action-btns">
          <button :disabled="errorMessage != ''" class="action-btn-sm secondary" @click="processAndReview"><i class="bi bi-search me-1"></i>Review Specs</button>
          <button :disabled="errorMessage != ''" class="action-btn-sm primary" @click="processAndAdvise"><i class="bi bi-magic me-1"></i>Design Magnetic</button>
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
        :name="'voltage'" :tooltip="tooltipsConverterWizards['voltage']" :replaceTitle="'Voltage'" unit="V"
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
        :name="'current'" :tooltip="tooltipsConverterWizards['current']" :replaceTitle="'Current'" unit="A"
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
      <template v-if="sepicDiagnostics" #diagnostics>
      <DimensionReadOnly name="sepicDuty" :tooltip="tooltipsConverterWizards['sepicDuty']" :replaceTitle="'Duty'" :value="sepicDiagnostics.dutyCycle" :unit="null" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-SepicDuty'" />
      <DimensionReadOnly name="sepicConvRatio" :tooltip="tooltipsConverterWizards['sepicConvRatio']" :replaceTitle="'Conv. Ratio M'" :value="sepicDiagnostics.conversionRatio" :unit="null" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-SepicConvRatio'" />
      <DimensionReadOnly name="sepicMode" :tooltip="tooltipsConverterWizards['sepicMode']" :replaceTitle="'Mode'" :value="sepicDiagnostics.isCcm ? 'CCM' : 'DCM'" :unit="null" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-SepicMode'" />
      <DimensionReadOnly name="sepicVcc" :tooltip="tooltipsConverterWizards['sepicVcc']" :replaceTitle="'Coupling Cap. V'" :value="sepicDiagnostics.couplingCapVoltage" unit="V" :numberDecimals="2":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-SepicVcc'" />
      <DimensionReadOnly name="sepicIL1Avg" :tooltip="tooltipsConverterWizards['sepicIL1Avg']" :replaceTitle="'L1 I avg'" :value="sepicDiagnostics.inputInductorAverage" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-SepicIL1Avg'" />
      <DimensionReadOnly name="sepicIL2Avg" :tooltip="tooltipsConverterWizards['sepicIL2Avg']" :replaceTitle="'L2 I avg'" :value="sepicDiagnostics.outputInductorAverage" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-SepicIL2Avg'" />
      <DimensionReadOnly name="sepicIL1Ripple" :tooltip="tooltipsConverterWizards['sepicIL1Ripple']" :replaceTitle="'L1 I ripple'" :value="sepicDiagnostics.inputInductorRipple" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-SepicIL1Ripple'" />
      <DimensionReadOnly name="sepicVsw" :tooltip="tooltipsConverterWizards['sepicVsw']" :replaceTitle="'Sw. Peak V'" :value="sepicDiagnostics.switchPeakVoltage" unit="V" :numberDecimals="2":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-SepicVsw'" />
      <DimensionReadOnly name="sepicIsw" :tooltip="tooltipsConverterWizards['sepicIsw']" :replaceTitle="'Sw. Peak I'" :value="sepicDiagnostics.switchPeakCurrent" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-SepicIsw'" />
      <DimensionReadOnly name="sepicVd" :tooltip="tooltipsConverterWizards['sepicVd']" :replaceTitle="'Diode Peak V'" :value="sepicDiagnostics.diodePeakReverseVoltage" unit="V" :numberDecimals="2":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-SepicVd'" />
      <DimensionReadOnly name="sepicId" :tooltip="tooltipsConverterWizards['sepicId']" :replaceTitle="'Diode Peak I'" :value="sepicDiagnostics.diodePeakCurrent" unit="A" :numberDecimals="3":labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'bg-transparent'" :valueBgColor="'bg-transparent'" :textColor="$styleStore.wizard.inputTextColor" :dataTestLabel="dataTestLabel + '-SepicId'" />
    </template>
  </ConverterWizardBase>
</template>
