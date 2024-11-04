<script setup >
import { useMasStore } from '/src/stores/mas'
import { Modal } from "bootstrap";
import MASFileExporter from '/src/components/Exporters/MASFileExporter.vue'
import { deepCopy, download } from '/src/assets/js/utils.js'
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
    },
    methods: {
    },
    computed: {
    },
    mounted() {
    },
    created() {
    }
}
</script>


<template>
    <div class="modal fade" :id="modalName" tabindex="-1" :aria-labelledby="modalName + 'Label'" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-scrollable modal-class">
            <div class="modal-content bg-dark text-white">
                <div class="modal-header">
                    <p :data-cy="modalName + '-notification-text'" class="modal-title fs-5" :id="modalName + 'Label'">{{title}}</p>
                    <button :ref="'close' + modalName + 'Ref'" type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" :aria-label="modalName + 'Close'"></button>
                </div>
                <div class="modal-body container">
                    <MASFileExporter
                        class="btn btn-primary col-4 mt-4"
                        :data-cy="dataTestLabel + '-Magnetic-MAS-File-Section'"
                        :mas="masStore.mas"
                        :includeHField="false"
                    />
                    <MASFileExporter
                        class="btn btn-primary offset-1 col-4 mt-4"
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