<script setup>
// Winding Studio dev harness — mounts the studio ALONE, without the magnetic
// builder's reactive machinery (auto-rewind, checkAndFixMas, advisers). Used
// to develop and e2e-test the renderer/interactions against wound MAS
// fixtures deterministically. Part of the winding-studio feature branch;
// remove together with the WindingStudio/ folder.
import { reactive, onMounted, onBeforeUnmount } from 'vue';
import WindingStudio from '/MagneticBuilder/src/components/MagneticBuilder/WindingStudio/WindingStudio.vue';

const masStore = reactive({
    mas: { magnetic: null, inputs: null, outputs: null },
});

function loadMas(masJson) {
    masStore.mas = masJson;
}

function onFileChange(event) {
    const file = event.target.files?.[0];
    if (file == null) {
        return;
    }
    file.text().then((text) => loadMas(JSON.parse(text)));
}

onMounted(() => {
    // Test hook: lets Playwright inject a MAS without any UI.
    window.__setStudioMas = loadMas;
});
onBeforeUnmount(() => {
    delete window.__setStudioMas;
});
</script>

<template>
    <div class="winding-studio-dev">
        <div class="winding-studio-dev-bar">
            <span class="winding-studio-dev-title">Winding Studio — dev harness</span>
            <input type="file" accept=".json" data-cy="WindingStudioDev-file-input" @change="onFileChange" />
        </div>
        <div v-if="masStore.mas.magnetic == null" class="winding-studio-dev-empty">
            Load a wound MAS file (with turnsDescription) to render it.
        </div>
        <WindingStudio
            v-else
            dataTestLabel="WindingStudioDev"
            :masStore="masStore"
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
</style>
