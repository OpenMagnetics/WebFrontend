<script setup>
import CoreCrossReferencer from '/src/components/Toolbox/CoreCrossReferencer.vue'
import { toTitleCase } from '/src/assets/js/utils.js'
import '/src/assets/css/tdk.css'


</script>

<script>
export default {
    data() {
        return {
        }
    },
    methods: {
    },
    mounted() {
    },
    created() {
    },
}
</script>

<template>
    <CoreCrossReferencer :onlyManufacturer="'TDK'" loadingGif="/images/loading_tdk.gif"/>
</template>


<style lang="css">

.tool {
    min-height: 84vh;
    overflow: hidden;
}
.storyline {
    max-height: auto;
    position: fixed;
    overflow: hidden;
}

</style>
