<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import Core3DVisualizer from '/WebSharedComponents/Common/Core3DVisualizer.vue'
import { useTaskQueueStore } from '../stores/taskQueue'
import { useCustomPartsStore } from '../stores/customParts'
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
            shapeRecord: null,           // full MAS shape record being edited
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
            lossesMode: 'template',      // template | steinmetz | fit
            steinmetzRanges: [emptySteinmetzRange()],
            fitPointsText: "",
            fitRangesText: "150000",
            fitReport: "",
            materialValidation: null,    // readback from the engine

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
        async onShapeFamilyChanged() {
            this.shapeTemplates = await this.taskQueueStore.getCoreShapesByFamily(this.shapeFamily);
            this.shapeTemplate = this.shapeTemplates[0] || "";
        },
        async loadShapeTemplate() {
            this.busy = true;
            try {
                const shape = await this.taskQueueStore.getShapeData(this.shapeTemplate);
                delete shape.processedDescription;
                shape.aliases = [];
                shape.name = `${this.shapeTemplate} custom`;
                this.shapeRecord = shape;
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
            this.setStatus("Blank material started — every field shown is REQUIRED by the MAS schema.");
        },
        parseFitPoints() {
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
            if (points.length < 3) {
                throw new Error(`Need at least 3 loss points to fit Steinmetz coefficients, got ${points.length}.`);
            }
            return points;
        },
        async fitSteinmetz() {
            this.busy = true;
            try {
                const points = this.parseFitPoints();
                // The MKF Steinmetz fitter needs a real grid to converge: with a
                // single temperature (or too few f/B values) it returns its seed
                // coefficients instead of a fit (verified 2026-07-08). Require
                // the minimum grid loudly instead of accepting garbage.
                const distinct = (getter) => new Set(points.map(getter)).size;
                const distinctTemperatures = distinct((p) => p.temperature);
                const distinctFrequencies = distinct((p) => p.magneticFluxDensity.frequency);
                const distinctFluxDensities = distinct((p) => p.magneticFluxDensity.magneticFluxDensity.processed.peak);
                if (distinctTemperatures < 2 || distinctFrequencies < 3 || distinctFluxDensities < 3) {
                    throw new Error(`The fit needs at least 2 temperatures, 3 frequencies and 3 flux densities `
                        + `(got ${distinctTemperatures} temperature(s), ${distinctFrequencies} frequency(ies), ${distinctFluxDensities} flux density(ies)). `
                        + `Add the missing datasheet points — with less data the fitter returns meaningless coefficients.`);
                }
                const boundaries = this.fitRangesText.split(/[,;\s]+/).map(Number).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
                const frequencies = points.map((p) => p.magneticFluxDensity.frequency);
                const edges = [Math.min(...frequencies), ...boundaries, Math.max(...frequencies)];
                const ranges = [];
                for (let i = 0; i < edges.length - 1; i++) {
                    if (edges[i + 1] > edges[i]) ranges.push([edges[i], edges[i + 1]]);
                }
                const coefficientsPerRange = await this.taskQueueStore.calculateSteinmetzCoefficients(points, ranges);
                this.steinmetzRanges = coefficientsPerRange;
                this.lossesMode = 'steinmetz';
                this.fitReport = `Fitted ${coefficientsPerRange.length} range(s) from ${points.length} points. Review the coefficients below, then validate.`;
                this.setStatus(this.fitReport);
            }
            catch (error) { this.setError(error); }
            finally { this.busy = false; }
        },
        addSteinmetzRange() {
            this.steinmetzRanges.push(emptySteinmetzRange());
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
                if ((record.volumetricLosses?.default ?? []).length === 0) {
                    throw new Error("The material has no volumetric losses model — add Steinmetz coefficients or fit them from points.");
                }
                // The MAS-required numeric fields must actually hold numbers:
                // a record with nulls is silently skipped by the DB loader and
                // the readback then fails with a confusing NOT_FOUND.
                if (this.materialInitialPermeabilityIsScalar && !Number.isFinite(record.permeability?.initial?.value)) {
                    throw new Error("Initial permeability is required — enter μi.");
                }
                if (!Array.isArray(record.saturation) || !Number.isFinite(record.saturation[0]?.magneticFluxDensity)) {
                    throw new Error("Saturation is required — enter Bsat (T) at 25 °C.");
                }
                if (!Array.isArray(record.resistivity) || !Number.isFinite(record.resistivity[0]?.value)) {
                    throw new Error("Resistivity is required — enter the value (Ω·m) at 25 °C.");
                }
                // Optional fields left empty must be ABSENT, not null.
                Object.keys(record).forEach((key) => { if (record[key] == null) delete record[key]; });
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
        downloadMaterial() { this.downloadNdjson(`${this.materialRecord.name}.core_materials.ndjson`, JSON.stringify(this.materialRecord)); },

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
    <div class="d-flex flex-column min-vh-100" :style="$styleStore.magneticBuilder.main">
        <Header />
        <main role="main" class="main p-0 mx-0 mb-0 flex-grow-1">
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
                                        <option v-for="family in shapeFamilies" :key="family" :value="family">{{ family.toUpperCase() }}</option>
                                    </select>
                                    <label>Template</label>
                                    <select data-cy="CoreStudio-shape-template-select" v-model="shapeTemplate">
                                        <option v-for="shape in shapeTemplates" :key="shape" :value="shape">{{ shape }}</option>
                                    </select>
                                    <button data-cy="CoreStudio-shape-load-button" class="studio-btn" :disabled="busy || shapeTemplate == ''" @click="loadShapeTemplate">Load</button>
                                </div>
                            </div>
                        </div>

                        <div v-if="shapeRecord != null" class="studio-card">
                            <div class="studio-card-header">2 · Name &amp; dimensions <span class="unit-note">(mm)</span></div>
                            <div class="studio-card-body">
                                <div class="studio-field-row">
                                    <label>Name</label>
                                    <input data-cy="CoreStudio-shape-name-input" type="text" v-model="shapeRecord.name" placeholder="e.g. E 25/13/7 (My Company)" />
                                    <label>Subtype</label>
                                    <input type="text" v-model="shapeRecord.familySubtype" style="width: 4rem" />
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
                                        :backgroundColor="$styleStore.magneticBuilder.main['background-color']"
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
                                    <label>Curie temperature (°C) <input type="number" step="any" v-model.number="materialRecord.curieTemperature" /></label>
                                    <label>Density (kg/m³) <input type="number" step="any" v-model.number="materialRecord.density" /></label>
                                    <label v-if="materialInitialPermeabilityIsScalar">Initial permeability μ<sub>i</sub> <input data-cy="CoreStudio-material-mu-input" type="number" step="any" v-model.number="materialRecord.permeability.initial.value" /></label>
                                    <label v-else class="studio-static">Initial permeability: measured curve from template ({{ (materialRecord.permeability && materialRecord.permeability.initial || []).length }} points)</label>
                                    <label v-if="!Array.isArray(materialRecord.saturation) || materialRecord.saturation.length <= 1">Saturation B<sub>sat</sub> (T) @25 °C
                                        <input data-cy="CoreStudio-material-bsat-input" type="number" step="any"
                                            :value="materialRecord.saturation && materialRecord.saturation[0] ? materialRecord.saturation[0].magneticFluxDensity : null"
                                            @change="materialRecord.saturation = [{ magneticFluxDensity: Number($event.target.value), magneticField: materialRecord.saturation && materialRecord.saturation[0] ? materialRecord.saturation[0].magneticField || 1200 : 1200, temperature: 25 }]" />
                                    </label>
                                    <label v-else class="studio-static">Saturation: measured curve from template ({{ materialRecord.saturation.length }} points)</label>
                                    <label>Resistivity (Ω·m) @25 °C
                                        <input data-cy="CoreStudio-material-resistivity-input" type="number" step="any"
                                            :value="materialRecord.resistivity && materialRecord.resistivity[0] ? materialRecord.resistivity[0].value : null"
                                            @change="materialRecord.resistivity = [{ value: Number($event.target.value), temperature: 25 }]" />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div v-if="materialRecord != null" class="studio-card">
                            <div class="studio-card-header">3 · Core losses model</div>
                            <div class="studio-card-body">
                                <div class="studio-field-row">
                                    <label>Source</label>
                                    <select data-cy="CoreStudio-material-losses-mode" v-model="lossesMode">
                                        <option value="template" :disabled="materialTemplateName == null">Keep template model ({{ materialLossMethods.join(', ') || 'none' }})</option>
                                        <option value="steinmetz">Steinmetz coefficients (I have k, α, β)</option>
                                        <option value="fit">Fit Steinmetz from datasheet points</option>
                                    </select>
                                </div>

                                <div v-if="lossesMode == 'fit'" class="mt-2">
                                    <p class="studio-hint">One point per line: <code>frequency_Hz, B_peak_T, temperature_C, Pv_W/m³</code>. Range boundaries (Hz) split the fit into frequency ranges.</p>
                                    <textarea data-cy="CoreStudio-material-fit-points" v-model="fitPointsText" rows="6" placeholder="100000, 0.1, 25, 48000&#10;100000, 0.2, 25, 320000&#10;200000, 0.1, 25, 110000&#10;…"></textarea>
                                    <div class="studio-field-row mt-1">
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
                            <div class="studio-card-header">4 · Validate, save, contribute</div>
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
                                        :backgroundColor="$styleStore.magneticBuilder.main['background-color']"
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
        </main>
        <Footer class="mt-auto" />
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

select, input[type="text"], input[type="number"], textarea {
    background: rgba(var(--p-white-rgb), 0.06);
    color: var(--p-white);
    border: 1px solid rgba(var(--p-white-rgb), 0.18);
    border-radius: 6px;
    padding: 0.3rem 0.5rem;
    font-size: 0.9rem;
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
