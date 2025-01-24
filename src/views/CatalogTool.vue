<script setup>
import { useMasStore } from '/src/stores/mas'
import { useCatalogStore } from '/src/stores/catalog'
import { useAdviseCacheStore } from '/src/stores/adviseCache'
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import Storyline from '/src/components/Storyline.vue'
import { toTitleCase } from '/WebSharedComponents/assets/js/utils.js'

import GenericTool from '/src/components/Toolbox/GenericTool.vue'

</script>

<script>
export default {
    data() {
        const catalogAdviserStoryline = {
            "designRequirements": {
                title: "Design Requirements",
                nextTool: "operatingPoints"
            },
            "operatingPoints": {
                title: "Operating Points",
                prevTool: "designRequirements",
                nextTool: "catalogAdviser",
            },
            "catalogAdviser": {
                title: "Magnetic Adviser",
                prevTool: "operatingPoints",
                nextTool: "magneticViewer",
            },
            "magneticViewer": {
                title: "Magnetic Viewer",
                prevTool: "catalogAdviser",
            },
        };

        const currentStoryline = catalogAdviserStoryline;
        const catalogStore = useCatalogStore();
        catalogStore.catalogUrl = "/cmcs.ndjson"

        if (!this.$userStore.isAnyDesignLoaded()) {
            this.$userStore.designLoaded();
            const masStore = useMasStore();

            masStore.resetMas("filter");
        }

        return {
            catalogAdviserStoryline,
            currentStoryline,
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
        :currentStoryline="catalogAdviserStoryline"
        :dataTestLabel="'MagneticTool'"
        :showControlPanel="true"
    />
</template>

