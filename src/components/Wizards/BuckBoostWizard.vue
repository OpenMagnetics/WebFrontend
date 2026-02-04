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
import MaximumDimensions from '../Toolbox/DesignRequirements/MaximumDimensions.vue'
import LineVisualizer from '/WebSharedComponents/Common/LineVisualizer.vue'
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
            numberOfPeriods: 1,
            numberOfSteadyStatePeriods: 50,
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
                
                // Call the appropriate WASM simulation based on converter type
                var result;
                if (this.converterName == "Buck") {
                    result = await this.taskQueueStore.simulateBuckIdealWaveforms(aux);
                }
                else {
                    result = await this.taskQueueStore.simulateBoostIdealWaveforms(aux);
                }
                
                this.simulatedOperatingPoints = result.operatingPoints || [];
                this.simulatedInductance = result.designRequirements?.magnetizingInductance || null;
                this.designRequirements = result.designRequirements || null;
                
                // Repeat waveforms for the selected number of periods
                this.magneticWaveforms = this.repeatWaveformForPeriods(result.magneticWaveforms || []);
                this.converterWaveforms = this.repeatWaveformForPeriods(result.converterWaveforms || []);
                
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
                        // Voltage waveform
                        if (excitation.voltage?.waveform) {
                            const wf = excitation.voltage.waveform;
                            let xData, yData;
                            
                            // Handle different data formats
                            if (wf.time && wf.data) {
                                // Format: { time: [...], data: [...] }
                                xData = [...wf.time];
                                yData = [...wf.data];
                            } else if (Array.isArray(wf.data) && wf.data[0]?.time !== undefined) {
                                // Format: { data: [{time, voltage}, ...] }
                                xData = wf.data.map(p => p.time);
                                yData = wf.data.map(p => p.voltage);
                            } else {
                                xData = null;
                                yData = null;
                            }
                            
                            if (xData && yData) {
                                // Repeat for periods
                                if (this.numberOfPeriods > 1) {
                                    const period = xData[xData.length - 1] - xData[0];
                                    const repeatedX = [...xData];
                                    const repeatedY = [...yData];
                                    for (let p = 1; p < this.numberOfPeriods; p++) {
                                        const offset = period * p;
                                        xData.slice(1).forEach(x => repeatedX.push(x + offset));
                                        yData.slice(1).forEach(y => repeatedY.push(y));
                                    }
                                    xData = repeatedX;
                                    yData = repeatedY;
                                }
                                
                                waveforms.push({
                                    label: `Winding ${windingIndex + 1} Voltage`,
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
                                    label: `Winding ${windingIndex + 1} Voltage`,
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
                                xData = [...wf.time];
                                yData = [...wf.data];
                            } else if (Array.isArray(wf.data) && wf.data[0]?.time !== undefined) {
                                // Format: { data: [{time, current}, ...] }
                                xData = wf.data.map(p => p.time);
                                yData = wf.data.map(p => p.current);
                            } else {
                                xData = null;
                                yData = null;
                            }
                            
                            if (xData && yData) {
                                // Repeat for periods
                                if (this.numberOfPeriods > 1) {
                                    const period = xData[xData.length - 1] - xData[0];
                                    const repeatedX = [...xData];
                                    const repeatedY = [...yData];
                                    for (let p = 1; p < this.numberOfPeriods; p++) {
                                        const offset = period * p;
                                        xData.slice(1).forEach(x => repeatedX.push(x + offset));
                                        yData.slice(1).forEach(y => repeatedY.push(y));
                                    }
                                    xData = repeatedX;
                                    yData = repeatedY;
                                }
                                
                                waveforms.push({
                                    label: `Winding ${windingIndex + 1} Current`,
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
                                    label: `Winding ${windingIndex + 1} Current`,
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
        repeatWaveformForPeriods(waveformsData) {
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
                    wf.label.toLowerCase().includes('magnetizing')
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
            const inductorCurrent = allWaveforms.find(wf => wf.label.toLowerCase().includes('inductor') && wf.unit === 'A');
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
                        const p1 = sorted[Math.floor(sorted.length * 0.01)];
                        const p99 = sorted[Math.floor(sorted.length * 0.99)];
                        const range = p99 - p1;
                        const margin = range * 0.2;
                        const clipMin = p1 - margin;
                        const clipMax = p99 + margin;
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
                        const p1 = sorted[Math.floor(sorted.length * 0.01)];
                        const p99 = sorted[Math.floor(sorted.length * 0.99)];
                        const range = p99 - p1;
                        const margin = range * 0.2;
                        const clipMin = p1 - margin;
                        const clipMax = p99 + margin;
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
                    const p1 = sorted[Math.floor(sorted.length * 0.01)];
                    const p99 = sorted[Math.floor(sorted.length * 0.99)];
                    const range = p99 - p1;
                    const margin = range * 0.2;
                    const clipMin = p1 - margin;
                    const clipMax = p99 + margin;
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
    <div class="wizard-container container-fluid px-3">
        <!-- Compact Header -->
        <div class="wizard-header text-center py-2 mb-3">
            <h4 class="wizard-title mb-0">
                <i class="fa-solid fa-bolt me-2"></i>{{ converterName }} Wizard
            </h4>
        </div>

        <div class="row g-2">
            <!-- Column 1: Design Mode, Current/Design Params, Conditions -->
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

                    <!-- Conditional: Design Parameters (Advanced) OR Current Options (Help) -->
                    <div v-if="localData.designLevel == 'I know the design I want'" class="compact-card">
                        <div class="compact-header"><i class="fa-solid fa-cogs me-1"></i>Design Params</div>
                        <div class="compact-body">
                            <Dimension
                                class="ps-3"
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
                        <div class="compact-header"><i class="fa-solid fa-microchip me-1"></i>Current Requirement</div>
                        <div class="compact-body ps-4">
                            <ElementFromListRadio
                                :name="'currentOptions'"
                                :dataTestLabel="dataTestLabel + '-CurrentOptions'"
                                :replaceTitle="''"
                                :options="currentOptions"
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
                            <Dimension v-if="localData.currentOptions == 'The maximum switch current'"
                                :name="'maximumSwitchCurrent'"
                                :replaceTitle="'Max Isw'"
                                unit="A"
                                :dataTestLabel="dataTestLabel + '-MaximumSwitchCurrent'"
                                :min="minimumMaximumScalePerParameter['current']['min']"
                                :max="minimumMaximumScalePerParameter['current']['max']"
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
                            <Dimension v-if="localData.currentOptions == 'The output current ratio'"
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

            <!-- Column 2: Input Voltage, Output -->
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

                    <!-- Output -->
                    <div class="compact-card">
                        <div class="compact-header">
                            <i class="fa-solid fa-arrow-right-from-bracket me-1"></i>Output
                        </div>
                        <div class="compact-body">
                            <PairOfDimensions
                                class="pe-4"
                                :names="['voltage', 'current']"
                                :replaceTitle="['Volt.', 'Curr.']"
                                :units="['V', 'A']"
                                :dataTestLabel="dataTestLabel + '-outputsParameters'"
                                :mins="[minimumMaximumScalePerParameter['voltage']['min'], minimumMaximumScalePerParameter['current']['min']]"
                                :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['current']['max']]"
                                v-model="localData.outputsParameters"
                                :labelWidthProportionClass="'col-4'"
                                :valueWidthProportionClass="'col-8'"
                                :valueFontSize="$styleStore.wizard.inputFontSize"
                                :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                                :labelBgColor="'transparent'"
                                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                                :textColor="localData.outputsParameters.voltage <= 0 || localData.outputsParameters.current <= 0 ? $styleStore.wizard.inputErrorTextColor : $styleStore.wizard.inputTextColor"
                                @update="updateErrorMessage"
                            />
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
                                    <span class="param-badge">
                                        <small>D:</small> {{ getDutyCycleDisplay() }}
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
                                <div v-for="(pair, pairIndex) in getPairedWaveformsList(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex, waveformViewMode === 'magnetic')"
                                    :key="'pair-' + opIndex + '-' + pairIndex + '-' + waveformViewMode"
                                    class="waveform-item">
                                    <LineVisualizer 
                                        v-if="getPairedWaveformDataForVisualizer(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex, pairIndex, waveformViewMode === 'magnetic').length > 0"
                                        :data="getPairedWaveformDataForVisualizer(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex, pairIndex, waveformViewMode === 'magnetic')"
                                        :xAxisOptions="getTimeAxisOptions()"
                                        :title="getPairedWaveformTitle(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex, pairIndex, waveformViewMode === 'magnetic')"
                                        :titleFontSize="14"
                                        :axisLabelFontSize="9"
                                        :legendLabels="isVoltagePairAtIndex(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex, pairIndex, waveformViewMode === 'magnetic') ? ['Vin', 'Vout'] : ['V', 'I']"
                                        :chartPaddings="{top: 45, left: 40, right: 40, bottom: 20}"
                                        :forceUpdate="forceWaveformUpdate"
                                        :forceAxisMin="getVoltagePairAxisLimits(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex, pairIndex, waveformViewMode === 'magnetic').forceAxisMin"
                                        :forceAxisMax="getVoltagePairAxisLimits(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex, pairIndex, waveformViewMode === 'magnetic').forceAxisMax"
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
/* Compact Container */
.wizard-container {
    max-width: 1800px;
    margin: 0 auto;
}

/* Compact Header */
.wizard-header {
    background: linear-gradient(135deg, rgba(177, 138, 234, 0.12) 0%, rgba(100, 80, 180, 0.08) 100%);
    border-radius: 10px;
    border: 1px solid rgba(177, 138, 234, 0.2);
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
}

.compact-body {
    padding: 8px;
}

/* Simulation Card */
.simulation-card {
    min-height: 300px;
}

.simulation-body {
    min-height: 250px;
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

/* Error Text */
.error-text {
    color: #ff6b6b;
    font-size: 0.75rem;
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

/* Design Summary Compact */
.design-summary-compact {
    background: rgba(177, 138, 234, 0.08);
    border-radius: 6px;
    padding: 6px 8px;
}

.param-badge {
    background: rgba(30, 30, 40, 0.6);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 0.75rem;
    color: #b18aea;
}

.param-badge small {
    color: rgba(255, 255, 255, 0.5);
    margin-right: 3px;
}

/* View Toggle Compact */
.view-toggle-compact {
    display: flex;
    gap: 4px;
    background: rgba(30, 30, 40, 0.5);
    padding: 2px;
    border-radius: 6px;
    width: fit-content;
}

.toggle-sm {
    background: transparent;
    border: none;
    border-radius: 4px;
    padding: 3px 10px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.7rem;
    cursor: pointer;
}

.toggle-sm.active {
    background: rgba(177, 138, 234, 0.25);
    color: #b18aea;
}

/* Waveforms Grid */
.waveforms-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    margin-bottom: 8px;
}

.op-label {
    grid-column: 1 / -1;
    font-size: 11px;
    font-weight: 500;
    color: rgba(177, 138, 234, 0.9);
    padding: 2px 6px;
    background: rgba(177, 138, 234, 0.1);
    border-radius: 4px;
    text-align: center;
    margin-bottom: 4px;
}

.waveform-item {
    background: rgba(20, 20, 30, 0.5);
    border: 1px solid rgba(177, 138, 234, 0.1);
    border-radius: 6px;
    padding: 4px;
}

/* Empty State Compact */
.empty-state-compact {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.8rem;
}

.empty-state-compact i {
    font-size: 1.5rem;
    margin-bottom: 8px;
    color: rgba(177, 138, 234, 0.4);
}

/* Responsive */
@media (max-width: 1399px) {
    .waveforms-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 991px) {
    .compact-card {
        margin-bottom: 8px;
    }
}
</style>