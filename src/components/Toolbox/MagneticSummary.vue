<script setup>
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { toTitleCase, removeTrailingZeroes, formatUnit, formatDimension, formatTemperature, formatInductance,
         formatPower, formatResistance, deepCopy, downloadBase64asPDF, clean, download, isMobile } from '/WebSharedComponents/assets/js/utils.js'
import Magnetic2DVisualizer, { PLOT_MODES } from '/WebSharedComponents/Common/Magnetic2DVisualizer.vue'
import CoreExporter from '../Exporters/CoreExporter.vue'
import CoilExporter from '../Exporters/CoilExporter.vue'
import MASExporter from '../Exporters/MASExporter.vue'
import CircuitSimulatorsExporter from '../Exporters/CircuitSimulatorsExporter.vue'
</script>

<script>
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        mas: {
            type: Object,
        },
    },
    data() {
        const taskQueueStore = useTaskQueueStore();
        return {
            taskQueueStore,
            localTexts: {},
            plotMode: PLOT_MODES.BASIC,
            includeFringing: true,
            PLOT_MODES,
            processedMas: null,
        }
    },
    computed: {
        partNumber() {
            return this.mas?.magnetic?.manufacturerInfo?.reference || 'Custom Design';
        },
        partDescription() {
            const shape = this.mas?.magnetic?.core?.functionalDescription?.shape?.name || '';
            const material = typeof this.mas?.magnetic?.core?.functionalDescription?.material === 'string' 
                ? this.mas.magnetic.core.functionalDescription.material 
                : this.mas?.magnetic?.core?.functionalDescription?.material?.name || '';
            return `${shape} ${material}`.trim() || 'Magnetic Component';
        },
        componentType() {
            const numWindings = this.mas?.magnetic?.coil?.functionalDescription?.length || 1;
            if (numWindings === 1) return 'Power Inductor / Filter Choke';
            if (numWindings === 2) return 'Power Transformer';
            return 'Multi-Winding Transformer';
        },
        coreShape() {
            return this.mas?.magnetic?.core?.functionalDescription?.shape?.name || 'N/A';
        },
        coreMaterial() {
            const mat = this.mas?.magnetic?.core?.functionalDescription?.material;
            return typeof mat === 'string' ? mat : mat?.name || 'N/A';
        },
        operatingFrequency() {
            const freq = this.mas?.inputs?.operatingPoints?.[0]?.excitationsPerWinding?.[0]?.frequency;
            if (!freq) return 'N/A';
            if (freq >= 1e6) return `${(freq / 1e6).toFixed(1)} MHz`;
            if (freq >= 1e3) return `${(freq / 1e3).toFixed(1)} kHz`;
            return `${freq.toFixed(1)} Hz`;
        },
        ambientTemperature() {
            const temp = this.mas?.inputs?.operatingPoints?.[0]?.conditions?.ambientTemperature;
            return temp ? `${temp}°C` : '25°C';
        },
        keyParameters() {
            const params = [];
            const outputs = this.mas?.outputs?.[0];
            
            // Inductance
            if (outputs?.magnetizingInductance?.magnetizingInductance) {
                const val = outputs.magnetizingInductance.magnetizingInductance.nominal || outputs.magnetizingInductance.magnetizingInductance;
                const aux = formatInductance(val);
                params.push({ label: 'Inductance', value: removeTrailingZeroes(aux.label, 2), unit: aux.unit });
            }
            
            // Core losses
            if (outputs?.coreLosses?.coreLosses != null) {
                const aux = formatPower(outputs.coreLosses.coreLosses);
                params.push({ label: 'Core Loss', value: removeTrailingZeroes(aux.label, 2), unit: aux.unit });
            }
            
            // Winding losses
            if (outputs?.windingLosses?.windingLosses != null) {
                const aux = formatPower(outputs.windingLosses.windingLosses);
                params.push({ label: 'Winding Loss', value: removeTrailingZeroes(aux.label, 2), unit: aux.unit });
            }
            
            // Peak flux
            if (outputs?.coreLosses?.magneticFluxDensity?.processed?.peak) {
                const aux = formatUnit(outputs.coreLosses.magneticFluxDensity.processed.peak, 'T');
                params.push({ label: 'Peak B', value: removeTrailingZeroes(aux.label, 2), unit: aux.unit });
            }
            
            // Core shape
            params.push({ label: 'Core', value: this.coreShape, unit: '' });
            
            return params;
        },

        electricalSpecs() {
            const specs = [];
            const outputs = this.mas?.outputs?.[0];
            const inputs = this.mas?.inputs?.operatingPoints?.[0];
            
            // Inductance
            if (outputs?.magnetizingInductance?.magnetizingInductance) {
                const val = outputs.magnetizingInductance.magnetizingInductance.nominal || outputs.magnetizingInductance.magnetizingInductance;
                const aux = formatInductance(val);
                specs.push({
                    parameter: 'Magnetizing Inductance',
                    symbol: 'L',
                    typ: removeTrailingZeroes(aux.label, 2),
                    unit: aux.unit,
                    conditions: '0 A DC'
                });
            }
            
            // Operating frequency
            const freq = inputs?.excitationsPerWinding?.[0]?.frequency;
            if (freq) {
                const aux = formatUnit(freq, 'Hz');
                specs.push({
                    parameter: 'Operating Frequency',
                    symbol: 'f',
                    typ: removeTrailingZeroes(aux.label, 0),
                    unit: aux.unit,
                    conditions: ''
                });
            }
            
            // Peak flux density
            if (outputs?.coreLosses?.magneticFluxDensity?.processed?.peak) {
                const aux = formatUnit(outputs.coreLosses.magneticFluxDensity.processed.peak, 'T');
                specs.push({
                    parameter: 'Peak Flux Density',
                    symbol: 'Bpk',
                    typ: removeTrailingZeroes(aux.label, 2),
                    unit: aux.unit,
                    conditions: 'At operating point'
                });
            }
            
            // Leakage inductance (for transformers)
            if (outputs?.leakageInductance?.leakageInductancePerWinding?.length > 0) {
                const leak = outputs.leakageInductance.leakageInductancePerWinding[0];
                const aux = formatInductance(leak.nominal || leak);
                specs.push({
                    parameter: 'Leakage Inductance',
                    symbol: 'Llk',
                    typ: removeTrailingZeroes(aux.label, 2),
                    unit: aux.unit,
                    conditions: 'Secondary shorted'
                });
            }
            
            return specs;
        },
        coreData() {
            const core = this.mas?.magnetic?.core;
            const data = [];
            
            data.push({ parameter: 'Core Shape', value: this.coreShape });
            data.push({ parameter: 'Core Material', value: this.coreMaterial });
            
            if (core?.functionalDescription?.numberStacks) {
                data.push({ parameter: 'Number of Stacks', value: core.functionalDescription.numberStacks.toString() });
            }
            
            const processed = core?.processedDescription;
            if (processed?.effectiveParameters) {
                if (processed.effectiveParameters.effectiveLength) {
                    const aux = formatUnit(processed.effectiveParameters.effectiveLength, 'm');
                    data.push({ parameter: 'Effective Length (le)', value: `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}` });
                }
                if (processed.effectiveParameters.effectiveArea) {
                    const aux = formatUnit(processed.effectiveParameters.effectiveArea, 'm²', 2);
                    data.push({ parameter: 'Effective Area (Ae)', value: `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}` });
                }
                if (processed.effectiveParameters.effectiveVolume) {
                    const aux = formatUnit(processed.effectiveParameters.effectiveVolume, 'm³', 3);
                    data.push({ parameter: 'Effective Volume (Ve)', value: `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}` });
                }
                if (processed.effectiveParameters.minimumArea) {
                    const aux = formatUnit(processed.effectiveParameters.minimumArea, 'm²', 2);
                    data.push({ parameter: 'Minimum Area', value: `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}` });
                }
            }
            
            // Gap info
            const gapping = core?.functionalDescription?.gapping;
            if (gapping?.length > 0) {
                const nonResidualGaps = gapping.filter(g => g.type?.toLowerCase() !== 'residual');
                const totalGap = nonResidualGaps.reduce((sum, g) => sum + (g.length || 0), 0);
                const aux = formatDimension(totalGap);
                data.push({ parameter: 'Total Gap Length', value: `${removeTrailingZeroes(aux.label, 3)} ${aux.unit}` });
                data.push({ parameter: 'Number of Gaps', value: nonResidualGaps.length.toString() });
            }
            
            return data;
        },
        gappingData() {
            const gapping = this.mas?.magnetic?.core?.functionalDescription?.gapping || [];
            return gapping.map((gap, index) => {
                const lengthAux = formatDimension(gap.length);
                return {
                    index: index + 1,
                    type: toTitleCase(gap.type || 'Unknown'),
                    length: `${removeTrailingZeroes(lengthAux.label, 2)} ${lengthAux.unit}`
                };
            });
        },
        materialData() {
            const data = [];
            const mat = this.mas?.magnetic?.core?.functionalDescription?.material;
            if (!mat || typeof mat === 'string') return data;
            
            if (mat.manufacturerInfo?.name) {
                data.push({ parameter: 'Manufacturer', value: mat.manufacturerInfo.name });
            }
            if (mat.curieTemperature) {
                const aux = formatTemperature(mat.curieTemperature);
                data.push({ parameter: 'Curie Temperature', value: `${removeTrailingZeroes(aux.label, 0)} ${aux.unit}` });
            }
            if (mat.density) {
                const aux = formatUnit(mat.density * 1000, 'g/m³');
                data.push({ parameter: 'Density', value: `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}` });
            }
            
            return data;
        },
        windingTable() {
            const coil = this.mas?.magnetic?.coil;
            const windings = coil?.functionalDescription || [];
            
            return windings.map((w, i) => {
                let wireName = 'N/A';
                const wire = w.wire;
                
                if (wire) {
                    // Wire can be a string reference or an object
                    if (typeof wire === 'string') {
                        wireName = wire;
                    } else if (wire.type === 'round') {
                        if (wire.conductingDiameter) {
                            const diam = wire.conductingDiameter.nominal || wire.conductingDiameter;
                            const diamMm = (diam * 1000).toFixed(3);
                            wireName = `Round \u00D8${diamMm} mm`;
                        } else if (wire.standard === 'NEMA MW 1000 C' && wire.standardName) {
                            wireName = `AWG ${wire.standardName}`;
                        } else if (wire.standardName) {
                            wireName = `Round ${wire.standardName}`;
                        } else if (wire.name) {
                            wireName = `Round ${wire.name}`;
                        } else {
                            wireName = 'Round';
                        }
                    } else if (wire.type === 'litz') {
                        if (wire.name) {
                            wireName = `Litz ${wire.name}`;
                        } else if (wire.numberConductors && wire.strand?.conductingDiameter) {
                            const strandDiam = wire.strand.conductingDiameter.nominal || wire.strand.conductingDiameter;
                            wireName = `Litz ${wire.numberConductors}x\u00D8${(strandDiam * 1000).toFixed(2)} mm`;
                        } else {
                            wireName = 'Litz';
                        }
                    } else if (wire.type === 'rectangular') {
                        if (wire.conductingWidth && wire.conductingHeight) {
                            const w = (wire.conductingWidth.nominal || wire.conductingWidth) * 1000;
                            const h = (wire.conductingHeight.nominal || wire.conductingHeight) * 1000;
                            wireName = `Rect. ${w.toFixed(2)}x${h.toFixed(2)} mm`;
                        } else if (wire.name) {
                            wireName = `Rect. ${wire.name.split(' - ')[0]}`;
                        } else {
                            wireName = 'Rectangular';
                        }
                    } else if (wire.type === 'foil') {
                        if (wire.conductingWidth && wire.conductingHeight) {
                            const w = (wire.conductingWidth.nominal || wire.conductingWidth) * 1000;
                            const h = (wire.conductingHeight.nominal || wire.conductingHeight) * 1000;
                            wireName = `Foil ${w.toFixed(1)}x${h.toFixed(3)} mm`;
                        } else if (wire.name) {
                            wireName = `Foil ${wire.name}`;
                        } else {
                            wireName = 'Foil';
                        }
                    } else if (wire.name) {
                        wireName = wire.name;
                    } else if (wire.type) {
                        wireName = toTitleCase(wire.type);
                    }
                }
                
                return {
                    name: toTitleCase(w.name?.toLowerCase() || `Winding ${i + 1}`),
                    turns: w.numberTurns || 'N/A',
                    parallels: w.numberParallels || 1,
                    wire: wireName
                };
            });
        },
        isWoundMagnetic() {
            // Check if this is a wound magnetic (not planar/printed)
            // Check groups description for wiring technology type
            const groups = this.mas?.magnetic?.coil?.groupsDescription || [];
            if (groups.length > 0) {
                // If any group is "Printed", "Stamped", or "Deposition", it's not wound
                const nonWoundTypes = ['Printed', 'Stamped', 'Deposition'];
                const hasNonWound = groups.some(g => nonWoundTypes.includes(g.type));
                return !hasNonWound;
            }
            // Also check design requirements wiring technology
            const wiringTech = this.mas?.inputs?.designRequirements?.wiringTechnology;
            if (wiringTech && wiringTech !== 'Wound') {
                return false;
            }
            return true;
        },
        windingConstructionSteps() {
            const coil = this.mas?.magnetic?.coil;
            const layers = coil?.layersDescription || [];
            const sections = coil?.sectionsDescription || [];
            const windings = coil?.functionalDescription || [];
            
            if (layers.length === 0 && sections.length === 0) {
                return [];
            }
            
            const steps = [];
            let stepNum = 1;
            
            // If we have layers, use them
            if (layers.length > 0) {
                layers.forEach((layer, index) => {
                    const layerType = layer.type || 'conduction';
                    
                    if (layerType === 'insulation') {
                        const material = typeof layer.insulationMaterial === 'string' 
                            ? layer.insulationMaterial 
                            : layer.insulationMaterial?.name || 'Insulation tape';
                        const thickness = layer.dimensions?.[0] 
                            ? formatDimension(layer.dimensions[0]) 
                            : null;
                        steps.push({
                            step: stepNum++,
                            type: 'insulation',
                            description: thickness && thickness.label > 0
                                ? `Apply ${material} (${removeTrailingZeroes(thickness.label, 2)} ${thickness.unit})` 
                                : `Apply ${material}`,
                            icon: 'fa-tape'
                        });
                    } else if (layerType === 'conduction') {
                        const partialWinding = layer.partialWindings?.[0];
                        const windingName = partialWinding?.winding || `Layer ${index + 1}`;
                        
                        // Find the winding in functional description
                        const winding = windings.find(w => w.name === windingName);
                        const totalTurns = winding?.numberTurns || 0;
                        const numParallels = winding?.numberParallels || 1;
                        
                        // Calculate physical turns in this layer from parallelsProportion
                        const parallelsProportion = partialWinding?.parallelsProportion || [];
                        let layerTurns = 0;
                        if (parallelsProportion.length > 0) {
                            // Sum the proportions and multiply by total turns
                            const proportionSum = parallelsProportion.reduce((a, b) => a + b, 0);
                            layerTurns = Math.round(proportionSum * totalTurns);
                        }
                        
                        const wire = winding?.wire;
                        let wireDesc = '';
                        if (wire) {
                            if (typeof wire === 'string') {
                                wireDesc = ` using ${wire}`;
                            } else if (wire.name) {
                                wireDesc = ` using ${wire.name}`;
                            }
                        }
                        
                        const activeParallels = parallelsProportion.filter(p => p > 0).length || numParallels;
                        const parallelInfo = activeParallels > 1 ? ` (${activeParallels} parallels)` : '';
                        const turnsDisplay = layerTurns > 0 ? layerTurns : totalTurns;
                        
                        steps.push({
                            step: stepNum++,
                            type: 'winding',
                            description: `Wind ${toTitleCase(windingName)}: ${turnsDisplay} turns${parallelInfo}${wireDesc}`,
                            icon: 'fa-rotate'
                        });
                    }
                });
            }
            // Otherwise use sections if available
            else if (sections.length > 0) {
                sections.forEach((section) => {
                    const sectionType = section.type || 'conduction';
                    
                    if (sectionType === 'insulation') {
                        steps.push({
                            step: stepNum++,
                            type: 'insulation',
                            description: 'Apply insulation layer',
                            icon: 'fa-tape'
                        });
                    } else if (sectionType === 'conduction') {
                        const partialWinding = section.partialWindings?.[0];
                        const windingName = partialWinding?.winding || section.name;
                        const winding = windings.find(w => w.name === windingName);
                        const totalTurns = winding?.numberTurns || 0;
                        
                        steps.push({
                            step: stepNum++,
                            type: 'winding',
                            description: `Wind ${toTitleCase(windingName)}: ${totalTurns} turns`,
                            icon: 'fa-rotate'
                        });
                    }
                });
            }
            
            return steps;
        },
        performanceData() {
            const data = [];
            const outputs = this.mas?.outputs?.[0];
            
            // Core losses
            if (outputs?.coreLosses?.coreLosses != null) {
                const aux = formatPower(outputs.coreLosses.coreLosses);
                data.push({ parameter: 'Core Losses (Pcore)', value: `${removeTrailingZeroes(aux.label, 3)} ${aux.unit}` });
            }
            
            // Winding losses breakdown
            if (outputs?.windingLosses?.windingLossesPerWinding) {
                let totalOhmic = 0, totalSkin = 0, totalProx = 0;
                outputs.windingLosses.windingLossesPerWinding.forEach(w => {
                    totalOhmic += w.ohmicLosses?.losses || 0;
                    totalSkin += (w.skinEffectLosses?.lossesPerHarmonic || []).reduce((a, b) => a + b, 0);
                    totalProx += (w.proximityEffectLosses?.lossesPerHarmonic || []).reduce((a, b) => a + b, 0);
                });
                
                const ohmicAux = formatPower(totalOhmic);
                const skinAux = formatPower(totalSkin);
                const proxAux = formatPower(totalProx);
                
                data.push({ parameter: 'Ohmic Losses', value: `${removeTrailingZeroes(ohmicAux.label, 3)} ${ohmicAux.unit}` });
                data.push({ parameter: 'Skin Effect Losses', value: `${removeTrailingZeroes(skinAux.label, 3)} ${skinAux.unit}` });
                data.push({ parameter: 'Proximity Losses', value: `${removeTrailingZeroes(proxAux.label, 3)} ${proxAux.unit}` });
            }
            
            // Total losses
            const coreLoss = outputs?.coreLosses?.coreLosses || 0;
            const windingLoss = outputs?.windingLosses?.windingLosses || 0;
            if (coreLoss || windingLoss) {
                const total = coreLoss + windingLoss;
                const aux = formatPower(total);
                data.push({ parameter: 'Total Losses', value: `${removeTrailingZeroes(aux.label, 3)} ${aux.unit}`, isTotal: true });
            }
            
            return data;
        },
        windingPerformance() {
            const outputs = this.mas?.outputs?.[0];
            const windings = this.mas?.magnetic?.coil?.functionalDescription || [];
            
            if (!outputs?.windingLosses?.windingLossesPerWinding) return [];
            
            return windings.map((w, i) => {
                const wLoss = outputs.windingLosses.windingLossesPerWinding[i];
                const dcr = outputs.windingLosses.dcResistancePerWinding?.[i];
                const leak = outputs.leakageInductance?.leakageInductancePerWinding?.[i - 1];
                
                const ohmicLoss = wLoss?.ohmicLosses?.losses || 0;
                const skinLoss = (wLoss?.skinEffectLosses?.lossesPerHarmonic || []).reduce((a, b) => a + b, 0);
                const proxLoss = (wLoss?.proximityEffectLosses?.lossesPerHarmonic || []).reduce((a, b) => a + b, 0);
                const totalLoss = ohmicLoss + skinLoss + proxLoss;
                
                const dcrAux = dcr ? formatResistance(dcr) : null;
                const lossAux = formatPower(totalLoss);
                const leakAux = leak ? formatInductance(leak.nominal || leak) : null;
                
                return {
                    name: toTitleCase(w.name?.toLowerCase() || `Winding ${i + 1}`),
                    dcr: dcrAux ? `${removeTrailingZeroes(dcrAux.label, 2)} ${dcrAux.unit}` : '-',
                    loss: `${removeTrailingZeroes(lossAux.label, 2)} ${lossAux.unit}`,
                    leakage: leakAux ? `${removeTrailingZeroes(leakAux.label, 2)} ${leakAux.unit}` : '-'
                };
            });
        },
        currentDate() {
            return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        },
        operatingPointData() {
            const opPoints = this.mas?.inputs?.operatingPoints || [];
            if (opPoints.length === 0) return null;
            
            const op = opPoints[0];
            const conditions = op.conditions || {};
            const excitations = op.excitationsPerWinding || [];
            const windings = this.mas?.magnetic?.coil?.functionalDescription || [];
            
            return {
                name: op.name || 'Operating Point 1',
                conditions: {
                    ambientTemperature: conditions.ambientTemperature,
                    ambientRelativeHumidity: conditions.ambientRelativeHumidity,
                    cooling: conditions.cooling?.fluid || null
                },
                excitations: excitations.map((ex, i) => {
                    const windingName = windings[i]?.name || `Winding ${i + 1}`;
                    const freq = ex.frequency;
                    const freqFormatted = freq 
                        ? (freq >= 1e6 ? `${(freq / 1e6).toFixed(1)} MHz` : freq >= 1e3 ? `${(freq / 1e3).toFixed(1)} kHz` : `${freq.toFixed(1)} Hz`)
                        : 'N/A';
                    
                    const voltage = ex.voltage;
                    const current = ex.current;
                    
                    // Voltage details
                    let voltageInfo = null;
                    if (voltage) {
                        const proc = voltage.processed || {};
                        const wf = voltage.waveform;
                        voltageInfo = {
                            label: proc.label || (wf?.ancillaryLabel) || 'Custom',
                            peakToPeak: proc.peakToPeak,
                            peak: proc.peak,
                            offset: proc.offset,
                            rms: proc.rms,
                            dutyCycle: proc.dutyCycle,
                            waveformData: wf?.data,
                            waveformTime: wf?.time
                        };
                    }
                    
                    // Current details
                    let currentInfo = null;
                    if (current) {
                        const proc = current.processed || {};
                        const wf = current.waveform;
                        currentInfo = {
                            label: proc.label || (wf?.ancillaryLabel) || 'Custom',
                            peakToPeak: proc.peakToPeak,
                            peak: proc.peak,
                            offset: proc.offset,
                            rms: proc.rms,
                            dutyCycle: proc.dutyCycle,
                            waveformData: wf?.data,
                            waveformTime: wf?.time
                        };
                    }
                    
                    return {
                        windingName: toTitleCase(windingName.toLowerCase()),
                        frequency: freqFormatted,
                        voltage: voltageInfo,
                        current: currentInfo
                    };
                })
            };
        }
    },
    mounted() {
        this.computeTexts();
    },
    methods: {
        plotModeChange(newMode) {
            this.plotMode = newMode;
        },
        swapIncludeFringing() {
            this.includeFringing = !this.includeFringing;
        },
        printDatasheet() {
            window.print();
        },
        generateWaveformPath(data, time, width = 120, height = 40) {
            if (!data || data.length < 2) return '';
            
            const padding = 4;
            const w = width - padding * 2;
            const h = height - padding * 2;
            
            // Normalize data to fit in the height
            const min = Math.min(...data);
            const max = Math.max(...data);
            const range = max - min || 1;
            
            // If we have time data, use it; otherwise distribute evenly
            const points = data.map((val, i) => {
                const t = time ? time[i] / Math.max(...time) : i / (data.length - 1);
                const x = padding + t * w;
                const y = padding + h - ((val - min) / range) * h;
                return { x, y };
            });
            
            // Build SVG path
            let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
            for (let i = 1; i < points.length; i++) {
                path += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
            }
            
            return path;
        },
        formatSignalValue(value, unit) {
            if (value == null) return '-';
            const aux = formatUnit(value, unit);
            return `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
        },
        async computeTexts() {
            // Keep original text computation for backward compatibility
            try {
                const materialName = this.mas.magnetic.core.functionalDescription.material;
                if (typeof materialName === 'string' || materialName instanceof String) {
                    var materialData = await this.taskQueueStore.getMaterialData(materialName);
                    this.mas.magnetic.core.functionalDescription.material = materialData;
                }
            } catch (error) {
                console.error("Error processing material data", error);
            }
        }
    }
}
</script>

<template>
    <div class="datasheet-wrapper">
        <!-- Exporters -->
        <CoreExporter :data-cy="dataTestLabel + '-CoreExporter'"/>
        <CoilExporter :data-cy="dataTestLabel + '-CoilExporter'" />
        <MASExporter :data-cy="dataTestLabel + '-MASExporter'" />
        <CircuitSimulatorsExporter :data-cy="dataTestLabel + '-CircuitSimulatorsExporter'" />
        
        <!-- Toolbar (hidden when printing) -->
        <div class="datasheet-toolbar d-print-none">
            <div class="toolbar-left">
                <button class="btn btn-primary btn-sm me-2" data-bs-toggle="modal" data-bs-target="#MASExporterModal">
                    <i class="fa-solid fa-file-export me-1"></i> MAS
                </button>
                <button class="btn btn-primary btn-sm me-2" data-bs-toggle="modal" data-bs-target="#CoreExporterModal">
                    <i class="fa-solid fa-cube me-1"></i> Core
                </button>
                <button class="btn btn-primary btn-sm me-2" data-bs-toggle="modal" data-bs-target="#CoilExporterModal">
                    <i class="fa-solid fa-coil me-1"></i> Coil
                </button>
                <button class="btn btn-danger btn-sm" data-bs-toggle="modal" data-bs-target="#CircuitSimulatorsExporterModal">
                    <i class="fa-solid fa-microchip me-1"></i> Circuit Sim
                </button>
            </div>
            <div class="toolbar-right">
                <button class="btn btn-outline-primary btn-sm" @click="printDatasheet">
                    <i class="fa-solid fa-print me-1"></i> Print / Save PDF
                </button>
            </div>
        </div>

        <!-- Datasheet Content -->
        <div class="datasheet-container">
            <!-- Header Banner -->
            <div class="datasheet-header">
                <div class="header-content">
                    <div class="header-left">
                        <h1 class="part-number">{{ partNumber }}</h1>
                        <p class="part-description">{{ partDescription }}</p>
                        <p class="part-type">{{ componentType }}</p>
                    </div>
                    <div class="header-right">
                        <div class="company-name">OpenMagnetics</div>
                        <div class="revision">Generated: {{ currentDate }}</div>
                    </div>
                </div>
            </div>

            <!-- Key Parameters Box -->
            <div class="key-params-box">
                <div class="key-param" v-for="param in keyParameters" :key="param.label">
                    <div class="param-label">{{ param.label }}</div>
                    <div class="param-value">{{ param.value }}</div>
                    <div class="param-unit">{{ param.unit }}</div>
                </div>
            </div>

            <!-- Visualizer Section -->
            <div class="section">
                <h3 class="section-title">Component Visualization</h3>
                <div class="visualizer-container">
                    <Magnetic2DVisualizer
                        :modelValue="mas"
                        :enableZoom="false"
                        :plotModeInit="plotMode"
                        :includeFringingInit="includeFringing"
                        @plotModeChange="plotModeChange"
                        @swapIncludeFringing="swapIncludeFringing"
                    />
                </div>
            </div>

            <!-- Electrical Specifications -->
            <div class="section">
                <h3 class="section-title">Electrical Specifications</h3>
                <table class="spec-table">
                    <thead>
                        <tr>
                            <th>Parameter</th>
                            <th>Symbol</th>
                            <th>Typical</th>
                            <th>Unit</th>
                            <th>Conditions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(spec, index) in electricalSpecs" :key="spec.parameter" :class="{ 'alt-row': index % 2 === 1 }">
                            <td>{{ spec.parameter }}</td>
                            <td class="symbol">{{ spec.symbol }}</td>
                            <td class="typ-value">{{ spec.typ || '-' }}</td>
                            <td>{{ spec.unit }}</td>
                            <td class="conditions">{{ spec.conditions || '' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Operating Point Details -->
            <div class="section" v-if="operatingPointData">
                <h3 class="section-title">Operating Point Excitation</h3>
                <p class="test-conditions">
                    <template v-if="operatingPointData.conditions.ambientTemperature">
                        T<sub>amb</sub> = {{ operatingPointData.conditions.ambientTemperature }}°C
                    </template>
                    <template v-if="operatingPointData.conditions.ambientRelativeHumidity">
                        &nbsp;|&nbsp; RH = {{ (operatingPointData.conditions.ambientRelativeHumidity * 100).toFixed(0) }}%
                    </template>
                    <template v-if="operatingPointData.conditions.cooling">
                        &nbsp;|&nbsp; Cooling: {{ operatingPointData.conditions.cooling }}
                    </template>
                </p>
                
                <div v-for="(ex, idx) in operatingPointData.excitations" :key="idx" class="excitation-card">
                    <div class="excitation-header">
                        <span class="winding-badge">{{ ex.windingName }}</span>
                        <span class="frequency-badge">f = {{ ex.frequency }}</span>
                    </div>
                    
                    <div class="excitation-content">
                        <!-- Voltage -->
                        <div class="signal-block" v-if="ex.voltage">
                            <div class="signal-header voltage-header">
                                <i class="fa-solid fa-bolt"></i> Voltage
                                <span class="waveform-label">{{ ex.voltage.label }}</span>
                            </div>
                            <div class="signal-details">
                                <div class="signal-params">
                                    <div class="signal-param" v-if="ex.voltage.peakToPeak != null">
                                        <span class="param-label">V<sub>pk-pk</sub></span>
                                        <span class="param-value">{{ formatSignalValue(ex.voltage.peakToPeak, 'V') }}</span>
                                    </div>
                                    <div class="signal-param" v-if="ex.voltage.peak != null">
                                        <span class="param-label">V<sub>pk</sub></span>
                                        <span class="param-value">{{ formatSignalValue(ex.voltage.peak, 'V') }}</span>
                                    </div>
                                    <div class="signal-param" v-if="ex.voltage.rms != null">
                                        <span class="param-label">V<sub>rms</sub></span>
                                        <span class="param-value">{{ formatSignalValue(ex.voltage.rms, 'V') }}</span>
                                    </div>
                                    <div class="signal-param" v-if="ex.voltage.offset != null">
                                        <span class="param-label">V<sub>offset</sub></span>
                                        <span class="param-value">{{ formatSignalValue(ex.voltage.offset, 'V') }}</span>
                                    </div>
                                    <div class="signal-param" v-if="ex.voltage.dutyCycle != null">
                                        <span class="param-label">Duty</span>
                                        <span class="param-value">{{ (ex.voltage.dutyCycle * 100).toFixed(1) }}%</span>
                                    </div>
                                </div>
                                <div class="waveform-preview" v-if="ex.voltage.waveformData?.length > 1">
                                    <svg viewBox="0 0 120 40" class="waveform-svg voltage-waveform">
                                        <path :d="generateWaveformPath(ex.voltage.waveformData, ex.voltage.waveformTime)" 
                                              fill="none" stroke-width="1.5"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Current -->
                        <div class="signal-block" v-if="ex.current">
                            <div class="signal-header current-header">
                                <i class="fa-solid fa-wave-square"></i> Current
                                <span class="waveform-label">{{ ex.current.label }}</span>
                            </div>
                            <div class="signal-details">
                                <div class="signal-params">
                                    <div class="signal-param" v-if="ex.current.peakToPeak != null">
                                        <span class="param-label">I<sub>pk-pk</sub></span>
                                        <span class="param-value">{{ formatSignalValue(ex.current.peakToPeak, 'A') }}</span>
                                    </div>
                                    <div class="signal-param" v-if="ex.current.peak != null">
                                        <span class="param-label">I<sub>pk</sub></span>
                                        <span class="param-value">{{ formatSignalValue(ex.current.peak, 'A') }}</span>
                                    </div>
                                    <div class="signal-param" v-if="ex.current.rms != null">
                                        <span class="param-label">I<sub>rms</sub></span>
                                        <span class="param-value">{{ formatSignalValue(ex.current.rms, 'A') }}</span>
                                    </div>
                                    <div class="signal-param" v-if="ex.current.offset != null">
                                        <span class="param-label">I<sub>offset</sub></span>
                                        <span class="param-value">{{ formatSignalValue(ex.current.offset, 'A') }}</span>
                                    </div>
                                    <div class="signal-param" v-if="ex.current.dutyCycle != null">
                                        <span class="param-label">Duty</span>
                                        <span class="param-value">{{ (ex.current.dutyCycle * 100).toFixed(1) }}%</span>
                                    </div>
                                </div>
                                <div class="waveform-preview" v-if="ex.current.waveformData?.length > 1">
                                    <svg viewBox="0 0 120 40" class="waveform-svg current-waveform">
                                        <path :d="generateWaveformPath(ex.current.waveformData, ex.current.waveformTime)" 
                                              fill="none" stroke-width="1.5"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Two Column: Core Data + Winding Data -->
            <div class="two-column-section">
                <div class="column">
                    <div class="section">
                        <h3 class="section-title">Core Data</h3>
                        <table class="data-table">
                            <tbody>
                                <tr v-for="(item, index) in coreData" :key="item.parameter" :class="{ 'alt-row': index % 2 === 1 }">
                                    <td class="param-name">{{ item.parameter }}</td>
                                    <td class="param-val">{{ item.value }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Gapping Table -->
                    <div class="section" v-if="gappingData.length > 0">
                        <h3 class="section-title">Core Gapping</h3>
                        <table class="spec-table compact">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Type</th>
                                    <th>Length</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(gap, index) in gappingData" :key="gap.index" :class="{ 'alt-row': index % 2 === 1 }">
                                    <td>{{ gap.index }}</td>
                                    <td>{{ gap.type }}</td>
                                    <td>{{ gap.length }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Material Data -->
                    <div class="section" v-if="materialData.length > 0">
                        <h3 class="section-title">Material Properties</h3>
                        <table class="data-table">
                            <tbody>
                                <tr v-for="(item, index) in materialData" :key="item.parameter" :class="{ 'alt-row': index % 2 === 1 }">
                                    <td class="param-name">{{ item.parameter }}</td>
                                    <td class="param-val">{{ item.value }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="column">
                    <div class="section">
                        <h3 class="section-title">Winding Configuration</h3>
                        <table class="spec-table">
                            <thead>
                                <tr>
                                    <th>Winding</th>
                                    <th>Turns</th>
                                    <th>Parallels</th>
                                    <th>Wire</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(w, index) in windingTable" :key="w.name" :class="{ 'alt-row': index % 2 === 1 }">
                                    <td>{{ w.name }}</td>
                                    <td>{{ w.turns }}</td>
                                    <td>{{ w.parallels }}</td>
                                    <td>{{ w.wire }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Performance Analysis -->
                    <div class="section">
                        <h3 class="section-title">Performance Analysis</h3>
                        <p class="test-conditions">
                            Test Conditions: f = {{ operatingFrequency }}, T<sub>amb</sub> = {{ ambientTemperature }}
                        </p>
                        <table class="data-table">
                            <tbody>
                                <tr v-for="(item, index) in performanceData" :key="item.parameter" 
                                    :class="{ 'alt-row': index % 2 === 1, 'total-row': item.isTotal }">
                                    <td class="param-name">{{ item.parameter }}</td>
                                    <td class="param-val">{{ item.value }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Winding Performance -->
                    <div class="section" v-if="windingPerformance.length > 0">
                        <h3 class="section-title">Winding Performance</h3>
                        <table class="spec-table compact">
                            <thead>
                                <tr>
                                    <th>Winding</th>
                                    <th>DCR</th>
                                    <th>Loss</th>
                                    <th>Leakage</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(w, index) in windingPerformance" :key="w.name" :class="{ 'alt-row': index % 2 === 1 }">
                                    <td>{{ w.name }}</td>
                                    <td>{{ w.dcr }}</td>
                                    <td>{{ w.loss }}</td>
                                    <td>{{ w.leakage }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Winding Construction Steps -->
            <div class="section" v-if="isWoundMagnetic && windingConstructionSteps.length > 0">
                <h3 class="section-title">Winding Construction Steps</h3>
                <div class="construction-steps">
                    <div v-for="step in windingConstructionSteps" :key="step.step" 
                         class="construction-step" 
                         :class="{ 'step-insulation': step.type === 'insulation', 'step-winding': step.type === 'winding' }">
                        <div class="step-number">{{ step.step }}</div>
                        <div class="step-icon">
                            <i :class="'fa-solid ' + step.icon"></i>
                        </div>
                        <div class="step-description">{{ step.description }}</div>
                    </div>
                </div>
            </div>

            <!-- Footer Notice -->
            <div class="footer-notice">
                <div class="notice-box">
                    <strong>Note:</strong> This datasheet was automatically generated by OpenMagnetics based on the design specifications and simulation results. 
                    Actual performance may vary. Please verify all specifications before production use.
                </div>
            </div>

            <div class="document-footer">
                <span>Generated by OpenMagnetics</span>
                <span>{{ currentDate }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.datasheet-wrapper {
    background: #1a1a1a;
    min-height: 100vh;
    padding: 15px;
}

.datasheet-toolbar {
    max-width: 210mm;
    margin: 0 auto 15px auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    background: #2a2a2a;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.toolbar-left, .toolbar-right {
    display: flex;
    gap: 8px;
}

.datasheet-container {
    font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    max-width: 210mm;
    margin: 0 auto;
    padding: 0;
    background: #1a1a2e;
    color: #d4d4d4;
    font-size: 11px;
    line-height: 1.4;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    border: 1px solid #343a40;
}

/* Header */
.datasheet-header {
    background: linear-gradient(135deg, #005f48 0%, #539796 100%);
    color: white;
    padding: 20px 25px;
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.header-left .part-number {
    font-size: 26px;
    font-weight: 700;
    margin: 0 0 5px 0;
    letter-spacing: 0.5px;
}

.header-left .part-description {
    font-size: 15px;
    margin: 0 0 3px 0;
    opacity: 0.95;
}

.header-left .part-type {
    font-size: 12px;
    margin: 0;
    opacity: 0.8;
}

.header-right {
    text-align: right;
}

.header-right .company-name {
    font-size: 16px;
    font-weight: 600;
}

.header-right .revision {
    font-size: 11px;
    opacity: 0.8;
    margin-top: 5px;
}

/* Key Parameters Box */
.key-params-box {
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
    background: #16213e;
    border-bottom: 2px solid #539796;
    padding: 12px 10px;
}

.key-param {
    text-align: center;
    padding: 5px 15px;
    min-width: 100px;
}

.key-param .param-label {
    font-size: 10px;
    color: #adb5bd;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.key-param .param-value {
    font-size: 18px;
    font-weight: 700;
    color: #539796;
    margin: 2px 0;
}

.key-param .param-unit {
    font-size: 10px;
    color: #adb5bd;
}

/* Sections */
.section {
    margin: 12px 20px;
}

.section-title {
    font-size: 13px;
    font-weight: 600;
    color: #539796;
    margin: 0 0 8px 0;
    padding-bottom: 4px;
    border-bottom: 1px solid #539796;
}

/* Two column layout */
.two-column-section {
    display: flex;
    gap: 20px;
    padding: 0 20px;
    margin-bottom: 10px;
}

.two-column-section .column {
    flex: 1;
}

.two-column-section .section {
    margin: 12px 0;
}

/* Visualizer */
.visualizer-container {
    background: #1a1a1a;
    border: 1px solid #343a40;
    border-radius: 4px;
    min-height: 200px;
    overflow: hidden;
}

/* Spec table */
.spec-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
}

.spec-table.compact {
    font-size: 9px;
}

.spec-table th {
    background: #005f48;
    color: white;
    padding: 5px 8px;
    text-align: left;
    font-weight: 600;
}

.spec-table td {
    padding: 4px 8px;
    border-bottom: 1px solid #343a40;
}

.spec-table .alt-row {
    background: rgba(83, 151, 150, 0.1);
}

.spec-table .symbol {
    font-style: italic;
}

.spec-table .typ-value {
    font-weight: 600;
}

.spec-table .conditions {
    font-size: 9px;
    color: #6c757d;
}

/* Data table */
.data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
}

.data-table td {
    padding: 4px 8px;
    border-bottom: 1px solid #343a40;
}

.data-table .param-name {
    color: #adb5bd;
}

.data-table .param-val {
    font-weight: 500;
    text-align: right;
    color: #d4d4d4;
}

.data-table .alt-row {
    background: rgba(83, 151, 150, 0.1);
}

.data-table .total-row {
    font-weight: 700;
    background: rgba(83, 151, 150, 0.25) !important;
    color: #539796;
}

/* Test conditions */
.test-conditions {
    font-size: 10px;
    color: #adb5bd;
    margin-bottom: 8px;
    font-style: italic;
}

/* Construction Steps */
.construction-steps {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.construction-step {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(83, 151, 150, 0.1);
    border-radius: 4px;
    border-left: 3px solid #539796;
    flex: 1 1 calc(50% - 8px);
    min-width: 250px;
}

.construction-step.step-insulation {
    background: rgba(255, 185, 78, 0.1);
    border-left-color: #ffb94e;
}

.construction-step.step-winding {
    background: rgba(83, 151, 150, 0.1);
    border-left-color: #539796;
}

.step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    background: #539796;
    color: white;
    border-radius: 50%;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
}

.step-insulation .step-number {
    background: #ffb94e;
    color: #1a1a1a;
}

.step-icon {
    color: #539796;
    font-size: 14px;
    flex-shrink: 0;
}

.step-insulation .step-icon {
    color: #ffb94e;
}

.step-description {
    font-size: 11px;
    color: #d4d4d4;
}

/* Operating Point Excitation */
.excitation-card {
    background: rgba(83, 151, 150, 0.05);
    border: 1px solid #343a40;
    border-radius: 6px;
    margin-bottom: 12px;
    overflow: hidden;
}

.excitation-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: rgba(83, 151, 150, 0.15);
    border-bottom: 1px solid #343a40;
}

.winding-badge {
    background: #539796;
    color: white;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
}

.frequency-badge {
    font-size: 11px;
    color: #adb5bd;
    font-style: italic;
}

.excitation-content {
    display: flex;
    gap: 15px;
    padding: 12px;
}

.signal-block {
    flex: 1;
    background: rgba(26, 26, 30, 0.5);
    border-radius: 4px;
    overflow: hidden;
}

.signal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 600;
}

.signal-header.voltage-header {
    background: rgba(255, 185, 78, 0.2);
    color: #ffb94e;
}

.signal-header.current-header {
    background: rgba(83, 151, 150, 0.2);
    color: #539796;
}

.signal-header .waveform-label {
    margin-left: auto;
    font-weight: 400;
    font-style: italic;
    opacity: 0.8;
}

.signal-details {
    display: flex;
    gap: 10px;
    padding: 8px 10px;
    align-items: center;
}

.signal-params {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
}

.signal-param {
    display: flex;
    flex-direction: column;
    min-width: 60px;
}

.signal-param .param-label {
    font-size: 9px;
    color: #6c757d;
    text-transform: uppercase;
}

.signal-param .param-value {
    font-size: 11px;
    font-weight: 600;
    color: #d4d4d4;
}

.waveform-preview {
    flex-shrink: 0;
    width: 120px;
    height: 40px;
    background: rgba(26, 26, 30, 0.8);
    border-radius: 4px;
    border: 1px solid #343a40;
}

.waveform-svg {
    width: 100%;
    height: 100%;
}

.waveform-svg.voltage-waveform path {
    stroke: #ffb94e;
}

.waveform-svg.current-waveform path {
    stroke: #539796;
}

/* Footer */
.footer-notice {
    margin: 15px 20px;
}

.notice-box {
    background: rgba(255, 185, 78, 0.15);
    border: 1px solid #ffb94e;
    border-radius: 4px;
    padding: 10px 12px;
    font-size: 10px;
    color: #ffb94e;
}

.document-footer {
    display: flex;
    justify-content: space-between;
    padding: 10px 20px;
    border-top: 1px solid #343a40;
    font-size: 9px;
    color: #6c757d;
}

/* Print styles */
@media print {
    .datasheet-wrapper {
        background: white;
        padding: 0;
    }
    
    .d-print-none {
        display: none !important;
    }
    
    .datasheet-container {
        box-shadow: none;
        max-width: 100%;
        background: white;
        color: #212529;
        border: none;
    }
    
    .key-params-box {
        background: #f5f8fa;
    }
    
    .key-param .param-label,
    .key-param .param-unit {
        color: #6c757d;
    }
    
    .data-table .param-name,
    .test-conditions {
        color: #495057;
    }
    
    .data-table .param-val {
        color: #212529;
    }
    
    .spec-table td,
    .data-table td {
        border-bottom-color: #dee2e6;
    }
    
    .spec-table .alt-row,
    .data-table .alt-row {
        background: #f5f8fa;
    }
    
    .data-table .total-row {
        background: #e3f2fd !important;
        color: #005f48;
    }
    
    .notice-box {
        background: #fff3cd;
        color: #856404;
        border-color: #ffc107;
    }
    
    .document-footer {
        border-top-color: #dee2e6;
    }
    
    .construction-step {
        background: #f5f8fa;
    }
    
    .construction-step.step-insulation {
        background: #fff3cd;
        border-left-color: #ffc107;
    }
    
    .step-description {
        color: #212529;
    }
    
    .step-insulation .step-number {
        background: #ffc107;
    }
    
    .step-insulation .step-icon {
        color: #856404;
    }
    
    .excitation-card {
        background: #f8f9fa;
        border-color: #dee2e6;
    }
    
    .excitation-header {
        background: #e9ecef;
        border-bottom-color: #dee2e6;
    }
    
    .frequency-badge {
        color: #495057;
    }
    
    .signal-block {
        background: #ffffff;
    }
    
    .signal-header.voltage-header {
        background: #fff3cd;
        color: #856404;
    }
    
    .signal-header.current-header {
        background: #d4edda;
        color: #155724;
    }
    
    .signal-param .param-value {
        color: #212529;
    }
    
    .waveform-preview {
        background: #f8f9fa;
        border-color: #dee2e6;
    }
    
    .waveform-svg.voltage-waveform path {
        stroke: #856404;
    }
    
    .waveform-svg.current-waveform path {
        stroke: #155724;
    }
    
    .datasheet-header,
    .key-params-box,
    .spec-table th,
    .alt-row,
    .total-row,
    .construction-step,
    .step-number {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    
    .section {
        page-break-inside: avoid;
    }
    
    .two-column-section {
        page-break-inside: avoid;
    }
}

/* Responsive */
@media (max-width: 768px) {
    .two-column-section {
        flex-direction: column;
    }
    
    .key-params-box {
        flex-wrap: wrap;
    }
    
    .key-param {
        min-width: 80px;
    }
    
    .datasheet-toolbar {
        flex-direction: column;
        gap: 10px;
    }
    
    .toolbar-left, .toolbar-right {
        width: 100%;
        justify-content: center;
    }
    
    .excitation-content {
        flex-direction: column;
    }
    
    .signal-details {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .waveform-preview {
        width: 100%;
        height: 50px;
    }
}
</style>
