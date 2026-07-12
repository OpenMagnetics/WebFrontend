import { checkAndFixMas } from 'WebSharedComponents/assets/js/utils.js'

// Sessions saved by older frontend versions carry enum spellings the current
// MAS schema rejects ('P2' instead of 'PD2', 'OVC-III' instead of 'III',
// 'Wound' instead of 'wound'). The MAS sentry then fails every
// autocomplete/simulate call with a console-only error and the whole builder
// silently stops working (web bug reports #144/#145). Normalize the known
// legacy spellings before anything validates the document.
export function migrateLegacyMas(mas) {
    const requirements = mas?.inputs?.designRequirements;
    const insulation = requirements?.insulation;
    if (insulation != null) {
        const pollutionDegrees = { 'P1': 'PD1', 'P2': 'PD2', 'P3': 'PD3', 'P4': 'PD4' };
        if (insulation.pollutionDegree in pollutionDegrees) {
            insulation.pollutionDegree = pollutionDegrees[insulation.pollutionDegree];
        }
        const overvoltageCategories = { 'OVC-I': 'I', 'OVC-II': 'II', 'OVC-III': 'III', 'OVC-IV': 'IV' };
        if (insulation.overvoltageCategory in overvoltageCategories) {
            insulation.overvoltageCategory = overvoltageCategories[insulation.overvoltageCategory];
        }
    }
    if (typeof requirements?.wiringTechnology === 'string') {
        const lowercased = requirements.wiringTechnology.toLowerCase();
        if (['wound', 'printed', 'stamped', 'deposition'].includes(lowercased)) {
            requirements.wiringTechnology = lowercased;
        }
    }
    // Old Outputs kept magnetizingInductance/leakageInductance at the top level;
    // the current schema nests both under outputs[].inductance. The converter
    // rejects the whole document otherwise (additionalProperties: false).
    // magnetizingInductance is required inside InductanceOutput, so a leakage
    // without it cannot be relocated — drop it (stale result; simulate recomputes).
    for (const output of (Array.isArray(mas?.outputs) ? mas.outputs : [])) {
        if (output == null) continue;
        const legacyMagnetizing = output.magnetizingInductance;
        const legacyLeakage = output.leakageInductance;
        if (legacyMagnetizing == null && legacyLeakage == null) continue;
        delete output.magnetizingInductance;
        delete output.leakageInductance;
        if (output.inductance == null && legacyMagnetizing != null) {
            output.inductance = { magnetizingInductance: legacyMagnetizing };
            if (legacyLeakage != null) {
                output.inductance.leakageInductance = legacyLeakage;
            }
        }
    }
    return mas;
}

// Load a MAS document into the app exactly like the Header's "Load MAS" file
// import: fix + autocomplete it, reset the mas store, prime the state store,
// and navigate to the magnetic tool. Extracted from Header.readMASFile so the
// Header (file import) and My Designs (cloud open) share one code path.
export async function loadMasIntoApp(newMas, { masStore, stateStore, userStore, taskQueueStore, router, route }) {
    if (newMas.magnetic == null) {
        throw new Error('Not a MAS document: missing "magnetic"');
    }

    migrateLegacyMas(newMas);

    const response = await checkAndFixMas(newMas, taskQueueStore);

    // Save coil processed data that masAutocomplete may strip
    const savedCoilData = {
        layersDescription: response.magnetic?.coil?.layersDescription,
        turnsDescription: response.magnetic?.coil?.turnsDescription,
        sectionsDescription: response.magnetic?.coil?.sectionsDescription,
    };

    // Always autocomplete the MAS to resolve wire/strand string names to
    // full objects and populate core processedDescription, bobbin, etc.
    let autocompletedMas = response;
    try {
        autocompletedMas = await taskQueueStore.masAutocomplete(response, false, {});
    } catch (autocompleteError) {
        console.warn('masAutocomplete failed, using checkAndFixMas result:', autocompleteError);
    }

    // Restore coil processed data if masAutocomplete stripped it
    if (autocompletedMas.magnetic?.coil) {
        if (!autocompletedMas.magnetic.coil.layersDescription && savedCoilData.layersDescription) {
            autocompletedMas.magnetic.coil.layersDescription = savedCoilData.layersDescription;
        }
        if (!autocompletedMas.magnetic.coil.turnsDescription && savedCoilData.turnsDescription) {
            autocompletedMas.magnetic.coil.turnsDescription = savedCoilData.turnsDescription;
        }
        if (!autocompletedMas.magnetic.coil.sectionsDescription && savedCoilData.sectionsDescription) {
            autocompletedMas.magnetic.coil.sectionsDescription = savedCoilData.sectionsDescription;
        }
    }

    masStore.resetMas();
    masStore.mas = autocompletedMas;
    masStore.importedMas();

    // Reset coil view to Basic mode when loading a new MAS document
    stateStore.closeCoilAdvancedInfo();

    stateStore.selectWorkflow("design");
    stateStore.selectApplication(stateStore.SupportedApplications.Power);
    stateStore.selectTool("magneticBuilder");
    stateStore.setCurrentToolSubsection("magneticBuilder");
    stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
    stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
    stateStore.operatingPoints.modePerPoint = [];
    for (let i = 0; i < masStore.mas.inputs.operatingPoints.length; i++) {
        const excitation = masStore.mas.inputs.operatingPoints[i].excitationsPerWinding[0];
        // Determine mode based on what data is present:
        // - HarmonicsList: has harmonics with multiple entries (DC + at least one harmonic)
        //   This means the user entered harmonics manually
        // - Manual: only has waveform/processed without meaningful harmonics
        const hasMultipleHarmonics = excitation.current?.harmonics?.amplitudes?.length > 1;

        if (hasMultipleHarmonics) {
            stateStore.operatingPoints.modePerPoint.push(stateStore.OperatingPointsMode.HarmonicsList);
        }
        else {
            stateStore.operatingPoints.modePerPoint.push(stateStore.OperatingPointsMode.Manual);
        }
    }
    stateStore.loadingDesign = true;

    if (route.path != `${import.meta.env.BASE_URL}magnetic_tool`) {
        userStore.loadingPath = `${import.meta.env.BASE_URL}magnetic_tool`;

        // Wait for pinia-plugin-persistedstate to write to localStorage
        await new Promise(resolve => {
            const unsubscribe = masStore.$subscribe(() => {
                unsubscribe();
                resolve();
            }, { flush: 'sync' });
            // Trigger a sync by touching the store
            masStore.$patch({});
        });

        await router.push(`${import.meta.env.BASE_URL}engine_loader`);
    }
    else {
        masStore.mas.magnetic.core = autocompletedMas.magnetic.core;
        masStore.mas.magnetic.coil = autocompletedMas.magnetic.coil;
        masStore.mas.magnetic.coil.functionalDescription = autocompletedMas.magnetic.coil.functionalDescription;
    }
}
