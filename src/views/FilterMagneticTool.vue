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
            if (this.$userStore.getCurrentToolState().subsection == "welcome") {
                this.$userStore.setCurrentToolSubsection("filterDesignRequirements");
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
            console.log(this.$userStore.selectedTool)
            console.log(this.$userStore.selectedApplication)
            if (tool == 'magneticAdviser') {
                this.currentStoryline = this.magneticAdviserStoryline;
                this.$userStore.selectTool("magneticAdviser");
                this.$userStore.setCurrentToolSubsection("magneticAdviser");
                this.$userStore.setCurrentToolSubsectionStatus("filterDesignRequirements", true);
                this.$userStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            }
            if (tool == 'magneticBuilder') {
                this.currentStoryline = this.magneticBuilderStoryline;
                this.$userStore.selectTool("magneticBuilder");
                this.$userStore.setCurrentToolSubsection("magneticBuilder");
                this.$userStore.setCurrentToolSubsectionStatus("filterDesignRequirements", true);
                this.$userStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            }
            console.log(this.$userStore.selectedTool)

        },
    },
    mounted() {
    },
    created() {
    },
}
</script>

<template>
    <GenericTool
        v-if="$userStore.selectedTool == 'agnosticTool'"
        :toolLabel="'agnosticTool'"
        :currentStoryline="currentStoryline"
        :dataTestLabel="'MagneticTool'"
        :showControlPanel="true"
        @toolSelected="toolSelected"
    />
    <GenericTool
        v-if="$userStore.selectedTool == 'magneticBuilder'"
        :toolLabel="'filterMagneticBuilder'"
        :currentStoryline="magneticBuilderStoryline"
        :dataTestLabel="'MagneticBuilder'"
        :showControlPanel="true"
    />
    <GenericTool
        v-if="$userStore.selectedTool == 'magneticAdviser'"
        :toolLabel="'filterMagneticAdviser'"
        :currentStoryline="magneticAdviserStoryline"
        :dataTestLabel="'MagneticAdviser'"
        :showControlPanel="true"
    />
    <GenericTool
        v-if="$userStore.selectedTool == 'magneticCoreAdviser'"
        :toolLabel="'filterMagneticCoreAdviser'"
        :currentStoryline="magneticCoreAdviserStoryline"
        :dataTestLabel="'MagneticCoreAdviser'"
        :showControlPanel="true"
    />
    <GenericTool
        v-if="$userStore.selectedTool == 'magneticSpecificationsReport'"
        :toolLabel="'filterMagneticSpecificationsReport'"
        :currentStoryline="magneticSpecificationsReportStoryline"
        :dataTestLabel="'MagneticSpecificationsReport'"
        :showControlPanel="true"
    />
</template>

