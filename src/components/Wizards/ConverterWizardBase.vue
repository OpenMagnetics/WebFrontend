<script>
import ConverterWaveformVisualizer from './ConverterWaveformVisualizer.vue'
/**
 * ConverterWizardBase - Base layout + common logic for all converter wizards.
 * Child wizards access common methods via this.$refs.base.methodName().
 *
 * COMMON METHODS:
 *   buildMagneticWaveformsFromInputs, convertConverterWaveforms,
 *   repeatWaveformForPeriods, repeatWaveformsForPeriods,
 *   getTimeAxisOptions, getWaveformsList, getSingleWaveformDataForVisualizer,
 *   getPairedWaveformsList, getPairedWaveformDataForVisualizer,
 *   getPairedWaveformAxisLimits, getPairedWaveformTitle, getOperatingPointLabel,
 *   getMagnetizingInductanceDisplay, getTurnsRatioDisplay,
 *   formatFrequency, formatImpedance, formatInductance, formatCapacitance,
 *   pruneHarmonicsForInputs, processSimulatedOperatingPoints,
 *   processWaveformResults, processAnalyticalWaveforms, processSimulationWaveforms,
 *   assignResultsToMasStore, setOperatingPointsModeToManual,
 *   navigateToReview, navigateToAdvise, validateWaveforms,
 *   extractSinglePeriod, extractSinglePeriodFromOperatingPoints
 */
