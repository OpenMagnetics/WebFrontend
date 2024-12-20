<script setup>
import { useMasStore } from '/src/stores/mas'
import { toTitleCase, removeTrailingZeroes, formatUnit, formatDimension, formatTemperature, formatInductance,
         formatPower, formatResistance, deepCopy, downloadBase64asPDF, clean, download } from '/WebSharedComponents/assets/js/utils.js'
import Magnetic2DVisualizer from '/WebSharedComponents/Common/Magnetic2DVisualizer.vue'
import Module from '/src/assets/js/libAdvisers.wasm.js'

</script>

<script>
var magneticAdviser = {
    ready: new Promise(resolve => {
        Module({
            onRuntimeInitialized () {
                magneticAdviser = Object.assign(this, {
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
    },
    data() {
        const masStore = useMasStore();
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
            theme,
            localTexts,
            masExported: false,
            Core3DExported: false,
            MagneticSectionPlotExported: false,
            MagneticSectionAndFieldPlotExported: false,
            showFieldPlot: false,
            includeFringing: true,
        }
    },
    computed: {
    },
    watch: { 
    },
    mounted () {
        this.computeTexts();
        setTimeout(() => this.insertMas(), 2000);
    },
    methods: {
        swapFieldPlot() {
            this.showFieldPlot = !this.showFieldPlot;
        },
        swapIncludeFringing() {
            this.includeFringing = !this.includeFringing;
        },
        exportMAS() {
            var mas = deepCopy(this.masStore.mas);
            delete mas.inputs;
            delete mas.outputs;

            mas = clean(mas);

            download(JSON.stringify(mas, null, 4), this.masStore.mas.magnetic.manufacturerInfo.reference + ".json", "text/plain");
            this.masExported = true
            setTimeout(() => this.masExported = false, 2000);
        },
        exportCore3D(format) {

            this.$mkf.ready.then(_ => {
                var url;
                if (format == "STP") {
                    url = import.meta.env.VITE_API_ENDPOINT + '/core_compute_core_3d_model_stp';
                }
                else if (format == "OBJ") {
                    url = import.meta.env.VITE_API_ENDPOINT + '/core_compute_core_3d_model_obj';
                }
                if (this.masStore.mas.magnetic.core.functionalDescription.shape.familySubtype == null) {
                    this.masStore.mas.magnetic.core.functionalDescription.shape.familySubtype = "1";
                }

                const aux = deepCopy( this.masStore.mas.magnetic.core);
                aux['geometricalDescription'] = null;
                aux['processedDescription'] = null;
                var core = JSON.parse(this.$mkf.calculate_core_data(JSON.stringify(aux), false));

                console.log(core);

                this.$axios.post(url, core)
                .then(response => {
                    if (format == "STP") {
                        download(response.data, this.masStore.mas.magnetic.core.name + ".stp", "text/plain");
                    }
                    else if (format == "OBJ") {
                        download(response.data, this.masStore.mas.magnetic.core.name + ".obj", "text/plain");
                    }
                    this.Core3DExported = true;
                    setTimeout(() => this.Core3DExported = false, 2000);
                })
                .catch(error => {
                    console.error(error.data)
                });

            }).catch(error => {
                console.error(error);
            });

        },
        exportMASWithExcitations() {
            var mas = deepCopy(this.masStore.mas);

            mas = clean(mas);

            download(JSON.stringify(mas, null, 4), this.masStore.mas.magnetic.manufacturerInfo.reference + ".json", "text/plain");
            this.masExported = true
            setTimeout(() => this.masExported = false, 2000);
        },
        exportMagneticSectionPlot() {
            const url = import.meta.env.VITE_API_ENDPOINT + '/plot_core'

            this.$axios.post(url, {magnetic: this.masStore.mas.magnetic, operatingPoint: this.masStore.mas.inputs.operatingPoints[0]})
            .then(response => {
                download(response.data, this.masStore.mas.magnetic.manufacturerInfo.reference + "_Magnetic_Section.svg", "image/svg+xml");
                this.MagneticSectionPlotExported = true
                setTimeout(() => this.MagneticSectionPlotExported = false, 2000);
            })
            .catch(error => {
                console.error("Error plotting magnetic section")
                console.error(error)
            });
        },
        exportMagneticSectionAndFieldPlot() {
            const url = import.meta.env.VITE_API_ENDPOINT + '/plot_core_and_fields'

            this.$axios.post(url, {magnetic: this.masStore.mas.magnetic, operatingPoint: this.masStore.mas.inputs.operatingPoints[0], includeFringing: this.includeFringing})
            .then(response => {
                download(response.data, this.masStore.mas.magnetic.manufacturerInfo.reference + "_Magnetic_Section_And_H_Field.svg", "image/svg+xml");
                this.MagneticSectionAndFieldPlotExported = true
                setTimeout(() => this.MagneticSectionAndFieldPlotExported = false, 2000);
            })
            .catch(error => {
                console.error("Error plotting magnetic section")
                console.error(error)
            });
        },

        calculateLeakageInductance() {
            if (this.masStore.mas.magnetic.coil.functionalDescription.length > 1) {
                magneticAdviser.ready.then(_ => {

                    const leakageInductaceOutput = JSON.parse(magneticAdviser.calculate_leakage_inductance(JSON.stringify(this.masStore.mas.magnetic), this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0].frequency, 0));

                    for (var operatingPointIndex = 0; operatingPointIndex < this.masStore.mas.outputs.length; operatingPointIndex++) {
                        this.masStore.mas.outputs[operatingPointIndex].leakageInductance = leakageInductaceOutput;

                        for (var windingIndex = 1; windingIndex < this.masStore.mas.magnetic.coil.functionalDescription.length; windingIndex++) {

                            const aux = formatInductance(leakageInductaceOutput.leakageInductancePerWinding[windingIndex].nominal);
                            this.localTexts.outputsTable.coil[operatingPointIndex][windingIndex].leakageInductance.value = `${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`;
                            console.log(this.localTexts.outputsTable.coil[0]);
                        }
                    }
                })
            }   
        },
        processCoreGappingTexts(data) {
            const coreGappingTable = []
            for (var gapIndex = 0; gapIndex < data.magnetic.core.functionalDescription.gapping.length; gapIndex++) {
                const coreGappingRow = {}
                const gap = data.magnetic.core.functionalDescription.gapping[gapIndex];
                {
                    coreGappingRow['type'] = {}
                    coreGappingRow['type'].text = 'Type';
                    coreGappingRow['type'].value = `${toTitleCase(gap.type)}`;
                }
                {
                    const aux = formatDimension(gap.length);
                    coreGappingRow['length'] = {}
                    coreGappingRow['length'].text = 'Length';
                    coreGappingRow['length'].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                }
                {
                    const aux = formatDimension(gap.coordinates[1]);
                    coreGappingRow['heightOffset'] = {}
                    coreGappingRow['heightOffset'].text = 'Height Offset';
                    coreGappingRow['heightOffset'].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                }
                coreGappingTable.push(coreGappingRow);
            }

            return coreGappingTable;
        },
        processCoreShapeTexts(data) {
            const coreShapeTable = {}
            console.log(data.magnetic.core.functionalDescription)
            {
                coreShapeTable['name'] = {}
                coreShapeTable['name'].text = 'Name';
                coreShapeTable['name'].value = `${data.magnetic.core.functionalDescription.shape.name}`;
            }
            {
                coreShapeTable['numberStacks'] = {}
                coreShapeTable['numberStacks'].text = 'No. Stacks';
                coreShapeTable['numberStacks'].value = `${data.magnetic.core.functionalDescription.numberStacks}`;
            }
            {
                const aux = formatUnit(data.magnetic.core.processedDescription.effectiveParameters.effectiveLength, 'm');
                coreShapeTable['effectiveLength'] = {}
                coreShapeTable['effectiveLength'].text = 'Effective length';
                coreShapeTable['effectiveLength'].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
            }
            {
                const aux = formatUnit(data.magnetic.core.processedDescription.effectiveParameters.effectiveArea, 'm²');
                coreShapeTable['effectiveArea'] = {}
                coreShapeTable['effectiveArea'].text = 'Effective area';
                coreShapeTable['effectiveArea'].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
            }
            {
                const aux = formatUnit(data.magnetic.core.processedDescription.effectiveParameters.effectiveVolume, 'm³');
                coreShapeTable['effectiveVolume'] = {}
                coreShapeTable['effectiveVolume'].text = 'Effective volume';
                coreShapeTable['effectiveVolume'].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
            }
            {
                const aux = formatUnit(data.magnetic.core.processedDescription.effectiveParameters.minimumArea, 'm²');
                coreShapeTable['minimumArea'] = {}
                coreShapeTable['minimumArea'].text = 'Minimum Area';
                coreShapeTable['minimumArea'].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
            }

            return coreShapeTable;
        },
        processCoreMaterialTexts(data) {
            const coreMaterialTable = {};

            {
                coreMaterialTable.name = {}
                coreMaterialTable.name.text = 'Name';
                coreMaterialTable.name.value = `${data.magnetic.core.functionalDescription.material.name}`;
            }
            {
                coreMaterialTable.manufacturer = {}
                coreMaterialTable.manufacturer.text = 'Manufacturer';
                coreMaterialTable.manufacturer.value = `${data.magnetic.core.functionalDescription.material.manufacturerInfo.name}`;
            }
            {
                var aux = formatUnit(1 / data.magnetic.core.temp["25"].reluctance, "H/(tu.)²");
                coreMaterialTable.permeanceTable = {};
                coreMaterialTable.permeanceTable.text = 'Permeance (AL value)';
                coreMaterialTable.permeanceTable.value_25 = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                aux = formatUnit(1 / data.magnetic.core.temp["100"].reluctance, "H/(tu.)²");
                coreMaterialTable.permeanceTable.value_100 = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
            }
            {
                coreMaterialTable.initialPermeabilityTable = {};
                coreMaterialTable.initialPermeabilityTable.text = 'Initial Permeability (µᵢ)';
                coreMaterialTable.initialPermeabilityTable.value_25 = `${removeTrailingZeroes(data.magnetic.core.temp["25"].initialPermeability, 0)}`;
                coreMaterialTable.initialPermeabilityTable.value_100 = `${removeTrailingZeroes(data.magnetic.core.temp["100"].initialPermeability, 0)}`;
            }
            {
                coreMaterialTable.effectivePermeabilityTable = {};
                coreMaterialTable.effectivePermeabilityTable.text = 'Eff. Permeability (µₑ)';
                coreMaterialTable.effectivePermeabilityTable.value_25 = `${removeTrailingZeroes(data.magnetic.core.temp["25"].effectivePermeability, 0)}`;
                coreMaterialTable.effectivePermeabilityTable.value_100 = `${removeTrailingZeroes(data.magnetic.core.temp["100"].effectivePermeability, 0)}`;
            }
            {
                var aux = formatTemperature(data.magnetic.core.functionalDescription.material.curieTemperature);

                coreMaterialTable.curieTemperatureTable = {};
                coreMaterialTable.curieTemperatureTable.text = 'Curie Temperature';
                coreMaterialTable.curieTemperatureTable.value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
            }
            {
                var aux = formatUnit(data.magnetic.core.temp["25"].resistivity, "Ωm");
                coreMaterialTable.resistivityTable = {};
                coreMaterialTable.resistivityTable.text = 'Resistivity';
                coreMaterialTable.resistivityTable.value_25 = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                aux = formatUnit(data.magnetic.core.temp["100"].resistivity, "Ωm");
                coreMaterialTable.resistivityTable.value_100 = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
            }
            {
                var aux = formatUnit(data.magnetic.core.temp["25"].magneticFluxDensitySaturation, "T");
                coreMaterialTable.magneticFluxDensitySaturationTable = {};
                coreMaterialTable.magneticFluxDensitySaturationTable.text = 'Saturation B Field';
                coreMaterialTable.magneticFluxDensitySaturationTable.value_25 = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                aux = formatUnit(data.magnetic.core.temp["100"].magneticFluxDensitySaturation, "T");
                coreMaterialTable.magneticFluxDensitySaturationTable.value_100 = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
            }
            {
                var aux = formatUnit(data.magnetic.core.functionalDescription.material.density * 1000, "g/m³");  // Because the unit is kg
                coreMaterialTable.densityTable = {};
                coreMaterialTable.densityTable.text = 'Density';
                coreMaterialTable.densityTable.value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
            }
            return coreMaterialTable;
        },
        processCoilTexts(data) {
            const coilTable = {}

            coilTable.sectionsInfo = {};
            coilTable.layersInfo = {};
            coilTable.windingInfo = [];

            coilTable.sectionsInfo.text = 'No. Sections';
            coilTable.sectionsInfo.value = `${data.magnetic.coil.sectionsDescription.length}`;
            coilTable.layersInfo.text = 'No. Layers';
            coilTable.layersInfo.value = `${data.magnetic.coil.layersDescription.length}`;

            for (var windingIndex = 0; windingIndex < data.magnetic.coil.functionalDescription.length; windingIndex++) {
                const turns = {};
                const parallels = {};
                const wire = {};
                const winding = data.magnetic.coil.functionalDescription[windingIndex];
                {
                    const aux = formatUnit(winding.numberTurns, "");
                    turns.text = "No. turns";
                    turns.value = `${removeTrailingZeroes(aux.label, 0)} ${aux.unit}`;
                }
                {
                    const aux = formatUnit(winding.numberParallels, "");
                    parallels.text = "No. parallels";
                    parallels.value = `${removeTrailingZeroes(aux.label, 0)} ${aux.unit}`;
                }
                {
                    wire.text = "Wire";
                    if (winding.wire.type == "round") {
                        if (winding.wire.standard == "NEMA MW 1000 C") {
                            wire.value = `Round AWG ${winding.wire.standardName}`;
                        }
                        else {
                            wire.value = `Round ${winding.wire.standardName} mm`;
                        }

                        if (winding.wire.coating != null) {
                            if (winding.wire.coating.numberLayers == 1) {
                                wire.value += " SIW";
                            }
                            if (winding.wire.coating.numberLayers == 2) {
                                wire.value += " DIW";
                            }
                            if (winding.wire.coating.numberLayers == 3) {
                                wire.value += " TIW";
                            }
                            if (winding.wire.coating.grade != null) {
                                if (winding.wire.coating.grade <= 3) {
                                    wire.value += ` Grade ${winding.wire.coating.grade}`;
                                }
                                else {
                                    wire.value += ` FIW Grade ${winding.wire.coating.grade}`;
                                }
                            }
                        }
                        // wire.value += ` (${winding.wire.manufacturerInfo.name} ${winding.wire.name})`;
                    }
                    else if (winding.wire.type == "litz") {
                        wire.value = `Litz ${winding.wire.name}`;
                    }
                    else if (winding.wire.type == "rectangular") {
                        wire.value = `Rectangular ${winding.wire.name.split(" - ")[0]} mm ${winding.wire.name.split(" - ")[1]}`;
                    }
                    else if (winding.wire.type == "foil") {
                        wire.value = `${winding.wire.name} mm`;
                    }
                }
                coilTable.windingInfo.push({turns: turns, parallels: parallels, wire: wire});
            }


            return coilTable;
        },
        processOutputsTexts(data) {
            const outputsTable = {}


            outputsTable.core = []
            outputsTable.coil = []

            for (var operatingPointIndex = 0; operatingPointIndex < data.outputs.length; operatingPointIndex++) {
                const coreLossRow = {}
                if (data.outputs[operatingPointIndex].magnetizingInductance != null)
                {
                    coreLossRow.magnetizingInductance = {}
                    const aux = formatInductance(data.outputs[operatingPointIndex].magnetizingInductance.magnetizingInductance.nominal);
                    coreLossRow.magnetizingInductance.text = 'Mag. Ind.';
                    coreLossRow.magnetizingInductance.value = `${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`;
                }
                if (data.outputs[operatingPointIndex].coreLosses != null)
                {
                    coreLossRow.coreLosses = {}
                    const aux = formatPower(data.outputs[operatingPointIndex].coreLosses.coreLosses);
                    coreLossRow.coreLosses.text = 'Core losses';
                    coreLossRow.coreLosses.value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                }
                if (data.outputs[operatingPointIndex].coreLosses != null)
                {
                    coreLossRow.coreTemperature = {}
                    const aux = formatTemperature(data.outputs[operatingPointIndex].coreLosses.temperature);
                    coreLossRow.coreTemperature.text = 'Core temp.';
                    coreLossRow.coreTemperature.value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                }
                if (data.outputs[operatingPointIndex].coreLosses != null)
                {
                    coreLossRow.magneticFluxDensityPeak = {}
                    const aux = formatUnit(data.outputs[operatingPointIndex].coreLosses.magneticFluxDensity.processed.peak, "T");
                    coreLossRow.magneticFluxDensityPeak.text = 'B peak';
                    coreLossRow.magneticFluxDensityPeak.value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                }
                outputsTable.core.push(coreLossRow)

                const coilLossRow = []

                for (var windingIndex = 0; windingIndex < data.magnetic.coil.functionalDescription.length; windingIndex++) {
                    const coilLossCell = {}
                    {
                        const aux = formatResistance(data.outputs[operatingPointIndex].windingLosses.dcResistancePerWinding[windingIndex]);
                        coilLossCell.dcResistance = {}
                        coilLossCell.dcResistance.text = toTitleCase(data.magnetic.coil.functionalDescription[windingIndex].name.toLowerCase());
                        coilLossCell.dcResistance.value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                    }
                    {
                        const currentRms = data.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].current.processed.rms;
                        const conductingAreaWire = data.magnetic.coil.functionalDescription[windingIndex].wire.conductingArea.nominal;
                        const numberParallels = data.magnetic.coil.functionalDescription[windingIndex].numberParallels;
                        const currentDensity = currentRms / numberParallels / conductingAreaWire;
                        const aux = formatUnit(currentDensity / 1000000, "A/mm²");
                        coilLossCell.currentDensity = {}
                        coilLossCell.currentDensity.text = toTitleCase(data.magnetic.coil.functionalDescription[windingIndex].name.toLowerCase());
                        coilLossCell.currentDensity.value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                    }
                    {
                        const aux = formatResistance(data.outputs[operatingPointIndex].windingLosses.dcResistancePerWinding[windingIndex]);
                        coilLossCell.leakageInductance = {}
                        coilLossCell.leakageInductance.text = toTitleCase(data.magnetic.coil.functionalDescription[windingIndex].name.toLowerCase());
                        coilLossCell.leakageInductance.value = "";
                    }
                    const lossesThisWinding = data.outputs[operatingPointIndex].windingLosses.windingLossesPerWinding[windingIndex];
                    const ohmicLossesThisWinding = lossesThisWinding.ohmicLosses.losses;
                    var skinLossesThisWinding = lossesThisWinding.skinEffectLosses.lossesPerHarmonic.reduce((partialSum, a) => partialSum + a, 0);
                    var proximityLossesThisWinding = lossesThisWinding.proximityEffectLosses.lossesPerHarmonic.reduce((partialSum, a) => partialSum + a, 0);
                    {
                        const aux = formatPower(ohmicLossesThisWinding + skinLossesThisWinding + proximityLossesThisWinding);
                        coilLossCell.windingLosses = {}
                        coilLossCell.windingLosses.text = toTitleCase(data.magnetic.coil.functionalDescription[windingIndex].name.toLowerCase());
                        coilLossCell.windingLosses.value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                    }
                    {
                        const aux = formatPower(ohmicLossesThisWinding);
                        coilLossCell.ohmicLosses = {}
                        coilLossCell.ohmicLosses.text = toTitleCase(data.magnetic.coil.functionalDescription[windingIndex].name.toLowerCase());
                        coilLossCell.ohmicLosses.value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                    }
                    {
                        const aux = formatPower(skinLossesThisWinding);
                        coilLossCell.skinLosses = {}
                        coilLossCell.skinLosses.text = toTitleCase(data.magnetic.coil.functionalDescription[windingIndex].name.toLowerCase());
                        coilLossCell.skinLosses.value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                    }
                    {
                        const aux = formatPower(proximityLossesThisWinding);
                        coilLossCell.proximityLosses = {}
                        coilLossCell.proximityLosses.text = toTitleCase(data.magnetic.coil.functionalDescription[windingIndex].name.toLowerCase());
                        coilLossCell.proximityLosses.value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                    }

                    coilLossRow.push(coilLossCell)
                }
                outputsTable.coil.push(coilLossRow)
            }
            return outputsTable;
        },
        computeTexts() {
            this.$mkf.ready.then(_ => {
                const materialName = this.masStore.mas.magnetic.core.functionalDescription.material;
                if (typeof materialName === 'string' || materialName instanceof String) {
                    var materialData = JSON.parse(this.$mkf.get_material_data(materialName));
                    this.masStore.mas.magnetic.core.functionalDescription.material = materialData;
                }
                var temperatureDependantData25 = JSON.parse(this.$mkf.get_core_temperature_dependant_parameters(JSON.stringify(this.masStore.mas.magnetic.core), 25));
                var temperatureDependantData100 = JSON.parse(this.$mkf.get_core_temperature_dependant_parameters(JSON.stringify(this.masStore.mas.magnetic.core), 100));
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
                this.localTexts["coreGappingTable"] = this.processCoreGappingTexts(mas);
                this.localTexts["coreShapeTable"] = this.processCoreShapeTexts(mas);
                this.localTexts["coreMaterialTable"] = this.processCoreMaterialTexts(mas);
                this.localTexts["outputsTable"] = this.processOutputsTexts(mas);
                this.localTexts["coilTable"] = this.processCoilTexts(mas);
                setTimeout(() => {this.calculateLeakageInductance();}, 10);
            }).catch(error => { 
                console.error("Error reading material data")
                console.error(error)
            });
        },
        insertMas() {
            const url = import.meta.env.VITE_API_ENDPOINT + '/insert_mas'

            console.log("Inserting Mas")
            this.$axios.post(url, this.masStore.mas)
            .then(response => {
                console.log("response.data")
                console.log(response.data)
            })
            .catch(error => {
                console.error("Error inserting")
                console.error(error)
            });
        },
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <div class="col-sm-12 col-md-2 text-start border border-primary" style="height: 75vh">
                <button :disabled="masExported" :data-cy="dataTestLabel + '-download-MAS-File-button'" class="btn btn-primary col-12 mt-4" @click="exportMAS"> Download MAS file </button>
                <button :disabled="masExported" :data-cy="dataTestLabel + '-download-MAS-Excitations-File-button'" class="btn btn-primary col-12 mt-4" @click="exportMASWithExcitations"> Download MAS file with excitations and results </button>
                <button :disabled="Core3DExported" :data-cy="dataTestLabel + '-download-STP-File-button'" class="btn btn-primary col-12 mt-4" @click="exportCore3D('STP')"> Download Core STP model </button>
                <button :disabled="Core3DExported" :data-cy="dataTestLabel + '-download-OBJ-File-button'" class="btn btn-primary col-12 mt-4" @click="exportCore3D('OBJ')"> Download Core OBJ model </button>
                <button :disabled="MagneticSectionPlotExported" :data-cy="dataTestLabel + '-download-MagneticSectionPlot-File-button'" class="btn btn-primary col-12 mt-4" @click="exportMagneticSectionPlot">Download Magnetic Section</button>
                <button :disabled="MagneticSectionAndFieldPlotExported" :data-cy="dataTestLabel + '-download-MagneticSectionAndFieldPlot-File-button'" class="btn btn-primary col-12 mt-4" @click="exportMagneticSectionAndFieldPlot">Download Magnetic Section with H field</button>
            </div>
            <div class="col-10 row">
                <h3 v-if="'manufacturerInfo' in masStore.mas.magnetic" class="col-12 p-0 m-0 fs-4">{{masStore.mas.magnetic.manufacturerInfo.reference}}</h3>
                <div v-if="masStore.mas.magnetic.manufacturerInfo != null" class="col-sm-12 col-md-6 text-start pe-0 row">
                    <div class="col-12 fs-4 p-0 m-0 mt-2 text-center fw-bold">Core data</div>
                    <div>
                        <div class="offset-1 col-10">
                            <div class="row">
                                <div class="col-12 fs-5 p-0 m-0 my-1 text-center">Core Shape</div>
                                <div v-if="'coreShapeTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreShapeTable.name.text}}</div>
                                <div v-if="'coreShapeTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coreShapeTable.name.value}}</div>
                                <div v-if="'coreShapeTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreShapeTable.numberStacks.text}}</div>
                                <div v-if="'coreShapeTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coreShapeTable.numberStacks.value}}</div>
                                <div v-if="'coreShapeTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreShapeTable.effectiveLength.text}}</div>
                                <div v-if="'coreShapeTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coreShapeTable.effectiveLength.value}}</div>
                                <div v-if="'coreShapeTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreShapeTable.effectiveArea.text}}</div>
                                <div v-if="'coreShapeTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coreShapeTable.effectiveArea.value}}</div>
                                <div v-if="'coreShapeTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreShapeTable.effectiveVolume.text}}</div>
                                <div v-if="'coreShapeTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coreShapeTable.effectiveVolume.value}}</div>
                                <div v-if="'coreShapeTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreShapeTable.minimumArea.text}}</div>
                                <div v-if="'coreShapeTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coreShapeTable.minimumArea.value}}</div>
                            </div>

                            <div class="row">
                                <div class="col-12 fs-5 p-0 m-0 my-1 text-center">Core Gapping</div>
                                    <div  v-if="'coreGappingTable' in localTexts" class="row p-0 m-0" v-for="gap, gapIndex in masStore.mas.magnetic.core.functionalDescription.gapping">
                                        <div v-if="gapIndex == 0" class="col-4 p-0 m-0 border ps-2">Type</div>
                                        <div v-if="gapIndex == 0" class="col-4 p-0 m-0 border ps-2">Length</div>
                                        <div v-if="gapIndex == 0" class="col-4 p-0 m-0 border ps-2">Height offset</div>
                                        <div v-if="'coreGappingTable' in localTexts" class="col-4 p-0 m-0 border text-start ps-2">{{localTexts.coreGappingTable[gapIndex].type.value}}</div>
                                        <div v-if="'coreGappingTable' in localTexts" class="col-4 p-0 m-0 border text-end pe-1">{{localTexts.coreGappingTable[gapIndex].length.value}}</div>
                                        <div v-if="'coreGappingTable' in localTexts" class="col-4 p-0 m-0 border text-end pe-1">{{localTexts.coreGappingTable[gapIndex].heightOffset.value}}</div>
                                    </div>
                            </div>

                            <div class="row">
                                <div class="col-12 fs-5 p-0 m-0 my-1 text-center">Material Parameters</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialTable.name.text}}</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialTable.name.value}}</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialTable.manufacturer.text}}</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialTable.manufacturer.value}}</div>

                                <div class="col-6 p-0 m-0 border text-center ps-2"></div>
                                <div class="col-3 p-0 m-0 border text-center">25°C</div>
                                <div class="col-3 p-0 m-0 border text-center">100°C</div>

                                <div v-if="'coreMaterialTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialTable.permeanceTable.text}}</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialTable.permeanceTable.value_25}}</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialTable.permeanceTable.value_100}}</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialTable.initialPermeabilityTable.text}}</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialTable.initialPermeabilityTable.value_25}}</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialTable.initialPermeabilityTable.value_100}}</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialTable.effectivePermeabilityTable.text}}</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialTable.effectivePermeabilityTable.value_25}}</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialTable.effectivePermeabilityTable.value_100}}</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialTable.resistivityTable.text}}</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialTable.resistivityTable.value_25}}</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialTable.resistivityTable.value_100}}</div>
                                <div v-if="'magneticFluxDensitySaturationTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.magneticFluxDensitySaturationTable.text}}</div>
                                <div v-if="'magneticFluxDensitySaturationTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.magneticFluxDensitySaturationTable.value_25}}</div>
                                <div v-if="'magneticFluxDensitySaturationTable' in localTexts" class="col-3 p-0 m-0 border text-end pe-1">{{localTexts.magneticFluxDensitySaturationTable.value_100}}</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialTable.curieTemperatureTable.text}}</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialTable.curieTemperatureTable.value}}</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coreMaterialTable.densityTable.text}}</div>
                                <div v-if="'coreMaterialTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coreMaterialTable.densityTable.value}}</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-12 fs-4 p-0 m-0 mt-2 text-center fw-bold">Coil data</div>
                    <div>
                        <div class="offset-1 col-10">
                            <div class="row">
                                <div class="col-12 fs-5 p-0 m-0 my-1 text-center">Coil Global Parameters</div>
                                <div v-if="'coilTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coilTable.sectionsInfo.text}}</div>
                                <div v-if="'coilTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coilTable.sectionsInfo.value}}</div>
                                <div v-if="'coilTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coilTable.layersInfo.text}}</div>
                                <div v-if="'coilTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coilTable.layersInfo.value}}</div>
                            </div>
                        </div>
                        <div class="offset-1 col-10">
                            <div  v-if="'coilTable' in localTexts" class="row" v-for="winding, windingIndex in masStore.mas.magnetic.coil.functionalDescription">
                                <div class="col-12 fs-5 p-0 m-0 my-1 text-center">{{toTitleCase(winding.name.toLowerCase())}}</div>

                                <div v-if="'coilTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coilTable.windingInfo[windingIndex].turns.text}}</div>
                                <div v-if="'coilTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coilTable.windingInfo[windingIndex].turns.value}}</div>
                                <div v-if="'coilTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coilTable.windingInfo[windingIndex].parallels.text}}</div>
                                <div v-if="'coilTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coilTable.windingInfo[windingIndex].parallels.value}}</div>
                                <div v-if="'coilTable' in localTexts" class="col-6 p-0 m-0 border ps-2">{{localTexts.coilTable.windingInfo[windingIndex].wire.text}}</div>
                                <div v-if="'coilTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.coilTable.windingInfo[windingIndex].wire.value}}</div>
                            </div>
                        </div>

                    </div>
                    <div class="col-12 fs-4 p-0 m-0 mt-2 text-center fw-bold">Simulation result per Operating Point</div>
                    <div class="offset-1 col-10 row mt-3" v-for="operationPoint, operationPointIndex in masStore.mas.inputs.operatingPoints">
                        <div class="col-12 fs-5 p-0 m-0 my-1 text-center">{{operationPoint.name}}</div>
                        <div class="col-12 fs-5 p-0 m-0 mt-2 text-center">Core</div>
                        <div class="col-12 p-0 m-0 mt-2">
                            <div class="row">
                                <div v-if="'outputsTable' in localTexts" class="col-6 p-0 m-0 border text-start ps-2">{{localTexts.outputsTable.core[operationPointIndex].magnetizingInductance.text}}</div>
                                <div v-if="'outputsTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.outputsTable.core[operationPointIndex].magnetizingInductance.value}}</div>
                                <div v-if="'outputsTable' in localTexts" class="col-6 p-0 m-0 border text-start ps-2">{{localTexts.outputsTable.core[operationPointIndex].coreLosses.text}}</div>
                                <div v-if="'outputsTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.outputsTable.core[operationPointIndex].coreLosses.value}}</div>
                                <div v-if="'outputsTable' in localTexts" class="col-6 p-0 m-0 border text-start ps-2">{{localTexts.outputsTable.core[operationPointIndex].coreTemperature.text}}</div>
                                <div v-if="'outputsTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.outputsTable.core[operationPointIndex].coreTemperature.value}}</div>
                                <div v-if="'outputsTable' in localTexts" class="col-6 p-0 m-0 border text-start ps-2">{{localTexts.outputsTable.core[operationPointIndex].magneticFluxDensityPeak.text}}</div>
                                <div v-if="'outputsTable' in localTexts" class="col-6 p-0 m-0 border text-end pe-1">{{localTexts.outputsTable.core[operationPointIndex].magneticFluxDensityPeak.value}}</div>
                            </div>
                        </div>
                        <div class="col-12 fs-5 p-0 m-0 mt-2 text-center">Coil</div>
                        <div class="col-12 p-0 m-0 mt-2">
                            <div class="row" v-for="winding, windingIndex in masStore.mas.magnetic.coil.functionalDescription">

                                <div v-if="windingIndex == 0" class="col-3 p-0 m-0 border text-start ps-2">Winding</div>
                                <div v-if="windingIndex == 0" class="col-2 p-0 m-0 border text-center ps-2">DC Res.</div>
                                <div v-if="windingIndex == 0" class="col-3 p-0 m-0 border text-center ps-2">Curr. Density</div>
                                <div v-if="windingIndex == 0" class="col-2 p-0 m-0 border text-center ps-2">Wind. Loss</div>
                                <div v-if="windingIndex == 0" class="col-2 p-0 m-0 border text-center ps-2">Leak. Ind.</div>

                                <div v-if="'outputsTable' in localTexts" class="col-3 p-0 m-0 border  text-start ps-2">{{localTexts.outputsTable.coil[operationPointIndex][windingIndex].dcResistance.text}}</div>
                                <div v-if="'outputsTable' in localTexts" class="col-2 p-0 m-0 border text-center">{{localTexts.outputsTable.coil[operationPointIndex][windingIndex].dcResistance.value}}</div>
                                <div v-if="'outputsTable' in localTexts" class="col-3 p-0 m-0 border text-center">{{localTexts.outputsTable.coil[operationPointIndex][windingIndex].currentDensity.value}}</div>
                                <div v-if="'outputsTable' in localTexts" class="col-2 p-0 m-0 border text-center">{{localTexts.outputsTable.coil[operationPointIndex][windingIndex].windingLosses.value}}</div>
                                <div v-if="'outputsTable' in localTexts" class="col-2 p-0 m-0 border text-center">{{localTexts.outputsTable.coil[operationPointIndex][windingIndex].leakageInductance.value}}</div>
                            </div>
                        </div>
                        <div class="col-12 fs-5 p-0 m-0 mt-2 text-center">Coil Losses Breakdown</div>
                        <div class="col-12 p-0 m-0 mt-2">
                            <div class="row " v-for="winding, windingIndex in masStore.mas.magnetic.coil.functionalDescription">

                                <div v-if="windingIndex == 0" class="col-3 p-0 m-0 border text-start ps-2">Winding</div>
                                <div v-if="windingIndex == 0" class="col-3 p-0 m-0 border text-center ps-2">Ohmic Loss</div>
                                <div v-if="windingIndex == 0" class="col-3 p-0 m-0 border text-center ps-2">Skin Loss</div>
                                <div v-if="windingIndex == 0" class="col-3 p-0 m-0 border text-center ps-2">Prox. Loss</div>

                                <div v-if="'outputsTable' in localTexts" class="col-3 p-0 m-0 border text-start ps-2">{{localTexts.outputsTable.coil[operationPointIndex][windingIndex].ohmicLosses.text}}</div>
                                <div v-if="'outputsTable' in localTexts" class="col-3 p-0 m-0 border text-center">{{localTexts.outputsTable.coil[operationPointIndex][windingIndex].ohmicLosses.value}}</div>
                                <div v-if="'outputsTable' in localTexts" class="col-3 p-0 m-0 border text-center">{{localTexts.outputsTable.coil[operationPointIndex][windingIndex].skinLosses.value}}</div>
                                <div v-if="'outputsTable' in localTexts" class="col-3 p-0 m-0 border text-center">{{localTexts.outputsTable.coil[operationPointIndex][windingIndex].proximityLosses.value}}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-if="masStore.mas.magnetic.manufacturerInfo != null" class="col-sm-12 col-md-6 text-start pe-0">
                    <div class="col-12 fs-5 p-0 m-0 mt-2 text-center">{{showFieldPlot? 'Core Coil and H Field' : 'Core Coil'}}</div>
                    <Magnetic2DVisualizer
                        :modelValue="masStore.mas"
                        :enableZoom="false"
                        @swapFieldPlot="swapFieldPlot"
                        @swapIncludeFringing="swapIncludeFringing"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
