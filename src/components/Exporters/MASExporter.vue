<script setup >
import { useMasStore } from '../../stores/mas'
import { Modal } from "bootstrap";
import MASFileExporter from './MASFileExporter.vue'
import { deepCopy, download } from '/WebSharedComponents/assets/js/utils.js'
</script>

<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const masStore = useMasStore();
        const modalName = 'MASExporterModal';
        const title = 'MAS Exporter';
        return {
            masStore,
            modalName,
            title,
        }
    }
}
</script>


<template>
    <div class="modal fade" :id="modalName" tabindex="-1" :aria-labelledby="modalName + 'Label'" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-scrollable modal-class">
            <div class="modal-content" :style="$styleStore.magneticBuilder.exporter">
                <div class="modal-header">
                    <p :data-cy="modalName + '-notification-text'" class="modal-title fs-5" :id="modalName + 'Label'">{{title}}</p>
                    <button :ref="'close' + modalName + 'Ref'" type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" :aria-label="modalName + 'Close'"></button>
                </div>
                <div class="modal-body container">
                    <MASFileExporter
                        class="btn col-4 mt-4"
                        :data-cy="dataTestLabel + '-Magnetic-MAS-File-Section'"
                        :mas="masStore.mas"
                        :includeHField="false"
                    />
                    <MASFileExporter
                        class="btn offset-1 col-4 mt-4"
                        :data-cy="dataTestLabel + '-Magnetic-MAS-File-With-Excitations'"
                        :mas="masStore.mas"
                        :includeHField="true"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style>
    .modal-class {
        z-index: 9999;
    }
</style>