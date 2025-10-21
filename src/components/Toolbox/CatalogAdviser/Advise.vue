<script setup>
import { Chart, registerables } from 'chart.js'
import { toTitleCase, removeTrailingZeroes, formatPower, formatDimension, formatInductance, formatResistance } from '/WebSharedComponents/assets/js/utils.js'
</script>

<script>
var options = {};
var chart = null;
export default {
    props: {
        adviseIndex: {
            type: Number,
            required: true
        },
        masData: {
            type: Object,
            required: true
        },
        scoring: {
            type: Number,
            required: true
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
        allowView: {
            type: Boolean,
            required: true
        },
        allowOrder: {
            type: Boolean,
            required: true
        },
        allowEdit: {
            type: Boolean,
            required: true
        },
    },
    data() {
        const data = {};
        const localTexts = {
            losses: null,
            dcResistance: null,
            magnetizingInductance: null,
            dimensions: null,
        };
        return {
            data,
            localTexts,
            masScore: null,
        }
    },
    computed: {
        fixedMagneticName() {
            if (this.masData.magnetic.manufacturerInfo.reference.split("Gapped ").length > 1) {
                var gapLength = null;
                var extraForStacks = '';
                if (this.masData.magnetic.manufacturerInfo.reference.split("Gapped ")[1].split(" mm").length > 0) {
                    gapLength =  removeTrailingZeroes(Number(this.masData.magnetic.manufacturerInfo.reference.split("Gapped ")[1].split(" mm")[0]));
                    if (this.masData.magnetic.manufacturerInfo.reference.split("Gapped ")[1].split(" mm").length > 1) {
                        extraForStacks = this.masData.magnetic.manufacturerInfo.reference.split("Gapped ")[1].split(" mm")[1];
                    }
                }
                this.masData.magnetic.manufacturerInfo.reference = this.masData.magnetic.manufacturerInfo.reference.split("Gapped ")[0] + gapLength + " mm" + extraForStacks;
            }
            else {
                // this.masData.magnetic.manufacturerInfo.reference = this.masData.magnetic.manufacturerInfo.reference.replaceAll("Ungapped", "Ung.");
            }
            return this.masData.magnetic.manufacturerInfo.reference;
        },
    },
    watch: {
    },
    mounted () {

        this.processLocalTexts();
    },
    methods: {
        processLocalTexts() {
            // {
            //     const aux = formatPower(this.masData.outputs[0].coreLosses.coreLosses + this.masData.outputs[0].windingLosses.windingLosses);
            //     this.localTexts.losses = `Losses:\n${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`
            // }
            {
                console.log(this.masData.magnetic)
                this.localTexts.core = `Core: ${this.masData.magnetic.core.functionalDescription.shape.name} - ${this.masData.magnetic.core.functionalDescription.material.name}`
            }
            {
                console.log(this.masData.magnetic)
                this.localTexts.turnsRatios = "Turns ratios: ";
                this.masData.magnetic.coil.functionalDescription.forEach((elem, index) => {
                    if (index > 0) {
                        this.localTexts.turnsRatios += `${removeTrailingZeroes(this.masData.magnetic.coil.functionalDescription[0].numberTurns / elem.numberTurns, 1)}:`;
                    }
                })
                if (this.localTexts.turnsRatios != "Turns ratios: ") {
                    this.localTexts.turnsRatios = this.localTexts.turnsRatios.slice(0, -1);
                }
            }
            {
                const aux = formatInductance(this.masData.outputs[0].magnetizingInductance.magnetizingInductance.nominal);
                this.localTexts.magnetizingInductance = `Mag. Ind.: ${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`
            }
            {
                const aux = formatResistance(this.masData.outputs[0].windingLosses.dcResistancePerWinding[0]);
                this.localTexts.dcResistance = `DC Res.: ${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`
            } 
            {
                this.$mkf.ready.then(_ => {
                    const maximumDimensions = this.$mkf.get_maximum_dimensions(JSON.stringify(this.masData.magnetic));
                    const maximumDimensions0 = formatDimension(maximumDimensions.get(0));
                    const maximumDimensions1 = formatDimension(maximumDimensions.get(1));
                    const maximumDimensions2 = formatDimension(maximumDimensions.get(2));
                    this.localTexts.dimensions = `Dim.: ${removeTrailingZeroes(maximumDimensions0.label, 2)} ${maximumDimensions0.unit} x ${removeTrailingZeroes(maximumDimensions1.label, 2)} ${maximumDimensions1.unit} x ${removeTrailingZeroes(maximumDimensions2.label, 2)} ${maximumDimensions2.unit}`
                })
            }  
        }
    }
}
</script>

<template>
    <div class="container">
        <div v-if="masData.magnetic.manufacturerInfo != null" class="card p-0 m-0 " :style="$styleStore.catalogAdviser.adviserHeader">
            <div class="card-header row p-0 m-0 mt-1 pb-0" :style="$styleStore.catalogAdviser.adviserHeader">
                <p class="text-center fs-4 col-9 p-0 px-1 fw-bold m-0 mb-1">{{fixedMagneticName}}</p>
                <p class="text-center fs-4 col-2 p-0 px-1 fw-bold m-0 mb-1">{{removeTrailingZeroes(scoring * 100, 1)}}</p>
            </div>
            <div class="card-body" :style="$styleStore.catalogAdviser.adviserBody">
                <div class="row p-0 m-0 py-2">
                    <div class="col-12 m-0 row text-center">
                        <!-- <div class="col-4 p-0 m-0" style="white-space: pre-line">{{localTexts.losses}}</div> -->
                        <div class="col-12 p-0 m-0" style="white-space: pre-line">{{localTexts.core}}</div>
                        <div class="col-12 p-0 m-0" style="white-space: pre-line">{{localTexts.turnsRatios}}</div>
                        <div class="col-12 p-0 m-0" style="white-space: pre-line">{{localTexts.dcResistance}}</div>
                        <div class="col-12 p-0 m-0" style="white-space: pre-line">{{localTexts.magnetizingInductance}}</div>
                        <!-- <div class="col-12 p-0 m-0" style="white-space: pre-line">{{localTexts.dimensions}}</div> -->
                    </div>
                </div>
                <button
                    v-if="allowView"
                    :style="$styleStore.catalogAdviser.viewButton"
                    :data-cy="dataTestLabel + '-advise-' + adviseIndex + '-view-button'"
                    class="btn btn-primary col-3"
                    @click="$emit('viewMagnetic')"
                >
                    {{'View'}}
                </button>
                <button
                    :style="$styleStore.catalogAdviser.editButton"
                    v-if="allowEdit || scoring < 0"
                    :data-cy="dataTestLabel + '-advise-' + adviseIndex + '-edit-button'"
                    class="btn btn-info offset-1 col-3"
                    @click="$emit('editMagnetic')"
                >
                    {{'Edit'}}
                </button>
                <button
                    v-if="allowOrder"
                    :style="$styleStore.catalogAdviser.orderButton"
                    :data-cy="dataTestLabel + '-advise-' + adviseIndex + '-order-button'"
                    class="btn btn-success offset-1 col-4"
                    @click="$emit('orderSample')"
                >
                    {{'Order a sample'}}
                </button>
            </div>
        </div>
    </div>
</template>

