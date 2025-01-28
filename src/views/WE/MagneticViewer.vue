<script setup>
import { useMasStore } from '/src/stores/mas'
import { useAdviseCacheStore } from '/src/stores/adviseCache'
import Storyline from '/src/components/Storyline.vue'
import { toTitleCase } from '/WebSharedComponents/assets/js/utils.js'

import GenericTool from '/src/components/WE/GenericTool.vue'

</script>

<script>
export default {
    data() {
        const magneticViewerStoryline = {
            "operatingPoints": {
                title: "Operating Points",
                nextTool: "magneticAdviser",
            },
            "magneticViewer": {
                title: "Magnetic Viewer",
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
        v-if="$userStore.selectedTool == 'magneticViewer'"
        :toolLabel="'magneticViewer'"
        :currentStoryline="magneticViewerStoryline"
        :dataTestLabel="'MagneticViewer'"
        :showControlPanel="true"
    />
</template>

