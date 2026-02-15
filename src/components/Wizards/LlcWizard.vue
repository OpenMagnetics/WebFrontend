<script setup>
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import DimensionReadOnly from '/WebSharedComponents/DataInput/DimensionReadOnly.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { minimumMaximumScalePerParameter, defaultDesignRequirements } from '/WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
</script>

<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: 'LlcWizard',
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        const localData = {
            inputVoltage: { nominal: 400, tolerance: 0.1 },
            bridgeType: 'Full Bridge',  // Full bridge gives k=1.0, so Vi_min = 360V > Vo = 200V (with n=4.17)
            outputVoltage: 48,
            outputPower: 500,
            minSwitchingFrequency: 80000,
            maxSwitchingFrequency: 120000,
            resonantFrequency: 100000,
            qualityFactor: 0.4,
            inductanceRatio: 5,
            integratedResonantInductor: true,
            magnetizingInductance: 825e-6,
            turnsRatio: 8.33,
            ambientTemperature: 25,
            efficiency: 0.97,
            insulationType: 'Basic',
            designMode: designLevelOptions[0],  // Default to "Help me with the design"
        };
        const insulationTypes = ['No', 'Basic', 'Reinforced'];
        return {
            masStore,
            taskQueueStore,
            designLevelOptions,
            localData,
            insulationTypes,
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
            numberOfSteadyStatePeriods: 1,
            waveformViewMode: 'magnetic',
            forceWaveformUpdate: 0,
        }
    },
    computed: {
        wizardSubtitle() {
            return "Resonant DC-DC Converter";
        },
    },
    watch: {
        waveformViewMode() {
            this.$nextTick(() => {
                this.forceWaveformUpdate += 1;
            });
        },
    },
    methods: {
        updateErrorMessage() { this.errorMessage = ""; },
        
        getTimeAxisOptions() {
            return {
                label: 'Time',
                colorLabel: '#d4d4d4',
                type: 'value',
                unit: 's',
            };
        },
        
        async process() {
            this.masStore.resetMas("power");
            try {
                // Build the auxiliary object based on design mode
                const aux = {
                    inputVoltage: this.localData.inputVoltage,
                    bridgeType: this.localData.bridgeType || 'Half Bridge',
                    minSwitchingFrequency: this.localData.minSwitchingFrequency,
                    maxSwitchingFrequency: this.localData.maxSwitchingFrequency,
                    resonantFrequency: this.localData.resonantFrequency,
                    qualityFactor: this.localData.qualityFactor,
                    inductanceRatio: this.localData.inductanceRatio,
                    integratedResonantInductor: this.localData.integratedResonantInductor,
                    operatingPoints: [{
                        outputVoltages: [this.localData.outputVoltage],
                        outputCurrents: [this.localData.outputPower / this.localData.outputVoltage],
                        switchingFrequency: this.localData.resonantFrequency,
                        ambientTemperature: this.localData.ambientTemperature,
                    }]
                };

                // Only include desired values in "I know the design I want" mode
                // In "Help me with the design" mode, the base Llc class will auto-calculate them
                if (this.localData.designMode === 'I know the design I want') {
                    aux.desiredInductance = this.localData.magnetizingInductance;
                    aux.desiredTurnsRatios = [this.localData.turnsRatio];
                }
                
                // If we have simulated operating points from simulation, use them
                if (this.simulatedOperatingPoints && this.simulatedOperatingPoints.length > 0) {
                    for (const op of this.simulatedOperatingPoints) {
                        if (op.excitationsPerWinding) {
                            for (const excitation of op.excitationsPerWinding) {
                                const frequency = excitation.frequency;
                                if (excitation.current && excitation.current.waveform) {
                                    try {
                                        if (!excitation.current.harmonics || excitation.current.harmonics.amplitudes?.length === 0) {
                                            excitation.current.harmonics = await this.taskQueueStore.calculateHarmonics(excitation.current.waveform, frequency);
                                            const currentThreshold = 0.1;
                                            const mainIndexes = await this.taskQueueStore.getMainHarmonicIndexes(excitation.current.harmonics, currentThreshold, 1);
                                            const prunedHarmonics = {
                                                amplitudes: [excitation.current.harmonics.amplitudes[0]],
                                                frequencies: [excitation.current.harmonics.frequencies[0]]
                                            };
                                            for (let i = 0; i < mainIndexes.length; i++) {
                                                prunedHarmonics.amplitudes.push(excitation.current.harmonics.amplitudes[mainIndexes[i]]);
                                                prunedHarmonics.frequencies.push(excitation.current.harmonics.frequencies[mainIndexes[i]]);
                                            }
                                            excitation.current.harmonics = prunedHarmonics;
                                        }
                                        if (!excitation.current.processed || !excitation.current.processed.rms) {
                                            const processed = await this.taskQueueStore.calculateProcessed(excitation.current.harmonics, excitation.current.waveform);
                                            excitation.current.processed = { ...processed, label: "Custom" };
                                        }
                                    } catch (e) {
                                        console.error("Error calculating current harmonics/processed:", e);
                                        excitation.current.harmonics = { amplitudes: [0], frequencies: [frequency] };
                                        excitation.current.processed = { label: "Custom", dutyCycle: 0.5, peakToPeak: 0, offset: 0, rms: 0 };
                                    }
                                }
                                if (excitation.voltage && excitation.voltage.waveform) {
                                    try {
                                        if (!excitation.voltage.harmonics || excitation.voltage.harmonics.amplitudes?.length === 0) {
                                            excitation.voltage.harmonics = await this.taskQueueStore.calculateHarmonics(excitation.voltage.waveform, frequency);
                                            const voltageThreshold = 0.3;
                                            const mainIndexes = await this.taskQueueStore.getMainHarmonicIndexes(excitation.voltage.harmonics, voltageThreshold, 1);
                                            const prunedHarmonics = {
                                                amplitudes: [excitation.voltage.harmonics.amplitudes[0]],
                                                frequencies: [excitation.voltage.harmonics.frequencies[0]]
                                            };
                                            for (let i = 0; i < mainIndexes.length; i++) {
                                                prunedHarmonics.amplitudes.push(excitation.voltage.harmonics.amplitudes[mainIndexes[i]]);
                                                prunedHarmonics.frequencies.push(excitation.voltage.harmonics.frequencies[mainIndexes[i]]);
                                            }
                                            excitation.voltage.harmonics = prunedHarmonics;
                                        }
                                        if (!excitation.voltage.processed || !excitation.voltage.processed.rms) {
                                            const processed = await this.taskQueueStore.calculateProcessed(excitation.voltage.harmonics, excitation.voltage.waveform);
                                            excitation.voltage.processed = { ...processed, label: "Custom" };
                                        }
                                    } catch (e) {
                                        console.error("Error calculating voltage harmonics/processed:", e);
                                        excitation.voltage.harmonics = { amplitudes: [0], frequencies: [frequency] };
                                        excitation.voltage.processed = { label: "Custom", dutyCycle: 0.5, peakToPeak: 0, offset: 0, rms: 0 };
                                    }
                                }
                            }
                        }
                    }
                    
                    // Use the simulated operating points directly
                    // Extract single period for masStore (magnetic design only needs one period)
                    console.log('DEBUG: Before extraction, simulatedOperatingPoints excitations:', this.simulatedOperatingPoints[0]?.excitationsPerWinding?.length || 0);
                    const singlePeriodOps = this.extractSinglePeriodFromOperatingPoints(this.simulatedOperatingPoints);
                    console.log('DEBUG: After extraction, singlePeriodOps excitations:', singlePeriodOps[0]?.excitationsPerWinding?.length || 0);
                    const result = {
                        masInputs: {
                            designRequirements: this.designRequirements,
                            operatingPoints: singlePeriodOps
                        }
                    };
                    // Direct assignment like Flyback wizard does
                    this.masStore.mas.inputs = result.masInputs;
                    console.log('DEBUG: Assigned to masStore.inputs.operatingPoints[0].excitationsPerWinding:', this.masStore.mas.inputs.operatingPoints[0]?.excitationsPerWinding?.length || 0);
                    
                    // Set up functionalDescription for all windings (like Flyback does)
                    this.masStore.mas.magnetic.coil.functionalDescription = []
                    this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding.forEach((elem, index) => {
                        this.masStore.mas.magnetic.coil.functionalDescription.push({
                                "name": elem.name,
                                "numberTurns": 0,
                                "numberParallels": 0,
                                "isolationSide": this.masStore.mas.inputs.designRequirements?.isolationSides?.[index] || 'primary',
                                "wire": ""
                            });
                    })
                    
                    // Set up insulation and other required design requirements
                    if (this.localData.insulationType != 'No') {
                        this.masStore.mas.inputs.designRequirements.insulation = defaultDesignRequirements.insulation;
                        this.masStore.mas.inputs.designRequirements.insulation.insulationType = this.localData.insulationType;
                    }
                    this.masStore.mas.inputs.designRequirements.topology = 'LLC Converter';
                    this.masStore.mas.inputs.designRequirements.market = 'Industrial';
                    this.masStore.mas.inputs.designRequirements.isolationSides = ['primary', 'secondary'];
                } else {
                    // Use analytical calculation (automatically called when no waveforms loaded)
                    const result = await this.taskQueueStore.calculateLlcInputs(aux);
                    
                    if (result.error) {
                        this.errorMessage = result.error;
                        return false;
                    }
                    
                    // Validate waveforms for NaN/Inf values
                    let hasInvalidData = false;
                    if (result.magneticWaveforms) {
                        for (const wf of result.magneticWaveforms) {
                            if (wf.waveforms) {
                                for (const w of wf.waveforms) {
                                    if (w.y) {
                                        for (let i = 0; i < w.y.length; i++) {
                                            if (!Number.isFinite(w.y[i])) {
                                                hasInvalidData = true;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    if (hasInvalidData) {
                        this.errorMessage = "Waveform calculation produced invalid values (NaN/Inf). This is a known issue with the LLC mathematical model for certain parameter combinations. Try adjusting the switching frequency or quality factor.";
                        return false;
                    }
                    
                    // Backend (libMKF) already calculates harmonics and processed data via complete_excitation()
                    // No need to recalculate them here
                    
                    // Extract single period for masStore (magnetic design only needs one period)
                    const singlePeriodOps = this.extractSinglePeriodFromOperatingPoints(result.operatingPoints);
                    console.log('DEBUG: Assigning to masStore, excitations count:', singlePeriodOps[0]?.excitationsPerWinding?.length || 0);
                    if (singlePeriodOps[0]?.excitationsPerWinding) {
                        singlePeriodOps[0].excitationsPerWinding.forEach((exc, i) => {
                            console.log('DEBUG: Excitation', i, 'name:', exc.name, 'current:', !!exc.current, 'voltage:', !!exc.voltage);
                        });
                    }
                    this.masStore.mas.inputs = {
                        designRequirements: result.designRequirements,
                        operatingPoints: singlePeriodOps
                    };
                    this.designRequirements = result.designRequirements;
                    this.simulatedTurnsRatios = result.simulatedTurnsRatios;
                    
                    // Set up functionalDescription for all windings (like Flyback does)
                    this.masStore.mas.magnetic.coil.functionalDescription = []
                    this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding.forEach((elem, index) => {
                        this.masStore.mas.magnetic.coil.functionalDescription.push({
                                "name": elem.name,
                                "numberTurns": 0,
                                "numberParallels": 0,
                                "isolationSide": this.masStore.mas.inputs.designRequirements?.isolationSides?.[index] || 'primary',
                                "wire": ""
                            });
                    })
                    
                    // Set up insulation and other required design requirements
                    if (this.localData.insulationType != 'No') {
                        this.masStore.mas.inputs.designRequirements.insulation = defaultDesignRequirements.insulation;
                        this.masStore.mas.inputs.designRequirements.insulation.insulationType = this.localData.insulationType;
                    }
                    this.masStore.mas.inputs.designRequirements.topology = 'LLC Converter';
                    this.masStore.mas.inputs.designRequirements.market = 'Industrial';
                    this.masStore.mas.inputs.designRequirements.isolationSides = ['primary', 'secondary'];
                }
                return true;
            } catch (error) {
                this.errorMessage = error.message || "Failed to process LLC inputs";
                return false;
            }
        },

        async processAndReview() {
            const success = await this.process();
            if (!success) {
                setTimeout(() => {this.errorMessage = ""}, 5000);
                return;
            }
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
            if (!success) {
                setTimeout(() => {this.errorMessage = ""}, 5000);
                return;
            }
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

        async getAnalyticalWaveforms() {
            this.waveformSource = 'analytical';
            this.simulatingWaveforms = true;
            this.waveformError = "";
            this.magneticWaveforms = [];
            this.converterWaveforms = [];
            
            try {
                const aux = {
                    inputVoltage: this.localData.inputVoltage,
                    bridgeType: this.localData.bridgeType || 'Half Bridge',
                    minSwitchingFrequency: this.localData.minSwitchingFrequency,
                    maxSwitchingFrequency: this.localData.maxSwitchingFrequency,
                    resonantFrequency: this.localData.resonantFrequency,
                    qualityFactor: this.localData.qualityFactor,
                    inductanceRatio: this.localData.inductanceRatio,
                    integratedResonantInductor: this.localData.integratedResonantInductor,
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
                const result = await this.taskQueueStore.calculateLlcInputs(aux);
                console.log('ANALYTICAL RESULT:', result);
                console.log('magneticWaveforms:', result.magneticWaveforms);
                if (result.error) {
                    this.waveformError = result.error;
                } else {
                    // Validate waveforms for NaN/Inf values
                    let hasInvalidData = false;
                    if (result.magneticWaveforms) {
                        for (const wf of result.magneticWaveforms) {
                            if (wf.waveforms) {
                                for (const w of wf.waveforms) {
                                    if (w.y) {
                                        for (let i = 0; i < w.y.length; i++) {
                                            if (!Number.isFinite(w.y[i])) {
                                                hasInvalidData = true;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    if (hasInvalidData) {
                        this.waveformError = "Waveform calculation produced invalid values (NaN/Inf). This is a known issue with the LLC mathematical model for certain parameter combinations. Try adjusting the switching frequency or quality factor.";
                    } else {
                        this.designRequirements = result.designRequirements;
                        this.simulatedMagnetizingInductance = result.computedResonantInductance || this.localData.magnetizingInductance;
                        this.simulatedTurnsRatios = result.designRequirements?.turnsRatios?.map(tr => tr.nominal) || [this.localData.turnsRatio];
                        this.simulatedOperatingPoints = result.operatingPoints || [];
                        
                        // Process waveforms - build from operating points if magneticWaveforms not present
                        let rawWaveforms = result.magneticWaveforms || [];
                        if (rawWaveforms.length === 0 && this.simulatedOperatingPoints.length > 0) {
                            // Build from operating points (like Flyback)
                            rawWaveforms = this.buildMagneticWaveformsFromInputs(this.simulatedOperatingPoints);
                        }
                        
                        // Repeat waveforms for the requested number of periods
                        rawWaveforms = this.repeatWaveformsForPeriods(rawWaveforms);
                        
                        const processedWaveforms = rawWaveforms.map(wf => ({
                            ...wf,
                            waveforms: (wf.waveforms || []).filter(w => 
                                w && w.x && w.y && Array.isArray(w.x) && Array.isArray(w.y) && w.x.length > 0 && w.y.length > 0
                            ).map(w => ({
                                label: w.label || 'Unknown',
                                x: w.x,
                                y: w.y,
                                colorLabel: w.color || '#b18aea',
                                type: 'value',
                                position: 'left',
                                unit: w.unit || 'A',
                                numberDecimals: 3
                            }))
                        })).filter(wf => wf.waveforms.length > 0);
                        
                        this.magneticWaveforms = processedWaveforms;
                        
                        // For analytical waveforms, converter waveforms are not available
                        this.converterWaveforms = [];
                        
                        this.$nextTick(() => {
                            this.forceWaveformUpdate += 1;
                        });
                    }
                }
            } catch (error) {
                this.waveformError = error.message || "Failed to get analytical waveforms";
            }
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
                    bridgeType: this.localData.bridgeType || 'Half Bridge',
                    minSwitchingFrequency: this.localData.minSwitchingFrequency,
                    maxSwitchingFrequency: this.localData.maxSwitchingFrequency,
                    resonantFrequency: this.localData.resonantFrequency,
                    qualityFactor: this.localData.qualityFactor,
                    inductanceRatio: this.localData.inductanceRatio,
                    integratedResonantInductor: this.localData.integratedResonantInductor,
                    magnetizingInductance: this.localData.magnetizingInductance,
                    turnsRatio: this.localData.turnsRatio,
                    operatingPoints: [{
                        outputVoltages: [this.localData.outputVoltage],
                        outputCurrents: [this.localData.outputPower / this.localData.outputVoltage],
                        switchingFrequency: this.localData.resonantFrequency,
                        ambientTemperature: this.localData.ambientTemperature,
                    }],
                    numberOfPeriods: parseInt(this.numberOfPeriods, 10),
                    numberOfSteadyStatePeriods: parseInt(this.numberOfSteadyStatePeriods, 10)
                };

                const result = await this.taskQueueStore.simulateLlcIdealWaveforms(aux);

                console.log('SIMULATED RESULT:', result);
                console.log('Result keys:', Object.keys(result));
                console.log('magneticWaveforms:', result.magneticWaveforms);
                console.log('converterWaveforms:', result.converterWaveforms);
                console.log('inputs:', result.inputs);

                if (result.error) {
                    throw new Error(result.error);
                }

                // Use magneticWaveforms directly from result (now returned by backend)
                if (result.magneticWaveforms && result.magneticWaveforms.length > 0) {
                    console.log('Using magneticWaveforms from result, count:', result.magneticWaveforms.length);
                    console.log('First OP waveforms:', result.magneticWaveforms[0]?.waveforms?.length);
                    this.magneticWaveforms = result.magneticWaveforms;
                } else {
                    console.error('No magneticWaveforms returned from simulation');
                    console.error('Full result:', JSON.stringify(result, null, 2));
                    throw new Error("Simulation did not return magnetic waveform data. Please check the input parameters and try again.");
                }

                this.simulatedOperatingPoints = result.inputs?.operatingPoints || [];
                this.designRequirements = result.inputs?.designRequirements || null;

                // Process converter waveforms if available
                if (result.converterWaveforms && result.converterWaveforms.length > 0) {
                    console.log('Using converterWaveforms from result');
                    this.converterWaveforms = this.convertConverterWaveforms(result.converterWaveforms);
                } else {
                    this.converterWaveforms = [];
                }
                
                // Check if any waveforms were generated
                const totalWaveforms = this.magneticWaveforms.reduce((sum, op) => sum + (op.waveforms?.length || 0), 0) +
                                      this.converterWaveforms.reduce((sum, op) => sum + (op.waveforms?.length || 0), 0);
                
                if (totalWaveforms === 0) {
                    this.waveformError = "No waveforms were generated. The simulation may have failed or returned empty data.";
                }
                
                this.$nextTick(() => {
                    this.forceWaveformUpdate += 1;
                });
                
            } catch (error) {
                console.error("Error simulating waveforms:", error);
                this.waveformError = error.message || "Failed to simulate waveforms";
            }
            
            this.simulatingWaveforms = false;
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

        getMagnetizingInductanceDisplay() {
            if (this.simulatedMagnetizingInductance != null) {
                return (this.simulatedMagnetizingInductance * 1e6).toFixed(1) + 'µH';
            }
            if (this.designRequirements?.magnetizingInductance?.nominal != null) {
                return (this.designRequirements.magnetizingInductance.nominal * 1e6).toFixed(1) + 'µH';
            }
            return 'N/A';
        },

        getTurnsRatioDisplay() {
            let turnsRatios = null;
            
            if (this.simulatedTurnsRatios && this.simulatedTurnsRatios.length > 0) {
                turnsRatios = this.simulatedTurnsRatios;
            } else if (this.designRequirements?.turnsRatios?.length > 0) {
                turnsRatios = this.designRequirements.turnsRatios.map(tr => tr.nominal);
            }
            
            if (!turnsRatios || turnsRatios.length === 0) {
                return 'N/A';
            }
            
            const parts = ['1'];
            for (const n of turnsRatios) {
                const invN = 1 / n;
                if (Math.abs(invN - Math.round(invN)) < 0.01) {
                    parts.push(Math.round(invN).toString());
                } else {
                    parts.push((1/n).toFixed(2));
                }
            }
            return parts.join(' : ');
        },

        // Helper to resolve dimension value (nominal/min/max) to a scalar
        resolveDimensionValue(dimObj) {
            if (!dimObj) return null;
            if (dimObj.nominal !== undefined && dimObj.nominal !== null) return dimObj.nominal;
            if (dimObj.minimum !== undefined && dimObj.minimum !== null) return dimObj.minimum;
            if (dimObj.maximum !== undefined && dimObj.maximum !== null) return dimObj.maximum;
            return null;
        },

        // Returns the computed magnetizing inductance value from designRequirements (in H)
        getComputedMagnetizingInductance() {
            if (!this.designRequirements?.magnetizingInductance) return null;
            return this.resolveDimensionValue(this.designRequirements.magnetizingInductance);
        },

        // Returns the computed turns ratio value from designRequirements
        getComputedTurnsRatio() {
            if (!this.designRequirements?.turnsRatios?.length) return null;
            const tr = this.designRequirements.turnsRatios[0];
            return this.resolveDimensionValue(tr);
        },

        // Check if computed tank values are available
        hasComputedTankValues() {
            return this.designRequirements != null;
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

        getWaveformsList(waveforms, operatingPointIndex) {
            if (!waveforms || !waveforms[operatingPointIndex] || !waveforms[operatingPointIndex].waveforms) {
                return [];
            }
            return waveforms[operatingPointIndex].waveforms;
        },

        // Extract single period from operating points (for masStore - magnetic design only needs one period)
        extractSinglePeriodFromOperatingPoints(operatingPoints) {
            if (!operatingPoints || operatingPoints.length === 0) return operatingPoints;
            
            console.log('DEBUG extractSinglePeriod: Processing', operatingPoints.length, 'operating points');
            
            return operatingPoints.map((op, opIdx) => {
                console.log('DEBUG extractSinglePeriod: OP', opIdx, 'has', op.excitationsPerWinding?.length || 0, 'excitations');
                
                if (!op.excitationsPerWinding || op.excitationsPerWinding.length === 0) return op;
                
                const newExcitations = op.excitationsPerWinding.map((exc, excIdx) => {
                    console.log('DEBUG extractSinglePeriod: Processing excitation', excIdx, 'name:', exc.name);
                    // Check if waveform data exists
                    const hasCurrentWaveform = exc.current?.waveform?.time && exc.current?.waveform?.data;
                    const hasVoltageWaveform = exc.voltage?.waveform?.time && exc.voltage?.waveform?.data;
                    console.log('DEBUG extractSinglePeriod:', exc.name, '- Has current:', !!hasCurrentWaveform, 'Has voltage:', !!hasVoltageWaveform);
                    
                    // Debug: Log the actual keys in the excitation object
                    console.log('DEBUG extractSinglePeriod:', exc.name, 'keys:', Object.keys(exc));
                    if (exc.current) {
                        console.log('DEBUG extractSinglePeriod:', exc.name, 'current keys:', Object.keys(exc.current));
                        if (exc.current.waveform) {
                            console.log('DEBUG extractSinglePeriod:', exc.name, 'current.waveform keys:', Object.keys(exc.current.waveform));
                        }
                    }
                    if (exc.voltage) {
                        console.log('DEBUG extractSinglePeriod:', exc.name, 'voltage keys:', Object.keys(exc.voltage));
                        if (exc.voltage.waveform) {
                            console.log('DEBUG extractSinglePeriod:', exc.name, 'voltage.waveform keys:', Object.keys(exc.voltage.waveform));
                        }
                    }
                    
                    if (hasCurrentWaveform) {
                        console.log('DEBUG extractSinglePeriod: Current time length:', exc.current.waveform.time.length, 'data length:', exc.current.waveform.data.length);
                    }
                    if (hasVoltageWaveform) {
                        console.log('DEBUG extractSinglePeriod: Voltage time length:', exc.voltage.waveform.time.length, 'data length:', exc.voltage.waveform.data.length);
                    }
                    const newExc = { ...exc };
                    
                    // Process current waveform - data is in exc.current.waveform.time and .data
                    if (exc.current?.waveform?.time && exc.current?.waveform?.data) {
                        const time = exc.current.waveform.time;
                        const data = exc.current.waveform.data;
                        console.log('DEBUG extractSinglePeriod: Current waveform time length:', time?.length, 'data length:', data?.length);
                        if (time && time.length > 0 && data && data.length > 0) {
                            const singlePeriod = this.extractSinglePeriod(time, data);
                            console.log('DEBUG extractSinglePeriod: Extracted', singlePeriod.time.length, 'points for current');
                            newExc.current = {
                                ...exc.current,
                                waveform: {
                                    ...exc.current.waveform,
                                    time: singlePeriod.time,
                                    data: singlePeriod.data
                                }
                            };
                        }
                    }
                    
                    // Process voltage waveform - data is in exc.voltage.waveform.time and .data
                    if (exc.voltage?.waveform?.time && exc.voltage?.waveform?.data) {
                        const time = exc.voltage.waveform.time;
                        const data = exc.voltage.waveform.data;
                        console.log('DEBUG extractSinglePeriod: Voltage waveform time length:', time?.length, 'data length:', data?.length);
                        if (time && time.length > 0 && data && data.length > 0) {
                            const singlePeriod = this.extractSinglePeriod(time, data);
                            console.log('DEBUG extractSinglePeriod: Extracted', singlePeriod.time.length, 'points for voltage');
                            newExc.voltage = {
                                ...exc.voltage,
                                waveform: {
                                    ...exc.voltage.waveform,
                                    time: singlePeriod.time,
                                    data: singlePeriod.data
                                }
                            };
                        }
                    }
                    
                    return newExc;
                });
                
                return { ...op, excitationsPerWinding: newExcitations };
            });
        },
        
        extractSinglePeriod(time, data) {
            if (!time || !data || time.length === 0) return { time, data };
            if (time.length < 2) return { time, data };
            
            const totalDuration = time[time.length - 1] - time[0];
            const numPoints = time.length;
            const dt = totalDuration / (numPoints - 1);
            
            // Get expected period duration from switching frequency
            // The frequency is stored in the excitation, but we can estimate from data
            const expectedPeriod = this.localData.resonantFrequency > 0 
                ? 1 / this.localData.resonantFrequency 
                : totalDuration / 2; // fallback
            
            // Calculate how many periods we likely have
            const numPeriodsInData = Math.round(totalDuration / expectedPeriod);
            
            console.log('DEBUG extractSinglePeriod: Total duration:', totalDuration, 'expectedPeriod:', expectedPeriod, 'numPeriodsInData:', numPeriodsInData);
            
            if (numPeriodsInData <= 1) {
                // Already single period
                console.log('DEBUG extractSinglePeriod: Data is already single period');
                return { time, data };
            }
            
            // Extract first period
            const periodDuration = totalDuration / numPeriodsInData;
            let endIndex = Math.floor(numPoints / numPeriodsInData);
            
            // Adjust to find exact boundary
            for (let i = Math.floor(endIndex * 0.9); i < Math.min(numPoints, Math.floor(endIndex * 1.1)); i++) {
                if (time[i] - time[0] >= periodDuration - dt) {
                    endIndex = i + 1;
                    break;
                }
            }
            
            console.log('DEBUG extractSinglePeriod: Extracting first period (1 of', numPeriodsInData, ') from 0 to', endIndex, 'of', numPoints);
            
            return {
                time: time.slice(0, endIndex),
                data: data.slice(0, endIndex)
            };
        },

        getSingleWaveformDataForVisualizer(waveforms, operatingPointIndex, waveformIndex) {
            if (!waveforms || !waveforms[operatingPointIndex] || !waveforms[operatingPointIndex].waveforms) {
                return [];
            }
            
            const wf = waveforms[operatingPointIndex].waveforms[waveformIndex];
            if (!wf) return [];
            
            let yData = wf.y;
            const isVoltageWaveform = wf.unit === 'V';
            const isCurrentWaveform = wf.unit === 'A';
            
            if (isVoltageWaveform && yData && yData.length > 0) {
                const sorted = [...yData].sort((a, b) => a - b);
                const p5 = sorted[Math.floor(sorted.length * 0.05)];
                const p95 = sorted[Math.floor(sorted.length * 0.95)];
                const range = p95 - p5;
                const margin = range * 0.1;
                const clipMin = p5 - margin;
                const clipMax = p95 + margin;
                yData = yData.map(v => Math.max(clipMin, Math.min(clipMax, v)));
            }
            
            let waveformColor = '#ffffff';
            if (isVoltageWaveform) {
                waveformColor = this.$styleStore.operatingPoints?.voltageGraph?.color || '#b18aea';
            } else if (isCurrentWaveform) {
                waveformColor = this.$styleStore.operatingPoints?.currentGraph?.color || '#4CAF50';
            }
            
            return [{
                label: wf.label,
                data: { x: wf.x, y: yData },
                colorLabel: waveformColor,
                type: 'value',
                position: 'left',
                unit: wf.unit,
                numberDecimals: 6,
            }];
        },

        getPairedWaveformsList(waveforms, operatingPointIndex) {
            if (!waveforms || !waveforms[operatingPointIndex] || !waveforms[operatingPointIndex].waveforms) {
                return [];
            }
            const allWaveforms = waveforms[operatingPointIndex].waveforms;
            const pairs = [];
            const usedIndices = new Set();
            
            allWaveforms.forEach((wf, idx) => {
                if (usedIndices.has(idx)) return;
                
                const isVoltage = wf.unit === 'V';
                const isCurrent = wf.unit === 'A';
                
                if (isVoltage) {
                    const baseName = wf.label.replace(/voltage/i, '').replace(/V$/i, '').trim();
                    const currentIdx = allWaveforms.findIndex((cWf, cIdx) => {
                        if (cIdx === idx || usedIndices.has(cIdx)) return false;
                        if (cWf.unit !== 'A') return false;
                        const currentBaseName = cWf.label.replace(/current/i, '').replace(/I$/i, '').trim();
                        return baseName.toLowerCase() === currentBaseName.toLowerCase() || 
                               wf.label.toLowerCase().includes(cWf.label.toLowerCase().replace('current', '').trim()) ||
                               cWf.label.toLowerCase().includes(wf.label.toLowerCase().replace('voltage', '').trim());
                    });
                    
                    if (currentIdx !== -1) {
                        pairs.push({ voltage: { wf, idx }, current: { wf: allWaveforms[currentIdx], idx: currentIdx } });
                        usedIndices.add(idx);
                        usedIndices.add(currentIdx);
                    } else {
                        pairs.push({ voltage: { wf, idx }, current: null });
                        usedIndices.add(idx);
                    }
                }
            });
            
            allWaveforms.forEach((wf, idx) => {
                if (usedIndices.has(idx)) return;
                if (wf.unit === 'A') {
                    pairs.push({ voltage: null, current: { wf, idx } });
                    usedIndices.add(idx);
                }
            });
            
            return pairs;
        },

        getPairedWaveformDataForVisualizer(waveforms, operatingPointIndex, pairIndex) {
            const pairs = this.getPairedWaveformsList(waveforms, operatingPointIndex);
            if (!pairs[pairIndex]) return [];
            
            const pair = pairs[pairIndex];
            const result = [];
            
            if (pair.voltage) {
                const vWf = pair.voltage.wf;
                let yData = vWf.y;
                
                if (yData && yData.length > 0) {
                    const sorted = [...yData].sort((a, b) => a - b);
                    const p5 = sorted[Math.floor(sorted.length * 0.05)];
                    const p95 = sorted[Math.floor(sorted.length * 0.95)];
                    const range = p95 - p5;
                    const margin = range * 0.1;
                    yData = yData.map(v => Math.max(p5 - margin, Math.min(p95 + margin, v)));
                }
                
                result.push({
                    label: vWf.label,
                    data: { x: vWf.x, y: yData },
                    colorLabel: this.$styleStore.operatingPoints?.voltageGraph?.color || '#b18aea',
                    type: 'value',
                    position: 'left',
                    unit: 'V',
                    numberDecimals: 6,
                });
            }
            
            if (pair.current) {
                const iWf = pair.current.wf;
                result.push({
                    label: iWf.label,
                    data: { x: iWf.x, y: iWf.y },
                    colorLabel: this.$styleStore.operatingPoints?.currentGraph?.color || '#4CAF50',
                    type: 'value',
                    position: 'right',
                    unit: 'A',
                    numberDecimals: 6,
                });
            }
            
            return result;
        },

        getPairedWaveformAxisLimits(waveforms, operatingPointIndex, pairIndex) {
            const pairs = this.getPairedWaveformsList(waveforms, operatingPointIndex);
            if (!pairs[pairIndex]) return { min: [], max: [] };
            
            const pair = pairs[pairIndex];
            const min = [];
            const max = [];
            
            if (pair.voltage) {
                const vWf = pair.voltage.wf;
                let yData = vWf.y;
                if (yData && yData.length > 0) {
                    const sorted = [...yData].sort((a, b) => a - b);
                    const p5 = sorted[Math.floor(sorted.length * 0.05)];
                    const p95 = sorted[Math.floor(sorted.length * 0.95)];
                    const range = p95 - p5;
                    const margin = range * 0.1;
                    min.push(p5 - margin);
                    max.push(p95 + margin);
                } else {
                    min.push(null);
                    max.push(null);
                }
            }
            
            if (pair.current) {
                const iWf = pair.current.wf;
                let yData = iWf.y;
                if (yData && yData.length > 0) {
                    const sorted = [...yData].sort((a, b) => a - b);
                    const p5 = sorted[Math.floor(sorted.length * 0.05)];
                    const p95 = sorted[Math.floor(sorted.length * 0.95)];
                    const range = p95 - p5;
                    const margin = range * 0.1;
                    min.push(p5 - margin);
                    max.push(p95 + margin);
                } else {
                    min.push(null);
                    max.push(null);
                }
            }
            
            return { min, max };
        },

        getPairedWaveformTitle(waveforms, operatingPointIndex, pairIndex) {
            const pairs = this.getPairedWaveformsList(waveforms, operatingPointIndex);
            if (!pairs[pairIndex]) return '';
            
            const pair = pairs[pairIndex];
            if (pair.voltage && pair.current) {
                let vLabel = pair.voltage.wf.label;
                let baseName = vLabel
                    .replace(/\s*\(Switch [Nn]ode\)/gi, '')
                    .replace(/voltage/i, '')
                    .replace(/V$/i, '')
                    .trim();
                return baseName || 'V & I';
            } else if (pair.voltage) {
                return pair.voltage.wf.label.replace(/\s*\(Switch [Nn]ode\)/gi, '');
            } else if (pair.current) {
                return pair.current.wf.label;
            }
            return '';
        },

        getOperatingPointLabel(waveforms, operatingPointIndex) {
            if (!waveforms || !waveforms[operatingPointIndex]) return '';
            const op = waveforms[operatingPointIndex];
            return op.operatingPointName || `Operating Point ${operatingPointIndex + 1}`;
        },
    },
}

</script>

<template>
  <ConverterWizardBase
    title="LLC Wizard"
    titleIcon="fa-wave-square"
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
      <div class="compact-header"><i class="fa-solid fa-cogs me-1"></i>Tank</div>
    </template>

    <template #design-or-switch-parameters>
      <Dimension :name="'qualityFactor'" :replaceTitle="'Q Factor'" :unit="null" :min="0.1" :max="2" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'inductanceRatio'" :replaceTitle="'Ln Ratio'" :unit="null" :min="2" :max="20" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <!-- Only show turns ratio and magnetizing inductance inputs in "I know the design I want" mode -->
      <template v-if="localData.designMode === 'I know the design I want'">
        <Dimension :name="'turnsRatio'" :replaceTitle="'Turns'" :unit="null" :min="0.1" :max="100" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
        <Dimension :name="'magnetizingInductance'" :replaceTitle="'Mag. Inductance'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      </template>
      <!-- Show computed values using DimensionReadOnly (shows only when data available) -->
      <template v-else-if="hasComputedTankValues()">
        <DimensionReadOnly :name="'turnsRatio'" :replaceTitle="'Turns'" :unit="null" :value="getComputedTurnsRatio()" :numberDecimals="2" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="'transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
        <DimensionReadOnly :name="'magnetizingInductance'" :replaceTitle="'Mag. Inductance'" unit="H" :value="getComputedMagnetizingInductance()" :numberDecimals="6" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="'transparent'" :textColor="$styleStore.wizard.inputTextColor"/>
      </template>
      <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.integratedResonantInductor" id="integratedResonantInductor"><label class="form-check-label small" for="integratedResonantInductor" :style="{ color: $styleStore.wizard.inputTextColor }">Integrated Res L</label></div>
    </template>

    <template #conditions>
      <!-- Freq Range -->
      <Dimension :name="'minSwitchingFrequency'" :replaceTitle="'Min Freq'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'maxSwitchingFrequency'" :replaceTitle="'Max Freq'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'resonantFrequency'" :replaceTitle="'Res Freq'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'ambientTemperature'" :replaceTitle="'Temp'" unit=" C" :min="minimumMaximumScalePerParameter['temperature']['min']" :max="minimumMaximumScalePerParameter['temperature']['max']" :allowNegative="true" :allowZero="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <Dimension :name="'efficiency'" :replaceTitle="'Eff'" unit="%" :visualScale="100" :min="0.5" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <ElementFromList :name="'insulationType'" :replaceTitle="'Insul'" :options="insulationTypes" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
      <!-- Bridge Type -->
      <ElementFromList :name="'bridgeType'" :replaceTitle="'Bridge'" :options="['Half Bridge', 'Full Bridge']" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
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
