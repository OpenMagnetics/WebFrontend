// A stored design carries its own copy of its core material, taken from the library when it was
// designed. The library is refitted since (e.g. TP4A, 2026-08-11: the stored copy's Steinmetz
// ct(T) turns negative above 149 C), so an old copy can give results today's material would not.
// Nearly every old copy differs from the library somewhere (181 of 196 in the corpus of stored
// designs), most with no visible effect, so a difference alone is not reported.
//
// The material is judged on its own, by MKF, never through the design (a design can stop for
// reasons that have nothing to do with its material):
// - check_core_material: MKF's verdict on the file's copy alone, each refusal with the error code
//   the design calculation throws and the temperatures where it holds.
// - compare_core_material_volumetric_losses: both copies priced with the design's core-loss path at
//   points taken from the library copy's own data. The copies differ where their volumetric losses
//   differ by more than RELATIVE_LOSS_DIFFERENCE, or where only one of the two can be computed
//   (Alf, 2026-10-14). The file's copy is kept; the user decides.
export const RELATIVE_LOSS_DIFFERENCE = 0.1;

// What each of MKF's refusal codes means for the loaded design (Alf, 2026-10-28). Keyed on the
// code, never on MKF's wording.
// - MATERIAL_INVALID_PROPERTY: data no material can have (Fair-Rite 95's old record: remanence
//   0.8 T at 100 C, above its 0.39 T saturation). The copy is refused: nothing is computed with it
//   and the library's copy is offered.
// - INVALID_LOSS_DATA: core-loss data MKF cannot evaluate over part of the material's temperatures
//   (an old 3C94 copy whose Steinmetz temperature factor ct(T) is negative above about 5 C). Not a
//   refusal: the design is computed with the file's copy where MKF can, the copy is reported as
//   differing from the library's, and the temperatures where its loss data is invalid are a
//   WARNING in the Engine log.
export const REFUSED_MATERIAL_CODES = Object.freeze(['MATERIAL_INVALID_PROPERTY']);
export const INVALID_LOSS_DATA_CODES = Object.freeze(['INVALID_LOSS_DATA']);

// Key order and unset (null) keys do not make two copies different.
function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value == null || typeof value !== 'object') return value;
    const result = {};
    for (const key of Object.keys(value).sort()) {
        if (value[key] === null || value[key] === undefined) continue;
        result[key] = canonical(value[key]);
    }
    return result;
}

