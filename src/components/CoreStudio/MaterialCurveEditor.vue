<script>
// Generic measured-curve table editor for Core Studio materials (ABT #323).
//
// Every curve property of a MAS core material is a list of point objects
// ({value, temperature, frequency, ...} or BH points); this one component
// renders any of them from a column spec instead of a bespoke widget per
// field. Points are edited in place, rows can be added/removed, and a whole
// datasheet table can be pasted (one point per line, columns in the order
// shown). All units are SI, exactly as MAS stores them.
export default {
    props: {
        label: { type: String, required: true },
        hint: { type: String, default: "" },
        // Normalized array of point objects, or null when the record does not
        // carry this curve. The parent owns scalar-vs-array normalization.
        points: { type: Array, default: null },
        // [{key, label, required}] — column order is also the paste order.
        columns: { type: Array, required: true },
        // Required curves (saturation, resistivity, permeability.initial)
        // cannot be removed, only edited.
        removable: { type: Boolean, default: true },
        dataTestLabel: { type: String, required: true },
    },
    emits: ['update:points', 'remove'],
    data() {
        return {
            pasteOpen: false,
            pasteText: "",
            pasteError: "",
        };
    },
    computed: {
        requiredColumnCount() {
            return this.columns.filter((c) => c.required).length;
        },
        pointCountLabel() {
            if (this.points == null) return "not set";
            return `${this.points.length} point${this.points.length === 1 ? '' : 's'}`;
        },
    },
    methods: {
        emitPoints(points) {
            this.$emit('update:points', points);
        },
        cellGet(point, key) {
            return point[key] ?? "";
        },
        cellSet(rowIndex, key, rawValue, required) {
            const points = this.points.map((p) => ({ ...p }));
            if (rawValue === "" || rawValue == null) {
                // Optional columns are ABSENT when empty (never null); required
                // columns keep null so the engine round-trip rejects loudly.
                if (required) points[rowIndex][key] = null;
                else delete points[rowIndex][key];
            }
            else {
                const value = Number(rawValue);
                if (!Number.isFinite(value)) {
                    this.pasteError = `${this.label}: "${rawValue}" is not a number`;
                    return;
                }
                points[rowIndex][key] = value;
            }
            this.pasteError = "";
            this.emitPoints(points);
        },
        addPoint() {
            const point = {};
            this.columns.forEach((c) => { if (c.required) point[c.key] = null; });
            this.emitPoints([...(this.points ?? []), point]);
        },
        removePoint(rowIndex) {
            const points = this.points.filter((_, i) => i !== rowIndex);
            this.emitPoints(points);
        },
        applyPaste() {
            try {
                const points = [];
                this.pasteText.split('\n').forEach((line, index) => {
                    const trimmed = line.trim();
                    if (trimmed === "") return;
                    const parts = trimmed.split(/[,;\t ]+/).map(Number);
                    if (parts.length < this.requiredColumnCount || parts.length > this.columns.length || parts.some((v) => !Number.isFinite(v))) {
                        const order = this.columns.map((c) => c.label + (c.required ? '' : '?')).join(', ');
                        const expected = this.requiredColumnCount === this.columns.length
                            ? `${this.columns.length}` : `${this.requiredColumnCount}–${this.columns.length}`;
                        throw new Error(`Line ${index + 1}: expected ${expected} numbers in the order "${order}", got "${trimmed}"`);
                    }
                    const point = {};
                    parts.forEach((value, column) => { point[this.columns[column].key] = value; });
                    points.push(point);
                });
                if (points.length === 0) {
                    throw new Error("Paste is empty — one point per line, columns separated by tab, comma or space.");
                }
                this.pasteError = "";
                this.pasteOpen = false;
                this.pasteText = "";
                this.emitPoints(points);
            }
            catch (error) {
                this.pasteError = String(error.message ?? error);
            }
        },
    },
}
</script>

