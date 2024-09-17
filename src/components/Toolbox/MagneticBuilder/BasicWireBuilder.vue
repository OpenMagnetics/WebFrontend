<script setup>
import { useMasStore } from '/src/stores/mas'
import Wire2DVisualizer from '/src/components/Common/Wire2DVisualizer.vue'
import BasicTurnsSelector from '/src/components/Toolbox/MagneticBuilder/BasicTurnsSelector.vue'
import BasicWireSelector from '/src/components/Toolbox/MagneticBuilder/BasicWireSelector.vue'
</script>

<script>
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const masStore = useMasStore();
        const selectedWindingIndex = 0;
        return {
            masStore,
            selectedWindingIndex,
        }
    },
    computed: {
    },
    watch: { 
    },
    mounted () {
    },
    methods: {
        windingIndexChanged(windingIndex) {
            this.selectedWindingIndex = windingIndex;
        }
    }
}
</script>

<template>
    <h5 v-if="masStore.mas.magnetic.core == null || masStore.mas.magnetic.core.functionalDescription.shape==''" class="text-danger my-2">Select a core first</h5>

    <div v-else class="container">
        <div class="row mb-2" style="max-height: 30vh">
            <Wire2DVisualizer 
                :dataTestLabel="`${dataTestLabel}-Wire2DVisualizer`"
                :wire="masStore.mas.magnetic.coil.functionalDescription[selectedWindingIndex].wire"
                :windingIndex="selectedWindingIndex"
                :operatingPoint="masStore.mas.inputs.operatingPoints[0]"
                :includeCurrentDensity="$userStore.wire2DVisualizerPlotCurrentDensity == 1"
                :loadingGif="'/images/loading.gif'"
            />
        </div>
        <div class="row">
            <h5 class="offset-0 col-8 text-end">Plot current density</h5>
            <div class="col-4 container">
                <div class="row">
                    <label  class="fs-6 p-0 ps-3 pe-3 text-end text-white col-4 ">No</label>
                    <input :data-cy="'Settings-Modal-with-without-stock-button'" v-model="$userStore.wire2DVisualizerPlotCurrentDensity" type="range" class="form-range col-2 pt-2" min="0" max="1" step="1" style="width: 30px">
                    <label  class="fs-6 p-0 ps-3 text-white col-3  text-start">Yes</label>
                </div>
            </div>
        </div>
        <div v-if="masStore.mas.magnetic.coil.functionalDescription.length > 1" class="row">
            <div class="accordion row m-0 p-0" id="wireBuilderAccordion bg-dark">
                <div :class="'col-lg-' + Number(12 / masStore.mas.magnetic.coil.functionalDescription.length)" class="accordion-item border-0 m-0 p-0 bg-dark" v-for="value, key in masStore.mas.magnetic.coil.functionalDescription">
                    <h2 class="accordion-header" :id="'wireBuilderAccordionHeading-' + key">
                        <button :class="selectedWindingIndex == key? '' : 'collapsed'" class="fs-5 accordion-button text-info bg-light" type="button" data-bs-toggle="collapse" aria-expanded="false" :aria-controls="'wireBuilderAccordioncollapse_' + key" @click="windingIndexChanged(key)">
                            {{key + 1}}
                        </button>
                    </h2>
                </div>
            </div>
        </div>
        <div class="row">
            <div v-for="value, key in masStore.mas.magnetic.coil.functionalDescription">
                <BasicTurnsSelector
                    class="mt-1"
                    v-if="selectedWindingIndex==key"
                    :windingIndex="key"
                />
                <BasicWireSelector
                    v-if="selectedWindingIndex==key"
                    :windingIndex="key"
                />
            </div>
        </div>
    </div>
</template>
