<script setup>
import Core3DVisualizer from '/WebSharedComponents/Common/Core3DVisualizer.vue'
import MaterialCurveEditor from './MaterialCurveEditor.vue'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { useCustomPartsStore } from '../../stores/customParts'
import { deepCopy } from 'WebSharedComponents/assets/js/utils.js'
</script>

<script>
// Core Studio — professional authoring of core SHAPES, MATERIALS and CORES.
//
// Aimed at power-magnetics engineers and manufacturers who want their parts in
// the OpenMagnetics database: every record is edited in the exact MAS format
// (one ndjson line of core_shapes / core_materials / cores), validated through
// the real MKF engine (never a JS re-implementation), usable immediately in
// this browser, and exportable for contribution to the official database.

const MM = 1000; // UI shows mm, MAS stores meters

function minimalMaterialRecord() {
    // Every REQUIRED field of the MAS coreMaterial schema is present and must
    // be filled by the user — nothing here is a physics default, only empty
    // slots that the engine round-trip will reject if left meaningless.
    return {
        name: "",
        type: "commercial",
        material: "ferrite",
        manufacturerInfo: { name: "" },
        curieTemperature: null,
        density: null,
        permeability: { initial: { value: null } },
        saturation: [{ magneticFluxDensity: null, magneticField: null, temperature: 25 }],
        resistivity: [{ value: null, temperature: 25 }],
        volumetricLosses: { default: [] },
    };
}

function emptySteinmetzRange() {
    return { minimumFrequency: 1, maximumFrequency: 1000000, k: null, alpha: null, beta: null, ct0: 1, ct1: 0, ct2: 0 };
}

// Every measured-curve property of the MAS coreMaterial schema (ABT #323).
// The column lists mirror the schema point types exactly — permeabilityPoint,
// bhCyclePoint and resistivityPoint — and their order is the paste order.
const PERMEABILITY_COLUMNS = [
    { key: 'value', label: 'μ', required: true },
    { key: 'temperature', label: 'T (°C)', required: false },
    { key: 'frequency', label: 'f (Hz)', required: false },
    { key: 'magneticFieldDcBias', label: 'H DC (A/m)', required: false },
    { key: 'magneticFluxDensityPeak', label: 'B peak (T)', required: false },
    { key: 'magneticFieldPeak', label: 'H peak (A/m)', required: false },
    { key: 'tolerance', label: 'tolerance', required: false },
];
const BH_COLUMNS = [
    { key: 'magneticFluxDensity', label: 'B (T)', required: true },
    { key: 'magneticField', label: 'H (A/m)', required: true },
    { key: 'temperature', label: 'T (°C)', required: true },
];
const RESISTIVITY_COLUMNS = [
    { key: 'value', label: 'ρ (Ω·m)', required: true },
    { key: 'temperature', label: 'T (°C)', required: false },
];
const MATERIAL_CURVES = [
    { path: 'permeability.initial', label: 'Initial permeability μi', columns: PERMEABILITY_COLUMNS, removable: false,
      hint: 'Required. A single point with only μ is the scalar catalog value; add points vs temperature/frequency to make it a measured curve.' },
    { path: 'permeability.amplitude', label: 'Amplitude permeability μa', columns: PERMEABILITY_COLUMNS, removable: true,
      hint: 'Secant permeability at a given AC peak flux density — each point pins B peak, frequency and temperature.' },
    { path: 'permeability.incremental', label: 'Incremental permeability μΔ (DC bias)', columns: PERMEABILITY_COLUMNS, removable: true,
      hint: 'Small-signal permeability under DC bias — each point pins H DC. Needed for PFC chokes, output filters, flyback primaries.' },
    { path: 'permeability.reversible', label: 'Reversible permeability μrev', columns: PERMEABILITY_COLUMNS, removable: true,
      hint: 'Limit of μΔ as the AC excursion tends to zero, tabulated vs H DC.' },
    { path: 'permeability.complex.real', label: 'Complex permeability μ′ (real part)', columns: PERMEABILITY_COLUMNS, removable: true,
      hint: 'μ′ vs frequency — this is what CMC impedance work keys off. μ′ and μ″ form one curve: removing one removes both.' },
    { path: 'permeability.complex.imaginary', label: 'Complex permeability μ″ (imaginary part)', columns: PERMEABILITY_COLUMNS, removable: true,
      hint: 'μ″ vs frequency (the loss part). μ′ and μ″ form one curve: removing one removes both.' },
    { path: 'saturation', label: 'Saturation B-H points', columns: BH_COLUMNS, removable: false,
      hint: 'Required. B-H points characterising saturation, per temperature.' },
    { path: 'bhCycle', label: 'B-H cycle', columns: BH_COLUMNS, removable: true,
      hint: 'Full hysteresis cycle points.' },
    { path: 'remanence', label: 'Remanence (H = 0)', columns: BH_COLUMNS, removable: true,
      hint: 'B-H cycle points where the magnetic field is zero.' },
    { path: 'coerciveForce', label: 'Coercive force (B = 0)', columns: BH_COLUMNS, removable: true,
      hint: 'B-H cycle points where the flux density is zero.' },
    { path: 'resistivity', label: 'Resistivity vs temperature', columns: RESISTIVITY_COLUMNS, removable: false,
      hint: 'Required. At least one point; add more for the temperature dependence.' },
];
const MATERIAL_COMPOSITIONS = ['carbonylIron', 'FeMo', 'FeNi', 'FeNiMo', 'FeSi', 'FeSiAl', 'iron', 'MgZn', 'MnZn', 'NiZn', 'proprietary'];
const MATERIAL_APPLICATIONS = ['power', 'interferenceSuppression', 'signalProcessing'];
const MANUFACTURER_STATUSES = ['production', 'prototype', 'preview', 'nrnd', 'obsolete'];

