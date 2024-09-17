<script setup>
import { useMasStore } from '/src/stores/mas'
import Magnetic2DVisualizer from '/src/components/Common/Magnetic2DVisualizer.vue'
import BasicCoilSelector from '/src/components/Toolbox/MagneticBuilder/BasicCoilSelector.vue'
</script>

<script>
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        loadingGif: {
            type: String,
            default: "/images/loading.gif",
        },
    },
    data() {
        const masStore = useMasStore();
        return {
            masStore,
        }
    },
    computed: {
    },
    watch: { 
    },
    mounted () {
    },
    methods: {
        swapFieldPlot(newValue) {
            this.$userStore.magnetic2DVisualizerPlotMagneticField = newValue;
        },
        swapIncludeFringing(newValue) {
            this.$userStore.magnetic2DVisualizerPlotFringingField = newValue;
        },
    }
}
</script>

<template>
    <h5 v-if="masStore.mas.magnetic.core == null || masStore.mas.magnetic.core.functionalDescription.shape==''" class="text-danger my-2">Select a core first</h5>

    <div v-else class="container">
        <div class="row mb-3" style="height: 50vh">
            <Magnetic2DVisualizer 
                :modelValue="masStore.mas"
                :enableZoom="false"
                :enableOptions="true"
                :showFieldPlotInit="$userStore.magnetic2DVisualizerPlotMagneticField"
                :includeFringingInit="$userStore.magnetic2DVisualizerPlotFringingField"
                @swapFieldPlot="swapFieldPlot"
                @swapIncludeFringing="swapIncludeFringing"
                />
        </div>
        <div class="row mb-2" v-show="masStore.mas.magnetic.coil.sectionsDescription != null">
            <BasicCoilSelector
            />
        </div>
    </div>
</template>
