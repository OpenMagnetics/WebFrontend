<script setup>
import { ref } from 'vue'
import * as Defaults from '/src/assets/js/defaults.js'
import * as Utils from '/src/assets/js/utils.js'
import { useCoreStore } from '/src/stores/core'
import * as download from 'downloadjs'

</script>
<script>

export default {
    data() {
        const coreStore = useCoreStore();
        const MASexported = ref(false)
        const STPexported = ref(false)
        const OBJexported = ref(false)

        const includeEffectiveParametersPicked = ref(0)
        const includeShapeDimensionsDataPicked = ref(0)
        const includeMaterialDataPicked = ref(0)
        const includeGeometricalDataPicked = ref(0)
        const includeMaximumDimensionsPicked = ref(0)
        const includeAdvancedGapDataPicked = ref(0)
        const includeAdvancedColumnDataPicked = ref(0)
        const includeAdvancedWindingWindowDataPicked = ref(0)
        const downloadOnlyPiecePicked = ref(0)

        return {
            coreStore,
            MASexported,
            STPexported,
            OBJexported,
            includeEffectiveParametersPicked,
            includeShapeDimensionsDataPicked,
            includeMaterialDataPicked,
            includeGeometricalDataPicked,
            includeMaximumDimensionsPicked,
            includeAdvancedGapDataPicked,
            includeAdvancedColumnDataPicked,
            includeAdvancedWindingWindowDataPicked,
            downloadOnlyPiecePicked,
        }
    },
    computed: {
        styleTooltip() {
            return {
                theme: {
                    placement: 'bottom',
                    width: '300px',
                    "text-align": "center",
                },
            }
        },
    },
    methods: {
        requestedMaterialData(event) {
            if (event.target.value == 1 && typeof(this.$userStore.globalCore['functionalDescription']['material']) == 'string') {
                const url = import.meta.env.VITE_API_ENDPOINT + '/get_material_data'
                const data = {name: this.$userStore.globalCore['functionalDescription']['material']}
                this.$axios.post(url, data)
                .then(response => {
                    this.$userStore.globalCore['functionalDescription']['material'] = response.data
                })
                .catch(error => {
                    console.error("Error getting material data")
                    console.error(error.data)
                });

            }
        },
        onExportSTP(event) {
            var url
            var data
            if (this.downloadOnlyPiecePicked == 1) {
                url = import.meta.env.VITE_API_ENDPOINT + '/core_compute_shape_stp'
                data = this.$userStore.globalCore['functionalDescription']['shape']
            }
            else {
                url = import.meta.env.VITE_API_ENDPOINT + '/core_compute_core_3d_model_stp'
                data = this.$userStore.globalCore
            }

            this.$axios.post(url, data)
            .then(response => {
                const exportedData = Utils.getCoreData(this.$userStore, Defaults.defaultCoreSaveConfiguration)
                download(response.data, exportedData["name"] + ".stp", "text/plain");
                this.$emit("exported")
                this.STPexported = true
                setTimeout(() => this.STPexported = false, 2000);
            })
            .catch(error => {
                console.error(error.data)
            });
        },
        onExportOBJ(event) {
            var url
            var data
            if (this.downloadOnlyPiecePicked == 1) {
                url = import.meta.env.VITE_API_ENDPOINT + '/core_compute_shape_obj'
                data = this.$userStore.globalCore['functionalDescription']['shape']
            }
            else {
                url = import.meta.env.VITE_API_ENDPOINT + '/core_compute_core_3d_model_obj'
                data = this.$userStore.globalCore
            }

            this.$axios.post(url, data)
            .then(response => {
                const exportedData = Utils.getCoreData(this.$userStore, Defaults.defaultCoreSaveConfiguration)
                download(response.data, exportedData["name"] + ".obj", "text/plain");
                this.$emit("exported")
                this.OBJexported = true
                setTimeout(() => this.OBJexported = false, 2000);
            })
            .catch(error => {
                console.error(error.data)
            });
        },
        onExport(event) {
            const configuration = {
                includeEffectiveParameters: this.includeEffectiveParametersPicked == 1,
                includeShapeDimensionsData: this.includeShapeDimensionsDataPicked == 1,
                includeMaterialData: this.includeMaterialDataPicked == 1,
                includeGeometricalData: this.includeGeometricalDataPicked == 1,
                includeMaximumDimensions: this.includeMaximumDimensionsPicked == 1,
                includeAdvancedGapData: this.includeAdvancedGapDataPicked == 1,
                includeAdvancedColumnData: this.includeAdvancedColumnDataPicked == 1,
                includeAdvancedWindingWindowData: this.includeAdvancedWindingWindowDataPicked == 1,
                downloadOnlyPiece: this.downloadOnlyPiecePicked == 1,
            }
            const exportedData = Utils.getCoreData(this.$userStore, configuration)
            download(JSON.stringify(exportedData, null, 4), exportedData["name"] + ".json", "text/plain");
            this.$emit("exported")
            this.MASexported = true
            setTimeout(() => this.MASexported = false, 2000);
        }

    }
}
</script>

