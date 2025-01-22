<script setup >
import { useMasStore } from '/src/stores/mas'
import { Modal } from "bootstrap";
import SimbaExporter from '/src/components/Exporters/SimbaExporter.vue'
import LtSpiceExporter from '/src/components/Exporters/LtSpiceExporter.vue'
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
        const modalName = 'CircuitSimulatorsExporterModal';
        const title = 'Circuit Simulators Exporter';
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
                <div class="modal-body container ">
                    <div class="row">
                        <p class="text-center fs-5">SIMBA</p>
                    </div>
                    <div class="row border-bottom pb-3">
                        <SimbaExporter
                            class="btn btn-primary col-4 mt-1"
                            :data-cy="dataTestLabel + '-Simba-Subcircuit-Section'"
                            :magnetic="masStore.mas.magnetic"
                            :attachToFile="false"
                        />
                        <SimbaExporter
                            class="btn btn-primary offset-1 col-4 mt-1"
                            :data-cy="dataTestLabel + '-Simba-Subcircuit-Attached'"
                            :magnetic="masStore.mas.magnetic"
                            :attachToFile="true"
                        />
                    </div>
<!--                     <div class="row">
                        <p class="text-center fs-5 pt-2">LtSpice</p>
                    </div>
                    <div class="row border-bottom pb-3">
                        <LtSpiceExporter
                            class="btn btn-primary col-4 mt-1"
                            :data-cy="dataTestLabel + '-Simba-Subcircuit-Section'"
                            :magnetic="masStore.mas.magnetic"
                            :isSymbol="false"
                        />
                        <LtSpiceExporter
                            class="btn btn-primary offset-1 col-4 mt-1"
                            :data-cy="dataTestLabel + '-Simba-Subcircuit-Attached'"
                            :magnetic="masStore.mas.magnetic"
                            :isSymbol="true"
                        />
                    </div>
                    <div class="row">
                        <p class="text-center fs-5 pt-2">NgSpice</p>
                    </div>
                    <div class="row border-bottom pb-3">
                        <SimbaExporter
                            class="btn btn-primary col-4 mt-1"
                            :data-cy="dataTestLabel + '-Simba-Subcircuit-Section'"
                            :magnetic="masStore.mas.magnetic"
                            :attachToFile="false"
                        />
                        <SimbaExporter
                            class="btn btn-primary offset-1 col-4 mt-1"
                            :data-cy="dataTestLabel + '-Simba-Subcircuit-Attached'"
                            :magnetic="masStore.mas.magnetic"
                            :attachToFile="true"
                        />
                    </div> -->
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