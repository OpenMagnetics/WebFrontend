<script setup>
import { useMasStore } from '/src/stores/mas'
import ElementFromList from '/src/components/DataInput/ElementFromList.vue'
import Dimension from '/src/components/DataInput/Dimension.vue'
import BasicWireSubmenu from '/src/components/Toolbox/MagneticBuilder/BasicWireSubmenu.vue'
import BasicWireInfo from '/src/components/Toolbox/MagneticBuilder/BasicWireInfo.vue'
import { useDataCacheStore } from '/src/stores/dataCache'
import { toTitleCase, checkAndFixMas, deepCopy } from '/src/assets/js/utils.js'
</script>

<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        sectionIndex: {
            type: Number,
            default: 0,
        },
        data: {
            type: Object,
            default: 0,
        },
        loadingGif: {
            type: String,
            default: "/images/loading.gif",
        },
    },
    data() {
        const masStore = useMasStore();
        const windingOrientations = {};
        const CoilAlignments = {};

        return {
            masStore,
            windingOrientations,
            CoilAlignments,
        }
    },
    computed: {
    },
    watch: {
    },
    mounted () {
        this.getWindingOrientations();
        this.getCoilAlignments();
    },
    methods: {
        getWindingOrientations() {
            this.$mkf.ready.then(_ => {
                const handle = this.$mkf.get_available_winding_orientations();
                for (var i = handle.size() - 1; i >= 0; i--) {
                    const type = handle.get(i);
                    this.windingOrientations[type] = toTitleCase(type);
                }
            });
        },
        getCoilAlignments() {
            this.$mkf.ready.then(_ => {
                const handle = this.$mkf.get_available_coil_alignments();
                for (var i = handle.size() - 1; i >= 0; i--) {
                    const type = handle.get(i);
                    this.CoilAlignments[type] = toTitleCase(type);
                }
            });
        },
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <ElementFromList
                class="col-12 mb-1 text-start"
                :dataTestLabel="dataTestLabel + '-LayersOrientation'"
                :name="'layersOrientation'"
                :replaceTitle="'Layers Orientation'"
                :titleSameRow="true"
                :justifyContent="true"
                v-model="data[sectionIndex]"
                :options="windingOrientations"
                :labelStyleClass="'col-7'"
                :selectStyleClass="'col-5'"
                @update="$emit('coilUpdated')"
            />

            <ElementFromList
                class="col-12 mb-1 text-start"
                :dataTestLabel="dataTestLabel + '-TurnsAlignment'"
                :name="'turnsAlignment'"
                :titleSameRow="true"
                :justifyContent="true"
                v-model="data[sectionIndex]"
                :options="CoilAlignments"
                :labelStyleClass="'col-7'"
                :selectStyleClass="'col-5'"
                @update="$emit('coilUpdated')"
            />

        </div>
    </div>
</template>
