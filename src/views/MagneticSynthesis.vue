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
                nextTool: "coreAdviser",
            },
            "coreAdviser": {
                title: "Core Adviser",
                prevTool: "operatingPoints",
                nextTool: "wireAdviser",
                // advancedTool: "coreSimulation",
            },
            // "coreSimulation": {
            //     title: "Core Simulation",
            //     prevTool: "operatingPoints",
            //     nextTool: "wireAdviser",
            //     basicTool: "coreAdviser",
            //     advancedTool: "coreCustomization",
            // },
            // "coreCustomization": {
            //     title: "Core Customization",
            //     prevTool: "operatingPoints",
            //     nextTool: "wireAdviser",
            //     basicTool: "coreSimulation",
            // },
            "wireAdviser": {
                title: "Wire Adviser",
                prevTool: "coreAdviser",
                nextTool: "coilAdviser",
            },
            "wireCustomization": {
                title: "Wire Customization",
                prevTool: "coreAdviser",
                nextTool: "coilAdviser",
                basicTool: "wireAdviser",
            },
            "coilAdviser": {
                title: "Coil Adviser",
                prevTool: "wireAdviser",
                nextTool: "magneticSynthesisFinalizer",
                advancedTool: "coilCustomizer",
            },
            "coilCustomizer": {
                title: "Coil Adviser",
                prevTool: "wireAdviser",
                nextTool: "magneticSynthesisFinalizer",
                basicTool: "coilAdviser",
            },
            "magneticSynthesisFinalizer": {
                title: "Summary",
                prevTool: "coilAdviser",
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
