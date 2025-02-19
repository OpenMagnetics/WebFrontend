<script setup>
import { useMasStore } from '/src/stores/mas'
import { useAdviseCacheStore } from '/src/stores/adviseCache'
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import { toTitleCase } from '/WebSharedComponents/assets/js/utils.js'

import GenericTool from '/src/components/Toolbox/GenericTool.vue'

</script>

<script>
export default {
    data() {
        const magneticSpecificationsReportStoryline = {
            "designRequirements": {
                title: "Design Req.",
                nextTool: "operatingPoints"
            },
            "operatingPoints": {
                title: "Op. Points",
                prevTool: "designRequirements",
                nextTool: "magneticSpecificationsSummary",
            },
            "magneticSpecificationsSummary": {
                title: "Summary",
                prevTool: "operatingPoints",
            },
        };

        const magneticAdviserStoryline = {
            "designRequirements": {
                title: "Design Req.",
                nextTool: "operatingPoints"
            },
            "operatingPoints": {
                title: "Op. Points",
                prevTool: "designRequirements",
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
            "designRequirements": {
                title: "Design Req.",
                nextTool: "operatingPoints"
            },
            "operatingPoints": {
                title: "Op. Points",
                prevTool: "designRequirements",
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

        const magneticCoreAdviserStoryline = {
            "designRequirements": {
                title: "Design Req.",
                nextTool: "operatingPoints"
            },
            "operatingPoints": {
                title: "Op. Points",
                prevTool: "designRequirements",
                nextTool: "magneticCoreAdviser",
            },
            "magneticCoreAdviser": {
                title: "Core Adviser",
                prevTool: "operatingPoints",
                nextTool: "magneticCoreSummary",
            },
            "magneticCoreSummary": {
                title: "Summary",
                prevTool: "magneticCoreAdviser",
            },
        };

        const agnosticStoryline = {
            "welcome": {
                title: "Welcome",
                nextTool: "designRequirements"
            },
            "designRequirements": {
                title: "Design Req.",
                nextTool: "operatingPoints"
            },
            "operatingPoints": {
                title: "Op. Points",
                prevTool: "designRequirements",
                nextTool: "toolSelector",
            },
            "toolSelector": {
                title: "Tool Selector",
                prevTool: "operatingPoints",
            },
        };

        const currentStoryline = agnosticStoryline;

        if (!this.$userStore.showWelcome) {
            if (this.$stateStore.getCurrentToolState().subsection == "welcome") {
                this.$stateStore.setCurrentToolSubsection("designRequirements");
            }
            delete currentStoryline.welcome;
        }

        console.log("this.$stateStore.isAnyDesignLoaded()")
        console.log(this.$stateStore.isAnyDesignLoaded())
        if (!this.$stateStore.isAnyDesignLoaded()) {
            this.$stateStore.designLoaded();
            const masStore = useMasStore();

            if (this.$stateStore.selectedWorkflow == 'design') {
                this.$stateStore.reset();
                masStore.resetMas("design");
            }
            else if (this.$stateStore.selectedWorkflow == 'filter') {
                this.$stateStore.reset();
                masStore.resetMas("filter");
            }

            const adviseCacheStore = useAdviseCacheStore();
            adviseCacheStore.cleanMasAdvises();
        }

        return {
            magneticSpecificationsReportStoryline,
            magneticAdviserStoryline,
            magneticBuilderStoryline,
            magneticCoreAdviserStoryline,
            agnosticStoryline,
            currentStoryline,
        }
    },
    methods: {
        toolSelected(tool) {
            if (tool == 'agnosticTool') {
                this.currentStoryline = this.agnosticStoryline;
                this.$stateStore.selectTool("agnosticTool");
                this.$stateStore.setCurrentToolSubsection("toolSelector");
                this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
                this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            }
            if (tool == 'magneticSpecificationsReport') {
                this.currentStoryline = this.magneticSpecificationsReportStoryline;
                this.$stateStore.selectTool("magneticSpecificationsReport");
                this.$stateStore.setCurrentToolSubsection("magneticSpecificationsSummary");
                this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
                this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            }
            if (tool == 'magneticCoreAdviser') {
                this.currentStoryline = this.magneticCoreAdviserStoryline;
                this.$stateStore.selectTool("magneticCoreAdviser");
                this.$stateStore.setCurrentToolSubsection("magneticCoreAdviser");
                this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
                this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            }
            if (tool == 'magneticAdviser') {
                this.currentStoryline = this.magneticAdviserStoryline;
                this.$stateStore.selectTool("magneticAdviser");
                this.$stateStore.setCurrentToolSubsection("magneticAdviser");
                this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
                this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            }
            if (tool == 'magneticBuilder') {
                this.currentStoryline = this.magneticBuilderStoryline;
                this.$stateStore.selectTool("magneticBuilder");
                this.$stateStore.setCurrentToolSubsection("magneticBuilder");
                this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
                this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            }
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
        v-if="$stateStore.selectedTool == 'agnosticTool'"
        :currentStoryline="currentStoryline"
        :dataTestLabel="'MagneticTool'"
        :showControlPanel="true"
        @toolSelected="toolSelected"
    />
    <GenericTool
        v-if="$stateStore.selectedTool == 'magneticBuilder'"
        :currentStoryline="magneticBuilderStoryline"
        :dataTestLabel="'MagneticBuilder'"
        :showControlPanel="true"
        @toolSelected="toolSelected"
    />
    <GenericTool
        v-if="$stateStore.selectedTool == 'magneticAdviser'"
        :currentStoryline="magneticAdviserStoryline"
        :dataTestLabel="'MagneticAdviser'"
        :showControlPanel="true"
        @toolSelected="toolSelected"
    />
    <GenericTool
        v-if="$stateStore.selectedTool == 'magneticCoreAdviser'"
        :currentStoryline="magneticCoreAdviserStoryline"
        :dataTestLabel="'MagneticCoreAdviser'"
        :showControlPanel="true"
        @toolSelected="toolSelected"
    />
    <GenericTool
        v-if="$stateStore.selectedTool == 'magneticSpecificationsReport'"
        :currentStoryline="magneticSpecificationsReportStoryline"
        :dataTestLabel="'MagneticSpecificationsReport'"
        :showControlPanel="true"
        @toolSelected="toolSelected"
    />
</template>

