<script setup>
import { useMasStore } from '../../stores/mas'
import Dialog from 'primevue/dialog'
import SimbaExporter from './SimbaExporter.vue'
import LtSpiceExporter from './LtSpiceExporter.vue'
import NgSpiceExporter from './NgSpiceExporter.vue'
import NL5Exporter from './NL5Exporter.vue'
import PlecsExporter from './PlecsExporter.vue'
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
        const modalName = 'CircuitSimulatorsExporterModal';
        const title = 'Circuit Simulators Exporter';
        return {
            masStore,
            modalName,
            title,
            plecsIcon: `${import.meta.env.BASE_URL}images/PLECS_icon.png`,
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
        :style="{ width: 'min(90vw, 920px)' }"
        :pt="{ root: { class: 'circ-modal' } }">
        <template #header>
            <div class="circ-header-inner">
                <div class="circ-header-badge">
                    <i class="pi pi-microchip"></i> Exporters
                </div>
                <h5 class="circ-title" :id="modalName + 'Label'">{{ title }}</h5>
                <p class="circ-subtitle">Download your magnetic model for use in circuit simulators</p>
            </div>
        </template>

                <div
                    v-if="$stateStore.currentOperatingPoint < masStore.mas.inputs.operatingPoints.length"
                    class="circ-body"
                >
                    <!-- SIMBA -->
                    <div class="circ-section">
                        <div class="circ-section-header">
                            <div class="circ-section-icon simba-icon">
                                <i class="pi pi-sitemap"></i>
                            </div>
                            <div>
                                <div class="circ-section-title">SIMBA</div>
                                <div class="circ-section-desc">Power electronics simulation platform</div>
                            </div>
                        </div>
                        <div class="circ-btn-row">
                            <SimbaExporter
                                :data-cy="dataTestLabel + '-Simba-Subcircuit-Section'"
                                :magnetic="masStore.mas.magnetic"
                                :temperature="masStore.mas.inputs.operatingPoints[$stateStore.currentOperatingPoint].conditions.ambientTemperature"
                                :attachToFile="false"
                                classProp="circ-export-btn"
                            />
                            <SimbaExporter
                                :data-cy="dataTestLabel + '-Simba-Subcircuit-Attached'"
                                :magnetic="masStore.mas.magnetic"
                                :temperature="masStore.mas.inputs.operatingPoints[$stateStore.currentOperatingPoint].conditions.ambientTemperature"
                                :attachToFile="true"
                                classProp="circ-export-btn circ-export-btn-accent"
                            />
                        </div>
                    </div>

                    <!-- LtSpice -->
                    <div class="circ-section">
                        <div class="circ-section-header">
                            <div class="circ-section-icon ltspice-icon">
                                <i class="pi pi-bolt-charge-fill"></i>
                            </div>
                            <div>
                                <div class="circ-section-title">LTspice</div>
                                <div class="circ-section-desc">Analog devices SPICE simulator</div>
                            </div>
                        </div>
                        <div class="circ-btn-row">
                            <LtSpiceExporter
                                :data-cy="dataTestLabel + '-LtSpice-Subcircuit'"
                                :magnetic="masStore.mas.magnetic"
                                :temperature="masStore.mas.inputs.operatingPoints[$stateStore.currentOperatingPoint].conditions.ambientTemperature"
                                :isSymbol="false"
                                classProp="circ-export-btn"
                            />
                            <LtSpiceExporter
                                :data-cy="dataTestLabel + '-LtSpice-Symbol'"
                                :magnetic="masStore.mas.magnetic"
                                :temperature="masStore.mas.inputs.operatingPoints[$stateStore.currentOperatingPoint].conditions.ambientTemperature"
                                :isSymbol="true"
                                classProp="circ-export-btn circ-export-btn-accent"
                            />
                        </div>
                    </div>

                    <!-- NgSpice -->
                    <div class="circ-section">
                        <div class="circ-section-header">
                            <div class="circ-section-icon ngspice-icon">
                                <i class="pi pi-server"></i>
                            </div>
                            <div>
                                <div class="circ-section-title">NgSpice</div>
                                <div class="circ-section-desc">Open-source mixed-signal simulator</div>
                            </div>
                        </div>
                        <div class="circ-btn-row">
                            <NgSpiceExporter
                                :data-cy="dataTestLabel + '-NgSpice-Subcircuit'"
                                :magnetic="masStore.mas.magnetic"
                                :temperature="masStore.mas.inputs.operatingPoints[$stateStore.currentOperatingPoint].conditions.ambientTemperature"
                                classProp="circ-export-btn"
                            />
                        </div>
                    </div>

                    <!-- NL5 -->
                    <div class="circ-section">
                        <div class="circ-section-header">
                            <div class="circ-section-icon nl5-icon">
                                <i class="pi pi-chart-line"></i>
                            </div>
                            <div>
                                <div class="circ-section-title">NL5</div>
                                <div class="circ-section-desc">Ideal-switch circuit simulator</div>
                            </div>
                        </div>
                        <div class="circ-btn-row">
                            <NL5Exporter
                                :data-cy="dataTestLabel + '-NL5-Subcircuit'"
                                :magnetic="masStore.mas.magnetic"
                                :temperature="masStore.mas.inputs.operatingPoints[$stateStore.currentOperatingPoint].conditions.ambientTemperature"
                                classProp="circ-export-btn"
                            />
                        </div>
                    </div>

                    <!-- PLECS -->
                    <div class="circ-section">
                        <div class="circ-section-header">
                            <div class="circ-section-icon plecs-icon">
                                <img :src="plecsIcon" width="24" height="24" alt="PLECS">
                            </div>
                            <div>
                                <div class="circ-section-title">PLECS</div>
                                <div class="circ-section-desc">Plexim power-electronics simulator</div>
                            </div>
                        </div>
                        <div class="circ-btn-row">
                            <PlecsExporter
                                :data-cy="dataTestLabel + '-PLECS-Subcircuit'"
                                :magnetic="masStore.mas.magnetic"
                                :temperature="masStore.mas.inputs.operatingPoints[$stateStore.currentOperatingPoint].conditions.ambientTemperature"
                                classProp="circ-export-btn"
                            />
                        </div>
                    </div>
                </div>
    </Dialog>
</template>

<style scoped>
.modal-class {
    z-index: 9999;
}

.circ-modal {
    border: 1px solid rgba(var(--bs-primary-rgb), 0.25);
    border-radius: 12px;
    overflow: hidden;
}

.circ-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 20px 24px 16px;
    border-bottom: 1px solid rgba(var(--bs-primary-rgb), 0.18);
    background: linear-gradient(180deg,
        rgba(var(--bs-primary-rgb), 0.08) 0%,
        rgba(var(--bs-primary-rgb), 0.02) 100%);
    border-left: 3px solid rgba(var(--bs-primary-rgb), 0.7);
}

