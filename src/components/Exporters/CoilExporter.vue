<script setup >
import { useMasStore } from '../../stores/mas'
import { Modal } from "bootstrap";
import CoilWindingExporter from './CoilWindingExporter.vue'
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
        const modalName = 'CoilExporterModal';
        const title = 'Coil Exporter';
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
            <div class="modal-content" :style="$styleStore.magneticBuilder.exporter">
                <div class="modal-header">
                    <p :data-cy="modalName + '-notification-text'" class="modal-title fs-5" :id="modalName + 'Label'">{{title}}</p>
                    <button :ref="'close' + modalName + 'Ref'" type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" :aria-label="modalName + 'Close'"></button>
                </div>
                <div class="modal-body container">
                    <CoilWindingExporter
                        class="btn col-4 mt-4"
                        :data-cy="dataTestLabel + '-Magnetic-Winding-2D-Section'"
                        :mas="masStore.mas"
                        :includeHField="false"
                        :includeFringing="false"
                    />
                    <CoilWindingExporter
                        class="btn offset-1 col-4 mt-4"
                        :data-cy="dataTestLabel + '-Magnetic-Winding-2D-Section-With-H-Field'"
                        :mas="masStore.mas"
                        :includeHField="true"
                        :includeFringing="false"
                    />
                    <CoilWindingExporter
                        class="btn offset-1 col-4 mt-4"
                        :data-cy="dataTestLabel + '-Magnetic-Winding-2D-Section-With-H-Field-And-Fringing'"
                        :mas="masStore.mas"
                        :includeHField="true"
                        :includeFringing="true"
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