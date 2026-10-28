import { deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import * as Defaults from 'WebSharedComponents/assets/js/defaults.js'
import { describeFailure } from 'WebSharedComponents/assets/js/noticeText.js'

// A stored design carries its own copy of its core material, taken from the library when it was
// designed. The library is refitted since (e.g. TP4A, 2026-08-11: the stored copy's Steinmetz
// ct(T) turns negative above 149 C), so an old copy can give results today's material would not.
// Nearly every old copy differs from the library somewhere (181 of 196 in the corpus of stored
// designs), most with no visible effect, so a difference alone is not reported: MKF computes the
// design's core losses at every operating point with the file's copy and with the library's, and
// the design is flagged where they differ by more than RELATIVE_LOSS_DIFFERENCE, or where only one
// of the two can be computed (Alf, 2026-10-14). The file's copy is kept; the user decides.
export const RELATIVE_LOSS_DIFFERENCE = 0.1;

// MKF's error codes that say the material's own data is unusable, wherever in a computation they
// are raised. The web only reads the code; the check is MKF's (Alf, 2026-10-26: a stored material
// MKF refuses is named on load, and the library's copy offered, never swapped in silently).
// - MATERIAL_INVALID_PROPERTY: data no material can have (Fair-Rite 95's old record: remanence
//   0.8 T at 100 C, above its 0.39 T saturation).
// - INVALID_LOSS_DATA: core-loss data MKF cannot evaluate (an old DMEGC DMR96 copy whose Steinmetz
//   temperature factor ct(T) is negative at every temperature).
export const MATERIAL_REFUSAL_CODES = Object.freeze(['MATERIAL_INVALID_PROPERTY', 'INVALID_LOSS_DATA']);

function coreLossesModels(userStore) {
    return {
        coreLosses: userStore.selectedModels['coreLosses'] || Defaults.coreLossesModelDefault,
        coreTemperature: userStore.selectedModels['coreTemperature'] || Defaults.coreTemperatureModelDefault,
        gapReluctance: userStore.selectedModels['gapReluctance'] || Defaults.reluctanceModelDefault,
    };
}

function failure(error) {
    return { error: error.message.replace(/^(Error: )?Exception: /, '') };
}

// The whole design's core losses (W) at one operating point, with the core as given, and the AC
// peak of the design's flux density MKF computed them at.
async function lossesOrError(taskQueueStore, core, mas, models, operatingPointIndex) {
    try {
        const result = await taskQueueStore.calculateCoreLossesForMaterialCheck(core, mas.magnetic.coil, mas.inputs, models, operatingPointIndex);
        if (typeof result.magneticFluxDensityAcPeak !== 'number') {
            throw new Error('The engine returned core losses without the flux density they were computed at');
        }
        return { losses: result.coreLosses, magneticFluxDensityAcPeak: result.magneticFluxDensityAcPeak };
    } catch (error) {
        return failure(error);
    }
}

// The material on its own: MKF's volumetric core losses of the material alone (W/m3) at one
// operating point's frequency and ambient temperature, and at the design's flux density as MKF
// computed it with the other copy. Missing data throws; no condition is made up.
async function materialLossesOrError(taskQueueStore, material, operatingPoint, pointName, magneticFluxDensityAcPeak) {
    const temperature = operatingPoint.conditions?.ambientTemperature;
    if (typeof temperature !== 'number') {
        throw new Error(`${pointName} has no ambient temperature to judge the core material at`);
    }
    const frequency = operatingPoint.excitationsPerWinding?.[0]?.frequency;
    if (typeof frequency !== 'number') {
        throw new Error(`${pointName} has no frequency to judge the core material at`);
    }
    try {
        return { losses: await taskQueueStore.calculateVolumetricLossesForMaterialCheck(material, temperature, magneticFluxDensityAcPeak, frequency) };
    } catch (error) {
        return failure(error);
    }
}

function refuses(side) {
    return side.error != null && MATERIAL_REFUSAL_CODES.includes(describeFailure(side.error).code);
}

function relativelyDifferent(a, b) {
    const scale = Math.max(Math.abs(a), Math.abs(b));
    if (scale == 0) return false;
    return Math.abs(a - b) > RELATIVE_LOSS_DIFFERENCE * scale;
}

// One operating point: MKF's verdict on the file's copy, and whether the two copies give other
// core losses. A refusal of the file's copy is the material's, whatever the library's copy does.
// When the design's computation with the file's copy stops for another reason (a winding that
// overlaps the core, say), the material was not reached and is judged on its own. An outcome
// nothing decides is an error, never "no difference".
// Returns { fromFile, fromLibrary, invalid: MKF's refusal or null, differs: bool }.
async function comparePoint(taskQueueStore, mas, coreWithLibraryMaterial, models, index) {
    const fileMaterial = mas.magnetic.core.functionalDescription.material;
    const operatingPoint = mas.inputs.operatingPoints[index];
    const pointName = operatingPoint.name ?? `Operating point ${index + 1}`;
    const fromFile = await lossesOrError(taskQueueStore, mas.magnetic.core, mas, models, index);
    const fromLibrary = coreWithLibraryMaterial == null ? null : await lossesOrError(taskQueueStore, coreWithLibraryMaterial, mas, models, index);

    if (refuses(fromFile)) {
        return { fromFile, fromLibrary, invalid: fromFile.error, differs: true };
    }
    if (fromFile.error == null) {
        if (fromLibrary == null) return { fromFile, fromLibrary, invalid: null, differs: false };
        // Only the library's copy cannot be computed, or both can and are compared.
        const differs = fromLibrary.error != null || relativelyDifferent(fromFile.losses, fromLibrary.losses);
        return { fromFile, fromLibrary, invalid: null, differs };
    }
    if (fromLibrary == null || fromLibrary.error != null) {
        const libraryReason = fromLibrary == null ? 'the library has no copy to compute it with' : `with the library's copy: ${fromLibrary.error}`;
        throw new Error(`${pointName}: the design cannot be computed with its copy of core material '${fileMaterial.name}' (${fromFile.error}), nor ${libraryReason}; with no flux density from the engine, that copy cannot be judged on its own`);
    }
    // Only the file's copy cannot be computed: the copies differ (Alf, 2026-10-14). Whether MKF
    // refuses the copy itself is judged on the material alone, at the design's flux density.
    const fileAlone = await materialLossesOrError(taskQueueStore, fileMaterial, operatingPoint, pointName, fromLibrary.magneticFluxDensityAcPeak);
    if (refuses(fileAlone)) {
        return { fromFile, fromLibrary, invalid: fileAlone.error, differs: true };
    }
    if (fileAlone.error != null) {
        throw new Error(`${pointName}: the design cannot be computed with its copy of core material '${fileMaterial.name}' (${fromFile.error}), and the engine cannot judge that copy on its own either (${fileAlone.error})`);
    }
    return { fromFile, fromLibrary, invalid: null, differs: true };
}

// Returns null when the design's core material is not an inline copy of a library material, or
// when the copy gives the library's core losses at every operating point. Otherwise
// { name, libraryMaterial, libraryError, invalid, operatingPoints: [{ name, fromFile, fromLibrary }] }
// with every point, each side either { losses } (W) or { error } (MKF's reason). `invalid` is MKF's
// message when it refuses the stored copy (also reported when the losses would not differ), else
// null. When the library has no such material, libraryMaterial is null, libraryError says why, and
// the finding exists only if MKF refuses the stored copy.
// Throws when the copy can be judged neither through the design nor on its own.
export async function findOutdatedCoreMaterial(mas, { taskQueueStore, userStore }) {
    const material = mas.magnetic?.core?.functionalDescription?.material;
    if (material == null || typeof material !== 'object') return null;
    if (mas.magnetic.core.processedDescription == null) return null;
    const operatingPoints = mas.inputs?.operatingPoints ?? [];
    if (operatingPoints.length == 0) return null;

    const models = coreLossesModels(userStore);
    let libraryMaterial;
    try {
        libraryMaterial = await taskQueueStore.getMaterialData(material.name);
    } catch (error) {
        // A material the library does not know is the user's own; nothing to compare it with,
        // unless MKF refuses the stored copy: then the design cannot be computed, and the user is
        // told so, with no library copy to offer.
        const libraryError = error.message.replace(/^(Error: )?Exception: /, '');
        let invalid = null;
        for (let index = 0; index < operatingPoints.length && invalid == null; index++) {
            invalid = (await comparePoint(taskQueueStore, mas, null, models, index)).invalid;
        }
        if (invalid == null) {
            console.warn(`Imported MAS: core material '${material.name}' is not in the library, its stored copy is used as it is (${error.message})`);
            return null;
        }
        return { name: material.name, libraryMaterial: null, libraryError, invalid, operatingPoints: [] };
    }

    const coreWithLibraryMaterial = deepCopy(mas.magnetic.core);
    coreWithLibraryMaterial.functionalDescription.material = deepCopy(libraryMaterial);
    const compared = [];
    let anyDiffers = false;
    let invalid = null;
    for (let index = 0; index < operatingPoints.length; index++) {
        const point = await comparePoint(taskQueueStore, mas, coreWithLibraryMaterial, models, index);
        anyDiffers = anyDiffers || point.differs;
        if (invalid == null) invalid = point.invalid;
        compared.push({ name: operatingPoints[index].name ?? `Operating point ${index + 1}`, fromFile: point.fromFile, fromLibrary: point.fromLibrary });
    }
    if (!anyDiffers && invalid == null) return null;
    return { name: material.name, libraryMaterial, libraryError: null, invalid, operatingPoints: compared };
}
