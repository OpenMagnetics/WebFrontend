<script setup>
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { combinedStyle, combinedClass, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromListRadio from '/WebSharedComponents/DataInput/ElementFromListRadio.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import PairOfDimensions from '/WebSharedComponents/DataInput/PairOfDimensions.vue'
import TripleOfDimensions from '/WebSharedComponents/DataInput/TripleOfDimensions.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { defaultFlybackWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from '/WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
</script>

<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: 'CmcWizard'},
        labelWidthProportionClass:{
            type: String,
            default: 'col-xs-12 col-md-9'
        },
        valueWidthProportionClass:{
            type: String,
            default: 'col-xs-12 col-md-3'
        }},
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        const mosfetOptions = ['Its maximum duty cycle', 'Its maximum drain-source voltage'];
        const insulationTypes = ['No', 'Basic', 'Reinforced'];
        const errorMessage = "";
        const localData = deepCopy(defaultFlybackWizardInputs);
        localData["mosfetInputType"] = mosfetOptions[0];
        return {
            masStore,
            taskQueueStore,
            designLevelOptions,
            mosfetOptions,
            insulationTypes,
            localData,
            errorMessage,
            simulatingWaveforms: false,
            waveformError: "",
            waveformSource: "", // 'simulation' or 'analytical'
            simulatedOperatingPoints: [],
            designRequirements: null,
            simulatedMagnetizingInductance: null,
            simulatedTurnsRatios: null,
            magneticWaveforms: [],
            converterWaveforms: [],
            waveformViewMode: 'magnetic', // 'magnetic' or 'converter'
            forceWaveformUpdate: 0,
            numberOfPeriods: 2,
            numberOfSteadyStatePeriods: 10}
    },
    computed: {
    },
    watch: {
        waveformViewMode() {
            // Trigger update when switching between magnetic/converter view
            this.$nextTick(() => {
                this.forceWaveformUpdate += 1;
            });
        }},
    methods: {
        updateErrorMessage() {
            this.errorMessage = "";
        },
        updateNumberOutputs(newNumber) {
            if (newNumber > this.localData.outputsParameters.length) {
                const diff = newNumber - this.localData.outputsParameters.length;
                for (let i = 0; i < diff; i++) {
                    var newOutput;
                    if (this.localData.outputsParameters.length == 0) {
                        newOutput = {
                            voltage: defaultFlybackWizardInputs.outputsParameters[0].voltage,
                            current: defaultFlybackWizardInputs.outputsParameters[0].current,
                            turnsRatio: defaultFlybackWizardInputs.outputsParameters[0].turnsRatio}
                    }
                    else {
                        newOutput = {
                            voltage: this.localData.outputsParameters[this.localData.outputsParameters.length - 1].voltage,
                            current: this.localData.outputsParameters[this.localData.outputsParameters.length - 1].current,
                            turnsRatio: this.localData.outputsParameters[this.localData.outputsParameters.length - 1].turnsRatio}
                    }

                    this.localData.outputsParameters.push(newOutput);
                }
            }
            else if (newNumber < this.localData.outputsParameters.length) {
                const diff = this.localData.outputsParameters.length - newNumber;
                this.localData.outputsParameters.splice(-diff, diff);
            }
            this.updateErrorMessage();
        },

        async process() {
            this.masStore.resetMas("power");

            try {
                const aux = {};
                aux['inputVoltage'] = this.localData.inputVoltage;
                aux['diodeVoltageDrop'] = this.localData.diodeVoltageDrop;
                aux['efficiency'] = this.localData.efficiency;
                if (this.localData.designLevel == 'I know the design I want') {
                    aux['desiredInductance'] = this.localData.inductance;
                    const auxDesiredDutyCycle = []
                    if (this.localData.inputVoltage.minimum != null) {
                        if (this.localData.dutyCycle.minimum != null) {
                            auxDesiredDutyCycle.push(this.localData.dutyCycle.minimum);   
                        }
                        else {
                            this.errorMessage = "Missing duty cycle for minimum voltage";
                            return;
                        }
                    }

                    if (this.localData.inputVoltage.nominal != null) {
                        if (this.localData.dutyCycle.nominal != null) {
                            auxDesiredDutyCycle.push(this.localData.dutyCycle.nominal);   
                        }
                        else {
                            this.errorMessage = "Missing duty cycle for nominal voltage";
                            return;
                        }
                    }
                    if (this.localData.inputVoltage.maximum != null) {
                        if (this.localData.dutyCycle.maximum != null) {
                            auxDesiredDutyCycle.push(this.localData.dutyCycle.maximum);   
                        }
                        else {
                            this.errorMessage = "Missing duty cycle for maximum voltage";
                            return;
                        }
                    }
                    aux['desiredDutyCycle'] = [auxDesiredDutyCycle];
                    aux['desiredDeadTime'] = [this.localData.deadTime];
                    aux['desiredTurnsRatios'] = [];
                }
                else {
                    if (this.localData.mosfetInputType == 'Its maximum duty cycle') {
                        aux['maximumDutyCycle'] = this.localData.maximumDutyCycle;
                    }
                    else {
                        aux['maximumDrainSourceVoltage'] = this.localData.maximumDrainSourceVoltage;
                    }
                    aux['currentRippleRatio'] = this.localData.currentRippleRatio;
                }

                const auxOperatingPoint = {};
                auxOperatingPoint['outputVoltages'] = [];
                auxOperatingPoint['outputCurrents'] = [];
                this.localData.outputsParameters.forEach((elem) => {
                    auxOperatingPoint['outputVoltages'].push(elem.voltage);
                    auxOperatingPoint['outputCurrents'].push(elem.current);
                    if (this.localData.designLevel == 'I know the design I want') {
                        aux['desiredTurnsRatios'].push(elem.turnsRatio);
                    }
                })
                auxOperatingPoint['switchingFrequency'] = this.localData.switchingFrequency;
                auxOperatingPoint['ambientTemperature'] = this.localData.ambientTemperature;
                aux['operatingPoints'] = [auxOperatingPoint];

                var inputs;
                if (this.localData.designLevel == 'I know the design I want') {
                    inputs = await this.taskQueueStore.calculateAdvancedFlybackInputs(aux);
                }
                else {
                    inputs = await this.taskQueueStore.calculateFlybackInputs(aux);
                }

                this.masStore.mas.inputs = inputs;

                // If we have simulated operating points (from Simulate button), use those waveforms
                // They contain more accurate waveform data from ngspice simulation
                if (this.simulatedOperatingPoints && this.simulatedOperatingPoints.length > 0) {
                    // Calculate harmonics and processed data from waveforms
                    // The backend requires these fields with actual calculated values
                    for (const op of this.simulatedOperatingPoints) {
                        if (op.excitationsPerWinding) {
                            for (const excitation of op.excitationsPerWinding) {
                                const frequency = excitation.frequency;
                                if (excitation.current && excitation.current.waveform) {
                                    try {
                                        // Calculate harmonics from waveform
                                        if (!excitation.current.harmonics || excitation.current.harmonics.amplitudes?.length === 0) {
                                            excitation.current.harmonics = await this.taskQueueStore.calculateHarmonics(excitation.current.waveform, frequency);
                                            // Prune harmonics to reduce number shown in Fourier graph
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
                                        // Calculate processed data from harmonics and waveform
                                        if (!excitation.current.processed || !excitation.current.processed.rms) {
                                            const processed = await this.taskQueueStore.calculateProcessed(excitation.current.harmonics, excitation.current.waveform);
                                            excitation.current.processed = {
                                                ...processed,
                                                label: "Custom"
                                            };
                                        }
                                    } catch (e) {
                                        console.error("Error calculating current harmonics/processed:", e);
                                        excitation.current.harmonics = { amplitudes: [0], frequencies: [frequency] };
                                        excitation.current.processed = { label: "Custom", dutyCycle: 0.5, peakToPeak: 0, offset: 0, rms: 0 };
                                    }
                                }
                                if (excitation.voltage && excitation.voltage.waveform) {
                                    try {
                                        // Calculate harmonics from waveform
                                        if (!excitation.voltage.harmonics || excitation.voltage.harmonics.amplitudes?.length === 0) {
                                            excitation.voltage.harmonics = await this.taskQueueStore.calculateHarmonics(excitation.voltage.waveform, frequency);
                                            // Prune harmonics to reduce number shown in Fourier graph
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
                                        // Calculate processed data from harmonics and waveform
                                        if (!excitation.voltage.processed || !excitation.voltage.processed.rms) {
                                            const processed = await this.taskQueueStore.calculateProcessed(excitation.voltage.harmonics, excitation.voltage.waveform);
                                            excitation.voltage.processed = {
                                                ...processed,
                                                label: "Custom"
                                            };
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
                    this.masStore.mas.inputs.operatingPoints = this.simulatedOperatingPoints;
                }

                if (this.localData.insulationType != 'No') {

                    this.masStore.mas.inputs.designRequirements.insulation = defaultDesignRequirements.insulation;
                    this.masStore.mas.inputs.designRequirements.insulation.insulationType = this.localData.insulationType;
                }

                this.masStore.mas.magnetic.coil.functionalDescription = []
                this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding.forEach((elem, index) => {
                    this.masStore.mas.magnetic.coil.functionalDescription.push({
                            "name": elem.name,
                            "numberTurns": 0,
                            "numberParallels": 0,
                            "isolationSide": this.masStore.mas.inputs.designRequirements.isolationSides[index],
                            "wire": ""
                        });
                })
                this.errorMessage = "";

            } catch (error) {
                console.error(error);
                this.errorMessage = error;
            }

        },
        async processAndReview() {
            await this.process();

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
            if (this.errorMessage == "") {
                await this.$nextTick();
                await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
            }
            else {
                setTimeout(() => {this.errorMessage = ""}, 5000);
            }
        },
        async processAndAdvise() {
            await this.process();
            this.$stateStore.resetMagneticTool();
            this.$stateStore.designLoaded();
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Power);
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            this.$stateStore.setCurrentToolSubsection("magneticBuilder");
            this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
            this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            this.$stateStore.operatingPoints.modePerPoint = [this.$stateStore.OperatingPointsMode.Manual];
            if (this.errorMessage == "") {
                await this.$nextTick();
                await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
            }
            else {
                setTimeout(() => {this.errorMessage = ""}, 5000);
            }
        },
        async simulateIdealWaveforms() {
            this.waveformSource = 'simulation';
            this.simulatingWaveforms = true;
            this.waveformError = "";
            this.magneticWaveforms = [];
            this.converterWaveforms = [];
            
            try {
                // Build the flyback parameters for simulation
                const aux = {};
                aux['inputVoltage'] = this.localData.inputVoltage;
                aux['diodeVoltageDrop'] = this.localData.diodeVoltageDrop;
                aux['efficiency'] = this.localData.efficiency;
                
                if (this.localData.designLevel == 'I know the design I want') {
                    aux['desiredInductance'] = this.localData.inductance;
                    const auxDesiredDutyCycle = [];
                    if (this.localData.inputVoltage.minimum != null && this.localData.dutyCycle.minimum != null) {
                        auxDesiredDutyCycle.push(this.localData.dutyCycle.minimum);
                    }
                    if (this.localData.inputVoltage.nominal != null && this.localData.dutyCycle.nominal != null) {
                        auxDesiredDutyCycle.push(this.localData.dutyCycle.nominal);
                    }
                    if (this.localData.inputVoltage.maximum != null && this.localData.dutyCycle.maximum != null) {
                        auxDesiredDutyCycle.push(this.localData.dutyCycle.maximum);
                    }
                    aux['desiredDutyCycle'] = [auxDesiredDutyCycle];
                    aux['desiredDeadTime'] = [this.localData.deadTime];
                    aux['desiredTurnsRatios'] = [];
                    this.localData.outputsParameters.forEach((elem) => {
                        aux['desiredTurnsRatios'].push(elem.turnsRatio);
                    });
                }
                else {
                    if (this.localData.mosfetInputType == 'Its maximum duty cycle') {
                        aux['maximumDutyCycle'] = this.localData.maximumDutyCycle;
                    }
                    else {
                        aux['maximumDrainSourceVoltage'] = this.localData.maximumDrainSourceVoltage;
                    }
                    aux['currentRippleRatio'] = this.localData.currentRippleRatio;
                }
                
                const auxOperatingPoint = {};
                auxOperatingPoint['outputVoltages'] = [];
                auxOperatingPoint['outputCurrents'] = [];
                this.localData.outputsParameters.forEach((elem) => {
                    auxOperatingPoint['outputVoltages'].push(elem.voltage);
                    auxOperatingPoint['outputCurrents'].push(elem.current);
                });
                auxOperatingPoint['switchingFrequency'] = this.localData.switchingFrequency;
                auxOperatingPoint['ambientTemperature'] = this.localData.ambientTemperature;
                aux['operatingPoints'] = [auxOperatingPoint];
                aux['numberOfPeriods'] = parseInt(this.numberOfPeriods, 10);
                aux['numberOfSteadyStatePeriods'] = parseInt(this.numberOfSteadyStatePeriods, 10);
                
                // Call the WASM simulation
                const result = await this.taskQueueStore.simulateFlybackIdealWaveforms(aux);
                
                this.simulatedOperatingPoints = result.inputs?.operatingPoints || result.operatingPoints || [];
                this.designRequirements = result.inputs?.designRequirements || result.designRequirements || null;
                this.simulatedMagnetizingInductance = this.designRequirements?.magnetizingInductance?.nominal || null;
                this.simulatedTurnsRatios = this.designRequirements?.turnsRatios?.map(tr => tr.nominal) || null;
                // WASM doesn't return magneticWaveforms, build from operating points
                this.magneticWaveforms = this.buildMagneticWaveformsFromInputs(this.simulatedOperatingPoints);
                // Convert converterWaveforms from C++ format to visualizer format
                this.converterWaveforms = this.convertConverterWaveforms(result.converterWaveforms || []);
                
                // Increment forceWaveformUpdate after $nextTick to ensureis mounted
                this.$nextTick(() => {
                    this.forceWaveformUpdate += 1;
                    // Auto-scroll to waveform section
                    if (this.$refs.waveformSection) {
                        this.$refs.waveformSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
                
            } catch (error) {
                console.error("Error simulating waveforms:", error);
                this.waveformError = error.message || "Failed to simulate waveforms";
            }
            
            this.simulatingWaveforms = false;
        },
        async getAnalyticalWaveforms() {
            // Uses analytical calculation (no ngspice simulation)
            this.waveformSource = 'analytical';
            this.simulatingWaveforms = true;
            this.waveformError = "";
            this.magneticWaveforms = [];
            this.converterWaveforms = [];
            
            try {
                // Build the flyback parameters for analytical calculation
                const aux = {};
                aux['inputVoltage'] = this.localData.inputVoltage;
                aux['diodeVoltageDrop'] = this.localData.diodeVoltageDrop;
                aux['efficiency'] = this.localData.efficiency;
                
                if (this.localData.designLevel == 'I know the design I want') {
                    aux['desiredInductance'] = this.localData.inductance;
                    const auxDesiredDutyCycle = [];
                    if (this.localData.inputVoltage.minimum != null && this.localData.dutyCycle.minimum != null) {
                        auxDesiredDutyCycle.push(this.localData.dutyCycle.minimum);
                    }
                    if (this.localData.inputVoltage.nominal != null && this.localData.dutyCycle.nominal != null) {
                        auxDesiredDutyCycle.push(this.localData.dutyCycle.nominal);
                    }
                    if (this.localData.inputVoltage.maximum != null && this.localData.dutyCycle.maximum != null) {
                        auxDesiredDutyCycle.push(this.localData.dutyCycle.maximum);
                    }
                    aux['desiredDutyCycle'] = [auxDesiredDutyCycle];
                    aux['desiredDeadTime'] = [this.localData.deadTime];
                    aux['desiredTurnsRatios'] = [];
                    this.localData.outputsParameters.forEach((elem) => {
                        aux['desiredTurnsRatios'].push(elem.turnsRatio);
                    });
                }
                else {
                    if (this.localData.mosfetInputType == 'Its maximum duty cycle') {
                        aux['maximumDutyCycle'] = this.localData.maximumDutyCycle;
                    }
                    else {
                        aux['maximumDrainSourceVoltage'] = this.localData.maximumDrainSourceVoltage;
                    }
                    aux['currentRippleRatio'] = this.localData.currentRippleRatio;
                }
                
                const auxOperatingPoint = {};
                auxOperatingPoint['outputVoltages'] = [];
                auxOperatingPoint['outputCurrents'] = [];
                this.localData.outputsParameters.forEach((elem) => {
                    auxOperatingPoint['outputVoltages'].push(elem.voltage);
                    auxOperatingPoint['outputCurrents'].push(elem.current);
                });
                auxOperatingPoint['switchingFrequency'] = this.localData.switchingFrequency;
                auxOperatingPoint['ambientTemperature'] = this.localData.ambientTemperature;
                aux['operatingPoints'] = [auxOperatingPoint];
                aux['numberOfPeriods'] = parseInt(this.numberOfPeriods, 10);
                
                // Call the analytical calculation (not ngspice simulation)
                let result;
                if (this.localData.designLevel == 'I know the design I want') {
                    result = await this.taskQueueStore.calculateAdvancedFlybackInputs(aux);
                } else {
                    result = await this.taskQueueStore.calculateFlybackInputs(aux);
                }
                
                // Extract design requirements and waveforms from the Inputs result
                this.designRequirements = result.inputs?.designRequirements || result.designRequirements || null;
                this.simulatedMagnetizingInductance = this.designRequirements?.magnetizingInductance?.nominal || null;
                this.simulatedTurnsRatios = this.designRequirements?.turnsRatios?.map(tr => tr.nominal) || null;
                
                // Extract design requirements and waveforms from the Inputs result
                const operatingPoints = result.inputs?.operatingPoints || result.operatingPoints || [];
                this.simulatedOperatingPoints = operatingPoints;
                
                // Build magnetic waveforms from operating points (primary winding excitation)
                this.magneticWaveforms = this.buildMagneticWaveformsFromInputs(operatingPoints);
                // Converter waveforms not available in analytical mode
                this.converterWaveforms = [];
                
                this.$nextTick(() => {
                    this.forceWaveformUpdate += 1;
                    if (this.$refs.waveformSection) {
                        this.$refs.waveformSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
                
            } catch (error) {
                console.error("Error getting analytical waveforms:", error);
                this.waveformError = error.message || "Failed to get analytical waveforms";
            }
            
            this.simulatingWaveforms = false;
        },
        getMagnetizingInductanceDisplay() {
            // Try multiple sources for inductance value
            // 1. Direct from result (raw number in Henries)
            if (this.simulatedMagnetizingInductance != null) {
                return (this.simulatedMagnetizingInductance * 1e6).toFixed(1) + 'µH';
            }
            // 2. From designRequirements.magnetizingInductance.nominal
            if (this.designRequirements?.magnetizingInductance?.nominal != null) {
                return (this.designRequirements.magnetizingInductance.nominal * 1e6).toFixed(1) + 'µH';
            }
            return 'N/A';
        },
        getTurnsRatioDisplay() {
            // Display turns ratio in format: 1 : 1/n₁ : 1/n₂ (Primary : Secondary1 : Secondary2)
            let turnsRatios = null;
            
            // Try multiple sources for turns ratios
            // 1. Direct from result (array of numbers)
            if (this.simulatedTurnsRatios && this.simulatedTurnsRatios.length > 0) {
                turnsRatios = this.simulatedTurnsRatios;
            }
            // 2. From designRequirements.turnsRatios[].nominal
            else if (this.designRequirements?.turnsRatios?.length > 0) {
                turnsRatios = this.designRequirements.turnsRatios.map(tr => tr.nominal);
            }
            
            if (!turnsRatios || turnsRatios.length === 0) {
                return 'N/A';
            }
            
            // Format as "1 : 1/n₁ : 1/n₂" where n is the turns ratio (Np/Ns)
            // If 1/n results in a nice integer or simple fraction, show that
            const parts = ['1'];  // Primary is always 1
            for (const n of turnsRatios) {
                const invN = 1 / n;
                // Check if it's close to an integer
                if (Math.abs(invN - Math.round(invN)) < 0.01) {
                    parts.push(Math.round(invN).toString());
                } else {
                    // Show as decimal with 2 places, or as fraction 1/n
                    parts.push((1/n).toFixed(2));
                }
            }
            return parts.join(' : ');
        },
        getDutyCycleDisplay() {
            // Try from localData.dutyCycle
            if (this.localData?.dutyCycle?.nominal != null) {
                return (this.localData.dutyCycle.nominal * 100).toFixed(0) + '%';
            }
            // Try from designRequirements
            if (this.designRequirements?.operatingPoints?.[0]?.dutyCycle != null) {
                return (this.designRequirements.operatingPoints[0].dutyCycle * 100).toFixed(0) + '%';
            }
            return 'N/A';
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
            // Convert from C++ ConverterWaveforms format to visualizer format
            // C++ format: { switchingFrequency, operatingPointName, inputVoltage: {data, time}, inputCurrent: {data, time}, outputVoltages: [], outputCurrents: [] }
            // Visualizer format: { frequency, operatingPointName, waveforms: [{ label, x, y, type, unit }] }
            return converterWaveforms.map((cw, idx) => {
                const opWaveforms = {
                    frequency: cw.switchingFrequency || this.localData.switchingFrequency,
                    operatingPointName: cw.operatingPointName || `Operating Point ${idx + 1}`,
                    waveforms: []
                };
                
                // Input voltage
                if (cw.inputVoltage?.time && cw.inputVoltage?.data) {
                    opWaveforms.waveforms.push({
                        label: 'Input Voltage',
                        x: cw.inputVoltage.time,
                        y: cw.inputVoltage.data,
                        type: 'voltage',
                        unit: 'V'
                    });
                }
                
                // Input current
                if (cw.inputCurrent?.time && cw.inputCurrent?.data) {
                    opWaveforms.waveforms.push({
                        label: 'Input Current',
                        x: cw.inputCurrent.time,
                        y: cw.inputCurrent.data,
                        type: 'current',
                        unit: 'A'
                    });
                }
                
                // Output voltages
                if (cw.outputVoltages && cw.outputVoltages.length > 0) {
                    cw.outputVoltages.forEach((outV, outIdx) => {
                        if (outV.time && outV.data) {
                            opWaveforms.waveforms.push({
                                label: `Output ${outIdx + 1} Voltage`,
                                x: outV.time,
                                y: outV.data,
                                type: 'voltage',
                                unit: 'V'
                            });
                        }
                    });
                }
                
                // Output currents
                if (cw.outputCurrents && cw.outputCurrents.length > 0) {
                    cw.outputCurrents.forEach((outI, outIdx) => {
                        if (outI.time && outI.data) {
                            opWaveforms.waveforms.push({
                                label: `Output ${outIdx + 1} Current`,
                                x: outI.time,
                                y: outI.data,
                                type: 'current',
                                unit: 'A'
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
        getWaveformsList(waveforms, operatingPointIndex) {
            // Get list of waveforms for an operating point
            if (!waveforms || !waveforms[operatingPointIndex] || !waveforms[operatingPointIndex].waveforms) {
                return [];
            }
            return waveforms[operatingPointIndex].waveforms;
        },
        getSingleWaveformDataForVisualizer(waveforms, operatingPointIndex, waveformIndex) {
            // Transform a single waveform toformat
            if (!waveforms || !waveforms[operatingPointIndex] || !waveforms[operatingPointIndex].waveforms) {
                return [];
            }
            
            const wf = waveforms[operatingPointIndex].waveforms[waveformIndex];
            if (!wf) return [];
            
            // For voltage waveforms, clip only extreme transient spikes while preserving
            // the full operating range. Flyback voltages legitimately swing between
            // positive Vmax and negative Vmin based on duty cycle.
            let yData = wf.y;
            const isVoltageWaveform = wf.unit === 'V';
            const isCurrentWaveform = wf.unit === 'A';
            
            if (isVoltageWaveform && yData && yData.length > 0) {
                // Use 5th-95th percentile to only exclude extreme transient spikes
                // This preserves the normal positive/negative operating range
                const sorted = [...yData].sort((a, b) => a - b);
                const p5 = sorted[Math.floor(sorted.length * 0.05)];
                const p95 = sorted[Math.floor(sorted.length * 0.95)];
                
                // Add 10% margin to avoid clipping near the edges
                const range = p95 - p5;
                const margin = range * 0.1;
                const clipMin = p5 - margin;
                const clipMax = p95 + margin;
                
                // Clip only extreme spikes (keeps full positive/negative range)
                yData = yData.map(v => Math.max(clipMin, Math.min(clipMax, v)));
            }
            
            // Use colors from styleStore: voltage (primary), current (info), default (white)
            let waveformColor = '#ffffff';
            if (isVoltageWaveform) {
                waveformColor = this.$styleStore.operatingPoints?.voltageGraph?.color || '#b18aea';
            } else if (isCurrentWaveform) {
                waveformColor = this.$styleStore.operatingPoints?.currentGraph?.color || '#4CAF50';
            }
            
            return [{
                label: wf.label,
                data: {
                    x: wf.x,
                    y: yData},
                colorLabel: waveformColor,
                type: 'value',
                position: 'left',
                unit: wf.unit,
                numberDecimals: 6}];
        },
        getTimeAxisOptions() {
            return {
                label: 'Time',
                colorLabel: '#d4d4d4',
                type: 'value',
                unit: 's'};
        },
        getPairedWaveformsList(waveforms, operatingPointIndex) {
            // Get pairs of voltage/current waveforms for an operating point
            if (!waveforms || !waveforms[operatingPointIndex] || !waveforms[operatingPointIndex].waveforms) {
                return [];
            }
            const allWaveforms = waveforms[operatingPointIndex].waveforms;
            const pairs = [];
            const usedIndices = new Set();
            
            // Try to pair voltage with current waveforms by matching names
            allWaveforms.forEach((wf, idx) => {
                if (usedIndices.has(idx)) return;
                
                const isVoltage = wf.unit === 'V';
                const isCurrent = wf.unit === 'A';
                
                if (isVoltage) {
                    // Look for matching current waveform
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
                        // No matching current, add voltage alone
                        pairs.push({ voltage: { wf, idx }, current: null });
                        usedIndices.add(idx);
                    }
                }
            });
            
            // Add remaining current waveforms that weren't paired
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
            // Transform a pair of voltage/current waveforms toformat with dual Y-axes
            const pairs = this.getPairedWaveformsList(waveforms, operatingPointIndex);
            if (!pairs[pairIndex]) return [];
            
            const pair = pairs[pairIndex];
            const result = [];
            
            // Add voltage data (left Y-axis)
            if (pair.voltage) {
                const vWf = pair.voltage.wf;
                let yData = vWf.y;
                
                // Clip extreme voltage spikes
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
                    numberDecimals: 6});
            }
            
            // Add current data (right Y-axis)
            if (pair.current) {
                const iWf = pair.current.wf;
                result.push({
                    label: iWf.label,
                    data: { x: iWf.x, y: iWf.y },
                    colorLabel: this.$styleStore.operatingPoints?.currentGraph?.color || '#4CAF50',
                    type: 'value',
                    position: 'right',
                    unit: 'A',
                    numberDecimals: 6});
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
                // Extract common name, remove "(Switch Node)" and "Voltage" suffix
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
            // Get the operating point name/label for display
            if (!waveforms || !waveforms[operatingPointIndex]) return '';
            const op = waveforms[operatingPointIndex];
            return op.operatingPointName || `Operating Point ${operatingPointIndex + 1}`;
        }}
}

</script>

<template>
  <ConverterWizardBase
    title="Flyback Wizard"
    titleIcon="fa-bolt"
      subtitle="Isolated DC-DC Converter with Energy Storage"
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
    @dismiss-error="errorMessage = ''; waveformError = ''"
  >
    <template #design-mode>
      <!-- Design Mode -->
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
        <div class="compact-header"><i class="fa-solid fa-cogs me-1"></i>{{localData.designLevel == 'I know the design I want'? "Design Parameters" : "Switch Parameters"}}</div>
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
          <DimensionWithTolerance :name="'dutyCycle'" :replaceTitle="'Duty Cycle'" :unit="null"
            :dataTestLabel="dataTestLabel + '-DutyCycle'"
            :min="0.01" :max="0.99"
            :allowUnsorted="true"
            :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
            v-model="localData.dutyCycle" :severalRows="true"
            :addButtonStyle="$styleStore.wizard.addButton"
            :removeButtonBgColor="$styleStore.wizard.removeButton['background-color']"
            :titleFontSize="$styleStore.wizard.inputLabelFontSize"
            :valueFontSize="$styleStore.wizard.inputFontSize"
            :labelFontSize="$styleStore.wizard.inputLabelFontSize"
            :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
            :textColor="$styleStore.wizard.inputTextColor"
            @update="updateErrorMessage"
          />
          <Dimension :name="'deadTime'" :replaceTitle="'Dead Time'" unit="s"
            :dataTestLabel="dataTestLabel + '-DeadTime'"
            :min="0" :max="1e-3"
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
            :name="'mosfetInputType'" :dataTestLabel="dataTestLabel + '-MosfetInputType'"
            :replaceTitle="''" :options="mosfetOptions" :titleSameRow="false"
            v-model="localData"
            :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-12'"
            :valueFontSize="$styleStore.wizard.inputFontSize"
            :labelFontSize="$styleStore.wizard.inputLabelFontSize"
            :labelBgColor="'transparent'" :valueBgColor="'transparent'"
            :textColor="$styleStore.wizard.inputTextColor"
            @update="updateErrorMessage"
          />
          <Dimension v-if="localData.mosfetInputType == 'Its maximum duty cycle'"
          :name="'maximumDutyCycle'" :replaceTitle="'Max Duty Cycle'" :unit="null"
          :dataTestLabel="dataTestLabel + '-MaximumDutyCycle'"
          :min="0.01" :max="0.99"
          v-model="localData"
          :labelWidthProportionClass="'col-6'" :valueWidthProportionClass="'col-6'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />
        <Dimension v-else-if="localData.mosfetInputType == 'Its maximum drain-source voltage'"
          :name="'maximumDrainSourceVoltage'" :replaceTitle="'Max Vds'" unit="V"
            :dataTestLabel="dataTestLabel + '-MaximumSwitchCurrent'"
            :min="minimumMaximumScalePerParameter['current']['min']"
            :max="minimumMaximumScalePerParameter['current']['max']"
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
        :dataTestLabel="dataTestLabel + '-DiodeVoltageDrop'"
        :min="0" :max="10"
        v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <Dimension :name="'efficiency'" :replaceTitle="'Eff'" unit="%" :visualScale="100"
        :dataTestLabel="dataTestLabel + '-Efficiency'"
        :min="0.5" :max="1"
        v-model="localData"
        :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateErrorMessage"
      />
      <ElementFromList :name="'insulationType'" :replaceTitle="'Insul'" :options="insulationTypes"
        :titleSameRow="true" v-model="localData"
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

    <template #number-outputs>
      <ElementFromList :name="'numberOutputs'" :replaceTitle="''"
        :dataTestLabel="dataTestLabel + '-NumberOutputs'"
        :options="Array.from({length: 10}, (_, i) => i + 1)"
        :titleSameRow="true" v-model="localData"
        :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-12'"
        :valueFontSize="$styleStore.wizard.inputFontSize"
        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
        :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor"
        :textColor="$styleStore.wizard.inputTextColor"
        @update="updateNumberOutputs"
      />
    </template>

    <template #outputs>
      <div v-for="(datum, index) in localData.outputsParameters" :key="'output-' + index" class="mb-2">
        <TripleOfDimensions v-if="localData.designLevel == 'I know the design I want'"
          :names="['voltage', 'current', 'turnsRatio']"
          :replaceTitle="['V', 'I', 'n']"
          :units="['V', 'A', null]"
          :mins="[minimumMaximumScalePerParameter['voltage']['min'], minimumMaximumScalePerParameter['current']['min'], 0.01]"
          :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['current']['max'], 100]"
          v-model="localData.outputsParameters[index]"
          :dataTestLabel="dataTestLabel + '-OutputsParameters'"
          :labelWidthProportionClass="'col-4'"
          :valueWidthProportionClass="'col-7'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'"
          :valueBgColor="$styleStore.wizard.inputValueBgColor"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />
        <PairOfDimensions v-else
          :names="['voltage', 'current']"
          :replaceTitle="['Volt.', 'Curr.']"
          :units="['V', 'A']"
          :mins="[minimumMaximumScalePerParameter['voltage']['min'], minimumMaximumScalePerParameter['current']['min']]"
          :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['current']['max']]"
          v-model="localData.outputsParameters[index]"
          :dataTestLabel="dataTestLabel + '-OutputsParameters'"
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
