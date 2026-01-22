<script setup>
import Module from '../../../assets/js/libCrossReferencers.wasm.js'
import { toTitleCase, removeTrailingZeroes, processCoreMaterialTexts, deepCopy, downloadBase64asPDF, clean } from '/WebSharedComponents/assets/js/utils.js'

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
        coreMaterial: {
            type: Object,
            required: true,
        },
        temperature: {
            type: Number,
            required: true,
        },
        loadingGif: {
            type: String,
            default: "/images/loading.gif",
        },
    },
    data() {
        const localTexts = {};
        return {
            localTexts,
        }
    },
    computed: {
        getTempDependentGridWidth() {
            if (this.temperature == 25 || this.temperature == 100) {
                return "col-3"
            }
            else {
                return "col-2"
            }
        }
    },
    watch: {
        coreMaterial(newValue, oldValue) {
            this.computeTexts();
        },
    },
    mounted () {
        this.computeTexts();
    },
    methods: {
        computeTexts() {
            crossReferencers.ready.then(_ => {

                var temperatureDependantData25 = JSON.parse(crossReferencers.get_core_material_temperature_dependant_parameters(JSON.stringify(this.coreMaterial), 25));
                var temperatureDependantData100 = JSON.parse(crossReferencers.get_core_material_temperature_dependant_parameters(JSON.stringify(this.coreMaterial), 100));
                var temperatureDependantDataRef = JSON.parse(crossReferencers.get_core_material_temperature_dependant_parameters(JSON.stringify(this.coreMaterial), this.temperature));

                const coreMaterial = deepCopy(this.coreMaterial);

                coreMaterial.temp = {}
                coreMaterial.temp["25"] = {}
                coreMaterial.temp["25"].initialPermeability = temperatureDependantData25["initialPermeability"];
                coreMaterial.temp["25"].magneticFieldStrengthSaturation = temperatureDependantData25["magneticFieldStrengthSaturation"];
                coreMaterial.temp["25"].magneticFluxDensitySaturation = temperatureDependantData25["magneticFluxDensitySaturation"];
                coreMaterial.temp["25"].resistivity = temperatureDependantData25["resistivity"];
                coreMaterial.temp["25"].remanence = temperatureDependantData25["remanence"];
                coreMaterial.temp["25"].coerciveForce = temperatureDependantData25["coerciveForce"];
                coreMaterial.temp["100"] = {}
                coreMaterial.temp["100"].initialPermeability = temperatureDependantData100["initialPermeability"];
                coreMaterial.temp["100"].magneticFieldStrengthSaturation = temperatureDependantData100["magneticFieldStrengthSaturation"];
                coreMaterial.temp["100"].magneticFluxDensitySaturation = temperatureDependantData100["magneticFluxDensitySaturation"];
                coreMaterial.temp["100"].resistivity = temperatureDependantData100["resistivity"];
                coreMaterial.temp["100"].remanence = temperatureDependantData100["remanence"];
                coreMaterial.temp["100"].coerciveForce = temperatureDependantData100["coerciveForce"];
                coreMaterial.temp[this.temperature] = {}
                coreMaterial.temp[this.temperature].initialPermeability = temperatureDependantDataRef["initialPermeability"];
                coreMaterial.temp[this.temperature].magneticFieldStrengthSaturation = temperatureDependantDataRef["magneticFieldStrengthSaturation"];
                coreMaterial.temp[this.temperature].magneticFluxDensitySaturation = temperatureDependantDataRef["magneticFluxDensitySaturation"];
                coreMaterial.temp[this.temperature].resistivity = temperatureDependantDataRef["resistivity"];
                coreMaterial.temp[this.temperature].remanence = temperatureDependantDataRef["remanence"];
                coreMaterial.temp[this.temperature].coerciveForce = temperatureDependantDataRef["coerciveForce"];

                this.localTexts = processCoreMaterialTexts(coreMaterial);
            }).catch(error => { 
                console.error("Error reading material data")
                console.error(error)
            });
        },
        onExport(filename) {
            // Export completed
        },
    
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <h3 class="col-12 p-0 m-0 ps-3">{{coreMaterial.manufacturerInfo.reference}}</h3>
        </div>
        <div class="row">
            <div v-if="coreMaterial.manufacturerInfo != null" class="col-sm-12 col-md-12 text-start pe-0 row">
                <div class="col-12 mt-2">
                    <div class="row">
                        <div class="col-12 fs-5 p-0 m-0 my-1 text-center">Product data</div>
                        <div v-if="'coreMaterialManufacturerNameTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialManufacturerNameTable.text}}</div>
                        <div v-if="'coreMaterialManufacturerNameTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialManufacturerNameTable.value}}</div>
                        <div v-if="'coreMaterialManufacturerReferenceTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialManufacturerReferenceTable.text}}</div>
                        <div v-if="'coreMaterialManufacturerReferenceTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialManufacturerReferenceTable.value}}</div>
                        <div v-if="'coreMaterialManufacturerDatasheetTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialManufacturerDatasheetTable.text}}</div>
                        <a :href="localTexts.coreMaterialManufacturerDatasheetTable.value" target="_blank" rel="noopener noreferrer" v-if="'coreMaterialManufacturerDatasheetTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">Link</a>
                        <div class="col-12 fs-5 p-0 m-0 my-1 text-center">Material Parameters</div>
                        <div class="col-6 p-0 m-0 border text-center ps-2"></div>
                        <div :class="getTempDependentGridWidth" class="p-0 m-0 border text-center">25°C</div>
                        <div :class="getTempDependentGridWidth" v-if="temperature != 25 && temperature != 100" class="p-0 m-0 border text-center">{{temperature + '°C'}}</div>
                        <div :class="getTempDependentGridWidth" class="p-0 m-0 border text-center">100°C</div>
                        <div v-if="'coreMaterialPermeanceTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialPermeanceTable.text}}</div>
                        <div v-if="'coreMaterialPermeanceTable' in localTexts" :class="getTempDependentGridWidth" class="p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialPermeanceTable.value["25"]}}</div>
                        <div v-if="'coreMaterialPermeanceTable' in localTexts && temperature != 25 && temperature != 100" :class="getTempDependentGridWidth" class="p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialPermeanceTable.value[temperature]}}</div>
                        <div v-if="'coreMaterialPermeanceTable' in localTexts" :class="getTempDependentGridWidth" class="p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialPermeanceTable.value["100"]}}</div>
                        <div v-if="'coreMaterialInitialPermeabilityTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialInitialPermeabilityTable.text}}</div>
                        <div v-if="'coreMaterialInitialPermeabilityTable' in localTexts" :class="getTempDependentGridWidth" class="p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialInitialPermeabilityTable.value["25"]}}</div>
                        <div v-if="'coreMaterialInitialPermeabilityTable' in localTexts && temperature != 25 && temperature != 100" :class="getTempDependentGridWidth" class="p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialInitialPermeabilityTable.value[temperature]}}</div>
                        <div v-if="'coreMaterialInitialPermeabilityTable' in localTexts" :class="getTempDependentGridWidth" class="p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialInitialPermeabilityTable.value["100"]}}</div>
                        <div v-if="'coreMaterialResistivityTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialResistivityTable.text}}</div>
                        <div v-if="'coreMaterialResistivityTable' in localTexts" :class="getTempDependentGridWidth" class="p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialResistivityTable.value["25"]}}</div>
                        <div v-if="'coreMaterialResistivityTable' in localTexts && temperature != 25 && temperature != 100" :class="getTempDependentGridWidth" class="p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialResistivityTable.value[temperature]}}</div>
                        <div v-if="'coreMaterialResistivityTable' in localTexts" :class="getTempDependentGridWidth" class="p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialResistivityTable.value["100"]}}</div>
                        <div v-if="'coreMaterialRemanenceTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialRemanenceTable.text}}</div>
                        <div v-if="'coreMaterialRemanenceTable' in localTexts" :class="getTempDependentGridWidth" class="p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialRemanenceTable.value["25"]}}</div>
                        <div v-if="'coreMaterialRemanenceTable' in localTexts && temperature != 25 && temperature != 100" :class="getTempDependentGridWidth" class="p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialRemanenceTable.value[temperature]}}</div>
                        <div v-if="'coreMaterialRemanenceTable' in localTexts" :class="getTempDependentGridWidth" class="p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialRemanenceTable.value["100"]}}</div>
                        <div v-if="'coreMaterialCoerciveForceTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialCoerciveForceTable.text}}</div>
                        <div v-if="'coreMaterialCoerciveForceTable' in localTexts" :class="getTempDependentGridWidth" class="p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialCoerciveForceTable.value["25"]}}</div>
                        <div v-if="'coreMaterialCoerciveForceTable' in localTexts && temperature != 25 && temperature != 100" :class="getTempDependentGridWidth" class="p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialCoerciveForceTable.value[temperature]}}</div>
                        <div v-if="'coreMaterialCoerciveForceTable' in localTexts" :class="getTempDependentGridWidth" class="p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialCoerciveForceTable.value["100"]}}</div>
                        <div v-if="'magneticFluxDensitySaturationTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.magneticFluxDensitySaturationTable.text}}</div>
                        <div v-if="'magneticFluxDensitySaturationTable' in localTexts" :class="getTempDependentGridWidth" class="p-0 m-0 border text-end pe-1">{{localTexts.magneticFluxDensitySaturationTable.value["25"]}}</div>
                        <div v-if="'magneticFluxDensitySaturationTable' in localTexts && temperature != 25 && temperature != 100" :class="getTempDependentGridWidth" class="p-0 m-0 border text-end pe-1">{{localTexts.magneticFluxDensitySaturationTable.value[temperature]}}</div>
                        <div v-if="'magneticFluxDensitySaturationTable' in localTexts" :class="getTempDependentGridWidth" class="p-0 m-0 border text-end pe-1">{{localTexts.magneticFluxDensitySaturationTable.value["100"]}}</div>
                        <div v-if="'coreMaterialCurieTemperatureTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialCurieTemperatureTable.text}}</div>
                        <div v-if="'coreMaterialCurieTemperatureTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialCurieTemperatureTable.value}}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
