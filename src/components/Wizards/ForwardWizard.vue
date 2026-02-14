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
import { defaultForwardWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from '/WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
</script>

<script>

export default {
    props: {
        converterName: {
            type: String,
            default: 'Single-Switch Forward',
        },
        dataTestLabel: {
            type: String,
            default: 'CmcWizard',
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
        const insulationTypes = ['No', 'Basic', 'Reinforced'];
        const errorMessage = "";
        var localData = deepCopy(defaultForwardWizardInputs);
        return {
            masStore,
            taskQueueStore,
            designLevelOptions,
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
            waveformViewMode: 'magnetic',
            forceWaveformUpdate: 0,
            numberOfPeriods: 2,
            numberOfSteadyStatePeriods: 20,
        }
    },
    computed: {
        wizardIcon() {
            switch (this.converterName) {
                case 'Single-Switch Forward': return 'fa-toggle-off';
                case 'Two-Switch Forward': return 'fa-toggle-on';
                case 'Active Clamp Forward': return 'fa-compress';
                default: return 'fa-arrow-right';
            }
        },
        wizardSubtitle() {
            switch (this.converterName) {
                case 'Single-Switch Forward': return 'Isolated DC-DC with Reset Winding';
                case 'Two-Switch Forward': return 'Isolated DC-DC with Dual Switches';
                case 'Active Clamp Forward': return 'Isolated DC-DC with Active Clamp Reset';
                default: return 'Isolated DC-DC Converter';
            }
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
        async pruneHarmonicsForInputs(inputs) {
            // Prune harmonics for all operating points and excitations
            const currentThreshold = 0.1;
            const voltageThreshold = 0.3;
            
            for (const op of inputs.operatingPoints) {
                if (op.excitationsPerWinding) {
                    for (const excitation of op.excitationsPerWinding) {
                        // Prune current harmonics
                        if (excitation.current?.harmonics?.amplitudes?.length > 1) {
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
                        
                        // Prune voltage harmonics
                        if (excitation.voltage?.harmonics?.amplitudes?.length > 1) {
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
                    }
                }
            }
            return inputs;
        },
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
                            voltage: defaultForwardWizardInputs.outputsParameters[0].voltage,
                            current: defaultForwardWizardInputs.outputsParameters[0].current,
                            turnsRatio: defaultForwardWizardInputs.outputsParameters[0].turnsRatio,
                        }
                    }
                    else {
                        newOutput = {
                            voltage: this.localData.outputsParameters[this.localData.outputsParameters.length - 1].voltage,
                            current: this.localData.outputsParameters[this.localData.outputsParameters.length - 1].current,
                            turnsRatio: this.localData.outputsParameters[this.localData.outputsParameters.length - 1].turnsRatio,
                        }
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
                    aux['desiredTurnsRatios'] = [];
                }

                aux['currentRippleRatio'] = this.localData.currentRippleRatio;
                aux['maximumSwitchCurrent'] = this.localData.maximumSwitchCurrent;

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
                    if (this.converterName == "Single-Switch Forward") {
                        inputs = await this.taskQueueStore.calculateAdvancedSingleSwitchForwardInputs(aux);
                    }
                    else if (this.converterName == "Two-Switch Forward") {
                        inputs = await this.taskQueueStore.calculateAdvancedTwoSwitchForwardInputs(aux);
                    }
                    else {
                        inputs = await this.taskQueueStore.calculateAdvancedActiveClampForwardInputs(aux);
                    }
                }
                else {
                    if (this.converterName == "Single-Switch Forward") {
                        inputs = await this.taskQueueStore.calculateSingleSwitchForwardInputs(aux);
                    }
                    else if (this.converterName == "Two-Switch Forward") {
                        inputs = await this.taskQueueStore.calculateTwoSwitchForwardInputs(aux);
                    }
                    else {
                        inputs = await this.taskQueueStore.calculateActiveClampForwardInputs(aux);
                    }
                }

                // Prune harmonics for better Fourier graph display
                inputs = await this.pruneHarmonicsForInputs(inputs);

                this.masStore.mas.inputs = inputs;

                // If we have simulated operating points (from Simulate button), use those waveforms
                // They contain more accurate waveform data from ngspice simulation
                if (this.simulatedOperatingPoints && this.simulatedOperatingPoints.length > 0) {
                    // Calculate harmonics and processed data from waveforms
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
                                            const prunedHarmonics = { amplitudes: [excitation.current.harmonics.amplitudes[0]], frequencies: [excitation.current.harmonics.frequencies[0]] };
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
                                            const prunedHarmonics = { amplitudes: [excitation.voltage.harmonics.amplitudes[0]], frequencies: [excitation.voltage.harmonics.frequencies[0]] };
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
                // Build the converter parameters for simulation
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
                    aux['desiredTurnsRatios'] = [];
                    this.localData.outputsParameters.forEach((elem) => {
                        aux['desiredTurnsRatios'].push(elem.turnsRatio);
                    });
                    aux['currentRippleRatio'] = this.localData.currentRippleRatio;
                    aux['maximumSwitchCurrent'] = this.localData.maximumSwitchCurrent;
                } else {
                    aux['currentRippleRatio'] = this.localData.currentRippleRatio;
                    aux['maximumSwitchCurrent'] = this.localData.maximumSwitchCurrent;
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
                

                
                // Call the WASM simulation based on converter type
                var result;
                if (this.converterName == "Single-Switch Forward") {
                    result = await this.taskQueueStore.simulateForwardIdealWaveforms(aux);
                } else if (this.converterName == "Two-Switch Forward") {
                    result = await this.taskQueueStore.simulateTwoSwitchForwardIdealWaveforms(aux);
                } else if (this.converterName == "Active Clamp Forward") {
                    result = await this.taskQueueStore.simulateActiveClampForwardIdealWaveforms(aux);
                } else {
                    throw new Error("Unknown converter type: " + this.converterName);
                }
                
                this.simulatedOperatingPoints = result.inputs?.operatingPoints || result.operatingPoints || [];
                this.designRequirements = result.inputs?.designRequirements || result.designRequirements || null;
                this.simulatedMagnetizingInductance = result.magnetizingInductance || null;
                this.simulatedTurnsRatios = result.turnsRatios || null;
                // Build magnetic waveforms from operating points
                this.magneticWaveforms = this.buildMagneticWaveformsFromInputs(this.simulatedOperatingPoints);
                this.converterWaveforms = this.convertConverterWaveforms(result.converterWaveforms || []);
                
                console.log('[Ngspice Simulation] magneticWaveforms count:', this.magneticWaveforms.length);
                console.log('[Ngspice Simulation] converterWaveforms count:', this.converterWaveforms.length);
                if (this.converterWaveforms.length > 0) {
                    console.log('[Ngspice Simulation] First converter OP waveforms:', this.converterWaveforms[0].waveforms.map(w => w.label));
                    // DEBUG: Log actual voltage/current values
                    this.converterWaveforms[0].waveforms.forEach(wf => {
                        if (wf.y && wf.y.length > 0) {
                            const min = Math.min(...wf.y);
                            const max = Math.max(...wf.y);
                            console.log(`[Visualizer] ${wf.label}: min=${min.toFixed(2)}, max=${max.toFixed(2)}, unit=${wf.unit}`);
                        }
                    });
                }
                if (this.magneticWaveforms.length > 0) {
                    console.log('[Ngspice Simulation] First magnetic OP waveforms:', this.magneticWaveforms[0].waveforms.map(w => w.label));
                    // DEBUG: Log actual voltage/current values
                    this.magneticWaveforms[0].waveforms.forEach(wf => {
                        if (wf.y && wf.y.length > 0) {
                            const min = Math.min(...wf.y);
                            const max = Math.max(...wf.y);
                            console.log(`[Visualizer] ${wf.label}: min=${min.toFixed(2)}, max=${max.toFixed(2)}, unit=${wf.unit}`);
                        }
                    });
                }
                
                this.$nextTick(() => {
                    this.forceWaveformUpdate += 1;
                    if (this.$refs.waveformSection) {
                        this.$refs.waveformSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
                
            } catch (error) {
                console.error("=== ForwardWizard: ERROR in simulateIdealWaveforms ===");
                console.error("Error object:", error);
                console.error("Error message:", error.message);
                console.error("Error stack:", error.stack);
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
                // Build the converter parameters for analytical calculation
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
                    aux['desiredTurnsRatios'] = [];
                    this.localData.outputsParameters.forEach((elem) => {
                        aux['desiredTurnsRatios'].push(elem.turnsRatio);
                    });
                    // Single-Switch Forward needs an extra turns ratio for demagnetization winding
                    if (this.converterName == "Single-Switch Forward") {
                        aux['desiredTurnsRatios'].push(1.0);  // Demagnetization winding, typically 1:1
                    }
                    aux['currentRippleRatio'] = this.localData.currentRippleRatio;
                    aux['maximumSwitchCurrent'] = this.localData.maximumSwitchCurrent;
                } else {
                    aux['currentRippleRatio'] = this.localData.currentRippleRatio;
                    aux['maximumSwitchCurrent'] = this.localData.maximumSwitchCurrent;
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
                
                // Call the analytical calculation based on converter type
                let result;
                if (this.localData.designLevel == 'I know the design I want') {
                    if (this.converterName == "Single-Switch Forward") {
                        result = await this.taskQueueStore.calculateAdvancedSingleSwitchForwardInputs(aux);
                    } else if (this.converterName == "Two-Switch Forward") {
                        result = await this.taskQueueStore.calculateAdvancedTwoSwitchForwardInputs(aux);
                    } else if (this.converterName == "Active Clamp Forward") {
                        result = await this.taskQueueStore.calculateAdvancedActiveClampForwardInputs(aux);
                    } else {
                        throw new Error("Unknown converter type: " + this.converterName);
                    }
                } else {
                    if (this.converterName == "Single-Switch Forward") {
                        result = await this.taskQueueStore.calculateSingleSwitchForwardInputs(aux);
                    } else if (this.converterName == "Two-Switch Forward") {
                        result = await this.taskQueueStore.calculateTwoSwitchForwardInputs(aux);
                    } else if (this.converterName == "Active Clamp Forward") {
                        result = await this.taskQueueStore.calculateActiveClampForwardInputs(aux);
                    } else {
                        throw new Error("Unknown converter type: " + this.converterName);
                    }
                }
                
                // Extract design requirements and waveforms from the Inputs result
                this.designRequirements = result.designRequirements || null;
                this.simulatedMagnetizingInductance = result.designRequirements?.magnetizingInductance?.nominal || null;
                this.simulatedTurnsRatios = result.designRequirements?.turnsRatios?.map(tr => tr.nominal) || null;
                
                // Convert operating points to waveform format for display
                const operatingPoints = result.operatingPoints || [];
                this.simulatedOperatingPoints = operatingPoints;
                
                // Build magnetic waveforms from operating points (primary winding excitation)
                this.magneticWaveforms = this.buildMagneticWaveformsFromInputs(operatingPoints);
                // Build converter waveforms from operating points (output view)
                this.converterWaveforms = this.buildConverterWaveformsFromInputs(operatingPoints);
                
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
        getDutyCycleDisplay() {
            if (this.localData?.dutyCycle?.nominal != null) {
                return (this.localData.dutyCycle.nominal * 100).toFixed(0) + '%';
            }
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
                
                // Add output voltages/currents from backend data
                if (op.outputVoltages && op.outputVoltages.length > 0) {
                    for (let outIdx = 0; outIdx < op.outputVoltages.length; outIdx++) {
                        if (op.outputVoltages[outIdx].waveform) {
                            opWaveforms.waveforms.push({
                                label: `Output ${outIdx + 1} Voltage`,
                                x: op.outputVoltages[outIdx].waveform.time,
                                y: op.outputVoltages[outIdx].waveform.data,
                                type: 'voltage',
                                unit: 'V'
                            });
                        }
                    }
                }
                
                if (op.outputCurrents && op.outputCurrents.length > 0) {
                    for (let outIdx = 0; outIdx < op.outputCurrents.length; outIdx++) {
                        if (op.outputCurrents[outIdx].waveform) {
                            opWaveforms.waveforms.push({
                                label: `Output ${outIdx + 1} Current`,
                                x: op.outputCurrents[outIdx].waveform.time,
                                y: op.outputCurrents[outIdx].waveform.data,
                                type: 'current',
                                unit: 'A'
                            });
                        }
                    }
                }
                
                magneticWaveforms.push(opWaveforms);
            }
            
            return magneticWaveforms;
        },
        buildConverterWaveformsFromInputs(operatingPoints) {
            const converterWaveforms = [];
            
            console.log('[buildConverterWaveformsFromInputs] Building converter waveforms from', operatingPoints.length, 'operating points');
            console.log('[buildConverterWaveformsFromInputs] Converter type:', this.converterName);
            
            for (let opIdx = 0; opIdx < operatingPoints.length; opIdx++) {
                const op = operatingPoints[opIdx];
                console.log(`[buildConverterWaveformsFromInputs] OP ${opIdx}:`, {
                    outputVoltages: op.outputVoltages?.length || 0,
                    outputCurrents: op.outputCurrents?.length || 0,
                    excitations: op.excitationsPerWinding?.length || 0
                });
                
                const opWaveforms = {
                    frequency: op.excitationsPerWinding?.[0]?.frequency || this.localData.switchingFrequency,
                    operatingPointName: op.name || `Operating Point ${opIdx + 1}`,
                    waveforms: []
                };
                
                // Add output voltages/currents from backend data
                if (op.outputVoltages && op.outputVoltages.length > 0) {
                    for (let outIdx = 0; outIdx < op.outputVoltages.length; outIdx++) {
                        if (op.outputVoltages[outIdx].waveform) {
                            const label = op.outputVoltages.length === 1 ? 'Output Voltage' : `Output ${outIdx + 1} Voltage`;
                            console.log(`[buildConverterWaveformsFromInputs] Adding voltage: ${label}`);
                            opWaveforms.waveforms.push({
                                label: label,
                                x: op.outputVoltages[outIdx].waveform.time,
                                y: op.outputVoltages[outIdx].waveform.data,
                                type: 'voltage',
                                unit: 'V'
                            });
                        }
                    }
                }
                
                // Get secondary currents from excitationsPerWinding
                // For Single-Switch Forward: index 0=Primary, 1=Demagnetization, 2+=Output secondaries
                // For Two-Switch/Active Clamp: index 0=Primary, 1+=Output secondaries
                const excitations = op.excitationsPerWinding || [];
                const isSingleSwitch = this.converterName === "Single-Switch Forward";
                const firstOutputIndex = isSingleSwitch ? 2 : 1; // Skip demagnetization winding for Single-Switch
                
                console.log(`[buildConverterWaveformsFromInputs] Looking for currents starting at index ${firstOutputIndex} (isSingleSwitch=${isSingleSwitch})`);
                
                let outputCurrentIdx = 0;
                for (let windingIdx = firstOutputIndex; windingIdx < excitations.length; windingIdx++) {
                    const excitation = excitations[windingIdx];
                    console.log(`[buildConverterWaveformsFromInputs] Checking excitation at index ${windingIdx}:`, {
                        hasCurrent: !!excitation.current?.waveform,
                        hasTime: !!excitation.current?.waveform?.time,
                        hasData: !!excitation.current?.waveform?.data
                    });
                    if (excitation.current?.waveform?.time && excitation.current?.waveform?.data) {
                        // Label as Output Current to match Output Voltage for pairing
                        const numOutputs = excitations.length - firstOutputIndex;
                        const label = numOutputs === 1 ? 'Output Current' : `Output ${outputCurrentIdx + 1} Current`;
                        console.log(`[buildConverterWaveformsFromInputs] Adding current: ${label}`);
                        opWaveforms.waveforms.push({
                            label: label,
                            x: excitation.current.waveform.time,
                            y: excitation.current.waveform.data,
                            type: 'current',
                            unit: 'A'
                        });
                        outputCurrentIdx++;
                    }
                }
                
                // Fallback: if no secondary currents found in excitations, use outputCurrents
                if (op.outputCurrents && op.outputCurrents.length > 0) {
                    const hasSecondaryCurrent = opWaveforms.waveforms.some(wf => wf.type === 'current');
                    if (!hasSecondaryCurrent) {
                        for (let outIdx = 0; outIdx < op.outputCurrents.length; outIdx++) {
                            if (op.outputCurrents[outIdx].waveform) {
                                const label = op.outputCurrents.length === 1 ? 'Output Current' : `Output ${outIdx + 1} Current`;
                                opWaveforms.waveforms.push({
                                    label: label,
                                    x: op.outputCurrents[outIdx].waveform.time,
                                    y: op.outputCurrents[outIdx].waveform.data,
                                    type: 'current',
                                    unit: 'A'
                                });
                            }
                        }
                    }
                }
                
                converterWaveforms.push(opWaveforms);
                console.log(`[buildConverterWaveformsFromInputs] OP ${opIdx} final waveforms count:`, opWaveforms.waveforms.length);
                console.log(`[buildConverterWaveformsFromInputs] OP ${opIdx} waveform labels:`, opWaveforms.waveforms.map(w => w.label));
            }
            
            console.log('[buildConverterWaveformsFromInputs] Final converter waveforms:', converterWaveforms);
            return converterWaveforms;
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
            if (!time || !data || time.length === 0 || numberOfPeriods <= 1) {
                return { time, data };
            }
            
            const period = time[time.length - 1] - time[0];
            const newTime = [];
            const newData = [];
            
            for (let p = 0; p < numberOfPeriods; p++) {
                const offset = p * period;
                for (let i = 0; i < time.length; i++) {
                    // For first point in subsequent periods, check if we need to add a boundary point
                    if (p > 0 && i === 0) {
                        const newTimeValue = time[i] + offset;
                        const lastTime = newTime.length > 0 ? newTime[newTime.length - 1] : null;
                        const lastData = newData.length > 0 ? newData[newData.length - 1] : null;
                        const timeDiff = lastTime !== null ? Math.abs(lastTime - newTimeValue) : Infinity;
                        
                        // If times are essentially the same but values differ, 
                        // we need BOTH points to create a vertical edge (instant transition)
                        if (newTime.length > 0 && timeDiff < 1e-12) {
                            if (lastData !== null && Math.abs(lastData - data[i]) > 1e-9) {
                                // Values differ - add duplicate time point with new value for vertical edge
                                newTime.push(newTimeValue);
                                newData.push(data[i]);
                            }
                            // Skip the rest of this iteration since we handled this point
                            continue;
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
        getSingleWaveformDataForVisualizer(waveforms, operatingPointIndex, waveformIndex) {
            console.log('[getSingleWaveformDataForVisualizer] Called with:', {operatingPointIndex, waveformIndex});
            if (!waveforms || !waveforms[operatingPointIndex] || !waveforms[operatingPointIndex].waveforms) {
                console.log('[getSingleWaveformDataForVisualizer] No waveforms found');
                return [];
            }
            
            const wf = waveforms[operatingPointIndex].waveforms[waveformIndex];
            if (!wf) return [];
            
            console.log('[getSingleWaveformDataForVisualizer] Processing:', wf.label, 'unit:', wf.unit, 'data length:', wf.y?.length);
            let yData = [...wf.y]; // Clone to avoid mutating original
            const isVoltageWaveform = wf.unit === 'V';
            const isCurrentWaveform = wf.unit === 'A';
            
            if (isVoltageWaveform && yData && yData.length > 0) {
                // Get input voltage - handle different possible structures
                let inputVoltageMax = 200; // Default fallback
                if (this.localData?.inputVoltage?.maximum) {
                    inputVoltageMax = this.localData.inputVoltage.maximum;
                } else if (this.localData?.inputVoltageRange?.maximum) {
                    inputVoltageMax = this.localData.inputVoltageRange.maximum;
                }
                
                // Determine clipping limits based on waveform type
                let clipMin, clipMax;
                
                if (wf.label.toLowerCase().includes('primary')) {
                    // Primary voltage: expected range is -Vin to +Vin (with some margin)
                    // Use 2.5x margin for ngspice switching transients
                    clipMax = inputVoltageMax * 2.5;
                    clipMin = -inputVoltageMax * 2.5;
                } else if (wf.label.toLowerCase().includes('secondary')) {
                    // Secondary voltage: based on turns ratio
                    // Estimate from median of positive values
                    const positiveValues = yData.filter(v => v > 0).sort((a, b) => a - b);
                    const medianPositive = positiveValues.length > 0 
                        ? positiveValues[Math.floor(positiveValues.length / 2)]
                        : inputVoltageMax;
                    clipMax = medianPositive * 2.5;
                    clipMin = -medianPositive * 2.5;
                } else if (wf.label.toLowerCase().includes('output')) {
                    // Output voltage: should be close to target output voltage
                    const outputVoltage = this.localData?.outputsParameters?.[0]?.voltage || 12;
                    clipMax = outputVoltage * 2;
                    clipMin = -outputVoltage * 0.5; // Small negative allowance
                } else {
                    // Default: use percentile-based clipping with wider margins
                    const sorted = [...yData].sort((a, b) => a - b);
                    const p1 = sorted[Math.floor(sorted.length * 0.01)];
                    const p99 = sorted[Math.floor(sorted.length * 0.99)];
                    const range = p99 - p1;
                    clipMin = p1 - range * 0.2;
                    clipMax = p99 + range * 0.2;
                }
                
                // Log clipping info for debugging
                const originalMin = Math.min(...yData);
                const originalMax = Math.max(...yData);
                if (originalMax > clipMax || originalMin < clipMin) {
                    console.log(`[Voltage Clipping] ${wf.label}: clipping to [${clipMin.toFixed(1)}, ${clipMax.toFixed(1)}], original range [${originalMin.toFixed(1)}, ${originalMax.toFixed(1)}]`);
                }
                
                yData = yData.map(v => Math.max(clipMin, Math.min(clipMax, v)));
            } else if (isCurrentWaveform && yData && yData.length > 0) {
                // Also clip current waveforms to remove spikes
                const sorted = [...yData].sort((a, b) => a - b);
                const p1 = sorted[Math.floor(sorted.length * 0.01)];
                const p99 = sorted[Math.floor(sorted.length * 0.99)];
                const range = p99 - p1;
                
                // Use 20% margin around 1st-99th percentile
                const clipMin = p1 - range * 0.2;
                const clipMax = p99 + range * 0.2;
                
                const originalMin = Math.min(...yData);
                const originalMax = Math.max(...yData);
                if (originalMax > clipMax || originalMin < clipMin) {
                    console.log(`[Current Clipping] ${wf.label}: clipping to [${clipMin.toFixed(3)}, ${clipMax.toFixed(3)}], original range [${originalMin.toFixed(3)}, ${originalMax.toFixed(3)}]`);
                }
                
                yData = yData.map(v => Math.max(clipMin, Math.min(clipMax, v)));
            }
            
            let waveformColor = '#ffffff';
            if (isVoltageWaveform) {
                waveformColor = this.$styleStore.operatingPoints?.voltageGraph?.color || '#b18aea';
            } else if (isCurrentWaveform) {
                waveformColor = this.$styleStore.operatingPoints?.currentGraph?.color || '#4CAF50';
            }
            
            console.log('[getSingleWaveformDataForVisualizer] Returning:', wf.label, 'yRange:', [Math.min(...yData), Math.max(...yData)]);
            
            return [{
                label: wf.label,
                data: {
                    x: wf.x,
                    y: yData,
                },
                colorLabel: waveformColor,
                type: 'value',
                position: 'left',
                unit: wf.unit,
                numberDecimals: 6,
            }];
        },
        getTimeAxisOptions() {
            return {
                label: 'Time',
                colorLabel: '#d4d4d4',
                type: 'value',
                unit: 's',
            };
        },
        getPairedWaveformsList(waveforms, operatingPointIndex) {
            if (!waveforms || !waveforms[operatingPointIndex] || !waveforms[operatingPointIndex].waveforms) {
                return [];
            }
            const allWaveforms = waveforms[operatingPointIndex].waveforms;
            const pairs = [];
            const usedIndices = new Set();
            
            // For converter view, prioritize pairing Output Voltage with Output/Secondary Current
            allWaveforms.forEach((wf, idx) => {
                if (usedIndices.has(idx)) return;
                
                const isVoltage = wf.unit === 'V';
                
                if (isVoltage) {
                    const baseName = wf.label.replace(/voltage/i, '').replace(/V$/i, '').trim();
                    
                    // Try to find matching current waveform
                    const currentIdx = allWaveforms.findIndex((cWf, cIdx) => {
                        if (cIdx === idx || usedIndices.has(cIdx)) return false;
                        if (cWf.unit !== 'A') return false;
                        const currentBaseName = cWf.label.replace(/current/i, '').replace(/I$/i, '').trim();
                        
                        // Direct name matching (Output -> Output, Secondary 1 -> Secondary 1, etc.)
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
            
            // Add any remaining unpaired current waveforms
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
            
            // Debug: log which function is being used
            console.log('[getPairedWaveformDataForVisualizer] Processing pair:', pairIndex, 'voltage:', pair.voltage?.wf?.label, 'current:', pair.current?.wf?.label);
            
            if (pair.voltage) {
                const vWf = pair.voltage.wf;
                console.log('[getPairedWaveformDataForVisualizer] Voltage waveform data length:', vWf.y?.length, 'sample values:', vWf.y?.slice(0, 5));
                let yData = [...vWf.y]; // Clone to avoid mutating original
                
                if (yData && yData.length > 0) {
                    // Debug: log input voltage availability
                    console.log('[getPairedWaveformDataForVisualizer] localData.inputVoltage:', this.localData?.inputVoltage);
                    console.log('[getPairedWaveformDataForVisualizer] localData.inputVoltageRange:', this.localData?.inputVoltageRange);
                    // Get input voltage - handle different possible structures
                    let inputVoltageMax = 200; // Default fallback
                    if (this.localData?.inputVoltage?.maximum) {
                        inputVoltageMax = this.localData.inputVoltage.maximum;
                    } else if (this.localData?.inputVoltageRange?.maximum) {
                        inputVoltageMax = this.localData.inputVoltageRange.maximum;
                    }
                    
                    // Determine clipping limits based on waveform type
                    let clipMin, clipMax;
                    
                    if (vWf.label.toLowerCase().includes('primary')) {
                        // Primary voltage: expected range is -Vin to +Vin
                        // Use 2.5x margin for ngspice switching transients
                        clipMax = inputVoltageMax * 2.5;
                        clipMin = -inputVoltageMax * 2.5;
                    } else if (vWf.label.toLowerCase().includes('secondary')) {
                        // Secondary voltage: based on turns ratio
                        const positiveValues = yData.filter(v => v > 0).sort((a, b) => a - b);
                        const medianPositive = positiveValues.length > 0 
                            ? positiveValues[Math.floor(positiveValues.length / 2)]
                            : inputVoltageMax;
                        clipMax = medianPositive * 2.5;
                        clipMin = -medianPositive * 2.5;
                    } else if (vWf.label.toLowerCase().includes('output')) {
                        // Output voltage: should be close to target output voltage
                        const outputVoltage = this.localData?.outputsParameters?.[0]?.voltage || 12;
                        clipMax = outputVoltage * 2;
                        clipMin = -outputVoltage * 0.5;
                    } else {
                        // Default: use percentile-based clipping
                        const sorted = [...yData].sort((a, b) => a - b);
                        const p1 = sorted[Math.floor(sorted.length * 0.01)];
                        const p99 = sorted[Math.floor(sorted.length * 0.99)];
                        const range = p99 - p1;
                        clipMin = p1 - range * 0.2;
                        clipMax = p99 + range * 0.2;
                    }
                    
                    // Log clipping info for debugging
                    const originalMin = Math.min(...yData);
                    const originalMax = Math.max(...yData);
                    if (originalMax > clipMax || originalMin < clipMin) {
                        console.log(`[Paired Voltage Clipping] ${vWf.label}: clipping to [${clipMin.toFixed(1)}, ${clipMax.toFixed(1)}], original range [${originalMin.toFixed(1)}, ${originalMax.toFixed(1)}]`);
                        yData = yData.map(v => Math.max(clipMin, Math.min(clipMax, v)));
                    }
                }
                
                const voltageData = {
                    label: vWf.label,
                    data: { x: vWf.x, y: yData },
                    colorLabel: this.$styleStore.operatingPoints?.voltageGraph?.color || '#b18aea',
                    type: 'value',
                    position: 'left',
                    unit: 'V',
                    numberDecimals: 6,
                };
                
                result.push(voltageData);
            }
            
            if (pair.current) {
                const iWf = pair.current.wf;
                let iData = [...iWf.y]; // Clone to avoid mutating original
                
                // Clip current spikes
                if (iData && iData.length > 0) {
                    const sorted = [...iData].sort((a, b) => a - b);
                    const p1 = sorted[Math.floor(sorted.length * 0.01)];
                    const p99 = sorted[Math.floor(sorted.length * 0.99)];
                    const range = p99 - p1;
                    
                    // Use 20% margin around 1st-99th percentile
                    const clipMin = p1 - range * 0.2;
                    const clipMax = p99 + range * 0.2;
                    
                    const originalMin = Math.min(...iData);
                    const originalMax = Math.max(...iData);
                    if (originalMax > clipMax || originalMin < clipMin) {
                        console.log(`[Paired Current Clipping] ${iWf.label}: clipping to [${clipMin.toFixed(3)}, ${clipMax.toFixed(3)}], original range [${originalMin.toFixed(3)}, ${originalMax.toFixed(3)}]`);
                        iData = iData.map(v => Math.max(clipMin, Math.min(clipMax, v)));
                    }
                }
                
                result.push({
                    label: iWf.label,
                    data: { x: iWf.x, y: iData },
                    colorLabel: this.$styleStore.operatingPoints?.currentGraph?.color || '#4CAF50',
                    type: 'value',
                    position: 'right',
                    unit: 'A',
                    numberDecimals: 6,
                });
            }
            
            // Debug: log what we're returning
            console.log('[getPairedWaveformDataForVisualizer] Returning result:', result.map(r => ({label: r.label, yMin: Math.min(...r.data.y), yMax: Math.max(...r.data.y)})));
            
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
    }
}

</script>

<template>
  <ConverterWizardBase
    :title="converterName + ' Wizard'"
    titleIcon="fa-bolt"
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
      <div v-if="localData.designLevel == 'I know the design I want'" class="compact-header"><i class="fa-solid fa-cogs me-1"></i>Design Params</div>
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
          :labelWidthProportionClass="'col-2'"
          :valueWidthProportionClass="'col-10'"
          :valueFontSize="$styleStore.wizard.inputFontSize"
          :labelFontSize="$styleStore.wizard.inputLabelFontSize"
          :labelBgColor="'transparent'"
          :valueBgColor="$styleStore.wizard.inputValueBgColor"
          :textColor="$styleStore.wizard.inputTextColor"
          @update="updateErrorMessage"
        />
        <PairOfDimensions v-else
          :names="['voltage', 'current']"
          :replaceTitle="['V', 'I']"
          :units="['V', 'A']"
          :mins="[minimumMaximumScalePerParameter['voltage']['min'], minimumMaximumScalePerParameter['current']['min']]"
          :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['current']['max']]"
          v-model="localData.outputsParameters[index]"
          :dataTestLabel="dataTestLabel + '-OutputsParameters'"
          :labelWidthProportionClass="'col-2'"
          :valueWidthProportionClass="'col-10'"
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
