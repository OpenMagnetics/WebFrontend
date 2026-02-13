import { defineStore } from 'pinia'
import { waitForMkf, isWorkerMode } from '/WebSharedComponents/assets/js/mkfRuntime'

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

            const result = await mkf.calculate_advised_cores(JSON.stringify(inputs), JSON.stringify(weights), count, mode);
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

            const result = await mkf.calculate_advised_magnetics(JSON.stringify(inputs), JSON.stringify(weights), count, mode);
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
            const harmonics = JSON.parse(result);
            setTimeout(() => { this.harmonicsCalculated(true, harmonics); }, this.task_standard_response_delay);
            return harmonics;
        },

        processedCalculated(success = true, dataOrMessage = '') {
        },

        async calculateProcessed(harmonics, waveform) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_processed(JSON.stringify(harmonics), JSON.stringify(waveform));
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

            try {
                const result = await mkf.calculate_rms_power(JSON.stringify(excitation));
                if (typeof result === 'string' && result.startsWith("Exception")) {
                    setTimeout(() => { this.rmsPowerCalculated(false, result); }, this.task_standard_response_delay);
                    return null;
                }
                setTimeout(() => { this.rmsPowerCalculated(true, result); }, this.task_standard_response_delay);
                return result;
            } catch (error) {
                // Silently fail - waveform data may be incomplete during editing
                setTimeout(() => { this.rmsPowerCalculated(false, error.message); }, this.task_standard_response_delay);
                return null;
            }
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

            try {
                const result = await mkf.calculate_instantaneous_power(JSON.stringify(excitation));
                if (typeof result === 'string' && result.startsWith("Exception")) {
                    setTimeout(() => { this.instantaneousPowerCalculated(false, result); }, this.task_standard_response_delay);
                    return null;
                }
                setTimeout(() => { this.instantaneousPowerCalculated(true, result); }, this.task_standard_response_delay);
                return result;
            } catch (error) {
                // Silently fail - waveform data may be incomplete during editing
                setTimeout(() => { this.instantaneousPowerCalculated(false, error.message); }, this.task_standard_response_delay);
                return null;
            }
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

            const result = await mkf.get_maximum_dimensions(JSON.stringify(magnetic));
            const dimensions = JSON.parse(result);
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
            const reflected = JSON.parse(result);
            setTimeout(() => { this.reflectedSecondaryCalculated(true, reflected); }, this.task_standard_response_delay);
            return reflected;
        },

        inducedVoltageCalculated(success = true, dataOrMessage = '') {
        },

        async calculateInducedVoltage(excitation, magnetizingInductance) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_induced_voltage(JSON.stringify(excitation), magnetizingInductance);
            const voltage = JSON.parse(result);
            setTimeout(() => { this.inducedVoltageCalculated(true, voltage); }, this.task_standard_response_delay);
            return voltage;
        },

        inducedCurrentCalculated(success = true, dataOrMessage = '') {
        },

        async calculateInducedCurrent(excitation, magnetizingInductance) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_induced_current(JSON.stringify(excitation), magnetizingInductance);
            const current = JSON.parse(result);
            setTimeout(() => { this.inducedCurrentCalculated(true, current); }, this.task_standard_response_delay);
            return current;
        },

        // ==========================================
        // Leakage and Current Density Methods
        // ==========================================

        leakageInductanceCalculated(success = true, dataOrMessage = '') {
        },

        async calculateLeakageInductance(magnetic, frequency, operatingPointIndex) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_leakage_inductance(JSON.stringify(magnetic), frequency, operatingPointIndex);
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

            const result = await mkf.export_magnetic_as_subcircuit(JSON.stringify(magnetic), temperature, format, extra);
            setTimeout(() => { this.magneticExportedAsSubcircuit(true, result); }, this.task_standard_response_delay);
            return result;
        },

        magneticExportedAsSymbol(success = true, dataOrMessage = '') {
        },

        async exportMagneticAsSymbol(magnetic, format, extra) {
            const mkf = await waitForMkf();
            await mkf.ready;

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
            // Result is a JSON string, parse it to get the array
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
            const mkf = await waitForMkf();
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
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_advanced_buck_inputs(JSON.stringify(params));
            const inputs = JSON.parse(result);
            setTimeout(() => { this.advancedBuckInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        boostInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateBoostInputs(params) {
            const mkf = await waitForMkf();
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
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_advanced_boost_inputs(JSON.stringify(params));
            const inputs = JSON.parse(result);
            setTimeout(() => { this.advancedBoostInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        buckIdealWaveformsCalculated(success = true, dataOrMessage = '') {
        },

        async simulateBuckIdealWaveforms(params) {
            const mkf = await waitForMkf();
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
            const mkf = await waitForMkf();
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
        // Wizard Simulation Methods - Forward
        // ==========================================

        forwardIdealWaveformsCalculated(success = true, dataOrMessage = '') {
        },

        async simulateForwardIdealWaveforms(params) {
            const mkf = await waitForMkf();
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
            const mkf = await waitForMkf();
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
            const mkf = await waitForMkf();
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
            const mkf = await waitForMkf();
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
            const mkf = await waitForMkf();
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

        // ==========================================
        // Wizard Calculation Methods - Isolated Buck/Boost
        // ==========================================

        isolatedBuckInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateIsolatedBuckInputs(params) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_isolated_buck_inputs(JSON.stringify(params));
            const inputs = JSON.parse(result);
            setTimeout(() => { this.isolatedBuckInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        advancedIsolatedBuckInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvancedIsolatedBuckInputs(params) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_advanced_isolated_buck_inputs(JSON.stringify(params));
            const inputs = JSON.parse(result);
            setTimeout(() => { this.advancedIsolatedBuckInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        isolatedBuckBoostInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateIsolatedBuckBoostInputs(params) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_isolated_buck_boost_inputs(JSON.stringify(params));
            const inputs = JSON.parse(result);
            setTimeout(() => { this.isolatedBuckBoostInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        advancedIsolatedBuckBoostInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvancedIsolatedBuckBoostInputs(params) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_advanced_isolated_buck_boost_inputs(JSON.stringify(params));
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
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_flyback_inputs(JSON.stringify(params));
            const inputs = JSON.parse(result);
            setTimeout(() => { this.flybackInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        advancedFlybackInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvancedFlybackInputs(params) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_advanced_flyback_inputs(JSON.stringify(params));
            const inputs = JSON.parse(result);
            setTimeout(() => { this.advancedFlybackInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        flybackIdealWaveformsCalculated(success = true, dataOrMessage = '') {
        },

        async simulateFlybackIdealWaveforms(params) {
            const mkf = await waitForMkf();
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
            const mkf = await waitForMkf();
            await mkf.ready;

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
        // Wizard Calculation Methods - Forward
        // ==========================================

        singleSwitchForwardInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateSingleSwitchForwardInputs(params) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_single_switch_forward_inputs(JSON.stringify(params));
            const inputs = JSON.parse(result);
            setTimeout(() => { this.singleSwitchForwardInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        advancedSingleSwitchForwardInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvancedSingleSwitchForwardInputs(params) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_advanced_single_switch_forward_inputs(JSON.stringify(params));
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
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_two_switch_forward_inputs(JSON.stringify(params));
            const inputs = JSON.parse(result);
            setTimeout(() => { this.twoSwitchForwardInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        advancedTwoSwitchForwardInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvancedTwoSwitchForwardInputs(params) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_advanced_two_switch_forward_inputs(JSON.stringify(params));
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
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_active_clamp_forward_inputs(JSON.stringify(params));
            const inputs = JSON.parse(result);
            setTimeout(() => { this.activeClampForwardInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        advancedActiveClampForwardInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvancedActiveClampForwardInputs(params) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_advanced_active_clamp_forward_inputs(JSON.stringify(params));
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
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_push_pull_inputs(JSON.stringify(params));
            const inputs = JSON.parse(result);
            setTimeout(() => { this.pushPullInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        advancedPushPullInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateAdvancedPushPullInputs(params) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_advanced_push_pull_inputs(JSON.stringify(params));
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
            const mkf = await waitForMkf();
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

        // ==========================================
        // Wizard Calculation Methods - LLC Resonant
        // ==========================================

        llcInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateLlcInputs(params) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_llc_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.llcInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.llcInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        llcWaveformsSimulated(success = true, dataOrMessage = '') {
        },

        async simulateLlcIdealWaveforms(params) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.simulate_llc_ideal_waveforms(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.llcWaveformsSimulated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.llcWaveformsSimulated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
        },

        // ==========================================
        // Wizard Calculation Methods - CLLC Resonant
        // ==========================================

        cllcInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateCllcInputs(params) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_cllc_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.cllcInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.cllcInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        // ==========================================
        // Wizard Calculation Methods - Phase Shift Full Bridge (PSFB)
        // ==========================================

        psfbInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculatePsfbInputs(params) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.calculate_psfb_inputs(JSON.stringify(params));
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.psfbInputsCalculated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const inputs = JSON.parse(result);
            setTimeout(() => { this.psfbInputsCalculated(true, inputs); }, this.task_standard_response_delay);
            return inputs;
        },

        // ==========================================
        // Wizard Calculation Methods - Common Mode Choke (CMC)
        // ==========================================

        cmcInputsCalculated(success = true, dataOrMessage = '') {
        },

        async calculateCmcInputs(params) {
            const mkf = await waitForMkf();
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

        async simulateCmcWaveforms(params, inductance) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.simulate_cmc_waveforms(JSON.stringify(params), inductance);
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
            const mkf = await waitForMkf();
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
            const mkf = await waitForMkf();
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
            const mkf = await waitForMkf();
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

        async simulateDmcWaveforms(params, inductance) {
            const mkf = await waitForMkf();
            await mkf.ready;

            const result = await mkf.simulate_dmc_waveforms(JSON.stringify(params), inductance);
            if (result.startsWith('Exception')) {
                setTimeout(() => { this.dmcWaveformsSimulated(false, result); }, this.task_standard_response_delay);
                throw new Error(result);
            }
            const waveforms = JSON.parse(result);
            setTimeout(() => { this.dmcWaveformsSimulated(true, waveforms); }, this.task_standard_response_delay);
            return waveforms;
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
