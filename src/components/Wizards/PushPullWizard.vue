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
import { defaultPushPullWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from '/WebSharedComponents/assets/js/defaults.js'
import MaximumDimensions from '../Toolbox/DesignRequirements/MaximumDimensions.vue'
import LineVisualizer from '/WebSharedComponents/Common/LineVisualizer.vue'
</script>

<script>
export default {
    props: {
        converterName: {
            type: String,
            default: 'Push-Pull',
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
        var localData = deepCopy(defaultPushPullWizardInputs);
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
            numberOfSteadyStatePeriods: 10,
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
                            voltage: defaultPushPullWizardInputs.outputsParameters[0].voltage,
                            current: defaultPushPullWizardInputs.outputsParameters[0].current,
                            turnsRatio: defaultPushPullWizardInputs.outputsParameters[0].turnsRatio,
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
                    // Use fixed user-provided duty cycle for all input voltages
                    // Push-pull regulates output via turns ratio, not duty cycle modulation
                    const dutyCycleValue = this.localData.dutyCycle || 0.45;
                    if (this.localData.inputVoltage.minimum != null) {
                        auxDesiredDutyCycle.push(dutyCycleValue);   
                    }
                    if (this.localData.inputVoltage.nominal != null) {
                        auxDesiredDutyCycle.push(dutyCycleValue);   
                    }
                    if (this.localData.inputVoltage.maximum != null) {
                        auxDesiredDutyCycle.push(dutyCycleValue);   
                    }
                    aux['desiredDutyCycle'] = auxDesiredDutyCycle;
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
                    inputs = await this.taskQueueStore.calculateAdvancedPushPullInputs(aux);
                }
                else {
                    inputs = await this.taskQueueStore.calculatePushPullInputs(aux);
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
                    // Use fixed user-provided duty cycle for all input voltages
                    // Push-pull regulates output via turns ratio, not duty cycle modulation
                    const dutyCycleValue = this.localData.dutyCycle || 0.45;
                    if (this.localData.inputVoltage.minimum != null) {
                        auxDesiredDutyCycle.push(dutyCycleValue);
                    }
                    if (this.localData.inputVoltage.nominal != null) {
                        auxDesiredDutyCycle.push(dutyCycleValue);
                    }
                    if (this.localData.inputVoltage.maximum != null) {
                        auxDesiredDutyCycle.push(dutyCycleValue);
                    }
                    aux['desiredDutyCycle'] = auxDesiredDutyCycle;
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
                
                // Call the WASM simulation
                var result = await this.taskQueueStore.simulatePushPullIdealWaveforms(aux);
                
                this.simulatedOperatingPoints = result.operatingPoints || [];
                this.designRequirements = result.designRequirements || null;
                this.simulatedMagnetizingInductance = result.magnetizingInductance || null;
                this.simulatedTurnsRatios = result.turnsRatios || null;
                this.magneticWaveforms = result.magneticWaveforms || [];
                this.converterWaveforms = result.converterWaveforms || [];
                
                this.$nextTick(() => {
                    this.forceWaveformUpdate += 1;
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
            this.waveformSource = 'analytical';
            this.simulatingWaveforms = true;
            this.waveformError = "";
            this.magneticWaveforms = [];
            this.converterWaveforms = [];
            
            try {
                const aux = {};
                aux['inputVoltage'] = this.localData.inputVoltage;
                aux['diodeVoltageDrop'] = this.localData.diodeVoltageDrop;
                aux['efficiency'] = this.localData.efficiency;
                
                if (this.localData.designLevel == 'I know the design I want') {
                    aux['desiredInductance'] = this.localData.inductance;
                    const auxDesiredDutyCycle = [];
                    // Use fixed user-provided duty cycle for all input voltages
                    // Push-pull regulates output via turns ratio, not duty cycle modulation
                    const dutyCycleValue = this.localData.dutyCycle || 0.45;
                    if (this.localData.inputVoltage.minimum != null) {
                        auxDesiredDutyCycle.push(dutyCycleValue);
                    }
                    if (this.localData.inputVoltage.nominal != null) {
                        auxDesiredDutyCycle.push(dutyCycleValue);
                    }
                    if (this.localData.inputVoltage.maximum != null) {
                        auxDesiredDutyCycle.push(dutyCycleValue);
                    }
                    aux['desiredDutyCycle'] = auxDesiredDutyCycle;
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
                
                let result;
                if (this.localData.designLevel == 'I know the design I want') {
                    result = await this.taskQueueStore.calculateAdvancedPushPullInputs(aux);
                } else {
                    result = await this.taskQueueStore.calculatePushPullInputs(aux);
                }
                
                this.designRequirements = result.designRequirements || null;
                this.simulatedMagnetizingInductance = result.designRequirements?.magnetizingInductance?.nominal || null;
                this.simulatedTurnsRatios = result.designRequirements?.turnsRatios?.map(tr => tr.nominal) || null;
                
                const operatingPoints = result.operatingPoints || [];
                this.simulatedOperatingPoints = operatingPoints;
                
                this.magneticWaveforms = this.buildMagneticWaveformsFromInputs(operatingPoints);
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
        getInductanceDisplay() {
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
                    
                    if (excitation.voltage?.waveform?.time && excitation.voltage?.waveform?.data) {
                        const { time, data } = this.repeatWaveformForPeriods(
                            excitation.voltage.waveform.time,
                            excitation.voltage.waveform.data,
                            this.numberOfPeriods
                        );
                        opWaveforms.waveforms.push({
                            label: `${windingLabel} Voltage`,
                            x: time,
                            y: data,
                            type: 'voltage',
                            unit: 'V'
                        });
                    }
                    
                    if (excitation.current?.waveform?.time && excitation.current?.waveform?.data) {
                        const { time, data } = this.repeatWaveformForPeriods(
                            excitation.current.waveform.time,
                            excitation.current.waveform.data,
                            this.numberOfPeriods
                        );
                        opWaveforms.waveforms.push({
                            label: `${windingLabel} Current`,
                            x: time,
                            y: data,
                            type: 'current',
                            unit: 'A'
                        });
                    }
                }
                
                magneticWaveforms.push(opWaveforms);
            }
            
            return magneticWaveforms;
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
                    if (p > 0 && i === 0) continue;
                    newTime.push(time[i] + offset);
                    newData.push(data[i]);
                }
            }
            
            return { time: newTime, data: newData };
        },
        getWaveformsList(waveforms, operatingPointIndex) {
            if (!waveforms || !waveforms[operatingPointIndex] || !waveforms[operatingPointIndex].waveforms) {
                return [];
            }
            return waveforms[operatingPointIndex].waveforms;
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
            
            allWaveforms.forEach((wf, idx) => {
                if (usedIndices.has(idx)) return;
                
                const isVoltage = wf.unit === 'V';
                
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
    <div class="wizard-container container-fluid px-3">
        <!-- Compact Header -->
        <div class="wizard-header text-center py-2 mb-3">
            <h4 class="wizard-title mb-0">
                <i class="fa-solid fa-bolt me-2"></i>{{ converterName }}
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

                    <!-- Conditional: Design Parameters (Advanced) OR Switch Parameters (Help) -->
                    <div v-if="localData.designLevel == 'I know the design I want'" class="compact-card">
                        <div class="compact-header"><i class="fa-solid fa-cogs me-1"></i>Design Params</div>
                        <div class="compact-body">
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
                        <div class="compact-header"><i class="fa-solid fa-microchip me-1"></i>Switch Params</div>
                        <div class="compact-body ps-4">
                            <Dimension
                                :name="'maximumSwitchCurrent'"
                                :replaceTitle="'Max I'"
                                unit="A"
                                :dataTestLabel="dataTestLabel + '-MaximumSwitchCurrent'"
                                :min="minimumMaximumScalePerParameter['voltage']['min']"
                                :max="minimumMaximumScalePerParameter['voltage']['max']"
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
                                        :replaceTitle="'Sw. Frequency'"
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
                                        :name="'dutyCycle'"
                                        :replaceTitle="'Duty Cycle'"
                                        unit="%"
                                        :dataTestLabel="dataTestLabel + '-DutyCycle'"
                                        :visualScale="100"
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
                                        :replaceTitle="'Temperature'"
                                        unit="°C"
                                        :dataTestLabel="dataTestLabel + '-AmbientTemperature'"
                                        :min="minimumMaximumScalePerParameter['temperature']['min']"
                                        :max="minimumMaximumScalePerParameter['temperature']['max']"
                                        :allowNegative="true"
                                        :allowZero="true"
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
                                        :min="minimumMaximumScalePerParameter['voltage']['min']"
                                        :max="minimumMaximumScalePerParameter['voltage']['max']"
                                        :allowZero="true"
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
                                    <ElementFromList
                                        :name="'insulationType'"
                                        :replaceTitle="'Insulation'"
                                        :dataTestLabel="dataTestLabel + '-InsulationType'"
                                        :options="insulationTypes"
                                        :titleSameRow="true"
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
                                <i class="fa-solid fa-magnifying-glass me-1"></i>Review
                            </button>
                            <button :disabled="errorMessage != ''" class="action-btn-sm primary" @click="processAndAdvise">
                                <i class="fa-solid fa-wand-magic-sparkles me-1"></i>Design
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Column 2: Input Voltage, Outputs -->
            <div class="col-12 col-xl-4">
                <div class="d-flex flex-column gap-2">
                    <!-- Input Voltage -->
                    <div class="compact-card">
                        <div class="compact-header"><i class="fa-solid fa-plug me-1"></i>Input Voltage</div>
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

                    <!-- Outputs -->
                    <div class="compact-card">
                        <div class="compact-header">
                            <i class="fa-solid fa-arrow-right-from-bracket me-1"></i>Outputs
                            <select v-model="localData.numberOutputs" @change="updateNumberOutputs(localData.numberOutputs)" class="output-select ms-2">
                                <option v-for="n in 11" :key="n" :value="n">{{ n }}</option>
                            </select>
                        </div>
                        <div class="compact-body outputs-expand">
                            <div v-for="(datum, index) in localData.outputsParameters" :key="index" class="output-row">
                                <span class="output-num">{{ index + 1 }}</span>
                                <PairOfDimensions
                                    v-if="localData.designLevel == 'Help me with the design'"
                                    class="pe-4"
                                    :names="['voltage', 'current']"
                                    :replaceTitle="['V', 'I']"
                                    :units="['V', 'A']"
                                    :dataTestLabel="dataTestLabel + '-outputsParameters'"
                                    :mins="[minimumMaximumScalePerParameter['voltage']['min'], minimumMaximumScalePerParameter['current']['min']]"
                                    :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['current']['max']]"
                                    v-model="localData.outputsParameters[index]"
                                    :labelWidthProportionClass="'col-4'"
                                    :valueWidthProportionClass="'col-8'"
                                    :valueFontSize="$styleStore.wizard.inputFontSize"
                                    :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                                    :labelBgColor="'transparent'"
                                    :valueBgColor="$styleStore.wizard.inputValueBgColor"
                                    :textColor="localData.outputsParameters[index].voltage <= 0 || localData.outputsParameters[index].current <= 0? $styleStore.wizard.inputErrorTextColor : $styleStore.wizard.inputTextColor"
                                    @update="updateErrorMessage"
                                />
                                <TripleOfDimensions
                                    v-else
                                    class="ps-4"
                                    :names="['voltage', 'current', 'turnsRatio']"
                                    :replaceTitle="['V', 'I', 'TR']"
                                    :units="['V', 'A', null]"
                                    :dataTestLabel="dataTestLabel + '-outputsParameters'"
                                    :mins="[minimumMaximumScalePerParameter['voltage']['min'], minimumMaximumScalePerParameter['current']['min'], 0]"
                                    :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['current']['max'], 1000]"
                                    v-model="localData.outputsParameters[index]"
                                    :labelWidthProportionClass="'col-3'"
                                    :valueWidthProportionClass="'col-9'"
                                    :valueFontSize="$styleStore.wizard.inputFontSize"
                                    :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                                    :labelBgColor="'transparent'"
                                    :valueBgColor="$styleStore.wizard.inputValueBgColor"
                                    :textColor="localData.outputsParameters[index].voltage <= 0 || localData.outputsParameters[index].current <= 0? $styleStore.wizard.inputErrorTextColor : $styleStore.wizard.inputTextColor"
                                    @update="updateErrorMessage"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Column 3: Waveforms -->
            <div class="col-12 col-xl-5" ref="waveformSection">
                <div class="compact-card simulation-card h-100">
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
                            <button :disabled="errorMessage != '' || simulatingWaveforms" class="sim-btn" @click="simulateIdealWaveforms" title="Simulate ideal waveforms">
                                <span v-if="simulatingWaveforms && waveformSource === 'simulation'"><i class="fa-solid fa-spinner fa-spin"></i></span>
                                <span v-else><i class="fa-solid fa-play"></i> Simulated waveforms</span>
                            </button>
                            </div>
                        </div>
                    </div>
                    <div class="compact-body simulation-body">
                        <div v-if="waveformError" class="error-text mb-2">
                            <i class="fa-solid fa-exclamation-circle me-1"></i>{{ waveformError }}
                        </div>
                        
                        <!-- Waveform Display -->
                        <div v-if="magneticWaveforms.length > 0 || converterWaveforms.length > 0">
                            <!-- Design Summary - Compact -->
                            <div v-if="designRequirements" class="design-summary-compact mb-2">
                                <div class="d-flex gap-2 flex-wrap">
                                    <span class="param-badge">
                                        <small>L:</small> {{ getInductanceDisplay() }}
                                    </span>
                                    <span v-if="designRequirements.turnsRatios || simulatedTurnsRatios" class="param-badge">
                                        <small>n:</small> {{ getTurnsRatioDisplay() }}
                                    </span>
                                </div>
                            </div>
                            
                            <!-- View Mode Toggle - Compact (hide Converter for analytical mode) -->
                            <div v-if="waveformSource !== 'analytical'" class="view-toggle-compact mb-2">
                                <button type="button" class="toggle-sm" :class="{ active: waveformViewMode === 'magnetic' }" @click="waveformViewMode = 'magnetic'">Magnetic</button>
                                <button type="button" class="toggle-sm" :class="{ active: waveformViewMode === 'converter' }" @click="waveformViewMode = 'converter'">Converter</button>
                            </div>
                            
                            <!-- Waveform Charts - Paired voltage/current on same graph -->
                            <div v-for="(op, opIndex) in (waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms)" :key="'op-' + opIndex + '-' + waveformViewMode" class="waveforms-grid">
                                <!-- Operating Point Label -->
                                <div v-if="(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms).length > 1 || getOperatingPointLabel(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex)" class="op-label">
                                    {{ getOperatingPointLabel(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex) }}
                                </div>
                                <div v-for="(pair, pairIndex) in getPairedWaveformsList(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex)"
                                    :key="'pair-' + opIndex + '-' + pairIndex + '-' + waveformViewMode"
                                    class="waveform-item">
                                    <LineVisualizer 
                                        v-if="getPairedWaveformDataForVisualizer(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex, pairIndex).length > 0"
                                        :data="getPairedWaveformDataForVisualizer(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex, pairIndex)"
                                        :xAxisOptions="getTimeAxisOptions()"
                                        :title="getPairedWaveformTitle(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex, pairIndex)"
                                        :titleFontSize="14"
                                        :axisLabelFontSize="10"
                                        :legendLabels="['V', 'I']"
                                        :chartPaddings="{top: 35, left: 45, right: 45, bottom: 25}"
                                        :forceUpdate="forceWaveformUpdate"
                                        :bgColor="$styleStore.theme?.light || 'transparent'"
                                        :lineColor="$styleStore.theme?.primary || '#b18aea'"
                                        :textColor="$styleStore.wizard.inputTextColor?.color || '#ffffff'"
                                        :chartStyle="'height: 140px'"
                                        :toolbox="false"
                                        :showPoints="false"
                                        :showGrid="false"
                                        :showAxisLines="false"
                                        :showAxisUnitLabels="false"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <!-- Empty State - Compact -->
                        <div v-else class="empty-state-compact">
                            <i class="fa-solid fa-wave-square"></i>
                            <span>Click <b>Simulate</b> or <b>Analytical</b></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
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

/* Periods selector */
.periods-selector {
    display: flex;
    align-items: center;
    gap: 4px;
}

.periods-label {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.6);
}

.periods-select {
    background: rgba(30, 30, 40, 0.8);
    border: 1px solid rgba(177, 138, 234, 0.3);
    border-radius: 4px;
    color: #b18aea;
    font-size: 0.7rem;
    padding: 2px 4px;
    width: 40px;
}

/* Output section */
.output-select {
    background: rgba(30, 30, 40, 0.8);
    border: 1px solid rgba(177, 138, 234, 0.3);
    border-radius: 4px;
    color: #b18aea;
    font-size: 0.7rem;
    padding: 2px 4px;
    width: 45px;
}

.outputs-expand {
    max-height: 500px;
    overflow-y: auto;
}

.output-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    border-bottom: 1px solid rgba(177, 138, 234, 0.1);
}

.output-row:last-child {
    border-bottom: none;
}

.output-num {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.5);
    min-width: 20px;
}

/* Action buttons */
.action-btns {
    display: flex;
    gap: 4px;
}

.action-btn-sm {
    border: none;
    border-radius: 4px;
    padding: 4px 12px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.action-btn-sm.primary {
    background: linear-gradient(135deg, #b18aea 0%, #8b5cf6 100%);
    color: white;
}

.action-btn-sm.secondary {
    background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
    color: white;
}

.action-btn-sm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Design Summary */
.design-summary-compact {
    display: flex;
    gap: 8px;
}

.param-badge {
    background: rgba(177, 138, 234, 0.15);
    border: 1px solid rgba(177, 138, 234, 0.3);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 0.75rem;
    color: #e0e0e0;
}

.param-badge small {
    color: rgba(255, 255, 255, 0.5);
    margin-right: 4px;
}

/* View Toggle */
.view-toggle-compact {
    display: flex;
    gap: 4px;
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
    color: rgba(255, 255, 255, 0.4);
    gap: 8px;
}

.empty-state-compact i {
    font-size: 2rem;
    opacity: 0.3;
}

.empty-state-compact span {
    font-size: 0.8rem;
}

/* Error text */
.error-text {
    color: #ef4444;
    font-size: 0.8rem;
}

.btn-group .btn {
    transition: all 0.2s ease-in-out;
}

.btn-group .btn-primary {
    z-index: 2;
}

.border {
    border-color: rgba(177, 138, 234, 0.3) !important;
}
</style>