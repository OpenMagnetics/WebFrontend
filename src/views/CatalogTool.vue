<script setup>
import { useMasStore } from '../stores/mas'
import { useCatalogStore } from '../stores/catalog'
import { useAdviseCacheStore } from '../stores/adviseCache'
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import { toTitleCase } from '/WebSharedComponents/assets/js/utils.js'

import GenericTool from '../components/Toolbox/GenericTool.vue'

</script>

<script>
export default {
    data() {
        const catalogAdviserStoryline = {
            "designRequirements": {
                title: "Design Requirements",
                nextTool: "operatingPoints"
            },
            "operatingPoints": {
                title: "Operating Points",
                prevTool: "designRequirements",
                nextTool: "catalogAdviser",
            },
            "catalogAdviser": {
                title: "Magnetic Adviser",
                prevTool: "operatingPoints",
                nextTool: "magneticViewer",
            },
            "magneticViewer": {
                title: "Magnetic Viewer",
                prevTool: "catalogAdviser",
                enabled: true,
            },
            "magneticBuilder": {
                title: "Magnetic Builder",
                prevTool: "catalogAdviser",
                enabled: false,
            },
        };

        const currentStoryline = catalogAdviserStoryline;
        const catalogStore = useCatalogStore();
        catalogStore.catalogUrl = "/cmcs.ndjson"

        if (!this.$stateStore.isAnyDesignLoaded()) {
            this.$stateStore.designLoaded();
            const masStore = useMasStore();

            this.$stateStore.reset();
            masStore.resetMas("filter");
        }

        return {
            catalogAdviserStoryline,
            currentStoryline,
            catalogStore,
        }
    },
    methods: {
        viewMagnetic() {
            this.$stateStore.setCurrentToolSubsection("magneticViewer");
            this.catalogAdviserStoryline.magneticViewer.enabled = true;
            this.catalogAdviserStoryline.magneticBuilder.enabled = false;
        },
        editMagnetic() {
            this.$stateStore.setCurrentToolSubsection("magneticBuilder");
            this.catalogAdviserStoryline.magneticViewer.enabled = false;
            this.catalogAdviserStoryline.magneticBuilder.enabled = true;
        },
        orderSample(mas) {
            var link = `mailto:target@example.com?subject=Sample ${mas.magnetic.manufacturerInfo.reference}&body=I would like to order a sample of the part ${mas.magnetic.manufacturerInfo.reference}`; 
            window.location.href = link;
        },
    },
    mounted() {
        this.catalogStore.$onAction((action) => {
            if (action.name == "orderSample") {
                this.orderSample(action.args[0])
            }
        })
        this.$stateStore.$onAction((action) => {
            if (action.name == "updatedSignals") {
                this.catalogStore.advises = [];
            }
        })
    },
}
</script>

<template>
    <Header />
    <GenericTool
        :currentStoryline="currentStoryline"
        :dataTestLabel="'MagneticTool'"
        :showControlPanel="true"
        :showTitle="false"
        :showReference="true"
        @editMagnetic="editMagnetic"
        @viewMagnetic="viewMagnetic"
    />
    <Footer />
</template>

