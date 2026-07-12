import { defineStore } from 'pinia'
import { waitForMkf, isWorkerMode } from 'WebSharedComponents/assets/js/mkfRuntime'
// Converter design + ngspice simulation moved from webMKF (magnetics-only now) to webKirchhoff.
// In the converter wizard methods below, the `mkf` local is the webKirchhoff proxy (waitForKirchhoff),
// NOT the magnetics module. Its proxy accepts the legacy per-topology function names
// (calculate_<topo>_inputs / simulate_<topo>_ideal_waveforms / generate_<topo>_ngspice_circuit) and
// reshapes webKirchhoff's process_converter/design_tas output back to the legacy contract — see
// kirchhoffRuntime.js. Magnetics methods (extract_operating_point, calculate_advised_*, mas_autocomplete,
// load_*, current transformer / CMC / DMC below) stay on webMKF via waitForMkf().
import { waitForKirchhoff } from 'WebSharedComponents/assets/js/kirchhoffRuntime'
import { Convert as MasConvert } from 'WebSharedComponents/assets/ts/MAS.ts'
import { clean } from 'WebSharedComponents/assets/js/utils'
import { useInventoryStore, ENGINE_HAS_CONTEXT_ADVISERS } from '../stores/inventory'

// MAS sentry. Validates an outgoing payload against the generated MAS schema
// (via quicktype's `Convert.to*`) before we hand it to the WASM. Loud failure
// here is far cheaper to diagnose than a generic "Input JSON does not conform
// to schema!" coming back from C++ MAS.hpp deserialization.
//
// `where`: short label for the call site (e.g. "calculateAdvisedCores").
// `kind`:  one of "Mas" | "Inputs" | "Magnetic" | "Coil" | "Wire".
// `obj`:   the JS object we are about to JSON.stringify and send to WASM.
//
// We never silently downgrade — on failure we throw with the full quicktype
// error message (which includes the offending field path).
function masSentry(where, kind, obj) {
    const fn = MasConvert['to' + kind];
    if (typeof fn !== 'function') {
        throw new Error(`[MAS sentry @ ${where}] Unknown sentry kind "${kind}" (no Convert.to${kind} in MAS.ts)`);
    }
    // Sentry-local cleaner. Recursively strips keys whose value is `null`,
    // `"null"`, or `undefined` from objects (not arrays). Quicktype's optional
    // fields are decoded as `u(undefined, ...)` and reject explicit `null`.
    // We INTENTIONALLY do NOT strip empty arrays or empty objects: required
    // array fields (e.g. `outputs`) must remain present even when empty.
    function stripNulls(v) {
        if (Array.isArray(v)) {
            for (const item of v) stripNulls(item);
            return v;
        }
        if (v && typeof v === 'object') {
            for (const k of Object.keys(v)) {
                const val = v[k];
                if (val === null || val === 'null' || val === undefined) {
                    delete v[k];
                } else {
                    stripNulls(val);
                }
            }
        }
        return v;
    }
    try {
        const cleaned = stripNulls(JSON.parse(JSON.stringify(obj)));
        fn(JSON.stringify(cleaned));
    } catch (e) {
        const cleaned = stripNulls(JSON.parse(JSON.stringify(obj)));
        const dr = cleaned?.inputs?.designRequirements ?? cleaned?.designRequirements ?? cleaned;
        const drKeys = dr ? Object.keys(dr) : '<no DR>';
        const drApp = dr ? ('application' in dr ? `application=${JSON.stringify(dr.application)}` : '<no application key>') : '';
        const msg = `[MAS sentry @ ${where}/${kind}] Frontend produced invalid payload: ${e.message} | DR keys: ${JSON.stringify(drKeys)} | ${drApp}`;
        // eslint-disable-next-line no-console
        console.error(msg);
        throw new Error(msg);
    }
}

/**
 * Convert Embind vector or array to JS array.
 * In worker mode, vectors are already converted to arrays.
 * In main-thread mode, we need to iterate using .size() and .get()
 */
function toArray(vectorOrArray) {
    if (vectorOrArray == null) return [];
    
    // Already a JS array (worker mode)
    if (Array.isArray(vectorOrArray)) {
        return vectorOrArray;
    }
    
    // Embind vector (main-thread mode)
    if (typeof vectorOrArray.size === 'function') {
        const arr = [];
        for (let i = 0; i < vectorOrArray.size(); i++) {
            arr.push(vectorOrArray.get(i));
        }
        return arr;
    }
    
    // Unknown type, return as-is
    return vectorOrArray;
}

/**
 * WebFrontend Task Queue Store
 * 
 * This store provides a centralized way to call MKF methods,
 * supporting both Web Worker mode and main-thread mode.
 * 
 * Each method follows the pattern:
 * 1. Wait for MKF to be ready
 * 2. Call the MKF method
 * 3. Parse/process the result
 * 4. Emit an action callback for reactive updates
 * 5. Return the result
 */
