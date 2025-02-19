<script setup>
import { useMasStore } from '/src/stores/mas'
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import { toTitleCase } from '/WebSharedComponents/assets/js/utils.js'

import GenericTool from '/src/components/Toolbox/GenericTool.vue'

</script>

<script>
export default {
    data() {
        const magneticViewerStoryline = {
            "operatingPoints": {
                title: "Operating Points",
                nextTool: "magneticAdviser",
            },
            "magneticBuilder": {
                title: "Magnetic Builder",
                prevTool: "operatingPoints",
            },
        };

        return {
            magneticViewerStoryline,
        }
    },
    methods: {
    },
    mounted() {
    },
    created() {
    },
}
</script>

<template>
    <GenericTool
        v-if="$stateStore.selectedTool == 'magneticViewer'"
        :toolLabel="'magneticViewer'"
        :currentStoryline="magneticViewerStoryline"
        :dataTestLabel="'MagneticViewer'"
        :showControlPanel="true"
    />
</template>

