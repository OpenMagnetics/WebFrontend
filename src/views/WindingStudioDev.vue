<script setup>
// Winding Studio dev harness — mounts the studio ALONE, without the magnetic
// builder's reactive machinery (auto-rewind, checkAndFixMas, advisers). Used
// to develop and e2e-test the renderer/interactions against wound MAS
// fixtures deterministically. Part of the winding-studio feature branch;
// remove together with the WindingStudio/ folder.
//
// P1: the harness executes placeWinding drops through the WASM engine:
// flip corePerColumnWindingWindows, reprocess the core (per-column winding
// windows), map the dropped leg to its winding window, set the winding's
// windingWindow intent, strip the derived descriptions and re-autocomplete.
// The C++ winder recomputes every coordinate — the studio only displays them.
import { reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import WindingStudio from '/MagneticBuilder/src/components/MagneticBuilder/WindingStudio/WindingStudio.vue';
import { waitForMkf } from '/WebSharedComponents/assets/js/mkfRuntime';

const masStore = reactive({
    mas: { magnetic: null, inputs: null, outputs: null },
});
const busy = ref(false);
const error = ref(null);

function loadMas(masJson) {
    error.value = null;
    masStore.mas = masJson;
}

function onFileChange(event) {
    const file = event.target.files?.[0];
    if (file == null) {
        return;
    }
    file.text().then((text) => loadMas(JSON.parse(text)));
}

function deepCopy(value) {
    return JSON.parse(JSON.stringify(value));
}

function throwIfException(label, result) {
    if (typeof result === 'string' && result.startsWith('Exception')) {
        throw new Error(label + ': ' + result);
    }
}

async function placeWinding({ winding, columnIndex }) {
    if (busy.value || masStore.mas.magnetic == null) {
        return;
    }
    busy.value = true;
    error.value = null;
    try {
        const mkf = await waitForMkf();
        await mkf.ready;

        // 1. Per-column winding windows on (idempotent).
        const settings = JSON.parse(await mkf.get_settings());
        if (!settings.corePerColumnWindingWindows) {
            settings.corePerColumnWindingWindows = true;
            await mkf.set_settings(JSON.stringify(settings));
        }

        // 2. Reprocess the core so it carries one winding window per wound
        //    column edge, and map the dropped leg to its window index.
        const core = deepCopy(masStore.mas.magnetic.core);
        core.processedDescription = null;
        core.geometricalDescription = null;
        const processedCoreRaw = await mkf.calculate_core_data(JSON.stringify(core), false);
        throwIfException('calculate_core_data', processedCoreRaw);
        const processedCore = JSON.parse(processedCoreRaw);
        const windows = processedCore.processedDescription?.windingWindows ?? [];
        const windowIndex = windows.findIndex((w) => (w.column ?? 0) === columnIndex);
        if (windowIndex < 0) {
            throw new Error(`No winding window wraps column ${columnIndex} `
                + `(the core has ${windows.length} windows). `
                + 'Only wound-column legs accept windings.');
        }

        // 3. Set the placement intent and strip every derived description so
        //    the winder recomputes from scratch.
        const mas = deepCopy(masStore.mas);
        // The Mas parser requires the outputs key; wound fixtures may omit it.
        mas.outputs = mas.outputs ?? [];
        mas.magnetic.core = processedCore;
        const windingEntry = mas.magnetic.coil.functionalDescription
            .find((w) => w.name === winding);
        if (windingEntry == null) {
            throw new Error(`Winding ${winding} not found in the functional description`);
        }
        windingEntry.windingWindow = windowIndex;
        mas.magnetic.coil.bobbin = 'Dummy';
        mas.magnetic.coil.sectionsDescription = null;
        mas.magnetic.coil.layersDescription = null;
        mas.magnetic.coil.turnsDescription = null;
        mas.magnetic.coil.groupsDescription = null;

        // 4. One autocomplete: quick bobbin (per-column windows), core columns
        //    handed to the coil, wind honoring windingWindow.
        const resultRaw = await mkf.mas_autocomplete(JSON.stringify(mas), false, '{}');
        throwIfException('mas_autocomplete', resultRaw);
        const result = JSON.parse(resultRaw);
        if (result.magnetic?.coil?.turnsDescription == null) {
            throw new Error('The winder produced no turns for this placement');
        }
        masStore.mas = result;
    }
    catch (exception) {
        error.value = String(exception?.message ?? exception);
    }
    finally {
        busy.value = false;
    }
}

async function resizeSectionRect({ sectionName, coordinates, dimensions, margin = null }) {
    // Free transform: write the custom rectangle into the section and re-flow
    // layers+turns INSIDE it (no section recomputation, no compaction).
    if (busy.value || masStore.mas.magnetic == null) {
        return;
    }
    busy.value = true;
    error.value = null;
    try {
        const mkf = await waitForMkf();
        await mkf.ready;
        const coil = deepCopy(masStore.mas.magnetic.coil);
        const section = (coil.sectionsDescription ?? []).find((candidate) => candidate.name === sectionName);
        if (section == null) {
            throw new Error(`Section ${sectionName} not found`);
        }
        section.coordinates = coordinates;
        section.dimensions = dimensions;
        // Stale layer count would prevent re-packing into the new rectangle.
        section.numberLayers = null;
        if (margin != null) {
            section.margin = margin;
        }
        const columns = masStore.mas.magnetic.core?.processedDescription?.columns;
        const resultRaw = await mkf.wind_layers_and_turns_with_columns(
            JSON.stringify(coil), columns != null ? JSON.stringify(columns) : '');
        throwIfException('wind_layers_and_turns_with_columns', resultRaw);
        const rewound = JSON.parse(resultRaw);
        masStore.mas = { ...masStore.mas, magnetic: { ...masStore.mas.magnetic, coil: rewound } };
    }
    catch (exception) {
        error.value = String(exception?.message ?? exception);
    }
    finally {
        busy.value = false;
    }
}

onMounted(() => {
    // Test hooks: let Playwright inject a MAS / read errors without any UI.
    window.__setStudioMas = loadMas;
    window.__getStudioMas = () => JSON.parse(JSON.stringify(masStore.mas));
    window.__getStudioError = () => error.value;
});
onBeforeUnmount(() => {
    delete window.__setStudioMas;
    delete window.__getStudioMas;
    delete window.__getStudioError;
});
</script>

<template>
    <div class="winding-studio-dev">
        <div class="winding-studio-dev-bar">
            <span class="winding-studio-dev-title">Winding Studio — dev harness</span>
            <input type="file" accept=".json" data-cy="WindingStudioDev-file-input" @change="onFileChange" />
        </div>
        <div v-if="error != null" class="winding-studio-dev-error" data-cy="WindingStudioDev-error">
            {{ error }}
        </div>
        <div v-if="masStore.mas.magnetic == null" class="winding-studio-dev-empty">
            Load a wound MAS file (with turnsDescription) to render it.
        </div>
        <WindingStudio
            v-else
            dataTestLabel="WindingStudioDev"
            :masStore="masStore"
            :editable="true"
            :busy="busy"
            @placeWinding="placeWinding"
            @resizeSectionRect="resizeSectionRect"
        />
    </div>
</template>

<style scoped>
.winding-studio-dev {
    max-width: 1000px;
    margin: 0 auto;
    padding: 1rem;
    color: var(--p-text-color, #fff);
}
.winding-studio-dev-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.75rem;
}
.winding-studio-dev-title {
    font-weight: 600;
}
.winding-studio-dev-empty {
    opacity: 0.7;
    font-style: italic;
    padding: 2rem;
    text-align: center;
}
.winding-studio-dev-error {
    background: rgba(180, 30, 30, 0.25);
    border: 1px solid rgba(220, 60, 60, 0.7);
    border-radius: 4px;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.75rem;
    font-size: 0.85rem;
    white-space: pre-wrap;
}
</style>
