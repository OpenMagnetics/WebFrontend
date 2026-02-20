<script setup>
import { useMasStore } from '../../stores/mas'
import { useHistoryStore } from '../../stores/history'
import { useTaskQueueStore } from '../../stores/taskQueue'
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
        return {
            masStore,
            historyStore,
            taskQueueStore,

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
            isHighPerformanceBackendAvailable,

            masIcon,
            ansysIcon,
            simbaIcon,
            ltspiceIcon,
            ngspiceIcon,
        }
    },
    computed: {
        ambientTemperature() {
            if (this.masStore.mas.inputs.operatingPoints[this.$stateStore.currentOperatingPoint] != null) {
                return this.masStore.mas.inputs.operatingPoints[this.$stateStore.currentOperatingPoint].conditions.ambientTemperature;
            }
            else {
                return 25;
            }
        },
        reference() {
            if (this.masStore.mas.magnetic.manufacturerInfo.reference != "") {
                return this.masStore.mas.magnetic.manufacturerInfo.reference;
            }
            else {
                return "custom_magnetic";
            }
        },
        isMagneticComplete() {
            if (this.masStore.mas.magnetic.coil.turnsDescription != null) {
                return true;
            }
            else {
                return false;
            }
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
                    var blob = new Blob([subcircuit], {
                        type: 'text/csv; charset=utf-8'
                    });
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

            }
            else {
                this.exportingSimba = true
                setTimeout(() => this.createSimbaSubcircuit(), 20);
                setTimeout(() => this.exportingSimba = false, 2000);
            }
        },
        async createSimbaSubcircuit() {
            try {
                var subcircuit = await this.taskQueueStore.exportMagneticAsSubcircuit(this.masStore.mas.magnetic, this.ambientTemperature, "SIMBA", "");
                var blob = new Blob([subcircuit], {
                    type: 'text/csv; charset=utf-8'
                });
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
                    var blob = new Blob([subcircuit], {
                        type: 'text/csv; charset=utf-8'
                    });
                    const filename = reference;
                    download(blob, filename + ".cir", "text/csv; charset=utf-8");
                }
                else {
                    var subcircuit = await this.taskQueueStore.exportMagneticAsSymbol(magnetic, "LtSpice", "");
                    var blob = new Blob([subcircuit], {
                        type: 'text/csv; charset=utf-8'
                    });
                    const filename = reference;
                    download(blob, filename + ".asy", "text/csv; charset=utf-8");
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
                var subcircuit = await this.taskQueueStore.exportMagneticAsSubcircuit(magnetic, this.ambientTemperature, "LtSpice", "");
                var blob = new Blob([subcircuit], {
                    type: 'text/csv; charset=utf-8'
                });
                const filename = reference;
                download(blob, filename + ".cir", "text/csv; charset=utf-8");
                setTimeout(() => this.exportingNgspice = false, 2000);

            } catch (error) {
                setTimeout(() => this.exportingNgspice = false, 200);
                console.error(error);
            }
        },
        async reset(isPlanar) {
            this.masStore.resetMas('power');
            this.$stateStore.closeCoilAdvancedInfo();
            if (isPlanar) {
                this.masStore.mas.inputs.designRequirements.wiringTechnology = "Printed";
            }
            else {
                this.masStore.mas.inputs.designRequirements.wiringTechnology = "Wound";
            }
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
    }
}
</script>

