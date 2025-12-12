<script setup >
import { useMasStore } from '../../stores/mas'
import { Modal } from "bootstrap";
import CoreSTPExporter from './CoreSTPExporter.vue'
import CoreStlExporter from './CoreStlExporter.vue'
import CoreTechnicalDrawingExporter from './CoreTechnicalDrawingExporter.vue'
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
        const modalName = 'CoreExporterModal';
        const title = 'Core Exporter';
        const core3DExported = false;
        return {
            masStore,
            modalName,
            title
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
                    <CoreSTPExporter
                        class="btn col-4 mt-4"
                        :data-cy="dataTestLabel + '-download-STP-File-button'"
                        :core="masStore.mas.magnetic.core"
                        :fullCoreModel="true"
                    />
                    <CoreStlExporter
                        class="btn offset-1 col-4 mt-4"
                        :data-cy="dataTestLabel + '-download-STP-File-button'"
                        :core="masStore.mas.magnetic.core"
                        :fullCoreModel="true"
                    />
<!--                     <CoreTechnicalDrawingExporter
                        class="btn col-4 mt-4"
                        :data-cy="dataTestLabel + '-download-STP-File-button'"
                        :core="masStore.mas.magnetic.core"
                        :fullCoreModel="true"
                        @export="onExport"
                    /> -->
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