function sameCopy(a, b) {
    return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

function computed(value) {
    return typeof value?.volumetricLosses === 'number';
}

// MKF's comparison read as: the largest difference (the point it is at), and the points only one
// copy can compute. Throws when no point says anything (both copies refused everywhere).
function readComparison(comparison) {
    const points = comparison.points;
    if (!Array.isArray(points) || points.length === 0) {
        throw new Error(`MKF compared the copies of core material '${comparison.other}' at no point`);
    }
    let largest = null;
    for (const point of points) {
        if (typeof point.relativeDifference !== 'number') continue;
        if (largest == null || Math.abs(point.relativeDifference) > Math.abs(largest.relativeDifference)) largest = point;
    }
    const refusedByFile = points.filter((point) => computed(point.reference) && !computed(point.other));
    const refusedByLibrary = points.filter((point) => !computed(point.reference) && computed(point.other));
    if (largest == null && refusedByFile.length === 0 && refusedByLibrary.length === 0) {
        throw new Error(`Neither copy of core material '${comparison.other}' gives core losses at any of the ${points.length} points MKF compared them at (${points[0].other.message ?? points[0].reference.message})`);
    }
    const differs = refusedByFile.length > 0 || refusedByLibrary.length > 0
        || Math.abs(largest.relativeDifference) > RELATIVE_LOSS_DIFFERENCE;
    return {
        differs,
        pointCount: points.length,
        largest: largest == null ? null : {
            frequency: largest.frequency,
            magneticFluxDensityPeak: largest.magneticFluxDensityPeak,
            temperature: largest.temperature,
            fromFile: largest.other.volumetricLosses,
            fromLibrary: largest.reference.volumetricLosses,
            relativeDifference: largest.relativeDifference,
        },
        refusedByFile: refusedByFile.length,
        // MKF's reason for the first point the file's copy cannot compute.
        refusedByFileReason: refusedByFile.length === 0 ? null : refusedByFile[0].other.message,
        refusedByLibrary: refusedByLibrary.length,
    };
}

function problemCode(problem) {
    if (typeof problem.code !== 'string' || problem.code === '') {
        throw new Error(`MKF check_core_material returned a problem without its code: ${JSON.stringify(problem)}`);
    }
    return problem.code;
}

// Returns null when the design's core material is not an inline copy, or when MKF finds nothing
// wrong with it and it gives the library's core losses. Otherwise
// { name, libraryMaterial, libraryError, invalid, invalidDetail, invalidLossData, comparison }:
// - invalid: MKF's refusal of the copy (its exception text, "[MATERIAL_INVALID_PROPERTY] ..."), or
//   null; invalidDetail: MKF's statement of the refusal over the material's temperatures.
// - invalidLossData: the INVALID_LOSS_DATA problems MKF reports for the copy ([] when none), each
//   { message, engineMessage, temperature: {minimum, maximum} | null, frequency | null }.
// - comparison: readComparison of library vs file copy, or null when there is no library copy
//   (libraryMaterial null, libraryError says why) or the copies are the same.
// A problem code without a rule here, or a copy MKF cannot judge, throws.
export async function findOutdatedCoreMaterial(mas, { taskQueueStore }) {
    const material = mas.magnetic?.core?.functionalDescription?.material;
    if (material == null || typeof material !== 'object') return null;

    const check = await taskQueueStore.checkCoreMaterial(material);
    if (!Array.isArray(check.problems)) {
        throw new Error(`MKF check_core_material returned no problem list for core material '${material.name}'`);
    }
    const refusals = check.problems.filter((problem) => REFUSED_MATERIAL_CODES.includes(problemCode(problem)));
    const invalidLossData = check.problems.filter((problem) => INVALID_LOSS_DATA_CODES.includes(problemCode(problem)));
    const unruled = check.problems.filter((problem) => !REFUSED_MATERIAL_CODES.includes(problem.code) && !INVALID_LOSS_DATA_CODES.includes(problem.code));
    if (unruled.length > 0) {
        throw new Error(`MKF reports ${unruled.map((problem) => problem.code).join(', ')} for the design's copy of core material '${material.name}', and the web has no rule for what that means for the design: ${unruled[0].message}`);
    }

    let libraryMaterial = null;
    let libraryError = null;
    try {
        libraryMaterial = await taskQueueStore.getMaterialData(material.name);
    } catch (error) {
        // A material the library does not know is the user's own: nothing to compare it with.
        libraryError = error.message.replace(/^(Error: )?Exception: /, '');
    }

    let comparison = null;
    if (libraryMaterial != null && !sameCopy(material, libraryMaterial)) {
        comparison = readComparison(await taskQueueStore.compareCoreMaterialVolumetricLosses(libraryMaterial, material));
    }

    if (libraryMaterial == null && refusals.length === 0 && invalidLossData.length === 0) {
        console.warn(`Imported MAS: core material '${material.name}' is not in the library, its stored copy is used as it is (${libraryError})`);
        return null;
    }
    if (refusals.length === 0 && invalidLossData.length === 0 && (comparison == null || !comparison.differs)) return null;
    return {
        name: material.name,
        libraryMaterial,
        libraryError,
        invalid: refusals.length === 0 ? null : refusals[0].engineMessage,
        invalidDetail: refusals.length === 0 ? null : refusals.map((problem) => problem.message).join(' '),
        invalidLossData: invalidLossData.map((problem) => ({
            message: problem.message,
            engineMessage: problem.engineMessage,
            temperature: problem.temperature ?? null,
            frequency: problem.frequency ?? null,
        })),
        comparison,
    };
}

function temperatureText(value) {
    return `${Number(value.toPrecision(3))} °C`;
}

// "from -40 °C to -0.15 °C and from 4.73 °C to 180 °C": every distinct interval MKF reports, in order.
export function invalidLossDataTemperatures(problems) {
    const intervals = [];
    for (const problem of problems) {
        const span = problem.temperature;
        if (span == null) continue;
        if (!intervals.some((other) => other.minimum === span.minimum && other.maximum === span.maximum)) intervals.push(span);
    }
    intervals.sort((a, b) => a.minimum - b.minimum);
    return intervals.map((span) => span.minimum === span.maximum
        ? `at ${temperatureText(span.minimum)}`
        : `from ${temperatureText(span.minimum)} to ${temperatureText(span.maximum)}`).join(' and ');
}

// The Engine log's WARNING for a copy whose loss data MKF finds invalid (Alf, 2026-10-28: "option 2
// as a warning in log"): which material, where, and what to do. MKF's own statements are the detail.
export function invalidLossDataWarning(finding) {
    if (finding.invalidLossData.length === 0) return null;
    const temperatures = invalidLossDataTemperatures(finding.invalidLossData);
    const where = temperatures === '' ? '' : ` ${temperatures}`;
    const advice = finding.libraryMaterial != null
        ? `Update it to the library's copy to compute core losses there.`
        : `Choose another material to compute core losses there.`;
    return {
        message: `The design's copy of core material ${finding.name} has core-loss data the engine cannot use${where}; core losses at those temperatures cannot be computed with it. ${advice}`,
        code: INVALID_LOSS_DATA_CODES[0],
        detail: finding.invalidLossData.map((problem) => problem.message).join(' '),
    };
}
