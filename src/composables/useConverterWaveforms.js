import { ref, computed } from 'vue';

/**
 * Composable for managing converter waveform state and operations
 * Used by converter wizards to handle waveform visualization data
 */
export function useConverterWaveforms() {
    // State
    const magneticWaveforms = ref([]);
    const converterWaveforms = ref([]);
    const waveformError = ref('');
    const simulatingWaveforms = ref(false);
    const forceWaveformUpdate = ref(0);

    // Computed
    const hasWaveforms = computed(() => {
        return magneticWaveforms.value.length > 0 || converterWaveforms.value.length > 0;
    });

    const totalWaveformPoints = computed(() => {
        let points = 0;
        magneticWaveforms.value.forEach(op => {
            op.waveforms.forEach(wf => {
                points += wf.x?.length || 0;
            });
        });
        converterWaveforms.value.forEach(op => {
            op.waveforms.forEach(wf => {
                points += wf.x?.length || 0;
            });
        });
        return points;
    });

    // Methods
    function clearWaveforms() {
        magneticWaveforms.value = [];
        converterWaveforms.value = [];
        waveformError.value = '';
    }

    function setWaveformError(error) {
        waveformError.value = error;
    }

    function setSimulating(state) {
        simulatingWaveforms.value = state;
    }

    function addMagneticWaveform(operatingPointWaveforms) {
        magneticWaveforms.value.push(operatingPointWaveforms);
    }

    function addConverterWaveform(operatingPointWaveforms) {
        converterWaveforms.value.push(operatingPointWaveforms);
    }

    function updateWaveforms(magnetic, converter) {
        magneticWaveforms.value = magnetic || [];
        converterWaveforms.value = converter || [];
        forceWaveformUpdate.value++;
    }

    /**
     * Build magnetic waveforms from MKF inputs response
     */
    function buildMagneticWaveformsFromInputs(operatingPoints, options = {}) {
        const { numberOfPeriods = 1 } = options;
        const waveforms = [];
        
        for (let opIdx = 0; opIdx < operatingPoints.length; opIdx++) {
            const op = operatingPoints[opIdx];
            
            const opWaveforms = {
                frequency: op.excitationsPerWinding?.[0]?.frequency || 100000,
                operatingPointName: op.name || `Operating Point ${opIdx + 1}`,
                waveforms: []
            };
            
            const excitations = op.excitationsPerWinding || [];
            for (let windingIdx = 0; windingIdx < excitations.length; windingIdx++) {
                const excitation = excitations[windingIdx];
                const windingLabel = windingIdx === 0 ? 'Primary' : `Secondary ${windingIdx}`;
                
                if (excitation.voltage?.waveform?.time && excitation.voltage?.waveform?.data) {
                    const { time, data } = repeatWaveformForPeriods(
                        excitation.voltage.waveform.time,
                        excitation.voltage.waveform.data,
                        numberOfPeriods
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
                    const { time, data } = repeatWaveformForPeriods(
                        excitation.current.waveform.time,
                        excitation.current.waveform.data,
                        numberOfPeriods
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
            
            waveforms.push(opWaveforms);
        }
        
        return waveforms;
    }

    /**
     * Build converter waveforms from ngspice simulation data
     */
    function buildConverterWaveformsFromNgspice(simData, switchNodes, outputs, options = {}) {
        const { numberOfPeriods = 1, switchingFrequency = 100000 } = options;
        const waveforms = [];
        
        if (!simData || !simData.time) {
            return waveforms;
        }

        const opWaveforms = {
            frequency: switchingFrequency,
            operatingPointName: 'Converter Simulation',
            waveforms: []
        };

        // Add switch node voltages
        switchNodes.forEach((node, idx) => {
            const vData = simData[`v(${node})`] || simData[`V(${node})`];
            if (vData) {
                const { time, data } = repeatWaveformForPeriods(
                    simData.time,
                    vData,
                    numberOfPeriods
                );
                opWaveforms.waveforms.push({
                    label: `Switch Node ${idx + 1}`,
                    x: time,
                    y: data,
                    type: 'voltage',
                    unit: 'V'
                });
            }
        });

        // Add output voltages
        outputs.forEach((out, idx) => {
            const vData = simData[`v(${out.node})`] || simData[`V(${out.node})`];
            if (vData) {
                const { time, data } = repeatWaveformForPeriods(
                    simData.time,
                    vData,
                    numberOfPeriods
                );
                opWaveforms.waveforms.push({
                    label: `Output ${idx + 1} Voltage`,
                    x: time,
                    y: data,
                    type: 'voltage',
                    unit: 'V'
                });
            }
            
            // Output current if available
            const iData = simData[`i(${out.node})`] || simData[`I(${out.node})`];
            if (iData) {
                const { time, data } = repeatWaveformForPeriods(
                    simData.time,
                    iData,
                    numberOfPeriods
                );
                opWaveforms.waveforms.push({
                    label: `Output ${idx + 1} Current`,
                    x: time,
                    y: data,
                    type: 'current',
                    unit: 'A'
                });
            }
        });

        waveforms.push(opWaveforms);
        return waveforms;
    }

    /**
     * Repeat a single-period waveform for visualization
     */
    function repeatWaveformForPeriods(timeData, valueData, periods) {
        if (!timeData || !valueData || timeData.length === 0 || periods <= 1) {
            return { time: timeData, data: valueData };
        }

        const period = timeData[timeData.length - 1] - timeData[0];
        const repeatedTime = [];
        const repeatedData = [];

        for (let p = 0; p < periods; p++) {
            for (let i = 0; i < timeData.length; i++) {
                repeatedTime.push(timeData[i] + p * period);
                repeatedData.push(valueData[i]);
            }
        }

        return { time: repeatedTime, data: repeatedData };
    }

    /**
     * Get time axis options for chart
     */
    function getTimeAxisOptions() {
        return {
            label: 'Time',
            colorLabel: '#d4d4d4',
            type: 'value',
            unit: 's'
        };
    }

    /**
     * Get list of paired voltage/current waveforms for an operating point
     */
    function getPairedWaveformsList(waveforms, operatingPointIndex) {
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
    }

    /**
     * Get paired waveform data for visualizer
     */
    function getPairedWaveformDataForVisualizer(waveforms, operatingPointIndex, pairIndex, options = {}) {
        const pairs = getPairedWaveformsList(waveforms, operatingPointIndex);
        if (!pairs[pairIndex]) return [];
        
        const pair = pairs[pairIndex];
        const result = [];
        const { clipVoltage = true, voltageColor = '#b18aea', currentColor = '#4CAF50' } = options;
        
        // Add voltage data (left Y-axis)
        if (pair.voltage) {
            const vWf = pair.voltage.wf;
            let yData = vWf.y;
            
            // Clip extreme voltage spikes if requested
            if (clipVoltage && yData && yData.length > 0) {
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
                colorLabel: voltageColor,
                type: 'value',
                position: 'left',
                unit: 'V',
                numberDecimals: 6
            });
        }
        
        // Add current data (right Y-axis)
        if (pair.current) {
            const iWf = pair.current.wf;
            result.push({
                label: iWf.label,
                data: { x: iWf.x, y: iWf.y },
                colorLabel: currentColor,
                type: 'value',
                position: 'right',
                unit: 'A',
                numberDecimals: 6
            });
        }
        
        return result;
    }

    /**
     * Get axis limits for paired waveforms
     */
    function getPairedWaveformAxisLimits(waveforms, operatingPointIndex, pairIndex) {
        const pairs = getPairedWaveformsList(waveforms, operatingPointIndex);
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
    }

    /**
     * Get title for paired waveform
     */
    function getPairedWaveformTitle(waveforms, operatingPointIndex, pairIndex) {
        const pairs = getPairedWaveformsList(waveforms, operatingPointIndex);
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
    }

    return {
        // State
        magneticWaveforms,
        converterWaveforms,
        waveformError,
        simulatingWaveforms,
        forceWaveformUpdate,
        
        // Computed
        hasWaveforms,
        totalWaveformPoints,
        
        // Methods
        clearWaveforms,
        setWaveformError,
        setSimulating,
        addMagneticWaveform,
        addConverterWaveform,
        updateWaveforms,
        buildMagneticWaveformsFromInputs,
        buildConverterWaveformsFromNgspice,
        repeatWaveformForPeriods,
        getTimeAxisOptions,
        getPairedWaveformsList,
        getPairedWaveformDataForVisualizer,
        getPairedWaveformAxisLimits,
        getPairedWaveformTitle
    };
}

export default useConverterWaveforms;
