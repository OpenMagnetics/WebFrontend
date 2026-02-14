<script setup>
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
</script>

<script>
export default {
  props: {
    dataTestLabel: { type: String, default: 'CllcWizard' },
  },
  data() {
    const masStore = useMasStore();
    const taskQueueStore = useTaskQueueStore();
    const localData = {
      inputVoltage: { nominal: 400, tolerance: 0.1 },
      outputVoltage: 400,
      outputPower: 3000,
      minSwitchingFrequency: 80000,
      maxSwitchingFrequency: 120000,
      resonantFrequency: 100000,
      qualityFactor: 0.4,
      symmetricDesign: true,
      bidirectional: true,
      magnetizingInductance: 150e-6,
      turnsRatio: 1.0,
      ambientTemperature: 25,
      efficiency: 0.97,
      insulationType: 'Basic',
    };
    const insulationTypes = ['No', 'Basic', 'Reinforced'];
    return {
      masStore, taskQueueStore, localData, insulationTypes,
      errorMessage: "", simulatingWaveforms: false, waveformSource: '', waveformError: "",
      magneticWaveforms: [], converterWaveforms: [], designRequirements: null,
      simulatedTurnsRatios: null, numberOfPeriods: 2, numberOfSteadyStatePeriods: 1,
    }
  },
  methods: {
    updateErrorMessage() { this.errorMessage = ""; },
    dismissError() { this.errorMessage = ""; this.waveformError = ""; },

    async process() {
      this.masStore.resetMas("power");
      try {
        const aux = {
          inputVoltage: this.localData.inputVoltage,
          minSwitchingFrequency: this.localData.minSwitchingFrequency,
          maxSwitchingFrequency: this.localData.maxSwitchingFrequency,
          resonantFrequency: this.localData.resonantFrequency,
          qualityFactor: this.localData.qualityFactor,
          symmetricDesign: this.localData.symmetricDesign,
          bidirectional: this.localData.bidirectional,
          desiredInductance: this.localData.magnetizingInductance,
          desiredTurnsRatios: [this.localData.turnsRatio],
          operatingPoints: [{
            outputVoltages: [this.localData.outputVoltage],
            outputCurrents: [this.localData.outputPower / this.localData.outputVoltage],
            switchingFrequency: this.localData.resonantFrequency,
            ambientTemperature: this.localData.ambientTemperature,
          }]
        };
        const result = await this.taskQueueStore.calculateCllcInputs(aux);
        if (result.error) { this.errorMessage = result.error; return false; }
        this.masStore.setInputs(result.masInputs);
        this.designRequirements = result.designRequirements;
        this.simulatedTurnsRatios = result.simulatedTurnsRatios;
        return true;
      } catch (error) {
        this.errorMessage = error.message || "Failed to process CLLC inputs";
        return false;
      }
    },

    async processAndReview() {
      const success = await this.process();
      if (!success) { setTimeout(() => { this.errorMessage = "" }, 5000); return; }
      this.$stateStore.resetMagneticTool();
      this.$stateStore.designLoaded();
      this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Power);
      this.$stateStore.selectWorkflow("design");
      this.$stateStore.selectTool("agnosticTool");
      this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
      this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
      this.$stateStore.operatingPoints.modePerPoint = [];
      this.masStore.mas.magnetic.coil.functionalDescription.forEach((_) => {
        this.$stateStore.operatingPoints.modePerPoint.push(this.$stateStore.OperatingPointsMode.Manual);
      })
      await this.$nextTick();
      await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
    },

    async processAndAdvise() {
      const success = await this.process();
      if (!success) { setTimeout(() => { this.errorMessage = "" }, 5000); return; }
      this.$stateStore.resetMagneticTool();
      this.$stateStore.designLoaded();
      this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Power);
      this.$stateStore.selectWorkflow("design");
      this.$stateStore.selectTool("agnosticTool");
      this.$stateStore.setCurrentToolSubsection("magneticBuilder");
      this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
      this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
      this.$stateStore.operatingPoints.modePerPoint = [this.$stateStore.OperatingPointsMode.Manual];
      await this.$nextTick();
      await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
    },

    buildMagneticWaveformsFromInputs(operatingPoints) {
      const magneticWaveforms = [];
      
      for (let opIdx = 0; opIdx < operatingPoints.length; opIdx++) {
        const op = operatingPoints[opIdx];
        const opWaveforms = {
          frequency: op.excitationsPerWinding?.[0]?.frequency || this.localData.resonantFrequency,
          operatingPointName: op.name || `Operating Point ${opIdx + 1}`,
          waveforms: []
        };
        
        // Extract waveforms from each winding excitation
        const excitations = op.excitationsPerWinding || [];
        for (let windingIdx = 0; windingIdx < excitations.length; windingIdx++) {
          const excitation = excitations[windingIdx];
          const windingLabel = windingIdx === 0 ? 'Primary' : `Secondary ${windingIdx}`;
          
          // Voltage waveform
          if (excitation.voltage?.waveform?.time && excitation.voltage?.waveform?.data) {
            opWaveforms.waveforms.push({
              label: `${windingLabel} Voltage`,
              x: excitation.voltage.waveform.time,
              y: excitation.voltage.waveform.data,
              type: 'voltage',
              unit: 'V'
            });
          }
          
          // Current waveform
          if (excitation.current?.waveform?.time && excitation.current?.waveform?.data) {
            opWaveforms.waveforms.push({
              label: `${windingLabel} Current`,
              x: excitation.current.waveform.time,
              y: excitation.current.waveform.data,
              type: 'current',
              unit: 'A'
            });
          }
        }
        
        magneticWaveforms.push(opWaveforms);
      }
      
      return magneticWaveforms;
    },

    convertConverterWaveforms(converterWaveforms) {
      return converterWaveforms.map((cw, idx) => {
        const opWaveforms = {
          frequency: cw.switchingFrequency || this.localData.switchingFrequency,
          operatingPointName: cw.operatingPointName || `Operating Point ${idx + 1}`,
          waveforms: []
        };
        
        if (cw.inputVoltage?.time && cw.inputVoltage?.data) {
          opWaveforms.waveforms.push({
            label: 'Input Voltage', x: cw.inputVoltage.time, y: cw.inputVoltage.data,
            type: 'voltage', unit: 'V'
          });
        }
        
        if (cw.inputCurrent?.time && cw.inputCurrent?.data) {
          opWaveforms.waveforms.push({
            label: 'Input Current', x: cw.inputCurrent.time, y: cw.inputCurrent.data,
            type: 'current', unit: 'A'
          });
        }
        
        if (cw.outputVoltages) {
          cw.outputVoltages.forEach((outV, outIdx) => {
            if (outV.time && outV.data) {
              opWaveforms.waveforms.push({
                label: `Output ${outIdx + 1} Voltage`, x: outV.time, y: outV.data,
                type: 'voltage', unit: 'V'
              });
            }
          });
        }
        
        if (cw.outputCurrents) {
          cw.outputCurrents.forEach((outI, outIdx) => {
            if (outI.time && outI.data) {
              opWaveforms.waveforms.push({
                label: `Output ${outIdx + 1} Current`, x: outI.time, y: outI.data,
                type: 'current', unit: 'A'
              });
            }
          });
        }
        
        return opWaveforms;
      });
    },

    repeatWaveformForPeriods(time, data, numberOfPeriods) {
      // Repeat a single-period waveform for the specified number of periods
      if (!time || !data || time.length === 0 || numberOfPeriods <= 1) {
        return { time, data };
      }
      
      const period = time[time.length - 1] - time[0];
      const newTime = [];
      const newData = [];
      
      for (let p = 0; p < numberOfPeriods; p++) {
        const offset = p * period;
        for (let i = 0; i < time.length; i++) {
          // Skip first point in subsequent periods ONLY if it doesn't create duplicate time
          if (p > 0 && i === 0) {
            // Check if this point would create a duplicate time value
            const newTimeValue = time[i] + offset;
            if (newTime.length > 0 && Math.abs(newTime[newTime.length - 1] - newTimeValue) < 1e-12) {
              continue; // Skip to avoid duplicate
            }
          }
          newTime.push(time[i] + offset);
          newData.push(data[i]);
        }
      }
      
      return { time: newTime, data: newData };
    },

    async getAnalyticalWaveforms() {
      this.waveformSource = 'analytical';
      this.simulatingWaveforms = true;
      this.waveformError = "";
      this.magneticWaveforms = [];
      this.converterWaveforms = [];
      try {
        const aux = {
          inputVoltage: this.localData.inputVoltage,
          minSwitchingFrequency: this.localData.minSwitchingFrequency,
          maxSwitchingFrequency: this.localData.maxSwitchingFrequency,
          resonantFrequency: this.localData.resonantFrequency,
          qualityFactor: this.localData.qualityFactor,
          symmetricDesign: this.localData.symmetricDesign,
          bidirectional: this.localData.bidirectional,
          desiredInductance: this.localData.magnetizingInductance,
          desiredTurnsRatios: [this.localData.turnsRatio],
          operatingPoints: [{
            outputVoltages: [this.localData.outputVoltage],
            outputCurrents: [this.localData.outputPower / this.localData.outputVoltage],
            switchingFrequency: this.localData.resonantFrequency,
            ambientTemperature: this.localData.ambientTemperature,
          }]
        };
        aux['numberOfPeriods'] = parseInt(this.numberOfPeriods, 10);
        const result = await this.taskQueueStore.calculateCllcInputs(aux);
        if (result.error) { this.waveformError = result.error; }
        else {
          // Build magnetic waveforms from operating points
          this.simulatedOperatingPoints = result.inputs?.operatingPoints || result.operatingPoints || [];
          this.magneticWaveforms = this.buildMagneticWaveformsFromInputs(this.simulatedOperatingPoints);
          this.designRequirements = result.inputs?.designRequirements || result.designRequirements || null;
        }
      } catch (error) { this.waveformError = error.message || "Failed to get analytical waveforms"; }
      this.simulatingWaveforms = false;
    },

    async simulateIdealWaveforms() {
      this.waveformSource = 'simulation';
      this.simulatingWaveforms = true;
      this.waveformError = "";
      this.magneticWaveforms = [];
      this.converterWaveforms = [];
      try {
        const aux = {
          inputVoltage: this.localData.inputVoltage,
          minSwitchingFrequency: this.localData.minSwitchingFrequency,
          maxSwitchingFrequency: this.localData.maxSwitchingFrequency,
          resonantFrequency: this.localData.resonantFrequency,
          qualityFactor: this.localData.qualityFactor,
          symmetricDesign: this.localData.symmetricDesign,
          bidirectional: this.localData.bidirectional,
          desiredInductance: this.localData.magnetizingInductance,
          desiredTurnsRatios: [this.localData.turnsRatio],
          operatingPoints: [{
            outputVoltages: [this.localData.outputVoltage],
            outputCurrents: [this.localData.outputPower / this.localData.outputVoltage],
            switchingFrequency: this.localData.resonantFrequency,
            ambientTemperature: this.localData.ambientTemperature,
          }]
        };
        aux['numberOfPeriods'] = parseInt(this.numberOfPeriods, 10);
        aux['numberOfSteadyStatePeriods'] = parseInt(this.numberOfSteadyStatePeriods, 10);
        const result = await this.taskQueueStore.calculateCllcInputs(aux);
        if (result.error) { this.waveformError = result.error; }
        else {
          // Build magnetic waveforms from operating points
          this.simulatedOperatingPoints = result.inputs?.operatingPoints || result.operatingPoints || [];
          this.magneticWaveforms = this.buildMagneticWaveformsFromInputs(this.simulatedOperatingPoints);
          this.designRequirements = result.inputs?.designRequirements || result.designRequirements || null;
        }
      } catch (error) { this.waveformError = error.message || "Failed to simulate waveforms"; }
      this.simulatingWaveforms = false;
    },
  },
}
</script>

