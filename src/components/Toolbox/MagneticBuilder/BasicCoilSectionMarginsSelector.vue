<script setup>
import { useMasStore } from '/src/stores/mas'
import ElementFromList from '/src/components/DataInput/ElementFromList.vue'
import Dimension from '/src/components/DataInput/Dimension.vue'
import { useDataCacheStore } from '/src/stores/dataCache'
import { toTitleCase, checkAndFixMas, deepCopy } from '/src/assets/js/utils.js'
import SectionSelector from '/src/components/Toolbox/MagneticBuilder/SectionSelector.vue'
import { tooltipsMagneticBuilder } from '/src/assets/js/texts.js'
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
            default: 0,
        },
        showMarginOptions: {
            type: Boolean,
            default: false,
        },
        loadingGif: {
            type: String,
            default: "/images/loading.gif",
        },
    },
    data() {
        const masStore = useMasStore();
        const forceUpdate = 0;
        const blockingRebounds = false;
        const selectedSectionIndex = 0;
        const topOrLeftMarginErrorMessage = "";
        const bottomOrRightMarginErrorMessage = "";

        return {
            masStore,
            forceUpdate,
            blockingRebounds,
            selectedSectionIndex,
            topOrLeftMarginErrorMessage,
            bottomOrRightMarginErrorMessage,
        }
    },
    computed: {
        styleTooltip() {
            var relative_placement;
            relative_placement = 'top'
            return {
                theme: {
                    placement: relative_placement,
                    "text-align": "start",
                },
            }
        },
        topOrLeftMarginTooltip() {
            if (this.masStore.mas.magnetic.coil.bobbin.processedDescription.windingWindows[0].sectionsOrientation == 'contiguous') {
                console.log(tooltipsMagneticBuilder.leftMargin)
                return tooltipsMagneticBuilder.leftMargin;
            }
            else {
                console.log(tooltipsMagneticBuilder.topMargin)
                return tooltipsMagneticBuilder.topMargin;
            }
        },
        bottomOrRightMarginTooltip() {
            if (this.masStore.mas.magnetic.coil.bobbin.processedDescription.windingWindows[0].sectionsOrientation == 'contiguous') {
                console.log(tooltipsMagneticBuilder.rightMargin)
                return tooltipsMagneticBuilder.rightMargin;
            }
            else {
                console.log(tooltipsMagneticBuilder.bottomMargin)
                return tooltipsMagneticBuilder.bottomMargin;
            }
        },
    },
    watch: {
    },
    mounted () {
    },
    methods: {
        topOrInnerMarginUpdated(sectionIndex) {
            if (!this.blockingRebounds) {
                this.$mkf.ready.then(_ => {
                    const isMarginHorizontal = this.masStore.mas.magnetic.coil.bobbin.processedDescription.windingWindows[0].sectionsOrientation == "contiguous";
                    const fits = this.$mkf.check_if_fits(JSON.stringify(this.masStore.mas.magnetic.coil.bobbin), this.data[sectionIndex].topOrLeftMargin, isMarginHorizontal);

                    if (fits) {
                        this.$emit('marginUpdated', sectionIndex);
                        this.topOrLeftMarginErrorMessage = "";
                    }
                    else{
                        this.topOrLeftMarginErrorMessage = "Margin is larger than winding window";
                    }
                });
            }
        },
        BottomOrOuterMarginUpdated(sectionIndex) {
            if (!this.blockingRebounds) {
                this.$mkf.ready.then(_ => {
                    const isMarginHorizontal = this.masStore.mas.magnetic.coil.bobbin.processedDescription.windingWindows[0].sectionsOrientation == "contiguous";
                    const fits = this.$mkf.check_if_fits(JSON.stringify(this.masStore.mas.magnetic.coil.bobbin), this.data[sectionIndex].bottomOrRightMargin, isMarginHorizontal);

                    if (fits) {
                        this.$emit('marginUpdated', sectionIndex);
                        this.bottomOrRightMarginErrorMessage = "";
                    }
                    else{
                        this.bottomOrRightMarginErrorMessage = "Margin is larger than winding window";
                    }
                });
            }
        },
        sectionIndexChanged(sectionIndex) {
            this.selectedSectionIndex = sectionIndex;
            this.forceUpdate += 1;
            this.blockingRebounds = true;
            setTimeout(() => this.blockingRebounds = false, 10);
        },
    }
}
</script>

<template>
    <div class="container">
        <div class="row" v-tooltip="styleTooltip">
            <SectionSelector
                v-show="showMarginOptions" 
                :sectionIndex="selectedSectionIndex"
                @sectionIndexChanged="sectionIndexChanged"
            />

            <Dimension 
                v-tooltip="topOrLeftMarginTooltip"
                v-if="showMarginOptions"
                class="col-12 mb-1 text-start"
                :name="'topOrLeftMargin'"
                :replaceTitle="'Top Margin'"
                :unit="'m'"
                :dataTestLabel="dataTestLabel + '-TopOrLeftMargin'"
                :numberDecimals="6"
                :min="1e-6"
                :max="1"
                :allowNegative="false"
                :allowZero="true"
                :modelValue="data[selectedSectionIndex]"
                :forceUpdate="forceUpdate"
                :styleClassInput="'offset-3 col-6'"
                @update="topOrInnerMarginUpdated(selectedSectionIndex)"
            />
            <label :data-cy="dataTestLabel + '-TopOrLeftMarginErrorMessage'" class="text-danger m-0" style="font-size: 0.9em"> {{topOrLeftMarginErrorMessage}}</label>

            <Dimension
                v-tooltip="bottomOrRightMarginTooltip"
                v-if="showMarginOptions"
                class="col-12 mb-1 text-start"
                :name="'bottomOrRightMargin'"
                :replaceTitle="'Bottom Margin'"
                :unit="'m'"
                :dataTestLabel="dataTestLabel + '-BottomOrRightMargin'"
                :numberDecimals="6"
                :min="1e-6"
                :max="1"
                :allowNegative="false"
                :allowZero="true"
                :modelValue="data[selectedSectionIndex]"
                :forceUpdate="forceUpdate"
                :styleClassInput="'offset-3 col-6'"
                @update="BottomOrOuterMarginUpdated(selectedSectionIndex)"
            />
            <label :data-cy="dataTestLabel + '-BottomOrRightMarginErrorMessage'" class="text-danger m-0" style="font-size: 0.9em"> {{bottomOrRightMarginErrorMessage}}</label>
        </div>
    </div>
</template>
