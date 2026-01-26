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

        if (!this.$stateStore.isAnyDesignLoaded()) {
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

