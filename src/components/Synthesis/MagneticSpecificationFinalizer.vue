<script setup>
import { useMasStore } from '/src/stores/mas'
import { formatUnit, removeTrailingZeroes, deepCopy} from '/src/assets/js/utils.js'
import * as download from 'downloadjs'

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
        const texts = {
            designRequirements: {},
            operatingPoints: [],
        }
        return {
            masStore,
            theme,
            texts,
            masExported: false,
        }
    },
    computed: {
    },
    watch: { 
    },
    mounted () {
        this.computeTexts();
    },
    methods: {
        getTitleColor(text) {
            return `<b><font color="${this.theme.info}">${text}</font></b>`
        },
        getFieldColor(text) {
            return `<font color="${this.theme.primary}">${text}</font>`
        },
        getValueColor(text) {
            return `<font color="${this.theme.primary}">${text}</font>`
        },
        computeDimensionText(dimension, unit) {
            var text = '';
            if (dimension.minimum == null && dimension.nominal != null && dimension.maximum == null) {
                const aux = formatUnit(dimension.nominal, unit);
                text += `A ${this.getFieldColor('nominal value')} of ${this.getValueColor(`${removeTrailingZeroes(aux.label)} ${aux.unit}`)}`
            }
            if (dimension.minimum == null && dimension.nominal == null && dimension.maximum != null) {
                const aux = formatUnit(dimension.maximum, unit);
                text += `A ${this.getFieldColor('maximum value')} of ${this.getValueColor(`${removeTrailingZeroes(aux.label)} ${aux.unit}`)}`
            }
            if (dimension.minimum != null && dimension.nominal == null && dimension.maximum == null) {
                const aux = formatUnit(dimension.minimum, unit);
                text += `A ${this.getFieldColor('minimum value')} of ${this.getValueColor(`${removeTrailingZeroes(aux.label)} ${aux.unit}`)}`
            }
            if (dimension.minimum != null && dimension.nominal != null && dimension.maximum == null) {
                const auxNominal = formatUnit(dimension.nominal, unit);
                const auxMinimum = formatUnit(dimension.minimum, unit);
                text += `A ${this.getFieldColor('nominal value')} of ${this.getValueColor(`${removeTrailingZeroes(auxNominal.label)} ${auxNominal.unit}`)}, with a ${this.getFieldColor('minimum value')} of ${this.getValueColor(`${removeTrailingZeroes(auxMinimum.label)} ${auxMinimum.unit}`)}`
            }
            if (dimension.minimum == null && dimension.nominal != null && dimension.maximum != null) {
                const auxNominal = formatUnit(dimension.nominal, unit);
                const auxMaximum = formatUnit(dimension.maximum, unit);
                text += `A ${this.getFieldColor('nominal value')} of ${this.getValueColor(`${removeTrailingZeroes(auxNominal.label)} ${auxNominal.unit}`)}, with a ${this.getFieldColor('maximum value')} of ${this.getValueColor(`${removeTrailingZeroes(auxMaximum.label)} ${auxMaximum.unit}`)}`
            }
            if (dimension.minimum != null && dimension.nominal == null && dimension.maximum != null) {
                const auxMinimum = formatUnit(dimension.minimum, unit);
                const auxMaximum = formatUnit(dimension.maximum, unit);
                text += `A value between ${this.getValueColor(`${removeTrailingZeroes(auxMinimum.label)} ${auxMinimum.unit}`)} and ${this.getValueColor(`${removeTrailingZeroes(auxMaximum.label)} ${auxMaximum.unit}`)}`
            }
            if (dimension.minimum != null && dimension.nominal != null && dimension.maximum != null) {
                const auxMinimum = formatUnit(dimension.minimum, unit);
                const auxNominal = formatUnit(dimension.nominal, unit);
                const auxMaximum = formatUnit(dimension.maximum, unit);
                text += `A ${this.getFieldColor('nominal value')} of ${this.getValueColor(`${removeTrailingZeroes(auxNominal.label)} ${auxNominal.unit}`)}, with a ${this.getFieldColor('minimum value')} of ${this.getValueColor(`${removeTrailingZeroes(auxMinimum.label)} ${auxMinimum.unit}`)} and a ${this.getFieldColor('maximum value')} of ${this.getValueColor(`${removeTrailingZeroes(auxMaximum.label)} ${auxMaximum.unit}`)}`
            }
            return text
        },
        computeTexts() {
            console.log(this.masStore.mas.inputs)

            console.log(this.texts)
            this.masStore.mas.inputs.operatingPoints.forEach((operatingPoint, operationPointIndex) => {
                var text = `Overview of operating point ${this.getTitleColor(operatingPoint.name)}: </br>`;
                {
                    const auxFrequency = formatUnit(operatingPoint.excitationsPerWinding[0].frequency, 'Hz');
                    const auxTemperature = formatUnit(operatingPoint.conditions.ambientTemperature, '°C');
                    text += `&emsp;It has switching frequency of ${this.getValueColor(`${removeTrailingZeroes(auxFrequency.label, 1)} ${auxFrequency.unit}`)} and an ambient temperature of ${this.getValueColor(`${removeTrailingZeroes(auxTemperature.label, 1)} ${auxTemperature.unit}`)}: </br>`;
                }
                text += `&emsp;About its windings: </br>`;
                operatingPoint.excitationsPerWinding.forEach((excitation, windingIndex) => {
                    {
                        const auxCurrent = formatUnit(excitation.current.processed.rms, 'A');
                        const auxVoltage = formatUnit(excitation.voltage.processed.rms, 'A');
                        text += ` &emsp;&emsp;Winding ${this.masStore.mas.magnetic.coil.functionalDescription[windingIndex].name} has a ${this.getValueColor(excitation.current.processed.label.toLowerCase())} current, with an RMS of ${this.getValueColor(`${removeTrailingZeroes(auxCurrent.label, 2)} ${auxCurrent.unit}`)};`;
                        text += ` and a ${this.getValueColor(excitation.current.processed.label.toLowerCase())} voltage, with an RMS of ${this.getValueColor(`${removeTrailingZeroes(auxVoltage.label, 2)} ${auxVoltage.unit}`)}; </br>`;
                    }

                })
                console.log(operatingPoint)
                // var text += `Winding ${operatingPoint}: </br>`;
                this.texts.operatingPoints.push(text);

            })

            if (this.masStore.mas.inputs.designRequirements.magnetizingInductance != null) {
                this.texts.designRequirements.magnetizingInductance = `${this.getTitleColor('Magnetizing Inductance')}: `
                const dimension = this.masStore.mas.inputs.designRequirements.magnetizingInductance
                this.texts.designRequirements.magnetizingInductance += this.computeDimensionText(dimension, 'H');
                this.texts.designRequirements.magnetizingInductance += '.'
            }

            if (this.masStore.mas.inputs.designRequirements.operatingTemperature != null) {
                this.texts.designRequirements.operatingTemperature = `${this.getTitleColor('Operating temperature')}: `
                const dimension = this.masStore.mas.inputs.designRequirements.operatingTemperature
                this.texts.designRequirements.operatingTemperature += this.computeDimensionText(dimension, '°C');
                this.texts.designRequirements.operatingTemperature += '.'
            }

            if (this.masStore.mas.inputs.designRequirements.turnsRatios != null && this.masStore.mas.inputs.designRequirements.turnsRatios.length > 0) {
                this.texts.designRequirements.turnsRatios = `${this.getTitleColor('Turns ratios')}: `
                const primaryWindingName = this.masStore.mas.magnetic.coil.functionalDescription[0].name;
                this.masStore.mas.inputs.designRequirements.turnsRatios.forEach((dimension, dimensionIndex) => {
                    const windingName = this.masStore.mas.magnetic.coil.functionalDescription[dimensionIndex + 1].name;
                    this.texts.designRequirements.turnsRatios += this.computeDimensionText(dimension, '');
                    this.texts.designRequirements.turnsRatios += ` between ${primaryWindingName} and ${windingName} winding`;
                    if (dimensionIndex != this.masStore.mas.inputs.designRequirements.turnsRatios.length - 1) {
                        this.texts.designRequirements.turnsRatios += `. `;
                    }
                    else {
                        this.texts.designRequirements.turnsRatios += `.`;
                    }
                })
            }

            if (this.masStore.mas.inputs.designRequirements.leakageInductance != null && this.masStore.mas.inputs.designRequirements.leakageInductance.length > 0) {
                this.texts.designRequirements.leakageInductance = `${this.getTitleColor('Leakage Inductance')}: `
                const primaryWindingName = this.masStore.mas.magnetic.coil.functionalDescription[0].name;
                this.masStore.mas.inputs.designRequirements.leakageInductance.forEach((dimension, dimensionIndex) => {
                    const windingName = this.masStore.mas.magnetic.coil.functionalDescription[dimensionIndex + 1].name;
                    this.texts.designRequirements.leakageInductance += this.computeDimensionText(dimension, 'H');
                    this.texts.designRequirements.leakageInductance += ` between ${primaryWindingName} and ${windingName} winding`;
                    if (dimensionIndex != this.masStore.mas.inputs.designRequirements.leakageInductance.length - 1) {
                        this.texts.designRequirements.leakageInductance += `. `;
                    }
                    else {
                        this.texts.designRequirements.leakageInductance += `.`;
                    }
                })
            }

            if (this.masStore.mas.inputs.designRequirements.strayCapacitance != null && this.masStore.mas.inputs.designRequirements.strayCapacitance.length > 0) {
                this.texts.designRequirements.strayCapacitance = `${this.getTitleColor('Stray capacitance')}: `
                const primaryWindingName = this.masStore.mas.magnetic.coil.functionalDescription[0].name;
                this.masStore.mas.inputs.designRequirements.strayCapacitance.forEach((dimension, dimensionIndex) => {
                    const windingName = this.masStore.mas.magnetic.coil.functionalDescription[dimensionIndex + 1].name;
                    this.texts.designRequirements.strayCapacitance += this.computeDimensionText(dimension, 'F');
                    this.texts.designRequirements.strayCapacitance += ` between ${primaryWindingName} and ${windingName} winding`;
                    if (dimensionIndex != this.masStore.mas.inputs.designRequirements.strayCapacitance.length - 1) {
                        this.texts.designRequirements.strayCapacitance += `. `;
                    }
                    else {
                        this.texts.designRequirements.strayCapacitance += `.`;
                    }
                })
            }

            if (this.masStore.mas.inputs.designRequirements.terminalType != null && this.masStore.mas.inputs.designRequirements.terminalType.length > 0) {
                this.texts.designRequirements.terminalType = `${this.getTitleColor('Terminal type')}: `
                this.masStore.mas.inputs.designRequirements.terminalType.forEach((terminal, windingIndex) => {
                    const windingName = this.masStore.mas.magnetic.coil.functionalDescription[windingIndex].name;
                    this.texts.designRequirements.terminalType += `${this.getFieldColor(windingName + ' winding')} must have a terminal of type ${this.getValueColor(terminal)}`;
                    if (windingIndex != this.masStore.mas.inputs.designRequirements.terminalType.length - 1) {
                        this.texts.designRequirements.terminalType += `. `;
                    }
                    else {
                        this.texts.designRequirements.terminalType += `.`;
                    }
                })
            }

            if (this.masStore.mas.inputs.designRequirements.market != null) {
                this.texts.designRequirements.market = `${this.getTitleColor('Market')}: This magnetic is specified for the ${this.getValueColor(this.masStore.mas.inputs.designRequirements.market)} sector.`
            }

            if (this.masStore.mas.inputs.designRequirements.topology != null) {
                this.texts.designRequirements.topology = `${this.getTitleColor('Topology')}: This magnetic is specified to be used in a ${this.getValueColor(this.masStore.mas.inputs.designRequirements.topology)}.`
            }

            if (this.masStore.mas.inputs.designRequirements.maximumDimensions != null) {
                this.texts.designRequirements.maximumDimensions = `${this.getTitleColor('Maximum dimensions')}: This magnetic has`
                if (this.masStore.mas.inputs.designRequirements.maximumDimensions.height != null) {
                    const aux = formatUnit(this.masStore.mas.inputs.designRequirements.maximumDimensions.height, 'm')
                    this.texts.designRequirements.maximumDimensions += ` a required maximum height of ${this.getValueColor(`${removeTrailingZeroes(aux.label)} ${aux.unit}`)},`
                }
                else {
                    this.texts.designRequirements.maximumDimensions += ` no required maximum height,`
                }
                if (this.masStore.mas.inputs.designRequirements.maximumDimensions.width != null) {
                    const aux = formatUnit(this.masStore.mas.inputs.designRequirements.maximumDimensions.width, 'm')
                    this.texts.designRequirements.maximumDimensions += ` a required maximum width of ${this.getValueColor(`${removeTrailingZeroes(aux.label)} ${aux.unit}`)},`
                }
                else {
                    this.texts.designRequirements.maximumDimensions += ` no required maximum width,`
                }
                if (this.masStore.mas.inputs.designRequirements.maximumDimensions.depth != null) {
                    const aux = formatUnit(this.masStore.mas.inputs.designRequirements.maximumDimensions.depth, 'm')
                    this.texts.designRequirements.maximumDimensions += ` and a required maximum depth of ${this.getValueColor(`${removeTrailingZeroes(aux.label)} ${aux.unit}`)}.`
                }
                else {
                    this.texts.designRequirements.maximumDimensions += ` and no required maximum depth.`
                }
            }

            if (this.masStore.mas.inputs.designRequirements.maximumWeight != null) {
                const aux = formatUnit(this.masStore.mas.inputs.designRequirements.maximumWeight, 'g')
                this.texts.designRequirements.maximumWeight = `${this.getTitleColor('Maximum weight')}: This magnetic has a required maximum weight of ${this.getValueColor(`${removeTrailingZeroes(aux.label)} ${aux.unit}`)}.`
            }
            else {
                this.texts.designRequirements.maximumWeight += ` and no required maximum weight.`
            }

            if (this.masStore.mas.inputs.designRequirements.insulation != null) {
                const aux = formatUnit(this.masStore.mas.inputs.designRequirements.insulation, 'g')
                this.texts.designRequirements.insulation = `${this.getTitleColor('Insulation')}: The magnetic must comply with `
                if (Object.values(this.masStore.mas.inputs.designRequirements.insulation.standards).length > 0) {
                    this.texts.designRequirements.insulation += `the following standards: `
                    Object.values(this.masStore.mas.inputs.designRequirements.insulation.standards).forEach((standard, standardIndex) => {
                        this.texts.designRequirements.insulation += `${this.getValueColor(standard)}`
                        if (standardIndex != this.masStore.mas.inputs.designRequirements.insulation.standards.length - 1) {
                            this.texts.designRequirements.insulation += ', '
                        }
                        else {
                            this.texts.designRequirements.insulation += '; '
                        }
                    })
                }
                else {
                    this.texts.designRequirements.insulation = `no specified standard;`
                }

                if ('altitude' in this.masStore.mas.inputs.designRequirements.insulation) {
                    const dimension = this.masStore.mas.inputs.designRequirements.insulation.altitude;
                    this.texts.designRequirements.insulation += ' at ';
                    this.texts.designRequirements.insulation += this.computeDimensionText(dimension, 'm').replace('A ', 'a ');
                    this.texts.designRequirements.insulation += ' of altitude;';
                }

                if ('mainSupplyVoltage' in this.masStore.mas.inputs.designRequirements.insulation) {
                    const dimension = this.masStore.mas.inputs.designRequirements.insulation.mainSupplyVoltage;
                    this.texts.designRequirements.insulation += ' at ';
                    this.texts.designRequirements.insulation += this.computeDimensionText(dimension, 'V').replace('A ', 'a ');
                    this.texts.designRequirements.insulation += ' of main supply voltage;';
                }

                this.texts.designRequirements.insulation += ' with';
                if ('overvoltageCategory' in this.masStore.mas.inputs.designRequirements.insulation) {
                    this.texts.designRequirements.insulation += ` an ${this.getFieldColor('Overvoltage category')} of ${this.getValueColor(this.masStore.mas.inputs.designRequirements.insulation.overvoltageCategory)},`;
                }
                if ('pollutionDegree' in this.masStore.mas.inputs.designRequirements.insulation) {
                    this.texts.designRequirements.insulation += ` a ${this.getFieldColor('Pollution degree')} of ${this.getValueColor(this.masStore.mas.inputs.designRequirements.insulation.pollutionDegree)},`;
                }
                if ('cti' in this.masStore.mas.inputs.designRequirements.insulation) {
                    this.texts.designRequirements.insulation += ` a ${this.getFieldColor('CTI')} of ${this.getValueColor(this.masStore.mas.inputs.designRequirements.insulation.cti)},`;
                }
                if ('insulationType' in this.masStore.mas.inputs.designRequirements.insulation) {
                    this.texts.designRequirements.insulation += ` and a ${this.getValueColor(this.masStore.mas.inputs.designRequirements.insulation.insulationType)} ${this.getFieldColor('Insulation')}.`;
                }
            }
            else {
                this.texts.designRequirements.insulation += ` and no required maximum weight.`
            }
        },
        exportMAS() {
            const masOnlyInputs = deepCopy(this.masStore.mas);
            console.log(masOnlyInputs)
            delete masOnlyInputs.magnetic.core;
            delete masOnlyInputs.magnetic.distributorsInfo;
            delete masOnlyInputs.magnetic.manufacturerInfo;
            delete masOnlyInputs.magnetic.coil.bobbin;
            delete masOnlyInputs.magnetic.coil.layersDescription;
            delete masOnlyInputs.magnetic.coil.sectionsDescription;
            delete masOnlyInputs.magnetic.coil.turnsDescription;
            delete masOnlyInputs.magnetic.coil.functionalDescription.forEach((winding) => {
                for (let [key, value] of Object.entries(winding)) {
                    if (key != 'name') {
                        delete winding[key];
                    }
                }
            });
            delete masOnlyInputs.outputs;

            console.log(masOnlyInputs)
            download(JSON.stringify(masOnlyInputs, null, 4), masOnlyInputs.inputs.designRequirements.name + ".json", "text/plain");
            this.masExported = true
            setTimeout(() => this.masExported = false, 2000);
        }
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <div class="col-sm-12 col-md-2 text-start border border-primary" style="height: 75vh">
                <h2 v-if="masStore.mas.inputs.designRequirements.name != '' && masStore.mas.inputs.designRequirements.name != null" class="text-white fs-3 my-1 col-12">Specification for</h2>
                <h2 class="text-white fs-4 my-2 col-12">{{masStore.mas.inputs.designRequirements.name}}</h2>


                <button :disabled="masExported" :data-cy="dataTestLabel + '-download-MAS-File-button'" class="btn btn-primary col-12 mt-4" @click="exportMAS"> Download MAS file </button>
                <button disabled data-cy="dataTestLabel + '-download-MAS-File-button'" class="btn btn-primary col-12 mt-4"> Download PDF report </button>
            </div>
            <div class="col-sm-12 col-md-10 text-start pe-0">
                <h2 class="text-white fs-2 my-1">You specified the following requirements:</h2>
                <h3 class="text-white fs-5 my-2" v-for="designRequirementText, designRequirementIndex in texts.designRequirements" v-html="designRequirementText"></h3>
                <h2 class="text-white fs-2 my-1">You specified the following operating point:</h2>
                <h3 class="text-white fs-5 my-2" v-for="operatingPointText, operatingPointIndex in texts.operatingPoints" v-html="operatingPointText"></h3>

            </div>
        </div>
    </div>
</template>
