<script setup>
import { useMasStore } from '/src/stores/mas'
import Core3DVisualizer from '/src/components/Common/Core3DVisualizer.vue'
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
            selectedWindingIndex
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
            console.log("windingIndexChanged")
            console.log(windingIndex)
            this.selectedWindingIndex = windingIndex;
        }
    }
}
</script>

<template>
    <div class="container">
        <div class="row" style="height: 30vh">
            <Core3DVisualizer 
                :dataTestLabel="`${dataTestLabel}-Core3DVisualizer`"
                :core="masStore.mas.magnetic.core"
                :fullCoreModel="true"
                :loadingGif="'/images/loading.gif'"
            />
        </div>
        <div class="row">
            <div class="accordion row m-0 p-0" id="wireBuilderAccordion bg-dark">
                <div :class="'col-lg-' + Number(12 / masStore.mas.magnetic.coil.functionalDescription.length)" class="accordion-item border-0 m-0 p-0 bg-dark" v-for="value, key in masStore.mas.magnetic.coil.functionalDescription">
                    <h2 class="accordion-header" :id="'coreCalculatorheading-' + key">
                        <button :class="selectedWindingIndex == key? '' : 'collapsed'" class="fs-5 accordion-button text-info bg-light" type="button" data-bs-toggle="collapse" aria-expanded="false" :aria-controls="'wireBuilderAccordioncollapse_' + key" @click="windingIndexChanged(key)">
                            {{key + 1}}
                        </button>
                    </h2>
                </div>
            </div>
        </div>
        <div class="row">
            <div v-for="value, key in masStore.mas.magnetic.coil.functionalDescription">
                <BasicWireSelector
                    v-if="selectedWindingIndex==key"
                    :windingIndex="key"
                />
            </div>
        </div>
    </div>
</template>
