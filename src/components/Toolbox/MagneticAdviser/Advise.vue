<script setup>
import { Chart, registerables } from 'chart.js'
import { toTitleCase, removeTrailingZeroes, formatPower, formatPowerDensity, formatInductance, formatTemperature } from '/WebSharedComponents/assets/js/utils.js'
</script>

<script>
var options = {};
var chart = null;
export default {
    emits: ["adviseReady"],
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
        weightedTotalScoring: {
            type: Number,
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
            processedScoring: {},
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

        this.processedScoring = {};
        this.processedScoring["Losses"] = 0;
        var numberEfficiencyFilters = 0;
        Object.entries(this.scoring).forEach((elem) => {
            const [filter, value] = elem
            if (filter != "Cost" && filter != "Dimensions") {
                numberEfficiencyFilters += 1;
                this.processedScoring["Losses"] += value;
            }
            else {
                this.processedScoring[filter] = value;
            }
        })

        this.processedScoring["Losses"] /= numberEfficiencyFilters;

        this.data = {
            labels: this.brokenLinedFilters(this.processedScoring),
            datasets: [{
                label: '',
                data: Object.values(this.processedScoring),
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
        brokenLinedFilters(scoring) {
            const titledFilters = [];
            for (let [key, _] of Object.entries(scoring)) {
                var aux = toTitleCase(key.toLowerCase().replaceAll("_", " "));
                // titledFilters.push(aux.split(' ').map(item => item.length <= 8? item + ' ' : item.slice(0, 6) + '. ').map(item => toTitleCase(item)).join());
                // titledFilters.push(aux.split(' ').map(item => item.length <= 8? item + ' ' : item.slice(0, 6) + '. ').map(item => toTitleCase(item)));
                titledFilters.push(aux);
            }
            return titledFilters;
        },
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
            {
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
                <p class="fs-4 col-2 p-0 m-0 text-success">{{`${removeTrailingZeroes(weightedTotalScoring * 100, 1)}`}}</p>
                <!-- <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p> -->
            </div>
            <div class="row py-3">
                <div class="col-5 mx-2 text-start px-4">
                    <div class="col-12 p-0 m-0" style="white-space: pre-line">{{localTexts.losses}}</div>
                    <div class="col-12 p-0 m-0" style="white-space: pre-line">{{localTexts.powerDensity}}</div>
                </div>
                <canvas class="col-9" :id="'chartSpiderAdvise-' + adviseIndex" style="max-width: 50%; max-height: 70%;"></canvas>
            </div>
            <div class="card-body">
                <button :data-cy="dataTestLabel + '-advise-' + adviseIndex + '-details-button'" class="btn btn-primary col-4" data-bs-toggle="offcanvas" data-bs-target="#CoreAdviserDetailOffCanvas" @click="$emit('selectedMas')"> Details </button>
                <button :data-cy="dataTestLabel + '-advise-' + adviseIndex + '-select-button'" :class="selected? 'btn-success' : 'btn-primary'" class="btn  offset-1 col-4" @click="$emit('selectedMas')">{{selected? 'Selected' : 'Select'}}</button>
            </div>
        </div>
    </div>
</template>

