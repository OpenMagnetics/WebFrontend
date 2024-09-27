<script setup>
import { toTitleCase, removeTrailingZeroes, formatInductance, formatPower, formatTemperature, formatResistance} from '/src/assets/js/utils.js'
import Module from '/src/assets/js/libAdvisers.wasm.js'
</script>

<script>

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
        enableOptions: {
            type: Boolean,
            default: true,
        },
        enableHideOnFitting: {
            type: Boolean,
            default: true,
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
        showFieldPlotInit: {
            type: Boolean,
            default: false,
        },
        includeFringingInit: {
            type: Boolean,
            default: true,
        },
        coilFits: {
            type: Boolean,
            default: true,
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
        return {
            theme,
            posting: false,
            zoomingPlot: false,
            showFieldPlot: this.showFieldPlotInit,
            includeFringing: this.includeFringingInit,
            blockingRebounds: false,
        }
    },
    watch: {
        'modelValue': {
            handler(newValue, oldValue) {
                if (!this.blockingRebounds) {
                    this.blockingRebounds = true;
                    this.zoomingPlot = false;
                    this.showFieldPlot = this.showFieldPlotInit;
                    this.includeFringing = this.includeFringingInit;
                    this.zoomOut();
                    setTimeout(() => {this.plot();}, 10);
                    setTimeout(() => this.blockingRebounds = false, 20);
                }
            },
          deep: true
        },
        'showFieldPlotInit': {
            handler(newValue, oldValue) {
                this.showFieldPlot = this.showFieldPlotInit;
            },
          deep: true
        },
        'includeFringingInit': {
            handler(newValue, oldValue) {
                this.includeFringing = this.includeFringingInit;
            },
          deep: true
        },
    },
    methods: {
        calculateMagneticSectionAndFieldPlot() {
            if (this.modelValue.magnetic.coil.turnsDescription != null) {
                this.posting = true;
                const url = import.meta.env.VITE_API_ENDPOINT + '/plot_core_and_fields'

                this.$refs.plotView.innerHTML = ""
                if ("zoomPlotView" in this.$refs) {
                    this.$refs.zoomPlotView.innerHTML = ""
                }
                this.$axios.post(url, {magnetic: this.modelValue.magnetic, operatingPoint: this.modelValue.inputs.operatingPoints[0], includeFringing: this.includeFringing})
                .then(response => {
                    var clientWidth = this.$refs.Magnetic2DVisualizerContainer.clientWidth;
                    var clientHeight = this.$refs.Magnetic2DVisualizerContainer.clientHeight * 0.90;
                    const regex = /width="\d+" height="\d+" viewBox=/i;
                    this.$refs.plotView.innerHTML = response.data
                    const aux = this.$refs.plotView.innerHTML.match(regex)[0];
                    const regex2 = /\d+/g;
                    var match = aux.matchAll(regex2);
                    var originalDimensions = Array.from(match);
                    const originalProportion = originalDimensions[0] / originalDimensions[1]
                    if (originalProportion * clientHeight < clientWidth) {
                        clientWidth = originalProportion * clientHeight;
                    }
                    else {
                        clientHeight = clientWidth / originalProportion;
                    }


                    this.$refs.plotView.innerHTML = this.$refs.plotView.innerHTML.replace(regex, `class="bg-dark" width="${clientWidth}" height="${clientHeight}" viewBox=`);
                    this.$refs.plotView.innerHTML = this.$refs.plotView.innerHTML.replaceAll(`stroke="rgb(  0,   0,   0)" d="M0.00,`, `stroke="${this.theme.dark}" d="M0.00,`);
                    if ("zoomPlotView" in this.$refs) {
                        this.$refs.zoomPlotView.innerHTML = response.data
                        this.$refs.zoomPlotView.innerHTML = this.$refs.zoomPlotView.innerHTML.replace(`<svg`, `<svg class="h-100 w-100"`);
                        this.$refs.zoomPlotView.innerHTML = this.$refs.zoomPlotView.innerHTML.replaceAll(`stroke="rgb(  0,   0,   0)" d="M0.00,`, `stroke="${this.theme.dark}" d="M0.00,`);
                        this.$refs.zoomPlotView.innerHTML = this.$refs.zoomPlotView.innerHTML.replace(regex, `class="bg-dark" width="${clientWidth}" height="${clientHeight}" viewBox=`);
                    }
                    this.posting = false;
                })
                .catch(error => {
                    this.posting = false;
                    console.error("Error plotting")
                    console.error(error)
                });
            }
            else {
                this.$refs.plotView.innerHTML = ""
                if ("zoomPlotView" in this.$refs) {
                    this.$refs.zoomPlotView.innerHTML = ""
                }
            }
        },
        calculateMagneticSectionPlot() {
            if (this.modelValue.magnetic.coil.turnsDescription != null) {
                this.posting = true;
                const url = import.meta.env.VITE_API_ENDPOINT + '/plot_core'

                this.$axios.post(url, {magnetic: this.modelValue.magnetic, operatingPoint: this.modelValue.inputs.operatingPoints[0]})
                .then(response => {
                    var clientWidth = this.$refs.Magnetic2DVisualizerContainer.clientWidth;
                    var clientHeight = this.$refs.Magnetic2DVisualizerContainer.clientHeight * 0.90;
                    const regex = /width="\d+" height="\d+" viewBox=/i;
                    this.$refs.plotView.innerHTML = response.data
                    const aux = this.$refs.plotView.innerHTML.match(regex)[0];
                    const regex2 = /\d+/g;
                    var match = aux.matchAll(regex2);
                    var originalDimensions = Array.from(match);
                    const originalProportion = originalDimensions[0] / originalDimensions[1]
                    if (originalProportion * clientHeight < clientWidth) {
                        clientWidth = originalProportion * clientHeight;
                    }
                    else {
                        clientHeight = clientWidth / originalProportion;
                    }

                    this.$refs.plotView.innerHTML = this.$refs.plotView.innerHTML.replace(regex, `class="bg-dark" width="${clientWidth}" height="${clientHeight}" viewBox=`);
                    this.$refs.plotView.innerHTML = this.$refs.plotView.innerHTML.replaceAll(`stroke="rgb(  0,   0,   0)" d="M0.00,`, `stroke="${this.theme.dark}" d="M0.00,`);
                    if ("zoomPlotView" in this.$refs) {
                        this.$refs.zoomPlotView.innerHTML = response.data
                        this.$refs.zoomPlotView.innerHTML = this.$refs.zoomPlotView.innerHTML.replace(`<svg`, `<svg class="h-100 w-100"`);
                        this.$refs.zoomPlotView.innerHTML = this.$refs.zoomPlotView.innerHTML.replace(regex, `class="bg-dark" width="${clientWidth}" height="${clientHeight}" viewBox=`);
                        this.$refs.zoomPlotView.innerHTML = this.$refs.zoomPlotView.innerHTML.replaceAll(`stroke="rgb(  0,   0,   0)" d="M0.00,`, `stroke="${this.theme.dark}" d="M0.00,`);
                    }
                    this.posting = false;
                })
                .catch(error => {
                    this.posting = false;
                    console.error("Error plotting")
                    console.error(error)
                });
            }
            else {
                this.$refs.plotView.innerHTML = ""
                if ("zoomPlotView" in this.$refs) {
                    this.$refs.zoomPlotView.innerHTML = ""
                }
            }
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
            this.plot();
            this.$emit("swapFieldPlot", this.showFieldPlot);
        },
        swapIncludeFringing() {
            this.includeFringing = !this.includeFringing;
            this.plot();
            this.$emit("swapIncludeFringing", this.includeFringing);
        },
        plot() {
            if (this.showFieldPlot) {
                this.calculateMagneticSectionAndFieldPlot();
            }
            else {
                this.calculateMagneticSectionPlot();
            }
        },
        showCoilAnyway() {
            this.$userStore.wire2DVisualizerShowAnyway = true;
        },
    },
    computed: {
    },
    mounted() {
        setTimeout(() => {this.plot();}, 10);
    },
}

