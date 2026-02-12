<script setup>
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { combinedStyle, combinedClass, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromListRadio from '/WebSharedComponents/DataInput/ElementFromListRadio.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { defaultPfcWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from '/WebSharedComponents/assets/js/defaults.js'
import MaximumDimensions from '../Toolbox/DesignRequirements/MaximumDimensions.vue'
import LineVisualizer from '/WebSharedComponents/Common/LineVisualizer.vue'
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
            waveformSource: "", // 'simulation' or 'analytical'
            simulatedOperatingPoints: [],
            designRequirements: null,
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
                
                // Parse and store waveforms
                if (result.magneticWaveforms) {
                    this.magneticWaveforms = this.repeatWaveformsForPeriods(result.magneticWaveforms);
                }
                if (result.converterWaveforms) {
                    this.converterWaveforms = this.repeatWaveformsForPeriods(result.converterWaveforms);
                }
                
                this.simulatedInductance = result.inductance;
                this.designRequirements = result.designRequirements;
                
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
                
                // Parse and store waveforms
                if (result.magneticWaveforms) {
                    this.magneticWaveforms = this.repeatWaveformsForPeriods(result.magneticWaveforms);
                }
                if (result.converterWaveforms) {
                    this.converterWaveforms = this.repeatWaveformsForPeriods(result.converterWaveforms);
                }
                
                this.simulatedInductance = result.inductance;
                this.designRequirements = result.designRequirements;
                
            } catch (error) {
                console.error('Error simulating waveforms:', error);
                this.waveformError = error.message || String(error);
            } finally {
                this.simulatingWaveforms = false;
            }
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
    <div class="wizard-container container-fluid px-3">
        <!-- Compact Header -->
        <div class="wizard-header text-center py-2 mb-3">
            <h4 class="wizard-title mb-0">
                <i class="fa-solid fa-wave-square me-2"></i>{{ converterName }}
            </h4>
        </div>

        <div class="row g-2">
            <!-- Column 1: Design Mode, Switch/Design Params, Conditions -->
            <div class="col-12 col-xl-3">
                <div class="d-flex flex-column gap-2">
                    <!-- Design Mode -->
                    <div class="compact-card">
                        <div class="compact-header"><i class="fa-solid fa-sliders me-1"></i>Design Mode</div>
                        <div class="compact-body ps-4">
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
                        </div>
                    </div>

                    <!-- Conditional: Design Parameters (Advanced) OR Mode Selection (Help) -->
                    <div v-if="localData.designLevel == 'I know the design I want'" class="compact-card">
                        <div class="compact-header"><i class="fa-solid fa-cogs me-1"></i>Design Params</div>
                        <div class="compact-body ps-4">
                            <Dimension
                                :name="'inductance'"
                                :replaceTitle="'Inductance'"
                                unit="H"
                                :dataTestLabel="dataTestLabel + '-Inductance'"
                                :min="minimumMaximumScalePerParameter['inductance']['min']"
                                :max="minimumMaximumScalePerParameter['inductance']['max']"
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
                        </div>
                    </div>
                    <div v-else class="compact-card">
                        <div class="compact-header"><i class="fa-solid fa-microchip me-1"></i>Mode</div>
                        <div class="compact-body ps-4">
                            <ElementFromListRadio
                                :name="'mode'"
                                :dataTestLabel="dataTestLabel + '-Mode'"
                                :replaceTitle="''"
                                :options="modeOptions"
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
                            <Dimension
                                :name="'currentRippleRatio'"
                                :replaceTitle="'Ripple'"
                                unit="%"
                                :visualScale="100"
                                :dataTestLabel="dataTestLabel + '-CurrentRippleRatio'"
                                :min="0.01"
                                :max="1"
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
                        </div>
                    </div>

                    <!-- Operating Conditions -->
                    <div class="compact-card">
                        <div class="compact-header"><i class="fa-solid fa-gauge-high me-1"></i>Conditions</div>
                        <div class="compact-body ps-4">
                            <div class="row g-1">
                                <div class="col-12">
                                    <Dimension
                                        :name="'switchingFrequency'"
                                        :replaceTitle="'Sw. Freq'"
                                        unit="Hz"
                                        :dataTestLabel="dataTestLabel + '-switchingFrequency'"
                                        :min="minimumMaximumScalePerParameter['frequency']['min']"
                                        :max="minimumMaximumScalePerParameter['frequency']['max']"
                                        v-model="localData"
                                        :labelWidthProportionClass="'col-6'"
                                        :valueWidthProportionClass="'col-6'"
                                        :valueFontSize="$styleStore.wizard.inputFontSize"
                                        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                                        :labelBgColor="'transparent'"
                                        :valueBgColor="$styleStore.wizard.inputValueBgColor"
                                        :textColor="$styleStore.wizard.inputTextColor"
                                        @update="updateErrorMessage"
                                    />
                                </div>
                                <div class="col-12">
                                    <Dimension
                                        :name="'lineFrequency'"
                                        :replaceTitle="'Line Freq'"
                                        unit="Hz"
                                        :dataTestLabel="dataTestLabel + '-lineFrequency'"
                                        :min="1"
                                        :max="400"
                                        v-model="localData"
                                        :labelWidthProportionClass="'col-6'"
                                        :valueWidthProportionClass="'col-6'"
                                        :valueFontSize="$styleStore.wizard.inputFontSize"
                                        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                                        :labelBgColor="'transparent'"
                                        :valueBgColor="$styleStore.wizard.inputValueBgColor"
                                        :textColor="$styleStore.wizard.inputTextColor"
                                        @update="updateErrorMessage"
                                    />
                                </div>
                                <div class="col-12">
                                    <Dimension 
                                        :name="'diodeVoltageDrop'"
                                        :replaceTitle="'Diode Vd'"
                                        unit="V"
                                        :dataTestLabel="dataTestLabel + '-DiodeVoltageDrop'"
                                        :min="0.1"
                                        :max="2"
                                        v-model="localData"
                                        :labelWidthProportionClass="'col-6'"
                                        :valueWidthProportionClass="'col-6'"
                                        :valueFontSize="$styleStore.wizard.inputFontSize"
                                        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                                        :labelBgColor="'transparent'"
                                        :valueBgColor="$styleStore.wizard.inputValueBgColor"
                                        :textColor="$styleStore.wizard.inputTextColor"
                                        @update="updateErrorMessage"
                                    />
                                </div>
                                <div class="col-12">
                                    <Dimension
                                        :name="'efficiency'"
                                        :replaceTitle="'Efficiency'"
                                        unit="%"
                                        :visualScale="100"
                                        :dataTestLabel="dataTestLabel + '-Efficiency'"
                                        :min="0.01"
                                        :max="1"
                                        v-model="localData"
                                        :labelWidthProportionClass="'col-6'"
                                        :valueWidthProportionClass="'col-6'"
                                        :valueFontSize="$styleStore.wizard.inputFontSize"
                                        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                                        :labelBgColor="'transparent'"
                                        :valueBgColor="$styleStore.wizard.inputValueBgColor"
                                        :textColor="$styleStore.wizard.inputTextColor"
                                        @update="updateErrorMessage"
                                    />
                                </div>
                                <div class="col-12">
                                    <Dimension
                                        :name="'ambientTemperature'"
                                        :replaceTitle="'Temp'"
                                        unit="°C"
                                        :dataTestLabel="dataTestLabel + '-AmbientTemperature'"
                                        :min="-50"
                                        :max="150"
                                        v-model="localData"
                                        :labelWidthProportionClass="'col-6'"
                                        :valueWidthProportionClass="'col-6'"
                                        :valueFontSize="$styleStore.wizard.inputFontSize"
                                        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                                        :labelBgColor="'transparent'"
                                        :valueBgColor="$styleStore.wizard.inputValueBgColor"
                                        :textColor="$styleStore.wizard.inputTextColor"
                                        @update="updateErrorMessage"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Error + Actions -->
                    <div class="d-flex align-items-center justify-content-between mt-2">
                        <span v-if="errorMessage" class="error-text"><i class="fa-solid fa-exclamation-triangle me-1"></i>{{ errorMessage }}</span>
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
                </div>
            </div>

            <!-- Column 2: Input & Output -->
            <div class="col-12 col-xl-4">
                <div class="d-flex flex-column gap-2">
                    <!-- Input Voltage (AC RMS) -->
                    <div class="compact-card">
                        <div class="compact-header"><i class="fa-solid fa-plug me-1"></i>Input Voltage (AC RMS)</div>
                        <div class="compact-body">
                            <DimensionWithTolerance
                                :name="'inputVoltage'"
                                :replaceTitle="''"
                                unit="V"
                                :dataTestLabel="dataTestLabel + '-InputVoltage'"
                                :min="minimumMaximumScalePerParameter['voltage']['min']"
                                :max="minimumMaximumScalePerParameter['voltage']['max']"
                                :labelWidthProportionClass="'d-none'"
                                :valueWidthProportionClass="'col-4'"
                                v-model="localData.inputVoltage"
                                :severalRows="true"
                                :addButtonStyle="$styleStore.wizard.addButton"
                                :removeButtonBgColor="$styleStore.wizard.removeButton['background-color']"
                                :titleFontSize="$styleStore.wizard.inputLabelFontSize"
                                :valueFontSize="$styleStore.wizard.inputFontSize"
                                :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                                :labelBgColor="'transparent'"
                                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                                :textColor="$styleStore.wizard.inputTextColor"
                                @update="updateErrorMessage"
                            />
                        </div>
                    </div>

                    <!-- Output (DC) -->
                    <div class="compact-card">
                        <div class="compact-header"><i class="fa-solid fa-arrow-right-from-bracket me-1"></i>Output (DC)</div>
                        <div class="compact-body">
                            <Dimension
                                :name="'outputVoltage'"
                                :replaceTitle="'Voltage'"
                                unit="V"
                                :dataTestLabel="dataTestLabel + '-OutputVoltage'"
                                :min="minimumMaximumScalePerParameter['voltage']['min']"
                                :max="minimumMaximumScalePerParameter['voltage']['max']"
                                v-model="localData"
                                :labelWidthProportionClass="'col-4'"
                                :valueWidthProportionClass="'col-8'"
                                :valueFontSize="$styleStore.wizard.inputFontSize"
                                :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                                :labelBgColor="'transparent'"
                                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                                :textColor="localData.outputVoltage <= 0 ? $styleStore.wizard.inputErrorTextColor : $styleStore.wizard.inputTextColor"
                                @update="updateErrorMessage"
                            />
                            <Dimension
                                :name="'outputPower'"
                                :replaceTitle="'Power'"
                                unit="W"
                                :dataTestLabel="dataTestLabel + '-OutputPower'"
                                :min="0.1"
                                :max="1e6"
                                v-model="localData"
                                :labelWidthProportionClass="'col-4'"
                                :valueWidthProportionClass="'col-8'"
                                :valueFontSize="$styleStore.wizard.inputFontSize"
                                :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                                :labelBgColor="'transparent'"
                                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                                :textColor="localData.outputPower <= 0 ? $styleStore.wizard.inputErrorTextColor : $styleStore.wizard.inputTextColor"
                                @update="updateErrorMessage"
                            />
                        </div>
                    </div>


                </div>
            </div>

            <!-- Column 3: Waveforms -->
            <div class="col-12 col-xl-5">
                <div class="compact-card simulation-card">
                    <div class="compact-header d-flex justify-content-between align-items-center">
                        <span><i class="fa-solid fa-wave-square me-1"></i>Waveforms</span>
                        <div class="d-flex align-items-center gap-2">
                            <div class="periods-selector">
                                <label class="periods-label">Periods:</label>
                                <select v-model.number="numberOfPeriods" class="periods-select">
                                    <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
                                </select>
                            </div>
                            <div class="periods-selector">
                                <label class="periods-label">Steady:</label>
                                <input v-model.number="numberOfSteadyStatePeriods" type="number" min="1" max="20" class="periods-select" style="width: 60px;" />
                            </div>
                            <div class="sim-btns">
                            <button :disabled="errorMessage != '' || simulatingWaveforms" class="sim-btn analytical" @click="getAnalyticalWaveforms" title="Get analytical waveforms">
                                <span v-if="simulatingWaveforms && waveformSource === 'analytical'"><i class="fa-solid fa-spinner fa-spin"></i></span>
                                <span v-else><i class="fa-solid fa-calculator"></i> Analytical waveforms</span>
                            </button>
                            <button :disabled="errorMessage != '' || simulatingWaveforms" class="sim-btn" @click="getSimulatedWaveforms" title="Simulate ideal waveforms">
                                <span v-if="simulatingWaveforms && waveformSource === 'simulation'"><i class="fa-solid fa-spinner fa-spin"></i></span>
                                <span v-else><i class="fa-solid fa-play"></i> Simulated waveforms</span>
                            </button>
                            </div>
                        </div>
                    </div>
                    <div class="compact-body simulation-body">
                        <div v-if="waveformError" class="error-text-full">
                            <i class="fa-solid fa-exclamation-circle me-2"></i>{{ waveformError }}
                        </div>
                        <div v-else-if="getWaveformsForView().length === 0" class="empty-state-compact">
                            <i class="fa-solid fa-chart-line empty-icon"></i>
                            <p class="empty-text">Click <i class="fa-solid fa-calculator"></i> or <i class="fa-solid fa-microchip"></i> to generate waveforms</p>
                        </div>
                        <div v-else class="waveforms-grid">
                            <div v-for="(opWaveforms, opIndex) in getWaveformsForView()" :key="`op-${opIndex}-${forceWaveformUpdate}`">
                                <div class="op-label">{{ opWaveforms.operatingPointName || `Operating Point ${opIndex + 1}` }}</div>
                                <div v-for="(wf, wfIndex) in getWaveformDataForVisualizer(getWaveformsForView(), opIndex)" :key="`wf-${opIndex}-${wfIndex}-${forceWaveformUpdate}`" class="waveform-item">
                                    <LineVisualizer
                                        v-if="getSingleWaveformDataForVisualizer(getWaveformsForView(), opIndex, wfIndex).length > 0"
                                        :data="getSingleWaveformDataForVisualizer(getWaveformsForView(), opIndex, wfIndex)"
                                        :xAxisOptions="getTimeAxisOptions()"
                                        :title="wf.label"
                                        :titleFontSize="14"
                                        :axisLabelFontSize="9"
                                        :height="150"
                                        :showLegend="false"
                                        :showTitle="true"
                                        :showGrid="true"
                                        :chartPaddings="{top: 45, left: 40, right: 40, bottom: 20}"
                                        :bgColor="'transparent'"
                                        :textColor="$styleStore?.wizard?.inputTextColor?.color || '#ffffff'"
                                        :chartStyle="'height: 140px'"
                                        :toolbox="false"
                                        :showPoints="false"
                                        :forceUpdate="forceWaveformUpdate"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Wizard Container */
