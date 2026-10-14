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

// Returns null when the design's core material is not an inline copy of a library material, or
// when the copy gives the library's core losses at every operating point. Otherwise
// { name, libraryMaterial, operatingPoints: [{ name, fromFile, fromLibrary }] } with every point,
// each side either { losses } (W) or { error } (MKF's reason).
export async function findOutdatedCoreMaterial(mas, { taskQueueStore, userStore }) {
    const material = mas.magnetic?.core?.functionalDescription?.material;
    if (material == null || typeof material !== 'object') return null;
    if (mas.magnetic.core.processedDescription == null) return null;
    const operatingPoints = mas.inputs?.operatingPoints ?? [];
    if (operatingPoints.length == 0) return null;

    let libraryMaterial;
    try {
        libraryMaterial = await taskQueueStore.getMaterialData(material.name);
    } catch (error) {
        // A material the library does not know is the user's own; nothing to compare it with.
        console.warn(`Imported MAS: core material '${material.name}' is not in the library, its stored copy is used as it is (${error.message})`);
        return null;
    }

    const models = coreLossesModels(userStore);
    const coreWithLibraryMaterial = deepCopy(mas.magnetic.core);
    coreWithLibraryMaterial.functionalDescription.material = deepCopy(libraryMaterial);
    const compared = [];
    let anyDiffers = false;
    for (let index = 0; index < operatingPoints.length; index++) {
        const fromFile = await lossesOrError(taskQueueStore, mas.magnetic.core, mas, models, index);
        const fromLibrary = await lossesOrError(taskQueueStore, coreWithLibraryMaterial, mas, models, index);
        anyDiffers = anyDiffers || lossesDiffer(fromFile, fromLibrary);
        compared.push({ name: operatingPoints[index].name ?? `Operating point ${index + 1}`, fromFile, fromLibrary });
    }
    if (!anyDiffers) return null;
    return { name: material.name, libraryMaterial, operatingPoints: compared };
}
