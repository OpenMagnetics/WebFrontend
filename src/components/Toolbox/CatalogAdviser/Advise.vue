<script setup>
import { Chart, registerables } from 'chart.js'
import { toTitleCase, removeTrailingZeroes, formatPower, formatPowerDensity, formatInductance, formatTemperature } from '/WebSharedComponents/assets/js/utils.js'
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
            type: Object,
            required: true
        },
        selected: {
            type: Boolean,
            default: false,
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const data = {};
        const localTexts = {
            coreLosses: null,
            powerDensity: null,
            magnetizingInductance: null,
            coreTemperature: null,
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
        // 'scoring'(newValue, oldValue) {
        //     console.log("watching " + this.adviseIndex)
        //     console.log(newValue)
        //     chart.data.labels = this.filters;
        //     chart.update();
        // },
    },
    mounted () {

        this.processLocalTexts();

        this.$emit("adviseReady")
    },
    methods: {
        processLocalTexts() {
            {
                console.log(this.masData)
                console.log(this.scoring)
                const aux = formatPower(this.masData.outputs[0].coreLosses.coreLosses + this.masData.outputs[0].windingLosses.windingLosses);
                this.localTexts.losses = `Losses:\n${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`
            }

            this.$mkf.ready.then(_ => {
                // hardcoded operation point
                const rmsPower = this.$mkf.calculate_rms_power(JSON.stringify(this.masData.inputs.operatingPoints[0].excitationsPerWinding[0]));
                const volume = this.masData.magnetic.core.processedDescription.width *
                               this.masData.magnetic.core.processedDescription.depth * 
                               this.masData.magnetic.core.processedDescription.height;
                const aux = formatPowerDensity(rmsPower / volume);
                this.localTexts.powerDensity = `Power dens.:\n${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`;
            }); 
            {
                var masScore = 0;
                for (let [key, value] of Object.entries(this.scoring)) {
                    masScore += value;
                }
                masScore /= 3;
                masScore *= 100;
                this.masScore = `${removeTrailingZeroes(masScore, 1)}`
            }   
            {
                const aux = formatInductance(this.masData.outputs[0].magnetizingInductance.magnetizingInductance.nominal);
                this.localTexts.magnetizingInductance = `Mag. Ind.:\n${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`
            }  
        }
    }
}
</script>

<template>
    <div class="container">
        <div class="card p-0 m-0">
            <div class="card-header row p-0 m-0 mt-2 pb-2">
                <p class="fs-6 col-10 p-0 px-1 fw-bold">{{fixedMagneticName}}</p>
                <p class="fs-4 col-2 p-0 m-0 text-success">{{masScore}}</p>
                <!-- <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p> -->
            </div>
            <div class="row py-3">
                <div class="col-5 mx-2 text-start px-4">
                    <div class="col-12 p-0 m-0" style="white-space: pre-line">{{localTexts.losses}}</div>
                    <div class="col-12 p-0 m-0" style="white-space: pre-line">{{localTexts.powerDensity}}</div>
                </div>
            </div>
            <div class="card-body">
                <button :data-cy="dataTestLabel + '-advise-' + adviseIndex + '-details-button'" class="btn btn-primary col-4" data-bs-toggle="offcanvas" data-bs-target="#CoreAdviserDetailOffCanvas" @click="$emit('selectedMas')"> Details </button>
                <button :data-cy="dataTestLabel + '-advise-' + adviseIndex + '-select-button'" :class="selected? 'btn-success' : 'btn-primary'" class="btn  offset-1 col-4" @click="$emit('selectedMas')">{{selected? 'Selected' : 'Select'}}</button>
            </div>
        </div>
    </div>
</template>

