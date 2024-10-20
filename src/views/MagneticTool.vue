<script setup>
import { useMasStore } from '/src/stores/mas'
import { useAdviseCacheStore } from '/src/stores/adviseCache'
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import Storyline from '/src/components/Storyline.vue'
import { toTitleCase } from '/src/assets/js/utils.js'

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
            if (this.$userStore.magneticToolSubsection == "welcome") {
                this.$userStore.magneticToolSubsection = "designRequirements";
            }
            delete currentStoryline.welcome;
        }

        if (!this.$userStore.isAnyDesignLoaded()) {
            this.$userStore.designLoaded();
            const masStore = useMasStore();
            masStore.resetMas();

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
                this.$userStore.magneticSelectedTool = "magneticSpecificationsReport";
                this.$userStore.magneticSpecificationsReportSubsection = "magneticSpecificationsSummary";
                this.$userStore.magneticSpecificationsReportCanContinue.designRequirements = true;
                this.$userStore.magneticSpecificationsReportCanContinue.operatingPoints = true;
            }
            if (tool == 'magneticCoreAdviser') {
                this.currentStoryline = this.magneticCoreAdviserStoryline;
                this.$userStore.magneticSelectedTool = "magneticCoreAdviser";
                this.$userStore.magneticCoreAdviserSubsection = "magneticCoreAdviser";
                this.$userStore.magneticCoreAdviserCanContinue.designRequirements = true;
                this.$userStore.magneticCoreAdviserCanContinue.operatingPoints = true;
            }
            if (tool == 'magneticAdviser') {
                this.currentStoryline = this.magneticAdviserStoryline;
                this.$userStore.magneticSelectedTool = "magneticAdviser";
                this.$userStore.magneticAdviserSubsection = "magneticAdviser";
                this.$userStore.magneticAdviserCanContinue.designRequirements = true;
                this.$userStore.magneticAdviserCanContinue.operatingPoints = true;
            }
            if (tool == 'magneticBuilder') {
                this.currentStoryline = this.magneticBuilderStoryline;
                this.$userStore.magneticSelectedTool = "magneticBuilder";
                this.$userStore.magneticBuilderSubsection = "magneticBuilder";
                this.$userStore.magneticBuilderCanContinue.designRequirements = true;
                this.$userStore.magneticBuilderCanContinue.operatingPoints = true;
            }
        },
    },
    mounted() {
        console.log("this.$userStore.magneticSelectedTool")
        console.log(this.$userStore.magneticSelectedTool)
    },
    created() {
    },
}
</script>

<template>
    <GenericTool
        v-if="$userStore.magneticSelectedTool == 'magneticTool'"
        :toolLabel="'magneticTool'"
        :currentStoryline="currentStoryline"
        :dataTestLabel="'MagneticTool'"
        :showControlPanel="true"
        @toolSelected="toolSelected"
    />
    <GenericTool
        v-if="$userStore.magneticSelectedTool == 'magneticBuilder'"
        :toolLabel="'magneticBuilder'"
        :currentStoryline="magneticBuilderStoryline"
        :dataTestLabel="'MagneticBuilder'"
        :showControlPanel="true"
    />
    <GenericTool
        v-if="$userStore.magneticSelectedTool == 'magneticAdviser'"
        :toolLabel="'magneticAdviser'"
        :currentStoryline="magneticAdviserStoryline"
        :dataTestLabel="'MagneticAdviser'"
        :showControlPanel="true"
    />
    <GenericTool
        v-if="$userStore.magneticSelectedTool == 'magneticCoreAdviser'"
        :toolLabel="'magneticCoreAdviser'"
        :currentStoryline="magneticCoreAdviserStoryline"
        :dataTestLabel="'MagneticCoreAdviser'"
        :showControlPanel="true"
    />
    <GenericTool
        v-if="$userStore.magneticSelectedTool == 'magneticSpecificationsReport'"
        :toolLabel="'magneticSpecificationsReport'"
        :currentStoryline="magneticSpecificationsReportStoryline"
        :dataTestLabel="'MagneticSpecificationsReport'"
        :showControlPanel="true"
    />
</template>

