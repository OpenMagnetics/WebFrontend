// Explicit nulls in a MAS document.
//
// The engine's results and quicktype-generated objects carry `null` for optional fields that are
// not set (designRequirements.market, magnetizingInductance.unit, ...). The MAS JSON Schema does
// not allow null for a typed optional: the key must be absent. Every MAS that leaves the app
// (export, account save) and every check against the schema therefore drops those keys first.
//
// Only object KEYS are dropped; array elements are kept as they are, so per-winding and
// per-operating-point arrays keep their indices.

// Drops, in place, every object key whose value is null, the string 'null' or undefined.
export function stripNulls(value) {
    if (Array.isArray(value)) {
        value.forEach(stripNulls);
        return value;
    }
    if (value && typeof value === 'object') {
        for (const key of Object.keys(value)) {
            if (value[key] === null || value[key] === 'null' || value[key] === undefined) {
                delete value[key];
            } else {
                stripNulls(value[key]);
            }
        }
    }
    return value;
}

// A copy of `mas` ready to be stored: plain JSON, without the null keys.
export function masForSaving(mas) {
    if (mas == null) {
        throw new Error('masForSaving: there is no design to save');
    }
    return stripNulls(JSON.parse(JSON.stringify(mas)));
}