<template>
    <details class="curve-block" :data-cy="dataTestLabel">
        <summary :data-cy="dataTestLabel + '-summary'">
            <span class="curve-label">{{ label }}</span>
            <span class="curve-count" :class="{ empty: points == null }" :data-cy="dataTestLabel + '-count'">{{ pointCountLabel }}</span>
        </summary>
        <div class="curve-body">
            <p v-if="hint" class="curve-hint">{{ hint }}</p>
            <div v-if="points != null && points.length > 0" class="curve-table-wrap">
                <table class="curve-table">
                    <thead>
                        <tr>
                            <th v-for="column in columns" :key="column.key">{{ column.label }}<span v-if="!column.required" class="curve-optional">?</span></th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(point, rowIndex) in points" :key="rowIndex">
                            <td v-for="column in columns" :key="column.key">
                                <input
                                    :data-cy="dataTestLabel + '-row-' + rowIndex + '-' + column.key"
                                    type="number" step="any"
                                    :value="cellGet(point, column.key)"
                                    @change="cellSet(rowIndex, column.key, $event.target.value, column.required)"
                                />
                            </td>
                            <td><button class="curve-btn danger" :data-cy="dataTestLabel + '-row-' + rowIndex + '-delete'" title="delete point" @click="removePoint(rowIndex)">✕</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="curve-actions">
                <button class="curve-btn" :data-cy="dataTestLabel + '-add'" @click="addPoint">+ point</button>
                <button class="curve-btn" :data-cy="dataTestLabel + '-paste'" @click="pasteOpen = !pasteOpen">Paste table</button>
                <button v-if="removable && points != null" class="curve-btn danger" :data-cy="dataTestLabel + '-remove'" @click="$emit('remove')">Remove curve</button>
            </div>
            <div v-if="pasteOpen" class="curve-paste">
                <p class="curve-hint">One point per line, columns separated by tab/comma/space (straight out of a datasheet or Excel), in this order:
                    <code>{{ columns.map((c) => c.label + (c.required ? '' : '?')).join(', ') }}</code> — <code>?</code> columns may be omitted from the right. Replaces the current points.</p>
                <textarea :data-cy="dataTestLabel + '-paste-text'" v-model="pasteText" rows="5"></textarea>
                <button class="curve-btn" :data-cy="dataTestLabel + '-paste-apply'" @click="applyPaste">Apply</button>
            </div>
            <div v-if="pasteError" class="curve-error" :data-cy="dataTestLabel + '-error'">{{ pasteError }}</div>
        </div>
    </details>
</template>

<style scoped>
.curve-block {
    border: 1px solid rgba(var(--p-white-rgb), 0.1);
    border-radius: 8px;
    margin-bottom: 0.45rem;
    background: rgba(var(--p-white-rgb), 0.02);
}
.curve-block summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    padding: 0.35rem 0.7rem;
    cursor: pointer;
    list-style-position: inside;
}
.curve-label { color: rgba(var(--p-white-rgb), 0.85); font-size: 0.88rem; font-weight: 600; }
.curve-count {
    color: var(--p-primary);
    font-size: 0.8rem;
    white-space: nowrap;
}
.curve-count.empty { color: rgba(var(--p-white-rgb), 0.4); font-style: italic; }
.curve-body { padding: 0.4rem 0.7rem 0.6rem; border-top: 1px solid rgba(var(--p-white-rgb), 0.08); }
.curve-hint { color: rgba(var(--p-white-rgb), 0.55); font-size: 0.82rem; margin: 0.2rem 0 0.5rem; }
.curve-table-wrap { overflow-x: auto; margin-bottom: 0.4rem; }
.curve-table { border-collapse: collapse; }
.curve-table th {
    color: rgba(var(--p-white-rgb), 0.55);
    font-size: 0.76rem;
    font-weight: 600;
    text-align: left;
    padding: 0.15rem 0.35rem;
    white-space: nowrap;
}
.curve-table td { padding: 0.1rem 0.35rem; }
.curve-table td input { width: 6.5rem; }
.curve-optional { color: rgba(var(--p-white-rgb), 0.35); margin-left: 0.15rem; }
.curve-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.curve-btn {
    background: rgba(var(--p-white-rgb), 0.06);
    color: rgba(var(--p-white-rgb), 0.85);
    border: 1px solid rgba(var(--p-white-rgb), 0.2);
    border-radius: 6px;
    padding: 0.15rem 0.6rem;
    font-size: 0.8rem;
    cursor: pointer;
}
.curve-btn.danger { color: var(--p-danger); border-color: rgba(var(--p-danger-rgb), 0.5); }
.curve-paste { margin-top: 0.4rem; }
.curve-paste textarea { width: 100%; font-family: monospace; margin-bottom: 0.3rem; }
.curve-error {
    color: var(--p-danger);
    background: rgba(var(--p-danger-rgb), 0.12);
    border: 1px solid rgba(var(--p-danger-rgb), 0.4);
    border-radius: 6px;
    padding: 0.3rem 0.6rem;
    font-size: 0.82rem;
    margin-top: 0.4rem;
    white-space: pre-wrap;
}
</style>
