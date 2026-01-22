<script setup>
import { useMasStore } from '../stores/mas'
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import { toTitleCase } from '/WebSharedComponents/assets/js/utils.js'

import GenericTool from '../components/Toolbox/GenericTool.vue'

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
}
</script>

<template>
    <Header />
    <GenericTool
        v-if="$stateStore.selectedTool == 'magneticViewer'"
        :toolLabel="'magneticViewer'"
        :currentStoryline="magneticViewerStoryline"
        :dataTestLabel="'MagneticViewer'"
        :showControlPanel="true"
    />
    <Footer />
</template>

