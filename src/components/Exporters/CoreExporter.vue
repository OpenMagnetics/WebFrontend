<script setup>
import { useMasStore } from '../../stores/mas'
import Dialog from 'primevue/dialog'
import CoreSTPExporter from './CoreSTPExporter.vue'
import CoreStlExporter from './CoreStlExporter.vue'
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
            modalName: 'CoreExporterModal',
            title: 'Core Exporter',
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
            <CoreSTPExporter
                class="btn col-4 mt-4"
                :data-cy="dataTestLabel + '-download-STP-File-button'"
                :core="masStore.mas.magnetic.core"
                :fullCoreModel="true"
            />
            <CoreStlExporter
                class="btn col-offset-1 col-4 mt-4"
                :data-cy="dataTestLabel + '-download-STP-File-button'"
                :core="masStore.mas.magnetic.core"
                :coil="masStore.mas.magnetic.coil"
                :fullCoreModel="true"
            />
        </div>
    </Dialog>
</template>
