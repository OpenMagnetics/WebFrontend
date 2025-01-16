<script setup>
import { useMasStore } from '/src/stores/mas'
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
        const magneticAdviserStoryline = {
            "filterDesignRequirements": {
                title: "Design Requirements",
                nextTool: "operatingPoints"
            },
            "operatingPoints": {
                title: "Operating Points",
                prevTool: "filterDesignRequirements",
                nextTool: "magneticAdviser",
            },
            "magneticAdviser": {
                title: "Magnetic Adviser",
                prevTool: "operatingPoints",
                nextTool: "magneticBuilder",
            },
            "magneticBuilder": {
                title: "Magnetic Builder",
                prevTool: "magneticAdviser",
                nextTool: "magneticSummary",
            },
            "magneticSummary": {
                title: "Summary",
                prevTool: "magneticAdviser",
            },
        };

        const magneticBuilderStoryline = {
            "filterDesignRequirements": {
                title: "Design Requirements",
                nextTool: "operatingPoints"
            },
            "operatingPoints": {
                title: "Operating Points",
                prevTool: "filterDesignRequirements",
                nextTool: "magneticAdviser",
            },
            "magneticBuilder": {
                title: "Magnetic Builder",
                prevTool: "operatingPoints",
                nextTool: "magneticSummary",
            },
            "magneticSummary": {
                title: "Summary",
                prevTool: "magneticBuilder",
            },
        };

        const initialStoryline = {
            "welcome": {
                title: "Welcome",
                nextTool: "filterDesignRequirements"
            },
            "filterDesignRequirements": {
                title: "Design Requirements",
                nextTool: "operatingPoints"
            },
            "operatingPoints": {
                title: "Operating Points",
                prevTool: "filterDesignRequirements",
                nextTool: "toolSelector",
            },
            "toolSelector": {
                title: "Tool Selector",
                prevTool: "operatingPoints",
            },
        };

        const currentStoryline = initialStoryline;

        if (!this.$userStore.showWelcome) {
            if (this.$userStore.filterMagneticToolSubsection == "welcome") {
                this.$userStore.filterMagneticToolSubsection = "filterDesignRequirements";
            }
            delete currentStoryline.welcome;
        }

        if (!this.$userStore.isAnyDesignLoaded()) {
            this.$userStore.designLoaded();
            const masStore = useMasStore();
            masStore.resetMas("filter");

            const adviseCacheStore = useAdviseCacheStore();
            adviseCacheStore.cleanMasAdvises();
        }

        return {
            magneticAdviserStoryline,
            magneticBuilderStoryline,
            initialStoryline,
            currentStoryline,
        }
    },
    methods: {
        toolSelected(tool) {
            console.log(tool)
            console.log(tool)
            console.log(tool)
            console.log(tool)
            console.log(tool)
            if (tool == 'magneticAdviser') {
                this.currentStoryline = this.magneticAdviserStoryline;
                this.$userStore.filterMagneticSelectedTool = "magneticAdviser";
                this.$userStore.filterMagneticAdviserSubsection = "magneticAdviser";
                this.$userStore.filterMagneticAdviserCanContinue.filterDesignRequirements = true;
                this.$userStore.filterMagneticAdviserCanContinue.operatingPoints = true;
            }
            if (tool == 'magneticBuilder') {
                this.currentStoryline = this.magneticBuilderStoryline;
                this.$userStore.filterMagneticSelectedTool = "magneticBuilder";
                this.$userStore.filterMagneticBuilderSubsection = "magneticBuilder";
                this.$userStore.filterMagneticBuilderCanContinue.filterDesignRequirements = true;
                this.$userStore.filterMagneticBuilderCanContinue.operatingPoints = true;
            }

            console.log(this.currentStoryline)
            console.log(this.$userStore.filterMagneticBuilderC)
        },
    },
    mounted() {
        console.log("this.$userStore.filterMagneticSelectedTool")
        console.log(this.$userStore.filterMagneticSelectedTool)
    },
    created() {
    },
}
</script>

<template>
    <GenericTool
        v-if="$userStore.filterMagneticSelectedTool == 'filterMagneticTool'"
        :toolLabel="'filterMagneticTool'"
        :currentStoryline="currentStoryline"
        :dataTestLabel="'MagneticTool'"
        :showControlPanel="true"
        @toolSelected="toolSelected"
    />
    <GenericTool
        v-if="$userStore.filterMagneticSelectedTool == 'magneticBuilder'"
        :toolLabel="'filterMagneticBuilder'"
        :currentStoryline="magneticBuilderStoryline"
        :dataTestLabel="'MagneticBuilder'"
        :showControlPanel="true"
    />
    <GenericTool
        v-if="$userStore.filterMagneticSelectedTool == 'magneticAdviser'"
        :toolLabel="'filterMagneticAdviser'"
        :currentStoryline="magneticAdviserStoryline"
        :dataTestLabel="'MagneticAdviser'"
        :showControlPanel="true"
    />
    <GenericTool
        v-if="$userStore.filterMagneticSelectedTool == 'magneticCoreAdviser'"
        :toolLabel="'filterMagneticCoreAdviser'"
        :currentStoryline="magneticCoreAdviserStoryline"
        :dataTestLabel="'MagneticCoreAdviser'"
        :showControlPanel="true"
    />
    <GenericTool
        v-if="$userStore.filterMagneticSelectedTool == 'magneticSpecificationsReport'"
        :toolLabel="'filterMagneticSpecificationsReport'"
        :currentStoryline="magneticSpecificationsReportStoryline"
        :dataTestLabel="'MagneticSpecificationsReport'"
        :showControlPanel="true"
    />
</template>

