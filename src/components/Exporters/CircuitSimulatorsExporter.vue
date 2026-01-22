4<script setup >
import { useMasStore } from '../../stores/mas'
import { Modal } from "bootstrap";
import SimbaExporter from './SimbaExporter.vue'
import LtSpiceExporter from './LtSpiceExporter.vue'
import NgSpiceExporter from './NgSpiceExporter.vue'
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
                <div
                    v-if="$stateStore.currentOperatingPoint < masStore.mas.inputs.operatingPoints.length"
                    class="modal-body container "
                    >
                    <div class="row">
                        <p class="text-center fs-5">SIMBA</p>
                    </div>
                    <div class="row border-bottom pb-3">
                        <SimbaExporter
                            class="btn col-4 mt-1"
                            :data-cy="dataTestLabel + '-Simba-Subcircuit-Section'"
                            :magnetic="masStore.mas.magnetic"
                            :temperature="masStore.mas.inputs.operatingPoints[$stateStore.currentOperatingPoint].conditions.ambientTemperature"
                            :attachToFile="false"
                        />
                        <SimbaExporter
                            class="btn offset-1 col-4 mt-1"
                            :data-cy="dataTestLabel + '-Simba-Subcircuit-Attached'"
                            :magnetic="masStore.mas.magnetic"
                            :temperature="masStore.mas.inputs.operatingPoints[$stateStore.currentOperatingPoint].conditions.ambientTemperature"
                            :attachToFile="true"
                        />
                    </div>
                    <div class="row">
                        <p class="text-center fs-5 pt-2">LtSpice</p>
                    </div>
                    <div class="row border-bottom pb-3">
                        <LtSpiceExporter
                            class="btn col-4 mt-1"
                            :data-cy="dataTestLabel + '-Simba-Subcircuit-Section'"
                            :magnetic="masStore.mas.magnetic"
                            :temperature="masStore.mas.inputs.operatingPoints[$stateStore.currentOperatingPoint].conditions.ambientTemperature"
                            :isSymbol="false"
                        />
                        <LtSpiceExporter
                            class="btn offset-1 col-4 mt-1"
                            :data-cy="dataTestLabel + '-Simba-Subcircuit-Attached'"
                            :magnetic="masStore.mas.magnetic"
                            :temperature="masStore.mas.inputs.operatingPoints[$stateStore.currentOperatingPoint].conditions.ambientTemperature"
                            :isSymbol="true"
                        />
                    </div>
                    <div class="row">
                        <p class="text-center fs-5 pt-2">NgSpice</p>
                    </div>
                    <div class="row border-bottom pb-3">
                        <NgSpiceExporter
                            class="btn col-4 mt-1"
                            :data-cy="dataTestLabel + '-Simba-Subcircuit-Section'"
                            :magnetic="masStore.mas.magnetic"
                            :temperature="masStore.mas.inputs.operatingPoints[$stateStore.currentOperatingPoint].conditions.ambientTemperature"
                            :attachToFile="false"
                        />
                    </div>
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