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
        graphType: {
            type: String,
            default: 'radar',
        },
        dataTestLabel: {
            type: String,
            default: '',
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
        const data = {};
        const localTexts = {
            coreLosses: null,
            powerDensity: null,
            magnetizingInductance: null,
            coreTemperature: null,
        };
        return {
            data,
            theme,
            localTexts,
            masScore: null,
        }
    },
    computed: {
        brokenLinedFilters() {
            const titledFilters = [];
            for (let [key, _] of Object.entries(this.scoring)) {
                var aux = toTitleCase(key.toLowerCase().replaceAll("_", " "));
                // titledFilters.push(aux.split(' ').map(item => item.length <= 8? item + ' ' : item.slice(0, 6) + '. ').map(item => toTitleCase(item)).join());
                // titledFilters.push(aux.split(' ').map(item => item.length <= 8? item + ' ' : item.slice(0, 6) + '. ').map(item => toTitleCase(item)));
                titledFilters.push(aux);
            }
            return titledFilters;
        },
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
        options = {
            scales: {
                r: {
                    pointLabels: {
                        display: true,
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        display: false
                    },
                    grid: {
                        color: "#636363",
                        display: true
                    },
                    max: 1,
                    min: 0,
                },
                y: {
                    beginAtZero: true,
                    display: this.graphType == "bar",
                }
            },
            plugins:{
                legend:{
                    display: false,
                }
            },
            elements: {
                line: {
                    borderWidth: 3
                }
            }
        }

        this.data = {
            labels: this.brokenLinedFilters,
            datasets: [{
                label: '',
                data: Object.values(this.scoring),
                fill: true,
                backgroundColor: this.theme.primary,
                borderColor: this.theme.primary,
                pointBackgroundColor: this.theme.success,
                pointBorderColor: this.theme.success,
                pointHoverBackgroundColor: this.theme.info,
                pointHoverBorderColor: this.theme.info
            }]
        }

        this.processLocalTexts();

        Chart.register(...registerables)
        this.createChart('chartSpiderAdvise-' + this.adviseIndex, options)
        this.$emit("adviseReady")
    },
    methods: {
        createChart(chartId, options) {
            const ctx = document.getElementById(chartId)
            if (ctx != null) {
                chart = new Chart(ctx, {
                    type: this.graphType,
                    data: this.data,
                    options: options,
                })
                chart.update()
            }
        },
        processLocalTexts() {
            if (this.masData.outputs[0].coreLosses == null) {
                this.localTexts = {}
                return
            }

            {
                const aux = formatPower(this.masData.outputs[0].coreLosses.coreLosses);
                this.localTexts.coreLosses = `Core losses: ${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`
            }

            this.$mkf.ready.then(_ => {
                // hardcoded operation point
                const rmsPower = this.$mkf.calculate_rms_power(JSON.stringify(this.masData.inputs.operatingPoints[0].excitationsPerWinding[0]));
                const volume = this.masData.magnetic.core.processedDescription.width *
                               this.masData.magnetic.core.processedDescription.depth * 
                               this.masData.magnetic.core.processedDescription.height;
                const aux = formatPowerDensity(rmsPower / volume);
                this.localTexts.powerDensity = `P. dens.: ${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`;
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
                this.localTexts.magnetizingInductance = `Mag. Ind.: ${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`
            }  
            {
                // if (this.masData.outputs[0].coreLosses.temperature == null)
                    // console.log(this.masData)
                const aux = formatTemperature(this.masData.outputs[0].coreLosses.temperature);
                this.localTexts.coreTemperature = `Core Temp.: ${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`
            }
        }
    }
}
</script>

<template>
    <div class="container">
        <div class="card p-0 m-0">
            <div class="card-header row p-0 m-0 mt-2 pb-2">
                <p class="fs-5 col-10 p-0 px-1 ">{{fixedMagneticName}}</p>
                <p class="fs-4 col-2 p-0 m-0 text-success">{{masScore}}</p>
                <!-- <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p> -->
            </div>
            <canvas :id="'chartSpiderAdvise-' + adviseIndex" style="max-height: 50%"></canvas>
            <div class="row mx-1">
                <div class="col-6 p-0 m-0">{{localTexts.coreLosses}}</div>
                <div class="col-6 p-0 m-0">{{localTexts.coreTemperature}}</div>
                <div class="col-6 p-0 m-0">{{localTexts.powerDensity}}</div>
                <div class="col-6 p-0 m-0">{{localTexts.magnetizingInductance}}</div>
            </div>
            <div class="card-body">
                <button :data-cy="dataTestLabel + '-advise-' + adviseIndex + '-details-button'" class="btn btn-primary col-4" data-bs-toggle="offcanvas" data-bs-target="#CoreAdviserDetailOffCanvas" @click="$emit('selectedMas')"> Details </button>
                <button :data-cy="dataTestLabel + '-advise-' + adviseIndex + '-select-button'" :class="selected? 'btn-success' : 'btn-primary'" class="btn  offset-1 col-4" @click="$emit('selectedMas')">{{selected? 'Selected' : 'Select'}}</button>
            </div>
        </div>
    </div>
</template>

