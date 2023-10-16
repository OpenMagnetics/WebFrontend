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
                nextTool: "magneticSpecificationFinalizer",
            },
            "magneticSpecificationFinalizer": {
                title: "Summary",
                prevTool: "operatingPoints",
            },
        };

        return {
            currentStoryline,
            updateStoryline: 0,
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
        :toolLabel="'magneticSpecification'"
        :currentStoryline="currentStoryline"
        :dataTestLabel="'MagneticSpecification'"
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