.wizard-container {
    min-height: calc(100vh - 60px);
    padding-bottom: 20px;
}

/* Header */
.wizard-header {
    background: linear-gradient(135deg, rgba(177, 138, 234, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
    border-bottom: 1px solid rgba(177, 138, 234, 0.2);
    border-radius: 8px;
}

.wizard-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: #b18aea;
}

/* Compact Cards */
.compact-card {
    background: rgba(30, 30, 40, 0.6);
    border: 1px solid rgba(177, 138, 234, 0.2);
    border-radius: 8px;
    overflow: hidden;
}

.compact-header {
    padding: 6px 10px;
    background: rgba(177, 138, 234, 0.1);
    border-bottom: 1px solid rgba(177, 138, 234, 0.15);
    font-size: 0.8rem;
    font-weight: 500;
    color: #b18aea;
    flex-wrap: wrap;
    gap: 8px;
}

.compact-header > span {
    white-space: nowrap;
}

.compact-body {
    padding: 8px;
}

/* Simulation Card */
.simulation-card {
    min-height: 200px;
}

.simulation-body {
    min-height: 150px;
    display: flex;
    flex-direction: column;
}

.sim-btns {
    display: flex;
    gap: 4px;
}

.sim-btn {
    background: linear-gradient(135deg, #b18aea 0%, #8b5cf6 100%);
    border: none;
    border-radius: 4px;
    padding: 3px 10px;
    color: white;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
}

.sim-btn.analytical {
    background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
}

.sim-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.sim-btn.ngspice {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

/* View Toggle */
.view-toggle-sm {
    display: flex;
    gap: 2px;
    background: rgba(20, 20, 30, 0.5);
    border-radius: 4px;
    padding: 2px;
}

.toggle-sm {
    background: transparent;
    border: 1px solid rgba(177, 138, 234, 0.3);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
}

.toggle-sm.active {
    background: rgba(177, 138, 234, 0.2);
    border-color: #b18aea;
    color: #b18aea;
}

/* Periods Selector */
.periods-selector {
    display: flex;
    align-items: center;
    gap: 4px;
}

.periods-label {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
}

.periods-select {
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(177, 138, 234, 0.3);
    border-radius: 4px;
    color: white;
    padding: 2px 4px;
    font-size: 0.7rem;
}

/* Waveform Grid */
.waveforms-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.op-label {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 4px;
}

.waveform-item {
    background: rgba(20, 20, 30, 0.5);
    border-radius: 4px;
    padding: 4px;
}

/* Empty State */
.empty-state-compact {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 30px;
    height: 100%;
}

.empty-icon {
    font-size: 2rem;
    color: rgba(177, 138, 234, 0.3);
    margin-bottom: 10px;
}

.empty-text {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    text-align: center;
    margin: 0;
}

/* Output Selector */
.output-select {
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(177, 138, 234, 0.3);
    border-radius: 4px;
    color: white;
    padding: 1px 4px;
    font-size: 0.7rem;
    cursor: pointer;
}

/* Compact Action Buttons */
.action-btns {
    display: flex;
    gap: 8px;
}

.action-btn-sm {
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
}

.action-btn-sm.primary {
    background: linear-gradient(135deg, #b18aea 0%, #8b5cf6 100%);
    color: white;
}

.action-btn-sm.secondary {
    background: rgba(177, 138, 234, 0.15);
    border: 1px solid rgba(177, 138, 234, 0.3);
    color: #b18aea;
}

.action-btn-sm:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* Error text */
.error-text {
    font-size: 0.75rem;
    color: #ef4444;
}

.error-text-full {
    padding: 20px;
    text-align: center;
    color: #ef4444;
    font-size: 0.9rem;
}
</style>
