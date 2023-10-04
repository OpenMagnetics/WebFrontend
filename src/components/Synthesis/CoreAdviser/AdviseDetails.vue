<script setup>
import { toTitleCase, removeTrailingZeroes, formatPower, formatPowerDensity, formatInductance, formatTemperature, formatUnit, formatResistance} from '/src/assets/js/utils.js'
</script>

<script>

export default {
    components: {
    },
    props: {
        modelValue:{
            type: Object,
            required: true
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const localTexts = {
            coreDescription: null,
            coreMaterial: null,

            coreGapping: null,
            effectiveParameters: null,

            numberTurns: null,
            numberEstimatedLayers: null,

            coreLosses: [
                {
                    text: null,
                    value: null,
                }
            ],
            dcResistance: [
                {
                    text: null,
                    value: null,
                }
            ],
            magnetizingInductance: [
                {
                    text: null,
                    value: null,
                }
            ],
            windingLosses: [
                {
                    text: null,
                    value: null,
                }
            ],
            coreTemperature: [
                {
                    text: null,
                    value: null,
                }
            ],

            manufacturer: null,
            Distributor: null,
        };

        return {
            localTexts,
        }
    },
    watch: {
        modelValue(newValue, oldValue) {
            console.log("Checking details");
            console.log(newValue);
            this.processLocalTexts()
            // if (!isNaN(this.modelValue[this.name]))
            //     this.update(this.modelValue[this.name]);
        },
    },
    methods: {
        processLocalTexts() {
            if (this.modelValue.magnetic.manufacturerInfo == null) {
                return null;
            }
            {
                this.localTexts.coreDescription = `Core with shape ${this.modelValue.magnetic.core.functionalDescription.shape.name} and material ${this.modelValue.magnetic.core.functionalDescription.material}`
                if (this.modelValue.magnetic.core.functionalDescription.gapping.length == 0) {
                    this.localTexts.coreDescription += ', ungapped.'
                }
                else if (this.modelValue.magnetic.core.functionalDescription.gapping.length == this.modelValue.magnetic.core.processedDescription.columns.length) {
                    if (this.modelValue.magnetic.core.functionalDescription.gapping[0].type == 'residual') {
                        this.localTexts.coreDescription += ', ungapped.'
                    }
                    else {
                        this.localTexts.coreDescription += `, with a grinded gap of ${removeTrailingZeroes(this.modelValue.magnetic.core.functionalDescription.gapping[0].length * 1000, 5)} mm.`
                    }
                }
                else if (this.modelValue.magnetic.core.functionalDescription.gapping.length > this.modelValue.magnetic.core.processedDescription.columns.length) {
                    this.localTexts.coreDescription += `, with a disitrbuted gap of ${removeTrailingZeroes(this.modelValue.magnetic.core.functionalDescription.gapping[0].length * 1000, 5)} mm.`
                }
            }
            {
                const aux = formatUnit(1 / this.modelValue.outputs[0].magnetizingInductance.reluctanceCore.nominal, "H/turn");
                this.localTexts.coreMaterial = `It has a permeance (AL value) of ${removeTrailingZeroes(aux.label, 1)} ${aux.unit}.`
            }
            {
                this.localTexts.numberTurns = `Using ${removeTrailingZeroes(this.modelValue.magnetic.coil.functionalDescription[0].numberTurns)} turns will produce a magnetic with the following estimated output per operating point:`
            }

            this.localTexts.magnetizingInductance = [];
            this.localTexts.coreLosses = [];
            this.localTexts.coreTemperature = [];
            this.localTexts.dcResistance = [];
            this.localTexts.windingLosses = [];

            for (var operatingPointIndex = 0; operatingPointIndex < this.modelValue.inputs.operatingPoints.length; operatingPointIndex++) {
                this.localTexts.magnetizingInductance.push({text: null, value: null});
                this.localTexts.coreLosses.push({text: null, value: null});
                this.localTexts.coreTemperature.push({text: null, value: null});
                this.localTexts.dcResistance.push({text: null, value: null});
                this.localTexts.windingLosses.push({text: null, value: null});
                {
                    const aux = formatInductance(this.modelValue.outputs[operatingPointIndex].magnetizingInductance.magnetizingInductance.nominal);
                    this.localTexts.magnetizingInductance[operatingPointIndex].text = 'Mag. Ind.';
                    this.localTexts.magnetizingInductance[operatingPointIndex].value = `${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`;
                }
                {
                    const aux = formatPower(this.modelValue.outputs[operatingPointIndex].coreLosses.coreLosses);
                    this.localTexts.coreLosses[operatingPointIndex].text = 'Core losses';
                    this.localTexts.coreLosses[operatingPointIndex].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                }
                {
                    const aux = formatTemperature(this.modelValue.outputs[operatingPointIndex].coreLosses.temperature);
                    this.localTexts.coreTemperature[operatingPointIndex].text = 'Core temp.';
                    this.localTexts.coreTemperature[operatingPointIndex].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                }
                if (this.modelValue.outputs[operatingPointIndex].windingLosses.dcResistancePerWinding != null)
                {
                    const aux = formatResistance(this.modelValue.outputs[operatingPointIndex].windingLosses.dcResistancePerWinding[0]);
                    this.localTexts.dcResistance[operatingPointIndex].text = 'Pri. DC Resis.';
                    this.localTexts.dcResistance[operatingPointIndex].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                }
                {
                    const aux = formatPower(this.modelValue.outputs[operatingPointIndex].windingLosses.windingLosses);
                    this.localTexts.windingLosses[operatingPointIndex].text = 'Wind. losses';
                    this.localTexts.windingLosses[operatingPointIndex].value = `${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`;
                }
            }

            // this.$mkf.ready.then(_ => {
            //     // hardcoded operation point
            //     const rmsPower = this.$mkf.calculate_rms_power(JSON.stringify(this.modelValue.inputs.operatingPoints[0].excitationsPerWinding[0]));
            //     const volume = this.modelValue.magnetic.core.processedDescription.width *
            //                    this.modelValue.magnetic.core.processedDescription.depth * 
            //                    this.modelValue.magnetic.core.processedDescription.height;
            //     const aux = formatPowerDensity(rmsPower / volume);
            //     this.localTexts.powerDensity = `P. dens.: ${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`;
            // }); 
            // {
            //     var masScore = 0;
            //     for (let [key, value] of Object.entries(this.scoring)) {
            //         masScore += value;
            //     }
            //     masScore /= 6;
            //     masScore *= 100;
            //     this.masScore = `${removeTrailingZeroes(masScore, 1)}`
            // }   
            // {
            //     const aux = formatInductance(this.modelValue.outputs[0].magnetizingInductance.magnetizingInductance.nominal);
            //     this.localTexts.magnetizingInductance = `Mag. Ind.: ${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`
            // }  
            // {
            //     // if (this.modelValue.outputs[0].coreLosses.temperature == null)
            //     const aux = formatTemperature(this.modelValue.outputs[0].coreLosses.temperature);
            //     this.localTexts.coreTemperature = `Core Temp.: ${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`
            // }    
        },
    },
    computed: {

    },
    mounted() {
        this.processLocalTexts();
    },
}

</script>

<template>
    <div class="offcanvas offcanvas-end bg-light" tabindex="-1" id="CoreAdviserDetailOffCanvas" aria-labelledby="CoreAdviserDetailOffCanvasLabel">
    <div class="offcanvas-header">
        <button data-cy="CoreAdviseDetail-corner-close-modal-button" type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="CoreAdviserDetailOffCanvasCanvasClose"></button>
    </div>
    <div class="offcanvas-body">
        <div v-if="modelValue.magnetic.manufacturerInfo != null" class="row mx-1">
            <h3 class="col-12 p-0 m-0">{{modelValue.magnetic.manufacturerInfo.reference}}</h3>
            <div class="col-12 fs-5 p-0 m-0 mt-2 text-start">{{localTexts.coreDescription}}</div>
            <div class="col-12 fs-5 p-0 m-0 mt-2 text-start">{{localTexts.coreMaterial}}</div>
            <div class="col-12 fs-5 p-0 m-0 mt-2 text-start">{{localTexts.numberTurns}}</div>
            <div class="row mt-4" v-for="operationPoint, operationPointIndex in modelValue.inputs.operatingPoints">
                <div class="col-12 fs-5 p-0 m-0 my-1">{{operationPoint.name}}</div>
                <div class="col-6 p-0 m-0 border">{{localTexts.magnetizingInductance[operationPointIndex].text}}</div>
                <div class="col-6 p-0 m-0 border">{{localTexts.magnetizingInductance[operationPointIndex].value}}</div>
                <div class="col-6 p-0 m-0 border">{{localTexts.coreLosses[operationPointIndex].text}}</div>
                <div class="col-6 p-0 m-0 border">{{localTexts.coreLosses[operationPointIndex].value}}</div>
                <div class="col-6 p-0 m-0 border">{{localTexts.coreTemperature[operationPointIndex].text}}</div>
                <div class="col-6 p-0 m-0 border">{{localTexts.coreTemperature[operationPointIndex].value}}</div>
                <div class="col-6 p-0 m-0 border">{{localTexts.dcResistance[operationPointIndex].text}}</div>
                <div class="col-6 p-0 m-0 border">{{localTexts.dcResistance[operationPointIndex].value}}</div>
                <div class="col-6 p-0 m-0 border">{{localTexts.windingLosses[operationPointIndex].text}}</div>
                <div class="col-6 p-0 m-0 border">{{localTexts.windingLosses[operationPointIndex].value}}</div>
            </div>
        </div>


        <div class="row">
            <button disabled data-cy="CoreAdviseDetail-import-button" class="offset-1 col-10 mt-5 btn text-light bg-primary float-start fs-5 px-4" data-bs-dismiss="offcanvas" @click="$emit( )">Customize</button>
            <button data-cy="CoreAdviseDetail-import-button" class="offset-1 col-10 btn mt-1 text-light bg-primary float-start fs-5 px-4" data-bs-dismiss="offcanvas">Select and continue</button>
            <label class="fs-5 mt-3 col-12">Distributors</label>

            <a v-for="distributor, distributorIndex in modelValue.magnetic.core.distributorsInfo" 
                href={{distributor.link}} data-cy="CoreAdviseDetail-import-button" class="offset-1 col-10 mt-1 text-primary float-start fs-5 px-4" data-bs-dismiss="offcanvas">{{'Buy it at ' + distributor.name}}</a>
        </div>
    </div>
</div>

</template>