export default {
  name: 'ConverterWizardBase',
  components: { ConverterWaveformVisualizer },
  name: 'ConverterWizardBase',
  components: {
    ConverterWaveformVisualizer,
  },
  props: {
    /** Wizard title displayed in the header */
    title: {
      type: String,
      required: true
    },
    /** FontAwesome icon class for the header */
    titleIcon: {
      type: String,
      default: 'fa-bolt'
    },
    /** Optional subtitle/description for the wizard */
    subtitle: {
      type: String,
      default: ''
    },
    /** Bootstrap xl column width for column 1 (1-12) */
    col1Width: {
      type: [String, Number],
      default: 3
    },
    /** Bootstrap xl column width for column 2 (1-12) */
    col2Width: {
      type: [String, Number],
      default: 4
    },
    /** Bootstrap xl column width for column 3 (1-12) */
    col3Width: {
      type: [String, Number],
      default: 5
    },
    /** Show the Input Voltage card */
    showInputVoltage: {
      type: Boolean,
      default: true
    },
    /** Show the Number of Outputs card */
    showNumberOutputs: {
      type: Boolean,
      default: true
    },
    // --- Waveform props ---
    magneticWaveforms: {
      type: Array,
      default: () => []
    },
    converterWaveforms: {
      type: Array,
      default: () => []
    },
    waveformViewMode: {
      type: String,
      default: 'magnetic'
    },
    waveformForceUpdate: {
      type: Number,
      default: 0
    },
    simulatingWaveforms: {
      type: Boolean,
      default: false
    },
    waveformError: {
      type: String,
      default: ''
    },
    waveformSource: {
      type: String,
      default: ''
    },
    /** Error message displayed at the top of the wizard */
    errorMessage: {
      type: String,
      default: ''
    },
    /** Number of periods selector value */
    numberOfPeriods: {
      type: Number,
      default: 2
    },
    /** Number of steady-state periods */
    numberOfSteadyStatePeriods: {
      type: Number,
      default: 1
    },
    /** Whether to show periods/steady-state selectors in waveform header */
    showPeriodsSelector: {
      type: Boolean,
      default: true
    },
    /** Whether to show steady-state selector */
    showSteadyStateSelector: {
      type: Boolean,
      default: true
    },
    /** Disable action buttons */
    disableActions: {
      type: Boolean,
      default: false
    },
  },
  emits: [
    'update:waveformViewMode',
    'update:numberOfPeriods',
    'update:numberOfSteadyStatePeriods',
    'get-analytical-waveforms',
    'get-simulated-waveforms',
    'dismiss-error',
  ],

  computed: {
    primaryColor() {
      return this.$styleStore?.theme?.primary || '#b18aea';
    },
    primaryRgb() {
      // Convert hex to rgb for rgba() usage
      const hex = this.primaryColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return { r, g, b };
    },
    headerBgStyle() {
      const { r, g, b } = this.primaryRgb;
      return {
        background: `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.15) 0%, rgba(${r}, ${g}, ${b}, 0.05) 50%, rgba(${r}, ${g}, ${b}, 0.1) 100%)`,
        borderBottom: `1px solid rgba(${r}, ${g}, ${b}, 0.25)`
      };
    },
    iconContainerStyle() {
      const { r, g, b } = this.primaryRgb;
      return {
        background: `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.3) 0%, rgba(${r}, ${g}, ${b}, 0.15) 100%)`,
        border: `1px solid rgba(${r}, ${g}, ${b}, 0.4)`,
        boxShadow: `0 4px 15px rgba(${r}, ${g}, ${b}, 0.2)`
      };
    },
    col1Class() {
      return `col-12 col-xl-${this.col1Width}`;
    },
    col2Class() {
      return `col-12 col-xl-${this.col2Width}`;
    },
    col3Class() {
      return `col-12 col-xl-${this.col3Width}`;
    }
  },

  methods: {

    // ===================================================================
    // CENTRALIZED WAVEFORM ORCHESTRATION
    // Called by wizards: this.$refs.base.executeWaveformAction(this, 'analytical'|'simulation')
    // Wizard must implement: buildParams(mode), getCalculateFn(), getSimulateFn(), 
    //                        getDefaultFrequency(), and optionally postProcessResults(result, mode)
    // ===================================================================
    async executeWaveformAction(wizard, mode) {
      wizard.waveformSource = mode;
      wizard.simulatingWaveforms = true;
      wizard.waveformError = '';
      wizard.magneticWaveforms = [];
      wizard.converterWaveforms = [];

      try {
        const aux = wizard.buildParams(mode);
        aux.numberOfPeriods = parseInt(wizard.numberOfPeriods, 10);
        if (mode === 'simulation') {
          aux.numberOfSteadyStatePeriods = parseInt(wizard.numberOfSteadyStatePeriods, 10);
        }

        let result;
        if (mode === 'analytical') {
          const calculateFn = wizard.getCalculateFn();
          result = await calculateFn(aux);
        } else {
          const simulateFn = wizard.getSimulateFn();
          result = await simulateFn(aux);
        }

        await this.processWaveformResults(wizard, result, {
          isSimulation: (mode === 'simulation'),
          defaultFrequency: wizard.getDefaultFrequency(),
          numberOfPeriods: wizard.numberOfPeriods,
        });

        if (wizard.postProcessResults) {
          wizard.postProcessResults(result, mode);
        }

        wizard.forceWaveformUpdate = (wizard.forceWaveformUpdate || 0) + 1;
        wizard.$nextTick(() => {
          const wfSection = wizard.$refs.base?.$refs?.waveformSection;
          if (wfSection) {
            wfSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      } catch (error) {
        console.error(`Error in ${mode} waveform action:`, error);
        wizard.waveformError = error.message || `Failed to get ${mode} waveforms`;
      }

      wizard.simulatingWaveforms = false;
    },
    // ===== LAYOUT EMITTERS =====
    setWaveformViewMode(mode) { this.$emit('update:waveformViewMode', mode); },
    onGetAnalyticalWaveforms() { this.$emit('get-analytical-waveforms'); },
    onGetSimulatedWaveforms() { this.$emit('get-simulated-waveforms'); },
    onDismissError() { this.$emit('dismiss-error'); },

    // ===== WAVEFORM BUILDING =====
    buildMagneticWaveformsFromInputs(operatingPoints, defaultFrequency) {
      if (!operatingPoints?.length) return [];
      return operatingPoints.map((op, opIdx) => {
        const opWf = { frequency: op.excitationsPerWinding?.[0]?.frequency || defaultFrequency, operatingPointName: op.name || `Operating Point ${opIdx+1}`, waveforms: [] };
        (op.excitationsPerWinding || []).forEach((exc, wIdx) => {
          const label = exc.name || (wIdx === 0 ? 'Primary' : `Secondary ${wIdx}`);
          if (exc.voltage?.waveform?.time && exc.voltage?.waveform?.data)
            opWf.waveforms.push({ label: `${label} Voltage`, x: exc.voltage.waveform.time, y: exc.voltage.waveform.data, type: 'voltage', unit: 'V' });
          if (exc.current?.waveform?.time && exc.current?.waveform?.data)
            opWf.waveforms.push({ label: `${label} Current`, x: exc.current.waveform.time, y: exc.current.waveform.data, type: 'current', unit: 'A' });
        });
        return opWf;
      }).filter(op => op.waveforms.length > 0);
    },

    convertConverterWaveforms(converterWaveforms, defaultFrequency) {
      if (!converterWaveforms?.length) return [];
      return converterWaveforms.map((cw, idx) => {
        const opWf = { frequency: cw.switchingFrequency || defaultFrequency, operatingPointName: cw.operatingPointName || `Operating Point ${idx+1}`, waveforms: [] };
        if (cw.inputVoltage?.time && cw.inputVoltage?.data)
          opWf.waveforms.push({ label: 'Input Voltage', x: cw.inputVoltage.time, y: cw.inputVoltage.data, type: 'voltage', unit: 'V' });
        if (cw.inputCurrent?.time && cw.inputCurrent?.data)
          opWf.waveforms.push({ label: 'Input Current', x: cw.inputCurrent.time, y: cw.inputCurrent.data, type: 'current', unit: 'A' });
        if (cw.outputVoltages) cw.outputVoltages.forEach((v, i) => {
          if (v.time && v.data) opWf.waveforms.push({ label: `Output ${i+1} Voltage`, x: v.time, y: v.data, type: 'voltage', unit: 'V' });
        });
        if (cw.outputCurrents) cw.outputCurrents.forEach((c, i) => {
          if (c.time && c.data) opWf.waveforms.push({ label: `Output ${i+1} Current`, x: c.time, y: c.data, type: 'current', unit: 'A' });
        });
        return opWf;
      });
    },

    // ===== WAVEFORM REPETITION =====
    repeatWaveformForPeriods(time, data, numberOfPeriods) {
      if (!time || !data || time.length === 0 || numberOfPeriods <= 1) return { time, data };
      const period = time[time.length-1] - time[0];
      const nT = [], nD = [];
      for (let p = 0; p < numberOfPeriods; p++) {
        const off = p * period;
        for (let i = 0; i < time.length; i++) {
          if (p > 0 && i === 0 && nT.length > 0 && Math.abs(nT[nT.length-1] - (time[i]+off)) < 1e-12) continue;
          nT.push(time[i] + off); nD.push(data[i]);
        }
      }
      return { time: nT, data: nD };
    },

    repeatWaveformsForPeriods(waveformsData, numberOfPeriods) {
      if (numberOfPeriods <= 1 || !waveformsData?.length) return waveformsData;
      return waveformsData.map(op => {
        if (!op.waveforms) return op;
        return { ...op, waveforms: op.waveforms.map(wf => {
          if (!wf.x || wf.x.length < 2) return wf;
          const period = wf.x[wf.x.length-1] - wf.x[0];
          const rX = [...wf.x], rY = [...wf.y];
          for (let p = 1; p < numberOfPeriods; p++) {
            const off = period * p;
            wf.x.slice(1).forEach(x => rX.push(x + off));
            wf.y.slice(1).forEach(y => rY.push(y));
          }
          return { ...wf, x: rX, y: rY };
        })};
      });
    },

    // ===== UNIFIED WAVEFORM PROCESSING =====
    async processWaveformResults(wizardInstance, result, options = {}) {
      const { isSimulation = false, defaultFrequency = 100000, numberOfPeriods = 2 } = options;
      
      // Determine which processing method to use
      let processed;
      if (isSimulation) {
        processed = this.processSimulationWaveforms(result, { defaultFrequency, numberOfPeriods });
      } else {
        processed = this.processAnalyticalWaveforms(result, { numberOfPeriods });
      }
      
      // Assign to wizard instance properties
      wizardInstance.simulatedOperatingPoints = processed.operatingPoints;
      wizardInstance.designRequirements = processed.designRequirements;
      wizardInstance.magneticWaveforms = processed.magneticWaveforms;
      wizardInstance.converterWaveforms = processed.converterWaveforms;
      
      // Assign to masStore inputs
      this.assignResultsToMasStore(wizardInstance, processed);
      
      // Set operating points mode to Manual
      this.setOperatingPointsModeToManual(wizardInstance);
      
      return processed;
    },
    
    // Assign results to masStore
    assignResultsToMasStore(wizardInstance, processed) {
      const { operatingPoints, designRequirements } = processed;
      
      // Assign operating points
      if (operatingPoints?.length > 0) {
        wizardInstance.masStore.mas.inputs.operatingPoints = operatingPoints;
      }
      
      // Merge design requirements
      if (designRequirements) {
        wizardInstance.masStore.mas.inputs.designRequirements = {
          ...wizardInstance.masStore.mas.inputs.designRequirements,
          ...designRequirements
        };
      }
    },
    
    // Set all operating points to Manual mode
    setOperatingPointsModeToManual(wizardInstance) {
      const numPoints = wizardInstance.simulatedOperatingPoints?.length || 1;
      wizardInstance.$stateStore.operatingPoints.modePerPoint = [];
      for (let i = 0; i < numPoints; i++) {
        wizardInstance.$stateStore.operatingPoints.modePerPoint.push(
          wizardInstance.$stateStore.OperatingPointsMode.Manual
        );
      }
    },
    
    // ===== WAVEFORM PROCESSING FROM RESULTS =====
    processAnalyticalWaveforms(result, options = {}) {
      const { numberOfPeriods = 2 } = options;
      
      if (!result?.operatingPoints?.length) {
        throw new Error("Analytical calculation did not return operating points");
      }
      
      const operatingPoints = result.operatingPoints;
      const designRequirements = result.designRequirements;
      
      // Build magnetic waveforms from operating points
      let magneticWaveforms = this.buildMagneticWaveformsFromInputs(operatingPoints);
      
      // Note: We do NOT repeat waveforms here because the backend MKF already
      // applies numberOfPeriods when generating the waveforms in operatingPoints.
      // Repeating them again would result in 2x, 3x, etc. the requested periods.
      
      // Process and filter waveforms
      magneticWaveforms = magneticWaveforms.map(wf => ({
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
      
      return {
        operatingPoints,
        designRequirements,
        magneticWaveforms,
        converterWaveforms: []
      };
    },
    
    processSimulationWaveforms(result, options = {}) {
      const { defaultFrequency = 100000, numberOfPeriods = 2 } = options;

      if (result.error) {
        throw new Error(result.error);
      }

      // Standard format: { converterWaveforms: [...], inputs: { operatingPoints: [...], designRequirements: {...} } }
      // Or: { converterWaveforms: [...], operatingPoints: [...], designRequirements: {...} }
      const converterWaveforms = result.converterWaveforms || [];
      const operatingPoints = result.inputs?.operatingPoints || result.operatingPoints || [];
      const designRequirements = result.inputs?.designRequirements || result.designRequirements || null;

      if (operatingPoints.length === 0) {
        throw new Error("Simulation did not return operating points");
      }

      // Build magnetic waveforms from operating points (consistent across all topologies)
      const magneticWaveforms = this.buildMagneticWaveformsFromInputs(operatingPoints, defaultFrequency);

      if (magneticWaveforms.length === 0) {
        throw new Error("No magnetic waveforms were generated from operating points");
      }

      return {
        operatingPoints,
        designRequirements,
        magneticWaveforms,
        converterWaveforms
      };
    },

    // ===== VISUALIZER HELPERS =====
    getTimeAxisOptions() { return { label: 'Time', colorLabel: '#d4d4d4', type: 'value', unit: 's' }; },
    getWaveformsList(waveforms, opIdx) { return waveforms?.[opIdx]?.waveforms || []; },

    getSingleWaveformDataForVisualizer(waveforms, opIdx, wfIdx) {
      const wf = waveforms?.[opIdx]?.waveforms?.[wfIdx];
      if (!wf) return [];
      let yData = wf.y;
      const isV = wf.unit === 'V', isI = wf.unit === 'A';
      if (isV && yData?.length > 0) {
        const s = [...yData].sort((a, b) => a - b);
        const p5 = s[Math.floor(s.length * 0.05)], p95 = s[Math.floor(s.length * 0.95)];
        const r = p95 - p5, m = r * 0.1;
        yData = yData.map(v => Math.max(p5 - m, Math.min(p95 + m, v)));
      }
      let color = '#ffffff';
      if (isV) color = this.$styleStore?.operatingPoints?.voltageGraph?.color || '#b18aea';
      else if (isI) color = this.$styleStore?.operatingPoints?.currentGraph?.color || '#4CAF50';
      return [{ label: wf.label, data: { x: wf.x, y: yData }, colorLabel: color, type: 'value', position: 'left', unit: wf.unit, numberDecimals: 6 }];
    },

    _clipVoltage(yData) {
      if (!yData?.length) return yData;
      const s = [...yData].sort((a, b) => a - b);
      const p5 = s[Math.floor(s.length * 0.05)], p95 = s[Math.floor(s.length * 0.95)];
      const r = p95 - p5, m = r * 0.1;
      return yData.map(v => Math.max(p5 - m, Math.min(p95 + m, v)));
    },

    _axisLimits(yData) {
      if (!yData?.length) return { mn: null, mx: null };
      const s = [...yData].sort((a, b) => a - b);
      const p5 = s[Math.floor(s.length * 0.05)], p95 = s[Math.floor(s.length * 0.95)];
      const r = p95 - p5, m = r * 0.1;
      return { mn: p5 - m, mx: p95 + m };
    },

    getPairedWaveformsList(waveforms, opIdx) {
      if (!waveforms?.[opIdx]?.waveforms) return [];
      const all = waveforms[opIdx].waveforms, pairs = [], used = new Set();
      all.forEach((wf, idx) => {
        if (used.has(idx) || wf.unit !== 'V') return;
        const bn = wf.label.replace(/voltage/i, '').replace(/V$/i, '').trim();
        const ci = all.findIndex((c, ci) => {
          if (ci === idx || used.has(ci) || c.unit !== 'A') return false;
          const cn = c.label.replace(/current/i, '').replace(/I$/i, '').trim();
          return bn.toLowerCase() === cn.toLowerCase() ||
            wf.label.toLowerCase().includes(cn.toLowerCase()) ||
            c.label.toLowerCase().includes(bn.toLowerCase());
        });
        if (ci !== -1) { pairs.push({ voltage: { wf, idx }, current: { wf: all[ci], idx: ci } }); used.add(idx); used.add(ci); }
        else { pairs.push({ voltage: { wf, idx }, current: null }); used.add(idx); }
      });
      all.forEach((wf, idx) => { if (!used.has(idx) && wf.unit === 'A') { pairs.push({ voltage: null, current: { wf, idx } }); used.add(idx); } });
      return pairs;
    },

    getPairedWaveformDataForVisualizer(waveforms, opIdx, pairIdx) {
      const pairs = this.getPairedWaveformsList(waveforms, opIdx);
      if (!pairs[pairIdx]) return [];
      const pair = pairs[pairIdx], result = [];
      if (pair.voltage) {
        result.push({ label: pair.voltage.wf.label, data: { x: pair.voltage.wf.x, y: this._clipVoltage(pair.voltage.wf.y) },
          colorLabel: this.$styleStore?.operatingPoints?.voltageGraph?.color || '#b18aea', type: 'value', position: 'left', unit: 'V', numberDecimals: 6 });
      }
      if (pair.current) {
        result.push({ label: pair.current.wf.label, data: { x: pair.current.wf.x, y: pair.current.wf.y },
          colorLabel: this.$styleStore?.operatingPoints?.currentGraph?.color || '#4CAF50', type: 'value', position: 'right', unit: 'A', numberDecimals: 6 });
      }
      return result;
    },

    getPairedWaveformAxisLimits(waveforms, opIdx, pairIdx) {
      const pairs = this.getPairedWaveformsList(waveforms, opIdx);
      if (!pairs[pairIdx]) return { min: [], max: [] };
      const pair = pairs[pairIdx], min = [], max = [];
      [pair.voltage, pair.current].forEach(e => {
        if (e) { const l = this._axisLimits(e.wf.y); min.push(l.mn); max.push(l.mx); }
      });
      return { min, max };
    },

    getPairedWaveformTitle(waveforms, opIdx, pairIdx) {
      const pairs = this.getPairedWaveformsList(waveforms, opIdx);
      if (!pairs[pairIdx]) return '';
      const p = pairs[pairIdx];
      if (p.voltage && p.current) return p.voltage.wf.label.replace(/\s*\(Switch [Nn]ode\)/gi, '').replace(/voltage/i, '').replace(/V$/i, '').trim() || 'V & I';
      if (p.voltage) return p.voltage.wf.label.replace(/\s*\(Switch [Nn]ode\)/gi, '');
      if (p.current) return p.current.wf.label;
      return '';
    },

    getOperatingPointLabel(waveforms, opIdx) {
      return waveforms?.[opIdx]?.operatingPointName || `Operating Point ${opIdx + 1}`;
    },

    // ===== DISPLAY FORMATTERS =====
    getMagnetizingInductanceDisplay(simVal, dr) {
      if (simVal != null) return (simVal * 1e6).toFixed(1) + ' \u00B5H';
      if (dr?.magnetizingInductance?.nominal != null) return (dr.magnetizingInductance.nominal * 1e6).toFixed(1) + ' \u00B5H';
      return 'N/A';
    },

    getTurnsRatioDisplay(simTR, dr) {
      let tr = simTR?.length > 0 ? simTR : dr?.turnsRatios?.length > 0 ? dr.turnsRatios.map(t => t.nominal) : null;
      if (!tr?.length) return 'N/A';
      const parts = ['1'];
      for (const n of tr) { const inv = 1/n; parts.push(Math.abs(inv - Math.round(inv)) < 0.01 ? Math.round(inv).toString() : (1/n).toFixed(2)); }
      return parts.join(' : ');
    },

    formatFrequency(f) { if (f >= 1e9) return (f/1e9).toFixed(1)+' GHz'; if (f >= 1e6) return (f/1e6).toFixed(1)+' MHz'; if (f >= 1e3) return (f/1e3).toFixed(1)+' kHz'; return f.toFixed(0)+' Hz'; },
    formatImpedance(z) { if (z >= 1e6) return (z/1e6).toFixed(1)+' M\u03A9'; if (z >= 1e3) return (z/1e3).toFixed(1)+' k\u03A9'; return z.toFixed(1)+' \u03A9'; },
    formatInductance(l) { if (l >= 1) return l.toFixed(2)+' H'; if (l >= 1e-3) return (l*1e3).toFixed(2)+' mH'; if (l >= 1e-6) return (l*1e6).toFixed(2)+' \u00B5H'; return (l*1e9).toFixed(2)+' nH'; },
    formatCapacitance(c) { if (c >= 1e-3) return (c*1e3).toFixed(2)+' mF'; if (c >= 1e-6) return (c*1e6).toFixed(2)+' \u00B5F'; if (c >= 1e-9) return (c*1e9).toFixed(2)+' nF'; return (c*1e12).toFixed(2)+' pF'; },

    // ===== HARMONICS =====
    async pruneHarmonicsForInputs(inputs, tqs) {
      for (const op of inputs.operatingPoints) {
        if (!op.excitationsPerWinding) continue;
        for (const exc of op.excitationsPerWinding) {
          for (const [sig, th] of [['current', 0.1], ['voltage', 0.3]]) {
            if (exc[sig]?.harmonics?.amplitudes?.length > 1) {
              const mi = await tqs.getMainHarmonicIndexes(exc[sig].harmonics, th, 1);
              const ph = { amplitudes: [exc[sig].harmonics.amplitudes[0]], frequencies: [exc[sig].harmonics.frequencies[0]] };
              for (const i of mi) { ph.amplitudes.push(exc[sig].harmonics.amplitudes[i]); ph.frequencies.push(exc[sig].harmonics.frequencies[i]); }
              exc[sig].harmonics = ph;
            }
          }
        }
      }
      return inputs;
    },

    async processSimulatedOperatingPoints(ops, tqs) {
      for (const op of ops) {
        if (!op.excitationsPerWinding) continue;
        for (const exc of op.excitationsPerWinding) {
          const freq = exc.frequency;
          for (const [sig, th] of [['current', 0.1], ['voltage', 0.3]]) {
            if (exc[sig]?.waveform) {
              try {
                if (!exc[sig].harmonics?.amplitudes?.length) {
                  exc[sig].harmonics = await tqs.calculateHarmonics(exc[sig].waveform, freq);
                  const mi = await tqs.getMainHarmonicIndexes(exc[sig].harmonics, th, 1);
                  const ph = { amplitudes: [exc[sig].harmonics.amplitudes[0]], frequencies: [exc[sig].harmonics.frequencies[0]] };
                  for (const i of mi) { ph.amplitudes.push(exc[sig].harmonics.amplitudes[i]); ph.frequencies.push(exc[sig].harmonics.frequencies[i]); }
                  exc[sig].harmonics = ph;
                }
                if (!exc[sig].processed?.rms) {
                  const pr = await tqs.calculateProcessed(exc[sig].harmonics, exc[sig].waveform);
                  exc[sig].processed = { ...pr, label: "Custom" };
                }
              } catch (e) {
                console.error(`Error ${sig}:`, e);
                exc[sig].harmonics = { amplitudes: [0], frequencies: [freq] };
                exc[sig].processed = { label: "Custom", dutyCycle: 0.5, peakToPeak: 0, offset: 0, rms: 0 };
              }
            }
          }
        }
      }
      return ops;
    },

    // ===== NAVIGATION =====
    async navigateToReview(ss, ms, appType) {
      ss.resetMagneticTool(); ss.designLoaded();
      ss.selectApplication(ss.SupportedApplications[appType]);
      ss.selectWorkflow("design"); ss.selectTool("agnosticTool");
      ss.setCurrentToolSubsectionStatus("designRequirements", true);
      ss.setCurrentToolSubsectionStatus("operatingPoints", true);
      // Only set modePerPoint if not already set (preserves mode from waveform simulation)
      if (!ss.operatingPoints.modePerPoint || ss.operatingPoints.modePerPoint.length === 0) {
        ss.operatingPoints.modePerPoint = [];
        const numPoints = ms.mas.inputs.operatingPoints?.length || ms.mas.magnetic.coil.functionalDescription.length || 1;
        for (let i = 0; i < numPoints; i++) {
          ss.operatingPoints.modePerPoint.push(ss.OperatingPointsMode.Manual);
        }
      }
    },

    async navigateToAdvise(ss, ms, appType) {
      ss.resetMagneticTool(); ss.designLoaded();
      ss.selectApplication(ss.SupportedApplications[appType]);
      ss.selectWorkflow("design"); ss.selectTool("agnosticTool");
      ss.setCurrentToolSubsection("magneticBuilder");
      ss.setCurrentToolSubsectionStatus("designRequirements", true);
      ss.setCurrentToolSubsectionStatus("operatingPoints", true);
      // Only set modePerPoint if not already set (preserves mode from waveform simulation)
      if (!ss.operatingPoints.modePerPoint || ss.operatingPoints.modePerPoint.length === 0) {
        const numPoints = ms.mas.inputs.operatingPoints?.length || 1;
        ss.operatingPoints.modePerPoint = [];
        for (let i = 0; i < numPoints; i++) {
          ss.operatingPoints.modePerPoint.push(ss.OperatingPointsMode.Manual);
        }
      }
    },

    // ===== VALIDATION =====
    validateWaveforms(mwf) {
      if (!mwf) return null;
      for (const wf of mwf) {
        if (wf.waveforms) {
          for (const w of wf.waveforms) {
            if (w.y) { for (let i = 0; i < w.y.length; i++) { if (!Number.isFinite(w.y[i])) return "Waveform produced invalid values (NaN/Inf)."; } }
            if (w.x) { for (let i = 0; i < w.x.length; i++) { if (!Number.isFinite(w.x[i])) return "Time axis invalid."; } }
          }
        }
      }
      return null;
    },

    // ===== PERIOD EXTRACTION =====
    extractSinglePeriod(time, data, frequency) {
      if (!time || !data || time.length < 2) return { time, data };
      const td = time[time.length-1] - time[0];
      const ep = frequency > 0 ? 1 / frequency : td / 2;
      const np = Math.max(1, Math.round(td / ep));
      if (np <= 1) return { time, data };
      const pd = td / np; const dt = td / (time.length - 1);
      let ei = Math.floor(time.length / np);
      for (let i = Math.floor(ei * 0.9); i < Math.min(time.length, Math.floor(ei * 1.1)); i++) {
        if (time[i] - time[0] >= pd - dt) { ei = i + 1; break; }
      }
      return { time: time.slice(0, ei), data: data.slice(0, ei) };
    },

    extractSinglePeriodFromOperatingPoints(ops, freq) {
      if (!ops?.length) return ops;
      return ops.map(op => {
        if (!op.excitationsPerWinding?.length) return op;
        const ne = op.excitationsPerWinding.map(exc => {
          const e = { ...exc }; const f = exc.frequency || freq;
          if (exc.current?.waveform?.time && exc.current?.waveform?.data) {
            const sp = this.extractSinglePeriod(exc.current.waveform.time, exc.current.waveform.data, f);
            e.current = { ...exc.current, waveform: { ...exc.current.waveform, time: sp.time, data: sp.data } };
          }
          if (exc.voltage?.waveform?.time && exc.voltage?.waveform?.data) {
            const sp = this.extractSinglePeriod(exc.voltage.waveform.time, exc.voltage.waveform.data, f);
            e.voltage = { ...exc.voltage, waveform: { ...exc.voltage.waveform, time: sp.time, data: sp.data } };
          }
          return e;
        });
        return { ...op, excitationsPerWinding: ne };
      });
    },

    // ===== PROCESS WIZARD DATA =====
    /**
     * Gets operating points for masStore, using stored waveform data if available.
     * Falls back to analytical calculation if no stored data.
     * Always extracts single period from waveforms before returning.
     * Also calculates harmonics and processed data if missing from waveforms.
     * 
     * @param {Object} wi - Wizard instance with required methods/data
     * @param {Object} tqs - TaskQueueStore for calculating harmonics/processed
     * @returns {Promise<Object>} - { success: boolean, operatingPoints: Array, designRequirements: Object, error: string }
     */
    async processWizardData(wi, tqs) {
      try {
        const freq = wi.getDefaultFrequency ? wi.getDefaultFrequency() : (wi.getFrequency ? wi.getFrequency() : 100000);
        let ops, dr;
        
        // Check if we have stored operating points with waveforms (from Analytical or Simulated)
        const hasStoredData = wi.simulatedOperatingPoints && wi.simulatedOperatingPoints.length > 0;
        
        if (hasStoredData) {
          // Use stored data (from last Analytical or Simulated run)
          ops = this.extractSinglePeriodFromOperatingPoints(wi.simulatedOperatingPoints, freq);
          dr = wi.designRequirements;
        } else {
          // Fallback: run analytical calculation
          const aux = wi.buildParams ? wi.buildParams('analytical') : (wi.buildInputs ? await wi.buildInputs() : null);
          if (!aux) throw new Error("Wizard must implement buildParams() or buildInputs()");
          
          const calculateFn = wi.getCalculateFn();
          const r = await calculateFn(aux);
          if (r.error) throw new Error(r.error);
          
          ops = this.extractSinglePeriodFromOperatingPoints(r.operatingPoints, freq);
          dr = r.designRequirements;
        }
        
        // Calculate harmonics and processed data if missing (required for masStore)
        ops = await this.processSimulatedOperatingPoints(ops, tqs);
        
        await this.setupMasStore({ designRequirements: dr, operatingPoints: ops, topology: wi.getTopology(), isolationSides: wi.getIsolationSides(), insulationType: wi.getInsulationType?.(), wizardInstance: wi });
        return { success: true, operatingPoints: ops, designRequirements: dr };
      } catch (e) { 
        console.error('processWizardData:', e); 
        return { success: false, error: e.message }; 
      }
    },

    async setupMasStore({ designRequirements, operatingPoints, topology, isolationSides, insulationType, wizardInstance: wi }) {
      // Normalize operating points to ensure processed data is properly structured
      const normalizedOperatingPoints = operatingPoints.map(op => ({
        ...op,
        excitationsPerWinding: (op.excitationsPerWinding || []).map(exc => ({
          ...exc,
          current: exc.current ? {
            ...exc.current,
            processed: exc.current.processed || { label: 'Sinusoidal', dutyCycle: 0.5 }
          } : undefined,
          voltage: exc.voltage ? {
            ...exc.voltage,
            processed: exc.voltage.processed || { label: 'Sinusoidal', dutyCycle: 0.5 }
          } : undefined
        }))
      }));
      wi.masStore.mas.inputs = { designRequirements, operatingPoints: normalizedOperatingPoints };
      wi.masStore.mas.magnetic.coil.functionalDescription = operatingPoints[0].excitationsPerWinding.map((e, i) => ({
        name: e.name, numberTurns: 0, numberParallels: 0, isolationSide: isolationSides[i] || 'primary', wire: ""
      }));
      wi.masStore.mas.inputs.designRequirements.topology = topology;
      wi.masStore.mas.inputs.designRequirements.isolationSides = isolationSides;
      if (insulationType && insulationType !== 'No') {
        const { defaultDesignRequirements } = await import('/WebSharedComponents/assets/js/defaults.js');
        wi.masStore.mas.inputs.designRequirements.insulation = defaultDesignRequirements.insulation;
        wi.masStore.mas.inputs.designRequirements.insulation.insulationType = insulationType;
      }
    }
  }
}
</script>

<template>
  <div class="wizard-container container-fluid px-3">
    <!-- Header -->
    <slot name="header">
      <div class="wizard-header" :style="headerBgStyle">
        <div class="wizard-header-content">
          <div class="wizard-icon-container" :style="iconContainerStyle">
            <i :class="['fa-solid', titleIcon, 'wizard-icon']"></i>
          </div>
          <div class="wizard-title-section">
            <h4 class="wizard-title">{{ title }}</h4>
            <p v-if="subtitle" class="wizard-subtitle">{{ subtitle }}</p>
          </div>
        </div>
      </div>
    </slot>

    <!-- Top-level Error Message (dismissible) -->
    <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show py-2 mt-3" role="alert" style="font-size: 0.85rem;">
      <i class="fa-solid fa-exclamation-circle me-2"></i>{{ errorMessage }}
      <button type="button" class="btn-close btn-close-sm" @click="onDismissError"></button>
    </div>

    <div class="row g-2 mt-2">
      <!-- Column 1 -->
      <div :class="col1Class">
        <div class="d-flex flex-column gap-2">

          <!-- Design Mode -->
          <div class="compact-card">
            <div class="compact-header"><i class="fa-solid fa-sliders me-1"></i>Design Mode</div>
            <div class="compact-body ps-4">
              <slot name="design-mode">
              </slot>
            </div>
          </div>

          <!-- Conditional: Design Parameters OR Switch Params -->
          <div class="compact-card">
            <slot name="design-or-switch-parameters-title">
            </slot>
            <div class="compact-body ps-4 pe-3">
              <slot name="design-or-switch-parameters">
              </slot>
            </div>
          </div>

          <!-- Conditions -->
          <div class="compact-card">
            <div class="compact-header"><i class="fa-solid fa-gauge-high me-1"></i>Conditions</div>
            <div class="compact-body ps-4">
              <slot name="conditions">
              </slot>
          </div>
          </div>
        </div>
        <!-- Footer area below col1 (actions, inline error, etc.) -->
        <slot name="col1-footer">
          <!-- Wizard can place action buttons here -->
        </slot>
      </div>

      <!-- Column 2 -->
      <div :class="col2Class">
        <div class="d-flex flex-column gap-2">

          <!-- Input Voltage -->
          <div v-if="showInputVoltage" class="compact-card">
            <div class="compact-header"><i class="fa-solid fa-plug me-1"></i>Input Voltage</div>
            <div class="compact-body">
              <slot name="input-voltage">
              </slot>
            </div>
          </div>

          <!-- Outputs -->
          <div class="compact-card">
            <div class="compact-header"><i class="fa-solid fa-arrow-right-from-bracket me-1"></i>Outputs</div>
            <div class="compact-body ps-4 pe-3">
              <slot name="outputs">
              </slot>
            </div>
          </div>

        </div>
      </div>

      <!-- Column 3: Visualization -->
      <div :class="col3Class">
        <div class="d-flex flex-column gap-2">

          <!-- Waveforms Card -->
          <div class="compact-card simulation-card" :class="'h-100'">
            <div class="compact-header d-flex justify-content-between align-items-center">
              <span><i class="fa-solid fa-wave-square me-1"></i>Waveforms</span>
              <div class="d-flex align-items-center gap-2">
                <!-- Periods Selector -->
                <div v-if="showPeriodsSelector" class="periods-selector">
                  <label class="periods-label">Periods:</label>
                  <select
                    :value="numberOfPeriods"
                    @change="$emit('update:numberOfPeriods', Number($event.target.value))"
                    class="periods-select"
                  >
                    <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
                  </select>
                </div>
                <!-- Steady State Selector -->
                <div v-if="showSteadyStateSelector" class="periods-selector">
                  <label class="periods-label">Steady:</label>
                  <input
                    type="number"
                    :value="numberOfSteadyStatePeriods"
                    @input="$emit('update:numberOfSteadyStatePeriods', Number($event.target.value))"
                    min="1"
                    max="20"
                    class="periods-select"
                    style="width: 50px;"
                  />
                </div>
                <!-- Waveform Control Buttons -->
                <div class="sim-btns">
                  <slot name="waveform-controls">
                    <button
                      class="sim-btn analytical"
                      :disabled="disableActions || simulatingWaveforms"
                      @click="onGetAnalyticalWaveforms"
                      title="Get analytical waveforms"
                    >
                      <span v-if="simulatingWaveforms && waveformSource === 'analytical'">
                        <i class="fa-solid fa-spinner fa-spin"></i>
                      </span>
                      <span v-else><i class="fa-solid fa-calculator"></i> Analytical</span>
                    </button>
                    <button
                      class="sim-btn"
                      :disabled="disableActions || simulatingWaveforms"
                      @click="onGetSimulatedWaveforms"
                      title="Simulate ideal waveforms"
                    >
                      <span v-if="simulatingWaveforms && waveformSource === 'simulation'">
                        <i class="fa-solid fa-spinner fa-spin"></i>
                      </span>
                      <span v-else><i class="fa-solid fa-play"></i> Simulated</span>
                    </button>
                  </slot>
                </div>
              </div>
            </div>
            <div class="compact-body simulation-body">
              <div v-if="waveformError" class="error-text mb-2">
                <i class="fa-solid fa-exclamation-circle me-1"></i>{{ waveformError }}
              </div>
              <slot name="waveforms">
                <ConverterWaveformVisualizer
                  :magneticWaveforms="magneticWaveforms"
                  :converterWaveforms="converterWaveforms"
                  :viewMode="waveformViewMode"
                  @update:viewMode="setWaveformViewMode"
                  :forceUpdate="waveformForceUpdate"
                />
              </slot>
            </div>
          </div>

          <!-- Extra content in col3 -->
          <slot name="col3-extra"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.wizard-container { max-width: 1800px; margin: 0 auto; }

/* Header Styles */
.wizard-header { 
  border-radius: 12px; 
  padding: 16px 24px;
  margin-bottom: 16px;
}

.wizard-header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.wizard-icon-container {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wizard-icon {
  font-size: 1.75rem;
  color: v-bind('primaryColor');
}

.wizard-title-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wizard-title { 
  font-size: 1.4rem; 
  font-weight: 600; 
  color: v-bind('primaryColor');
  margin: 0;
  letter-spacing: -0.02em;
}

.wizard-subtitle {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  font-weight: 400;
}

/* Card styles - using primary color tones */
.compact-card { background: rgba(30, 30, 40, 0.6); border: 1px solid v-bind('"rgba(" + primaryRgb.r + ", " + primaryRgb.g + ", " + primaryRgb.b + ", 0.2)"'); border-radius: 8px; overflow: hidden; }
.compact-header { padding: 6px 10px; background: v-bind('"rgba(" + primaryRgb.r + ", " + primaryRgb.g + ", " + primaryRgb.b + ", 0.1)"'); border-bottom: 1px solid v-bind('"rgba(" + primaryRgb.r + ", " + primaryRgb.g + ", " + primaryRgb.b + ", 0.15)"'); font-size: 0.8rem; font-weight: 500; color: v-bind('primaryColor'); }
.compact-body { padding: 8px; }

/* Schematic */
.schematic-card { min-height: 200px; }
.schematic-body { min-height: 180px; }

/* Simulation / Waveforms */
.simulation-card { min-height: 300px; }
.simulation-body { min-height: 250px; display: flex; flex-direction: column; }

/* Action Buttons - using primary color tones */
.action-btns { display: flex; gap: 8px; }
.action-btn-sm { padding: 6px 14px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; cursor: pointer; border: none; }
.action-btn-sm.primary { background: linear-gradient(135deg, v-bind('primaryColor') 0%, v-bind('"rgba(" + primaryRgb.r + ", " + primaryRgb.g + ", " + primaryRgb.b + ", 0.7)"') 100%); color: white; }
.action-btn-sm.secondary { background: v-bind('"rgba(" + primaryRgb.r + ", " + primaryRgb.g + ", " + primaryRgb.b + ", 0.15)"'); border: 1px solid v-bind('"rgba(" + primaryRgb.r + ", " + primaryRgb.g + ", " + primaryRgb.b + ", 0.3)"'); color: v-bind('primaryColor'); }
.action-btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }

/* Sim Buttons - using primary color tones */
.sim-btns { display: flex; gap: 4px; }
.sim-btn { background: linear-gradient(135deg, v-bind('primaryColor') 0%, v-bind('"rgba(" + primaryRgb.r + ", " + primaryRgb.g + ", " + primaryRgb.b + ", 0.7)"') 100%); border: none; border-radius: 4px; padding: 4px 10px; color: white; font-size: 0.7rem; font-weight: 500; cursor: pointer; }
.sim-btn.analytical { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }
.sim-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Periods selector - using primary color tones */
.periods-selector { display: flex; align-items: center; gap: 4px; }
.periods-label { font-size: 0.75rem; color: #888; }
.periods-select { background: v-bind('headerBgStyle["background-color"] || "#1a1a2e"'); border: 1px solid v-bind('"rgba(" + primaryRgb.r + ", " + primaryRgb.g + ", " + primaryRgb.b + ", 0.3)"'); border-radius: 4px; padding: 2px 6px; font-size: 0.75rem; color: inherit; }

/* Design mode radio buttons */
.design-mode-selector { display: flex; flex-direction: column; gap: 4px; }
.design-mode-option { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.8rem; color: v-bind('$styleStore?.wizard?.inputTextColor?.color || $styleStore?.wizard?.inputTextColor || "#ccc"'); }
.design-mode-option input[type="radio"] { accent-color: v-bind('primaryColor'); }
.design-mode-label { font-size: 0.8rem; }

/* Computed value display */
.computed-value-row { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; font-size: 0.8rem; }
.computed-label { color: v-bind('$styleStore?.wizard?.inputTextColor?.color || $styleStore?.wizard?.inputTextColor || "#aaa"'); }
.computed-value { color: v-bind('primaryColor'); font-weight: 500; }

/* Waveform items */
.waveform-item { margin-bottom: 8px; }

/* Empty state */
.empty-state-compact { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: rgba(255, 255, 255, 0.3); font-size: 0.9rem; gap: 8px; }
.empty-state-compact i { font-size: 2rem; }

/* Error text */
.error-text { color: #ff6b6b; font-size: 0.8rem; }

/* Form check */
.form-check-label.small { font-size: 0.75rem; }

/* Responsive */
@media (max-width: 1199px) {
  .schematic-card { min-height: 250px; }
  .schematic-body { min-height: 230px; }
  
  .wizard-header { padding: 12px 16px; }
  .wizard-icon-container { width: 48px; height: 48px; }
  .wizard-icon { font-size: 1.5rem; }
  .wizard-title { font-size: 1.2rem; }
}
</style>