</script>

<template>
    <div v-if="!coilFits && modelValue.magnetic.coil.turnsDescription == null" class="container">
        <div class="row">
            <i class="col-12 fa-solid fa-9x fa-triangle-exclamation"></i>
            <label class="text-danger col-12 pt-1 fs-5" style="font-size: 1em">Winding turns not possible</label>
        </div>
    </div>
    <div v-if="!coilFits && !$userStore.wire2DVisualizerShowAnyway" class="container">
        <div class="row">
            <i class="col-12 fa-solid fa-9x fa-triangle-exclamation"></i>
            <label class="text-danger col-12 pt-1 fs-5" style="font-size: 1em">Turns don't fit in winding window</label>
            <button class="btn btn-danger offset-3 col-6 fs-5" @click="showCoilAnyway()">Show me anyway</button>
        </div>
    </div>

    <div v-else class="m-0 p-0 Magnetic2DVisualizer text-center mx-auto" ref="Magnetic2DVisualizerContainer" style="height: 100%; width: 100%;">
        <div v-if="enableZoom" v-show="zoomingPlot" class="row mx-1" style="height: 100%;">
            <button class="btn" @click="zoomOut()">
                <label class="col-12 text-info fw-lighter" >(Click on image to go back)</label>
                <div data-cy="MagneticAdvise-core-field-plot-zoom-image" ref="zoomPlotView" :class="showFieldPlot? 'bg-dark' : ''" class="m-0" style="width: 100%;" />
            </button>
        </div>

        <div v-show="!zoomingPlot">
            <img data-cy="CorePublish-loading" v-if="posting" class="mx-auto d-block container" alt="loading" style="height: auto;" src="/images/loading.gif">

            <div v-show="!posting">
                <div>
                    <button v-if="enableZoom" class="btn" @click="zoomIn()">
                        <label  class="col-12 text-info fw-lighter">(Click on image to zoom in)</label>
                        <div data-cy="MagneticAdvise-core-field-plot-image" ref="plotView" :class="showFieldPlot? 'bg-dark' : ''" class="col-12 mt-2" style="height: 100%;" />
                    </button>
                    <div v-else data-cy="MagneticAdvise-core-field-plot-zoom-image" ref="plotView" :class="showFieldPlot? 'bg-dark' : ''" class="m-0 " style="height: 100%" />
                </div>
                <div class="text-center">
                    <button  v-if="enableOptions && modelValue.magnetic.coil.turnsDescription != null" class="btn btn-primary mt-1" @click="swapFieldPlot()">{{showFieldPlot? 'Hide H field' : 'Show H field'}}</button>
                    <button v-if="showFieldPlot && enableOptions && modelValue.magnetic.coil.turnsDescription != null" class="btn btn-primary ms-1 mt-1" @click="swapIncludeFringing()">{{includeFringing? 'Exclude Fringing H field' : 'Include Fringing H field'}}</button>
                </div>
            </div>
        </div>
    </div>

</template>

<style>

    .Magnetic2DVisualizer {
        overflow: hidden;
        width: auto;
        height: auto;
    }
</style>