<template>

    <div class="container" :style="$styleStore.controlPanel.main">
        <CoreExporter :data-cy="dataTestLabel + '-CoreExporter'"/>
        <CoilExporter :data-cy="dataTestLabel + '-CoilExporter'" />
        <MASExporter :data-cy="dataTestLabel + '-MASExporter'" />
        <CircuitSimulatorsExporter :data-cy="dataTestLabel + '-CircuitSimulatorsExporter'" />
        <input data-cy="ControlPanel-Simba-file-button" type="file" ref="simbaFileReader" @change="readSimbaFile()" class="btn btn-primary mt-1 rounded-3" hidden />
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
            <div
                v-if="showResetButton"
                class="dropdown col-1 m-0 px-0 row"
                >
                <a
                    :style="$styleStore.controlPanel.button"
                    class="btn btn-secondary dropdown-toggle border-0 px-0 pt-2"
                    href="#"
                    role="button" 
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                >
                    <i class="fa-solid fa-power-off"></i>
                </a>

                <ul 
                    :style="$styleStore.controlPanel.button"
                    class="dropdown-menu m-0 p-0 row col-12">
                    <li><button
                        v-if="showResetButton"
                        :style="$styleStore.controlPanel.button"
                        class="btn px-0 py-0 col-12 row"
                        @click="reset(false)"
                    >
                        <div class="row col-12">
                            <i class="col-3 fa-solid fa-ring pt-1"></i>
                            <p class="col-9 my-0">Wound</p>
                        </div>
                      
                    </button></li>
                    <li><button
                        v-if="showResetButton"
                        :style="$styleStore.controlPanel.button"
                        class="btn px-0 py-0 col-12 row"
                        @click="reset(true)"
                    >
                        <div class="row">
                            <i class="col-3 fa-solid fa-layer-group pt-1"></i>
                            <p class="col-9 my-0 py-0">Planar</p>
                        </div>
                      
                    </button></li>

                </ul>
            </div>
            <button
                v-if="showExportButtons && !exportingMAS && isMagneticComplete"
                :style="$styleStore.controlPanel.button"
                class="btn col-1 offset-1 p-0"
                @click="exportMASFile"
            >
              <img :src='masIcon' width="30" height="30" class="d-inline-block align-top m-0 p-0" alt="El Magnetic Logo">
            </button>
            <div
                v-if="!isMagneticComplete"
                class="col-1 offset-1 p-0"
            />

            <img v-if="exportingMAS" class="offset-1 col-1 p-0" alt="loading" style="width: auto; height: 30px;" :src="$settingsStore.loadingGif">
            
            <div
                v-if="showExportButtons && !exportingAnsys && showAnsysButtons && isMagneticComplete"
                :class="isHighPerformanceBackendAvailable? 'dropdown' : ''"
                class="col-1 m-0 p-0 row"
                >
                <a
                    v-if="isHighPerformanceBackendAvailable"
                    :style="$styleStore.controlPanel.button"
                    :class="isHighPerformanceBackendAvailable? 'dropdown-toggle' : ''"
                    class="btn btn-secondary border-0 px-0"
                    href="#"
                    role="button" 
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                >
                    <img :src='ansysIcon' width="30" height="30" class="d-inline-block align-top m-0 p-0" alt="El Magnetic Logo" :style="`opacity: ${isHighPerformanceBackendAvailable? 1 : 0.2}`">
                </a>
                <div
                    v-else
                    :style="$styleStore.controlPanel.button"
                    class="border-0 px-0 py-2"
                >
                    <img :src='ansysIcon' width="30" height="30" class="d-inline-block align-top m-0 p-0" alt="El Magnetic Logo" :style="`opacity: ${isHighPerformanceBackendAvailable? 1 : 0.2}`">
                </div>

                <ul 
                    v-if="isHighPerformanceBackendAvailable"
                    :style="$styleStore.controlPanel.button"
                    class="dropdown-menu m-0 p-0 row col-12">
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

            <div
                v-if="!isMagneticComplete"
                class="col-1 p-0"
            />

            <img v-if="exportingAnsys" class="col-1 p-0" alt="loading" style="width: auto; height: 30px;" :src="$settingsStore.loadingGif">
            <div
                v-if="showExportButtons && !exportingSimba && isMagneticComplete"
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
                    <img :src='simbaIcon' width="30" height="30" class="d-inline-block align-top m-0 p-0" alt="El Magnetic Logo">
                </a>

                <ul
                    :style="$styleStore.controlPanel.button"
                    class="dropdown-menu m-0 p-0 col-12 row">
                    <li class=""><button
                        v-if="showExportButtons && !exportingSimba"
                        :style="$styleStore.controlPanel.button"
                        class="btn px-0 py-0 col-12 row"
                        @click="exportSimba(true)"
                    >
                        <div class="row col-12">
                            <img :src='simbaIcon' width="30" height="30" class="d-inline-block align-top m-0 p-0 col-3" alt="El Magnetic Logo">
                            <p class="col-9 my-0 py-0">Attach to file</p>
                        </div>
                      
                    </button></li>
                    <li class=""><button
                        v-if="showExportButtons && !exportingSimba"
                        :style="$styleStore.controlPanel.button"
                        class="btn px-0 py-0 row col-12"
                        @click="exportSimba(false)"
                    >
                        <div class="row col-12">
                            <img :src='simbaIcon' width="30" height="30" class="d-inline-block align-top m-0 p-0 col-3" alt="El Magnetic Logo">
                            <p class="col-9 my-0 py-0">Download library</p>
                        </div>
                      
                    </button></li>

                </ul>
            </div>
            <div
                v-if="!isMagneticComplete"
                class="col-1 p-0"
            />
            <img v-if="exportingSimba" class="col-1 p-0" alt="loading" style="width: auto; height: 30px;" :src="$settingsStore.loadingGif">
            <div
                v-if="showExportButtons && !exportingLtspice && isMagneticComplete"
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
                    <img :src='ltspiceIcon' width="30" height="30" class="d-inline-block align-top m-0 p-0" alt="El Magnetic Logo">
                </a>

                <ul
                    :style="$styleStore.controlPanel.button"
                    class="dropdown-menu m-0 p-0 col-12 row">
                    <li class=""><button
                        v-if="showExportButtons && !exportingLtspice"
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
                        v-if="showExportButtons && !exportingLtspice"
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
            <div
                v-if="!isMagneticComplete"
                class="col-1 p-0"
            />
            <img v-if="exportingLtspice" class="col-1 p-0" alt="loading" style="width: auto; height: 30px;" :src="$settingsStore.loadingGif">
            <button
                v-if="showExportButtons && !exportingNgspice && isMagneticComplete"
                :style="$styleStore.controlPanel.button"
                class="btn col-1  m-0 p-0"
                @click="exportNgspice"
            >
              <img :src='ngspiceIcon' width="30" height="30" class="d-inline-block align-top m-0 p-0" alt="El Magnetic Logo">
            </button>
            <div
                v-if="!isMagneticComplete"
                class="col-1 p-0"
            />
            <img v-if="exportingNgspice" class="col-1 p-0" alt="loading" style="width: auto; height: 30px;" :src="$settingsStore.loadingGif">
            <div
                v-if="showExportButtons && isMagneticComplete"
                :class="showExportButtons? showAnsysButtons? '' : 'offset-1' : 'offset-5'"
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
            <div
                v-if="!isMagneticComplete"
                class="col-3 p-0"
            />

        </div>
    </div>
</template>