export default {
    data() {
        const taskQueueStore = useTaskQueueStore();
        const customPartsStore = useCustomPartsStore();
        return {
            taskQueueStore,
            customPartsStore,
            activeTab: 'shape',
            busy: false,
            statusMessage: "",
            errorMessage: "",

            // ---------------- Shape tab ----------------
            shapeFamilies: [],
            shapeFamily: "",
            shapeTemplates: [],
            shapeTemplate: "",
            shapeSubtypes: [],           // subtypes of the selected family ('' when none)
            shapeRecord: null,           // full MAS shape record being edited
            shapeFromScratch: false,     // blank record: subtype changes rebuild the dimension grid
            shapeDimensionKeys: [],
            shapeValidation: null,       // { effectiveParameters, columns, windingWindows }
            shapePreviewCore: null,
            shapePreviewUpdate: 0,

            // ---------------- Material tab ----------------
            materialsPerManufacturer: {},
            materialManufacturer: "",
            materialTemplate: "",
            materialRecord: null,        // full MAS material record being edited
            materialTemplateName: null,  // name of the template it was copied from
            lossesMode: 'template',      // template | proprietary | steinmetz | fit | points
            proprietaryDraft: null,      // { method, a, b, c, d? } — by reference into the record when it came from the template
            steinmetzRanges: [emptySteinmetzRange()],
            fitPointsText: "",
            fitRangesText: "150000",
            fitReport: "",
            materialValidation: null,    // readback from the engine
            materialJsonOpen: false,     // "Load JSON" catch-all import
            materialJsonText: "",

            // ---------------- Core tab ----------------
            coreRecord: {
                name: "",
                manufacturerInfo: { name: "", status: "production", reference: "", datasheetUrl: "" },
                distributorsInfo: [],
                functionalDescription: { type: "twoPieceSet", material: "", shape: "", gapping: [], numberStacks: 1 },
            },
            coreGapType: 'Ungapped',
            coreGapLength: 0.0001,
            coreNumberDistributedGaps: 3,
            coreShapeOptions: [],
            coreMaterialOptions: [],
            coreValidation: null,
            corePreviewCore: null,
            corePreviewUpdate: 0,
        };
    },
    computed: {
        materialManufacturers() {
            return Object.keys(this.materialsPerManufacturer);
        },
        materialTemplateOptions() {
            return this.materialsPerManufacturer[this.materialManufacturer] || [];
        },
        customShapeNames() { return Object.keys(this.customPartsStore.shapes); },
        customMaterialNames() { return Object.keys(this.customPartsStore.materials); },
        materialLossMethods() {
            const methods = this.materialRecord?.volumetricLosses?.default;
            if (methods == null) return [];
            return methods.map((m) => Array.isArray(m) ? `measured points (${m.length})` : m.method);
        },
        materialInitialPermeabilityIsScalar() {
            const initial = this.materialRecord?.permeability?.initial;
            return initial != null && !Array.isArray(initial);
        },
        materialCurveSpecs() { return MATERIAL_CURVES; },
        materialCompositions() { return MATERIAL_COMPOSITIONS; },
        materialApplications() { return MATERIAL_APPLICATIONS; },
        manufacturerStatuses() { return MANUFACTURER_STATUSES; },
        massLossesSummary() {
            const massLosses = this.materialRecord?.massLosses;
            if (massLosses == null) return "";
            return Object.entries(massLosses)
                .map(([key, methods]) => `${key}: ${methods.map((m) => Array.isArray(m) ? `points(${m.length})` : m.method).join(', ')}`)
                .join(' · ');
        },
        // The 3D visualizer needs an explicit scene background; the theme
        // variable is the source of truth. Read it from the panel's own root
        // element so a host app that overrides --p-* on a wrapper (instead of
        // :root) is honored.
        visualizerBackground() {
            const element = this.$el instanceof Element ? this.$el : document.documentElement;
            return getComputedStyle(element).getPropertyValue('--p-dark').trim();
        },
        proprietaryCoefficientKeys() {
            if (this.proprietaryDraft == null) return [];
            // magnetics/poco use a·B^b·f^c style (a,b,c); micrometals/tdg also use d.
            return ['micrometals', 'tdg'].includes(this.proprietaryDraft.method) ? ['a', 'b', 'c', 'd'] : ['a', 'b', 'c'];
        },
        proprietaryEquationHint() {
            if (this.proprietaryDraft == null) return "";
            const equations = {
                micrometals: "Pv = f / (a/B³ + b/B^2.3 + c/B^1.65) + d·B²·f²",
                magnetics: "Pv = a · B^b · f^c",
                poco: "Pv = 1000·(a·(f/1000)·(10B)^b + c·(10B·f/1000)²)",
                tdg: "Pv = 1000·(10B)^a·(b·f/1000 + c·(f/1000)^d)",
            };
            return equations[this.proprietaryDraft.method];
        },
    },
    mounted() {
        this.loadCatalogLists();
    },
    methods: {
        setStatus(message) { this.statusMessage = message; this.errorMessage = ""; },
        setError(error) {
            this.errorMessage = String(error?.message ?? error);
            this.statusMessage = "";
            console.error(error);
        },
        async loadCatalogLists() {
            this.busy = true;
            try {
                this.shapeFamilies = (await this.taskQueueStore.getCoreShapeFamilies()).sort();
                this.materialsPerManufacturer = await this.taskQueueStore.getCoreMaterialsByManufacturer();
                await this.refreshCoreOptions();
            }
            catch (error) { this.setError(error); }
            finally { this.busy = false; }
        },
        async refreshCoreOptions() {
            const shapes = [];
            for (const family of this.shapeFamilies) {
                const familyShapes = await this.taskQueueStore.getCoreShapesByFamily(family);
                shapes.push(...familyShapes);
            }
            this.coreShapeOptions = shapes.sort();
            const materials = [];
            Object.values(this.materialsPerManufacturer).forEach((names) => materials.push(...names));
            this.coreMaterialOptions = materials.sort();
        },

        // =============== SHAPE ===============
        // Same labeling convention as the builder's shape selector: planar
        // families are camelCase ("planarEr") and unreadable uppercased.
        familyLabel(family) {
            if (/^planar/i.test(family)) {
                return 'Planar ' + family.slice(6).toUpperCase();
            }
            if (family === 't') {
                return 'T (toroid)';
            }
            return family.toUpperCase();
        },
        async onShapeFamilyChanged() {
            this.shapeTemplates = await this.taskQueueStore.getCoreShapesByFamily(this.shapeFamily);
            this.shapeTemplate = this.shapeTemplates[0] || "";
            this.shapeSubtypes = await this.taskQueueStore.getShapeFamilySubtypes(this.shapeFamily);
        },
        async startBlankShape() {
            if (this.shapeFamily === "") {
                this.setError(new Error("Pick a shape family first."));
                return;
            }
            this.busy = true;
            try {
                const familySubtype = this.shapeSubtypes[0] ?? null;
                const dimensionKeys = await this.taskQueueStore.getShapeFamilyDimensions(this.shapeFamily, familySubtype ?? '');
                const dimensions = {};
                dimensionKeys.forEach((key) => { dimensions[key] = {}; });
                this.shapeRecord = {
                    type: 'custom',
                    family: this.shapeFamily,
                    name: "",
                    aliases: [],
                    dimensions,
                    familySubtype,
                    magneticCircuit: this.shapeFamily === 't' ? 'closed' : 'open',
                };
                this.shapeFromScratch = true;
                this.shapeDimensionKeys = dimensionKeys;
                this.shapeValidation = null;
                this.shapePreviewCore = null;
                this.setStatus(`Blank ${this.familyLabel(this.shapeFamily)} shape started — name it and fill the ${dimensionKeys.length} dimensions (datasheet letters, mm).`);
            }
            catch (error) { this.setError(error); }
            finally { this.busy = false; }
        },
        async onShapeSubtypeChanged(subtype) {
            this.shapeRecord.familySubtype = subtype === "" ? null : subtype;
            if (!this.shapeFromScratch) {
                return;
            }
            // From-scratch record: the dimension letters depend on the subtype.
            const dimensionKeys = await this.taskQueueStore.getShapeFamilyDimensions(this.shapeFamily, subtype ?? '');
            const dimensions = {};
            dimensionKeys.forEach((key) => { dimensions[key] = this.shapeRecord.dimensions[key] ?? {}; });
            this.shapeRecord.dimensions = dimensions;
            this.shapeDimensionKeys = dimensionKeys;
        },
        async loadShapeTemplate() {
            this.busy = true;
            try {
                const shape = await this.taskQueueStore.getShapeData(this.shapeTemplate);
                delete shape.processedDescription;
                shape.aliases = [];
                shape.name = `${this.shapeTemplate} custom`;
                this.shapeRecord = shape;
                this.shapeFromScratch = false;
                this.shapeDimensionKeys = Object.keys(shape.dimensions || {}).sort();
                this.shapeValidation = null;
                this.shapePreviewCore = null;
                this.setStatus(`Template "${this.shapeTemplate}" loaded — rename it and adjust the dimensions.`);
            }
            catch (error) { this.setError(error); }
            finally { this.busy = false; }
        },
        dimGet(key, bound) {
            const dim = this.shapeRecord.dimensions[key];
            if (dim == null || dim[bound] == null) return "";
            return Math.round(dim[bound] * MM * 1e6) / 1e6;
        },
        dimSet(key, bound, rawValue) {
            const dim = this.shapeRecord.dimensions[key];
            if (rawValue === "" || rawValue == null) {
                delete dim[bound];
                return;
            }
            const value = Number(rawValue);
            if (!Number.isFinite(value)) {
                throw new Error(`Dimension ${key}.${bound}: "${rawValue}" is not a number`);
            }
            dim[bound] = value / MM;
        },
        buildTestCoreForShape() {
            return {
                functionalDescription: {
                    name: "Core Studio shape check",
                    type: this.shapeRecord.family === 't' ? 'toroidal' : 'two-piece set',
                    material: '3C97',
                    shape: deepCopy(this.shapeRecord),
                    gapping: [],
                    numberStacks: 1,
                },
            };
        },
        async validateShape() {
            if (this.shapeRecord.name == null || this.shapeRecord.name.trim() === "") {
                this.setError(new Error("Give the shape a name before validating."));
                return;
            }
            this.busy = true;
            try {
                const core = await this.taskQueueStore.calculateCoreData(this.buildTestCoreForShape(), false);
                const processed = core.processedDescription;
                this.shapeValidation = {
                    effectiveArea: processed.effectiveParameters.effectiveArea,
                    effectiveLength: processed.effectiveParameters.effectiveLength,
                    effectiveVolume: processed.effectiveParameters.effectiveVolume,
                    minimumArea: processed.effectiveParameters.minimumArea,
                    columns: processed.columns.length,
                    windingWindowArea: processed.windingWindows?.[0]?.area,
                };
                this.shapePreviewCore = deepCopy(core);
                this.shapePreviewUpdate += 1;
                this.setStatus("Shape processed by the engine — geometry is valid.");
            }
            catch (error) { this.setError(error); }
            finally { this.busy = false; }
        },
        async registerShape() {
            if (this.shapeValidation == null) {
                this.setError(new Error("Validate the shape with the engine before saving."));
                return;
            }
            this.busy = true;
            try {
                await this.taskQueueStore.loadCoreShapes(JSON.stringify(this.shapeRecord));
                this.customPartsStore.upsertShape(deepCopy(this.shapeRecord));
                await this.refreshCoreOptions();
                this.setStatus(`Shape "${this.shapeRecord.name}" registered — available in every selector on this browser, and kept across reloads.`);
            }
            catch (error) { this.setError(error); }
            finally { this.busy = false; }
        },
        downloadShape() { this.downloadNdjson(`${this.shapeRecord.name}.core_shapes.ndjson`, JSON.stringify(this.shapeRecord)); },

        // =============== MATERIAL ===============
        async loadMaterialTemplate() {
            this.busy = true;
            try {
                const material = await this.taskQueueStore.getMaterialData(this.materialTemplate);
                this.materialTemplateName = material.name;
                material.name = `${material.name} custom`;
                if (material.manufacturerInfo == null) material.manufacturerInfo = { name: "" };
                this.materialRecord = material;
                this.lossesMode = 'template';
                this.materialValidation = null;
                this.setStatus(`Template "${this.materialTemplate}" loaded — rename it and adjust the properties.`);
            }
            catch (error) { this.setError(error); }
            finally { this.busy = false; }
        },
        startBlankMaterial() {
            this.materialRecord = minimalMaterialRecord();
            this.materialTemplateName = null;
            this.lossesMode = 'steinmetz';
            this.steinmetzRanges = [emptySteinmetzRange()];
            this.materialValidation = null;
            this.setStatus("Blank material started — fill the required identity fields, and add measured curves (permeability, B-H, complex μ) in the curves card if you have them.");
        },

        // ---- Measured-curve editing (ABT #323) ----
        // Dotted-path access into the material record; intermediate objects
        // (permeability.complex) are created on write and pruned on remove.
        pathGet(object, path) {
            return path.split('.').reduce((node, key) => node?.[key], object);
        },
        curvePoints(path) {
            const raw = this.pathGet(this.materialRecord, path);
            if (raw == null) return null;
            // The schema allows scalar-or-array for permeability entries;
            // normalize to an array for display. The record itself is only
            // rewritten when the user edits.
            return Array.isArray(raw) ? raw : [raw];
        },
        curveSet(path, points) {
            const keys = path.split('.');
            const last = keys.pop();
            let node = this.materialRecord;
            keys.forEach((key) => {
                if (node[key] == null) node[key] = {};
                node = node[key];
            });
            node[last] = points;
        },
        curveRemove(path) {
            // μ′ and μ″ are one schema object (complex requires BOTH): removing
            // either half removes the whole complex block — a half-present
            // complex permeability would be schema-invalid.
            if (path.startsWith('permeability.complex')) {
                delete this.materialRecord.permeability.complex;
                return;
            }
            const keys = path.split('.');
            const last = keys.pop();
            const parent = this.pathGet(this.materialRecord, keys.join('.')) ?? this.materialRecord;
            delete (keys.length === 0 ? this.materialRecord : parent)[last];
        },
        removeMassLosses() {
            delete this.materialRecord.massLosses;
        },
        // ---- Optional scalar metadata ----
        optionalTextSet(key, rawValue) {
            const value = rawValue.trim();
            if (value === "") delete this.materialRecord[key];
            else this.materialRecord[key] = value;
        },
        optionalEnumSet(key, rawValue) {
            if (rawValue === "") delete this.materialRecord[key];
            else this.materialRecord[key] = rawValue;
        },
        commaListGet(key) {
            return (this.materialRecord[key] ?? []).join(', ');
        },
        commaListSet(key, rawValue) {
            const list = rawValue.split(',').map((s) => s.trim()).filter((s) => s !== "");
            if (list.length === 0) delete this.materialRecord[key];
            else this.materialRecord[key] = list;
        },
        dimTolGet(key, bound) {
            return this.materialRecord[key]?.[bound] ?? "";
        },
        dimTolSet(key, bound, rawValue) {
            const dimension = { ...(this.materialRecord[key] ?? {}) };
            if (rawValue === "" || rawValue == null) {
                delete dimension[bound];
            }
            else {
                const value = Number(rawValue);
                if (!Number.isFinite(value)) {
                    this.setError(new Error(`${key}.${bound}: "${rawValue}" is not a number`));
                    return;
                }
                dimension[bound] = value;
            }
            if (Object.keys(dimension).length === 0) delete this.materialRecord[key];
            else this.materialRecord[key] = dimension;
        },
        mfrGet(key) {
            return this.materialRecord.manufacturerInfo?.[key] ?? "";
        },
        mfrSet(key, rawValue) {
            const value = rawValue.trim();
            if (value === "") delete this.materialRecord.manufacturerInfo[key];
            else this.materialRecord.manufacturerInfo[key] = value;
        },
        applicationHas(value) {
            return (this.materialRecord.application ?? []).includes(value);
        },
        applicationToggle(value) {
            const current = this.materialRecord.application ?? [];
            const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
            if (next.length === 0) delete this.materialRecord.application;
            else this.materialRecord.application = next;
        },
        recommendationListGet(key) {
            return (this.materialRecord.recommendations?.[key] ?? []).join(', ');
        },
        recommendationListSet(key, rawValue) {
            const recommendations = this.materialRecord.recommendations ?? {};
            const list = rawValue.split(',').map((s) => s.trim()).filter((s) => s !== "");
            if (list.length === 0) delete recommendations[key];
            else recommendations[key] = list;
            if (Object.keys(recommendations).length === 0) delete this.materialRecord.recommendations;
            else this.materialRecord.recommendations = recommendations;
        },
        recommendationGet(key) {
            return this.materialRecord.recommendations?.[key] ?? "";
        },
        recommendationSet(key, rawValue) {
            const recommendations = this.materialRecord.recommendations ?? {};
            if (rawValue === "" || rawValue == null) {
                delete recommendations[key];
            }
            else {
                const value = Number(rawValue);
                if (!Number.isFinite(value)) {
                    this.setError(new Error(`Recommendation ${key}: "${rawValue}" is not a number`));
                    return;
                }
                recommendations[key] = value;
            }
            if (Object.keys(recommendations).length === 0) delete this.materialRecord.recommendations;
            else this.materialRecord.recommendations = recommendations;
        },
        // Catch-all import: paste a full MAS core-material JSON record (e.g.
        // from Copy JSON, a database ndjson line, or hand-authored vendor
        // data). This is also the editing path for the deep nested blocks the
        // form does not table-ize (permeability modifiers, non-sinusoidal
        // loss-point excitations, massLosses).
        applyMaterialJson() {
            try {
                const record = JSON.parse(this.materialJsonText);
                if (record == null || typeof record !== 'object' || Array.isArray(record)) {
                    throw new Error("Not a JSON object.");
                }
                if (typeof record.name !== 'string' || record.permeability == null) {
                    throw new Error("Not a MAS core material record — it needs at least \"name\" and \"permeability\".");
                }
                if (record.manufacturerInfo == null) record.manufacturerInfo = { name: "" };
                this.materialRecord = record;
                this.materialTemplateName = null;
                this.lossesMode = 'template';
                this.materialValidation = null;
                this.materialJsonOpen = false;
                this.materialJsonText = "";
                this.setStatus(`JSON record "${record.name}" loaded — every field is editable; validate with the engine before saving.`);
            }
            catch (error) { this.setError(error); }
        },
        // Empty optional structures must be ABSENT from the emitted record —
        // the MAS schemas are closed and a half-filled optional block is a
        // latent schema violation. Throws (never trims silently) when a block
        // is inconsistent rather than merely empty.
        pruneMaterialRecord(record) {
            ['bhCycle', 'remanence', 'coerciveForce', 'alternatives', 'application'].forEach((key) => {
                if (Array.isArray(record[key]) && record[key].length === 0) delete record[key];
            });
            const permeability = record.permeability ?? {};
            ['amplitude', 'incremental', 'reversible'].forEach((key) => {
                if (Array.isArray(permeability[key]) && permeability[key].length === 0) delete permeability[key];
            });
            const complex = permeability.complex;
            if (complex != null) {
                const realEmpty = complex.real == null || (Array.isArray(complex.real) && complex.real.length === 0);
                const imaginaryEmpty = complex.imaginary == null || (Array.isArray(complex.imaginary) && complex.imaginary.length === 0);
                if (realEmpty && imaginaryEmpty) delete permeability.complex;
                else if (realEmpty || imaginaryEmpty) {
                    throw new Error("Complex permeability needs BOTH μ′ (real) and μ″ (imaginary) — add the missing part in the Measured curves card, or remove the curve.");
                }
            }
            ['heatConductivity', 'heatCapacity'].forEach((key) => {
                if (record[key] != null && Object.keys(record[key]).length === 0) delete record[key];
            });
            if (record.recommendations != null && Object.keys(record.recommendations).length === 0) {
                delete record.recommendations;
            }
            Object.keys(record).forEach((key) => { if (record[key] == null) delete record[key]; });
        },
        parseFitPoints(minimumPoints = 3) {
            // One point per line: frequency_Hz, B_peak_T, temperature_C, Pv_W/m3
            const points = [];
            this.fitPointsText.split('\n').forEach((line, index) => {
                const trimmed = line.trim();
                if (trimmed === "") return;
                const parts = trimmed.split(/[,;\t ]+/).map(Number);
                if (parts.length < 4 || parts.some((v) => !Number.isFinite(v))) {
                    throw new Error(`Loss point line ${index + 1}: expected "frequency_Hz, B_peak_T, temperature_C, Pv_W/m3", got "${trimmed}"`);
                }
                const [frequency, peak, temperature, value] = parts;
                points.push({
                    magneticFluxDensity: {
                        frequency,
                        magneticFluxDensity: { processed: { label: "Sinusoidal", offset: 0, peak, peakToPeak: 2 * peak } },
                    },
                    temperature,
                    value,
                    origin: "manufacturer",
                });
            });
            if (points.length < minimumPoints) {
                throw new Error(`Need at least ${minimumPoints} loss points, got ${points.length}.`);
            }
            return points;
        },
        async fitSteinmetz() {
            this.busy = true;
            try {
                const points = this.parseFitPoints();
                // The engine validates determinacy itself (ABT #168): it throws
                // specific errors for single-frequency or single-flux-density
                // ranges, and fits the reduced k/alpha/beta model (no ct0-ct2)
                // for single-temperature data.
                const distinctTemperatures = new Set(points.map((p) => p.temperature)).size;
                const boundaries = this.fitRangesText.split(/[,;\s]+/).map(Number).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
                const frequencies = points.map((p) => p.magneticFluxDensity.frequency);
                const edges = [Math.min(...frequencies), ...boundaries, Math.max(...frequencies)];
                const ranges = [];
                for (let i = 0; i < edges.length - 1; i++) {
                    if (edges[i + 1] > edges[i]) ranges.push([edges[i], edges[i + 1]]);
                }
                const fit = await this.taskQueueStore.calculateSteinmetzCoefficients(points, ranges);
                this.steinmetzRanges = fit.coefficientsPerRange;
                this.lossesMode = 'steinmetz';
                const errorSummary = fit.errorPerRange
                    .map((error, index) => `range ${index + 1}: ${(error * 100).toFixed(1)} %`)
                    .join(', ');
                const temperatureNote = distinctTemperatures < 2
                    ? ' Single temperature: k, α, β fitted; temperature coefficients (ct0–ct2) need points at 2+ temperatures.'
                    : '';
                this.fitReport = `Fitted ${fit.coefficientsPerRange.length} range(s) from ${points.length} points — average fit error ${errorSummary}.${temperatureNote}`;
                this.setStatus(this.fitReport);
            }
            catch (error) { this.setError(error); }
            finally { this.busy = false; }
        },
        addSteinmetzRange() {
            this.steinmetzRanges.push(emptySteinmetzRange());
        },
        // Bind the proprietary editor: reuse the record's existing method
        // object (edits go straight into the record) or start a fresh
        // coefficient block for the chosen model.
        initProprietaryDraft(preferredMethod = null) {
            const methods = this.materialRecord?.volumetricLosses?.default ?? [];
            const existing = methods.find((m) => !Array.isArray(m)
                && ['micrometals', 'magnetics', 'poco', 'tdg'].includes(m.method)
                && (preferredMethod == null || m.method === preferredMethod));
            if (existing != null) {
                this.proprietaryDraft = existing;
            }
            else {
                this.proprietaryDraft = { method: preferredMethod ?? 'micrometals', a: null, b: null, c: null, d: null };
            }
        },
        onProprietaryMethodChange(method) {
            this.initProprietaryDraft(method);
            this.proprietaryDraft.method = method;
        },
        applyProprietaryToRecord() {
            const draft = this.proprietaryDraft;
            this.proprietaryCoefficientKeys.forEach((key) => {
                if (draft[key] == null || !Number.isFinite(Number(draft[key]))) {
                    throw new Error(`${draft.method} model: coefficient "${key}" is missing`);
                }
                draft[key] = Number(draft[key]);
            });
            const methods = this.materialRecord.volumetricLosses?.default ?? [];
            if (!methods.includes(draft)) {
                this.materialRecord.volumetricLosses = { default: [draft] };
            }
        },
        applySteinmetzToRecord() {
            const ranges = deepCopy(this.steinmetzRanges);
            ranges.forEach((range, index) => {
                ['k', 'alpha', 'beta'].forEach((key) => {
                    if (range[key] == null || !Number.isFinite(Number(range[key]))) {
                        throw new Error(`Steinmetz range ${index + 1}: coefficient "${key}" is missing`);
                    }
                    range[key] = Number(range[key]);
                });
                ['minimumFrequency', 'maximumFrequency', 'ct0', 'ct1', 'ct2'].forEach((key) => {
                    if (range[key] != null) range[key] = Number(range[key]);
                });
            });
            this.materialRecord.volumetricLosses = { default: [{ method: 'steinmetz', ranges }] };
        },
        async validateMaterial() {
            this.busy = true;
            try {
                const record = this.materialRecord;
                if (record.name == null || record.name.trim() === "") throw new Error("Give the material a name.");
                if (record.manufacturerInfo?.name == null || record.manufacturerInfo.name.trim() === "") throw new Error("Manufacturer name is required.");
                if (this.materialTemplateName != null && record.name === this.materialTemplateName) {
                    throw new Error(`Rename the material — "${record.name}" would overwrite the catalog entry it was copied from.`);
                }
                if (this.lossesMode === 'steinmetz' || this.lossesMode === 'fit') {
                    this.applySteinmetzToRecord();
                }
                else if (this.lossesMode === 'proprietary') {
                    this.applyProprietaryToRecord();
                }
                else if (this.lossesMode === 'points') {
                    // Store the measured datasheet points directly (no fit) —
                    // the engine interpolates measured volumetricLosses lists.
                    record.volumetricLosses = { default: [this.parseFitPoints(1)] };
                }
                if ((record.volumetricLosses?.default ?? []).length === 0) {
                    throw new Error("The material has no volumetric losses model — add Steinmetz coefficients or fit them from points.");
                }
                // The MAS-required numeric fields must actually hold numbers:
                // a record with nulls is silently skipped by the DB loader and
                // the readback then fails with a confusing NOT_FOUND.
                if (this.materialInitialPermeabilityIsScalar && !Number.isFinite(record.permeability?.initial?.value)) {
                    throw new Error("Initial permeability is required — enter μi.");
                }
                if (Array.isArray(record.permeability?.initial)
                    && (record.permeability.initial.length === 0 || !record.permeability.initial.every((p) => Number.isFinite(p.value)))) {
                    throw new Error("Initial permeability curve: every point needs a numeric μ value (or remove the empty points).");
                }
                if (!Array.isArray(record.saturation) || !Number.isFinite(record.saturation[0]?.magneticFluxDensity)) {
                    throw new Error("Saturation is required — enter Bsat (T) at 25 °C.");
                }
                if (!Array.isArray(record.resistivity) || !Number.isFinite(record.resistivity[0]?.value)) {
                    throw new Error("Resistivity is required — enter the value (Ω·m) at 25 °C.");
                }
                // Optional fields left empty must be ABSENT, not null; empty
                // optional curve/metadata blocks are pruned the same way.
                this.pruneMaterialRecord(record);
                // Round-trip through the engine: upsert into the session DB,
                // read it back, and compute temperature-dependent parameters on
                // a test core. Any inconsistency throws loudly.
                await this.taskQueueStore.loadCoreMaterials(JSON.stringify(record));
                const readback = await this.taskQueueStore.getMaterialData(record.name);
                const testCore = {
                    functionalDescription: {
                        name: "Core Studio material check", type: 'two-piece set',
                        material: record.name, shape: 'E 25/13/7', gapping: [], numberStacks: 1,
                    },
                };
                const processedCore = await this.taskQueueStore.calculateCoreData(testCore, false);
                const parameters = await this.taskQueueStore.getCoreTemperatureDependantParameters(processedCore, 25);
                this.materialValidation = {
                    initialPermeability: parameters.initialPermeability,
                    effectivePermeability: parameters.effectivePermeability,
                    saturation: parameters.magneticFluxDensitySaturation,
                    resistivity: parameters.resistivity,
                    lossMethods: (readback.volumetricLosses?.default ?? []).map((m) => Array.isArray(m) ? `points(${m.length})` : m.method).join(', '),
                };
                this.setStatus(`Material "${record.name}" accepted by the engine (loaded into this session).`);
            }
            catch (error) { this.materialValidation = null; this.setError(error); }
            finally { this.busy = false; }
        },
        async registerMaterial() {
            if (this.materialValidation == null) {
                this.setError(new Error("Validate the material with the engine before saving."));
                return;
            }
            this.busy = true;
            try {
                this.customPartsStore.upsertMaterial(deepCopy(this.materialRecord));
                this.materialsPerManufacturer = await this.taskQueueStore.getCoreMaterialsByManufacturer();
                await this.refreshCoreOptions();
                this.setStatus(`Material "${this.materialRecord.name}" registered — available in every selector on this browser, and kept across reloads.`);
            }
            catch (error) { this.setError(error); }
            finally { this.busy = false; }
        },
        downloadMaterial() {
            try {
                this.pruneMaterialRecord(this.materialRecord);
                this.downloadNdjson(`${this.materialRecord.name}.core_materials.ndjson`, JSON.stringify(this.materialRecord));
            }
            catch (error) { this.setError(error); }
        },

        // =============== CORE ===============
        async validateCore() {
            this.busy = true;
            try {
                const fd = this.coreRecord.functionalDescription;
                if (this.coreRecord.name.trim() === "") throw new Error("Give the core a name.");
                if (fd.shape === "" || fd.material === "") throw new Error("Pick a shape and a material.");

                // First pass ungapped to learn the column count, then build the
                // gapping one-gap-per-column (same semantics as the builder).
                fd.gapping = [];
                const shape = await this.taskQueueStore.getShapeData(fd.shape);
                fd.type = shape.family === 't' ? 'toroidal' : 'two-piece set';
                let core = await this.taskQueueStore.calculateCoreData(deepCopy(this.coreRecord), false);
                const numberColumns = core.processedDescription.columns.length;

                const residual = () => ({ length: 0.000005, type: 'residual' });
                const gapping = [];
                const length = Number(this.coreGapLength);
                if (this.coreGapType === 'Ground') {
                    gapping.push({ length, type: 'subtractive' });
                    for (let i = 1; i < numberColumns; i++) gapping.push(residual());
                }
                else if (this.coreGapType === 'Spacer') {
                    for (let i = 0; i < numberColumns; i++) gapping.push({ length, type: 'additive' });
                }
                else if (this.coreGapType === 'Distributed') {
                    for (let i = 0; i < this.coreNumberDistributedGaps; i++) gapping.push({ length, type: 'subtractive' });
                    for (let i = 1; i < numberColumns; i++) gapping.push(residual());
                }
                fd.gapping = gapping;
                core = await this.taskQueueStore.calculateCoreData(deepCopy(this.coreRecord), false);
                this.coreRecord.functionalDescription = core.functionalDescription;

                this.coreValidation = {
                    effectiveArea: core.processedDescription.effectiveParameters.effectiveArea,
                    effectiveLength: core.processedDescription.effectiveParameters.effectiveLength,
                    effectiveVolume: core.processedDescription.effectiveParameters.effectiveVolume,
                    columns: numberColumns,
                    gaps: core.functionalDescription.gapping.map((g) => `${g.type} ${Math.round(g.length * 1e6)} µm`).join(', ') || 'ungapped',
                };
                this.corePreviewCore = deepCopy(core);
                this.corePreviewUpdate += 1;
                this.setStatus(`Core "${this.coreRecord.name}" processed by the engine.`);
            }
            catch (error) { this.coreValidation = null; this.setError(error); }
            finally { this.busy = false; }
        },
        registerCore() {
            if (this.coreValidation == null) {
                this.setError(new Error("Validate the core with the engine before saving."));
                return;
            }
            const record = deepCopy(this.coreRecord);
            // The stored/contributed record references shape & material by
            // name (catalog style), not inline objects.
            record.functionalDescription.shape = typeof record.functionalDescription.shape === 'string'
                ? record.functionalDescription.shape
                : record.functionalDescription.shape.name;
            if (typeof record.functionalDescription.material !== 'string') {
                record.functionalDescription.material = record.functionalDescription.material.name;
            }
            delete record.processedDescription;
            delete record.geometricalDescription;
            this.customPartsStore.upsertCore(record);
            this.setStatus(`Core "${record.name}" saved. Its shape/material must be contributed alongside it if they are custom.`);
        },
        downloadCore() {
            const record = deepCopy(this.coreRecord);
            record.functionalDescription.shape = typeof record.functionalDescription.shape === 'string'
                ? record.functionalDescription.shape
                : record.functionalDescription.shape.name;
            delete record.processedDescription;
            delete record.geometricalDescription;
            this.downloadNdjson(`${record.name}.cores.ndjson`, JSON.stringify(record));
        },

        // =============== common ===============
        downloadNdjson(filename, content) {
            const blob = new Blob([content + '\n'], { type: 'application/x-ndjson' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename.replace(/[\/\\:]/g, '_');
            anchor.click();
            URL.revokeObjectURL(url);
            this.setStatus(`Downloaded ${filename} — one MAS ndjson line, ready for a pull request to the OpenMagnetics database.`);
        },
        async copyToClipboard(record) {
            await navigator.clipboard.writeText(JSON.stringify(record));
            this.setStatus("Record JSON copied to the clipboard.");
        },
        fmt(value, digits = 3) {
            if (value == null || !Number.isFinite(value)) return "—";
            if (value !== 0 && (Math.abs(value) < 0.001 || Math.abs(value) >= 100000)) return value.toExponential(digits);
            return Number(value.toPrecision(digits + 1)).toString();
        },
    },
}
</script>

<template>
    <div class="container studio-container py-4">

                <div class="row mb-3">
                    <div class="col-12">
                        <h1 class="studio-title" data-cy="CoreStudio-title">Core Studio</h1>
                        <p class="studio-subtitle">Author core <strong>shapes</strong>, <strong>materials</strong> and <strong>cores</strong> in the open MAS format. Every record is validated by the real simulation engine, usable immediately in this browser, and exportable as an <code>.ndjson</code> line for contribution to the
                            <a href="https://github.com/OpenMagnetics/MAS" target="_blank" rel="noopener noreferrer">OpenMagnetics database</a> — manufacturers welcome.</p>
                    </div>
                </div>

                <div class="studio-tabs mb-3">
                    <button data-cy="CoreStudio-tab-shape" class="studio-tab" :class="{active: activeTab == 'shape'}" @click="activeTab = 'shape'"><i class="bi bi-box mr-2"></i>Shape</button>
                    <button data-cy="CoreStudio-tab-material" class="studio-tab" :class="{active: activeTab == 'material'}" @click="activeTab = 'material'"><i class="bi bi-droplet-half mr-2"></i>Material</button>
                    <button data-cy="CoreStudio-tab-core" class="studio-tab" :class="{active: activeTab == 'core'}" @click="activeTab = 'core'"><i class="bi bi-magnet mr-2"></i>Core</button>
                </div>

                <div v-if="statusMessage" class="studio-banner ok" data-cy="CoreStudio-status">{{ statusMessage }}</div>
                <div v-if="errorMessage" class="studio-banner error" data-cy="CoreStudio-error">{{ errorMessage }}</div>

                <!-- ==================== SHAPE ==================== -->
                <div v-if="activeTab == 'shape'" class="row">
                    <div class="col-12 md:col-7">
                        <div class="studio-card">
                            <div class="studio-card-header">1 · Start from a standard shape</div>
                            <div class="studio-card-body">
                                <p class="studio-hint">Shapes follow the IEC dimension letters of their family. Start from the closest standard size and adjust — this is how real catalog variants are made.</p>
                                <div class="studio-field-row">
                                    <label>Family</label>
                                    <select data-cy="CoreStudio-shape-family-select" v-model="shapeFamily" @change="onShapeFamilyChanged">
                                        <option v-for="family in shapeFamilies" :key="family" :value="family">{{ familyLabel(family) }}</option>
                                    </select>
                                    <label>Template</label>
                                    <select data-cy="CoreStudio-shape-template-select" v-model="shapeTemplate">
                                        <option v-for="shape in shapeTemplates" :key="shape" :value="shape">{{ shape }}</option>
                                    </select>
                                    <button data-cy="CoreStudio-shape-load-button" class="studio-btn" :disabled="busy || shapeTemplate == ''" @click="loadShapeTemplate">Load</button>
                                    <button data-cy="CoreStudio-shape-blank-button" class="studio-btn" :disabled="busy || shapeFamily == ''" @click="startBlankShape">Start from zero</button>
                                </div>
                            </div>
                        </div>

                        <div v-if="shapeRecord != null" class="studio-card">
                            <div class="studio-card-header">2 · Name &amp; dimensions <span class="unit-note">(mm)</span></div>
                            <div class="studio-card-body">
                                <div class="studio-field-row">
                                    <label>Name</label>
                                    <input data-cy="CoreStudio-shape-name-input" type="text" v-model="shapeRecord.name" placeholder="e.g. E 25/13/7 (My Company)" />
                                    <label v-if="shapeSubtypes.length > 0">Subtype</label>
                                    <select v-if="shapeSubtypes.length > 0" data-cy="CoreStudio-shape-subtype-select" :value="shapeRecord.familySubtype ?? ''" @change="onShapeSubtypeChanged($event.target.value)">
                                        <option v-for="subtype in shapeSubtypes" :key="subtype" :value="subtype">{{ subtype }}</option>
                                    </select>
                                </div>
                                <div class="studio-table-wrap">
                                    <table class="studio-table">
                                        <thead><tr><th>Dim</th><th>min</th><th>nominal</th><th>max</th></tr></thead>
                                        <tbody>
                                            <tr v-for="key in shapeDimensionKeys" :key="key">
                                                <td class="dim-key">{{ key }}</td>
                                                <td v-for="bound in ['minimum', 'nominal', 'maximum']" :key="bound">
                                                    <input
                                                        :data-cy="'CoreStudio-shape-dim-' + key + '-' + bound"
                                                        type="number" step="any"
                                                        :value="dimGet(key, bound)"
                                                        @change="dimSet(key, bound, $event.target.value)"
                                                    />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 md:col-5">
                        <div v-if="shapeRecord != null" class="studio-card">
                            <div class="studio-card-header">3 · Validate, save, contribute</div>
                            <div class="studio-card-body">
                                <div class="studio-actions">
                                    <button data-cy="CoreStudio-shape-validate-button" class="studio-btn primary" :disabled="busy" @click="validateShape">Validate with engine</button>
                                    <button data-cy="CoreStudio-shape-register-button" class="studio-btn" :disabled="busy || shapeValidation == null" @click="registerShape">Save in this browser</button>
                                    <button data-cy="CoreStudio-shape-download-button" class="studio-btn" :disabled="shapeRecord == null" @click="downloadShape">Download .ndjson</button>
                                    <button class="studio-btn" @click="copyToClipboard(shapeRecord)">Copy JSON</button>
                                </div>
                                <div v-if="shapeValidation != null" class="studio-results" data-cy="CoreStudio-shape-results">
                                    <div><span>A<sub>e</sub></span><b>{{ fmt(shapeValidation.effectiveArea * 1e6) }} mm²</b></div>
                                    <div><span>l<sub>e</sub></span><b>{{ fmt(shapeValidation.effectiveLength * 1e3) }} mm</b></div>
                                    <div><span>V<sub>e</sub></span><b>{{ fmt(shapeValidation.effectiveVolume * 1e9) }} mm³</b></div>
                                    <div><span>A<sub>min</sub></span><b>{{ fmt(shapeValidation.minimumArea * 1e6) }} mm²</b></div>
                                    <div><span>Columns</span><b>{{ shapeValidation.columns }}</b></div>
                                    <div><span>Window</span><b>{{ fmt(shapeValidation.windingWindowArea * 1e6) }} mm²</b></div>
                                </div>
                                <div v-if="shapePreviewCore != null" class="studio-preview">
                                    <Core3DVisualizer
                                        dataTestLabel="CoreStudio-Shape-Core3DVisualizer"
                                        :core="shapePreviewCore"
                                        :forceUpdate="shapePreviewUpdate"
                                        :fullCoreModel="true"
                                        :loadingGif="$settingsStore.loadingGif"
                                        :backgroundColor="visualizerBackground"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ==================== MATERIAL ==================== -->
                <div v-if="activeTab == 'material'" class="row">
                    <div class="col-12 md:col-7">
                        <div class="studio-card">
                            <div class="studio-card-header">1 · Start</div>
                            <div class="studio-card-body">
                                <div class="studio-field-row">
                                    <label>Manufacturer</label>
                                    <select data-cy="CoreStudio-material-manufacturer-select" v-model="materialManufacturer">
                                        <option v-for="manufacturer in materialManufacturers" :key="manufacturer" :value="manufacturer">{{ manufacturer }}</option>
                                    </select>
                                    <label>Material</label>
                                    <select data-cy="CoreStudio-material-template-select" v-model="materialTemplate">
                                        <option v-for="material in materialTemplateOptions" :key="material" :value="material">{{ material }}</option>
                                    </select>
                                    <button data-cy="CoreStudio-material-load-button" class="studio-btn" :disabled="busy || materialTemplate == ''" @click="loadMaterialTemplate">Duplicate &amp; edit</button>
                                    <button data-cy="CoreStudio-material-blank-button" class="studio-btn" :disabled="busy" @click="startBlankMaterial">Start from zero</button>
                                    <button data-cy="CoreStudio-material-json-button" class="studio-btn" :disabled="busy" @click="materialJsonOpen = !materialJsonOpen">Load JSON</button>
                                </div>
                                <div v-if="materialJsonOpen" class="mt-2">
                                    <p class="studio-hint">Paste a full MAS core-material record (one <code>core_materials.ndjson</code> line, or the output of Copy JSON). This is also the editing path for the deep nested blocks the form does not table-ize: permeability <code>modifiers</code>, non-sinusoidal loss-point excitations, <code>massLosses</code>.</p>
                                    <textarea data-cy="CoreStudio-material-json-text" v-model="materialJsonText" rows="5" placeholder='{"name": "…", "permeability": {…}, …}'></textarea>
                                    <button data-cy="CoreStudio-material-json-apply" class="studio-btn" @click="applyMaterialJson">Apply</button>
                                </div>
                                <p class="studio-hint">Duplicating an existing grade keeps its full measured curves (permeability, B-H, losses); from-zero asks only for the fields the MAS schema requires.</p>
                            </div>
                        </div>

                        <div v-if="materialRecord != null" class="studio-card">
                            <div class="studio-card-header">2 · Identity &amp; key properties</div>
                            <div class="studio-card-body">
                                <div class="studio-grid-2">
                                    <label>Name <input data-cy="CoreStudio-material-name-input" type="text" v-model="materialRecord.name" placeholder="e.g. MF-95 (My Company)" /></label>
                                    <label>Manufacturer <input data-cy="CoreStudio-material-mfr-input" type="text" v-model="materialRecord.manufacturerInfo.name" placeholder="My Company" /></label>
                                    <label>Class
                                        <select v-model="materialRecord.material">
                                            <option v-for="klass in ['ferrite', 'powder', 'nanocrystalline', 'amorphous', 'electricalSteel']" :key="klass" :value="klass">{{ klass }}</option>
                                        </select>
                                    </label>
                                    <label>Record type
                                        <select data-cy="CoreStudio-material-type-select" v-model="materialRecord.type">
                                            <option v-for="recordType in ['commercial', 'custom']" :key="recordType" :value="recordType">{{ recordType }}</option>
                                        </select>
                                    </label>
                                    <label>Manufacturer status
                                        <select data-cy="CoreStudio-material-mfr-status-select" :value="mfrGet('status')" @change="mfrSet('status', $event.target.value)">
                                            <option value="">— not specified —</option>
                                            <option v-for="status in manufacturerStatuses" :key="status" :value="status">{{ status }}</option>
                                        </select>
                                    </label>
                                    <label>Manufacturer reference <input data-cy="CoreStudio-material-mfr-reference-input" type="text" :value="mfrGet('reference')" @change="mfrSet('reference', $event.target.value)" placeholder="optional part number" /></label>
                                    <label>Manufacturer family <input data-cy="CoreStudio-material-mfr-family-input" type="text" :value="mfrGet('family')" @change="mfrSet('family', $event.target.value)" placeholder="optional product line" /></label>
                                    <label>Manufacturer series <input data-cy="CoreStudio-material-mfr-series-input" type="text" :value="mfrGet('series')" @change="mfrSet('series', $event.target.value)" placeholder="optional" /></label>
                                    <label>Manufacturer order code <input data-cy="CoreStudio-material-mfr-ordercode-input" type="text" :value="mfrGet('orderCode')" @change="mfrSet('orderCode', $event.target.value)" placeholder="optional" /></label>
                                    <label class="wide">Datasheet URL <input data-cy="CoreStudio-material-mfr-datasheet-input" type="text" :value="mfrGet('datasheetUrl')" @change="mfrSet('datasheetUrl', $event.target.value)" placeholder="optional, https://…" /></label>
                                    <label class="wide">Manufacturer description <input data-cy="CoreStudio-material-mfr-description-input" type="text" :value="mfrGet('description')" @change="mfrSet('description', $event.target.value)" placeholder="optional" /></label>
                                    <label>Curie temperature (°C) <input type="number" step="any" v-model.number="materialRecord.curieTemperature" /></label>
                                    <label>Density (kg/m³) <input type="number" step="any" v-model.number="materialRecord.density" /></label>
                                    <label v-if="materialInitialPermeabilityIsScalar">Initial permeability μ<sub>i</sub> <input data-cy="CoreStudio-material-mu-input" type="number" step="any" v-model.number="materialRecord.permeability.initial.value" /></label>
                                    <label v-else class="studio-static">Initial permeability: measured curve ({{ (materialRecord.permeability && materialRecord.permeability.initial || []).length }} points) — edit in the Measured curves card</label>
                                    <label v-if="!Array.isArray(materialRecord.saturation) || materialRecord.saturation.length <= 1">Saturation B<sub>sat</sub> (T) @25 °C
                                        <input data-cy="CoreStudio-material-bsat-input" type="number" step="any"
                                            :value="materialRecord.saturation && materialRecord.saturation[0] ? materialRecord.saturation[0].magneticFluxDensity : null"
                                            @change="materialRecord.saturation = [{ magneticFluxDensity: Number($event.target.value), magneticField: materialRecord.saturation && materialRecord.saturation[0] ? materialRecord.saturation[0].magneticField || 1200 : 1200, temperature: 25 }]" />
                                    </label>
                                    <label v-else class="studio-static">Saturation: measured curve ({{ materialRecord.saturation.length }} points) — edit in the Measured curves card</label>
                                    <label v-if="!Array.isArray(materialRecord.resistivity) || materialRecord.resistivity.length <= 1">Resistivity (Ω·m) @25 °C
                                        <input data-cy="CoreStudio-material-resistivity-input" type="number" step="any"
                                            :value="materialRecord.resistivity && materialRecord.resistivity[0] ? materialRecord.resistivity[0].value : null"
                                            @change="materialRecord.resistivity = [{ value: Number($event.target.value), temperature: 25 }]" />
                                    </label>
                                    <label v-else class="studio-static">Resistivity: measured curve ({{ materialRecord.resistivity.length }} points) — edit in the Measured curves card</label>
                                    <label>Commercial name <input data-cy="CoreStudio-material-commercialname-input" type="text" :value="materialRecord.commercialName ?? ''" @change="optionalTextSet('commercialName', $event.target.value)" placeholder="optional" /></label>
                                    <label>Family <input data-cy="CoreStudio-material-family-input" type="text" :value="materialRecord.family ?? ''" @change="optionalTextSet('family', $event.target.value)" placeholder="optional, e.g. High DC bias" /></label>
                                    <label>Composition
                                        <select data-cy="CoreStudio-material-composition-select" :value="materialRecord.materialComposition ?? ''" @change="optionalEnumSet('materialComposition', $event.target.value)">
                                            <option value="">— not specified —</option>
                                            <option v-for="composition in materialCompositions" :key="composition" :value="composition">{{ composition }}</option>
                                        </select>
                                    </label>
                                    <label>Alternative materials <input data-cy="CoreStudio-material-alternatives-input" type="text" :value="commaListGet('alternatives')" @change="commaListSet('alternatives', $event.target.value)" placeholder="optional, comma-separated: 3C97, N97" /></label>
                                    <label>Heat conductivity (W/(m·K))
                                        <span class="studio-trio">
                                            <input v-for="bound in ['minimum', 'nominal', 'maximum']" :key="bound" :data-cy="'CoreStudio-material-heatconductivity-' + bound" type="number" step="any" :value="dimTolGet('heatConductivity', bound)" @change="dimTolSet('heatConductivity', bound, $event.target.value)" :placeholder="bound" />
                                        </span>
                                    </label>
                                    <label>Heat capacity (J/(kg·K))
                                        <span class="studio-trio">
                                            <input v-for="bound in ['minimum', 'nominal', 'maximum']" :key="bound" :data-cy="'CoreStudio-material-heatcapacity-' + bound" type="number" step="any" :value="dimTolGet('heatCapacity', bound)" @change="dimTolSet('heatCapacity', bound, $event.target.value)" :placeholder="bound" />
                                        </span>
                                    </label>
                                    <label class="wide">Applications
                                        <span class="studio-checks">
                                            <label v-for="application in materialApplications" :key="application">
                                                <input type="checkbox" :data-cy="'CoreStudio-material-application-' + application" :checked="applicationHas(application)" @change="applicationToggle(application)" /> {{ application }}
                                            </label>
                                        </span>
                                    </label>
                                    <label>Recommended max frequency (Hz) <input data-cy="CoreStudio-material-rec-maxf-input" type="number" step="any" :value="recommendationGet('maximumFrequency')" @change="recommendationSet('maximumFrequency', $event.target.value)" placeholder="optional" /></label>
                                    <label>Recommended min frequency (Hz) <input data-cy="CoreStudio-material-rec-minf-input" type="number" step="any" :value="recommendationGet('minimumFrequency')" @change="recommendationSet('minimumFrequency', $event.target.value)" placeholder="optional" /></label>
                                    <label>Recommended max flux density (T) <input data-cy="CoreStudio-material-rec-maxb-input" type="number" step="any" :value="recommendationGet('maximumMagneticFluxDensity')" @change="recommendationSet('maximumMagneticFluxDensity', $event.target.value)" placeholder="optional" /></label>
                                    <label>Recommended max temperature (°C) <input data-cy="CoreStudio-material-rec-maxt-input" type="number" step="any" :value="recommendationGet('maximumOperatingTemperature')" @change="recommendationSet('maximumOperatingTemperature', $event.target.value)" placeholder="optional" /></label>
                                    <label>Typical applications <input data-cy="CoreStudio-material-rec-typicalapps-input" type="text" :value="recommendationListGet('typicalApplications')" @change="recommendationListSet('typicalApplications', $event.target.value)" placeholder="optional, comma-separated" /></label>
                                    <label>Typical topologies <input data-cy="CoreStudio-material-rec-typicaltopos-input" type="text" :value="recommendationListGet('typicalTopologies')" @change="recommendationListSet('typicalTopologies', $event.target.value)" placeholder="optional, comma-separated" /></label>
                                </div>
                            </div>
                        </div>

                        <div v-if="materialRecord != null" class="studio-card">
                            <div class="studio-card-header">3 · Measured curves <span class="unit-note">(SI units — every curve the MAS schema knows)</span></div>
                            <div class="studio-card-body" data-cy="CoreStudio-material-curves">
                                <p class="studio-hint">Curves inherited from the template are listed with their point count — nothing is kept silently. Edit points in place, paste a whole table straight from a datasheet or Excel, or remove a curve your material should not carry.</p>
                                <MaterialCurveEditor
                                    v-for="spec in materialCurveSpecs"
                                    :key="spec.path"
                                    :label="spec.label"
                                    :hint="spec.hint"
                                    :points="curvePoints(spec.path)"
                                    :columns="spec.columns"
                                    :removable="spec.removable"
                                    :dataTestLabel="'CoreStudio-material-curve-' + spec.path.replaceAll('.', '-')"
                                    @update:points="curveSet(spec.path, $event)"
                                    @remove="curveRemove(spec.path)"
                                />
                                <div v-if="materialRecord.massLosses != null" class="studio-field-row mt-2">
                                    <span class="studio-hint mb-0">Mass losses (W/kg) — {{ massLossesSummary }} (edit via Load JSON)</span>
                                    <button class="studio-btn small" data-cy="CoreStudio-material-masslosses-remove" @click="removeMassLosses">Remove</button>
                                </div>
                            </div>
                        </div>

                        <div v-if="materialRecord != null" class="studio-card">
                            <div class="studio-card-header">4 · Core losses model</div>
                            <div class="studio-card-body">
                                <div class="studio-field-row">
                                    <label>Source</label>
                                    <select data-cy="CoreStudio-material-losses-mode" v-model="lossesMode" @change="lossesMode == 'proprietary' && initProprietaryDraft()">
                                        <option value="template" :disabled="materialLossMethods.length === 0">Keep current model ({{ materialLossMethods.join(', ') || 'none' }})</option>
                                        <option value="proprietary">Proprietary fit coefficients (micrometals, magnetics, …)</option>
                                        <option value="steinmetz">Steinmetz coefficients (I have k, α, β)</option>
                                        <option value="fit">Fit Steinmetz from datasheet points</option>
                                        <option value="points">Measured loss points (store the datasheet table as-is)</option>
                                    </select>
                                </div>

                                <div v-if="lossesMode == 'proprietary' && proprietaryDraft != null" class="mt-2">
                                    <div class="studio-field-row">
                                        <label>Model</label>
                                        <select data-cy="CoreStudio-material-proprietary-method" :value="proprietaryDraft.method" @change="onProprietaryMethodChange($event.target.value)">
                                            <option v-for="method in ['micrometals', 'magnetics', 'poco', 'tdg']" :key="method" :value="method">{{ method }}</option>
                                        </select>
                                        <label v-for="key in proprietaryCoefficientKeys" :key="key">
                                            {{ key }}
                                            <input :data-cy="'CoreStudio-material-proprietary-' + key" type="number" step="any" v-model.number="proprietaryDraft[key]" style="width: 7rem" />
                                        </label>
                                    </div>
                                    <p class="studio-hint mt-1"><code>{{ proprietaryEquationHint }}</code> — Pv in W/m³, f in Hz, B in T. Coefficients come from the manufacturer's datasheet fit.</p>
                                </div>

                                <div v-if="lossesMode == 'fit' || lossesMode == 'points'" class="mt-2">
                                    <p v-if="lossesMode == 'fit'" class="studio-hint">One point per line: <code>frequency_Hz, B_peak_T, temperature_C, Pv_W/m³</code>. Range boundaries (Hz) split the fit into frequency ranges.</p>
                                    <p v-else class="studio-hint">One point per line: <code>frequency_Hz, B_peak_T, temperature_C, Pv_W/m³</code> (sinusoidal excitation). The points are stored directly as the material's measured volumetric losses — no fit.</p>
                                    <textarea data-cy="CoreStudio-material-fit-points" v-model="fitPointsText" rows="6" placeholder="100000, 0.1, 25, 48000&#10;100000, 0.2, 25, 320000&#10;200000, 0.1, 25, 110000&#10;…"></textarea>
                                    <div v-if="lossesMode == 'fit'" class="studio-field-row mt-1">
                                        <label>Range boundaries (Hz)</label>
                                        <input type="text" v-model="fitRangesText" style="width: 12rem" />
                                        <button data-cy="CoreStudio-material-fit-button" class="studio-btn primary" :disabled="busy" @click="fitSteinmetz">Fit coefficients</button>
                                    </div>
                                </div>

                                <div v-if="lossesMode == 'steinmetz' || lossesMode == 'fit'" class="studio-table-wrap mt-2">
                                    <table class="studio-table">
                                        <thead><tr><th>f min (Hz)</th><th>f max (Hz)</th><th>k</th><th>α</th><th>β</th><th>ct0</th><th>ct1</th><th>ct2</th><th></th></tr></thead>
                                        <tbody>
                                            <tr v-for="(range, index) in steinmetzRanges" :key="index">
                                                <td v-for="key in ['minimumFrequency', 'maximumFrequency', 'k', 'alpha', 'beta', 'ct0', 'ct1', 'ct2']" :key="key">
                                                    <input :data-cy="'CoreStudio-material-steinmetz-' + index + '-' + key" type="number" step="any" v-model.number="range[key]" />
                                                </td>
                                                <td><button v-if="steinmetzRanges.length > 1" class="studio-btn small" @click="steinmetzRanges.splice(index, 1)">✕</button></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <button class="studio-btn small mt-1" @click="addSteinmetzRange">+ range</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 md:col-5">
                        <div v-if="materialRecord != null" class="studio-card">
                            <div class="studio-card-header">5 · Validate, save, contribute</div>
                            <div class="studio-card-body">
                                <div class="studio-actions">
                                    <button data-cy="CoreStudio-material-validate-button" class="studio-btn primary" :disabled="busy" @click="validateMaterial">Validate with engine</button>
                                    <button data-cy="CoreStudio-material-register-button" class="studio-btn" :disabled="busy || materialValidation == null" @click="registerMaterial">Save in this browser</button>
                                    <button data-cy="CoreStudio-material-download-button" class="studio-btn" @click="downloadMaterial">Download .ndjson</button>
                                    <button class="studio-btn" @click="copyToClipboard(materialRecord)">Copy JSON</button>
                                </div>
                                <p class="studio-hint">Validation upserts the material into this session's engine database, reads it back, and computes its parameters on a test core (E 25/13/7) — the same code path the advisers use.</p>
                                <div v-if="materialValidation != null" class="studio-results" data-cy="CoreStudio-material-results">
                                    <div><span>μ<sub>i</sub> readback</span><b>{{ fmt(materialValidation.initialPermeability) }}</b></div>
                                    <div><span>μ<sub>eff</sub> (test core)</span><b>{{ fmt(materialValidation.effectivePermeability) }}</b></div>
                                    <div><span>B<sub>sat</sub></span><b>{{ fmt(materialValidation.saturation) }} T</b></div>
                                    <div><span>Resistivity</span><b>{{ fmt(materialValidation.resistivity) }} Ω·m</b></div>
                                    <div class="wide"><span>Loss models</span><b>{{ materialValidation.lossMethods }}</b></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ==================== CORE ==================== -->
                <div v-if="activeTab == 'core'" class="row">
                    <div class="col-12 md:col-7">
                        <div class="studio-card">
                            <div class="studio-card-header">1 · Definition</div>
                            <div class="studio-card-body">
                                <div class="studio-grid-2">
                                    <label>Name <input data-cy="CoreStudio-core-name-input" type="text" v-model="coreRecord.name" placeholder="e.g. E 25/13/7 - MF-95 - Gapped 0.2 mm" /></label>
                                    <label>Manufacturer <input type="text" v-model="coreRecord.manufacturerInfo.name" /></label>
                                    <label>Reference <input type="text" v-model="coreRecord.manufacturerInfo.reference" /></label>
                                    <label>Status
                                        <select v-model="coreRecord.manufacturerInfo.status">
                                            <option v-for="status in ['production', 'prototype']" :key="status" :value="status">{{ status }}</option>
                                        </select>
                                    </label>
                                    <label class="wide">Datasheet URL <input type="text" v-model="coreRecord.manufacturerInfo.datasheetUrl" placeholder="https://…" /></label>
                                    <label>Shape
                                        <select data-cy="CoreStudio-core-shape-select" v-model="coreRecord.functionalDescription.shape">
                                            <option v-for="shape in coreShapeOptions" :key="shape" :value="shape">{{ shape }}</option>
                                        </select>
                                    </label>
                                    <label>Material
                                        <select data-cy="CoreStudio-core-material-select" v-model="coreRecord.functionalDescription.material">
                                            <option v-for="material in coreMaterialOptions" :key="material" :value="material">{{ material }}</option>
                                        </select>
                                    </label>
                                    <label>Gap type
                                        <select data-cy="CoreStudio-core-gaptype-select" v-model="coreGapType">
                                            <option v-for="type in ['Ungapped', 'Ground', 'Spacer', 'Distributed']" :key="type" :value="type">{{ type }}</option>
                                        </select>
                                    </label>
                                    <label v-if="coreGapType != 'Ungapped'">Gap length (m) <input data-cy="CoreStudio-core-gaplength-input" type="number" step="any" v-model.number="coreGapLength" /></label>
                                    <label v-if="coreGapType == 'Distributed'">Gaps per column <input type="number" v-model.number="coreNumberDistributedGaps" /></label>
                                    <label>Stacks <input type="number" v-model.number="coreRecord.functionalDescription.numberStacks" /></label>
                                </div>
                                <p class="studio-hint">Custom shapes and materials saved in the other tabs appear in these selectors automatically.</p>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 md:col-5">
                        <div class="studio-card">
                            <div class="studio-card-header">2 · Validate, save, contribute</div>
                            <div class="studio-card-body">
                                <div class="studio-actions">
                                    <button data-cy="CoreStudio-core-validate-button" class="studio-btn primary" :disabled="busy" @click="validateCore">Validate with engine</button>
                                    <button data-cy="CoreStudio-core-register-button" class="studio-btn" :disabled="busy || coreValidation == null" @click="registerCore">Save in this browser</button>
                                    <button data-cy="CoreStudio-core-download-button" class="studio-btn" @click="downloadCore">Download .ndjson</button>
                                    <button class="studio-btn" @click="copyToClipboard(coreRecord)">Copy JSON</button>
                                </div>
                                <div v-if="coreValidation != null" class="studio-results" data-cy="CoreStudio-core-results">
                                    <div><span>A<sub>e</sub></span><b>{{ fmt(coreValidation.effectiveArea * 1e6) }} mm²</b></div>
                                    <div><span>l<sub>e</sub></span><b>{{ fmt(coreValidation.effectiveLength * 1e3) }} mm</b></div>
                                    <div><span>V<sub>e</sub></span><b>{{ fmt(coreValidation.effectiveVolume * 1e9) }} mm³</b></div>
                                    <div><span>Columns</span><b>{{ coreValidation.columns }}</b></div>
                                    <div class="wide"><span>Gapping</span><b>{{ coreValidation.gaps }}</b></div>
                                </div>
                                <div v-if="corePreviewCore != null" class="studio-preview">
                                    <Core3DVisualizer
                                        dataTestLabel="CoreStudio-Core-Core3DVisualizer"
                                        :core="corePreviewCore"
                                        :forceUpdate="corePreviewUpdate"
                                        :fullCoreModel="true"
                                        :loadingGif="$settingsStore.loadingGif"
                                        :backgroundColor="visualizerBackground"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Saved parts -->
                <div class="row mt-3" v-if="customShapeNames.length > 0 || customMaterialNames.length > 0 || Object.keys(customPartsStore.cores).length > 0">
                    <div class="col-12">
                        <div class="studio-card">
                            <div class="studio-card-header">Your saved parts <span class="unit-note">(kept in this browser, re-loaded into the engine on every visit)</span></div>
                            <div class="studio-card-body studio-saved" data-cy="CoreStudio-saved-parts">
                                <span v-for="name in customShapeNames" :key="'s' + name" class="studio-chip">shape · {{ name }} <button @click="customPartsStore.removeShape(name)">✕</button></span>
                                <span v-for="name in customMaterialNames" :key="'m' + name" class="studio-chip">material · {{ name }} <button @click="customPartsStore.removeMaterial(name)">✕</button></span>
                                <span v-for="(record, name) in customPartsStore.cores" :key="'c' + name" class="studio-chip">core · {{ name }} <button @click="customPartsStore.removeCore(name)">✕</button></span>
                            </div>
                        </div>
                    </div>
                </div>

    </div>
</template>

<style scoped>
.studio-container { max-width: 1500px; }
.studio-title {
    color: var(--p-primary);
    font-weight: 700;
    font-size: 2rem;
    margin-bottom: 0.25rem;
}
.studio-subtitle { color: rgba(var(--p-white-rgb), 0.75); max-width: 60rem; }
.studio-subtitle a { color: var(--p-primary); }

.studio-tabs { display: flex; gap: 0.5rem; }
.studio-tab {
    background: rgba(var(--p-white-rgb), 0.04);
    color: rgba(var(--p-white-rgb), 0.75);
    border: 1px solid rgba(var(--p-white-rgb), 0.12);
    border-radius: 10px 10px 0 0;
    padding: 0.5rem 1.4rem;
    font-weight: 600;
    cursor: pointer;
}
.studio-tab.active {
    color: var(--p-primary);
    background: rgba(var(--p-primary-rgb), 0.1);
    border-color: rgba(var(--p-primary-rgb), 0.6);
    border-bottom-color: transparent;
}

.studio-banner { border-radius: 8px; padding: 0.5rem 0.9rem; margin-bottom: 0.9rem; font-size: 0.92rem; }
.studio-banner.ok { background: rgba(var(--p-primary-rgb), 0.12); color: var(--p-primary); border: 1px solid rgba(var(--p-primary-rgb), 0.4); }
.studio-banner.error { background: rgba(var(--p-danger-rgb), 0.12); color: var(--p-danger); border: 1px solid rgba(var(--p-danger-rgb), 0.4); white-space: pre-wrap; }

.studio-card {
    background: rgba(var(--p-dark-rgb), 0.55);
    border: 1px solid rgba(var(--p-white-rgb), 0.08);
    border-top: 3px solid rgba(var(--p-primary-rgb), 0.8);
    border-radius: 12px;
    margin-bottom: 1rem;
    overflow: hidden;
}
.studio-card-header {
    padding: 0.55rem 0.9rem;
    background: rgba(var(--p-white-rgb), 0.04);
    border-bottom: 1px solid rgba(var(--p-white-rgb), 0.08);
    color: var(--p-primary);
    font-weight: 600;
    font-size: 0.92rem;
    text-align: left;
}
.studio-card-body { padding: 0.8rem 0.9rem; text-align: left; }
.studio-hint { color: rgba(var(--p-white-rgb), 0.55); font-size: 0.85rem; margin: 0.3rem 0 0.6rem; }
.unit-note { color: rgba(var(--p-white-rgb), 0.45); font-weight: 400; font-size: 0.8rem; }

.studio-field-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.studio-field-row label { color: rgba(var(--p-white-rgb), 0.7); font-size: 0.88rem; }

.studio-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem 1rem; }
.studio-grid-2 label { display: flex; flex-direction: column; gap: 0.2rem; color: rgba(var(--p-white-rgb), 0.7); font-size: 0.85rem; }
.studio-grid-2 label.wide { grid-column: 1 / -1; }
.studio-static { justify-content: center; font-style: italic; }
.studio-checks { display: flex; gap: 1rem; flex-wrap: wrap; }
.studio-checks label { flex-direction: row; align-items: center; gap: 0.35rem; cursor: pointer; }
.studio-trio { display: flex; gap: 0.4rem; }
.studio-trio input { width: 100%; min-width: 0; }

select, input[type="text"], input[type="number"], textarea {
    background: rgba(var(--p-white-rgb), 0.06);
    color: var(--p-white);
    border: 1px solid rgba(var(--p-white-rgb), 0.18);
    border-radius: 6px;
    padding: 0.3rem 0.5rem;
    font-size: 0.9rem;
}
/* The open dropdown popup is rendered by the browser, not the page: without
   an explicit dark color-scheme it comes out white with unreadable pale
   options. */
select { color-scheme: dark; }
select option {
    background-color: var(--p-dark);
    color: var(--p-white);
}
textarea { width: 100%; font-family: monospace; }
select:focus, input:focus, textarea:focus { outline: 1px solid var(--p-primary); }

.studio-table-wrap { overflow-x: auto; }
.studio-table { border-collapse: collapse; width: 100%; }
.studio-table th {
    color: rgba(var(--p-white-rgb), 0.55);
    font-size: 0.78rem;
    font-weight: 600;
    text-align: left;
    padding: 0.25rem 0.4rem;
}
.studio-table td { padding: 0.15rem 0.4rem; }
.studio-table td input { width: 6.2rem; }
.studio-table .dim-key { color: var(--p-primary); font-weight: 700; }

.studio-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.6rem; }
.studio-btn {
    background: rgba(var(--p-white-rgb), 0.06);
    color: rgba(var(--p-white-rgb), 0.85);
    border: 1px solid rgba(var(--p-white-rgb), 0.2);
    border-radius: 8px;
    padding: 0.35rem 0.9rem;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
}
.studio-btn.primary { color: var(--p-primary); border-color: rgba(var(--p-primary-rgb), 0.6); background: rgba(var(--p-primary-rgb), 0.12); }
.studio-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.studio-btn.small { padding: 0.1rem 0.5rem; font-size: 0.78rem; }

.studio-results { display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem 1rem; margin: 0.6rem 0; }
.studio-results > div { display: flex; justify-content: space-between; border-bottom: 1px dashed rgba(var(--p-white-rgb), 0.12); padding-bottom: 0.15rem; font-size: 0.88rem; }
.studio-results > div.wide { grid-column: 1 / -1; }
.studio-results span { color: rgba(var(--p-white-rgb), 0.6); }
.studio-results b { color: var(--p-primary); }

.studio-preview { height: 32vh; margin-top: 0.6rem; }

.studio-saved { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.studio-chip {
    background: rgba(var(--p-primary-rgb), 0.1);
    border: 1px solid rgba(var(--p-primary-rgb), 0.4);
    color: var(--p-primary);
    border-radius: 20px;
    padding: 0.15rem 0.7rem;
    font-size: 0.82rem;
}
.studio-chip button { background: none; border: none; color: var(--p-danger); cursor: pointer; font-size: 0.8rem; }
</style>
