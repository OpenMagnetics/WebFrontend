<script setup>
import { useMasStore } from '../../stores/mas'
import { useCatalogStore } from '../../stores/catalog'
import { useAdviseCacheStore } from '../../stores/adviseCache'
import Header from '../../components/WE/Header.vue'
import { toTitleCase } from '/WebSharedComponents/assets/js/utils.js'

import GenericTool from '../../components/WE/GenericTool.vue'
import Formular from '../../components/WE/Formular.vue'
import { useFavicon } from '@vueuse/core'
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

        const masStore = useMasStore();
        if (!this.$stateStore.isAnyDesignLoaded()) {
            this.$stateStore.designLoaded();

            this.$stateStore.reset();
            masStore.resetMas("filter");
        }

        return {
            catalogAdviserStoryline,
            currentStoryline,
            catalogStore,
            masStore,
        }
    },
    methods: {
        viewMagnetic() {
            this.$stateStore.setCurrentToolSubsection("magneticViewer");
            this.catalogAdviserStoryline.magneticViewer.enabled = true;
            this.catalogAdviserStoryline.magneticBuilder.enabled = false;
        },
        editMagnetic() {
            if (this.masStore.mas.magnetic.manufacturerInfo != null && !this.masStore.mas.magnetic.manufacturerInfo.reference.includes("Edited")) {
                this.masStore.mas.magnetic.manufacturerInfo.reference += "_Edited";
            }
            this.$stateStore.setCurrentToolSubsection("magneticBuilder");
            this.catalogAdviserStoryline.magneticViewer.enabled = false;
            this.catalogAdviserStoryline.magneticBuilder.enabled = true;
        },
        orderSample(mas) {
            this.$refs.requestModalButton.click()
            // var link = `mailto:target@example.com?subject=Sample ${mas.magnetic.manufacturerInfo.reference}&body=I would like to order a sample of the part ${mas.magnetic.manufacturerInfo.reference}`; 
            // window.location.href = link;
        },
    },
    watch: {
        $route: {
            immediate: true,
            handler(to, from) {
                document.title = "WE CMC Designer";
            }
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
        this.$settingsStore.loadingGif = "/images/loading_wuerth.gif";

    },
    created() {
        const icon = useFavicon()
        icon.value = "/images/we.ico"
    },
}
</script>

<template>
    <button
        hidden    
        ref="requestModalButton" 
        class="btn btn-primary mt-1 rounded-3"
        data-bs-toggle="modal"
        data-bs-target="#requestModal"
    />
    <Formular />
    <GenericTool
        :currentStoryline="currentStoryline"
        :dataTestLabel="'MagneticTool'"
        :showControlPanel="true"
        :showTitle="false"
        :showReference="true"
        @editMagnetic="editMagnetic"
        @viewMagnetic="viewMagnetic"
    />
</template>

