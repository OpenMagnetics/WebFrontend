<script setup>
import { toCamelCase, formatUnit, removeTrailingZeroes } from '/src/assets/js/utils.js'
import { use } from 'echarts/core'
import { ScatterChart, EffectScatterChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  ToolboxComponent,
  GridComponent,
  DataZoomComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts';

use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  ToolboxComponent,
  GridComponent,
  DataZoomComponent,
  ScatterChart,
  EffectScatterChart,
  CanvasRenderer
])

</script>

<script>
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        data: {
            type: Object,
        },
        reference: {
            type: Object,
        },
        xLabel: {
            type: String,
        },
        yLabel: {
            type: String,
        },
        forceUpdate:{
            type: Number,
            default: 0
        },
    },
    emits: [
        'click',
    ],
    data() {
        const limits = this.processLimits()
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
        var options = {
            title: {
                left: 'center',
                text: "Core Visual Map",
                textStyle: {
                    fontSize: 25,
                    color: theme['white'],
                },
                subtextStyle: {
                    fontSize: 17,
                    color: theme['white'],
                },
                subtext: this.processSubtext(),
            },
            tooltip: {
                trigger: 'item',
                axisPointer: {
                    type: 'cross'
                },
                formatter : (params) => {
                    if (params.seriesIndex == 1) {
                        return "Current core";
                    }
                    else {
                        return this.data[params.dataIndex].label;
                    }
                }
            },
            toolbox: {
                right: 20,
                feature: {
                    dataZoom: {}
                }
            },
            xAxis: {
                min: limits.xAxis.min,
                max: limits.xAxis.max,
                axisLabel: {
                  fontSize: 13,
                  color: theme['white'],

                  formatter: (value) => `${removeTrailingZeroes(formatUnit(this.xLabel == "Saturation"? value * 100 : value, this.processUnit(this.xLabel)).label, 2)} ${formatUnit(this.xLabel == "Saturation"? value * 100 : value, this.processUnit(this.xLabel), this.processUnit(this.xLabel)).unit}`,
                }
            },
            yAxis: {
                min: limits.yAxis.min,
                max: limits.yAxis.max,
                axisLabel: {
                  fontSize: 13,
                  color: theme['white'],

                  formatter: (value) => `${removeTrailingZeroes(formatUnit(this.yLabel == "Saturation"? value * 100 : value, this.processUnit(this.yLabel)).label, 2)} ${formatUnit(this.yLabel == "Saturation"? value * 100 : value, this.processUnit(this.yLabel), this.processUnit(this.yLabel)).unit}`,
                }
            },

            dataZoom: [
                {
                    type: 'inside'
                },
                {
                    type: 'slider',
                    showDataShadow: false,
                    handleIcon:
                    'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
                    handleSize: '80%'
                },
                {
                    type: 'inside',
                    orient: 'vertical'
                },
                {
                    type: 'slider',
                    orient: 'vertical',
                    showDataShadow: false,
                    handleIcon:
                    'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
                    handleSize: '80%'
                }
            ],
            animation: false,
            series: [
                {
                    type: 'scatter',
                    data: this.processData(),
                    dimensions: ['x', 'y'],
                    symbolSize: 10,
                    blendMode: 'source-over',
                    color: theme["success"],
                },
                {
                    type: 'effectScatter',
                    symbolSize: 12,
                    data: [[this.reference[toCamelCase(this.xLabel)], this.reference[toCamelCase(this.yLabel)]]],
                    color: theme["info"],
                }
            ]
        };

        const updateOpts = {
            notMerge: true,
        }

        return {
            options,
            updateOpts,
            theme,
        }
    },
    watch: {
        forceUpdate(newValue, oldValue) {
            this.processOptions(this.options);
        },
    },
    mounted() {
    },
    created() {
    },
    computed: {
    },
    methods: {
        processLabel(label) {
            if (label == "Core Losses") {
                return "Core Loss";
            }
            else if (label == "Dimensions") {
                return "Dimensions";
            }
            else if (label == "Permeance") {
                return "AL value (Permeance)";
            }
            else if (label == "Saturation") {
                return "% to Saturation";
            }
            else if (label == "Winding Window Area") {
                return "Winding Window Area";
            }

            return "";
        },
        processUnit(label) {
            if (label == "Core Losses") {
                return "W";
            }
            else if (label == "Dimensions") {
                return "m³";
            }
            else if (label == "Permeance") {
                return "H/tu.";
            }
            else if (label == "Saturation") {
                return "%";
            }
            else if (label == "Winding Window Area") {
                return "m²";
            }

            return "";
        },
        processSubtext() {
            var subtext = "";
            subtext += this.processLabel(this.xLabel);
            subtext += " vs ";
            subtext += this.processLabel(this.yLabel);
            return subtext;
        },
        processData() {
            const data = [];
            this.data.forEach((elem) => {
                const aux = [elem[toCamelCase(this.xLabel)], elem[toCamelCase(this.yLabel)]];
                data.push(aux);
            });
            return data;
        },
        processLimits() {
            const limits = {}
            const referencePoint = [this.reference[toCamelCase(this.xLabel)], this.reference[toCamelCase(this.yLabel)]];
            var xLimit = 0;
            var yLimit = 0;
            this.data.forEach((elem) => {
                const auxPoint = [elem[toCamelCase(this.xLabel)], elem[toCamelCase(this.yLabel)]];
                xLimit = Math.max(xLimit, Math.abs(referencePoint[0] - auxPoint[0]));
                yLimit = Math.max(yLimit, Math.abs(referencePoint[1] - auxPoint[1]));
            })

            limits.xAxis = {
                min: Math.max(0, referencePoint[0] - xLimit),
                max: Math.max(0, referencePoint[0] + xLimit),
            };
            limits.yAxis = {
                min: Math.max(0, referencePoint[1] - yLimit),
                max: Math.max(0, referencePoint[1] + yLimit),
            };
            return limits;
        },
        processOptions(options) {
            const referencePoint = [this.reference[toCamelCase(this.xLabel)], this.reference[toCamelCase(this.yLabel)]];
            const limits = this.processLimits()
            options.title.subtext = this.processSubtext();

            options.xAxis.min = limits.xAxis.min;
            options.xAxis.max = limits.xAxis.max;
            options.yAxis.min = limits.yAxis.min;
            options.yAxis.max = limits.yAxis.max;

            options.series[1].data = [];
            options.series[1].data = [referencePoint];

            options.series[0].data = [];
            options.series[0].data = this.processData();
        },
        onClick(event) {
            this.$emit('click', event);
        }
    },
}
</script>

<template>
    <v-chart class="chart" :option="options" autoresize :update-options="updateOpts" @click="onClick" :style="'height: 50vh'"/>
</template>
