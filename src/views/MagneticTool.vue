<script setup>
import { useMasStore } from '../stores/mas'
import { useAdviseCacheStore } from '../stores/adviseCache'
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import { toTitleCase } from 'WebSharedComponents/assets/js/utils.js'

import GenericTool from '../components/Toolbox/GenericTool.vue'
import { kirchhoffHandoff } from '/src/composables/kirchhoffHandoff'

</script>

<script>
export default {
    data() {
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

        const currentStoryline = magneticBuilderStoryline;

        // ABT #161: a prior visit to the Insulation Coordinator (or Magnetic
        // Viewer) leaves selectedWorkflow pointing at a workflow that has no
        // magneticBuilder tool. GenericTool then resolves getCurrentToolState()
        // to undefined and renders a blank page. Restore a magnetic-tool
        // workflow deterministically whenever the current one cannot host the
        // magnetic builder — covers both the "Continue design" button and a
        // direct navigation / deep-link to /magnetic_tool.
        const activeWorkflow = this.$stateStore.selectedWorkflow;
        const activeWorkflowState = this.$stateStore.toolboxStates[activeWorkflow];
        if (!activeWorkflowState || !activeWorkflowState.magneticBuilder) {
            this.$stateStore.selectWorkflow("design");
        }

        if (kirchhoffHandoff.value) {
            // Kirchhoff handed us a MAS — the bridge already loaded the inputs into the mas store.
            // KEEP them (do NOT resetMas, which would wipe the operating point back to the default),
            // mark the design loaded, and jump straight to the magnetic adviser (it auto-runs there).
            this.$stateStore.selectTool("magneticBuilder");
            this.$stateStore.designLoaded();
            const adviseCacheStore = useAdviseCacheStore();
            adviseCacheStore.cleanCoreAdvises();
            adviseCacheStore.cleanMasAdvises();
            this.$stateStore.getCurrentToolState().subsection = 'magneticAdviser';
        }
        else if (!this.$stateStore.isAnyDesignLoaded()) {
            this.$stateStore.selectTool("magneticBuilder");
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
            currentStoryline,
        }
    },
    methods: {
    },
}
</script>

<template>
    <div class="d-flex flex-column min-vh-100" :style="$styleStore.magneticBuilder.main">
        <Header
        />
        <main role="main" class="main">
            <div class="container">
                <GenericTool
                    :currentStoryline="currentStoryline"
                    :dataTestLabel="'MagneticBuilder'"
                    :showControlPanel="true"
                    :showAnsysButtons="true"
                />
            </div>
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>

