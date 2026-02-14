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
            forceWaveformUpdate: 0,
            numberOfPeriods: 2,
            numberOfSteadyStatePeriods: 10,
            converterName: 'Power Factor Correction (PFC)'
        }
    },
    computed: {
        isCcmMode() {
            return this.localData.mode === 'Continuous Conduction Mode';
        }
    },
    watch: {
        waveformViewMode() {
            this.$nextTick(() => {
                this.forceWaveformUpdate += 1;
            });
        },
    },
    methods: {
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
        
        async getAnalyticalWaveforms() {
            this.simulatingWaveforms = true;
            this.waveformError = "";
            this.waveformSource = "analytical";
            
            try {
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
                    ambientTemperature: this.localData.ambientTemperature,
                    numberOfPeriods: parseInt(this.numberOfPeriods, 10),
                    numberOfSteadyStatePeriods: parseInt(this.numberOfSteadyStatePeriods, 10)
                };
                
                if (this.localData.designLevel == 'I know the design I want') {
                    aux['inductance'] = this.localData.inductance;
                }
                
                const result = JSON.parse(await Module.calculate_pfc_inputs(JSON.stringify(aux)));
                
                if (result.error) {
                    this.waveformError = result.error;
                    return;
                }
                
                // Build magnetic waveforms from operating points
                this.simulatedOperatingPoints = result.inputs?.operatingPoints || result.operatingPoints || [];
                this.magneticWaveforms = this.buildMagneticWaveformsFromInputs(this.simulatedOperatingPoints);
                this.converterWaveforms = this.convertConverterWaveforms(result.converterWaveforms || []);
                
                this.simulatedInductance = result.inductance;
                this.designRequirements = result.inputs?.designRequirements || result.designRequirements || null;
                
            } catch (error) {
                console.error('Error getting analytical waveforms:', error);
                this.waveformError = error.message || String(error);
            } finally {
                this.simulatingWaveforms = false;
            }
        },
        
        async getSimulatedWaveforms() {
            this.simulatingWaveforms = true;
            this.waveformError = "";
            this.waveformSource = "simulation";
            
            try {
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
                    ambientTemperature: this.localData.ambientTemperature,
                    numberOfPeriods: parseInt(this.numberOfPeriods, 10),
                    numberOfSteadyStatePeriods: parseInt(this.numberOfSteadyStatePeriods, 10)
                };
                
                if (this.localData.designLevel == 'I know the design I want') {
                    aux['inductance'] = this.localData.inductance;
                }
                
                const result = JSON.parse(await Module.simulate_pfc_waveforms(JSON.stringify(aux)));

                if (result.error) {
                    this.waveformError = result.error;
                    return;
                }

                // PFC simulation returns magneticWaveforms and converterWaveforms directly (different format from other converters)
                this.magneticWaveforms = result.magneticWaveforms || [];
                this.converterWaveforms = result.converterWaveforms || [];

                this.simulatedInductance = result.inductance;
                
            } catch (error) {
                console.error('Error simulating waveforms:', error);
                this.waveformError = error.message || String(error);
            } finally {
                this.simulatingWaveforms = false;
            }
        },
        
        buildMagneticWaveformsFromInputs(operatingPoints) {
            const magneticWaveforms = [];
            
            for (let opIdx = 0; opIdx < operatingPoints.length; opIdx++) {
                const op = operatingPoints[opIdx];
                const opWaveforms = {
                    frequency: op.excitationsPerWinding?.[0]?.frequency || this.localData.switchingFrequency,
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
        
        repeatWaveformsForPeriods(waveformsData) {
            if (this.numberOfPeriods <= 1 || !waveformsData || waveformsData.length === 0) {
                return waveformsData;
            }
            
            return waveformsData.map(op => {
                if (!op.waveforms) return op;
                
                const repeatedWaveforms = op.waveforms.map(wf => {
                    if (!wf.x || wf.x.length < 2) return wf;
                    
                    const period = wf.x[wf.x.length - 1] - wf.x[0];
                    const repeatedX = [...wf.x];
                    const repeatedY = [...wf.y];
                    
                    for (let p = 1; p < this.numberOfPeriods; p++) {
                        const offset = period * p;
                        wf.x.slice(1).forEach(x => repeatedX.push(x + offset));
                        wf.y.slice(1).forEach(y => repeatedY.push(y));
                    }
                    
                    return { ...wf, x: repeatedX, y: repeatedY };
                });
                
                return { ...op, waveforms: repeatedWaveforms };
            });
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
        
        getTimeAxisOptions() {
            return {
                label: 'Time',
                colorLabel: '#d4d4d4',
                type: 'value',
                unit: 's',
            };
        },
        
        getSingleWaveformDataForVisualizer(waveforms, operatingPointIndex, waveformIndex) {
            if (!waveforms || !waveforms[operatingPointIndex] || !waveforms[operatingPointIndex].waveforms) {
                return [];
            }
            
            const wf = waveforms[operatingPointIndex].waveforms[waveformIndex];
            
            if (!wf || !wf.x || !wf.y) return [];
            
            let yData = [...wf.y]; // Clone to avoid mutating original
            const isVoltageWaveform = wf.unit === 'V';
            
            // Note: Removed voltage clipping for PFC as it can distort the rectified sine waveform
            
            const lineColor = isVoltageWaveform ? 
                (this.$styleStore?.operatingPoints?.voltageGraph?.color || '#b18aea') : 
                (this.$styleStore?.operatingPoints?.currentGraph?.color || '#4CAF50');
            
            return [{
                label: wf.label,
                data: {
                    x: wf.x,
                    y: yData,
                },
                colorLabel: lineColor,
                type: 'value',
                position: 'left',
                unit: wf.unit,
                numberDecimals: 3,
            }];
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
            
            try {
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
                
                this.errorMessage = "";
                return result.masInputs;
                
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
            this.$stateStore.resetMagneticTool();
            console.log('[PFC] resetMagneticTool done');
            
            console.log('[PFC] Calling designLoaded...');
            this.$stateStore.designLoaded();
            console.log('[PFC] designLoaded done');
            
            console.log('[PFC] Calling selectApplication...');
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Power);
            console.log('[PFC] selectApplication done');
            
            console.log('[PFC] Calling selectWorkflow...');
            this.$stateStore.selectWorkflow("design");
            console.log('[PFC] selectWorkflow done');
            
            console.log('[PFC] Calling selectTool...');
            this.$stateStore.selectTool("agnosticTool");
            console.log('[PFC] selectTool done');
            
            console.log('[PFC] Calling setCurrentToolSubsectionStatus...');
            this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
            this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            console.log('[PFC] setCurrentToolSubsectionStatus done');
            
            console.log('[PFC] Setting MAS data...');
            console.log('[PFC] masInputs:', masInputs);
            
            // The backend returns designRequirements fields directly in masInputs, not nested
            // Set MAS data after reset - assign the entire masInputs to inputs
            console.log('[PFC] Setting masStore.mas.inputs...');
            Object.assign(this.masStore.mas.inputs, masInputs);
            console.log('[PFC] Set masInputs done');
            
            // Set up coil functional description
            console.log('[PFC] Setting up coil functionalDescription...');
            this.masStore.mas.magnetic.coil.functionalDescription = [];
            if (masInputs.operatingPoints && masInputs.operatingPoints.length > 0) {
                masInputs.operatingPoints[0].excitationsPerWinding.forEach((elem, index) => {
                    this.masStore.mas.magnetic.coil.functionalDescription.push({
                        "name": elem.name || "Winding " + (index + 1),
                        "numberTurns": 0,
                        "numberParallels": 0,
                        "isolationSide": masInputs.isolationSides?.[index] || "primary",
                        "wire": ""
                    });
                });
            }
            console.log('[PFC] coil.functionalDescription:', this.masStore.mas.magnetic.coil.functionalDescription);
            
            this.$stateStore.operatingPoints.modePerPoint = [];
            this.masStore.mas.magnetic.coil.functionalDescription.forEach((_) => {
                this.$stateStore.operatingPoints.modePerPoint.push(this.$stateStore.OperatingPointsMode.Manual);
            });
            console.log('[PFC] modePerPoint set');
            
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
            
            this.$stateStore.resetMagneticTool();
            this.$stateStore.designLoaded();
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Power);
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            this.$stateStore.setCurrentToolSubsection("magneticBuilder");
            this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
            this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            
            // Set MAS data after reset - assign the entire masInputs to inputs
            Object.assign(this.masStore.mas.inputs, masInputs);
            
            // Set up coil functional description
            this.masStore.mas.magnetic.coil.functionalDescription = [];
            if (masInputs.operatingPoints && masInputs.operatingPoints.length > 0) {
                masInputs.operatingPoints[0].excitationsPerWinding.forEach((elem, index) => {
                    this.masStore.mas.magnetic.coil.functionalDescription.push({
                        "name": elem.name || "Winding " + (index + 1),
                        "numberTurns": 0,
                        "numberParallels": 0,
                        "isolationSide": masInputs.isolationSides?.[index] || "primary",
                        "wire": ""
                    });
                });
            }
            
            this.$stateStore.operatingPoints.modePerPoint = [this.$stateStore.OperatingPointsMode.Manual];
            
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
        }
    }
}

</script>

<template>
  <ConverterWizardBase
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
