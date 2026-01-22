<script setup>
import { useMasStore } from '../stores/mas'
import { useAdviseCacheStore } from '../stores/adviseCache'
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import { toTitleCase } from '/WebSharedComponents/assets/js/utils.js'

import GenericTool from '../components/Toolbox/GenericTool.vue'

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
                nextTool: "magneticBuilder",
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

        console.log("this.$stateStore.isAnyDesignLoaded()")
        console.log(this.$stateStore.isAnyDesignLoaded())
        if (!this.$stateStore.isAnyDesignLoaded()) {
            this.$stateStore.designLoaded();
            const masStore = useMasStore();

            if (this.$stateStore.getCurrentApplication() == this.$stateStore.SupportedApplications.Power) {
                this.$stateStore.reset();
                masStore.resetMas("power");
            }
            if (this.$stateStore.getCurrentApplication() == this.$stateStore.SupportedApplications.CommonModeChoke) {
                this.$stateStore.reset();
                masStore.resetMas("filter");
            }

            const adviseCacheStore = useAdviseCacheStore();
            adviseCacheStore.cleanCoreAdvises();
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
}
</script>

<template>
    <div class="d-flex flex-column min-vh-100" :style="$styleStore.magneticBuilder.main">
        <Header
            @toolSelected="toolSelected"
        />
        <main role="main" class="main">
            <div class="container">
                <GenericTool
                    v-if="$stateStore.selectedTool == 'agnosticTool'"
                    :currentStoryline="currentStoryline"
                    :dataTestLabel="'MagneticTool'"
                    :showControlPanel="true"
                    :showAnsysButtons="true"
                    @toolSelected="toolSelected"
                />
                <GenericTool
                    v-if="$stateStore.selectedTool == 'magneticBuilder'"
                    :currentStoryline="magneticBuilderStoryline"
                    :dataTestLabel="'MagneticBuilder'"
                    :showControlPanel="true"
                    :showAnsysButtons="true"
                    @toolSelected="toolSelected"
                />
                <GenericTool
                    v-if="$stateStore.selectedTool == 'magneticAdviser'"
                    :currentStoryline="magneticAdviserStoryline"
                    :dataTestLabel="'MagneticAdviser'"
                    :showControlPanel="true"
                    :showAnsysButtons="true"
                    @toolSelected="toolSelected"
                />
                <GenericTool
                    v-if="$stateStore.selectedTool == 'magneticCoreAdviser'"
                    :currentStoryline="magneticCoreAdviserStoryline"
                    :dataTestLabel="'MagneticCoreAdviser'"
                    :showControlPanel="true"
                    :showAnsysButtons="true"
                    @toolSelected="toolSelected"
                />
                <GenericTool
                    v-if="$stateStore.selectedTool == 'magneticSpecificationsReport'"
                    :currentStoryline="magneticSpecificationsReportStoryline"
                    :dataTestLabel="'MagneticSpecificationsReport'"
                    :showControlPanel="true"
                    :showAnsysButtons="true"
                    @toolSelected="toolSelected"
                />
            </div>
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>

