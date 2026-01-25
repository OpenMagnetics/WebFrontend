<script setup>
import { useMasStore } from '../../../stores/mas'
import { useTaskQueueStore } from '../../../stores/taskQueue'
import { toTitleCase, removeTrailingZeroes, processCoreTexts, deepCopy, downloadBase64asPDF, clean, download } from '/WebSharedComponents/assets/js/utils.js'

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
        const taskQueueStore = useTaskQueueStore();
        const style = getComputedStyle(document.body);
        const theme = {
          primary: style.getPropertyValue('--bs-primary'),
          secondary: style.getPropertyValue('--bs-secondary'),
          success: style.getPropertyValue('--bs-success'),
          info: style.getPropertyValue('--bs-info'),
          warning: style.getPropertyValue('--bs-warning'),
          danger: style.getPropertyValue('--bs-danger'),
          light: style.getPropertyValue('--bs-light'),
          dark: style.getPropertyValue('--bs-dark'),
          white: style.getPropertyValue('--bs-white'),
        };
        const localTexts = {};
        return {
            masStore,
            taskQueueStore,
            theme,
            localTexts,
            masExported: false,
            STPExported: true,
            OBJExported: true,
            technicalDrawingExported: true,
        }
    },
    computed: {
    },
    mounted () {
        this.computeTexts();
    },
    methods: {
        exportMAS() {
            var masOnlyCore = deepCopy(this.masStore.mas);
            delete masOnlyCore.inputs;
            delete masOnlyCore.outputs;
            delete masOnlyCore.magnetic.coil.functionalDescription[0].wire;
            delete masOnlyCore.magnetic.coil.bobbin;
            delete masOnlyCore.magnetic.coil.layersDescription;
            delete masOnlyCore.magnetic.coil.sectionsDescription;
            delete masOnlyCore.magnetic.coil.turnsDescription;

            masOnlyCore = clean(masOnlyCore);

            download(JSON.stringify(masOnlyCore, null, 4), this.masStore.mas.magnetic.manufacturerInfo.reference + ".json", "text/plain");
            this.masExported = true
            setTimeout(() => this.masExported = false, 2000);
        },

        exportMASWithExcitations() {
            var masOnlyCore = deepCopy(this.masStore.mas);
            delete masOnlyCore.magnetic.coil.bobbin;
            delete masOnlyCore.magnetic.coil.functionalDescription[0].wire;
            delete masOnlyCore.magnetic.coil.layersDescription;
            delete masOnlyCore.magnetic.coil.sectionsDescription;
            delete masOnlyCore.magnetic.coil.turnsDescription;
            delete masOnlyCore.outputs.insulation;
            delete masOnlyCore.outputs.leakageInductance;
            delete masOnlyCore.outputs.strayCapacitance;
            delete masOnlyCore.outputs.temperature;
            delete masOnlyCore.outputs.windingWindowMagneticStrengthField;
            masOnlyCore = clean(masOnlyCore);

            download(JSON.stringify(masOnlyCore, null, 4), this.masStore.mas.magnetic.manufacturerInfo.reference + ".json", "text/plain");
            this.masExported = true
            setTimeout(() => this.masExported = false, 2000);
        },
        exportPDF() {
            this.STPExported = true;
            const url = import.meta.env.VITE_API_ENDPOINT + '/process_latex'
            this.$axios.post(url, this.computeLatex())
            .then(response => {
                downloadBase64asPDF(response.data, `${this.masStore.mas.magnetic.manufacturerInfo.reference}.pdf`)
                setTimeout(() => this.STPExported = false, 500);
            })
            .catch(error => {
                console.error("Error reading latex")
                console.error(error)
                this.STPExported = false;
            });
        },
        async computeTexts() {
            try {
                const materialName = this.masStore.mas.magnetic.core.functionalDescription.material;
                if (typeof materialName === 'string' || materialName instanceof String) {
                    var materialData = await this.taskQueueStore.getMaterialData(materialName);
                    this.masStore.mas.magnetic.core.functionalDescription.material = materialData;
                }
                var temperatureDependantData25 = await this.taskQueueStore.getCoreTemperatureDependantParameters(this.masStore.mas.magnetic.core, 25);
                var temperatureDependantData100 = await this.taskQueueStore.getCoreTemperatureDependantParameters(this.masStore.mas.magnetic.core, 100);
                const mas = deepCopy(this.masStore.mas);
                mas.magnetic.core.temp = {}
                mas.magnetic.core.temp["25"] = {}
                mas.magnetic.core.temp["25"].effectivePermeability = temperatureDependantData25["effectivePermeability"];
                mas.magnetic.core.temp["25"].initialPermeability = temperatureDependantData25["initialPermeability"];
                mas.magnetic.core.temp["25"].magneticFieldStrengthSaturation = temperatureDependantData25["magneticFieldStrengthSaturation"];
                mas.magnetic.core.temp["25"].magneticFluxDensitySaturation = temperatureDependantData25["magneticFluxDensitySaturation"];
                mas.magnetic.core.temp["25"].reluctance = temperatureDependantData25["reluctance"];
                mas.magnetic.core.temp["25"].resistivity = temperatureDependantData25["resistivity"];
                mas.magnetic.core.temp["100"] = {}
                mas.magnetic.core.temp["100"].effectivePermeability = temperatureDependantData100["effectivePermeability"];
                mas.magnetic.core.temp["100"].initialPermeability = temperatureDependantData100["initialPermeability"];
                mas.magnetic.core.temp["100"].magneticFieldStrengthSaturation = temperatureDependantData100["magneticFieldStrengthSaturation"];
                mas.magnetic.core.temp["100"].magneticFluxDensitySaturation = temperatureDependantData100["magneticFluxDensitySaturation"];
                mas.magnetic.core.temp["100"].reluctance = temperatureDependantData100["reluctance"];
                mas.magnetic.core.temp["100"].resistivity = temperatureDependantData100["resistivity"];
                this.localTexts = processCoreTexts(mas);
            } catch (error) { 
                console.error("Error reading material data")
                console.error(error)
            }
        },
    
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <div class="col-sm-12 col-md-2 text-start border border-primary" style="height: 75vh">
                <h2 v-if="masStore.mas.magnetic.manufacturerInfo.reference != '' && masStore.mas.magnetic.manufacturerInfo.reference != null" class="text-white fs-3 my-1 col-12">Summary for </h2>
                <h2 class="text-white fs-4 my-2 col-12">{{masStore.mas.magnetic.manufacturerInfo.reference}}</h2>


                <button :disabled="masExported" :data-cy="dataTestLabel + '-download-MAS-File-button'" class="btn btn-primary col-12 mt-4" @click="exportMAS"> Download MAS file </button>
                <button :disabled="masExported" :data-cy="dataTestLabel + '-download-MAS-Excitations-File-button'" class="btn btn-primary col-12 mt-4" @click="exportMASWithExcitations"> Download MAS file with excitations </button>
                <button :disabled="STPExported" :data-cy="dataTestLabel + '-download-STP-File-button'" class="btn btn-primary col-12 mt-4" @click="exportSTP"> Download STP model </button>
                <button :disabled="OBJExported" :data-cy="dataTestLabel + '-download-OBJ-File-button'" class="btn btn-primary col-12 mt-4" @click="exportOBJ"> Download OBJ model </button>
                <button :disabled="technicalDrawingExported" :data-cy="dataTestLabel + '-download-TechnicalDrawing-File-button'" class="btn btn-primary col-12 mt-4" @click="exportPDF"> Download Technical Drawing</button>
            </div>
            <div v-if="masStore.mas.magnetic.manufacturerInfo != null" class="col-sm-12 col-md-10 text-start pe-0 row">
                <h3 class="col-12 p-0 m-0 ps-3">{{masStore.mas.magnetic.manufacturerInfo.reference}}</h3>
                <div class="col-12 fs-5 p-0 m-0 mt-2 text-start ps-3">{{localTexts.coreDescription}}</div>
                <div class="offset-sm-0 offset-md-1 col-md-4 col-sm-11 my-4 pb-4">
                    <div class="row pb-4">
                        <div class="col-12 fs-5 p-0 m-0 my-1 text-center">Core Effective Parameters</div>
                        <div v-if="'effectiveParametersTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.effectiveParametersTable.effectiveLength.text}}</div>
                        <div v-if="'effectiveParametersTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.effectiveParametersTable.effectiveLength.value}}</div>
                        <div v-if="'effectiveParametersTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.effectiveParametersTable.effectiveArea.text}}</div>
                        <div v-if="'effectiveParametersTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.effectiveParametersTable.effectiveArea.value}}</div>
                        <div v-if="'effectiveParametersTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.effectiveParametersTable.effectiveVolume.text}}</div>
                        <div v-if="'effectiveParametersTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.effectiveParametersTable.effectiveVolume.value}}</div>
                        <div v-if="'effectiveParametersTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.effectiveParametersTable.minimumArea.text}}</div>
                        <div v-if="'effectiveParametersTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.effectiveParametersTable.minimumArea.value}}</div>
                    </div>
                </div>
                <div class="offset-sm-0 offset-md-1 col-md-4 col-sm-11 mt-4">
                    <div class="row">
                        <div class="col-12 fs-5 p-0 m-0 my-1 text-center">Material Parameters</div>
                        <div class="col-6 p-0 m-0 border text-center ps-2"></div>
                        <div class="col-3 p-0 m-0 border text-center">25°C</div>
                        <div class="col-3 p-0 m-0 border text-center">100°C</div>
                        <div v-if="'coreMaterialPermeanceTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialPermeanceTable.text}}</div>
                        <div v-if="'coreMaterialPermeanceTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialPermeanceTable.value_25}}</div>
                        <div v-if="'coreMaterialPermeanceTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialPermeanceTable.value_100}}</div>
                        <div v-if="'coreMaterialInitialPermeabilityTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialInitialPermeabilityTable.text}}</div>
                        <div v-if="'coreMaterialInitialPermeabilityTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialInitialPermeabilityTable.value_25}}</div>
                        <div v-if="'coreMaterialInitialPermeabilityTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialInitialPermeabilityTable.value_100}}</div>
                        <div v-if="'coreMaterialEffectivePermeabilityTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialEffectivePermeabilityTable.text}}</div>
                        <div v-if="'coreMaterialEffectivePermeabilityTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialEffectivePermeabilityTable.value_25}}</div>
                        <div v-if="'coreMaterialEffectivePermeabilityTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialEffectivePermeabilityTable.value_100}}</div>
                        <div v-if="'coreMaterialResistivityTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialResistivityTable.text}}</div>
                        <div v-if="'coreMaterialResistivityTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialResistivityTable.value_25}}</div>
                        <div v-if="'coreMaterialResistivityTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialResistivityTable.value_100}}</div>
                        <div v-if="'magneticFluxDensitySaturationTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.magneticFluxDensitySaturationTable.text}}</div>
                        <div v-if="'magneticFluxDensitySaturationTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.magneticFluxDensitySaturationTable.value_25}}</div>
                        <div v-if="'magneticFluxDensitySaturationTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.magneticFluxDensitySaturationTable.value_100}}</div>
                        <div v-if="'coreMaterialCurieTemperatureTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialCurieTemperatureTable.text}}</div>
                        <div v-if="'coreMaterialCurieTemperatureTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialCurieTemperatureTable.value}}</div>
                        <div v-if="'coreMaterialDensityTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialDensityTable.text}}</div>
                        <div v-if="'coreMaterialDensityTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialDensityTable.value}}</div>
                    </div>
                </div>
                <div class="col-12 fs-5 p-0 m-0 mt-4 text-start ps-3">{{localTexts.numberTurns}}</div>
                <div class="offset-sm-0 offset-md-1 col-md-4 col-sm-11 row mt-3" v-for="(operationPoint, operationPointIndex) in masStore.mas.inputs.operatingPoints" :key="operationPointIndex">
                    <div class="col-12 fs-5 p-0 m-0 my-1">{{operationPoint.name}}</div>
                    <div v-if="'magnetizingInductanceTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.magnetizingInductanceTable[operationPointIndex].text}}</div>
                    <div v-if="'magnetizingInductanceTable' in localTexts" class="col-4 p-0 m-0 border text-end pe-1">{{localTexts.magnetizingInductanceTable[operationPointIndex].value}}</div>
                    <div v-if="'coreLossesTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreLossesTable[operationPointIndex].text}}</div>
                    <div v-if="'coreLossesTable' in localTexts" class="col-4 p-0 m-0 border text-end pe-1">{{localTexts.coreLossesTable[operationPointIndex].value}}</div>
                    <div v-if="'coreTemperatureTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreTemperatureTable[operationPointIndex].text}}</div>
                    <div v-if="'coreTemperatureTable' in localTexts" class="col-4 p-0 m-0 border text-end pe-1">{{localTexts.coreTemperatureTable[operationPointIndex].value}}</div>
                    <div v-if="'dcResistanceTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.dcResistanceTable[operationPointIndex].text}}</div>
                    <div v-if="'dcResistanceTable' in localTexts" class="col-4 p-0 m-0 border text-end pe-1">{{localTexts.dcResistanceTable[operationPointIndex].value}}</div>
                    <div v-if="'windingLossesTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.windingLossesTable[operationPointIndex].text}}</div>
                    <div v-if="'windingLossesTable' in localTexts" class="col-4 p-0 m-0 border text-end pe-1">{{localTexts.windingLossesTable[operationPointIndex].value}}</div>
                </div>
            </div>

        </div>
    </div>
</template>
