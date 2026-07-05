<script setup>
import { useMasStore } from '../../stores/mas'
import { useHistoryStore } from '../../stores/history'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { deepCopy, download, pruneNulls } from 'WebSharedComponents/assets/js/utils.js'
import { WiringTechnology } from 'WebSharedComponents/assets/ts/MAS.ts'
import CoreExporter from '../Exporters/CoreExporter.vue'
import CoilExporter from '../Exporters/CoilExporter.vue'
import MASExporter from '../Exporters/MASExporter.vue'
import CircuitSimulatorsExporter from '../Exporters/CircuitSimulatorsExporter.vue'
import { kirchhoffHandoff, sendMagneticToKirchhoff } from '/src/composables/kirchhoffHandoff'
</script>


<script>

export default {
    emits: ["toolSelected"],
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        showResetButton: {
            type: Boolean,
            default: false,
        },
        showExportButtons: {
            type: Boolean,
            default: true,
        },
        showAnsysButtons: {
            type: Boolean,
            default: true,
        },
    },
    data() {
        const masStore = useMasStore();
        const historyStore = useHistoryStore();
        const taskQueueStore = useTaskQueueStore();
        const exportingMAS = false;
        const exportingAnsys = false;
        const exportingSimba = false;
        const exportingLtspice = false;
        const exportingNgspice = false;
        const exportingNl5 = false;
        const exportingPlecs = false;
        const isHighPerformanceBackendAvailable = false;

        const masIcon = `${import.meta.env.BASE_URL}images/MAS_icon.svg`;
        const ansysIcon = `${import.meta.env.BASE_URL}images/Ansys_icon.svg`;
        const ansysEddyCurrentsIcon = `${import.meta.env.BASE_URL}images/Maxwell.svg`;
        const ansysTransientIcon = `${import.meta.env.BASE_URL}images/Excitations_24x24.svg`;
        const ansysThermalIcon = `${import.meta.env.BASE_URL}images/Icepak_24x24.svg`;
        const simbaIcon = `${import.meta.env.BASE_URL}images/Simba_icon.svg`;
        const ltspiceIcon = `${import.meta.env.BASE_URL}images/Ltspice_icon.svg`;
        const ltspiceSymbolIcon = `${import.meta.env.BASE_URL}images/Ltspice Symbol.png`;
        const ltspiceSubcircuitIcon = `${import.meta.env.BASE_URL}images/Ltspice Subcircuit.png`;
        const ngspiceIcon = `${import.meta.env.BASE_URL}images/Ngspice_icon.svg`;
        const nl5Icon = `${import.meta.env.BASE_URL}images/NL5_icon.png`;
        const plecsIcon = `${import.meta.env.BASE_URL}images/PLECS_icon.png`;
        return {
            masStore,
            historyStore,
            taskQueueStore,
            coreExporterVisible: false,
            coilExporterVisible: false,
            masExporterVisible: false,
            circuitExporterVisible: false,
            openDropdown: null,
            exportingMAS,
            exportingAnsys,
            ansysEddyCurrentsIcon,
            ansysTransientIcon,
            ansysThermalIcon,
            exportingSimba,
            exportingLtspice,
            ltspiceSymbolIcon,
            ltspiceSubcircuitIcon,
            exportingNgspice,
            exportingNl5,
            exportingPlecs,
            isHighPerformanceBackendAvailable,
            masIcon,
            ansysIcon,
            simbaIcon,
            ltspiceIcon,
            ngspiceIcon,
            nl5Icon,
            plecsIcon,
        }
    },
    computed: {
        // Active only when Kirchhoff opened us to design a magnetic (?handoff=kirchhoff).
        kirchhoffActive() { return kirchhoffHandoff.value != null; },
        ambientTemperature() {
            if (this.masStore.mas.inputs.operatingPoints[this.$stateStore.currentOperatingPoint] != null) {
                return this.masStore.mas.inputs.operatingPoints[this.$stateStore.currentOperatingPoint].conditions.ambientTemperature;
            }
            return 25;
        },
        reference() {
            if (this.masStore.mas.magnetic?.manufacturerInfo?.reference) {
                return this.masStore.mas.magnetic.manufacturerInfo.reference;
            }
            return "custom_magnetic";
        },
        isMagneticComplete() {
            return this.masStore.mas.magnetic.coil.turnsDescription != null;
        },
    },
    mounted () {
        const url = import.meta.env.VITE_API_ENDPOINT + '/is_high_performance_backend_available';
        this.$axios.post(url, {})
        .then(response => {
            this.isHighPerformanceBackendAvailable = response.data;
        })
        .catch(error => {
            console.error(error);
        });
    },
    methods: {
        exportMASFile() {
            this.exportingMAS = true;
            setTimeout(() => {
                var prunedMas = deepCopy(this.masStore.mas)
                pruneNulls(prunedMas)
                download(JSON.stringify(prunedMas, null, 4), "custom_magnetic.json", "text/plain");
                setTimeout(() => this.exportingMAS = false, 2000);
            }, 100);
        },
        // Send the currently built magnetic straight back to the Kirchhoff converter that opened us.
        sendToKirchhoff() {
            sendMagneticToKirchhoff(deepCopy(this.masStore.mas));
        },
        exportAnsys(solutionType) {
            this.exportingAnsys = true;
            setTimeout(() => {
                const postData = {
                    "mas": this.masStore.mas,
                    "project_name": this.reference,
                    "solution_type": solutionType,
                    "operating_point_index": this.$stateStore.currentOperatingPoint,
                };
                const url = import.meta.env.VITE_API_ENDPOINT + '/create_simulation_from_mas';
                this.$axios.post(url, postData, {responseType: 'arraybuffer'})
                .then(response => {
                    if (response.data.byteLength > 1000) {
                        download(response.data, this.reference + ".aedt", "binary/octet-stream; charset=utf-8");
                    }
                    this.exportingAnsys = false;
                })
                .catch(error => {
                    console.error(error);
                    this.exportingAnsys = false;
                });
            }, 100);
        },
        readSimbaFile(event) {
            const fr = new FileReader();
            const name = this.$refs['simbaFileReader'].files.item(0).name
            fr.readAsText(this.$refs['simbaFileReader'].files.item(0));
            fr.onload = async e => {
                const jsimba = e.target.result
                try {
                    var subcircuit = await this.taskQueueStore.exportMagneticAsSubcircuit(this.masStore.mas.magnetic, this.ambientTemperature, "SIMBA", jsimba);
                    const filename = name.split(".")[0];
                    var blob = new Blob([subcircuit], { type: 'text/csv; charset=utf-8' });
                    download(blob, filename + "_with_OM_library.jsimba", "text/plain;charset=UTF-8");
                } catch (error) {
                    console.error(error);
                }
            }
        },
        exportSimba(attachToFile) {
            if (attachToFile) {
                this.$refs.simbaFileReader.click()
                this.exportingSimba = true
                setTimeout(() => this.exportingSimba = false, 2000);
            } else {
                this.exportingSimba = true
                setTimeout(() => this.createSimbaSubcircuit(), 20);
                setTimeout(() => this.exportingSimba = false, 2000);
            }
        },
        async createSimbaSubcircuit() {
            try {
                var subcircuit = await this.taskQueueStore.exportMagneticAsSubcircuit(this.masStore.mas.magnetic, this.ambientTemperature, "SIMBA", "");
                var blob = new Blob([subcircuit], { type: 'text/csv; charset=utf-8' });
                download(blob, this.reference + ".jsimba", "text/csv; charset=utf-8");
            } catch (error) {
                console.error(error);
            }
        },
        async exportLtspice(part) {
            this.exportingLtspice = true;
            try {
                const magnetic = deepCopy(this.masStore.mas.magnetic);
                const reference = this.reference.replaceAll(" ", "_").replaceAll("-", "_").replaceAll(".", "_").replaceAll(",", "_").replaceAll(":", "_").replaceAll("___", "_").replaceAll("__", "_");
                if (part == "subcircuit") {
                    var subcircuit = await this.taskQueueStore.exportMagneticAsSubcircuit(magnetic, this.ambientTemperature, "LtSpice", "");
                    var blob = new Blob([subcircuit], { type: 'text/csv; charset=utf-8' });
                    download(blob, reference + ".cir", "text/csv; charset=utf-8");
                } else {
                    var subcircuit = await this.taskQueueStore.exportMagneticAsSymbol(magnetic, "LtSpice", "");
                    var blob = new Blob([subcircuit], { type: 'text/csv; charset=utf-8' });
                    download(blob, reference + ".asy", "text/csv; charset=utf-8");
                }
                setTimeout(() => this.exportingLtspice = false, 2000);
            } catch (error) {
                setTimeout(() => this.exportingLtspice = false, 200);
                console.error(error);
            }
        },
        async exportNgspice() {
            this.exportingNgspice = true;
            try {
                const magnetic = deepCopy(this.masStore.mas.magnetic);
                const reference = this.reference.replaceAll(" ", "_").replaceAll("-", "_").replaceAll(".", "_").replaceAll(",", "_").replaceAll(":", "_").replaceAll("___", "_").replaceAll("__", "_");
                var subcircuit = await this.taskQueueStore.exportMagneticAsSubcircuit(magnetic, this.ambientTemperature, "NgSpice", "");
                var blob = new Blob([subcircuit], { type: 'text/csv; charset=utf-8' });
                download(blob, reference + ".cir", "text/csv; charset=utf-8");
                setTimeout(() => this.exportingNgspice = false, 2000);
            } catch (error) {
                setTimeout(() => this.exportingNgspice = false, 200);
                console.error(error);
            }
        },
        async exportNl5() {
            this.exportingNl5 = true;
            try {
                const magnetic = deepCopy(this.masStore.mas.magnetic);
                const reference = this.reference.replaceAll(" ", "_").replaceAll("-", "_").replaceAll(".", "_").replaceAll(",", "_").replaceAll(":", "_").replaceAll("___", "_").replaceAll("__", "_");
                var subcircuit = await this.taskQueueStore.exportMagneticAsSubcircuit(magnetic, this.ambientTemperature, "NL5", "");
                var blob = new Blob([subcircuit], { type: 'application/xml; charset=utf-8' });
                download(blob, reference + ".nl5", "application/xml; charset=utf-8");
                setTimeout(() => this.exportingNl5 = false, 2000);
            } catch (error) {
                setTimeout(() => this.exportingNl5 = false, 200);
                console.error(error);
            }
        },
        async exportPlecs() {
            this.exportingPlecs = true;
            try {
                const magnetic = deepCopy(this.masStore.mas.magnetic);
                const reference = this.reference.replaceAll(" ", "_").replaceAll("-", "_").replaceAll(".", "_").replaceAll(",", "_").replaceAll(":", "_").replaceAll("___", "_").replaceAll("__", "_");
                var subcircuit = await this.taskQueueStore.exportMagneticAsSubcircuit(magnetic, this.ambientTemperature, "PLECS", "");
                var blob = new Blob([subcircuit], { type: 'text/plain; charset=utf-8' });
                download(blob, reference + ".plecs", "text/plain; charset=utf-8");
                setTimeout(() => this.exportingPlecs = false, 2000);
            } catch (error) {
                setTimeout(() => this.exportingPlecs = false, 200);
                console.error(error);
            }
        },
        async reset(isPlanar) {
            this.masStore.resetMas('power');
            this.$stateStore.closeCoilAdvancedInfo();
            this.masStore.mas.inputs.designRequirements.wiringTechnology = isPlanar ? WiringTechnology.Printed : WiringTechnology.Wound;
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}engine_loader`);
        },
        undo() {
            const newMas = this.historyStore.back();
            this.masStore.mas = newMas;
            this.historyStore.historyPointerUpdated();
            this.historyStore.blockAdditions();
            setTimeout(() => {this.historyStore.unblockAdditions();}, 2000);
        },
        redo() {
            const newMas = this.historyStore.forward();
            this.masStore.mas = newMas;
            this.historyStore.historyPointerUpdated();
            this.historyStore.blockAdditions();
            setTimeout(() => {this.historyStore.unblockAdditions();}, 2000);
        },
        toggleDropdown(key) {
            this.openDropdown = this.openDropdown === key ? null : key;
        },
        closeDropdowns() {
            this.openDropdown = null;
        },
    },
    mounted() {
        this._closeDropdownsBound = this.closeDropdowns.bind(this);
        document.addEventListener('click', this._closeDropdownsBound);
    },
    beforeUnmount() {
        if (this._closeDropdownsBound) document.removeEventListener('click', this._closeDropdownsBound);
    },
}
</script>

<template>
    <div :style="$styleStore.controlPanel.main">
        <CoreExporter v-model:visible="coreExporterVisible" :data-cy="dataTestLabel + '-CoreExporter'"/>
        <CoilExporter v-model:visible="coilExporterVisible" :data-cy="dataTestLabel + '-CoilExporter'" />
        <MASExporter v-model:visible="masExporterVisible" :data-cy="dataTestLabel + '-MASExporter'" />
        <CircuitSimulatorsExporter v-model:visible="circuitExporterVisible" :data-cy="dataTestLabel + '-CircuitSimulatorsExporter'" />
        <input data-cy="ControlPanel-Simba-file-button" type="file" ref="simbaFileReader" @change="readSimbaFile()" class="d-none" />

        <div class="cp-toolbar">
            <!-- Left side: History & Reset -->
            <div class="cp-left">
                <div class="cp-group">
                    <button 
                        :style="$styleStore.controlPanel.button" 
                        class="cp-btn" 
                        :disabled="!historyStore.isBackPossible()" 
                        @click="undo" 
                        title="Undo"
                    >
                        <i class="pi pi-history"></i>
                    </button>
                    <button 
                        :style="$styleStore.controlPanel.button" 
                        class="cp-btn" 
                        :disabled="!historyStore.isForwardPossible()" 
                        @click="redo" 
                        title="Redo"
                    >
                        <i class="pi pi-refresh"></i>
                    </button>
                </div>

                <div class="cp-divider"></div>

                <div v-if="showResetButton" class="cp-group">
                    <div class="dropdown" @click.stop>
                        <button
                            :style="$styleStore.controlPanel.closeButton"
                            class="cp-btn dropdown-toggle"
                            @click="toggleDropdown('reset')"
                            title="Reset">
                            <i class="pi pi-power-off"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-dark" :class="{ show: openDropdown === 'reset' }">
                            <li><button class="dropdown-item" @click="closeDropdowns(); reset(false)"><i class="pi pi-circle mr-2"></i>Wound</button></li>
                            <li><button class="dropdown-item" @click="closeDropdowns(); reset(true)"><i class="pi pi-database mr-2"></i>Planar</button></li>
                        </ul>
                    </div>
                </div>

                <!-- All Exports Dropdown (kept next to Reset) -->
                <div v-if="showExportButtons && isMagneticComplete" class="cp-group">
                    <div class="dropdown" @click.stop>
                        <button
                            :style="$styleStore.controlPanel.activeButton"
                            class="cp-btn cp-btn-all dropdown-toggle"
                            @click="toggleDropdown('allExports')"
                            title="All Exports">
                            <i class="pi pi-list"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-dark" :class="{ show: openDropdown === 'allExports' }">
                            <li><button :style="$styleStore.magneticBuilder.exportButton" :data-cy="'MAS-exports-modal-button'" class="dropdown-item" @click="closeDropdowns(); masExporterVisible = true"><i class="pi pi-file-code mr-2"></i>MAS Exports</button></li>
                            <li><button :style="$styleStore.magneticBuilder.exportButton" :data-cy="'Core-exports-modal-button'" class="dropdown-item" @click="closeDropdowns(); coreExporterVisible = true"><i class="pi pi-box mr-2"></i>Core Exports</button></li>
                            <li><button :style="$styleStore.magneticBuilder.exportButton" :data-cy="'Coil-exports-modal-button'" class="dropdown-item" @click="closeDropdowns(); coilExporterVisible = true"><i class="pi pi-link mr-2"></i>Coil Exports</button></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><button :style="$styleStore.magneticBuilder.exportButton" :data-cy="'Circuit-Simulators-exports-modal-button'" class="dropdown-item p-button p-button-danger" @click="closeDropdowns(); circuitExporterVisible = true"><i class="pi pi-volume-up mr-2"></i>Circuit Simulators</button></li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Right side: Export Buttons -->
            <div class="cp-right">
                <template v-if="showExportButtons && isMagneticComplete">
                    <!-- MAS Export -->
                    <div class="cp-group">
                        <button 
                            :style="$styleStore.controlPanel.button" 
                            class="cp-btn cp-btn-mas" 
                            @click="exportMASFile" 
                            :disabled="exportingMAS" 
                            title="Export MAS"
                        >
                            <img v-if="!exportingMAS" :src='masIcon' width="18" height="18" alt="MAS">
                            <span v-else class="cp-spinner"></span>
                        </button>
                    </div>

                    <!-- Send this built magnetic back to Kirchhoff (only during a Kirchhoff handoff) -->
                    <div v-if="kirchhoffActive" class="cp-group">
                        <button
                            class="cp-btn cp-btn-mas"
                            :data-cy="dataTestLabel + '-send-to-kirchhoff-button'"
                            @click="sendToKirchhoff"
                            title="Send this magnetic back to Kirchhoff"
                        >
                            <i class="pi pi-arrow-right-arrow-left"></i>
                            <span>Kirchhoff</span>
                        </button>
                    </div>

                    <!-- Ansys Dropdown -->
                    <div v-if="showAnsysButtons" class="cp-group">
                        <div class="dropdown" @click.stop>
                            <button
                                v-bind="$styleStore.controlPanel.button"
                                class="cp-btn cp-btn-ansys dropdown-toggle"
                                :disabled="!isHighPerformanceBackendAvailable || exportingAnsys"
                                :style="`opacity: ${isHighPerformanceBackendAvailable ? 1 : 0.3}`"
                                @click="toggleDropdown('ansys')"
                                title="Ansys">
                                <img :src='ansysIcon' width="18" height="18" alt="Ansys">
                            </button>
                            <ul class="dropdown-menu dropdown-menu-dark" :class="{ show: openDropdown === 'ansys' }">
                                <li><button class="dropdown-item" @click="closeDropdowns(); exportAnsys('EddyCurrent')"><img :src='ansysEddyCurrentsIcon' width="16" height="16" class="mr-2">EddyCurrents</button></li>
                                <li><button class="dropdown-item" @click="closeDropdowns(); exportAnsys('Transient')"><img :src='ansysTransientIcon' width="16" height="16" class="mr-2">Transient</button></li>
                                <li><button class="dropdown-item" @click="closeDropdowns(); exportAnsys('SteadyState')"><img :src='ansysThermalIcon' width="16" height="16" class="mr-2">Thermal</button></li>
                            </ul>
                        </div>
                    </div>

                    <!-- SIMBA Dropdown -->
                    <div class="cp-group">
                        <div class="dropdown" @click.stop>
                            <button
                                :style="$styleStore.controlPanel.button"
                                class="cp-btn cp-btn-simba dropdown-toggle"
                                :disabled="exportingSimba"
                                @click="toggleDropdown('simba')"
                                title="SIMBA">
                                <img :src='simbaIcon' width="18" height="18" alt="SIMBA">
                            </button>
                            <ul class="dropdown-menu dropdown-menu-dark" :class="{ show: openDropdown === 'simba' }">
                                <li><button class="dropdown-item" @click="closeDropdowns(); exportSimba(true)"><i class="pi pi-link mr-2"></i>Attach to file</button></li>
                                <li><button class="dropdown-item" @click="closeDropdowns(); exportSimba(false)"><i class="pi pi-download mr-2"></i>Download library</button></li>
                            </ul>
                        </div>
                    </div>

                    <!-- LtSpice Dropdown -->
                    <div class="cp-group">
                        <div class="dropdown" @click.stop>
                            <button
                                :style="$styleStore.controlPanel.button"
                                class="cp-btn cp-btn-ltspice dropdown-toggle"
                                :disabled="exportingLtspice"
                                @click="toggleDropdown('ltspice')"
                                title="LtSpice">
                                <img :src='ltspiceIcon' width="18" height="18" alt="LtSpice">
                            </button>
                            <ul class="dropdown-menu dropdown-menu-dark" :class="{ show: openDropdown === 'ltspice' }">
                                <li><button class="dropdown-item" @click="closeDropdowns(); exportLtspice('subcircuit')"><img :src='ltspiceSubcircuitIcon' width="16" height="16" class="mr-2">Subcircuit</button></li>
                                <li><button class="dropdown-item" @click="closeDropdowns(); exportLtspice('symbol')"><img :src='ltspiceSymbolIcon' width="16" height="16" class="mr-2">Symbol</button></li>
                            </ul>
                        </div>
                    </div>

                    <!-- NgSpice Button -->
                    <div class="cp-group">
                        <button 
                            :style="$styleStore.controlPanel.button" 
                            class="cp-btn cp-btn-ngspice" 
                            @click="exportNgspice" 
                            :disabled="exportingNgspice" 
                            title="NgSpice"
                        >
                            <img :src='ngspiceIcon' width="18" height="18" alt="NgSpice">
                        </button>
                    </div>

                    <!-- NL5 Button -->
                    <div class="cp-group">
                        <button
                            :style="$styleStore.controlPanel.button"
                            class="cp-btn cp-btn-nl5"
                            @click="exportNl5"
                            :disabled="exportingNl5"
                            title="NL5"
                        >
                            <img :src='nl5Icon' width="18" height="18" alt="NL5">
                        </button>
                    </div>

                    <!-- PLECS Button -->
                    <div class="cp-group">
                        <button
                            :style="$styleStore.controlPanel.button"
                            class="cp-btn cp-btn-plecs"
                            @click="exportPlecs"
                            :disabled="exportingPlecs"
                            title="PLECS"
                            data-cy="ControlPanel-export-plecs-button"
                        >
                            <img :src='plecsIcon' width="18" height="18" alt="PLECS">
                        </button>
                    </div>

                </template>

                <!-- Incomplete State -->
                <template v-else-if="showExportButtons">
                    <div class="cp-group">
                        <span :style="$styleStore.controlPanel.setting" class="cp-incomplete"><i class="pi pi-info-circle mr-1"></i>Complete design to enable exports</span>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<style scoped>
.cp-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 8px;
    border-radius: 8px;
    flex-wrap: wrap;
}

.cp-left {
    display: flex;
    align-items: center;
    gap: 4px;
}

.cp-right {
    display: flex;
    align-items: center;
    gap: 4px;
}

.cp-group {
    display: flex;
    align-items: center;
    gap: 2px;
}

.cp-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    background-color: rgba(var(--p-white-rgb), 0.1);
    color: inherit;
}

.cp-btn:hover:not(:disabled) {
    filter: brightness(1.2);
    transform: scale(1.05);
}

.cp-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.cp-btn.dropdown-toggle::after {
    display: none;
}

.cp-divider {
    width: 1px;
    height: 24px;
    background: rgba(var(--p-white-rgb), 0.15);
    margin: 0 4px;
}

.cp-incomplete {
    font-size: 0.75rem;
    padding: 4px 8px;
    border-radius: 4px;
}

.cp-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(var(--p-white-rgb), 0.3);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: cp-spin 0.8s linear infinite;
}

@keyframes cp-spin {
    to { transform: rotate(360deg); }
}

.dropdown-menu {
    margin-top: 4px;
}

.dropdown-item {
    font-size: 0.85rem;
    padding: 6px 12px;
}
</style>
