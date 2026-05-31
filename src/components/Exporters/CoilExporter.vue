<script setup>
import { useMasStore } from '../../stores/mas'
import Dialog from 'primevue/dialog'
import CoilWindingExporter from './CoilWindingExporter.vue'
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
            modalName: 'CoilExporterModal',
            title: 'Coil Exporter',
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
            <CoilWindingExporter
                class="btn col-4 mt-4"
                :data-cy="dataTestLabel + '-Magnetic-Winding-2D-Section'"
                :mas="masStore.mas"
                :includeHField="false"
                :includeFringing="false"
            />
            <CoilWindingExporter
                class="btn col-offset-1 col-4 mt-4"
                :data-cy="dataTestLabel + '-Magnetic-Winding-2D-Section-With-H-Field'"
                :mas="masStore.mas"
                :includeHField="true"
                :includeFringing="false"
            />
            <CoilWindingExporter
                class="btn col-offset-1 col-4 mt-4"
                :data-cy="dataTestLabel + '-Magnetic-Winding-2D-Section-With-H-Field-And-Fringing'"
                :mas="masStore.mas"
                :includeHField="true"
                :includeFringing="true"
            />
        </div>
    </Dialog>
</template>
