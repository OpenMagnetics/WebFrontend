<script setup>
import { useMasStore } from '/src/stores/mas'
import { useAdviseCacheStore } from '/src/stores/adviseCache'
import { toTitleCase } from '/WebSharedComponents/assets/js/utils.js'

import GenericTool from '/src/components/WE/GenericTool.vue'
import { useFavicon } from '@vueuse/core'

</script>

<script>
export default {
    data() {
        const magneticViewerStoryline = {
            "operatingPoints": {
                title: "Operating Points",
                nextTool: "magneticAdviser",
            },
            "magneticViewer": {
                title: "Magnetic Viewer",
                prevTool: "operatingPoints",
            },
        };

        return {
            magneticViewerStoryline,
        }
    },
    methods: {
        editMagnetic() {
            setTimeout(() => {this.$router.push('/we_catalog_tool');}, 100);
        },
        orderSample(mas) {
            var link = `mailto:target@example.com?subject=Sample ${mas.magnetic.manufacturerInfo.reference}&body=I would like to order a sample of the part ${mas.magnetic.manufacturerInfo.reference}`; 
            window.location.href = link;
        },
    },
    mounted() {
    },
    created() {
        const icon = useFavicon();
        icon.value = "/images/we.ico";
    },
}
</script>

<template>
    <GenericTool
        v-if="$stateStore.selectedTool == 'magneticViewer'"
        :toolLabel="'magneticViewer'"
        :currentStoryline="magneticViewerStoryline"
        :dataTestLabel="'MagneticViewer'"
        :showControlPanel="true"
        @editMagnetic="editMagnetic"
    />
</template>