export const useTaskQueueStore = defineStore('taskQueue', {
    state: () => ({
        task_standard_response_delay: 20
    }),
    actions: {
        // ==========================================
        // Core/Material Data Methods
        // ==========================================

        coreDataCalculated(success = true, dataOrMessage = '') {
        },

        async calculateCoreData(core, resolveUnspecifiedDimensions = false) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const coreResult = await mkf.calculate_core_data(JSON.stringify(core), resolveUnspecifiedDimensions);
            if (coreResult.startsWith('Exception')) {
                setTimeout(() => { this.coreDataCalculated(false, coreResult); }, this.task_standard_response_delay);
                throw new Error(coreResult);
            }
            const coreData = JSON.parse(coreResult);
            setTimeout(() => { this.coreDataCalculated(true, coreData); }, this.task_standard_response_delay);
            return coreData;
        },

        materialDataGotten(success = true, dataOrMessage = '') {
        },

        async getMaterialData(materialName) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const materialResult = await mkf.get_material_data(materialName);
            if (materialResult.startsWith('Exception')) {
                setTimeout(() => { this.materialDataGotten(false, materialResult); }, this.task_standard_response_delay);
                throw new Error(materialResult);
            }
            const materialData = JSON.parse(materialResult);
            setTimeout(() => { this.materialDataGotten(true, materialData); }, this.task_standard_response_delay);
            return materialData;
        },

        coreTemperatureDependantParametersGotten(success = true, dataOrMessage = '') {
        },

        async getCoreTemperatureDependantParameters(core, temperature) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.get_core_temperature_dependant_parameters(JSON.stringify(core), temperature);
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.coreTemperatureDependantParametersGotten(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const data = JSON.parse(result);
            setTimeout(() => { this.coreTemperatureDependantParametersGotten(true, data); }, this.task_standard_response_delay);
            return data;
        },

        masAutocompleted(success = true, dataOrMessage = '') {
        },

        async masAutocomplete(mas, flag = false, settings = {}) {
            const mkf = await waitForMkf();
            await mkf.ready;

            masSentry('masAutocomplete', 'Mas', mas);
            const result = await mkf.mas_autocomplete(JSON.stringify(mas), flag, JSON.stringify(settings));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.masAutocompleted(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const masResult = JSON.parse(result);
            setTimeout(() => { this.masAutocompleted(true, masResult); }, this.task_standard_response_delay);
            return masResult;
        },

        // ==========================================
        // Settings Methods
        // ==========================================

        settingsGotten(success = true, dataOrMessage = '') {
        },

        async getSettings() {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.get_settings();
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.settingsGotten(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const settings = JSON.parse(result);
            setTimeout(() => { this.settingsGotten(true, settings); }, this.task_standard_response_delay);
            return settings;
        },

        settingsSet(success = true, dataOrMessage = '') {
        },

        async setSettings(settings) {
            const mkf = await waitForMkf();
            await mkf.ready;

            await mkf.set_settings(JSON.stringify(settings));
            setTimeout(() => { this.settingsSet(true, settings); }, this.task_standard_response_delay);
            return settings;
        },

        // ==========================================
        // Adviser Methods
        // ==========================================

        advisedCoresCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvisedCores(inputs, weights, count, mode) {
            const mkf = await waitForMkf();
            await mkf.ready;

            // Deep-clone so sanitization below never mutates the caller's MAS store
            inputs = JSON.parse(JSON.stringify(inputs));

            // Ensure mode is a valid string
            let modeString = String(mode);
            // Fix case where mode is "[object Object]" due to JS object corruption
            if (modeString === '[object Object]' || !['available cores', 'standard cores', 'custom cores', 'hybrid cores'].includes(modeString)) {
                console.warn('[DEBUG calculateAdvisedCores] Invalid mode detected:', modeString, '- resetting to "standard cores"');
                modeString = 'standard cores';
            }
            console.log('[DEBUG calculateAdvisedCores] mode:', modeString);
            console.log('[DEBUG calculateAdvisedCores] weights:', weights);
            console.log('[DEBUG calculateAdvisedCores] count:', count);

            // Validate and fix frequency before calling WASM
            // Frequency must be a reasonable value (1 Hz to 100 MHz range)
            // Values outside this range are likely uninitialized/garbage
            const DEFAULT_FREQUENCY = 100000; // 100 kHz default
            const MIN_VALID_FREQUENCY = 1; // 1 Hz minimum
            const MAX_VALID_FREQUENCY = 100000000; // 100 MHz maximum
            if (inputs.operatingPoints && inputs.operatingPoints.length > 0) {
                inputs.operatingPoints.forEach((op, opIndex) => {
                    if (op.excitationsPerWinding && op.excitationsPerWinding.length > 0) {
                        op.excitationsPerWinding.forEach((exc, excIndex) => {
                            const freq = exc.frequency;
                            if (!freq || !Number.isFinite(freq) || freq < MIN_VALID_FREQUENCY || freq > MAX_VALID_FREQUENCY) {
                                console.warn(`[DEBUG calculateAdvisedCores] Invalid frequency=${freq} in operating point ${opIndex}, excitation ${excIndex}. Set to ${DEFAULT_FREQUENCY}`);
                                exc.frequency = DEFAULT_FREQUENCY;
                            }
                        });
                    }
                });
            }

            // Sanitize harmonics and waveforms before sending to WASM.
            // calculate_buck_inputs returns zero-freq harmonics and null-padded waveform
            // time arrays for some operating points; strip them before WASM validation.
            if (inputs.operatingPoints) {
                inputs.operatingPoints.forEach((op) => {
                    if (op.excitationsPerWinding) {
                        op.excitationsPerWinding.forEach((exc) => {
                            for (const signal of ['current', 'voltage']) {
                                if (!exc[signal]) continue;
                                if (exc[signal].harmonics) {
                                    const sanitized = this._sanitizeHarmonics(exc[signal].harmonics);
                                    if (this._hasValidHarmonics(sanitized)) {
                                        exc[signal].harmonics = sanitized;
                                    } else {
                                        delete exc[signal].harmonics;
                                    }
                                }
                                const waveform = exc[signal].waveform;
                                if (waveform?.time) {
                                    const firstNull = waveform.time.indexOf(null);
                                    if (firstNull === 0) {
                                        delete exc[signal].waveform;
                                    } else if (firstNull > 0) {
                                        waveform.time = waveform.time.slice(0, firstNull);
                                        if (waveform.data) waveform.data = waveform.data.slice(0, firstNull);
                                    }
                                }
                            }
                        });
                    }
                });
            }

            masSentry('calculateAdvisedCores', 'Inputs', inputs);
            // Inventory scoping: with scope 'only', run against the account
            // inventory through the engine's LibraryContext instead of the
            // public catalog (the context is loaded on engine init /
            // scope change by inventory.applyScope).
            const inventoryStore = useInventoryStore();
            let result;
            if (inventoryStore.scope === 'only') {
                if (!ENGINE_HAS_CONTEXT_ADVISERS) {
                    throw new Error("Inventory-only advising needs the next engine update (gate in inventory.js)");
                }
                result = await mkf.calculate_advised_cores_with_context(
                    JSON.stringify(inputs), JSON.stringify(weights), count, modeString, '{}', true);
            } else {
                result = await mkf.calculate_advised_cores(JSON.stringify(inputs), JSON.stringify(weights), count, modeString);
            }
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.advisedCoresCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const advisedCores = JSON.parse(result);
            setTimeout(() => { this.advisedCoresCalculated(true, advisedCores); }, this.task_standard_response_delay);
            return advisedCores;
        },

        advisedMagneticsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvisedMagnetics(inputs, weights, count, mode) {
            const mkf = await waitForMkf();
            await mkf.ready;

            // Deep-clone so sanitization below never mutates the caller's MAS store
            inputs = JSON.parse(JSON.stringify(inputs));

            // Transform weights keys from UPPERCASE to Title Case for MKF compatibility
            const weightsMapping = {
                'COST': 'Cost',
                'LOSSES': 'Losses',
                'DIMENSIONS': 'Dimensions',
                'EFFICIENCY': 'Efficiency',
                'AREA_PRODUCT': 'Area Product',
                'ENERGY_STORED': 'Energy Stored',
                'ESTIMATED_COST': 'Estimated Cost',
                'CORE_AND_DC_LOSSES': 'Core And DC Losses',
                'CORE_DC_AND_SKIN_LOSSES': 'Core DC And Skin Losses',
                'LOSSES_NO_PROXIMITY': 'Losses No Proximity',
                'CORE_MINIMUM_IMPEDANCE': 'Core Minimum Impedance',
                'AREA_NO_PARALLELS': 'Area No Parallels'
            };
            
            const transformedWeights = {};
            for (const [key, value] of Object.entries(weights)) {
                const transformedKey = weightsMapping[key] || key;
                transformedWeights[transformedKey] = value;
            }
            
            // Ensure mode is a valid string
            let modeString = String(mode);
            // Fix case where mode is "[object Object]" due to JS object corruption
            if (modeString === '[object Object]' || !['available cores', 'standard cores', 'custom cores', 'hybrid cores'].includes(modeString)) {
                modeString = 'standard cores';
            }

            // Validate and fix frequency before calling WASM
            const DEFAULT_FREQUENCY = 100000; // 100 kHz default
            if (inputs.operatingPoints && inputs.operatingPoints.length > 0) {
                inputs.operatingPoints.forEach((op, opIndex) => {
                    if (op.excitationsPerWinding && op.excitationsPerWinding.length > 0) {
                        op.excitationsPerWinding.forEach((exc, excIndex) => {
                            if (!exc.frequency || exc.frequency <= 0) {
                                exc.frequency = DEFAULT_FREQUENCY;
                            }
                        });
                    }
                });
            }

            // Sanitize harmonics and waveforms before sending to WASM.
            // calculate_buck_inputs can return zero-freq harmonics and null-padded waveform
            // time arrays for some operating points; strip them before WASM validation.
            if (inputs.operatingPoints) {
                inputs.operatingPoints.forEach((op) => {
                    if (op.excitationsPerWinding) {
                        op.excitationsPerWinding.forEach((exc) => {
                            for (const signal of ['current', 'voltage']) {
                                if (!exc[signal]) continue;
                                if (exc[signal].harmonics) {
                                    const sanitized = this._sanitizeHarmonics(exc[signal].harmonics);
                                    if (this._hasValidHarmonics(sanitized)) {
                                        exc[signal].harmonics = sanitized;
                                    } else {
                                        delete exc[signal].harmonics;
                                    }
                                }
                                const waveform = exc[signal].waveform;
                                if (waveform?.time) {
                                    const firstNull = waveform.time.indexOf(null);
                                    if (firstNull === 0) {
                                        delete exc[signal].waveform;
                                    } else if (firstNull > 0) {
                                        waveform.time = waveform.time.slice(0, firstNull);
                                        if (waveform.data) waveform.data = waveform.data.slice(0, firstNull);
                                    }
                                }
                            }
                        });
                    }
                });
            }

            masSentry('calculateAdvisedMagnetics', 'Inputs', inputs);
            // Inventory scoping — see calculateAdvisedCores.
            const inventoryStore = useInventoryStore();
            let result;
            if (inventoryStore.scope === 'only') {
                if (!ENGINE_HAS_CONTEXT_ADVISERS) {
                    throw new Error("Inventory-only advising needs the next engine update (gate in inventory.js)");
                }
                result = await mkf.calculate_advised_magnetics_with_context(
                    JSON.stringify(inputs), JSON.stringify(transformedWeights), count, modeString, '{}', true);
            } else {
                result = await mkf.calculate_advised_magnetics(JSON.stringify(inputs), JSON.stringify(transformedWeights), count, modeString);
            }
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.advisedMagneticsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const advisedMagnetics = JSON.parse(result);
            setTimeout(() => { this.advisedMagneticsCalculated(true, advisedMagnetics); }, this.task_standard_response_delay);
            return advisedMagnetics;
        },

        // ==========================================
        // Waveform Processing Methods
        // ==========================================

        harmonicsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateHarmonics(waveform, frequency) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_harmonics(JSON.stringify(waveform), frequency);
            if (result.startsWith("Exception")) {
                setTimeout(() => { this.harmonicsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            // WASM returns pre-allocated arrays padded with nulls — strip them at the source
            const harmonics = this._sanitizeHarmonics(JSON.parse(result));
            setTimeout(() => { this.harmonicsCalculated(true, harmonics); }, this.task_standard_response_delay);
            return harmonics;
        },

        processedCalculated(success = true, dataOrMessage = '') {
        },

        async calculateProcessed(harmonics, waveform) {
            const mkf = await waitForMkf();
            await mkf.ready;

            // Sanitize harmonics: strip null entries that cause WASM type errors
            const sanitizedHarmonics = this._sanitizeHarmonics(harmonics);
            const result = await mkf.calculate_processed(JSON.stringify(sanitizedHarmonics), JSON.stringify(waveform));
            if (result.startsWith("Exception")) {
                setTimeout(() => { this.processedCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const processed = JSON.parse(result);
            setTimeout(() => { this.processedCalculated(true, processed); }, this.task_standard_response_delay);
            return processed;
        },

        basicProcessedDataCalculated(success = true, dataOrMessage = '') {
        },

        async calculateBasicProcessedData(waveform) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_basic_processed_data(JSON.stringify(waveform));
            if (result.startsWith("Exception")) {
                setTimeout(() => { this.basicProcessedDataCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const processed = JSON.parse(result);
            setTimeout(() => { this.basicProcessedDataCalculated(true, processed); }, this.task_standard_response_delay);
            return processed;
        },

        waveformCreated(success = true, dataOrMessage = '') {
        },

        async createWaveform(processed, frequency) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.create_waveform(JSON.stringify(processed), frequency);
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.waveformCreated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveform = JSON.parse(result);
            setTimeout(() => { this.waveformCreated(true, waveform); }, this.task_standard_response_delay);
            return waveform;
        },

        waveformScaled(success = true, dataOrMessage = '') {
        },

        async scaleWaveformTimeToFrequency(waveform, frequency) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.scale_waveform_time_to_frequency(JSON.stringify(waveform), frequency);
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.waveformScaled(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const scaledWaveform = JSON.parse(result);
            setTimeout(() => { this.waveformScaled(true, scaledWaveform); }, this.task_standard_response_delay);
            return scaledWaveform;
        },

        excitationScaled(success = true, dataOrMessage = '') {
        },

        async scaleExcitationTimeToFrequency(excitation, frequency) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.scale_excitation_time_to_frequency(JSON.stringify(excitation), frequency);
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.excitationScaled(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const scaledExcitation = JSON.parse(result);
            setTimeout(() => { this.excitationScaled(true, scaledExcitation); }, this.task_standard_response_delay);
            return scaledExcitation;
        },

        signalDescriptorStandardized(success = true, dataOrMessage = '') {
        },

        async standardizeSignalDescriptor(signalDescriptor, frequency) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.standardize_signal_descriptor(JSON.stringify(signalDescriptor), frequency);
            if (typeof result === 'string' && result.startsWith("Exception")) {
                throw new Error(result);
            }
            const standardized = JSON.parse(result);
            setTimeout(() => { this.signalDescriptorStandardized(true, standardized); }, this.task_standard_response_delay);
            return standardized;
        },

        mainHarmonicIndexesGotten(success = true, dataOrMessage = '') {
        },

        async getMainHarmonicIndexes(harmonics, threshold, maxHarmonics) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.get_main_harmonic_indexes(JSON.stringify(harmonics), threshold, maxHarmonics);
            const indexes = toArray(result);
            setTimeout(() => { this.mainHarmonicIndexesGotten(true, indexes); }, this.task_standard_response_delay);
            return indexes;
        },

        // ==========================================
        // Power Calculation Methods
        // ==========================================

        rmsPowerCalculated(success = true, dataOrMessage = '') {
        },

        async calculateRmsPower(excitation) {
            // Validate excitation has required waveform data with actual numeric values
            const currentWaveform = excitation?.current?.waveform;
            const voltageWaveform = excitation?.voltage?.waveform;
            const currentData = currentWaveform?.data;
            const voltageData = voltageWaveform?.data;
            const currentTime = currentWaveform?.time;
            const voltageTime = voltageWaveform?.time;
            
            // Check that both waveforms exist and have actual data points with valid numbers
            if (!currentData || !voltageData || !currentTime || !voltageTime ||
                !Array.isArray(currentData) || !Array.isArray(voltageData) ||
                !Array.isArray(currentTime) || !Array.isArray(voltageTime) ||
                currentData.length === 0 || voltageData.length === 0 ||
                currentTime.length === 0 || voltageTime.length === 0 ||
                currentData.some(v => v == null || isNaN(v)) ||
                voltageData.some(v => v == null || isNaN(v))) {
                return null;
            }
            
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_rms_power(JSON.stringify(excitation));
            if (typeof result === 'string' && result.startsWith("Exception")) {
                setTimeout(() => { this.rmsPowerCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            setTimeout(() => { this.rmsPowerCalculated(true, result); }, this.task_standard_response_delay);
            return result;
        },

        instantaneousPowerCalculated(success = true, dataOrMessage = '') {
        },

        async calculateInstantaneousPower(excitation) {
            // Validate excitation has required waveform data with actual numeric values
            const currentWaveform = excitation?.current?.waveform;
            const voltageWaveform = excitation?.voltage?.waveform;
            const currentData = currentWaveform?.data;
            const voltageData = voltageWaveform?.data;
            const currentTime = currentWaveform?.time;
            const voltageTime = voltageWaveform?.time;
            
            // Check that both waveforms exist and have actual data points with valid numbers
            if (!currentData || !voltageData || !currentTime || !voltageTime ||
                !Array.isArray(currentData) || !Array.isArray(voltageData) ||
                !Array.isArray(currentTime) || !Array.isArray(voltageTime) ||
                currentData.length === 0 || voltageData.length === 0 ||
                currentTime.length === 0 || voltageTime.length === 0 ||
                currentData.some(v => v == null || isNaN(v)) ||
                voltageData.some(v => v == null || isNaN(v))) {
                return null;
            }
            
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_instantaneous_power(JSON.stringify(excitation));
            if (typeof result === 'string' && result.startsWith("Exception")) {
                setTimeout(() => { this.instantaneousPowerCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            setTimeout(() => { this.instantaneousPowerCalculated(true, result); }, this.task_standard_response_delay);
            return result;
        },

        // ==========================================
        // Dimension Resolution Methods
        // ==========================================

        dimensionResolved(success = true, dataOrMessage = '') {
        },

        async resolveDimensionWithTolerance(dimension) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.resolve_dimension_with_tolerance(JSON.stringify(dimension));
            setTimeout(() => { this.dimensionResolved(true, result); }, this.task_standard_response_delay);
            return result;
        },

        maximumDimensionsGotten(success = true, dataOrMessage = '') {
        },

        async getMaximumDimensions(magnetic) {
            const mkf = await waitForMkf();
            await mkf.ready;

            masSentry('getMaximumDimensions', 'Magnetic', magnetic);
            const result = await mkf.get_maximum_dimensions(JSON.stringify(magnetic));
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.maximumDimensionsGotten(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            // In worker mode the proxy already converts Embind vectors to plain arrays,
            // so `result` is a JS array (or an Embind vector with .get/.size in main mode).
            // Only JSON.parse if the worker returned a JSON string (legacy main-thread path).
            let dimensions;
            if (Array.isArray(result)) {
                dimensions = result;
            } else if (typeof result === 'string') {
                dimensions = JSON.parse(result);
            } else if (result && typeof result.size === 'function') {
                dimensions = [];
                for (let i = 0; i < result.size(); i++) dimensions.push(result.get(i));
            } else {
                dimensions = result;
            }
            setTimeout(() => { this.maximumDimensionsGotten(true, dimensions); }, this.task_standard_response_delay);
            return dimensions;
        },

        // ==========================================
        // Excitation Calculation Methods
        // ==========================================

        reflectedPrimaryCalculated(success = true, dataOrMessage = '') {
        },

        async calculateReflectedPrimary(excitation, turnRatio) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_reflected_primary(JSON.stringify(excitation), turnRatio);
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.reflectedPrimaryCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const reflected = JSON.parse(result);
            setTimeout(() => { this.reflectedPrimaryCalculated(true, reflected); }, this.task_standard_response_delay);
            return reflected;
        },

        reflectedSecondaryCalculated(success = true, dataOrMessage = '') {
        },

        async calculateReflectedSecondary(excitation, turnRatio) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_reflected_secondary(JSON.stringify(excitation), turnRatio);
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.reflectedSecondaryCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const reflected = JSON.parse(result);
            setTimeout(() => { this.reflectedSecondaryCalculated(true, reflected); }, this.task_standard_response_delay);
            return reflected;
        },

        inducedVoltageCalculated(success = true, dataOrMessage = '') {
        },

        async calculateInducedVoltage(excitation, magnetizingInductance) {
            const mkf = await waitForMkf();
            await mkf.ready;

            // Sanitize: strip null entries from harmonics before sending to WASM
            const sanitized = this._sanitizeExcitationForInduce(excitation);
            const result = await mkf.calculate_induced_voltage(JSON.stringify(sanitized), magnetizingInductance);
            if (result.startsWith('Exception')) {
                throw new Error(result);
            }
            const voltage = JSON.parse(result);
            setTimeout(() => { this.inducedVoltageCalculated(true, voltage); }, this.task_standard_response_delay);
            return voltage;
        },

        inducedCurrentCalculated(success = true, dataOrMessage = '') {
        },

        async calculateInducedCurrent(excitation, magnetizingInductance) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const sanitized = this._sanitizeExcitationForInduce(excitation);
            const result = await mkf.calculate_induced_current(JSON.stringify(sanitized), magnetizingInductance);
            if (result.startsWith('Exception')) {
                throw new Error(result);
            }
            const current = JSON.parse(result);
            setTimeout(() => { this.inducedCurrentCalculated(true, current); }, this.task_standard_response_delay);
            return current;
        },

        _sanitizeHarmonics(harmonics) {
            if (!harmonics) return harmonics;
            const h = JSON.parse(JSON.stringify(harmonics));
            if (h.amplitudes && h.frequencies) {
                let validLen = Math.min(h.amplitudes.length, h.frequencies.length);
                for (let i = 0; i < validLen; i++) {
                    if (h.amplitudes[i] == null || h.frequencies[i] == null) {
                        validLen = i;
                        break;
                    }
                }
                h.amplitudes = h.amplitudes.slice(0, validLen);
                h.frequencies = h.frequencies.slice(0, validLen);
                // Strip duplicate zero-frequency entries past index 0.
                // calculate_buck_inputs returns all-zero freq arrays for some operating points;
                // MKF rejects freq=0 past the DC slot. Index 0 at freq=0 is the valid DC
                // component and must be kept.
                const keep = h.frequencies.map((f, i) => i === 0 || f !== 0);
                h.amplitudes  = h.amplitudes.filter((_, i) => keep[i]);
                h.frequencies = h.frequencies.filter((_, i) => keep[i]);
            }
            return h;
        },

        _hasValidHarmonics(harmonics) {
            return harmonics?.amplitudes?.length > 0 && harmonics?.frequencies?.length > 0;
        },

        _sanitizeExcitationForInduce(excitation) {
            const clone = JSON.parse(JSON.stringify(excitation));
            for (const signal of ['current', 'voltage']) {
                if (clone[signal]?.harmonics) {
                    const h = clone[signal].harmonics;
                    if (h.amplitudes && h.frequencies) {
                        // Trim both arrays at the first null in either
                        let validLen = Math.min(h.amplitudes.length, h.frequencies.length);
                        for (let i = 0; i < validLen; i++) {
                            if (h.amplitudes[i] == null || h.frequencies[i] == null) {
                                validLen = i;
                                break;
                            }
                        }
                        h.amplitudes = h.amplitudes.slice(0, validLen);
                        h.frequencies = h.frequencies.slice(0, validLen);
                    }
                }
            }
            return clone;
        },

        // ==========================================
        // Leakage and Current Density Methods
        // ==========================================

        leakageInductanceCalculated(success = true, dataOrMessage = '') {
        },

        async calculateLeakageInductance(magnetic, frequency, operatingPointIndex) {
            const mkf = await waitForMkf();
            await mkf.ready;

            masSentry('calculateLeakageInductance', 'Magnetic', magnetic);
            const result = await mkf.calculate_leakage_inductance(JSON.stringify(magnetic), frequency, operatingPointIndex);
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.leakageInductanceCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const leakage = JSON.parse(result);
            setTimeout(() => { this.leakageInductanceCalculated(true, leakage); }, this.task_standard_response_delay);
            return leakage;
        },

        effectiveCurrentDensityCalculated(success = true, dataOrMessage = '') {
        },

        async calculateEffectiveCurrentDensity(wire, current, temperature) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_effective_current_density(JSON.stringify(wire), JSON.stringify(current), temperature);
            setTimeout(() => { this.effectiveCurrentDensityCalculated(true, result); }, this.task_standard_response_delay);
            return result;
        },

        // ==========================================
        // Exporter Methods
        // ==========================================

        magneticExportedAsSubcircuit(success = true, dataOrMessage = '') {
        },

        async exportMagneticAsSubcircuit(magnetic, temperature, format, extra) {
            const mkf = await waitForMkf();
            await mkf.ready;

            masSentry('exportMagneticAsSubcircuit', 'Magnetic', magnetic);
            const result = await mkf.export_magnetic_as_subcircuit(JSON.stringify(magnetic), temperature, format, extra);
            setTimeout(() => { this.magneticExportedAsSubcircuit(true, result); }, this.task_standard_response_delay);
            return result;
        },

        magneticExportedAsSymbol(success = true, dataOrMessage = '') {
        },

        async exportMagneticAsSymbol(magnetic, format, extra) {
            const mkf = await waitForMkf();
            await mkf.ready;

            masSentry('exportMagneticAsSymbol', 'Magnetic', magnetic);
            const result = await mkf.export_magnetic_as_symbol(JSON.stringify(magnetic), format, extra);
            setTimeout(() => { this.magneticExportedAsSymbol(true, result); }, this.task_standard_response_delay);
            return result;
        },

        // ==========================================
        // Operating Point Extraction Methods
        // ==========================================

        operatingPointExtracted(success = true, dataOrMessage = '') {
        },

        async extractOperatingPoint(file, numberWindings, frequency, magnetizingInductance, mapColumnNames) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.extract_operating_point(file, numberWindings, frequency, magnetizingInductance, JSON.stringify(mapColumnNames));
            // WASM bindings return "ERROR:<message>" on failure. Surface the real reason
            // instead of letting JSON.parse choke on the prefix.
            if (typeof result === 'string' && result.startsWith('ERROR:')) {
                const reason = result.slice('ERROR:'.length).trim();
                setTimeout(() => { this.operatingPointExtracted(false, reason); }, this.task_standard_response_delay);
                throw new Error(reason || 'Could not extract operating point from the uploaded file.');
            }
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.operatingPointExtracted(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const operatingPoint = JSON.parse(result);
            setTimeout(() => { this.operatingPointExtracted(true, operatingPoint); }, this.task_standard_response_delay);
            return operatingPoint;
        },

        mapColumnNamesExtracted(success = true, dataOrMessage = '') {
        },

        async extractMapColumnNames(file, numberWindings, frequency) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.extract_map_column_names(file, numberWindings, frequency);
            if (typeof result === 'string' && result.startsWith('ERROR:')) {
                const reason = result.slice('ERROR:'.length).trim();
                setTimeout(() => { this.mapColumnNamesExtracted(false, reason); }, this.task_standard_response_delay);
                throw new Error(reason || 'Could not auto-detect columns in the uploaded file.');
            }
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.mapColumnNamesExtracted(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const mapColumnNames = JSON.parse(result);
            setTimeout(() => { this.mapColumnNamesExtracted(true, mapColumnNames); }, this.task_standard_response_delay);
            return mapColumnNames;
        },

        columnNamesExtracted(success = true, dataOrMessage = '') {
        },

        async extractColumnNames(file) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.extract_column_names(file);
            if (typeof result === 'string' && result.startsWith('ERROR:')) {
                const reason = result.slice('ERROR:'.length).trim();
                setTimeout(() => { this.columnNamesExtracted(false, reason); }, this.task_standard_response_delay);
                throw new Error(reason || 'Could not read columns from the uploaded file.');
            }
            // Result is a JSON string, parse it to get the array
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.columnNamesExtracted(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const columnNames = JSON.parse(result);
            setTimeout(() => { this.columnNamesExtracted(true, columnNames); }, this.task_standard_response_delay);
            return columnNames;
        },

        // ==========================================
        // Wizard Calculation Methods - Buck/Boost
        // ==========================================

        buckInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateBuckInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_buck_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.buckInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        advancedBuckInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvancedBuckInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_advanced_buck_inputs(JSON.stringify(params));
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.advancedBuckInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.advancedBuckInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        boostInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateBoostInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_boost_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.boostInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        advancedBoostInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvancedBoostInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_advanced_boost_inputs(JSON.stringify(params));
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.advancedBoostInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.advancedBoostInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        buckIdealWaveformsCalculated(success = true, dataOrMessage = '') {
        },

        async simulateBuckIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_buck_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.buckIdealWaveformsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.buckIdealWaveformsCalculated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        boostIdealWaveformsCalculated(success = true, dataOrMessage = '') {
        },

        async simulateBoostIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_boost_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.boostIdealWaveformsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.boostIdealWaveformsCalculated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // Wizard Calculation/Simulation - Cuk / Zeta / FSBB / Weinberg / Clllc
        // ==========================================
        // Backend: WebLibMKF 17916ff exposes calculate_*_inputs (analytical
        // .process()) and simulate_*_ideal_waveforms (ngspice) for each.
        // No "advanced" variants yet — those wizards skip the design-level radio
        // and always use the analytical/help-me-design path. If the result
        // string starts with "Exception" the MKF wrapper caught a std::exception
        // and returned it as text; we surface that as a thrown Error so the
        // wizard's executeWaveformAction shows it in waveformError.

        // ----- Cuk -----
        cukInputsCalculated(success = true, dataOrMessage = '') {},
        async calculateCukInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;
            const result = await mkf.calculate_cuk_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) { throw new Error(result); }
            const parsed = JSON.parse(result);
            if (parsed.error) { throw new Error(parsed.error); }
            setTimeout(() => { this.cukInputsCalculated(true, parsed); }, this.task_standard_response_delay);
            return parsed;
        },
        cukIdealWaveformsCalculated(success = true, dataOrMessage = '') {},
        async simulateCukIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;
            const result = await mkf.simulate_cuk_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.cukIdealWaveformsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const parsed = JSON.parse(result);
            if (parsed.error) {
                setTimeout(() => { this.cukIdealWaveformsCalculated(false, parsed.error); }, this.task_standard_response_delay);
                throw new Error(parsed.error);
            }
            setTimeout(() => { this.cukIdealWaveformsCalculated(true, parsed); }, this.task_standard_response_delay);
            return parsed;
        },

        // ----- Zeta -----
        zetaInputsCalculated(success = true, dataOrMessage = '') {},
        async calculateZetaInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;
            const result = await mkf.calculate_zeta_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) { throw new Error(result); }
            const parsed = JSON.parse(result);
            if (parsed.error) { throw new Error(parsed.error); }
            setTimeout(() => { this.zetaInputsCalculated(true, parsed); }, this.task_standard_response_delay);
            return parsed;
        },
        zetaIdealWaveformsCalculated(success = true, dataOrMessage = '') {},
        async simulateZetaIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;
            const result = await mkf.simulate_zeta_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.zetaIdealWaveformsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const parsed = JSON.parse(result);
            if (parsed.error) {
                setTimeout(() => { this.zetaIdealWaveformsCalculated(false, parsed.error); }, this.task_standard_response_delay);
                throw new Error(parsed.error);
            }
            setTimeout(() => { this.zetaIdealWaveformsCalculated(true, parsed); }, this.task_standard_response_delay);
            return parsed;
        },

        // ----- FourSwitchBuckBoost -----
        fourSwitchBuckBoostInputsCalculated(success = true, dataOrMessage = '') {},
        async calculateFourSwitchBuckBoostInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;
            const result = await mkf.calculate_four_switch_buck_boost_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) { throw new Error(result); }
            const parsed = JSON.parse(result);
            if (parsed.error) { throw new Error(parsed.error); }
            setTimeout(() => { this.fourSwitchBuckBoostInputsCalculated(true, parsed); }, this.task_standard_response_delay);
            return parsed;
        },
        fourSwitchBuckBoostIdealWaveformsCalculated(success = true, dataOrMessage = '') {},
        async simulateFourSwitchBuckBoostIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;
            const result = await mkf.simulate_four_switch_buck_boost_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.fourSwitchBuckBoostIdealWaveformsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const parsed = JSON.parse(result);
            if (parsed.error) {
                setTimeout(() => { this.fourSwitchBuckBoostIdealWaveformsCalculated(false, parsed.error); }, this.task_standard_response_delay);
                throw new Error(parsed.error);
            }
            setTimeout(() => { this.fourSwitchBuckBoostIdealWaveformsCalculated(true, parsed); }, this.task_standard_response_delay);
            return parsed;
        },

        // ----- Weinberg -----
        weinbergInputsCalculated(success = true, dataOrMessage = '') {},
        async calculateWeinbergInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;
            const result = await mkf.calculate_weinberg_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) { throw new Error(result); }
            const parsed = JSON.parse(result);
            if (parsed.error) { throw new Error(parsed.error); }
            setTimeout(() => { this.weinbergInputsCalculated(true, parsed); }, this.task_standard_response_delay);
            return parsed;
        },
        weinbergIdealWaveformsCalculated(success = true, dataOrMessage = '') {},
        async simulateWeinbergIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;
            const result = await mkf.simulate_weinberg_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.weinbergIdealWaveformsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const parsed = JSON.parse(result);
            if (parsed.error) {
                setTimeout(() => { this.weinbergIdealWaveformsCalculated(false, parsed.error); }, this.task_standard_response_delay);
                throw new Error(parsed.error);
            }
            setTimeout(() => { this.weinbergIdealWaveformsCalculated(true, parsed); }, this.task_standard_response_delay);
            return parsed;
        },

        // ----- Clllc (bidirectional symmetric resonant) -----
        clllcInputsCalculated(success = true, dataOrMessage = '') {},
        async calculateClllcInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;
            const result = await mkf.calculate_clllc_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) { throw new Error(result); }
            const parsed = JSON.parse(result);
            if (parsed.error) { throw new Error(parsed.error); }
            setTimeout(() => { this.clllcInputsCalculated(true, parsed); }, this.task_standard_response_delay);
            return parsed;
        },
        clllcIdealWaveformsCalculated(success = true, dataOrMessage = '') {},
        async simulateClllcIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;
            const result = await mkf.simulate_clllc_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.clllcIdealWaveformsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const parsed = JSON.parse(result);
            if (parsed.error) {
                setTimeout(() => { this.clllcIdealWaveformsCalculated(false, parsed.error); }, this.task_standard_response_delay);
                throw new Error(parsed.error);
            }
            setTimeout(() => { this.clllcIdealWaveformsCalculated(true, parsed); }, this.task_standard_response_delay);
            return parsed;
        },

        // ----- Advanced (I-know-the-design) variants for the 5 new wizards -----
        async calculateAdvancedCukInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;
            const result = await mkf.calculate_advanced_cuk_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) { throw new Error(result); }
            const parsed = JSON.parse(result);
            if (parsed.error) { throw new Error(parsed.error); }
            setTimeout(() => { this.cukInputsCalculated(true, parsed); }, this.task_standard_response_delay);
            return parsed;
        },
        async calculateAdvancedZetaInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;
            const result = await mkf.calculate_advanced_zeta_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) { throw new Error(result); }
            const parsed = JSON.parse(result);
            if (parsed.error) { throw new Error(parsed.error); }
            setTimeout(() => { this.zetaInputsCalculated(true, parsed); }, this.task_standard_response_delay);
            return parsed;
        },
        async calculateAdvancedFourSwitchBuckBoostInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;
            const result = await mkf.calculate_advanced_four_switch_buck_boost_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) { throw new Error(result); }
            const parsed = JSON.parse(result);
            if (parsed.error) { throw new Error(parsed.error); }
            setTimeout(() => { this.fourSwitchBuckBoostInputsCalculated(true, parsed); }, this.task_standard_response_delay);
            return parsed;
        },
        async calculateAdvancedWeinbergInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;
            const result = await mkf.calculate_advanced_weinberg_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) { throw new Error(result); }
            const parsed = JSON.parse(result);
            if (parsed.error) { throw new Error(parsed.error); }
            setTimeout(() => { this.weinbergInputsCalculated(true, parsed); }, this.task_standard_response_delay);
            return parsed;
        },
        async calculateAdvancedClllcInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;
            const result = await mkf.calculate_advanced_clllc_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) { throw new Error(result); }
            const parsed = JSON.parse(result);
            if (parsed.error) { throw new Error(parsed.error); }
            setTimeout(() => { this.clllcInputsCalculated(true, parsed); }, this.task_standard_response_delay);
            return parsed;
        },

        // ==========================================
        // Wizard Calculation/Simulation Methods - SEPIC
        // ==========================================

        sepicInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateSepicInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_sepic_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.sepicInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        advancedSepicInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvancedSepicInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_advanced_sepic_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.advancedSepicInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        sepicIdealWaveformsCalculated(success = true, dataOrMessage = '') {
        },

        async simulateSepicIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_sepic_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.sepicIdealWaveformsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.sepicIdealWaveformsCalculated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // Wizard Simulation Methods - Forward
        // ==========================================

        forwardIdealWaveformsCalculated(success = true, dataOrMessage = '') {
        },

        async simulateForwardIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_forward_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.forwardIdealWaveformsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.forwardIdealWaveformsCalculated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // Wizard Simulation Methods - Two Switch Forward
        // ==========================================

        twoSwitchForwardIdealWaveformsCalculated(success = true, dataOrMessage = '') {
        },

        async simulateTwoSwitchForwardIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_two_switch_forward_ideal_waveforms(JSON.stringify(params));

            if (result.startsWith('Exception')) {
                setTimeout(() => { this.twoSwitchForwardIdealWaveformsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            
            setTimeout(() => { this.twoSwitchForwardIdealWaveformsCalculated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // Wizard Simulation Methods - Active Clamp Forward
        // ==========================================

        activeClampForwardIdealWaveformsCalculated(success = true, dataOrMessage = '') {
        },

        async simulateActiveClampForwardIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_active_clamp_forward_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.activeClampForwardIdealWaveformsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.activeClampForwardIdealWaveformsCalculated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // Wizard Simulation Methods - Push-Pull
        // ==========================================

        pushPullIdealWaveformsCalculated(success = true, dataOrMessage = '') {
        },

        async simulatePushPullIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_push_pull_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.pushPullIdealWaveformsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.pushPullIdealWaveformsCalculated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // Wizard Simulation Methods - Isolated Buck-Boost
        // ==========================================

        isolatedBuckBoostIdealWaveformsCalculated(success = true, dataOrMessage = '') {
        },

        async simulateIsolatedBuckBoostIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_isolated_buck_boost_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.isolatedBuckBoostIdealWaveformsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.isolatedBuckBoostIdealWaveformsCalculated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        isolatedBuckIdealWaveformsCalculated(success = true, dataOrMessage = '') {
        },

        async simulateIsolatedBuckIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_isolated_buck_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.isolatedBuckIdealWaveformsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.isolatedBuckIdealWaveformsCalculated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // Wizard Calculation Methods - Isolated Buck/Boost
        // ==========================================

        isolatedBuckInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateIsolatedBuckInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_isolated_buck_inputs(JSON.stringify(params));
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.isolatedBuckInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.isolatedBuckInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        advancedIsolatedBuckInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvancedIsolatedBuckInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_advanced_isolated_buck_inputs(JSON.stringify(params));
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.advancedIsolatedBuckInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.advancedIsolatedBuckInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        isolatedBuckBoostInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateIsolatedBuckBoostInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_isolated_buck_boost_inputs(JSON.stringify(params));
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.isolatedBuckBoostInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.isolatedBuckBoostInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        advancedIsolatedBuckBoostInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvancedIsolatedBuckBoostInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_advanced_isolated_buck_boost_inputs(JSON.stringify(params));
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.advancedIsolatedBuckBoostInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.advancedIsolatedBuckBoostInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        // ==========================================
        // Wizard Calculation Methods - Flyback
        // ==========================================

        flybackInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateFlybackInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_flyback_inputs(JSON.stringify(params));
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.flybackInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.flybackInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        advancedFlybackInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvancedFlybackInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_advanced_flyback_inputs(JSON.stringify(params));
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.advancedFlybackInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.advancedFlybackInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        flybackIdealWaveformsCalculated(success = true, dataOrMessage = '') {
        },

        async simulateFlybackIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_flyback_ideal_waveforms(JSON.stringify(params));

            if (result.startsWith('Exception')) {
                setTimeout(() => { this.flybackIdealWaveformsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            
            setTimeout(() => { this.flybackIdealWaveformsCalculated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        flybackRealMagneticWaveformsCalculated(success = true, dataOrMessage = '') {
        },

        async simulateFlybackWithMagnetic(flybackParams, magnetic) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            masSentry('simulateFlybackWithMagnetic', 'Magnetic', magnetic);
            const result = await mkf.simulate_flyback_with_magnetic(JSON.stringify(flybackParams), JSON.stringify(magnetic));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.flybackRealMagneticWaveformsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.flybackRealMagneticWaveformsCalculated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // SPICE Code Generation Methods
        // ==========================================

        spiceCodeGenerated(success = true, dataOrMessage = '') {
        },

        async generateSpiceCode(topology, params, inputVoltageIndex = 0, operatingPointIndex = 0) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            // Map topology → WASM function. Keys are MAS schema enum strings
            // returned by each wizard's getTopology() (e.g. 'flybackConverter').
            // CRITICAL: keep aligned with MAS designRequirements.topology enum
            // and with mas.js / MagneticBuilder readers — drift silently breaks
            // the SPICE button.
            const topologyMap = {
                'flybackConverter':                 'generate_flyback_ngspice_circuit',
                'buckConverter':                    'generate_buck_ngspice_circuit',
                'boostConverter':                   'generate_boost_ngspice_circuit',
                'sepicConverter':                   'generate_sepic_ngspice_circuit',
                'powerFactorCorrection':            'generate_boost_ngspice_circuit',
                'pushPullConverter':                'generate_push_pull_ngspice_circuit',
                'singleSwitchForwardConverter':     'generate_forward_ngspice_circuit',
                'twoSwitchForwardConverter':        'generate_two_switch_forward_ngspice_circuit',
                'activeClampForwardConverter':      'generate_active_clamp_forward_ngspice_circuit',
                'isolatedBuckConverter':            'generate_isolated_buck_ngspice_circuit',
                'isolatedBuckBoostConverter':       'generate_isolated_buck_boost_ngspice_circuit',
                'llcResonantConverter':             'generate_llc_ngspice_circuit',
                'cllcResonantConverter':            'generate_cllc_ngspice_circuit',
                'dualActiveBridgeConverter':        'generate_dab_ngspice_circuit',
                'phaseShiftedFullBridgeConverter':  'generate_psfb_ngspice_circuit',
                'phaseShiftedHalfBridgeConverter':  'generate_pshb_ngspice_circuit',
                'asymmetricHalfBridgeConverter':    'generate_ahb_ngspice_circuit',
                'clllcResonantConverter':           'generate_clllc_ngspice_circuit',
                'seriesResonantConverter':          'generate_src_ngspice_circuit',
                'weinbergConverter':                'generate_weinberg_ngspice_circuit',
                'cukConverter':                     'generate_cuk_ngspice_circuit',
                'zetaConverter':                    'generate_zeta_ngspice_circuit',
                'fourSwitchBuckBoostConverter':     'generate_four_switch_buck_boost_ngspice_circuit',
                'commonModeChoke':                  'generate_cmc_ngspice_circuit',
                'differentialModeChoke':            'generate_dmc_ngspice_circuit',
            };

            const wasmFunction = topologyMap[topology];

            if (!wasmFunction) {
                console.error(`[generateSpiceCode] No mapping found for topology: ${topology}`);
                throw new Error(`SPICE code generation not available for topology: ${topology}`);
            }

            if (!mkf[wasmFunction]) {
                console.error(`[generateSpiceCode] Function ${wasmFunction} not found on mkf object`);
                throw new Error(`SPICE code generation function not available: ${wasmFunction}`);
            }

            const result = await mkf[wasmFunction](JSON.stringify(params), inputVoltageIndex, operatingPointIndex);

            if (result.startsWith('Exception')) {
                setTimeout(() => { this.spiceCodeGenerated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }

            setTimeout(() => { this.spiceCodeGenerated(true, result); }, this.task_standard_response_delay);
            return result;
        },

        // ==========================================
        // Wizard Calculation Methods - Forward
        // ==========================================

        singleSwitchForwardInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateSingleSwitchForwardInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_single_switch_forward_inputs(JSON.stringify(params));
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.singleSwitchForwardInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.singleSwitchForwardInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        advancedSingleSwitchForwardInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvancedSingleSwitchForwardInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_advanced_single_switch_forward_inputs(JSON.stringify(params));
            if (typeof result === 'string' && result.startsWith('Exception')) {
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            
            // Check for error response
            if (inputs.error) {
                throw new Error(inputs.message || 'Unknown error from C++ library');
            }
            
            setTimeout(() => { this.advancedSingleSwitchForwardInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        twoSwitchForwardInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateTwoSwitchForwardInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_two_switch_forward_inputs(JSON.stringify(params));
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.twoSwitchForwardInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.twoSwitchForwardInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        advancedTwoSwitchForwardInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvancedTwoSwitchForwardInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_advanced_two_switch_forward_inputs(JSON.stringify(params));
            if (typeof result === 'string' && result.startsWith('Exception')) {
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            
            // Check for error response
            if (inputs.error) {
                throw new Error(inputs.message || 'Unknown error from C++ library');
            }
            
            setTimeout(() => { this.advancedTwoSwitchForwardInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        activeClampForwardInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateActiveClampForwardInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_active_clamp_forward_inputs(JSON.stringify(params));
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.activeClampForwardInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.activeClampForwardInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        advancedActiveClampForwardInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvancedActiveClampForwardInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_advanced_active_clamp_forward_inputs(JSON.stringify(params));
            if (typeof result === 'string' && result.startsWith('Exception')) {
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            
            // Check for error response
            if (inputs.error) {
                throw new Error(inputs.message || 'Unknown error from C++ library');
            }
            
            setTimeout(() => { this.advancedActiveClampForwardInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        // ==========================================
        // Wizard Calculation Methods - Push Pull
        // ==========================================

        pushPullInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculatePushPullInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_push_pull_inputs(JSON.stringify(params));
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.pushPullInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.pushPullInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        advancedPushPullInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvancedPushPullInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_advanced_push_pull_inputs(JSON.stringify(params));
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.advancedPushPullInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.advancedPushPullInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        // ==========================================
        // Wizard Calculation Methods - Dual Active Bridge (DAB)
        // ==========================================

        dabInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateDabInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_dab_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.dabInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.dabInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        dabWaveformsSimulated(success = true, dataOrMessage = '') {
        },

        async simulateDabIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_dab_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.dabWaveformsSimulated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.dabWaveformsSimulated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // Wizard Calculation Methods - LLC Resonant
        // ==========================================

        llcInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateLlcInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_llc_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.llcInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            console.log('🔍 [calculateLlcInputs] WASM returns:', {
                turnsRatios: inputs.designRequirements?.turnsRatios,
                turnsRatiosCount: inputs.designRequirements?.turnsRatios?.length,
                excitationsCount: inputs.operatingPoints?.[0]?.excitationsPerWinding?.length,
                excitationNames: inputs.operatingPoints?.[0]?.excitationsPerWinding?.map(e => e.name)
            });
            setTimeout(() => { this.llcInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        llcWaveformsSimulated(success = true, dataOrMessage = '') {
        },

        async simulateLlcIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_llc_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.llcWaveformsSimulated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            console.log('🔍 [simulateLlcIdealWaveforms] WASM returns:', {
                operatingPointsCount: waveforms.operatingPoints?.length,
                excitationsCount: waveforms.operatingPoints?.[0]?.excitationsPerWinding?.length,
                excitationNames: waveforms.operatingPoints?.[0]?.excitationsPerWinding?.map(e => e.name),
                converterWaveformsCount: waveforms.converterWaveforms?.length
            });
            setTimeout(() => { this.llcWaveformsSimulated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // Wizard Calculation Methods - CLLC Resonant
        // ==========================================

        cllcInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateCllcInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_cllc_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.cllcInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            // CLLC backend may also return {"error": "..."} JSON on validation failure
            // (libMKF.cpp:8396). Surface those too — no silent fallback.
            if (inputs.error) {
                setTimeout(() => { this.cllcInputsCalculated(false, inputs.error); }, this.task_standard_response_delay);
                throw new Error(inputs.error);
            }
            setTimeout(() => { this.cllcInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        cllcWaveformsSimulated(success = true, dataOrMessage = '') {
        },

        async simulateCllcIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_cllc_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.cllcWaveformsSimulated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            if (waveforms.error) {
                setTimeout(() => { this.cllcWaveformsSimulated(false, waveforms.error); }, this.task_standard_response_delay);
                throw new Error(waveforms.error);
            }
            setTimeout(() => { this.cllcWaveformsSimulated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // Wizard Calculation Methods - Phase Shift Full Bridge (PSFB)
        // ==========================================

        psfbInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculatePsfbInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_psfb_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.psfbInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            if (inputs.error) {
                setTimeout(() => { this.psfbInputsCalculated(false, inputs.error); }, this.task_standard_response_delay);
                throw new Error(inputs.error);
            }
            setTimeout(() => { this.psfbInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        psfbWaveformsSimulated(success = true, dataOrMessage = '') {
        },

        async simulatePsfbIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_psfb_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.psfbWaveformsSimulated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.psfbWaveformsSimulated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // Wizard Calculation Methods - Phase Shift Half Bridge (PSHB)
        // ==========================================

        pshbInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculatePshbInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_pshb_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.pshbInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.pshbInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        pshbWaveformsSimulated(success = true, dataOrMessage = '') {
        },

        async simulatePshbIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_pshb_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.pshbWaveformsSimulated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.pshbWaveformsSimulated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // Wizard Calculation Methods - Asymmetric Half Bridge (AHB)
        // ==========================================

        ahbInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAhbInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_ahb_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.ahbInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.ahbInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        ahbWaveformsSimulated(success = true, dataOrMessage = '') {
        },

        async simulateAhbIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_ahb_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.ahbWaveformsSimulated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.ahbWaveformsSimulated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // Wizard Calculation Methods - Series Resonant Converter (SRC)
        // ==========================================

        srcInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateSrcInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_src_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.srcInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.srcInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        srcWaveformsSimulated(success = true, dataOrMessage = '') {
        },

        async simulateSrcIdealWaveforms(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_src_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.srcWaveformsSimulated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.srcWaveformsSimulated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // Wizard Calculation Methods - Vienna Rectifier
        // ==========================================

        viennaInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateViennaInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_vienna_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.viennaInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.viennaInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        viennaWaveformsSimulated(success = true, dataOrMessage = '') {
        },

        async simulateViennaIdealWaveforms(params) {
            // Vienna SPICE in MKF is currently a single-phase emulation:
            // one phase solved at peak-of-line, replicated to B/C by 120-deg
            // symmetry. The wizard surfaces this via `viennaDiagnostics.note`
            // on the returned payload. Full 3-phase netlist is MKF Phase 3+.
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_vienna_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.viennaWaveformsSimulated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.viennaWaveformsSimulated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // Wizard Calculation Methods - Current Transformer
        // ==========================================

        currentTransformerProcessed(success = true, dataOrMessage = '') {
        },

        async processCurrentTransformer(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.process_current_transformer(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.currentTransformerProcessed(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.currentTransformerProcessed(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        // ==========================================
        // Wizard Calculation Methods - Common Mode Choke (CMC)
        // ==========================================

        cmcInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateCmcInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_cmc_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.cmcInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.cmcInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        cmcWaveformsSimulated(success = true, dataOrMessage = '') {
        },

        async simulateCmcIdealWaveforms(params, inductance, parasiticCap_pF, dvdt_V_ns) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_cmc_ideal_waveforms(JSON.stringify(params), inductance, parasiticCap_pF, dvdt_V_ns);
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.cmcWaveformsSimulated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.cmcWaveformsSimulated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        async simulateCmcLisnWaveforms(params, inductance) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.simulate_cmc_lisn_waveforms(JSON.stringify(params), inductance);
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.cmcWaveformsSimulated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.cmcWaveformsSimulated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // Wizard Calculation Methods - Differential Mode Choke (DMC)
        // ==========================================

        dmcInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateDmcInputs(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.calculate_dmc_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.dmcInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.dmcInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        dmcAttenuationVerified(success = true, dataOrMessage = '') {
        },

        async verifyDmcAttenuation(params, inductance, capacitance = 0) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.verify_dmc_attenuation(JSON.stringify(params), inductance, capacitance);
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.dmcAttenuationVerified(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const verificationResults = JSON.parse(result);
            setTimeout(() => { this.dmcAttenuationVerified(true, verificationResults); }, this.task_standard_response_delay);
            return verificationResults;
        },

        dmcDesignProposed(success = true, dataOrMessage = '') {
        },

        async proposeDmcDesign(params) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            const result = await mkf.propose_dmc_design(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.dmcDesignProposed(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const proposal = JSON.parse(result);
            setTimeout(() => { this.dmcDesignProposed(true, proposal); }, this.task_standard_response_delay);
            return proposal;
        },

        dmcWaveformsSimulated(success = true, dataOrMessage = '') {
        },

        async simulateDmcWaveforms(params, inductance, capacitance = 0) {
            const mkf = await waitForKirchhoff();
            await mkf.ready;

            // capacitance 0 = let Kirchhoff resolve it (spec filterCapacitance, else
            // the fc = fsw/10 auto-sizing). The wasm binding takes exactly 3 args.
            const result = await mkf.simulate_dmc_waveforms(JSON.stringify(params), inductance, capacitance);
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.dmcWaveformsSimulated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.dmcWaveformsSimulated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // Core Studio (/core_studio) wrappers
        // ==========================================

        coreShapeFamiliesGotten(success = true, dataOrMessage = '') {
        },

        async getCoreShapeFamilies() {
            const mkf = await waitForMkf();
            await mkf.ready;

            const families = toArray(await mkf.get_available_core_shape_families());
            setTimeout(() => { this.coreShapeFamiliesGotten(true, families); }, this.task_standard_response_delay);
            return families;
        },

        coreShapesByFamilyGotten(success = true, dataOrMessage = '') {
        },

        async getCoreShapesByFamily(family) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const shapes = toArray(await mkf.get_available_core_shapes_by_family(family));
            setTimeout(() => { this.coreShapesByFamilyGotten(true, shapes); }, this.task_standard_response_delay);
            return shapes;
        },

        shapeDataGotten(success = true, dataOrMessage = '') {
        },

        async getShapeData(shapeName) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const shapeResult = await mkf.get_shape_data(shapeName);
            if (shapeResult.startsWith('Exception')) {
                setTimeout(() => { this.shapeDataGotten(false, shapeResult); }, this.task_standard_response_delay);
                throw new Error(shapeResult);
            }
            const shape = JSON.parse(shapeResult);
            setTimeout(() => { this.shapeDataGotten(true, shape); }, this.task_standard_response_delay);
            return shape;
        },

        shapeFamilySubtypesGotten(success = true, dataOrMessage = '') {
        },

        async getShapeFamilySubtypes(family) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const subtypes = toArray(await mkf.get_shape_family_subtypes(family));
            setTimeout(() => { this.shapeFamilySubtypesGotten(true, subtypes); }, this.task_standard_response_delay);
            return subtypes;
        },

        shapeFamilyDimensionsGotten(success = true, dataOrMessage = '') {
        },

        async getShapeFamilyDimensions(family, subtype = '') {
            const mkf = await waitForMkf();
            await mkf.ready;

            const dimensions = toArray(await mkf.get_shape_family_dimensions(family, subtype));
            setTimeout(() => { this.shapeFamilyDimensionsGotten(true, dimensions); }, this.task_standard_response_delay);
            return dimensions;
        },

        coreMaterialManufacturersGotten(success = true, dataOrMessage = '') {
        },

        async getCoreMaterialsByManufacturer() {
            const mkf = await waitForMkf();
            await mkf.ready;

            const materialsPerManufacturer = {};
            const manufacturers = toArray(await mkf.get_available_core_manufacturers()).sort();
            for (const manufacturer of manufacturers) {
                materialsPerManufacturer[manufacturer] = toArray(await mkf.get_available_core_materials(manufacturer));
            }
            setTimeout(() => { this.coreMaterialManufacturersGotten(true, materialsPerManufacturer); }, this.task_standard_response_delay);
            return materialsPerManufacturer;
        },

        steinmetzCoefficientsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateSteinmetzCoefficients(volumetricLossesPoints, frequencyRanges) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_steinmetz_coefficients(
                JSON.stringify(volumetricLossesPoints),
                JSON.stringify(frequencyRanges)
            );
            if (typeof result === 'string' && result.startsWith('Exception')) {
                setTimeout(() => { this.steinmetzCoefficientsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const coefficients = JSON.parse(result);
            setTimeout(() => { this.steinmetzCoefficientsCalculated(true, coefficients); }, this.task_standard_response_delay);
            return coefficients;
        },

        // ==========================================
        // Database Loading Methods (for main.js)
        // ==========================================

        coreMaterialsLoaded(success = true, dataOrMessage = '') {
        },

        async loadCoreMaterials(data = '') {
            const mkf = await waitForMkf();
            await mkf.ready;

            await mkf.load_core_materials(data);
            setTimeout(() => { this.coreMaterialsLoaded(true); }, this.task_standard_response_delay);
        },

        coreShapesLoaded(success = true, dataOrMessage = '') {
        },

        async loadCoreShapes(data = '') {
            const mkf = await waitForMkf();
            await mkf.ready;

            await mkf.load_core_shapes(data);
            setTimeout(() => { this.coreShapesLoaded(true); }, this.task_standard_response_delay);
        },

        wiresLoaded(success = true, dataOrMessage = '') {
        },

        async loadWires(data = '') {
            const mkf = await waitForMkf();
            await mkf.ready;

            await mkf.load_wires(data);
            setTimeout(() => { this.wiresLoaded(true); }, this.task_standard_response_delay);
        },

        coresLoaded(success = true, dataOrMessage = '') {
        },

        async loadCores(data, allowToroidal, useOnlyInStock) {
            const mkf = await waitForMkf();
            await mkf.ready;

            await mkf.load_cores(data, allowToroidal, useOnlyInStock);
            setTimeout(() => { this.coresLoaded(true); }, this.task_standard_response_delay);
        },
    }
});
