<script setup>
import { useMasStore } from '/src/stores/mas'
import { toTitleCase, removeTrailingZeroes, formatInductance, formatPower, formatTemperature, formatResistance} from '/src/assets/js/utils.js'
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
    emits: ["zoomIn", "zoomOut", "swapFieldPlot", "swapIncludeFringing"],
    components: {
    },
    props: {
        modelValue:{
            type: Object,
            required: true
        },
        enableZoom: {
            type: Boolean,
            default: true,
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const localTexts = {};
        const masStore = useMasStore();


        return {
            localTexts,
            masStore,
            posting: false,
            zoomingPlot: false,
            showFieldPlot: false,
            includeFringing: true,
        }
    },
    watch: {
        modelValue(newValue, oldValue) {
            this.posting = true;
            setTimeout(() => {this.calculateMagneticSectionPlot();}, 10);
        },
    },
    methods: {
        calculateMagneticSectionAndFieldPlot() {
            this.posting = true;
            const url = import.meta.env.VITE_API_ENDPOINT + '/plot_core_and_fields'

            if (this.enableZoom) {
                this.$refs.plotView.innerHTML = ""
            }
            this.$refs.zoomPlotView.innerHTML = ""
            this.$axios.post(url, {magnetic: this.modelValue.magnetic, operatingPoint: this.modelValue.inputs.operatingPoints[0], includeFringing: this.includeFringing})
            .then(response => {
                if (this.enableZoom) {
                    this.$refs.plotView.innerHTML = response.data
                }
                this.$refs.zoomPlotView.innerHTML = response.data
                this.$refs.zoomPlotView.innerHTML = this.$refs.zoomPlotView.innerHTML.replace(`<svg`, `<svg class="h-75 w-100"`);
                this.posting = false;
            })
            .catch(error => {
                this.posting = false;
                console.error("Error loading inventory")
                console.error(error)
            });
        },
        calculateMagneticSectionPlot() {
            this.posting = true;
            const url = import.meta.env.VITE_API_ENDPOINT + '/plot_core'

            if (this.enableZoom) {
                this.$refs.plotView.innerHTML = ""
            }
            this.$refs.zoomPlotView.innerHTML = ""
            this.$axios.post(url, {magnetic: this.modelValue.magnetic, operatingPoint: this.modelValue.inputs.operatingPoints[0]})
            .then(response => {
                if (this.enableZoom) {
                    this.$refs.plotView.innerHTML = response.data
                }
                this.$refs.zoomPlotView.innerHTML = response.data
                this.$refs.zoomPlotView.innerHTML = this.$refs.zoomPlotView.innerHTML.replace(`<svg`, `<svg class="h-75 w-100"`);
                this.posting = false;
            })
            .catch(error => {
                this.posting = false;
                console.error("Error loading inventory")
                console.error(error)
            });
        },

        zoomIn() {
            this.zoomingPlot = true;
            this.$emit("zoomIn");
        },
        zoomOut() {
            this.zoomingPlot = false;
            this.$emit("zoomOut");
        },
        swapFieldPlot() {
            this.showFieldPlot = !this.showFieldPlot;
            if (this.showFieldPlot) {
                this.calculateMagneticSectionAndFieldPlot();
            }
            else {
                this.calculateMagneticSectionPlot();
            }
            this.$emit("swapFieldPlot");
        },
        swapIncludeFringing() {
            this.includeFringing = !this.includeFringing;
            this.calculateMagneticSectionAndFieldPlot();
            this.$emit("swapIncludeFringing");
        },
    },
    computed: {
    },
    mounted() {
        setTimeout(() => {this.calculateMagneticSectionPlot();}, 10);
    },
}

</script>

<template>
    <div v-if="enableZoom" v-show="zoomingPlot" class="row mx-1" style="height: 100%;">
        <button class="btn" @click="zoomOut()">
            <label class="col-12 text-info fw-lighter" >(Click on image to go back)</label>
            <div data-cy="MagneticAdvise-core-field-plot-zoom-image" ref="zoomPlotView" class="mt-2" style="width: 100%; height: 100%" />
        </button>
    </div>

    <div v-show="!zoomingPlot">
        <img data-cy="CorePublish-loading" v-if="posting" class="mx-auto d-block container" alt="loading" style="height: auto;" src="/images/loading.gif">

        <div v-show="!posting">
            <div>
                <button v-if="enableZoom" class="btn" @click="zoomIn()">
                    <label  class="col-12 text-info fw-lighter">(Click on image to zoom in)</label>
                    <div data-cy="MagneticAdvise-core-field-plot-image" ref="plotView" class="col-12 mt-2" style="height: 100%;" />
                </button>
                <div v-else data-cy="MagneticAdvise-core-field-plot-zoom-image" ref="zoomPlotView" class="mt-2" style="width: 100%; height: 100%" />
            </div>
            <div class="text-center">
                <button class="btn btn-primary mt-1" @click="swapFieldPlot()">{{showFieldPlot? 'Hide H field' : 'Show H field'}}</button>
                <button v-if="showFieldPlot" class="btn btn-primary ms-1 mt-1" @click="swapIncludeFringing()">{{includeFringing? 'Exclude Fringing H field' : 'Include Fringing H field'}}</button>
            </div>
        </div>
    </div>

</template>