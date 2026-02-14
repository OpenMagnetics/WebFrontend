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
import { defaultBuckWizardInputs, defaultBoostWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from '/WebSharedComponents/assets/js/defaults.js'
import ConverterWizardBase from './ConverterWizardBase.vue'
</script>

<script>

export default {
    props: {
        converterName: {
            type: String,
            default: 'Buck',
        },
        dataTestLabel: {
            type: String,
            default: 'BuckWizard',
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
        const currentOptions = ['The output current ratio', 'The maximum switch current'];
        const errorMessage = "";
        var localData = {};
        if (this.converterName == "Buck") {
            localData = deepCopy(defaultBuckWizardInputs);
        }
        else {
            localData = deepCopy(defaultBoostWizardInputs);
        }

        localData["currentOptions"] = currentOptions[0];
        return {
            masStore,
            taskQueueStore,
            designLevelOptions,
            currentOptions,
            localData,
            errorMessage,
            simulatingWaveforms: false,
            waveformSource: null, // 'simulation' or 'analytical'
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
    },
    watch: {
        waveformViewMode() {
            this.$nextTick(() => {
                this.forceWaveformUpdate += 1;
            });
        },
    },
    mounted () {
        this.updateErrorMessage();
    },
    methods: {
        async pruneHarmonicsForInputs(inputs) {
            // Prune harmonics for all operating points and excitations
            const currentThreshold = 0.1;
            const voltageThreshold = 0.3;
            
            for (const op of inputs.operatingPoints) {
                if (op.excitationsPerWinding) {
                    for (const excitation of op.excitationsPerWinding) {
                        const frequency = excitation.frequency;
                        
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
            if (this.converterName == "Buck") {
                if (this.localData.inputVoltage.minimum < this.localData.outputsParameters.voltage) {
                    this.errorMessage = "Minimum input voltage cannot be smaller than output voltage";
                }
                if (this.localData.inputVoltage.maximum < this.localData.outputsParameters.voltage) {
                    this.errorMessage = "Maximum input voltage cannot be smaller than output voltage";
                }
            }
            else {
                if (this.localData.inputVoltage.minimum > this.localData.outputsParameters.voltage) {
                    this.errorMessage = "Minimum input voltage cannot be larger than output voltage";
                }
                if (this.localData.inputVoltage.maximum > this.localData.outputsParameters.voltage) {
                    this.errorMessage = "Maximum input voltage cannot be larger than output voltage";
                }
            }
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
                }
                else {
                    if (this.localData.currentOptions == 'The output current ratio') {
                        aux['currentRippleRatio'] = this.localData.currentRippleRatio;
                    }
                    else {
                        aux['maximumSwitchCurrent'] = this.localData.maximumSwitchCurrent;
                    }
                }

                const auxOperatingPoint = {};
                auxOperatingPoint['outputVoltage'] = this.localData.outputsParameters.voltage;
                auxOperatingPoint['outputCurrent'] = this.localData.outputsParameters.current;
                auxOperatingPoint['switchingFrequency'] = this.localData.switchingFrequency;
                auxOperatingPoint['ambientTemperature'] = this.localData.ambientTemperature;
                aux['operatingPoints'] = [auxOperatingPoint];

                var inputs;
                if (this.localData.designLevel == 'I know the design I want') {
                    if (this.converterName == "Buck") {
                        inputs = await this.taskQueueStore.calculateAdvancedBuckInputs(aux);
                    }
                    else {
                        inputs = await this.taskQueueStore.calculateAdvancedBoostInputs(aux);
                    }
                }
                else {
                    if (this.converterName == "Buck") {
                        inputs = await this.taskQueueStore.calculateBuckInputs(aux);
                    }
                    else {
                        inputs = await this.taskQueueStore.calculateBoostInputs(aux);
                    }
                }

                // Prune harmonics for better Fourier graph display
                inputs = await this.pruneHarmonicsForInputs(inputs);

                this.masStore.mas.inputs = inputs;

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

            if (this.errorMessage == "") {
                this.$stateStore.resetMagneticTool();
                this.$stateStore.designLoaded();
                this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Power);
                this.$stateStore.selectWorkflow("design");
                this.$stateStore.selectTool("agnosticTool");
                this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
                this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
                this.$stateStore.operatingPoints.modePerPoint = [];
                this.masStore.mas.inputs.operatingPoints.forEach((_) => {
                    this.$stateStore.operatingPoints.modePerPoint.push(this.$stateStore.OperatingPointsMode.Manual);
                })
                if (this.errorMessage == "") {
                    setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);}, 100);
                }
                else {
                    setTimeout(() => {this.errorMessage = ""}, 5000);
                }
            }
        },
        async processAndAdvise() {
            await this.process();
            if (this.errorMessage == "") {
                this.$stateStore.resetMagneticTool();
                this.$stateStore.designLoaded();
                this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Power);
                this.$stateStore.selectWorkflow("design");
                this.$stateStore.selectTool("agnosticTool");
                this.$stateStore.setCurrentToolSubsection("magneticBuilder");
                this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
                this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
                this.$stateStore.operatingPoints.modePerPoint = [];
                this.masStore.mas.inputs.operatingPoints.forEach((_) => {
                    this.$stateStore.operatingPoints.modePerPoint.push(this.$stateStore.OperatingPointsMode.Manual);
                })
                if (this.errorMessage == "") {
                    setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);}, 100);
                }
                else {
                    setTimeout(() => {this.errorMessage = ""}, 5000);
                }
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
                }
                else {
                    if (this.localData.currentOptions == 'The output current ratio') {
                        aux['currentRippleRatio'] = this.localData.currentRippleRatio;
                    }
                    else {
                        aux['maximumSwitchCurrent'] = this.localData.maximumSwitchCurrent;
                    }
                }
                
                const auxOperatingPoint = {};
                auxOperatingPoint['outputVoltage'] = this.localData.outputsParameters.voltage;
                auxOperatingPoint['outputCurrent'] = this.localData.outputsParameters.current;
                auxOperatingPoint['switchingFrequency'] = this.localData.switchingFrequency;
                auxOperatingPoint['ambientTemperature'] = this.localData.ambientTemperature;
                aux['operatingPoints'] = [auxOperatingPoint];
                aux['numberOfPeriods'] = parseInt(this.numberOfPeriods, 10);
                aux['numberOfSteadyStatePeriods'] = parseInt(this.numberOfSteadyStatePeriods, 10);
                
                // Call the appropriate WASM simulation based on converter type
                var result;
                if (this.converterName == "Buck") {
                    result = await this.taskQueueStore.simulateBuckIdealWaveforms(aux);
                }
                else {
                    result = await this.taskQueueStore.simulateBoostIdealWaveforms(aux);
                }
                
                this.simulatedOperatingPoints = result.inputs?.operatingPoints || result.operatingPoints || [];
                this.designRequirements = result.inputs?.designRequirements || result.designRequirements || null;
                this.simulatedInductance = this.designRequirements?.magnetizingInductance || null;
                
                // Build magnetic waveforms from operating points
                this.magneticWaveforms = this.buildMagneticWaveformsFromInputs(this.simulatedOperatingPoints);
                this.converterWaveforms = this.convertConverterWaveforms(result.converterWaveforms || []);
                
                this.$nextTick(() => {
                    this.forceWaveformUpdate += 1;
                    if (this.$refs.waveformSection) {
                        this.$refs.waveformSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
                
            } catch (error) {
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
                // Build the converter parameters in the format expected by WASM
                const params = {};
                params['inputVoltage'] = this.localData.inputVoltage;
                params['diodeVoltageDrop'] = this.localData.diodeVoltageDrop;
                params['efficiency'] = this.localData.efficiency;
                
                if (this.localData.designLevel == 'I know the design I want') {
                    params['desiredInductance'] = this.localData.inductance;
                }
                else {
                    if (this.localData.currentOptions == 'The output current ratio') {
                        params['currentRippleRatio'] = this.localData.currentRippleRatio;
                    }
                    else {
                        params['maximumSwitchCurrent'] = this.localData.maximumSwitchCurrent;
                    }
                }
                
                const operatingPoint = {};
                operatingPoint['outputVoltage'] = this.localData.outputsParameters.voltage;
                operatingPoint['outputCurrent'] = this.localData.outputsParameters.current;
                operatingPoint['switchingFrequency'] = this.localData.switchingFrequency;
                operatingPoint['ambientTemperature'] = this.localData.ambientTemperature;
                params['operatingPoints'] = [operatingPoint];
                params['numberOfPeriods'] = parseInt(this.numberOfPeriods, 10);
                
                // Call appropriate calculate*Inputs based on converter type
                let inputs;
                if (this.converterName == "Buck") {
                    inputs = await this.taskQueueStore.calculateBuckInputs(params);
                } else {
                    inputs = await this.taskQueueStore.calculateBoostInputs(params);
                }
                
                this.designRequirements = inputs.designRequirements;
                this.simulatedInductance = inputs.designRequirements?.magnetizingInductance || null;
                this.simulatedOperatingPoints = inputs.operatingPoints || [];
                
                // Build magnetic waveforms from operating points
                this.magneticWaveforms = this.buildMagneticWaveformsFromInputs(inputs.operatingPoints);
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
        // Synthesize time-domain waveform from harmonics (Fourier synthesis)
        synthesizeWaveformFromHarmonics(harmonics, frequency, numPoints = 200) {
            if (!harmonics?.amplitudes || !harmonics?.frequencies || harmonics.amplitudes.length === 0) {
                return null;
            }
            
            const period = 1 / frequency;
            const xData = [];
            const yData = [];
            
            for (let i = 0; i < numPoints; i++) {
                const t = (i / numPoints) * period * this.numberOfPeriods;
                xData.push(t);
                
                let value = 0;
                for (let h = 0; h < harmonics.amplitudes.length; h++) {
                    const amplitude = harmonics.amplitudes[h];
                    const freq = harmonics.frequencies[h];
                    const phase = harmonics.phases ? harmonics.phases[h] : 0;
                    
                    if (freq === 0) {
                        // DC component
                        value += amplitude;
                    } else {
                        // AC component
                        value += amplitude * Math.cos(2 * Math.PI * freq * t + phase);
                    }
                }
                yData.push(value);
            }
            
            return { x: xData, y: yData };
        },
        buildMagneticWaveformsFromInputs(operatingPoints) {
            if (!operatingPoints || operatingPoints.length === 0) return [];
            
            const result = [];
            
            for (let opIndex = 0; opIndex < operatingPoints.length; opIndex++) {
                const op = operatingPoints[opIndex];
                const waveforms = [];
                
                // Get switching frequency from excitation
                const frequency = op.excitationsPerWinding?.[0]?.frequency || this.localData.switchingFrequency;
                
                if (op.excitationsPerWinding) {
                    op.excitationsPerWinding.forEach((excitation, windingIndex) => {
                        const windingLabel = windingIndex === 0 ? 'Primary' : `Secondary ${windingIndex}`;
                        
                        // Voltage waveform
                        if (excitation.voltage?.waveform) {
                            const wf = excitation.voltage.waveform;
                            let xData, yData;
                            
                            // Handle different data formats
                            if (wf.time && wf.data) {
                                // Format: { time: [...], data: [...] }
                                xData = wf.time;
                                yData = wf.data;
                            } else if (Array.isArray(wf.data) && wf.data[0]?.time !== undefined) {
                                // Format: { data: [{time, voltage}, ...] }
                                xData = wf.data.map(p => p.time);
                                yData = wf.data.map(p => p.voltage);
                            } else {
                                xData = null;
                                yData = null;
                            }
                            
                            if (xData && yData) {
                                waveforms.push({
                                    label: `${windingLabel} Voltage`,
                                    x: xData,
                                    y: yData,
                                    unit: 'V'
                                });
                            }
                        }
                        
                        // Fall back to harmonics if no valid waveform data
                        if (waveforms.filter(w => w.label.includes('Voltage')).length === 0 && excitation.voltage?.harmonics) {
                            const synthesized = this.synthesizeWaveformFromHarmonics(excitation.voltage.harmonics, frequency);
                            if (synthesized) {
                                waveforms.push({
                                    label: `${windingLabel} Voltage`,
                                    x: synthesized.x,
                                    y: synthesized.y,
                                    unit: 'V'
                                });
                            }
                        }
                        
                        // Current waveform
                        if (excitation.current?.waveform) {
                            const wf = excitation.current.waveform;
                            let xData, yData;
                            
                            // Handle different data formats
                            if (wf.time && wf.data) {
                                // Format: { time: [...], data: [...] }
                                xData = wf.time;
                                yData = wf.data;
                            } else if (Array.isArray(wf.data) && wf.data[0]?.time !== undefined) {
                                // Format: { data: [{time, current}, ...] }
                                xData = wf.data.map(p => p.time);
                                yData = wf.data.map(p => p.current);
                            } else {
                                xData = null;
                                yData = null;
                            }
                            
                            if (xData && yData) {
                                waveforms.push({
                                    label: `${windingLabel} Current`,
                                    x: xData,
                                    y: yData,
                                    unit: 'A'
                                });
                            }
                        }
                        
                        // Fall back to harmonics if no valid waveform data
                        if (waveforms.filter(w => w.label.includes('Current')).length === 0 && excitation.current?.harmonics) {
                            const synthesized = this.synthesizeWaveformFromHarmonics(excitation.current.harmonics, frequency);
                            if (synthesized) {
                                waveforms.push({
                                    label: `${windingLabel} Current`,
                                    x: synthesized.x,
                                    y: synthesized.y,
                                    unit: 'A'
                                });
                            }
                        }
                    });
                }
                
                result.push({ waveforms });
            }
            
            return result;
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
        getPairedWaveformsList(waveforms, operatingPointIndex, isMagnetic = false) {
            if (!waveforms || !waveforms[operatingPointIndex] || !waveforms[operatingPointIndex].waveforms) {
                return [];
            }
            
            let allWaveforms = waveforms[operatingPointIndex].waveforms;
            
            // For magnetic view, filter to only show winding/inductor waveforms (not switch node)
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
                
                // Standard V/I pairing for magnetic view
                for (let i = 0; i < allWaveforms.length; i++) {
                    if (used.has(i)) continue;
                    
                    const wf = allWaveforms[i];
                    const isVoltage = wf.unit === 'V';
                    const isCurrent = wf.unit === 'A';
                    
                    // Find matching pair
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
                        used.add(i);
                        used.add(pairIndex);
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
            
            // For converter view, create specific groupings:
            // 1. Switch Node Voltage + Inductor Current
            // 2. Input Voltage + Output Voltage (both on same graph)
            const pairs = [];
            
            // Find specific waveforms by label
            const switchNodeVoltage = allWaveforms.find(wf => wf.label.toLowerCase().includes('switch node'));
            const inductorCurrent = allWaveforms.find(wf => 
                (wf.label.toLowerCase().includes('inductor') || wf.label.toLowerCase().includes('primary')) && 
                wf.unit === 'A'
            );
            const inputVoltage = allWaveforms.find(wf => wf.label.toLowerCase().includes('input') && wf.unit === 'V');
            const outputVoltage = allWaveforms.find(wf => wf.label.toLowerCase().includes('output') && wf.unit === 'V');
            
            // Pair 1: Switch Node Voltage + Inductor Current
            if (switchNodeVoltage || inductorCurrent) {
                pairs.push({
                    voltageWf: switchNodeVoltage || null,
                    currentWf: inductorCurrent || null
                });
            }
            
            // Pair 2: Input Voltage + Output Voltage (special pair - both are voltages)
            if (inputVoltage || outputVoltage) {
                pairs.push({
                    leftWf: inputVoltage || null,
                    rightWf: outputVoltage || null,
                    isVoltagePair: true
                });
            }
            
            return pairs;
        },
        getPairedWaveformDataForVisualizer(waveforms, operatingPointIndex, pairIndex, isMagnetic = false) {
            const pairs = this.getPairedWaveformsList(waveforms, operatingPointIndex, isMagnetic);
            if (!pairs || pairIndex >= pairs.length) return [];
            
            const pair = pairs[pairIndex];
            const result = [];
            
            // Handle special voltage pair (Input + Output voltage)
            if (pair.isVoltagePair) {
                // Add left voltage (Input) - left axis
                if (pair.leftWf) {
                    const wf = pair.leftWf;
                    let yData = wf.y;
                    
                    // Clip extreme values
                    if (yData && yData.length > 0) {
                        const sorted = [...yData].sort((a, b) => a - b);
                        const p5 = sorted[Math.floor(sorted.length * 0.05)];
                        const p95 = sorted[Math.floor(sorted.length * 0.95)];
                        const range = p95 - p5;
                        const margin = range * 0.1;
                        const clipMin = p5 - margin;
                        const clipMax = p95 + margin;
                        yData = yData.map(v => Math.max(clipMin, Math.min(clipMax, v)));
                    }
                    
                    result.push({
                        label: wf.label,
                        data: { x: wf.x, y: yData },
                        colorLabel: this.$styleStore.operatingPoints?.voltageGraph?.color || '#b18aea',
                        type: 'value',
                        position: 'left',
                        unit: 'V',
                        numberDecimals: 2,
                    });
                }
                
                // Add right voltage (Output) - right axis with different color
                if (pair.rightWf) {
                    const wf = pair.rightWf;
                    let yData = wf.y;
                    
                    // Clip extreme values
                    if (yData && yData.length > 0) {
                        const sorted = [...yData].sort((a, b) => a - b);
                        const p5 = sorted[Math.floor(sorted.length * 0.05)];
                        const p95 = sorted[Math.floor(sorted.length * 0.95)];
                        const range = p95 - p5;
                        const margin = range * 0.1;
                        const clipMin = p5 - margin;
                        const clipMax = p95 + margin;
                        yData = yData.map(v => Math.max(clipMin, Math.min(clipMax, v)));
                    }
                    
                    result.push({
                        label: wf.label,
                        data: { x: wf.x, y: yData },
                        colorLabel: '#FF9800',  // Orange for output voltage
                        type: 'value',
                        position: 'right',
                        unit: 'V',
                        numberDecimals: 2,
                    });
                }
                
                return result;
            }
            
            // Standard voltage + current pair
            // Add voltage waveform
            if (pair.voltageWf) {
                const wf = pair.voltageWf;
                let yData = wf.y;
                
                // Clip extreme values for voltage
                if (yData && yData.length > 0) {
                    const sorted = [...yData].sort((a, b) => a - b);
                    const p5 = sorted[Math.floor(sorted.length * 0.05)];
                    const p95 = sorted[Math.floor(sorted.length * 0.95)];
                    const range = p95 - p5;
                    const margin = range * 0.1;
                    const clipMin = p5 - margin;
                    const clipMax = p95 + margin;
                    yData = yData.map(v => Math.max(clipMin, Math.min(clipMax, v)));
                }
                
                result.push({
                    label: wf.label,
                    data: { x: wf.x, y: yData },
                    colorLabel: this.$styleStore.operatingPoints?.voltageGraph?.color || '#b18aea',
                    type: 'value',
                    position: 'left',
                    unit: 'V',
                    numberDecimals: 2,
                });
            }
            
            // Add current waveform
            if (pair.currentWf) {
                const wf = pair.currentWf;
                result.push({
                    label: wf.label,
                    data: { x: wf.x, y: wf.y },
                    colorLabel: this.$styleStore.operatingPoints?.currentGraph?.color || '#4CAF50',
                    type: 'value',
                    position: 'right',
                    unit: 'A',
                    numberDecimals: 4,
                });
            }
            
            return result;
        },
        getPairedWaveformTitle(waveforms, operatingPointIndex, pairIndex, isMagnetic = false) {
            const pairs = this.getPairedWaveformsList(waveforms, operatingPointIndex, isMagnetic);
            if (!pairs || pairIndex >= pairs.length) return '';
            
            const pair = pairs[pairIndex];
            
            // Handle voltage pair (Input/Output)
            if (pair.isVoltagePair) {
                return 'Input & Output Voltage';
            }
            
            // Check if this is Switch Node + Inductor Current pair
            if (pair.voltageWf && pair.voltageWf.label.toLowerCase().includes('switch node')) {
                return 'Switch Node';
            }
            
            // Get label prefix (e.g., "Winding 1" from "Winding 1 Voltage")
            let labelPrefix = '';
            if (pair.voltageWf) {
                labelPrefix = pair.voltageWf.label.replace(/(Voltage|Current)/i, '').trim();
            } else if (pair.currentWf) {
                labelPrefix = pair.currentWf.label.replace(/(Voltage|Current)/i, '').trim();
            }
            
            return labelPrefix || 'Waveform';
        },
        isVoltagePairAtIndex(waveforms, operatingPointIndex, pairIndex, isMagnetic) {
            const pairs = this.getPairedWaveformsList(waveforms, operatingPointIndex, isMagnetic);
            if (!pairs || pairIndex >= pairs.length) return false;
            return pairs[pairIndex].isVoltagePair === true;
        },
        getVoltagePairAxisLimits(waveforms, operatingPointIndex, pairIndex, isMagnetic) {
            // Returns { forceAxisMin: [min, min], forceAxisMax: [max, max] } for voltage pair
            // or null if not a voltage pair
            if (!this.isVoltagePairAtIndex(waveforms, operatingPointIndex, pairIndex, isMagnetic)) {
                return { forceAxisMin: null, forceAxisMax: null };
            }
            
            const data = this.getPairedWaveformDataForVisualizer(waveforms, operatingPointIndex, pairIndex, isMagnetic);
            if (!data || data.length < 2) {
                return { forceAxisMin: [0, 0], forceAxisMax: null };
            }
            
            // Get max of both voltage series
            const maxLeft = Math.max(...data[0].data.y);
            const maxRight = Math.max(...data[1].data.y);
            const sharedMax = Math.max(maxLeft, maxRight) * 1.1; // Add 10% margin
            
            return {
                forceAxisMin: [0, 0],
                forceAxisMax: [sharedMax, sharedMax]
            };
        },

        getPairedWaveformAxisLimits(waveforms, operatingPointIndex, pairIndex, isMagnetic) {
            // Returns { min: [vMin, iMin], max: [vMax, iMax] } for voltage/current pairs
            const pairs = this.getPairedWaveformsList(waveforms, operatingPointIndex, isMagnetic);
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
        getOperatingPointLabel(waveforms, operatingPointIndex) {
            if (!waveforms || waveforms.length <= 1) return '';
            return `Operating Point ${operatingPointIndex + 1}`;
        },
        getTimeAxisOptions() {
            return {
                label: 'Time',
                colorLabel: '#d4d4d4',
                type: 'value',
                unit: 's',
            };
        },
    }
}

</script>

<template>
  <ConverterWizardBase
    :title="converterName + ' Wizard'"
    titleIcon="fa-battery-half"
    subtitle="DC-DC Step Down/Up Converter"
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

    <template #design-or-switch-parameters-title>
      <div class="compact-header"><i class="fa-solid fa-cogs me-1"></i>{{ localData.designLevel == 'I know the design I want' ? 'Design Params' : 'Current Requirement' }}</div>
    </template>

    <template #design-or-switch-parameters>
      <div v-if="localData.designLevel == 'I know the design I want'">
        <Dimension
          :name="'inductance'" :replaceTitle="'Inductance'" unit="H"
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
          :name="'maximumSwitchCurrent'" :replaceTitle="'Max Isw'" unit="A"
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
          :name="'currentRippleRatio'" :replaceTitle="'Ripple'" unit="%" :visualScale="100"
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
      <Dimension :name="'switchingFrequency'" :replaceTitle="'Sw. Frequency'" unit="Hz"
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
      <Dimension :name="'diodeVoltageDrop'" :replaceTitle="'Diode Vd'" unit="V"
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
      <Dimension :name="'efficiency'" :replaceTitle="'Efficiency'" unit="%" :visualScale="100"
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
      <DimensionWithTolerance
        :name="'inputVoltage'" :replaceTitle="''" unit="V"
        :dataTestLabel="dataTestLabel + '-InputVoltage'"
        :min="minimumMaximumScalePerParameter['voltage']['min']"
        :max="minimumMaximumScalePerParameter['voltage']['max']"
        :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-4'"
        v-model="localData.inputVoltage"
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

    <template #outputs>
      <Dimension
        :name="'voltage'" :replaceTitle="'Voltage'" unit="V"
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
        :name="'current'" :replaceTitle="'Current'" unit="A"
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
  </ConverterWizardBase>
</template>
