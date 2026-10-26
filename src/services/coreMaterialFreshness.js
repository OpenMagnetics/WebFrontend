import { deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import * as Defaults from 'WebSharedComponents/assets/js/defaults.js'

// A stored design carries its own copy of its core material, taken from the library when it was
// designed. The library is refitted since (e.g. TP4A, 2026-08-11: the stored copy's Steinmetz
// ct(T) turns negative above 149 C), so an old copy can give results today's material would not.
// Nearly every old copy differs from the library somewhere (181 of 196 in the corpus of stored
// designs), most with no visible effect, so a difference alone is not reported: MKF computes the
// design's core losses at every operating point with the file's copy and with the library's, and
// the design is flagged where they differ by more than RELATIVE_LOSS_DIFFERENCE, or where only one
// of the two can be computed (Alf, 2026-10-14). The file's copy is kept; the user decides.
export const RELATIVE_LOSS_DIFFERENCE = 0.1;

function coreLossesModels(userStore) {
    return {
        coreLosses: userStore.selectedModels['coreLosses'] || Defaults.coreLossesModelDefault,
        coreTemperature: userStore.selectedModels['coreTemperature'] || Defaults.coreTemperatureModelDefault,
        gapReluctance: userStore.selectedModels['gapReluctance'] || Defaults.reluctanceModelDefault,
    };
}

async function lossesOrError(taskQueueStore, core, mas, models, operatingPointIndex) {
    try {
        const result = await taskQueueStore.calculateCoreLossesForMaterialCheck(core, mas.magnetic.coil, mas.inputs, models, operatingPointIndex);
        return { losses: result.coreLosses };
    } catch (error) {
        return { error: error.message.replace(/^(Error: )?Exception: /, '') };
    }
}

function lossesDiffer(fromFile, fromLibrary) {
    if ((fromFile.error == null) != (fromLibrary.error == null)) return true;
    if (fromFile.error != null) return false;
    const scale = Math.max(Math.abs(fromFile.losses), Math.abs(fromLibrary.losses));
    if (scale == 0) return false;
    return Math.abs(fromFile.losses - fromLibrary.losses) > RELATIVE_LOSS_DIFFERENCE * scale;
}

// MKF's own verdict that a material's data is not a material's (MKF's MATERIAL_INVALID_PROPERTY,
// e.g. Fair-Rite 95's old record: remanence 0.8 T at 100 C above its 0.39 T saturation). The web
// only reads MKF's error code; the check itself is MKF's (Alf, 2026-10-26: a stored material MKF
// refuses is named on load, and the library's copy offered, never swapped in silently).
const MATERIAL_INVALID_PROPERTY = '[MATERIAL_INVALID_PROPERTY]';

function refusesMaterial(side) {
    return side.error != null && side.error.includes(MATERIAL_INVALID_PROPERTY);
}

async function invalidMaterialMessage(taskQueueStore, mas, models, numberOperatingPoints) {
    for (let index = 0; index < numberOperatingPoints; index++) {
        const fromFile = await lossesOrError(taskQueueStore, mas.magnetic.core, mas, models, index);
        if (refusesMaterial(fromFile)) return fromFile.error;
    }
    return null;
}

// Returns null when the design's core material is not an inline copy of a library material, or
// when the copy gives the library's core losses at every operating point. Otherwise
// { name, libraryMaterial, libraryError, invalid, operatingPoints: [{ name, fromFile, fromLibrary }] }
// with every point, each side either { losses } (W) or { error } (MKF's reason). `invalid` is MKF's
// message when it refuses the stored copy (also reported when the losses would not differ), else
// null. When the library has no such material, libraryMaterial is null, libraryError says why, and
// the finding exists only if MKF refuses the stored copy.
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
        const invalid = await invalidMaterialMessage(taskQueueStore, mas, models, operatingPoints.length);
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
        const fromFile = await lossesOrError(taskQueueStore, mas.magnetic.core, mas, models, index);
        const fromLibrary = await lossesOrError(taskQueueStore, coreWithLibraryMaterial, mas, models, index);
        anyDiffers = anyDiffers || lossesDiffer(fromFile, fromLibrary);
        if (invalid == null && refusesMaterial(fromFile)) invalid = fromFile.error;
        compared.push({ name: operatingPoints[index].name ?? `Operating point ${index + 1}`, fromFile, fromLibrary });
    }
    if (!anyDiffers && invalid == null) return null;
    return { name: material.name, libraryMaterial, libraryError: null, invalid, operatingPoints: compared };
}
