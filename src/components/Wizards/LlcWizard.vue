<script setup>
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
import LineVisualizer from '/WebSharedComponents/Common/LineVisualizer.vue'
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
        const localData = {
            inputVoltage: { nominal: 400, tolerance: 0.1 },
            outputVoltage: 48,
            outputPower: 500,
            minSwitchingFrequency: 80000,
            maxSwitchingFrequency: 120000,
            resonantFrequency: 100000,
            qualityFactor: 0.4,
            integratedResonantInductor: true,
            magnetizingInductance: 200e-6,
            turnsRatio: 4.0,
            ambientTemperature: 25,
            efficiency: 0.97,
            insulationType: 'Basic',
        };
        const insulationTypes = ['No', 'Basic', 'Reinforced'];
        return {
            masStore,
            taskQueueStore,
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
                const aux = {
                    inputVoltage: this.localData.inputVoltage,
                    minSwitchingFrequency: this.localData.minSwitchingFrequency,
                    maxSwitchingFrequency: this.localData.maxSwitchingFrequency,
                    resonantFrequency: this.localData.resonantFrequency,
                    qualityFactor: this.localData.qualityFactor,
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
                    const result = {
                        masInputs: {
                            designRequirements: this.designRequirements,
                            operatingPoints: this.simulatedOperatingPoints
                        }
                    };
                    this.masStore.setInputs(result.masInputs);
                } else {
                    // Use analytical calculation
                    const result = await this.taskQueueStore.calculateLlcInputs(aux);
                    if (result.error) {
                        this.errorMessage = result.error;
                        return false;
                    }
                    this.masStore.setInputs(result.masInputs);
                    this.designRequirements = result.designRequirements;
                    this.simulatedTurnsRatios = result.simulatedTurnsRatios;
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
                    minSwitchingFrequency: this.localData.minSwitchingFrequency,
                    maxSwitchingFrequency: this.localData.maxSwitchingFrequency,
                    resonantFrequency: this.localData.resonantFrequency,
                    qualityFactor: this.localData.qualityFactor,
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
                const result = await this.taskQueueStore.calculateLlcInputs(aux);
                if (result.error) {
                    this.waveformError = result.error;
                } else {
                    this.designRequirements = result.designRequirements;
                    this.simulatedMagnetizingInductance = result.computedResonantInductance || this.localData.magnetizingInductance;
                    this.simulatedTurnsRatios = result.designRequirements?.turnsRatios?.map(tr => tr.nominal) || [this.localData.turnsRatio];
                    
                    // Process waveforms
                    const processedWaveforms = (result.magneticWaveforms || []).map(wf => ({
                        ...wf,
                        waveforms: (wf.waveforms || []).filter(w => 
                            w && w.x && w.y && Array.isArray(w.x) && Array.isArray(w.y) && w.x.length > 0 && w.y.length > 0
                        ).map(w => ({
                            label: w.label || 'Unknown',
                            data: { x: w.x, y: w.y },
                            colorLabel: w.color || '#b18aea',
                            type: 'value',
                            position: 'left',
                            unit: w.unit || 'A',
                            numberDecimals: 3
                        }))
                    })).filter(wf => wf.waveforms.length > 0);
                    
                    this.magneticWaveforms = processedWaveforms;
                    this.simulatedOperatingPoints = result.operatingPoints || [];
                    
                    this.$nextTick(() => {
                        this.forceWaveformUpdate += 1;
                    });
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
                    minSwitchingFrequency: this.localData.minSwitchingFrequency,
                    maxSwitchingFrequency: this.localData.maxSwitchingFrequency,
                    resonantFrequency: this.localData.resonantFrequency,
                    qualityFactor: this.localData.qualityFactor,
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
                
                this.simulatedOperatingPoints = result.operatingPoints || [];
                this.designRequirements = result.designRequirements || null;
                this.simulatedMagnetizingInductance = result.magnetizingInductance || null;
                this.simulatedTurnsRatios = result.turnsRatios || null;
                
                // Process magnetic waveforms
                if (result.magneticWaveforms) {
                    this.magneticWaveforms = this.repeatWaveformsForPeriods(result.magneticWaveforms);
                }
                
                // Process converter waveforms
                if (result.converterWaveforms) {
                    this.converterWaveforms = this.repeatWaveformsForPeriods(result.converterWaveforms);
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
    <div class="wizard-container container-fluid px-3">
        <div class="wizard-header text-center py-2 mb-3">
            <h4 class="wizard-title mb-0"><i class="fa-solid fa-wave-square me-2"></i>LLC Wizard</h4>
        </div>
        <div class="row g-2">
            <div class="col-12 col-xl-3">
                <div class="d-flex flex-column gap-2">
                    <div class="compact-card">
                        <div class="compact-header"><i class="fa-solid fa-gauge-high me-1"></i>Freq Range</div>
                        <div class="compact-body ps-4">
                            <Dimension :name="'minSwitchingFrequency'" :replaceTitle="'Min Freq'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                            <Dimension :name="'maxSwitchingFrequency'" :replaceTitle="'Max Freq'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                            <Dimension :name="'resonantFrequency'" :replaceTitle="'Res Freq'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                        </div>
                    </div>
                    <div class="compact-card">
                        <div class="compact-header"><i class="fa-solid fa-gauge-high me-1"></i>Conditions</div>
                        <div class="compact-body ps-4">
                            <Dimension :name="'ambientTemperature'" :replaceTitle="'Temp'" unit="°C" :min="minimumMaximumScalePerParameter['temperature']['min']" :max="minimumMaximumScalePerParameter['temperature']['max']" :allowNegative="true" :allowZero="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                            <Dimension :name="'efficiency'" :replaceTitle="'Eff'" unit="%" :visualScale="100" :min="0.5" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                            <ElementFromList :name="'insulationType'" :replaceTitle="'Insul'" :options="insulationTypes" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                        </div>
                    </div>
                    <div class="compact-card">
                        <div class="compact-header"><i class="fa-solid fa-cogs me-1"></i>Tank</div>
                        <div class="compact-body ps-4">
                            <Dimension :name="'qualityFactor'" :replaceTitle="'Q Factor'" :unit="null" :min="0.1" :max="2" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                            <Dimension :name="'turnsRatio'" :replaceTitle="'Turns'" :unit="null" :min="0.1" :max="100" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                            <Dimension :name="'magnetizingInductance'" :replaceTitle="'Mag L'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                            <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.integratedResonantInductor" id="integratedResonantInductor"><label class="form-check-label small" for="integratedResonantInductor" :style="{ color: $styleStore.wizard.inputTextColor }">Integrated Res L</label></div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center justify-content-between mt-2">
                        <span v-if="errorMessage" class="error-text"><i class="fa-solid fa-exclamation-triangle me-1"></i>{{ errorMessage }}</span>
                        <span v-else></span>
                        <div class="action-btns">
                            <button :disabled="errorMessage != ''" class="action-btn-sm secondary" @click="processAndReview"><i class="fa-solid fa-magnifying-glass me-1"></i>Review Specs</button>
                            <button :disabled="errorMessage != ''" class="action-btn-sm primary" @click="processAndAdvise"><i class="fa-solid fa-wand-magic-sparkles me-1"></i>Design Magnetic</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-12 col-xl-4">
                <div class="d-flex flex-column gap-2">
                    <div class="compact-card">
                        <div class="compact-header"><i class="fa-solid fa-plug me-1"></i>Input Voltage</div>
                        <div class="compact-body">
                            <DimensionWithTolerance :name="'inputVoltage'" :replaceTitle="''" unit="V" :min="minimumMaximumScalePerParameter['voltage']['min']" :max="minimumMaximumScalePerParameter['voltage']['max']" :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-4'" v-model="localData.inputVoltage" :severalRows="true" :addButtonStyle="$styleStore.wizard.addButton" :removeButtonBgColor="$styleStore.wizard.removeButton['background-color']" :titleFontSize="$styleStore.wizard.inputLabelFontSize" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                        </div>
                    </div>
                    <div class="compact-card">
                        <div class="compact-header"><i class="fa-solid fa-arrow-right-from-bracket me-1"></i>Output</div>
                        <div class="compact-body ps-4">
                            <Dimension :name="'outputVoltage'" :replaceTitle="'Voltage'" unit="V" :min="minimumMaximumScalePerParameter['voltage']['min']" :max="minimumMaximumScalePerParameter['voltage']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                            <Dimension :name="'outputPower'" :replaceTitle="'Power'" unit="W" :min="1" :max="minimumMaximumScalePerParameter['power']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-12 col-xl-5">
                <div class="compact-card simulation-card h-100">
                    <div class="compact-header d-flex justify-content-between align-items-center">
                        <span><i class="fa-solid fa-wave-square me-1"></i>Waveforms</span>
                        <div class="d-flex align-items-center gap-2">
                            <div class="periods-selector">
                                <label class="periods-label">Periods:</label>
                                <select v-model.number="numberOfPeriods" class="periods-select"><option v-for="n in 10" :key="n" :value="n">{{ n }}</option></select>
                            </div>
                            <div class="periods-selector">
                                <label class="periods-label">Steady:</label>
                                <input v-model.number="numberOfSteadyStatePeriods" type="number" min="1" max="20" class="periods-select" style="width: 50px;" />
                            </div>
                            <div class="sim-btns">
                                <button :disabled="errorMessage != '' || simulatingWaveforms" class="sim-btn analytical" @click="getAnalyticalWaveforms" title="Get analytical waveforms">
                                    <span v-if="simulatingWaveforms && waveformSource === 'analytical'"><i class="fa-solid fa-spinner fa-spin"></i></span>
                                    <span v-else><i class="fa-solid fa-calculator"></i> Analytical</span>
                                </button>
                                <button :disabled="errorMessage != '' || simulatingWaveforms" class="sim-btn" @click="simulateIdealWaveforms" title="Simulate ideal waveforms">
                                    <span v-if="simulatingWaveforms && waveformSource === 'simulation'"><i class="fa-solid fa-spinner fa-spin"></i></span>
                                    <span v-else><i class="fa-solid fa-play"></i> Simulated</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="compact-body simulation-body">
                        <div v-if="waveformError" class="error-text mb-2"><i class="fa-solid fa-exclamation-circle me-1"></i>{{ waveformError }}</div>
                        <div v-if="(waveformViewMode === 'magnetic' && magneticWaveforms.length > 0) || (waveformViewMode === 'converter' && converterWaveforms.length > 0)">
                            <div v-for="opIndex in (waveformViewMode === 'magnetic' ? magneticWaveforms.length : converterWaveforms.length)" :key="opIndex" class="waveform-section">
                                <div class="operating-point-label">{{ getOperatingPointLabel(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex - 1) }}</div>
                                <div v-for="pairIndex in getPairedWaveformsList(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex - 1).length" :key="pairIndex" class="waveform-item">
                                    <LineVisualizer 
                                        :data="getPairedWaveformDataForVisualizer(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex - 1, pairIndex - 1)" 
                                        :xAxisOptions="getTimeAxisOptions()"
                                        :title="getPairedWaveformTitle(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex - 1, pairIndex - 1)" 
                                        :titleFontSize="14" 
                                        :axisLabelFontSize="10" 
                                        :chartPaddings="{top: 35, left: 45, right: 45, bottom: 25}" 
                                        :bgColor="$styleStore.theme?.light || 'transparent'" 
                                        :lineColor="$styleStore.theme?.primary || '#b18aea'" 
                                        :textColor="$styleStore.wizard.inputTextColor?.color || '#ffffff'" 
                                        :chartStyle="'height: 140px'" 
                                        :toolbox="false" 
                                        :showPoints="false"
                                        :showGrid="false"
                                        :showAxisLines="false"
                                        :showAxisUnitLabels="false"
                                        :forceAxisMin="getPairedWaveformAxisLimits(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex - 1, pairIndex - 1).min"
                                        :forceAxisMax="getPairedWaveformAxisLimits(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex - 1, pairIndex - 1).max"
                                        :forceUpdate="forceWaveformUpdate"/>
                                </div>
                            </div>
                        </div>
                        <div v-else class="empty-state-compact"><i class="fa-solid fa-wave-square"></i><span>Click <b>Analytical</b> or <b>Simulated</b> to generate</span></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.wizard-container { max-width: 1800px; margin: 0 auto; }
.wizard-header { background: linear-gradient(135deg, rgba(177, 138, 234, 0.12) 0%, rgba(100, 80, 180, 0.08) 100%); border-radius: 10px; border: 1px solid rgba(177, 138, 234, 0.2); }
.wizard-title { font-size: 1.2rem; font-weight: 600; color: #b18aea; }
.compact-card { background: rgba(30, 30, 40, 0.6); border: 1px solid rgba(177, 138, 234, 0.2); border-radius: 8px; overflow: hidden; }
.compact-header { padding: 6px 10px; background: rgba(177, 138, 234, 0.1); border-bottom: 1px solid rgba(177, 138, 234, 0.15); font-size: 0.8rem; font-weight: 500; color: #b18aea; }
.compact-body { padding: 8px; }
.simulation-card { min-height: 300px; }
.simulation-body { min-height: 250px; display: flex; flex-direction: column; }

/* Action Buttons */
.action-btns { display: flex; gap: 8px; }
.action-btn-sm { padding: 6px 14px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; cursor: pointer; border: none; }
.action-btn-sm.primary { background: linear-gradient(135deg, #b18aea 0%, #8b5cf6 100%); color: white; }
.action-btn-sm.secondary { background: rgba(177, 138, 234, 0.15); border: 1px solid rgba(177, 138, 234, 0.3); color: #b18aea; }
.action-btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }

/* Sim Buttons */
.sim-btns { display: flex; gap: 4px; }
.sim-btn { background: linear-gradient(135deg, #b18aea 0%, #8b5cf6 100%); border: none; border-radius: 4px; padding: 4px 10px; color: white; font-size: 0.7rem; font-weight: 500; cursor: pointer; }
.sim-btn.analytical { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }
.sim-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.periods-selector { display: flex; align-items: center; gap: 4px; }
.periods-label { font-size: 0.75rem; color: #888; }
.periods-select { background: rgba(0,0,0,0.3); border: 1px solid rgba(177, 138, 234, 0.3); border-radius: 4px; padding: 2px 6px; font-size: 0.75rem; color: inherit; }
.waveform-item { margin-bottom: 8px; }
.waveform-section { margin-bottom: 16px; }
.operating-point-label { font-size: 0.75rem; color: #888; margin-bottom: 8px; font-weight: 500; }
.empty-state-compact { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: rgba(255, 255, 255, 0.3); font-size: 0.9rem; gap: 8px; }
.empty-state-compact i { font-size: 2rem; }
.error-text { color: #ff6b6b; font-size: 0.8rem; }
.form-check-label.small { font-size: 0.75rem; }
</style>