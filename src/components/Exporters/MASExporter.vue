<script setup>
import { useMasStore } from '../../stores/mas'
import Dialog from 'primevue/dialog'
import MASFileExporter from './MASFileExporter.vue'
</script>

<script>

export default {
    components: { Dialog },
    emits: ['update:visible'],
    props: {
        dataTestLabel: { type: String, default: '' },
        visible: { type: Boolean, default: false },
    },
    data() {
        const masStore = useMasStore();
        return {
            masStore,
            modalName: 'MASExporterModal',
            title: 'MAS Exporter',
        }
    },
}
</script>


<template>
    <Dialog
        :visible="visible"
        @update:visible="(v) => $emit('update:visible', v)"
        :modal="true"
        :draggable="false"
        :data-cy="modalName"
        :header="title"
        :style="{ width: 'min(90vw, 920px)' }">
        <div class="container">
            <MASFileExporter
                class="btn col-4 mt-4"
                :data-cy="dataTestLabel + '-Magnetic-MAS-File-Section'"
                :mas="masStore.mas"
                :includeInputs="false"
            />
            <MASFileExporter
                class="btn col-offset-1 col-4 mt-4"
                :data-cy="dataTestLabel + '-Magnetic-MAS-File-With-Excitations'"
                :mas="masStore.mas"
                :includeInputs="true"
            />
        </div>
    </Dialog>
</template>
