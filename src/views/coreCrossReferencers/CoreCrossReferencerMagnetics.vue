<script setup>
import CoreCrossReferencer from '/src/components/Toolbox/CoreCrossReferencer.vue'
import { toTitleCase } from '/src/assets/js/utils.js'
import '/src/assets/css/magnetics.css'


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
    <CoreCrossReferencer :onlyManufacturer="'Magnetics'" loadingGif="/images/loading_magnetics.gif"/>
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
