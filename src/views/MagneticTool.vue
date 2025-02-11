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
                title: "Design Requirements",
                nextTool: "operatingPoints"
            },
            "operatingPoints": {
                title: "Operating Points",
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
                title: "Design Requirements",
                nextTool: "operatingPoints"
            },
            "operatingPoints": {
                title: "Operating Points",
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
                nextTool: "magneticSummary",
            },
            "magneticSummary": {
                title: "Summary",
                prevTool: "magneticBuilder",
            },
        };

        const magneticCoreAdviserStoryline = {
            "designRequirements": {
                title: "Design Requirements",
                nextTool: "operatingPoints"
            },
            "operatingPoints": {
                title: "Operating Points",
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

        const initialStoryline = {
            "welcome": {
                title: "Welcome",
                nextTool: "designRequirements"
            },
            "designRequirements": {
                title: "Design Requirements",
                nextTool: "operatingPoints"
            },
            "operatingPoints": {
                title: "Operating Points",
                prevTool: "designRequirements",
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
                this.$userStore.setCurrentToolSubsection("designRequirements");
            }
            delete currentStoryline.welcome;
        }

        if (!this.$userStore.isAnyDesignLoaded()) {
            this.$userStore.designLoaded();
            const masStore = useMasStore();

            if (this.$userStore.selectedApplication == 'power') {
                this.$stateStore.reset();
                masStore.resetMas("power");
            }
            else if (this.$userStore.selectedApplication == 'filter') {
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
            initialStoryline,
            currentStoryline,
        }
    },
    methods: {
        toolSelected(tool) {
            if (tool == 'magneticSpecificationsReport') {
                this.currentStoryline = this.magneticSpecificationsReportStoryline;
                this.$userStore.selectTool("magneticSpecificationsReport");
                this.$userStore.setCurrentToolSubsection("magneticSpecificationsSummary");
                this.$userStore.setCurrentToolSubsectionStatus("designRequirements", true);
                this.$userStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            }
            if (tool == 'magneticCoreAdviser') {
                this.currentStoryline = this.magneticCoreAdviserStoryline;
                this.$userStore.selectTool("magneticCoreAdviser");
                this.$userStore.setCurrentToolSubsection("magneticCoreAdviser");
                this.$userStore.setCurrentToolSubsectionStatus("designRequirements", true);
                this.$userStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            }
            if (tool == 'magneticAdviser') {
                this.currentStoryline = this.magneticAdviserStoryline;
                this.$userStore.selectTool("magneticAdviser");
                this.$userStore.setCurrentToolSubsection("magneticAdviser");
                this.$userStore.setCurrentToolSubsectionStatus("designRequirements", true);
                this.$userStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            }
            if (tool == 'magneticBuilder') {
                this.currentStoryline = this.magneticBuilderStoryline;
                this.$userStore.selectTool("magneticBuilder");
                this.$userStore.setCurrentToolSubsection("magneticBuilder");
                this.$userStore.setCurrentToolSubsectionStatus("designRequirements", true);
                this.$userStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            }
        },
    },
    mounted() {
        console.log("this.$userStore.selectedTool")
        console.log(this.$userStore.selectedTool)
    },
    created() {
    },
}
</script>

<template>
    <GenericTool
        v-if="$userStore.selectedTool == 'agnosticTool'"
        :currentStoryline="currentStoryline"
        :dataTestLabel="'MagneticTool'"
        :showControlPanel="true"
        @toolSelected="toolSelected"
    />
    <GenericTool
        v-if="$userStore.selectedTool == 'magneticBuilder'"
        :currentStoryline="magneticBuilderStoryline"
        :dataTestLabel="'MagneticBuilder'"
        :showControlPanel="true"
    />
    <GenericTool
        v-if="$userStore.selectedTool == 'magneticAdviser'"
        :currentStoryline="magneticAdviserStoryline"
        :dataTestLabel="'MagneticAdviser'"
        :showControlPanel="true"
    />
    <GenericTool
        v-if="$userStore.selectedTool == 'magneticCoreAdviser'"
        :currentStoryline="magneticCoreAdviserStoryline"
        :dataTestLabel="'MagneticCoreAdviser'"
        :showControlPanel="true"
    />
    <GenericTool
        v-if="$userStore.selectedTool == 'magneticSpecificationsReport'"
        :currentStoryline="magneticSpecificationsReportStoryline"
        :dataTestLabel="'MagneticSpecificationsReport'"
        :showControlPanel="true"
    />
</template>

