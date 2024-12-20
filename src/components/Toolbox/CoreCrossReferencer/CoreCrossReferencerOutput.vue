<script setup>
import Module from '/src/assets/js/libCrossReferencers.wasm.js'
import { toTitleCase, removeTrailingZeroes, processCoreTexts, deepCopy, downloadBase64asPDF, clean, download } from '/WebSharedComponents/assets/js/utils.js'
import Core3DVisualizer from '/WebSharedComponents/Common/Core3DVisualizer.vue'
import CoreSTPExporter from '/src/components/Exporters/CoreSTPExporter.vue'
import CoreOBJExporter from '/src/components/Exporters/CoreOBJExporter.vue'
import CoreTechnicalDrawingExporter from '/src/components/Exporters/CoreTechnicalDrawingExporter.vue'

</script>

<script>
var crossReferencers = {
    ready: new Promise(resolve => {
        Module({
            onRuntimeInitialized () {
                crossReferencers = Object.assign(this, {
                    ready: Promise.resolve()
                });
                resolve();
            }
        });
    })
};

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        mas: {
            type: Object,
            required: true,
        },
        loadingGif: {
            type: String,
            default: "/images/loading.gif",
        },
    },
    data() {
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
            theme,
            localTexts,
            masExported: false,
            STPExported: false,
            OBJExported: false,
            technicalDrawingExported: false,
        }
    },
    computed: {
    },
    watch: {
        mas(newValue, oldValue) {
            this.computeTexts();
        },
    },
    mounted () {
        this.computeTexts();
    },
    methods: {
        exportMAS() {
            var masOnlyCore = deepCopy(this.mas);
            delete masOnlyCore.inputs;
            delete masOnlyCore.outputs;
            delete masOnlyCore.magnetic.coil.functionalDescription[0].wire;
            delete masOnlyCore.magnetic.coil.bobbin;
            delete masOnlyCore.magnetic.coil.layersDescription;
            delete masOnlyCore.magnetic.coil.sectionsDescription;
            delete masOnlyCore.magnetic.coil.turnsDescription;

            masOnlyCore = clean(masOnlyCore);

            download(JSON.stringify(masOnlyCore, null, 4), this.mas.magnetic.manufacturerInfo.reference + ".json", "text/plain");
            this.masExported = true
            setTimeout(() => this.masExported = false, 2000);
        },

        exportMASWithExcitations() {
            var masOnlyCore = deepCopy(this.mas);
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

            download(JSON.stringify(masOnlyCore, null, 4), this.mas.magnetic.manufacturerInfo.reference + ".json", "text/plain");
            this.masExported = true
            setTimeout(() => this.masExported = false, 2000);
        },
        exportPDF() {
            this.STPExported = true;
            const url = import.meta.env.VITE_API_ENDPOINT + '/process_latex'
            this.$axios.post(url, this.computeLatex())
            .then(response => {
                downloadBase64asPDF(response.data, `${this.mas.magnetic.manufacturerInfo.reference}.pdf`)
                setTimeout(() => this.STPExported = false, 500);
            })
            .catch(error => {
                console.error("Error reading latex")
                console.error(error)
                this.STPExported = false;
            });
        },
        computeTexts() {
            crossReferencers.ready.then(_ => {
                const materialName = this.mas.magnetic.core.functionalDescription.material;

                if (this.mas.magnetic.core.gapping == undefined) {
                    this.mas.magnetic.core.gapping = []
                }

                const aux = deepCopy(this.mas.magnetic.core);
                aux['geometricalDescription'] = null;
                aux['processedDescription'] = null;
                this.mas.magnetic.core = JSON.parse(crossReferencers.calculate_core_data(JSON.stringify(aux), true));


                // if (typeof materialName === 'string' || materialName instanceof String) {
                //     var materialData = JSON.parse(crossReferencers.get_material_data(materialName));
                //     this.mas.magnetic.core.functionalDescription.material = materialData;
                // }
                // this.mas.magnetic.core.processedDescription = null;

                var temperatureDependantData25 = JSON.parse(crossReferencers.get_core_temperature_dependant_parameters(JSON.stringify(this.mas.magnetic.core), 25));
                var temperatureDependantData100 = JSON.parse(crossReferencers.get_core_temperature_dependant_parameters(JSON.stringify(this.mas.magnetic.core), 100));
                const mas = deepCopy(this.mas);
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
            }).catch(error => { 
                console.error("Error reading material data")
                console.error(error)
            });
        },
        onExport(filename) {
            console.log("Exported" + filename);
        },
    
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <h3 class="col-12 p-0 m-0 ps-3">{{mas.magnetic.manufacturerInfo.reference}}</h3>
        </div>
        <div class="row" style="height: 30vh">
            <Core3DVisualizer 
                :dataTestLabel="`${dataTestLabel}-CoreCrossReferencerCore3DVisualizer`"
                :core="mas.magnetic.core"
                :fullCoreModel="true"
                :loadingGif="loadingGif"
            />
        </div>
        <div class="row">
            <div v-if="mas.magnetic.manufacturerInfo != null" class="col-sm-12 col-md-12 text-start pe-0 row">
                <div class="col-12 mt-2">
                    <div class="row">
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
                <div class="col-12 mt-2">
                    <div class="row">
                        <div class="col-12 fs-5 p-0 m-0 my-1 text-center">Product data</div>
                        <div v-if="'coreMaterialManufacturerNameTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialManufacturerNameTable.text}}</div>
                        <div v-if="'coreMaterialManufacturerNameTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialManufacturerNameTable.value}}</div>
                        <div v-if="'coreMaterialManufacturerReferenceTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialManufacturerReferenceTable.text}}</div>
                        <div v-if="'coreMaterialManufacturerReferenceTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialManufacturerReferenceTable.value}}</div>
                        <div v-if="'coreMaterialManufacturerDatasheetTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialManufacturerDatasheetTable.text}}</div>
                        <a :href="localTexts.coreMaterialManufacturerDatasheetTable.value" target="_blank" v-if="'coreMaterialManufacturerDatasheetTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">Link</a>
                        <div v-if="'coreMaterialManufacturerMaterialDatasheetTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialManufacturerMaterialDatasheetTable.text}}</div>
                        <a :href="localTexts.coreMaterialManufacturerMaterialDatasheetTable.value" target="_blank" v-if="'coreMaterialManufacturerMaterialDatasheetTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">Link</a>
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
            </div>
        </div>
        <div class=" row text-start">
            <CoreSTPExporter
                class="btn btn-primary col-4 mt-4"
                :data-cy="dataTestLabel + '-download-STP-File-button'"
                :core="mas.magnetic.core"
                :fullCoreModel="true"
                @export="onExport"
            />
            <CoreOBJExporter
                class="btn btn-primary col-4 mt-4"
                :data-cy="dataTestLabel + '-download-STP-File-button'"
                :core="mas.magnetic.core"
                :fullCoreModel="true"
                @export="onExport"
            />
            <CoreTechnicalDrawingExporter
                class="btn btn-primary col-4 mt-4"
                :data-cy="dataTestLabel + '-download-STP-File-button'"
                :core="mas.magnetic.core"
                :fullCoreModel="true"
                @export="onExport"
            />
        </div>
    </div>
</template>