<template>
    <div class="offcanvas offcanvas-end bg-light" tabindex="-1" id="CoreExportOffCanvas" aria-labelledby="CoreExportOffCanvasLabel">
    <div class="offcanvas-header">
        <h5 class="offcanvas-title text-white fs-3" id="CoreExportOffCanvasLabel">Export options</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="CoreExportOffCanvasLabelClose"></button>
    </div>
    <div v-tooltip="styleTooltip" class="offcanvas-body">
        <div class="accordion " id="accordionCoreExportAdvancedOptions">
            <div class="border-primary accordion-item bg-light">
                <h2 class="accordion-header bg-light" id="headingOne">
                    <button data-test="CoreExport-configuration-button" class="accordion-button bg-light text-primary border-primary collapsed fs-5" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                        Configuration
                    </button>
                </h2>
                <div id="collapseOne" class="accordion-collapse collapse bg-light text-primary" aria-labelledby="headingOne" data-bs-parent="#accordionAdvancedOptions">
                    <div class="container-flex bg-light text-white mt-2 mb-3 pb-3 me-2">
                        <div class="row">
                            <i class="fa-solid fa-xmark mt-2 pt-1 ps-2 text-danger offset-1 col-1 p-0"></i>
                            <input data-test="CoreExport-configuration-includeEffectiveParameters-button" v-model="includeEffectiveParametersPicked" type="range" class="mt-2 form-range col-1" min="0" max="1" step="1" style="width: 30px">
                            <i class="fa-solid fa-check mt-2 pt-1 text-success col-1 ps-3"></i>
                            <label v-tooltip="'Add the effective parameters of the shape to MAS file. More info: https://openmagnetics.com/musings/7'" class="fs-6 mt-2 p-0 ps-3 text-white col-7"> Add effective parameters?</label>
                        </div>
                    </div>
                    <div class="container-flex bg-light text-white mt-2 mb-3 pb-3 me-2">
                        <div class="row">
                            <i class="fa-solid fa-xmark mt-2 pt-1 ps-2 text-danger offset-1 col-1 p-0"></i>
                            <input data-test="CoreExport-configuration-includeShapeDimensionsData-button" v-model="includeShapeDimensionsDataPicked" type="range" class="mt-2 form-range col-1" min="0" max="1" step="1" style="width: 30px">
                            <i class="fa-solid fa-check mt-2 pt-1 text-success col-1 ps-3"></i>
                            <label v-tooltip="'Add the dimensions that define this shape to MAS file, according to IEC 60401'" class="fs-6 mt-2 p-0 ps-3 text-white col-7"> Add shape dimensions?</label>
                        </div>
                    </div>
                    <div class="container-flex bg-light text-white mt-2 mb-3 pb-3 me-2">
                        <div class="row">
                            <i class="fa-solid fa-xmark mt-2 pt-1 ps-2 text-danger offset-1 col-1 p-0"></i>
                            <input data-test="CoreExport-configuration-includeMaterialData-button" v-model="includeMaterialDataPicked" type="range" class="mt-2 form-range col-1" min="0" max="1" step="1" style="width: 30px" @change="requestedMaterialData"> 
                            <i class="fa-solid fa-check mt-2 pt-1 text-success col-1 ps-3"></i>
                            <label v-tooltip="'Add the material data to MAS file, not just the name'" class="fs-6 mt-2 p-0 ps-3 text-white col-7"> Add material data?</label>
                        </div>
                    </div>
                    <div class="container-flex bg-light text-white mt-2 mb-3 pb-3 me-2">
                        <div class="row">
                            <i class="fa-solid fa-xmark mt-2 pt-1 ps-2 text-danger offset-1 col-1 p-0"></i>
                            <input data-test="CoreExport-configuration-includeGeometricalData-button" v-model="includeGeometricalDataPicked" type="range" class="mt-2 form-range col-1" min="0" max="1" step="1" style="width: 30px">
                            <i class="fa-solid fa-check mt-2 pt-1 text-success col-1 ps-3"></i>
                            <label v-tooltip="'Add the geometrical description of each of the core parts to MAS file'" class="fs-6 mt-2 p-0 ps-3 text-white col-7"> Add geometrical data?</label>
                        </div>
                    </div>
                    <div class="container-flex bg-light text-white mt-2 mb-3 pb-3 me-2">
                        <div class="row">
                            <i class="fa-solid fa-xmark mt-2 pt-1 ps-2 text-danger offset-1 col-1 p-0"></i>
                            <input data-test="CoreExport-configuration-includeMaximumDimensions-button" v-model="includeMaximumDimensionsPicked" type="range" class="mt-2 form-range col-1" min="0" max="1" step="1" style="width: 30px">
                            <i class="fa-solid fa-check mt-2 pt-1 text-success col-1 ps-3"></i>
                            <label v-tooltip="'Add the maximum width, depth and height of the core to MAS file'" class="fs-6 mt-2 p-0 ps-3 text-white col-7"> Add maximum dimensions?</label>
                        </div>
                    </div>
                    <div class="container-flex bg-light text-white mt-2 mb-3 pb-3 me-2">
                        <div class="row">
                            <i class="fa-solid fa-xmark mt-2 pt-1 ps-2 text-danger offset-1 col-1 p-0"></i>
                            <input data-test="CoreExport-configuration-includeAdvancedGapData-button" v-model="includeAdvancedGapDataPicked" type="range" class="mt-2 form-range col-1" min="0" max="1" step="1" style="width: 30px">
                            <i class="fa-solid fa-check mt-2 pt-1 text-success col-1 ps-3"></i>
                            <label v-tooltip="'Add the advanced info for each gap, including anything necessary to calculate its reluctance, to MAS file'" class="fs-6 mt-2 p-0 ps-3 text-white col-7"> Add advanced info for gaps?</label>
                        </div>
                    </div>
                    <div class="container-flex bg-light text-white mt-2 mb-3 pb-3 me-2">
                        <div class="row">
                            <i class="fa-solid fa-xmark mt-2 pt-1 ps-2 text-danger offset-1 col-1 p-0"></i>
                            <input data-test="CoreExport-configuration-includeAdvancedColumnData-button" v-model="includeAdvancedColumnDataPicked" type="range" class="mt-2 form-range col-1" min="0" max="1" step="1" style="width: 30px">
                            <i class="fa-solid fa-check mt-2 pt-1 text-success col-1 ps-3"></i>
                            <label v-tooltip="'Add the advanced info for each column to MAS file'" class="fs-6 mt-2 p-0 ps-3 text-white col-7"> Add advanced info for columns?</label>
                        </div>
                    </div>
                    <div class="container-flex bg-light text-white mt-2 mb-3 pb-3 me-2">
                        <div class="row">
                            <i class="fa-solid fa-xmark mt-2 pt-1 ps-2 text-danger offset-1 col-1 p-0"></i>
                            <input data-test="CoreExport-configuration-includeAdvancedWindingWindowData-button" v-model="includeAdvancedWindingWindowDataPicked" type="range" class="mt-2 form-range col-1" min="0" max="1" step="1" style="width: 30px">
                            <i class="fa-solid fa-check mt-2 pt-1 text-success col-1 ps-3"></i>
                            <label v-tooltip="'Add the advanced info for each winding window, to MAS file'" class="fs-6 mt-2 p-0 ps-3 text-white col-7"> Add advanced info for winding windows?</label>
                        </div>
                    </div>
                    <div class="container-flex bg-light text-white mt-2 mb-3 pb-3 me-2">
                        <div class="row">
                            <i class="fa-solid fa-xmark mt-2 pt-1 ps-2 text-danger offset-1 col-1 p-0"></i>
                            <input data-test="CoreExport-configuration-downloadOnlyPiece-button" v-model="downloadOnlyPiecePicked" type="range" class="mt-2 form-range col-1" min="0" max="1" step="1" style="width: 30px">
                            <i class="fa-solid fa-check mt-2 pt-1 text-success col-1 ps-3"></i>
                            <label v-tooltip="'Add the advanced info for each winding window, to MAS file'" class="fs-6 mt-2 p-0 ps-3 text-white col-7"> Download just a piece instead of the full gapped core?</label>
                        </div>
                    </div>
                </div>
            </div>
        </div>


        <div class="container">
            <div class="row">
                <button data-test="CoreExport-export-MAS-button" class="mt-5 btn text-light bg-primary float-start fs-5 px-4 col-12" :disabled="MASexported" @click="onExport">{{MASexported? 'Exported' : 'Export data (MAS format)'}}</button>
                <button data-test="CoreExport-export-STP-button" class="mt-3 btn text-light bg-primary float-start fs-5 px-4 col-12" :disabled="STPexported" @click="onExportSTP">{{STPexported? 'Exported' : 'Export 3D (STP format)'}}</button>
                <button data-test="CoreExport-export-OBJ-button" class="mt-3 btn text-light bg-primary float-start fs-5 px-4 col-12" :disabled="OBJexported" @click="onExportOBJ">{{OBJexported? 'Exported' : 'Export 3D (OBJ format)'}}</button>
            
            </div>
        </div>
    </div>
</div>

</template>