<template>
  <ConverterWizardBase
    title="CLLC Wizard"
    titleIcon="fa-charging-station"
    subtitle="Bidirectional Resonant DC-DC Converter"
    :col1Width="3" :col2Width="4" :col3Width="5"
    :magneticWaveforms="magneticWaveforms"
    :converterWaveforms="converterWaveforms"
    :simulatingWaveforms="simulatingWaveforms"
    :waveformSource="waveformSource"
    :waveformError="waveformError"
    :errorMessage="errorMessage"
    :numberOfPeriods="numberOfPeriods"
    :numberOfSteadyStatePeriods="numberOfSteadyStatePeriods"
    :disableActions="errorMessage != ''"
    @update:numberOfPeriods="numberOfPeriods = $event"
    @update:numberOfSteadyStatePeriods="numberOfSteadyStatePeriods = $event"
    @get-analytical-waveforms="getAnalyticalWaveforms"
    @get-simulated-waveforms="simulateIdealWaveforms"
    @dismiss-error="dismissError"
  >
    <template #conditions>
      <Dimension :name="'minSwitchingFrequency'" :replaceTitle="'Min Freq'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'maxSwitchingFrequency'" :replaceTitle="'Max Freq'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'resonantFrequency'" :replaceTitle="'Res Freq'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'ambientTemperature'" :replaceTitle="'Temp'" unit=" C" :min="minimumMaximumScalePerParameter['temperature']['min']" :max="minimumMaximumScalePerParameter['temperature']['max']" :allowNegative="true" :allowZero="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'efficiency'" :replaceTitle="'Eff'" unit="%" :visualScale="100" :min="0.5" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <ElementFromList :name="'insulationType'" :replaceTitle="'Insul'" :options="insulationTypes" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.bidirectional" id="bidirectional"><label class="form-check-label small" for="bidirectional" :style="{ color: $styleStore.wizard.inputTextColor }">Bidirectional</label></div>
    </template>

    <template #design-or-switch-parameters-title>
      <div class="compact-header"><i class="fa-solid fa-cogs me-1"></i>Tank</div>
    </template>

    <template #design-or-switch-parameters>
      <Dimension :name="'qualityFactor'" :replaceTitle="'Q Factor'" :unit="null" :min="0.1" :max="2" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'turnsRatio'" :replaceTitle="'Turns'" :unit="null" :min="0.1" :max="100" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'magnetizingInductance'" :replaceTitle="'Mag L'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.symmetricDesign" id="symmetricDesign"><label class="form-check-label small" for="symmetricDesign" :style="{ color: $styleStore.wizard.inputTextColor }">Symmetric Tank</label></div>
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