.circ-header-inner {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.circ-header-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.2rem 0.55rem;
    background: rgba(var(--bs-primary-rgb), 0.12);
    border: 1px solid rgba(var(--bs-primary-rgb), 0.3);
    border-radius: 999px;
    color: var(--bs-primary);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    width: fit-content;
    margin-bottom: 4px;
}

.circ-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--bs-white);
    margin: 0;
    letter-spacing: 0.2px;
}

.circ-subtitle {
    font-size: 12px;
    color: rgba(var(--bs-white-rgb), 0.55);
    margin: 0;
}

.circ-body {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.circ-section {
    background: rgba(var(--bs-white-rgb), 0.03);
    border: 1px solid rgba(var(--bs-primary-rgb), 0.15);
    border-radius: 10px;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.circ-section-header {
    display: flex;
    align-items: center;
    gap: 12px;
}

.circ-section-icon {
    width: 38px;
    height: 38px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
}

.simba-icon {
    background: rgba(var(--bs-primary-rgb), 0.15);
    color: var(--bs-primary);
    border: 1px solid rgba(var(--bs-primary-rgb), 0.3);
}

.ltspice-icon {
    background: rgba(var(--bs-warning-rgb), 0.12);
    color: rgb(var(--bs-warning-rgb));
    border: 1px solid rgba(var(--bs-warning-rgb), 0.25);
}

.ngspice-icon {
    background: rgba(var(--bs-success-rgb), 0.12);
    color: rgb(var(--bs-success-rgb));
    border: 1px solid rgba(var(--bs-success-rgb), 0.25);
}

.nl5-icon {
    background: rgba(var(--bs-info-rgb), 0.12);
    color: rgb(var(--bs-info-rgb));
    border: 1px solid rgba(var(--bs-info-rgb), 0.25);
}

.plecs-icon {
    background: rgba(var(--bs-danger-rgb), 0.12);
    color: rgb(var(--bs-danger-rgb));
    border: 1px solid rgba(var(--bs-danger-rgb), 0.25);
}

.circ-section-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--bs-white);
    letter-spacing: 0.1px;
}

.circ-section-desc {
    font-size: 11px;
    color: rgba(var(--bs-white-rgb), 0.5);
    margin-top: 1px;
}

.circ-btn-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.circ-btn-row > * {
    flex: 1 1 200px;
}
</style>

<style>
.circ-export-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 7px;
    border: 1px solid rgba(var(--bs-primary-rgb), 0.3);
    background: rgba(var(--bs-primary-rgb), 0.1);
    color: rgba(var(--bs-white-rgb), 0.85) !important;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    text-align: center;
    width: 100%;
}

.circ-export-btn:hover:not(:disabled) {
    background: rgba(var(--bs-primary-rgb), 0.2);
    border-color: rgba(var(--bs-primary-rgb), 0.55);
    color: var(--bs-white) !important;
}

.circ-export-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.circ-export-btn-accent {
    background: rgba(var(--bs-primary-rgb), 0.18);
    border-color: rgba(var(--bs-primary-rgb), 0.45);
    color: var(--bs-primary) !important;
}

.circ-export-btn-accent:hover:not(:disabled) {
    background: rgba(var(--bs-primary-rgb), 0.28);
    color: var(--bs-white) !important;
}
</style>
