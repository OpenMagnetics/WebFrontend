<script setup>
import { useMasStore } from '../../stores/mas'
import { useHistoryStore } from '../../stores/history'
import { clean, checkAndFixMas, download, pruneNulls, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import CoreExporter from '../Exporters/CoreExporter.vue'
import CoilExporter from '../Exporters/CoilExporter.vue'
import MASExporter from '../Exporters/MASExporter.vue'
import CircuitSimulatorsExporter from '../Exporters/CircuitSimulatorsExporter.vue'
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
        showImportMASButton: {
            type: Boolean,
            default: true,
        },
        showExportButtons: {
            type: Boolean,
            default: true,
        },
    },
    data() {
        const masStore = useMasStore();
        const historyStore = useHistoryStore();
        const exportingMAS = false;
        const exportingAnsys = false;
        const exportingSimba = false;
        const exportingLtspice = false;
        const exportingNgspice = false;

        const masIcon = `${import.meta.env.BASE_URL}/images/MAS_icon.svg`;
        const ansysIcon = `${import.meta.env.BASE_URL}/images/Ansys_icon.svg`;
        const ansysEddyCurrentsIcon = `${import.meta.env.BASE_URL}/images/Maxwell.svg`;
        const ansysTransientIcon = `${import.meta.env.BASE_URL}/images/Excitations_24x24.svg`;
        const ansysThermalIcon = `${import.meta.env.BASE_URL}/images/Icepak_24x24.svg`;
        const simbaIcon = `${import.meta.env.BASE_URL}/images/Simba_icon.svg`;
        const ltspiceIcon = `${import.meta.env.BASE_URL}/images/Ltspice_icon.svg`;
        const ltspiceSymbolIcon = `${import.meta.env.BASE_URL}/images/Ltspice Symbol.png`;
        const ltspiceSubcircuitIcon = `${import.meta.env.BASE_URL}/images/Ltspice Subcircuit.png`;
        const ngspiceIcon = `${import.meta.env.BASE_URL}/images/Ngspice_icon.svg`;
        return {
            masStore,
            historyStore,

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

            masIcon,
            ansysIcon,
            simbaIcon,
            ltspiceIcon,
            ngspiceIcon,
        }
    },
    computed: {
    },
    watch: { 
    },
    mounted () {
    },
    methods: {
        exportMASFile() {
            this.exportingMAS = true;
            setTimeout(() => {
                var prunedMas = deepCopy(this.masStore.mas)
                pruneNulls(prunedMas)
                console.log(prunedMas)
                download(JSON.stringify(prunedMas, null, 4), "custom_magnetic.json", "text/plain");
                setTimeout(() => this.exportingMAS = false, 2000);
            }, 100);
        },
        exportAnsys(solutionType) {
            console.warn("exportAnsys")
            this.exportingAnsys = true;
            setTimeout(() => {
                const postData = {
                    "mas": this.masStore.mas,
                    "project_name": this.masStore.mas.magnetic.manufacturerInfo.reference,
                    "solution_type": solutionType,
                    "operating_point_index": this.$stateStore.currentOperatingPoint,
                };
                console.warn("import.meta.env.VITE_ANSYS_API_ENDPOINT")
                console.warn(import.meta.env.VITE_ANSYS_API_ENDPOINT)
                const url = import.meta.env.VITE_ANSYS_API_ENDPOINT + '/create_simulation_from_mas';

                this.$axios.post(url, postData)
                .then(response => {
                    console.warn(response);
                    download(response.data, this.masStore.mas.magnetic.manufacturerInfo.reference + ".aedt", "text/plain; charset=utf-8");
                    this.exportingAnsys = false;
                })
                .catch(error => {
                    console.error(error);
                    this.exportingAnsys = false;
                });
            }, 100);

        },
        exportSimba() {
            this.exportingSimba = true;
            setTimeout(() => {
                this.$mkf.ready.then(_ => {
                    var subcircuit = this.$mkf.export_magnetic_as_subcircuit(JSON.stringify(this.masStore.mas.magnetic), this.masStore.mas.inputs.operatingPoints[this.$stateStore.currentOperatingPoint].conditions.ambientTemperature, "SIMBA", "");
                    var blob = new Blob([subcircuit], {
                        type: 'text/csv; charset=utf-8'
                    });
                    download(blob, this.masStore.mas.magnetic.manufacturerInfo.reference + ".jsimba", "text/csv; charset=utf-8");
                    setTimeout(() => this.exportingSimba = false, 2000);

                }).catch(error => {
                    console.error(error);
                    setTimeout(() => this.exportingSimba = false, 200);
                });
            }, 100);
        },
        exportLtspice(part) {
            this.exportingLtspice = true;
            setTimeout(() => {
                this.$mkf.ready.then(_ => {
                    const magnetic = deepCopy(this.masStore.mas.magnetic);
                    magnetic.manufacturerInfo.reference = magnetic.manufacturerInfo.reference.replaceAll(" ", "_").replaceAll("-", "_").replaceAll(".", "_").replaceAll(",", "_").replaceAll(":", "_").replaceAll("___", "_").replaceAll("__", "_");

                    if (part == "subcircuit") {
                        var subcircuit = this.$mkf.export_magnetic_as_subcircuit(JSON.stringify(magnetic), this.masStore.mas.inputs.operatingPoints[this.$stateStore.currentOperatingPoint].conditions.ambientTemperature, "LtSpice", "");
                        var blob = new Blob([subcircuit], {
                            type: 'text/csv; charset=utf-8'
                        });
                        const filename = magnetic.manufacturerInfo.reference;
                        download(blob, filename + ".cir", "text/csv; charset=utf-8");
                    }
                    else {
                        var subcircuit = this.$mkf.export_magnetic_as_symbol(JSON.stringify(magnetic), "LtSpice", "");
                        var blob = new Blob([subcircuit], {
                            type: 'text/csv; charset=utf-8'
                        });
                        const filename = magnetic.manufacturerInfo.reference;
                        download(blob, filename + ".asy", "text/csv; charset=utf-8");
                    }

                    setTimeout(() => this.exportingLtspice = false, 2000);

                }).catch(error => {
                    setTimeout(() => this.exportingLtspice = false, 200);
                    console.error(error);
                });
            }, 100);
        },
        exportNgspice() {
            this.exportingNgspice = true;
            setTimeout(() => {
                this.$mkf.ready.then(_ => {
                    const magnetic = deepCopy(this.masStore.mas.magnetic);
                    magnetic.manufacturerInfo.reference = magnetic.manufacturerInfo.reference.replaceAll(" ", "_").replaceAll("-", "_").replaceAll(".", "_").replaceAll(",", "_").replaceAll(":", "_").replaceAll("___", "_").replaceAll("__", "_");
                    var subcircuit = this.$mkf.export_magnetic_as_subcircuit(JSON.stringify(magnetic), this.masStore.mas.inputs.operatingPoints[this.$stateStore.currentOperatingPoint].conditions.ambientTemperature, "LtSpice", "");
                    var blob = new Blob([subcircuit], {
                        type: 'text/csv; charset=utf-8'
                    });
                    const filename = magnetic.manufacturerInfo.reference;
                    download(blob, filename + ".cir", "text/csv; charset=utf-8");
                    setTimeout(() => this.exportingNgspice = false, 2000);

                }).catch(error => {
                    setTimeout(() => this.exportingNgspice = false, 200);
                    console.error(error);
                });
            }, 100);
        },
        reset() {
            this.masStore.resetMas('power')
            setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}/engine_loader`);}, 100);
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
    }
}
</script>

<template>

    <div class="container" :style="$styleStore.controlPanel.main">
        <CoreExporter :data-cy="dataTestLabel + '-CoreExporter'"/>
        <CoilExporter :data-cy="dataTestLabel + '-CoilExporter'" />
        <MASExporter :data-cy="dataTestLabel + '-MASExporter'" />
        <CircuitSimulatorsExporter :data-cy="dataTestLabel + '-CircuitSimulatorsExporter'" />
        <div class="row ">
            <button
                :style="$styleStore.controlPanel.button"
                :disabled="!historyStore.isBackPossible()"
                class="btn col-1"
                @click="undo"
            >
                <i class="fa-solid fa-arrow-rotate-left"></i>
            </button>
            <button
                :style="$styleStore.controlPanel.button"
                :disabled="!historyStore.isForwardPossible()"
                class="btn col-1"
                @click="redo"
            >
                <i class="fa-solid fa-arrow-rotate-right"></i>
            </button>
            <button 
                v-if="showResetButton"
                :style="$styleStore.controlPanel.button"
                class="btn col-1 px-md-0"
                @click="reset" 
                >
                <i class="fa-solid fa-power-off"></i>
            </button>
            <button
                v-if="showExportButtons && !exportingMAS"
                :style="$styleStore.controlPanel.button"
                class="btn col-1 offset-1 p-0"
                @click="exportMASFile"
            >
              <img :src='masIcon' width="40" height="40" class="d-inline-block align-top m-0 p-0" alt="El Magnetic Logo">
            </button>
            <img v-if="exportingMAS" class="offset-1 col-1 p-0" alt="loading" style="width: auto; height: 40px;" :src="$settingsStore.loadingGif">
            
            <div
                v-if="showExportButtons && !exportingAnsys"
                class="dropdown col-1 m-0 p-0 row"
                >
                <a
                    :style="$styleStore.controlPanel.button"
                    class="btn btn-secondary dropdown-toggle border-0 px-0"
                    href="#"
                    role="button" 
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                >
                    <img :src='ansysIcon' width="40" height="40" class="d-inline-block align-top m-0 p-0" alt="El Magnetic Logo">
                </a>

                <ul class="dropdown-menu m-0 p-0 row col-12">
                    <li><button
                        v-if="showExportButtons && !exportingAnsys"
                        :style="$styleStore.controlPanel.button"
                        class="btn px-0 py-0 col-12 row"
                        @click="exportAnsys('EddyCurrent')"
                    >
                        <div class="row col-12">
                            <img :src='ansysEddyCurrentsIcon' width="30" height="30" class="d-inline-block align-top m-0 p-0 col-3" alt="El Magnetic Logo">
                            <p class="col-9 my-0 py-0">EddyCurrents</p>
                        </div>
                      
                    </button></li>
                    <li><button
                        v-if="showExportButtons && !exportingAnsys"
                        :style="$styleStore.controlPanel.button"
                        class="btn px-0 py-0 col-12 row"
                        @click="exportAnsys('Transient')"
                    >
                        <div class="row">
                            <img :src='ansysTransientIcon' width="30" height="30" class="d-inline-block align-top m-0 p-0 col-3" alt="El Magnetic Logo">
                            <p class="col-9 my-0 py-0">Transient</p>
                        </div>
                      
                    </button></li>
                    <li><button
                        v-if="showExportButtons && !exportingAnsys"
                        :style="$styleStore.controlPanel.button"
                        class="btn px-0 py-0 col-12 row"
                        @click="exportAnsys('SteadyState')"
                    >
                        <div class="row">
                            <img :src='ansysThermalIcon' width="30" height="30" class="d-inline-block align-top m-0 p-0 col-3" alt="El Magnetic Logo">
                            <p class="col-9 my-0 py-0">Thermal</p>
                        </div>
                      
                    </button></li>

                </ul>
            </div>


            <img v-if="exportingAnsys" class="col-1 p-0" alt="loading" style="width: auto; height: 40px;" :src="$settingsStore.loadingGif">
            <button
                v-if="showExportButtons && !exportingSimba"
                :style="$styleStore.controlPanel.button"
                class="btn col-1  m-0 p-0"
                @click="exportSimba"
            >
              <img :src='simbaIcon' width="40" height="40" class="d-inline-block align-top m-0 p-0" alt="El Magnetic Logo">
            </button>
            <img v-if="exportingSimba" class="col-1 p-0" alt="loading" style="width: auto; height: 40px;" :src="$settingsStore.loadingGif">
            <div
                v-if="showExportButtons && !exportingLtspice"
                class="dropdown col-1 m-0 p-0 row"
                >
                <a
                    :style="$styleStore.controlPanel.button"
                    class="btn btn-secondary dropdown-toggle border-0 px-0"
                    href="#"
                    role="button" 
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                >
                    <img :src='ltspiceIcon' width="40" height="40" class="d-inline-block align-top m-0 p-0" alt="El Magnetic Logo">
                </a>

                <ul class="dropdown-menu m-0 p-0 col-12 row">
                    <li class=""><button
                        v-if="showExportButtons && !exportingAnsys"
                        :style="$styleStore.controlPanel.button"
                        class="btn px-0 py-0 col-12 row"
                        @click="exportLtspice('subcircuit')"
                    >
                        <div class="row col-12">
                            <img :src='ltspiceSymbolIcon' width="30" height="30" class="d-inline-block align-top m-0 p-0 col-3" alt="El Magnetic Logo">
                            <p class="col-9 my-0 py-0">Subcircuit</p>
                        </div>
                      
                    </button></li>
                    <li class=""><button
                        v-if="showExportButtons && !exportingAnsys"
                        :style="$styleStore.controlPanel.button"
                        class="btn px-0 py-0 row col-12"
                        @click="exportLtspice('symbol')"
                    >
                        <div class="row col-12">
                            <img :src='ltspiceSubcircuitIcon' width="30" height="30" class="d-inline-block align-top m-0 p-0 col-3" alt="El Magnetic Logo">
                            <p class="col-9 my-0 py-0">Symbol</p>
                        </div>
                      
                    </button></li>

                </ul>
            </div>
            <img v-if="exportingLtspice" class="col-1 p-0" alt="loading" style="width: auto; height: 40px;" :src="$settingsStore.loadingGif">
            <button
                v-if="showExportButtons && !exportingNgspice"
                :style="$styleStore.controlPanel.button"
                class="btn col-1  m-0 p-0"
                @click="exportNgspice"
            >
              <img :src='ngspiceIcon' width="40" height="40" class="d-inline-block align-top m-0 p-0" alt="El Magnetic Logo">
            </button>
            <img v-if="exportingNgspice" class="col-1 p-0" alt="loading" style="width: auto; height: 40px;" :src="$settingsStore.loadingGif">
            <div
                
                :class="showExportButtons? '' : 'offset-5'"
                class="dropdown col-3"
                >
                <a
                    :style="$styleStore.controlPanel.button"
                    class="btn btn-secondary dropdown-toggle"
                    href="#"
                    role="button" 
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                >
                    All exports
                </a>

                <ul class="dropdown-menu">
                    <li><button
                        :style="$styleStore.magneticBuilder.exportButton"
                        :data-cy="'MAS-exports-modal-button'"
                        class="dropdown-item btn btn-primary mx-auto d-block"
                        data-bs-toggle="modal"
                        data-bs-target="#MASExporterModal"
                    >
                        MAS Exports
                    </button></li>
                    <li><button
                        :style="$styleStore.magneticBuilder.exportButton"
                        :data-cy="'Core-exports-modal-button'"
                        class="dropdown-item btn btn-primary mx-auto d-block"
                        data-bs-toggle="modal"
                        data-bs-target="#CoreExporterModal"
                    >
                        Core Exports
                    </button></li>
                    <li><button
                        :style="$styleStore.magneticBuilder.exportButton"
                        :data-cy="'Coil-exports-modal-button'"
                        class="dropdown-item btn btn-primary mx-auto d-block"
                        data-bs-toggle="modal"
                        data-bs-target="#CoilExporterModal"
                    >
                        Coil Exports
                    </button></li>
                    <li><button
                        :style="$styleStore.magneticBuilder.exportButton"
                        :data-cy="'Circuit-Simulators-exports-modal-button'"
                        class="dropdown-item btn btn-danger mx-auto d-block"
                        data-bs-toggle="modal"
                        data-bs-target="#CircuitSimulatorsExporterModal"
                    >
                        Circuit Simulators Exports
                    </button></li>
                </ul>
            </div>

        </div>
    </div>
</template>
