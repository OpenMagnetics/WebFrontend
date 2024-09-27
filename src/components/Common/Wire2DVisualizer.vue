<script setup>
import { deepCopy } from '/src/assets/js/utils.js'

</script>

<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        wire: {
            type: Object,
            required: true,
        },
        operatingPoint: {
            type: Object,
            required: false,
        },
        includeCurrentDensity: {
            type: Boolean,
            default: true,
        },
        windingIndex: {
            type: Number,
            default: 0,
        },
        loadingGif: {
            type: String,
            default: "/images/loading.gif",
        },
    },
    data() {
        const posting = false
        const recentChange = false
        const tryingToSend = false
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
            posting,
            recentChange,
            tryingToSend,
            theme,
        }
    },
    watch: {
        'wire': {
            handler(newValue, oldValue) {
                this.$userStore.wire2DVisualizerPlotCurrentViews[this.windingIndex] = null;
                this.tryToSend();
            },
            deep: true
        },
        'includeCurrentDensity': {
            handler(newValue, oldValue) {
                this.$userStore.wire2DVisualizerPlotCurrentViews[this.windingIndex] = null;
                this.tryToSend();
            },
            deep: true
        },
    },
    methods: {
        computeWire() {
            if (!this.posting && this.wire != null) {
                this.$mkf.ready.then(_ => {
                    const aux = deepCopy(this.wire);
                    // var core = JSON.parse(crossReferencers.get_wire_data(JSON.stringify(aux), false));
                    // var core = JSON.parse(crossReferencers.get_wire_data_by_name(JSON.stringify(aux), false));
                    this.posting = true;

                    var url;
                    var data;
                    console.log(this.operatingPoint)
                    if (this.includeCurrentDensity) {
                        data = {wire: this.wire, operatingPoint: this.operatingPoint}
                        url = import.meta.env.VITE_API_ENDPOINT + '/plot_wire_and_current_density';
                    }
                    else {
                        data = {wire: this.wire}
                        url = import.meta.env.VITE_API_ENDPOINT + '/plot_wire';
                    }

                    this.$axios.post(url, data)
                    .then(response => {
                        this.posting = false
                        // console.log(response.data)
                        this.$refs.wire2DPlotView.innerHTML = response.data
                        this.$refs.wire2DPlotView.innerHTML = this.$refs.wire2DPlotView.innerHTML.replace(`<svg`, `<svg class="h-100 w-100"`);
                        this.$refs.wire2DPlotView.innerHTML = this.$refs.wire2DPlotView.innerHTML.replace(`width="300" height="300"`,
                            `width="${this.$refs.wire2DPlotViewContainer.clientWidth}" height="${this.$refs.wire2DPlotViewContainer.clientHeight}"`);
                        this.$refs.wire2DPlotView.innerHTML = this.$refs.wire2DPlotView.innerHTML.replaceAll(`stroke="rgb(  0,   0,   0)" d="M0.00,`, `stroke="${this.theme.dark}" d="M0.00,`);
                        this.$userStore.wire2DVisualizerPlotCurrentViews[this.windingIndex] = this.$refs.wire2DPlotView.innerHTML;
                    })
                    .catch(error => {
                        this.$refs.wire2DPlotView.innerHTML = "Error in wire";
                        this.posting = false
                    });

                }).catch(error => {
                    console.error(error);
                });
            }
        },

        tryToSend() {
            if (this.$userStore.wire2DVisualizerPlotCurrentViews[this.windingIndex] == null) {
                if (!this.tryingToSend) {
                    this.recentChange = false
                    this.tryingToSend = true
                    setTimeout(() => {
                        if (!this.hasError) {
                            if (this.recentChange) {
                                this.tryingToSend = false
                                this.tryToSend()
                            }
                            else {
                                this.tryingToSend = false
                                this.computeWire()
                            }
                        }
                    }
                    , 500);
                }
            }
            else {
                this.$refs.wire2DPlotView.innerHTML = this.$userStore.wire2DVisualizerPlotCurrentViews[this.windingIndex];
            }
        },

    },
    mounted() {
        this.tryToSend();
    },
};
</script>

<template>
    <div class="mt-2 bg-dark wire2DPlotViewer text-center mx-auto" ref="wire2DPlotViewContainer">
        <img :data-cy="dataTestLabel + 'Wire2DVisualizer-loading'" v-if="posting" class="mx-auto d-block col-12" alt="loading" style="width: 60%; height: auto;" :src="loadingGif">
        <div :data-cy="dataTestLabel + 'Wire2DVisualizer-core-field-plot-image'" v-show="!posting" ref="wire2DPlotView" />
    </div>
</template>

<style>

    .wire2DPlotViewer {
/*        resize: horizontal;*/
        overflow: hidden;
        width: auto;
        height: auto;
    }
</style>