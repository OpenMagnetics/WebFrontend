<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import Storyline from '/src/components/Storyline.vue'
import { toTitleCase } from '/src/assets/js/utils.js'

import GenericTool from '/src/components/Toolbox/GenericTool.vue'

</script>

<script>
export default {
    data() {
        const currentStoryline = {
            "designRequirements": {
                title: "Design Requirements",
                nextTool: "operatingPoints"
            },
            "operatingPoints": {
                title: "Operating Points",
                prevTool: "designRequirements",
                nextTool: "magneticAdviser",
            },
            "magneticBuilder": {
                title: "Magnetic Builder",
                prevTool: "operatingPoints",
                nextTool: "magneticBuilderFinalizer",
            },
            "magneticAdviserFinalizer": {
                title: "Summary",
                prevTool: "magneticBuilder",
            },
        };

        return {
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
        :toolLabel="'magneticBuilder'"
        :currentStoryline="currentStoryline"
        :dataTestLabel="'MagneticBuilder'"
    />
</template>


<style lang="css">

.tool {
    min-height: 84vh;
    overflow: hidden;
}
.storyline {
    max-height: auto;
    position: fixed;
    overflow: hidden;
}

</style>
