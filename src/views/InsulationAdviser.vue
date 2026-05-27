<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import { toTitleCase } from 'WebSharedComponents/assets/js/utils.js'

import GenericTool from '../components/Toolbox/GenericTool.vue'

</script>

<script>
export default {
    data() {
        const currentStoryline = {
            "insulationRequirements": {
                title: "Insulation Requirements",
            },
        };

        return {
            currentStoryline,
            updateStoryline: 0,
        }
    },
    mounted() {
        // The workflow / tool selection is normally set by the Header click
        // handler (onInsulationCoordinator). Replay it here so that visiting
        // /insulation_adviser directly (deep-link, refresh, automated test)
        // mounts the InsulationAdviser panel instead of the default
        // Magnetic Builder Design Requirements view.
        this.$stateStore.resetMagneticTool();
        this.$stateStore.selectWorkflow("insulationCoordinator");
        this.$stateStore.selectTool("insulationAdviser");
    },
}
</script>

<template>
    <Header/>
    <div class="container-fluid wrap p-0">
        <GenericTool
            class="container content"
            :currentStoryline="currentStoryline"
            :showStoryline="false"
            :dataTestLabel="'InsulationAdviser'"
        />
    </div>
    <Footer/>
</template>


<style lang="css">
.wrap {
  position: relative;
}

.wrap:before {
      content: ' ';
      display: block;
      position: absolute;
      width: 100%;
      height: 100%;
      opacity: 1;
      background-image: linear-gradient(to bottom, rgba(var(--bs-dark-rgb), 0.9), rgba(var(--bs-dark-rgb), 1)), url('/images/background_insulation.jpg');
      background-repeat: no-repeat;
      background-position: 50% 0;
      background-size: cover;
}

.content {
    background-color: transparent;
    position: relative;
}

</style>
